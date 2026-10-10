/**
 * Google draws the pictures in the child's room, and draws them as a set.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Kan jy asb nie op jou eie engine staat maak om
 * kreatiewe idees uit te dink vir die kids room nie. Jy is nie goed daarmee
 * nie. Jy sal moet ons google engines gebruik!"*
 *
 * ── What can go wrong here, all of which draws something ─────────────────
 *
 *   · A choice with NO picture asked for. Twenty-two bubbles with artwork and
 *     one with a line icon reads as the broken one, and the press that would
 *     have fixed it has already been paid for.
 *   · A SOUND asked for as itself. "Draw kwaito" gets a picture of a word;
 *     each sound needs an object a child recognises, and nine of them must
 *     not collide.
 *   · A TOPIC asked for with its song words still on it. The song prompt says
 *     "a happy song about a dog", and a picture model handed that draws sheet
 *     music.
 *   · The style sentence dropped from one of them, so twenty-two are a set
 *     and one is a photograph.
 *   · A reference picture passed, which is the one thing she asked never to
 *     happen: an image model handed a drawing reproduces it.
 *
 * None of those errors. Every one of them comes back as a picture. So the
 * asks are BUILT here and read, and the one call site is pinned and counted.
 */

import { readFileSync } from 'node:fs';
import { after, from } from './order.mts';
import { withoutComments } from './prose.mts';
import { DRAWINGS, HOUSE, NOTHING_WRITTEN, askFor, drawingById } from '../app/lib/kidsart.ts';
import { KID_SOUNDS, KID_TOPICS } from '../app/lib/kidsong.ts';
import { drawingsAsked } from '../app/api/kids/art/route.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const route = withoutComments(readFileSync('app/api/kids/art/route.ts', 'utf8'));
const bench = withoutComments(readFileSync('app/components/KidsArt.tsx', 'utf8'));

/* ── 1. One picture for every choice in the room ──────────────────────── */

ok('every choice in the room has a picture asked for it',
  (() => {
    const missing = [
      ...KID_TOPICS.filter((one) => !drawingById(one.id, 'topic')).map((o) => `topic:${o.id}`),
      ...KID_SOUNDS.filter((one) => !drawingById(one.id, 'sound')).map((o) => `sound:${o.id}`),
    ];
    if (missing.length) console.log(`         nothing asked for: ${missing.join(', ')}`);
    return missing.length === 0
      && DRAWINGS.length === KID_TOPICS.length + KID_SOUNDS.length;
  })(),
  'twenty-two bubbles with artwork and one with a line icon reads as the'
  + ' broken one');

ok('  and a topic and a sound of the same name are two different pictures',
  (() => {
    const both = DRAWINGS.filter((one) => one.id === 'happy');
    /* `happy` is a sound today and could be a topic tomorrow. Asked for by id
       alone, the wrong one is drawn and paid for. */
    return drawingById('happy', 'sound') !== undefined
      && drawingById('no-such-thing', 'topic') === undefined
      && both.every((one) => ['topic', 'sound'].includes(one.of));
  })());

ok('  and not one of them fell through to the fallback',
  (() => {
    const bare = DRAWINGS.filter((one) => one.words === NOTHING_WRITTEN)
      .map((one) => `${one.of}:${one.id}`);
    if (bare.length) console.log(`         nothing written: ${bare.join(', ')}`);
    return bare.length === 0;
  })(),
  'a fallback is the right thing to have and it is also what hides a missing'
  + ' entry: take one sound\'s subject away and the set still draws'
  + ' twenty-three pictures, several of them a musical note. That mutation'
  + ' went through unnoticed until this line existed');

ok('  and no sound is asked for as a word',
  DRAWINGS.filter((one) => one.of === 'sound')
    .every((one) => one.words.length > 12 && !/^(happy|quiet|rock|dance|march|funny|country|kwaito|musicbox)$/i.test(one.words)),
  '"draw kwaito" gets a picture of a word. Each one needs an object a child'
  + ' recognises');

ok('  and no two sounds are drawn as the same object',
  (() => {
    const subjects = DRAWINGS.filter((one) => one.of === 'sound').map((one) => one.words);
    return new Set(subjects).size === subjects.length;
  })(),
  'nine happy faces is nine bubbles a child cannot tell apart');

ok('  and no topic is asked for with its SONG words still on it',
  DRAWINGS.filter((one) => one.of === 'topic')
    .every((one) => !/\bsong\b/i.test(one.words)),
  'the song prompt says "a happy song about a dog", and a picture model'
  + ' handed that draws sheet music');

/* ── 2. The asks, built and read ──────────────────────────────────────── */

const asks = DRAWINGS.map((one) => askFor(one));

ok('every picture is asked for with NOTHING WE DREW',
  asks.length === DRAWINGS.length && asks.every((one) => one.from === undefined),
  'her rule from the logo, and the reason this file exists: an image model'
  + ' handed a drawing reproduces it, and the point of asking is to get'
  + ' something neither of us would have made');

