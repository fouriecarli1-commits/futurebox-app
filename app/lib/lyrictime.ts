'use client';

/**
 * Where the words actually fall, and how sure the app is about it.
 *
 * ── The complaint this answers ───────────────────────────────────────────
 *
 * "nou beweeg die woorde weer te vinnig" — and before that, on a different
 * song, they were fine. That is the signature of a guess: it is right when
 * the song happens to match the guess and wrong the rest of the time.
 *
 * The guess was `timelineOf`: take the composition plan, spread each
 * section's lines evenly across it. Four lines across seventy-two seconds get
 * eighteen seconds each, and nobody sings like that. Worse, nearly every song
 * opens with a bar or two before anybody sings, so the first line lights up
 * during the intro and everything after it is early by the same amount.
 *
 * ── The ladder ───────────────────────────────────────────────────────────
 *
 * The booth already climbed this ladder and nothing else did, which is why
 * the same song read correctly in one room and drifted in another. It is one
 * function now, and every screen that puts words on a song uses it.
 *
 *   **heard** — a transcription with a timestamp on every word. Exact,
 *   because it is what was sung rather than what was sent. It costs credits
 *   and is kept once it is made.
 *
 *   **phrases** — the singing is *measured* in the audio: a voice is silent
 *   between phrases, so the phrases can be found and the lines hung on them.
 *   Free, local, and needs no key. On a separated vocal it is very good; on a
 *   full mix it is good enough to stop the drift.
 *
 *   **sung** — no phrases found, but the singing plainly starts somewhere
 *   after the file does, so the lines are laid into that part rather than
 *   across the whole thing.
 *
 *   **spread** — the old even spread. Still here because a song with words
 *   and no audio has nothing better, and the screen says so.
 *
 * ── Why the answer is kept ───────────────────────────────────────────────
 *
 * Decoding a three-minute song and walking its envelope is a second or two of
 * work on a phone, and the answer cannot change unless the file does. Doing
 * it every time somebody opens the words is a second or two of a screen
 * sitting still at exactly the moment they are looking at it.
 */

import { partsOf, timelineOf, alignTo, fitInto, type Part, type TimedLine } from './timeline';
import { phrasesOf } from './phrases';
import type { Track } from './library';

export type Timing = 'heard' | 'phrases' | 'sung' | 'spread' | 'none';

export interface Timed {
  readonly lines: readonly TimedLine[];
  readonly how: Timing;
  /**
   * Why there are no lines, where the reason is worth saying.
   *
   * Only ever set by `heardFor`, and only when the server said something a
   * person can act on — signed out, out of credits, a file too long. Every
   * other rung of the ladder fails into a lower rung rather than into nothing,
   * so there is nothing to explain.
   */
  readonly why?: string;
}

const KEY = 'futurebox.lyrictime.v1';
/** Enough for a session's listening. The oldest goes rather than growing. */
const MOST = 40;

type Stored = Record<string, { lines: TimedLine[]; how: Timing; at: number }>;

function kept(): Stored {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || '{}') as Stored;
  } catch {
    return {};
  }
}

function keep(id: string, timed: Timed): void {
  if (typeof window === 'undefined' || timed.how === 'none') return;
  try {
    const all = kept();
    all[id] = { lines: timed.lines.slice(), how: timed.how, at: Date.now() };
    const order = Object.entries(all).sort((a, b) => b[1].at - a[1].at);
    window.localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(order.slice(0, MOST))));
  } catch {
    // Storage full or off. The answer still holds for this visit.
  }
}

/** Throw away what is remembered about one song, for when its audio changes. */
export function forget(id: string): void {
  try {
    const all = kept();
    delete all[id];
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Nothing to clean up.
  }
}

