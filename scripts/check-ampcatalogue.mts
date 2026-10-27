/**
 * The amp catalogue passes on only what may be passed on, and credits the maker.
 *
 *   npm run check:ampcatalogue
 *
 * ── Whose idea ───────────────────────────────────────────────────────────
 *
 * The owner, 11 October 2026: *"Ek wil die amps manually oplaai, dan word dit 'n
 * katelogus waarna mense in ons app kan soek. Dit moet alles in ons sisteem
 * en databasis wees."* And earlier the same day: *"ons maak dan net seker die
 * eienaar van die amp kry die eer."*
 *
 * ── What makes it a check rather than care ───────────────────────────────
 *
 * The catalogue is FutureBox redistributing other people's work to paying
 * members. Three of TONE3000's eight licences forbid exactly that, and the
 * difference between "free if you credit" and "not ours to pass on" is one
 * field at one door. The list of licences we may pass on is written in two
 * places by necessity — the app's `SHAREABLE` and the table's `check` — and
 * two lists drift. The door has to refuse BEFORE the insert, the member's
 * list has to carry the maker, and a capture has to be proved by the engine
 * on the way in and on the way out. Each of those is one line somebody
 * could reorder or drop while tidying, and nothing on a screen would show.
 */

import { readFileSync } from 'node:fs';
import { mayBeShared, SHAREABLE, LICENCES } from '../app/lib/amplicence.ts';
import { before } from './order.mts';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const sql = readFileSync('supabase/amps.sql', 'utf8');
const route = readFileSync('app/api/amps/route.ts', 'utf8');
const panel = readFileSync('app/components/AmpCatalogue.tsx', 'utf8');
const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/* ── The licence rule, in both places ────────────────────────────────── */

const inSql = /licence\s+in\s*\(([^)]*)\)/.exec(sql);
const sqlList = inSql ? [...inSql[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort() : [];
ok('the table refuses the same licences the app refuses',
  sqlList.length > 0 && sqlList.join(',') === [...SHAREABLE].sort().join(','),
  `sql: ${sqlList.join(', ')} — app: ${[...SHAREABLE].sort().join(', ')}`);

for (const id of ['cc-by-nc', 'cc-by-nc-sa', 'cc-by-nc-nd', 't3k', 'unknown', 'nonsense', undefined]) {
  ok(`  ${id ?? 'nothing'} may not be passed on`, !mayBeShared(id));
}
for (const id of ['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nd', 'mine']) {
  ok(`  ${id} may`, mayBeShared(id));
}
ok('  and every licence on the list is one the app knows',
  SHAREABLE.every((id) => LICENCES.some((one) => one.id === id)));

/* ── The door ─────────────────────────────────────────────────────────── */

ok('adding is behind the owner door',
  /export async function POST/.test(route) && before(route, 'export async function POST', 'await opened(request)'),
  'anybody signed in could fill the catalogue');
ok('  and the licence is refused before anything is written',
  before(route, 'mayBeShared(licence)', ".insert({"),
  'a row written before the licence is read is a row that exists under a licence we may not pass on');
/* Sliced to DELETE's own body: `before` finds the FIRST door call in the
   file, which is POST's, and a rule that passes DELETE on POST's door is
   measuring the wrong function. */
const removal = route.slice(route.indexOf('export async function DELETE'));
ok('  and taking one out is behind the same door',
  before(removal, 'await opened(request)', '.delete()'));
ok('  and the shape is held — a text file renamed .nam is refused',
  /looksLikeCapture\(nam\)/.test(route) && /Array\.isArray\(model\.weights\)/.test(route));

/* ── The list is light; the capture comes one at a time, signed in ──── */

const listed = /const LISTED = '([^']+)'/.exec(route)?.[1] ?? '';
ok('the search never returns the capture itself',
  listed.length > 0 && !/\bnam\b/.test(listed),
  `the list selects "${listed}"`);
ok('  and the maker is in every row of it', /\bmaker\b/.test(listed));
ok('one capture needs a signed-in member',
  before(route, 'await callerFrom(request)', ".select('id, name, maker, licence, source, nam, origin')"));
ok('  and a member\'s search text never becomes a query filter',
  !/\.or\(|\.ilike\(/.test(route) && /\.toLowerCase\(\)\.includes\(q\)/.test(route),
  'an interpolated PostgREST filter is a query string a member writes');

/* ── Proved on the way out, and on the way in ────────────────────────── */

const take = panel.slice(panel.indexOf('const take = async'), panel.indexOf('/* ── Into the catalogue'));
ok('a capture out of the catalogue is run before it is kept',
  before(take, 'await loads(', 'await rememberAmp('),
  'a shelf that fills with files that will not load is worse than no shelf');
ok('  and lands on the shelf with the maker and the licence on it',
  /maker: got\.amp\.maker/.test(take) && /licence: got\.amp\.licence/.test(take),
  'the shelf would ask the licence question that the catalogue already answered');

const add = panel.slice(panel.indexOf('const add = async'), panel.indexOf('const remove = async'));
ok('a capture into the catalogue is run before it is sent',
  before(add, 'await loads(json)', "fetch('/api/amps'"),
  'what reaches every member has to have been read by the engine every member uses');
ok('  and the form offers only the licences we may pass on',
  /LICENCES\.filter\(\(one\) => SHAREABLE\.includes\(one\.id\)\)/.test(panel),
  'a form that offers a choice the door will refuse is a form that argues');

/* ── On the screen ────────────────────────────────────────────────────── */

ok('the booth draws the catalogue', /<AmpCatalogue onShelf=/.test(booth));
ok('  and the member sees the maker on every result',
  /\{row\.maker\}/.test(panel),
  '"ons maak dan net seker die eienaar van die amp kry die eer"');
ok('  and nothing still reaches for the TONE3000 browse button',
  !/data-browsetone|browseTone3000/.test(booth),
  '"Ons kan nie deur hulle website werk nie, want dit werk nie."');

const KEYS = [...new Set([...panel.matchAll(/t\('(pro\.amp[A-Za-z]*)'/g)].map((m) => m[1]))];
const noAf = KEYS.filter((key) =>
  !new RegExp(`"${key.replace('.', '\\.')}":\\s*\\{[^}]*\\baf:\\s*"[^"]{2,}"`).test(words));
ok(`the panel speaks Afrikaans — ${KEYS.length} keys`, KEYS.length >= 12 && noAf.length === 0,
  noAf.length ? noAf.join(', ') : `${KEYS.length} keys is fewer than this panel has sentences`);

if (failures) {
  console.error(`\ncheck:ampcatalogue — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:ampcatalogue — only what may be passed on goes in, the maker rides on every row, and the engine reads a capture before anybody keeps it.');
