/**
 * Cut the ums: an episode read back, its hesitations found, and the episode
 * handed back to the draft without them.
 *
 * The episode is a real WAV the probe writes: four seconds of tone, and the
 * transcript says "um" at 1.0 s and "uh" at 2.5 s. Cutting both must give a
 * draft that is shorter by about the length of the two, on the broadcast tab,
 * with the episode's own title, and nothing is sent to be cut.
 *
 *   node audit/cutums.mjs [port]
 */
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3496');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

/** Four seconds of a quiet tone, mono, 16-bit, 16 kHz. */
function wav(seconds = 4, rate = 16000) {
  const n = seconds * rate;
  const out = Buffer.alloc(44 + n * 2);
  out.write('RIFF', 0); out.writeUInt32LE(36 + n * 2, 4); out.write('WAVE', 8);
  out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
  out.write('data', 36); out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) out.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 6000), 44 + i * 2);
  return out;
}

const TITLE = 'The one about bass players';
const sent = [];
const { browser, page } = await enter({
  at: server.url,
  lang: 'en',
  before: async (p) => {
    await p.route('**/api/show*', (r) => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        signedIn: true, configured: true,
        show: { id: 'show1', title: 'The Bass Hour', language: 'en' },
        episodes: [{ id: 'ep1', title: TITLE, notes: 'Notes', made: 'recorded', seconds: 4, audio_path: 'ep1.wav' }],
        caps: { publish: true, dub: true },
      }),
    }));
    await p.route('**/storage/v1/object/public/episodes/**', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: wav() }));
    await p.route('**/api/transcribe', (r) => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        text: 'So um this week uh bass',
        words: [
          { text: 'So', start: 0.2, end: 0.5, speaker: 'speaker_0' },
          { text: 'um,', start: 1.0, end: 1.4, speaker: 'speaker_0' },
          { text: 'this', start: 1.6, end: 1.9, speaker: 'speaker_0' },
          { text: 'week', start: 2.0, end: 2.3, speaker: 'speaker_0' },
          { text: 'Uh', start: 2.5, end: 2.9, speaker: 'speaker_0' },
          { text: 'bass', start: 3.1, end: 3.6, speaker: 'speaker_0' },
        ],
        turns: [{ speaker: 'speaker_0', start: 0.2, end: 3.6, text: 'So um, this week Uh bass' }],
      }),
    }));
    p.on('request', (q) => { if (/\/api\/(voice\/clean|episode)/.test(q.url()) && q.method() === 'POST') sent.push(q.url()); });
  },
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));

try {
  const room = await studio(page);
  await toRoom(page, 'Podcast');
  await page.waitForTimeout(1200);
  await room.locator('[data-podtab="episodes"]').first().click().catch(() => undefined);
  await page.waitForTimeout(800);
  await unfold(page);
  /* `unfold` opens every shut panel on the way in, this one included, so a
     second press here would shut it again. */
  const said = room.locator('button').filter({ hasText: /^What was said$/ }).first();
  if ((await said.getAttribute('aria-expanded')) !== 'true') await said.click();
  await page.waitForTimeout(600);
  await room.locator('button').filter({ hasText: /^Read it back/ }).first().click();
  await page.waitForTimeout(1500);

  const found = room.locator('[data-fillers]');
  check('the ums are found and counted', (await found.count()) > 0 && /^2 ums/.test((await found.innerText()).trim()), (await found.count()) ? await found.innerText() : 'no panel');
  const press = room.locator('[data-fillerscut]');
  check('the press says it takes no credits', /Cut the ums · no credits/.test(await press.innerText().catch(() => '')));
  await press.click();
  /* Decoding and writing the MP3 happen on the device, and the encoder is
     loaded on the first press. */
  /* No unfolding here: the draft's card must open itself, or the member
     sees the tab change and nothing in it. */
  await page.locator('audio[src^="blob:"]').first().waitFor({ timeout: 20000 }).catch(() => undefined);
  const failed = await room.getByText(/could not be cut/).count();
  check('the cut does not fail', failed === 0);

  check('it lands on the broadcast tab with a draft', await room.locator('[data-podtab="broadcast"][aria-selected="true"], [data-podtab="broadcast"][aria-current]').count() > 0
    || await room.locator('audio[src^="blob:"]').count() > 0);
  const seconds = await page.evaluate(async () => {
    const audio = document.querySelector('audio[src^="blob:"]');
    if (!audio) return null;
    const bytes = await (await fetch(audio.src)).arrayBuffer();
    const decoded = await new OfflineAudioContext(1, 1, 32000).decodeAudioData(bytes);
    return decoded.duration;
  });
  /* The um (0.4 s) and the uh (0.4 s) and their edges, out of four seconds.
     An MP3 carries a few milliseconds of its own padding, so a range. */
  check('the draft is shorter by the two of them', seconds !== null && seconds > 2.9 && seconds < 3.4, String(seconds));
  check('with the episode’s own title', (await room.locator(`input[value="${TITLE}"]`).count()) > 0);
  check('and nothing was sent anywhere to be cut', sent.length === 0, sent.join(', '));
  check('no page errors', errors.length === 0, errors.join(' ;; '));
  await page.screenshot({ path: shot('cutums.png') });
} catch (error) {
  check('the walk finished', false, String(error).slice(0, 200));
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:cutums — ${problems.length} problem(s)`);
  process.exit(1);
}
console.log('\ncheck:cutums — the ums are found, cut on the device, and the episode comes back shorter.');
