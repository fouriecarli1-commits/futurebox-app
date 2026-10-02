/**
 * The row of "continue with" buttons, against what the project says is on.
 *
 * The point of the component is that it does not guess. Every provider needs
 * its own developer account, its own client id and secret, and this app's
 * address on somebody else's redirect list — so a button for one nobody has
 * configured sends a person out to a consent screen that refuses them and
 * drops them back holding an error they cannot act on.
 *
 * So `/auth/v1/settings` is answered three different ways here and what is
 * checked is that the screen follows it exactly: all three, one, and none.
 * Needs the stub build — see `audit/README.md`.
 */
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3102';
const af = process.argv[3] === 'af';

/* The divider between the provider buttons and the email form.

   It was `/^\s*or\s*$/im` in both assertions below, hard-coded, in a probe
   that takes `af` as an argument -- so the Afrikaans run had always failed
   the first of them and always passed the second for the wrong reason, since
   asserting the ABSENCE of an English word on an Afrikaans screen succeeds
   whatever is drawn. `auth.or` is "of" in Afrikaans.

   Found 15 September 2026, the first time this probe was run in Afrikaans.
   It is the shape #96 was about: a probe nobody runs is a probe that is
   wrong, and one that takes a language argument it does not honour is worse
   than one that does not offer the choice. */
const OR = af ? /^\s*of\s*$/im : /^\s*or\s*$/im;

/* ── Its own build, and why this one cannot borrow anybody else's ─────────

   `providersOn()` returns an empty list the moment
   `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing,
   without asking anything — so on an ordinary build the fetch this probe
   stubs never happens and every assertion below reads "no buttons", which is
   the app behaving correctly and the probe measuring nothing.

   `NEXT_PUBLIC_*` is inlined at build time, so an environment handed to
   `next start` changes nothing. It has to be a build. That is what the old
   header meant by "needs the stub build", and it is why this probe sat unrun:
   the build it needed was a thing somebody had to remember to make.

   So it makes one, and then puts the tree back. The values are obvious
   nonsense on purpose — nothing here reaches Supabase, every call the screen
   makes is answered by `page.route` below, and a real project's address in a
   test build is how a probe ends up talking to production. */
const STUB = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://stub.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'stub-anon-key',
};
console.log('building with a project that claims to have providers…');
execSync('npx next build', { stdio: 'ignore', env: { ...process.env, ...STUB } });

/* The tree as it was found, whatever happened above.

   In a `process.on('exit')` handler rather than at the end of the run: this
   probe threw once, before this line, and left the stubbed build behind — and
   the next probe to run then signed in against an app that believed it had
   accounts and could not find its way past the front page. Restoring on the
   way out is the same discipline the probe pages keep with `rmSync` in a
   `finally`, and for the same reason: the failure that skips the tidy-up is
   the one that was never planned for.

   `execSync` in an exit handler is allowed to be slow — nothing is waiting on
   this process any more, and a slow tidy-up beats a poisoned build. */
let putBack = false;
const restore = () => {
  if (putBack) return;
  putBack = true;
  console.log('putting the ordinary build back…');
  try {
    execSync('npx next build', { stdio: 'ignore' });
  } catch {
    console.error('the ordinary build could not be put back — run `npx next build`');
  }
};
process.on('exit', restore);


const server = await serve(PORT, { env: STUB });
const b = await chromium.launch(launchOptions());
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};

/** Open the sign-in modal against a project claiming these providers. */
async function withProviders(external) {
  const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
  p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
  await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch {} }, af ? 'af' : 'en');
  await p.route('**/auth/v1/settings*', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ external }) }));
  await p.goto(server.url, { waitUntil: 'networkidle' });
  await p.locator('button').filter({ hasText: af ? /^Begin verniet$/ : /^Start free$/ }).first().click();
  await p.waitForTimeout(1500);
  const modal = p.locator('form').first().locator('..');
  const names = (await modal.locator('button').allInnerTexts()).map((one) => one.trim());
  return { p, modal, names };
}

// ── All three on ─────────────────────────────────────────────────────────
{
  const { p, names } = await withProviders({ google: true, apple: true, facebook: true, github: true });
  const said = names.filter((one) => /Google|Apple|Facebook|GitHub/.test(one));

  /* ── Rewritten 3 October 2026, because the app grew and this did not ─────

     These two asserted that exactly three buttons drew and that GitHub was
     never one of them — "a provider this app cannot draw is not invented". That
     was the right rule when the component could draw three logos and fell
     through to FACEBOOK's mark for anything else, which would have put
     Facebook's logo on a GitHub button.

     The component fixed that properly: nine providers, each with its own colour
     from its own brand page, and anything without a hand-drawn logo gets its
     own first letter instead of a guess at somebody else's mark. So a fourth
     switched-on provider now draws correctly, and the check was calling correct
     behaviour a fault — the direction that gets checks switched off.

     What the rule was always protecting is below, and it is stronger: every
     provider the project switches on is offered, nothing it has not switched on
     is invented, and no button carries a logo that is not that company's. */
  check('every provider the project switches on is offered',
    said.length === 4 && ['Google', 'Apple', 'Facebook', 'GitHub']
      .every((one) => said.some((o) => o.includes(one))),
    said.join(' | '));

  /* The real rule, measured on the markup rather than on the text.

     A hand-drawn logo is an `<svg>`; the fallback is a `<span>` with the
     company's own first letter in it. So a provider we have a mark for must
     carry one, and a provider we do not must carry a letter — never another
     company's path. An approximation of a mark is a mark used badly, and every
     one of these companies has rules about that. */
  const logoOf = async (word) => {
    const button = p.locator('button').filter({ hasText: new RegExp(word) }).first();
    return {
      svg: await button.locator('svg').count().catch(() => 0),
      letter: (await button.locator('span[aria-hidden="true"]').first().innerText().catch(() => '')).trim(),
    };
  };
  const fb = await logoOf('Facebook');
  const gh = await logoOf('GitHub');
  check('a provider we have a mark for carries its own mark',
    fb.svg > 0, `Facebook drew ${fb.svg} svg(s)`);
  check('and one we do not carries its own letter, not somebody else\'s logo',
    gh.svg === 0 && gh.letter === 'G',
    `GitHub drew ${gh.svg} svg(s) and the letter "${gh.letter}" —`
    + ' falling through to another company\'s path is confidently wrong,'
    + ' which is worse than a plain letter');
  check('Google comes first — most people are already signed into it',
    /Google/.test(said[0] ?? ''), said[0] ?? 'none');
  check('and the divider is there when there is something to divide',
    OR.test(await p.locator('form').first().locator('..').innerText()));
  await p.screenshot({ path: shot(`signinwith-${af ? 'af' : 'en'}.png`) });
  await p.close();
}

