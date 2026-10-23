/**
 * The gallery wall, pressed: a kept piece opens big, can be saved to the
 * device, and comes off the wall only past the grown-up's code and a second
 * question with a way to keep it.
 *
 * The owner, 23 October 2026: *"Wanneer mens op 'n foto kliek moet hy 'n
 * opsie uit pop om te kan download. Ook 'n delete knoppie. Die delete moet
 * nie dadelik delete nie, dit moet ask 'n grown up hê met die kode. Die
 * delete opsie moet ook 'n cancel hê."*
 *
 * Seeded the way `kidsedit.mjs` seeds the wall, straight into the gallery's
 * own store, so the walk does not depend on the drawing board.
 */
import { chromium } from 'playwright';
import { launchOptions, serve } from './where.mjs';

const server = await serve(process.argv[2] || '3381');
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

try {
  await page.goto(`${server.url}/kids`, { waitUntil: 'networkidle' });
  await page.locator('[data-kidsroom]').waitFor({ timeout: 15000 });
  await page.evaluate(async () => {
    const drawn = async (colour) => {
      const c = document.createElement('canvas');
      c.width = 200; c.height = 200;
      const x = c.getContext('2d');
      x.fillStyle = colour; x.fillRect(0, 0, 200, 200);
      return new Promise((done) => c.toBlob(done, 'image/png'));
    };
    const pieces = [
      { id: 'p1', made: Date.now(), kind: 'drawing', title: 'Red rocket', blob: await drawn('#ef4444') },
      { id: 'p2', made: Date.now() - 1, kind: 'drawing', title: 'Blue', blob: await drawn('#3b82f6') },
    ];
    await new Promise((done, fail) => {
      const asked = indexedDB.open('futurebox-kidsgallery', 1);
      asked.onupgradeneeded = () => asked.result.createObjectStore('pieces', { keyPath: 'id' });
      asked.onerror = () => fail(asked.error);
      asked.onsuccess = () => {
        const tx = asked.result.transaction('pieces', 'readwrite');
        for (const one of pieces) tx.objectStore('pieces').put(one);
        tx.oncomplete = () => done();
      };
    });
  });
  await page.locator('[data-kidshome]').first().click().catch(() => undefined);
  await page.locator('[data-kidstabs] [data-kidstab="gallery"]').click();
  const wall = page.locator('[data-kidsgallery]');
  await wall.waitFor({ timeout: 10000 });
  check('two pieces hang on the wall', (await wall.locator('[data-kidspiece]').count()) === 2);
  check('  and nothing on the wall itself is a bin', (await wall.locator('[data-kidspiecebin]').count()) === 0,
    'the bin belongs behind the piece and the code, not on the wall where a thumb lands');

  await wall.locator('[data-kidspieceopen="p1"]').click();
  const sheet = page.locator('[data-kidspiecesheet="p1"]');
  await sheet.waitFor({ timeout: 5000 });
  check('tapping a piece opens it big', await sheet.isVisible());
  const save = sheet.locator('[data-kidspiecesave]');
  check('  with a Save button that hands the file over', (await save.count()) === 1
    && /^blob:/.test((await save.getAttribute('href')) ?? '')
    && /\.png$/.test((await save.getAttribute('download')) ?? ''),
    `${await save.getAttribute('href')} → ${await save.getAttribute('download')}`);
  const tall = await Promise.all(['[data-kidspiecesave]', '[data-kidspiecebin]', '[data-kidspiececlose]']
    .map(async (sel) => (await sheet.locator(sel).boundingBox())?.height ?? 0));
  check('  and every button is a thumb tall', tall.every((h) => h >= 44), tall.join(' '));

  /* The bin: the code first, and closing the pad is a cancel. */
  await sheet.locator('[data-kidspiecebin]').click();
  const pad = page.locator('[data-kidscodepad]');
  await pad.waitFor({ timeout: 5000 });
  check('the bin asks for the grown-up’s code before anything happens', await pad.isVisible());
  check('  and nothing has come off the wall yet', (await wall.locator('[data-kidspiece]').count()) === 2);
  /* The pad's own way out, the last button on it ("Back to the music"). */
  await pad.locator('button').last().click();
  await page.waitForTimeout(300);
  check('  closing the pad cancels: the piece is still open and still on the wall',
    (await pad.count()) === 0 && await sheet.isVisible() && (await wall.locator('[data-kidspiece]').count()) === 2);

  /* Past the code — no code was ever chosen on this device, so any four
     digits pass, which is `codeMatches`’ rule for a grown-up never locked out
     of their own page — comes the second question. */
  await sheet.locator('[data-kidspiecebin]').click();
  await pad.waitFor({ timeout: 5000 });
  for (const d of ['1', '2', '3', '4']) await pad.locator(`[data-kidscodekey="${d}"]`).click();
  const sure = sheet.locator('[data-kidsbinsure]');
  await sure.waitFor({ timeout: 5000 });
  check('the right code leads to a second question, not straight to the bin',
    await sure.isVisible() && (await wall.locator('[data-kidspiece]').count()) === 2);
  await sure.locator('[data-kidsbinkeep]').click();
  await page.waitForTimeout(200);
  check('  and “No, keep it” keeps it', (await sure.count()) === 0 && (await wall.locator('[data-kidspiece]').count()) === 2);

  await sheet.locator('[data-kidspiecebin]').click();
  await pad.waitFor({ timeout: 5000 });
  for (const d of ['1', '2', '3', '4']) await pad.locator(`[data-kidscodekey="${d}"]`).click();
  await sure.waitFor({ timeout: 5000 });
  await sure.locator('[data-kidsbinyes]').click();
  await page.waitForTimeout(500);
  check('“Yes” takes that one piece off the wall and closes the sheet',
    (await sheet.count()) === 0 && (await wall.locator('[data-kidspiece]').count()) === 1
    && (await wall.locator('[data-kidspieceopen="p2"]').count()) === 1);

  check('no page errors', thrown.length === 0, thrown.join(' | '));
} finally {
  await browser.close();
  server.stop();
}

if (problems.length) {
  console.log(`\ncheck:kidsgallerywalk — ${problems.length} problem(s):`);
  for (const one of problems) console.log(`  · ${one}`);
  process.exit(1);
}
console.log('\ncheck:kidsgallerywalk — a kept piece opens big, saves to the device, and comes off the wall only past the grown-up’s code and a second question with a way to keep it.');
