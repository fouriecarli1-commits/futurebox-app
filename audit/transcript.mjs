/** The transcript panel, with a show and one published episode pretended in. */
import { enter, studio } from './enter.mjs';
import { shot } from './where.mjs';
const { browser, page, problems } = await enter();

await page.route('**/api/show*', async (route) => {
  if (route.request().method() !== 'GET') return route.continue();
  await route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      configured: true, signedIn: true,
      show: { id: 'show-1', title: 'Two People Talking', description: 'A show', author: 'Anre', language: 'en', image_url: '' },
      episodes: [{
        id: 'ep-1', title: 'The first one', notes: 'Notes', made: 'spoken',
        seconds: 1800, audio_path: 'ep-1.mp3', published_at: '2026-09-01',
      }],
    }),
  });
});
await page.route('**/api/transcribe', async (route) => {
  await route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      words: [],
      text: 'hello there',
      turns: [
        { speaker: 'speaker_0', start: 0.4, end: 6.2, text: 'Welcome back. This week we are talking about the one thing nobody warns you about.' },
        { speaker: 'speaker_1', start: 6.6, end: 11.0, text: 'And I still think you are wrong about it.' },
        { speaker: 'speaker_0', start: 11.4, end: 14.9, text: 'You have said that every week for a year.' },
      ],
    }),
  });
});
// The audio fetch the panel makes before posting.
await page.route('**/*.mp3', (route) => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.from([0xff, 0xfb, 0x90, 0x00]) }));

const room = await studio(page);
await room.locator('button').filter({ hasText: /^Podcast/i }).first().click();
await page.waitForTimeout(2000);
let text = await room.innerText();
console.log('episode listed:', /The first one/.test(text));
console.log('transcript button:', /What was said/.test(text));

const btn = room.locator('button').filter({ hasText: /^What was said$/ }).first();
if (await btn.count()) {
  await btn.click();
  await page.waitForTimeout(800);
  text = await room.innerText();
  console.log('panel opens with a price:', /Read it back/.test(text) && /credits|krediete/.test(text));
  await room.locator('button').filter({ hasText: /^Read it back/ }).first().click();
  await page.waitForTimeout(1800);
  text = await room.innerText();
  console.log('turns shown:', /nobody warns you about/.test(text));
  console.log('timestamps shown:', /0:00|0:06|0:11/.test(text));
  console.log('speaker naming offered:', /Who is who/.test(text));
  const box = room.locator('input[aria-label*="Name for"]').first();
  if (await box.count()) {
    await box.fill('Anre');
    await page.waitForTimeout(500);
    console.log('renaming takes effect:', (await room.innerText()).includes('Anre —'));
  }
  await page.screenshot({ path: shot('transcript.png') });
}
console.log('problems:', problems.join(' ;; ') || 'none');
await browser.close();
