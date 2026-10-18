/**
 * The photo templates: every one can be drawn, is in both languages, and
 * keeps its words out of the platform's own furniture on a story.
 *
 * The owner, 16 October 2026: *"Hoe hou ons sulke cool templates? Moet ons dit
 * generate en oor tyd op bou?"* The starting set lives in
 * `lib/postdesigns.ts`; the ones she saves go through `/api/designs` and the
 * same `cleanDesign`. This holds both halves to one rule: a template is a
 * thing every member's room can draw, and a template that lands its own words
 * under a story's caption bar is worse than none — it is the app's own
 * suggestion, coming out covered.
 *
 *   npm run check:designs
 */
import { readFileSync } from 'node:fs';
import { DESIGNS, DESIGN_CATEGORIES, DESIGN_FACES, cleanDesign } from '../app/lib/postdesigns';

let bad = 0;
const ok = (label: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${label}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) bad += 1;
};

ok(`there is a starting set to choose from (${DESIGNS.length})`, DESIGNS.length >= 12);
ok('  every id once', new Set(DESIGNS.map((one) => one.id)).size === DESIGNS.length);
ok('  every category has at least one', DESIGN_CATEGORIES.every((cat) => DESIGNS.some((one) => one.category === cat.id)));
ok('  and every shape of post is offered', ['square', 'story', 'portrait'].every((size) => DESIGNS.some((one) => one.size === size)));
ok('  every one has a frame for a photo', DESIGNS.every((one) => one.slots.length > 0), DESIGNS.filter((one) => !one.slots.length).map((one) => one.id).join(', '));

const lost = DESIGNS.filter((one) => {
  const clean = cleanDesign(one);
  return !clean || clean.slots.length !== one.slots.length || clean.words.length !== one.words.length || clean.marks.length !== one.marks.length;
});
ok('every one survives the check a saved template goes through', lost.length === 0, lost.map((one) => one.id).join(', '));

const english = DESIGNS.flatMap((one) => one.words.filter((word) => !word.af.trim() || !word.en.trim()).map(() => one.id));
ok('  and says its words in both languages', english.length === 0, english.join(', '));

/* The faces a design may name are the room's own. */
const faces = [...readFileSync('app/lib/postfaces.ts', 'utf8').matchAll(/\{ id: '([a-z]+)', name:/g)].map((m) => m[1]);
ok('the faces a template may use are the room’s faces, the same list',
  faces.length === DESIGN_FACES.length && faces.every((one) => (DESIGN_FACES as readonly string[]).includes(one)),
  `${faces.join(',')} / ${DESIGN_FACES.join(',')}`);

/* A story: the platform prints its header over the top ~10% and its caption
   and buttons over the bottom ~20%. Words and shapes stay between. */
const covered = DESIGNS.filter((one) => one.size === 'story').flatMap((one) => [
  ...one.words.filter((word) => word.y < 0.11 || word.y > 0.77).map((word) => `${one.id}: "${word.en}" at ${word.y}`),
  ...one.marks.filter((mark) => mark.y < 0.11 || mark.y > 0.77).map((mark) => `${one.id}: ${mark.kind} at ${mark.y}`),
]);
ok('no story template puts its words or shapes under the platform’s own bars', covered.length === 0, covered.join('; '));

/* What a stranger might send is refused or cut down, never stored as is. */
ok('a design with no name or no category is refused', cleanDesign({ size: 'square', category: 'event' }) === null && cleanDesign({ en: 'x', size: 'square' }) === null);
const cut = cleanDesign({
  en: 'x'.repeat(500), category: 'sale', size: 'square', back: 'javascript:alert(1)',
  slots: Array.from({ length: 40 }, () => ({ x: 9, y: -3, w: 0.5, h: 0.5 })),
  words: [{ en: 'hi', face: 'nonsense', x: 0.5, y: 0.5, ink: 'red' }, { en: 'ok', face: 'poster', x: 0.5, y: 0.5, ink: '#ffffff', glow: '<b>' }],
  marks: [{ kind: 'bomb', x: 0.5, y: 0.5, size: 0.2, ink: '#ffffff' }],
});
ok('  and one full of nonsense is cut down to what can be drawn',
  Boolean(cut) && cut!.en.length === 60 && cut!.back === '#111113' && cut!.slots.length === 12
  && cut!.slots.every((s) => s.x === 1 && s.y === 0) && cut!.words.length === 1 && cut!.words[0].glow === undefined
  && cut!.marks.length === 0, JSON.stringify(cut).slice(0, 300));

ok('a template may carry artwork only under a name the upload gave it',
  cleanDesign({ en: 'a', category: 'sale', size: 'square', art: '0b6f2c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f.webp' })?.art !== undefined
  && cleanDesign({ en: 'a', category: 'sale', size: 'square', art: '../../avatars/x.webp' })?.art === undefined
  && cleanDesign({ en: 'a', category: 'sale', size: 'square', art: 'https://evil.example/x.png' })?.art === undefined);

const route = readFileSync('app/api/designs/route.ts', 'utf8');
ok('the artwork upload is opened only behind the owner door, under a name the server chooses',
  /const door = await opened\(request\);[\s\S]*?for === 'art'[\s\S]*?crypto\.randomUUID\(\)[\s\S]*?createSignedUploadUrl/.test(route));
ok('  and taking a template out takes its artwork too', /storage\.from\(ART_BUCKET\)\.remove\(\[art\]\)/.test(route));
ok('the server holds a saved template to the same check, going in and coming out',
  (route.match(/cleanDesign\(/g) ?? []).length >= 2 && /const door = await opened\(request\);[\s\S]*?from\('post_designs'\)\s*\.insert/.test(route));
const sql = readFileSync('supabase/designs.sql', 'utf8');
ok('  and the table takes no photographs and nothing over 32 kB', /pg_column_size\(design\) <= 32768/.test(sql) && /enable row level security/.test(sql));
ok('  and the artwork bucket is read by everyone and written by nobody directly',
  /values \('designs', 'designs', true\)/.test(sql) && /create policy "read designs" on storage\.objects\s+for select/.test(sql)
  && !/designs[\s\S]{0,80}for (insert|update|delete)/.test(sql));

if (bad) {
  console.error(`\ncheck:designs — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:designs — every photo template can be drawn, speaks both languages, and keeps a story’s words clear of the platform’s bars.');
