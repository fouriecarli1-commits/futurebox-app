/**
 * Names nobody may take, except the people who run the place.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * The recording name goes out on every release, sits beside every post in the
 * live room, and is what a stranger on the collab radar reads. So an account
 * calling itself "FutureBox Official" is not a naming clash — it is somebody
 * standing at the front of this app's own room speaking as the app. Whatever
 * they then say, ask for, or link to arrives with the house's authority
 * behind it, and the first person to lose something will have lost it to a
 * name this app handed out.
 *
 * ── Two lists, matched two different ways ────────────────────────────────
 *
 * `CORES` are the brand's own words and are matched **anywhere** in the name.
 * "The FutureBox Team", "futurebox_official", "F U T U R E B O X" all have to
 * fail, and they only fail if the test is containment rather than equality.
 *
 * `EXACT` are the role words — official, admin, support — and are matched on
 * the **whole** name only. "Official" alone is a claim; "Official Records" is
 * a record label, and blocking it would be this file overreaching.
 *
 * The asymmetry is deliberate: over-blocking a brand word costs somebody a
 * second choice of name, and under-blocking one costs somebody their money.
 *
 * ── The normalising is the actual work ───────────────────────────────────
 *
 * A plain lowercase comparison stops nobody. `Future-Box`, `future_box`,
 * `f.u.t.u.r.e.b.o.x`, `FutureB0x`, `𝗙uturebox` and `Futurebox ` are all the
 * same claim to a reader and six different strings to a computer. So the
 * value is folded down before it is compared: accents removed, lookalikes
 * mapped back to letters, everything that is not a letter or a digit dropped,
 * and runs of a repeated letter collapsed so `fuuuturebox` does not walk past.
 *
 * This will never catch every spelling somebody can invent. It catches the
 * ones people actually try, and the rest is a report button and a takedown —
 * which is true of every impersonation rule anywhere.
 *
 * ── No imports ───────────────────────────────────────────────────────────
 *
 * Same rule as `server/owners.ts`, for the same reason: this decides who is
 * refused, and a rule nobody can test on its own is a rule nobody should
 * trust. It runs on the server, where it is authoritative, and in the browser,
 * where it is only a courtesy so somebody is told before they press Save.
 */

/** The brand's own words. Matched anywhere in a name. */
export const CORES: readonly string[] = [
  'futurebox',
  'futureboxstudio',
  'vibefy',
];

/** Role words. Matched only as the whole name. */
export const EXACT: readonly string[] = [
  'official',
  'admin',
  'administrator',
  'moderator',
  'mod',
  'support',
  'help',
  'helpdesk',
  'staff',
  'team',
  'system',
  'root',
  'security',
  'billing',
  'payments',
  'owner',
  'verified',
];

/** Digits and symbols that stand in for letters, and what they stand in for. */
const LOOKALIKE: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g',
  '@': 'a', '$': 's', '!': 'i', '|': 'i', '£': 'e', '€': 'e',
};

/**
 * One name, folded down to what it is actually claiming.
 *
 * Exported because the tests read better against it than against the boolean,
 * and because a caller that wants to explain *why* something was refused has
 * to be able to show the folded form.
 */
export function fold(value: string): string {
  const lower = (value ?? '').toLowerCase();
  /* Accents off first. "Fütürebox" is the same claim, and NFD splits a letter
     from its mark so the mark can be dropped on its own. */
  const plain = lower.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  let out = '';
  for (const ch of plain) {
    const swapped = LOOKALIKE[ch] ?? ch;
    if (/[a-z0-9]/.test(swapped)) out += swapped;
  }
  // `fuuuturebox` is `futurebox` with a stutter, and is meant to be read as it.
  return out.replace(/(.)\1+/g, '$1');
}

/**
 * Whether this name is one nobody but the house may use.
 *
 * The folded form of a reserved word is compared, not the word itself: the
 * lists are written the way a person would write them and folded here, so
 * adding an entry needs no thought about the normalising.
 */
export function isReserved(value: string): boolean {
  const folded = fold(value);
  if (!folded) return false;
  if (CORES.some((one) => folded.indexOf(fold(one)) !== -1)) return true;
  return EXACT.some((one) => folded === fold(one));
}

/**
 * What to say when it is refused.
 *
 * One sentence, and it names the reason rather than the rule: somebody who
 * typed "FutureBox Official" by accident needs to know it reads as the app
 * speaking, and somebody who typed it on purpose needs to know it will not
 * work rather than which characters to change.
 */
export const RESERVED_REASON =
  'That name is the app’s own. Pick one that is yours, so nobody can mistake your posts for the official channel.';
