/**
 * A link that turns a stranger into a collaborator.
 *
 * ── The gap ──────────────────────────────────────────────────────────────
 *
 * "Send an email, sal dit 'n link he na die kamer." It did not, and could
 * not: the room only exists once two FutureBox accounts have accepted each
 * other, so a stranger reading the email had four steps between "yes,
 * interesting" and a conversation.
 *
 * ── What is stubbed ──────────────────────────────────────────────────────
 *
 * The Supabase side, because there is none in a probe: making the invite,
 * reading it back, and redeeming it. What is not stubbed is the part that
 * decides whether the link is any use — that the token comes off the address
 * bar and survives being navigated away from, that the address bar does not
 * keep it afterwards, and that somebody arriving cold is told why they are
 * here rather than landing on an ordinary home page.
 *
 * ── The assertion that matters ───────────────────────────────────────────
 *
 * That the token is gone from the URL and kept somewhere that survives
 * signing up. A token that only lived in the address is a token that is lost
 * the moment somebody fills in a form — and one that stays in the address is
 * a bearer that gets pasted into a chat window with the rest of the link.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { dismissDoor } from './enter.mjs';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3103';
const TOKEN = 'a'.repeat(64);
const FROM = 'Thabo Mokoena';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
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

  browser = await chromium.launch(launchOptions());
  const p = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

  const redeemed = [];
  const made = [];
  /* One handler for the whole path: Playwright hands a request to the LAST
     matching route, and two handlers for one path is how a specific stub gets
     silently shadowed. */
  await p.route('**/api/collab/invite**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/accept')) {
      redeemed.push(JSON.parse(request.postData() || '{}'));
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ code: 'asked', collab: 'c1', from: FROM }),
      });
    }
    if (request.method() === 'POST') {
      made.push(JSON.parse(request.postData() || '{}'));
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          url: `https://futurebox.studio/?invite=${'b'.repeat(64)}`,
          expiresAt: '2026-10-05T00:00:00.000Z',
          days: 30,
        }),
      });
    }
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ good: true, from: FROM }),
    });
  });

  /* The room itself, so it is past "collaboration is not switched on yet" —
     which is the correct thing for it to say when `collab.sql` has not been
     run, and which also hides the invite panel, because an invite that cannot
     be made is worse than none. */
  await p.route('**/api/collab', async (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ ready: true, threads: [] }),
        })
      : route.fallback());

  /* ── Arriving on the link, signed out ───────────────────────────────── */
  await p.goto(`http://localhost:${PORT}/?invite=${TOKEN}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2200);

  const said = ((await p.locator('body').innerText()) ?? '').replace(/\s+/g, ' ');
  check('a stranger is told who invited them, before signing up',
    said.includes(FROM) && /invited you/i.test(said),
    (said.match(/.{0,20}invited you.{0,40}/i) ?? ['(not said)'])[0]);
  await p.screenshot({ path: shot('invite-landing.png'), fullPage: false });

  const address = p.url();
  check('and the token is off the address bar', !address.includes(TOKEN), address.slice(-60));
  const kept = await p.evaluate(() => window.localStorage.getItem('futurebox.invite.v1'));
  check('but written down, so it survives signing up', kept === TOKEN, String(kept).slice(0, 12));

  /* ── Signing up, and the link doing its job ─────────────────────────── */
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(800);
  await p.locator('input[type="email"]').first().fill('invited@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('invited-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(3000);
  /* The welcome door, waited for and then gone.
     `count()` once was the fault: the door draws after two fetches settle, so
     asking the instant the bar appears gets "no", and half a second later it is
     there — over the header, under the next press. `bringsong` timed out on
     exactly that. `enter.mjs` has said it in a comment since the day it was
     written; the probes with their own way in never got the lesson. */
  await dismissDoor(p);
  await p.waitForTimeout(1500);

  check('the link was redeemed once there was an account',
    redeemed.length === 1 && redeemed[0]?.invite === TOKEN, JSON.stringify(redeemed));
  const after = ((await p.locator('body').innerText()) ?? '').replace(/\s+/g, ' ');
  check('and the app says what happened',
    /has asked to work with you/.test(after) && after.includes(FROM),
    (after.match(/.{0,24}asked to work with you.{0,30}/) ?? ['(not said)'])[0]);
  const gone = await p.evaluate(() => window.localStorage.getItem('futurebox.invite.v1'));
  check('the token is not kept after it is spent', gone === null, String(gone));

  /* ── Making one, from the other side ────────────────────────────────── */
  await p.locator('nav[aria-label] button').filter({ hasText: 'Make' }).first().click();
  await p.waitForTimeout(1200);
  const door = p.locator('div.fixed.inset-0.z-\\[55\\] button');
  const many = await door.count();
  for (let i = 0; i < many; i += 1) {
    const first = ((await door.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
    if (/^Collab Radar/i.test(first)) { await door.nth(i).click(); break; }
  }
  await p.waitForTimeout(2200);

  const room = p.locator('div.fixed.inset-0.z-50').first();
  const why = room.locator('#invite-why');
  check('the room offers to invite somebody who is not here', (await why.count()) === 1);
  await why.fill('Same tempo, same key — worth a try.');
  await room.locator('button').filter({ hasText: /^Make a link$/ }).first().click();
  await p.waitForTimeout(1600);

  check('the reason travels with the link', made[0]?.note === 'Same tempo, same key — worth a try.',
    JSON.stringify(made[0]));
  const shown = ((await room.innerText()) ?? '').replace(/\s+/g, ' ');
  check('the link is shown to copy', /futurebox\.studio\/\?invite=b{10}/.test(shown),
    (shown.match(/https:\/\/[^ ]{0,50}/) ?? ['(none)'])[0]);
  check('and it says the link expires and is not private',
    /works for a month/.test(shown) && /send it rather than post it/.test(shown));
  await p.screenshot({ path: shot('invite-made.png'), fullPage: false });
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\na link reaches somebody who is not here yet, and stops being useful when it should.');
