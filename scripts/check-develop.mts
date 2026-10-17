/**
 * The darkroom's arithmetic, without a browser.
 *
 *   npm run check:develop
 *
 * Carli, 17 October 2026: a professional developing room. What can go wrong
 * quietly is the arithmetic — a curve that bulges, a slider that moves the
 * wrong way, white balance that drifts the picture rather than neutralising
 * it — so each is driven here on a few pixels where the answer is known.
 */
import {
  AS_SHOT, BANDS, DEVELOP_PRESETS, STRAIGHT, autoTone, bandWeight, cleanDevelop, curveTable, developPixels,
  developed, fromHsl, fromPreset, hdrTone, histogram, neutralAt, toHsl, type Develop,
} from '../app/lib/develop.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/** One pixel, developed. */
const one = (rgb: [number, number, number], d: Partial<Develop>): [number, number, number] => {
  const data = new Uint8ClampedArray([...rgb, 255]);
  const out = developPixels({ data, width: 1, height: 1 }, null, null, { ...AS_SHOT, ...d });
  return [out[0], out[1], out[2]];
};
const sum = (c: [number, number, number]): number => c[0] + c[1] + c[2];

/* ── As shot is as shot ─────────────────────────────────────────────── */
const grey: [number, number, number] = [120, 120, 120];
ok('with nothing changed, the picture comes out as it went in', one([200, 90, 40], {}).join() === '200,90,40', one([200, 90, 40], {}).join());
ok('  and nothing changed is said to be nothing changed', !developed(AS_SHOT) && developed({ ...AS_SHOT, exposure: 1 }));

/* ── Light ──────────────────────────────────────────────────────────── */
ok('a stop more light is twice the light', Math.abs(one([60, 60, 60], { exposure: 1 })[0] - 120) <= 1, one([60, 60, 60], { exposure: 1 }).join());
ok('  and a stop less is half', Math.abs(one([120, 120, 120], { exposure: -1 })[0] - 60) <= 1);
ok('contrast pushes a light grey lighter and a dark grey darker',
  one([180, 180, 180], { contrast: 50 })[0] > 180 && one([70, 70, 70], { contrast: 50 })[0] < 70);
ok('lifting the shadows lifts a dark pixel', one([30, 30, 30], { shadows: 80 })[0] > 38, one([30, 30, 30], { shadows: 80 }).join());
ok('  and leaves a bright one nearly alone', Math.abs(one([235, 235, 235], { shadows: 80 })[0] - 235) <= 6);
ok('pulling the highlights down darkens a bright pixel', one([235, 235, 235], { highlights: -80 })[0] < 225);
ok('  and leaves a dark one nearly alone', Math.abs(one([30, 30, 30], { highlights: -80 })[0] - 30) <= 3);
ok('whites lift only the very light, blacks deepen only the very dark',
  one([230, 230, 230], { whites: 80 })[0] > 230 && Math.abs(one([60, 60, 60], { whites: 80 })[0] - 60) <= 2
    && one([20, 20, 20], { blacks: -80 })[0] < 20);

/* ── The curve ──────────────────────────────────────────────────────── */
const straight = curveTable(STRAIGHT);
ok('a straight curve changes nothing', straight[0] === 0 && straight[128] === 128 && straight[255] === 255);
const s = curveTable([[0, 0], [0.25, 0.18], [0.75, 0.84], [1, 1]]);
let rising = true;
for (let k = 1; k < 256; k += 1) if (s[k] < s[k - 1]) rising = false;
ok('an S curve never dips back down between its points', rising);
ok('  and passes through the points it was given', Math.abs(s[64] - 46) <= 2 && Math.abs(s[191] - 214) <= 2, `${s[64]} ${s[191]}`);

/* ── Colour ─────────────────────────────────────────────────────────── */
const warm = one(grey, { temp: 60 });
ok('warmer is redder and less blue', warm[0] > 120 && warm[2] < 120, warm.join());
const magenta = one(grey, { tint: 60 });
ok('tint towards magenta takes green away', magenta[1] < 120);
ok('saturation all the way down is grey', (() => { const c = one([200, 80, 40], { saturation: -100 }); return Math.abs(c[0] - c[1]) <= 1 && Math.abs(c[1] - c[2]) <= 1; })());
const dull = one([140, 120, 110], { vibrance: 100 });
const vivid = one([230, 40, 30], { vibrance: 100 });
ok('vibrance moves a dull colour more than a vivid one',
  (dull[0] - dull[2]) / 30 > (vivid[0] - vivid[2]) / 200, `${dull.join()} / ${vivid.join()}`);
