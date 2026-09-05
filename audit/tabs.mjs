/**
 * Five tabs at the bottom, on every screen.
 *
 * ── What was wrong ───────────────────────────────────────────────────────
 *
 * Thirteen rooms, a feed, a search, a channel and an account, all reachable
 * and none of them visible from anywhere else. Somebody standing on one
 * screen could not see that the other four parts of the app existed; the way
 * to a room was to remember where the way was. A header on one screen, a rail
 * on another, a front door that only appears once you are already inside.
 *
 * ── What is asserted ─────────────────────────────────────────────────────
 *
 * That the bar is on **every** screen — the feed, the front door, a room, the
 * channel, the account panel — because a bar that disappears in one place is
 * worse than no bar: it is furniture you cannot trust.
 *
 * That pressing the tab you are already on takes you to the start of it. On
 * Make that is the door with every room on it, which is the way out of a room
 * that a thumb reaches for.
 *
 * And that nothing is stranded underneath it. A fixed bar over a scrolling
 * page hides the last row of every screen unless every scrolling surface ends
 * above it, and "the button is there, you just cannot press it" is the worst
 * kind of bug to find in the wild.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3075';
const af = process.argv[3] === 'af';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const BAR = 'nav[aria-label]';

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
  await p.addInitScript((l) => {
    try { window.localStorage.setItem('futurebox.lang.v1', l); } catch { /* storage off */ }
  }, af ? 'af' : 'en');

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: af ? /begin|gratis|teken/i : /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('tabs@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('tabs-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2500);
  const notNow = p.locator('button').filter({ hasText: /Not now|Nie nou nie/ }).first();
  if (await notNow.count()) await notNow.click().catch(() => undefined);
  await p.waitForTimeout(700);

  /** The bar, and which tab it says you are on. */
  const bar = p.locator(BAR).first();
  const tabOn = async () => {
    const lit = bar.locator('button[aria-current="page"]').first();
    return (await lit.count()) ? ((await lit.innerText()) ?? '').trim() : '(none)';
  };
  const press = async (name) => {
    await bar.locator('button').filter({ hasText: name }).first().click();
    await p.waitForTimeout(1300);
  };

  check('the bar is there once you are signed in', (await bar.count()) === 1);
  const names = (await bar.locator('button').allInnerTexts()).map((one) => one.trim());
  check('with five tabs and no more', names.length === 5, names.join(' · '));
  for (const want of af
    ? ['Luister', 'Soek', 'Maak', 'Biblioteek', 'Jy']
    : ['Listen', 'Find', 'Make', 'Library', 'You']) {
    check(`${want} is one of them`, names.includes(want));
  }
  check('and the feed is where you land', (await tabOn()) === (af ? 'Luister' : 'Listen'), await tabOn());
  await p.screenshot({ path: shot(`tabs-listen${af ? '-af' : ''}.png`) });

  /* ── Make, and the door ─────────────────────────────────────────────── */
  await press(af ? 'Maak' : 'Make');
  const doorButtons = p.locator('div.fixed.inset-0.z-\\[55\\] button');
  check('Make opens the front door', (await doorButtons.count()) > 10, `${await doorButtons.count()} buttons`);
  check('and the bar is still on it', await bar.isVisible());
  check('and it says Make', (await tabOn()) === (af ? 'Maak' : 'Make'), await tabOn());
  await p.screenshot({ path: shot(`tabs-make${af ? '-af' : ''}.png`) });

  /* Into a room, the way somebody does. */
  const many = await doorButtons.count();
  for (let i = 0; i < many; i += 1) {
    const first = ((await doorButtons.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
    if (/^(The Booth|Die Ateljee|Die Opnamekamer|Booth)/i.test(first)) {
      await doorButtons.nth(i).click();
      break;
    }
  }
  await p.waitForTimeout(1400);
  check('a room is open and the bar came with it',
    (await doorButtons.count()) === 0 && (await bar.isVisible()));

  /* Pressing the tab you are on is the way back to its start. */
  await press(af ? 'Maak' : 'Make');
  check('pressing Make again returns to the door', (await doorButtons.count()) > 10,
    `${await doorButtons.count()} buttons`);

  /* ── The other three ────────────────────────────────────────────────── */
  await press(af ? 'Biblioteek' : 'Library');
  check('Library lands in the channel', (await tabOn()) === (af ? 'Biblioteek' : 'Library'), await tabOn());
  check('with the bar on it', await bar.isVisible());

  await press(af ? 'Jy' : 'You');
  check('You opens the account panel', (await tabOn()) === (af ? 'Jy' : 'You'), await tabOn());
  check('and the bar is over it, not under it', await bar.isVisible());

  await press(af ? 'Soek' : 'Find');
  check('Find opens the search', (await p.locator('input[type="search"], input[placeholder]').count()) > 0);
  check('and the bar is still reachable', await bar.isVisible());

  await press(af ? 'Luister' : 'Listen');
  check('Listen closes everything and goes back to the feed',
    (await tabOn()) === (af ? 'Luister' : 'Listen') && (await doorButtons.count()) === 0);

  /* ── Every way of getting from any tab to any other ─────────────────
 
     Twenty-five presses, not five. The bar was shipped passing a walk that
     went Listen → Make → room → Make → Library → You → Find → Listen, in that
     order, and it was broken in four of the twenty-five: once anybody pressed
     Library, `studioTab` kept "channels" for the rest of the session, so the
     bar said Library at the front door on every screen and **Make never lit
     at all**. Carli found it by using the app. A walk proves a walk; a matrix
     proves the bar. */
  const TABS = af
    ? ['Luister', 'Soek', 'Maak', 'Biblioteek', 'Jy']
    : ['Listen', 'Find', 'Make', 'Library', 'You'];
  const missed = [];
  for (const from of TABS) {
    for (const to of TABS) {
      await press(TABS[0]);
      await press(from);
      await press(to);
      const got = await tabOn();
      if (got !== to) missed.push(`${from} → ${to} lit ${got}`);
    }
  }
  check(`all ${TABS.length * TABS.length} ways between tabs land where they say`,
    missed.length === 0, missed.join('; ') || 'every one');

  await press(TABS[0]);

  /* ── Nothing stranded under it ──────────────────────────────────────── */
  const barTop = (await bar.boundingBox())?.y ?? 0;
  check('the bar sits at the bottom of the phone', barTop > 700, `top at ${Math.round(barTop)}`);

  /** The lowest thing you can press on this screen, and whether it is reachable. */
  const lowestPressable = async () =>
    p.evaluate((top) => {
      let worst = null;
      for (const el of document.querySelectorAll('button, a[href], input, select, textarea')) {
        if (el.closest('nav[aria-label]')) continue;
        /* Only what is actually on top. A full-screen overlay leaves the page
           behind it in the DOM at its own coordinates, and `getBoundingClientRect`
           happily reports a button nobody can see or press as sitting under the
           bar. Asking the document what is at that point is the only answer
           that accounts for being covered. */
        const box0 = el.getBoundingClientRect();
        const at = document.elementFromPoint(
          Math.min(window.innerWidth - 1, Math.max(1, box0.left + box0.width / 2)),
          Math.min(window.innerHeight - 1, Math.max(1, box0.top + box0.height / 2)),
        );
        if (!at || (at !== el && !el.contains(at) && !at.contains(el))) continue;
        const box = el.getBoundingClientRect();
        if (box.width < 4 || box.height < 4) continue;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        // Only what is on screen right now; anything below the fold scrolls.
        if (box.top > window.innerHeight || box.bottom < 0) continue;
        if (box.bottom > top && (!worst || box.bottom > worst.bottom)) {
          worst = {
            bottom: Math.round(box.bottom),
            what: (el.innerText || el.getAttribute('aria-label') || el.tagName).replace(/\s+/g, ' ').slice(0, 40),
            where: (el.closest('[class*="z-["], footer, header')?.className || 'page').toString().slice(0, 40),
          };
        }
      }
      const page = document.scrollingElement;
      return worst
        ? { ...worst, scrolled: `${Math.round(page.scrollTop)}/${Math.round(page.scrollHeight - page.clientHeight)}` }
        : null;
    }, barTop);

  /* Scroll whatever is actually scrolling. The door and the studio are fixed
     overlays with their own `overflow-y-auto`, so `window.scrollTo` moves the
     page behind them and reports the last row of an unscrolled overlay as
     stranded — which is a probe fault, not an app one. */
  const toTheBottom = async () => {
    await p.evaluate(() => {
      const boxes = [document.scrollingElement, ...document.querySelectorAll('*')].filter(
        (el) => el && el.scrollHeight > el.clientHeight + 4,
      );
      for (const el of boxes) el.scrollTop = el.scrollHeight;
    });
    /* Twice, with a pause. The first scroll lands, lazy content below the fold
       renders, and the page grows — leaving it thirty pixels short of the
       bottom and every last row looking stranded. */
    await p.waitForTimeout(700);
    await p.evaluate(() => {
      const boxes = [document.scrollingElement, ...document.querySelectorAll('*')].filter(
        (el) => el && el.scrollHeight > el.clientHeight + 4,
      );
      for (const el of boxes) el.scrollTop = el.scrollHeight;
    });
    await p.waitForTimeout(500);
  };

  await press(af ? 'Maak' : 'Make');
  await toTheBottom();
  const doorStranded = await lowestPressable();
  check('nothing on the front door is stranded under the bar', doorStranded === null,
    doorStranded ? `"${doorStranded.what}" ends at ${doorStranded.bottom}, in ${doorStranded.where}, page at ${doorStranded.scrolled}` : 'nothing');

  await press(af ? 'Luister' : 'Listen');
  await toTheBottom();
  const feedStranded = await lowestPressable();
  check('and nothing at the foot of the feed is either', feedStranded === null,
    feedStranded ? `"${feedStranded.what}" ends at ${feedStranded.bottom}, in ${feedStranded.where}, page at ${feedStranded.scrolled}` : 'nothing');
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\nfive tabs, on every screen, with nothing stranded under them.');
