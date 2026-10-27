'use client';

/**
 * A lane's spectrogram, big, with the words to read it by.
 *
 * The owner, 27 October 2026: *"Wat is die punt van 'n spectogram? Moet mens
 * nie op dit kan kliek en dit word groot dat mens kan sien wat aan gaan
 * nie?"* On a lane it is a thin strip of colour; here it is the whole width
 * of the screen, finer, scrolling sideways through time, with the pitches
 * marked up the side and what the bright places usually are, in words.
 *
 * `SpectrumButton` is the small magnifier on a lane that opens it.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Maximize2, X } from 'lucide-react';
import { HIGH, LOW, paintSpectrogram, spectrogramOf, spectrogramOfBlob, type Spectrogram } from '../lib/spectrogram';

type Say = (key: string, fallback: string) => string;

/** Pixels a second of sound gets across: enough to see a word or a drum hit. */
const PER_SECOND = 60;
const TALL = 280;
const MARKS: readonly (readonly [number, string])[] = [[60, '60'], [125, '125'], [250, '250'], [500, '500'], [1000, '1k'], [2000, '2k'], [4000, '4k'], [8000, '8k'], [16000, '16k']];

/** How far up the picture a pitch sits: the rows run on a log scale from LOW to HIGH. */
const rise = (hz: number): number => Math.log(hz / LOW) / Math.log(HIGH / LOW);

function SpectrumLook({ sound, from = 0, long, name, t, onClose }: {
  readonly sound: Blob | AudioBuffer;
  readonly from?: number;
  readonly long?: number;
  readonly name?: string;
  readonly t: Say;
  readonly onClose: () => void;
}): React.ReactElement | null {
  const [picture, setPicture] = useState<Spectrogram | null>(null);
  const [failed, setFailed] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  const seconds = Math.max(1, long ?? ((sound instanceof Blob ? 0 : sound.duration) - from));
  const wide = Math.max(320, Math.round(seconds * PER_SECOND));

  useEffect(() => {
    let alive = true;
    const columns = Math.min(2400, Math.max(400, Math.round(wide)));
    void (async () => {
      const got = sound instanceof Blob ? await spectrogramOfBlob(sound, columns, 128) : spectrogramOf(sound, columns, 128);
      if (!alive) return;
      if (got) setPicture(got); else setFailed(true);
    })();
    return () => { alive = false; };
  }, [sound, wide]);

  useEffect(() => {
    const key = (event: KeyboardEvent): void => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const span = picture ? Math.max(0.5, long ?? picture.duration - from) : seconds;
  const across = Math.max(320, Math.round(span * PER_SECOND));

  useEffect(() => {
    const node = canvas.current;
    if (!node || !picture) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    node.width = Math.round(across * dpr);
    node.height = Math.round(TALL * dpr);
    const paint = node.getContext('2d');
    if (!paint) return;
    paint.scale(dpr, dpr);
    paint.fillStyle = '#05070a';
    paint.fillRect(0, 0, across, TALL);
    paintSpectrogram(paint, picture, across, TALL, from, long);
    /* A line a second, faint, so time can be counted. */
    paint.fillStyle = 'rgba(255,255,255,0.12)';
    for (let s = 1; s < span; s += 1) paint.fillRect(Math.round((s / span) * across), 0, 1, TALL);
  }, [picture, across, span, from, long]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[150] flex flex-col justify-end bg-black/70 backdrop-blur-sm" role="dialog" aria-label={t('spec.title', 'What the sound is made of')} data-spectrumlook>
      <div className="fb-idea max-h-[92dvh] overflow-y-auto rounded-t-3xl border-t border-emerald-400/40 bg-zinc-950 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-100">{t('spec.title', 'What the sound is made of')}</p>
            {name && <p className="truncate text-xs text-zinc-400">{name}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={t('spec.close', 'Close')} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-zinc-800 text-zinc-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-1.5">
          {/* The pitches up the side, fixed while the picture scrolls. */}
          <div className="relative w-9 shrink-0" style={{ height: TALL }} aria-hidden>
            {MARKS.map(([hz, label]) => (
              <span key={hz} className="absolute right-0 -translate-y-1/2 text-[10px] font-semibold text-zinc-400" style={{ top: `${(1 - rise(hz)) * 100}%` }}>{label}</span>
            ))}
          </div>
          <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-zinc-800" data-sideways>
            {picture ? (
              <canvas ref={canvas} style={{ width: across, height: TALL, display: 'block' }} data-spectrumcanvas />
            ) : (
              <div className="grid place-items-center text-sm text-zinc-400" style={{ height: TALL }}>
                {failed ? t('spec.failed', 'This sound could not be read.') : <Loader2 className="h-6 w-6 animate-spin" />}
              </div>
            )}
          </div>
        </div>
        <p className="mt-1 pl-11 text-[10px] text-zinc-500">{t('spec.axis', 'Hz up the side · one faint line a second · swipe sideways through the sound')}</p>
        <ul className="mt-3 space-y-1.5 text-[13px] leading-snug text-zinc-300">
          <li><b className="text-zinc-100">{t('spec.howTitle', 'How to read it:')}</b> {t('spec.how', 'time runs left to right, pitch goes up, and the brighter a spot, the louder that pitch is at that moment.')}</li>
          <li><b className="text-amber-300">{t('spec.lowTitle', 'Bright at the bottom')}</b> {t('spec.low', '(under 250): bass and the kick drum. A thick band all the way along is a song that may sound boomy.')}</li>
          <li><b className="text-emerald-300">{t('spec.midTitle', 'Streaks in the middle')}</b> {t('spec.mid', '(250 to 4k): voices and melody. Wavy lines are a singer holding and bending notes.')}</li>
          <li><b className="text-sky-300">{t('spec.highTitle', 'Speckles at the top')}</b> {t('spec.high', '(over 4k): cymbals, breath and "s" sounds. Too bright here sounds harsh; dark sounds dull.')}</li>
          <li><b className="text-zinc-100">{t('spec.gapTitle', 'Dark gaps')}</b> {t('spec.gap', 'are silences: good places to cut.')}</li>
        </ul>
      </div>
    </div>,
    document.body,
  );
}

/**
 * The small magnifier on a lane drawn as a spectrogram. It keeps its own
 * finger: a press on it does not start dragging the clip under it.
 */
export function SpectrumButton({ sound, from, long, name, t }: {
  readonly sound: Blob | AudioBuffer;
  readonly from?: number;
  readonly long?: number;
  readonly name?: string;
  readonly t: Say;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        data-spectrumopen
        aria-label={t('spec.open', 'Open the spectrogram big')}
        title={t('spec.open', 'Open the spectrogram big')}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => { event.stopPropagation(); setOpen(true); }}
        className="pointer-events-auto absolute right-1 top-1 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
      {open && <SpectrumLook sound={sound} from={from} long={long} name={name} t={t} onClose={() => setOpen(false)} />}
    </>
  );
}
