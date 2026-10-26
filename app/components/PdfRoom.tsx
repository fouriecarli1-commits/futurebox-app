'use client';

/**
 * The document room: a PDF workbench on the phone.
 *
 * The owner, 17 October 2026: *"Die PDF craft is nogal belangrik."* — with
 * screenshots of a full PDF workbench:
 * organise pages, combine files, comment, prepare a form, edit (text,
 * pictures, header and footer, watermark, links, Bates numbering,
 * background), fill and sign, redact (boxes, pages, find and redact,
 * properties, sanitise), protect, and convert.
 *
 * Everything happens on the device. The document is a list of byte arrays —
 * each change is a new one, so Undo is the one before — and marks being
 * placed (a signature, a comment, a box to black out) float over the page
 * until they are written in, so they can still be moved or taken away. The
 * writing is `lib/pdfwork.ts`, the drawing `lib/pdfview.ts`; both are loaded
 * only when this room opens.
 */
import { SITE_HOST } from '../lib/brand';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Calendar, Check, ChevronLeft, ChevronRight, CircleDot, Combine, Download, Eraser, FileOutput,
  FilePen, FilePlus2, FileText, Files, Hash, Highlighter, ImagePlus, Link2, Lock, LockOpen, MessageSquare, Minus,
  PaintBucket, PenLine, RotateCcw, RotateCw, Search, ShieldCheck, Signature, SquareCheck, Stamp, StickyNote,
  Strikethrough, Trash2, Type, Underline, Undo2, X,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import SignaturePad from './SignaturePad';
import { barClearance } from './TabBar';
import { fit } from '../lib/imagefile';
import { zipOf } from '../lib/zip';
import type { Limit } from '../lib/squeeze';
import FileSize, { type Estimate } from './FileSize';
import { PDF_TOOLS, pdfTool, type PdfToolId } from '../lib/pdftools';
import type { Box, Colour, FontKind, FormField, Mark, Piece } from '../lib/pdfwork';
import type { Shown, Words } from '../lib/pdfview';
import type { Block } from '../lib/pdfblocks';

const work = () => import('../lib/pdfwork');
const viewer = () => import('../lib/pdfview');

/* ── Words ──────────────────────────────────────────────────────────────── */

const WORDS = {
  title: ['Documents', 'Dokumente'],
  close: ['Close the document room', 'Maak die dokumentkamer toe'],
  open: ['Open a PDF', 'Maak ’n PDF oop'],
  openAlso: ['or pictures, to make one', 'of prente, om een te maak'],
  another: ['Open another', 'Maak ’n ander oop'],
  allTools: ['All PDF tools', 'Alle PDF-gereedskap'],
  save: ['Save', 'Stoor'],
  undo: ['Undo', 'Ontdoen'],
  working: ['Working…', 'Besig…'],
  pick: ['What would you like to do?', 'Wat wil jy doen?'],
  firstOpen: ['Open the PDF to work on first.', 'Maak eers die PDF oop om aan te werk.'],
  page: ['Page', 'Bladsy'],
  of: ['of', 'van'],
  broken: ['That file could not be opened as a PDF.', 'Daardie lêer kon nie as ’n PDF oopgemaak word nie.'],
  cantDraw: ['This page could not be shown on this device.', 'Hierdie bladsy kon nie op hierdie toestel gewys word nie.'],
  needsPassword: ['This PDF has a password. Type it to open it.', 'Hierdie PDF het ’n wagwoord. Tik dit om dit oop te maak.'],
  wrongPassword: ['That is not its password.', 'Dit is nie sy wagwoord nie.'],
  password: ['Password', 'Wagwoord'],
  unlock: ['Open it', 'Maak dit oop'],
  pending: ['not written in yet', 'nog nie ingeskryf nie'],
  apply: ['Write them in', 'Skryf hulle in'],
  remove: ['Take it away', 'Haal dit weg'],
  saved: ['Saved to your device.', 'Op jou toestel gestoor.'],
  failed: ['That did not work on this document.', 'Dit het nie op hierdie dokument gewerk nie.'],
  // Organise
  selectHow: ['Tap pages to choose them.', 'Tik op bladsye om hulle te kies.'],
  chosen: ['chosen', 'gekies'],
  all: ['All', 'Almal'],
  none: ['None', 'Geen'],
  turnLeft: ['Turn left', 'Draai links'],
  turnRight: ['Turn right', 'Draai regs'],
  delete: ['Delete', 'Vee uit'],
  extract: ['Take out as a PDF', 'Haal uit as PDF'],
  earlier: ['Earlier', 'Vroeër'],
  later: ['Later', 'Later'],
  blank: ['Blank page', 'Leë bladsy'],
  insertFile: ['Insert a file', 'Voeg ’n lêer in'],
  everyPage: ['A document needs at least one page.', '’n Dokument het ten minste een bladsy nodig.'],
  chooseFirst: ['Choose a page first.', 'Kies eers ’n bladsy.'],
  // Combine
  combineHow: ['Add PDFs and pictures, put them in order, then combine.', 'Voeg PDF’s en prente by, sit hulle in volgorde, en voeg dan saam.'],
  addFiles: ['Add files', 'Voeg lêers by'],
  combine: ['Combine', 'Voeg saam'],
  thisOne: ['This document', 'Hierdie dokument'],
  // Pens
  note: ['Sticky note', 'Plaknota'],
  highlight: ['Highlight', 'Lig uit'],
  underline: ['Underline', 'Onderstreep'],
  strike: ['Strike through', 'Haal deur'],
  retype: ['Edit text', 'Wysig teks'],
  text: ['Add text', 'Sit teks by'],
  image: ['Picture', 'Prent'],
  link: ['Link', 'Skakel'],
  tick: ['Tick', 'Regmerkie'],
  cross: ['Cross', 'Kruisie'],
  dot: ['Dot', 'Kolletjie'],
  line: ['Line', 'Lyn'],
  date: ['Date', 'Datum'],
  signature: ['Signature', 'Handtekening'],
  initials: ['Initials', 'Voorletters'],
  box: ['Mark an area', 'Merk ’n area'],
  ftext: ['Text box', 'Teksblokkie'],
  fcheck: ['Tick box', 'Merkblokkie'],
  fdate: ['Date box', 'Datumblokkie'],
  fsign: ['Signature box', 'Handtekeningblokkie'],
  // Hints per pen
  hintTap: ['Tap the page where it goes.', 'Tik op die bladsy waar dit moet kom.'],
  hintDrag: ['Drag across the page.', 'Sleep oor die bladsy.'],
  hintWords: ['Drag across the words, or tap a line of them.', 'Sleep oor die woorde, of tik op ’n reël.'],
  hintRetype: ['Every paragraph and heading has a frame. Tap one and type straight into it. The old words are covered over, not taken out: to remove words for good, use Redact.', 'Elke paragraaf en opskrif het ’n raam. Tik op een en tik reg daarin. Die ou woorde word toegemaak, nie uitgehaal nie: gebruik Swart uit om woorde vir altyd te verwyder.'],
  hintPicture: ['Choose a picture, then tap where it goes.', 'Kies ’n prent, en tik dan waar dit moet kom.'],
  hintSign: ['Make your signature, then tap where it goes.', 'Maak jou handtekening, en tik dan waar dit moet kom.'],
  noWordsHere: ['There are no words there to change. A scanned page is a picture: use Add text over it instead.', 'Daar is nie woorde daar om te verander nie. ’n Geskandeerde bladsy is ’n prent: gebruik eerder Sit teks by.'],
  // Selected mark
  words: ['Words', 'Woorde'],
  size: ['Size', 'Grootte'],
  colour: ['Colour', 'Kleur'],
  url: ['Web address', 'Webadres'],
  fieldName: ['Box name', 'Blokkie se naam'],
  noteText: ['Your comment', 'Jou kommentaar'],
  font: ['Letters', 'Letters'],
  sans: ['Plain', 'Gewoon'],
  serif: ['Book', 'Boek'],
  mono: ['Typewriter', 'Tikmasjien'],
  // Whole document
  wholeDoc: ['The whole document', 'Die hele dokument'],
  header: ['Header', 'Kopskrif'],
  footer: ['Footer', 'Voetskrif'],
  numbers: ['Page numbers', 'Bladsynommers'],
  numNone: ['None', 'Geen'],
  numN: ['3', '3'],
  numNOf: ['3 / 12', '3 / 12'],
  headerFooter: ['Header and footer', 'Kop- en voetskrif'],
  headerHelp: ['{n} is the page number and {total} the number of pages.', '{n} is die bladsynommer en {total} die aantal bladsye.'],
  watermark: ['Watermark', 'Watermerk'],
  watermarkText: ['CONFIDENTIAL', 'VERTROULIK'],
  faint: ['How faint', 'Hoe flou'],
  slant: ['Corner to corner', 'Hoek tot hoek'],
  bates: ['Bates numbering', 'Bates-nommering'],
  prefix: ['Before the number', 'Voor die nommer'],
  startAt: ['Start at', 'Begin by'],
  digits: ['Digits', 'Syfers'],
  background: ['Background', 'Agtergrond'],
  put: ['Put it on', 'Sit dit op'],
  // Sign
  formFields: ['The form’s own boxes', 'Die vorm se eie blokkies'],
  fill: ['Fill them in', 'Vul hulle in'],
  flatten: ['Lock the answers into the page', 'Sluit die antwoorde in die bladsy vas'],
  makeSignature: ['Make your signature', 'Maak jou handtekening'],
  makeInitials: ['Make your initials', 'Maak jou voorletters'],
  drawIt: ['Draw', 'Teken'],
  typeIt: ['Type', 'Tik'],
  uploadIt: ['Upload', 'Laai op'],
  uploadHint: ['Choose a photo of your signature — the paper is taken out', 'Kies ’n foto van jou handtekening — die papier word uitgehaal'],
  clear: ['Clear', 'Maak skoon'],
  use: ['Use it', 'Gebruik dit'],
  yourName: ['Your name', 'Jou naam'],
  signHere: ['Sign with your finger', 'Teken met jou vinger'],
  // Redact
  redactHow: ['Mark what must go. Nothing is removed until you press Redact.', 'Merk wat moet weg. Niks word verwyder voordat jy Swart uit druk nie.'],
  wholePage: ['This whole page', 'Hierdie hele bladsy'],
  find: ['Find words to redact', 'Soek woorde om uit te swart'],
  findIt: ['Find', 'Soek'],
  foundSome: ['found', 'gevind'],
  foundNone: ['Not found in this document.', 'Nie in hierdie dokument gevind nie.'],
  boxColour: ['Box colour', 'Blokkie se kleur'],
  label: ['Words on the box', 'Woorde op die blokkie'],
  sanitiseToo: ['Also remove hidden information', 'Verwyder ook versteekte inligting'],
  redactNow: ['Redact', 'Swart uit'],
  redactNote: ['Redacted pages become pictures of themselves, so the words under the boxes are gone, not hidden.', 'Uitgeswarte bladsye word prente van hulself, so die woorde onder die blokkies is weg, nie versteek nie.'],
  marked: ['marked', 'gemerk'],
  // Protect
  protectHow: ['A password to open it. Printing and copying words out can be allowed or not.', '’n Wagwoord om dit oop te maak. Druk en woorde uitkopieer kan toegelaat word of nie.'],
  repeat: ['The password again', 'Die wagwoord weer'],
  allowPrint: ['Allow printing', 'Laat druk toe'],
  allowCopy: ['Allow copying words out', 'Laat woorde uitkopieer toe'],
  protect: ['Protect it', 'Beskerm dit'],
  protectOn: ['It will be saved with a password.', 'Dit sal met ’n wagwoord gestoor word.'],
  unprotect: ['Take the password off', 'Haal die wagwoord af'],
  mismatch: ['The two passwords are not the same.', 'Die twee wagwoorde is nie dieselfde nie.'],
  tooShort: ['A password needs at least 4 letters.', '’n Wagwoord het ten minste 4 letters nodig.'],
  hidden: ['Hidden information', 'Versteekte inligting'],
  hiddenNone: ['Nothing hidden was found.', 'Niks versteek is gevind nie.'],
  scripts: ['Something that runs when it opens', 'Iets wat loop wanneer dit oopmaak'],
  attachments: ['Files inside it', 'Lêers binne-in'],
  clean: ['Remove hidden information', 'Verwyder versteekte inligting'],
  cleaned: ['Hidden information removed.', 'Versteekte inligting verwyder.'],
  // Form
  formHow: ['Drag a box where somebody should type, tick or sign.', 'Sleep ’n blokkie waar iemand moet tik, merk of teken.'],
  // Convert
  toPictures: ['Every page as a picture', 'Elke bladsy as ’n prent'],
  smaller: ['Make it smaller', 'Maak dit kleiner'],
  smallerWhat: ['The pages are redrawn as pictures and squeezed until the file fits. The words can then no longer be selected or searched, and links and form boxes go — keep the original for those.', 'Die bladsye word as prente oorgeteken en saamgepers tot die lêer pas. Die woorde kan dan nie meer gekies of gesoek word nie, en skakels en vormblokkies verdwyn — hou die oorspronklike daarvoor.'],
  smallerGo: ['Make it smaller and save', 'Maak kleiner en stoor'],
  smallerIdle: ['It says how big the file came out once it is made.', 'Dit sê hoe groot die lêer uitgekom het sodra dit gemaak is.'],
  smallerNot: ['This PDF is already smaller than pictures of its pages would be, so nothing was saved: it is as small as it gets.', 'Hierdie PDF is reeds kleiner as wat prente van sy bladsye sou wees, so niks is gestoor nie: dit is so klein as wat dit kan wees.'],
  toText: ['The words as text', 'Die woorde as teks'],
  picturesIn: ['Pictures into a PDF', 'Prente in ’n PDF'],
} as const;
type Word = keyof typeof WORDS;

