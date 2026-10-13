'use client';

/**
 * The Magic Drawing Board: a finger, ten crayons, and a wall to keep it on.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 13 October 2026: *"Maybe a drawing board that captures their shape
 * and makes their drawings realistically alive, but family friendly."*
 *
 * ── What this file is ────────────────────────────────────────────────────
 *
 * The board itself: a square canvas drawn on with pointer events, so one
 * finger, a stylus and a mouse are the same thing; crayons and brushes from
 * `lib/kidsdraw.ts`; undo as a stack of the paper's pixels; and "Keep it",
 * which puts a PNG on the gallery wall for nothing. All of it runs on the
 * device and asks nobody.
 *
 * "Bring it to life" — the paid press that hands the drawing to Google and
 * gets a picture back — is drawn here only when the room passes it in,
 * because its price and its allowance belong to the room (`KidsRoom.tsx`),
 * the way the song's and the video's do.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Heart, Trash2, Undo2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { BOARD_MOST, BRUSHES, CRAYONS, PAPER, UNDO_MOST, type Brush } from '../lib/kidsdraw';
import { keepPiece } from '../lib/kidsgallery';

export default function KidsDrawBoard({
  onSpark,
  onKept,
  alive,
}: {
  readonly onSpark: (n: number) => void;
  /** The wall should look again. */
  readonly onKept?: () => void;
  /** The paid press, drawn by the room with its price on it. Given the PNG. */
  readonly alive?: (drawing: Blob) => React.ReactNode;
}): React.ReactElement {
  const { t } = useLang();
  const frame = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [crayon, setCrayon] = useState(CRAYONS[0].id);
  const [brush, setBrush] = useState<Brush['id']>('medium');
  const [erasing, setErasing] = useState(false);
  const [strokes, setStrokes] = useState(0);
  const [kept, setKept] = useState(false);
  const [says, setSays] = useState('');
  const [png, setPng] = useState<Blob | null>(null);
  const undo = useRef<ImageData[]>([]);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  /* Square, as wide as the frame allows, sharp on a phone's screen. The
     pixels are kept across a resize: a turned phone must not lose the dog. */
  const size = useCallback((): void => {
    const box = frame.current;
    const paper = canvas.current;
    if (!box || !paper) return;
    const across = Math.min(BOARD_MOST, Math.floor(box.clientWidth));
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const before = paper.width ? paper.getContext('2d')?.getImageData(0, 0, paper.width, paper.height) : null;
    paper.width = Math.round(across * scale);
    paper.height = Math.round(across * scale);
    paper.style.width = `${across}px`;
    paper.style.height = `${across}px`;
    const ink = paper.getContext('2d');
    if (!ink) return;
    ink.fillStyle = PAPER;
    ink.fillRect(0, 0, paper.width, paper.height);
    if (before) {
      const copy = document.createElement('canvas');
      copy.width = before.width; copy.height = before.height;
      copy.getContext('2d')?.putImageData(before, 0, 0);
      ink.drawImage(copy, 0, 0, paper.width, paper.height);
    }
  }, []);

  useEffect(() => {
    size();
    window.addEventListener('resize', size);
    return () => window.removeEventListener('resize', size);
  }, [size]);

  const where = (event: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const paper = canvas.current!;
    const box = paper.getBoundingClientRect();
    const scale = paper.width / box.width;
    return { x: (event.clientX - box.left) * scale, y: (event.clientY - box.top) * scale };
  };

  const down = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const paper = canvas.current;
    const ink = paper?.getContext('2d');
    if (!paper || !ink) return;
    paper.setPointerCapture(event.pointerId);
    /* The paper as it was, for undo. Capped: the oldest goes. */
    undo.current.push(ink.getImageData(0, 0, paper.width, paper.height));
    if (undo.current.length > UNDO_MOST) undo.current.shift();
    drawing.current = true;
    const at = where(event);
    last.current = at;
    dot(ink, at);
  };

  const dot = (ink: CanvasRenderingContext2D, at: { x: number; y: number }): void => {
    const paper = canvas.current!;
    const px = (BRUSHES.find((one) => one.id === brush)?.px ?? 10) * (paper.width / paper.getBoundingClientRect().width);
    ink.lineCap = 'round';
    ink.lineJoin = 'round';
    ink.lineWidth = px;
    ink.strokeStyle = erasing ? PAPER : (CRAYONS.find((one) => one.id === crayon)?.hex ?? '#1f2937');
    ink.beginPath();
    ink.moveTo(at.x, at.y);
    ink.lineTo(at.x + 0.01, at.y + 0.01);
    ink.stroke();
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!drawing.current) return;
    const ink = canvas.current?.getContext('2d');
    if (!ink || !last.current) return;
    const at = where(event);
    const paper = canvas.current!;
    const px = (BRUSHES.find((one) => one.id === brush)?.px ?? 10) * (paper.width / paper.getBoundingClientRect().width);
    ink.lineCap = 'round';
    ink.lineJoin = 'round';
    ink.lineWidth = px;
    ink.strokeStyle = erasing ? PAPER : (CRAYONS.find((one) => one.id === crayon)?.hex ?? '#1f2937');
    ink.beginPath();
    ink.moveTo(last.current.x, last.current.y);
    ink.lineTo(at.x, at.y);
    ink.stroke();
    last.current = at;
  };

  const up = (): void => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    setStrokes((n) => n + 1);
    setKept(false);
    setPng(null);
  };

  const undoOne = (): void => {
    const paper = canvas.current;
    const ink = paper?.getContext('2d');
    const back = undo.current.pop();
    if (!paper || !ink || !back) return;
    ink.putImageData(back, 0, 0);
    setStrokes((n) => Math.max(0, n - 1));
    setKept(false);
    setPng(null);
  };

  const clear = (): void => {
    const paper = canvas.current;
    const ink = paper?.getContext('2d');
    if (!paper || !ink) return;
    undo.current.push(ink.getImageData(0, 0, paper.width, paper.height));
    ink.fillStyle = PAPER;
    ink.fillRect(0, 0, paper.width, paper.height);
    setStrokes(0);
    setKept(false);
    setPng(null);
  };

  const toPng = (): Promise<Blob | null> => new Promise((resolve) => {
    canvas.current?.toBlob((blob) => resolve(blob), 'image/png');
  });

  const keep = async (): Promise<void> => {
    const blob = await toPng();
    if (!blob) return;
    const put = await keepPiece({
      id: `drawing-${Date.now()}`,
      made: Date.now(),
      kind: 'drawing',
      title: t('kids.drawingTitle', 'My drawing'),
      blob,
    });
    if (put === 'kept') {
      setKept(true);
      setPng(blob);
      setSays(t('kids.drawingKept', 'Kept! It is on your gallery wall.'));
      onSpark(10);
      onKept?.();
    } else if (put === 'shelfFull') {
      setSays(t('kids.galleryFull', 'Your wall is full. Ask a grown-up to take one off.'));
    } else {
      setSays(t('kids.noKeep', 'This browser will not keep anything.'));
    }
  };

  /* The PNG for the paid press is made when the wall has it, so the thing
     that goes to Google is exactly the thing on the wall. */
  useEffect(() => {
    if (!alive || png) return;
    if (strokes === 0) return;
    let live = true;
    void toPng().then((blob) => { if (live && blob) setPng(blob); });
    return () => { live = false; };
  }, [alive, png, strokes]);

  return (
    <div className="space-y-4 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/85 p-4 shadow-lg backdrop-blur-sm sm:p-5" data-kidsdraw>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="fb-kids-bubble flex items-center gap-2 text-xl font-bold text-surface-900 sm:text-2xl">
          <span aria-hidden>🎨</span> {t('kids.drawTitle', 'Magic Drawing Board')}
        </h2>
        <p className="text-xs font-semibold text-surface-700">
          {t('kids.drawWhy', 'Draw with your finger. Keeping it uses no credits.')}
        </p>
      </div>

      {/* The crayons: round, one colour each, the chosen one lifted. */}
      <div className="flex flex-wrap justify-center gap-2" data-kidscrayons>
        {CRAYONS.map((one) => (
          <button
            key={one.id}
            type="button"
            aria-pressed={crayon === one.id && !erasing}
            aria-label={t(one.says[0], one.says[1])}
            title={t(one.says[0], one.says[1])}
            data-kidscrayon={one.id}
            onClick={() => { setCrayon(one.id); setErasing(false); }}
            style={{ background: one.hex }}
            className={`h-11 w-11 rounded-full border-4 transition-transform ${
              crayon === one.id && !erasing ? 'scale-110 border-white shadow-lg' : 'border-surface-200/60'
            }`}
          />
        ))}
        <button
          type="button"
          aria-pressed={erasing}
          aria-label={t('kids.eraser', 'Eraser')}
          title={t('kids.eraser', 'Eraser')}
          data-kidseraser
          onClick={() => setErasing((was) => !was)}
          className={`flex h-11 w-11 items-center justify-center rounded-full border-4 bg-surface-200 text-surface-900 ${
            erasing ? 'scale-110 border-white shadow-lg' : 'border-surface-200/60'
          }`}
        >
          <Eraser className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2" data-kidsbrushes>
        {BRUSHES.map((one) => (
          <button
            key={one.id}
            type="button"
            aria-pressed={brush === one.id}
            data-kidsbrush={one.id}
            onClick={() => setBrush(one.id)}
            className={`flex min-h-[44px] items-center gap-2 rounded-2xl px-4 text-sm font-black ${
              brush === one.id ? 'bg-cyan-400 text-onAccent shadow-md' : 'bg-surface-200/80 text-surface-800'
            }`}
          >
            <span aria-hidden className="inline-block rounded-full bg-current" style={{ width: one.px / 2 + 6, height: one.px / 2 + 6 }} />
            {t(one.says[0], one.says[1])}
          </button>
        ))}
      </div>

      <div ref={frame} className="mx-auto w-full" style={{ maxWidth: BOARD_MOST }}>
        <canvas
          ref={canvas}
          data-kidspaper
          data-kidsstrokes={strokes}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
          className="block w-full touch-none rounded-3xl border-4 border-cyan-400/60 shadow-2xl"
          style={{ background: PAPER }}
          aria-label={t('kids.drawTitle', 'Magic Drawing Board')}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" onClick={undoOne} disabled={undo.current.length === 0} data-kidsundo
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-surface-200/80 text-sm font-black text-surface-900 disabled:opacity-40">
          <Undo2 className="h-4 w-4" /> {t('kids.undo', 'Undo')}
        </button>
        <button type="button" onClick={clear} disabled={strokes === 0} data-kidsclear
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-surface-200/80 text-sm font-black text-surface-900 disabled:opacity-40">
          <Trash2 className="h-4 w-4" /> {t('kids.clearPaper', 'Clean paper')}
        </button>
        <button type="button" onClick={() => void keep()} disabled={strokes === 0 || kept} data-kidskeepdrawing
          className="fb-kids-bouncy col-span-2 flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-cyan-400 text-sm font-black text-onAccent disabled:opacity-40">
          <Heart className="h-4 w-4" fill={kept ? 'currentColor' : 'none'} /> {kept ? t('kids.keptIt', 'Kept') : t('kids.keep', 'Keep it')}
        </button>
      </div>

      {alive && png && strokes > 0 && alive(png)}

      {says && (
        <p className="rounded-2xl border-2 border-surface-200 bg-surface-100/80 px-4 py-3 text-sm font-semibold text-surface-900" data-kidsdrawsays>
          {says}
        </p>
      )}
    </div>
  );
}
