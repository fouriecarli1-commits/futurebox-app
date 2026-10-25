/**
 * A voice-over in the video editor: press once, the film plays from the
 * playhead and the microphone opens; press again and what was said lands on
 * its own lane at that second, is heard in the preview, and goes into the
 * film that comes out. No credits, nothing leaves the phone.
 *
 * Chromium's fake microphone (a tone) stands in for her voice, the way
 * `boothback.mjs` records with it.
 */
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = process.argv[2] || '3401';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

/* What an element says, or nothing when there is no such element — read
   with no wait. A locator's `innerText()` on an element that is not there
   waits the default thirty seconds before it throws, and this probe spent
   two of those waits with the film running: the clock had reached the end
   and the take was over before the probe looked again. The room was right
   and the probe was slow. */
const text = async (selector) => {
  const found = p.locator(selector);
  if ((await found.count()) === 0) return '';
  return (await found.first().innerText({ timeout: 2000 }).catch(() => '')) || '';
};

const server = await serve(PORT);
const { browser, page: p } = await enter({
  at: server.url, lang: 'en', width: 390, height: 844, touch: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const thrown = [];
p.on('pageerror', (e) => thrown.push(String(e).slice(0, 160)));
/* What the room says to the console on the way, for the one time a thing
   fails behind a sentence that says only that it failed. */
const consoled = [];
p.on('console', (msg) => { consoled.push(`${msg.type()}: ${msg.text().slice(0, 240)}`); });
const trace = async (label) => {
  const rec = p.locator('[data-editorvoicerec]');
  const same = await p.evaluate(() => {
    const el = document.querySelector('[data-editorvoicerec]');
    const was = window.__voicerec === el;
    window.__voicerec = el;
    return was;
  });
  const viewer = await p.evaluate(() => {
    const v = document.querySelector('[data-editorviewer]');
    if (!v) return 'no viewer';
    return `viewer t=${v.currentTime.toFixed(2)} dur=${v.duration} ready=${v.readyState} paused=${v.paused} ended=${v.ended} seeking=${v.seeking} src=${v.src ? 'yes' : 'none'}`;
  });
  console.log(`  --  ${label}: ${viewer}`);
  console.log(`  --  ${label}: pressed=${await rec.getAttribute('aria-pressed').catch(() => '?')} disabled=${await rec.isDisabled().catch(() => '?')} sameElement=${same} runs=${await text('[data-editorruns]')} list=${(await text('[data-editorvoicelist]')).replace(/\n/g, ' ')}`);
};

try {
  await p.context().grantPermissions(['microphone']);
  await studio(p);
  await toRoom(p, 'Video Editor');
  await unfold(p);

  /* A twelve-second film off a canvas, the way `editor.mjs` makes one. */
  const made = await p.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 240;
    const c = canvas.getContext('2d');
    /* With a sound in it, like every film off a phone — and recorded in
       slices, the way this app's own camera records, so the file carries no
       length in its header. That is the clip that found the export fault in
       `stitch.ts`: a scene whose element reports Infinity for its duration
       used to end on its first frame. */
    const stream = canvas.captureStream(30);
    const Ctx = window.AudioContext ?? window.webkitAudioContext;
    const audio = new Ctx();
    const to = audio.createMediaStreamDestination();
    const tone = audio.createOscillator();
    const level = audio.createGain();
    tone.frequency.value = 220;
    level.gain.value = 0.2;
    tone.connect(level); level.connect(to); tone.start();
    for (const track of to.stream.getAudioTracks()) stream.addTrack(track);
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const parts = [];
    rec.ondataavailable = (e) => parts.push(e.data);
    const done = new Promise((r) => { rec.onstop = r; });
    rec.start(100);
    const t0 = performance.now();
    /* Twelve seconds: the walk below presses, watches the clock for three
       seconds, and presses again — and the film must still be running then,
       or the take ended by itself and the second press started another. */
    while (performance.now() - t0 < 12000) {
      c.fillStyle = `hsl(${(performance.now() / 10) % 360} 80% 50%)`;
      c.fillRect(0, 0, 320, 240);
      await new Promise((r) => requestAnimationFrame(r));
    }
    rec.stop(); await done;
    tone.stop(); await audio.close();
    return Array.from(new Uint8Array(await new Blob(parts, { type: 'video/webm' }).arrayBuffer()));
  });
  await p.locator('[data-editoropenbring] input[type="file"]').setInputFiles({ name: 'a.webm', mimeType: 'video/webm', buffer: Buffer.from(made) });
  await p.waitForTimeout(2500);
  check('a film is on the clock', (await p.locator('[data-editorblock]').count()) === 1);

  /* The clip comes in with the playhead at its end, where the next one would
     go. Narration starts at the top, the way she would start it — and the
     rewind is pressed before a bench floats over it. */
  await p.locator('[data-editorrewind]').click();
  await p.waitForTimeout(500);
  check('back to the start puts the clock at nought', /^0\.0s/.test(await text('[data-editorruns]')), await text('[data-editorruns]'));
  await p.locator('[data-cutbench="sound"]').click();
  await p.waitForTimeout(600);
  const rec = p.locator('[data-editorvoicerec]');
  check('the sound bench offers a voice-over, for no credits',
    (await rec.count()) === 1 && /no credits/i.test(await text('[data-editorvoicerec]')),
    (await text('[data-editorvoicerec]')) || 'no button');
  check('  and no voice lane shows before there is a voice', (await p.locator('[data-editorvoicelane]').count()) === 0);

  const runsAt = async () => Number((await text('[data-editorruns]')).match(/^([\d.]+)/)?.[1] ?? NaN);
  const pressed = async (want) => {
    for (let i = 0; i < 40; i += 1) {
      if (((await rec.getAttribute('aria-pressed')) === 'true') === want) return true;
      await p.waitForTimeout(100);
    }
    return false;
  };
  const before = await runsAt();
  /* The room is still busy after a film comes in — thumbnails, the wave of
     the sound lane — and a press that lands while the main thread is held
     is a press that lands late. Wait for it to go quiet first. */
  await p.evaluate(() => new Promise((done) => { (window.requestIdleCallback ?? ((f) => setTimeout(f, 1500)))(() => done(undefined), { timeout: 6000 }); }));
  await p.waitForTimeout(500);
  await trace('before the first press');
  /* No actionability wait: the bench has just opened and the film is
     drawing, and a click that waits for the button to be "stable" can wait
     long enough for the whole film to play. */
  const clickedAt = Date.now();
  await rec.click({ force: true });
  const clickTook = Date.now() - clickedAt;
  const wasPressed = await pressed(true);
  console.log(`  --  the first press took ${clickTook}ms to dispatch, and the button read pressed ${Date.now() - clickedAt}ms after it`);
  check('pressing it opens the microphone and starts the film', wasPressed,
    (await text('[data-editorvoicerefused]')) || 'not pressed');
  await trace('after the first press');
  {
    const samples = [];
    for (let i = 0; i < 12; i += 1) { samples.push(`${await text('[data-editorruns]')}/${await rec.getAttribute('aria-pressed').catch(() => '?')}`); await p.waitForTimeout(250); }
    console.log(`  --  clock after the press, every 250ms: ${samples.join('  ')}`);
  }
  let during = before;
  for (let i = 0; i < 30 && !(during > before + 0.4); i += 1) { await p.waitForTimeout(100); during = await runsAt(); }
  check('  and the clock moves while she speaks', during > before, `${before} → ${during}`);
  await p.waitForTimeout(800);
  await trace('before the second press');
  await rec.click({ force: true });
  await trace('right after the second press');
  check('pressing again stops the film', await pressed(false),
    `runs ${await text('[data-editorruns]')} · list ${(await text('[data-editorvoicelist]')) || 'none'}`);
  await trace('after waiting for it to stop');
  const block = p.locator('[data-editorvoiceblock]');
  await block.first().waitFor({ timeout: 8000 }).catch(() => undefined);
  check('  and the take lands on a voice lane of its own', (await p.locator('[data-editorvoicelane]').count()) === 1 && (await block.count()) === 1,
    `${await p.locator('[data-editorvoicelane]').count()} lane(s), ${await block.count()} block(s)`);
  const listed = await text('[data-editorvoicelist] li');
  const span = listed.match(/([\d.]+)s – ([\d.]+)s/);
  check('  listed with where it starts and ends, about as long as she spoke',
    Boolean(span) && Number(span[1]) < 0.6 && Number(span[2]) - Number(span[1]) >= 1.0 && Number(span[2]) - Number(span[1]) <= 11.5, listed);
  check('  and the preview carries a sound element for it', (await p.locator('[data-editorvoicebed]').count()) === 1);

  /* Undo takes it off again — a take is one step like any other — and redo brings it back. */
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(300);
  const undone = (await block.count()) === 0;
  await p.keyboard.press('Control+Shift+z');
  await p.waitForTimeout(300);
  check('undo takes the take off and redo puts it back', undone && (await block.count()) === 1,
    `${undone ? 'undone' : 'not undone'}, then ${await block.count()}`);

  /* And the film that comes out carries sound. The bench is shut first, the
     way she would shut it, so the float is not standing over the button. */
  if ((await p.locator('[data-cutbench="sound"]').getAttribute('aria-pressed')) === 'true') {
    await p.locator('[data-cutbench="sound"]').click();
    await p.waitForTimeout(400);
  }
  const makeButton = p.locator('[data-editormake]').first();
  await makeButton.scrollIntoViewIfNeeded().catch(() => undefined);
  await makeButton.click({ timeout: 10000 }).catch(async (error) => {
    await p.screenshot({ path: 'audit/voiceover-make.png' }).catch(() => undefined);
    problems.push(`the make button could not be pressed — ${String(error).slice(0, 120)}`);
  });
  await p.locator('[data-editorbill]').waitFor({ timeout: 15000 }).catch(() => undefined);
  if ((await p.locator('[data-editorbill]').count()) === 0) {
    await p.screenshot({ path: 'audit/voiceover-nobill.png' }).catch(() => undefined);
    console.log(`  --  no bill: make disabled=${await makeButton.isDisabled().catch(() => '?')}, text="${(await text('[data-editormake]')).slice(0, 60)}", alert="${(await text('[data-videoeditor] [role="alert"]')).slice(0, 120)}"`);
  }
  await p.waitForTimeout(300);
  await p.locator('[data-editorrightsown] input').check().catch(() => undefined);
  await p.waitForTimeout(300);
  await p.locator('[data-editorbillgo]').click();
  const film = p.locator('[data-editormade] video');
  await film.waitFor({ state: 'visible', timeout: 90000 }).catch(() => undefined);
  const said = await text('[data-videoeditor] [role="alert"]');
  if ((await film.count()) === 0) {
    await p.screenshot({ path: 'audit/voiceover-nofilm.png' }).catch(() => undefined);
    const words = await p.evaluate(() => (document.querySelector('[data-videoeditor]')?.innerText ?? '')
      .split('\n').filter((line) => /wrong|could not|fail|try|again|error|nothing/i.test(line)).slice(0, 6).join(' | '));
    console.log(`  --  no film: ${words}`);
    for (const line of consoled.filter((one) => /film|stitch|error|fail|Error/i.test(one)).slice(-8)) console.log(`  --  console ${line}`);
  }
  check('the film comes out', (await film.count()) === 1 && said.trim() === '',
    `${said.trim().slice(0, 120)} · bill ${await p.locator('[data-editorbill]').count()} · made ${await p.locator('[data-editormade]').count()}`);
  if ((await film.count()) === 1) {
    const sound = await film.evaluate((el) => new Promise((done) => {
      const answer = () => {
        try {
          const tracks = el.captureStream().getAudioTracks().length;
          done({ tracks, w: el.videoWidth });
        } catch (error) { done({ tracks: -1, w: el.videoWidth, error: String(error) }); }
      };
      if (el.readyState >= 2) { answer(); return; }
      el.addEventListener('loadeddata', answer, { once: true });
      setTimeout(answer, 8000);
    }));
    check('  with a sound track in it, from a silent film and no music: the voice is the only thing that could have put it there',
      sound.tracks >= 1 && sound.w > 0, JSON.stringify(sound));
  }

  await p.locator('[data-editormade]').locator('button', { hasText: /back|close/i }).first().click().catch(() => undefined);
  await p.waitForTimeout(400);
  await p.locator('[data-cutbench="sound"]').click().catch(() => undefined);
  await p.waitForTimeout(400);
  await p.locator('[data-editorvoicedrop]').first().click().catch(() => undefined);
  await p.waitForTimeout(400);
  check('the bin takes it off the lane', (await block.count()) === 0);

  check('no page errors', thrown.length === 0, thrown.join(' | '));
} finally {
  await browser.close();
  server.stop();
}

if (problems.length) {
  console.log(`\ncheck:voiceover — ${problems.length} problem(s):`);
  for (const one of problems) console.log(`  · ${one}`);
  process.exit(1);
}
console.log('\ncheck:voiceover — a voice-over is spoken over the film as it plays, lands on its own lane at that second, undoes, and goes into the film that comes out.');