ok('the mixer turns only its own colour', (() => {
  const mixer = { ...AS_SHOT.mixer, blue: { h: 0, s: -100, l: 0 } };
  const blue = one([40, 80, 220], { mixer });
  const red = one([220, 40, 40], { mixer });
  return Math.abs(blue[0] - blue[2]) < 40 && red.join() === '220,40,40';
})());
ok('a band holds its hue and lets go of a far one', bandWeight(222, BANDS[5].hue) > 0.9 && bandWeight(30, BANDS[5].hue) === 0);
const [h, sa, l] = toHsl(0.8, 0.3, 0.2);
const back = fromHsl(h, sa, l);
ok('colour into hue and back is the same colour', Math.abs(back[0] - 0.8) < 1e-6 && Math.abs(back[1] - 0.3) < 1e-6 && Math.abs(back[2] - 0.2) < 1e-6);
ok('grading the shadows blue makes a dark pixel bluer and leaves a light one',
  (() => {
    const grade = { ...AS_SHOT.grade, shadows: { hue: 220, sat: 100, lum: 0 } };
    const dark = one([40, 40, 40], { grade });
    const light = one([230, 230, 230], { grade });
    return dark[2] > dark[0] + 10 && Math.abs(light[2] - light[0]) <= 2;
  })());
ok('black and white is grey', (() => { const c = one([200, 80, 40], { profile: 'mono' }); return c[0] === c[1] && c[1] === c[2]; })());

/* ── White balance from a spot ──────────────────────────────────────── */
const spot = neutralAt(150, 130, 100);
const fixed = one([150, 130, 100], spot);
ok('the dropper on a warm grey makes it neutral', Math.abs(fixed[0] - fixed[2]) <= 6 && Math.abs(fixed[1] - (fixed[0] + fixed[2]) / 2) <= 6,
  `${JSON.stringify(spot)} → ${fixed.join()}`);

/* ── Effects and detail ─────────────────────────────────────────────── */
ok('a vignette darkens the corner and not the middle', (() => {
  const data = new Uint8ClampedArray(9 * 9 * 4).fill(150);
  const out = developPixels({ data, width: 9, height: 9 }, null, null, { ...AS_SHOT, vignette: -100 });
  return out[0] < 110 && Math.abs(out[(4 * 9 + 4) * 4] - 150) <= 3;
})());
ok('sharpening pushes an edge apart from its blur', (() => {
  const data = new Uint8ClampedArray([200, 200, 200, 255]);
  const fine = new Uint8ClampedArray([150, 150, 150, 255]);
  const out = developPixels({ data, width: 1, height: 1 }, { data: fine, width: 1, height: 1 }, null, { ...AS_SHOT, sharpen: 60 });
  return out[0] > 200;
})());
ok('noise reduction pulls a flat speck towards its surroundings', (() => {
  const data = new Uint8ClampedArray([130, 130, 130, 255]);
  const fine = new Uint8ClampedArray([124, 124, 124, 255]);
  const out = developPixels({ data, width: 1, height: 1 }, { data: fine, width: 1, height: 1 }, null, { ...AS_SHOT, noise: 100 });
  return out[0] < 128;
})());

/* ── Auto, HDR, presets ─────────────────────────────────────────────── */
const darkPhoto = new Uint8ClampedArray(100 * 4);
for (let i = 0; i < 100; i += 1) { darkPhoto[i * 4] = 20 + i % 40; darkPhoto[i * 4 + 1] = 20 + i % 40; darkPhoto[i * 4 + 2] = 20 + i % 40; darkPhoto[i * 4 + 3] = 255; }
ok('Auto brightens a dark photograph', autoTone(darkPhoto).exposure > 0.3, String(autoTone(darkPhoto).exposure));
ok('HDR pulls the highlights down and lifts the shadows', hdrTone(AS_SHOT).highlights < 0 && hdrTone(AS_SHOT).shadows > 0);
ok(`every preset is a real development (${DEVELOP_PRESETS.length})`, DEVELOP_PRESETS.length >= 8 && DEVELOP_PRESETS.every((p) => developed(fromPreset(p)) && p.af && p.en));
ok('a histogram counts every pixel it reads', histogram(darkPhoto, 1).l.reduce((a, b) => a + b, 0) === 100);
ok('settings read back are settings, and nonsense is refused',
  cleanDevelop(JSON.parse(JSON.stringify(fromPreset(DEVELOP_PRESETS[0]))))?.contrast === 10 && cleanDevelop({ nope: 1 }) === null);
ok('a pixel that was see-through stays see-through', (() => {
  const data = new Uint8ClampedArray([200, 100, 50, 0]);
  return developPixels({ data, width: 1, height: 1 }, null, null, { ...AS_SHOT, exposure: 1 })[3] === 0;
})());
ok('sum of a pixel is never NaN', !Number.isNaN(sum(one([0, 0, 0], { exposure: 5, highlights: -100, shadows: 100, dehaze: 100 }))));

if (bad) {
  console.error(`\ncheck:develop — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:develop — light, curve, colour, mixer, grading, white balance, effects and detail each move the picture the way their names say.');
