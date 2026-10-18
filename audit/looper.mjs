/**
 * The looper in the live jam room, walked on a phone.
 *
 * The owner, 18 October 2026: a looper, so a sound can be held and layered;
 * and while somebody else in the room is looping, a plus pulses on your screen
 * — gone when their loop stops, back when a new one starts — and pressing it
 * puts their loop into yours.
 *
 * Read off the glass and off what is sent: one pass of pads becomes a layer,
 * the loop plays on, the room is told, somebody else's loop shows a plus that
 * pulses on their beat, pressing it adds their layers with their name on, a
 * new loop of theirs brings the plus back, their stopping takes it away, and
 * clearing yours tells the room it stopped. `/api/live/loops` is answered
 * here, so no account and no database are needed.
 */
import { enter, studio } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3363');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

const SIPHO = '11111111-2222-4333-8444-555555555555';
let roomLoops = [];
const posted = [];
let deleted = 0;
const theirLoop = {
  bpm: 120,
  layers: [
    { id: 's1', kind: 'pads', hits: [{ pad: 'kick', at: 0 }, { pad: 'kick', at: 0.5 }] },
    { id: 's2', kind: 'pads', hits: [{ pad: 'hihat', at: 0.125 }, { pad: 'hihat', at: 0.375 }] },
  ],
};

const { browser, page } = await enter({
  width: 390, height: 844, touch: true, at: server.url, lang: 'en',
  /* A microphone, for the voice layer — Chromium's own fake one. */
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  before: async (p) => {
    /* The room itself, empty and switched on: no accounts are needed here. */
    await p.route((url) => new URL(url).pathname === '/api/live', (route) => (route.request().method() === 'GET'
      ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ready: true, here: 2, posts: [], says: [] }) })
      : route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })));
    await p.route('**/api/live/loops**', (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === 'POST') {
        posted.push(JSON.parse(request.postData() || '{}'));
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      }
      if (request.method() === 'DELETE') {
        deleted += 1;
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      }
      if (url.searchParams.get('who') === SIPHO) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ who: SIPHO, name: 'Sipho', loop: theirLoop }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ready: true, loops: roomLoops }) });
    });
  },
});
page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));

const layerCount = () => page.locator('[data-looplayer]').count();

