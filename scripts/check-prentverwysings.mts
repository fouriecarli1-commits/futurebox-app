/**
 * Several pictures in one turn: the arithmetic, the packing, and the words.
 *
 * ── What was wrong, and how long it had been wrong ───────────────────────
 *
 * `lib/server/picture.ts` built a `parts` array for Gemini — a list, plural,
 * ready for several pictures — and only ever pushed ONE thing into it. So
 * every capability that needs more than one picture had been unreachable
 * since the day the file was written: put this person in that scene, keep
 * the same child on page four as on page one, put my logo on this poster,
 * make this look like that.
 *
 * Carli, 9 October 2026: *"al die spesiale funksies van google moet ook daar
 * in wees."* This was the largest one missing, and it was missing by a line.
 *
 * ── What can be got wrong here, which is why this file exists ────────────
 *
 * Not the wiring. The ARITHMETIC. A picture this app draws comes back at
 * 2048 across and a 2048 PNG is commonly three or four megabytes; base64
 * adds a third. One of them is already at the route's ceiling. So sending
 * three is not a matter of allowing three — every one of them has to be
 * shrunk to a share of a budget, and the budget has to be counted as a
 * TOTAL. A per-picture limit of four megabytes with three pictures allowed
 * is a promise the platform breaks for us: past four and a half the request
 * is refused BEFORE the route runs, as a bare 413 with no sentence in it.
 * That is the failure `check:bodylimit` was written about.
 *
 * And a second thing that fails silently: the words. A model told to "keep
 * the same character as the reference pictures" with no pictures attached
 * does not say so — it invents a reference and describes it. So the sentence
 * must only be said where pictures actually go, and this drives that in both
 * directions.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { BUDGET, MOST_PICTURES } from '../app/lib/picturelimit.ts';
import {
  LADDER, LEAD_SIDE, REFERENCE_SIDE, drawnSize, roomForRefs, shareFor, sideFor,
} from '../app/lib/packpicture.ts';
import { SHAPES, SHAPE_IDS, isShape, shapeOf } from '../app/lib/pictureshapes.ts';
import { lookBack } from '../app/lib/storymake.ts';
import { pictureWords } from '../app/lib/storypages.ts';
import { MOST_PICTURES as FROM_SERVER, makePicture } from '../app/lib/server/picture.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── 1. The engine really packs every picture, not the first one ───────── */

/**
 * `makePicture` driven with the network replaced, which is the only way to
 * see what it put on the wire. Everything else in this file is arithmetic;
 * this is the one assertion about the thing that was actually broken.
 */
async function partsOf(from: Parameters<typeof makePicture>[1]): Promise<unknown[]> {
  const was = { key: process.env.GOOGLE_VERTEX_KEY, project: process.env.GOOGLE_PROJECT };
  const wasFetch = globalThis.fetch;
  process.env.GOOGLE_VERTEX_KEY = 'test-key';
  process.env.GOOGLE_PROJECT = 'test-project';
  let sent: unknown[] = [];
  globalThis.fetch = (async (_where: unknown, how: { body?: string }) => {
    const body = JSON.parse(how?.body ?? '{}') as { contents?: { parts?: unknown[] }[] };
    sent = body.contents?.[0]?.parts ?? [];
    /* A refusal, so nothing downstream has to pretend to be a picture. */
    return { ok: false, status: 503, text: async () => 'stubbed' } as unknown as Response;
  }) as typeof globalThis.fetch;
  try {
    await makePicture('put the first person into the second room', from);
  } finally {
    globalThis.fetch = wasFetch;
    if (was.key === undefined) delete process.env.GOOGLE_VERTEX_KEY;
    else process.env.GOOGLE_VERTEX_KEY = was.key;
    if (was.project === undefined) delete process.env.GOOGLE_PROJECT;
    else process.env.GOOGLE_PROJECT = was.project;
  }
  return sent;
}

const three = [
  { data: 'AAAA', mime: 'image/png' },
  { data: 'BBBB', mime: 'image/jpeg' },
  { data: 'CCCC', mime: 'image/webp' },
];

const sentThree = await partsOf(three);
ok(`the engine puts all ${MOST_PICTURES} pictures on the wire, not the first`,
  sentThree.filter((one) => (one as { inlineData?: unknown }).inlineData).length === 3,
  `${sentThree.filter((one) => (one as { inlineData?: unknown }).inlineData).length} of 3`
  + ' went — the parts array was built to hold a list and only ever had one'
  + ' thing pushed into it, which is how every multi-picture capability'
  + ' Google offers had been unreachable since the file was written');

