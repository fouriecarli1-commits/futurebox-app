/**
 * A child's story on paper, measured on a real printer pipeline.
 *
 *   npm run check:boekiewalk
 *
 * ── Why a browser is needed for this one ─────────────────────────────────
 *
 * `check:boekie` reads the CSS and the component and holds every rule that
 * can be read. What it cannot do is press print, because the two things that
 * actually decide whether a parent gets a book or a stack of waste are
 * decided by the browser at the moment the dialog opens:
 *
 *   1. Whether anything but the booklet comes out. The print rule is one
 *      line — `body > *:not([data-storybook])` — and whether it is TRUE
 *      depends on where React put the booklet, which is a runtime fact. The
 *      app's own nav, bars and scrims are the things that must not print,
 *      and here they are the real ones, in the real page, with the real CSS.
 *
 *   2. Whether the paper is white. A screenshot taken in print media paints
 *      what the print rules say to paint, so a tinted sheet, a heading band
 *      or a grey card behind the words shows up as pixels — which is the
 *      only way to find out, because `print-color-adjust` has to be absent
 *      AND no rule may ask for a ground in the first place.
 *
 * And one that is only ever a runtime fact: the pictures are Blobs behind
 * object URLs, and whether they have decoded by the time the press lights up
 * cannot be read off a file.
 *
 * ── How it gets a book without making one ────────────────────────────────
 *
 * The component is the shipped one, bundled with the esbuild inside Next and
 * mounted into the real served page. The pictures are drawn in the page onto
 * a canvas and handed over as real Blobs, so the object-URL path is the real
 * one rather than a data URI standing in for it. Nothing is generated, so
 * this costs nothing and needs no account.
 *
 * The screenshot it leaves behind — `audit/boekie.png` — is the paper.
 */
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = 3357;

/* Bundled to a global, because the page this mounts into is the app's own
   and has no module graph a probe can reach into. The entry is written here
   rather than kept as a file in `app/`: a file there would ship. */
