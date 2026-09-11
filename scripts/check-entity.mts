/**
 * The one page whose whole job is to be true.
 *
 * Section 43 of the Electronic Communications and Transactions Act requires a
 * supplier selling to South Africans to make its name, legal status,
 * registration number, physical address and a telephone number available
 * before a consumer transacts. `/legal` is that page and `lib/server/entity.ts`
 * decides what goes on it.
 *
 * ── Why this is checked now, before there is anything to put on it ───────
 *
 * Because the moment CIPC issues a number, five environment variables get
 * typed into Vercel once, by somebody who will not read this file, and the
 * page is either right or it is a false statement about a legal person. There
 * is no second chance to notice: an incorrect legal page looks exactly like a
 * correct one to whoever set it.
 *
 * So the shapes are exercised here, with the answers known first — including
 * the two ways it must refuse. A page that says nothing while a company is
 * being registered is defensible; a page that describes a sole proprietor as a
 * private company is not, and that was the default for anybody who filled in
 * four fields and left the number out.
 */
import { readFileSync } from 'node:fs';
import { CIPC_NUMBER, entity } from '../app/lib/server/entity';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const KEYS = [
  'FUTUREBOX_LEGAL_NAME',
  'FUTUREBOX_LEGAL_STATUS',
  'FUTUREBOX_LEGAL_REGISTRATION',
  'FUTUREBOX_LEGAL_ADDRESS',
  'FUTUREBOX_LEGAL_PHONE',
  'FUTUREBOX_LEGAL_EMAIL',
  'FUTUREBOX_LEGAL_VAT',
  'FUTUREBOX_LEGAL_INFORMATION_OFFICER',
] as const;

/** Set exactly these and nothing else, so one case cannot leak into the next. */
function only(values: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const key of KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
  return entity();
}

/* ── Nothing set: the page says so rather than showing a blank list ────── */
check('with nothing set there is no entity to print', only({}) === null);

/* ── A company ─────────────────────────────────────────────────────────── */
const company = only({
  FUTUREBOX_LEGAL_NAME: 'FutureBox Studio (Pty) Ltd',
  FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
  FUTUREBOX_LEGAL_ADDRESS: '12 Example Street|Somewhere|Cape Town|8001',
  FUTUREBOX_LEGAL_PHONE: '+27 21 000 0000',
});
check('a company with a number is published', company !== null);
check('and its number is on it', company?.registration === '2026/123456/07', company?.registration ?? '(none)');
check('the status defaults only where a number justifies it',
  company?.status === 'Private company registered in the Republic of South Africa', company?.status);
/* `?.` on the address too, not only on the company.

   `address` became optional on 11 September 2026 — one unset variable used
   to throw away the whole disclosure and put "the company is being
   registered" on a live page about a company registered six days earlier.
   This line kept reading `company?.address.length`, which is only safe
   while a company always has one. It never failed, because scripts/ was
   outside the typecheck: tsconfig's include patterns miss it, since
   every check here is
   a .mts, and the include pattern only reaches plain .ts. Sixty-odd
   checks, none of them ever read by tsc. */
check('and the address is one line per line, split on the pipe',
  company?.address?.length === 4 && company?.address?.[0] === '12 Example Street',
  (company?.address ?? []).join(' / '));
check('with no VAT number invented', company?.vat === undefined);

/* ── The real number, and the shapes a typo takes ───────────────────────
 
   CIPC issued 2026/714071/07 on 5 September 2026. It is typed once, by hand,
   into a settings page, by somebody who will never see it rendered.

   What this shape can and cannot catch is worth being exact about. It catches
   a mangled year, a missing entity code, the wrong separators, and the name
   pasted into the number field. It does NOT catch a digit dropped from the
   serial: CIPC serials have had between four and seven digits over the years,
   so 2026/71407/07 is a shape somebody's real company has. A check that
   claimed otherwise would be a check that is wrong about the world, which is
   worse than a narrow one — this exact case was written as a failing
   assertion first and the regex was nearly tightened to make it pass. */
check('the real registration number is the shape CIPC issues',
  CIPC_NUMBER.test('2026/714071/07'));
check('and a shorter historic serial is not called invalid',
  CIPC_NUMBER.test('2011/71407/07'));
for (const [wrong, how] of [
  ['226/714071/07', 'a digit dropped from the year'],
  ['2026/714071/7', 'a digit dropped from the entity code'],
  ['2026-714071-07', 'hyphens instead of slashes'],
  ['2026/714071', 'the entity code left off'],
  ['FUTUREBOXSTUDIO', 'the name pasted into the number field'],
] as const) {
  check(`refused: ${how}`, !CIPC_NUMBER.test(wrong), wrong);
}

