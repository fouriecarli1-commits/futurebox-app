/**
 * The document room's work on a PDF, without a browser.
 *
 *   npm run check:pdfwork
 *
 * Carli, 17 October 2026: a PDF workbench — organise, combine, comment,
 * edit, fill and sign, redact, protect, convert. What goes wrong quietly in
 * a PDF is the file that opens in this room and nowhere else, a page turned
 * the wrong way, a signature that lands upside down on a rotated page, or a
 * password that was never really there. So each operation here is run on a
 * small document and the result is read back by a different library
 * (pdf.js, which is what a reader uses) rather than by the one that wrote it.
 */
import { PDFDocument, PDFName, PDFDict, StandardFonts } from '@cantoo/pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  background, bake, batesLabel, batesNumber, combine, deletePages, extractPages, fillForm, formFields, headerFooter,
  hiddenInfo, insertBlank, isLocked, movePage, pageCount, protect, replaceWithPictures, rotatePages, safeUrl,
  sanitize, spot, unlock, watermark, type Mark,
} from '../app/lib/pdfwork.ts';
import { groupBlocks, type Run } from '../app/lib/pdfblocks.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/** A small document: three pages of different sizes, each saying its number. */
async function sample(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const [k, size] of ([[1, [300, 400]], [2, [400, 300]], [3, [200, 200]]] as const)) {
    const page = doc.addPage([...size]);
    page.drawText(`Page ${k}`, { x: 20, y: size[1] - 40, size: 18, font });
  }
  doc.setTitle('Secret plans');
  doc.setAuthor('Somebody');
  doc.catalog.set(PDFName.of('OpenAction'), doc.context.obj({ S: 'JavaScript', JS: 'app.alert(1)' }));
  return doc.save();
}

/** Every page's words and size, read by pdf.js the way a reader would. */
async function read(data: Uint8Array, password?: string): Promise<{ pages: { words: string; w: number; h: number; items: { str: string; x: number; y: number }[]; annots: string[] }[] }> {
  const task = pdfjs.getDocument({ data: data.slice(), password, useSystemFonts: false, verbosity: 0 });
  const doc = await task.promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const view = page.getViewport({ scale: 1 });
    const text = await page.getTextContent();
    const items = text.items
      .filter((one): one is typeof one & { str: string; transform: number[] } => 'str' in one)
      .map((one) => {
        /* Into the page as shown: top-left origin, nought to one. */
        const [x, y] = view.convertToViewportPoint(one.transform[4], one.transform[5]);
        return { str: one.str, x: x / view.width, y: y / view.height };
      });
    const annots = (await page.getAnnotations()).map((one: { subtype: string }) => one.subtype);
    pages.push({ words: items.map((one) => one.str).join(' '), w: Math.round(view.width), h: Math.round(view.height), items, annots });
  }
  await task.destroy();
  return { pages };
}

const base = await sample();
const first = await read(base);
ok('the sample reads back as three pages, each with its number', first.pages.map((p) => p.words).join('|') === 'Page 1|Page 2|Page 3', first.pages.map((p) => p.words).join('|'));

/* ── Organise ── */
const turned = await read(await rotatePages(base, [0], 90));
ok('turning a page a quarter makes it shown sideways', turned.pages[0].w === 400 && turned.pages[0].h === 300, `${turned.pages[0].w}×${turned.pages[0].h}`);
const turnedTwice = await read(await rotatePages(await rotatePages(base, [0], 90), [0], -90));
ok('  and back again is upright', turnedTwice.pages[0].w === 300);
const fewer = await read(await deletePages(base, [1]));
ok('deleting page 2 leaves pages 1 and 3', fewer.pages.map((p) => p.words).join('|') === 'Page 1|Page 3');
let refused = false;
try { await deletePages(base, [0, 1, 2]); } catch { refused = true; }
ok('  and deleting every page is refused', refused);
const moved = await read(await movePage(base, 2, 0));
ok('moving the last page to the front', moved.pages.map((p) => p.words).join('|') === 'Page 3|Page 1|Page 2');
const blank = await read(await insertBlank(base, 1));
ok('a blank page goes in where it is asked, the size of the page before it', blank.pages.length === 4 && blank.pages[1].words === '' && blank.pages[1].w === 300);
const pulled = await read(await extractPages(base, [2, 0]));
ok('extracting pages 3 and 1 gives them in reading order', pulled.pages.map((p) => p.words).join('|') === 'Page 1|Page 3');

