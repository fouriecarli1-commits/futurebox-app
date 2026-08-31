/**
 * A conversation between two people, from a script somebody typed.
 *
 * ElevenLabs' text-to-dialogue takes a list of turns — each a voice and what
 * that voice says — and returns one continuous piece of audio in which the two
 * speakers actually respond to each other, rather than two monologues cut
 * together. For a podcast that is the whole thing.
 *
 * There are two hard limits on the wire, and both are read off the SDK's own
 * request type rather than remembered:
 *
 *   · **2,000 characters across every `inputs[].text` in one request.** Their
 *     own words: longer requests "can terminate early in streaming responses or
 *     return a validation error". Terminating early is the dangerous one — it
 *     is a half-finished episode that looks finished.
 *   · **Ten unique voice ids per request.**
 *
 * A podcast script is many times two thousand characters, so this file exists
 * to cut one into requests that stay inside both limits, and to do it where the
 * cut does not land in the middle of a word. Nothing here talks to the network:
 * it is arithmetic over strings, so `.probe/dialogue.mjs` can run it directly.
 */

export interface Turn {
  readonly voiceId: string;
  readonly text: string;
}

/** Characters across every turn in one request. Theirs, not ours. */
export const CAP = 2000;
/** Distinct voices in one request. Also theirs. */
export const VOICES = 10;

/** A sentence ends here, if the next thing along is a space or nothing. */
const ENDS = '.!?…';

/**
 * The end of the last whole sentence inside `window`, as a cut position.
 *
 * Returns 0 when there is none, which the caller reads as "try something else".
 */
function lastSentence(window: string): number {
  for (let i = window.length - 1; i >= 0; i -= 1) {
    if (ENDS.indexOf(window[i]) === -1) continue;
    const next = window[i + 1];
    if (next === undefined || /\s/.test(next)) return i + 1;
  }
  return 0;
}

/** The end of the last whole word inside `window`, as a cut position. */
function lastWord(window: string): number {
  for (let i = window.length - 1; i >= 0; i -= 1) {
    if (/\s/.test(window[i])) return i + 1;
  }
  return 0;
}

/**
 * One turn, cut into turns that each fit inside the cap.
 *
 * Nothing is thrown away. Every cut keeps the character it cuts after, so the
 * pieces put back together are the original string exactly — which is the
 * property worth checking, because the failure this guards against is an
 * episode that is quietly missing its last paragraph.
 *
 * Cuts are tried at a sentence end first, then at a word end, and only then
 * mid-word — which happens when a single "word" is longer than the cap, and is
 * a URL or somebody leaning on a key rather than speech.
 */
export function splitTurn(turn: Turn, cap: number = CAP): Turn[] {
  if (turn.text.length <= cap) return [turn];
  const pieces: string[] = [];
  let rest = turn.text;
  while (rest.length > cap) {
    const window = rest.slice(0, cap);
    let at = lastSentence(window);
    if (at < 1) at = lastWord(window);
    // A cap's worth of one word. Cut it, rather than loop forever.
    if (at < 1) at = cap;
    pieces.push(rest.slice(0, at));
    rest = rest.slice(at);
  }
  if (rest.length) pieces.push(rest);
  return pieces.map((text) => ({ voiceId: turn.voiceId, text }));
}

/** A turn nobody would hear: blank, or nothing but spaces. */
function silent(turn: Turn): boolean {
  return turn.text.trim().length === 0;
}

/**
 * A script, cut into requests that each stay inside both of their limits.
 *
 * Greedy on purpose: fewer requests means fewer joins, and a join between two
 * requests is the one place the conversation cannot hear itself — the second
 * request does not know how the first one ended. So the cut wants to be as rare
 * as the limits allow, and it wants to land between two turns rather than
 * inside one, which it does unless a single turn is over the cap by itself.
 */
export function batches(turns: readonly Turn[], cap: number = CAP, voices: number = VOICES): Turn[][] {
  const flat: Turn[] = [];
  for (const turn of turns) {
    if (silent(turn)) continue;
    for (const piece of splitTurn(turn, cap)) if (!silent(piece)) flat.push(piece);
  }

  const out: Turn[][] = [];
  let current: Turn[] = [];
  let chars = 0;
  let ids = new Set<string>();
  for (const turn of flat) {
    const withThis = ids.has(turn.voiceId) ? ids.size : ids.size + 1;
    if (current.length > 0 && (chars + turn.text.length > cap || withThis > voices)) {
      out.push(current);
      current = [];
      chars = 0;
      ids = new Set();
    }
    current.push(turn);
    chars += turn.text.length;
    ids.add(turn.voiceId);
  }
  if (current.length > 0) out.push(current);
  return out;
}

/** What the whole conversation costs to say, in characters. */
export function spoken(turns: readonly Turn[]): number {
  let total = 0;
  for (const turn of turns) total += turn.text.trim().length;
  return total;
}

export interface Speaker {
  /** What they are called in the script, e.g. "Anre". Matched case-blind. */
  readonly name: string;
  readonly voiceId: string;
}

export interface Script {
  readonly turns: readonly Turn[];
  /** Names the script used that nobody was cast for. */
  readonly uncast: readonly string[];
}

/** A speaker's name, then a colon, then what they say. */
const SPOKEN_LINE = /^\s*([^:]{1,40}?)\s*:\s*(.*)$/;

/**
 * Read a script the way people write one.
 *
 *     Anre: So what changed this year?
 *     Carli: Everything, and none of it at once.
 *       And that is the part nobody expected.
 *
 * A line with no name in front of it belongs to whoever spoke last, because
 * that is how a paragraph works and forcing a name onto every line makes a
 * script tedious to write.
 *
 * A name nobody was cast for is **reported, not guessed at**. Handing an
 * unknown speaker to the first voice produces an episode where two people are
 * one person, and it does it silently — the writer has no reason to listen all
 * the way through to find out.
 */
export function readScript(text: string, cast: readonly Speaker[]): Script {
  const by = new Map<string, string>();
  for (const one of cast) if (one.name.trim()) by.set(one.name.trim().toLowerCase(), one.voiceId);

  const turns: Turn[] = [];
  const uncast: string[] = [];
  let last: string | null = null;

  for (const line of text.split('\n')) {
    if (!line.trim()) {
      // A blank line ends the paragraph but not the turn: the next unnamed
      // line is still the same speaker, which is what a writer means by it.
      continue;
    }
    const found = SPOKEN_LINE.exec(line);
    if (found) {
      const name = found[1].trim();
      const said = found[2].trim();
      const voiceId = by.get(name.toLowerCase());
      if (!voiceId) {
        if (uncast.indexOf(name) === -1) uncast.push(name);
        continue;
      }
      last = voiceId;
      if (said) turns.push({ voiceId, text: said });
      continue;
    }
    if (!last) {
      // Words before anybody has been named. Not an error worth stopping for —
      // it is the first line of a script somebody has not finished formatting.
      continue;
    }
    const previous = turns[turns.length - 1];
    if (previous && previous.voiceId === last) {
      turns[turns.length - 1] = { voiceId: last, text: `${previous.text} ${line.trim()}` };
    } else {
      turns.push({ voiceId: last, text: line.trim() });
    }
  }

  return { turns, uncast };
}
