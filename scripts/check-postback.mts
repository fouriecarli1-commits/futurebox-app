/**
 * One step back in the photo editor, held to the four things that make a
 * history worse than none.
 *
 *   npm run check:postback
 *
 *   1. **A ceiling that does not bite.** A decoded 4032x3024 photograph is
 *      48 MB of pixels, not the three megabytes the file is. Eight of them
 *      is 390 MB, and on a phone that is the tab being killed with no
 *      message of any kind.
 *   2. **A ceiling that bites too hard.** A history that refuses to hold
 *      the single step somebody is about to press is not a history.
 *   3. **Undoing into the wrong past.** Redo has to stand where undo left,
 *      and a new change has to abandon the way forward — the future that
 *      was there was a future of the state you just left.
 *   4. **`null` treated as nothing.** The room before a picture is brought
 *      in is a real state, and "take it out" is a real step to undo. A
 *      history that drops it leaves the one button that cannot be undone.
 */
import {
  KEEP_SHOTS, bytesOf, makeBack, type Pixels,
} from '../app/lib/postback.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const shot = (wide: number, tall: number): Pixels =>
  ({ naturalWidth: wide, naturalHeight: tall, width: wide, height: tall });
const MB = 1024 * 1024;
const PHONE = shot(4032, 3024);
const SMALL = shot(100, 100);

/* ── Weighing ──────────────────────────────────────────────────────── */

ok('a phone photograph weighs its pixels, not its file',
  bytesOf(PHONE) === 4032 * 3024 * 4,
  `${(bytesOf(PHONE) / MB).toFixed(0)} MB — a browser holds it unpacked, and`
  + ' the three megabytes on disk is the number that misleads');
ok('  and nothing weighs nothing', bytesOf(null) === 0);
ok('  and a canvas with no natural size still weighs',
  bytesOf({ width: 200, height: 100 }) === 200 * 100 * 4,
  String(bytesOf({ width: 200, height: 100 })));

/* ── 1 and 2. The ceiling, from both sides ─────────────────────────── */

const tight = makeBack<Pixels>(KEEP_SHOTS, 100 * MB);
for (let i = 0; i < 6; i += 1) tight.remember(`step ${i}`, PHONE);
ok('a run of full-size photographs is dropped down to the ceiling',
  tight.held() <= 100 * MB,
  `${(tight.held() / MB).toFixed(0)} MB held against a 100 MB ceiling — eight`
  + ' phone photographs is 390 MB, which is the tab being killed');

const huge = makeBack<Pixels>(KEEP_SHOTS, 1);
huge.remember('the crop', PHONE);
ok('  but the one step she is about to press is always kept',
  huge.undoable() === 'the crop' && huge.undo(null) !== null,
  'a history that cannot hold a single step is not a history');

const many = makeBack<Pixels>(3, 999 * MB);
for (let i = 0; i < 9; i += 1) many.remember(`step ${i}`, SMALL);
ok('  and the step count still holds when nothing is heavy',
  many.undoable() === 'step 8',
  `${many.undoable()} — three steps of a hundred pixels square weigh nothing,`
  + ' so only the count can stop it growing');

/* ── 3. Back, forward, and the future that gets abandoned ──────────── */

const one = shot(10, 10);
const two = shot(20, 20);
const three = shot(30, 30);
const past = makeBack<Pixels>();
past.remember('the crop', one);
past.remember('the background', two);
ok('the button says what it undoes', past.undoable() === 'the background');

const back1 = past.undo(three);
ok('  and stepping back hands the picture before that change',
  back1?.picture === two, JSON.stringify(back1?.what));
ok('    and the button now says the one before it', past.undoable() === 'the crop');
ok('    and forward is offered, with the same words',
  past.redoable() === 'the background', String(past.redoable()));

const on1 = past.redo(two);
ok('  and stepping forward puts back where undo was standing',
  on1?.picture === three,
  'redo has to hand back the state undo was handed, or the two walk apart');

past.undo(three);
past.remember('the cut', two);
ok('  and a new change abandons the way forward',
  past.redoable() === null,
  `${past.redoable()} — the future that was there was a future of the state`
  + ' she just left');

const empty = makeBack<Pixels>();
ok('  and an empty history offers nothing rather than throwing',
  empty.undo(one) === null && empty.redo(one) === null
  && empty.undoable() === null && empty.redoable() === null);

/* ── 4. Nothing is a real state ─────────────────────────────────────── */

const gone = makeBack<Pixels>();
gone.remember('taking the picture out', one);
const put = gone.undo(null);
ok('taking the picture out can be undone like anything else',
  put?.picture === one,
  'the room before a picture is a real state, and a history that drops it'
  + ' leaves one button that cannot be taken back');
/* And once it has been stepped back, the only thing the history still
   holds is the step FORWARD — which is a null picture, and weighs nothing.
   Written the other way round first, expecting the image's bytes, which was
   a reading of where the step had gone rather than of what was held. */
ok('  and once stepped back, the history is holding only the nothing',
  gone.held() === 0,
  `${gone.held()} — the way back is empty and the way forward is a null`
  + ' picture, so there are no pixels left in it');

const fresh = makeBack<Pixels>();
fresh.remember('the crop', PHONE);
fresh.clear();
ok('  and a new post starts with no past at all',
  fresh.undoable() === null && fresh.held() === 0);

if (bad) {
  console.error(`\ncheck:postback — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:postback — the photo editor can step back from anything that'
  + ' destroys a photograph, without holding more pixels than a phone has.',
);
