/**
 * Where a shot starts and ends, and the two handles that move it.
 *
 * ── Why this left the card ───────────────────────────────────────────────
 *
 * Carli, 9 October 2026, with a screenshot: the trim card read *"Trim it
 * 8.0s of 8.0s"*, both handles were hard right, and "Play just this bit" did
 * nothing.
 *
 * Three lines inside `Storyboard.tsx` made that, and each of them had a
 * comment saying it could not happen:
 *
 *   · the start handle's `max` was the clip's length, so it could reach the
 *     last frame;
 *   · the rule under it pushed the end along rather than crossing — end =
 *     start + one step — and then `to` was clamped back to the clip's
 *     length, which undid it;
 *   · and the readout was `to > from ? to - from : length`, whose fallback
 *     fires in exactly the case the window is empty and reports the whole
 *     clip.
 *
 * So the room said there were eight seconds of film and played none of
 * them. Reading that code for "can the handles cross" finds the comment
 * saying they cannot. The only honest instrument is to move them and look at
 * where they land, and a component is not a thing a check can move handles
 * on — so the arithmetic is here, and `check:knipvenster` drives it,
 * including the exact drag that produced her screenshot.
 */

export interface Window {
  /** Where it starts, in seconds from the top of the clip. */
  readonly from: number;
  /** Where it ends. */
  readonly to: number;
}

export interface Reading extends Window {
  /** How much film is in it. Never negative, and never the clip's length. */
  readonly trimmed: number;
  /** Nothing between the handles. */
  readonly empty: boolean;
}

/**
 * What the card should say, given what the shot carries and how long the
 * clip turned out to be.
 *
 * The length is read off the file rather than off the request, because the
 * engine rounds a request to a length it makes — a clip asked for at six
 * seconds and returned at ten, trimmed against six, leaves four seconds
 * nobody can reach.
 *
 * Both ends are clamped, because a board is restored from storage and can
 * carry anything that was ever saved into it — including the crossed pair
 * this file exists to make unreachable.
 */
export function windowOf(
  shot: { readonly from?: number; readonly to?: number },
  length: number,
): Reading {
  const whole = Math.max(0, length);
  const from = Math.min(Math.max(0, shot.from ?? 0), whole);
  const to = Math.min(shot.to ?? whole, whole);
  /* `Math.max(0, …)` and NOT a fallback to the clip's length. That fallback
     is what reported eight seconds of an empty window. */
  const trimmed = Math.max(0, to - from);
  return { from, to, trimmed, empty: trimmed <= 0 };
}

/**
 * The start handle moved.
 *
 * It cannot reach the end of the clip — there would be no film after it —
 * and it pushes the end along rather than crossing it. The end is then
 * clamped to the clip, which is the clamp that used to undo the rule; it is
 * harmless now only because the start is capped a step short of the end.
 */
export function startMoved(
  was: Window,
  asked: number,
  length: number,
  step: number,
): Window {
  const most = Math.max(0, length - step);
  const from = Math.min(Math.max(0, asked), most);
  return { from, to: Math.min(length, Math.max(from + step, was.to)) };
}

/** The end handle moved. The mirror of the above, and it cannot reach zero. */
export function endMoved(
  was: Window,
  asked: number,
  length: number,
  step: number,
): Window {
  const to = Math.max(Math.min(asked, length), step);
  return { to, from: Math.max(0, Math.min(to - step, was.from)) };
}
