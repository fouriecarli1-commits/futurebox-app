/**
 * The Google Play feature graphic, 1024 × 500, drawn from the app itself.
 *
 *   node scripts/play-feature.mjs
 *   node scripts/play-feature.mjs af   (the Afrikaans listing's, over the Afrikaans screens)
 *
 * The owner, 19 October 2026: *"Maak vir my die feature graphic vir Play
 * Store."* Her app icon, the name and the line from `docs/PLAY-STORE.md`,
 * and three real screens from `docs/play/shots/` — the song, the photo editor
 * and the video desk — so what the listing shows is what the app is.
 *
 * "Adverts" and not "Kids" among the five: the grown-up app's listing should
 * not read as made for children (see `scripts/play-screens.mjs`).
 *
 * Play wants a JPEG or a 24-bit PNG with no transparency, so the page is
 * photographed and its alpha taken off. Not run by CI.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { launchOptions } from '../audit/where.mjs';

const AF = process.argv[2] === 'af';
const OUT = AF ? 'docs/play/feature-graphic-1024x500-af.png' : 'docs/play/feature-graphic-1024x500.png';
const WORDS = AF
  ? { line: 'Maak ’n liedjie, maak die video,<br>en sit dit uit.', chips: ['Liedjies', 'Video’s', 'Foto’s', 'Potgooie', 'Advertensies'], lang: 'In Afrikaans en Engels · Gemaak in Suid-Afrika' }
  : { line: 'Make a song, make the video,<br>and put it out.', chips: ['Songs', 'Videos', 'Photos', 'Podcasts', 'Adverts'], lang: 'In English and Afrikaans · Made in South Africa' };
const data = (path, type) => `data:${type};base64,${readFileSync(path).toString('base64')}`;

/* The board cut in from her icon, so its black square does not sit on the
   green: `scripts/icon.mjs` cuts the same for iOS. */
const icon = data('app/apple-icon.png', 'image/png');
const font = data('app/fonts/jakarta-latin.woff2', 'font/woff2');
const shot = (name) => data(`docs/play/shots/${AF ? 'af/' : ''}${name}.png`, 'image/png');

const phone = (src, { left, top, width, turn, z, dim = 0 }) => `
  <div class="phone" style="left:${left}px;top:${top}px;width:${width}px;transform:rotate(${turn}deg);z-index:${z}">
    <img src="${src}" alt="">
    ${dim ? `<div class="dim" style="opacity:${dim}"></div>` : ''}
  </div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Jakarta; src: url(${font}) format('woff2'); font-weight: 200 800; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1024px; height: 500px; overflow: hidden; }
  body {
    font-family: Jakarta, sans-serif; color: #ecfdf5; position: relative;
    background:
      radial-gradient(ellipse 520px 380px at 24% 42%, rgba(16, 185, 129, 0.28), transparent 70%),
      radial-gradient(ellipse 460px 420px at 82% 60%, rgba(6, 182, 212, 0.20), transparent 70%),
      linear-gradient(160deg, #04140e 0%, #020a07 55%, #010605 100%);
  }
  .grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(52, 211, 153, 0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(52, 211, 153, 0.07) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse at 40% 50%, #000 30%, transparent 85%);
  }
  .left { position: absolute; left: 64px; top: 0; bottom: 0; width: 470px; display: flex; flex-direction: column; justify-content: center; }
  .mark { display: flex; align-items: center; gap: 18px; }
  .mark img { width: 96px; height: 96px; border-radius: 24px; box-shadow: 0 0 26px rgba(16, 255, 160, 0.45); }
  h1 { font-size: 50px; font-weight: 800; letter-spacing: -1.2px; line-height: 1; }
  h1 span { color: #34f5a6; text-shadow: 0 0 18px rgba(52, 245, 166, 0.55); }
  .line { margin-top: 26px; font-size: 25px; font-weight: 700; line-height: 1.25; color: #ffffff; }
  .chips { margin-top: 24px; display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { padding: 7px 14px; border-radius: 999px; font-size: 15px; font-weight: 700; color: #a7f3d0;
          border: 1.5px solid rgba(52, 211, 153, 0.55); background: rgba(6, 78, 59, 0.45); }
  .lang { margin-top: 18px; font-size: 15px; font-weight: 600; color: #6ee7b7; letter-spacing: 0.3px; }
  .phone { position: absolute; border-radius: 26px; padding: 7px; background: #0b1512;
           border: 2px solid rgba(52, 211, 153, 0.65);
           box-shadow: 0 0 34px rgba(16, 185, 129, 0.35), 0 24px 40px rgba(0, 0, 0, 0.6); overflow: hidden; }
  .phone img { display: block; width: 100%; border-radius: 19px; }
  .dim { position: absolute; inset: 0; background: #010605; }
</style></head><body>
  <div class="grid"></div>
  <div class="left">
    <div class="mark"><img src="${icon}" alt=""><h1>FutureBox<br><span>Studio</span></h1></div>
    <p class="line">${WORDS.line}</p>
    <div class="chips">${WORDS.chips.map((one) => `<span class="chip">${one}</span>`).join('')}</div>
    <p class="lang">${WORDS.lang}</p>
  </div>
  ${phone(shot('05-photo-editor'), { left: 560, top: 70, width: 170, turn: -9, z: 1, dim: 0.25 })}
  ${phone(shot('04-video-desk'), { left: 832, top: 70, width: 170, turn: 9, z: 1, dim: 0.25 })}
  ${phone(shot('03-make-a-song'), { left: 688, top: 36, width: 196, turn: 0, z: 2 })}
</body></html>`;

const browser = await chromium.launch(launchOptions());
const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot({ type: 'png' });
await browser.close();
await sharp(png).removeAlpha().png({ compressionLevel: 9 }).toFile(OUT);
const made = await sharp(OUT).metadata();
console.log(`${OUT}: ${made.width} × ${made.height}, ${made.channels} channels, alpha ${made.hasAlpha}`);
