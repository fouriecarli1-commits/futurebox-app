/**
 * A new account proves its address before it is let in.
 *
 * The whole point is that this happens once. A first sign-up asks for six
 * digits from a letter; every sign-in after that is the password and nothing
 * else. Both halves are checked here, because a verification screen that also
 * appears on the second visit is worse than none — it teaches people the app
 * has forgotten them.
 *
 * Supabase is stood up rather than called. The real thing is somebody's
 * project and a real mailbox; what is being tested is the half that lives in
 * this app — that a sign-up with no session goes to the code screen, that six
 * digits reach `verifyOtp`, that a wrong code says so instead of going quiet,
 * and that a sign-in never sees the screen at all.
 *
 * It owns its loop: builds with a Supabase address in the environment, since
 * `cloud.configured()` reads it at build time and without it the app keeps
 * every account on the device and never asks for anything.
 */
import { execSync, spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3061';
const HOST = 'https://stub.supabase.co';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

let server = null;
try {
  console.log('building with a Supabase address in the environment…');
  execSync('npx next build', {
    stdio: 'ignore',
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: HOST, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'stub-anon-key' },
  });
  server = spawn('npx', ['next', 'start', '-p', PORT], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: HOST, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'stub-anon-key' },
  });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    try { if ((await fetch(`http://localhost:${PORT}`)).ok) break; } catch { /* not up */ }
  }

  const b = await chromium.launch(launchOptions());
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });

  /** What the stubbed project was asked to do, in order. */
  const asked = [];
  const json = (route, body, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  /* One handler, not two.

     There was a second `route` for everything else on the stubbed host, and
     Playwright hands a request to the LAST matching route registered, not the
     most specific one — so the catch-all answered every auth call with {} and
     nothing was ever recorded. The screen still looked right, because a
     sign-up that comes back empty is indistinguishable from one waiting on a
     confirmation, which is how a broken probe passed its first assertion and
     failed the next three. */
  await p.route(`${HOST}/**`, async (route) => {
    const url = route.request().url();
    const body = (() => { try { return JSON.parse(route.request().postData() ?? '{}'); } catch { return {}; } })();

    if (url.includes('/auth/v1/settings')) return json(route, { external: {} });

    if (url.includes('/auth/v1/signup')) {
      asked.push('signup');
      // Confirmation on: a user comes back, a session does not.
      return json(route, { id: 'u1', email: body.email, confirmation_sent_at: new Date().toISOString() });
    }

    if (url.includes('/auth/v1/verify')) {
      asked.push(`verify:${body.token}`);
      if (body.token !== '123456') {
        return json(route, { error: 'invalid_otp', error_description: 'Token has expired or is invalid' }, 403);
      }
      return json(route, {
        access_token: 'a', refresh_token: 'r', token_type: 'bearer', expires_in: 3600,
        user: { id: 'u1', email: body.email, user_metadata: {} },
      });
    }

    if (url.includes('/auth/v1/resend')) { asked.push('resend'); return json(route, {}); }

    if (url.includes('/auth/v1/token')) {
      asked.push('password');
      return json(route, {
        access_token: 'a', refresh_token: 'r', token_type: 'bearer', expires_in: 3600,
        user: { id: 'u1', email: 'back@futurebox.test', user_metadata: {} },
      });
    }
    // Anything else the stubbed project would be asked for.
    return json(route, {});
  });

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);

  /* ── A first sign-up ─────────────────────────────────────────────────── */
  await p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first().click();
  await p.waitForTimeout(800);
  const swap = p.locator('button').filter({ hasText: /^(Start free|Begin verniet|Create an account)/i }).last();
  if (await swap.count()) await swap.click().catch(() => undefined);
  await p.locator('input[type="email"]').first().fill('new@futurebox.test');
  await p.locator('input[type="password"]').first().fill('a-long-enough-password');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(1200);

  const codeBox = p.locator('input[autocomplete="one-time-code"]');
  check('a new account is asked for the code', (await codeBox.count()) > 0);
  check('and the app asked the project to sign them up', asked.includes('signup'));
  await p.screenshot({ path: shot('signup-code.png'), fullPage: false });

  /* ── A wrong code says so ────────────────────────────────────────────── */
  await codeBox.fill('000000');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(1000);
  /* Whatever Supabase called it, as long as it is on the screen.

     Matching the words was the first version, and it failed against a real
     refusal: the message a project sends back is its own, it changes between
     versions, and it is translated. What has to be true is that something
     said no — a silent refusal is the fault this checks for. */
  const refusal = await p.locator('p.text-rose-400').first().innerText().catch(() => '');
  check('a wrong code is refused out loud', refusal.trim().length > 0, refusal.slice(0, 60));
  check('and the screen stays put', (await codeBox.count()) > 0);

  /* ── The right one lets them in ──────────────────────────────────────── */
  await codeBox.fill('123456');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(1500);
  check('the right code is accepted', asked.includes('verify:123456'));
  check('and the door closes behind them', (await p.locator('input[autocomplete="one-time-code"]').count()) === 0);

  /* ── Coming back ─────────────────────────────────────────────────────
     Two things, and the first is the one people notice: reloading the page
     must not sign you out. The session lives in this browser's storage and
     the app reads it on mount; if either half is wrong the app looks like it
     forgets you every morning. */
  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const stillIn = await p.evaluate(() => {
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith('sb-'));
    return { keys: keys.length, text: document.body.innerText };
  });
  check('a reload does not sign you out', stillIn.keys > 0, `${stillIn.keys} session key(s) kept`);
  check('and it does not ask for a code again',
    (await p.locator('input[autocomplete="one-time-code"]').count()) === 0);

  /* And signing in with a password, from signed out, never sees the screen. */
  await p.evaluate(() => window.localStorage.clear());
  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const before = asked.length;
  /* In through the same door a visitor uses, then across to sign-in.

     Looking for a "Sign in" button on the landing page found nothing: the way
     in is the call to action, and the switch to signing in is the line under
     the form. Two clicks, the same two anybody makes. */
  const door = p.locator('button, a').filter({ hasText: /start free|begin verniet|sign up/i }).first();
  if (await door.count()) {
    await door.click();
    await p.waitForTimeout(800);
    const across = p.locator('button').filter({ hasText: /^(Sign in|Teken in)$/i }).last();
    if (await across.count()) { await across.click(); await p.waitForTimeout(500); }
    await p.locator('input[type="email"]').first().fill('back@futurebox.test');
    await p.locator('input[type="password"]').first().fill('a-long-enough-password');
    await p.locator('button[type="submit"]').first().click();
    await p.waitForTimeout(1400);
    check('signing in again never asks for a code',
      (await p.locator('input[autocomplete="one-time-code"]').count()) === 0,
      asked.slice(before).join(',') || 'nothing asked');
  } else {
    check('signing in again never asks for a code', false, 'could not find the way back in');
  }

  await b.close();
} finally {
  if (server?.pid) { try { process.kill(-server.pid); } catch { /* gone */ } }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\nthe code is asked for once, refused when wrong, and never asked again.');
