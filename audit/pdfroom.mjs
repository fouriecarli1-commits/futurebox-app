/**
 * The document room, walked: a PDF opened, changed with each tool, saved,
 * and the saved file read back by a different reader.
 *
 * Carli, 17 October 2026: *"Die PDF craft is nogal belangrik."* What fails
 * quietly in a PDF tool is the file
 * that looks right on the screen and is wrong on disk — a redaction that only
 * covers the words, a password that was never put on, a signature that was
 * drawn and never written in. So every check that matters here is made on
 * the downloaded file, with pdf.js in Node, not on the room's own screen.
 */
import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFile } from 'node:fs/promises';
import { enter, studio } from './enter.mjs';
import { serve, shot } from './where.mjs';

const server = await serve(process.argv[2] || '3354');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

/** Three pages, the second one with a secret on it. */
async function sample() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const [k, words] of [[1, 'Page one of the contract'], [2, 'Secret account 4411'], [3, 'Page three']]) {
    const page = doc.addPage([595, 842]);
    page.drawText(words, { x: 60, y: 760, size: 24, font });
    page.drawText(`Footnote ${k}`, { x: 60, y: 80, size: 10, font });
  }
  doc.setTitle('Hidden title');
  return Buffer.from(await doc.save());
}

/** A saved file, read by pdf.js: each page's words and comment kinds, and whether it painted a picture. */
async function read(data, password) {
  const task = pdfjs.getDocument({ data: new Uint8Array(data), password, verbosity: 0 });
  const doc = await task.promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const text = (await page.getTextContent()).items.map((one) => one.str).join(' ');
    const annots = (await page.getAnnotations()).map((one) => one.subtype);
    const ops = await page.getOperatorList();
    const pictures = ops.fnArray.filter((fn) => fn === pdfjs.OPS.paintImageXObject).length;
    const view = page.getViewport({ scale: 1 });
    pages.push({ text, annots, pictures, w: Math.round(view.width), h: Math.round(view.height) });
  }
  await task.destroy();
  return pages;
}

const { browser, page } = await enter({ width: 390, height: 844, touch: true, at: server.url });
page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));

