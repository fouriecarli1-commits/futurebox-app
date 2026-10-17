/**
 * The document room's work on a PDF, without a screen.
 *
 * Carli, 17 October 2026: *"Die PDF craft is nogal belangrik."* — with
 * screenshots of a full PDF workbench:
 * organise pages, combine files, comment, prepare a form, edit, fill and
 * sign, redact, protect and convert.
 *
 * Every function here takes the document's bytes and gives new bytes back.
 * Nothing is changed in place, so the room's undo is a list of byte arrays
 * and a failed step leaves the document exactly as it was. All of it runs on
 * the phone: a contract or an ID document never leaves the device to be
 * edited.
 *
 * ── Where a mark goes ───────────────────────────────────────────────────
 *
 * The room shows a page the way a reader sees it, turned by its rotation. A
 * mark is placed in those terms — `u` across and `v` down, nought to one, on
 * the page as shown — and turned back into the page's own coordinates here,
 * by `spot`. So a signature put on a page that was rotated stays the right
 * way up, on the spot it was put.
 *
 * Drawing (`@cantoo/pdf-lib`) and showing (`pdfview.ts`, pdf.js) are two
 * libraries on purpose: the first writes PDFs and cannot draw one, the
 * second draws them and cannot write one.
 */
import {
  PDFArray, PDFCheckBox, PDFDict, PDFDocument, PDFDropdown, PDFHexString, PDFName, PDFOptionList, PDFRadioGroup,
  PDFString, PDFTextField, StandardFonts, degrees, fill, lineTo, moveTo, popGraphicsState, pushGraphicsState,
  rectangle, rgb, setFillingRgbColor, setGraphicsState, setStrokingRgbColor, setLineWidth, stroke,
  type PDFFont, type PDFPage, type PDFRef,
} from '@cantoo/pdf-lib';

/* ── Kinds ──────────────────────────────────────────────────────────────── */

export type Bytes = Uint8Array;
export type Colour = readonly [number, number, number];
export type FontKind = 'sans' | 'serif' | 'mono';

/** A point on a page as it is shown: across and down, nought to one. */
export interface At { readonly u: number; readonly v: number }
/** A box on a page as it is shown. */
export interface Box { readonly u1: number; readonly v1: number; readonly u2: number; readonly v2: number }

export type Mark =
  /* `width` (a share of the page as shown) makes it a block that wraps, the
     way a paragraph edited whole does; `lead` is its line spacing in points. */
  | { readonly kind: 'text'; readonly page: number; readonly at: At; readonly text: string; readonly size: number; readonly colour: Colour; readonly font: FontKind; readonly bold?: boolean; readonly width?: number; readonly lead?: number }
  | { readonly kind: 'tick' | 'cross' | 'dot'; readonly page: number; readonly at: At; readonly size: number; readonly colour: Colour }
  | { readonly kind: 'line'; readonly page: number; readonly from: At; readonly to: At; readonly width: number; readonly colour: Colour }
  | { readonly kind: 'box'; readonly page: number; readonly box: Box; readonly colour: Colour; readonly opacity?: number }
  | { readonly kind: 'image'; readonly page: number; readonly box: Box; readonly data: Bytes; readonly type: 'png' | 'jpg' }
  | { readonly kind: 'note'; readonly page: number; readonly at: At; readonly text: string; readonly colour: Colour }
  | { readonly kind: 'highlight' | 'underline' | 'strike'; readonly page: number; readonly box: Box; readonly colour: Colour; readonly text?: string }
  | { readonly kind: 'link'; readonly page: number; readonly box: Box; readonly url: string }
  | { readonly kind: 'field'; readonly page: number; readonly box: Box; readonly field: 'text' | 'check' | 'date' | 'signature'; readonly name: string };

export type MarkKind = Mark['kind'];

/** What an existing form field is, for the room to show an input for it. */
export interface FormField {
  readonly name: string;
  readonly kind: 'text' | 'check' | 'choice' | 'radio' | 'other';
  readonly value: string | boolean;
  readonly options: readonly string[];
}

/** One file going into a combined document. */
export interface Piece {
  readonly data: Bytes;
  readonly type: 'pdf' | 'png' | 'jpg';
}

/* ── Opening and saving ─────────────────────────────────────────────────── */

/** Opened for work. `password` for a locked file; a wrong one throws. */
export async function open(data: Bytes, password?: string): Promise<PDFDocument> {
  return password === undefined
    ? PDFDocument.load(data, { updateMetadata: false })
    : PDFDocument.load(data, { password, updateMetadata: false });
}

