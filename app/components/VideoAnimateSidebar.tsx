'use client';

/**
 * The video & element animation sidebar.
 *
 * What it offers:
 *   · Custom: 'Create an Animation' (drag elements around canvas)
 *   · General animation presets:
 *     Rise, Pan, Fade, Pop, Wipe, Blur, Succession, Breathe, Baseline,
 *     Drift, Tectonic, Tumble, Neon, Scrapbook, Stomp.
 *   · Add-on effects:
 *     Rotate, Flicker, Pulse, Wiggle.
 */

import React, { useState } from 'react';
import { X, Sparkles, Wand2, Compass, Move, ChevronRight, Check } from 'lucide-react';
import { useLang } from '../lib/i18n';

export type AnimationPresetId =
  | 'rise'
  | 'pan'
  | 'fade'
  | 'pop'
  | 'wipe'
  | 'blur'
  | 'succession'
  | 'breathe'
  | 'baseline'
  | 'drift'
  | 'tectonic'
  | 'tumble'
  | 'neon'
  | 'scrapbook'
  | 'stomp';

export type AddonEffectId = 'rotate' | 'flicker' | 'pulse' | 'wiggle';

interface AnimateSidebarProps {
  readonly activePreset?: AnimationPresetId | null;
  readonly activeAddon?: AddonEffectId | null;
  readonly onSelectPreset: (preset: AnimationPresetId) => void;
  readonly onSelectAddon: (addon: AddonEffectId) => void;
  readonly onCustomAnimation?: () => void;
  readonly onClose: () => void;
}

