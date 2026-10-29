/**
 * The podcast desk is the signal path: the meter reads the microphone, the
 * gain slider changes it, a pad pressed on air is in the recording, and a pad
 * can be made from words and put back.
 *
 * Chromium's stand-in microphone plays a steady tone, so the meter has
 * something real to read. `/api/voice/effect` answers with a short WAV the
 * probe writes, so no engine is called.
 *
 *   node audit/poddesk.mjs [port]
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3497');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

function wav(seconds = 1, rate = 16000) {
  const n = seconds * rate;
  const out = Buffer.alloc(44 + n * 2);
  out.write('RIFF', 0); out.writeUInt32LE(36 + n * 2, 4); out.write('WAVE', 8);
  out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
  out.write('data', 36); out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) out.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 880 * i) / rate) * 8000), 44 + i * 2);
  return out;
}

let effectAsked = null;
const { browser, page } = await enter({
  at: server.url,
  lang: 'en',
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  before: async (p) => {
    await p.context().grantPermissions(['microphone']);
    await p.route('**/api/show*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      signedIn: true, configured: true, show: { id: 's1', title: 'The Bass Hour', language: 'en' }, episodes: [], caps: { publish: true } }) }));
    await p.route('**/api/voice/effect', async (r) => {
      effectAsked = r.request().postDataJSON();
      await r.fulfill({ status: 200, contentType: 'audio/wav', body: wav() });
    });
  },
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));

const meter = () => page.locator('[data-vu]').first().getAttribute('data-vu').then(Number);
/* The stand-in microphone beeps once a second, so the loudest reading over a
   couple of seconds is what the meter showed for the beep. */
const loudest = async (ms = 2500) => {
  let top = 0;
  for (let at = 0; at < ms; at += 100) {
    top = Math.max(top, await meter());
    await page.waitForTimeout(100);
  }
  return top;
};

try {
  const room = await studio(page);
  await toRoom(page, 'Podcast');
  await page.waitForTimeout(1200);

  check('there are four pads, each the sound it is named', (await room.locator('[data-podpad]').count()) === 4
    && /Applause/.test(await room.locator('[data-podpad="applause"]').innerText()));
  const inputs = await page.evaluate(async () => (await navigator.mediaDevices.enumerateDevices())
    .filter((one) => one.kind === 'audioinput' && one.deviceId && !['default', 'communications'].includes(one.deviceId)).length);
  check('a second microphone is offered only when the device has more than one',
    ((await room.locator('[data-podmic2]').count()) > 0) === (inputs > 1), `${inputs} inputs`);
  check('the meter is still before recording', (await meter()) === 0);

  await room.locator('button').filter({ hasText: /^Record$/ }).first().click();
  const loud = await loudest();
  check('recording, the meter reads the microphone', loud > 2, String(loud));

  const slider = room.locator('input[type="range"][aria-label="Gain"]').first();
  await slider.fill('0');
  await page.waitForTimeout(400);
  const value = await slider.inputValue();
  const quiet = await loudest(1500);
  check('  and the gain at nothing takes the meter to nothing', quiet === 0, `${loud} → ${quiet} at ${value}`);
  /* The microphone stays at nothing, so whatever is in the recording from
     here on is the pad. */
  check('on air, the room says a pad goes into the recording', /a pad you press now is in the recording/.test(await room.innerText()));
  await room.locator('[data-podpad="applause"]').click();
  await page.waitForTimeout(1500);
  await room.locator('button').filter({ hasText: /^Stop$/ }).first().click();
  await page.waitForTimeout(1500);
  check('stopping leaves a draft to hear', (await page.locator('audio[src^="blob:"]').count()) > 0);
  const peak = await page.evaluate(async () => {
    const audio = document.querySelector('audio[src^="blob:"]');
    if (!audio) return null;
    const decoded = await new AudioContext().decodeAudioData(await (await fetch(audio.src)).arrayBuffer());
    const data = decoded.getChannelData(0);
    let top = 0;
    for (let i = 0; i < data.length; i += 1) top = Math.max(top, Math.abs(data[i]));
    return top;
  });
  check('  and the applause pressed on air is in it', peak !== null && peak > 0.05, String(peak));
  check('  and the meter is still again', (await meter()) === 0);

  await room.locator('[data-podpadmake="intro"]').click();
  const words = room.locator('[data-podpadwrite] input');
  check('a pad can be made from words, priced on the press', (await words.count()) > 0
    && /Make the sound · \d+ credits/.test(await room.locator('[data-podpadgo]').innerText()));
  await words.fill('a taxi hooter, twice');
  await room.locator('[data-podpadgo]').click();
  await page.waitForTimeout(1500);
  check('  the words are what is asked for', effectAsked?.text === 'a taxi hooter, twice', JSON.stringify(effectAsked));
  check('  and the pad is marked as the member’s own', /★/.test(await room.locator('[data-podpad="intro"]').innerText()));
  await room.locator('[data-podpadmake="intro"]').click();
  await room.locator('[data-podpadreset]').click();
  await page.waitForTimeout(600);
  check('  and can be put back to the built-in sound', !/★/.test(await room.locator('[data-podpad="intro"]').innerText()));
  check('no page errors', errors.length === 0, errors.join(' ;; '));
} catch (error) {
  check('the walk finished', false, String(error).slice(0, 200));
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:poddesk — ${problems.length} problem(s)`);
  process.exit(1);
}
console.log('\ncheck:poddesk — the meter reads the microphone, the gain changes it, and the pads are real.');
