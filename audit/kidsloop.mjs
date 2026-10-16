/**
 * The kids room, held to what Carli asked of it on 15 October 2026.
 *
 *   "Plus moet daar nie 'n grown up button binne die studio wees nie want
 *    kinders gaan dit self stel."
 *   "dan het dit sommer die grown up gedeelte geskip" — after signing in.
 *   "Dit sal cool wees as die funksie regtig loops bou."
 *
 * So: no button in the child's room reaches the grown-up's page, and neither
 * does the studio link; holding the FUTUREBOX name opens a code pad, and only
 * the grown-up's code gets past it; the room is remembered, so the front door
 * sends a child back to it; a fresh sign-in opens on the grown-up's page even
 * with an allowance running; and a loop card builds its loop, layer by layer,
 * with layers that switch, and carries into the beat machine.
 *
 * The allowance is answered by a stand-in for /api/kids, as `audit/wide.mjs`
 * does, because no account exists here; everything measured is the page.
 */
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3322');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

const browser = await chromium.launch(launchOptions());
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const thrown = [];
page.on('pageerror', (error) => thrown.push(String(error).slice(0, 160)));
await page.route('**/api/kids', (route) => route.fulfill({
  json: { open: true, allowance: 40, spent: 0, left: 40, minutes: null, secondsLeft: null, signedIn: true },
}));

const hold = async (selector, ms) => {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  const box = await page.locator(selector).first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
  await page.waitForTimeout(300);
};
const typeCode = async (code) => {
  for (const digit of code) await page.locator(`[data-kidscodekey="${digit}"]`).click();
  await page.waitForTimeout(400);
};

