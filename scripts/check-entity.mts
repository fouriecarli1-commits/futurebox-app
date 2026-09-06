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
import { entity } from '../app/lib/server/entity';

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
check('and the address is one line per line, split on the pipe',
  company?.address.length === 4 && company?.address[0] === '12 Example Street',
  (company?.address ?? []).join(' / '));
check('with no VAT number invented', company?.vat === undefined);

/* ── A sole proprietor ─────────────────────────────────────────────────── */
const sole = only({
  FUTUREBOX_LEGAL_NAME: 'Anré Fourie',
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
  FUTUREBOX_LEGAL_NAME: 'Anré Fourie',
  FUTUREBOX_LEGAL_ADDRESS: '12 Example Street|Cape Town|8001',
  FUTUREBOX_LEGAL_PHONE: '+27 21 000 0000',
});
check('no number and no status publishes nothing, rather than calling a person a company',
  unstated === null, unstated ? `it said: ${unstated.status}` : 'nothing');

/* ── The half-filled cases ─────────────────────────────────────────────── */
check('a name with no telephone number is not enough',
  only({
    FUTUREBOX_LEGAL_NAME: 'FutureBox Studio (Pty) Ltd',
    FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
    FUTUREBOX_LEGAL_ADDRESS: '12 Example Street|Cape Town',
  }) === null);
check('nor a name with no address',
  only({
    FUTUREBOX_LEGAL_NAME: 'FutureBox Studio (Pty) Ltd',
    FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
    FUTUREBOX_LEGAL_PHONE: '+27 21 000 0000',
  }) === null);
check('nor an address with no name',
  only({
    FUTUREBOX_LEGAL_ADDRESS: '12 Example Street|Cape Town',
    FUTUREBOX_LEGAL_PHONE: '+27 21 000 0000',
    FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
  }) === null);

/* ── The optional two, which appear only when set ──────────────────────── */
const full = only({
  FUTUREBOX_LEGAL_NAME: 'FutureBox Studio (Pty) Ltd',
  FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
  FUTUREBOX_LEGAL_ADDRESS: '12 Example Street|Cape Town|8001',
  FUTUREBOX_LEGAL_PHONE: '+27 21 000 0000',
  FUTUREBOX_LEGAL_VAT: '4123456789',
  FUTUREBOX_LEGAL_INFORMATION_OFFICER: 'Anré Fourie',
});
check('a VAT number appears once there is one', full?.vat === '4123456789');
check('and the POPIA information officer with it',
  full?.informationOfficer === 'Anré Fourie', full?.informationOfficer ?? '(none)');

/* Whitespace, because a value pasted out of a document carries it. */
const padded = only({
  FUTUREBOX_LEGAL_NAME: '  FutureBox Studio (Pty) Ltd  ',
  FUTUREBOX_LEGAL_REGISTRATION: ' 2026/123456/07 ',
  FUTUREBOX_LEGAL_ADDRESS: ' 12 Example Street | Cape Town ',
  FUTUREBOX_LEGAL_PHONE: ' +27 21 000 0000 ',
});
check('a value pasted with spaces around it is trimmed',
  padded?.name === 'FutureBox Studio (Pty) Ltd' && padded?.address[1] === 'Cape Town',
  `${padded?.name} / ${(padded?.address ?? []).join(' / ')}`);

if (failures) {
  console.error(`\ncheck:entity — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:entity — the legal page is right the first time it is filled in, or it says nothing.');