/* ── Combine ── */
const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAEUlEQVR4nGP4z8DAwMDAAAAJ/gH/0NqpCgAAAABJRU5ErkJggg==', 'base64'));
const joined = await read(await combine([{ data: base, type: 'pdf' }, { data: PNG, type: 'png' }, { data: await extractPages(base, [1]), type: 'pdf' }]));
ok('combining a document, a picture and another document', joined.pages.length === 5 && joined.pages[4].words === 'Page 2');
ok('  and the picture gets a page of its own, the way round that suits it', joined.pages[3].w > joined.pages[3].h, `${joined.pages[3].w}×${joined.pages[3].h}`);

/* ── Where a mark lands ── */
const frame = { x0: 0, y0: 0, w: 300, h: 400, turn: 90 as const, shownW: 400, shownH: 300 };
const corner = spot(frame, 0, 0);
ok('on a page turned a quarter, the top-left as shown is the page\'s own foot-left', corner.x === 0 && corner.y === 0);
ok('  and the top-right as shown is its own top-left', spot(frame, 1, 0).x === 0 && spot(frame, 1, 0).y === 400);

/* ── Marks ── */
const marks: Mark[] = [
  { kind: 'text', page: 0, at: { u: 0.1, v: 0.5 }, text: 'Hallo, ê ë — ✓ wêreld', size: 12, colour: [0, 0, 0], font: 'sans' },
  { kind: 'tick', page: 0, at: { u: 0.5, v: 0.6 }, size: 14, colour: [0, 0, 0] },
  { kind: 'note', page: 0, at: { u: 0.8, v: 0.1 }, text: 'Look at this', colour: [1, 0.85, 0.2] },
  { kind: 'highlight', page: 0, box: { u1: 0.05, v1: 0.05, u2: 0.5, v2: 0.12 }, colour: [1, 0.9, 0.2] },
  { kind: 'underline', page: 1, box: { u1: 0.05, v1: 0.05, u2: 0.5, v2: 0.12 }, colour: [0.1, 0.5, 1] },
  { kind: 'link', page: 1, box: { u1: 0.1, v1: 0.5, u2: 0.4, v2: 0.6 }, url: 'futurebox.co.za' },
  { kind: 'link', page: 1, box: { u1: 0.1, v1: 0.7, u2: 0.4, v2: 0.8 }, url: 'javascript:alert(1)' },
  { kind: 'field', page: 2, box: { u1: 0.1, v1: 0.5, u2: 0.9, v2: 0.6 }, field: 'text', name: 'Full name' },
  { kind: 'field', page: 2, box: { u1: 0.1, v1: 0.7, u2: 0.2, v2: 0.8 }, field: 'check', name: 'Agree' },
];
const baked = await bake(base, marks);
const bakedRead = await read(baked);
ok('words put on a page are on it, Afrikaans letters and all', bakedRead.pages[0].words.includes('Hallo, ê ë — ? wêreld'), bakedRead.pages[0].words);
const hallo = bakedRead.pages[0].items.find((one) => one.str.startsWith('Hallo'));
ok('  where they were put', hallo !== undefined && Math.abs(hallo.x - 0.1) < 0.01 && hallo.y > 0.5 && hallo.y < 0.56, JSON.stringify(hallo));
ok('a sticky note and a highlight are comments a reader sees', bakedRead.pages[0].annots.includes('Text') && bakedRead.pages[0].annots.includes('Highlight'), bakedRead.pages[0].annots.join());
ok('an underline and a web link on page 2, and no link that runs a script',
  bakedRead.pages[1].annots.filter((one) => one === 'Link').length === 1 && bakedRead.pages[1].annots.includes('Underline'), bakedRead.pages[1].annots.join());