/** Press Save and read what was downloaded. */
async function saved() {
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.locator('[data-pdfsave]').click()]);
  return readFile(await download.path());
}
const tool = async (id) => {
  await page.locator('[data-pdftoolsopen]').click();
  await page.waitForTimeout(300);
  await page.locator(`[data-pdftool="${id}"]`).click();
  await page.waitForTimeout(700);
};
const pen = async (id) => {
  await page.locator(`[data-pdfpen="${id}"]`).click();
  await page.waitForTimeout(200);
};
/** A tap or a drag on the page as shown, in fractions of it. */
const onPage = async (u, v, u2 = null, v2 = null) => {
  /* The page is taller than a phone: scroll the spot to the middle of the
     screen first, the way a thumb would. */
  await page.evaluate((middle) => {
    const glassEl = document.querySelector('[data-pdfglass]');
    const main = document.querySelector('[data-pdfroom] main');
    const r = glassEl.getBoundingClientRect();
    main.scrollTop += r.top + r.height * middle - window.innerHeight / 2;
  }, v2 === null ? v : (v + v2) / 2);
  await page.waitForTimeout(150);
  const box = await page.locator('[data-pdfglass]').boundingBox();
  const x = box.x + box.width * u;
  const y = box.y + box.height * v;
  await page.mouse.move(x, y);
  await page.mouse.down();
  if (u2 !== null) {
    for (let k = 1; k <= 6; k += 1) await page.mouse.move(x + (box.width * u2 - box.width * u) * (k / 6), y + (box.height * v2 - box.height * v) * (k / 6));
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
};
const pageNumber = async () => (await page.locator('[data-pdfname]').innerText()).match(/(\d+) (?:page|bladsy)/)?.[1];

try {
  await studio(page);
  await page.waitForTimeout(600);
  await page.locator('[data-opentools]:visible').first().click();
  await page.waitForTimeout(400);
  check('All tools has a Documents shelf', (await page.locator('[data-alltoolsgroup="docs"]').count()) === 1
    || (await page.locator('[data-alltool="pdf"]').count()) === 1);
  await page.locator('[data-alltool="pdf"]').click();
  await page.waitForTimeout(1500);
  check('PDF studio opens the document room on its front page', (await page.locator('[data-pdfroom] [data-pdffront]').count()) === 1);
  check('  with every tool on it', (await page.locator('[data-pdffronttool]').count()) === 9);
  await page.screenshot({ path: shot('pdfroom-front.png') });

  await page.locator('[data-pdfopen]').setInputFiles({ name: 'contract.pdf', mimeType: 'application/pdf', buffer: await sample() });
  await page.waitForTimeout(1500);
  check('a PDF opens, and the room says how many pages', (await pageNumber()) === '3', await page.locator('[data-pdfname]').innerText().catch(() => ''));

  /* ── Organise ── */
  await tool('organise');
  check('Organise shows every page small', (await page.locator('[data-pdfthumb]').count()) === 3);
  await page.locator('[data-pdfthumb="2"]').click();
  await page.locator('[data-pdforg="delete"]').click();
  await page.waitForTimeout(1200);
  check('  a chosen page can be deleted', (await pageNumber()) === '2');
  await page.locator('[data-pdfundo]').click();
  await page.waitForTimeout(1200);
  check('  and Undo puts it back', (await pageNumber()) === '3');
  await page.locator('[data-pdfthumb="0"]').click();
  await page.locator('[data-pdforg="right"]').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shot('pdfroom-organise.png') });
  let file = await read(await saved());
  check('  and a page turned right is saved sideways', file[0].w === 842 && file[0].h === 595, `${file[0].w}×${file[0].h}`);
  /* Still chosen from turning it right: turned back the other way. */
  await page.locator('[data-pdforg="left"]').click();
  await page.waitForTimeout(1200);

  /* ── Edit: change words that are there, and add some ── */
  await tool('edit');
  await pen('retype');
  /* "Page one of the contract", 24pt at 60,760 on an 842-tall page. */
  await onPage(0.2, (842 - 768) / 842);
  const retyped = page.locator('[data-pdfmarktext]');
  check('Edit text finds the line of words that was tapped', (await retyped.count()) === 1 && /Page one/.test(await retyped.inputValue()), await retyped.inputValue().catch(() => ''));
  await retyped.fill('Page one of the agreement');
  await pen('text');
  await onPage(0.1, 0.5);
  await page.locator('[data-pdfmarktext]').fill('Added by hand');
  await page.locator('[data-pdfapply]').click();
  await page.waitForTimeout(1200);
  await page.locator('[data-pdfwhole] summary').click();
  await page.locator('[data-pdfdo="watermark"]').click();
  await page.waitForTimeout(1500);
  file = await read(await saved());
  check('  the new words are in the saved file', file[0].text.includes('Page one of the agreement') && file[0].text.includes('Added by hand'), file[0].text);
  check('  and a watermark is on every page', file.every((p) => /CONFIDENTIAL|VERTROULIK/.test(p.text)));

  /* ── Comment ── */
  await tool('comment');
  await pen('note');
  await onPage(0.85, 0.2);
  await page.locator('[data-pdfmarktext]').fill('Check this clause');
  await pen('highlight');
  await onPage(0.12, (842 - 768) / 842);
  file = await read(await saved());
  check('a sticky note and a highlight are comments in the saved file', file[0].annots.includes('Text') && file[0].annots.includes('Highlight'), file[0].annots.join());

  /* ── Fill and sign ── */
  await tool('sign');
  await pen('tick');
  await onPage(0.5, 0.6);
  await page.locator('[data-pdfpen="signature"]').click();
  await page.waitForTimeout(300);
  check('Signature opens a pad to sign on', (await page.locator('[data-pdfpad]').count()) === 1);
  const sheet = await page.locator('[data-pdfpadsheet]').boundingBox();
  await page.mouse.move(sheet.x + sheet.width * 0.2, sheet.y + sheet.height * 0.6);
  await page.mouse.down();
  for (let k = 0; k <= 12; k += 1) await page.mouse.move(sheet.x + sheet.width * (0.2 + k * 0.05), sheet.y + sheet.height * (0.6 - Math.sin(k) * 0.2));
  await page.mouse.up();
  await page.locator('[data-pdfpaduse]').click();
  await page.waitForTimeout(500);
  check('  and the signature is ready to place', (await page.locator('[data-pdfready]').count()) === 1);
  await onPage(0.6, 0.8);
  check('  and lands on the page where it was tapped', (await page.locator('[data-pdfmark="image"]').count()) === 1);
  await page.screenshot({ path: shot('pdfroom-sign.png') });
  file = await read(await saved());
  check('  and is a picture in the saved file', file[0].pictures >= 1, String(file[0].pictures));

  /* ── Redact ── */
  await tool('redact');
  await page.locator('[data-pdffind]').fill('Secret');
  await page.locator('[data-pdffindgo]').click();
  await page.waitForTimeout(1200);
  check('Find words to redact finds them', (await page.locator('[data-pdffound="1"]').count()) === 1);
  await page.locator('[data-pdfredactnow]').click();
  await page.waitForTimeout(4000);
  file = await read(await saved());
  check('  and the saved file has no trace of them to copy out', !file.some((p) => p.text.includes('Secret')) && file[1].pictures >= 1, file[1].text);
  check('  while the other pages keep their words', file[2].text.includes('Page three'), file[2].text);

  /* ── Protect ── */
  await tool('protect');
  /* Redacting removed hidden information as well, so the title the sample
     was given is gone by now, and Protect says so. */
  await page.waitForTimeout(500);
  check('Protect shows the hidden title gone after a redaction that cleaned it', !/Hidden title/.test(await page.locator('[data-pdfhidden]').innerText()));
  await page.locator('[data-pdfpw]').fill('meerkat');
  await page.locator('[data-pdfpw2]').fill('meerkat');
  await page.locator('[data-pdfprotect]').click();
  await page.waitForTimeout(300);
  check('  a password can be set', (await page.locator('[data-pdflocked]').count()) === 1);
  const locked = await saved();
  let refused = false;
  try { await read(locked); } catch { refused = true; }
  check('  and the saved file will not open without it', refused);
  check('  and opens with it', (await read(locked, 'meerkat')).length === 3);
  await page.locator('[data-pdfunprotect]').click();

  /* ── Combine, from the front page ── */
  await tool('combine');
  await page.locator('[data-pdfcombineadd]').setInputFiles({ name: 'more.pdf', mimeType: 'application/pdf', buffer: await sample() });
  await page.waitForTimeout(1200);
  check('Combine lists this document and the added one', (await page.locator('[data-pdfpart]').count()) === 2);
  await page.locator('[data-pdfcombine]').click();
  await page.waitForTimeout(2000);
  check('  and combined, the document has both', (await pageNumber()) === '6');

  await page.locator('[data-pdfclose]').click();
  await page.waitForTimeout(500);
  check('the room closes', (await page.locator('[data-pdfroom]').count()) === 0);
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
  await page.screenshot({ path: shot('pdfroom-fell.png') }).catch(() => {});
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:pdfroom — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:pdfroom — a PDF opens, is organised, edited, commented, signed, redacted, protected and combined, and the saved file says so.');
