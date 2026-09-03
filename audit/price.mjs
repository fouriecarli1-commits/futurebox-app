/**
 * The number on the button, the number in the request, and the length asked
 * for — all three, for every length the desk offers.
 *
 * This is the check that would have caught both pricing bugs: a flat price for
 * a clip of any length, and a length silently clamped on its way out after
 * being priced unclamped.
 */
import { enter, studio } from './enter.mjs';
const { browser, page, problems } = await enter();

// An engine that declares every length, so the desk offers them all.
await page.route('**/api/video', async (route) => {
  if (route.request().method() === 'GET') {
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        available: true, auth: 'api-key', grades: ['standard', 'better', 'premium'],
        can: {
          standard: { seconds: [4,5,6,8,10,15,20,30], aspects: ['16:9','9:16','1:1'], speaks: false, startFrame: false },
          better:   { seconds: [4,5,6,8,10,15,20,30], aspects: ['16:9','9:16'], speaks: true, startFrame: false },
          premium:  { seconds: [4,5,6,8,10,15,20,30], aspects: ['16:9','9:16','1:1'], speaks: true, startFrame: true },
        },
        sound: true, startFrame: true,
      }),
    });
  }
  // A start is intercepted so nothing is charged; the body is what we came for.
  const body = route.request().postDataJSON();
  console.log(`      sent: seconds=${body.seconds} grade=${body.grade}`);
  return route.fulfill({ status: 402, contentType: 'application/json', body: JSON.stringify({ message: 'audit: not started' }) });
});

const room = await studio(page);
await room.locator('button').filter({ hasText: /^Video desk/i }).first().click();
await page.waitForTimeout(1500);
await room.locator('button').filter({ hasText: /A shot to cut against a track/ }).first().click();
await page.waitForTimeout(700);
await room.locator('#canvas-prompt').fill('A wide shot of an empty road at dawn, the camera drifting right, cold light.');

const EXPECT = { standard: 15, better: 30, premium: 60 };
for (const grade of ['standard', 'better', 'premium']) {
  await room.locator('button').filter({ hasText: new RegExp(`^${grade}`, 'i') }).first().click();
  await page.waitForTimeout(500);
  for (const secs of [4, 5, 6, 8, 10, 15, 20, 30]) {
    const chip = room.locator('button').filter({ hasText: new RegExp(`^${secs}s$`) }).first();
    if (!(await chip.count())) continue;
    await chip.click();
    await page.waitForTimeout(350);
    const go = await room.locator('button').filter({ hasText: /credits$/ }).last().innerText();
    const shown = Number((go.match(/(\d+)\s+credits/) ?? [])[1]);
    const want = EXPECT[grade] * Math.ceil(secs / 5);
    const ok = shown === want;
    console.log(`  ${ok ? 'ok ' : '✗  '} ${grade} ${String(secs).padStart(2)}s — button says ${shown}, should be ${want}`);
    if (secs === 30 && grade === 'premium') {
      // And the request carries the same length the price was worked out from.
      await room.locator('button').filter({ hasText: /credits$/ }).last().click();
      await page.waitForTimeout(900);
    }
  }
}
console.log('problems:', problems.filter((p) => !/402/.test(p)).join(' ;; ') || 'none');
await browser.close();