ok('a form field and a tick box made on page 3', bakedRead.pages[2].annots.filter((one) => one === 'Widget').length === 2);
ok('web addresses become links and scripts do not', safeUrl('futurebox.co.za') === 'https://futurebox.co.za/' && safeUrl('javascript:alert(1)') === null && safeUrl('file:///etc/passwd') === null);

/* A mark on a turned page reads the right way and where it was put. */
const onTurned = await read(await bake(await rotatePages(base, [0], 90), [
  { kind: 'text', page: 0, at: { u: 0.1, v: 0.2 }, text: 'Upright', size: 12, colour: [0, 0, 0], font: 'serif' },
]));
const upright = onTurned.pages[0].items.find((one) => one.str === 'Upright');
ok('words on a turned page land where they were put on the page as shown', upright !== undefined && Math.abs(upright.x - 0.1) < 0.01 && upright.y > 0.2 && upright.y < 0.26, JSON.stringify(upright));

/* ── Forms ── */
const fields = await formFields(baked);
ok('the room finds the fields to fill', fields.some((one) => one.name === 'Full_name' && one.kind === 'text') && fields.some((one) => one.name === 'Agree' && one.kind === 'check'), JSON.stringify(fields));
const filled = await fillForm(baked, { Full_name: 'Carli Fourie', Agree: true });
const filledFields = await formFields(filled);
ok('  and fills them', filledFields.find((one) => one.name === 'Full_name')?.value === 'Carli Fourie' && filledFields.find((one) => one.name === 'Agree')?.value === true);
const flat = await read(await fillForm(baked, { Full_name: 'Carli Fourie' }, true));
ok('  and flattened, the answer is part of the page', flat.pages[2].words.includes('Carli Fourie') && !flat.pages[2].annots.includes('Widget'), flat.pages[2].words);

/* ── Whole document ── */
const edged = await read(await headerFooter(base, { header: 'Contract', footer: 'Page {n} of {total}', numbers: 'none', size: 9, align: 'centre' }));
ok('a header and a footer on every page, with its number filled in', edged.pages.every((p, k) => p.words.includes('Contract') && p.words.includes(`Page ${k + 1} of 3`)), edged.pages.map((p) => p.words).join(' | '));
const marked = await read(await watermark(base, { text: 'DRAFT', size: 40, opacity: 0.2, colour: [0.8, 0, 0], slant: true }));
ok('a watermark across every page', marked.pages.every((p) => p.words.includes('DRAFT')));
const bates = { prefix: 'FB', start: 7, digits: 6, suffix: '', size: 8 };
const numbered = await read(await batesNumber(base, bates));
ok('Bates numbers run on from where they were asked to start', numbered.pages.map((p) => p.words.split(' ').pop()).join(',') === 'FB000007,FB000008,FB000009' && batesLabel(bates, 0) === 'FB000007');
const coloured = await background(base, [1, 0.95, 0.8]);
ok('a background colour goes under the page and leaves its words readable', (await read(coloured)).pages.every((p, k) => p.words === `Page ${k + 1}`));

/* ── Protect ── */
const locked = await protect(base, { open: 'meerkat', print: true, copy: false });
ok('a protected file says it is locked', await isLocked(locked) && !(await isLocked(base)));
let wouldNotOpen = false;
try { await read(locked); } catch { wouldNotOpen = true; }
ok('  and a reader cannot open it without the password', wouldNotOpen);
ok('  and opens it with the password', (await read(locked, 'meerkat')).pages[0].words === 'Page 1');
const unlocked = await unlock(locked, 'meerkat');
ok('the password can be taken off by somebody who has it', !(await isLocked(unlocked)) && (await read(unlocked)).pages.length === 3);
let short = false;
try { await protect(base, { open: 'abc', print: true, copy: true }); } catch { short = true; }
ok('a password of three letters is refused', short);

/* ── Hidden things ── */
const before = await hiddenInfo(base);
ok('the room sees the title, the author and the script hidden in a file', before.title === 'Secret plans' && before.author === 'Somebody' && before.script);
const clean = await sanitize(base);
const after = await hiddenInfo(clean);
ok('  and Remove hidden information takes all three away', !after.title && !after.author && !after.script, JSON.stringify(after));
ok('  and keeps the pages', (await read(clean)).pages.map((p) => p.words).join('|') === 'Page 1|Page 2|Page 3');