/* ── Pens ───────────────────────────────────────────────────────────────── */

type Pen =
  | 'note' | 'highlight' | 'underline' | 'strike'
  | 'retype' | 'text' | 'image' | 'link'
  | 'tick' | 'cross' | 'dot' | 'line' | 'date' | 'signature' | 'initials'
  | 'box'
  | 'ftext' | 'fcheck' | 'fdate' | 'fsign';

const PENS: Partial<Record<PdfToolId, readonly Pen[]>> = {
  comment: ['note', 'highlight', 'underline', 'strike'],
  edit: ['retype', 'text', 'image', 'link'],
  sign: ['text', 'tick', 'cross', 'dot', 'line', 'date', 'signature', 'initials'],
  redact: ['box'],
  form: ['ftext', 'fcheck', 'fdate', 'fsign'],
};

const PEN_ICON: Record<Pen, typeof Check> = {
  note: StickyNote, highlight: Highlighter, underline: Underline, strike: Strikethrough,
  retype: FilePen, text: Type, image: ImagePlus, link: Link2,
  tick: Check, cross: X, dot: CircleDot, line: Minus, date: Calendar, signature: Signature, initials: PenLine,
  box: Eraser, ftext: Type, fcheck: SquareCheck, fdate: Calendar, fsign: Signature,
};

const DRAGS: ReadonlySet<Pen> = new Set<Pen>(['highlight', 'underline', 'strike', 'link', 'line', 'box', 'ftext', 'fcheck', 'fdate', 'fsign']);

const TOOL_ICON: Record<PdfToolId, typeof Check> = {
  organise: Files, combine: Combine, comment: MessageSquare, edit: FilePen, sign: Signature,
  redact: Eraser, protect: ShieldCheck, form: SquareCheck, convert: FileOutput,
};

const INKS: readonly { readonly id: string; readonly c: Colour }[] = [
  { id: 'black', c: [0.07, 0.07, 0.09] },
  { id: 'blue', c: [0.1, 0.3, 0.85] },
  { id: 'red', c: [0.85, 0.1, 0.12] },
  { id: 'green', c: [0.05, 0.55, 0.25] },
];
const MARKERS: readonly { readonly id: string; readonly c: Colour }[] = [
  { id: 'yellow', c: [1, 0.86, 0.1] },
  { id: 'green', c: [0.45, 0.95, 0.4] },
  { id: 'pink', c: [1, 0.45, 0.75] },
  { id: 'blue', c: [0.35, 0.75, 1] },
];
const PAPERS: readonly { readonly id: string; readonly c: Colour }[] = [
  { id: 'cream', c: [1, 0.97, 0.88] },
  { id: 'mint', c: [0.9, 0.98, 0.93] },
  { id: 'sky', c: [0.9, 0.95, 1] },
  { id: 'rose', c: [1, 0.92, 0.94] },
];
/** Paper is white in every theme: a page, a thumbnail and the signing pad are pictures of paper, not part of the app's skin. */
const PAPER = '#ffffff';
const css = (c: Colour, alpha = 1): string => `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${alpha})`;

/** A mark waiting to be written in. Marks made together (a cover and its new words) share a group and go together. */
/** `block` names the paragraph or heading it rewrites, so its frame steps aside. */
interface Held { readonly id: string; readonly group: string; readonly mark: Mark; readonly block?: string }
/** A box to black out, waiting for Redact. */
interface Cut { readonly id: string; readonly page: number; readonly box: Box }
/** A file waiting to be combined. */
interface Part { readonly id: string; readonly name: string; readonly piece: Piece }
/** A signature or picture made and waiting to be placed. */
interface Ready { readonly data: Uint8Array; readonly type: 'png' | 'jpg'; readonly w: number; readonly h: number; readonly url: string; readonly as: 'signature' | 'initials' | 'image' }

let counter = 0;
const nextId = (): string => `m${Date.now().toString(36)}${(counter += 1)}`;
const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const ordered = (b: Box): Box => ({ u1: Math.min(b.u1, b.u2), v1: Math.min(b.v1, b.v2), u2: Math.max(b.u1, b.u2), v2: Math.max(b.v1, b.v2) });
const pageOf = (m: Mark): number => m.page;

/** A file's bytes. */
const bytesOf = async (file: Blob): Promise<Uint8Array> => new Uint8Array(await file.arrayBuffer());

/** A canvas as PNG or JPEG bytes. */
/** How big a page is drawn before it is squeezed — about 180 dots an inch on A4. */
const SHRINK_LONGEST = 2000;
/** The quality a page picture starts at, with no limit: small, and still easy to read. */
const SHRINK_QUALITY = 0.75;

const canvasBytes = (canvas: HTMLCanvasElement, type: 'png' | 'jpg'): Promise<Uint8Array | null> => new Promise((done) => {
  canvas.toBlob((blob) => { if (!blob) done(null); else void bytesOf(blob).then(done); }, type === 'png' ? 'image/png' : 'image/jpeg', 0.9);
});

/**
 * A picture off the device as PNG bytes a PDF can hold. Through `fit` first,
 * so a camera's two hundred megapixels never reach memory whole.
 */
async function pictureBytes(file: File, longest = 1800): Promise<{ data: Uint8Array; w: number; h: number; url: string } | null> {
  const made = await fit(file, longest);
  if (!made.ok) return null;
  const img = new Image();
  await new Promise<void>((done, fail) => { img.onload = () => done(); img.onerror = () => fail(new Error('picture')); img.src = made.preview; });
  const sheet = document.createElement('canvas');
  sheet.width = img.naturalWidth;
  sheet.height = img.naturalHeight;
  sheet.getContext('2d')?.drawImage(img, 0, 0);
  const data = await canvasBytes(sheet, 'png');
  return data ? { data, w: sheet.width, h: sheet.height, url: made.preview } : null;
}