/** Whether the file asks for a password before it can be read. */
export async function isLocked(data: Bytes): Promise<boolean> {
  try {
    const doc = await PDFDocument.load(data, { ignoreEncryption: true, updateMetadata: false });
    return doc.isEncrypted;
  } catch {
    return false;
  }
}

/**
 * The same document with no password on it. Opened with the password and
 * written again: what is written carries no encryption.
 */
export async function unlock(data: Bytes, password: string): Promise<Bytes> {
  const doc = await open(data, password);
  /* Opened with the password, the objects are already plain and the
     trailer no longer names a lock. But the old file's cross-reference
     stream and its lock dictionary come along as ordinary objects, and a
     reader that scans for cross-references finds the old one, names the
     lock again, and asks for a password that unlocks nothing. Both go. */
  for (const [ref, object] of doc.context.enumerateIndirectObjects()) {
    const dict = object instanceof PDFDict ? object : 'dict' in object && object.dict instanceof PDFDict ? object.dict : null;
    if (!dict) continue;
    if (dict.get(PDFName.of('Type')) === PDFName.of('XRef') || dict.get(PDFName.of('Filter')) === PDFName.of('Standard')) {
      doc.context.delete(ref);
    }
  }
  return doc.save();
}

const save = (doc: PDFDocument): Promise<Bytes> => doc.save();

/** How many pages. */
export async function pageCount(data: Bytes): Promise<number> {
  return (await open(data)).getPageCount();
}

/* ── Organise ───────────────────────────────────────────────────────────── */

const inRange = (pages: readonly number[], count: number): number[] =>
  [...new Set(pages)].filter((one) => Number.isInteger(one) && one >= 0 && one < count).sort((a, b) => a - b);

/** Turn pages by a quarter, a half or three quarters, on top of how they already sit. */
export async function rotatePages(data: Bytes, pages: readonly number[], by: 90 | 180 | 270 | -90): Promise<Bytes> {
  const doc = await open(data);
  for (const at of inRange(pages, doc.getPageCount())) {
    const page = doc.getPage(at);
    page.setRotation(degrees((((page.getRotation().angle + by) % 360) + 360) % 360));
  }
  return save(doc);
}

/** Take pages out. A document is never left with none: that is refused. */
export async function deletePages(data: Bytes, pages: readonly number[]): Promise<Bytes> {
  const doc = await open(data);
  const going = inRange(pages, doc.getPageCount());
  if (going.length >= doc.getPageCount()) throw new Error('every-page');
  for (const at of [...going].reverse()) doc.removePage(at);
  return save(doc);
}

/** The pages in a new order: `order[k]` is the page that becomes page k. */
export async function reorder(data: Bytes, order: readonly number[]): Promise<Bytes> {
  const was = await open(data);
  const count = was.getPageCount();
  if (order.length !== count || new Set(order).size !== count || order.some((one) => one < 0 || one >= count)) {
    throw new Error('not-an-order');
  }
  const doc = await PDFDocument.create();
  const copied = await doc.copyPages(was, [...order]);
  copied.forEach((page) => doc.addPage(page));
  carryInfo(was, doc);
  return save(doc);
}

/** Move one page to another place, everything between shuffling up or down. */
export async function movePage(data: Bytes, from: number, to: number): Promise<Bytes> {
  const count = await pageCount(data);
  const order = Array.from({ length: count }, (_, k) => k);
  const [one] = order.splice(from, 1);
  order.splice(Math.max(0, Math.min(count - 1, to)), 0, one);
  return reorder(data, order);
}

/** A blank page at `at`, the size of the page beside it. */
export async function insertBlank(data: Bytes, at: number): Promise<Bytes> {
  const doc = await open(data);
  const count = doc.getPageCount();
  const beside = doc.getPage(Math.max(0, Math.min(count - 1, at - 1)));
  const { width, height } = beside.getSize();
  doc.insertPage(Math.max(0, Math.min(count, at)), [width, height]);
  return save(doc);
}

/** Every page of another document (or a picture), put in at `at`. */
export async function insertFrom(data: Bytes, at: number, piece: Piece): Promise<Bytes> {
  const doc = await open(data);
  const from = await asDocument(piece);
  const copied = await doc.copyPages(from, from.getPageIndices());
  const start = Math.max(0, Math.min(doc.getPageCount(), at));
  copied.forEach((page, k) => doc.insertPage(start + k, page));
  return save(doc);
}

