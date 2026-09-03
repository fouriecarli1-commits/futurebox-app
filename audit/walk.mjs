/**
 * Walk every room in the studio and report what is broken.
 *
 * For each room: open it, wait, screenshot, and count the controls. Nothing is
 * pressed here — this pass establishes that every room mounts and renders
 * without throwing, which is the thing that has to be true before pressing
 * anything means much.
 */
import { enter, studio } from './enter.mjs';

const ROOMS = [
  'Make a song', 'Studio', 'The Booth', 'Your voice', 'Soundboard',
  'Music video', 'Video desk', 'Hooks', 'Channel', 'Live', 'Podcast',
  'Adverts', 'Collab Radar',
];

const { browser, page, problems } = await enter();
const room = await studio(page);
const report = [];

for (const name of ROOMS) {
  const before = problems.length;
  try {
    // The rail entry, not a mention of the same words in the body.
    await room.locator('button').filter({ hasText: new RegExp(`^${name}`, 'i') }).first().click({ timeout: 8000 });
    await page.waitForTimeout(1400);
  } catch (e) {
    report.push({ name, ok: false, why: `could not open: ${String(e).slice(0, 120)}` });
    continue;
  }
  const text = await room.innerText().catch(() => '');
  const buttons = await room.locator('button:visible').count();
  const inputs = await room.locator('input:visible, textarea:visible, select:visible').count();
  const fresh = problems.slice(before);
  report.push({
    name,
    ok: text.length > 200 && fresh.length === 0,
    chars: text.length,
    buttons,
    inputs,
    fresh,
  });
  await page.screenshot({ path: `audit/room-${name.replace(/\W+/g, '-').toLowerCase()}.png` });
}

console.log('room'.padEnd(16), 'chars'.padStart(7), 'btns'.padStart(5), 'inputs'.padStart(7), '  issues');
for (const r of report) {
  if (r.ok === false && r.why) { console.log(r.name.padEnd(16), '  --  ', r.why); continue; }
  console.log(
    r.name.padEnd(16),
    String(r.chars).padStart(7),
    String(r.buttons).padStart(5),
    String(r.inputs).padStart(7),
    '  ' + (r.fresh.length ? r.fresh.join(' ;; ') : 'clean'),
  );
}
console.log('\n=== ALL PROBLEMS ===');
console.log(problems.join('\n') || 'none');
await browser.close();
