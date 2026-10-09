/**
 * A cover is drawn with the song, once, and never for one that has one.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Plus generate dit dan standaard 'n album cover
 * saam met die liedjie."* As standard, with the song.
 *
 * Until now a cover was a button to be found after the fact, which is why
 * most songs in this app are a row in a list rather than a record.
 *
 * ── Why this needs holding ───────────────────────────────────────────────
 *
 * Because every way it goes wrong spends money quietly.
 *
 * **It could draw twice.** An effect without a guard runs again on a
 * re-render, and two draws is two charges for one picture. React's own
 * development mode mounts twice on purpose, which is the case that finds
 * this and the case nobody runs before shipping.
 *
 * **It could draw for a song that already has one.** The panel asks whether
 * a cover exists before anything else; starting the draw before that answer
 * comes back charges for a picture the account already owns.
 *
 * **It could become an automatic charge.** Her rule of 30 September — *"Te
 * veel aankoop punte gaan mense afsit"* — cuts both ways: a cover should be
 * standard, and a tick that quietly adds credits without the button saying
 * so is the surprise this app does not do. So the tick is pre-ticked AND the
 * price is on the button.
 *
 * **It could be a second copy of the cover flow.** The job, the poll, the
 * "stay here" warning, the recovery for a job never written down and the
 * refund all live in `Sleeve.tsx`. A second path that drew covers would be a
 * second half nobody tested, and the half that loses a picture.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { CREDITS } from '../app/lib/credits.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nA cover with the song: once, and never for one that has one\n');

const sleeve = withoutComments(readFileSync('app/components/Sleeve.tsx', 'utf8'));
const room = withoutComments(readFileSync('app/components/MakeMusic.tsx', 'utf8'));

/* ── 1. It draws once ────────────────────────────────────────────────── */

/* A ref and not a `useState`, and that distinction is the whole guard. A
   state flag is set asynchronously: two renders in the same tick both read
   the old value, both pass, and both draw. A ref is written synchronously
   and the second read sees it.
 
   This assertion replaced a weaker one that merely looked for the name
   `begun` anywhere in the file — it stayed green with the guard deleted from
   the condition, which is a check reporting a property it was not testing. */
ok('the once-only flag is a ref, not state',
  /const begun = useRef\(false\)/.test(sleeve) && !/const \[begun/.test(sleeve),
  'a `useState` flag is set asynchronously, so two renders in one tick both'
  + ' read false, both pass, and both draw — two charges for one picture, and'
  + ' React mounts effects twice in development on purpose, which is the case'
  + ' that finds it and the case nobody runs before shipping');

ok('  and it waits for the question "is there one already"',
  /if \(!startNow \|\| !asked \|\| begun\.current\) return;/.test(sleeve),
  'the draw starts before the panel knows whether this song already has a'
  + ' cover, which charges for a picture the account already owns');

ok('  and stops when the answer is that there is',
  /if \(word\.url \|\| word\.pending\) return;/.test(sleeve),
  'a song with a cover, or one owed and uncollected, is drawn again — the'
  + ' second is worse, because the first was paid for and never collected');

ok('  and the question is answered on every path',
  /finally \{\s*if \(alive\) setAsked\(true\);/.test(sleeve),
  '`asked` is set only when the request succeeds, so a song room offline at'
  + ' that moment never draws the cover it was told to and never says why');

/* ── 2. One code path, not two ───────────────────────────────────────── */

ok('the automatic draw calls the same make the button does',
  /begun\.current = true;\s*void make\(\);/.test(sleeve),
  'it has its own call to `/api/cover`, which is a second copy of the job,'
  + ' the poll, the stay-here warning and the refund');

ok('  and the song room starts no cover of its own',
  !/\/api\/cover/.test(room),
  'the song room calls the cover route directly, so there are two paths and'
  + ' the one nobody tested is the one that loses a picture');

/* ── 3. Standard, and not a surprise ─────────────────────────────────── */

ok('the tick is on by default, which is what "standard" means',
  /useState\(true\)/.test(room) && /wantCover/.test(room),
  'the box starts empty, so a cover is still a thing to go and find');

ok('  and the button says what the press costs, both halves',
  /songCost\(seconds\) \+ \(wantCover \? CREDITS\.cover : 0\)/.test(room),
  'the tick adds credits and the button does not say so — a quiet two'
  + ' credits is exactly the surprise this app does not do');

ok('  and the tick can be turned off',
  /data-covertoo/.test(room) && /type="checkbox"/.test(room),
  'a cover is drawn with every song whether anybody wanted one or not, which'
  + ' is an automatic charge in a room she asked not to have more of');

ok('  and the choice is remembered',
  /localStorage\.setItem\(\s*'futurebox\.cover\.with\.song'/.test(room),
  'somebody who unticks it unticks it again on every song, which is a'
  + ' setting that does not work');

/* ── 4. The price is the one the route charges ───────────────────────── */

const route = withoutComments(readFileSync('app/api/cover/route.ts', 'utf8'));
ok('the room quotes the price the cover route actually charges',
  /CREDITS\.cover/.test(route) && CREDITS.cover > 0,
  `the route charges something other than \`CREDITS.cover\` (${CREDITS.cover}),`
  + ' so the number on the button is not the number taken');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);
