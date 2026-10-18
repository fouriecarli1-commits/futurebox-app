/**
 * The legal page prints the company's name, and nothing about its people.
 *
 * Section 43 of the Electronic Communications and Transactions Act lists what
 * a supplier selling online makes available to a consumer. `/legal` is that
 * page and `lib/server/entity.ts` decides what goes on it.
 *
 * ── What the owner decided, 18 October 2026 ──────────────────────────────
 *
 * The registered name of the company may show. No person's name, no email
 * address, no telephone number, no registration number and no address; the
 * further particulars are given on request through the help page.
 *
 * So what is held here is that the other values cannot reach the page: they
 * are set in every case below and none of them comes back out of `entity()`,
 * the page reads nothing but the name and the status, and the example
 * settings no longer ask anybody to type them in.
 */
import { readFileSync } from 'node:fs';
import { entity } from '../app/lib/server/entity';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

/** The variables that used to be printed, and must now be read by nothing. */
const RETIRED = [
  'FUTUREBOX_LEGAL_REGISTRATION',
  'FUTUREBOX_LEGAL_ADDRESS',
  'FUTUREBOX_LEGAL_PHONE',
  'FUTUREBOX_LEGAL_EMAIL',
  'FUTUREBOX_LEGAL_VAT',
  'FUTUREBOX_LEGAL_INFORMATION_OFFICER',
] as const;
const KEYS = ['FUTUREBOX_LEGAL_NAME', 'FUTUREBOX_LEGAL_STATUS', ...RETIRED] as const;

/** Set exactly these and nothing else, so one case cannot leak into the next. */
function only(values: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const key of KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
  return entity();
}

/* Every retired variable set, with values that are plainly fixtures. */
const EVERYTHING = {
  FUTUREBOX_LEGAL_REGISTRATION: '2026/123456/07',
  FUTUREBOX_LEGAL_ADDRESS: '12 Example Street|Cape Town|8001',
  FUTUREBOX_LEGAL_PHONE: '+27 21 555 0100',
  FUTUREBOX_LEGAL_EMAIL: 'legal@example.com',
  FUTUREBOX_LEGAL_VAT: '4123456789',
  FUTUREBOX_LEGAL_INFORMATION_OFFICER: 'A. Example',
};

check('with nothing set there is no entity to print', only({}) === null);
check('nor with everything set except the name', only(EVERYTHING) === null);

const company = only({ FUTUREBOX_LEGAL_NAME: 'FUTUREBOXSTUDIO (Pty) Ltd', ...EVERYTHING });
check('a company is published by its name', company?.name === 'FUTUREBOXSTUDIO (Pty) Ltd', JSON.stringify(company));
check('  and its status is read off the name',
  company?.status === 'Private company registered in the Republic of South Africa', company?.status ?? '(none)');
check('  and nothing else comes out, however much else is set',
  company !== null && Object.keys(company).sort().join(',') === 'name,status', Object.keys(company ?? {}).join(','));
const said = JSON.stringify(company);
check('  not the registration number, the address, the telephone, the mailbox, the VAT number or a person',
  !/123456|Example Street|555 0100|example\.com|4123456789|A\. Example/.test(said), said);

const afrikaans = only({ FUTUREBOX_LEGAL_NAME: 'Toetsdoos (Edms) Bpk' });
check('an Afrikaans company name is read as a company too', afrikaans?.status.startsWith('Private company') === true);

check('a name that is not a company, with no status, publishes nothing rather than calling a person a company',
  only({ FUTUREBOX_LEGAL_NAME: 'A. Example', ...EVERYTHING }) === null);
const sole = only({ FUTUREBOX_LEGAL_NAME: 'FutureBox Studio', FUTUREBOX_LEGAL_STATUS: 'Sole proprietor' });
check('  but a status said out loud is printed as said', sole?.status === 'Sole proprietor', sole?.status ?? '(none)');

const padded = only({ FUTUREBOX_LEGAL_NAME: '  FUTUREBOXSTUDIO (Pty) Ltd  ' });
check('a value pasted with spaces around it is trimmed', padded?.name === 'FUTUREBOXSTUDIO (Pty) Ltd', padded?.name ?? '(none)');

/* ── The source, not only the function ──────────────────────────────────
   A page that read `process.env` itself, or an `entity.ts` that started
   reading a retired variable again, would get past every case above. */
const code = readFileSync('app/lib/server/entity.ts', 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
const page = readFileSync('app/legal/page.tsx', 'utf8');
for (const key of RETIRED) {
  check(`${key} is read by nothing`, !code.includes(key) && !page.includes(key));
}
const used = [...new Set([...page.matchAll(/\bwho\.([a-zA-Z]+)/g)].map((hit) => hit[1]))].sort();
check('the legal page prints the name and the status, and reads nothing else',
  used.every((one) => one === 'name' || one === 'status'), used.join(', '));
check('  and it says how to ask for the rest', /given on\s+request/.test(page));
check('  and it reads no environment of its own', !/process\.env/.test(page));

/* ── The example settings stop asking for them ────────────────────────── */
for (const where of ['.env.example', 'docs/SWITCH-ON.md']) {
  const text = readFileSync(where, 'utf8');
  const asked = RETIRED.filter((key) => new RegExp(`^\\|?\\s*\`?${key}\`?\\s*(=|\\|)`, 'm').test(text));
  check(`${where} no longer asks for a retired variable`, asked.length === 0, asked.join(', '));
}

if (failures) {
  console.error(`\ncheck:entity — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:entity — the legal page prints the company\'s name and status, and nothing about its people.');