/** The chosen pages as a document of their own. */
export async function extractPages(data: Bytes, pages: readonly number[]): Promise<Bytes> {
  const was = await open(data);
  const keep = inRange(pages, was.getPageCount());
  if (!keep.length) throw new Error('no-pages');
  const doc = await PDFDocument.create();
  (await doc.copyPages(was, keep)).forEach((page) => doc.addPage(page));
  carryInfo(was, doc);
  return save(doc);
}

/* ── Combine ────────────────────────────────────────────────────────────── */

/** An A4 page, in points: what a picture is laid on when it becomes a page. */
const A4: readonly [number, number] = [595.28, 841.89];

/** A picture as a one-page document: on A4 the way round that suits it, with a small margin. */
async function pictureDocument(piece: Piece): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  const image = piece.type === 'png' ? await doc.embedPng(piece.data) : await doc.embedJpg(piece.data);
  const wide = image.width > image.height;
  const [w, h] = wide ? [A4[1], A4[0]] : A4;
  const margin = 24;
  const scale = Math.min((w - margin * 2) / image.width, (h - margin * 2) / image.height);
  const page = doc.addPage([w, h]);
  page.drawImage(image, {
    x: (w - image.width * scale) / 2,
    y: (h - image.height * scale) / 2,
    width: image.width * scale,
    height: image.height * scale,
  });
  return doc;
}

async function asDocument(piece: Piece): Promise<PDFDocument> {
  return piece.type === 'pdf' ? open(piece.data) : pictureDocument(piece);
}

/** Files and pictures, one after another, as one document. */
export async function combine(pieces: readonly Piece[]): Promise<Bytes> {
  if (!pieces.length) throw new Error('nothing');
  const doc = await PDFDocument.create();
  for (const piece of pieces) {
    const from = await asDocument(piece);
    (await doc.copyPages(from, from.getPageIndices())).forEach((page) => doc.addPage(page));
  }
  return save(doc);
}

/* ── Where a mark lands on the page itself ──────────────────────────────── */

interface Frame {
  readonly x0: number;
  readonly y0: number;
  readonly w: number;
  readonly h: number;
  readonly turn: 0 | 90 | 180 | 270;
  /** The page as shown, in points. */
  readonly shownW: number;
  readonly shownH: number;
}

function frameOf(page: PDFPage): Frame {
  const crop = page.getCropBox();
  const turn = ((((page.getRotation().angle % 360) + 360) % 360) as 0 | 90 | 180 | 270);
  const sideways = turn === 90 || turn === 270;
  return {
    x0: crop.x, y0: crop.y, w: crop.width, h: crop.height, turn,
    shownW: sideways ? crop.height : crop.width,
    shownH: sideways ? crop.width : crop.height,
  };
}

/**
 * A point on the page as shown, as a point on the page itself. The page as
 * shown is the page itself turned clockwise by its rotation, so each turn
 * is the same two numbers swapped and flipped.
 */
export function spot(f: Frame, u: number, v: number): { readonly x: number; readonly y: number } {
  switch (f.turn) {
    case 90: return { x: f.x0 + v * f.w, y: f.y0 + u * f.h };
    case 180: return { x: f.x0 + (1 - u) * f.w, y: f.y0 + v * f.h };
    case 270: return { x: f.x0 + (1 - v) * f.w, y: f.y0 + (1 - u) * f.h };
    default: return { x: f.x0 + u * f.w, y: f.y0 + (1 - v) * f.h };
  }
}

/** A box on the page as shown, as the page's own rectangle (for annotations, which are never turned). */
function rectOf(f: Frame, box: Box): [number, number, number, number] {
  const a = spot(f, Math.min(box.u1, box.u2), Math.min(box.v1, box.v2));
  const b = spot(f, Math.max(box.u1, box.u2), Math.max(box.v1, box.v2));
  return [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.x, b.x), Math.max(a.y, b.y)];
}

/** Where to draw something upright on the page as shown: its foot-left corner, its size, and the turn. */
function upright(f: Frame, box: Box): { readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly rotate: ReturnType<typeof degrees> } {
  const left = Math.min(box.u1, box.u2);
  const foot = Math.max(box.v1, box.v2);
  const p = spot(f, left, foot);
  return {
    x: p.x,
    y: p.y,
    width: Math.abs(box.u2 - box.u1) * f.shownW,
    height: Math.abs(box.v2 - box.v1) * f.shownH,
    rotate: degrees(f.turn),
  };
}

/* ── Words on a page ────────────────────────────────────────────────────── */

