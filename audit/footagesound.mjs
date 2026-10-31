/**
 * The Video Editor's AI presses on a shot: the background out, an item out,
 * and sound for a silent shot.
 *
 * The owner, 29 October 2026: *"Gaan aan met take"* — step 2 of the fal.ai
 * plan, sound for my clip. fal.ai is not called, and nothing is sent: what
 * is tested is the room — the three choices, the price on the button, the
 * two yeses, and a press that says why when it cannot go.
 *
 *   node audit/footagesound.mjs [port]
 */
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = process.argv[2] || '3493';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

const server = await serve(PORT);
const { browser, page: p } = await enter({ at: server.url, lang: 'en', width: 390, height: 844, touch: true });
const thrown = [];
p.on('pageerror', (e) => thrown.push(String(e).slice(0, 160)));

try {
  await studio(p);
  await toRoom(p, 'Video Editor');
  await unfold(p);

  /* A silent four-second shot off a canvas. */
  const made = await p.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 240;
    const c = canvas.getContext('2d');
    const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: 'video/webm' });
    const parts = [];
    rec.ondataavailable = (e) => parts.push(e.data);
    const done = new Promise((r) => { rec.onstop = r; });
    rec.start(100);
    const t0 = performance.now();
    while (performance.now() - t0 < 4000) {
      c.fillStyle = `hsl(${(performance.now() / 10) % 360} 80% 50%)`;
      c.fillRect(0, 0, 320, 240);
      await new Promise((r) => requestAnimationFrame(r));
    }
    rec.stop(); await done;
    return Array.from(new Uint8Array(await new Blob(parts, { type: 'video/webm' }).arrayBuffer()));
  });
  const clip = Buffer.from(made);

  let started = null;
  await p.route('**/api/footage**', async (route) => {
    const req = route.request();
    if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: 'done', url: `${server.url}/probe-sound.webm` }) });
    const body = req.postDataJSON() ?? {};
    if (body.step === 'upload') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ path: 'me/footage/probe.webm', token: 'probe' }) });
    started = body;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ticket: 'probe-ticket', credits: 3 }) });
  });
  await p.route('**/storage/v1/object/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'videos/me/footage/probe.webm', path: 'me/footage/probe.webm' }) }));
  await p.route('**/probe-sound.webm', (route) => route.fulfill({ status: 200, contentType: 'video/webm', body: clip }));

  await p.locator('[data-editoropenbring] input[type="file"]').setInputFiles({ name: 'shot.webm', mimeType: 'video/webm', buffer: clip });
  await p.waitForTimeout(2500);
  check('a shot is on the clock', (await p.locator('[data-editorblock]').count()) === 1);
  await p.locator('[data-editorblock]').first().click();
  await p.waitForTimeout(400);
  await p.locator('[data-cutbench="film"]').first().click();
  await p.waitForTimeout(800);
  await p.locator('[data-footage]').scrollIntoViewIfNeeded().catch(() => undefined);

  check('five AI choices for the shot: change it, an item, the background, a new shape, and sound',
    (await p.locator('[data-footagejob]').count()) === 6 && (await p.locator('[data-footagejob="sound"]').count()) === 1);

  /* ── Change it in words, and a new shape (30 October 2026) ──────────
     The owner: changes on a video go through the whole clip. Both are
     priced per five seconds on the button, and wait for what they need. */
  await p.locator('[data-footagejob="change"]').click();
  await p.waitForTimeout(300);
  const changeGo = p.locator('[data-footagego]');
  check('changing it in words says its price on the button', /Change every frame/.test(await changeGo.innerText()) && /credit/.test(await changeGo.innerText()), await changeGo.innerText());
  check('  and offers ideas to change it with, dealt again on a press', (await p.locator('[data-footage] [data-ideachip]').count()) >= 3 && (await p.locator('[data-footage] [data-idearefresh]').count()) === 1);
  await p.locator('[data-footage] [data-ideachip]').first().click();
  check('  and a picked idea lands in the words', (await p.locator('[data-footagechangewords]').inputValue()).length > 4);
  await p.locator('[data-footagejob="reframe"]').click();
  await p.waitForTimeout(300);
  check('a new shape offers tall, square, portrait and wide, tall first', (await p.locator('[data-footageshape]').count()) === 4
    && (await p.locator('[data-footageshape="9:16"]').getAttribute('aria-pressed')) === 'true');
  await p.locator('[data-footageshape="1:1"]').click();
  check('  and the one pressed is the one chosen', (await p.locator('[data-footageshape="1:1"]').getAttribute('aria-pressed')) === 'true');
  check('  with its price on the button', /Fill it to the new shape/.test(await changeGo.innerText()) && /credit/.test(await changeGo.innerText()), await changeGo.innerText());
  /* ── Sing it (31 October 2026): a face's lips moved to the song under the
     shot. With no song under this film it says so and stays shut, and it
     asks a third yes: the face is the person at the screen, or made here. */
  await p.locator('[data-footagejob="lipsync"]').click();
  await p.waitForTimeout(300);
  const singLabel = (await changeGo.innerText()).replace(/\s+/g, ' ');
  check('Sing it says its one price on the button', /Make it sing/.test(singLabel) && /13 credits/.test(singLabel), singLabel);
  check('  says a song must be under the film first, when there is none', (await p.locator('[data-footagenosong]').count()) === 1);
  check('  and asks that the face is yours, or a character made here', (await p.locator('[data-footageownface]').count()) === 1);
  await p.locator('[data-footageabroad]').check();
  await p.locator('[data-footageadult]').check();
  await p.locator('[data-footageownface]').check();
  check('  and stays shut with no song to sing, all three ticked', await changeGo.isDisabled());
  await p.locator('[data-footageabroad]').uncheck();
  await p.locator('[data-footageadult]').uncheck();
  await p.locator('[data-footagejob="sound"]').click();
  await p.waitForTimeout(300);
  const go = p.locator('[data-footagego]');
  const label = (await go.innerText()).replace(/\s+/g, ' ');
  check('  sound says its one price on the button', /Give it sound/.test(label) && /3 credits/.test(label), label);
  check('  and waits for the two yeses', await go.isDisabled());
  await p.locator('[data-footagesoundwords]').fill('rain on a tin roof');
  await p.locator('[data-footageabroad]').check();
  await p.locator('[data-footageadult]').check();
  check('  then it can be pressed, with no words needed', !(await go.isDisabled()));
  /* Signed out (this build has no accounts), the press says why rather than
     sending a clip for nobody. What is sent once signed in is held by
     `check:falwire`, which reads the route and `inputFor`. */
  await go.click();
  await p.waitForTimeout(800);
  check('  pressed signed out, it says to sign in, and sends nothing',
    /Sign in first/.test(await p.locator('[data-footagesaid]').innerText().catch(() => '')) && started === null);
  check('no page errors', thrown.length === 0, thrown.join(' | '));
} catch (problem) {
  check('the walk itself', false, String(problem).slice(0, 300));
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\naudit/footagesound — ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\naudit/footagesound — five AI presses on a shot, sound priced on its button, both yeses asked, and a press that cannot go says why.');
