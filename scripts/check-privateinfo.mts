/**
 * No real person's private details in this repository.
 *
 *   npm run check:privateinfo
 *
 * ── Why a check and not care ─────────────────────────────────────────────
 *
 * Carli's standing rule, since the company was registered: nothing off the
 * CIPC certificate — the registered address, the director's identity number —
 * and not her own email address. The reason is not squeamishness. This
 * repository is read by more than the two of us, it is cloned onto machines
 * nobody controls, and a `git` history does not forget: an address removed in
 * a later commit is still in every clone taken before it.
 *
 * Care works until the twentieth time. The things that got in are all the
 * same shape — an example in a comment, a value typed into documentation
 * instead of being named as an environment variable, a real address used to
 * explain how addresses are normalised. Every one of them was somebody being
 * helpful.
 *
 * ── What this found when it was written, 7 October 2026 ──────────────────
 *
 *   · `docs/SWITCH-ON.md` showed how to set `OWNER_EMAIL` using her actual
 *     address as the example.
 *   · Three files explained Gmail's dot-and-plus rules with her first name
 *     as the mailbox.
 *
 * Neither is dangerous on its own. Both are the rule being forgotten, which
 * is what a check is for.
 *
 * ── What it deliberately does not say ────────────────────────────────────
 *
 * Her first name in a comment is not private information. This codebase
 * attributes design decisions to the person who asked for them, by name and
 * date, which is the most useful thing a comment can say and is why so many
 * of them do. A name is not an address, an inbox or a number.
 */
import { readFileSync, readdirSync } from 'node:fs';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    return entry.isDirectory()
      ? walk(`${dir}/${entry.name}`)
      : /\.(ts|tsx|js|mjs|sql|md|json|yml|yaml|css)$/.test(entry.name)
        ? [`${dir}/${entry.name}`]
        : [];
  });

const FILES = ['app', 'scripts', 'audit', 'supabase', 'docs', '.github']
  .flatMap((one) => walk(one))
  .concat(['package.json', 'next.config.mjs', 'README.md'].filter((one) => {
    try { readFileSync(one); return true; } catch { return false; }
  }));

/* ── 1. No real mailbox ──────────────────────────────────────────────
 
   A consumer mailbox is the shape that matters: `@gmail.com`,
   `@outlook.com` and the rest belong to a person, where an address on a
   domain we control belongs to the company. Test and example domains are
   fine and are what the examples should use.
 
   One address is allowed by name and for a reason: the enquiries fallback
   in `lib/server/email.ts`, which is the company's own public mailbox and
   is already printed on the legal page. It is listed here rather than
   pattern-matched so that a second one cannot slip in beside it. */
const PERSONAL = /[a-zA-Z0-9._%+-]+@(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|protonmail|zoho)\.[a-z.]{2,}/g;
const ALLOWED = new Set(['futureboxapp@gmail.com']);
const mailboxes: string[] = [];
for (const file of FILES) {
  for (const hit of readFileSync(file, 'utf8').matchAll(PERSONAL)) {
    if (ALLOWED.has(hit[0].toLowerCase())) continue;
    /* The neutral examples this check itself asked for. A `sam@gmail.com`
       is nobody, and an explanation of how Gmail treats dots needs a gmail
       address in it to be an explanation at all. */
    if (/^(sam|s\.a\.m\+[a-z]+|you|someone|example|test|name)@/i.test(hit[0])) continue;
    mailboxes.push(`${file}: ${hit[0]}`);
  }
}
ok('no personal mailbox is written anywhere in this repository',
  mailboxes.length === 0,
  `${mailboxes.slice(0, 6).join(' | ')} — an address removed in a later commit`
  + ' is still in every clone taken before it');

/* ── 2. No identity number ───────────────────────────────────────────
 
   A South African identity number is thirteen digits beginning with a date
   — `YYMMDD` — so the first six are a plausible one. Thirteen digits alone
   would match a millisecond timestamp, which this codebase has several of,
   and a check that cries wolf at `1700000000000` is a check people switch
   off. */
