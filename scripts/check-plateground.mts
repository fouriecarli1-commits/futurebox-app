/**
 * The other background remover: the one that takes a plain ground off a
 * drawing, and knows nothing about people.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026, of a logo this app had just made: *"Kyk gou of jy
 * hierdie sien as transparent"* — and it was not. Then: *"Well this was done
 * on our own app. How are we going to get transparency?"*
 *
 * ── The thing this is really about ───────────────────────────────────────
 *
 * An image model cannot make transparency. It returns opaque pixels, and
 * asked for a transparent background it draws a PICTURE of a checkerboard.
 * Hers came back as a 35-pixel grid of grey and white squares. So the
 * checkerboard is not a bug to be prompted away, it is what the answer looks
 * like, and transparency has to be made afterwards.
 *
 * ── Why this is driven on real pixels and not read ───────────────────────
 *
 * Because every way this goes wrong produces a picture, and a picture that is
 * wrong looks exactly like a picture that is right until somebody puts it on
 * a coloured page. A cut that takes the subject too, a cut that leaves a grey
 * rim, a cut that punches a hole through a white shirt, a cut that hard-edges
 * every line into a staircase — all four render. So the pictures are built
 * here, pixel by pixel, cut, and measured.
 *
 * The checkerboard case is built to her file's own measurements, because that
 * is the picture this exists for and "it works on a white square" is the
 * green-for-an-adjacent-reason that would have shipped it broken.
 */

import { readFileSync } from 'node:fs';
import { after, from } from './order.mts';
import { withoutComments } from './prose.mts';
import {
  CLEAR, KEPT, MOST_GROUNDS, NEARLY_ALL, type Pixels, groundsOf, takeGround,
} from '../app/lib/flatcut.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/** A blank picture to paint test cases onto. */
const sheet = (width: number, height: number, fill: readonly number[]): Pixels => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = fill[0]; data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2]; data[i * 4 + 3] = 255;
  }
  return { data, width, height };
};

const put = (p: Pixels, x: number, y: number, c: readonly number[]): void => {
  const o = (y * p.width + x) * 4;
  p.data[o] = c[0]; p.data[o + 1] = c[1]; p.data[o + 2] = c[2];
  p.data[o + 3] = c[3] ?? 255;
};

const alphaAt = (p: Pixels, x: number, y: number): number =>
  p.data[(y * p.width + x) * 4 + 3];

const INK = [31, 58, 95];

/* ── 1. A flat white ground, which is the easy half ───────────────────── */

const onWhite = (() => {
  const p = sheet(60, 60, [255, 255, 255]);
  for (let y = 20; y < 40; y += 1) for (let x = 20; x < 40; x += 1) put(p, x, y, INK);
  return p;
})();

ok('a flat ground is learned from the edge of the frame',
  (() => {
    const found = groundsOf(onWhite);
    return found.length === 1 && found[0].every((v) => v > 245);
  })(),
  'assuming white would have failed on the very picture this exists for');

ok('  and it goes away completely',
  (() => {
    const cut = takeGround(onWhite);
    return alphaAt(cut.pixels, 2, 2) === 0 && alphaAt(cut.pixels, 50, 10) === 0;
  })(),
  'a ground left at alpha 3 is a ground that shows as a faint box on a dark'
  + ' page — invisible on the white page it was cut on');

ok('  and the drawing is left alone',
  (() => {
    const cut = takeGround(onWhite);
    return alphaAt(cut.pixels, 30, 30) === 255;
  })(),
  'a subject left at 250 is a subject that is slightly see-through, which'
  + ' shows as a ghost the moment anything is put behind it');

/* ── 2. Her checkerboard, built to her file's measurements ────────────── */

