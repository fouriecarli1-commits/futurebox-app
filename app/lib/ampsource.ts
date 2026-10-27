/**
 * Where a capture in the amp catalogue came from, and whether members may
 * be given it.
 *
 * The owner, 27 October 2026: *"write a where did it come from check for
 * tone3000"*. The catalogue (`AmpCatalogue.tsx`, `app/api/amps`) holds
 * captures on our own database and hands them to every member. TONE3000's
 * API terms forbid exactly that for their tones ("hosting tones on your own
 * servers ... distributing them to users who did not request them through
 * the API"), and their terms of service ask for written permission from
 * both the maker and TONE3000 before anything from them is distributed
 * commercially (`docs/TONE3000-API-TERME.md`).
 *
 * So every capture says where it came from, and only two answers put it in
 * front of members:
 *
 *  - `own`: the owner captured it herself;
 *  - `permission`: somebody else's, with their written permission, and
 *    TONE3000's as well when it came from there. Who gave it, and when,
 *    is written down with it.
 *
 * Anything added before this existed is `unknown`, and members do not see
 * it until she marks it or takes it out.
 */

export type AmpOrigin = 'own' | 'permission' | 'unknown';

/** The two answers that let members have it. */
export const LISTABLE: readonly AmpOrigin[] = ['own', 'permission'];

/** A page on TONE3000, by its address. */
export function fromTone3000(source: string): boolean {
  try {
    const host = new URL(source.trim()).hostname.toLowerCase();
    return host === 'tone3000.com' || host.endsWith('.tone3000.com');
  } catch {
    return /tone3000/i.test(source);
  }
}

/** Whether members may be given this one. */
export function mayList(origin: string | null | undefined): boolean {
  return (LISTABLE as readonly string[]).includes(origin ?? '');
}

/** The least a note of permission says: who gave it, and when. */
export const PERMISSION_LEAST = 12;

/**
 * Why a capture may not go in with this answer, or null when it may.
 * The same sentence on the owner's form and from the route.
 */
export function originRefusal(origin: string, source: string, permission: string): string | null {
  if (!mayList(origin)) {
    return 'Say where it came from: one you captured yourself, or somebody else\'s with their written permission.';
  }
  if (origin === 'permission' && permission.trim().length < PERMISSION_LEAST) {
    return fromTone3000(source)
      ? 'This one is from TONE3000. Their terms need written permission from the maker and from TONE3000 before it goes to members: say who gave it and when.'
      : 'Say who gave written permission, and when.';
  }
  return null;
}
