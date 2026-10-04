/**
 * What is in the film, and whether this app can vouch for it.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"Copyright check for export."*
 *
 * ── What this is NOT, said first ─────────────────────────────────────────
 *
 * It does not check copyright. Nothing in this app can: a real check means
 * fingerprinting the audio and the picture against the rights databases the
 * platforms license, and FutureBox has no such service and is not pretending
 * to one. A button that said "no copyright problems" would be worse than no
 * button at all — it would be this app telling somebody their video is safe
 * to post, in writing, on no evidence.
 *
 * ── What it IS ───────────────────────────────────────────────────────────
 *
 * The one thing this app genuinely knows: which parts of the film came out of
 * it, and which parts somebody carried in.
 *
 * A shot an engine drew here, or a take filmed in the booth here, is hers —
 * the terms say so and the bill proves she paid for it. A file brought in off
 * a phone is a file this app has never seen before, and the one honest thing
 * to do about it is to say so by name, before the render rather than after
 * the takedown, and ask her to confirm she has the right to use it.
 *
 * ── Why provenance has to be carried and cannot be guessed ───────────────
 *
 * It was not carried before this. `bringIn` takes a `File` and makes a piece,
 * and the piece it makes from her own channel looked exactly like the piece
 * it makes from a song she found somewhere — same shape, same fields, nothing
 * to tell them apart. So every answer here depends on `came` being set at the
 * two doors, and `check:filmrights` holds both of them shut.
 */

import type { Edit, Piece } from './videoedit';

/**
 * Where a piece of this film came from.
 *
 * `filmed` and `made` both mean "out of this app": one through the camera in
 * the booth, one out of an engine this app paid for. `device` means a file
 * that arrived from somewhere nobody here can see.
 */
export type Came = 'filmed' | 'made' | 'device';

/** Whether this app can say where something came from. */
export const ours = (came: Came | undefined): boolean => came === 'filmed' || came === 'made';

/** One thing in the film this app cannot vouch for. */
export interface Brought {
  readonly what: string;
  /** `song` for the bed, otherwise the piece's id. */
  readonly id: string;
  readonly kind: 'shot' | 'song';
}

/**
 * Everything in the film that came from somewhere else.
 *
 * A piece with NO `came` on it counts as brought in, and that direction is
 * deliberate: films made before provenance was carried have nothing on them,
 * and the safe reading of "I do not know" is "I cannot vouch for it". The
 * other way round, an old film would quietly be declared clean.
 */
export function broughtIn(edit: Edit): readonly Brought[] {
  const out: Brought[] = [];
  for (const piece of edit.pieces) {
    if (ours(piece.came)) continue;
    out.push({ what: piece.name, id: piece.id, kind: 'shot' });
  }
  if (edit.under && !ours(edit.underCame)) {
    out.push({ what: edit.underName ?? 'the track under the film', id: 'song', kind: 'song' });
  }
  return out;
}

/** Whether the export has to stop and ask first. */
export const mustOwn = (edit: Edit): boolean => broughtIn(edit).length > 0;

/**
 * What this app made, for the other half of the sentence.
 *
 * Counted rather than listed: the panel's job is to put her attention on the
 * things it cannot vouch for, and a list of twenty shots she already knows
 * are hers is a list she reads past on the way to the one that matters.
 */
export function madeHere(edit: Edit): number {
  return edit.pieces.filter((one) => ours(one.came)).length
    + (edit.under && ours(edit.underCame) ? 1 : 0);
}

/** A piece of this type, used by `bringFromChannel` and the pickers. */
export const cameFromChannel = (filmed: boolean): Came => (filmed ? 'filmed' : 'made');
