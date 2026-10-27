/**
 * Every press answers: "Working on it…" while it waits, what went wrong in
 * words when it fails, and why when the button cannot be pressed yet.
 *
 * The owner, 27 October 2026: *"Maak net seker dat alles wat gedoen word reg
 * deur die app altyd 'n button het wat reageer, en dat wanneer iets fout gaan
 * daar 'n verstaanbare vinnige kort notification op kom, of wanneer dinge
 * besig is om te gebeur ook 'n vinnige notification."* (`Notices.tsx`)
 *
 * The server is answered here, so each way a press can end is seen once.
 *
 *   node audit/notices.mjs [port]
 */
import { enter, studio } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3364');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });

/* A press, as the page sees one, then the request it makes. */
const press = (path, method = 'POST') => page.evaluate(async ([where, how]) => {
  document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  try { await fetch(where, { method: how, body: '{}' }); } catch { /* the notice is what is checked */ }
}, [path, method]);
const said = async () => (await page.locator('[data-notice]').count())
  ? { kind: await page.locator('[data-notice]').getAttribute('data-notice'), words: await page.locator('[data-notice]').innerText() }
  : null;

try {
  await page.route('**/api/zz-refused', (r) => r.fulfill({ status: 402, contentType: 'application/json', body: JSON.stringify({ message: 'This costs 12 credits and you have 3.' }) }));
  await page.route('**/api/zz-broken', (r) => r.fulfill({ status: 500, contentType: 'text/html', body: '<h1>500</h1>' }));
  await page.route('**/api/zz-offline', (r) => r.abort('internetdisconnected'));
  await page.route('**/api/zz-slow', async (r) => { await new Promise((done) => { setTimeout(done, 2200); }); await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  await studio(page);
  await page.waitForTimeout(600);

  /* ── Refused, with the server's own sentence ── */
  await press('/api/zz-refused');
  await page.waitForTimeout(300);
  let now = await said();
  check('a refusal says so at once, in the server’s own words', now?.kind === 'wrong' && /12 credits/.test(now.words), JSON.stringify(now));
  const box = await page.locator('[data-notice] p').boundingBox();
  check('  where it can be read, on a phone', !!box && box.y >= 0 && box.y < 120 && box.x >= 0 && box.x + box.width <= 390, JSON.stringify(box));
  await page.waitForTimeout(6500);
  check('  and goes by itself', (await said()) === null);

  /* ── Broken, with no sentence: one is supplied ── */
  await press('/api/zz-broken');
  await page.waitForTimeout(300);
  now = await said();
  check('a failure with no words of its own still says what happened', now?.kind === 'wrong' && /our side|ons kant/i.test(now.words), JSON.stringify(now));
  await page.locator('[data-notice] [role="button"]').click();
  check('  and can be put away with a tap', (await said()) === null);

  /* ── No connection ── */
  await press('/api/zz-offline');
  await page.waitForTimeout(300);
  now = await said();
  check('no connection says so', now?.kind === 'wrong' && /connection|verbinding/i.test(now.words), JSON.stringify(now));
  await page.locator('[data-notice] [role="button"]').click();

  /* ── Waiting ── */
  const slow = press('/api/zz-slow');
  await page.waitForTimeout(1200);
  now = await said();
  check('a press that takes a while says it is working', now?.kind === 'busy' && /Working|Besig/.test(now.words), JSON.stringify(now));
  await slow;
  await page.waitForTimeout(300);
  check('  and the line goes when the work is done', (await said()) === null);

  /* ── A button that cannot be pressed yet ── */
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.textContent = 'Put it together';
    b.disabled = true;
    b.title = 'Bring a clip in first.';
    b.setAttribute('data-zzdead', '');
    b.style.cssText = 'position:fixed;left:20px;top:400px;width:200px;height:48px;z-index:300';
    document.body.append(b);
  });
  const dead = await page.locator('[data-zzdead]').boundingBox();
  await page.mouse.click(dead.x + 20, dead.y + 20);
  await page.waitForTimeout(300);
  now = await said();
  check('a button that cannot be pressed yet still answers, with why', now?.kind === 'why' && /clip in first/.test(now.words), JSON.stringify(now));

  /* ── A button with only an icon says what it does ──
     The owner, 27 October 2026: "Hierdie klein buttons in probooth ook. Ek
     weet nie wat dit doen nie." (`IconTips.tsx`) */
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', 'Loop this part');
    b.setAttribute('data-zzicon', '');
    b.innerHTML = '<svg width="16" height="16"></svg>';
    b.style.cssText = 'position:fixed;right:4px;top:300px;width:44px;height:44px;z-index:300';
    document.body.append(b);
  });
  await page.locator('[data-zzicon]').click();
  await page.waitForTimeout(250);
  const tipped = await page.evaluate(() => {
    const el = document.querySelector('[data-icontip]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { words: el.textContent, inside: r.left >= 0 && r.right <= window.innerWidth && r.bottom <= 300 + 1 };
  });
  check('a button with only an icon says what it does when pressed', tipped?.words === 'Loop this part', JSON.stringify(tipped));
  check('  above it, and on the screen even at the edge', tipped?.inside === true, JSON.stringify(tipped));

  /* ── Nobody pressed anything: the app's own saves stay quiet ── */
  await page.waitForTimeout(9000);
  await page.evaluate(async () => { try { await fetch('/api/zz-refused', { method: 'POST', body: '{}' }); } catch { /* */ } });
  await page.waitForTimeout(300);
  check('a request nobody pressed for says nothing', (await said()) === null || (await said())?.kind === 'why');
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\naudit/notices — ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\naudit/notices — every press says it is working, says what went wrong in words, and a button that cannot be pressed says why.');
