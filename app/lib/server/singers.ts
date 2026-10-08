/**
 * Who is available to sing, and who answers.
 *
 * ── Why this is a list in one file and not self-registration ────────────
 *
 * The first version of this had no such list. `singer.ts` held a mutable
 * register and each supplier called `enrol(…)` at the bottom of its own file,
 * so adding one was a file and an import and nothing else. That is the
 * prettier design and it was wrong, and `check:singer` caught it on its first
 * run — the one assertion that failed said Kits had not enrolled.
 *
 * It had. Twice over, into two different registers.
 *
 * The check imported the module as `…/server/singer.ts` and the Kits adapter
 * imported it as `./singer`. Under plain ESM those are two module records
 * with two separate arrays, so the supplier enrolled into one and the caller
 * read the other. A bundler normalises the two specifiers and it would have
 * worked in the app — which is the part worth being uncomfortable about. It
 * would have been correct in production, incorrect under node, and the
 * difference would have shown up as a feature that was simply switched off,
 * with nothing in any log.
 *
 * So: no import-time side effects, and the identity of a shared mutable thing
 * is never load-bearing. The cost is this file, with one line per supplier.
 * The route still does not list them, which was the point.
 */

import { kitsSinger } from './singerkits';
import type { Singer } from './singer';

/** Everyone there is. One line per supplier, and that is the whole cost. */
export const ROLL: readonly Singer[] = [kitsSinger];

/** For a setup page that has to say who is configured and who is not. */
export const enrolled = (roll: readonly Singer[] = ROLL): readonly Singer[] => roll;

/**
 * Who answers.
 *
 * Named by `SINGER` where it is set, so a second supplier can be switched on
 * without new code being deployed; otherwise the first one configured. Null
 * when nobody is, which the route turns into "not switched on yet" rather
 * than a crash — the same answer it gave before this existed.
 *
 * `roll` is an argument so `check:singer` can drive a supplier that is not
 * Kits through the same function the room uses, rather than through a copy
 * of it written to be tested.
 */
export function theSinger(
  named = process.env.SINGER,
  roll: readonly Singer[] = ROLL,
): Singer | null {
  const want = (named ?? '').trim().toLowerCase();
  if (want) return roll.find((one) => one.id === want && one.configured()) ?? null;
  return roll.find((one) => one.configured()) ?? null;
}
