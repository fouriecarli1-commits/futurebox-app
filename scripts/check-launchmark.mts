/**
 * The app launches with its name on the screen, not only its icon.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 4 October 2026: *"wanneer mens die app icon druk, dan launch hy
 * huidiglik net met die app icon, maar ek sal wil hê die woorde futurebox moet
 * saam met die icon/logo launch. Dus die futurebox woorde logo moet saam
 * launch"*.
 *
 * ── The thing this check is really for ───────────────────────────────────
 *
 * Both halves of the answer fail silently, and neither failure looks like
 * anything from the inside.
 *
 * iOS picks a startup image by matching width, height and pixel ratio
 * EXACTLY. A query that misses by one pixel, or a picture that is not the
 * size its own query claims, is not a slightly wrong splash — iOS ignores
 * every file offered and draws the icon on a plain ground, which is precisely
 * what she is already looking at. Nothing errors. Nothing logs. So the sizes
 * here are read out of the PNG headers rather than trusted to the array they
 * were generated from, and the pixels are decoded to prove the words are
 * actually ON the picture: a correctly sized, correctly named, empty rectangle
 * would pass every cheaper version of this check.
 *
 * The in-app screen fails quietly in the other direction. It is meant to be in
 * the first paint and to leave on its own, so the two ways to break it are to
 * make it wait for JavaScript — in which case it appears after the thing it
 * was supposed to cover — and to make it need JavaScript to go, in which case
 * it stays forever on the one device where the bundle failed, which is the
 * device somebody is already having trouble on.
 */
import { readFileSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { withoutComments } from './prose.mts';
import { upTo } from './order.mts';
import { SCREENS, splashFile, splashMedia, startupImages } from '../app/lib/splash';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const css = readFileSync('app/globals.css', 'utf8');
const layout = withoutComments(readFileSync('app/layout.tsx', 'utf8'));
const mark = withoutComments(readFileSync('app/components/LaunchMark.tsx', 'utf8'));

/* ── The screen our own code paints ────────────────────────────────────── */

ok('the launch screen is rendered by the layout, on every page',
  /<LaunchMark \/>/.test(layout),
  'an installed app can be opened on any route it was last left on');

ok('  and it is server-rendered, so it is there in the first paint',
  !/'use client'/.test(mark) && !/useEffect|useState/.test(mark),
  'a splash that waits for JavaScript appears after the thing it was meant'
  + ' to cover');

ok('  and carries the words, not only the mark',
  /FUTURE/.test(mark) && /BOX/.test(mark),
  'her whole request: "die futurebox woorde logo moet saam launch"');

ok('  with the same tile the icon and the landing page are drawn with',
  /data-launchmarktile/.test(mark) && /Cpu/.test(mark),
  'a different drawing on the splash is a second brand — the thing on the'
  + ' home screen would not be the thing that opens');

const look = css.slice(css.indexOf('[data-launchmark] {'));

ok('it takes itself away without JavaScript',
  /animation: fb-launch-done/.test(look) && /visibility: hidden/.test(css),
  'a splash that needs the bundle to leave stays forever on the one device'
  + ' where the bundle failed — the device somebody is already stuck on');

ok('  and never takes a tap, even while it is up',
  /pointer-events: none/.test(upTo(look, '@keyframes')),
  'it is a picture over a working app, not a door');

ok('  and it is painted the ground the system splash is painted',
  /background: rgb\(var\(--fb-page\)\)/.test(look),
  'the hand-over from the system screen to ours is at the one moment'
  + ' everybody is looking at the screen');

ok('it only shows when the app was opened from its own icon',
  /@media \(display-mode: standalone\)/.test(css),
  'a browser tab has no system splash to cover, and the landing page draws'
  + ' this same mark four times the size a moment later');

ok('  and the look is declared once, with only `display` behind the gate',
  (css.match(/\[data-launchmark\] \{/g) ?? []).length === 2
  && /@media \(display-mode: standalone\)[\s\S]{0,180}\[data-launchmark\] \{\s*display: flex;\s*\}/.test(css),
  'two copies of what it looks like is how the gated one and the ungated one'
  + ' end up different');

/* ── The screen iOS paints before our code exists ──────────────────────── */

ok('the layout offers iOS a startup image at all',
  /startupImage: startupImages\(\)/.test(layout),
  'without one, iOS draws the icon on `background_color` and nothing else —'
  + ' which is the thing she is looking at and asked to have changed');

ok('  and the list is read from one file, not typed in two',
  /from '\.\/lib\/splash'/.test(layout),
  'a query and a picture that disagree by a pixel is no splash at all');

ok('  covering the phones people actually open this on',
  SCREENS.length >= 9 && SCREENS.some((one) => one.w === 390 && one.h === 844),
  `${SCREENS.length} screens — iOS matches exactly or not at all, so a device`
  + ' that is not on the list gets no splash whatsoever');

ok('every query names a width, a height, a ratio and an orientation',
  startupImages().every((one) =>
    /device-width/.test(one.media)
    && /device-height/.test(one.media)
    && /-webkit-device-pixel-ratio/.test(one.media)
    && /orientation: portrait/.test(one.media)),
  'Safari has never matched a startup image on the standard `resolution`'
  + ' form, and a query it does not understand never matches');

/**
 * A PNG's real size and pixels, decoded here rather than taken on trust.
 *
 * Only the shapes these are written in — 8 bits a band, RGB or RGBA, not
 * interlaced — and it says so if it is handed anything else rather than
 * guessing at it. The generator writes RGB because the picture is opaque; the
 * alpha case is here because a screenshot with `omitBackground` would be
 * RGBA, and a decoder that silently read it three bytes at a time would
 * report colours that are a third of a pixel out.
 */
function pixelsOf(path: string): { wide: number; tall: number; at: (x: number, y: number) => [number, number, number] } {
  const file = readFileSync(path);
  if (file.readUInt32BE(0) !== 0x89504e47) throw new Error(`${path} is not a PNG`);
  let at = 8;
  let wide = 0;
  let tall = 0;
  let step = 0;
  const parts: Buffer[] = [];
  while (at < file.length) {
    const long = file.readUInt32BE(at);
    const kind = file.toString('ascii', at + 4, at + 8);
    const body = file.subarray(at + 8, at + 8 + long);
    if (kind === 'IHDR') {
      wide = body.readUInt32BE(0);
      tall = body.readUInt32BE(4);
      step = body[9] === 6 ? 4 : body[9] === 2 ? 3 : 0;
      if (body[8] !== 8 || !step || body[12] !== 0) {
        throw new Error(`${path} is not 8-bit RGB or RGBA, not interlaced`);
      }
    }
    if (kind === 'IDAT') parts.push(body);
    if (kind === 'IEND') break;
    at += long + 12;
  }
  const raw = inflateSync(Buffer.concat(parts));
  const line = wide * step;
  const out = Buffer.alloc(tall * line);
  for (let row = 0; row < tall; row += 1) {
    const how = raw[row * (line + 1)];
    const from = row * (line + 1) + 1;
    for (let i = 0; i < line; i += 1) {
      const here = raw[from + i];
      const left = i >= step ? out[row * line + i - step] : 0;
      const up = row > 0 ? out[(row - 1) * line + i] : 0;
      const corner = row > 0 && i >= step ? out[(row - 1) * line + i - step] : 0;
      let value = here;
      if (how === 1) value = here + left;
      else if (how === 2) value = here + up;
      else if (how === 3) value = here + ((left + up) >> 1);
      else if (how === 4) {
        const guess = left + up - corner;
        const dl = Math.abs(guess - left);
        const du = Math.abs(guess - up);
        const dc = Math.abs(guess - corner);
        value = here + (dl <= du && dl <= dc ? left : du <= dc ? up : corner);
      }
      out[row * line + i] = value & 0xff;
    }
  }
  return {
    wide,
    tall,
    at: (x, y) => [out[y * line + x * step], out[y * line + x * step + 1], out[y * line + x * step + 2]],
  };
}

const ground = /--fb-page:\s*(\d+)\s+(\d+)\s+(\d+)/.exec(css);
const ink = /--fb-ink:\s*(\d+)\s+(\d+)\s+(\d+)/.exec(css);
const page = (ground ?? ['', '0', '0', '0']).slice(1).map(Number);
const inky = (ink ?? ['', '0', '0', '0']).slice(1).map(Number);

const missing = SCREENS.filter((one) => !existsSync(`public${splashFile(one)}`));
ok('every screen in the list has a picture on disk',
  missing.length === 0,
  missing.length ? missing.map((one) => splashFile(one)).join(', ')
    : `${SCREENS.length} files — run \`npx tsx scripts/splash.mts\` after changing the list`);

if (!missing.length) {
  const wrongSize: string[] = [];
  const blank: string[] = [];
  const offGround: string[] = [];
  for (const one of SCREENS) {
    const shot = pixelsOf(`public${splashFile(one)}`);
    if (shot.wide !== one.w * one.dpr || shot.tall !== one.h * one.dpr) {
      wrongSize.push(`${splashFile(one)} is ${shot.wide}×${shot.tall}, its query asks for ${one.w * one.dpr}×${one.h * one.dpr}`);
    }
    const corner = shot.at(2, 2);
    if (corner.some((band, i) => Math.abs(band - page[i]) > 2)) {
      offGround.push(`${splashFile(one)} opens on rgb(${corner.join(',')}), the app on rgb(${page.join(',')})`);
    }
    /* The band the wordmark is in, read across the middle of the picture. A
       correctly named rectangle of the right colour would pass every cheaper
       rule above it; this is the one that says the words are there. */
    let inkPixels = 0;
    let greenPixels = 0;
    for (let y = Math.round(shot.tall * 0.42); y < Math.round(shot.tall * 0.62); y += 2) {
      for (let x = 0; x < shot.wide; x += 2) {
        const [r, g, b] = shot.at(x, y);
        if (Math.abs(r - inky[0]) < 40 && Math.abs(g - inky[1]) < 40 && Math.abs(b - inky[2]) < 40) inkPixels += 1;
        if (g > r + 25 && g > 60) greenPixels += 1;
      }
    }
    if (inkPixels < 200 || greenPixels < 200) {
      blank.push(`${splashFile(one)} — ${inkPixels} ink, ${greenPixels} accent`);
    }
  }

  ok('  and each picture is exactly the size its own query claims',
    wrongSize.length === 0,
    wrongSize[0] ?? 'iOS matches exactly or ignores every file offered, in silence');

  ok('  and opens on the same ground the app does',
    offGround.length === 0,
    offGround[0] ?? `rgb(${page.join(',')}) — the same colour as the manifest's background`);

  ok('  and has the WORDS on it, not just the mark',
    blank.length === 0,
    blank[0] ?? 'decoded and counted in the band the wordmark sits in, because'
    + ' an empty rectangle of the right size and colour passes everything else');
}

const manifest = withoutComments(readFileSync('app/manifest.ts', 'utf8'));
ok('the system splash and ours are one colour',
  new RegExp(`background_color: '#${page.map((n) => n.toString(16).padStart(2, '0')).join('')}'`, 'i').test(manifest),
  `the manifest paints before our CSS runs; rgb(${page.join(',')}) is --fb-page`);

if (bad) {
  console.error(`\ncheck:launchmark — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:launchmark — the app opens with its mark AND its name: real startup'
  + ' pictures with the words decoded off them for iOS, and a server-rendered'
  + ' screen that needs no JavaScript to appear or to leave for everything else.',
);