/* Indexed through a reader rather than directly, because the assertion above
   is the one that fails first and a crash on the next line reports a broken
   check instead of a broken app. */
const dataAt = (parts: readonly unknown[], at: number): string | undefined =>
  (parts[at] as { inlineData?: { data?: string } } | undefined)?.inlineData?.data;

ok('  and in the order they were given',
  dataAt(sentThree, 0) === 'AAAA' && dataAt(sentThree, 2) === 'CCCC',
  '"put the person from the first picture into the second room" is a'
  + ' sentence about an order, and a model reads a turn in order');

ok('  and the words come after every picture',
  sentThree.findIndex((one) => (one as { text?: unknown }).text) === 3,
  'an instruction that arrives before the thing it is about is an'
  + ' instruction about nothing');

const sentOne = await partsOf({ data: 'AAAA', mime: 'image/png' });
ok('  and one picture on its own still goes, unwrapped',
  sentOne.filter((one) => (one as { inlineData?: unknown }).inlineData).length === 1,
  'every room that was working before this change passes a single object,'
  + ' and a widening that breaks the narrow case is not a widening');

const sentNone = await partsOf(undefined);
ok('  and drawing from nothing sends only words',
  sentNone.length === 1 && Boolean((sentNone[0] as { text?: unknown } | undefined)?.text),
  'a `from` left out means draw a new one');

const sentFour = await partsOf([...three, { data: 'DDDD', mime: 'image/png' }]);
ok(`  and a ${MOST_PICTURES + 1}th is not sent`,
  sentFour.filter((one) => (one as { inlineData?: unknown }).inlineData).length === MOST_PICTURES,
  'the route refuses the whole request over one too many, so the engine'
  + ' must not be the thing that lets it through');

ok('the engine and the limit file name the same number',
  FROM_SERVER === MOST_PICTURES,
  'the number is in `lib/picturelimit.ts` because three places need it and'
  + ' they sit on opposite sides of the browser/server line');

/* ── 2. The route counts the TOTAL, not each picture ───────────────────── */

const route = withoutComments(readFileSync('app/api/google/picture/route.ts', 'utf8'));

ok('the route accepts a list of pictures',
  /Array\.isArray\(said\.from\)/.test(route),
  'it read `said.from` as a single object, so a list arrived as one picture'
  + ' with no data in it and was refused as the wrong kind');