/* ── A sole proprietor ─────────────────────────────────────────────────── */
const sole = only({
  FUTUREBOX_LEGAL_NAME: 'A. Example',
  FUTUREBOX_LEGAL_STATUS: 'Sole proprietor trading as FutureBox Studio',
  FUTUREBOX_LEGAL_ADDRESS: '12 Example Street|Cape Town|8001',
  FUTUREBOX_LEGAL_PHONE: '+27 21 000 0000',
});
check('a sole proprietor with no number is published', sole !== null);
check('and is not given a registration row that does not exist',
  sole?.registration === undefined, sole?.registration ?? '(none)');
check('and is described as what they are',
  sole?.status === 'Sole proprietor trading as FutureBox Studio', sole?.status);

/* ── The refusal that matters ──────────────────────────────────────────── */
const unstated = only({
  FUTUREBOX_LEGAL_NAME: 'A. Example',
  FUTUREBOX_LEGAL_ADDRESS: '12 Example Street|Cape Town|8001',
  FUTUREBOX_LEGAL_PHONE: '+27 21 000 0000',
});
check('no number and no status publishes nothing, rather than calling a person a company',
  unstated === null, unstated ? `it said: ${unstated.status}` : 'nothing');

/* ── The half-filled cases ─────────────────────────────────────────────── */
check('a name with no way at all to reach anybody is not enough',
  only({
    FUTUREBOX_LEGAL_NAME: 'FutureBox Studio (Pty) Ltd',
    FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
    FUTUREBOX_LEGAL_ADDRESS: '12 Example Street|Cape Town',
  }) === null);
/* ── This assertion used to say the opposite, and it caused the fault ──
 
   It read "nor a name with no address" and required null. So an unset
   FUTUREBOX_LEGAL_ADDRESS threw away the entire disclosure — the registered
   name, the CIPC number, the status, the mailbox — and `/legal` fell back to
   "The company behind FutureBox is being registered."
 
   The company was registered on 5 September 2026. Carli sent a screenshot on
   the 11th with that sentence still on the live page. One unset variable had
   a legal page stating the opposite of the truth about a legal person for six
   days, which is exactly the harm this rule was written to prevent.
 
   Section 43(1)(b) does ask for a physical address and a disclosure without
   one is not complete. But "incomplete and honest" and "complete-looking and
   false" are different failures, and only the first can be fixed by a reader
   writing in. So a name with a contact publishes, the address row says it is
   available on request, and what is withheld is one row rather than the
   company's existence.
 
   The lesson is the day's lesson again from a third angle: this check
   asserted a CLAIM — "a disclosure must carry an address" — rather than the
   constraint underneath it, which is that nothing on the page may be untrue. */
check('a name and a contact publish even with no address yet',
  only({
    FUTUREBOX_LEGAL_NAME: 'FutureBox Studio (Pty) Ltd',
    FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
    FUTUREBOX_LEGAL_PHONE: '+27 21 000 0000',
  })?.name === 'FutureBox Studio (Pty) Ltd');
check('  and the address is simply absent rather than invented',
  only({
    FUTUREBOX_LEGAL_NAME: 'FutureBox Studio (Pty) Ltd',
    FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
    FUTUREBOX_LEGAL_PHONE: '+27 21 000 0000',
  })?.address === undefined);
check('nor an address with no name',
  only({
    FUTUREBOX_LEGAL_ADDRESS: '12 Example Street|Cape Town',
    FUTUREBOX_LEGAL_PHONE: '+27 21 000 0000',
    FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
  }) === null);

/* ── Reaching a person: the telephone number, the mailbox, or both ──────

   This used to be one rule — a telephone number or nothing — and the cost of
   it was not visible until the company was actually registered. The owner is
   one person working from home whose only number is her own mobile, so the
   rule offered her a choice between publishing that number and publishing a
   page that said "the company is being registered" months after it was. Four
   true particulars withheld to enforce a fifth.

   Now either reaches a person, and the page says out loud which one is
   missing. What has NOT been relaxed is the floor: a supplier page with no way
   to make contact on it publishes nothing, because that is the failure this
   whole file exists to prevent. */
const byMail = only({
  FUTUREBOX_LEGAL_NAME: 'FUTUREBOXSTUDIO (Pty) Ltd',
  FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
  FUTUREBOX_LEGAL_ADDRESS: '12 Example Street|Cape Town|8001',
  FUTUREBOX_LEGAL_EMAIL: 'legal@example.com',
});
check('an address to write to and no telephone number still publishes', byMail !== null);
check('and no number is invented to fill the row', byMail?.phone === undefined, byMail?.phone ?? '(none)');
check('and the mailbox is on it', byMail?.email === 'legal@example.com', byMail?.email ?? '(none)');

