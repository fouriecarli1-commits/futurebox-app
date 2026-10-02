/**
 * She comes back to the room she left, not to the front of the app.
 *
 * ── The fault this exists for ────────────────────────────────────────────
 *
 * Carli, 30 September 2026: *"wanneer ek die app minimize en weer terug gaan
 * … Hy gooi jou heeltemal uit en vergeet waarmee hy besig was."*
 *
 * Almost word for word what she said about the Pro Booth on 9 September, which
 * became `lib/keepsession.ts`. Only half that lesson was learnt then: the
 * booth's takes were made to survive leaving the room, and WHICH ROOM SHE WAS
 * IN was not. `studioTab` lived in React state and nothing else, so a tab
 * Android had reclaimed for a camera or a file picker came back as `'make'`.
 *
 * She was never signed out and nothing saved was lost. She was put back at the
 * front of a room she was not in, which from the outside is the same thing.
 *
 * ── Why a reload is the right way to test it ─────────────────────────────
 *
 * A discarded tab is put back by loading the page again in the same tab, with
 * `sessionStorage` intact — which is exactly what `page.reload()` does. There
 * is no way to ask a browser to discard a tab on demand, and a test that
 * mocked one would be testing the mock.
 *
 * ── The third check is the one that gives the other two teeth ────────────
 *
 * Clearing the memory and reloading has to put her back at the front. Without
 * it, both checks above would pass on an app that simply opened the video desk
 * for everybody — green for a reason that has nothing to do with the fix.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = 3331;
const problems = [];

const check = (what, passed, detail = '') => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) problems.push(what);
};

const server = await serve(PORT);
const { browser: b, page: p } = await enter({ at: server.url, lang: 'en' });
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));

/**
 * The video desk, told by something only it draws.
 *
 * Either marker counts, and that is deliberate. `data-videoeditor` is drawn
 * when the plan allows the editor and `data-editorlocked` when it does not,
 * so testing only the first measures the PLAN as much as the room — and a
 * plan that is still loading would report the room as missing. Both mean the
 * same thing here: the video desk is what is on screen.
 */
const inTheVideoDesk = async () =>
  (await p.locator('[data-videoeditor], [data-editorlocked]').count()) >= 1;

try {
  await studio(p);
  await toRoom(p, 'Video Editor');
  await p.waitForTimeout(800);

  check('she is in the room she walked into', await inTheVideoDesk());

  /* The tab, thrown away and put back. */
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);

  check('and after the tab is reloaded she is still in it',
    await inTheVideoDesk(),
    'this is the whole complaint: minimise, come back, and be at the front of the app again');

  /* And the memory is what is doing it. */
  await p.evaluate(() => { try { window.sessionStorage.clear(); } catch { /* off */ } });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);

  check('  and with the memory cleared she is back at the front',
    !(await inTheVideoDesk()),
    'the two checks above would pass on an app that opened the video desk for everybody');

} catch (thrown) {
  problems.push(`threw: ${String(thrown).slice(0, 200)}`);
} finally {
  if (b) await b.close().catch(() => undefined);
  server.stop();
}

if (problems.length > 0) {
  console.error(`\ncheck:whereiwas — ${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\ncheck:whereiwas — a reloaded tab comes back to the room she was in, and a cleared one does not.');
