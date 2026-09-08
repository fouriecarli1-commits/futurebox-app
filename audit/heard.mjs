/**
 * The measurements, and what each one means.
 *
 * `check:musictalk` proves which reading a number gets. This proves the part
 * only a browser can:
 *
 *   · the clause is on the screen beside its number, in the reader's own
 *     language, rather than an English fallback sitting in an Afrikaans page
 *   · three different songs read differently. A block that says the same
 *     thing whatever it is handed passes every unit assertion, because each
 *     one only ever looks at one song.
 *   · a song with no clear key has no key row at all, rather than an empty one
 */
import { cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3181';
const PROBE = 'app/heard/page.probe.tsx';
const LIVE = 'app/heard/page.tsx';

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

  for (const lang of ['en', 'af']) {
    const page = await browser.newPage({ viewport: { width: 430, height: 1000 }, hasTouch: true });
    page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
    await page.addInitScript((l) => {
      try { window.localStorage.setItem('futurebox.lang.v1', l); } catch { /* private window */ }
    }, lang);
    await page.goto(`${server.url}/heard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);

    const ballad = await page.locator('[data-probe="ballad"]').innerText();
    const house = await page.locator('[data-probe="house"]').innerText();
    const squashed = await page.locator('[data-probe="squashed"]').innerText();

    check(`${lang} · the numbers are still there`, /68 BPM/.test(ballad) && /126 BPM/.test(house));
    /* Three songs, three different readings. A block that read the same
       whatever it was handed would pass every unit assertion. */
    check(`${lang} · three songs read three different ways`,
      new Set([ballad, house, squashed]).size === 3);
    /* The clause, not the row: comparing whole blocks would pass on nothing
       more than the tempo numbers being different, which proves nothing about
       the readings. The first version of this indexed a line by number and
       compared two blank ones. */
    const clause = (text) => {
      const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean);
      const at = lines.findIndex((line) => /BPM/.test(line));
      /* The line after the number, which is the reading. Not the number
         itself: two songs at different tempos differ there whatever the
         readings say, and the first version of this compared the numbers and
         called it a pass. */
      return at >= 0 ? (lines[at + 1] ?? '') : '';
    };
    check(`${lang} · and the tempo clauses differ`,
      clause(ballad) && clause(house) && clause(ballad) !== clause(house),
      `${clause(ballad).slice(0, 45)} | ${clause(house).slice(0, 45)}`);

    /* A key with no clear answer gets no row, rather than an empty one or a
       guess. Inventing a key for something unreadable is the one thing this
       whole idea cannot afford. */
    check(`${lang} · a song with no clear key has no key row`,
      !/minor|major|mineur|majeur/i.test(squashed), squashed.replace(/\n/g, ' · ').slice(0, 120));
    check(`${lang} · and one with a key names its relative`,
      /C minor|C mineur/.test(ballad), ballad.replace(/\n/g, ' · ').slice(0, 160));

    if (lang === 'af') {
      /* The clause has to be Afrikaans. An English fallback here is silent —
         it reads as a deliberate choice — which is exactly what
         `check:afrikaans` exists for and what a browser can confirm. */
      check('af · the clauses are in Afrikaans',
        /Looppas|Danstempo|Stadig/.test(ballad + house), (ballad + house).replace(/\n/g, ' · ').slice(0, 160));
      check('af · and none of it is the English', !/Walking pace|Dance tempo/.test(ballad + house));
      /* Case-insensitive: the headings are uppercased in CSS, so `innerText`
         hands back TOONAARD and a case-sensitive test fails on a page that is
         completely correct. */
      check('af · the headings too', /toonaard|helderheid/i.test(house),
        house.replace(/\n/g, ' · ').slice(0, 200));
      /* And the key itself. This is the one the probe was actually for: the
         clause was Afrikaans and the key above it said "E♭ major". */
      check('af · and the key is said in Afrikaans',
        /majeur|mineur/.test(house + ballad) && !/\bmajor\b|\bminor\b/.test(house + ballad),
        (house + ballad).replace(/\n/g, ' · ').slice(0, 200));
    }

    const none = (await page.locator('[data-probe="none"]').innerText()).trim();
    check(`${lang} · nothing measured draws nothing`, none === '', none.slice(0, 40));

    await page.screenshot({ path: shot(`heard-${lang}.png`), fullPage: false });
    await page.close();
  }
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.stop();
  try { rmSync(LIVE); } catch { /* never made it */ }
}

console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\nall clear');
process.exit(problems.length ? 1 : 0);