const ids: string[] = [];
for (const file of FILES) {
  for (const hit of readFileSync(file, 'utf8').matchAll(/\b(\d{2})(\d{2})(\d{2})\d{7}\b/g)) {
    const month = Number(hit[2]);
    const day = Number(hit[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    ids.push(`${file}: ${hit[0]}`);
  }
}
ok('  and no identity number', ids.length === 0, ids.slice(0, 4).join(' | '));

/* ── 3. No telephone number ──────────────────────────────────────────
 
   Except a `555` one, which is the point of `555`: the exchange is reserved
   for fiction precisely so that a number printed in a test, a screenshot or
   a manual cannot reach a real telephone. `audit/legalpage.mjs` prints one
   on a probe's legal page, which is the right thing to print there. */
const phones: string[] = [];
for (const file of FILES) {
  for (const hit of readFileSync(file, 'utf8').matchAll(/\+27\s?\d{2}\s?(\d{3})\s?\d{4}\b/g)) {
    if (hit[1] === '555') continue;
    phones.push(`${file}: ${hit[0]}`);
  }
}
ok('  and no telephone number', phones.length === 0, phones.slice(0, 4).join(' | '));

/* ── 4. The registered address is named, never typed ─────────────────
 
   It is deliberately EMPTY until the CIPC record carries a business
   address, and `lib/server/entity.ts` reads it from the environment so that
   setting it is a change in Vercel and not a commit. A value typed into the
   code would be in the history for good. */
const entity = readFileSync('app/lib/server/entity.ts', 'utf8');
ok('the registered address is read from the environment, not typed',
  /process\.env\.FUTUREBOX_LEGAL_ADDRESS/.test(entity),
  'typed into the code it is in the git history for good, and the whole'
  + ' reason it is a variable is that it has not been decided yet');
/* A street called Example or Voorbeeld is not an address, it is the shape
   of one — which `docs/SWITCH-ON.md` has to print to explain what goes in
   the variable. The exception is the word, not the file, so a real address
   in that same table still fails. */
const typedAddress: string[] = [];
for (const file of FILES) {
  if (file.endsWith('check-privateinfo.mts')) continue;
  for (const hit of readFileSync(file, 'utf8')
    .matchAll(/\b\d{1,4}\s+([A-Za-z]+)\s*(Street|Road|Avenue|Laan|Straat|Weg|Rylaan)\b/g)) {
    if (/example|voorbeeld|test|toets|sample|your|jou/i.test(hit[1])) continue;
    typedAddress.push(`${file}: ${hit[0]}`);
  }
}
ok('  and no street address is written anywhere either',
  typedAddress.length === 0, typedAddress.slice(0, 4).join(' | '));

/* ── 5. An address that is kept is hashed ────────────────────────────
 
   An IP is personal data under POPIA. `abuse.sql` says so and stores a
   salted hash, because equality is all the abuse ceiling needs. What this
   holds is that nothing has since started writing the raw one: every column
   that keeps one is named `*_hash`, and every value put in it comes out of
   `addressKey`. */
const writesRawIp: string[] = [];
for (const file of FILES.filter((one) => one.startsWith('app/'))) {
  const text = readFileSync(file, 'utf8');
  for (const hit of text.matchAll(/\bip(?:_hash|Hash)?\s*:\s*([^,\n]+)/g)) {
    const value = hit[1].trim();
    if (/addressKey\(|machine|null|undefined|string|boolean|number|\?:/.test(value)) continue;
    writesRawIp.push(`${file}: ${hit[0].slice(0, 60)}`);
  }
}
ok('every address that is kept is hashed before it is kept',
  writesRawIp.length === 0,
  `${writesRawIp.slice(0, 4).join(' | ')} — an IP is personal data, and`
  + ' equality is all the abuse ceiling needs');

if (bad) {
  console.error(`\ncheck:privateinfo — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:privateinfo — no mailbox, identity number, telephone number or'
  + ' street address belonging to a real person is written anywhere in this'
  + ' repository, and an address that is kept is hashed first.',
);
