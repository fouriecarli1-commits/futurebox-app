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
 * These belong to a legal person rather than to a codebase. The company is
 * registered — CIPC issued 2026/714071/07 on 6 September 2026 — and the
 * number goes into the deployment rather than into this file, along with the
 * registered address, which nobody should have to open a pull request to
 * change. Inventing a plausible one would have been worse than having none: a
 * wrong registration number on a legal page is a false statement about a
 * legal person.
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
  /**
   * Optional since 11 September 2026, and the reason matters.
   *
   * It was required, and one unset variable then threw away the WHOLE
   * disclosure — name, registration number, status, everything — and the
   * page fell back to "The company behind FutureBox is being registered."
   * The company was registered on 5 September. So a missing address made a
   * live legal page state the opposite of the truth about a legal person,
   * which is precisely the harm the required-ness was written to prevent.
   *
   * ECTA s43(1)(b) does ask for a physical address, and a disclosure without
   * one is not complete. But "incomplete and honest" and "complete-looking
   * and false" are not the same failure, and only one of them can be fixed
   * by a reader writing in. The page says the address is available on
   * request and names how — see `app/legal/page.tsx`.
   */
  readonly address?: readonly string[];
  /**
   * A number a person can actually ring.
   *
   * ── Why this is optional, when the Act names it ────────────────────────
   *
   * Section 43(1)(b) asks for a physical address *and* a telephone number, so
   * a published number is the goal and not a nicety. It is optional here for a
   * reason that has nothing to do with the law and everything to do with what
   * happens when it is missing.
   *
   * The owner of this app is one person working from home. The number she has
   * is her own mobile, and putting it on a public page is not a compliance
   * decision — it is a personal-safety one, and it is hers to make rather than
   * this file's. Requiring it meant the page had exactly two states: her
   * private number on the internet, or a page saying "the company is being
   * registered" months after CIPC registered it.
   *
   * That second state is the worse one. It withholds four particulars that are
   * true and useful — name, status, registration number, registered address —
   * because a fifth is not settled, and it does so while telling a reader
   * something that is no longer accurate. A payment processor's compliance
   * reviewer opening that page finds a supplier declaring itself unavailable.
   *
   * So: publish what is known, say out loud what is not, and never publish
   * with no way to reach a person at all — see `entity()` below, which refuses
   * without either this or an address to write to.
   */
  readonly phone?: string;
  /**
   * An address a person can write to.
   *
   * Section 43(1)(c) asks for the web site address *and* an e-mail address, so
   * this was a genuine gap rather than an alternative: the page carried the
   * host and nothing to write to. It is not a substitute for the telephone
   * number — the Act asks for both — but it is a real way to reach the
   * supplier, and it is the one the owner can publish today without publishing
   * where she sleeps.
   *
   * It is read from the environment for the same reason as everything else
   * here: `check:security` keeps mailboxes out of the client bundle, and this
   * page is server-rendered, so the address reaches a reader and a regulator
   * without reaching a crawler walking the JavaScript.
   */
  readonly email?: string;
  /** The VAT number, once there is one. Optional: most start without. */
  readonly vat?: string;
  /** The named Information Officer for POPIA. Usually the director. */
  readonly informationOfficer?: string;
}

/**
 * What a CIPC registration number looks like: 2026/714071/07.
 *
 * Year, a serial, and two digits for the kind of entity — `/07` is a private
 * company, `/23` a non-profit, `/24` an external company. Checked rather than
 * trusted because this value is typed once, by hand, into a settings page, by
 * somebody who will never see it rendered — and a dropped digit produces a
 * page that looks exactly as correct as a right one.
 *
 * Not enforced at runtime: a shape that refuses to publish would answer a
 * typo by taking the whole legal page down, which is worse than the typo.
 * `npm run check:entity` fails the build on it instead, where somebody is
 * watching.
 */
export const CIPC_NUMBER = /^\d{4}\/\d{4,7}\/\d{2}$/;

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
 * Name, status, and at least one way to reach a person — a telephone number,
 * an address to write to, or both. Never a page with no contact on it, and
 * never a person described as a company.
 *
 * The physical address is published when it is set and said to be available
 * on request when it is not. It is NOT a condition of publishing the rest:
 * that cost this app a fortnight of a live page claiming the company was
 * still being registered when it had been registered for six days.
 */
export function entity(): Entity | null {
  const name = (process.env.FUTUREBOX_LEGAL_NAME ?? '').trim();
  const registration = (process.env.FUTUREBOX_LEGAL_REGISTRATION ?? '').trim();
  const status = (process.env.FUTUREBOX_LEGAL_STATUS ?? '').trim();
  const phone = (process.env.FUTUREBOX_LEGAL_PHONE ?? '').trim();
  const email = (process.env.FUTUREBOX_LEGAL_EMAIL ?? '').trim();
  const address = lines(process.env.FUTUREBOX_LEGAL_ADDRESS);
  /* The name is the floor, not the address. See the comment on `address`
     above: requiring it meant one unset variable silently replaced a real
     registered company with a sentence saying it was not one yet. */
  if (!name) return null;

  /* One way to reach a person, at the very least.
     
     This used to demand the telephone number specifically, which meant the
     only way to publish anything was to publish a private mobile. Now either
     will do — but not neither. A supplier disclosure with a name, a number and
     an address on it and no way to make contact is a page that has met the
     letter of a list and missed the point of it, and that is exactly the shape
     a rule like this drifts into when nobody writes down what it is for. */
  if (!phone && !email) return null;

  /* The default only applies where there is a registration number to justify
     it. Without one, the status has to be said out loud — a sole proprietor
     described as a private company is a lie on the one page whose whole job
     is to be true. */
  if (!status && !registration) return null;

  return {
    name,
    status: status || 'Private company registered in the Republic of South Africa',
    ...(registration ? { registration } : {}),
    ...(address.length ? { address } : {}),
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
    ...(process.env.FUTUREBOX_LEGAL_VAT?.trim()
      ? { vat: process.env.FUTUREBOX_LEGAL_VAT.trim() }
      : {}),
    ...(process.env.FUTUREBOX_LEGAL_INFORMATION_OFFICER?.trim()
      ? { informationOfficer: process.env.FUTUREBOX_LEGAL_INFORMATION_OFFICER.trim() }
      : {}),
  };
}