/** The sheet, evenly spread — the bottom of the ladder, and the fallback. */
export function evenly(track: Track): readonly TimedLine[] {
  const seconds = track.seconds || 0;
  if (!seconds) return [];
  const stored = (track.parts ?? []) as readonly Part[];
  /* The written sheet when there is no plan. Only songs made since the plan
     was kept carry one, so without this every older song — and anything typed
     straight into the words box — has no words at all. */
  const parts = stored.length ? stored : partsOf(track.lyrics ?? '');
  return parts.length ? timelineOf(parts, seconds) : [];
}

/**
 * The best timing this app can produce for a song, and what it is.
 *
 * `audio` is optional: without it the answer is the even spread, which is
 * what a screen showing a song whose file is not on this device can honestly
 * offer. With it, the singing is measured.
 */
export async function timeFor(track: Track, audio: Blob | null): Promise<Timed> {
  const even = evenly(track);
  if (!even.length) return { lines: [], how: 'none' };

  const remembered = kept()[track.id];
  if (remembered?.lines?.length) return { lines: remembered.lines, how: remembered.how };
  if (!audio) return { lines: even, how: 'spread' };

  const Ctx =
    typeof window === 'undefined'
      ? undefined
      : window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return { lines: even, how: 'spread' };

  const context = new Ctx();
  let buffer: AudioBuffer;
  try {
    buffer = await context.decodeAudioData(await audio.arrayBuffer());
  } catch {
    return { lines: even, how: 'spread' };
  } finally {
    void context.close();
  }

  const phrases = phrasesOf(buffer.getChannelData(0), buffer.sampleRate);
  if (phrases.length) {
    const timed: Timed = { lines: alignTo(even, phrases), how: 'phrases' };
    keep(track.id, timed);
    return timed;
  }

  /* No phrases, but the file is longer than the singing: a song that starts
     with eight bars of music and ends on a fade should not have its first
     line lit during the intro. */
  const from = 0;
  const to = buffer.duration;
  if (to > from + 1) {
    const timed: Timed = { lines: fitInto(even, from, to), how: 'sung' };
    keep(track.id, timed);
    return timed;
  }
  return { lines: even, how: 'spread' };
}

/* ── The top of the ladder, which nothing used to build ───────────────────
 *
 * `heard` has been in `Timing` since the ladder was written, `SongScreen`
 * checks for it, and no code path ever produced one. The rung was declared and
 * empty.
 *
 * It is filled here, and the reason is the case that needed it:
 *
 *   "Dit sal baie cool wees as iemand ook hulle eie liedjies kon oplaai om
 *    daai presies funksie te vervul."
 *
 * A song this app made has a lyric sheet and needs times. A song somebody
 * brought in from a file has neither, so every rung below this one returns
 * nothing at all — `evenly` has no sheet to spread. Transcription is the only
 * thing that answers both halves at once, which is why it is not a rung on
 * that ladder so much as a source for it.
 *
 * ── What it costs, and being honest about what it is ─────────────────────
 *
 * Charged by the minute at the route, which is where the credits live. And it
 * is a transcriber built for speech: on singing with a band behind it, it is
 * the hardest case there is. The screen that offers this says so before the
 * press rather than after the money — a person who knows it may come back
 * rough will read the result as a draft, and a person who does not will read
 * it as the app being broken.
 */

/** A gap this long between two words ends a line. About a breath. */
const BREATH = 0.6;
/** And no line runs longer than this, however fast somebody sings. */
const LONGEST_LINE = 46;

interface HeardWord {
  readonly text?: unknown;
  readonly start?: unknown;
  readonly end?: unknown;
  readonly type?: unknown;
}

/**
 * Timestamped words, grouped into lines somebody can read off a screen.
 *
 * Broken on silence first and on length second. A transcriber answers with
 * words, and a wall of words is not something anybody sings along to — the
 * places a singer breathes are the places a line ends, and they are visible in
 * the timings without anybody having to guess at grammar.
 */
