/**
 * Pages in the Photo Editor: added, copied, gone through, and saved by tick.
 *
 * The owner, 28 October 2026: *"Photo het nog nie ekstra bladsye wat mens kan
 * add om designs rond te skuif nie. Maak ook export wys al die bladsye, en die
 * bladsye wat gedownload word moet getick kan word en net wat getick is kan
 * gedownload word."*
 *
 * The charge is answered here, so the saves can be counted without credits.
 *
 *   node audit/postpages.mjs [port] [shot-folder]
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3413');
const folder = process.argv[3] || '';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });
const snap = async (name) => { if (folder) await page.screenshot({ path: `${folder}/${name}.png` }); };
const tool = (id) => page.locator(`[data-cutbench="${id}"]`).first();
const now = async () => ((await page.locator('[data-postpagenow]').count()) ? (await page.locator('[data-postpagenow] span').innerText()).trim() : '');

try {
  let charged = 0;
  await page.route('**/api/post/export', (route) => {
    charged += 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, left: 42 }) });
  });
  const saved = [];
  page.on('download', (one) => saved.push(one.suggestedFilename()));

  await studio(page);
  await toRoom(page, 'Photo Editor');
  await page.waitForTimeout(900);

  /* ── One page: nothing about the room changes ── */
  check('a design starts as one page, with no page counter in the way', (await page.locator('[data-postpagenow]').count()) === 0);
  await page.locator('[data-postpagemore]').click();
  await page.waitForTimeout(400);
  check('the Pages tool says what it is for', (await page.locator('[data-postpages]').count()) === 1
    && (await page.locator('[data-postpageadd]').count()) === 1);

  /* ── Added and copied ── */
  await page.locator('[data-postpageadd]').click();
  await page.waitForTimeout(400);
  check('Add a page makes a second page and goes to it', (await now()) === '2/2', await now());
  await page.locator('[data-postpagecopy]').click();
  await page.waitForTimeout(400);
  check('Duplicate this page makes a third, after it', (await now()) === '3/3', await now());
  check('  and the row shows every page', (await page.locator('[data-postpage]').count()) === 3);
  await snap('pages');

  /* ── Gone through, from the corner of the photo ── */
  await page.locator('[data-postpagenow] button').first().click();
  await page.waitForTimeout(300);
  check('the corner arrows go to the page before', (await now()) === '2/3', await now());
  await page.locator('[data-postpage="1"]').click();
  await page.waitForTimeout(300);
  check('  and a page in the row opens that page', (await now()) === '1/3', await now());

  /* ── A page goes only at a second tap ── */
  await page.locator('[data-postpage="3"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-postpagedrop]').click();
  await page.waitForTimeout(200);
  check('one tap on Delete page only asks', (await page.locator('[data-postpage]').count()) === 3);
  await page.locator('[data-postpagedrop]').click();
  await page.waitForTimeout(400);
  check('  and the second deletes it', (await page.locator('[data-postpage]').count()) === 2 && (await now()) === '2/2', await now());
  await page.locator('[data-postpageadd]').click();
  await page.waitForTimeout(400);

  /* ── Words moved from one page to another ── */
  await page.locator('[data-postpage="1"]').click();
  await page.waitForTimeout(300);
  await tool('text').click();
  await page.waitForTimeout(300);
  await page.locator('[data-addwords]').first().click();
  await page.waitForTimeout(300);
  await page.locator('textarea').first().fill('BLADSKUIF');
  await page.waitForTimeout(300);
  await page.locator('[data-postpagemore]').click();
  await page.waitForTimeout(300);
  check('the page’s own layers are listed to choose from', (await page.locator('[data-postpagelayer="words"]').count()) === 1);
  await page.locator('[data-postpagelayer="words"]').click();
  await page.waitForTimeout(200);
  check('  and chosen, they can be moved to another page', (await page.locator('[data-postpagemoveto="2"]').count()) === 1);
  await page.locator('[data-postpagemoveto="2"]').click();
  await page.waitForTimeout(300);
  await tool('layers').click();
  await page.waitForTimeout(300);
  const here = await page.locator('[data-cutroom], body').first().innerText();
  check('  and they leave this page', !here.includes('BLADSKUIF'));
  await page.locator('[data-postpagenow] button').last().click();
  await page.waitForTimeout(400);
  const there = await page.locator('body').innerText();
  check('  and are on the other one', (await now()) === '2/3' && there.includes('BLADSKUIF'), await now());
  await page.locator('[data-postpagenow] button').last().click();
  await page.waitForTimeout(300);

  /* ── Export: every page, ticked; only the ticked ones saved ── */
  await page.locator('[data-postexportopen]').click();
  await page.waitForTimeout(600);
  check('export shows every page, each with a tick', (await page.locator('[data-postexportpage]').count()) === 3
    && (await page.locator('[data-postexportpage][aria-checked="true"]').count()) === 3);
  await page.locator('[data-postexportpage="2"]').click();
  await page.waitForTimeout(200);
  const label = await page.locator('[data-postexport]').first().innerText();
  check('  untapped, a page is left out, and the price says how many', /2 pages/.test(label) && /10/.test(label), label);
  await snap('export');
  await page.locator('[data-postexport]').first().click();
  await page.waitForTimeout(4500);
  check('  and only the ticked pages are saved, each its own file', saved.length === 2
    && saved.some((one) => /-page-1\./.test(one)) && saved.some((one) => /-page-3\./.test(one)) && !saved.some((one) => /-page-2\./.test(one)),
  JSON.stringify(saved));
  check('  each through the one charge', charged === 2, String(charged));
  check('  and the room is back on the page it was on', (await now()) === '3/3', await now());

  /* ── As one PDF: every ticked page in one document ──
     The owner, 29 October 2026: "Say they want to download it in a pdf, then
     the screens must all be on the one document. If it is png then they will
     land seperately on their device." */
  await page.locator('[data-postkind="pdf"]').click();
  await page.waitForTimeout(200);
  const pdfLabel = await page.locator('[data-postexport]').first().innerText();
  check('PDF is offered, and the button says it is one PDF', /one PDF/.test(pdfLabel) && /10/.test(pdfLabel), pdfLabel);
  const before = saved.length;
  const pdfFile = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await page.locator('[data-postexport]').first().click();
  const got = await pdfFile;
  await page.waitForTimeout(3000);
  const pdfPath = got ? await got.path().catch(() => null) : null;
  const { readFileSync } = await import('node:fs');
  const bytes = pdfPath ? readFileSync(pdfPath) : Buffer.alloc(0);
  const sheets = (bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  check('  and the two ticked pages land as one file, a PDF of two pages', saved.length === before + 1
    && /\.pdf$/.test(saved[saved.length - 1] ?? '') && bytes.slice(0, 4).toString() === '%PDF' && sheets === 2,
  `${JSON.stringify(saved.slice(before))}, ${bytes.length} bytes, ${sheets} pages`);
  await page.locator('[data-postexportopen]').click();
  await page.waitForTimeout(400);

  /* ── The pages one under the other, and a plus at the foot ──
     The owner, 29 October 2026: "At the bottom of the photo editor screen
     there must be a plus or add a window ... and then the screen must be
     able to scroll down to the next window." */
  check('every page is on the screen, one under the other', (await page.locator('[data-postpagesheet]').count()) === 3);
  /* The owner, 30 October 2026, with a screenshot: the plus was half under the
     bar at the foot of her phone, and the page counter sat on undo and redo. */
  const placed = await page.evaluate(() => {
    const box = (sel) => document.querySelector(sel)?.getBoundingClientRect();
    const plus = box('[data-postpageplus]');
    const row = box('[data-postpagebar]');
    const undo = box('[data-postundorow]');
    const meet = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    return {
      onScreen: Boolean(plus && plus.top >= 0 && plus.bottom <= innerHeight && plus.left >= 0 && plus.right <= innerWidth),
      clearOfUndo: !meet(row, undo),
      tall: plus ? plus.height : 0,
    };
  });
  check('  the plus is wholly on the screen, a thumb tall, and clear of undo and redo', placed.onScreen && placed.clearOfUndo && placed.tall >= 44, JSON.stringify(placed));
  await page.locator('[data-postpageplus]').click();
  await page.waitForTimeout(1200);
  check('  the plus adds a page and goes to it', (await now()) === '4/4' && (await page.locator('[data-postpagesheet]').count()) === 4, await now());
  await page.locator('[data-postpagestack]').evaluate((el) => el.scrollTo({ top: 0 }));
  await page.waitForTimeout(1200);
  check('  and scrolling up to the first makes it the page being worked on', (await now()) === '1/4', await now());
  /* The owner, 30 October 2026, with Export open: *"Die add a page button gaan
     nou bo oor die pop up bars."* An open tool covers the page row; the row
     never covers the tool. */
  for (const id of ['save', 'text']) {
    await page.locator(`[data-cutbench="${id}"]`).first().click();
    await page.waitForTimeout(700);
    const onTop = await page.evaluate(() => {
      const plus = document.querySelector('[data-postpageplus]')?.getBoundingClientRect();
      if (!plus || plus.width === 0) return false;
      const hit = document.elementFromPoint(plus.left + plus.width / 2, plus.top + plus.height / 2);
      const pop = document.querySelector('[data-postpop]')?.getBoundingClientRect();
      const under = pop && pop.left < plus.right && plus.left < pop.right && pop.top < plus.bottom && plus.top < pop.bottom;
      return Boolean(under && hit?.closest('[data-postpagebar]'));
    });
    check(`  with ${id === 'save' ? 'Export' : 'Text'} open, the page row is not over the tool`, !onTop);
    await page.locator(`[data-cutbench="${id}"]`).first().click();
    await page.waitForTimeout(400);
  }
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\naudit/postpages — ${problems.length} problem(s).`);
  process.exit(1);
}
console.log('\naudit/postpages — pages are added, copied, gone through and deleted at a second tap, and export saves only the ticked ones, each through the charge.');
