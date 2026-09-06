/**
 * The bars on Spotlight, pressed.
 *
 *   "net 'n bar waarop mens kliek en dan oop maak en opsies gee wat op
 *    gekliek kan word."
 *
 * That is a shape, and a shape is the one thing a unit test cannot see. So:
 * open the first screen, count the bars, press one, and check that something
 * pressable came out of it.
 *
 * The charts route is answered here rather than left to a real database,
 * because the point being checked is the screen. Whether the SQL counts
 * correctly is `supabase/charts.sql`'s business and is a different question
 * from whether a person can find the chart.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3196';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const CHARTS = {
  configured: true,
  days: 30,
  music: [
    { ref: 't1', title: 'Karoo Nag', by: 'Riaan Vermaak', count: 41, recent: 12 },
    { ref: 't2', title: 'Stof en Son', by: 'Lerato Dube', count: 27, recent: 9 },
    { ref: 't3', title: 'Bellville Blues', by: 'Anré Fourie', count: 18, recent: 3 },
  ],
  podcasts: [{ ref: 's1', title: 'Die Middagpraatjie', by: 'FutureBox', count: 14, recent: 6 }],
  spotify: {
    name: 'Top 50 - South Africa',
    url: 'https://open.spotify.com/playlist/example',
    rows: [
      { ref: 'https://open.spotify.com/track/one', title: 'A song', by: 'An artist', count: 1, recent: 0 },
      { ref: 'https://open.spotify.com/track/two', title: 'Another song', by: 'Another artist', count: 2, recent: 0 },
    ],
  },
};

let server = null;
let browser = null;
try {
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));
  await p.route('**/api/charts', async (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CHARTS) }));

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('spotlight@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('spotlight-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2600);
  const notNow = p.locator('button').filter({ hasText: /Not now|Nie nou nie/ }).first();
  if (await notNow.count()) await notNow.click().catch(() => undefined);
  await p.waitForTimeout(900);
  await p.locator('nav[aria-label]').first().locator('button').filter({ hasText: 'Spotlight' }).first()
    .click().catch(() => undefined);
  await p.waitForTimeout(1800);

  const says = async () => ((await p.locator('body').innerText()) ?? '').replace(/\s+/g, ' ');

  /* ── Four bars, and they are bars rather than four open sections ───── */
  const bars = p.locator('section > div > button[aria-expanded]');
  check('Spotlight carries the bars', (await bars.count()) >= 4, `${await bars.count()}`);
  const shut = await bars.evaluateAll((els) => els.filter((el) => el.getAttribute('aria-expanded') === 'false').length);
  check('and they start shut, so four bars are four lines',
    shut >= 4, `${shut} shut`);
  for (const want of ['Top 10 AI music', 'Top 10 podcasts', 'Spotify', 'radar']) {
    check(`there is a bar for ${want}`, (await says()).toLowerCase().includes(want.toLowerCase()));
  }
  /* Shut means shut: the songs must not be on the screen before it is pressed,
     or the bar is decoration over a list that was always there. */
  check('nothing inside them is on the screen yet', !(await says()).includes('Karoo Nag'));
  await p.screenshot({ path: shot('spotlight-bars.png') });

  /* ── Pressing one opens it into things you can press ───────────────── */
  const music = p.locator('section:has(> div > button[aria-expanded])')
    .filter({ hasText: /Top 10 AI music/ }).first();
  await music.locator('button[aria-expanded]').first().click();
  await p.waitForTimeout(600);
  check('pressing the music bar opens it', (await says()).includes('Karoo Nag'));
  const rows = music.locator('a, button').filter({ hasText: /Karoo Nag|Stof en Son|Bellville/ });
  check('and every song in it is something you can press',
    (await rows.count()) === 3, `${await rows.count()} of 3`);
  check('with the plays printed, so the number can be argued with',
    (await music.innerText()).includes('41'));
  check('and it says what it counted and over how long',
    (await music.innerText()).includes('30'));

  /* ── Spotify's is marked as Spotify's, and leaves ──────────────────── */
  const spot = p.locator('section:has(> div > button[aria-expanded])')
    .filter({ hasText: /Spotify/ }).first();
  await spot.locator('button[aria-expanded]').first().click();
  await p.waitForTimeout(600);
  const spotText = await spot.innerText();
  check('their chart says it is theirs', /theirs, not ours|hulle s’n, nie ons/i.test(spotText));
  check('and says it is not where the AI chart comes from',
    /nothing in their data|niks in hulle data/i.test(spotText));
  const away = spot.locator('a[href^="https://open.spotify.com"]');
  check('their rows open on their own pages', (await away.count()) >= 2, `${await away.count()}`);
  check('and none of them pretends to be a play count', !/plays/i.test(spotText.split('Spotify')[1] ?? ''));
  await p.screenshot({ path: shot('spotlight-open.png') });
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\ncheck:spotlight — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('check:spotlight — four bars, shut, and each opens into things you can press.');
