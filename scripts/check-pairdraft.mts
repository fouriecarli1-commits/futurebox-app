/**
 * In a room two people share, the turn arrives on the other side — and the
 * song written so far arrives with it.
 *
 * The owner, 21 October 2026, testing a collab: *"Ek het klaar geskryf en die
 * ander persoon kans gegee, maar daar wys niks aan hulle kant nie. Inteendeel
 * sê dit dit is nog die ander persoon se beurt."* Two faults: the other page
 * only re-read the room when the approval columns existed, so the turn never
 * reached it; and the handover moved the pen without the words.
 *
 * The cleaning (`draftFor`) is run. The places that must hold the rest are
 * read for it.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};

const { draftFor, DRAFT_LIMITS, sameDraft } = await import('../app/lib/pairdraft.ts');

const song = draftFor('make', { title: 'Somer', lyrics: '[Verse 1]\nHier', style: 'folk', about: 'home', feeling: 'love', extra: 'dropped' });
ok('a song draft keeps its fields', song?.title === 'Somer' && song?.lyrics.startsWith('[Verse 1]') && song?.feeling === 'love');
ok('  and only its fields', song !== null && !('extra' in song));
ok('  and a feeling the app does not know is not kept', draftFor('make', { feeling: 'zzz' })?.feeling === null);
ok('  and words past the limit are cut, not refused',
  draftFor('make', { lyrics: 'x'.repeat(DRAFT_LIMITS.lyrics + 50) })?.lyrics.length === DRAFT_LIMITS.lyrics);
ok('a room whose work is audio carries no draft', draftFor('booth', { title: 'x' }) === null);
ok('something that is not an object is no draft', draftFor('make', 'words') === null && draftFor('make', ['a']) === null);
ok('an unchanged draft is the same draft', sameDraft(draftFor('make', { title: 'a' }), draftFor('make', { title: 'a' })));

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const route = read('app/api/pairs/route.ts');
ok('only the hand holding the pen writes the draft',
  /what === 'draft'[\s\S]{0,200}row\.pen !== caller\.id/.test(route));
ok('handing over the turn takes the draft with it',
  /handOver, ok_a: false, ok_b: false, draft, draft_at/.test(route));
ok('  and on a project without the columns the turn still moves',
  /tries\[used\]/.test(route) && /handOver,\s*\]/.test(route));
ok('the room is read back with its draft', /draft: drafts \? draftFor\(row\.surface, row\.draft\)/.test(route));

const page = read('app/page.tsx');
ok('the other page re-reads the room whenever a pair room is open — not only once the approvals exist',
  /const pairOpen = Boolean\(pairHere\)/.test(page) && /setInterval\(again,/.test(page) && !/pairWaits/.test(page));
ok('  and at once when the tab comes back', /visibilitychange', again/.test(page));
ok('the holder keeps the song in the room as it is written', /saveDraft\(id, songDraft\)/.test(page) && /pairDraftRoom\?\.mine/.test(page));
ok('the other side takes each new version once, never its own back',
  /draftAt === draftMine\.current/.test(page) && /setCanvas\(\(was\) => \(\{ \.\.\.was, \.\.\.came \}\)\)/.test(page));

const strip = read('app/components/PairStrip.tsx');
ok('the turn is handed over with the song', /movePen\(pair\.id, 'give', song\)/.test(strip));
ok('the strip shows their handle', /data-pairhandle/.test(strip));
ok('  and says what happens to the words', /data-pairdraftnote/.test(strip));

const collab = read('app/components/CollabRoom.tsx');
ok('the open collab names who it is with, with their handle', /data-collabwith/.test(collab) && /room\.handle/.test(collab));

/* The owner, at a lobby that said only "Someone": "Hier moet nie net sê
   someone nie. Maar die handle naam." */
const collabRoute = read('app/api/collab/route.ts');
ok('a person with no name is named by their handle, not "Someone"',
  /one\.name \|\| \(one\.handle \? `@\$\{one\.handle\}` : 'Someone'\)/.test(collabRoute));
ok('asking somebody needs your own handle first',
  /if \(!handle\) return[\s\S]{0,200}ownHandle\(client, caller\.id\)[\s\S]{0,40}NO_HANDLE/.test(collabRoute));
ok('  and so does saying yes', /answer === 'accepted' && !\(await ownHandle\(client, caller\.id\)\)/.test(collabRoute));
ok('the room asks for a handle before it matters', /myHandle === '' && <HandleFirst/.test(collab));
ok('  and says plainly when the other person has none', (collab.match(/collab\.noHandle/g) ?? []).length >= 4);

/* The owner: "kan daar 'n submit button wees wat 'n skrywe of vers submit,
   wat dan weer aan die ander kant wys en outomaties die hand over initieer"
   — and, of her own newest song showing in the shared room, "Hierdie moet
   nie in die colab room wees nie". */
const make = read('app/components/MakeMusic.tsx');
ok('beside the words, one press sends your part and hands the turn over',
  /data-pairsubmit/.test(make) && /onPairSubmit=\{makeGate \? async \(\) => \{[\s\S]{0,400}movePen\(makeGate\.id, 'give', songDraft\)/.test(page));
ok('  and the side waiting is told the turn comes back when they submit', /data-pairwaiting/.test(make));
ok('your own newest song is not shown in a shared room', /tracks\.length > 0 && !pairGate && /.test(make));
const verses = read('app/components/VerseWriter.tsx');
ok('words arriving from the other person show in Extensive too', /\}, \[lyrics\]\);/.test(verses) && /compiledRef/.test(verses));

const sql = read('supabase/pairs.sql');
ok('the draft is a column the table can hold', /add column if not exists draft jsonb/.test(sql) && /add column if not exists draft_at/.test(sql));

if (failures) {
  console.error(`\ncheck:pairdraft — ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:pairdraft — the turn reaches the other side, and the song goes with it.');
