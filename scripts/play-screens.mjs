/**
 * The Play Store phone screenshots: a line on top, the real screen below.
 *
 *   npm run build && npm run play:shots && node scripts/play-screens.mjs
 *   node audit/storeshots.mjs 3394 af && node scripts/play-screens.mjs af   (the Afrikaans listing)
 *
 * The owner, 19 October 2026: *"Maak nou die screenshots vir die Play
 * Store."* Each one is a screen `audit/storeshots.mjs` took off the built app,
 * in a phone, under one line that says what that screen does — the way a
 * listing is read: a thumb scrolling sideways, a line at a time.
 *
 * The kids room is not in this set. The grown-up app's listing is read by
 * Google for whether it appeals to children, and a page of cartoon buttons
 * is the quickest way to be put under the Families rules for the whole app;
 * the kids' app gets its own listing. Nor is the welcome page: it names
 * the engines behind the app by their makers' names, and a store listing
 * that carries somebody else's trademarks is one Google can take down.
 *
 * 1080 × 1920, PNG without transparency, as Play asks. Not run by CI.
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { launchOptions } from '../audit/where.mjs';

const AF = process.argv[2] === 'af';
const OUT = AF ? 'docs/play/store/af' : 'docs/play/store';
const SHOTS = AF ? 'docs/play/shots/af' : 'docs/play/shots';
const data = (path, type) => `data:${type};base64,${readFileSync(path).toString('base64')}`;
const font = data('app/fonts/jakarta-latin.woff2', 'font/woff2');

/* [shot, headline with *the lit word*, the line under it] */
const SCREENS = [
  ['02-studio', 'Your creative studio, *in your pocket*', 'Songs, videos, photos and podcasts — in English and Afrikaans'],
  ['03-make-a-song', 'Make a song *from a feeling*', 'Pick a feeling, or say the sound in your own words'],
  ['04-video-desk', 'Describe a shot. *Get the video.*', 'Start from a kind of video and make it yours'],
  ['05-photo-editor', 'Edit photos *like a pro*', 'Crop, filters, magic touch, text and designs'],
  ['06-adverts', 'Adverts for *your business*', 'Say what you sell — it writes, films and posts'],
  ['07-radar', 'Find your *collab match*', 'Collab Radar scores who sounds like you'],
  ['08-hooks', 'Cut the hook *that hits*', 'The fifteen seconds of your song worth posting'],
  ['09-cubed', 'Classes from *the pros*', 'Cubed³ class: learn from people who do it'],
];
/* The same lines for the Afrikaans listing, over the app in Afrikaans. */
const SCREENS_AF = [
  ['02-studio', 'Jou kreatiewe ateljee, *in jou sak*', 'Liedjies, video’s, foto’s en potgooie — in Afrikaans en Engels'],
  ['03-make-a-song', 'Maak ’n liedjie *uit ’n gevoel*', 'Kies ’n gevoel, of sê die klank in jou eie woorde'],
  ['04-video-desk', 'Beskryf ’n skoot. *Kry die video.*', 'Begin by ’n soort video en maak dit joune'],
  ['05-photo-editor', 'Redigeer foto’s *soos ’n pro*', 'Sny, filters, towerkuns, teks en ontwerpe'],
  ['06-adverts', 'Advertensies vir *jou besigheid*', 'Vertel wat jy verkoop, en dit maak jou advertensie'],
  ['07-radar', 'Vind jou *samewerkingsmaat*', 'Collab Radar meet wie soos jy klink'],
  ['08-hooks', 'Sny die hook *wat vat*', 'Die vyftien sekondes van jou liedjie wat werd is om te plaas'],
  ['09-cubed', 'Klasse van *die kenners*', 'Cubed³-klas: leer by mense wat dit doen'],
];

const page = (shot, head, line) => `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Jakarta; src: url(${font}) format('woff2'); font-weight: 200 800; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1080px; height: 1920px; overflow: hidden; }
  body {
    font-family: Jakarta, sans-serif; color: #ecfdf5; position: relative;
    background:
      radial-gradient(ellipse 760px 520px at 50% 18%, rgba(16, 185, 129, 0.30), transparent 70%),
      radial-gradient(ellipse 700px 700px at 50% 85%, rgba(6, 182, 212, 0.16), transparent 70%),
      linear-gradient(180deg, #04140e 0%, #020a07 60%, #010605 100%);
  }
  .grid { position: absolute; inset: 0;
    background-image: linear-gradient(rgba(52,211,153,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.07) 1px, transparent 1px);
    background-size: 54px 54px; mask-image: radial-gradient(ellipse at 50% 30%, #000 25%, transparent 80%); }
  .words { position: absolute; left: 70px; right: 70px; top: 100px; text-align: center; }
  h1 { font-size: 78px; font-weight: 800; line-height: 1.08; letter-spacing: -1.5px; }
  h1 em { font-style: normal; color: #34f5a6; text-shadow: 0 0 26px rgba(52, 245, 166, 0.55); }
  p { margin-top: 28px; font-size: 38px; font-weight: 600; line-height: 1.3; color: #a7f3d0; }
  .phone { position: absolute; left: 50%; top: 500px; width: 740px; transform: translateX(-50%);
    border-radius: 78px; padding: 18px; background: #0b1512; border: 4px solid rgba(52, 211, 153, 0.7);
    box-shadow: 0 0 70px rgba(16, 185, 129, 0.35), 0 40px 80px rgba(0, 0, 0, 0.7); }
  .phone img { display: block; width: 100%; border-radius: 60px; }
</style></head><body>
  <div class="grid"></div>
  <div class="words"><h1>${head.replace(/\*(.+?)\*/g, '<em>$1</em>')}</h1><p>${line}</p></div>
  <div class="phone"><img src="${data(`${SHOTS}/${shot}.png`, 'image/png')}" alt=""></div>
</body></html>`;

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(launchOptions());
const tab = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
let at = 0;
for (const [shot, head, line] of AF ? SCREENS_AF : SCREENS) {
  at += 1;
  await tab.setContent(page(shot, head, line), { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  const png = await tab.screenshot({ type: 'png' });
  const out = `${OUT}/${String(at).padStart(2, '0')}-${shot.slice(3)}.png`;
  await sharp(png).removeAlpha().png({ compressionLevel: 9 }).toFile(out);
  console.log(out);
}
await browser.close();