const FONT: Record<FontKind, readonly [StandardFonts, StandardFonts]> = {
  sans: [StandardFonts.Helvetica, StandardFonts.HelveticaBold],
  serif: [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold],
  mono: [StandardFonts.Courier, StandardFonts.CourierBold],
};

/**
 * Words the font can write. The built-in fonts know Western European
 * letters — every Afrikaans one, ê and ë and ŉ's two halves — and not much
 * else; a letter they do not know would stop the whole save, so it becomes
 * a question mark instead.
 */
export function writable(font: PDFFont, text: string): string {
  let out = '';
  for (const ch of text.replace(/\r/g, '')) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += ch === '\n' ? '\n' : '?';
    }
  }
  return out;
}

class Fonts {
  private readonly made = new Map<string, Promise<PDFFont>>();
  constructor(private readonly doc: PDFDocument) {}
  get(kind: FontKind, bold = false): Promise<PDFFont> {
    const name = FONT[kind][bold ? 1 : 0];
    let one = this.made.get(name);
    if (!one) {
      one = this.doc.embedFont(name);
      this.made.set(name, one);
    }
    return one;
  }
}

const colourOf = (c: Colour) => rgb(c[0], c[1], c[2]);

/** Lines of text at a top-left spot on the page as shown, each line under the last. */
/** Words broken into lines no wider than `most` points; a line break typed in is kept. */
export function wrapWords(font: PDFFont, text: string, size: number, most: number): string[] {
  const out: string[] = [];
  for (const typed of text.split('\n')) {
    let line = '';
    for (const word of typed.split(/ +/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(next, size) > most) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}

async function drawWords(page: PDFPage, f: Frame, fonts: Fonts, at: At, text: string, size: number, colour: Colour, kind: FontKind, bold = false, width?: number, leadPt?: number): Promise<void> {
  const font = await fonts.get(kind, bold);
  const words = writable(font, text);
  const lines = width ? wrapWords(font, words, size, width * f.shownW) : words.split('\n');
  const lead = leadPt && leadPt > 0 ? leadPt : size * 1.2;
  lines.forEach((line, k) => {
    /* The baseline sits about four fifths of a line down from the top. */
    const down = at.v + (size * 0.82 + k * lead) / f.shownH;
    const p = spot(f, at.u, down);
    page.drawText(line, { x: p.x, y: p.y, size, font, color: colourOf(colour), rotate: degrees(f.turn) });
  });
}

/* ── Annotations: comments, links and the marks a reader can switch off ─── */

/** An appearance for an annotation, so every reader draws it the same — this room's own pages included. */
function appearance(doc: PDFDocument, w: number, h: number, colour: Colour, shape: 'fill' | 'under' | 'strike' | 'note', alpha: number): PDFRef {
  const ops = [pushGraphicsState(), setGraphicsState('GS0'), setFillingRgbColor(colour[0], colour[1], colour[2])];
  const bar = Math.max(0.8, h * 0.08);
  if (shape === 'fill') ops.push(rectangle(0, 0, w, h), fill());
  if (shape === 'under') ops.push(rectangle(0, 0, w, bar), fill());
  if (shape === 'strike') ops.push(rectangle(0, h / 2 - bar / 2, w, bar), fill());
  if (shape === 'note') {
    ops.push(rectangle(0, 0, w, h), fill());
    ops.push(setStrokingRgbColor(0.25, 0.2, 0.05), setLineWidth(1));
    for (const y of [0.7, 0.5, 0.3]) ops.push(moveTo(w * 0.2, h * y), lineTo(w * 0.8, h * y), stroke());
  }
  ops.push(popGraphicsState());
  const stream = doc.context.formXObject(ops, {
    BBox: [0, 0, w, h],
    Resources: { ExtGState: { GS0: { Type: 'ExtGState', CA: alpha, ca: alpha, BM: shape === 'fill' ? 'Multiply' : 'Normal' } } },
  });
  return doc.context.register(stream);
}

function annotate(doc: PDFDocument, page: PDFPage, entries: Record<string, unknown>): void {
  const dict = doc.context.obj(entries as never);
  page.node.addAnnot(doc.context.register(dict));
}

const NOTE_SIDE = 22;

/* ── Baking marks into the document ─────────────────────────────────────── */

/**
 * Every mark, written into the document: drawn into the page where it is
 * part of the page (words, ticks, a signature, a cover-up), and as an
 * annotation where a reader should be able to see it is one (comments,
 * highlights, links, form fields).
 */
export async function bake(data: Bytes, marks: readonly Mark[], author = 'FutureBox'): Promise<Bytes> {
  if (!marks.length) return data;
  const doc = await open(data);
  const fonts = new Fonts(doc);
  const count = doc.getPageCount();
  let form: ReturnType<PDFDocument['getForm']> | null = null;
  const takenNames = new Set<string>();

  for (const mark of marks) {
    if (mark.page < 0 || mark.page >= count) continue;
    const page = doc.getPage(mark.page);
    const f = frameOf(page);
    switch (mark.kind) {
      case 'text':
        await drawWords(page, f, fonts, mark.at, mark.text, mark.size, mark.colour, mark.font, mark.bold, mark.width, mark.lead);
        break;
      case 'tick':
      case 'cross':
      case 'dot': {
        const s = mark.size;
        const at = (du: number, dv: number) => spot(f, mark.at.u + du / f.shownW, mark.at.v + dv / f.shownH);
        const colour = colourOf(mark.colour);
        const thickness = Math.max(1, s * 0.12);
        if (mark.kind === 'dot') {
          const c = at(s / 2, s / 2);
          page.drawEllipse({ x: c.x, y: c.y, xScale: s * 0.32, yScale: s * 0.32, color: colour });
        } else if (mark.kind === 'tick') {
          page.drawLine({ start: at(s * 0.08, s * 0.55), end: at(s * 0.38, s * 0.88), thickness, color: colour });
          page.drawLine({ start: at(s * 0.38, s * 0.88), end: at(s * 0.95, s * 0.1), thickness, color: colour });
        } else {
          page.drawLine({ start: at(s * 0.12, s * 0.12), end: at(s * 0.88, s * 0.88), thickness, color: colour });
          page.drawLine({ start: at(s * 0.88, s * 0.12), end: at(s * 0.12, s * 0.88), thickness, color: colour });
        }
        break;
      }
      case 'line':
        page.drawLine({
          start: spot(f, mark.from.u, mark.from.v),
          end: spot(f, mark.to.u, mark.to.v),
          thickness: mark.width,
          color: colourOf(mark.colour),
        });
        break;
      case 'box': {
        const where = upright(f, mark.box);
        page.drawRectangle({ ...where, color: colourOf(mark.colour), opacity: mark.opacity ?? 1 });
        break;
      }
      case 'image': {
        const image = mark.type === 'png' ? await doc.embedPng(mark.data) : await doc.embedJpg(mark.data);
        page.drawImage(image, upright(f, mark.box));
        break;
      }
      case 'note': {
        const p = spot(f, mark.at.u, mark.at.v);
        const rect = [p.x, p.y - NOTE_SIDE, p.x + NOTE_SIDE, p.y];
        annotate(doc, page, {
          Type: 'Annot', Subtype: 'Text', Rect: rect, Name: 'Comment', F: 4,
          Contents: PDFHexString.fromText(mark.text), T: PDFHexString.fromText(author),
          M: PDFString.fromDate(new Date()), C: [...mark.colour],
          AP: { N: appearance(doc, NOTE_SIDE, NOTE_SIDE, mark.colour, 'note', 1) },
        });
        break;
      }
      case 'highlight':
      case 'underline':
      case 'strike': {
        const [x1, y1, x2, y2] = rectOf(f, mark.box);
        const subtype = mark.kind === 'highlight' ? 'Highlight' : mark.kind === 'underline' ? 'Underline' : 'StrikeOut';
        annotate(doc, page, {
          Type: 'Annot', Subtype: subtype, Rect: [x1, y1, x2, y2], F: 4,
          QuadPoints: [x1, y2, x2, y2, x1, y1, x2, y1], C: [...mark.colour],
          CA: mark.kind === 'highlight' ? 0.45 : 1,
          T: PDFHexString.fromText(author), M: PDFString.fromDate(new Date()),
          ...(mark.text ? { Contents: PDFHexString.fromText(mark.text) } : {}),
          AP: {
            N: appearance(doc, x2 - x1, y2 - y1, mark.colour,
              mark.kind === 'highlight' ? 'fill' : mark.kind === 'underline' ? 'under' : 'strike',
              mark.kind === 'highlight' ? 0.45 : 1),
          },
        });
        break;
      }
      case 'link': {
        const url = safeUrl(mark.url);
        if (!url) break;
        annotate(doc, page, {
          Type: 'Annot', Subtype: 'Link', Rect: rectOf(f, mark.box), Border: [0, 0, 0], F: 4,
          A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
        });
        break;
      }
      case 'field': {
        form ??= doc.getForm();
        const [x1, y1, x2, y2] = rectOf(f, mark.box);
        const name = freshName(form, takenNames, mark.name || mark.field);
        const place = { x: x1, y: y1, width: x2 - x1, height: y2 - y1, borderColor: rgb(0.35, 0.4, 0.55), borderWidth: 1 };
        if (mark.field === 'check') {
          form.createCheckBox(name).addToPage(page, place);
        } else {
          const field = form.createTextField(name);
          if (mark.field === 'date') field.setText('');
          field.addToPage(page, { ...place, font: await fonts.get('sans') });
          field.setFontSize(0);
        }
        break;
      }
      default:
        break;
    }
  }
  return save(doc);
}

function freshName(form: ReturnType<PDFDocument['getForm']>, taken: Set<string>, wanted: string): string {
  const base = wanted.replace(/[.\s]+/g, '_').slice(0, 60) || 'field';
  const exists = (name: string) => taken.has(name) || form.getFieldMaybe(name) !== undefined;
  let name = base;
  for (let k = 2; exists(name); k += 1) name = `${base}_${k}`;
  taken.add(name);
  return name;
}

/** Only web addresses become links; anything else (javascript:, file:, mail) is refused. */
export function safeUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

/* ── The whole document: header, footer, watermark, numbering, background ─ */

export interface Edge {
  readonly header: string;
  readonly footer: string;
  /** Page numbers at the foot: none, "3", or "3 of 12". */
  readonly numbers: 'none' | 'n' | 'n-of';
  readonly size: number;
  readonly align: 'left' | 'centre' | 'right';
}

/** The page's number in words: `{n}` and `{total}` in a header or footer are filled in. */
const fillIn = (text: string, n: number, total: number): string =>
  text.replace(/\{n\}/g, String(n)).replace(/\{total\}/g, String(total));

/** Text along the top and the foot of every page, and page numbers, the right way up however the page is turned. */
export async function headerFooter(data: Bytes, edge: Edge): Promise<Bytes> {
  const doc = await open(data);
  const fonts = new Fonts(doc);
  const font = await fonts.get('sans');
  const total = doc.getPageCount();
  const margin = 0.035;
  doc.getPages().forEach((page, k) => {
    const f = frameOf(page);
    const put = (text: string, top: boolean): void => {
      const words = writable(font, fillIn(text, k + 1, total));
      if (!words.trim()) return;
      const width = font.widthOfTextAtSize(words, edge.size) / f.shownW;
      const u = edge.align === 'left' ? margin : edge.align === 'right' ? 1 - margin - width : (1 - width) / 2;
      const v = top ? margin + (edge.size * 0.82) / f.shownH : 1 - margin;
      const p = spot(f, u, v);
      page.drawText(words, { x: p.x, y: p.y, size: edge.size, font, color: rgb(0.2, 0.2, 0.22), rotate: degrees(f.turn) });
    };
    put(edge.header, true);
    const number = edge.numbers === 'n' ? `${k + 1}` : edge.numbers === 'n-of' ? `${k + 1} / ${total}` : '';
    put([edge.footer, number].filter(Boolean).join('   '), false);
  });
  return save(doc);
}

export interface Watermark {
  readonly text: string;
  readonly size: number;
  readonly opacity: number;
  readonly colour: Colour;
  /** Corner to corner, or flat across. */
  readonly slant: boolean;
}

/** The same words across the middle of every page, faint. */
export async function watermark(data: Bytes, mark: Watermark): Promise<Bytes> {
  const doc = await open(data);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const words = writable(font, mark.text);
  if (!words.trim()) return data;
  for (const page of doc.getPages()) {
    const f = frameOf(page);
    const width = font.widthOfTextAtSize(words, mark.size);
    const tilt = mark.slant ? Math.atan2(f.shownH, f.shownW) * (180 / Math.PI) : 0;
    /* The words' middle on the page's middle: start half their length back
       along the tilt, and half their height down across it. */
    const rad = (tilt * Math.PI) / 180;
    const cu = 0.5 - (Math.cos(rad) * width / 2 - Math.sin(rad) * mark.size * 0.35) / f.shownW;
    const cv = 0.5 + (Math.sin(rad) * width / 2 + Math.cos(rad) * mark.size * 0.35) / f.shownH;
    const p = spot(f, cu, cv);
    page.drawText(words, {
      x: p.x, y: p.y, size: mark.size, font, color: colourOf(mark.colour), opacity: mark.opacity,
      rotate: degrees(f.turn + tilt),
    });
  }
  return save(doc);
}

export interface Bates {
  readonly prefix: string;
  readonly start: number;
  readonly digits: number;
  readonly suffix: string;
  readonly size: number;
}

/** The number each page gets, in order: prefix, a zero-padded count, suffix. */
export const batesLabel = (b: Bates, k: number): string =>
  `${b.prefix}${String(Math.max(0, Math.floor(b.start)) + k).padStart(Math.max(1, Math.min(12, b.digits)), '0')}${b.suffix}`;

/** A running number on the foot-right of every page, the way legal bundles are numbered. */
export async function batesNumber(data: Bytes, b: Bates): Promise<Bytes> {
  return headerFooterEach(data, (k) => batesLabel(b, k), b.size);
}

async function headerFooterEach(data: Bytes, label: (k: number) => string, size: number): Promise<Bytes> {
  const doc = await open(data);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.getPages().forEach((page, k) => {
    const f = frameOf(page);
    const words = writable(font, label(k));
    const width = font.widthOfTextAtSize(words, size) / f.shownW;
    const p = spot(f, 1 - 0.035 - width, 1 - 0.02);
    page.drawText(words, { x: p.x, y: p.y, size, font, color: rgb(0.05, 0.05, 0.08), rotate: degrees(f.turn) });
  });
  return save(doc);
}

/**
 * A colour behind everything on every page. Put first in the page's
 * drawing, so the page's own words and pictures land on top of it.
 */
export async function background(data: Bytes, colour: Colour): Promise<Bytes> {
  const doc = await open(data);
  for (const page of doc.getPages()) {
    const box = page.getMediaBox();
    const under = doc.context.register(doc.context.contentStream([
      pushGraphicsState(),
      setFillingRgbColor(colour[0], colour[1], colour[2]),
      rectangle(box.x, box.y, box.width, box.height),
      fill(),
      popGraphicsState(),
    ]));
    const contents = page.node.get(PDFName.of('Contents'));
    const list = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    page.node.set(PDFName.of('Contents'), doc.context.obj([under, ...list]));
  }
  return save(doc);
}

/* ── Forms ──────────────────────────────────────────────────────────────── */

/** The form fields already in the document, to be filled in. */
export async function formFields(data: Bytes): Promise<FormField[]> {
  const doc = await open(data);
  let fields;
  try {
    fields = doc.getForm().getFields();
  } catch {
    return [];
  }
  return fields.map((field): FormField => {
    const name = field.getName();
    if (field instanceof PDFTextField) return { name, kind: 'text', value: field.getText() ?? '', options: [] };
    if (field instanceof PDFCheckBox) return { name, kind: 'check', value: field.isChecked(), options: [] };
    if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
      return { name, kind: 'choice', value: field.getSelected()[0] ?? '', options: field.getOptions() };
    }
    if (field instanceof PDFRadioGroup) return { name, kind: 'radio', value: field.getSelected() ?? '', options: field.getOptions() };
    return { name, kind: 'other', value: '', options: [] };
  });
}

/** Fill the document's own form fields; `flatten` makes them part of the page, no longer editable. */
export async function fillForm(data: Bytes, values: Readonly<Record<string, string | boolean>>, flatten = false): Promise<Bytes> {
  const doc = await open(data);
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const [name, value] of Object.entries(values)) {
    const field = form.getFieldMaybe(name);
    if (!field) continue;
    try {
      if (field instanceof PDFTextField) field.setText(writable(font, String(value)));
      else if (field instanceof PDFCheckBox) (value === true ? field.check() : field.uncheck());
      else if ((field instanceof PDFDropdown || field instanceof PDFOptionList) && typeof value === 'string' && value) field.select(value);
      else if (field instanceof PDFRadioGroup && typeof value === 'string' && value) field.select(value);
    } catch {
      /* A value the field will not take (too long for a combed field, an
         option it does not have) leaves that field as it was. */
    }
  }
  form.updateFieldAppearances(font);
  if (flatten) form.flatten();
  return save(doc);
}

