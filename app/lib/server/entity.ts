/**
 * Who is actually selling this — the company's name, and nothing more.
 *
 * ── What the owner decided, 18 October 2026 ──────────────────────────────
 *
 * The registered name of the company may show. Nothing else about the people
 * behind it does: no name of a person, no email address, no telephone
 * number, no registration number, no address. Anything further is asked for
 * on the help page and answered by a person.
 *
 * So this reads two values and no others. The variables that used to carry
 * the registration number, the registered address, a telephone number, a
 * mailbox, a VAT number and the Information Officer's name are not read at
 * all: a value that is not read cannot be printed by a later change to the
 * page, and one left set in the deployment does nothing.
 *
 * ── What the law asks, said plainly ──────────────────────────────────────
 *
 * Section 43 of the Electronic Communications and Transactions Act lists
 * particulars a supplier selling online makes available to a consumer before
 * they transact — the registration number, a physical address and a
 * telephone number among them. `/legal` says that these are given on request
 * and how to ask, before anybody buys. That is the owner's decision to make
 * and it is recorded here so that nobody "fixes" it back.
 *
 * ── Why the name is not in this file ─────────────────────────────────────
 *
 * It belongs to a legal person rather than to a codebase, and it is read on
 * the server and rendered into HTML, so it never reaches the client bundle.
 */

export interface Entity {
  /** The registered name, exactly as CIPC has it. */
  readonly name: string;
  /** "Private company registered in the Republic of South Africa", or whatever it becomes. */
  readonly status: string;
}

/** A name that says it is a private company, in English or in Afrikaans. */
const COMPANY = /\((Pty|Edms)\)\s*(Ltd|Bpk)\.?$/i;

/**
 * The name and status, or null where the name has not been set.
 *
 * The status is said out loud or it is read off the name. A name that does
 * not end in "(Pty) Ltd" and has no status set publishes nothing, rather than
 * a person described as a company on the one page whose job is to be true.
 */
export function entity(): Entity | null {
  const name = (process.env.FUTUREBOX_LEGAL_NAME ?? '').trim();
  if (!name) return null;
  const status = (process.env.FUTUREBOX_LEGAL_STATUS ?? '').trim()
    || (COMPANY.test(name) ? 'Private company registered in the Republic of South Africa' : '');
  if (!status) return null;
  return { name, status };
}
