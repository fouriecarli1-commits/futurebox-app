/** Does the rail actually show a waiting ask? Faked threads, real component. */
import { enter, studio } from './enter.mjs';
const { browser, page, problems } = await enter();
await page.route('**/api/collab*', async (route) => {
  if (route.request().method() !== 'GET') return route.continue();
  await route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      signedIn: true, ready: true,
      threads: [
        { id: 't1', state: 'pending', mine: false, name: 'Someone', handle: 'someone', because: 'hi', createdAt: '2026-09-01' },
        { id: 't2', state: 'pending', mine: false, name: 'Another', handle: 'another', because: 'hi', createdAt: '2026-09-02' },
        // Yours, waiting on them — must not be counted.
        { id: 't3', state: 'pending', mine: true, name: 'Third', handle: 'third', because: 'hi', createdAt: '2026-09-02' },
        // Already answered — must not be counted.
        { id: 't4', state: 'accepted', mine: false, name: 'Fourth', handle: 'fourth', because: 'hi', createdAt: '2026-09-02' },
      ],
    }),
  });
});
const room = await studio(page);
await page.waitForTimeout(2500);
const rail = room.locator('button').filter({ hasText: /^Collab Radar/ }).first();
const text = (await rail.innerText()).replace(/\n/g, ' ');
console.log('rail entry reads:', JSON.stringify(text));
console.log('counts only asks pointed at you (expects 2):', /\b2\b/.test(text));
await page.screenshot({ path: 'audit/badge.png' });
console.log('problems:', problems.join(' ;; ') || 'none');
await browser.close();