try {
  await studio(page);
  /* Live is a tab on the bar, not a room on the door. */
  await page.locator('nav[aria-label]').first().locator('button').filter({ hasText: 'Live' }).first().click();
  await page.waitForSelector('[data-livemode="jam"]', { timeout: 20000 });
  await page.locator('[data-livemode="jam"]').click();
  await page.waitForSelector('[data-jamlooper]', { timeout: 15000 });
  await page.locator('[data-jamlooper]').scrollIntoViewIfNeeded();
  check('the looper is in the jam room, with a tempo and the four buttons',
    (await page.locator('[data-looptempo]').count()) === 1
      && (await page.locator('[data-looprec="pads"]').count()) === 1
      && (await page.locator('[data-looprec="voice"]').count()) === 1
      && await page.locator('[data-loopplay]').isDisabled());
  check('  and nobody else is looping yet, and it says what will happen when somebody does',
    (await page.locator('[data-roomloopsnone]').count()) === 1 && (await page.locator('[data-roomloopadd]').count()) === 0);

  /* A voice layer needs the microphone, which is on the stage. */
  await page.locator('[data-looprec="voice"]').click();
  check('a voice layer off stage says to go on stage first',
    /go on stage first/.test(await page.locator('[data-loopsaid]').innerText().catch(() => '')));

  /* One pass of pads. */
  await page.locator('[data-looprec="pads"]').click();
  for (const pad of ['kick', 'hihat', 'snare', 'hihat', 'kick']) {
    await page.locator(`[data-livepad="${pad}"]`).click();
    await page.waitForTimeout(500);
  }
  await page.waitForFunction(() => document.querySelectorAll('[data-looplayer]').length === 1, null, { timeout: 8000 }).catch(() => undefined);
  check('one pass of pads becomes a layer', (await layerCount()) === 1, `${await layerCount()} layers`);
  check('  and the loop plays on', /Stop/.test(await page.locator('[data-loopplay]').innerText()));
  const beatA = await page.locator('[data-loopbeat="on"]').evaluate((el) => [...el.parentElement.children].indexOf(el)).catch(() => -1);
  await page.waitForTimeout(700);
  const beatB = await page.locator('[data-loopbeat="on"]').evaluate((el) => [...el.parentElement.children].indexOf(el)).catch(() => -1);
  check('  and the beat light moves', beatA >= 0 && beatB >= 0 && beatA !== beatB, `${beatA} → ${beatB}`);
  check('  and the tempo is held while there are layers', await page.locator('[data-looptempo]').isDisabled());

  await page.waitForFunction(() => true);
  await page.waitForTimeout(500);
  const first = posted.find((one) => one.fresh === true);
  check('the room is told, as a new loop, with the tempo and the hits',
    Boolean(first) && first.loop.bpm === 100 && first.loop.layers.length === 1
      && first.loop.layers[0].kind === 'pads' && first.loop.layers[0].hits.length >= 2,
    JSON.stringify(first ?? posted.at(-1) ?? null).slice(0, 200));

  /* Somebody else starts looping. */
  roomLoops = [{ who: SIPHO, name: 'Sipho', bpm: 120, layers: 2, startedAt: '2026-10-18T10:00:00Z' }];
  await page.waitForSelector(`[data-roomloopadd="${SIPHO}"]`, { timeout: 9000 }).catch(() => undefined);
  const plus = page.locator(`[data-roomloopadd="${SIPHO}"]`);
  check('a plus shows for somebody else looping', (await plus.count()) === 1);
  const pulse = await plus.evaluate((el) => {
    const style = getComputedStyle(el, '::before');
    return { name: style.animationName, duration: style.animationDuration };
  }).catch(() => ({}));
  check('  and it pulses, on their beat (half a second at 120)', pulse.name === 'fb-loop-ring' && pulse.duration === '0.5s', JSON.stringify(pulse));

  await plus.click();
  await page.waitForFunction(() => document.querySelectorAll('[data-looplayer]').length === 3, null, { timeout: 8000 }).catch(() => undefined);
  const names = await page.locator('[data-looplayer]').allInnerTexts();
  check('pressing it puts their two layers into mine, with their name on',
    names.length === 3 && names.filter((one) => /from Sipho/.test(one)).length === 2, names.join(' | '));
  check('  and the plus becomes a tick until they loop something new',
    (await page.locator('[data-roomloopadded]').count()) === 1 && (await page.locator('[data-roomloopadd]').count()) === 0);

  /* They start a new loop: the plus comes back. */
  roomLoops = [{ who: SIPHO, name: 'Sipho', bpm: 120, layers: 3, startedAt: '2026-10-18T10:05:00Z' }];
  await page.waitForSelector(`[data-roomloopadd="${SIPHO}"]`, { timeout: 9000 }).catch(() => undefined);
  check('a new loop of theirs brings the plus back', (await page.locator(`[data-roomloopadd="${SIPHO}"]`).count()) === 1);

  /* They stop: the plus goes. */
  roomLoops = [];
  await page.waitForSelector('[data-roomloopsnone]', { timeout: 9000 }).catch(() => undefined);
  check('when their loop stops, the plus goes away', (await page.locator('[data-roomloop]').count()) === 0);

  /* Mute and remove. */
  const mute = page.locator('[data-loopmute]').first();
  await mute.click();
  check('a layer can be muted', (await mute.getAttribute('aria-pressed')) === 'true');
  await page.locator('[data-loopdelete]').last().click();
  check('  and removed', (await layerCount()) === 2, `${await layerCount()} layers`);

  /* Clearing tells the room it stopped. */
  const before = deleted;
  await page.locator('[data-loopclear]').click();
  await page.waitForTimeout(1200);
  check('clearing empties the looper and stops it', (await layerCount()) === 0 && await page.locator('[data-loopplay]').isDisabled());
  check('  and tells the room the loop stopped, so the plus goes from everybody else', deleted > before, `${deleted - before} deletes`);

  /* A voice layer: on stage, one pass off the microphone. */
  await page.locator('[data-livestagebtn]').click();
  await page.waitForFunction(() => /Leave the stage/.test(document.querySelector('[data-livestagebtn]')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => undefined);
  const sentBefore = posted.length;
  await page.locator('[data-looprec="voice"]').click();
  await page.waitForSelector('[data-looplayer="voice"]', { timeout: 15000 }).catch(() => undefined);
  check('on stage, one pass off the microphone becomes a voice layer',
    (await page.locator('[data-looplayer="voice"]').count()) === 1,
    await page.locator('[data-loopsaid]').innerText().catch(() => 'nothing said'));
  await page.waitForTimeout(1500);
  const voice = posted.slice(sentBefore).map((one) => one.loop?.layers?.find((layer) => layer.kind === 'voice')).find(Boolean);
  check('  and the room is told, with the recording small enough to share',
    Boolean(voice) && /^audio\//.test(voice.type) && voice.audio.length > 100 && voice.audio.length <= 120000 && voice.bpm === 100,
    voice ? `${voice.type}, ${voice.audio.length} characters` : 'no voice layer was sent');

  /* Send to ProBooth: the loop is kept on the phone and the Booth opens,
     saying it is waiting. */
  const send = page.locator('[data-loopsend]');
  check('with a loop playing, it can be sent to ProBooth', (await send.count()) === 1);
  await send.click();
  await page.waitForSelector('[data-booth] [data-jamwaiting], [data-jamwaiting]', { timeout: 15000 }).catch(() => undefined);
  check('  and the Booth opens, saying the loop is waiting for a song',
    (await page.locator('[data-jamwaiting]').count()) >= 1,
    (await page.locator('body').innerText()).slice(0, 160));
  const kept = await page.evaluate(() => new Promise((done) => {
    const asked = indexedDB.open('futurebox-jamloop', 1);
    asked.onsuccess = () => {
      const all = asked.result.transaction('sent', 'readonly').objectStore('sent').getAll();
      all.onsuccess = () => done(all.result.map((one) => ({ size: one.wav?.size ?? 0, bpm: one.bpm, seconds: one.seconds })));
      all.onerror = () => done([]);
    };
    asked.onerror = () => done([]);
  }));
  check('  and one pass of it is kept on the phone as a WAV',
    kept.length === 1 && kept[0].size > 44 && kept[0].bpm === 100 && Math.abs(kept[0].seconds - 4.8) < 0.01,
    JSON.stringify(kept));
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:looperwalk — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:looperwalk — pads become a layer, the room is told, somebody else’s loop pulses a plus that adds it, comes back when they loop anew, and goes when they stop.');
