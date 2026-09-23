/**
 * Where one thing sits relative to another, without -1 counting as first.
 *
 * ── The fault this exists to end ─────────────────────────────────────────
 *
 * `indexOf` answers -1 for something that is not there, and -1 is less than
 * every real position. So this, written sixteen times across the checks:
 *
 *     ok('the bytes go down before the row does',
 *       shelf.indexOf('await putAudio(') < shelf.indexOf('const all ='));
 *
 * passes for a file that writes the bytes first, AND for a file that never
 * writes the bytes at all. The rule exists because the order matters; the
 * version that does not do the thing is the one it was written to catch,
 * and it is the version it reports as ok.
 *
 * Proved on 23 September 2026 rather than argued: the subtitle draw was
 * deleted out of `app/lib/stitch.ts` — an app that puts no words on any
 * stitched video — and `check:logomark`, whose whole subject is what is
 * drawn in which order, came back green on every rule.
 *
 * It had already been found three times in one day in three different
 * checks, each time fixed privately in that one file. This is the fourth
 * time, so it goes in one place, and `check:ordering` makes the raw shape
 * a failure everywhere.
 *
 * ── Why both must be present, always ─────────────────────────────────────
 *
 * There is no ordering between two things when one of them is missing.
 * "Absent counts as earliest" and "absent counts as latest" are both a
 * guess dressed as a measurement. Answering false is the honest reading:
 * the rule asked whether the file does A before B, and a file missing A
 * does not.
 */

/** A body of text, or a list — both answer `indexOf` the same way. */
type Where = { indexOf(what: string): number; lastIndexOf(what: string): number };

/** `first` appears before `second`, and BOTH appear. */
export const before = (where: Where, first: string, second: string): boolean => {
  const one = where.indexOf(first);
  const two = where.indexOf(second);
  return one !== -1 && two !== -1 && one < two;
};

/** `later` appears after `earlier`, and BOTH appear. */
export const after = (where: Where, later: string, earlier: string): boolean => {
  const one = where.indexOf(later);
  const two = where.indexOf(earlier);
  return one !== -1 && two !== -1 && one > two;
};

/**
 * The LAST `first` appears before `second`, and both appear.
 *
 * For "everything of this kind is above that one thing" — every card above
 * the message box, not merely the first card.
 */
export const lastBefore = (where: Where, first: string, second: string): boolean => {
  const one = where.lastIndexOf(first);
  const two = where.indexOf(second);
  return one !== -1 && two !== -1 && one < two;
};

/**
 * `later` appears after the LAST `earlier`, and both appear.
 *
 * For a list where the earlier thing is a family rather than one entry —
 * every WebM form below every MP4 form, not merely below the first of them.
 */
export const afterLast = (where: Where, later: string, earlier: string): boolean => {
  const one = where.indexOf(later);
  const two = where.lastIndexOf(earlier);
  return one !== -1 && two !== -1 && one > two;
};

/**
 * The text up to `anchor`, or '' when the anchor is not there.
 *
 * The same fault in its other costume. `text.slice(0, text.indexOf(gone))`
 * is `slice(0, -1)` — the whole file but its last character — so a rule
 * meant to hold in the top half of a file quietly widens to all of it and
 * passes on a match from the half it was written to exclude. '' fails loud
 * instead, which is what a vanished anchor should do.
 */
export const upTo = (text: string, anchor: string): string => {
  const at = text.indexOf(anchor);
  return at === -1 ? '' : text.slice(0, at);
};

/** The text from `anchor` onwards, or '' when the anchor is not there. */
export const from = (text: string, anchor: string): string => {
  const at = text.indexOf(anchor);
  return at === -1 ? '' : text.slice(at);
};