ok('  and every one of them carries the same house style',
  asks.every((one) => one.words.startsWith(HOUSE) && one.words.length > HOUSE.length + 8),
  'twenty-three pictures that sit beside each other have to look like a set.'
  + ' One without the style sentence is the photograph among the drawings');

ok('  and no two of them ask for the same picture',
  new Set(asks.map((one) => one.words)).size === asks.length,
  'two identical asks is two bubbles with one picture, paid for twice');

ok('  and they ask for a square, on white',
  asks.every((one) => one.aspect === '1:1')
  && /pure white background/i.test(HOUSE) && !/transparent/i.test(HOUSE),
  'every one of them is drawn inside a round bubble. And white because an'
  + ' image model cannot make transparency — asked for it, it draws a'
  + ' checkerboard, which was measured on her logo. White cuts out cleanly'
  + ' with the remover the picture room already has');

ok('  and they ask for no lettering',
  /no text, no letters/i.test(HOUSE),
  'an image model asked for a picture writes words on it, in letters that'
  + ' are not letters');

ok('  and the route hands Google that and nothing else',
  (() => {
    const calls = route.match(/makePicture\(/g) ?? [];
    return calls.length === 1
      && /const ask = askFor\(one\);/.test(route)
      && /makePicture\(ask\.words, ask\.from, ask\.aspect\)/.test(route);
  })(),
  'the call site is pinned and counted, so a second one cannot be added'
  + ' beside it with a picture in it');

/* ── 3. What it will and will not draw, run ───────────────────────────── */

ok('pressing it plain asks for every picture',
  (drawingsAsked({}) ?? []).length === DRAWINGS.length);

ok('  and one can be asked for again on its own',
  (() => {
    const one = drawingsAsked({ id: 'space', of: 'topic' });
    return one?.length === 1 && one[0].id === 'space' && one[0].of === 'topic';
  })(),
  'twenty-three at a time to see the set, one at a time to settle — a page'
  + ' that can only redraw all of them spends twenty-three pictures on a'
  + ' change of mind about one');

ok('  and a picture that does not exist is refused rather than drawn',
  drawingsAsked({ id: 'not-a-thing', of: 'topic' }) === null
  && drawingsAsked({ id: 'space', of: 'nonsense' }) === null
  && drawingsAsked({ id: 42, of: 'topic' }) === null
  && drawingsAsked({ id: 'space' }) === null,
  'a name that fell through would be asked for as `undefined` and come back'
  + ' as whatever the engine makes of that, having been paid for');

/* ── 4. It is hers, and it is metered ─────────────────────────────────── */

ok('the route is the operator’s alone',
  /callerIsOwner\(caller\)/.test(route) && /status: 403/.test(route)
  && /status: 401/.test(route),
  'twenty-three pictures a press, on her Google budget');

ok('  and it asks the ceiling for all of them before it draws any',
  after(route, 'makePicture(', "enough('image'")
  && /enough\('image', PER_PICTURE \* wanted\.length/.test(route),
  'reserving one picture and drawing twenty-three is a ceiling wrong by a'
  + ' factor of twenty-three, in the direction that costs money');

ok('  and writes down what it cost once a picture is in hand',
  after(route, "note('image'", 'if (made.ok)'),
  'a call that failed cost nothing, and a ceiling that counts failures'
  + ' closes early for a reason nobody can see');

ok('  and one picture failing does not throw the other twenty-two away',
  /ok: false, message: made\.message/.test(route),
  'a sitting of twenty-three that returns nothing because the fourth failed'
  + ' is twenty-two pictures paid for and not shown');

/* ── 5. The bench ─────────────────────────────────────────────────────── */

ok('the bench can save what comes back',
  /download=\{`kids-\$\{one\.of\}-\$\{one\.id\}\.png`\}/.test(bench),
  'a picture she can see and cannot keep is a picture she has to pay for'
  + ' again');

ok('  and it says, on the page, that nothing of ours was sent',
  /* Matched on a fragment that survives the line breaks a long sentence is
     written across. The first version looked for the whole sentence and
     failed on a page that says it — a check that fails on correct code
     gets worked around, and a worked-around check is worse than none. */
  /is given the words and nothing else/.test(bench)
  && /drawn by Google/i.test(bench),
  'she asked for her engine and not mine; the page she presses should say'
  + ' which one drew it');

ok('  and it is not linked from inside the app',
  (() => {
    const home = withoutComments(readFileSync('app/page.tsx', 'utf8'));
    return !/\/kids\/art/.test(home);
  })(),
  'every press spends her Google budget on twenty-three pictures, so a door'
  + ' to it inside the app is a spend button on somebody else’s screen');

console.log(bad === 0
  ? '\n  Twenty-three pictures asked of Google in her words, as one set, and\n'
    + '  nothing we ever drew is sent to it.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
