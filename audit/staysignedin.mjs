/**
 * Signed in stays signed in.
 *
 * Carli, twice: "as iemand klaar in gelog het moet mens die heeltyd in log
 * nie, dit moet jou dadelik in die app vat", and then "onthou dat die app wat
 * in gelog is in gelog bly. Dit moenie heeltyd oor en oor in log nie."
 *
 * ── What was actually wrong ──────────────────────────────────────────────
 *
 * Where a deployment has a Supabase project behind it, the auth library keeps
 * the session in this browser and refreshes it — nothing was ever wrong there,
 * and this probe cannot reach it without real keys.
 *
 * Where it does not, signing in set a state variable and nothing else. Every
 * reload signed the person out, with no way for them to tell that from a
 * broken login. A deployment missing two environment variables looks exactly
 * like an app that cannot remember anybody.
 *
 * That is the half this probe runs in, and it is the half that was broken.
 *
 * ── What it asserts ──────────────────────────────────────────────────────
 *
 * Sign in, reload, and still be signed in — the app open at the door rather
 * than at a form. Then sign out, reload, and be signed out, because an account
 * you cannot leave is worse than one you have to re-enter.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3111';

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
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await context.newPage();
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('stays@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('stays-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2600);

  const bar = p.locator('nav[aria-label]').first();
  const signedIn = async () => (await bar.count()) > 0 && (await bar.isVisible());
  check('signing in puts you in the app', await signedIn());

  /* The whole question, asked the way a person asks it. */
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(1800);
  check('and a reload leaves you signed in', await signedIn());

  const door = p.locator('div.fixed.inset-0.z-\\[55\\] button');
  check('landing on Make, not on a sign-in form',
    (await door.count()) > 10, `${await door.count()} rooms on the door`);
  /* Not "no email box exists" — the marketing footer has one, and the first
     version of this failed on it. What matters is whether a sign-in is being
     asked for: a visible email box inside a dialogue. */
  const asking = p.locator('div[role="dialog"] input[type="email"]:visible');
  check('and there is no sign-in form in front of you', (await asking.count()) === 0);
  await p.screenshot({ path: shot('staysignedin.png') });

  /* And the other direction, because an account you cannot leave is worse. */
  await bar.locator('button').filter({ hasText: 'You' }).first().click();
  await p.waitForTimeout(1000);
  /* Inside the panel that just opened. Reaching for the first match anywhere
     on the page finds the one behind it, which the open dialogue then
     intercepts — a timeout that reads as "sign out is broken" and is not. */
  await p.locator('div[role="dialog"] button').filter({ hasText: /Sign out|Teken uit/ })
    .first().click();
  await p.waitForTimeout(1500);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(1800);
  check('signing out survives a reload too',
    (await p.locator('button, a').filter({ hasText: /start free|sign up/i }).count()) > 0);
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\ncheck:staysignedin — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:staysignedin — signed in stays signed in, and signed out stays signed out.');
