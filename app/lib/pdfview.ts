/**
 * Showing a PDF: pages drawn onto a canvas, and the words on them found.
 *
 * pdf.js, loaded only when the document room opens — imported at the top of
 * a file, its megabytes would join the bundle every member downloads on
 * their first visit, including everybody who never opens a PDF. Its worker
 * and data are served from `public/pdf/` (copied there by
 * `scripts/nam-copy.mjs`), because the app's content policy refuses a
 * worker from anywhere else.
 *
 * The writing is `pdfwork.ts`; this file only reads.
 */
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';

type Lib = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
let lib: Promise<Lib> | null = null;

async function pdfjs(): Promise<Lib> {
  /* The legacy build. The modern one leans on JavaScript newer than the
     phones people own (`Map.getOrInsertComputed`), and drew every page blank
     on the Chromium the probes run — with no error a person would see. */
  lib ??= import('pdfjs-dist/legacy/build/pdf.mjs').then((one) => {
    one.GlobalWorkerOptions.workerSrc = '/pdf/pdf.worker.min.mjs';
    return one;
  });
  return lib;
}

export type Shown = PDFDocumentProxy;

/** Why a file would not open: it wants a password, the password was wrong, or it is not a PDF. */
export type OpenFail = 'password' | 'wrong-password' | 'broken';

/** The document, ready to draw. A copy of the bytes goes to the worker, so the room keeps its own. */
/** `close` lets the worker go when the room is done with this version. */
export async function show(data: Uint8Array, password?: string): Promise<{ ok: true; doc: Shown; close: () => void } | { ok: false; why: OpenFail }> {
  const one = await pdfjs();
  const task = one.getDocument({
    data: data.slice(),
    password,
    cMapUrl: '/pdf/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdf/standard_fonts/',
    iccUrl: '/pdf/iccs/',
    wasmUrl: '/pdf/wasm/',
    verbosity: 0,
  });
  try {
    return { ok: true, doc: await task.promise, close: () => { void task.destroy(); } };
  } catch (problem) {
    const name = (problem as { name?: string })?.name;
    const code = (problem as { code?: number })?.code;
    if (name === 'PasswordException') return { ok: false, why: code === 2 ? 'wrong-password' : 'password' };
    return { ok: false, why: 'broken' };
  }
}

/** A page's size as it is shown (turned by its rotation), in points. */
export function shownSize(page: PDFPageProxy): { readonly w: number; readonly h: number } {
  const view = page.getViewport({ scale: 1 });
  return { w: view.width, h: view.height };
}

/**
 * One page drawn onto `canvas`, its longest side `longest` pixels. Comments
 * and filled fields are drawn too, so what is shown is what the file holds.
 */
export async function draw(doc: Shown, index: number, canvas: HTMLCanvasElement, longest: number): Promise<void> {
  const one = await pdfjs();
  const page = await doc.getPage(index + 1);
  const base = page.getViewport({ scale: 1 });
  const scale = longest / Math.max(base.width, base.height);
  const view = page.getViewport({ scale });
  canvas.width = Math.max(1, Math.round(view.width));
  canvas.height = Math.max(1, Math.round(view.height));
  await page.render({ canvas, viewport: view, annotationMode: one.AnnotationMode.ENABLE }).promise;
}

/** A run of words on a page, where it sits on the page as shown (nought to one, from the top-left). */
export interface Words {
  readonly page: number;
  readonly text: string;
  readonly u1: number;
  readonly v1: number;
  readonly u2: number;
  readonly v2: number;
  /** Its size in points, and the kind of letter, so a retyped line can match it. */
  readonly size: number;
  readonly font: 'sans' | 'serif' | 'mono';
}

/** Every run of words on a page. */
export async function wordsOn(doc: Shown, index: number): Promise<Words[]> {
  const page = await doc.getPage(index + 1);
  const view = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const styles = content.styles as Record<string, { fontFamily?: string }>;
  const out: Words[] = [];
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue;
    const [a, b, , , e, f] = item.transform as number[];
    const size = Math.hypot(a, b) || Math.abs(item.height) || 10;
    const [x1, y1] = view.convertToViewportPoint(e, f);
    const [x2, y2] = view.convertToViewportPoint(e + item.width * (a / size || 1), f + item.width * (b / size || 0));
    const [x3, y3] = view.convertToViewportPoint(e - size * (b / size || 0), f + size * (a / size || 1));
    const xs = [x1, x2, x3];
    const ys = [y1, y2, y3];
    const family = (styles[item.fontName]?.fontFamily ?? '').toLowerCase();
    out.push({
      page: index,
      text: item.str,
      u1: Math.min(...xs) / view.width,
      v1: Math.min(...ys) / view.height,
      u2: Math.max(...xs) / view.width,
      v2: (Math.max(...ys) + size * 0.22 * view.scale) / view.height,
      size,
      font: family.includes('mono') ? 'mono' : family.includes('serif') && !family.includes('sans') ? 'serif' : 'sans',
    });
  }
  return out;
}

/**
 * Where a word or phrase appears, page by page, as boxes over the runs that
 * hold it — for finding words to redact. Each box is the part of its run the
 * match covers, measured by letters along the run.
 */
export async function findWords(doc: Shown, wanted: string): Promise<Words[]> {
  const needle = wanted.trim().toLowerCase();
  if (!needle) return [];
  const found: Words[] = [];
  for (let k = 0; k < doc.numPages; k += 1) {
    for (const run of await wordsOn(doc, k)) {
      const hay = run.text.toLowerCase();
      for (let at = hay.indexOf(needle); at >= 0; at = hay.indexOf(needle, at + needle.length)) {
        const share = (n: number) => n / Math.max(1, run.text.length);
        const across = run.u2 - run.u1;
        found.push({ ...run, text: run.text.slice(at, at + needle.length), u1: run.u1 + across * share(at), u2: run.u1 + across * share(at + needle.length) });
      }
    }
  }
  return found;
}

/** Every page's words as plain text, a blank line between pages. */
export async function allText(doc: Shown): Promise<string> {
  const pages: string[] = [];
  for (let k = 0; k < doc.numPages; k += 1) {
    const page = await doc.getPage(k + 1);
    const content = await page.getTextContent();
    let line = '';
    const lines: string[] = [];
    for (const item of content.items) {
      if (!('str' in item)) continue;
      line += item.str;
      if (item.hasEOL) { lines.push(line); line = ''; }
    }
    if (line) lines.push(line);
    pages.push(lines.join('\n'));
  }
  return pages.join('\n\n');
}
