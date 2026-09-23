/**
 * What the till sends, and what the webhook needs, are the same list.
 *
 * ── The fault this exists for ────────────────────────────────────────────
 *
 * Carli, 23 September 2026, reporting the album art bid for the third time:
 * *"die album art se bid het nogsteeds nie gewerk nie."*
 *
 * `/api/checkout` built Paystack's metadata like this:
 *
 *     work: want.kind === 'art' ? want.work : null,
 *
 * and `/api/payments/webhook` read it like this:
 *
 *     if (meta.kind === 'bidpass') {
 *       if (!meta.work) { console.error('a buy-in arrived with no piece'); return; }
 *
 * So a bid pass went out with `work: null`, came back with `work: null`, and
 * was dropped. She was charged R50 and got nothing. Every time.
 *
 * Nothing failed. No route threw, no check went red, and the comment above
 * the line said *"Nothing to name: the pass is one thing and there is one of
 * it. The webhook reads `kind` alone."* — which had been true, before the
 * pass became per piece, and was left behind asserting the old arrangement
 * over the top of the new one.
 *
 * ── Why this is derived and not a list ───────────────────────────────────
 *
 * A list of "the kinds and their fields" written here would be a third copy
 * of the same contract, and the third copy rots exactly like the comment
 * did. So both sides are READ: the webhook is scanned for the fields it
 * requires per kind, the till for the fields it sends per kind, and the two
 * are compared. Adding a kind, or a field to a kind, needs no edit here.
 *
 *   npm run check:paymeta
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const strip = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, (had) => had.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (had, before) => before + ' '.repeat(had.length - before.length));

const till = strip(readFileSync('app/api/checkout/route.ts', 'utf8'));
const hook = strip(readFileSync('app/api/payments/webhook/route.ts', 'utf8'));

/**
 * Every payment kind, from the till's own union type.
 *
 * Read there rather than named here so a new kind is covered the day it is
 * written — which is the whole point: `bidpass` was added and this contract
 * was never re-checked for it.
 */
const kinds = [...new Set(
  [...till.matchAll(/\{\s*kind:\s*'([a-z]+)'/g)].map((one) => one[1]),
)].sort();
ok('the till still declares the payment kinds this can read', kinds.length >= 5,
  `${kinds.length} found: ${kinds.join(', ')}`);

/**
 * What the webhook REQUIRES for a kind: the fields it refuses without.
 *
 * Both shapes the file uses — a guard inside the branch (`if (!meta.work)`)
 * and a field named in the condition itself (`meta.kind === 'commission' &&
 * meta.offer`). Either one means the charge is dropped without it.
 */
function neededBy(kind: string): string[] {
  const want = new Set<string>();
  for (const found of hook.matchAll(
    new RegExp(`meta\\.kind === '${kind}'([\\s\\S]{0,600})`, 'g'),
  )) {
    const head = found[1].slice(0, 80);
    for (const one of head.matchAll(/&&\s*meta\.(\w+)/g)) want.add(one[1]);
    const body = found[1];
    const opens = body.indexOf('{');
    if (opens !== -1) {
      for (const one of body.slice(opens, opens + 400).matchAll(/if \(!meta\.(\w+)\)/g)) {
        want.add(one[1]);
      }
    }
  }
  return [...want];
}

/** What the till SENDS for a kind, out of the metadata object it builds. */
const meta = (() => {
  const at = till.indexOf('metadata: {');
  if (at === -1) return '';
  let depth = 0;
  for (let i = till.indexOf('{', at); i < till.length; i += 1) {
    if (till[i] === '{') depth += 1;
    else if (till[i] === '}') {
      depth -= 1;
      if (depth === 0) return till.slice(at, i + 1);
    }
  }
  return '';
})();
ok('  and the till still builds one metadata object this can read', meta.length > 0,
  'the shape changed, so every rule below is measuring nothing');

function sentFor(kind: string, field: string): boolean {
  /* The field's own line in the metadata object, and whether this kind is
     among the ones it is sent for. `work: a === 'art' || a === 'bidpass' ? …`
     sends it for both; `work: a === 'art' ? …` does not. */
  const line = new RegExp(`\\b${field}:([^\\n]*)`).exec(meta)?.[1] ?? '';
  if (!line) return false;
  /* Hard-wired to nothing is not sent.
 
     Caught by mutation: `offer: null,` has no `?` in it, so the first
     version of this read it as "sent unconditionally" and passed a till
     that had stopped sending the field at all. A rule that treats a
     constant null as a value is a rule that cannot see the fault it was
     written for. */
  if (/^\s*null\s*,?\s*$/.test(line)) return false;
  if (!/\?/.test(line)) return true; // sent unconditionally
  return new RegExp(`'${kind}'`).test(line.split('?')[0]);
}

let pairs = 0;
for (const kind of kinds) {
  for (const field of neededBy(kind)) {
    pairs += 1;
    ok(`a ${kind} charge carries the ${field} the webhook refuses without`,
      sentFor(kind, field),
      `the till sends ${field}: null for a ${kind}, so the money is taken and the`
      + ' charge is dropped on the way back');
  }
}
ok('and the two files were actually compared', pairs >= 3,
  `${pairs} kind/field pairs — the scan found nothing to check, which is not the same as agreeing`);

if (failures) {
  console.error(`\ncheck:paymeta — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(`\ncheck:paymeta — ${pairs} things the webhook needs, and the till sends every one of them.`);
