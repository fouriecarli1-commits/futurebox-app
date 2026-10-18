'use client';

/**
 * The vector studio: shapes, lines and words that stay sharp at any size.
 *
 * The owner, 17 October 2026, with another app's vector illustration on screen:
 * *"Ek hou van daai vector illustration. Ek weet nie waar sal mens dit in
 * bou nie."* It opens over the photo editor (beside Bring a picture in, and
 * from All tools), and what is drawn goes back onto the post as a layer of
 * its own that can be opened here again and changed.
 *
 * Drawn by hand — a pencil smoothed into curves, a pen that places points,
 * rectangles, circles, polygons, stars, lines and words — or by the AI from a
 * sentence (`api/vector/draw`), or traced from a photograph on the phone
 * (`lib/vectortrace.ts`). The drawing is data (`lib/vectordoc.ts`); the
 * screen and the file draw the same tree, and anything from outside passes
 * through `cleanTree` first.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, Check, Circle, Copy, FlipHorizontal, FlipVertical, Hexagon, ImageIcon, Loader2, Minus, MousePointer2,
  PenTool, Pencil, Redo2, Scissors, Sparkles, Square, Star, Trash2, Type, Undo2, X,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';
import { fit } from '../lib/imagefile';
import { accessToken } from '../lib/cloud';
import { CREDITS } from '../lib/credits';
import {
  ARTBOARDS, artFrom, artFromTree, breakApart, hits, halfSize, itemNode, newDoc, pathFromPoints, recolour, smoothPath, toLocal, toSvg,
  type Item, type Paint, type Pt, type SvgNode, type VectorDoc,
} from '../lib/vectordoc';
import { trace } from '../lib/vectortrace';

/* ── Words ──────────────────────────────────────────────────────────────── */

const WORDS = {
  title: ['Vector studio', 'Vektor-ateljee'],
  close: ['Close the vector studio', 'Maak die vektor-ateljee toe'],
  done: ['Into the post', 'In die post'],
  undo: ['Undo', 'Ontdoen'],
  redo: ['Redo', 'Herdoen'],
  select: ['Select', 'Kies'],
  pencil: ['Pencil', 'Potlood'],
  pen: ['Pen', 'Pen'],
  rect: ['Rectangle', 'Reghoek'],
  ellipse: ['Circle', 'Sirkel'],
  polygon: ['Polygon', 'Veelhoek'],
  star: ['Star', 'Ster'],
  line: ['Line', 'Lyn'],
  text: ['Text', 'Teks'],
  fill: ['Fill', 'Vul'],
  stroke: ['Outline', 'Buitelyn'],
  none: ['None', 'Geen'],
  thickness: ['Line thickness', 'Lyndikte'],
  opacity: ['See-through', 'Deursigtig'],
  corners: ['Round corners', 'Ronde hoeke'],
  points: ['Points', 'Punte'],
  depth: ['Point depth', 'Punt-diepte'],
  sides: ['Sides', 'Kante'],
  words: ['Words', 'Woorde'],
  size: ['Size', 'Grootte'],
  bold: ['Bold', 'Vet'],
  font: ['Letters', 'Letters'],
  sans: ['Plain', 'Gewoon'],
  serif: ['Book', 'Boek'],
  display: ['Poster', 'Plakkaat'],
  hand: ['Hand', 'Hand'],
  forward: ['Forward', 'Vorentoe'],
  backward: ['Back', 'Agtertoe'],
  duplicate: ['Copy', 'Kopieer'],
  remove: ['Delete', 'Vee uit'],
  flipH: ['Flip across', 'Draai om dwars'],
  flipV: ['Flip down', 'Draai om af'],
  breakApart: ['Break it apart', 'Breek dit op'],
  recolour: ['Recolour it', 'Kleur dit oor'],
  artboard: ['Artboard', 'Tekenbord'],
  background: ['Background', 'Agtergrond'],
  aiTitle: ['Let AI draw it', 'Laat KI dit teken'],
  aiHint: ['Describe it — "a meerkat in sunglasses", "a mountain logo", "a lemon slice"', 'Beskryf dit — "’n meerkat met ’n sonbril", "’n berg-logo", "’n skyfie suurlemoen"'],
  aiGo: ['Draw it · {n} credits', 'Teken dit · {n} krediete'],
  aiNo: ['The AI could not draw that as a vector. Nothing was charged.', 'Die KI kon dit nie as ’n vektor teken nie. Niks is gehef nie.'],
  traceTitle: ['A photo into shapes', '’n Foto in vorms'],
  traceHint: ['Bring a photo in and it becomes flat shapes in a few colours, each one its own.', 'Bring ’n foto in en dit word plat vorms in ’n paar kleure, elkeen op sy eie.'],
  traceGo: ['Choose a photo', 'Kies ’n foto'],
  colours: ['Colours', 'Kleure'],
  traceNo: ['That photo could not be turned into shapes.', 'Daardie foto kon nie in vorms omgesit word nie.'],
  saveTitle: ['Save it to your device', 'Stoor dit op jou toestel'],
  saveHow: ['One price for this drawing, however many times and in whichever of the two you save it.', 'Een prys vir hierdie tekening, hoeveel keer en in watter een van die twee jy dit ook al stoor.'],
  saveSvg: ['SVG · {n} credits', 'SVG · {n} krediete'],
  savePng: ['PNG · {n} credits', 'PNG · {n} krediete'],
  saved: ['Saved to your device.', 'Op jou toestel gestoor.'],
  saveNo: ['It could not be saved.', 'Dit kon nie gestoor word nie.'],
  penDone: ['Finish the line', 'Maak die lyn klaar'],
  penClose: ['Close the shape', 'Maak die vorm toe'],
  hintSelect: ['Tap a shape to choose it. Drag it to move; the round handle turns it, the square one sizes it.', 'Tik op ’n vorm om dit te kies. Sleep om te skuif; die ronde handvatsel draai dit, die vierkantige maak dit groter of kleiner.'],
  hintPencil: ['Draw with your finger; the line is smoothed when you let go.', 'Teken met jou vinger; die lyn word glad gemaak as jy los.'],
  hintPen: ['Tap to place points; drag to curve. Finish or close the shape below.', 'Tik om punte te plaas; sleep om te buig. Maak die vorm onder klaar of toe.'],
  hintShape: ['Drag on the artboard to draw it.', 'Sleep op die tekenbord om dit te teken.'],
  hintText: ['Tap where the words go.', 'Tik waar die woorde moet kom.'],
  yourWords: ['Your words', 'Jou woorde'],
  working: ['Drawing…', 'Teken…'],
} as const;
type Word = keyof typeof WORDS;

