/**
 * The start frame, with an engine pretended into existence.
 *
 * The desk hides the attachment when no engine declares it, which is right and
 * also means it cannot be seen on a machine with no keys. So the probe's answer
 * is replaced with the shape a configured Premium engine actually returns —
 * the same JSON `app/api/video/route.ts` builds — and the rest is the real
 * component.
 */
import { enter, studio } from './enter.mjs';
import { shot } from './where.mjs';
const { browser, page, problems } = await enter();

await page.route('**/api/video', async (route) => {
  if (route.request().method() !== 'GET') return route.continue();
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      available: true,
      auth: 'api-key',
      grades: ['standard', 'better', 'premium'],
      can: {
        standard: { seconds: [5, 10], aspects: ['16:9', '9:16', '1:1'], speaks: false, startFrame: false },
        premium: { seconds: [5, 10], aspects: ['16:9', '9:16', '1:1'], speaks: true, startFrame: true },
      },
      sound: true,
      startFrame: true,
    }),
  });
});

const room = await studio(page);
await room.locator('button').filter({ hasText: /^Video desk/i }).first().click();
await page.waitForTimeout(1600);

let text = await room.innerText();
console.log('on Standard — says it is a Premium thing:', /Premium grade/i.test(text));

await room.locator('button').filter({ hasText: /^Premium/ }).first().click();
await page.waitForTimeout(900);
text = await room.innerText();
console.log('on Premium — offers the attachment:', /Start from a picture/i.test(text));
console.log('offers the library button:', /Add a picture/i.test(text));

const file = room.locator('input[type="file"]');
console.log('file input present:', await file.count());
if (await file.count()) {
  // A one-pixel PNG is a real picture as far as everything here is concerned.
  await file.first().setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  });
  await page.waitForTimeout(1200);
  text = await room.innerText();
  console.log('strip now lists it:', /Your pictures/i.test(text));
  const kept = await page.evaluate(() => window.localStorage.getItem('futurebox.assets.v1'));
  console.log('kept in the library:', kept ? kept.slice(0, 120) : 'nothing');
}
await page.screenshot({ path: shot('startframe.png') });
console.log('problems:', problems.join(' ;; ') || 'none');
await browser.close();
