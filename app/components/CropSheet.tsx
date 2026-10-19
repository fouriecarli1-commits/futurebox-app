'use client';

/**
 * A crop for a photo in a frame: the photo opens on its own, with a box round
 * it to drag by its corners and sides, and what is outside the box is cut
 * away.
 *
 * The owner, 19 October 2026, with a design's photo frame selected: *"Hierdie
 * cropping werk nie."* The photo editor's crop works on the post's own
 * photograph, drawn on the canvas; a photo in a design's or a grid's frame is
 * a cell, which had only Closer, Further and a drag to choose what shows
 * through — so Crop did nothing at all. This is the same crop, the same box
 * rules (`lib/cropbox.ts`), for any one picture.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Scissors, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';
import {
  WHOLE, cropped, cutTo, gripAt, moveBox, pullCorner, toShape, type Box, type Grip,
} from '../lib/cropbox';

/* The thirds over the photo: a literal white, the same on any theme. */
const GUIDE: React.CSSProperties = { background: 'rgba(255,255,255,0.35)' };

const SHAPES: readonly (readonly [string, number | null])[] = [
  ['any', null], ['1:1', 1], ['4:5', 4 / 5], ['9:16', 9 / 16], ['16:9', 16 / 9],
];

export default function CropSheet({
  image,
  onCut,
  onClose,
}: {
  readonly image: HTMLImageElement;
  /** The part inside the box, as its own picture. */
  readonly onCut: (made: HTMLCanvasElement) => void;
  readonly onClose: () => void;
}): React.ReactElement {
  const { t } = useLang();
  useBackLayer(true, onClose);
  const [box, setBox] = useState<Box>(WHOLE);
  const [shape, setShape] = useState('any');
  const shown = useRef<HTMLImageElement | null>(null);
  const grip = useRef<Grip>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const size = useMemo(
    () => ({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height }),
    [image],
  );

  /** Where a finger is, as shares of the picture on the glass. */
  const shareAt = useCallback((event: React.PointerEvent): { x: number; y: number; reach: number } | null => {
    const rect = shown.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      /* About a fingertip, whatever size the picture is drawn. */
      reach: 28 / Math.max(1, Math.min(rect.width, rect.height)),
    };
  }, []);

  const down = (event: React.PointerEvent<HTMLDivElement>): void => {
    const at = shareAt(event);
    if (!at) return;
    grip.current = gripAt(box, at.x, at.y, at.reach);
    if (grip.current === null) return;
    last.current = { x: at.x, y: at.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (grip.current === null || !last.current) return;
    const at = shareAt(event);
    if (!at) return;
    if (grip.current === 'inside') {
      setBox((was) => moveBox(was, at.x - last.current!.x, at.y - last.current!.y));
    } else {
      const want = SHAPES.find(([id]) => id === shape)?.[1] ?? null;
      setBox((was) => {
        const pulled = pullCorner(was, grip.current, at.x, at.y);
        return want ? toShape(pulled, size, want) : pulled;
      });
    }
    last.current = { x: at.x, y: at.y };
  };
  const up = (): void => { grip.current = null; last.current = null; };

  useEffect(() => {
    const want = SHAPES.find(([id]) => id === shape)?.[1] ?? null;
    if (want) setBox((was) => toShape(was, size, want));
  }, [shape, size]);

  const cut = (): void => {
    if (!cropped(box)) { onClose(); return; }
    const part = cutTo(box, size);
    const made = document.createElement('canvas');
    made.width = part.width;
    made.height = part.height;
    const ctx = made.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, part.x, part.y, part.width, part.height, 0, 0, part.width, part.height);
    onCut(made);
  };

  const pct = (n: number): string => `${(n * 100).toFixed(3)}%`;
  const grips: readonly (readonly [string, number, number])[] = [
    ['nw', box.left, box.top], ['n', (box.left + box.right) / 2, box.top], ['ne', box.right, box.top],
    ['e', box.right, (box.top + box.bottom) / 2], ['se', box.right, box.bottom], ['s', (box.left + box.right) / 2, box.bottom],
    ['sw', box.left, box.bottom], ['w', box.left, (box.top + box.bottom) / 2],
  ];

  return (
    <div data-cropsheet role="dialog" aria-modal="true" aria-label={t('crop.title', 'Crop the photo')}
      className="fixed inset-0 z-[80] flex flex-col bg-zinc-950/95 text-zinc-100 backdrop-blur-sm">
      <header className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <button type="button" data-cropclose onClick={onClose} aria-label={t('crop.close', 'Close without cutting')}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zinc-700">
          <X className="h-5 w-5" />
        </button>
        <p className="flex-1 truncate text-base font-extrabold">{t('crop.title', 'Crop the photo')}</p>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="relative max-h-full max-w-full touch-none select-none"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={shown} src={image.src} alt="" draggable={false}
            className="block max-h-[62vh] max-w-full object-contain" />
          {/* What is thrown away is dimmed; what is kept is lit, in neon. */}
          <div data-cropbox aria-hidden className="pointer-events-none absolute"
            style={{
              left: pct(box.left), top: pct(box.top), width: pct(box.right - box.left), height: pct(box.bottom - box.top),
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.62), 0 0 0 2px rgb(var(--fb-primary-400)), 0 0 18px 2px rgb(var(--fb-primary-400) / 0.6)',
            }}>
            <span className="absolute inset-y-0 left-1/3 w-px" style={GUIDE} />
            <span className="absolute inset-y-0 left-2/3 w-px" style={GUIDE} />
            <span className="absolute inset-x-0 top-1/3 h-px" style={GUIDE} />
            <span className="absolute inset-x-0 top-2/3 h-px" style={GUIDE} />
          </div>
          {grips.map(([id, x, y]) => (
            <span key={id} aria-hidden className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
              style={{ left: pct(x), top: pct(y), background: 'rgb(var(--fb-primary-400))', boxShadow: '0 0 10px rgb(var(--fb-primary-400))' }} />
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-zinc-800 px-4 py-3" style={{ paddingBottom: barClearance(12) }}>
        <p className="text-center text-xs text-zinc-400">{t('crop.how', 'Drag the corners and sides. Drag inside the box to move it.')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {SHAPES.map(([id]) => (
            <button key={id} type="button" data-cropshape={id} aria-pressed={shape === id} onClick={() => setShape(id)}
              className={`min-h-[44px] rounded-xl border px-3 text-sm font-bold ${shape === id ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}>
              {id === 'any' ? t('crop.any', 'Any shape') : id}
            </button>
          ))}
          <button type="button" data-cropwhole onClick={() => { setShape('any'); setBox(WHOLE); }}
            className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-bold text-zinc-300">
            {t('crop.whole', 'Whole photo')}
          </button>
        </div>
        <button type="button" data-cropdo onClick={cut}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 text-base font-black text-onAccent">
          <Scissors className="h-5 w-5" /> {t('crop.cut', 'Cut it down')}
        </button>
      </div>
    </div>
  );
}
