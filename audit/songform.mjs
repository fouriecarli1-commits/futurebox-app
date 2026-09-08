/**
 * A song, drawn as its shape.
 *
 * `docs/MUSIEKDENKE.md` §3.1. `check:form` proves the maths; this proves the
 * three things only looking can:
 *
 *   · the blocks are to scale, because the length is half of what is being
 *     shown — equal blocks would say a song is verse–chorus–verse–chorus and
 *     leave out that the last chorus is half again as long, which is exactly
 *     the sort of thing somebody notices in their own work
 *   · a part under a few per cent still gets a sliver, so a six-second intro
 *     is on the picture rather than silently dropped
 *   · a song with no plan draws nothing at all, rather than an empty frame
 */
import { cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3161';
const PROBE = 'app/songform/page.probe.tsx';
const LIVE = 'app/songform/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

let server = null;
let browser = null;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the probe page…');
  execSync('npx next build', { stdio: 'ignore' });
  server = await serve(PORT);
  browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, hasTouch: true });
  page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
  await page.goto(`${server.url}/songform`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const pop = await page.locator('[data-probe="pop"]').innerText();
  check('the letters are on the page', /ABABCB/.test(pop), pop.replace(/\n+/g, ' · ').slice(0, 160));
  check('and the shape is named', /verse–chorus|vers–koor/.test(pop));
  check('the chorus time is said', /0:28/.test(pop), pop.replace(/\n+/g, ' · ').slice(0, 200));

  /** Every block in the pop strip, with its width. */
  const blocks = await page.evaluate(() => {
    const strip = document.querySelector('[data-probe="pop"] [role="img"]');
    if (!strip) return null;
    return Array.from(strip.children).map((one) => ({
      w: one.getBoundingClientRect().width,
      letter: (one.textContent || '').trim(),
    }));
  });
  check('every part is a block', blocks && blocks.length === 8, blocks ? String(blocks.length) : 'no strip');
  /* Chorus 1 is 20s and the final chorus 28s. A strip drawn with equal blocks
     passes every other assertion here and fails this one, which is the reason
     it exists. */
  const [, , chorusOne, , , , finalChorus] = blocks ?? [];
  check('the blocks are to scale', finalChorus && chorusOne && finalChorus.w > chorusOne.w * 1.25,
    blocks ? `${Math.round(chorusOne.w)} vs ${Math.round(finalChorus.w)}` : '');
  /* Six seconds of a hundred and forty is four per cent. It must still be
     visible: a strip that drops it is drawing a different song. */
  check('a short intro is still drawn', blocks && blocks[0].w >= 8, blocks ? String(Math.round(blocks[0].w)) : '');
  check('the seasoning is not lettered', blocks && blocks[0].letter === '' && blocks[7].letter === '',
    blocks ? `${blocks[0].letter}|${blocks[7].letter}` : '');

  const standard = await page.locator('[data-probe="standard"]').innerText();
  check('an Afrikaans standard reads AABA', /AABA/.test(standard), standard.replace(/\n+/g, ' · ').slice(0, 120));

  /* Three different sections must not be three identical blocks.

     This is the assertion the second version of the strip needed and did not
     have. Colouring by role drew all three of these — every one of them the
     role `other` — the same, and `check:form` was perfectly happy because
     the letters were right. Then colouring by *family* was collapsed back
     into two near-identical blue-greys by the theme. Computed colour, read
     off the page, is the only thing that could tell either of those. */
  const oddColours = await page.evaluate(() => {
    const strip = document.querySelector('[data-probe="odd"] [role="img"]');
    if (!strip) return null;
    return Array.from(strip.children).map((one) => getComputedStyle(one).backgroundColor);
  });
  check('a song of three different sections is drawn as three different blocks',
    oddColours && new Set(oddColours).size === 2 && oddColours[0] === oddColours[2],
    oddColours ? oddColours.join(' | ') : 'no strip');

  const odd = await page.locator('[data-probe="odd"]').innerText();
  check('a shape with no name still gets its letters', /ABA/.test(odd), odd.replace(/\n+/g, ' · ').slice(0, 120));
  check('and is given no name it does not have',
    !/verse–chorus|vers–koor|AABA|strophic|strofies/.test(odd), odd.replace(/\n+/g, ' · ').slice(0, 120));

  const none = (await page.locator('[data-probe="none"]').innerText()).trim();
  check('a song with no plan draws nothing', none === '', none.slice(0, 60));

  await page.screenshot({ path: shot('songform.png'), fullPage: false });
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.stop();
  try { rmSync(LIVE); } catch { /* never made it */ }
}

console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\nall clear');
process.exit(problems.length ? 1 : 0);
