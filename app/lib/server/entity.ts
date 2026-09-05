/**
 * Who is actually selling this, in the words the law wants.
 *
 * ── Why this exists, after a year of the opposite ────────────────────────
 *
 * This app deliberately printed no address anywhere. `/help` is a form that
 * reaches the one inbox with the sender's own address as reply-to, and
 * `check:security` fails the build if a mailbox or a `mailto:` appears in
 * anything the browser can reach. That was a good decision against scraping
 * and it is still the right default for every screen in the app.
 *
 * It is not compatible with section 43 of the Electronic Communications and
 * Transactions Act, which requires a supplier selling to South Africans to
 * make its full name, legal status, registration number, physical address and
 * a contact number available to a consumer *before* they transact. A form is
 * not that. One page carrying the particulars is.
 *
 * ── Why the values are not in this file ──────────────────────────────────
 *
 * Two reasons, and the second is the one that matters.
 *
 * The company is not registered yet, so there is no registration number and
 * no registered address to write down. Inventing a plausible one would be
 * worse than having none: a wrong registration number on a legal page is a
 * false statement about a legal person.
 *
 * And these are read on the server and rendered into HTML. Nothing here
 * reaches the client bundle, so the address is on the page for a reader and a
 * regulator without being in a JavaScript file for a scraper to walk. That is
 * why the variables are not `NEXT_PUBLIC_` — if they were, they would be.
 *
 * ── What happens until they are set ──────────────────────────────────────
 *
 * The page says plainly that the details are not published yet and why, rather
 * than showing a blank list or a placeholder that reads as real. An honest
 * gap is defensible while a company is being registered; a fabricated
 * particular is not defensible at any point.
 */

export interface Entity {
  /** The registered name, exactly as CIPC has it. */
  readonly name: string;
  /** "Private company registered in South Africa", or whatever it becomes. */
  readonly status: string;
  /**
   * The CIPC registration number, e.g. 2026/123456/07.
   *
   * Optional, because a sole proprietor has none. ECTA asks for one "where
   * applicable" — for a natural person trading under a name, the identifying
   * particulars are the person's own full name and physical address, and a
   * blank row labelled "Registration number" would suggest something is
   * missing rather than that it does not exist.
   */
  readonly registration?: string;
  /** The registered office, as one line per line. */
  readonly address: readonly string[];
  /** A number a person can actually ring. */
  readonly phone: string;
  /** The VAT number, once there is one. Optional: most start without. */
  readonly vat?: string;
  /** The named Information Officer for POPIA. Usually the director. */
  readonly informationOfficer?: string;
}

/** Split on the pipe, so one variable can hold a multi-line address. */
function lines(value: string | undefined): string[] {
  return (value ?? '')
    .split('|')
    .map((one) => one.trim())
    .filter(Boolean);
}

/**
 * The particulars, or null where they have not been set.
 *
 * ── Who is selling, in the two shapes it comes in ────────────────────────
 *
 * A company has a registration number. A sole proprietor does not — there is
 * nothing to register, and the seller is a person trading under a name. Both
 * can sell online and both owe the same disclosure; only one of them has a
 * number to give.
 *
 * So the number is optional and the *status* is not. A page that said
 * "Private company registered in the Republic of South Africa" above a name
 * with no number would be a false statement about a legal person, which is
 * exactly what this file exists to avoid — and it would have been the default
 * for anybody who filled in the other four and left the number out.
 *
 * Name, status, address and a telephone number, or nothing at all.
 */
export function entity(): Entity | null {
  const name = (process.env.FUTUREBOX_LEGAL_NAME ?? '').trim();
  const registration = (process.env.FUTUREBOX_LEGAL_REGISTRATION ?? '').trim();
  const status = (process.env.FUTUREBOX_LEGAL_STATUS ?? '').trim();
  const phone = (process.env.FUTUREBOX_LEGAL_PHONE ?? '').trim();
  const address = lines(process.env.FUTUREBOX_LEGAL_ADDRESS);
  if (!name || !phone || !address.length) return null;

  /* The default only applies where there is a registration number to justify
     it. Without one, the status has to be said out loud — a sole proprietor
     described as a private company is a lie on the one page whose whole job
     is to be true. */
  if (!status && !registration) return null;

  return {
    name,
    status: status || 'Private company registered in the Republic of South Africa',
    ...(registration ? { registration } : {}),
    address,
    phone,
    ...(process.env.FUTUREBOX_LEGAL_VAT?.trim()
      ? { vat: process.env.FUTUREBOX_LEGAL_VAT.trim() }
      : {}),
    ...(process.env.FUTUREBOX_LEGAL_INFORMATION_OFFICER?.trim()
      ? { informationOfficer: process.env.FUTUREBOX_LEGAL_INFORMATION_OFFICER.trim() }
      : {}),
  };
}