/* ── Protect, and what is hidden in a file ──────────────────────────────── */

export interface Lock {
  readonly open: string;
  /** May the reader print, and copy words out. Changing it always needs the owner. */
  readonly print: boolean;
  readonly copy: boolean;
}

/**
 * A password to open the document (AES-256). The owner's password is a
 * different, random one, so the restrictions cannot be lifted with the
 * password that opens it.
 */
export async function protect(data: Bytes, lock: Lock): Promise<Bytes> {
  if (lock.open.length < 4) throw new Error('short-password');
  const doc = await open(data);
  const owner = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('');
  doc.encrypt({
    userPassword: lock.open,
    ownerPassword: owner,
    permissions: {
      printing: lock.print ? 'highResolution' : false,
      copying: lock.copy,
      contentAccessibility: true,
      modifying: false,
      annotating: false,
      fillingForms: true,
      documentAssembly: false,
    },
  });
  return doc.save();
}

/** Copy the document information a file carries across to a new one. */
function carryInfo(from: PDFDocument, to: PDFDocument): void {
  const title = from.getTitle();
  if (title) to.setTitle(title);
}

/**
 * The document with nothing hidden in it: no author, title, keywords or
 * dates; no embedded files; nothing that runs when it opens; no actions on
 * its pages; no attachments or scripts on its links. Only the pages, copied
 * into a new file, and their visible comments.
 */