try {
  await page.goto(`${server.url}/kids`, { waitUntil: 'networkidle' });
  await page.locator('[data-kidsroom]').waitFor({ timeout: 15000 });

  /* ── No way out for a child ─────────────────────────────────────────── */
  const buttons = await page.locator('[data-kidsroom] button').allInnerTexts();
  check('no button in the child’s room says grown-up',
    !buttons.some((one) => /grown-?up|grootmens/i.test(one)), buttons.filter((one) => /grown/i.test(one)).join(' | '));
  check('  and the studio link is not over the child’s room',
    (await page.getByText(/Back to the studio|Terug na die ateljee/i).count()) === 0);
  check('  and the device remembers a child is in the room',
    (await page.evaluate(() => localStorage.getItem('fb-kids-child-on'))) === '1');
  await page.goto(server.url, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/kids/, { timeout: 10000 }).catch(() => undefined);
  check('  so the studio’s front door sends a child straight back', /\/kids/.test(page.url()), page.url());
  await page.locator('[data-kidsroom]').waitFor({ timeout: 15000 });

  /* ── The grown-up's way in: a hold and a code ───────────────────────── */
  await hold('[data-kidsdreamtitle]', 800);
  check('a short press on the name opens nothing', (await page.locator('[data-kidscodepad]').count()) === 0);
  await hold('[data-kidsdreamtitle]', 3300);
  check('holding the name for three seconds opens the code pad', (await page.locator('[data-kidscodepad]').count()) === 1);
  await typeCode('0000');
  check('  with no code chosen yet, the grown-up is let through to their page',
    (await page.locator('[data-kidscodechooser]').count()) === 1);
  check('  and the studio link is there for the grown-up',
    (await page.getByText(/Back to the studio|Terug na die ateljee/i).count()) > 0);
  check('  and the room lets go of the device', (await page.evaluate(() => localStorage.getItem('fb-kids-child-on'))) === null);

  await page.locator('#kids-code-new').fill('2468');
  await page.locator('#kids-code-again').fill('2468');
  await page.locator('[data-kidscodekeep]').click();
  await page.waitForTimeout(400);
  check('the grown-up chooses a code', /Kept|Gehou/.test(await page.locator('[data-kidscodesaid]').innerText().catch(() => '')));
  await page.getByRole('button', { name: /Back to the music|Terug na die musiek/i }).first().click();
  await page.waitForTimeout(600);
  await hold('[data-kidsdreamtitle]', 3300);
  await typeCode('1111');
  check('a wrong code does not open the grown-up’s page',
    (await page.locator('[data-kidscodewrong]').count()) === 1 && (await page.locator('[data-kidscodechooser]').count()) === 0);
  await typeCode('2468');
  check('  and the right one does', (await page.locator('[data-kidscodechooser]').count()) === 1);
  check('  and the grown-up\u2019s page has a way to sign out', (await page.locator('[data-kidssignout]').count()) === 1);
  await page.getByRole('button', { name: /Back to the music|Terug na die musiek/i }).first().click();
  await page.waitForTimeout(600);
  /* Carli, 16 October 2026: "Ek sukkel om daar uit te kom." A small lock
     opens the same code pad, for a grown-up who cannot find the hold. */
  await page.locator('[data-kidslock]').click();
  await page.waitForTimeout(300);
  check('the lock in the corner opens the code pad', (await page.locator('[data-kidscodepad]').count()) === 1);
  await typeCode('2468');
  check('  and the code takes the grown-up to their page', (await page.locator('[data-kidscodechooser]').count()) === 1);
  await page.getByRole('button', { name: /Back to the music|Terug na die musiek/i }).first().click();
  await page.waitForTimeout(600);
  /* Carli, 16 October 2026: "Daar moet 'n sign out button wees op die
     hoof home screen van die kids studio." Plain to see, behind the code. */
  check('the kids home screen has its own Sign out', await page.locator('[data-kidshomesignout]').isVisible());
  await page.locator('[data-kidshomesignout]').click();
  await page.waitForTimeout(300);
  check('  and it asks for the grown-up\u2019s code first', (await page.locator('[data-kidscodepad]').count()) === 1);
  await typeCode('1111');
  check('  so a wrong code signs nobody out', (await page.locator('[data-kidsroom]').count()) === 1 && /\/kids/.test(page.url()));
  await page.mouse.click(4, 4);
  await page.waitForTimeout(300);

  /* ── After a sign-in, the grown-up's page first ─────────────────────── */
  await page.evaluate(() => localStorage.setItem('fb-kids-signed-in', String(Date.now())));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  check('just signed in, the grown-up’s page shows even with an allowance running',
    (await page.locator('[data-kidscodechooser]').count()) === 1);
  await page.getByRole('button', { name: /Back to the music|Terug na die musiek/i }).first().click();
  await page.waitForTimeout(600);

  /* ── A loop that really builds ──────────────────────────────────────── */
  await page.locator('[data-kidstab="music"]').first().click();
  await page.waitForTimeout(600);
  await page.locator('[data-kidsloop="dino"]').click();
  await page.waitForTimeout(400);
  const first = await page.locator('[data-kidsloopsays]').getAttribute('data-kidsloopsays').catch(() => null);
  const inFirst = await page.locator('[data-kidslayerin="yes"]').count();
  check('a loop card starts building its loop, one layer first', first === 'building' && inFirst === 1, `${first}, ${inFirst} in`);
  await page.waitForTimeout(9000);
  const built = await page.locator('[data-kidsloopsays]').getAttribute('data-kidsloopsays').catch(() => null);
  check('  and the other layers join until it is built', built === 'built'
    && (await page.locator('[data-kidslayerin="yes"]').count()) === 4, String(built));
  const drums = page.locator('[data-kidslayer="drums"]');
  await drums.click();
  await page.waitForTimeout(300);
  check('  a layer switches off', (await drums.getAttribute('aria-pressed')) === 'false');
  await drums.click();
  await page.waitForTimeout(300);
  check('  and on again', (await drums.getAttribute('aria-pressed')) === 'true');
  await page.locator('[data-kidsloopmix]').click();
  await page.locator('[data-kidsloopfaster]').click();
  await page.waitForTimeout(300);
  check('  mixing it up and speeding it up keep it playing',
    (await page.locator('[data-kidsloopbuilder="dino"]').count()) === 1);
  await page.locator('[data-kidslooptobeat]').click();
  await page.waitForTimeout(600);
  check('  and it carries into the beat machine',
    (await page.locator('[data-kidstobeat]').getAttribute('aria-pressed')) === 'true'
    && (await page.locator('[data-kidsloopbuilder]').count()) === 0);

  /* ── The Story Maker, a door of its own, and a book that reads ────────
     Carli, 15 October 2026: "Ek sien ook nie die story mode waar kinders
     kinder stories ontwikkel nie", then "Read to me werk nie" beside a page
     that printed "kids.heroDinoTitle". */
  await page.locator('[data-kidshome]').first().click().catch(() => undefined);
  await page.waitForTimeout(500);
  const storyDoor = page.locator('[data-kidsroomdoor="story"]');
  check('the Story Maker is a door on the kids home page', (await storyDoor.count()) === 1);
  await storyDoor.click();
  await page.waitForTimeout(500);
  await page.locator('[data-kidsworld]').first().click();
  for (let i = 0; i < 6 && (await page.locator('[data-kidsstorybuild]').count()) === 0; i += 1) {
    await page.locator('[data-kidsstorynext]').first().click();
    await page.waitForTimeout(250);
  }
  await page.locator('[data-kidsstorybuild]').click();
  await page.locator('[data-kidsreader]').waitFor({ timeout: 15000 });
  const book = await page.locator('[data-kidsreader]').innerText();
  check('  and the book it makes says names, not keys', !/kids\.[a-zA-Z]/.test(book),
    (book.match(/kids\.[a-zA-Z]+/g) ?? []).slice(0, 3).join(', '));
  const prose = await page.locator('[data-kidspagetext]').evaluate((el) => {
    const parse = (c) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => {
      const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    let box = el;
    while (box && getComputedStyle(box).backgroundColor.replace(/\s/g, '').endsWith(',0)')) box = box.parentElement;
    const a = lum(parse(getComputedStyle(el).color));
    const b = lum(parse(getComputedStyle(box ?? document.body).backgroundColor));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  check('  and its words can be read on their page', prose >= 4.5, `contrast ${prose.toFixed(2)}:1`);
  await page.evaluate(() => {
    window.__said = [];
    window.speechSynthesis.speak = (one) => { window.__said.push(one.text); setTimeout(() => one.onend?.(), 50); };
    window.speechSynthesis.cancel = () => {};
  });
  await page.locator('[data-kidsreadtome]').click();
  await page.waitForTimeout(1200);
  const said = await page.evaluate(() => window.__said);
  check('  Read to me reads the pages aloud, one after the other, to the end',
    said.length === 4 && said.every((one) => one.length > 20 && !/kids\./.test(one)), JSON.stringify(said).slice(0, 160));

  /* ── Bring it to life ─────────────────────────────────────────────────
     Carli, 16 October 2026: "Bring it to life button does nothing." It
     threw before it sent anything — a name read before it was declared in
     `packDrawing` — and what it would have said landed under the bottom bar.
     The engine is a stand-in here; what is measured is that the press goes
     out, as the kids room's, and that the answer is on the screen. */
  const sent = [];
  await page.route('**/api/google/picture', async (route) => {
    sent.push(route.request().postDataJSON());
    const dot = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await route.fulfill({ status: 200, contentType: 'image/png', body: dot });
  });
  await page.locator('[data-kidshome]').first().click().catch(() => undefined);
  await page.waitForTimeout(400);
  await page.locator('[data-kidstab="draw"]').first().click();
  await page.waitForTimeout(600);
  const paper = page.locator('[data-kidspaper]');
  await paper.scrollIntoViewIfNeeded();
  const pb = await paper.boundingBox();
  await page.mouse.move(pb.x + 50, pb.y + 50);
  await page.mouse.down();
  for (let step = 0; step < 15; step += 1) await page.mouse.move(pb.x + 50 + step * 8, pb.y + 50 + step * 6);
  await page.mouse.up();
  await page.waitForTimeout(800);
  await page.locator('[data-kidsalive]').click();
  await page.locator('[data-kidsaliveout], [data-kidsalivesays]').first().waitFor({ timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(900);
  check('Bring it to life sends the drawing, as the kids room’s', sent.length === 1 && sent[0]?.kids === true && Boolean(sent[0]?.from?.data),
    `${sent.length} sent`);
  const shown = await page.evaluate(() => {
    const el = document.querySelector('[data-kidsaliveout]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const bar = document.querySelector('[data-kidstabs]')?.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, barTop: bar ? bar.top : innerHeight, height: innerHeight };
  });
  check('  and the picture it brings back is on the screen, not under the bar',
    shown !== null && shown.top >= 0 && shown.top < shown.barTop, JSON.stringify(shown));
  /* Last, because it ends the visit: the right code signs out for real. */
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('[data-kidsroom]').waitFor({ timeout: 15000 });
  if (await page.locator('[data-kidshome]').count()) { await page.locator('[data-kidshome]').first().click(); await page.waitForTimeout(400); }
  await page.locator('[data-kidshomesignout]').click();
  await page.waitForTimeout(300);
  /* With a code on the device the pad asks for it; with none (an earlier
     step forgot it) there is nothing to ask, and it signs out at once. */
  if (await page.locator('[data-kidscodepad]').count()) await typeCode('2468');
  await page.waitForURL((url) => !/\/kids/.test(String(url)), { timeout: 10000 }).catch(() => undefined);
  check('Sign out leaves the kids room and the account', !/\/kids/.test(page.url())
    && (await page.evaluate(() => localStorage.getItem('fb-kids-child-on'))) === null, page.url());
  check('and nothing throws', thrown.length === 0, thrown.slice(0, 2).join(' · '));
  await page.screenshot({ path: shot('kidsloop.png') });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 200)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:kidsloop — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:kidsloop — no grown-up button in the kids room, a hold and a code for the grown-up,'
  + ' the grown-up’s page after a sign-in, loops that really build, and a storybook that reads itself.');