type Tool = 'select' | 'pencil' | 'pen' | 'rect' | 'ellipse' | 'polygon' | 'star' | 'line' | 'text';
const TOOLS: readonly { readonly id: Tool; readonly icon: typeof Square }[] = [
  { id: 'select', icon: MousePointer2 }, { id: 'pencil', icon: Pencil }, { id: 'pen', icon: PenTool },
  { id: 'rect', icon: Square }, { id: 'ellipse', icon: Circle }, { id: 'polygon', icon: Hexagon }, { id: 'star', icon: Star },
  { id: 'line', icon: Minus }, { id: 'text', icon: Type },
];

const SWATCHES = [
  '#111111', '#ffffff', '#6b7280', '#ef4444', '#f97316', '#f59e0b', '#facc15', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f472b6', '#7c2d12', '#fde68a',
] as const;

let counter = 0;
const nextId = (): string => `v${Date.now().toString(36)}${(counter += 1).toString(36)}`;

/** kebab-case SVG attributes as React wants them. */
const reactAttr = (key: string): string => (key === 'viewBox' ? key : key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()));

/** A cleaned tree drawn as React elements — no inner HTML, the same tree the file is written from. */
function draw(node: SvgNode, key: React.Key): React.ReactNode {
  if (node.tag === '#text') return node.text ?? '';
  const props: Record<string, string> = {};
  for (const [k, v] of Object.entries(node.attrs)) props[reactAttr(k)] = v;
  return React.createElement(node.tag, { key, ...props }, ...node.children.map((child, k) => draw(child, k)));
}

const baseStyle = (fill: Paint, stroke: Paint, width: number) => ({ rotate: 0, sx: 1, sy: 1, fill, stroke, width, opacity: 1 });

