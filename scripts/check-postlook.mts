/**
 * What a picture looks like, in numbers.
 *
 * ── Which half of her list this is ───────────────────────────────────────
 *
 * Carli, 7 October 2026: *"magic grab ... BG remover, magic eraser,
 * upscaler, auto focus, blur, grab text, image to video ... Dit is alles
 * code wat ons oor tyd kan develop."*
 *
 * The list splits in two and the split is money. This file holds the half
 * that runs on the phone for nothing. The other half needs an engine and a
 * price per use, which is hers to set.
 *
 * ── The one that would have shipped wrong ────────────────────────────────
 *
 * The preview is drawn at 540 on its longest edge and the file at 1080 or
 * 1920. A `blur(8px)` is eight DEVICE pixels either way — so the same
 * setting is nearly four times as strong, relative to the picture, on screen
 * as in the file. She would have set a blur she liked and been handed one
 * barely there.
 *
 * Nothing on screen says so: both pictures look like a blurred picture. It
 * is the same shape of fault as a transparent post previewing black, and the
 * only way to catch it is arithmetic, because the eye has nothing to compare
 * against.
 *
 *   npm run check:postlook
 */
import {
  AUTO, PLAIN, RANGES, filterFor, touched, warmWash, type Look,
} from '../app/lib/postlook';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/** The blur in pixels inside a filter string, or null. */
const blurOf = (filter: string): number | null => {
  const found = /blur\(([\d.]+)px\)/.exec(filter);
  return found ? Number(found[1]) : null;
};

/* ── The blur scales with the canvas ─────────────────────────────────────── */

const blurred: Look = { ...PLAIN, blur: 8 };
const inFile = blurOf(filterFor(blurred, 1));
const onScreen = blurOf(filterFor(blurred, 540 / 1920));

ok('a blur is set in both the preview and the file',
  inFile !== null && onScreen !== null, `${inFile} and ${onScreen}`);
ok('  and the preview’s is scaled down with the canvas',
  inFile !== null && onScreen !== null && Math.abs(onScreen - inFile * (540 / 1920)) < 0.02,
  `${onScreen}px on a preview ${(540 / 1920).toFixed(3)} of full size, against ${inFile}px in`
  + ' the file — the same number of device pixels in both is a blur four times'
  + ' as strong on screen as in the picture she is handed');

/* ── Nothing set is no filter at all ─────────────────────────────────────── */

ok('a picture nobody has touched carries no filter', filterFor(PLAIN) === 'none',
  `${filterFor(PLAIN)} — a canvas with a filter set takes a different path`
  + ' through the compositor even when the filter does nothing, and most'
  + ' pictures are never adjusted');
ok('  and `touched` agrees with that', !touched(PLAIN) && touched(AUTO));

/* ── Every slider reaches the filter, and none of them escapes ──────────── */

const FIELDS = ['bright', 'contrast', 'colour', 'warmth', 'blur'] as const;
for (const field of FIELDS) {
  const far: Look = { ...PLAIN, [field]: RANGES[field].max };
  const changed = field === 'warmth'
    ? warmWash(far) !== null
    : filterFor(far) !== filterFor(PLAIN);
  ok(`  ${field} at its end actually changes the picture`, changed,
    'a slider wired to nothing is the fault this repo keeps catching');
}

/* Absurd values, because a range input is not the only thing that can set
   these — a kept project, a future preset, a typo in a default. */
const MAD = [999, -999, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
let loose = 0;
for (const field of FIELDS) {
  for (const value of MAD) {
    const filter = filterFor({ ...PLAIN, [field]: value });
    if (/NaN|Infinity/.test(filter)) loose += 1;
    const blur = blurOf(filter);
    if (blur !== null && (blur < 0 || blur > RANGES.blur.max)) loose += 1;
    const wash = warmWash({ ...PLAIN, [field]: value });
    if (wash && /NaN|Infinity/.test(wash.ink)) loose += 1;
  }
}
ok(`no value can put NaN or a negative blur into the filter (${FIELDS.length * MAD.length} tried)`,
  loose === 0,
  `${loose} got through — a canvas handed a filter it cannot parse draws`
  + ' the picture with no filter at all and says nothing');

/* ── The lift is a lift, not a look ──────────────────────────────────────── */

ok('the one-press lift is small enough to still be her photograph',
  AUTO.bright <= 1.1 && AUTO.contrast <= 1.2 && AUTO.colour <= 1.2 && AUTO.blur === 0,
  `${JSON.stringify(AUTO)} — a big automatic lift is what makes every picture`
  + ' in a feed look like the same filter');
ok('  and it does not pretend to be focus', AUTO.blur === 0 && !('sharpen' in AUTO),
  'nothing recovers a photograph that was soft when it was taken, and a'
  + ' control that claims to is worse than no control');

/* ── Warmth goes both ways and is a wash, not a filter ──────────────────── */

ok('warmth warms one way and cools the other',
  /255,170,60/.test(warmWash({ ...PLAIN, warmth: 0.5 })?.ink ?? '')
  && /60,150,255/.test(warmWash({ ...PLAIN, warmth: -0.5 })?.ink ?? ''));
ok('  and nought is no wash at all', warmWash(PLAIN) === null);
ok('  and it is laid over rather than folded into the filter',
  !/sepia|hue-rotate/.test(filterFor({ ...PLAIN, warmth: 1 })),
  'sepia drains colour on its way to warm and hue-rotate turns a blue sky'
  + ' green before it warms a face');

if (bad) {
  console.error(`\ncheck:postlook — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:postlook — the free half of the editing tools: every slider reaches the'
  + ' picture, a blur is the same strength in the file as on screen, and nothing'
  + ' can put a value the canvas cannot parse into the filter.',
);
