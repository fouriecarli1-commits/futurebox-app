import { enter, studio } from './enter.mjs';
import { shot } from './where.mjs';
const { browser, page, problems } = await enter();

await page.route('**/api/voice', async (route) => {
  if (route.request().method() !== 'GET') return route.continue();
  await route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      configured: true, signedIn: true, tier: 'studio',
      caps: { voices: 3, speakChars: 5000, speakPerDay: 50, clean: true, publish: true },
      mine: [{ id: 'mine-1', name: 'My own voice', about: 'cloned here' }],
      stock: [
        { id: 's1', name: 'Rachel', about: 'American, young, narration', hasSample: true },
        { id: 's2', name: 'Antoni', about: 'American, middle aged, deep', hasSample: true },
        { id: 's3', name: 'Charlotte', about: 'Swedish, seductive, characters', hasSample: true },
        { id: 's4', name: 'Daniel', about: 'British, deep, news', hasSample: true },
        { id: 's5', name: 'Lily', about: 'British, warm, narration', hasSample: true },
        { id: 's6', name: 'George', about: 'British, mature, audiobook', hasSample: true },
        { id: 's7', name: 'Sarah', about: 'American, soft, news', hasSample: true },
        { id: 's8', name: 'Will', about: 'American, friendly, social', hasSample: true },
        { id: 's9', name: 'Alice', about: 'British, confident, adverts', hasSample: true },
      ],
    }),
  });
});

const room = await studio(page);
await room.locator('button').filter({ hasText: /^Your voice/i }).first().click();
await page.waitForTimeout(1800);
const text = await room.innerText();
console.log('picker present:', /Rachel/.test(text) && /American, young, narration/.test(text));
console.log('yours pinned first:', text.indexOf('My own voice') < text.indexOf('Rachel'));
console.log('search box (10 voices > 8):', /An accent, an age, a name/.test(text));
console.log('free-listen note:', /costs nothing and generates nothing/.test(text));

const box = room.locator('input[placeholder*="accent"]');
if (await box.count()) {
  await box.fill('british');
  await page.waitForTimeout(500);
  const after = await room.innerText();
  console.log('filter "british" hides Rachel:', !/Rachel/.test(after), '— keeps Daniel:', /Daniel/.test(after));
  await box.fill('');
}
await room.locator('button').filter({ hasText: /^Antoni/ }).first().click();
await page.waitForTimeout(400);
console.log('choosing marks it:', (await room.innerText()).includes('Antoni'));
await page.screenshot({ path: shot('voicepicker.png') });
console.log('problems:', problems.join(' ;; ') || 'none');
await browser.close();
