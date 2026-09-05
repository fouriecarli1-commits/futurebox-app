/**
 * One name for one person, everywhere in the app.
 *
 * ── What was actually wrong ──────────────────────────────────────────────
 *
 * Not "there is no way to change your name" — there was one, in the channel,
 * and the live room and the collab radar have always read it. What was wrong
 * is that the app had **two** names for the same person and only ever showed
 * you one of them at a time.
 *
 * `toAccount` in `lib/cloud.ts` builds a name out of the sign-up email —
 * `email.split('@')[0]` — because at sign-up that is genuinely all there is.
 * The header, the greeting and the account panel showed that. Meanwhile the
 * recording name on the `creators` row went out on the releases. So somebody
 * called Anré, signed up as anrefourie@…, was `anrefourie` in the corner of
 * every screen and "Anré Fourie" on their own song, and nothing on the screen
 * explained which one was which.
 *
 * ── What is proved here ──────────────────────────────────────────────────
 *
 * That with no chosen name the chrome falls back to the account's; that the
 * name and the handle can both be set from the account panel behind **You**;
 * that what the app sends is what was typed, cleaned the way the server
 * cleans it; and that the header changes to the chosen name without a reload.
 *
 * `/api/creator` is stubbed, because the real one needs Supabase — but it is
 * stubbed as a *store*: the POST is kept and the next GET returns it, so the
 * round trip is the real one and the assertions are about this app's code.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3077';
const NAME = 'Anré Fourie';
const HANDLE = 'AnreF.01';
/** What the server's own `cleanHandle` would make of that. */
const CLEANED = 'anref.01';

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

  browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const p = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

  /* A store, not a fixture. One handler for both methods, because Playwright
     hands a request to the LAST matching route and two handlers for one path
     is how a specific stub gets silently shadowed. */
  let stored = null;
  const saved = [];
  await p.route('**/api/creator*', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      const body = JSON.parse(request.postData() || '{}');
      saved.push(body);
      stored = {
        name: String(body.name ?? '').trim().slice(0, 80),
        // The same cleaning `app/api/creator/route.ts` does, so the probe is
        // testing against the shape the real server would send back.
        handle: String(body.handle ?? '').toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 24),
        about: '',
        links: {},
      };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ creator: stored }) });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      /* Not an owner. The one bit the route sends about the caller, and the
         reason the field can refuse the app's own name while somebody types it
         without also refusing the account that may use it. */
      body: JSON.stringify({ configured: true, signedIn: true, creator: stored, mayUseReserved: false }),
    });
  });

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('anrefourie@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('artist-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2600);
  const notNow = p.locator('button').filter({ hasText: /Not now|Nie nou nie/ }).first();
  if (await notNow.count()) await notNow.click().catch(() => undefined);
  await p.waitForTimeout(900);

  /* The account button in the corner, not the whole header. Reading the
     header gave a detail line of navigation labels that said nothing about
     the thing being checked. */
  const corner = p.locator('header button[title], header button[aria-label]').filter({ hasText: /@/ }).first();
  const headerSays = async () =>
    ((await corner.innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();

  check('with nothing chosen, the corner falls back to the sign-up name',
    /anrefourie/.test(await headerSays()), (await headerSays()).slice(0, 80));

  /* ── Set it, from the tab a phone user would press ──────────────────── */
  const bar = p.locator('nav[aria-label]').first();
  await bar.locator('button').filter({ hasText: 'You' }).first().click();
  await p.waitForTimeout(1200);

  /* Scoped to the panel. The channel mounts the same component, so once both
     are on screen "the name box" is two boxes — which is exactly how the
     duplicate-id bug surfaced. */
  const panelBox = p.locator('div[role="dialog"]');
  const nameBox = panelBox.locator('input[id^="recording-name"]');
  const handleBox = panelBox.locator('input[id^="recording-handle"]');
  check('the account panel carries the name field', (await nameBox.count()) === 1);
  check('and the handle beside it', (await handleBox.count()) === 1);
  /* Two of these are mounted at once — the channel behind, the panel in front
     — and they must not share an id, or a label points at a field the reader
     cannot see. */
  const ids = await p.locator('input[id^="recording-"]').evaluateAll((all) => all.map((el) => el.id));
  check('every field on the page has its own id', new Set(ids).size === ids.length, ids.join(', '));

  await nameBox.fill(NAME);
  await handleBox.fill(HANDLE);
  await p.waitForTimeout(400);
  /* Both fields still hold what was typed. This is the assertion that caught
     a save-on-every-blur design putting the old value back over the second
     field while it was being filled. */
  check('typing in one field does not wipe the other',
    (await nameBox.inputValue()) === NAME && (await handleBox.inputValue()) === HANDLE,
    `${await nameBox.inputValue()} / ${await handleBox.inputValue()}`);
  await p.locator('button').filter({ hasText: /^Save$/ }).first().click();
  await p.waitForTimeout(1600);

  /* Leaving a field saves it, so filling two of them and pressing the button
     sends more than one — which is the design, not a bug. What matters is
     that the last one carries both and that it is not sending on every
     keystroke. */
  const last = saved.at(-1);
  check('it saved, and not once per keystroke', saved.length > 0 && saved.length <= 3,
    `${saved.length} sent`);
  check('the last one carries the name as typed', last?.name === NAME, JSON.stringify(last?.name));
  check('and the handle as typed, for the server to clean',
    typeof last?.handle === 'string' && last.handle.toLowerCase() === CLEANED,
    JSON.stringify(last?.handle));

  const panel = p.locator('div[role="dialog"]').first();
  const panelSays = ((await panel.innerText()) ?? '').replace(/\s+/g, ' ');
  check('the panel says the chosen name back', panelSays.includes(NAME), panelSays.slice(0, 90));
  await p.screenshot({ path: shot('artistname.png'), fullPage: false });

  /* ── And the rest of the app follows, without a reload ──────────────── */
  await bar.locator('button').filter({ hasText: 'Listen' }).first().click();
  await p.waitForTimeout(1200);
  const after = await headerSays();
  check('the corner of every screen changes to it', after.includes(NAME), after.slice(0, 80));
  check('with the chosen handle, not one made from the email',
    after.includes(`@${CLEANED}`) && !after.includes('@anrefourie'), after.slice(0, 80));

  /* ── It is the same field in the channel ────────────────────────────── */
  await bar.locator('button').filter({ hasText: 'Library' }).first().click();
  await p.waitForTimeout(1800);
  const inChannel = p.locator('input[id^="recording-name"]');
  await inChannel.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined);
  check('the channel carries the same field', (await inChannel.count()) === 1);
  check('already filled in with what was saved', (await inChannel.first().inputValue()) === NAME,
    await inChannel.first().inputValue().catch(() => '(none)'));

  /* ── Nobody may be the official channel ─────────────────────────────
 
     The name goes out on every release and sits beside every post in the live
     room, so an account called "FutureBox Official" is somebody speaking as
     the app. Refused while it is being typed — and the route refuses it again,
     which is the part that actually holds, because a field can be skipped by
     anybody who can post to a URL. */
  await bar.locator('button').filter({ hasText: 'You' }).first().click();
  await p.waitForTimeout(1200);
  const before = saved.length;
  await nameBox.fill('FutureBox_Official');
  await p.waitForTimeout(500);
  /* Matched on the end of the sentence rather than the start of it: the panel
     carries other prose, and a loose pattern is how a check starts passing on
     the wrong words. */
  const panelNow = ((await p.locator('div[role="dialog"]').first().innerText()) ?? '').replace(/\s+/g, ' ');
  check('the app\u2019s own name is refused as it is typed',
    /mistake your posts for the official channel/i.test(panelNow),
    (panelNow.match(/.{0,80}official channel/i) ?? ['(not said)'])[0]);
  check('and Save will not take it',
    await p.locator('div[role="dialog"] button').filter({ hasText: /^Save$/ }).first().isDisabled());

  /* The dodges people actually try, not the one spelling. */
  for (const attempt of ['Future-Box Official', 'FutureB0x', 'f.u.t.u.r.e.b.o.x', 'official']) {
    await nameBox.fill(attempt);
    await p.waitForTimeout(300);
    check(`"${attempt}" is refused too`,
      await p.locator('div[role="dialog"] button').filter({ hasText: /^Save$/ }).first().isDisabled());
  }
  check('and nothing was sent while it was refused', saved.length === before,
    `${saved.length - before} sent`);

  /* A name of their own is fine again — the block is about the app's name,
     not about having changed your mind. */
  await nameBox.fill('Anré Fourie');
  await p.waitForTimeout(400);
  check('a name of your own still saves',
    !(await p.locator('div[role="dialog"] button').filter({ hasText: /^Save$/ }).first().isDisabled()));

  /* Not asserted here: that it survives a reload. Without Supabase configured
     this app signs somebody in for the tab only, so a reload lands on the
     landing page — which is the app behaving correctly and would make a
     persistence check pass for the wrong reason. What persistence there is to
     check is above: the channel's field is filled from the row rather than
     from anything this page was holding. */
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\none name, chosen once, in the corner and on the release.');
