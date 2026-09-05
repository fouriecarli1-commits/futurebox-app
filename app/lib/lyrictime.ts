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