export default function VideoAnimateSidebar({
  activePreset,
  activeAddon,
  onSelectPreset,
  onSelectAddon,
  onCustomAnimation,
  onClose,
}: AnimateSidebarProps): React.ReactElement {
  const { t } = useLang();
  const [hovered, setHovered] = useState<string | null>(null);

  const GENERAL_PRESETS: readonly {
    readonly id: AnimationPresetId;
    readonly nameKey: string;
    readonly nameFallback: string;
    readonly iconSvg: React.ReactNode;
  }[] = [
    {
      id: 'rise',
      nameKey: 'animate.rise',
      nameFallback: 'Rise',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <rect x="8" y="16" width="16" height="16" rx="3" fill="#a855f7" />
          <path d="M30 26V14M27 17l3-3 3 3" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'pan',
      nameKey: 'animate.pan',
      nameFallback: 'Pan',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <rect x="8" y="12" width="16" height="16" rx="3" fill="#a855f7" />
          <path d="M26 28h8M31 25l3 3-3 3" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'fade',
      nameKey: 'animate.fade',
      nameFallback: 'Fade',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <rect x="12" y="12" width="16" height="16" rx="3" fill="#a855f7" fillOpacity="0.4" />
          <rect x="12" y="12" width="16" height="16" rx="3" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
      ),
    },
    {
      id: 'pop',
      nameKey: 'animate.pop',
      nameFallback: 'Pop',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <rect x="13" y="13" width="14" height="14" rx="3" fill="#a855f7" />
          <path d="M8 20h3M29 20h3M20 8v3M20 29v3" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'wipe',
      nameKey: 'animate.wipe',
      nameFallback: 'Wipe',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <rect x="10" y="12" width="10" height="16" rx="2" fill="#a855f7" />
          <rect x="20" y="12" width="10" height="16" rx="2" fill="#a855f7" fillOpacity="0.25" />
        </svg>
      ),
    },
    {
      id: 'blur',
      nameKey: 'animate.blur',
      nameFallback: 'Blur',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <circle cx="20" cy="20" r="10" fill="#a855f7" filter="blur(2px)" />
        </svg>
      ),
    },
    {
      id: 'succession',
      nameKey: 'animate.succession',
      nameFallback: 'Succession',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <rect x="8" y="10" width="8" height="20" rx="1.5" fill="#a855f7" fillOpacity="0.3" />
          <rect x="16" y="10" width="8" height="20" rx="1.5" fill="#a855f7" fillOpacity="0.6" />
          <rect x="24" y="10" width="8" height="20" rx="1.5" fill="#a855f7" />
        </svg>
      ),
    },
    {
      id: 'breathe',
      nameKey: 'animate.breathe',
      nameFallback: 'Breathe',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <rect x="14" y="14" width="12" height="12" rx="2" fill="#a855f7" />
          <path d="M10 10l-2-2M30 10l2-2M10 30l-2 2M30 30l2 2" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'baseline',
      nameKey: 'animate.baseline',
      nameFallback: 'Baseline',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <path d="M8 32h24" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
          <rect x="14" y="14" width="12" height="14" rx="2" fill="#a855f7" />
        </svg>
      ),
    },
    {
      id: 'drift',
      nameKey: 'animate.drift',
      nameFallback: 'Drift',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <rect x="12" y="14" width="14" height="14" rx="3" fill="#a855f7" transform="rotate(-6 19 21)" />
          <path d="M28 16c2 1 3 3 2 5" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'tectonic',
      nameKey: 'animate.tectonic',
      nameFallback: 'Tectonic',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <rect x="8" y="11" width="12" height="18" rx="2" fill="#a855f7" />
          <rect x="20" y="15" width="12" height="18" rx="2" fill="#9333ea" />
        </svg>
      ),
    },
    {
      id: 'tumble',
      nameKey: 'animate.tumble',
      nameFallback: 'Tumble',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <rect x="14" y="14" width="14" height="14" rx="2" fill="#a855f7" transform="rotate(22 21 21)" />
          <path d="M28 10a12 12 0 0 1 4 8" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
        </svg>
      ),
    },
    {
      id: 'neon',
      nameKey: 'animate.neon',
      nameFallback: 'Neon',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <rect x="13" y="13" width="14" height="14" rx="3" fill="#c084fc" />
          <rect x="10" y="10" width="20" height="20" rx="5" stroke="#e879f9" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="1.5" fill="#f43f5e" />
          <circle cx="32" cy="32" r="1.5" fill="#f43f5e" />
        </svg>
      ),
    },
    {
      id: 'scrapbook',
      nameKey: 'animate.scrapbook',
      nameFallback: 'Scrapbook',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <rect x="9" y="12" width="14" height="16" rx="2" fill="#a855f7" fillOpacity="0.4" transform="rotate(-10 16 20)" />
          <rect x="17" y="12" width="14" height="16" rx="2" fill="#a855f7" transform="rotate(8 24 20)" />
        </svg>
      ),
    },
    {
      id: 'stomp',
      nameKey: 'animate.stomp',
      nameFallback: 'Stomp',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <rect x="14" y="14" width="12" height="12" rx="2" fill="#a855f7" />
          <rect x="10" y="10" width="20" height="20" rx="4" stroke="#c084fc" strokeWidth="1" strokeDasharray="2 2" />
          <path d="M8 8l3 3M32 8l-3 3M8 32l3-3M32 32l-3-3" stroke="#e879f9" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  const ADDON_EFFECTS: readonly {
    readonly id: AddonEffectId;
    readonly nameKey: string;
    readonly nameFallback: string;
    readonly iconSvg: React.ReactNode;
  }[] = [
    {
      id: 'rotate',
      nameKey: 'animate.rotate',
      nameFallback: 'Rotate',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <circle cx="20" cy="20" r="8" fill="#a855f7" />
          <path d="M12 12a12 12 0 0 1 16 0M28 28a12 12 0 0 1-16 0" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M28 8v4h-4M12 32v-4h4" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'flicker',
      nameKey: 'animate.flicker',
      nameFallback: 'Flicker',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <circle cx="20" cy="20" r="9" fill="#a855f7" />
          <path d="M17 11v18M20 11v18M23 11v18" stroke="#3b0764" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      id: 'pulse',
      nameKey: 'animate.pulse',
      nameFallback: 'Pulse',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <circle cx="20" cy="20" r="6" fill="#a855f7" />
          <circle cx="20" cy="20" r="10" stroke="#c084fc" strokeWidth="1" strokeDasharray="2 2" />
          <path d="M10 10l-2-2M30 10l2-2M10 30l-2 2M30 30l2 2" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'wiggle',
      nameKey: 'animate.wiggle',
      nameFallback: 'Wiggle',
      iconSvg: (
        <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
          <circle cx="20" cy="20" r="8" fill="#a855f7" />
          <path d="M10 25c1-1 2-1 3 0s2 1 3 0M24 15c1-1 2-1 3 0s2 1 3 0" stroke="#c084fc" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      aria-label={t('animate.title', 'Animate')}
      className="flex h-full w-80 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl z-20"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3.5">
        <h2 className="text-sm font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          {t('animate.title', 'Animate')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close', 'Close')}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Custom Animation Section */}
        <div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
            {t('animate.custom', 'Custom')}
          </span>
          <button
            type="button"
            onClick={onCustomAnimation}
            className="group relative flex w-full items-center gap-3.5 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-3.5 text-left transition-all hover:border-purple-500/60 hover:bg-purple-900/30"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-inner">
              <Compass className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-purple-200 group-hover:text-purple-100">
                {t('animate.create', 'Create an Animation')}
              </h3>
              <p className="text-[11px] leading-tight text-zinc-400 mt-0.5">
                {t('animate.createSub', 'Drag elements around the canvas to create your own animations')}
              </p>
            </div>
          </button>
        </div>

        {/* General Animation Presets */}
        <div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2.5">
            {t('animate.general', 'General')}
          </span>
          <div className="grid grid-cols-3 gap-2.5">
            {GENERAL_PRESETS.map((preset) => {
              const isSelected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  onMouseEnter={() => setHovered(preset.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`group relative flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all text-center ${
                    isSelected
                      ? 'border-purple-500 bg-purple-950/40 text-purple-200 shadow-md shadow-purple-500/10'
                      : 'border-zinc-800/80 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center transition-transform group-hover:scale-110">
                    {preset.iconSvg}
                  </div>
                  <span className="mt-1.5 text-[11px] font-medium leading-none truncate max-w-full">
                    {t(preset.nameKey, preset.nameFallback)}
                  </span>
                  {isSelected && (
                    <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-purple-500 text-[9px] text-white">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add-on Effects */}
        <div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2.5">
            {t('animate.addons', 'Add-on effects')}
          </span>
          <div className="grid grid-cols-3 gap-2.5">
            {ADDON_EFFECTS.map((addon) => {
              const isSelected = activeAddon === addon.id;
              return (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() => onSelectAddon(addon.id)}
                  className={`group relative flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all text-center ${
                    isSelected
                      ? 'border-purple-500 bg-purple-950/40 text-purple-200 shadow-md shadow-purple-500/10'
                      : 'border-zinc-800/80 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center transition-transform group-hover:scale-110">
                    {addon.iconSvg}
                  </div>
                  <span className="mt-1.5 text-[11px] font-medium leading-none truncate max-w-full">
                    {t(addon.nameKey, addon.nameFallback)}
                  </span>
                  {isSelected && (
                    <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-purple-500 text-[9px] text-white">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