export async function sanitize(data: Bytes): Promise<Bytes> {
  const was = await open(data);
  const doc = await PDFDocument.create({ updateMetadata: false });
  (await doc.copyPages(was, was.getPageIndices())).forEach((page) => doc.addPage(page));
  for (const page of doc.getPages()) {
    page.node.delete(PDFName.of('AA'));
    page.node.delete(PDFName.of('PieceInfo'));
    page.node.delete(PDFName.of('Metadata'));
    const annots = page.node.Annots();
    if (!annots) continue;
    const keep = annots.asArray().filter((ref) => {
      const annot = doc.context.lookup(ref);
      if (!(annot instanceof PDFDict)) return false;
      const subtype = annot.get(PDFName.of('Subtype'));
      if (subtype === PDFName.of('FileAttachment') || subtype === PDFName.of('Sound') || subtype === PDFName.of('Movie') || subtype === PDFName.of('RichMedia')) return false;
      annot.delete(PDFName.of('AA'));
      const action = annot.lookup(PDFName.of('A'));
      if (action instanceof PDFDict && action.get(PDFName.of('S')) !== PDFName.of('URI') && action.get(PDFName.of('S')) !== PDFName.of('GoTo')) {
        annot.delete(PDFName.of('A'));
      }
      return true;
    });
    page.node.set(PDFName.of('Annots'), doc.context.obj(keep));
  }
  doc.setProducer('FutureBox');
  doc.setCreator('FutureBox');
  return doc.save();
}

