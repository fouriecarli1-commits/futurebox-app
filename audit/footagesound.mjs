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

  check('three AI choices for the shot: the background, an item, and sound',
    (await p.locator('[data-footagejob]').count()) === 3 && (await p.locator('[data-footagejob="sound"]').count()) === 1);
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
console.log('\naudit/footagesound — three AI presses on a shot, sound priced on its button, both yeses asked, and a press that cannot go says why.');
