/**
 * Cut the ums: the hesitations taken out of an episode.
 *
 * Step 5 of the plan in `docs/FAL-MODELLE.md`: *"Podcast with two hosts from
 * a script, and filler words cut out."* The two hosts were already here
 * (`TwoHosts.tsx`). This is the second half.
 *
 * ── Why no new engine ────────────────────────────────────────────────────
 *
 * The transcript an episode already has (`Transcript.tsx`, through
 * `/api/transcribe`) carries a start and an end on every word, and the
 * transcriber writes hesitations down as it hears them. So the ums are
 * already found, with their times, by the time the member reads what was
 * said. Cutting them is arithmetic on the episode's own samples, done on the
 * device: nothing more is sent anywhere and nothing more is charged.
 *
 * ── What counts as a filler ──────────────────────────────────────────────
 *
 * Only sounds that are never words: "um", "uh", "er", "hmm" and their
 * spellings, in English and in Afrikaans ("ehm"). Not "like", not "you
 * know", not "so": those are words somebody may have meant, and an episode
 * with a meant word cut out of it is worse than one with an um left in.
 * "Mhm" and "mm" stay as well, because they are somebody agreeing, and so
 * does "ah", which is usually somebody understanding.
 *
 * ── How a cut is made so it is not heard ─────────────────────────────────
 *
 * A filler is cut from just before it starts to just after it ends, but
 * never into the word before or the word after. The two sides are joined
 * with a short fade, so the join is not a click.
 */

/** A word as `/api/transcribe` answers it. */
export interface TimedWord {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** A stretch of the episode, in seconds. */
export interface Span {
  readonly start: number;
  readonly end: number;
}

/** Hesitations, never words. Compared after lower case and without punctuation. */
export const FILLERS: ReadonlySet<string> = new Set([
  'um', 'umm', 'ummm', 'uhm', 'uhmm',
  'uh', 'uhh', 'uhhh',
  'er', 'err', 'erm', 'errm',
  'ehm', 'ehmm', 'eh', 'ehh',
  'ahm',
  'hm', 'hmm', 'hmmm',
]);

/** Room taken either side of a filler, in seconds, where there is room. */
export const EDGE = 0.03;
/** The fade over each join, in seconds. */
export const FADE = 0.012;

const bare = (text: string): string => text.toLowerCase().replace(/[^\p{L}]/gu, '');

/** Whether a transcribed word is a hesitation. */
export function isFiller(text: string): boolean {
  return FILLERS.has(bare(text));
}

/** The stretches to take out, in order, joined where they touch. */
export function fillerCuts(words: readonly TimedWord[]): Span[] {
  const sorted = [...words]
    .filter((one) => Number.isFinite(one.start) && Number.isFinite(one.end) && one.end > one.start)
    .sort((a, b) => a.start - b.start);
  const cuts: Span[] = [];
  sorted.forEach((word, index) => {
    if (!isFiller(word.text)) return;
    const before = index > 0 ? sorted[index - 1].end : 0;
    const after = index < sorted.length - 1 ? sorted[index + 1].start : Number.POSITIVE_INFINITY;
    const start = Math.max(before, word.start - EDGE, 0);
    const end = Math.min(after, word.end + EDGE);
    if (end <= start) return;
    const last = cuts[cuts.length - 1];
    if (last && start <= last.end) cuts[cuts.length - 1] = { start: last.start, end: Math.max(last.end, end) };
    else cuts.push({ start, end });
  });
  return cuts;
}

/** What stays: the episode between the cuts. */
export function keptSpans(cuts: readonly Span[], seconds: number): Span[] {
  const kept: Span[] = [];
  let from = 0;
  for (const cut of cuts) {
    const start = Math.min(Math.max(cut.start, 0), seconds);
    if (start > from) kept.push({ start: from, end: start });
    from = Math.max(from, Math.min(cut.end, seconds));
  }
  if (seconds > from) kept.push({ start: from, end: seconds });
  return kept;
}

/** How many seconds the cuts take out. */
export function secondsCut(cuts: readonly Span[]): number {
  return cuts.reduce((sum, one) => sum + (one.end - one.start), 0);
}

/**
 * The kept stretches of one channel laid end to end, with a fade in and out
 * at every join so no join clicks.
 */
export function joinKept(samples: Float32Array, rate: number, kept: readonly Span[]): Float32Array {
  const pieces = kept
    .map((one) => [Math.round(one.start * rate), Math.min(samples.length, Math.round(one.end * rate))] as const)
    .filter(([from, to]) => to > from);
  const total = pieces.reduce((sum, [from, to]) => sum + (to - from), 0);
  const out = new Float32Array(total);
  const fade = Math.max(1, Math.round(FADE * rate));
  let at = 0;
  pieces.forEach(([from, to], index) => {
    out.set(samples.subarray(from, to), at);
    const length = to - from;
    const ramp = Math.min(fade, Math.floor(length / 2));
    for (let i = 0; i < ramp; i += 1) {
      const gain = i / ramp;
      if (index > 0) out[at + i] *= gain;
      if (index < pieces.length - 1) out[at + length - 1 - i] *= gain;
    }
    at += length;
  });
  return out;
}