const built = await build({
  stdin: {
    contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import StoryBook from './app/components/StoryBook';
      window.__book = (story) => {
        const root = document.createElement('div');
        root.id = 'mounted';
        document.body.appendChild(root);
        createRoot(root).render(React.createElement(StoryBook, { story, onDone: () => {} }));
      };
    `,
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  bundle: true,
  write: false,
  format: 'iife',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  target: 'chrome120',
});
const bundle = built.outputFiles[0].text;

let failures = 0;
const ok = (what, passed, detail = '') => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const server = await serve(PORT);
const browser = await chromium.launch(launchOptions());
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await page.goto(`${server.url}/`, { waitUntil: 'load' });

  /* What the app itself put in the body, before the booklet is added. These
     are the things that must not print, named now so the assertion below is
     about the real page rather than about a decoy. */
  const appChildren = await page.evaluate(
    () => Array.from(document.body.children).map((one, at) => one.id || one.tagName + at),
  );
  ok('the app has something in its body to leave behind',
    appChildren.length > 0, 'nothing to print alongside, so the rule is untested');

  await page.addScriptTag({ content: bundle });

  /* Three pages, with their pictures drawn in the page and handed over as
     real Blobs — the path a kept story takes. */
  await page.evaluate(async () => {
    const draw = (text, hue) => new Promise((done) => {
      const canvas = document.createElement('canvas');
      canvas.width = 900; canvas.height = 600;
      const pen = canvas.getContext('2d');
      pen.fillStyle = `hsl(${hue}, 70%, 72%)`;
      pen.fillRect(0, 0, 900, 600);
      pen.fillStyle = '#1a1a1a';
      pen.font = 'bold 64px sans-serif';
      pen.textAlign = 'center';
      pen.fillText(text, 450, 320);
      canvas.toBlob((blob) => done(blob), 'image/png');
    });
    const silence = new Blob([new Uint8Array(8)], { type: 'audio/mpeg' });
    const pages = await Promise.all([
      draw('a cat', 30), draw('a rocket', 200), draw('the moon', 280),
    ]);
    window.__book({
      id: 'probe',
      title: 'The cat who went to the moon',
      made: Date.now(),
      pages: [
        { text: 'There was a cat who wanted to see the moon.', picture: pages[0], audio: silence, seconds: 3 },
        { text: 'So the cat built a rocket out of a box and a broom.', picture: pages[1], audio: silence, seconds: 3 },
        { text: 'And the moon was exactly as quiet as the cat had hoped.', picture: pages[2], audio: silence, seconds: 3 },
      ],
    });
  });

  await page.waitForSelector('[data-sheet]');
  const sheets = await page.locator('[data-sheet]').count();
  ok('a cover and a sheet for every page', sheets === 4, String(sheets));

  /* ── The press waits for the pictures ───────────────────────────────── */

  await page.waitForSelector('[data-storybookprint]:not([disabled])', { timeout: 15000 });
  const undecoded = await page.evaluate(() => Array.from(
    document.querySelectorAll('[data-storybook] img'),
  ).filter((one) => !one.complete || one.naturalWidth === 0).length);
  ok('every picture is decoded by the time the press lights up',
    undecoded === 0,
    `${undecoded} still loading — the dialog would open over empty boxes and`
    + ' the sheets come out with the words and no drawings');

  /* ── The booklet is where the print rule needs it ───────────────────── */

  const placed = await page.evaluate(
    () => document.querySelector('[data-storybook]')?.parentElement?.tagName ?? 'nowhere',
  );
  ok('the booklet is a direct child of the body', placed === 'BODY', placed);

  /* What the grown-up sees before pressing anything: sheets of paper on
     the app's own dark, with the count on the press. Kept because the
     preview and the paper are two different renderings of one component
     and a change to either should be looked at. */
  await page.screenshot({ path: shot('boekie-screen.png'), fullPage: true });

  /* ── What a printer would be given ──────────────────────────────────── */

  await page.emulateMedia({ media: 'print' });

  const printed = await page.evaluate(() => Array.from(document.body.children)
    .filter((one) => !one.hasAttribute('data-storybook'))
    .filter((one) => getComputedStyle(one).display !== 'none')
    .map((one) => one.id || one.tagName));
  ok('nothing of the app reaches the paper',
    printed.length === 0,
    `${printed.join(', ')} — the app's own chrome prints on the first sheet`);

  const bar = await page.evaluate(() => getComputedStyle(
    document.querySelector('[data-storybookbar]'),
  ).display);
  ok('  and neither does the press itself', bar === 'none', bar);

  /* The paper, as pixels. A screenshot in print media paints the grounds the
     print rules ask for, which is exactly the question: anything that is not
     white here is ink somebody pays for. */
  await page.screenshot({ path: shot('boekie.png'), fullPage: true });

  /* The cover sheet alone, sampled. The picture sheets are mostly picture by
     design, so the cover — words only — is where a tint, a band or a card
     would show up with nothing to hide behind. */
  const cover = await page.locator('[data-sheet="cover"]').screenshot();
  const { data, info } = await sharp(cover).raw().toBuffer({ resolveWithObject: true });
  let inked = 0;
  for (let at = 0; at < data.length; at += info.channels) {
    const dark = Math.min(data[at], data[at + 1], data[at + 2]) < 245;
    if (dark) inked += 1;
  }
  const share = inked / (info.width * info.height);
  ok('the cover sheet is white apart from its words',
    share < 0.2,
    `${Math.round(share * 100)}% of the sheet would take ink — a tint, a band`
    + ' or a card behind the title is a sheet that costs four times as much');

  /* ── And the sheets fall one to a page ──────────────────────────────── */

  const pdf = await page.pdf({ format: 'A4', printBackground: false });
  writeFileSync(shot('boekie.pdf'), pdf);
  const pages = (readFileSync(shot('boekie.pdf'), 'latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  ok('one sheet to a page, and no blank one at the end',
    pages === sheets,
    `${pages} printed pages for ${sheets} sheets — a forced break after the`
    + ' last sheet is a wasted sheet every single time');

  console.log('\n  audit/boekie-screen.png — the preview a grown-up sees'
    + '\n  audit/boekie.png — the paper'
    + '\n  audit/boekie.pdf — what the printer is given\n');
} finally {
  await browser.close();
  server.stop();
}

console.log(failures === 0 ? '\nAll good.\n' : `\n${failures} wrong.\n`);
process.exit(failures === 0 ? 0 : 1);
