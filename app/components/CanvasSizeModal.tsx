'use client';

/**
 * Canvas Size & Custom Resizer Modal for FutureBox Studio (Photos & Videos).
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner: *"En foto's en video's moet 'n plek hê waar jy die standaard sizes
 * kan kies, asook custom sizes. Met export moet mens die kwaliteit van export
 * kies, en daardie verstellings moet alles krediete kos. Ek werk so standaard
 * op 5 krediete."*
 */

import React, { useState } from 'react';
import {
  X, Check, Lock, Unlock, Maximize2, Smartphone, Monitor, Square,
  Image as ImageIcon, Presentation, FileText, Music, Sparkles,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';

export interface StandardSizePreset {
  readonly id: string;
  readonly nameKey: string;
  readonly nameEn: string;
  readonly nameAf: string;
  readonly width: number;
  readonly height: number;
  readonly ratioLabel: string;
  readonly category: 'social' | 'video' | 'print' | 'banner';
}

export const STANDARD_SIZES: readonly StandardSizePreset[] = [
  {
    id: 'ig_post',
    nameKey: 'size.igPost',
    nameEn: 'Instagram Post',
    nameAf: 'Instagram Plasing',
    width: 1080,
    height: 1080,
    ratioLabel: '1:1',
    category: 'social',
  },
  {
    id: 'ig_story',
    nameKey: 'size.igStory',
    nameEn: 'Instagram Story / Reel',
    nameAf: 'Instagram Storie / Reel',
    width: 1080,
    height: 1920,
    ratioLabel: '9:16',
    category: 'social',
  },
  {
    id: 'yt_video',
    nameKey: 'size.ytVideo',
    nameEn: 'YouTube / Landscape Video',
    nameAf: 'YouTube / Landskap Video',
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    category: 'video',
  },
  {
    id: 'fb_post',
    nameKey: 'size.fbPost',
    nameEn: 'Facebook Post',
    nameAf: 'Facebook Plasing',
    width: 1200,
    height: 630,
    ratioLabel: '1.91:1',
    category: 'social',
  },
  {
    id: 'poster',
    nameKey: 'size.poster',
    nameEn: 'Poster (A4 Print)',
    nameAf: 'Plakkaat (A4 Drukwerk)',
    width: 1080,
    height: 1528,
    ratioLabel: '3:4',
    category: 'print',
  },
  {
    id: 'flyer',
    nameKey: 'size.flyer',
    nameEn: 'Flyer / Event',
    nameAf: 'Pamflet / Geleentheid',
    width: 1080,
    height: 1440,
    ratioLabel: '3:4',
    category: 'print',
  },
  {
    id: 'presentation',
    nameKey: 'size.presentation',
    nameEn: 'Presentation / Pitch Deck',
    nameAf: 'Aanbieding / Pitch Deck',
    width: 1920,
    height: 1080,
    ratioLabel: '16:9',
    category: 'video',
  },
  {
    id: 'album_cover',
    nameKey: 'size.albumCover',
    nameEn: 'Album Cover (Square HD)',
    nameAf: 'Album Omslag (Vierkant HD)',
    width: 1400,
    height: 1400,
    ratioLabel: '1:1',
    category: 'social',
  },
  {
    id: 'banner',
    nameKey: 'size.banner',
    nameEn: 'Web Banner / Header',
    nameAf: 'Web Banier / Hofie',
    width: 1200,
    height: 400,
    ratioLabel: '3:1',
    category: 'banner',
  },
];

/** The smallest and largest side a canvas may be given here. */
const SIDE_LEAST = 100;
const SIDE_MOST = 8000;

export default function CanvasSizeModal({
  currentWidth,
  currentHeight,
  onApplySize,
  onClose,
}: {
  readonly currentWidth: number;
  readonly currentHeight: number;
  readonly onApplySize: (width: number, height: number, label: string) => void;
  readonly onClose: () => void;
}): React.ReactElement {
  const { t, lang } = useLang();
  /* A layer, so Back closes this and not the room under it. */
  useBackLayer(true, onClose);
  const [width, setWidth] = useState<number>(currentWidth || 1080);
  const [height, setHeight] = useState<number>(currentHeight || 1080);
  /* What is in the two boxes while somebody types, kept apart from the size.
     Clamped on every keystroke, typing "1920" went 1 → 100 → 190 → 1920 and
     the locked side jumped about under each digit, and clearing a box to
     type afresh put 1080 straight back in it. The number is only taken —
     and held between 100 and 8000 — when the box is left or Apply is
     pressed. */
  const [wideText, setWideText] = useState<string>(String(currentWidth || 1080));
  const [tallText, setTallText] = useState<string>(String(currentHeight || 1080));
  const [lockRatio, setLockRatio] = useState<boolean>(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  /* The shape the lock holds: the size this was opened at, then whatever
     preset is picked or whatever the size was when the lock went on —
     never the shape the canvas happened to have when the dialog opened. */
  const [ratio, setRatio] = useState<number>((currentWidth || 1080) / (currentHeight || 1080));

  const clampSide = (val: number): number =>
    Math.max(SIDE_LEAST, Math.min(SIDE_MOST, Math.round(Number.isFinite(val) ? val : 1080)));

  /** Both sides at once, the boxes showing what was kept. */
  const setBoth = (w: number, h: number): void => {
    setWidth(w);
    setHeight(h);
    setWideText(String(w));
    setTallText(String(h));
  };

  /** A side taken from its box, with the other following when locked. */
  const takeWidth = (raw: string): { w: number; h: number } => {
    const w = clampSide(parseInt(raw, 10));
    const h = lockRatio ? clampSide(w / ratio) : height;
    setBoth(w, h);
    if (w !== width || h !== height) setSelectedPresetId(null);
    return { w, h };
  };
  const takeHeight = (raw: string): { w: number; h: number } => {
    const h = clampSide(parseInt(raw, 10));
    const w = lockRatio ? clampSide(h * ratio) : width;
    setBoth(w, h);
    if (w !== width || h !== height) setSelectedPresetId(null);
    return { w, h };
  };

  const handleSelectPreset = (preset: StandardSizePreset) => {
    setSelectedPresetId(preset.id);
    setBoth(preset.width, preset.height);
    setRatio(preset.width / preset.height);
  };

  /* ×0.5 to ×4, scaled about the shape and stopped at the limits as a
     whole, so 4× on a 2400-wide picture is 8000 wide with the height
     following — not 8000 by whatever the height became on its own. */
  const scaleBy = (mult: number): void => {
    const most = Math.min(mult, SIDE_MOST / Math.max(width, height));
    const by = Math.max(most, SIDE_LEAST / Math.min(width, height));
    setBoth(clampSide(width * by), clampSide(height * by));
    setSelectedPresetId(null);
  };

  const handleApply = () => {
    /* Whatever is still in the boxes, taken as if they had been left. */
    let w = width;
    let h = height;
    if (wideText !== String(width)) ({ w, h } = takeWidth(wideText));
    else if (tallText !== String(height)) ({ w, h } = takeHeight(tallText));
    const activePreset = STANDARD_SIZES.find((s) => s.id === selectedPresetId);
    const label = activePreset && activePreset.width === w && activePreset.height === h
      ? (lang === 'af' ? activePreset.nameAf : activePreset.nameEn)
      : `${w}×${h}px`;
    onApplySize(w, h, label);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('size.modalTitle', 'Canvas Size & Dimensions')}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-scrim backdrop-blur-md"
      /* Below the tab bar, so the strip stays reachable — the rule every
         overlay under z-50 keeps; `check:belowtabs` holds it by name. */
      style={{ paddingBottom: barClearance(16) }}
    >
      <div className="relative flex h-full max-h-[90dvh] w-full max-w-xl flex-col rounded-3xl border border-zinc-700/80 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
              <Maximize2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-zinc-100">
                {t('size.modalTitle', 'Canvas Size & Dimensions')}
              </h3>
              <p className="text-xs text-zinc-400">
                {t('size.modalSub', 'Pick standard sizes for social media and video, or set custom dimensions.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('size.close', 'Close canvas size picker')}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* Custom Size Form */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                {t('size.customLabel', 'Custom Size')}
              </span>
              <button
                type="button"
                onClick={() => {
                  /* Locking holds the shape it is NOW. */
                  if (!lockRatio) setRatio(width / height);
                  setLockRatio(!lockRatio);
                }}
                aria-pressed={lockRatio}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  lockRatio
                    ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                {lockRatio ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                {lockRatio ? t('size.locked', 'Lock aspect ratio') : t('size.unlocked', 'Unlock aspect ratio')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  {t('size.width', 'Width (px)')}
                </label>
                <input
                  type="number"
                  min="100"
                  max="8000"
                  inputMode="numeric"
                  value={wideText}
                  onChange={(e) => setWideText(e.target.value)}
                  onBlur={(e) => { takeWidth(e.target.value); }}
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2 text-sm font-mono text-zinc-100 focus:border-amber-400 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  {t('size.height', 'Height (px)')}
                </label>
                <input
                  type="number"
                  min="100"
                  max="8000"
                  inputMode="numeric"
                  value={tallText}
                  onChange={(e) => setTallText(e.target.value)}
                  onBlur={(e) => { takeHeight(e.target.value); }}
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2 text-sm font-mono text-zinc-100 focus:border-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Quick scale multiplier buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-zinc-500 font-semibold">{t('size.scalePreset', 'Quick Scale')}</span>
              {[
                { label: '0.5×', mult: 0.5 },
                { label: '1× HD', mult: 1 },
                { label: '2× 2K', mult: 2 },
                { label: '4× 4K', mult: 4 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => scaleBy(p.mult)}
                  className="min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-zinc-800"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Standard Sizes Presets */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block pb-2.5">
              {t('size.standardPresets', 'Standard Sizes')}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STANDARD_SIZES.map((preset) => {
                const isSelected = selectedPresetId === preset.id || (width === preset.width && height === preset.height);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all group ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/15 shadow-md ring-1 ring-amber-400/40'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/80 text-zinc-300 group-hover:text-amber-300">
                        {preset.ratioLabel === '1:1' ? (
                          <Square className="h-4 w-4" />
                        ) : preset.ratioLabel === '9:16' ? (
                          <Smartphone className="h-4 w-4" />
                        ) : preset.ratioLabel === '16:9' ? (
                          <Monitor className="h-4 w-4" />
                        ) : (
                          <ImageIcon className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-100 group-hover:text-amber-200">
                          {lang === 'af' ? preset.nameAf : preset.nameEn}
                        </h4>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          {preset.width} × {preset.height} px ({preset.ratioLabel})
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-950">
          <div className="text-xs text-zinc-400">
            {t('size.selected', 'Selected')} <span className="font-mono font-bold text-zinc-200">{width} × {height} px</span>
          </div>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-black text-black hover:bg-amber-400 shadow-lg active:scale-95 transition-all"
          >
            <Check className="h-4 w-4 stroke-[3]" />
            {t('size.apply', 'Apply Size')}
          </button>
        </div>
      </div>
    </div>
  );
}