export function linesFromWords(words: readonly HeardWord[]): TimedLine[] {
  const said = words
    .filter((one) => typeof one.text === 'string' && (one.text as string).trim().length > 0)
    .filter((one) => one.type !== 'spacing' && one.type !== 'audio_event')
    .map((one) => ({
      text: (one.text as string).trim(),
      start: Number(one.start) || 0,
      end: Number(one.end) || Number(one.start) || 0,
    }));

  const lines: TimedLine[] = [];
  let holding: typeof said = [];

  const close = (): void => {
    if (!holding.length) return;
    lines.push({
      text: holding.map((one) => one.text).join(' '),
      /* One section, named for what this is. The sections on a made song come
         from the composition plan; a transcript has no plan behind it and
         inventing chorus headings out of repetition would be the app claiming
         to have understood the song's shape. */
      section: 'Heard',
      opensSection: lines.length === 0,
      start: holding[0].start,
      end: holding[holding.length - 1].end,
    });
    holding = [];
  };

  for (const word of said) {
    const previous = holding[holding.length - 1];
    const gap = previous ? word.start - previous.end : 0;
    const wouldBe = holding.map((one) => one.text).join(' ').length + word.text.length + 1;
    if (previous && (gap >= BREATH || wouldBe > LONGEST_LINE)) close();
    holding.push(word);
  }
  close();

  return lines;
}

/**
 * Ask what was actually sung, and keep the answer.
 *
 * Returns `none` rather than throwing: every caller of this is a screen with
 * something else to show, and a transcription that did not happen is a missing
 * convenience rather than a broken room.
 *
 * `fetcher` is a parameter so the grouping and the keeping can be checked
 * without a network or a key — the part worth checking is what comes back out,
 * not that `fetch` was called.
 */
export async function heardFor(
  track: Track,
  audio: Blob | null,
  fetcher: (body: FormData) => Promise<Response> = async (body) => {
    /* Signed, like every other caller of this route.

       The first version of this posted without a token. The route reads the
       caller to charge them, so with none it answers 401 — and this function
       turns a bad answer into "no lines", which is right for every other
       failure and was silence for this one. Somebody presses the button, waits
       through a spinner, and nothing happens with no word about why. A button
       that does nothing is the fault this codebase spends the most effort
       avoiding, and I shipped one.

       Imported here rather than at the top of the file so `lyrictime` stays
       usable in a check: the module reaches for browser storage on load and
       `cloud` reaches for a Supabase client, and only this one path needs it. */
    const { accessToken } = await import('./cloud');
    const token = await accessToken();
    return fetch('/api/transcribe', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body,
    });
  },
): Promise<Timed> {
  if (!audio) return { lines: [], how: 'none' };

  const remembered = kept()[track.id];
  if (remembered?.how === 'heard' && remembered.lines.length) {
    return { lines: remembered.lines, how: 'heard' };
  }

  try {
    const body = new FormData();
    body.append('file', audio, 'song.wav');
    /* The length, so the route bills what the song is rather than what a
       browser claims. It measures a WAV from its own header; for anything else
       this is the only number there is. */
    body.append('seconds', String(Math.max(0, Math.round(track.seconds || 0))));
    const answer = await fetcher(body);
    if (!answer.ok) {
      /* The reason, carried out rather than swallowed. `none` is the right
         answer for the screen either way, but a caller that wants to say
         "sign in first" or "you are out of credits" cannot do it from a shape
         that only ever means nothing happened. */
      const why = (await answer.json().catch(() => null)) as { message?: unknown } | null;
      return {
        lines: [],
        how: 'none',
        ...(typeof why?.message === 'string' && why.message ? { why: why.message } : {}),
      };
    }
    const said = (await answer.json()) as { words?: readonly HeardWord[] };
    const lines = linesFromWords(said.words ?? []);
    if (!lines.length) return { lines: [], how: 'none' };
    const timed: Timed = { lines, how: 'heard' };
    keep(track.id, timed);
    return timed;
  } catch {
    return { lines: [], how: 'none' };
  }
}
