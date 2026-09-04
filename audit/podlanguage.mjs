/**
 * The podcast channel's language, on a stubbed account.
 *
 * ── Why a field this small gets a run ────────────────────────────────────
 *
 * It was a text box with `en / af` as its placeholder — two examples and no
 * question — and because the field defaults to `en` the placeholder never
 * showed at all, so what was on screen was a box containing "en" and nothing
 * saying why.
 *
 * What is typed there goes straight into the RSS feed as `<language>`, which
 * Apple and Spotify read. "English", "afrikaans" and "eng" are each a tag that
 * does not mean what it says, and the show is already published by the time
 * anybody finds out. `app/data/dublanguages.ts` exists because almost nobody
 * knows that Dutch is `nl` and Danish is `da`, and it answers the same
 * question here — so the whole class of typo goes away rather than being
 * validated after the fact.
 *
 * The room asks the server who it is talking to, so a run without that
 * answered would test the signed-out screen and nothing else. That is the
 * mistake `cast.mjs` was written to stop making twice, and the routes are
 * stubbed below for the same reason.
 *
 * Needs the stub build — see `audit/README.md`.
 */
import { chromium } from 'playwright';
const PORT = process.argv[2] || '3044';
const af = process.argv[3] === 'af';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
const check = (l, ok, d = '') => { console.log(`${l}: ${ok}`); if (!ok) problems.push(`${l}${d ? ` (${d})` : ''}`); };
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch {} }, af ? 'af' : 'en');
const WHO = { id: '11111111-2222-3333-4444-555555555555', email: 'toets@futurebox.test' };
await p.addInitScript((who) => {
  try {
    window.localStorage.setItem('sb-stub-auth-token', JSON.stringify({
      access_token: 'stub-access-token', refresh_token: 'stub-refresh-token', token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 86400, expires_in: 86400,
      user: { id: who.id, email: who.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
    }));
  } catch {}
}, WHO);
await p.route('**/auth/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ id: WHO.id, email: WHO.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }) }));
await p.route('**/rest/v1/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

/* The room asks the server who it is talking to, and the stub bearer token is
   not a JWT the real route can verify — so without this the run would test the
   signed-out screen and nothing else, which is the mistake `cast.mjs` was
   written to stop making a second time. */
await p.route('**/api/show*', (r) => r.fulfill({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ signedIn: true, configured: true, show: null, episodes: [], caps: { publish: true, dub: true } }) }));
await p.route('**/api/voice*', (r) => r.fulfill({ status: 200, contentType: 'application/json',
  body: JSON.stringify({ configured: true, mine: [], stock: [], caps: { publish: true, dub: true } }) }));

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
await p.locator('header button').filter({ hasText: /Studio/i }).first().waitFor({ timeout: 40000 });
await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
await p.waitForTimeout(1800);
const room = p.locator('div.fixed.inset-0.z-50').first();
// The room keeps its English name in both languages, so the same filter works.
await room.locator('button').filter({ hasText: /^Podcast/i }).first().click();
await p.waitForTimeout(2500);

const box = room.locator('#show-language');
check('the language field is a chooser, not a text box', (await box.count()) === 1, String(await box.count()));
if (await box.count()) {
  check('it is a <select>', (await box.evaluate((el) => el.tagName)) === 'SELECT');
  const options = await box.locator('option').allInnerTexts();
  check('it offers the whole dubbing list', options.length > 20, String(options.length));
  check('English is what it starts on', (await box.inputValue()) === 'en', await box.inputValue());
  check('each language is named in its own language too',
    options.some((o) => /Afrikaans/.test(o)) && options.some((o) => /Nederlands|Dutch/.test(o)),
    options.slice(0, 6).join(' | '));
  await box.selectOption('af');
  await p.waitForTimeout(300);
  check('and it can be changed', (await box.inputValue()) === 'af', await box.inputValue());
  const label = await room.locator('label[for="show-language"]').innerText();
  check('it has a label for a screen reader', label.length > 3, label);
}
await p.screenshot({ path: `audit/podlanguage-${af ? 'af' : 'en'}.png`, fullPage: false });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);
