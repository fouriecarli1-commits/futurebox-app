/**
 * The gallery: what a child drew, made or filmed, kept on the device.
 *
 * ── Where it came from ───────────────────────────────────────────────────
 *
 * Carli, 13 October 2026, on the new room: a drawing board "that captures
 * their shape and makes their drawings realistically alive", picture
 * prompting "so that they can really flex their creative muscles", and an
 * editor "so that they can through drawings create their own video". Each
 * of those makes a THING, and a thing a six-year-old made and cannot find
 * tomorrow is the first thing they will notice — the song shelf learned
 * that on 9 October.
 *
 * One shelf for all of them, the same shelf machinery the songs and the
 * stories use (`lib/ondevice.ts`), with a database of its own. A piece is a
 * blob and what kind it is; the blob is the whole of it, so a drawing is a
 * PNG, a picture is what Google sent back, and a film is the WebM the
 * editor rendered in the browser.
 *
 * Nothing here is sent anywhere. The room's rule — no way out, nothing
 * shared — holds for the gallery too: it is looked at in the room, and the
 * grown-up's bin is the only thing that takes from it.
 */
import { shelfOf, type Put, type Shelf } from './ondevice';

export type PieceKind = 'drawing' | 'picture' | 'film';

export interface KeptPiece {
  readonly id: string;
  readonly made: number;
  readonly kind: PieceKind;
  /** A few words the child chose, as the room read them out. */
  readonly title: string;
  readonly blob: Blob;
}

/** The most the gallery holds. Enough for a wall; not a hard drive. */
export const MOST_PIECES = 30;

const shelf: Shelf<KeptPiece> = shelfOf<KeptPiece>({
  database: 'futurebox-kidsgallery',
  store: 'pieces',
  most: MOST_PIECES,
  sound: (one) => Boolean(one.id) && one.blob instanceof Blob && one.blob.size > 0,
});

export const keepPiece = (piece: KeptPiece): Promise<Put> => shelf.keep(piece);
export const allPieces = (): Promise<KeptPiece[]> => shelf.all();
export const forgetPiece = (id: string): Promise<void> => shelf.forget(id);
