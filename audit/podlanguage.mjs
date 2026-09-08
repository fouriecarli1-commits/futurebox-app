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
import { serve, shot } from './where.mjs';
import { enter, studio, toRoom } from './enter.mjs';

const PORT = process.argv[2] || '3103';
const af = process.argv[3] === 'af';
const problems = [];
const check = (l, ok, d = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${l}${d && !ok ? ` — ${d}` : ''}`);
  if (!ok) problems.push(`${l}${d ? ` (${d})` : ''}`);
};

/* ── Its own server, and the ordinary way in ─────────────────────────────

   This went to a port it did not start, and signed itself in by writing a
   Supabase session into localStorage — which only works on a build that has
   `NEXT_PUBLIC_SUPABASE_URL` in it, and that is what "needs the stub build"
   meant and why this sat unrun.

   None of it is necessary. `enter()` signs in the way a person does, and the
   two routes below are the reason this probe exists in the first place: the
   room asks the server who it is talking to, and a run without that answered
   would test the signed-out screen and nothing else. That is the mistake
   `cast.mjs` was written to stop making twice. */
const server = await serve(PORT);
const { browser: b, page: p } = await enter({
  at: server.url,
  lang: af ? 'af' : 'en',
  before: async (page) => {
    await page.route('**/api/show*', (r) => r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ signedIn: true, configured: true, show: null, episodes: [], caps: { publish: true, dub: true } }) }));
    await page.route('**/api/voice*', (r) => r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ configured: true, mine: [], stock: [], caps: { publish: true, dub: true } }) }));
  },
});
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));

const room = await studio(p);
/* Named in the language the run is in. The comment here used to say the room
   keeps its English name in both, which was true when it was written and is
   not now: `rail.podcast` is "Potgooi". An Afrikaans run then spent thirty
   seconds failing to click a room that was on screen under another name. */
await toRoom(p, af ? 'Potgooi' : 'Podcast');
await p.waitForTimeout(2000);

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
  /* `textContent`, not `innerText`. The label is `sr-only` — off-screen for
     everybody but a screen reader, which is the point of it — and `innerText`
     honours visibility, so it comes back empty and the assertion reads as a
     missing label on a label that is there. */
  const label = (await room.locator('label[for="show-language"]').textContent()) ?? '';
  check('it has a label for a screen reader', label.trim().length > 3, label);
}
await p.screenshot({ path: shot(`podlanguage-${af ? 'af' : 'en'}.png`), fullPage: false });
await b.close();
await server.stop();

if (problems.length) {
  console.error(`\ncheck:podlanguage — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:podlanguage — the show\'s language is chosen from a list, not typed as a guess.');
