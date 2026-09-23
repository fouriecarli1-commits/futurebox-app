/**
 * The way back in, pressed in a real browser.
 *
 * ── What this proves that `check:forgot` cannot ──────────────────────────
 *
 * The source check reads the file: that `resetPasswordForEmail` is called,
 * that the notice says "if" rather than "we have sent", that the panel is at
 * z-100. All true and all about text.
 *
 * What it cannot show is the screen. Whether the link is on the sign-in form
 * where somebody who has just failed to sign in will look for it. Whether
 * pressing it takes the password box away — a field for the thing they are
 * here because they do not know. Whether the address box survives the switch,
 * so somebody who typed their address and then remembered they had forgotten
 * does not type it again. And whether the request that goes out is the right
 * one, with this app's own address on the return.
 *
 * ── Why the reset call is intercepted and nothing else is ────────────────
 *
 * Supabase would send a real letter to a real address, and a probe that posts
 * to somebody's inbox on every CI run is a probe that gets switched off. The
 * route is answered here instead, and what is under test is everything on
 * this side of it: the screens, the switch, and what the request carried.
 */
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = Number(process.argv[2] || 3141);

/* ── A project that has accounts ──────────────────────────────────────────
 
   `configured()` reads two NEXT_PUBLIC variables, and Next inlines those at
   BUILD time — so setting them on `next start` changes nothing. The build is
   done here with stubs, exactly as `audit/account.mjs` does it, and put back
   however this run ends.
 
   Without this the app falls through to its local-account path, and the first
   version of this probe measured that instead: pressing "send me a way back
   in" signed somebody in as a brand new local person and the probe reported
   three failures that were all one fault. Which was worth finding — the
   branch really was in the wrong order, and it is fixed — but the probe was
   also measuring an app with no accounts in it. */
const STUB = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://stub.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'stub-anon-key',
};
console.log('building with a project that has accounts…');
execSync('npx next build', { stdio: 'ignore', env: { ...process.env, ...STUB } });

/* Put back however this run ends — in an exit handler, because a probe that
   throws on its first assertion never reaches a tidy-up written at the
   bottom, and the stubbed build it leaves behind is read by the next probe
   as a broken app. */
let putBack = false;
process.on('exit', () => {
  if (putBack) return;
  putBack = true;
  console.log('putting the ordinary build back…');
  try {
    execSync('npx next build', { stdio: 'ignore' });
  } catch {
    console.error('the ordinary build did not go back — run `npm run build`.');
  }
});

const server = await serve(PORT, { env: STUB });
const b = await chromium.launch(launchOptions());
/* On a phone, because that is where somebody is when they cannot remember a
   password — and because the link sits under a form that stacks differently
   at the two widths. */
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

const WHO = 'forgot@futurebox.test';

/* What went up the wire, caught rather than inferred. */
let asked = null;
await p.route('**/auth/v1/recover**', async (route) => {
  asked = {
    url: route.request().url(),
    body: route.request().postDataJSON(),
  };
  await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

try {
  await p.goto(server.url, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);

  /* Onto the sign-in form, which is where the link belongs — it is offered to
     somebody signing IN, not to somebody making an account they do not have
     yet. Reached by the switch under the form rather than by a second press
     of the landing button, because that switch is the real route. */
  const toSignIn = p.locator('button').filter({ hasText: /^Sign In$|^Meld aan$/i }).last();
  if (await toSignIn.count()) {
    await toSignIn.click().catch(() => undefined);
    await p.waitForTimeout(500);
  }

  const forgot = p.locator('[data-forgot]');
  check('the sign-in form offers a way back in', (await forgot.count()) > 0,
    'somebody who forgets their password has nothing on screen to press');
  if ((await forgot.count()) === 0) throw new Error('no forgot link');

  /* Typed BEFORE pressing it, because that is the real order: somebody types
     their address, tries a password, fails, and then remembers. An address box
     that empties on the switch asks them to type it again at the exact moment
     they are already annoyed. */
  const email = p.locator('input[type="email"]').first();
  await email.fill(WHO);
  await p.waitForTimeout(200);

  await forgot.first().click();
  await p.waitForTimeout(600);
  await p.screenshot({ path: shot('forgot.png') });

  check('  and the address survives the switch',
    (await email.inputValue().catch(() => '')) === WHO,
    'it empties, so they type it again at the moment they are already annoyed');

  check('  and the password box is gone',
    (await p.locator('input[type="password"]').count()) === 0,
    'a box for the thing they are here because they do not know');

  const send = p.locator('[data-authgo="forgot"]');
  check('  and the button asks for the letter rather than to sign in',
    (await send.count()) > 0, 'the form still submits as a sign-in');

  await send.first().click();
  await p.waitForTimeout(1500);

  check('a letter was actually asked for', asked !== null,
    'the button is there and presses and nothing goes out');

  if (asked) {
    check('  for the address that was typed', asked.body?.email === WHO,
      JSON.stringify(asked.body ?? {}).slice(0, 120));
    /* The return leg. Supabase puts this on the link, and a reset that lands
       on their own page instead of ours is a reset that ends somewhere the
       person has never seen, in English. */
    /* Decoded first. Supabase puts the return on the QUERY, url-encoded, so
       a raw `includes('localhost:3141')` looks for a colon that is written
       `%3A` — the first version of this reported a correct redirect as a
       missing one, which is a probe failing the thing it is checking. */
    const back = decodeURIComponent(String(asked.body?.redirect_to ?? asked.url ?? ''));
    check('  coming back to this app, not to theirs', back.includes(`localhost:${PORT}`),
      back.slice(0, 160) || 'no redirect on the request at all');
    check('  and marked so the app knows why they arrived', /recover=1/.test(back),
      back.slice(0, 160));
  }

  /* ── The sentence, which is the security property ────────────────────
 
     It must read as a condition and not as a fact. "A letter is on its way"
     confirms the address has an account here, one address at a time, to
     anybody who asks — and for a music app that is a list of which artists
     are members. */
  const said = (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  check('  and the screen does not say whether the address is one of ours',
    /\bIf\b|\bAs\b/.test(said) && !/no account|not found|geen rekening/i.test(said),
    said.slice(0, 200));

  /* ── And the screen the letter leads to ──────────────────────────────
 
     Reached by the mark on the address rather than by a real token: the
     token is one-time, comes out of a mailbox, and is Supabase's to issue.
     What this walks is the half that is ours — that arriving with the mark
     opens the panel, over the top rather than behind. */
  await p.goto(`${server.url}/?recover=1`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const panel = p.locator('[data-recovering]');
  check('arriving from the letter opens the new-password screen',
    (await panel.count()) > 0,
    'they land in the app with a session and nothing saying what to do next');

  if ((await panel.count()) > 0) {
    await p.screenshot({ path: shot('forgot-set.png') });
    check('  with a box to type the new one in',
      await panel.locator('input[type="password"]').first().isVisible().catch(() => false));
    check('  and a button to save it',
      (await panel.locator('[data-setpassword]').count()) > 0);
    /* Over everything. On a recovery there is already a session, so a panel
       that sits below the studio is a panel nobody finds. */
    const over = await panel.first().evaluate((el) => Number(getComputedStyle(el).zIndex) || 0);
    check('  drawn over the studio rather than behind it', over >= 100, `z-index ${over}`);
  }
} finally {
  await b.close();
  server.stop();
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\nPressed on a phone: the way back in is on the sign-in form, it keeps the address, it asks for a real letter with this app on the return, it never says whether the address is one of ours, and the link opens a screen over the studio.');