// ── One on ───────────────────────────────────────────────────────────────
{
  const { p, names } = await withProviders({ google: true, apple: false, facebook: false });
  const said = names.filter((one) => /Google|Apple|Facebook/.test(one));
  check('one switched on draws one button', said.length === 1, said.join(' | '));
  await p.close();
}

// ── None on ──────────────────────────────────────────────────────────────
{
  const { p, modal, names } = await withProviders({});
  const said = names.filter((one) => /Google|Apple|Facebook/.test(one));
  check('none switched on draws no buttons at all', said.length === 0, said.join(' | '));
  // And the form is still there: with no provider, typing an address is the
  // only way in.
  check('the email form is still the way in',
    (await modal.locator('input[type="email"]').count()) === 1);
  /* And it is not sitting under a dangling "or" with an empty gap above it.
     That is what the first version did — the divider stayed behind when the
     buttons did not, which is exactly what a phone screenshot showed. */
  check('with no providers there is no divider left hanging above the form',
    !OR.test(await modal.innerText()),
    (await modal.innerText()).split('\n').slice(0, 6).join(' / '));
  await p.close();
}

/* ── The tick box, which is why the buttons above can be disabled ────────

   Added 15 September 2026. ElevenLabs' OEM Terms §3(A) -- the agreement that
   lets FutureBox pass their music and voice service through to its own
   members -- requires every member to have accepted "a written contract, or
   'clickwrap' style online agreements involving conspicuous notice to End
   Users and an affirmative click to accept". Until that day the sign-up
   screen had no box, no notice and not even a link.

   It is tested here rather than in a probe of its own because it lives in
   this modal and it now GATES the buttons this file already measures: a
   provider button that redirects before the box is ticked creates an account
   without an acceptance, which is the exact thing the clause forbids.

   What is asserted is the contract, not the wording: a box that starts
   unticked, a submit and a provider row that do not work until it is ticked,
   and no box at all on the sign-in side, because signing back in is not a
   new agreement. */
{
  const { p, modal } = await withProviders({ google: true, apple: true, facebook: true });
  const box = modal.locator('input[type="checkbox"]');
  const submit = modal.locator('button[type="submit"]');
  const google = modal.locator('button').filter({ hasText: /Google/ }).first();

  check('signing up puts a tick box in front of the person', (await box.count()) === 1);
  check('and it starts unticked, because a pre-ticked box is not an affirmative click',
    (await box.count()) === 1 && !(await box.first().isChecked()));

  const words = await modal.innerText();
  check('and it says the age and links both documents',
    /18/.test(words) && (await modal.locator('a[href="/terms"]').count()) === 1 &&
      (await modal.locator('a[href="/privacy"]').count()) === 1,
    words.split('\n').filter((l) => /18|terms|voorwaardes/i.test(l)).join(' / ') || '(nothing)');

  check('the create button does nothing until it is ticked',
    await submit.first().isDisabled());
  check('and neither does Google — signing in with a provider still makes an account',
    await google.isDisabled());

  await box.first().check();
  await p.waitForTimeout(200);
  check('ticking it opens the create button', !(await submit.first().isDisabled()));
  check('and opens the provider buttons with it', !(await google.isDisabled()));

  await p.screenshot({ path: shot(`agree-${af ? 'af' : 'en'}.png`) });
  await p.close();
}

// ── And signing back in is not a new agreement ───────────────────────────
{
  const { p, modal } = await withProviders({ google: true });
  await modal.locator('button').filter({ hasText: af ? /^Teken in$/ : /^Sign in$/ }).last().click();
  await p.waitForTimeout(600);
  const back = p.locator('form').first().locator('..');
  check('signing in asks for no tick box', (await back.locator('input[type="checkbox"]').count()) === 0);
  check('and its button works straight away',
    !(await back.locator('button[type="submit"]').first().isDisabled()));
  await p.close();
}

await b.close();
await server.stop();

/* The tree as it was found. Every other probe in this directory shares one
   ordinary build, and leaving a stubbed one behind would hand the next probe
   an app that believes it has accounts. */
restore();

if (problems.length) {
  console.error(`\ncheck:signinwith — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:signinwith — the sign-in row draws exactly the providers the project\n  says are on, and nothing creates an account before the box is ticked.');
