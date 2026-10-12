'use client';

/**
 * Canvas Size & Custom Resizer Modal for FutureBox Studio (Photos & Videos).
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli: *"En foto's en video's moet 'n plek hê waar jy die standaard sizes
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
  const [width, setWidth] = useState<number>(currentWidth || 1080);
  const [height, setHeight] = useState<number>(currentHeight || 1080);
  const [lockRatio, setLockRatio] = useState<boolean>(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const initialRatio = (currentWidth || 1080) / (currentHeight || 1080);

  const handleWidthChange = (val: number) => {
    const w = Math.max(100, Math.min(8000, val));
    setWidth(w);
    setSelectedPresetId(null);
    if (lockRatio) {
      setHeight(Math.round(w / initialRatio));
    }
  };

  const handleHeightChange = (val: number) => {
    const h = Math.max(100, Math.min(8000, val));
    setHeight(h);
    setSelectedPresetId(null);
    if (lockRatio) {
      setWidth(Math.round(h * initialRatio));
    }
  };

  const handleSelectPreset = (preset: StandardSizePreset) => {
    setSelectedPresetId(preset.id);
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const handleApply = () => {
    const activePreset = STANDARD_SIZES.find((s) => s.id === selectedPresetId);
    const label = activePreset
      ? (lang === 'af' ? activePreset.nameAf : activePreset.nameEn)
      : `${width}×${height}px`;
    onApplySize(width, height, label);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('size.modalTitle', 'Kies Doekgrootte')}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md"
    >
      <div className="relative flex h-full max-h-[90dvh] w-full max-w-xl flex-col rounded-3xl border border-zinc-700/80 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-zinc-800/80 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
              <Maximize2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-zinc-100">
                {t('size.modalTitle', 'Kies Doekgrootte')}
              </h3>
              <p className="text-xs text-zinc-400">
                {t('size.modalSub', 'Kies standaard afmetings vir sosiaal en video, of tik jou eie pasgemaakte grootte in.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('size.close', 'Maak toe')}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors"
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
                {t('size.customLabel', 'Pasgemaakte Grootte (Custom Size)')}
              </span>
              <button
                type="button"
                onClick={() => setLockRatio(!lockRatio)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  lockRatio
                    ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
                }`}
              >
                {lockRatio ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                {lockRatio ? t('size.locked', 'Sluit verhouding') : t('size.unlocked', 'Vrye skaal')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  {t('size.width', 'Breedte (px)')}
                </label>
                <input
                  type="number"
                  min="100"
                  max="8000"
                  value={width}
                  onChange={(e) => handleWidthChange(parseInt(e.target.value, 10) || 1080)}
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2 text-sm font-mono text-zinc-100 focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  {t('size.height', 'Hoogte (px)')}
                </label>
                <input
                  type="number"
                  min="100"
                  max="8000"
                  value={height}
                  onChange={(e) => handleHeightChange(parseInt(e.target.value, 10) || 1080)}
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2 text-sm font-mono text-zinc-100 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick scale multiplier buttons */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-zinc-500 font-semibold">{t('size.scalePreset', 'Skaal:')}</span>
              {[
                { label: '0.5×', mult: 0.5 },
                { label: '1× HD', mult: 1 },
                { label: '2× 2K', mult: 2 },
                { label: '4× 4K', mult: 4 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setWidth((w) => Math.round(w * p.mult));
                    setHeight((h) => Math.round(h * p.mult));
                  }}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-zinc-800"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Standard Sizes Presets */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block pb-2.5">
              {t('size.standardPresets', 'Standaard Groottes')}
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
                    {isSelected && <Check className="h-4 w-4 text-amber-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-950">
          <div className="text-xs text-zinc-400">
            {t('size.selected', 'Gekies:')} <span className="font-mono font-bold text-zinc-200">{width} × {height} px</span>
          </div>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-black text-black hover:bg-amber-400 shadow-lg active:scale-95 transition-all"
          >
            <Check className="h-4 w-4 stroke-[3]" />
            {t('size.apply', 'Pas Grootte Toe')}
          </button>
        </div>
      </div>
    </div>
  );
}