const onChecks = (() => {
  const p = sheet(140, 140, [255, 255, 255]);
  /* A 35-pixel grid of 224-grey and white: what her picture actually is. */
  for (let y = 0; y < 140; y += 1) {
    for (let x = 0; x < 140; x += 1) {
      const dark = (Math.floor(x / 35) + Math.floor(y / 35)) % 2 === 0;
      put(p, x, y, dark ? [224, 224, 224] : [255, 255, 255]);
    }
  }
  for (let y = 50; y < 90; y += 1) for (let x = 50; x < 90; x += 1) put(p, x, y, INK);
  return p;
})();

ok('a checkerboard is learned as the two colours it is',
  (() => {
    const found = groundsOf(onChecks);
    return found.length === 2
      && found.some((one) => one[0] > 245)
      && found.some((one) => one[0] > 215 && one[0] < 235);
  })(),
  'this is the picture the whole thing exists for. A remover that assumes'
  + ' one flat colour clears the white squares, leaves the grey ones, and'
  + ' hands back a logo with a chessboard behind it');

ok('  and every square of it goes',
  (() => {
    const cut = takeGround(onChecks);
    let left = 0;
    for (let y = 0; y < 140; y += 1) {
      for (let x = 0; x < 140; x += 1) {
        const inDrawing = x >= 50 && x < 90 && y >= 50 && y < 90;
        if (!inDrawing && alphaAt(cut.pixels, x, y) > 8) left += 1;
      }
    }
    if (left) console.log(`         ${left} background pixels left behind`);
    return left === 0;
  })());

ok('  and it says how much it took',
  (() => {
    const cut = takeGround(onChecks);
    const drawing = (40 * 40) / (140 * 140);
    return Math.abs(cut.removed - (1 - drawing)) < 0.01;
  })(),
  'a room that cannot say "that took 99% of the picture" cannot warn'
  + ' anybody that the subject went with it');

/* ── 3. The soft edge, which is what makes it look drawn ──────────────── */

ok('a half-covered edge pixel comes out half see-through',
  (() => {
    const p = sheet(40, 40, [255, 255, 255]);
    for (let y = 10; y < 30; y += 1) {
      for (let x = 10; x < 30; x += 1) put(p, x, y, INK);
      /* One column of the line blended halfway into the paper, which is what
         an anti-aliased edge is. */
      put(p, 30, y, [143, 156, 175]);
    }
    const cut = takeGround(p);
    const edge = alphaAt(cut.pixels, 30, 15);
    return edge > 60 && edge < 220;
  })(),
  'cut hard, every anti-aliased line in the picture becomes a staircase, and'
  + ' a drawing of thin lines becomes a drawing of thin broken lines');

ok('  and the thresholds are the right way round',
  CLEAR < KEPT && CLEAR > 0,
  'with KEPT below CLEAR every pixel is either kept or cleared and the fade'
  + ' between them cannot happen');

/* ── 4. Reach: the choice the pixels cannot make ──────────────────────── */

/** A ring of ink with plain ground trapped inside it — a logo's own holes. */
const withHole = (() => {
  const p = sheet(60, 60, [255, 255, 255]);
  for (let y = 15; y < 45; y += 1) {
    for (let x = 15; x < 45; x += 1) {
      const inside = x > 20 && x < 40 && y > 20 && y < 40;
      if (!inside) put(p, x, y, INK);
    }
  }
  return p;
})();

ok('a logo’s own holes are cleared when asked for everywhere',
  alphaAt(takeGround(withHole, 'everywhere').pixels, 30, 30) === 0,
  'the gaps inside a mark ARE background, and a logo whose counters stay'
  + ' white is a logo with a white blob in the middle of it on a dark page');

ok('  and they are kept when asked only for the edges',
  alphaAt(takeGround(withHole, 'edges').pixels, 30, 30) === 255
  && alphaAt(takeGround(withHole, 'edges').pixels, 2, 2) === 0,
  'the same measurement on a photograph punches a hole through a white'
  + ' shirt, which is the fault this kind of tool is known for. So the reach'
  + ' is the caller’s choice and not a guess made from the pixels');

/* ── 5. What it refuses to invent ─────────────────────────────────────── */

