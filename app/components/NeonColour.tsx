'use client';

/**
 * Choosing a colour, in the app's own glass rather than the phone's.
 *
 * The owner, 30 October 2026, of the phone's own colour dialog opened from
 * the Words bench: *"Customised moet darem volledig uitgeskryf word, en
 * suggestions. Dan lyk hierdie colour windows nie soos die styl van ons app,
 * high quality, futuristic nie. Alles moet spectacular lyk."* The phone's
 * dialog broke its own words ("Customise d", "Suggestio ns") and looks like
 * no part of this app. This is ours: a swatch that opens a sheet over the
 * lower half of the screen, see-through, with glowing suggestions, the
 * colours used last, and three sliders (colour, strength, light) for any
 * other, and the code for it when you know it.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';

type Say = (key: string, fallback: string) => string;

/** Bright, glowing colours first: this is a neon app. Then the quiet ones a design also needs. */
export const NEON_SWATCHES = [
  '#39FF14', '#00F5D4', '#22D3EE', '#3B82F6', '#8B5CF6', '#C084FC', '#F472B6', '#FF2BD6',
  '#FF3B30', '#FF8A00', '#FFD60A', '#FACC15', '#A3E635', '#10B981', '#0EA5E9', '#6366F1',
  '#FFFFFF', '#E5E7EB', '#9CA3AF', '#4B5563', '#1F2937', '#000000', '#7C2D12', '#F5E6C8',
] as const;

const RECENT_KEY = 'fb.colours.recent.v1';

