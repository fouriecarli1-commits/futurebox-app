'use client';

/**
 * The darkroom: a photograph developed by somebody who edits for a living.
 *
 * The owner, 17 October 2026, screenshots of a professional photo developer —
 * a histogram, Auto, B&W, HDR and Reset, a profile, Light, a tone curve,
 * Colour with a white-balance dropper, a mixer for eight colours, colour
 * grading on three wheels, Effects and Detail — and: *"Binne photoshop wonder
 * ek of daar by bring a photo in of daar nie 'n fancy looking button moet wees
 * wat mense na die lightroom toe vat."*
 *
 * So it opens over the photo editor from a button beside Bring a picture in,
 * with the photograph that is there, and hands the developed photograph back
 * when she presses Done. The arithmetic is `lib/develop.ts`, the same for the
 * preview and for the full-size photograph; this file is the room around it.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ClipboardPaste, Copy, Pipette, RotateCcw, Save, Sparkles, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';
import { ACCEPTS, fit } from '../lib/imagefile';
import {
  AS_SHOT, BANDS, DEVELOP_PRESETS, PROFILES, autoTone, cleanDevelop, curveTable, developPixels, fromPreset,
  hdrTone, histogram, neutralAt, type Band, type Develop, type Wheel,
} from '../lib/develop';
import MeerkatTile from './MeerkatTile';
import { meerkatThrough } from '../lib/meerkatphoto';

/** Every word on this screen, English and Afrikaans side by side. */
const WORDS = {
  title: ['Darkroom', 'Donkerkamer'],
  close: ['Close the darkroom', 'Maak die donkerkamer toe'],
  done: ['Done', 'Klaar'],
  working: ['Developing…', 'Ontwikkel…'],
  compare: ['Before | after', 'Voor | na'],
  auto: ['Auto', 'Outo'],
  bw: ['B&W', 'S&W'],
  hdr: ['HDR', 'HDR'],
  reset: ['Reset', 'Herstel'],
  profile: ['Profile', 'Profiel'],
  presets: ['Presets', 'Voorinstellings'],
  mine: ['Mine', 'Myne'],
  save: ['Save these', 'Stoor hierdie'],
  copy: ['Copy settings', 'Kopieer instellings'],
  paste: ['Paste settings', 'Plak instellings'],
  light: ['Light', 'Lig'],
  exposure: ['Exposure', 'Beligting'],
  contrast: ['Contrast', 'Kontras'],
  highlights: ['Highlights', 'Hoogtepunte'],
  shadows: ['Shadows', 'Skaduwees'],
  whites: ['Whites', 'Wittes'],
  blacks: ['Blacks', 'Swartes'],
  curve: ['Curve', 'Kurwe'],
  curveHow: ['Drag a point. Tap the line to add one; tap a point twice to take it away.', 'Sleep ’n punt. Tik op die lyn om een by te sit; tik twee keer op ’n punt om dit weg te vat.'],
  colour: ['Colour', 'Kleur'],
  dropper: ['Pick something white or grey', 'Kies iets wit of grys'],
  dropperOn: ['Tap something that should be white or grey', 'Tik op iets wat wit of grys moet wees'],
  temp: ['Temperature', 'Temperatuur'],
  tint: ['Tint', 'Tint'],
  vibrance: ['Vibrance', 'Lewendigheid'],
  saturation: ['Saturation', 'Versadiging'],
  mixer: ['Colour mixer', 'Kleurmenger'],
  hue: ['Hue', 'Kleurtoon'],
  sat: ['Saturation', 'Versadiging'],
  lum: ['Luminance', 'Helderheid'],
  grading: ['Colour grading', 'Kleurgradering'],
  gShadows: ['Shadows', 'Skaduwees'],
  gMid: ['Midtones', 'Middeltone'],
  gHigh: ['Highlights', 'Hoogtepunte'],
  blending: ['Blending', 'Vermenging'],
  balance: ['Balance', 'Balans'],
  effects: ['Effects', 'Effekte'],
  clarity: ['Clarity', 'Helderheid van detail'],
  dehaze: ['Dehaze', 'Waas weg'],
  vignette: ['Vignette', 'Vignet'],
  grain: ['Grain', 'Korrel'],
  detail: ['Detail', 'Detail'],
  sharpen: ['Sharpening', 'Skerpte'],
  masking: ['Masking', 'Maskering'],
  noise: ['Noise reduction', 'Geraasvermindering'],
  colourNoise: ['Colour noise', 'Kleurgeraas'],
  bring: ['Bring a photo in', 'Bring ’n foto in'],
  named: ['Name for these settings', 'Naam vir hierdie instellings'],
} as const;

