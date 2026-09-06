/**
 * The words on a music video: whose timing, and whose language.
 *
 * Carli: "Music video moet beter hulp hê met language en onderskrifte."
 *
 * ── The two things that were wrong ───────────────────────────────────────
 *
 * The words were only offered on a song that carried a composition plan, so a
 * song brought in from a file could not have a lyric video at all — and the
 * plan is exactly what a brought-in song does not have.
 *
 * And where they were offered, they were placed by `timelineOf(parts,
 * seconds)`: the plan, spread evenly over the length. That is the roughest
 * rung of the ladder in `lib/lyrictime.ts`. The song player was taught to
 * listen weeks ago, so the same song had its words in two different places
 * depending on which screen you were looking at.
 *
 * ── What is stubbed and why ──────────────────────────────────────────────
 *
 * The translation, because it needs a key this environment does not have and
 * must not need. What is being checked is this app: that the chooser is not
 * offered where there is no model, that it is where there is, and — the part
 * that matters — that the lines leave in the right order. The route refuses a
 * mismatched count for the same reason: a subtitle one line out for the second
 * half of a song is worse than no subtitle.
 *
 * The film itself is rendered for real, in the browser, from real audio.
 */
import { cpSync, rmSync } from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3160';
const PROBE = 'app/videowords/page.probe.tsx';
const LIVE = 'app/videowords/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const LINES = ['Ek ry alleen deur die Karoo', 'Die pad is lank en stil', 'En ek sing vir jou'];

let server = null;
let browser = null;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the probe page…');
  execSync('npx next build', { stdio: 'ignore' });
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`http://localhost:${PORT}/videowords`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  browser = await chromium.launch(launchOptions({ args: ['--autoplay-policy=no-user-gesture-required'] }));

  /** One visit, with the translator either present or absent. */
  const visit = async (hasModel) => {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
    page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));
    let asked = null;
    await page.route('**/api/translate', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available: hasModel }),
        });
        return;
      }
      asked = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ lines: (asked.lines ?? []).map((one) => `EN: ${one}`) }),
      });
    });
    /* No video engine here, and the browser path is the one being measured. */
    await page.route('**/api/video*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"available":false}' }));

    await page.goto(`http://localhost:${PORT}/videowords`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    return { page, asked: () => asked };
  };

  /* ── Without a model ─────────────────────────────────────────────────── */
  {
    const { page } = await visit(false);
    const says = ((await page.locator('body').innerText()) ?? '').replace(/\s+/g, ' ');
    /* The control itself, ticked, not "the word words appears somewhere". A
       loose version of this would pass on the paragraph that explains the
       feature while the checkbox it describes was not on the page. */
    const wordsBox = page.locator('label', { hasText: 'Put the words on screen' })
      .locator('input[type="checkbox"]');
    check('the words are offered on a song with no plan at all',
      (await wordsBox.count()) === 1 && (await wordsBox.first().isChecked()),
      says.includes('Put the words on screen') ? 'offered and on' : 'not offered');
    check('and with no model there is no second-language chooser',
      !says.includes('under it'), says.slice(0, 80));
    await page.close();
  }

  /* ── With one ────────────────────────────────────────────────────────── */
  const { page, asked } = await visit(true);
  const body = page.locator('body');
  const says = async () => ((await body.innerText()) ?? '').replace(/\s+/g, ' ');
  check('with a model, the second language is offered',
    (await says()).includes('and English under it'), (await says()).slice(0, 80));

  await page.locator('button').filter({ hasText: /^and English under it$/ }).first().click();
  await page.waitForTimeout(400);

  /* Shortest clip, so the render is a few seconds rather than a minute. */
  const shortest = page.locator('button').filter({ hasText: /^5s$|^5 s/ }).first();
  if (await shortest.count()) await shortest.click().catch(() => undefined);

  await page.locator('button').filter({ hasText: /^Make it$/ }).first().click();
  for (let waited = 0; waited < 90 && !asked(); waited += 1) await page.waitForTimeout(500);

  const sent = asked();
  check('making the film asks for the words in the other language', Boolean(sent));
  check('and sends the lines in the order they are sung',
    JSON.stringify(sent?.lines) === JSON.stringify(LINES),
    JSON.stringify(sent?.lines));
  check('into the language that was chosen', sent?.to === 'en', String(sent?.to));

  /* And the film came out. */
  const video = page.locator('video');
  for (let waited = 0; waited < 60 && (await video.count()) === 0; waited += 1) {
    await page.waitForTimeout(500);
  }
  check('and a film comes out of it', (await video.count()) > 0);

  /* The room says which rung of the ladder it used, rather than letting three
     very different accuracies look identical. */
  check('and the room says how the lines were placed',
    /lines were placed by listening|spread evenly/.test(await says()),
    ((await says()).match(/(lines were placed[^.]*|spread evenly[^.]*)/) ?? ['nothing'])[0].slice(0, 70));
  await page.screenshot({ path: shot('videowords.png'), fullPage: true });
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  try { rmSync(LIVE); } catch { /* never made it */ }
}

if (problems.length) {
  console.error(`\ncheck:videowords — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:videowords — a song with no plan can carry its words, in two languages, timed by listening.');