const byPhone = only({
  FUTUREBOX_LEGAL_NAME: 'FUTUREBOXSTUDIO (Pty) Ltd',
  FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
  FUTUREBOX_LEGAL_ADDRESS: '12 Example Street|Cape Town|8001',
  FUTUREBOX_LEGAL_PHONE: '+27 21 000 0000',
});
check('a telephone number and no mailbox still publishes', byPhone !== null);
check('and no address is invented to fill that row',
  byPhone?.email === undefined, byPhone?.email ?? '(none)');

check('but neither one publishes nothing at all, rather than a page nobody can answer',
  only({
    FUTUREBOX_LEGAL_NAME: 'FUTUREBOXSTUDIO (Pty) Ltd',
    FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
    FUTUREBOX_LEGAL_ADDRESS: '12 Example Street|Cape Town|8001',
  }) === null);

/* ── The optional two, which appear only when set ──────────────────────── */
const full = only({
  FUTUREBOX_LEGAL_NAME: 'FutureBox Studio (Pty) Ltd',
  FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
  FUTUREBOX_LEGAL_ADDRESS: '12 Example Street|Cape Town|8001',
  FUTUREBOX_LEGAL_PHONE: '+27 21 000 0000',
  FUTUREBOX_LEGAL_EMAIL: 'legal@example.com',
  FUTUREBOX_LEGAL_VAT: '4123456789',
  FUTUREBOX_LEGAL_INFORMATION_OFFICER: 'A. Example',
});
check('a VAT number appears once there is one', full?.vat === '4123456789');
check('and the POPIA information officer with it',
  full?.informationOfficer === 'A. Example', full?.informationOfficer ?? '(none)');

/* Whitespace, because a value pasted out of a document carries it. */
const padded = only({
  FUTUREBOX_LEGAL_NAME: '  FutureBox Studio (Pty) Ltd  ',
  FUTUREBOX_LEGAL_REGISTRATION: ' 2026/123456/07 ',
  FUTUREBOX_LEGAL_ADDRESS: ' 12 Example Street | Cape Town ',
  FUTUREBOX_LEGAL_PHONE: ' +27 21 000 0000 ',
});
check('a value pasted with spaces around it is trimmed',
  padded?.name === 'FutureBox Studio (Pty) Ltd' && padded?.address?.[1] === 'Cape Town',
  `${padded?.name} / ${(padded?.address ?? []).join(' / ')}`);

/* ── Both documents must say these values are PUBLISHED ────────────────
 
   On 11 September 2026 Carli put her home address in
   FUTUREBOX_LEGAL_ADDRESS and deployed it, having understood an earlier
   assurance to mean it would be kept private. The assurance was real and
   was about something else: nothing from the CIPC certificate is written
   into the REPOSITORY, which is why these are environment variables rather
   than lines of code.
 
   "Out of the repository" and "private" are not the same thing, and the gap
   between them was a home address on a public page for a few hours. She had
   said twice she did not want it published.
 
   `.env.example` said only "The registered office". `docs/SWITCH-ON.md` said
   only what to type. Neither said the value is printed in full on a page
   anybody can open — which is the single most important thing about them.
 
   Both carry that warning now, and this keeps it there. Matched on meaning
   rather than on a sentence: any of several words will do, so a reword
   passes and a deletion does not. Today's own lesson, applied — a check that
   pins one phrasing is a check somebody routes around. */
const SAYS_PUBLIC = /public (web )?page|printed on a public|openbare bladsy|gedruk, in volle|billboard|advertensiebord/i;

for (const [what, where] of [
  ['.env.example', '.env.example'],
  ['the switch-on page', 'docs/SWITCH-ON.md'],
] as const) {
  const page = readFileSync(where, 'utf8');
  const at = page.indexOf('FUTUREBOX_LEGAL_ADDRESS');
  /* Near the variable, not merely somewhere in a long file — a warning three
     hundred lines away is a warning nobody reads at the moment of typing. */
  const near = at === -1 ? '' : page.slice(Math.max(0, at - 3000), at + 600);
  check(`${what} warns that the legal values are published in full`,
    at !== -1 && SAYS_PUBLIC.test(near),
    at === -1
      ? 'the variable is not named there at all'
      : 'it says what to type and not that it goes on a page anybody can open');
}

if (failures) {
  console.error(`\ncheck:entity — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:entity — the legal page is right the first time it is filled in, or it says nothing.');