type Word = keyof typeof WORDS;

/** The preview's longest side: enough to judge by, small enough to redraw at every move. */
const PREVIEW = 1100;
/** The saved photograph's longest side at most. */
const FULL = 4096;
const MINE_KEY = 'fb-darkroom-presets';
const COPY_KEY = 'fb-darkroom-copied';

interface Mine { readonly name: string; readonly d: Develop }

const readMine = (): Mine[] => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(MINE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((one) => {
      const d = cleanDevelop((one as { d?: unknown }).d);
      const name = typeof (one as { name?: unknown }).name === 'string' ? (one as { name: string }).name.slice(0, 40) : '';
      return d && name ? [{ name, d }] : [];
    });
  } catch {
    return [];
  }
};

/** A picture at a size, and blurred copies of it the arithmetic needs. */
function sheetsOf(picture: CanvasImageSource & { width: number; height: number }, longest: number): {
  readonly base: ImageData; readonly fine: ImageData; readonly broad: ImageData;
} | null {
  const wide0 = 'naturalWidth' in picture ? (picture as HTMLImageElement).naturalWidth || picture.width : picture.width;
  const tall0 = 'naturalHeight' in picture ? (picture as HTMLImageElement).naturalHeight || picture.height : picture.height;
  const k = Math.min(1, longest / Math.max(1, wide0, tall0));
  const w = Math.max(1, Math.round(wide0 * k));
  const h = Math.max(1, Math.round(tall0 * k));
  const take = (blur: number): ImageData | null => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    if (blur > 0) ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(picture, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  };
  const base = take(0);
  const fine = take(Math.max(0.8, Math.max(w, h) / 900));
  const broad = take(Math.max(4, Math.max(w, h) / 40));
  return base && fine && broad ? { base, fine, broad } : null;
}

/** Each preset's tile: the meerkat photo through the preset, drawn once. */
const PRESET_PICTURES: Readonly<Record<string, () => string>> = Object.fromEntries(
  DEVELOP_PRESETS.map((one) => [one.id, () => meerkatThrough(`develop:${one.id}`, (px) => developPixels(px, null, null, fromPreset(one)))]),
);

