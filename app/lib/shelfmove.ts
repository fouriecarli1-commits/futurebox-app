'use client';

/**
 * Carrying what is on this device up to the account, once.
 *
 * ── Why this exists at all ───────────────────────────────────────────────
 *
 * The shelves were on the device for a day. Carli, 9 October 2026, as soon
 * as she had seen them working: *"Skuif die stories en liedjies na die
 * server toe."*
 *
 * Moving where new things are kept is two lines. What is already kept is the
 * part that needs care, because the alternative is somebody opening the kids
 * room after an update and finding an empty shelf — which is the worst class
 * of fault this app has a name for, and which would look exactly like the
 * feature being broken rather than like a move.
 *
 * ── The order, which is the whole of it ──────────────────────────────────
 *
 * Up first, and only then off the device. Never the other way round and
 * never both at once:
 *
 *   · read the device shelf;
 *   · push each item to the account;
 *   · delete from the device ONLY the ones the account confirmed.
 *
 * So an upload that fails — no signal, a full bucket, a browser with no
 * storage — leaves the item exactly where it was, and the next visit tries
 * again. Nothing is ever in neither place.
 *
 * An item that is already up is skipped by its id: the account's own ids are
 * the device's ids, carried over unchanged, so a move interrupted halfway
 * does not make a second copy of the half that got there.
 *
 * ── Why it runs quietly ──────────────────────────────────────────────────
 *
 * Because nobody asked for a migration. A grown-up opening the kids room
 * wants the shelf; being told that four stories were moved is being told
 * about plumbing. It returns what it did so a check can drive it, and the
 * rooms ignore the answer.
 */

import type { Put, Shelf } from './ondevice';

export interface Moved {
  /** How many were carried up. */
  readonly moved: number;
  /** How many are still on the device because the account would not take them. */
  readonly left: number;
}

/**
 * Move one shelf's contents.
 *
 * Both shelves share the `Shelf` interface, so this works for stories and
 * songs without knowing which it has — which is the reason `cloudshelf.ts`
 * was given the same shape as `ondevice.ts` rather than a shape of its own.
 */
export async function moveShelf<T extends { id: string; made: number }>(
  from: Shelf<T>,
  to: Shelf<T>,
): Promise<Moved> {
  let here: T[] = [];
  try {
    here = await from.all();
  } catch {
    /* No IndexedDB at all — a private window, usually. There is nothing on
       the device to move, which is the same answer as an empty shelf. */
    return { moved: 0, left: 0 };
  }
  if (!here.length) return { moved: 0, left: 0 };

  let there: T[] = [];
  try {
    there = await to.all();
  } catch {
    /* The account could not be read. Moving blind would risk a second copy
       of everything, so nothing moves and the device keeps it all. */
    return { moved: 0, left: here.length };
  }
  const already = new Set(there.map((one) => one.id));

  let moved = 0;
  let left = 0;
  for (const one of here) {
    if (already.has(one.id)) {
      /* Already up, from a move that was interrupted. Taking it off the
         device now is the last step of that move finishing. */
      await from.forget(one.id);
      moved += 1;
      continue;
    }

    let put: Put = 'off';
    try {
      put = await to.keep(one);
    } catch {
      put = 'off';
    }

    if (put === 'kept') {
      /* Only now. An item deleted before the account confirmed is an item in
         neither place. */
      await from.forget(one.id);
      moved += 1;
    } else {
      /* `shelfFull`, `full` and `off` all mean the same thing here: it stays
         where it is and the next visit tries again. A shelf that is full on
         the account is a reason to leave the device's copy alone, not to
         throw it away. */
      left += 1;
    }
  }

  return { moved, left };
}
