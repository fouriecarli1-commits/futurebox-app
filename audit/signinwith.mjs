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
import { chromium } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3044';
const af = process.argv[3] === 'af';

const b = await chromium.launch(launchOptions());
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};

/** Open the sign-in modal against a project claiming these providers. */
async function withProviders(external) {
  const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
  p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
  await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch {} }, af ? 'af' : 'en');
  await p.route('**/auth/v1/settings*', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ external }) }));
  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
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
  check('all three switched on are all three offered',
    said.length === 3 && said.some((o) => /Google/.test(o)) && said.some((o) => /Apple/.test(o)) &&
      said.some((o) => /Facebook/.test(o)),
    said.join(' | '));
  check('and a provider this app cannot draw is not invented',
    !said.some((one) => /GitHub/.test(one)), said.join(' | '));
  check('Google comes first — most people are already signed into it',
    /Google/.test(said[0] ?? ''), said[0] ?? 'none');
  check('and the "or" is there when there is something to be or-ed against',
    /^\s*or\s*$/im.test(await p.locator('form').first().locator('..').innerText()));
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
  check('with no providers there is no "or" left hanging above the form',
    !/^\s*or\s*$/im.test(await modal.innerText()),
    (await modal.innerText()).split('\n').slice(0, 6).join(' / '));
  await p.close();
}

console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
