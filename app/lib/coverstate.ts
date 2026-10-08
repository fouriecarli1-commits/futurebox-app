/**
 * Where a song's cover actually stands — the four states, as one answer.
 *
 * ── Why this is a function and not an `if` in the panel ──────────────────
 *
 * Carli, 8 October 2026: *"Wanneer 'n liedjie se album art gegenerate word dan
 * moet daar 'n opsie wees 'keep'. Ek sien ek het een gegenerate en nou is dit
 * weg."*
 *
 * The cover route has always known the difference between a picture it copied
 * into our storage and one it could only hand over as the engine's own
 * expiring link — it answers `kept: true` or `kept: false` and has done from
 * the day it was written. The panel threw that away. It drew the image and
 * printed, unconditionally:
 *
 *     "This is the song's cover now. It is saved and it goes wherever the
 *      song goes."
 *
 * which is the sentence I added in September *to reassure her*, printed over
 * the exact failure it reassures about. A screen that saves silently looks
 * like a screen that did nothing; a screen that promises it saved when it did
 * not is worse, because it spends the one thing a tool has.
 *
 * So the decision moves out of the JSX, where `check:coverkeep` can drive it
 * over every value the server can send — including the two nobody writes a
 * branch for.
 *
 * ── The rule, in one line ────────────────────────────────────────────────
 *
 * **Not known is not saved.** `kept` has to be exactly `true` to earn the
 * green line. `undefined` is what an older deployment's answer looks like,
 * `null` is what a half-parsed one looks like, and both of them used to fall
 * through to the reassurance because the old code tested the picture rather
 * than the keeping.
 */

/** What the cover endpoints can say about one song. */
export interface CoverWord {
  /** A picture to draw, if there is one. */
  readonly url?: string | null;
  /** Did the server copy it into our storage? Only `true` counts. */
  readonly kept?: boolean | null;
  /** Was a cover paid for and never collected? */
  readonly pending?: boolean | null;
}

export type Standing =
  /** Nothing drawn and nothing owed. The ordinary case for most songs. */
  | 'none'
  /**
   * A cover was made and charged for and never copied here. The picture is
   * recoverable from the engine, and this is the one state with something for
   * a person to press — which is, at last, the keep button she asked for
   * twice.
   */
  | 'uncollected'
  /** On screen and in our storage. The only state allowed to say "saved". */
  | 'kept'
  /**
   * On screen, not in our storage. Shown rather than hidden — losing a
   * picture somebody paid for in order to be tidy about it would be the worse
   * trade — but it is not called saved, and the keep button is offered.
   */
  | 'adrift';

export function standingOf(word: CoverWord): Standing {
  const shown = typeof word.url === 'string' && word.url.length > 0;
  if (!shown) return word.pending === true ? 'uncollected' : 'none';
  return word.kept === true ? 'kept' : 'adrift';
}

/** Is there a picture to draw in this state? */
export function hasPicture(standing: Standing): boolean {
  return standing === 'kept' || standing === 'adrift';
}

/**
 * Is there a keep for a person to press?
 *
 * True in both states where the app is holding something it has not secured.
 * `kept` needs no button and `none` has nothing to keep.
 */
export function offersKeep(standing: Standing): boolean {
  return standing === 'uncollected' || standing === 'adrift';
}

/** May the screen say the cover is saved? */
export function saysSaved(standing: Standing): boolean {
  return standing === 'kept';
}