/* ── Redact ── */
const redacted = await read(await replaceWithPictures(base, [{ page: 1, data: PNG, type: 'png' }]));
ok('a redacted page has no words left in it to copy out', redacted.pages[1].words === '' && redacted.pages[0].words === 'Page 1');
ok('  and keeps its size as shown', redacted.pages[1].w === 400 && redacted.pages[1].h === 300);
const turnedRedacted = await read(await replaceWithPictures(await rotatePages(base, [0], 90), [{ page: 0, data: PNG, type: 'png' }]));
ok('  a turned page stays the shape it was shown', turnedRedacted.pages[0].w === 400 && turnedRedacted.pages[0].h === 300);

/* ── Paragraphs and headings, found from loose runs ── */
{
  const W = 600;
  const H = 800;
  /* A run as pdf.js hands it over: points turned into shares of the page. */
  const run = (text: string, x: number, base: number, size: number, width: number): Run => ({
    text, size, font: 'sans', u1: x / W, u2: (x + width) / W, v1: (base - size) / H, v2: (base + size * 0.22) / H, base: base / H,
  });
  const runs: Run[] = [
    run('Annual report', 60, 80, 28, 200),
    /* A paragraph of three lines, the first in two runs, out of order. */
    run('lazy dog and keeps', 230, 140, 11, 160),
    run('The quick brown fox jumps over the', 60, 140, 11, 168),
    run('running across the whole field un-', 60, 154, 11, 330),
    run('til evening.', 60, 168, 11, 60),
    /* A second paragraph, a blank line below. */
    run('Second paragraph here.', 60, 210, 11, 140),
    /* A side column at the same height: a block of its own. */
    run('Sidebar', 450, 140, 11, 60),
  ];
  const blocks = groupBlocks(runs, W, H, 0);
  const texts = blocks.map((b) => b.text);
  ok('a heading in a bigger size is a block of its own', texts[0] === 'Annual report' && blocks[0].size === 28, JSON.stringify(texts));
  ok('  lines of one paragraph are one block, runs put back in reading order', texts.includes('The quick brown fox jumps over the lazy dog and keeps running across the whole field until evening.'), JSON.stringify(texts));
  ok('  a hyphen at a line\'s end joins the word back together', texts.some((t) => t.includes('until evening')));
  ok('  a gap of a blank line starts a new paragraph', texts.includes('Second paragraph here.'));
  ok('  and a column beside it is not swallowed into it', texts.includes('Sidebar'));
  const para = blocks.find((b) => b.text.startsWith('The quick'));
  ok('  the paragraph knows its line spacing', para !== undefined && Math.abs(para.lead - 14) < 0.01 && para.lines === 3, JSON.stringify(para));
}

/* A block edited whole wraps inside its own width, at its own spacing. */
const wrapped = await read(await bake(base, [
  { kind: 'text', page: 0, at: { u: 0.1, v: 0.3 }, text: 'one two three four five six seven eight nine ten eleven twelve', size: 12, colour: [0, 0, 0], font: 'sans', width: 0.4, lead: 16 },
]));
const wrapLines = wrapped.pages[0].items.filter((one) => /one|six|ten|twelve/.test(one.str));
const ys = [...new Set(wrapLines.map((one) => one.y.toFixed(3)))];
ok('a paragraph edited whole wraps inside its block', ys.length >= 2 && wrapLines.every((one) => one.x >= 0.099 && one.x < 0.12), JSON.stringify(wrapLines));
ok('  one line under the next at the block\'s spacing', ys.length >= 2 && Math.abs((Number(ys[1]) - Number(ys[0])) * 400 - 16) < 0.6, ys.join());

ok('a count of pages is a count of pages', (await pageCount(base)) === 3);
ok('nothing written is a file only this room can open', (await PDFDocument.load(baked)).catalog.lookup(PDFName.of('Pages')) instanceof PDFDict);

if (bad) {
  console.error(`\ncheck:pdfwork — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:pdfwork — organise, combine, comment, edit, fill, protect, clean and redact each do what they say, read back by a different reader.');