export default function Darkroom({
  picture,
  onClose,
  onDone,
}: {
  readonly picture: HTMLImageElement | null;
  readonly onClose: () => void;
  readonly onDone: (developed: HTMLCanvasElement) => void;
}): React.ReactElement {
  const { lang } = useLang();
  const w = (word: Word): string => WORDS[word][lang === 'af' ? 1 : 0];
  useBackLayer(true, onClose);

  const [photo, setPhoto] = useState<HTMLImageElement | null>(picture);
  const [d, setD] = useState<Develop>(AS_SHOT);
  const [compare, setCompare] = useState<number | null>(null);
  const [dropper, setDropper] = useState(false);
  const [busy, setBusy] = useState(false);
  const [band, setBand] = useState<Band>('red');
  const [mine, setMine] = useState<Mine[]>([]);
  const [copied, setCopied] = useState<Develop | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({ light: true, colour: true });
  const view = useRef<HTMLCanvasElement | null>(null);
  const hist = useRef<HTMLCanvasElement | null>(null);
  const sheets = useMemo(() => (photo ? sheetsOf(photo, PREVIEW) : null), [photo]);

  useEffect(() => {
    setMine(readMine());
    try { setCopied(cleanDevelop(JSON.parse(window.localStorage.getItem(COPY_KEY) ?? 'null'))); } catch { /* nothing copied */ }
  }, []);

  /* The preview, redrawn on the next frame after any change. */
  useEffect(() => {
    if (!sheets || !view.current) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const canvas = view.current;
      if (!canvas) return;
      const { base, fine, broad } = sheets;
      canvas.width = base.width;
      canvas.height = base.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const out = developPixels(base, fine, broad, d);
      ctx.putImageData(new ImageData(out, base.width, base.height), 0, 0);
      if (compare !== null) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, base.width * compare, base.height);
        ctx.clip();
        ctx.putImageData(base, 0, 0, 0, 0, Math.round(base.width * compare), base.height);
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(base.width * compare - 1.5, 0, 3, base.height);
      }
      const graph = hist.current;
      const gtx = graph?.getContext('2d');
      if (graph && gtx) {
        const counts = histogram(out, 3);
        const peak = Math.max(1, ...counts.r, ...counts.g, ...counts.b);
        gtx.clearRect(0, 0, graph.width, graph.height);
        gtx.globalCompositeOperation = 'lighter';
        for (const [series, ink] of [[counts.r, 'rgba(239,68,68,0.7)'], [counts.g, 'rgba(34,197,94,0.7)'], [counts.b, 'rgba(59,130,246,0.7)']] as const) {
          gtx.fillStyle = ink;
          gtx.beginPath();
          gtx.moveTo(0, graph.height);
          for (let k = 0; k < 256; k += 1) {
            gtx.lineTo((k / 255) * graph.width, graph.height - (Math.sqrt(series[k] / peak)) * graph.height);
          }
          gtx.lineTo(graph.width, graph.height);
          gtx.fill();
        }
        gtx.globalCompositeOperation = 'source-over';
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sheets, d, compare]);

  const set = useCallback(<K extends keyof Develop>(key: K, value: Develop[K]): void => {
    setD((was) => ({ ...was, [key]: value }));
  }, []);

  /* ── Done: the full-size photograph, developed ── */
  const finish = (): void => {
    if (!photo || busy) return;
    setBusy(true);
    window.setTimeout(() => {
      const full = sheetsOf(photo, FULL);
      if (!full) { setBusy(false); return; }
      const out = document.createElement('canvas');
      out.width = full.base.width;
      out.height = full.base.height;
      out.getContext('2d')?.putImageData(new ImageData(developPixels(full.base, full.fine, full.broad, d), out.width, out.height), 0, 0);
      setBusy(false);
      onDone(out);
    }, 30);
  };

  /* ── The white-balance dropper ── */
  const pick = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!dropper || !sheets) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - box.left) / box.width) * sheets.base.width);
    const y = Math.round(((event.clientY - box.top) / box.height) * sheets.base.height);
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let dy = -3; dy <= 3; dy += 1) {
      for (let dx = -3; dx <= 3; dx += 1) {
        const px = Math.min(sheets.base.width - 1, Math.max(0, x + dx));
        const py = Math.min(sheets.base.height - 1, Math.max(0, y + dy));
        const i = (py * sheets.base.width + px) * 4;
        r += sheets.base.data[i];
        g += sheets.base.data[i + 1];
        b += sheets.base.data[i + 2];
        n += 1;
      }
    }
    setD((was) => ({ ...was, ...neutralAt(r / n, g / n, b / n) }));
    setDropper(false);
  };

  /* ── Pieces ── */
  const slider = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, mark: string, track?: string): React.ReactElement => (
    <label className="block" data-darkslider={mark}>
      <span className="flex items-center justify-between text-xs text-zinc-300">
        <button type="button" onDoubleClick={() => onChange(0)} className="text-left">{label}</button>
        <span className="font-mono text-zinc-400">{step < 1 ? value.toFixed(2) : Math.round(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 w-full accent-emerald-400"
        style={track ? { background: track, borderRadius: 999, height: 6, marginTop: 14, marginBottom: 14 } : undefined}
        aria-label={label}
      />
    </label>
  );
  const section = (id: string, label: string, body: React.ReactNode): React.ReactElement => (
    <section className="border-t border-zinc-800" data-darksection={id}>
      <button
        type="button"
        onClick={() => setOpen((was) => ({ ...was, [id]: !was[id] }))}
        aria-expanded={Boolean(open[id])}
        className="flex min-h-[44px] w-full items-center justify-between text-sm font-bold text-zinc-100"
      >
        {label}
        <span aria-hidden className="text-zinc-500">{open[id] ? '−' : '+'}</span>
      </button>
      {open[id] && <div className="space-y-2 pb-4">{body}</div>}
    </section>
  );
  const chip = (on: boolean, label: string, act: () => void, mark: string): React.ReactElement => (
    <button
      key={mark}
      type="button"
      data-darkchip={mark}
      aria-pressed={on}
      onClick={act}
      className={`min-h-[44px] rounded-full border px-3 text-xs font-bold ${on ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`}
    >
      {label}
    </button>
  );

  const mix = d.mixer[band];
  const setMix = (key: 'h' | 's' | 'l', value: number): void =>
    setD((was) => ({ ...was, mixer: { ...was.mixer, [band]: { ...was.mixer[band], [key]: value } } }));
  const setWheel = (which: 'shadows' | 'midtones' | 'highlights', wheel: Wheel): void =>
    setD((was) => ({ ...was, grade: { ...was.grade, [which]: wheel } }));

  return (
    <div data-darkroom role="dialog" aria-modal="true" aria-label={w('title')} className="fixed inset-0 z-[60] flex flex-col bg-zinc-950">
      <header className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-3 py-2">
        <button type="button" data-darkclose onClick={onClose} aria-label={w('close')} className="grid h-11 w-11 place-items-center rounded-full border border-zinc-700 text-zinc-200">
          <X className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-lg font-black tracking-tight text-zinc-50">
          <span className="bg-linear-to-r from-amber-300 via-rose-300 to-violet-300 bg-clip-text text-transparent">{w('title')}</span>
        </h2>
        <button
          type="button"
          data-darkcompare
          aria-pressed={compare !== null}
          onClick={() => setCompare((was) => (was === null ? 0.5 : null))}
          className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold ${compare !== null ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : 'border-zinc-700 text-zinc-300'}`}
        >
          {w('compare')}
        </button>
        <button
          type="button"
          data-darkdone
          disabled={!photo || busy}
          onClick={finish}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-black disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          {busy ? w('working') : w('done')}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative flex h-[42dvh] shrink-0 items-center justify-center bg-black p-2 md:h-auto md:flex-1">
          {photo ? (
            <canvas
              ref={view}
              data-darkview
              onPointerDown={pick}
              onPointerMove={(event) => {
                if (compare === null || event.buttons === 0) return;
                const box = event.currentTarget.getBoundingClientRect();
                setCompare(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)));
              }}
              className="max-h-full max-w-full object-contain"
              style={{ cursor: dropper ? 'crosshair' : compare !== null ? 'ew-resize' : 'default', touchAction: compare !== null || dropper ? 'none' : 'auto' }}
            />
          ) : (
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-zinc-700 px-4 text-sm font-bold text-zinc-200">
              {w('bring')}
              <input
                type="file"
                accept={ACCEPTS}
                data-darkbring
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  /* Through `fit`, so a camera's two hundred megapixels arrive
                     at the size the darkroom works at instead of killing the tab. */
                  void fit(file, FULL).then((made) => {
                    if (!made.ok) return;
                    const img = new Image();
                    img.onload = () => setPhoto(img);
                    img.src = made.preview;
                  });
                }}
              />
            </label>
          )}
          {busy && <div aria-hidden className="fb-working pointer-events-none absolute inset-2" />}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3 md:w-[380px] md:flex-none md:border-l md:border-zinc-800" style={{ paddingBottom: barClearance(24) }}>
          <canvas ref={hist} width={360} height={70} data-darkhistogram className="h-16 w-full rounded-lg bg-zinc-900" aria-hidden />

          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {([
              ['auto', () => sheets && setD((was) => autoTone(sheets.base.data, was))],
              ['bw', () => set('profile', d.profile === 'mono' ? 'colour' : 'mono')],
              ['hdr', () => setD((was) => hdrTone(was))],
              ['reset', () => setD(AS_SHOT)],
            ] as const).map(([word, act]) => (
              <button
                key={word}
                type="button"
                data-darkedit={word}
                aria-pressed={word === 'bw' ? d.profile === 'mono' : undefined}
                onClick={() => { act(); }}
                className={`min-h-[44px] rounded-xl border text-xs font-bold ${word === 'bw' && d.profile === 'mono' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : 'border-zinc-700 bg-zinc-900 text-zinc-200'}`}
              >
                {word === 'auto' ? <Sparkles className="mx-auto mb-0.5 h-3.5 w-3.5" /> : word === 'reset' ? <RotateCcw className="mx-auto mb-0.5 h-3.5 w-3.5" /> : null}
                {w(word)}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">{w('profile')}</p>
            <div className="flex flex-wrap gap-1.5">
              {PROFILES.map((one) => chip(d.profile === one.id, lang === 'af' ? one.af : one.en, () => set('profile', one.id), `profile-${one.id}`))}
            </div>
          </div>

          {section('presets', w('presets'), (
            <>
              <div className="flex flex-wrap gap-1.5">
                {/* Each the meerkat photo developed by it — the darkroom's own
                    `developPixels`, so the tile is what the preset does. */}
                {DEVELOP_PRESETS.map((one) => (
                  <MeerkatTile
                    key={one.id}
                    label={lang === 'af' ? one.af : one.en}
                    on={false}
                    onPick={() => setD(fromPreset(one))}
                    picture={PRESET_PICTURES[one.id]}
                    size={60}
                    data={{ 'data-darkchip': `preset-${one.id}` }}
                  />
                ))}
              </div>
              {mine.length > 0 && (
                <>
                  <p className="pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">{w('mine')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mine.map((one, k) => chip(false, one.name, () => setD(one.d), `mine-${k}`))}
                  </div>
                </>
              )}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  data-darksave
                  onClick={() => {
                    const name = window.prompt(w('named'), '')?.trim();
                    if (!name) return;
                    const next = [...mine.filter((one) => one.name !== name), { name, d }].slice(-24);
                    setMine(next);
                    try { window.localStorage.setItem(MINE_KEY, JSON.stringify(next)); } catch { /* kept for this visit */ }
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-zinc-700 text-[11px] font-bold text-zinc-200"
                >
                  <Save className="h-3.5 w-3.5" />
                  {w('save')}
                </button>
                <button
                  type="button"
                  data-darkcopy
                  onClick={() => {
                    setCopied(d);
                    try { window.localStorage.setItem(COPY_KEY, JSON.stringify(d)); } catch { /* kept for this visit */ }
                  }}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-zinc-700 text-[11px] font-bold text-zinc-200"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {w('copy')}
                </button>
                <button
                  type="button"
                  data-darkpaste
                  disabled={!copied}
                  onClick={() => { if (copied) setD(copied); }}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-zinc-700 text-[11px] font-bold text-zinc-200 disabled:opacity-40"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  {w('paste')}
                </button>
              </div>
            </>
          ))}

          {section('light', w('light'), (
            <>
              {slider(w('exposure'), d.exposure, -5, 5, 0.05, (v) => set('exposure', v), 'exposure')}
              {slider(w('contrast'), d.contrast, -100, 100, 1, (v) => set('contrast', v), 'contrast')}
              {slider(w('highlights'), d.highlights, -100, 100, 1, (v) => set('highlights', v), 'highlights')}
              {slider(w('shadows'), d.shadows, -100, 100, 1, (v) => set('shadows', v), 'shadows')}
              {slider(w('whites'), d.whites, -100, 100, 1, (v) => set('whites', v), 'whites')}
              {slider(w('blacks'), d.blacks, -100, 100, 1, (v) => set('blacks', v), 'blacks')}
            </>
          ))}

          {section('curve', w('curve'), (
            <>
              <CurveEditor points={d.curve} onChange={(points) => set('curve', points)} />
              <p className="text-[11px] leading-relaxed text-zinc-500">{w('curveHow')}</p>
            </>
          ))}

          {section('colour', w('colour'), (
            <>
              <button
                type="button"
                data-darkdropper
                aria-pressed={dropper}
                onClick={() => setDropper((was) => !was)}
                className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border text-xs font-bold ${dropper ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : 'border-zinc-700 text-zinc-200'}`}
              >
                <Pipette className="h-4 w-4" />
                {dropper ? w('dropperOn') : w('dropper')}
              </button>
              {slider(w('temp'), d.temp, -100, 100, 1, (v) => set('temp', v), 'temp', 'linear-gradient(90deg,#3b82f6,#e5e7eb,#f59e0b)')}
              {slider(w('tint'), d.tint, -100, 100, 1, (v) => set('tint', v), 'tint', 'linear-gradient(90deg,#22c55e,#e5e7eb,#d946ef)')}
              {slider(w('vibrance'), d.vibrance, -100, 100, 1, (v) => set('vibrance', v), 'vibrance')}
              {slider(w('saturation'), d.saturation, -100, 100, 1, (v) => set('saturation', v), 'saturation', 'linear-gradient(90deg,#71717a,#ef4444)')}
            </>
          ))}

          {section('mixer', w('mixer'), (
            <>
              <div className="flex flex-wrap gap-1.5">
                {BANDS.map((one) => (
                  <button
                    key={one.id}
                    type="button"
                    data-darkband={one.id}
                    aria-pressed={band === one.id}
                    aria-label={lang === 'af' ? one.af : one.en}
                    onClick={() => setBand(one.id)}
                    className={`h-10 w-10 rounded-full border-2 ${band === one.id ? 'border-white' : 'border-transparent'}`}
                    style={{ background: one.ink }}
                  />
                ))}
              </div>
              {slider(w('hue'), mix.h, -100, 100, 1, (v) => setMix('h', v), 'mix-h')}
              {slider(w('sat'), mix.s, -100, 100, 1, (v) => setMix('s', v), 'mix-s')}
              {slider(w('lum'), mix.l, -100, 100, 1, (v) => setMix('l', v), 'mix-l')}
            </>
          ))}

          {section('grading', w('grading'), (
            <>
              <div className="grid grid-cols-3 gap-2">
                {([['shadows', 'gShadows'], ['midtones', 'gMid'], ['highlights', 'gHigh']] as const).map(([which, word]) => (
                  <div key={which} className="flex flex-col items-center gap-1">
                    <ColourWheel value={d.grade[which]} onChange={(one) => setWheel(which, one)} mark={which} />
                    <span className="text-[11px] font-bold text-zinc-400">{w(word)}</span>
                  </div>
                ))}
              </div>
              {slider(`${w('gShadows')} · ${w('lum')}`, d.grade.shadows.lum, -100, 100, 1, (v) => setWheel('shadows', { ...d.grade.shadows, lum: v }), 'grade-shadows-lum')}
              {slider(`${w('gMid')} · ${w('lum')}`, d.grade.midtones.lum, -100, 100, 1, (v) => setWheel('midtones', { ...d.grade.midtones, lum: v }), 'grade-mid-lum')}
              {slider(`${w('gHigh')} · ${w('lum')}`, d.grade.highlights.lum, -100, 100, 1, (v) => setWheel('highlights', { ...d.grade.highlights, lum: v }), 'grade-high-lum')}
              {slider(w('blending'), d.grade.blending, 0, 100, 1, (v) => set('grade', { ...d.grade, blending: v }), 'blending')}
              {slider(w('balance'), d.grade.balance, -100, 100, 1, (v) => set('grade', { ...d.grade, balance: v }), 'balance')}
            </>
          ))}

          {section('effects', w('effects'), (
            <>
              {slider(w('clarity'), d.clarity, -100, 100, 1, (v) => set('clarity', v), 'clarity')}
              {slider(w('dehaze'), d.dehaze, -100, 100, 1, (v) => set('dehaze', v), 'dehaze')}
              {slider(w('vignette'), d.vignette, -100, 100, 1, (v) => set('vignette', v), 'vignette')}
              {slider(w('grain'), d.grain, 0, 100, 1, (v) => set('grain', v), 'grain')}
            </>
          ))}

          {section('detail', w('detail'), (
            <>
              {slider(w('sharpen'), d.sharpen, 0, 150, 1, (v) => set('sharpen', v), 'sharpen')}
              {slider(w('masking'), d.masking, 0, 100, 1, (v) => set('masking', v), 'masking')}
              {slider(w('noise'), d.noise, 0, 100, 1, (v) => set('noise', v), 'noise')}
              {slider(w('colourNoise'), d.colourNoise, 0, 100, 1, (v) => set('colourNoise', v), 'colournoise')}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── The tone curve ───────────────────────────────────────────────────── */

function CurveEditor({ points, onChange }: {
  readonly points: readonly (readonly [number, number])[];
  readonly onChange: (points: readonly (readonly [number, number])[]) => void;
}): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const held = useRef<number | null>(null);
  const lastTap = useRef<{ at: number; index: number } | null>(null);
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const s = c.width;
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 4; k += 1) {
      ctx.beginPath(); ctx.moveTo((k / 4) * s, 0); ctx.lineTo((k / 4) * s, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, (k / 4) * s); ctx.lineTo(s, (k / 4) * s); ctx.stroke();
    }
    const lut = curveTable(points);
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 256; k += 1) {
      const x = (k / 255) * s;
      const y = s - (lut[k] / 255) * s;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (const [x, y] of points) {
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(x * s, s - y * s, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [points]);
  const at = (event: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const box = event.currentTarget.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      Math.min(1, Math.max(0, 1 - (event.clientY - box.top) / box.height)),
    ];
  };
  return (
    <canvas
      ref={canvas}
      width={260}
      height={260}
      data-darkcurve
      className="aspect-square w-full max-w-[260px] rounded-xl"
      style={{ touchAction: 'none' }}
      onPointerDown={(event) => {
        const [x, y] = at(event);
        const near = points.findIndex(([px, py]) => Math.hypot(px - x, py - y) < 0.06);
        event.currentTarget.setPointerCapture(event.pointerId);
        if (near >= 0) {
          const now = Date.now();
          const was = lastTap.current;
          lastTap.current = { at: now, index: near };
          /* Twice on a point that is not an end takes it away. */
          if (was && was.index === near && now - was.at < 350 && near > 0 && near < points.length - 1) {
            onChange(points.filter((_, k) => k !== near));
            held.current = null;
            return;
          }
          held.current = near;
          return;
        }
        const next = [...points, [x, y] as const].sort((a, b) => a[0] - b[0]);
        held.current = next.findIndex(([px, py]) => px === x && py === y);
        onChange(next);
      }}
      onPointerMove={(event) => {
        const index = held.current;
        if (index === null) return;
        const [x, y] = at(event);
        const ends = index === 0 || index === points.length - 1;
        const lo = index > 0 ? points[index - 1][0] + 0.01 : 0;
        const hi = index < points.length - 1 ? points[index + 1][0] - 0.01 : 1;
        onChange(points.map((p, k) => (k === index ? [ends ? p[0] : Math.min(hi, Math.max(lo, x)), y] as const : p)));
      }}
      onPointerUp={() => { held.current = null; }}
      onPointerCancel={() => { held.current = null; }}
    />
  );
}

/* ── A colour wheel for grading ───────────────────────────────────────── */

function ColourWheel({ value, onChange, mark }: {
  readonly value: Wheel;
  readonly onChange: (wheel: Wheel) => void;
  readonly mark: string;
}): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const down = useRef(false);
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const s = c.width;
    const r = s / 2 - 4;
    ctx.clearRect(0, 0, s, s);
    const hue = ctx.createConicGradient(0, s / 2, s / 2);
    for (let k = 0; k <= 12; k += 1) hue.addColorStop(k / 12, `hsl(${k * 30}, 90%, 55%)`);
    ctx.fillStyle = hue;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
    ctx.fill();
    const fade = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, r);
    fade.addColorStop(0, 'rgba(160,160,160,1)');
    fade.addColorStop(1, 'rgba(160,160,160,0)');
    ctx.fillStyle = fade;
    ctx.fill();
    const angle = (value.hue * Math.PI) / 180;
    const dist = (value.sat / 100) * r;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(s / 2 + Math.cos(angle) * dist, s / 2 + Math.sin(angle) * dist, 6, 0, Math.PI * 2);
    ctx.stroke();
  }, [value]);
  const at = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const box = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    const r = box.width / 2 - 4;
    const hue = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const sat = Math.min(100, (Math.hypot(dx, dy) / r) * 100);
    onChange({ ...value, hue: Math.round(hue), sat: Math.round(sat) });
  };
  return (
    <canvas
      ref={canvas}
      width={110}
      height={110}
      data-darkwheel={mark}
      className="aspect-square w-full max-w-[110px]"
      style={{ touchAction: 'none' }}
      onPointerDown={(event) => { down.current = true; event.currentTarget.setPointerCapture(event.pointerId); at(event); }}
      onPointerMove={(event) => { if (down.current) at(event); }}
      onPointerUp={() => { down.current = false; }}
      onPointerCancel={() => { down.current = false; }}
      onDoubleClick={() => onChange({ ...value, hue: 0, sat: 0 })}
    />
  );
}
