'use client';

/**
 * Taking it back.
 *
 * ── Why the booth has never had this ─────────────────────────────────────
 *
 * The booth's doctrine, written into the room itself, is that almost nothing
 * costs anything: a cut points at the recording rather than replacing it, a
 * move is a number, a level is a number, and all of it is undone by putting
 * the edge back where it was. That is true and it is the reason the room is
 * cheap to use.
 *
 * It is also not undo, and the room's own words admit where it runs out:
 * *"The fade is the one exception — it is written into the sound."* Taking
 * the rumble off is the same: it replaces the recording, drops the cut and
 * throws the amp away. So is deleting a lane. Somebody who does this for a
 * living will do one of those three by accident within the first hour, and
 * "drag the edge back" has nothing to offer them — there is no edge left.
 *
 * And a move is not really free either. Dragging a part back to where it was
 * means knowing where it was, which nobody does to the millisecond.
 *
 * ── Why it is snapshots and not a list of reversals ──────────────────────
 *
 * Every field on a lane is `readonly` and every change already builds a new
 * array, so a snapshot is the array that was there — no copying, no deep
 * clone, and no second description of what each operation does that can
 * drift from what it actually does. A list of "how to reverse a fade" is a
 * second implementation of the fade, and the day they disagree is the day
 * undo quietly makes the wrong sound.
 *
 * ── Why the cap is in bytes and not in steps ─────────────────────────────
 *
 * This is the whole difficulty and the reason it is here rather than in the
 * room.
 *
 * Almost every step shares all of its audio with the step before it: a gain
 * change, a move, a mute and a cut all hand back the same `AudioBuffer`s in
 * a new array. Those steps cost a few hundred bytes. A fade and a clean do
 * not — they each put a whole new recording in memory, and three minutes of
 * stereo at 48k is about sixty-six megabytes.
 *
 * So "keep twenty steps" is a cap on nothing. Twenty free steps is nothing
 * at all; twenty fades is over a gigabyte and the tab is gone.
 *
 * And the obvious fix is worse than no fix: weigh each step and add the
 * weights up. Twenty steps sharing one sixty-six megabyte recording would
 * come to one and a third gigabytes, a number that is wrong by twenty times,
 * and the history would throw itself away almost immediately to stay under a
 * limit it was never near. Green for an adjacent reason: it really is
 * measuring something, just not the thing that decides whether the tab
 * survives.
 *
 * What actually costs memory is the set of DISTINCT recordings the history
 * is the last holder of. So that is what is counted: each buffer once,
 * however many steps point at it.
 *
 * It is deliberately a slight over-count — a recording still in the live
 * session is held by the session whether or not this also points at it, so
 * counting it here charges the history for something it is not keeping
 * alive. Over-counting drops history a little sooner than it strictly has
 * to, which is the safe direction to be wrong in, and the alternative is
 * this file knowing what the room currently holds.
 */

/** Enough of an `AudioBuffer` to weigh one. Real buffers satisfy this. */
export interface Sound {
  readonly length: number;
  readonly numberOfChannels: number;
}

/** Enough of a `Lane` to find its recordings. Real lanes satisfy this. */
export interface Holder {
  readonly audio: Sound;
  readonly amped?: { readonly audio: Sound };
}

/** One thing that happened, and what everything looked like before it. */
export interface Step<T> {
  /** What the button says: "the fade", "the lane". Already in her language. */
  readonly what: string;
  readonly lanes: readonly T[];
}

/**
 * How far back it goes when nothing is heavy.
 *
 * Twenty is a working session's worth of small moves — enough that somebody
 * can undo their way out of a wrong turn taken five minutes ago — and small
 * moves are free, so the number is only ever reached by them.
 */
export const KEEP_STEPS = 20;

/**
 * And the ceiling that actually bites, in bytes of distinct recordings.
 *
 * 256 MB. A browser tab has hundreds of megabytes before it is in trouble
 * and the live session needs its own; this is roughly three full-length
 * stereo recordings, which is three fades or three cleans deep. Below about
 * two and it cannot hold a single undo of a long song, which is the case it
 * exists for.
 */
export const KEEP_BYTES = 256 * 1024 * 1024;

/** Float32 samples, every channel. What a decoded buffer really occupies. */
export const bytesOf = (sound: Sound): number =>
  sound.length * sound.numberOfChannels * 4;

export interface History<T> {
  /** Put the current lanes on the stack, before the change that replaces them. */
  remember(what: string, lanes: readonly T[]): void;
  /** Step back. Hands back the lanes to put on screen, or null if there is nothing. */
  undo(now: readonly T[]): Step<T> | null;
  /** Step forward again. */
  redo(now: readonly T[]): Step<T> | null;
  /** What the undo button should say it undoes, or null when it is off. */
  undoable(): string | null;
  /** What the redo button should say, or null. */
  redoable(): string | null;
  /** Distinct recording bytes this history is holding. For the ceiling and for tests. */
  held(): number;
  /** Start again — a new song, a new session. */
  clear(): void;
}

/** Every distinct recording across these steps, each counted once. */
const weigh = <T extends Holder>(steps: readonly Step<T>[]): number => {
  const seen = new Set<Sound>();
  let total = 0;
  for (const step of steps) {
    for (const lane of step.lanes) {
      for (const sound of [lane.audio, lane.amped?.audio]) {
        if (!sound || seen.has(sound)) continue;
        seen.add(sound);
        total += bytesOf(sound);
      }
    }
  }
  return total;
};

export function makeHistory<T extends Holder>(
  keepSteps: number = KEEP_STEPS,
  keepBytes: number = KEEP_BYTES,
): History<T> {
  let back: Step<T>[] = [];
  let forward: Step<T>[] = [];

  /**
   * Drop from the far end until it fits, but never the last step.
   *
   * Oldest first, and recomputed each time rather than subtracted: dropping
   * a step whose recording a newer step also points at frees nothing, and a
   * loop that assumed it did would stop too early and leave the history over
   * its ceiling. One undo is always kept whatever it weighs, because a
   * history that refuses to hold the single step somebody is about to press
   * is not a history.
   */
  const trim = (): void => {
    while (back.length > keepSteps) back.shift();
    while (back.length > 1 && weigh(back) > keepBytes) back.shift();
  };

  return {
    remember(what, lanes) {
      back.push({ what, lanes: [...lanes] });
      /* A new change abandons the way forward, the way every editor does:
         the future that was there was a future of the state you just left. */
      forward = [];
      trim();
    },
    undo(now) {
      const step = back.pop();
      if (!step) return null;
      /* Redo needs where we were standing, and it is labelled with the same
         words: the thing you undid is the thing you would do again. */
      forward.push({ what: step.what, lanes: [...now] });
      return step;
    },
    redo(now) {
      const step = forward.pop();
      if (!step) return null;
      back.push({ what: step.what, lanes: [...now] });
      trim();
      return step;
    },
    undoable: () => (back.length ? back[back.length - 1].what : null),
    redoable: () => (forward.length ? forward[forward.length - 1].what : null),
    held: () => weigh([...back, ...forward]),
    clear() {
      back = [];
      forward = [];
    },
  };
}
