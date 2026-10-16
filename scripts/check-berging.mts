/**
 * Cloud space per plan says the same thing everywhere it is said.
 *
 *   npm run check:berging
 *
 * Carli, 16 October 2026: *"Please impliment the storage plan as you
 * suggested."* — 1 GB on Free, 10 GB on Maker, 50 GB on Studio, 200 GB on
 * Label.
 *
 * The numbers live in two languages that cannot import each other: the
 * limit is SQL (`supabase/berging.sql`, a policy on storage, because most
 * uploads go straight from the browser), and the cards and the gauge are
 * TypeScript (`spaceGb` in `lib/plans.ts`). Two copies of a number drift
 * the day somebody changes one, and the drift is invisible: the card says 50
 * and the database refuses at 10. So this holds them together, and holds the
 * rest of what makes the limit honest:
 *
 *   - the four caps in the SQL are the four `spaceGb`;
 *   - the buckets counted are the buckets an account owns, the same list
 *     `api/account` deletes when an account goes;
 *   - every plan card names its space, in English and in Afrikaans;
 *   - every upload from the browser asks `refusedForSpace` when it fails, so
 *     a full member is told so instead of meeting a silent failure — except
 *     the scratch file in `work/`, which the SQL lets through on purpose;
 *   - the notice is mounted, and its plans button is heard.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TIER_SPECS, TIERS } from '../app/lib/plans';
import { STRINGS } from '../app/lib/i18n';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};
const read = (path: string): string => readFileSync(path, 'utf8');

const sql = read('supabase/berging.sql');
const code = sql.replace(/--.*$/gm, '');

console.log('The caps in the SQL are the caps on the cards');
for (const tier of TIERS) {
  const gb = TIER_SPECS[tier].spaceGb;
  const said = tier === 'free'
    ? code.match(/else\s+(\d+)::bigint\s*\*\s*1073741824/)
    : code.match(new RegExp(`when '${tier}'\\s+then\\s+(\\d+)::bigint\\s*\\*\\s*1073741824`));
  ok(`  ${tier}: ${gb} GB`, Number(said?.[1]) === gb, `berging.sql says ${said?.[1] ?? 'nothing'}`);
}
ok('  and the space grows with the plan',
  TIERS.every((tier, at) => at === 0 || TIER_SPECS[tier].spaceGb > TIER_SPECS[TIERS[at - 1]].spaceGb),
  'a bigger plan holding less would be a plan nobody should buy');

console.log('The buckets counted are the buckets an account owns');
const account = read('app/api/account/route.ts').match(/const BUCKETS = \[([^\]]*)\]/)?.[1] ?? '';
const owned = [...account.matchAll(/'([a-z]+)'/g)].map((one) => one[1]).sort().join(',');
const lists = [...code.matchAll(/bucket_id\s+(?:not\s+)?in\s*\(([^)]*)\)/g)].map((one) =>
  [...one[1].matchAll(/'([a-z]+)'/g)].map((name) => name[1]).sort().join(','));
ok('  the SQL names them in the count and in the policy', lists.length >= 2, `found ${lists.length}`);
for (const list of lists) ok(`  ${list}`, list === owned, `api/account deletes ${owned}`);
ok('  the scratch file is let through, and not counted',
  /foldername\(o\.name\)\)\[2\]\s*=\s*'work'/.test(code) && /foldername\(name\)\)\[2\]\s*=\s*'work'/.test(code),
  'lib/workfile.ts puts long recordings in tracks/<owner>/work/ for a moment');
ok('  the policy is restrictive, for inserts by members',
  /as restrictive\s+for insert to authenticated/.test(code),
  'a permissive policy would be outvoted by each bucket\'s own "write own file"');

console.log('Every plan card names its space');
const en = STRINGS as Record<string, { en: string; af: string }>;
for (const tier of TIERS) {
  const spec = TIER_SPECS[tier];
  const at = spec.includes.findIndex((line) => line.includes(`${spec.spaceGb} GB`));
  ok(`  ${tier} card says ${spec.spaceGb} GB`, at >= 0);
  if (at < 0) continue;
  const row = en[`plan.${tier}.inc.${at}`];
  ok(`  and in Afrikaans`, Boolean(row && row.en === spec.includes[at] && row.af.includes(`${spec.spaceGb} GB`)),
    `plan.${tier}.inc.${at} should carry the same line`);
}

console.log('A refused upload says why');
const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return name === 'api' ? [] : files(path);
  return /\.tsx?$/.test(name) ? [path] : [];
});
for (const path of files('app')) {
  const text = read(path);
  if (!/\.upload\(/.test(text)) continue;
  if (path.endsWith('workfile.ts')) {
    ok(`  ${path} only writes the scratch folder`, /`\$\{owner\}\/work\//.test(text));
    continue;
  }
  ok(`  ${path}`, /refusedForSpace\(\)/.test(text), 'an upload that fails here should ask refusedForSpace');
}
const space = read('app/api/space/route.ts');
ok('  /api/space counts with the same function the policy uses',
  /rpc\('storage_used'/.test(space) && /spaceGb/.test(space) && /function public\.storage_used/.test(code));
ok('  the notice is mounted in the layout', /<SpaceFull \/>/.test(read('app/layout.tsx')));
ok('  and its plans button opens the plans',
  /SEE_PLANS_EVENT/.test(read('app/page.tsx')) && /SEE_PLANS_EVENT/.test(read('app/components/SpaceFull.tsx')));

if (failures) {
  console.error(`\ncheck:berging — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:berging — the SQL, the cards, the gauge and every upload agree on the space each plan holds.');
