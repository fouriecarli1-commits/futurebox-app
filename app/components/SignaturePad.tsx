'use client';

/**
 * A signature: drawn with a finger, typed in a hand-written letter, or a
 * picture of one brought in — and whichever it was, a see-through picture of
 * just the ink.
 *
 * ── Why it is its own file ───────────────────────────────────────────────
 *
 * It lived inside the document room. The owner, 21 October 2026: *"Die legal
 * dokument moet ook 'n sign pad hê. Dit laat my dink dat die pdf editor ook
 * 'n sign pad moet kry om dokumente te sign, of selfs 'n signature te
 * upload."* Two places sign now — a PDF, and the Cubed presenter agreement —
 * and two copies of a pad drift apart the first time one of them is fixed.
 *
 * ── A picture of a signature ─────────────────────────────────────────────
 *
 * Most people who already have their signature as a file have a photograph
 * of it on paper: a white-ish page, a shadow, ink. Placed on a document as it
 * is, that is a grey rectangle with writing in it. So the paper is taken out:
 * the page's own colour is read off its edges, and every pixel close to it
 * goes see-through, softly at the edge so the strokes keep their shape. What
 * is left is the ink, in its own colour, and it is cut to its edges like a
 * drawn one.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';
import { fit } from '../lib/imagefile';

/** Paper is white in every theme: the pad is a picture of paper, not part of the app's skin. */
const PAPER = '#ffffff';
const INK = '#10152a';
const HAND = '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive';

export type SignWords = Readonly<Record<'title' | 'draw' | 'type' | 'upload' | 'uploadHint' | 'clear' | 'use' | 'name' | 'here' | 'close', string>>;

export interface Signed {
  readonly data: Uint8Array;
  readonly type: 'png';
  readonly w: number;
  readonly h: number;
  readonly url: string;
}

const pngOf = (canvas: HTMLCanvasElement): Promise<Uint8Array | null> => new Promise((done) => {
  canvas.toBlob((blob) => {
    if (!blob) { done(null); return; }
    void blob.arrayBuffer().then((buffer) => done(new Uint8Array(buffer)), () => done(null));
  }, 'image/png');
});

/**
 * The paper taken out of a picture of a signature.
 *
 * Paper in a photograph is not one colour: it is lit from one side, shaded
 * on the other, and sometimes has a phone's shadow across it. One brightness
 * for the whole page took the dark half of the paper for ink. So the paper is
 * judged where it is: the picture is cut into small squares, the brightest
 * thing in each square (and its neighbours, so a square a stroke runs right
 * through still finds paper) is that square's paper, and a pixel is ink by
 * how much darker it is than the paper around it. Clear at the paper, fully
 * inked well below it, fading between — which keeps a pen's soft edge.
 *
 * Empty margins round a picture are left alone: they were never paper.
 */
export function withoutPaper(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const light = (i: number): number => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const cell = Math.max(8, Math.round(Math.min(w, h) / 12));
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  const top = new Float32Array(cols * rows).fill(-1);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      if (d[i + 3] === 0) continue;
      const at = Math.floor(y / cell) * cols + Math.floor(x / cell);
      const l = light(i);
      if (l > top[at]) top[at] = l;
    }
  }
  const paper = new Float32Array(cols * rows).fill(-1);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      let most = -1;
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) most = Math.max(most, top[rr * cols + cc]);
        }
      }
      paper[r * cols + c] = most;
    }
  }
  let inkedPixels = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      if (d[i + 3] === 0) continue;
      const here = paper[Math.floor(y / cell) * cols + Math.floor(x / cell)];
      const below = here - light(i);
      const margin = Math.max(24, here * 0.14);
      const alpha = Math.max(0, Math.min(255, (below - margin) * 6));
      d[i + 3] = Math.min(d[i + 3], alpha);
      if (alpha > 10) inkedPixels += 1;
    }
  }
  ctx.putImageData(image, 0, 0);
  return inkedPixels > 40;
}

