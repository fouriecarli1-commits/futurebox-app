/**
 * No write may name no row.
 *
 * ── The fault this exists for ────────────────────────────────────────────
 *
 * Carli, 24 September 2026: *"uiteindelik maak dit bid oop by album art,
 * maar die knoppie van die bid vat mens nie verder nie."*
 *
 * Looking for why, `/api/artmarket` turned out to hold this:
 *
 *     wrote(await client
 *       .from('art_works')
 *       .update({ ends_at: endsAt() }), 'the artwork listing');
 *
 * No `.eq`. No `.is`. That statement sets `ends_at` on **every row in
 * `art_works`** — so the first bid on any one piece started a thirty-six-hour
 * clock on every piece in the marketplace, and any late bid anywhere pushed
 * every auction in the shop out by fifteen minutes.
 *
 * The paragraph directly above it said, in so many words, that it filtered on
 * `.is('ends_at', null)`. It was a correct description of code that had never
 * been written. That is the recurring shape in this repository and the reason
 * for most of these files: **the comment is right and nothing reads comments.**
 *
 * ── Why a typechecker will never catch this ──────────────────────────────
 *
 * Because an unfiltered update is valid. `.update({...})` returns a builder
 * that is perfectly happy to be awaited, and "every row" is a legitimate thing
 * to ask a database for — occasionally it is even what somebody means. There
 * is nothing malformed here for a compiler to object to. The only way to catch
 * it is to insist the intent be written down.
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 *
 * Every `.update(…)` and every `.delete(…)` must carry at least one filter in
 * the same chain. A write that really is meant for the whole table says so in
 * a comment on the line above — `every row on purpose` — and then it is
 * allowed, and somebody reading it in a year knows it was a decision.
 *
 * The chain is read by walking forward from the call and balancing brackets,
 * so a statement spread over five lines is one chain. During the ordering hunt
 * two real faults hid from a line-by-line reader for exactly that reason.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
/* Prose blanked first — otherwise the paragraph above, which quotes the bad
   statement verbatim, is itself reported as the bug. `check:whofirst` made
   this mistake ten minutes after being written. */
import { code } from './prose.mts';

/** A chain starts at the table it names. Nothing else is a database write. */
const TABLES = /\.from\s*\(/g;

const WRITES = /\.(update|delete)\s*\(/;

/** Anything that narrows a statement to particular rows. */
const FILTERS = [
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in',
  'contains', 'containedBy', 'match', 'not', 'or', 'filter', 'rangeGt',
  'rangeLt', 'overlaps', 'textSearch',
];
const HAS_FILTER = new RegExp(`\\.(${FILTERS.join('|')})\\s*\\(`);

/** What a deliberate whole-table write must say on the line before it. */
const ON_PURPOSE = /every row on purpose/i;

/**
 * The rest of the chain that starts at `from`, read by balancing brackets.
 *
 * It ends at the `;` that ends the statement, or at the bracket that closes
 * the expression this chain sits inside — `wrote(await client…)` wraps the
 * whole thing in a call, so stopping at the first `)` would read one link.
 */
function chainFrom(text: string, from: number): string {
  let depth = 0;
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') {
      depth -= 1;
      if (depth < 0) return text.slice(from, i);
    } else if ((ch === ';' || ch === ',') && depth === 0) {
      return text.slice(from, i);
    }
  }
  return text.slice(from);
}

const FILES = [
  ...readdirSync('app', { recursive: true, encoding: 'utf8' })
    .filter((one) => one.endsWith('.ts') || one.endsWith('.tsx'))
    .map((one) => join('app', one)),
  ...readdirSync('scripts', { encoding: 'utf8' })
    .filter((one) => one.endsWith('.mts'))
    .map((one) => join('scripts', one)),
];

let bad = 0;
let onPurpose = 0;
let read = 0;

for (const file of FILES) {
  const raw = readFileSync(file, 'utf8');
  const text = code(raw);
  const lines = raw.split('\n');

  /* Read forward from the TABLE, not backward from the write.
 
     The first version looked back four hundred characters for a `.from(` and
     took it as proof that the `.update(` beside it was a table write. It is
     not proof of anything: in `lib/cast.ts` a `storage.from(BUCKET).remove()`
     stood two lines above an ordinary `thumbs.delete(path)` on a Map, and the
     check called a Map a database. Starting at the table and walking its own
     chain ties the two together by construction rather than by proximity —
     which is what the paragraph above claimed the first version did. */
  for (const table of text.matchAll(TABLES)) {
    const chain = chainFrom(text, table.index ?? 0);
    const write = WRITES.exec(chain);
    if (!write) continue;
    read += 1;
    if (HAS_FILTER.test(chain)) continue;

    const line = text.slice(0, (table.index ?? 0) + write.index).split('\n').length;
    const above = lines.slice(Math.max(0, line - 4), line - 1).join(' ');
    if (ON_PURPOSE.test(above)) {
      onPurpose += 1;
      console.log(`  ok  ${file}:${line} — whole table, said out loud`);
      continue;
    }

    bad += 1;
    console.log(
      `  \u2717   ${file}:${line} \u2014 \`.${write[1]}(\u2026)\` with no filter in its chain. ` +
        `This writes EVERY ROW of the table. Add the \`.eq\` that names the row, ` +
        `or say "every row on purpose" above it.`,
    );
  }
}

console.log(`\n${read} write(s) read; ${onPurpose} deliberately over the whole table.`);

if (bad > 0) {
  console.log(`check:unfiltered — ${bad} write(s) would touch every row in their table.`);
  process.exitCode = 1;
} else {
  console.log('check:unfiltered — every update and delete names the rows it is for.');
}
