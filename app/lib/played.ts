'use client';

/**
 * When a play counts.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 *   "Sit ook count by onder om te wys hoeveel keer dit geview is. Let wel,
 *    'n view tel eers wanneer 65% van die liedjie geluister is."
 *
 * Until now a play was signalled the instant `play()` resolved. In the live
 * room the songs play themselves as you scroll, so the number counted
 * *scrolling past*, which is the opposite of the thing it is named after. A
 * song nobody stayed for and a song everybody stayed for scored the same.
 *
 * ── Why time listened, and not the position of the playhead ──────────────
 *
 * The obvious reading of "65% of the song" is `currentTime / duration >= 0.65`.
 * That is one drag of the scrubber: land the playhead at the end and the song
 * has been "listened to" in half a second. A count anybody can produce without
 * listening is not a count of listening.
 *
 * So this adds up how much of the song actually went past, and ignores jumps.
 * `timeupdate` fires roughly four times a second, so a step of much more than
 * that is a seek rather than a stretch of listening, and it is not credited.
 * Pausing is free — the clock simply stops. Scrubbing backwards and hearing
 * the same eight bars twice credits them twice, which is right: they were
 * listened to twice.
 *
 * ── Why the maths is out here ────────────────────────────────────────────
 *
 * `advance` takes numbers and returns numbers, so `check:played` can drive it
 * through a scrub, a pause, a loop and a stream without a browser. The same
 * reason `lib/listen.ts` keeps its maths out of the decoder.
 */

import { signal } from './signal';

/** How much of a song has to go past before it is a view. */
export const ENOUGH = 0.65;

/**
 * A step larger than this is a jump, not listening.
 *
 * `timeupdate` fires every 250 ms or so. One second is four of those, which
 * leaves room for a slow phone and a busy main thread while still being far
 * short of any drag a person would make on a scrubber.
 */
export const BIGGEST_STEP = 1;

export interface Listened {
  /** Seconds of the song that have actually gone past. */
  readonly heard: number;
  /** Where the playhead was last seen, to measure the next step against. */
  readonly at: number;
  /** Whether this play has already been counted. */
  readonly counted: boolean;
}

export const START: Listened = { heard: 0, at: 0, counted: false };

/**
 * One `timeupdate`, folded in.
 *
 * @param now      where the playhead is
 * @param duration the song's length, or 0 / Infinity for a stream
 */
export function advance(state: Listened, now: number, duration: number): Listened {
  const step = now - state.at;
  /* Forward, and small enough to be time passing rather than a drag. A
     backwards step is a rewind: nothing is credited for it, and the next
     stretch is measured from where it landed. */
  const heard = step > 0 && step <= BIGGEST_STEP ? state.heard + step : state.heard;
  /* A song of unknown length cannot have a percentage of it. Live streams and
     a file whose metadata has not arrived yet both land here, and neither is
     counted rather than being counted as soon as any of it plays. */
  const long = Number.isFinite(duration) && duration > 0;
  const counted = state.counted || (long && heard >= duration * ENOUGH);
  return { heard, at: now, counted };
}

/**
 * Count a play once the song has genuinely been listened through.
 *
 * Attaches to the element, returns the way to detach. A play that has been
 * counted stops being watched — the listener is removed rather than left
 * running behind an `if`, because the room plays a song for every panel
 * somebody scrolls past and the ones already counted would accumulate.
 *
 * @param ref the *song's* id, never the post's. A chart keyed on posts lists
 *            the same song once for every time it was put in the room.
 */
export function countWhenPlayed(element: HTMLAudioElement, ref: string): () => void {
  if (!ref) return () => {};
  let state = START;

  const onTime = () => {
    state = advance(state, element.currentTime, element.duration);
    if (!state.counted) return;
    /* `again`, because two people is not the same fact as one person twice
       and this number is the second one. `signal`'s daily memo is right for
       a visit and wrong here: it would make every song's count stop at one a
       day per browser, which is what `events.times` was added to measure and
       never could. */
    signal('play', { ref, again: true });
    stop();
  };

  /* A song that reaches the end and starts again is a second listen, so the
     clock goes back to nothing rather than staying counted. */
  const onStart = () => {
    if (state.counted) state = START;
  };

  const stop = () => {
    element.removeEventListener('timeupdate', onTime);
    element.removeEventListener('play', onStart);
  };

  element.addEventListener('timeupdate', onTime);
  element.addEventListener('play', onStart);
  return stop;
}
