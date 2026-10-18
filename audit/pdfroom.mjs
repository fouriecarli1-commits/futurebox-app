/**
 * The document room, walked: a PDF opened, changed with each tool, saved,
 * and the saved file read back by a different reader.
 *
 * The owner, 17 October 2026: *"Die PDF craft is nogal belangrik."* What fails
 * quietly in a PDF tool is the file
 * that looks right on the screen and is wrong on disk — a redaction that only
 * covers the words, a password that was never put on, a signature that was
 * drawn and never written in. So every check that matters here is made on
 * the downloaded file, with pdf.js in Node, not on the room's own screen.
 */
import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
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
    if (k === 1) {
      /* A paragraph of three lines, for editing a whole block at once. */
      ['This agreement is made between the', 'artist and the label, and it sets out', 'how the songs are shared.'].forEach((line, j) => {
        page.drawText(line, { x: 60, y: 700 - j * 15, size: 12, font });
      });
    }
  }
  doc.setTitle('Hidden title');
  return Buffer.from(await doc.save());
}

/**
 * Two pages that are each a big photograph — a smooth wash of colour stored
 * uncompressed, the way a scan straight off a phone arrives — for the room to
 * make smaller. Built here, PNG and all, so the probe needs nothing installed.
 */
function photoPng(wide, tall) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'ascii');
    const tail = Buffer.alloc(4); tail.writeUInt32BE(crc(Buffer.concat([Buffer.from(type, 'ascii'), data])), 0);
    return Buffer.concat([head, data, tail]);
  };
  const raw = Buffer.alloc((wide * 3 + 1) * tall);
  for (let y = 0; y < tall; y += 1) {
    const row = y * (wide * 3 + 1);
    for (let x = 0; x < wide; x += 1) {
      raw[row + 1 + x * 3] = (x * 255) / wide;
      raw[row + 2 + x * 3] = (y * 255) / tall;
      raw[row + 3 + x * 3] = 128 + 100 * Math.sin((x + y) / 40);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(wide, 0); ihdr.writeUInt32BE(tall, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 0 })), chunk('IEND', Buffer.alloc(0))]);
}
async function photoPdf() {
  const doc = await PDFDocument.create();
  for (let k = 0; k < 2; k += 1) {
    const image = await doc.embedPng(photoPng(1000, 1400));
    const page = doc.addPage([595, 833]);
    page.drawImage(image, { x: 0, y: 0, width: 595, height: 833 });
  }
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

/** A saved file, read by pdf.js: each page's words and comment kinds, and whether it painted a picture. */
async function read(data, password) {
  const task = pdfjs.getDocument({ data: new Uint8Array(data), password, verbosity: 0 });
  const doc = await task.promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const items = (await page.getTextContent()).items;
    const text = items.map((one) => one.str).join(' ');
    /* How many lines the rewritten paragraph takes: distinct baselines of its words. */
    const lines = new Set(items.filter((one) => /agreement is made|artist and the label|stream|shared between/.test(one.str)).map((one) => Math.round(one.transform[5]))).size;
    const annots = (await page.getAnnotations()).map((one) => one.subtype);
    const ops = await page.getOperatorList();
    const pictures = ops.fnArray.filter((fn) => fn === pdfjs.OPS.paintImageXObject).length;
    const view = page.getViewport({ scale: 1 });
    pages.push({ text, annots, pictures, lines, w: Math.round(view.width), h: Math.round(view.height) });
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
  /* The owner, 17 October 2026: every paragraph and heading stands out in a
     frame, and a tap edits the whole block where it is. */
  const frames = await page.locator('[data-pdfblock]').count();
  check('Edit text puts a frame round every paragraph and heading', frames === 3, String(frames));
  /* "Page one of the contract", 24pt at 60,760 on an 842-tall page. */
  await onPage(0.2, (842 - 768) / 842);
  const retyped = page.locator('[data-pdfblockedit]');
  check('  a tap on the heading opens it to type into, right where it is', (await retyped.count()) === 1 && /Page one/.test(await retyped.inputValue()), await retyped.inputValue().catch(() => ''));
  await retyped.fill('Page one of the agreement');
  /* The paragraph: its three lines are one block, its sentence whole. */
  await onPage(0.2, (842 - 693) / 842);
  const para = page.locator('[data-pdfblockedit]');
  check('  a tap on a paragraph opens the whole paragraph, its lines joined', /made between the artist and the label, and it sets out how the songs are shared\./.test(await para.inputValue().catch(() => '')), await para.inputValue().catch(() => ''));
  await para.fill('This agreement is made between the artist and the label. It sets out exactly how every song, every stream and every sale is shared between them.');
  check('  and the frame of a block being edited steps aside', (await page.locator('[data-pdfblock]').count()) === 1);
  await pen('text');
  await onPage(0.1, 0.5);
  await page.locator('[data-pdfmarktext]').fill('Added by hand');
  await page.locator('[data-pdfapply]').click();
  await page.waitForTimeout(1200);
  await page.locator('[data-pdfwhole] summary').click();
  await page.locator('[data-pdfdo="watermark"]').click();
  await page.waitForTimeout(1500);
  file = await read(await saved());
  check('  the new words are in the saved file', file[0].text.includes('Page one of the agreement') && file[0].text.includes('Added by hand') && file[0].text.includes('every sale is shared'), file[0].text);
  check('  and the longer paragraph wraps onto more lines inside its block', file[0].lines >= 4, String(file[0].lines));
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

  /* ── Make it smaller ──────────────────────────────────────────────
     The owner, 18 October 2026: a compressor at every export, the document
     room included. A PDF of plain words is already smaller than pictures of
     its pages, so the room must say so and save nothing; a PDF of
     photographs must come out under the size chosen, every page still there. */
  await tool('convert');
  let wordsSaved = false;
  page.once('download', () => { wordsSaved = true; });
  await page.locator('[data-pdfsmallergo]').click();
  await page.locator('[data-pdfsaid]').first().waitFor({ timeout: 30000 }).catch(() => {});
  const saidSmall = await page.locator('[data-pdfsaid]').first().innerText().catch(() => '');
  check('a PDF of plain words is left as it is, and the room says why',
    !wordsSaved && /already smaller|reeds kleiner/.test(saidSmall), saidSmall || 'nothing was said');

  await page.locator('[data-pdfclose]').click();
  await page.waitForTimeout(500);
  await page.locator('[data-opentools]:visible').first().click();
  await page.waitForTimeout(400);
  await page.locator('[data-alltool="pdf"]').click();
  await page.waitForTimeout(1500);
  const photos = await photoPdf();
  await page.locator('[data-pdfopen]').setInputFiles({ name: 'scans.pdf', mimeType: 'application/pdf', buffer: photos });
  await page.waitForTimeout(2000);
  await tool('convert');
  await page.locator('[data-filesizepick="1000000"]').first().click();
  const [squeezed] = await Promise.all([
    page.waitForEvent('download', { timeout: 120000 }),
    page.locator('[data-pdfsmallergo]').click(),
  ]);
  const small = await readFile(await squeezed.path());
  const smallPages = await read(small);
  check(`a ${(photos.length / 1e6).toFixed(1)} MB PDF of photographs comes out under 1 MB`,
    small.length <= 1_000_000 && small.length < photos.length, `${small.length} bytes`);
  check('  with every page still there, each one a picture',
    smallPages.length === 2 && smallPages.every((one) => one.pictures > 0), JSON.stringify(smallPages.map((one) => one.pictures)));
  const after = Number((await page.locator('[data-filesizesaid]').first().getAttribute('data-filesizesaid')) ?? '');
  check('  and the room says how big it came out', after === small.length, `${after} against ${small.length}`);

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