/** #rrggbb from hue 0–360, saturation and lightness 0–100. */
export function hslHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number): number => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number): number => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number): string => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`.toUpperCase();
}

/** Hue, saturation and lightness of #rrggbb. */
export function hexHsl(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [150, 100, 50];
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
}

const isHex = (v: string): boolean => /^#[0-9a-f]{6}$/i.test(v);

function recent(): string[] {
  try {
    const kept = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]') as unknown;
    return Array.isArray(kept) ? kept.filter((one): one is string => typeof one === 'string' && isHex(one)).slice(0, 8) : [];
  } catch {
    return [];
  }
}

function remember(hex: string): void {
  try {
    const next = [hex.toUpperCase(), ...recent().filter((one) => one.toUpperCase() !== hex.toUpperCase())].slice(0, 8);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* A private window: the colour is still used, it is just not remembered. */
  }
}

export default function NeonColour({
  value,
  onChange,
  label,
  t,
  className = '',
  round = false,
  data,
}: {
  readonly value: string;
  readonly onChange: (hex: string) => void;
  /** What is being coloured, said on the button and over the sheet. */
  readonly label: string;
  readonly t: Say;
  readonly className?: string;
  /** A round swatch rather than a square one. */
  readonly round?: boolean;
  /** A data attribute for the swatch, so a walk-through can find it: e.g. "postbehind". */
  readonly data?: string;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [hsl, setHsl] = useState<[number, number, number]>(() => hexHsl(value));
  const [code, setCode] = useState(value.toUpperCase());
  const [kept, setKept] = useState<string[]>([]);
  useEffect(() => {
    if (!open) return;
    setHsl(hexHsl(value));
    setCode(value.toUpperCase());
    setKept(recent());
  }, [open, value]);

  const put = (hex: string, keep = true): void => {
    const up = hex.toUpperCase();
    setCode(up);
    onChange(up);
    if (keep) remember(up);
  };
  const slide = (at: 0 | 1 | 2, v: number): void => {
    const next: [number, number, number] = [...hsl];
    next[at] = v;
    setHsl(next);
    put(hslHex(...next), false);
  };
  const shut = (): void => {
    if (isHex(code)) remember(code);
    setOpen(false);
  };

  const [h, s, l] = hsl;
  const tracks = useMemo(() => ({
    hue: 'linear-gradient(90deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)',
    sat: `linear-gradient(90deg, ${hslHex(h, 0, l)}, ${hslHex(h, 100, l)})`,
    light: `linear-gradient(90deg, #000000, ${hslHex(h, s, 50)}, #ffffff)`,
  }), [h, s, l]);
  const sliderRow = (at: 0 | 1 | 2, name: string, max: number, track: string, now: number): React.ReactElement => (
    <label className="block space-y-1.5" data-neonslider={at}>
      <span className="flex items-center justify-between text-[13px] font-bold text-white" style={{ textShadow: '0 0 8px rgba(34,211,238,0.55)' }}>
        {name}
        <span className="tabular-nums text-cyan-200">{now}</span>
      </span>
      <input
        type="range"
        min={0}
        max={max}
        value={now}
        onChange={(event) => slide(at, Number(event.target.value))}
        aria-label={name}
        data-neontrack
        className="h-11 w-full cursor-pointer appearance-none rounded-full bg-transparent"
        style={{ background: track, height: 14, borderRadius: 999, boxShadow: '0 0 12px rgba(34,211,238,0.35), inset 0 0 0 1px rgba(255,255,255,0.25)' }}
      />
    </label>
  );

  const dot = (hex: string, key: string): React.ReactElement => {
    const on = hex.toUpperCase() === value.toUpperCase();
    return (
      <button
        key={key}
        type="button"
        data-neonswatch={hex}
        aria-label={hex}
        aria-pressed={on}
        onClick={() => put(hex)}
        className="relative grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-90"
        style={{
          background: hex,
          border: on ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.35)',
          boxShadow: `0 0 ${on ? 18 : 10}px ${hex}${on ? 'cc' : '88'}`,
        }}
      >
        {on && <Check className="h-4 w-4" style={{ color: hexHsl(hex)[2] > 60 ? '#000' : '#fff' }} />}
      </button>
    );
  };
  const heading = (words: string): React.ReactElement => (
    <p className="text-[12px] font-black uppercase tracking-[0.14em] text-cyan-200" style={{ textShadow: '0 0 10px rgba(34,211,238,0.7)' }}>{words}</p>
  );

  return (
    <>
      <button
        type="button"
        {...(data ? { [`data-${data}`]: '' } : {})}
        data-neoncolour
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        className={`${round ? 'h-9 w-9 rounded-full' : 'h-11 min-w-[44px] rounded-xl'} shrink-0 transition-transform active:scale-90 ${className}`}
        style={{ background: value, border: '2px solid rgba(255,255,255,0.7)', boxShadow: `0 0 12px ${value}aa, inset 0 0 0 2px rgba(0,0,0,0.35)` }}
      />
      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[120] flex items-end justify-center" data-neonsheet onClick={shut}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[56vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-t-3xl p-4 pb-8"
            style={{
              background: 'rgba(10,14,20,0.42)',
              backdropFilter: 'blur(14px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
              borderTop: '1px solid rgba(34,211,238,0.6)',
              boxShadow: '0 -10px 40px rgba(34,211,238,0.25)',
            }}
          >
            <div className="flex items-center gap-3">
              <span aria-hidden className="h-11 w-11 shrink-0 rounded-2xl" style={{ background: value, boxShadow: `0 0 20px ${value}` }} />
              <p className="min-w-0 flex-1 bg-clip-text text-lg font-black leading-tight text-transparent" style={{ backgroundImage: 'linear-gradient(90deg,#6EE7B7,#22D3EE,#C4B5FD)', filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.5))' }}>
                {label}
              </p>
              <button type="button" data-neondone onClick={shut} aria-label={t('neon.done', 'Done')} className="grid h-11 w-11 place-items-center rounded-full border border-cyan-300/60 bg-cyan-400/15 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.45)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {heading(t('neon.suggested', 'Suggested colours'))}
            <div className="flex flex-wrap gap-2.5">{NEON_SWATCHES.map((hex) => dot(hex, `s-${hex}`))}</div>

            {kept.length > 0 && (
              <>
                {heading(t('neon.recent', 'Used lately'))}
                <div className="flex flex-wrap gap-2.5" data-neonrecent>{kept.map((hex) => dot(hex, `r-${hex}`))}</div>
              </>
            )}

            {heading(t('neon.custom', 'Your own colour'))}
            {sliderRow(0, t('neon.hue', 'Colour'), 360, tracks.hue, h)}
            {sliderRow(1, t('neon.strength', 'Strength'), 100, tracks.sat, s)}
            {sliderRow(2, t('neon.light', 'Light'), 100, tracks.light, l)}
            <label className="flex items-center gap-3">
              <span className="text-[13px] font-bold text-white">{t('neon.code', 'Colour code')}</span>
              <input
                type="text"
                data-neonhex
                value={code}
                maxLength={7}
                spellCheck={false}
                onChange={(event) => {
                  const typed = event.target.value.startsWith('#') ? event.target.value : `#${event.target.value}`;
                  setCode(typed.toUpperCase());
                  if (isHex(typed)) { setHsl(hexHsl(typed)); onChange(typed.toUpperCase()); }
                }}
                className="min-h-[44px] w-32 rounded-xl border border-cyan-300/50 bg-black/30 px-3 font-mono text-sm text-white"
              />
            </label>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