ok('  and counts what they come to TOGETHER against the body limit',
  /reduce\(/.test(route) && /weight > MOST_BYTES/.test(route)
  && !/data\.length > MOST_BYTES/.test(route),
  'three pictures each under a four-megabyte limit are twelve megabytes on'
  + ' the wire, and the platform refuses past four and a half BEFORE the'
  + ' route runs — a bare 413 with no sentence in it, which is exactly the'
  + ' failure check:bodylimit exists for');

ok('  and refuses too many rather than quietly dropping one',
  /asList\.length > MOST_PICTURES/.test(route),
  'dropping the fourth would hand back an answer missing a picture'
  + ' somebody chose, with nothing anywhere saying why');

ok('  and still checks every type before anything leaves this machine',
  /for \(const one of asList\)/.test(route) && /MIMES\.has\(mime\)/.test(route),
  'a loop that widens the intake and forgets the guard inside it is how a'
  + ' check stays green while the rule it holds is gone');

/* ── 3. The budget arithmetic ──────────────────────────────────────────── */

ok('the budget is under what the platform carries',
  BUDGET < 4.5 * 1024 * 1024,
  `${(BUDGET / 1024 / 1024).toFixed(1)} MB — the words, the JSON and the`
  + ' headers travel in the same body');

ok('  and the shares of it always add up to no more than the whole',
  [1, 2, 3].every((many) => shareFor(many) * many <= BUDGET),
  [1, 2, 3].map((many) => `${many}×${shareFor(many)}`).join(' '));

ok('  and a count past the limit is still given a real share',
  shareFor(9) === shareFor(MOST_PICTURES) && shareFor(0) === BUDGET,
  'nine would otherwise divide the budget into slivers nothing fits in,'
  + ' and zero would divide by zero');

ok('one picture alone is not shrunk at all',
  sideFor(1) === 0 && sideFor(0) === 0,
  'one picture is the EDIT case — somebody’s own photograph going up to be'
  + ' changed and handed back, where shrinking it is this app quietly'
  + ' lowering the quality of her picture');

ok('  and two or more are shrunk to the reference size',
  sideFor(2) === REFERENCE_SIDE && sideFor(3) === REFERENCE_SIDE,
  'all a reference has to carry is "this person", "this palette", "this'
  + ' logo" — and the budget cannot grow');

ok('  and the picture being edited keeps more detail than a reference',
  LEAD_SIDE > REFERENCE_SIDE,
  `${LEAD_SIDE} against ${REFERENCE_SIDE} — the model draws its answer at 2K`
  + ' either way, but it can only put back detail it could see: a face sent'
  + ' at 768 comes back as a 2K picture of a 768 face');

ok('a picture is never enlarged on its way up',
  (() => {
    const small = drawnSize(300, 200, REFERENCE_SIDE);
    return small.width === 300 && small.height === 200;
  })(),
  'a 300-pixel logo stretched to 768 is three times the bytes for exactly'
  + ' the same information');

ok('  and shrinking keeps the shape it came in',
  (() => {
    const wide = drawnSize(4000, 2000, 768);
    const tall = drawnSize(2000, 4000, 768);
    return wide.width === 768 && wide.height === 384
      && tall.height === 768 && tall.width === 384;
  })(),
  'a reference squeezed out of shape teaches the next picture to be out of'
  + ' shape');

ok('  and a picture with a side of nothing still comes out drawable',
  (() => {
    const flat = drawnSize(0, 0, 768);
    const sliver = drawnSize(2000, 1, 768);
    return flat.width >= 1 && flat.height >= 1 && sliver.height >= 1;
  })(),
  'a canvas of zero width throws rather than returning a blank, and a'
  + ' one-pixel-high panorama rounds to zero');

ok('the quality ladder walks down and stops above the smudge',
  LADDER.length >= 4
  && LADDER.every((one, at) => at === 0 || one < LADDER[at - 1])
  && LADDER[LADDER.length - 1] >= 0.35 && LADDER[0] <= 0.95,
  LADDER.join(' → ')
  + ' — below about 0.4 the artefacts become part of what the model copies,'
  + ' and a reference that teaches the next picture to look blocky is worse'
  + ' than no reference');

ok('the room left for references counts the picture being edited',
  roomForRefs(true) === MOST_PICTURES - 1 && roomForRefs(false) === MOST_PICTURES,
  'a screen that offers a third reference beside a picture on the bench is'
  + ' offering a request the route refuses whole');

/* ── 4. The storybook: the same child on every page ────────────────────── */

ok('the first page is drawn from nothing',
  lookBack([]).length === 0,
  'there is nothing to look back at, and a reference that does not exist is'
  + ' a sentence about nothing');

ok('  the second page looks back at the first, once',
  (() => {
    const back = lookBack(['one']);
    return back.length === 1 && back[0] === 'one';
  })(),
  'on page two the first page and the page before are the same picture, and'
  + ' sending it twice pays for the same bytes twice and halves the quality'
  + ' of both copies');

ok('  and a later page looks back at the first AND the one before it',
  (() => {
    const back = lookBack(['one', 'two', 'three', 'four']);
    return back.length === 2 && back[0] === 'one' && back[1] === 'four';
  })(),
  'the first page is where the characters were established, so it anchors;'
  + ' the page just before is what stops a drift of a few percent a page —'
  + ' invisible between neighbours, obvious across twelve');

ok(`  and never more than ${MOST_PICTURES}`,
  lookBack(['a', 'b', 'c', 'd', 'e', 'f']).length <= MOST_PICTURES);

const alone = pictureWords({ id: 'p1', text: 'The dog ran home.' }, 'watercolour');
const withRefs = pictureWords({ id: 'p1', text: 'The dog ran home.' }, 'watercolour', 2);

ok('the keep-the-same-character sentence is said only when pictures go',
  !/keep every character/i.test(alone) && /keep every character/i.test(withRefs),
  'a model told to match a reference with no reference attached invents one'
  + ' and describes it, which is the most expensive way to get a stranger');

ok('  and it is worded for how many there are',
  /The picture attached is/.test(
    pictureWords({ id: 'p1', text: 'x' }, 'y', 1),
  ) && /The pictures attached are/.test(withRefs),
  '"The pictures attached is earlier pages" reads as a template, and a'
  + ' person who sees one template stops trusting the rest');

ok('  and no-lettering survives the widening',
  /no \nwords or lettering|no words or lettering/.test(alone.replace(/\s+/g, ' '))
  || /no words or lettering/.test(alone.replace(/\s+/g, ' ')),
  'the one instruction a picture model will otherwise disregard on a page'
  + ' that is all words — check:storie holds it too, and this is here'
  + ' because this is the file that changed');

const make = withoutComments(readFileSync('app/lib/storymake.ts', 'utf8'));
ok('the storybook really shrinks what it sends',
  /packSome\(lookBack\(before\)\)/.test(make),
  'two 2K pages sent unshrunk are over the body limit on their own, and'
  + ' the request is refused before the route runs');

ok('  and only forces a square on the page that has nothing to inherit one from',
  /from\.length\s*\n?\s*\?\s*\{ words: pictureWords\(page, look, from\.length\), from \}/.test(make),
  'a ratio sent on top of a reference edit tells the model two things'
  + ' about the same frame');

const room = withoutComments(readFileSync('app/components/StoryRoom.tsx', 'utf8'));
ok('  and the room hands each page the pages already drawn',
  /drawPage\(page, look, sofar\)/.test(room) && /sofar\.push\(drawn\.image\)/.test(room),
  'a library that takes references and a room that passes none is the'
  + ' capability still being unreachable, one layer up');

ok('  from a local and not from the state it is writing',
  /const sofar: HTMLImageElement\[\] = \[\]/.test(room),
  '`setMade` has not landed by the time the next page is asked for, so'
  + ' reading state inside the loop that writes it would draw every page'
  + ' from nothing — green, and the same storybook as before');

/* ── 5. The shapes, which were three lists that disagreed ──────────────── */

ok('every shape the route accepts is offered somewhere',
  (() => {
    const accepted = [...route.matchAll(/'(\d+:\d+)'/g)].map((one) => one[1]);
    return SHAPE_IDS.every((id) => accepted.includes(id));
  })(),
  `the engine takes ${SHAPE_IDS.join(' ')} and the photo room offered three of`
  + ' them, so two were reachable only by somebody writing the request by hand');

ok('  and the two ordinary camera shapes are among them',
  SHAPE_IDS.includes('4:3') && SHAPE_IDS.includes('3:4'),
  '4:3 and 3:4 are the shapes most pictures in the world actually are');

ok('  and each one says what it is for, in both languages',
  SHAPES.every((one) => one.en && one.af && one.forEn.length > 8 && one.forAf.length > 8),
  '"4:3" means nothing to somebody who has not worked with pictures');

ok('  and a shape off a request is checked against that same list',
  isShape('4:3') && !isShape('2:3') && !isShape('') && !isShape(null),
  'a route with its own copy of the list is the disagreement this file'
  + ' exists to stop');

ok('  and an unknown one falls back rather than coming back undefined',
  shapeOf('nonsense').id === '1:1' && shapeOf(undefined).id === '1:1',
  'a screen reading `.en` off nothing is a blank button');

const post = withoutComments(readFileSync('app/components/PostStudio.tsx', 'utf8'));
ok('the photo room draws its shapes from that list rather than its own',
  /RATIOS\.map\(/.test(post) && !/\['9:16', t\('post\.shapeTall'/.test(post),
  'a hardcoded row of three is how two of the five went missing');

/* ── 6. The rooms that bring pictures in ───────────────────────────────── */

ok('the photo room offers pictures to copy FROM',
  /data-postaskrefs/.test(post) && /packLed\(picture \?\? null/.test(post),
  'the engine reads several pictures in a turn, and this room sent one');

ok('  and lets go of them when it closes',
  /revokeObjectURL\(one\.url\)/.test(post),
  'an object URL is a handle the browser keeps alive until it is told'
  + ' otherwise, so leaving with three up holds three photographs for as'
  + ' long as the tab lives');

const editor = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));
ok('the cutting room can keep the same people across shots',
  /data-editorshotcast/.test(editor) && /packLed\(lead,/.test(editor),
  'the cast desk has held people with reference pictures since September and'
  + ' only the presenter panel ever read it, so a film made here had a'
  + ' different person in every shot');

ok('  and only names the people whose pictures actually went up',
  /const who = pairs\.map\(/.test(editor) && !/const who = cast\.filter/.test(editor),
  'naming somebody in the words whose picture did not go up asks the engine'
  + ' to match a face it cannot see, and it hands back a stranger with her'
  + ' person’s name on it');

ok('  and says so rather than drawing a shot without the face she ticked',
  /from\.length < \(lead \? 1 : 0\) \+ pairs\.length/.test(editor),
  '`packLed` leaves out what will not fit rather than sending it, so a'
  + ' short list means one of them is on the floor');

console.log(bad === 0
  ? '\n  Several pictures in one turn: all good.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