ok('a picture with no plain ground keeps nearly all of itself',
  (() => {
    const p = sheet(60, 60, [0, 0, 0]);
    /* Noise everywhere, including the ring: there is no background here. */
    for (let y = 0; y < 60; y += 1) {
      for (let x = 0; x < 60; x += 1) {
        put(p, x, y, [(x * 37) % 256, (y * 53) % 256, (x * y * 11) % 256]);
      }
    }
    return takeGround(p).removed < 0.35;
  })(),
  'a remover that finds a background in anything is a remover that deletes'
  + ' a photograph of a forest');

ok('  and it keeps at most four ground colours',
  (() => {
    const p = sheet(80, 80, [0, 0, 0]);
    for (let y = 0; y < 80; y += 1) {
      for (let x = 0; x < 80; x += 1) {
        put(p, x, y, [(x * 29) % 256, (y * 71) % 256, ((x + y) * 43) % 256]);
      }
    }
    return groundsOf(p).length <= MOST_GROUNDS;
  })(),
  'more than four and a busy photograph qualifies as plain, which is how'
  + ' this kind of tool ends up deleting half of somebody’s picture');

ok('  and a ground that is already see-through is not read as a colour',
  (() => {
    const p = sheet(40, 40, [255, 255, 255]);
    for (let i = 0; i < 40 * 40; i += 1) p.data[i * 4 + 3] = 0;
    for (let y = 15; y < 25; y += 1) {
      for (let x = 15; x < 25; x += 1) put(p, x, y, [...INK, 255]);
    }
    /* Nothing opaque on the ring at all, so nothing is learned from it. */
    return groundsOf(p).length === 0 && takeGround(p).removed > 0.8;
  })(),
  'a picture that has already been cut out once would otherwise teach this'
  + ' that its background is whatever was left under the transparency');

ok('  and there is a line past which the room ought to say something',
  NEARLY_ALL > 0.9 && NEARLY_ALL < 1,
  'a cut that takes 97% has probably taken the subject too, and an empty'
  + ' picture on a phone looks exactly like one that failed to load');

/* ── 6. And it is actually wired to a button ──────────────────────────── */

const room = withoutComments(readFileSync('app/components/PostStudio.tsx', 'utf8'));

ok('the room has a button for it',
  /data-postgroundgo/.test(room) && /onClick=\{takeFlatGround\}/.test(room),
  'a cut-out nobody can press is a cut-out nobody has');

ok('  and it is beside the one that only finds people, not instead of it',
  after(room, 'data-postgroundgo', 'data-postcutgo'),
  'the person remover runs a model trained on people and finds nobody in a'
  + ' logo, which is correct and useless. Replacing it would lose the'
  + ' photographs; the two are different tools');

ok('  and the reach is asked rather than guessed',
  /data-postgroundreach="everywhere"/.test(room)
  && /data-postgroundreach="edges"/.test(room)
  && /takeGround\(\s*\{ data: was\.data, width: wide, height: tall \},\s*groundReach,/.test(room),
  'a hard-coded reach is right for half the pictures: a logo whose holes'
  + ' stay white, or a photograph with a hole punched through a white shirt');

ok('  and it says something when there is no plain ground to take',
  /post\.groundNone/.test(room) && /done\.grounds\.length === 0 \|\| done\.removed < 0\.004/.test(room),
  'pressing a button and having the picture not change is the worst answer'
  + ' a room can give: nothing happened and nothing said why');

ok('  and it warns when almost everything went',
  /done\.removed > NEARLY_ALL/.test(room) && /post\.groundMost/.test(room),
  'an empty picture on a phone looks exactly like one that failed to load');

ok('  and what it took can be put back',
  /setWhole\(picture\);/.test(from(room, 'const takeFlatGround').slice(0, 2_000)),
  'a cut that cannot be undone is a cut nobody presses twice');

console.log(bad === 0
  ? '\n  A plain ground comes off — including the checkerboard an image model\n'
    + '  paints when it is asked for transparency it cannot make.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
