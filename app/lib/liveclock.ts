/**
 * Where the playhead is, sixty times a second, without asking React.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * The owner, 22 October 2026, asked for the booth to work and feel like a real
 * studio, and a real studio's playhead glides. Ours was a piece of React
 * state set on every animation frame, so the whole room — six thousand lines
 * of it, every lane, every card on every desk — was worked out again sixty
 * times a second while anything played. On a desk that is a fan; on a phone
 * it is a playhead that stutters and a thumb on a fader that lags behind.
 *
 * So the moving number lives here. The few things that have to move every
 * frame (the line, the clock in the corner) listen to it and set their own
 * style directly; everything else reads the room's `at`, which is now set a
 * few times a second while playing and exactly when it stops. Two readers
 * of one clock, not two clocks: this is written from the same audio-clock
 * arithmetic that starts the sound.
 */

export interface LiveClock {
  /** The latest position, in seconds. */
  readonly now: () => number;
  /** Set it, and tell whoever is listening. */
  readonly set: (seconds: number) => void;
  /** Listen. Returns the way to stop. */
  readonly listen: (heard: (seconds: number) => void) => () => void;
}

export function liveClock(start = 0): LiveClock {
  let at = start;
  const ears = new Set<(seconds: number) => void>();
  return {
    now: () => at,
    set: (seconds) => {
      at = seconds;
      ears.forEach((ear) => ear(seconds));
    },
    listen: (heard) => {
      ears.add(heard);
      return () => { ears.delete(heard); };
    },
  };
}