/** Hand a file to the device to keep. */
function keep(data: Blob, name: string): void {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const pdfBlob = (data: Uint8Array): Blob => new Blob([data.slice().buffer], { type: 'application/pdf' });
const isPdf = (file: File): boolean => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

/* ── The room ───────────────────────────────────────────────────────────── */

export default function PdfRoom({ start, onClose }: { readonly start: PdfToolId | null; readonly onClose: () => void }): React.ReactElement {
  const { lang } = useLang();
  const af = lang === 'af';
  const w = (word: Word): string => WORDS[word][af ? 1 : 0];
  useBackLayer(true, onClose);

  /* The document, every version of it, and what is showing. */
  const [history, setHistory] = useState<Uint8Array[]>([]);
  const bytes = history.length ? history[history.length - 1] : null;
  const [name, setName] = useState('document.pdf');
  const [shown, setShown] = useState<Shown | null>(null);
  const [pages, setPages] = useState(0);
  const [at, setAt] = useState(0);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 595, h: 842 });
  const [tool, setTool] = useState<PdfToolId | null>(start);
  const [pen, setPen] = useState<Pen | null>(null);
  const [held, setHeld] = useState<Held[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');
  const [locked, setLocked] = useState<Uint8Array | null>(null);
  const [lockTry, setLockTry] = useState('');
  const [lockWrong, setLockWrong] = useState(false);
  /* A password to save it with, set in Protect or kept from the one it opened with. */
  const [lock, setLock] = useState<{ open: string; print: boolean; copy: boolean } | null>(null);

  const say = (word: Word | string): void => setSaid(word in WORDS ? w(word as Word) : word);
  /* What the room said goes after a moment, long enough to read. */
  useEffect(() => {
    if (!said) return undefined;
    const gone = window.setTimeout(() => setSaid(''), Math.min(9000, 2500 + said.length * 40));
    return () => window.clearTimeout(gone);
  }, [said]);

  /* ── Opening ── */
  const push = useCallback((next: Uint8Array) => {
    setHistory((was) => [...was.slice(-19), next]);
  }, []);

  const begin = async (data: Uint8Array, fileName: string): Promise<void> => {
    const pdf = await work();
    if (await pdf.isLocked(data)) {
      setLocked(data);
      setName(fileName);
      return;
    }
    try {
      await pdf.pageCount(data);
    } catch {
      say('broken');
      return;
    }
    setHistory([data]);
    setName(fileName);
    setAt(0);
    setHeld([]);
    setCuts([]);
    setLock(null);
    setSaid('');
  };

  const openFiles = async (files: readonly File[]): Promise<void> => {
    if (!files.length) return;
    setBusy(true);
    try {
      if (files.length === 1 && isPdf(files[0])) {
        await begin(await bytesOf(files[0]), files[0].name);
        return;
      }
      /* Pictures, or several files at once: one document made of them all. */
      const piecesIn: Piece[] = [];
      for (const file of files) {
        if (isPdf(file)) piecesIn.push({ data: await bytesOf(file), type: 'pdf' });
        else {
          const pic = await pictureBytes(file);
          if (pic) piecesIn.push({ data: pic.data, type: 'png' });
        }
      }
      if (!piecesIn.length) { say('broken'); return; }
      const pdf = await work();
      await begin(await pdf.combine(piecesIn), 'combined.pdf');
    } catch {
      say('broken');
    } finally {
      setBusy(false);
    }
  };

  const tryPassword = async (): Promise<void> => {
    if (!locked) return;
    setBusy(true);
    try {
      const pdf = await work();
      const open = await pdf.unlock(locked, lockTry);
      setLocked(null);
      setLockWrong(false);
      await begin(open, name);
      /* It came with a password; it keeps it when saved, unless taken off in Protect. */
      setLock({ open: lockTry, print: true, copy: true });
      setLockTry('');
    } catch {
      setLockWrong(true);
    } finally {
      setBusy(false);
    }
  };

  /* Each version of the document, shown. */
  useEffect(() => {
    if (!bytes) { setShown(null); setPages(0); return undefined; }
    let gone = false;
    let close: (() => void) | null = null;
    void viewer().then((v) => v.show(bytes)).then((result) => {
      if (gone) { if (result.ok) result.close(); return; }
      if (!result.ok) { say('broken'); return; }
      close = result.close;
      setShown(result.doc);
      setPages(result.doc.numPages);
      setAt((was) => Math.min(was, result.doc.numPages - 1));
    });
    return () => { gone = true; close?.(); };
  }, [bytes]);

  /* ── Changing the document ── */

  /** Run a change on the document as it stands, marks written in first. */
  const change = async (step: (data: Uint8Array) => Promise<Uint8Array>, done?: Word): Promise<boolean> => {
    if (!bytes) { say('firstOpen'); return false; }
    setBusy(true);
    try {
      const pdf = await work();
      const base = held.length ? await pdf.bake(bytes, held.map((one) => one.mark)) : bytes;
      const next = await step(base);
      push(next);
      setHeld([]);
      setPicked(null);
      if (done) say(done);
      return true;
    } catch (problem) {
      const why = String((problem as Error)?.message ?? '');
      say(why === 'every-page' ? 'everyPage' : why === 'short-password' ? 'tooShort' : 'failed');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const writeIn = (): Promise<boolean> => change(async (data) => data);

  const undo = (): void => {
    if (held.length) { setHeld((was) => { const last = was[was.length - 1]; return was.filter((one) => one.group !== last.group); }); return; }
    if (cuts.length) { setCuts((was) => was.slice(0, -1)); return; }
    setHistory((was) => (was.length > 1 ? was.slice(0, -1) : was));
  };

  const save = async (): Promise<void> => {
    if (!bytes) return;
    setBusy(true);
    try {
      const pdf = await work();
      let out = held.length ? await pdf.bake(bytes, held.map((one) => one.mark)) : bytes;
      if (held.length) { push(out); setHeld([]); }
      if (lock) out = await pdf.protect(out, lock);
      keep(pdfBlob(out), /\.pdf$/i.test(name) ? name : pdf.renamed(name, '.pdf'));
      say('saved');
    } catch {
      say('failed');
    } finally {
      setBusy(false);
    }
  };

  const chooseTool = async (next: PdfToolId): Promise<void> => {
    if (held.length) await writeIn();
    setTool(next);
    setPen(PENS[next]?.[0] ?? null);
    setPicked(null);
    setSaid('');
  };
  useEffect(() => {
    setPen(start ? PENS[start]?.[0] ?? null : null);
  }, [start]);

  /* ── The page as shown ── */
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const glass = useRef<HTMLDivElement | null>(null);
  const [glassWide, setGlassWide] = useState(1);
  const [words, setWords] = useState<Words[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const pageTool = tool !== null && PENS[tool] !== undefined;

  useEffect(() => {
    if (!shown || !pageTool) return undefined;
    let gone = false;
    void (async () => {
      const v = await viewer();
      const page = await shown.getPage(at + 1);
      if (gone) return;
      setSize(v.shownSize(page));
      if (canvas.current) await v.draw(shown, at, canvas.current, 1600);
      const found = await v.wordsOn(shown, at);
      const grouped = await v.blocksOn(shown, at);
      if (!gone) { setWords(found); setBlocks(grouped); }
    })().catch(() => { if (!gone) say('cantDraw'); });
    return () => { gone = true; };
  }, [shown, at, pageTool]);

  useEffect(() => {
    const el = glass.current;
    if (!el) return undefined;
    const watch = new ResizeObserver(() => setGlassWide(el.clientWidth || 1));
    watch.observe(el);
    setGlassWide(el.clientWidth || 1);
    return () => watch.disconnect();
  }, [pageTool, shown]);

  /** Points on the page to pixels on the screen. */
  const perPoint = glassWide / Math.max(1, size.w);

  /** The colour of the page at a spot, from what is drawn. */
  const colourAt = (u: number, v: number): Colour => {
    const el = canvas.current;
    const ctx = el?.getContext('2d', { willReadFrequently: true });
    if (!el || !ctx) return [1, 1, 1];
    const d = ctx.getImageData(Math.round(clamp01(u) * (el.width - 1)), Math.round(clamp01(v) * (el.height - 1)), 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  };
  /** The darkest colour inside a box: the ink of the words in it. */
  const inkIn = (box: Box): Colour => {
    let best: Colour = [0, 0, 0];
    let least = 4;
    for (let k = 0; k < 24; k += 1) {
      const c = colourAt(box.u1 + ((k % 6) + 0.5) / 6 * (box.u2 - box.u1), box.v1 + (Math.floor(k / 6) + 0.5) / 4 * (box.v2 - box.v1));
      const sum = c[0] + c[1] + c[2];
      if (sum < least) { least = sum; best = c; }
    }
    return best;
  };
  /** The paper around a box: the brightest of the colours just outside its corners. */
  const paperAround = (box: Box): Colour => {
    const pad = 0.004;
    const tries: Colour[] = [
      colourAt(box.u1 - pad, box.v1 - pad), colourAt(box.u2 + pad, box.v1 - pad),
      colourAt(box.u1 - pad, box.v2 + pad), colourAt(box.u2 + pad, box.v2 + pad),
    ];
    return tries.reduce((a, b) => (a[0] + a[1] + a[2] >= b[0] + b[1] + b[2] ? a : b));
  };

  /* ── Placing marks ── */
  const [ink, setInk] = useState<Colour>(INKS[0].c);
  const [marker, setMarker] = useState<Colour>(MARKERS[0].c);
  const [ready, setReady] = useState<Ready | null>(null);
  const [drag, setDrag] = useState<{ from: { u: number; v: number }; to: { u: number; v: number } } | null>(null);
  const moving = useRef<{ id: string; u: number; v: number } | null>(null);

  const add = (marks: readonly Mark[], select = true, block?: string): void => {
    const group = nextId();
    const made = marks.map((mark) => ({ id: nextId(), group, mark, ...(block ? { block } : {}) }));
    setHeld((was) => [...was, ...made]);
    if (select && made.length) setPicked(made[made.length - 1].id);
  };

  const spotOf = (event: React.PointerEvent): { u: number; v: number } => {
    const box = glass.current?.getBoundingClientRect();
    if (!box) return { u: 0, v: 0 };
    return { u: clamp01((event.clientX - box.left) / box.width), v: clamp01((event.clientY - box.top) / box.height) };
  };
  /** The run of words under a spot, if there is one. */
  const runAt = (p: { u: number; v: number }): Words | null =>
    words.find((one) => p.u >= one.u1 - 0.004 && p.u <= one.u2 + 0.004 && p.v >= one.v1 - 0.004 && p.v <= one.v2 + 0.004) ?? null;

  const tapped = (p: { u: number; v: number }): void => {
    if (!pen) return;
    const ptSize = 14;
    const today = new Date().toLocaleDateString(af ? 'af-ZA' : 'en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
    switch (pen) {
      case 'note':
        add([{ kind: 'note', page: at, at: p, text: '', colour: MARKERS[0].c }]);
        break;
      case 'text':
        add([{ kind: 'text', page: at, at: { u: p.u, v: Math.max(0, p.v - (ptSize * 0.5) / size.h) }, text: af ? 'Tik hier' : 'Type here', size: 12, colour: ink, font: 'sans' }]);
        break;
      case 'date':
        add([{ kind: 'text', page: at, at: { u: p.u, v: Math.max(0, p.v - (ptSize * 0.5) / size.h) }, text: today, size: 12, colour: ink, font: 'sans' }]);
        break;
      case 'tick':
      case 'cross':
      case 'dot':
        add([{ kind: pen, page: at, at: { u: p.u - (ptSize / 2) / size.w, v: p.v - (ptSize / 2) / size.h }, size: ptSize, colour: ink }]);
        break;
      case 'retype': {
        /* A whole paragraph or heading, edited in place. The owner, 17 October
           2026: *"wanneer mens op 'n hele blok kliek dan moet daai hele blok
           ge-edit kan word."* */
        const block = blocks.find((one) => !held.some((h) => h.block === one.key)
          && p.u >= one.u1 - 0.006 && p.u <= one.u2 + 0.006 && p.v >= one.v1 - 0.006 && p.v <= one.v2 + 0.006);
        if (block) {
          const box = { u1: block.u1 - 0.004, v1: block.v1 - 0.003, u2: block.u2 + 0.004, v2: block.v2 + 0.003 };
          add([
            { kind: 'box', page: at, box, colour: paperAround(box) },
            {
              kind: 'text', page: at, at: { u: block.u1, v: block.v1 + (block.size * 0.18) / size.h }, text: block.text,
              size: Math.round(block.size * 10) / 10, colour: inkIn(block), font: block.font,
              /* A paragraph keeps its own width; a one-line heading may run on to the margin rather than fold. */
              width: block.lines > 1 ? block.u2 - block.u1 + 0.01 : Math.max(block.u2 - block.u1 + 0.01, 0.96 - block.u1),
              lead: Math.round(block.lead * 10) / 10,
            },
          ], true, block.key);
          break;
        }
        const run = runAt(p);
        if (!run) { say('noWordsHere'); break; }
        const box = { u1: run.u1 - 0.002, v1: run.v1 - 0.002, u2: run.u2 + 0.002, v2: run.v2 + 0.002 };
        add([
          { kind: 'box', page: at, box, colour: paperAround(box) },
          { kind: 'text', page: at, at: { u: run.u1, v: run.v1 + (run.size * 0.18) / size.h }, text: run.text, size: Math.round(run.size * 10) / 10, colour: inkIn(run), font: run.font },
        ]);
        break;
      }
      case 'highlight':
      case 'underline':
      case 'strike': {
        const run = runAt(p);
        if (run) add([{ kind: pen, page: at, box: { u1: run.u1, v1: run.v1, u2: run.u2, v2: run.v2 }, colour: pen === 'highlight' ? marker : ink }]);
        break;
      }
      case 'signature':
      case 'initials':
      case 'image': {
        if (!ready) { say(pen === 'image' ? 'hintPicture' : 'hintSign'); break; }
        const wide = ready.as === 'initials' ? 0.14 : ready.as === 'signature' ? 0.32 : 0.4;
        const tall = (wide * size.w * (ready.h / ready.w)) / size.h;
        add([{ kind: 'image', page: at, box: { u1: p.u - wide / 2, v1: p.v - tall / 2, u2: p.u + wide / 2, v2: p.v + tall / 2 }, data: ready.data, type: ready.type }]);
        break;
      }
      default:
        break;
    }
  };

  const dragged = (from: { u: number; v: number }, to: { u: number; v: number }): void => {
    if (!pen) return;
    const box = ordered({ u1: from.u, v1: from.v, u2: to.u, v2: to.v });
    switch (pen) {
      case 'line':
        add([{ kind: 'line', page: at, from, to, width: 1.6, colour: ink }]);
        break;
      case 'highlight':
      case 'underline':
      case 'strike':
        add([{ kind: pen, page: at, box, colour: pen === 'highlight' ? marker : ink }]);
        break;
      case 'link':
        add([{ kind: 'link', page: at, box, url: '' }]);
        break;
      case 'box':
        setCuts((was) => [...was, { id: nextId(), page: at, box }]);
        break;
      case 'ftext':
      case 'fcheck':
      case 'fdate':
      case 'fsign': {
        const field = pen === 'ftext' ? 'text' : pen === 'fcheck' ? 'check' : pen === 'fdate' ? 'date' : 'signature';
        const squared = field === 'check'
          ? (() => { const side = Math.max(box.u2 - box.u1, ((box.v2 - box.v1) * size.h) / size.w); return { ...box, u2: box.u1 + side, v2: box.v1 + (side * size.w) / size.h }; })()
          : box;
        const label = field === 'text' ? (af ? 'Teks' : 'Text') : field === 'check' ? (af ? 'Merk' : 'Tick') : field === 'date' ? (af ? 'Datum' : 'Date') : (af ? 'Handtekening' : 'Signature');
        add([{ kind: 'field', page: at, box: squared, field, name: `${label} ${held.filter((one) => one.mark.kind === 'field').length + 1}` }]);
        break;
      }
      default:
        tapped(to);
    }
  };

  const onDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!pen || busy) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = spotOf(event);
    setPicked(null);
    setDrag({ from: p, to: p });
  };
  const onMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (moving.current) {
      const p = spotOf(event);
      const { id, u, v } = moving.current;
      const du = p.u - u;
      const dv = p.v - v;
      moving.current = { id, u: p.u, v: p.v };
      setHeld((was) => was.map((one) => (one.id === id ? { ...one, mark: shifted(one.mark, du, dv) } : one)));
      return;
    }
    if (drag) setDrag({ from: drag.from, to: spotOf(event) });
  };
  const onUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (moving.current) { moving.current = null; return; }
    if (!drag || !pen) return;
    const to = spotOf(event);
    const far = Math.hypot((to.u - drag.from.u) * size.w, (to.v - drag.from.v) * size.h) > 6;
    setDrag(null);
    if (far && DRAGS.has(pen)) dragged(drag.from, to);
    else tapped(drag.from);
  };

  const pickedHeld = held.find((one) => one.id === picked) ?? null;
  const editPicked = (next: (m: Mark) => Mark): void => {
    setHeld((was) => was.map((one) => (one.id === picked ? { ...one, mark: next(one.mark) } : one)));
  };
  const dropPicked = (): void => {
    if (!pickedHeld) return;
    setHeld((was) => was.filter((one) => one.group !== pickedHeld.group));
    setPicked(null);
  };

  /* ── Signature pad ── */
  const [pad, setPad] = useState<'signature' | 'initials' | null>(null);

  /* ── Organise ── */
  const [chosen, setChosen] = useState<number[]>([]);
  useEffect(() => { setChosen((was) => was.filter((one) => one < pages)); }, [pages]);
  const needChosen = (): number[] | null => {
    if (!chosen.length) { say('chooseFirst'); return null; }
    return chosen;
  };

  /* ── Combine ── */
  const [parts, setParts] = useState<Part[]>([]);
  const addParts = async (files: readonly File[]): Promise<void> => {
    setBusy(true);
    const made: Part[] = [];
    for (const file of files) {
      if (isPdf(file)) made.push({ id: nextId(), name: file.name, piece: { data: await bytesOf(file), type: 'pdf' } });
      else {
        const pic = await pictureBytes(file);
        if (pic) made.push({ id: nextId(), name: file.name, piece: { data: pic.data, type: 'png' } });
      }
    }
    setParts((was) => [...was, ...made]);
    setBusy(false);
  };
  useEffect(() => {
    if (tool !== 'combine' || !bytes) return;
    setParts((was) => (was.some((one) => one.id === 'this') ? was : [{ id: 'this', name: w('thisOne'), piece: { data: bytes, type: 'pdf' } }, ...was]));
  }, [tool]);

  /* ── Redact ── */
  const [findText, setFindText] = useState('');
  const [found, setFound] = useState<number | null>(null);
  const [redColour, setRedColour] = useState<Colour>([0, 0, 0]);
  const [redLabel, setRedLabel] = useState('');
  const [sanitiseToo, setSanitiseToo] = useState(true);
  const findAndMark = async (): Promise<void> => {
    if (!shown || !findText.trim()) return;
    setBusy(true);
    const v = await viewer();
    const hits = await v.findWords(shown, findText);
    setCuts((was) => [...was, ...hits.map((one) => ({ id: nextId(), page: one.page, box: { u1: one.u1 - 0.002, v1: one.v1 - 0.002, u2: one.u2 + 0.002, v2: one.v2 + 0.002 } }))]);
    setFound(hits.length);
    setBusy(false);
  };
  const redactNow = async (): Promise<void> => {
    if (!shown || !cuts.length) return;
    const v = await viewer();
    const byPage = new Map<number, Box[]>();
    cuts.forEach((one) => byPage.set(one.page, [...(byPage.get(one.page) ?? []), one.box]));
    const pictures: { page: number; data: Uint8Array; type: 'jpg' }[] = [];
    setBusy(true);
    for (const [page, boxes] of byPage) {
      const sheet = document.createElement('canvas');
      await v.draw(shown, page, sheet, 2200);
      const ctx = sheet.getContext('2d');
      if (!ctx) continue;
      for (const box of boxes) {
        const x = box.u1 * sheet.width;
        const y = box.v1 * sheet.height;
        const bw = (box.u2 - box.u1) * sheet.width;
        const bh = (box.v2 - box.v1) * sheet.height;
        ctx.fillStyle = css(redColour);
        ctx.fillRect(x, y, bw, bh);
        if (redLabel.trim()) {
          const light = redColour[0] + redColour[1] + redColour[2] > 1.5;
          ctx.fillStyle = light ? '#111' : '#fff';
          ctx.font = `bold ${Math.max(8, Math.min(bh * 0.6, 48))}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(redLabel.trim(), x + bw / 2, y + bh / 2, bw * 0.95);
        }
      }
      const data = await canvasBytes(sheet, 'jpg');
      if (data) pictures.push({ page, data, type: 'jpg' });
    }
    const ok = await change(async (data) => {
      const pdf = await work();
      const out = await pdf.replaceWithPictures(data, pictures);
      return sanitiseToo ? pdf.sanitize(out) : out;
    });
    if (ok) { setCuts([]); setFound(null); }
  };

  /* ── Protect ── */
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [allowPrint, setAllowPrint] = useState(true);
  const [allowCopy, setAllowCopy] = useState(false);
  const [hidden, setHidden] = useState<Awaited<ReturnType<Awaited<ReturnType<typeof work>>['hiddenInfo']>> | null>(null);
  useEffect(() => {
    if (tool !== 'protect' || !bytes) return;
    void work().then((pdf) => pdf.hiddenInfo(bytes)).then(setHidden).catch(() => setHidden(null));
  }, [tool, bytes]);

  /* ── Fill: the form's own fields ── */
  const [fields, setFields] = useState<FormField[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [flatten, setFlatten] = useState(false);
  useEffect(() => {
    if (tool !== 'sign' || !bytes) return;
    void work().then((pdf) => pdf.formFields(bytes)).then((list) => {
      setFields(list);
      setAnswers(Object.fromEntries(list.map((one) => [one.name, one.value])));
    }).catch(() => setFields([]));
  }, [tool, bytes]);

  /* ── Whole document settings ── */
  const [edge, setEdge] = useState({ header: '', footer: '', numbers: 'n-of' as 'none' | 'n' | 'n-of', size: 9, align: 'centre' as 'left' | 'centre' | 'right' });
  const [mark, setMark] = useState({ text: WORDS.watermarkText[af ? 1 : 0] as string, opacity: 0.18, slant: true, colour: [0.8, 0.1, 0.1] as Colour, size: 54 });
  const [bates, setBates] = useState({ prefix: 'FB', start: 1, digits: 6 });
  const [paper, setPaper] = useState<Colour>(PAPERS[0].c);

  /* ── Convert ── */
  const [picFormat, setPicFormat] = useState<'png' | 'jpg'>('jpg');
  const [pdfMost, setPdfMost] = useState<Limit>(null);
  const [pdfEstimate, setPdfEstimate] = useState<Estimate | null>(null);
  const [squeezing, setSqueezing] = useState(false);
  const toPictures = async (): Promise<void> => {
    if (!shown || !bytes) return;
    setBusy(true);
    try {
      const v = await viewer();
      const pdf = await work();
      const files: { name: string; data: Blob }[] = [];
      for (let k = 0; k < shown.numPages; k += 1) {
        const sheet = document.createElement('canvas');
        await v.draw(shown, k, sheet, 2000);
        const data = await canvasBytes(sheet, picFormat);
        if (data) files.push({ name: pdf.renamed(name, `-${String(k + 1).padStart(3, '0')}.${picFormat}`), data: new Blob([data.slice().buffer], { type: picFormat === 'png' ? 'image/png' : 'image/jpeg' }) });
      }
      if (files.length === 1) keep(files[0].data, files[0].name);
      else keep(await zipOf(files), pdf.renamed(name, '-pages.zip'));
      say('saved');
    } catch {
      say('failed');
    } finally {
      setBusy(false);
    }
  };
  /* ── Make it smaller ──────────────────────────────────────────────────
     The owner, 18 October 2026: a compressor at every export, and of the
     document room: *"Ja."* A PDF is made smaller the one way that works on
     any PDF — every page redrawn as a picture and squeezed by
     `lib/squeeze.ts` until the file fits — and the panel says what that
     costs: the words stop being words. Each page is drawn once per size and
     kept as a near-lossless JPEG, so the search for a quality decodes small
     files rather than holding a canvas per page in memory. If pictures
     would be bigger than the document already is — a PDF of plain text
     usually is tiny — nothing is saved, and the room says why. */
  const shrink = async (): Promise<void> => {
    if (!shown || !bytes) return;
    setBusy(true);
    setSqueezing(true);
    try {
      const v = await viewer();
      const pdf = await work();
      const { fitUnder } = await import('../lib/squeeze');
      const drawn = new Map<number, Blob[]>();
      const pagesAt = async (share: number): Promise<Blob[]> => {
        const kept = drawn.get(share);
        if (kept) return kept;
        drawn.clear();
        const out: Blob[] = [];
        for (let k = 0; k < shown.numPages; k += 1) {
          const sheet = document.createElement('canvas');
          await v.draw(shown, k, sheet, Math.max(400, Math.round(SHRINK_LONGEST * share)));
          const blob = await new Promise<Blob | null>((done) => sheet.toBlob(done, 'image/jpeg', 0.95));
          sheet.width = 0;
          if (!blob) throw new Error('page');
          out.push(blob);
        }
        drawn.set(share, out);
        return out;
      };
      const made = await fitUnder(async (quality, share) => {
        const pictures: { page: number; data: Uint8Array; type: 'jpg' }[] = [];
        for (const [page, blob] of (await pagesAt(share)).entries()) {
          const bitmap = await createImageBitmap(blob);
          const sheet = document.createElement('canvas');
          sheet.width = bitmap.width;
          sheet.height = bitmap.height;
          sheet.getContext('2d')?.drawImage(bitmap, 0, 0);
          bitmap.close();
          const again = await new Promise<Blob | null>((done) => sheet.toBlob(done, 'image/jpeg', quality));
          sheet.width = 0;
          if (!again) return null;
          pictures.push({ page, data: new Uint8Array(await again.arrayBuffer()), type: 'jpg' });
        }
        const out = await pdf.replaceWithPictures(bytes, pictures);
        return new Blob([out.slice().buffer], { type: 'application/pdf' });
      }, SHRINK_QUALITY, pdfMost);
      if (!made) {
        say('failed');
        return;
      }
      const original = bytes.length;
      if (original <= made.blob.size && (pdfMost === null || original <= pdfMost)) {
        setPdfEstimate({ before: original, after: original, scale: 1, fits: true });
        say('smallerNot');
        return;
      }
      setPdfEstimate({ before: original, after: made.blob.size, scale: made.scale, fits: made.fits });
      keep(made.blob, pdf.renamed(name, '-smaller.pdf'));
      say('saved');
    } catch {
      say('failed');
    } finally {
      setSqueezing(false);
      setBusy(false);
    }
  };

  const toText = async (): Promise<void> => {
    if (!shown) return;
    setBusy(true);
    try {
      const v = await viewer();
      const pdf = await work();
      keep(new Blob([await v.allText(shown)], { type: 'text/plain;charset=utf-8' }), pdf.renamed(name, '.txt'));
      say('saved');
    } finally {
      setBusy(false);
    }
  };

  /* ── Pieces of the screen ── */
  const BTN = 'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-bold text-zinc-100 disabled:opacity-40';
  const GO = 'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-extrabold text-zinc-950 disabled:opacity-40';
  const FIELD = 'h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100';
  const goStyle = { background: 'linear-gradient(120deg, #38bdf8, #a78bfa 60%, #f472b6)' };

  const swatches = (list: readonly { id: string; c: Colour }[], now: Colour, set: (c: Colour) => void, mark: string): React.ReactElement => (
    <div className="flex gap-2" data-pdfswatches={mark}>
      {list.map((one) => {
        const on = one.c.join() === now.join();
        return (
          <button
            key={one.id}
            type="button"
            aria-label={one.id}
            aria-pressed={on}
            onClick={() => set(one.c)}
            className={`h-11 w-11 rounded-full border-2 ${on ? 'border-white' : 'border-zinc-700'}`}
            style={{ background: css(one.c) }}
          />
        );
      })}
    </div>
  );

  const fileInput = (multiple: boolean, accept: string, onFiles: (files: File[]) => void, mark: string, label: React.ReactNode, className = BTN): React.ReactElement => (
    <label className={`${className} cursor-pointer`}>
      {label}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        {...{ [`data-${mark}`]: '' }}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          onFiles(files);
        }}
      />
    </label>
  );

  const ACCEPT_ANY = 'application/pdf,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif';

  /* ── The front page: open a file, or pick what to do ── */
  const front = (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 pb-8 pt-4" data-pdffront>
      {fileInput(true, ACCEPT_ANY, (files) => { void openFiles(files); }, 'pdfopen', bytes ? (
        <span className="flex items-center gap-2 py-3 text-sm font-bold"><FilePlus2 className="h-5 w-5" />{w('another')}</span>
      ) : (
        <span className="flex flex-col items-center gap-1 py-6">
          <FileText className="h-8 w-8" />
          <span className="text-base font-extrabold">{w('open')}</span>
          <span className="text-xs font-semibold text-zinc-400">{w('openAlso')}</span>
        </span>
      ), 'flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-400/60 bg-sky-400/5 text-zinc-100')}
      <p className="text-sm font-bold text-zinc-300">{w('pick')}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PDF_TOOLS.map((one) => {
          const Icon = TOOL_ICON[one.id];
          return (
            <button
              key={one.id}
              type="button"
              data-pdffronttool={one.id}
              data-pdftool={one.id}
              onClick={() => { void chooseTool(one.id); if (!bytes && one.id !== 'combine') say('firstOpen'); }}
              className="flex min-h-[96px] flex-col items-start gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 text-left"
            >
              <Icon className="h-5 w-5 text-sky-300" />
              <span className="text-sm font-extrabold text-zinc-100">{af ? one.af : one.en}</span>
              <span className="text-[11px] leading-snug text-zinc-400">{af ? one.afLine : one.enLine}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ── Organise: every page, small ── */
  const organise = (
    <div className="space-y-3 px-4 pb-6" data-pdforganise>
      <p className="text-xs text-zinc-400">{w('selectHow')} {chosen.length > 0 && <span className="font-bold text-sky-300">{chosen.length} {w('chosen')}</span>}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BTN} onClick={() => setChosen(Array.from({ length: pages }, (_, k) => k))}>{w('all')}</button>
        <button type="button" className={BTN} onClick={() => setChosen([])}>{w('none')}</button>
        <button type="button" className={BTN} data-pdforg="left" onClick={() => { const c = needChosen(); if (c) void change(async (d) => (await work()).rotatePages(d, c, -90)); }}><RotateCcw className="h-4 w-4" />{w('turnLeft')}</button>
        <button type="button" className={BTN} data-pdforg="right" onClick={() => { const c = needChosen(); if (c) void change(async (d) => (await work()).rotatePages(d, c, 90)); }}><RotateCw className="h-4 w-4" />{w('turnRight')}</button>
        <button type="button" className={BTN} data-pdforg="earlier" onClick={() => { const c = needChosen(); if (c && c.length === 1 && c[0] > 0) { void change(async (d) => (await work()).movePage(d, c[0], c[0] - 1)).then((ok) => ok && setChosen([c[0] - 1])); } }}><ArrowLeft className="h-4 w-4" />{w('earlier')}</button>
        <button type="button" className={BTN} data-pdforg="later" onClick={() => { const c = needChosen(); if (c && c.length === 1 && c[0] < pages - 1) { void change(async (d) => (await work()).movePage(d, c[0], c[0] + 1)).then((ok) => ok && setChosen([c[0] + 1])); } }}><ArrowRight className="h-4 w-4" />{w('later')}</button>
        <button type="button" className={BTN} data-pdforg="delete" onClick={() => { const c = needChosen(); if (c) void change(async (d) => (await work()).deletePages(d, c)).then((ok) => ok && setChosen([])); }}><Trash2 className="h-4 w-4" />{w('delete')}</button>
        <button type="button" className={BTN} data-pdforg="extract" onClick={() => { const c = needChosen(); if (c && bytes) void work().then(async (pdf) => keep(pdfBlob(await pdf.extractPages(bytes, c)), pdf.renamed(name, '-pages.pdf'))); }}><FileOutput className="h-4 w-4" />{w('extract')}</button>
        <button type="button" className={BTN} data-pdforg="blank" onClick={() => { const after = chosen.length ? Math.max(...chosen) + 1 : pages; void change(async (d) => (await work()).insertBlank(d, after)); }}><FilePlus2 className="h-4 w-4" />{w('blank')}</button>
        {fileInput(false, ACCEPT_ANY, (files) => {
          const file = files[0];
          if (!file) return;
          const after = chosen.length ? Math.max(...chosen) + 1 : pages;
          void (async () => {
            const piece: Piece | null = isPdf(file)
              ? { data: await bytesOf(file), type: 'pdf' }
              : await pictureBytes(file).then((pic) => (pic ? { data: pic.data, type: 'png' as const } : null));
            if (piece) await change(async (d) => (await work()).insertFrom(d, after, piece));
          })();
        }, 'pdfinsert', <><Files className="h-4 w-4" />{w('insertFile')}</>)}
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {shown && Array.from({ length: pages }, (_, k) => (
          <Thumb key={`${history.length}-${k}`} doc={shown} index={k} on={chosen.includes(k)} onTap={() => setChosen((was) => (was.includes(k) ? was.filter((one) => one !== k) : [...was, k].sort((a, b) => a - b)))} />
        ))}
      </div>
    </div>
  );

  /* ── Combine ── */
  const combinePanel = (
    <div className="mx-auto w-full max-w-xl space-y-3 px-4 pb-6" data-pdfcombinepanel>
      <p className="text-xs text-zinc-400">{w('combineHow')}</p>
      {fileInput(true, ACCEPT_ANY, (files) => { void addParts(files); }, 'pdfcombineadd', <><FilePlus2 className="h-4 w-4" />{w('addFiles')}</>)}
      <ol className="space-y-2">
        {parts.map((one, k) => (
          <li key={one.id} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-2" data-pdfpart>
            <span className="w-6 text-center text-xs font-bold text-zinc-500">{k + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-zinc-100">{one.name}</span>
            <button type="button" aria-label={w('earlier')} className="grid h-11 w-11 place-items-center rounded-lg border border-zinc-700" disabled={k === 0} onClick={() => setParts((was) => { const next = [...was]; [next[k - 1], next[k]] = [next[k], next[k - 1]]; return next; })}><ChevronLeft className="h-4 w-4 rotate-90" /></button>
            <button type="button" aria-label={w('later')} className="grid h-11 w-11 place-items-center rounded-lg border border-zinc-700" disabled={k === parts.length - 1} onClick={() => setParts((was) => { const next = [...was]; [next[k + 1], next[k]] = [next[k], next[k + 1]]; return next; })}><ChevronRight className="h-4 w-4 rotate-90" /></button>
            <button type="button" aria-label={w('remove')} className="grid h-11 w-11 place-items-center rounded-lg border border-zinc-700" onClick={() => setParts((was) => was.filter((x) => x.id !== one.id))}><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        data-pdfcombine
        disabled={parts.length < 2 || busy}
        className={`${GO} w-full`}
        style={goStyle}
        onClick={() => {
          void (async () => {
            setBusy(true);
            try {
              const pdf = await work();
              const out = await pdf.combine(parts.map((one) => one.piece));
              if (bytes) push(out); else await begin(out, 'combined.pdf');
              setName((was) => (bytes ? was : 'combined.pdf'));
              setParts([]);
              setTool('organise');
            } catch {
              say('broken');
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <Combine className="h-4 w-4" />{w('combine')}
      </button>
    </div>
  );

  /* ── A page, with marks over it ── */
  const overlayFor = (one: Held): React.ReactElement | null => {
    const m = one.mark;
    if (m.page !== at) return null;
    const on = one.id === picked;
    const ring = on ? '0 0 0 2px #38bdf8' : 'none';
    const grab = (event: React.PointerEvent): void => {
      event.stopPropagation();
      setPicked(one.id);
      /* A paragraph being rewritten stays where its words were. */
      if (one.block) return;
      const p = spotOf(event);
      moving.current = { id: one.id, u: p.u, v: p.v };
      glass.current?.setPointerCapture(event.pointerId);
    };
    const common = { 'data-pdfmark': m.kind, onPointerDown: grab, role: 'button', 'aria-pressed': on } as const;
    const boxStyle = (b: Box): React.CSSProperties => {
      const o = ordered(b);
      return { position: 'absolute', left: `${o.u1 * 100}%`, top: `${o.v1 * 100}%`, width: `${(o.u2 - o.u1) * 100}%`, height: `${(o.v2 - o.v1) * 100}%`, boxShadow: ring };
    };
    switch (m.kind) {
      case 'text': {
        const face: React.CSSProperties = {
          position: 'absolute', left: `${m.at.u * 100}%`, top: `${m.at.v * 100}%`, fontSize: m.size * perPoint,
          lineHeight: m.lead ? `${m.lead * perPoint}px` : 1.2, color: css(m.colour),
          fontFamily: m.font === 'serif' ? 'Times New Roman, serif' : m.font === 'mono' ? 'Courier New, monospace' : 'Helvetica, Arial, sans-serif',
          fontWeight: m.bold ? 700 : 400,
          ...(m.width ? { width: `${m.width * 100}%`, whiteSpace: 'pre-wrap', overflowWrap: 'break-word' } : { whiteSpace: 'pre' }),
        };
        /* A paragraph being rewritten is typed into right where it stands. */
        if (on && m.width) {
          return (
            <textarea
              key={one.id}
              data-pdfblockedit
              autoFocus
              value={m.text}
              onPointerDown={(event) => event.stopPropagation()}
              onChange={(event) => { const text = event.target.value; editPicked((x) => (x.kind === 'text' ? { ...x, text } : x)); }}
              spellCheck
              style={{
                ...face, ...({ fieldSizing: 'content' } as React.CSSProperties), minHeight: `${(m.lead ?? m.size * 1.2) * perPoint}px`,
                resize: 'none', border: 0, padding: 0, margin: 0, outline: '2px solid #38bdf8', outlineOffset: 2,
                background: 'rgba(56,189,248,0.06)', overflow: 'hidden', touchAction: 'auto',
              }}
            />
          );
        }
        return (
          <div key={one.id} {...common} style={{ ...face, boxShadow: ring, cursor: one.block ? 'text' : 'move' }}>
            {m.text || ' '}
          </div>
        );
      }
      case 'tick':
      case 'cross':
      case 'dot': {
        const s = m.size * perPoint;
        return (
          <svg key={one.id} {...common} width={s} height={s} viewBox="0 0 10 10" style={{ position: 'absolute', left: `${m.at.u * 100}%`, top: `${m.at.v * 100}%`, boxShadow: ring, overflow: 'visible' }}>
            {m.kind === 'dot' && <circle cx="5" cy="5" r="3.2" fill={css(m.colour)} />}
            {m.kind === 'tick' && <polyline points="0.8,5.5 3.8,8.8 9.5,1" fill="none" stroke={css(m.colour)} strokeWidth="1.2" />}
            {m.kind === 'cross' && <g stroke={css(m.colour)} strokeWidth="1.2"><line x1="1.2" y1="1.2" x2="8.8" y2="8.8" /><line x1="8.8" y1="1.2" x2="1.2" y2="8.8" /></g>}
          </svg>
        );
      }
      case 'line':
        return (
          <svg key={one.id} className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1={m.from.u * 100} y1={m.from.v * 100} x2={m.to.u * 100} y2={m.to.v * 100} stroke={css(m.colour)} strokeWidth={m.width * perPoint} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'stroke' }} onPointerDown={grab} data-pdfmark="line" />
          </svg>
        );
      case 'box':
        return <div key={one.id} {...common} style={{ ...boxStyle(m.box), background: css(m.colour, m.opacity ?? 1) }} />;
      case 'image':
        return <ImageMark key={one.id} data={m.data} type={m.type} style={boxStyle(m.box)} grab={grab} />;
      case 'note':
        return (
          <div key={one.id} {...common} style={{ position: 'absolute', left: `${m.at.u * 100}%`, top: `${m.at.v * 100}%`, width: 22 * perPoint, height: 22 * perPoint, background: css(m.colour), borderRadius: 3, boxShadow: on ? ring : '0 1px 3px rgba(0,0,0,0.4)' }}>
            <StickyNote className="h-full w-full p-[15%] text-amber-900" />
          </div>
        );
      case 'highlight':
        return <div key={one.id} {...common} style={{ ...boxStyle(m.box), background: css(m.colour, 0.42), mixBlendMode: 'multiply' }} />;
      case 'underline':
      case 'strike':
        return (
          <div key={one.id} {...common} style={boxStyle(m.box)}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: Math.max(1.5, 1.2 * perPoint), background: css(m.colour), ...(m.kind === 'underline' ? { bottom: 0 } : { top: '50%' }) }} />
          </div>
        );
      case 'link':
        return <div key={one.id} {...common} style={{ ...boxStyle(m.box), border: '2px dashed #38bdf8', background: 'rgba(56,189,248,0.08)' }} />;
      case 'field':
        return (
          <div key={one.id} {...common} style={{ ...boxStyle(m.box), border: '1.5px solid #6366f1', background: 'rgba(99,102,241,0.12)' }}>
            <span className="absolute left-1 top-0.5 text-[10px] font-bold text-indigo-700">{m.name}</span>
          </div>
        );
      default:
        return null;
    }
  };

  const pageView = (
    <div className="px-2 pb-4">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 py-2">
        <button type="button" data-pdfprev aria-label="←" disabled={at === 0} onClick={() => setAt((was) => Math.max(0, was - 1))} className="grid h-11 w-11 place-items-center rounded-full border border-zinc-700 text-zinc-200 disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
        <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-zinc-300">
          <span data-pdfpagenumber>{w('page')} {at + 1} {w('of')} {pages}</span>
          {held.length > 0 && (
            <button type="button" data-pdfapply onClick={() => { void writeIn(); }} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-amber-400/15 px-2.5 text-[11px] font-bold text-amber-200" data-pdfpending>
              <Check className="h-3.5 w-3.5" />{w('apply')} · {held.length}
            </button>
          )}
        </span>
        <button type="button" data-pdfnext aria-label="→" disabled={at >= pages - 1} onClick={() => setAt((was) => Math.min(pages - 1, was + 1))} className="grid h-11 w-11 place-items-center rounded-full border border-zinc-700 text-zinc-200 disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="mx-auto max-w-3xl">
        <div className="relative select-none shadow-[0_8px_30px_rgba(0,0,0,0.5)]" style={{ aspectRatio: `${size.w} / ${size.h}` }}>
          <canvas ref={canvas} data-pdfpage className="absolute inset-0 h-full w-full" style={{ background: PAPER }} />
          <div
            ref={glass}
            data-pdfglass
            className="absolute inset-0"
            style={{ touchAction: pen ? 'none' : 'auto', cursor: pen ? 'crosshair' : 'default' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => { setDrag(null); moving.current = null; }}
          >
            {/* Every paragraph and heading in a frame, while Edit text is
                the pen: the whole page's words standing out to be tapped. */}
            {tool === 'edit' && pen === 'retype' && blocks.filter((b) => !held.some((h) => h.block === b.key)).map((b) => (
              <div
                key={b.key}
                data-pdfblock={b.key}
                aria-hidden
                className="pointer-events-none absolute rounded-[3px]"
                style={{ left: `${(b.u1 - 0.004) * 100}%`, top: `${(b.v1 - 0.003) * 100}%`, width: `${(b.u2 - b.u1 + 0.008) * 100}%`, height: `${(b.v2 - b.v1 + 0.006) * 100}%`, border: '1.5px dashed rgba(14,165,233,0.85)', background: 'rgba(56,189,248,0.08)' }}
              />
            ))}
            {held.map(overlayFor)}
            {cuts.filter((one) => one.page === at).map((one) => {
              const o = ordered(one.box);
              return (
                <div
                  key={one.id}
                  data-pdfcut
                  role="button"
                  onPointerDown={(event) => { event.stopPropagation(); setCuts((was) => was.filter((x) => x.id !== one.id)); }}
                  style={{ position: 'absolute', left: `${o.u1 * 100}%`, top: `${o.v1 * 100}%`, width: `${(o.u2 - o.u1) * 100}%`, height: `${(o.v2 - o.v1) * 100}%`, background: css(redColour, 0.55), outline: '2px solid #ef4444' }}
                />
              );
            })}
            {drag && pen && DRAGS.has(pen) && (() => {
              const o = ordered({ u1: drag.from.u, v1: drag.from.v, u2: drag.to.u, v2: drag.to.v });
              return pen === 'line'
                ? <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1={drag.from.u * 100} y1={drag.from.v * 100} x2={drag.to.u * 100} y2={drag.to.v * 100} stroke="#38bdf8" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
                : <div className="pointer-events-none absolute border-2 border-sky-400 bg-sky-400/15" style={{ left: `${o.u1 * 100}%`, top: `${o.v1 * 100}%`, width: `${(o.u2 - o.u1) * 100}%`, height: `${(o.v2 - o.v1) * 100}%` }} />;
            })()}
          </div>
        </div>
      </div>
    </div>
  );

  /* ── The panel for the selected mark ── */
  const pickedPanel = pickedHeld && (() => {
    const m = pickedHeld.mark;
    return (
      <div className="space-y-2 rounded-2xl border border-sky-500/40 bg-sky-500/5 p-3" data-pdfpicked={m.kind}>
        {(m.kind === 'text' || m.kind === 'note') && (
          <textarea
            value={m.text}
            data-pdfmarktext
            rows={m.kind === 'note' ? 3 : 2}
            placeholder={m.kind === 'note' ? w('noteText') : w('words')}
            onChange={(event) => { const text = event.target.value; editPicked((x) => (x.kind === 'text' || x.kind === 'note' ? { ...x, text } : x)); }}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-sm text-zinc-100"
          />
        )}
        {m.kind === 'text' && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-zinc-300">{w('size')}
              <input type="range" min={6} max={48} step={0.5} value={m.size} onChange={(event) => { const s = Number(event.target.value); editPicked((x) => (x.kind === 'text' ? { ...x, size: s } : x)); }} className="h-11 w-28 accent-sky-400" />
            </label>
            {(['sans', 'serif', 'mono'] as const).map((f: FontKind) => (
              <button key={f} type="button" aria-pressed={m.font === f} onClick={() => editPicked((x) => (x.kind === 'text' ? { ...x, font: f } : x))} className={`${BTN} ${m.font === f ? 'border-sky-400 text-sky-200' : ''}`}>{w(f)}</button>
            ))}
            {swatches(INKS, m.colour, (c) => editPicked((x) => (x.kind === 'text' ? { ...x, colour: c } : x)), 'text')}
          </div>
        )}
        {m.kind === 'link' && (
          <input type="url" inputMode="url" value={m.url} data-pdflinkurl placeholder={SITE_HOST} onChange={(event) => { const url = event.target.value; editPicked((x) => (x.kind === 'link' ? { ...x, url } : x)); }} className={FIELD} aria-label={w('url')} />
        )}
        {m.kind === 'field' && (
          <input value={m.name} onChange={(event) => { const n = event.target.value; editPicked((x) => (x.kind === 'field' ? { ...x, name: n } : x)); }} className={FIELD} aria-label={w('fieldName')} />
        )}
        <button type="button" data-pdfmarkdelete className={BTN} onClick={dropPicked}><Trash2 className="h-4 w-4" />{w('remove')}</button>
      </div>
    );
  })();

  /* ── Each tool's own controls ── */
  const pensRow = tool && PENS[tool] && (
    <div className="flex flex-wrap gap-1.5" data-pdfpens>
      {PENS[tool]!.map((one) => {
        const Icon = PEN_ICON[one];
        const on = pen === one;
        return (
          <button
            key={one}
            type="button"
            data-pdfpen={one}
            aria-pressed={on}
            onClick={() => { setPen(one); if ((one === 'signature' || one === 'initials') && ready?.as !== one) setPad(one); }}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${on ? 'border-sky-400 bg-sky-500/15 text-sky-100' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}
          >
            <Icon className="h-4 w-4" />{w(one)}
          </button>
        );
      })}
    </div>
  );

  const hint = pen && (
    <p className="text-[11px] text-zinc-400" data-pdfhint>
      {pen === 'retype' ? w('hintRetype')
        : pen === 'image' ? w('hintPicture')
          : pen === 'signature' || pen === 'initials' ? w('hintSign')
            : pen === 'highlight' || pen === 'underline' || pen === 'strike' ? w('hintWords')
              : DRAGS.has(pen) ? w('hintDrag') : w('hintTap')}
    </p>
  );


  const toolPanel = ((): React.ReactNode => {
    switch (tool) {
      case 'comment':
        return (
          <>
            {pensRow}
            {hint}
            {(pen === 'highlight') && swatches(MARKERS, marker, setMarker, 'marker')}
            {(pen === 'underline' || pen === 'strike') && swatches(INKS, ink, setInk, 'ink')}
          </>
        );
      case 'edit':
        return (
          <>
            {pensRow}
            {hint}
            {pen === 'text' && swatches(INKS, ink, setInk, 'ink')}
            {pen === 'image' && fileInput(false, 'image/jpeg,image/png,image/webp,image/heic,image/heif', (files) => {
              const file = files[0];
              if (!file) return;
              void pictureBytes(file).then((pic) => { if (pic) setReady({ data: pic.data, type: 'png', w: pic.w, h: pic.h, url: pic.url, as: 'image' }); });
            }, 'pdfimage', <><ImagePlus className="h-4 w-4" />{w('image')}</>)}
            {pen === 'image' && ready?.as === 'image' && <img src={ready.url} alt="" className="h-16 rounded-lg border border-zinc-700 object-contain" />}
            <details className="rounded-2xl border border-zinc-800 p-3" data-pdfwhole>
              <summary className="min-h-[44px] cursor-pointer text-sm font-bold text-zinc-100">{w('wholeDoc')}</summary>
              <div className="mt-2 space-y-4">
                <section className="space-y-2" data-pdfheaderfooter>
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400"><FileText className="h-3.5 w-3.5" />{w('headerFooter')}</h4>
                  <input className={FIELD} placeholder={w('header')} value={edge.header} onChange={(e) => setEdge({ ...edge, header: e.target.value })} aria-label={w('header')} />
                  <input className={FIELD} placeholder={w('footer')} value={edge.footer} onChange={(e) => setEdge({ ...edge, footer: e.target.value })} aria-label={w('footer')} />
                  <p className="text-[11px] text-zinc-500">{w('headerHelp')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(['none', 'n', 'n-of'] as const).map((one) => (
                      <button key={one} type="button" aria-pressed={edge.numbers === one} onClick={() => setEdge({ ...edge, numbers: one })} className={`${BTN} ${edge.numbers === one ? 'border-sky-400 text-sky-200' : ''}`}>{w(one === 'none' ? 'numNone' : one === 'n' ? 'numN' : 'numNOf')}</button>
                    ))}
                  </div>
                  <button type="button" className={BTN} data-pdfdo="headerfooter" onClick={() => { void change(async (d) => (await work()).headerFooter(d, edge)); }}>{w('put')}</button>
                </section>
                <section className="space-y-2" data-pdfwatermark>
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400"><Stamp className="h-3.5 w-3.5" />{w('watermark')}</h4>
                  <input className={FIELD} value={mark.text} onChange={(e) => setMark({ ...mark, text: e.target.value })} aria-label={w('watermark')} />
                  <label className="flex items-center gap-2 text-xs text-zinc-300">{w('faint')}
                    <input type="range" min={0.05} max={0.6} step={0.01} value={mark.opacity} onChange={(e) => setMark({ ...mark, opacity: Number(e.target.value) })} className="h-11 flex-1 accent-sky-400" />
                  </label>
                  <label className="flex min-h-[44px] items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={mark.slant} onChange={(e) => setMark({ ...mark, slant: e.target.checked })} className="h-5 w-5" />{w('slant')}</label>
                  {swatches(INKS, mark.colour, (c) => setMark({ ...mark, colour: c }), 'watermark')}
                  <button type="button" className={BTN} data-pdfdo="watermark" onClick={() => { void change(async (d) => (await work()).watermark(d, mark)); }}>{w('put')}</button>
                </section>
                <section className="space-y-2" data-pdfbates>
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400"><Hash className="h-3.5 w-3.5" />{w('bates')}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <input className={FIELD} value={bates.prefix} onChange={(e) => setBates({ ...bates, prefix: e.target.value.slice(0, 16) })} aria-label={w('prefix')} placeholder={w('prefix')} />
                    <input className={FIELD} type="number" min={0} value={bates.start} onChange={(e) => setBates({ ...bates, start: Math.max(0, Number(e.target.value) || 0) })} aria-label={w('startAt')} />
                    <input className={FIELD} type="number" min={1} max={12} value={bates.digits} onChange={(e) => setBates({ ...bates, digits: Math.min(12, Math.max(1, Number(e.target.value) || 1)) })} aria-label={w('digits')} />
                  </div>
                  <button type="button" className={BTN} data-pdfdo="bates" onClick={() => { void change(async (d) => (await work()).batesNumber(d, { ...bates, suffix: '', size: 8 })); }}>{w('put')}</button>
                </section>
                <section className="space-y-2" data-pdfbackground>
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400"><PaintBucket className="h-3.5 w-3.5" />{w('background')}</h4>
                  {swatches(PAPERS, paper, setPaper, 'paper')}
                  <button type="button" className={BTN} data-pdfdo="background" onClick={() => { void change(async (d) => (await work()).background(d, paper)); }}>{w('put')}</button>
                </section>
              </div>
            </details>
          </>
        );
      case 'sign':
        return (
          <>
            {pensRow}
            {hint}
            {(pen === 'text' || pen === 'tick' || pen === 'cross' || pen === 'dot' || pen === 'line' || pen === 'date') && swatches(INKS, ink, setInk, 'ink')}
            {(pen === 'signature' || pen === 'initials') && (
              <div className="flex items-center gap-2">
                {ready && ready.as === pen && <img src={ready.url} alt="" className="h-12 rounded-lg object-contain p-1" style={{ background: PAPER }} data-pdfready />}
                <button type="button" className={BTN} onClick={() => setPad(pen)}><Signature className="h-4 w-4" />{w(pen === 'signature' ? 'makeSignature' : 'makeInitials')}</button>
              </div>
            )}
            {fields.length > 0 && (
              <details open className="rounded-2xl border border-zinc-800 p-3" data-pdffields>
                <summary className="min-h-[44px] cursor-pointer text-sm font-bold text-zinc-100">{w('formFields')} · {fields.length}</summary>
                <div className="mt-2 space-y-2">
                  {fields.map((one) => (
                    <label key={one.name} className="block text-xs text-zinc-300">
                      {one.name}
                      {one.kind === 'check' ? (
                        <input type="checkbox" className="ml-2 h-5 w-5 align-middle" checked={answers[one.name] === true} onChange={(e) => setAnswers({ ...answers, [one.name]: e.target.checked })} data-pdffield={one.name} />
                      ) : one.kind === 'choice' || one.kind === 'radio' ? (
                        <select className={FIELD} value={String(answers[one.name] ?? '')} onChange={(e) => setAnswers({ ...answers, [one.name]: e.target.value })} data-pdffield={one.name}>
                          <option value="" />
                          {one.options.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : one.kind === 'text' ? (
                        <input className={FIELD} value={String(answers[one.name] ?? '')} onChange={(e) => setAnswers({ ...answers, [one.name]: e.target.value })} data-pdffield={one.name} />
                      ) : null}
                    </label>
                  ))}
                  <label className="flex min-h-[44px] items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} className="h-5 w-5" />{w('flatten')}</label>
                  <button type="button" className={`${GO} w-full`} style={goStyle} data-pdffill onClick={() => { void change(async (d) => (await work()).fillForm(d, answers, flatten)); }}>{w('fill')}</button>
                </div>
              </details>
            )}
          </>
        );
      case 'redact':
        return (
          <>
            <p className="text-xs text-zinc-400">{w('redactHow')}</p>
            {pensRow}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={BTN} data-pdfredactpage onClick={() => setCuts((was) => [...was, { id: nextId(), page: at, box: { u1: 0, v1: 0, u2: 1, v2: 1 } }])}><FileText className="h-4 w-4" />{w('wholePage')}</button>
            </div>
            <div className="flex gap-2">
              <input className={FIELD} value={findText} onChange={(e) => setFindText(e.target.value)} placeholder={w('find')} aria-label={w('find')} data-pdffind onKeyDown={(e) => { if (e.key === 'Enter') void findAndMark(); }} />
              <button type="button" className={BTN} data-pdffindgo onClick={() => { void findAndMark(); }}><Search className="h-4 w-4" />{w('findIt')}</button>
            </div>
            {found !== null && <p className="text-xs text-zinc-300" data-pdffound={found}>{found ? `${found} ${w('foundSome')}` : w('foundNone')}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-zinc-400">{w('boxColour')}</span>
              {swatches([{ id: 'black', c: [0, 0, 0] }, { id: 'white', c: [1, 1, 1] }, { id: 'red', c: [0.75, 0.05, 0.08] }], redColour, setRedColour, 'redact')}
            </div>
            <input className={FIELD} value={redLabel} onChange={(e) => setRedLabel(e.target.value.slice(0, 40))} placeholder={w('label')} aria-label={w('label')} />
            <label className="flex min-h-[44px] items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={sanitiseToo} onChange={(e) => setSanitiseToo(e.target.checked)} className="h-5 w-5" />{w('sanitiseToo')}</label>
            <button type="button" data-pdfredactnow disabled={!cuts.length || busy} className={`${GO} w-full`} style={{ background: 'linear-gradient(120deg, #f87171, #ef4444)' }} onClick={() => { void redactNow(); }}>
              <Eraser className="h-4 w-4" />{w('redactNow')}{cuts.length > 0 && ` · ${cuts.length} ${w('marked')}`}
            </button>
            <p className="text-[11px] text-zinc-500">{w('redactNote')}</p>
          </>
        );
      case 'form':
        return (<><p className="text-xs text-zinc-400">{w('formHow')}</p>{pensRow}</>);
      default:
        return null;
    }
  })();

  const protectPanel = (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-6" data-pdfprotectpanel>
      <section className="space-y-2 rounded-2xl border border-zinc-800 p-3">
        <h4 className="flex items-center gap-1.5 text-sm font-bold text-zinc-100"><Lock className="h-4 w-4" />{w('password')}</h4>
        <p className="text-xs text-zinc-400">{w('protectHow')}</p>
        {lock ? (
          <>
            <p className="text-xs font-bold text-emerald-300" data-pdflocked>{w('protectOn')}</p>
            <button type="button" className={BTN} data-pdfunprotect onClick={() => setLock(null)}><LockOpen className="h-4 w-4" />{w('unprotect')}</button>
          </>
        ) : (
          <>
            <input className={FIELD} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={w('password')} aria-label={w('password')} data-pdfpw />
            <input className={FIELD} type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder={w('repeat')} aria-label={w('repeat')} data-pdfpw2 />
            <label className="flex min-h-[44px] items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={allowPrint} onChange={(e) => setAllowPrint(e.target.checked)} className="h-5 w-5" />{w('allowPrint')}</label>
            <label className="flex min-h-[44px] items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={allowCopy} onChange={(e) => setAllowCopy(e.target.checked)} className="h-5 w-5" />{w('allowCopy')}</label>
            <button
              type="button"
              data-pdfprotect
              className={`${GO} w-full`}
              style={goStyle}
              onClick={() => {
                if (pw.length < 4) { say('tooShort'); return; }
                if (pw !== pw2) { say('mismatch'); return; }
                setLock({ open: pw, print: allowPrint, copy: allowCopy });
                setPw(''); setPw2('');
                say('protectOn');
              }}
            >
              <ShieldCheck className="h-4 w-4" />{w('protect')}
            </button>
          </>
        )}
      </section>
      <section className="space-y-2 rounded-2xl border border-zinc-800 p-3" data-pdfhidden>
        <h4 className="text-sm font-bold text-zinc-100">{w('hidden')}</h4>
        {hidden && (() => {
          const rows = ([['title', hidden.title], ['author', hidden.author], ['subject', hidden.subject], ['keywords', hidden.keywords], ['creator', hidden.creator], ['producer', hidden.producer]] as const).filter(([, value]) => value);
          return rows.length || hidden.script || hidden.attachments ? (
            <ul className="space-y-1 text-xs text-zinc-300">
              {rows.map(([key, value]) => <li key={key}><span className="text-zinc-500">{key}:</span> {value}</li>)}
              {hidden.script && <li className="text-amber-300">{w('scripts')}</li>}
              {hidden.attachments && <li className="text-amber-300">{w('attachments')}</li>}
            </ul>
          ) : <p className="text-xs text-zinc-400">{w('hiddenNone')}</p>;
        })()}
        <button type="button" className={BTN} data-pdfclean onClick={() => { void change(async (d) => (await work()).sanitize(d), 'cleaned'); }}>{w('clean')}</button>
      </section>
    </div>
  );

  const convertPanel = (
    <div className="mx-auto w-full max-w-xl space-y-3 px-4 pb-6" data-pdfconvertpanel>
      <section className="space-y-2 rounded-2xl border border-zinc-800 p-3">
        <h4 className="text-sm font-bold text-zinc-100">{w('toPictures')}</h4>
        <div className="flex gap-2">
          {(['jpg', 'png'] as const).map((one) => (
            <button key={one} type="button" aria-pressed={picFormat === one} onClick={() => setPicFormat(one)} className={`${BTN} ${picFormat === one ? 'border-sky-400 text-sky-200' : ''}`}>{one.toUpperCase()}</button>
          ))}
          <button type="button" className={`${GO} flex-1`} style={goStyle} data-pdftopictures onClick={() => { void toPictures(); }}><Download className="h-4 w-4" />{w('save')}</button>
        </div>
      </section>
      <section className="space-y-2 rounded-2xl border border-zinc-800 p-3" data-pdfsmaller>
        <h4 className="text-sm font-bold text-zinc-100">{w('smaller')}</h4>
        <p className="text-xs leading-relaxed text-zinc-400">{w('smallerWhat')}</p>
        <FileSize
          limit={pdfMost}
          onLimit={(most) => { setPdfMost(most); setPdfEstimate(null); }}
          estimate={pdfEstimate}
          busy={squeezing}
          kind="picture"
          idle={w('smallerIdle')}
        />
        <button type="button" className={`${GO} w-full`} style={goStyle} data-pdfsmallergo disabled={busy} onClick={() => { void shrink(); }}><Download className="h-4 w-4" />{w('smallerGo')}</button>
      </section>
      <section className="space-y-2 rounded-2xl border border-zinc-800 p-3">
        <h4 className="text-sm font-bold text-zinc-100">{w('toText')}</h4>
        <button type="button" className={`${GO} w-full`} style={goStyle} data-pdftotext onClick={() => { void toText(); }}><Download className="h-4 w-4" />{w('save')}</button>
      </section>
      <section className="space-y-2 rounded-2xl border border-zinc-800 p-3">
        <h4 className="text-sm font-bold text-zinc-100">{w('picturesIn')}</h4>
        {fileInput(true, 'image/jpeg,image/png,image/webp,image/heic,image/heif', (files) => { void openFiles(files); }, 'pdfpicturesin', <><ImagePlus className="h-4 w-4" />{w('addFiles')}</>)}
      </section>
    </div>
  );

  /* ── The whole screen ── */
  const body = ((): React.ReactNode => {
    if (locked) {
      return (
        <div className="mx-auto w-full max-w-sm space-y-3 px-4 pt-10" data-pdfpassword>
          <Lock className="mx-auto h-8 w-8 text-sky-300" />
          <p className="text-center text-sm text-zinc-200">{w('needsPassword')}</p>
          <input className={FIELD} type="password" autoComplete="off" value={lockTry} onChange={(e) => { setLockTry(e.target.value); setLockWrong(false); }} onKeyDown={(e) => { if (e.key === 'Enter') void tryPassword(); }} aria-label={w('password')} data-pdfpasswordinput />
          {lockWrong && <p className="text-xs font-bold text-red-400">{w('wrongPassword')}</p>}
          <button type="button" className={`${GO} w-full`} style={goStyle} data-pdfunlock onClick={() => { void tryPassword(); }}><LockOpen className="h-4 w-4" />{w('unlock')}</button>
        </div>
      );
    }
    if (tool === 'combine') return combinePanel;
    if (!bytes || !tool) return front;
    if (tool === 'organise') return organise;
    if (tool === 'protect') return protectPanel;
    if (tool === 'convert') return convertPanel;
    return (
      <>
        <div className="mx-auto w-full max-w-3xl space-y-2 px-4 pt-2">
          {toolPanel}
        </div>
        {pageView}
        {/* The chosen mark's own controls, over the foot of the screen
            rather than above the page: put above it, they pushed the page
            down under the finger the moment a mark was placed. */}
        {pickedPanel && (
          <div className="pointer-events-none fixed inset-x-2 z-20 flex justify-center" style={{ bottom: barClearance(8) }}>
            <div className="pointer-events-auto max-h-[45vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-zinc-950/95 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">{pickedPanel}</div>
          </div>
        )}
      </>
    );
  })();

  const title = tool ? (af ? pdfTool(tool).af : pdfTool(tool).en) : w('title');

  return (
    <div
      data-pdfroom
      role="dialog"
      aria-modal="true"
      aria-label={w('title')}
      className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 text-zinc-100"
      style={{ paddingBottom: barClearance(0) }}
    >
      <header className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <button type="button" data-pdfclose onClick={onClose} aria-label={w('close')} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zinc-700 text-zinc-200"><X className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate bg-linear-to-r from-sky-300 via-violet-300 to-pink-300 bg-clip-text text-base font-extrabold text-transparent">{title}</p>
          {bytes && <p className="truncate text-[11px] text-zinc-500" data-pdfname>{name} · {pages} {pages === 1 ? (af ? 'bladsy' : 'page') : (af ? 'bladsye' : 'pages')}</p>}
        </div>
        {bytes && (
          <>
            <button type="button" data-pdfundo onClick={undo} aria-label={w('undo')} disabled={history.length < 2 && !held.length && !cuts.length} className="grid h-11 w-11 place-items-center rounded-full border border-zinc-700 text-zinc-200 disabled:opacity-30"><Undo2 className="h-5 w-5" /></button>
            <button type="button" data-pdfsave onClick={() => { void save(); }} disabled={busy} className={GO} style={goStyle}><Download className="h-4 w-4" />{w('save')}</button>
          </>
        )}
      </header>
      {bytes && !locked && (
        <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2" data-pdftools>
          {/* One button back to every tool, rather than ten in a row: a row of
              ten either slides sideways under a thumb or wraps into four. */}
          <button
            type="button"
            data-pdftoolsopen
            aria-pressed={tool === null}
            onClick={() => { void (held.length ? writeIn() : Promise.resolve(true)).then(() => { setTool(null); setPen(null); setPicked(null); }); }}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${tool === null ? 'border-sky-400 bg-sky-500/15 text-sky-100' : 'border-zinc-700 bg-zinc-900 text-zinc-200'}`}
          >
            <Files className="h-4 w-4" />{w('allTools')}
          </button>
          {tool && (
            <span className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-sky-200" data-pdfcurrent={tool}>
              {React.createElement(TOOL_ICON[tool], { className: 'h-4 w-4' })}{af ? pdfTool(tool).af : pdfTool(tool).en}
            </span>
          )}
        </div>
      )}
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        {body}
        {busy && (
          <div className="pointer-events-none fixed inset-x-0 top-0 z-10 h-1 overflow-hidden" data-pdfbusy>
            <div className="fb-working h-full w-full" />
          </div>
        )}
      </main>
      {said && (
        <div className="pointer-events-none absolute inset-x-3 flex justify-center" style={{ bottom: `calc(${barClearance(12)} )` }}>
          <p className="max-w-md rounded-2xl bg-zinc-800/95 px-4 py-2 text-center text-xs font-semibold text-zinc-100 shadow-lg" data-pdfsaid>{said}</p>
        </div>
      )}
      {pad && (
        <SignaturePad
          what={pad}
          words={{ title: w(pad === 'signature' ? 'makeSignature' : 'makeInitials'), draw: w('drawIt'), type: w('typeIt'), upload: w('uploadIt'), uploadHint: w('uploadHint'), clear: w('clear'), use: w('use'), name: w('yourName'), here: w('signHere'), close: w('close') }}
          onClose={() => setPad(null)}
          onMade={(made) => { setReady({ ...made, as: pad }); setPen(pad); setPad(null); }}
        />
      )}
    </div>
  );
}

/** A mark moved by a finger: every point of it shifted the same. */
function shifted(m: Mark, du: number, dv: number): Mark {
  const moveBox = (b: Box): Box => ({ u1: b.u1 + du, v1: b.v1 + dv, u2: b.u2 + du, v2: b.v2 + dv });
  switch (m.kind) {
    case 'text':
    case 'tick':
    case 'cross':
    case 'dot':
    case 'note':
      return { ...m, at: { u: m.at.u + du, v: m.at.v + dv } };
    case 'line':
      return { ...m, from: { u: m.from.u + du, v: m.from.v + dv }, to: { u: m.to.u + du, v: m.to.v + dv } };
    default:
      return { ...m, box: moveBox(m.box) };
  }
}

/** A page, small, for Organise. */
function Thumb({ doc, index, on, onTap }: { readonly doc: Shown; readonly index: number; readonly on: boolean; readonly onTap: () => void }): React.ReactElement {
  const sheet = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let gone = false;
    void viewer().then((v) => { if (!gone && sheet.current) return v.draw(doc, index, sheet.current, 260); return undefined; }).catch(() => undefined);
    return () => { gone = true; };
  }, [doc, index]);
  return (
    <button type="button" data-pdfthumb={index} aria-pressed={on} onClick={onTap} className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 ${on ? 'border-sky-400 bg-sky-500/10' : 'border-transparent'}`}>
      <canvas ref={sheet} className="max-h-40 w-full object-contain shadow-sm" style={{ background: PAPER }} />
      <span className="text-[11px] font-bold text-zinc-400">{index + 1}</span>
      {on && <Check className="absolute right-2 top-2 h-5 w-5 rounded-full bg-sky-400 p-0.5 text-zinc-950" />}
    </button>
  );
}

/** A picture mark, shown from its own bytes. */
function ImageMark({ data, type, style, grab }: { readonly data: Uint8Array; readonly type: 'png' | 'jpg'; readonly style: React.CSSProperties; readonly grab: (event: React.PointerEvent) => void }): React.ReactElement {
  const url = useMemo(() => URL.createObjectURL(new Blob([data.slice().buffer], { type: type === 'png' ? 'image/png' : 'image/jpeg' })), [data, type]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <img src={url} alt="" data-pdfmark="image" onPointerDown={grab} draggable={false} style={{ ...style, objectFit: 'fill', cursor: 'move' }} />;
}