export default function SignaturePad({ what = 'signature', words, onClose, onMade }: {
  readonly what?: 'signature' | 'initials';
  readonly words: SignWords;
  readonly onClose: () => void;
  readonly onMade: (made: Signed) => void;
}): React.ReactElement {
  useBackLayer(true, onClose);
  const [how, setHow] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typed, setTyped] = useState('');
  const sheet = useRef<HTMLCanvasElement | null>(null);
  const picker = useRef<HTMLInputElement | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [inked, setInked] = useState(false);
  const W = what === 'initials' ? 400 : 900;
  const H = 300;

  const ctx = (): CanvasRenderingContext2D | null => sheet.current?.getContext('2d', { willReadFrequently: true }) ?? null;
  const clear = (): void => { ctx()?.clearRect(0, 0, W, H); setInked(false); };
  useEffect(() => {
    if (how !== 'type') return;
    const c = ctx();
    if (!c) return;
    c.clearRect(0, 0, W, H);
    if (!typed.trim()) { setInked(false); return; }
    c.fillStyle = INK;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    let px = 130;
    c.font = `${px}px ${HAND}`;
    while (px > 30 && c.measureText(typed).width > W * 0.92) { px -= 6; c.font = `${px}px ${HAND}`; }
    c.fillText(typed, W / 2, H / 2);
    setInked(true);
  }, [typed, how]);

  /** A picture of a signature, fitted into the pad with its paper taken out. */
  const bring = async (file: File | undefined): Promise<void> => {
    if (!file || !file.type.startsWith('image/')) return;
    const c = ctx();
    if (!c) return;
    /* Through the app's own guard first: a phone photograph can be two
       hundred megapixels, and decoding that as it is kills the tab. */
    const made = await fit(file, 1800);
    if (!made.ok) return;
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(made.blob);
    } catch {
      return;
    }
    c.clearRect(0, 0, W, H);
    const scale = Math.min((W * 0.94) / bitmap.width, (H * 0.9) / bitmap.height);
    const dw = bitmap.width * scale;
    const dh = bitmap.height * scale;
    c.drawImage(bitmap, (W - dw) / 2, (H - dh) / 2, dw, dh);
    bitmap.close?.();
    setInked(withoutPaper(c, W, H));
  };

  const at = (event: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - box.left) / box.width) * W, y: ((event.clientY - box.top) / box.height) * H };
  };
  const use = async (): Promise<void> => {
    const el = sheet.current;
    if (!el || !inked) return;
    /* Cut to what was drawn, so it is placed by its ink and not by the empty pad around it. */
    const c = el.getContext('2d', { willReadFrequently: true });
    if (!c) return;
    const d = c.getImageData(0, 0, W, H).data;
    let x1 = W; let y1 = H; let x2 = 0; let y2 = 0;
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (d[(y * W + x) * 4 + 3] > 10) { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); }
    if (x2 <= x1 || y2 <= y1) return;
    const pad = 6;
    const out = document.createElement('canvas');
    out.width = x2 - x1 + pad * 2;
    out.height = y2 - y1 + pad * 2;
    out.getContext('2d')?.drawImage(el, x1 - pad, y1 - pad, out.width, out.height, 0, 0, out.width, out.height);
    const data = await pngOf(out);
    if (!data) return;
    onMade({ data, type: 'png', w: out.width, h: out.height, url: URL.createObjectURL(new Blob([data.slice().buffer], { type: 'image/png' })) });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-scrim sm:items-center" role="dialog" aria-modal="true" aria-label={words.title} data-pdfpad data-signpad>
      <div className="w-full max-w-lg space-y-3 rounded-t-3xl border border-zinc-700 bg-zinc-900 p-4 sm:rounded-3xl" style={{ paddingBottom: barClearance(16) }}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-zinc-100">{words.title}</p>
          <button type="button" onClick={onClose} aria-label={words.close} className="grid h-11 w-11 place-items-center rounded-full border border-zinc-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['draw', 'type', 'upload'] as const).map((one) => (
            <button
              key={one}
              type="button"
              aria-pressed={how === one}
              data-pdfpadhow={one}
              onClick={() => {
                setHow(one);
                clear();
                setTyped('');
                if (one === 'upload') picker.current?.click();
              }}
              className={`min-h-[44px] rounded-xl border px-1 text-xs font-bold ${how === one ? 'border-sky-400 bg-sky-500/15 text-sky-100' : 'border-zinc-700 text-zinc-300'}`}
            >
              {words[one]}
            </button>
          ))}
        </div>
        <input
          ref={picker}
          type="file"
          accept="image/*"
          className="hidden"
          data-signpadfile
          onChange={(event) => { void bring(event.target.files?.[0]); event.target.value = ''; }}
        />
        {how === 'type' && <input className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm" value={typed} onChange={(e) => setTyped(e.target.value.slice(0, 40))} placeholder={words.name} aria-label={words.name} data-pdfpadtyped />}
        {how === 'upload' && (
          <button type="button" onClick={() => picker.current?.click()} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-600 px-3 text-sm font-semibold text-zinc-300">
            <ImagePlus className="h-4 w-4" />
            {words.uploadHint}
          </button>
        )}
        <div className="relative rounded-2xl" style={{ background: PAPER }}>
          <canvas
            ref={sheet}
            width={W}
            height={H}
            data-pdfpadsheet
            className="w-full touch-none"
            style={{ aspectRatio: `${W} / ${H}` }}
            onPointerDown={(event) => { if (how !== 'draw') return; event.currentTarget.setPointerCapture(event.pointerId); last.current = at(event); }}
            onPointerMove={(event) => {
              if (how !== 'draw' || !last.current) return;
              const c = ctx();
              if (!c) return;
              const p = at(event);
              c.strokeStyle = INK;
              c.lineWidth = what === 'initials' ? 7 : 6;
              c.lineCap = 'round';
              c.lineJoin = 'round';
              c.beginPath();
              c.moveTo(last.current.x, last.current.y);
              c.lineTo(p.x, p.y);
              c.stroke();
              last.current = p;
              setInked(true);
            }}
            onPointerUp={() => { last.current = null; }}
          />
          {how === 'draw' && !inked && <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-zinc-400">{words.here}</p>}
          <div className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-dashed border-zinc-300" />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { clear(); setTyped(''); }} className="min-h-[44px] flex-1 rounded-xl border border-zinc-700 text-xs font-bold text-zinc-200">{words.clear}</button>
          <button type="button" disabled={!inked} data-pdfpaduse onClick={() => { void use(); }} className="min-h-[44px] flex-1 rounded-xl text-sm font-extrabold text-zinc-950 disabled:opacity-40" style={{ background: 'linear-gradient(120deg, #38bdf8, #a78bfa 60%, #f472b6)' }}>{words.use}</button>
        </div>
      </div>
    </div>
  );
}