export default function VectorStudio({
  initial,
  onClose,
  onDone,
}: {
  readonly initial: VectorDoc | null;
  readonly onClose: () => void;
  readonly onDone: (made: { readonly svg: string; readonly doc: VectorDoc }) => void;
}): React.ReactElement {
  const { lang } = useLang();
  const w = (word: Word): string => WORDS[word][lang === 'af' ? 1 : 0];
  useBackLayer(true, onClose);

  /* Every drawing has its own id, so saving it twice is paid once — one drawn before ids were given one gets one now. */
  const [doc, setDoc] = useState<VectorDoc>(() => {
    const was = initial ?? newDoc();
    return was.id ? was : { ...was, id: newDoc().id };
  });
  const [past, setPast] = useState<VectorDoc[]>([]);
  const [future, setFuture] = useState<VectorDoc[]>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [chosen, setChosen] = useState<string | null>(null);
  const [fill, setFill] = useState<Paint>('#3b82f6');
  const [stroke, setStroke] = useState<Paint>('#111111');
  const [thick, setThick] = useState(6);
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiWords, setAiWords] = useState('');
  const [traceColours, setTraceColours] = useState(6);
  /* The pen's points while a shape is being placed. */
  const [penPts, setPenPts] = useState<Pt[]>([]);
  /* A drag in progress: what it does and where it began. */
  const drag = useRef<{ mode: 'move' | 'scale' | 'rotate' | 'make' | 'pencil'; from: { x: number; y: number }; start: VectorDoc; item?: Item; pts?: Pt[] } | null>(null);
  const [preview, setPreview] = useState<Item | null>(null);
  const board = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!said) return undefined;
    const gone = window.setTimeout(() => setSaid(''), 6000);
    return () => window.clearTimeout(gone);
  }, [said]);

  /** A change that can be undone. */
  const commit = (next: VectorDoc, before: VectorDoc = doc): void => {
    setPast((was) => [...was.slice(-49), before]);
    setFuture([]);
    setDoc(next);
  };
  const undo = (): void => {
    if (!past.length) return;
    setFuture((was) => [doc, ...was]);
    setDoc(past[past.length - 1]);
    setPast((was) => was.slice(0, -1));
  };
  const redo = (): void => {
    if (!future.length) return;
    setPast((was) => [...was, doc]);
    setDoc(future[0]);
    setFuture((was) => was.slice(1));
  };

  const item = doc.items.find((one) => one.id === chosen) ?? null;
  const change = (id: string, how: Partial<Item>): void => {
    commit({ ...doc, items: doc.items.map((one) => (one.id === id ? ({ ...one, ...how } as Item) : one)) });
  };
  const add = (one: Item): void => {
    commit({ ...doc, items: [...doc.items, one] });
    setChosen(one.id);
  };

  /* ── Where a finger is, on the artboard ── */
  const at = (event: React.PointerEvent): { x: number; y: number } => {
    const svg = board.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return { x: 0, y: 0 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const unit = doc.w / 400;

  const shapeFrom = (kind: Tool, a: { x: number; y: number }, b: { x: number; y: number }): Item | null => {
    const id = 'preview';
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    const bw = Math.max(Math.abs(b.x - a.x), 2);
    const bh = Math.max(Math.abs(b.y - a.y), 2);
    const style = { ...baseStyle(fill, stroke, thick), x: cx, y: cy };
    switch (kind) {
      case 'rect': return { ...style, id, kind: 'rect', w: bw, h: bh, r: 0 };
      case 'ellipse': return { ...style, id, kind: 'ellipse', rx: bw / 2, ry: bh / 2 };
      case 'polygon': return { ...style, id, kind: 'polygon', sides: 6, radius: Math.max(bw, bh) / 2 };
      case 'star': return { ...style, id, kind: 'star', points: 5, radius: Math.max(bw, bh) / 2, inner: 0.45 };
      case 'line': return { ...style, fill: null, stroke: stroke ?? '#111111', id, kind: 'line', dx: b.x - a.x, dy: b.y - a.y };
      default: return null;
    }
  };

  const onDown = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (busy) return;
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    const p = at(event);
    if (tool === 'select') {
      /* A handle of the chosen item first, then the topmost item under the finger. */
      if (item) {
        const { hw, hh } = halfSize(item);
        const local = toLocal({ ...item, sx: 1, sy: 1 }, p.x, p.y);
        const corner = { x: hw * item.sx, y: hh * item.sy };
        const reach = 26 * unit;
        if (Math.hypot(local.x - corner.x, local.y - corner.y) < reach) { drag.current = { mode: 'scale', from: p, start: doc, item }; return; }
        if (Math.hypot(local.x, local.y + Math.abs(hh * item.sy) + 40 * unit) < reach) { drag.current = { mode: 'rotate', from: p, start: doc, item }; return; }
      }
      const hit = [...doc.items].reverse().find((one) => !one.hidden && hits(one, p.x, p.y, 10 * unit));
      setChosen(hit?.id ?? null);
      if (hit) drag.current = { mode: 'move', from: p, start: doc, item: hit };
      return;
    }
    if (tool === 'pencil') { drag.current = { mode: 'pencil', from: p, start: doc, pts: [[p.x, p.y]] }; return; }
    if (tool === 'pen') { setPenPts((was) => [...was, [p.x, p.y]]); return; }
    if (tool === 'text') {
      add({ ...baseStyle(fill ?? '#111111', null, 0), id: nextId(), kind: 'text', x: p.x, y: p.y, text: w('yourWords'), size: 28 * unit, font: 'sans', bold: true });
      setTool('select');
      return;
    }
    drag.current = { mode: 'make', from: p, start: doc };
  };

  const onMove = (event: React.PointerEvent<SVGSVGElement>): void => {
    const d = drag.current;
    if (!d) return;
    const p = at(event);
    if (d.mode === 'pencil' && d.pts) {
      d.pts.push([p.x, p.y]);
      setPreview({ ...baseStyle(null, stroke ?? fill ?? '#111111', thick), id: 'preview', kind: 'path', x: 0, y: 0, d: smoothPath(d.pts), w: 1, h: 1 });
      return;
    }
    if (d.mode === 'make') { setPreview(shapeFrom(tool, d.from, p)); return; }
    const it = d.item;
    if (!it) return;
    if (d.mode === 'move') {
      const moved = { ...it, x: it.x + (p.x - d.from.x), y: it.y + (p.y - d.from.y) } as Item;
      setDoc({ ...d.start, items: d.start.items.map((one) => (one.id === it.id ? moved : one)) });
    } else if (d.mode === 'scale') {
      const { hw, hh } = halfSize(it);
      const local = toLocal({ ...it, sx: 1, sy: 1 }, p.x, p.y);
      const k = Math.max(0.05, Math.hypot(local.x, local.y) / Math.max(1, Math.hypot(hw * it.sx, hh * it.sy)));
      const sized = { ...it, sx: it.sx * k, sy: it.sy * k } as Item;
      setDoc({ ...d.start, items: d.start.items.map((one) => (one.id === it.id ? sized : one)) });
    } else if (d.mode === 'rotate') {
      let angle = (Math.atan2(p.y - it.y, p.x - it.x) * 180) / Math.PI + 90;
      /* Settles on every fifteen degrees within three of it. */
      const near = Math.round(angle / 15) * 15;
      if (Math.abs(angle - near) < 3) angle = near;
      const turned = { ...it, rotate: Math.round(angle * 10) / 10 } as Item;
      setDoc({ ...d.start, items: d.start.items.map((one) => (one.id === it.id ? turned : one)) });
    }
  };

  const onUp = (event: React.PointerEvent<SVGSVGElement>): void => {
    const d = drag.current;
    drag.current = null;
    setPreview(null);
    if (!d) return;
    const p = at(event);
    if (d.mode === 'pencil' && d.pts) {
      const made = pathFromPoints(nextId(), d.pts, false, { fill: null, stroke: stroke ?? fill ?? '#111111', width: thick, opacity: 1 }, 1.2 * unit);
      if (made) add(made);
      return;
    }
    if (d.mode === 'make') {
      const far = Math.hypot(p.x - d.from.x, p.y - d.from.y) > 8 * unit;
      const half = 80 * unit;
      const made = shapeFrom(tool, far ? d.from : { x: p.x - half, y: p.y - half }, far ? p : { x: p.x + half, y: p.y + half });
      if (made) add({ ...made, id: nextId() } as Item);
      return;
    }
    /* A move, a size or a turn: one step to undo, from where it began. */
    if (d.start !== doc) commit(doc, d.start);
  };

  const finishPen = (closed: boolean): void => {
    if (penPts.length < 2) { setPenPts([]); return; }
    const made = pathFromPoints(nextId(), penPts, closed, { fill: closed ? fill : null, stroke: stroke ?? '#111111', width: thick, opacity: 1 }, 0.01);
    setPenPts([]);
    if (made) add(made);
    setTool('select');
  };

  /* ── Arrange ── */
  const arrange = (by: 1 | -1): void => {
    if (!item) return;
    const at0 = doc.items.findIndex((one) => one.id === item.id);
    const to = Math.max(0, Math.min(doc.items.length - 1, at0 + by));
    if (to === at0) return;
    const items = [...doc.items];
    const [one] = items.splice(at0, 1);
    items.splice(to, 0, one);
    commit({ ...doc, items });
  };
  const duplicate = (): void => {
    if (!item) return;
    add({ ...item, id: nextId(), x: item.x + 30 * unit, y: item.y + 30 * unit } as Item);
  };
  const remove = (): void => {
    if (!item) return;
    commit({ ...doc, items: doc.items.filter((one) => one.id !== item.id) });
    setChosen(null);
  };

  /* ── The AI, and tracing a photograph ── */
  const aiDraw = async (): Promise<void> => {
    if (!aiWords.trim() || busy) return;
    setBusy(true);
    setSaid('');
    try {
      const token = await accessToken();
      const answer = await fetch('/api/vector/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ words: aiWords }),
      });
      const body = (await answer.json().catch(() => ({}))) as { svg?: string; message?: string };
      const art = answer.ok && body.svg ? artFrom(body.svg, nextId(), doc) : null;
      if (!art) { setSaid(body.message ?? w('aiNo')); return; }
      add(art);
      setAiWords('');
    } catch {
      setSaid(w('aiNo'));
    } finally {
      setBusy(false);
    }
  };
  const traceFile = async (file: File): Promise<void> => {
    setBusy(true);
    try {
      const made = await fit(file, 1600);
      if (!made.ok) { setSaid(w('traceNo')); return; }
      const img = new Image();
      await new Promise<void>((done, fail) => { img.onload = () => done(); img.onerror = () => fail(new Error('picture')); img.src = made.preview; });
      /* Small enough to trace in a moment on a phone; the shapes are curves, so they stay smooth at any size. */
      const scale = Math.min(1, 360 / Math.max(img.naturalWidth, img.naturalHeight));
      const sheet = document.createElement('canvas');
      sheet.width = Math.max(1, Math.round(img.naturalWidth * scale));
      sheet.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = sheet.getContext('2d', { willReadFrequently: true });
      if (!ctx) { setSaid(w('traceNo')); return; }
      ctx.drawImage(img, 0, 0, sheet.width, sheet.height);
      const pixels = ctx.getImageData(0, 0, sheet.width, sheet.height);
      await new Promise((done) => window.setTimeout(done, 30));
      const tree = trace({ data: pixels.data, width: sheet.width, height: sheet.height }, { colours: traceColours, tolerance: 1.1, minArea: 10 });
      const art = artFromTree(tree, nextId(), doc, 0.9);
      if (!art) { setSaid(w('traceNo')); return; }
      add(art);
    } catch {
      setSaid(w('traceNo'));
    } finally {
      setBusy(false);
    }
  };

  /* ── Off the device: paid once per drawing, then made here ── */
  const saveAs = async (kind: 'svg' | 'png'): Promise<void> => {
    if (!doc.items.length || busy) return;
    setBusy(true);
    try {
      const token = await accessToken();
      const answer = await fetch('/api/vector/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ drawing: doc.id }),
      });
      const body = (await answer.json().catch(() => ({}))) as { message?: string };
      if (!answer.ok) { setSaid(body.message ?? w('saveNo')); return; }
      const svg = toSvg(doc);
      if (kind === 'svg') {
        keepFile(new Blob([svg], { type: 'image/svg+xml' }), 'futurebox-vector.svg');
      } else {
        const img = new Image();
        await new Promise<void>((done, fail) => { img.onload = () => done(); img.onerror = () => fail(new Error('svg')); img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; });
        const scale = Math.min(1, 4096 / Math.max(doc.w, doc.h));
        const sheet = document.createElement('canvas');
        sheet.width = Math.round(doc.w * scale);
        sheet.height = Math.round(doc.h * scale);
        sheet.getContext('2d')?.drawImage(img, 0, 0, sheet.width, sheet.height);
        const png = await new Promise<Blob | null>((done) => sheet.toBlob(done, 'image/png'));
        if (!png) { setSaid(w('saveNo')); return; }
        keepFile(png, 'futurebox-vector.png');
      }
      setSaid(w('saved'));
    } catch {
      setSaid(w('saveNo'));
    } finally {
      setBusy(false);
    }
  };

  /* ── Pieces ── */
  const BTN = 'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-bold text-zinc-100 disabled:opacity-40';
  const swatchRow = (now: Paint, set: (p: Paint) => void, mark: string, allowNone = true): React.ReactElement => (
    <div className="flex flex-wrap gap-1.5" data-vswatches={mark}>
      {allowNone && (
        <button type="button" aria-label={w('none')} aria-pressed={now === null} onClick={() => set(null)} className={`h-9 w-9 rounded-full border-2 ${now === null ? 'border-sky-400' : 'border-zinc-700'}`} style={{ background: 'repeating-conic-gradient(#e7e7ea 0 25%, #c8c8ce 0 50%) 0 0 / 10px 10px' }}>
          <X className="mx-auto h-4 w-4 text-red-500" />
        </button>
      )}
      {SWATCHES.map((c) => (
        <button key={c} type="button" aria-label={c} aria-pressed={now === c} data-vswatch={c} onClick={() => set(c)} className={`h-9 w-9 rounded-full border-2 ${now === c ? 'border-sky-400' : 'border-zinc-700'}`} style={{ background: c }} />
      ))}
      <label className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-dashed border-zinc-500">
        <input type="color" value={now ?? '#000000'} onChange={(e) => set(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={mark} />
      </label>
    </div>
  );
  const slider = (label: string, value: number, min: number, max: number, step: number, set: (v: number) => void, mark: string): React.ReactElement => (
    <label className="flex items-center gap-2 text-xs font-bold text-zinc-300" data-vslider={mark}>
      <span className="w-28 shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} className="h-11 min-w-0 flex-1 accent-sky-400" />
    </label>
  );

  const hint = tool === 'select' ? w('hintSelect') : tool === 'pencil' ? w('hintPencil') : tool === 'pen' ? w('hintPen') : tool === 'text' ? w('hintText') : w('hintShape');

  /* The chosen item's frame, handle to size and handle to turn. */
  const frame = item && tool === 'select' ? (() => {
    const { hw, hh } = halfSize(item);
    const rw = Math.abs(hw * item.sx);
    const rh = Math.abs(hh * item.sy);
    const lw = 2.5 * unit;
    return (
      <g transform={`translate(${item.x} ${item.y}) rotate(${item.rotate})`} pointerEvents="none" data-vframe>
        <rect x={-rw} y={-rh} width={rw * 2} height={rh * 2} fill="none" stroke="#38bdf8" strokeWidth={lw} strokeDasharray={`${8 * unit} ${6 * unit}`} />
        <line x1={0} y1={-rh} x2={0} y2={-rh - 40 * unit} stroke="#38bdf8" strokeWidth={lw} />
        <circle cx={0} cy={-rh - 40 * unit} r={11 * unit} fill="#ffffff" stroke="#38bdf8" strokeWidth={lw} data-vrotate />
        <rect x={rw * Math.sign(item.sx || 1) - 11 * unit} y={rh * Math.sign(item.sy || 1) - 11 * unit} width={22 * unit} height={22 * unit} fill="#ffffff" stroke="#38bdf8" strokeWidth={lw} data-vscale />
      </g>
    );
  })() : null;

  const shown = useMemo(() => doc.items.filter((one) => !one.hidden).map((one) => <g key={one.id} data-vitem={one.kind}>{draw(itemNode(one), one.id)}</g>), [doc.items]);

  /* ── The panel under the artboard ── */
  const panel = item ? (
    <div className="space-y-3" data-vpanel={item.kind}>
      {item.kind === 'text' && (
        <>
          <textarea value={item.text} rows={2} onChange={(e) => setDoc({ ...doc, items: doc.items.map((one) => (one.id === item.id ? { ...one, text: e.target.value.slice(0, 400) } as Item : one)) })} onBlur={() => commit(doc)} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-sm" aria-label={w('words')} data-vtext />
          <div className="flex flex-wrap gap-1.5">
            {(['sans', 'serif', 'display', 'hand'] as const).map((f) => (
              <button key={f} type="button" aria-pressed={item.font === f} onClick={() => change(item.id, { font: f } as Partial<Item>)} className={`${BTN} ${item.font === f ? 'border-sky-400 text-sky-200' : ''}`}>{w(f)}</button>
            ))}
            <button type="button" aria-pressed={item.bold} onClick={() => change(item.id, { bold: !item.bold } as Partial<Item>)} className={`${BTN} ${item.bold ? 'border-sky-400 text-sky-200' : ''}`}>{w('bold')}</button>
          </div>
        </>
      )}
      {item.kind === 'art' ? (
        <>
          <p className="text-xs font-bold text-zinc-300">{w('recolour')}</p>
          {swatchRow(null, (c) => { if (c) change(item.id, { tree: recolour(item.tree, c) } as Partial<Item>); }, 'recolour', false)}
          <button type="button" data-vbreak onClick={() => { const parts = breakApart(item, nextId); if (parts.length > 1) { commit({ ...doc, items: doc.items.flatMap((one) => (one.id === item.id ? parts : [one])) }); setChosen(parts[parts.length - 1].id); } }} className={BTN}><Scissors className="h-4 w-4" />{w('breakApart')}</button>
        </>
      ) : (
        <>
          <p className="text-xs font-bold text-zinc-300">{w('fill')}</p>
          {swatchRow(item.fill, (c) => change(item.id, { fill: c }), 'fill')}
          <p className="text-xs font-bold text-zinc-300">{w('stroke')}</p>
          {swatchRow(item.stroke, (c) => change(item.id, { stroke: c }), 'stroke')}
          {item.stroke && slider(w('thickness'), item.width, 0.5, 60 * unit, 0.5, (v) => setDoc({ ...doc, items: doc.items.map((one) => (one.id === item.id ? { ...one, width: v } as Item : one)) }), 'width')}
        </>
      )}
      {item.kind === 'rect' && slider(w('corners'), item.r, 0, Math.min(item.w, item.h) / 2, 1, (v) => setDoc({ ...doc, items: doc.items.map((one) => (one.id === item.id ? { ...one, r: v } as Item : one)) }), 'corners')}
      {item.kind === 'star' && slider(w('points'), item.points, 3, 16, 1, (v) => change(item.id, { points: v } as Partial<Item>), 'points')}
      {item.kind === 'star' && slider(w('depth'), item.inner, 0.15, 0.9, 0.01, (v) => setDoc({ ...doc, items: doc.items.map((one) => (one.id === item.id ? { ...one, inner: v } as Item : one)) }), 'depth')}
      {item.kind === 'polygon' && slider(w('sides'), item.sides, 3, 12, 1, (v) => change(item.id, { sides: v } as Partial<Item>), 'sides')}
      {slider(w('opacity'), 1 - item.opacity, 0, 0.9, 0.05, (v) => setDoc({ ...doc, items: doc.items.map((one) => (one.id === item.id ? { ...one, opacity: 1 - v } as Item : one)) }), 'opacity')}
      <div className="flex flex-wrap gap-1.5" data-varrange>
        <button type="button" onClick={() => arrange(1)} className={BTN}><ArrowUp className="h-4 w-4" />{w('forward')}</button>
        <button type="button" onClick={() => arrange(-1)} className={BTN}><ArrowDown className="h-4 w-4" />{w('backward')}</button>
        <button type="button" onClick={() => change(item.id, { sx: -item.sx })} className={BTN}><FlipHorizontal className="h-4 w-4" />{w('flipH')}</button>
        <button type="button" onClick={() => change(item.id, { sy: -item.sy })} className={BTN}><FlipVertical className="h-4 w-4" />{w('flipV')}</button>
        <button type="button" data-vduplicate onClick={duplicate} className={BTN}><Copy className="h-4 w-4" />{w('duplicate')}</button>
        <button type="button" data-vdelete onClick={remove} className={BTN}><Trash2 className="h-4 w-4" />{w('remove')}</button>
      </div>
    </div>
  ) : (
    <div className="space-y-4" data-vpanel="doc">
      <section className="space-y-2 rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/5 p-3" data-vai>
        <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-100"><Sparkles className="h-4 w-4 text-fuchsia-300" />{w('aiTitle')}</p>
        <textarea value={aiWords} onChange={(e) => setAiWords(e.target.value.slice(0, 1500))} rows={2} placeholder={w('aiHint')} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-sm" data-vaiwords />
        <button type="button" data-vaigo disabled={!aiWords.trim() || busy} onClick={() => { void aiDraw(); }} className={`${BTN} w-full`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {w('aiGo').replace('{n}', String(CREDITS.vector))}
        </button>
      </section>
      <section className="space-y-2 rounded-2xl border border-zinc-800 p-3" data-vtrace>
        <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-100"><ImageIcon className="h-4 w-4" />{w('traceTitle')}</p>
        <p className="text-xs text-zinc-400">{w('traceHint')}</p>
        {slider(w('colours'), traceColours, 2, 12, 1, setTraceColours, 'colours')}
        <label className={`${BTN} w-full cursor-pointer`}>
          {w('traceGo')}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" data-vtracefile onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void traceFile(file); }} />
        </label>
      </section>
      <section className="space-y-2 rounded-2xl border border-zinc-800 p-3" data-vsave>
        <p className="text-sm font-bold text-zinc-100">{w('saveTitle')}</p>
        <p className="text-[11px] text-zinc-400">{w('saveHow')}</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" data-vsavesvg disabled={!doc.items.length || busy} onClick={() => { void saveAs('svg'); }} className={BTN}>{w('saveSvg').replace('{n}', String(CREDITS.vectorOut))}</button>
          <button type="button" data-vsavepng disabled={!doc.items.length || busy} onClick={() => { void saveAs('png'); }} className={BTN}>{w('savePng').replace('{n}', String(CREDITS.vectorOut))}</button>
        </div>
      </section>
      <section className="space-y-2">
        <p className="text-xs font-bold text-zinc-300">{w('artboard')}</p>
        <div className="flex flex-wrap gap-1.5">
          {ARTBOARDS.map((one) => (
            <button key={one.id} type="button" aria-pressed={doc.w === one.w && doc.h === one.h} onClick={() => commit({ ...doc, w: one.w, h: one.h })} className={`${BTN} ${doc.w === one.w && doc.h === one.h ? 'border-sky-400 text-sky-200' : ''}`}>{lang === 'af' ? one.af : one.en}</button>
          ))}
        </div>
        <p className="text-xs font-bold text-zinc-300">{w('background')}</p>
        {swatchRow(doc.background, (c) => commit({ ...doc, background: c }), 'background')}
      </section>
      <section className="space-y-2">
        <p className="text-xs font-bold text-zinc-300">{w('fill')}</p>
        {swatchRow(fill, setFill, 'newfill')}
        <p className="text-xs font-bold text-zinc-300">{w('stroke')}</p>
        {swatchRow(stroke, setStroke, 'newstroke')}
        {slider(w('thickness'), thick, 1, 40, 1, setThick, 'newwidth')}
      </section>
    </div>
  );

  return (
    <div data-vectorstudio role="dialog" aria-modal="true" aria-label={w('title')} className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 text-zinc-100" style={{ paddingBottom: barClearance(0) }}>
      <header className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <button type="button" data-vclose onClick={onClose} aria-label={w('close')} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zinc-700"><X className="h-5 w-5" /></button>
        <p className="min-w-0 flex-1 truncate bg-linear-to-r from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-base font-extrabold text-transparent">{w('title')}</p>
        <button type="button" onClick={undo} disabled={!past.length} aria-label={w('undo')} data-vundo className="grid h-11 w-11 place-items-center rounded-full border border-zinc-700 disabled:opacity-30"><Undo2 className="h-5 w-5" /></button>
        <button type="button" onClick={redo} disabled={!future.length} aria-label={w('redo')} className="grid h-11 w-11 place-items-center rounded-full border border-zinc-700 disabled:opacity-30"><Redo2 className="h-5 w-5" /></button>
        <button
          type="button"
          data-vdone
          disabled={!doc.items.length}
          onClick={() => onDone({ svg: toSvg(doc), doc })}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-zinc-950 disabled:opacity-40"
          style={{ background: 'linear-gradient(120deg, #34d399, #22d3ee 60%, #38bdf8)' }}
        >
          <Check className="h-4 w-4" />{w('done')}
        </button>
      </header>
      <nav className="flex flex-wrap gap-1.5 border-b border-zinc-800 px-3 py-2" data-vtools>
        {TOOLS.map((one) => {
          const Icon = one.icon;
          return (
            <button key={one.id} type="button" data-vtool={one.id} aria-pressed={tool === one.id} aria-label={w(one.id)} title={w(one.id)} onClick={() => { setTool(one.id); setPenPts([]); if (one.id !== 'select') setChosen(null); }} className={`grid h-11 w-11 place-items-center rounded-xl border ${tool === one.id ? 'border-sky-400 bg-sky-500/15 text-sky-100' : 'border-zinc-800 bg-zinc-900 text-zinc-300'}`}>
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </nav>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <p className="px-3 pt-2 text-[11px] text-zinc-400" data-vhint>{hint}</p>
        <div className="mx-auto flex max-w-3xl justify-center p-3">
          <svg
            ref={board}
            data-vboard
            viewBox={`0 0 ${doc.w} ${doc.h}`}
            className="h-auto max-h-[55vh] w-full touch-none select-none rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
            style={{ aspectRatio: `${doc.w} / ${doc.h}`, background: 'repeating-conic-gradient(#e7e7ea 0 25%, #c8c8ce 0 50%) 0 0 / 24px 24px' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={() => { drag.current = null; setPreview(null); }}
          >
            {doc.background && <rect width={doc.w} height={doc.h} fill={doc.background} />}
            {shown}
            {preview && <g opacity={0.8}>{draw(itemNode(preview), 'preview')}</g>}
            {penPts.length > 0 && (
              <g pointerEvents="none">
                <path d={smoothPath(penPts)} fill="none" stroke={stroke ?? '#111111'} strokeWidth={thick} strokeLinecap="round" />
                {penPts.map(([x, y], k) => <circle key={k} cx={x} cy={y} r={8 * unit} fill="#ffffff" stroke="#38bdf8" strokeWidth={2.5 * unit} />)}
              </g>
            )}
            {frame}
          </svg>
        </div>
        {tool === 'pen' && penPts.length > 1 && (
          <div className="flex justify-center gap-2 px-3" data-vpen>
            <button type="button" onClick={() => finishPen(false)} className={BTN}>{w('penDone')}</button>
            <button type="button" onClick={() => finishPen(true)} className={BTN}>{w('penClose')}</button>
          </div>
        )}
        <div className="mx-auto max-w-3xl px-3 pb-6 pt-2">{panel}</div>
      </main>
      {busy && <div className="pointer-events-none fixed inset-x-0 top-0 z-10 h-1 overflow-hidden"><div className="fb-working h-full w-full" /></div>}
      {said && (
        <div className="pointer-events-none fixed inset-x-3 flex justify-center" style={{ bottom: barClearance(12) }}>
          <p className="max-w-md rounded-2xl bg-zinc-800/95 px-4 py-2 text-center text-xs font-semibold text-zinc-100 shadow-lg" data-vsaid>{said}</p>
        </div>
      )}
    </div>
  );
}

/** Hand a file to the device to keep. */
function keepFile(data: Blob, name: string): void {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