/** What the file says about itself, for the room to show before it is cleaned. */
export async function hiddenInfo(data: Bytes): Promise<{ readonly title: string; readonly author: string; readonly subject: string; readonly keywords: string; readonly creator: string; readonly producer: string; readonly script: boolean; readonly attachments: boolean }> {
  const doc = await open(data);
  const names = doc.catalog.lookup(PDFName.of('Names'));
  const has = (key: string) => names instanceof PDFDict && names.has(PDFName.of(key));
  return {
    title: doc.getTitle() ?? '',
    author: doc.getAuthor() ?? '',
    subject: doc.getSubject() ?? '',
    keywords: doc.getKeywords() ?? '',
    creator: doc.getCreator() ?? '',
    producer: doc.getProducer() ?? '',
    script: has('JavaScript') || doc.catalog.has(PDFName.of('OpenAction')) || doc.catalog.has(PDFName.of('AA')),
    attachments: has('EmbeddedFiles'),
  };
}

/* ── Redact ─────────────────────────────────────────────────────────────── */

/**
 * Pages replaced by pictures of themselves. This is how a redaction is made
 * safe: the room draws the page, paints the boxes on the drawing, and the
 * page becomes that drawing — the words under the boxes are not hidden, they
 * are gone, and no text, layer or comment of the old page is left to copy
 * out of the file.
 */
export async function replaceWithPictures(data: Bytes, pictures: readonly { readonly page: number; readonly data: Bytes; readonly type: 'png' | 'jpg' }[]): Promise<Bytes> {
  const doc = await open(data);
  const count = doc.getPageCount();
  for (const one of [...pictures].sort((a, b) => b.page - a.page)) {
    if (one.page < 0 || one.page >= count) continue;
    const f = frameOf(doc.getPage(one.page));
    const image = one.type === 'png' ? await doc.embedPng(one.data) : await doc.embedJpg(one.data);
    doc.removePage(one.page);
    const page = doc.insertPage(one.page, [f.shownW, f.shownH]);
    page.drawImage(image, { x: 0, y: 0, width: f.shownW, height: f.shownH });
  }
  return save(doc);
}

/* ── Convert ────────────────────────────────────────────────────────────── */

/** A file's name with a new ending. */
export const renamed = (name: string, ending: string): string =>
  `${(name.replace(/\.[a-z0-9]{1,5}$/i, '') || 'document').slice(0, 80)}${ending}`;
