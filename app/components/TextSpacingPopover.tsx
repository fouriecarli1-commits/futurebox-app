'use client';

/**
 * Typography spacing & alignment popover for FutureBox Studio.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"Daar is goed wat ek voel die video en photo
 * editor nog nodig het... letter spacing, line spacing, anchor text box...
 * soos by alle video en photo editors."*
 */

import React from 'react';
import {
  AlignLeft, AlignCenter, AlignRight, ArrowUpToLine, ArrowDownToLine,
  ChevronsUpDown, Sparkles, X,
} from 'lucide-react';
import { useLang } from '../lib/i18n';

export interface TextTypographyProps {
  readonly letterSpacing: number;
  readonly lineSpacing: number;
  readonly anchor: 'top' | 'middle' | 'bottom';
  readonly align: 'left' | 'center' | 'right';
  readonly effect?: 'none' | 'shadow' | 'glow' | 'outline' | 'neon';
  readonly onChangeLetterSpacing: (val: number) => void;
  readonly onChangeLineSpacing: (val: number) => void;
  readonly onChangeAnchor: (anchor: 'top' | 'middle' | 'bottom') => void;
  readonly onChangeAlign: (align: 'left' | 'center' | 'right') => void;
  readonly onChangeEffect?: (effect: 'none' | 'shadow' | 'glow' | 'outline' | 'neon') => void;
  readonly onClose: () => void;
}

export default function TextSpacingPopover({
  letterSpacing,
  lineSpacing,
  anchor,
  align,
  effect = 'none',
  onChangeLetterSpacing,
  onChangeLineSpacing,
  onChangeAnchor,
  onChangeAlign,
  onChangeEffect,
  onClose,
}: TextTypographyProps): React.ReactElement {
  const { t } = useLang();

  return (
    <div className="absolute z-40 w-72 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl text-zinc-100 backdrop-blur-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
          {t('typo.spacingTitle', 'Spacing & Layout')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Letter spacing slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
          <span>{t('typo.letterSpacing', 'Letter spacing')}</span>
          <span className="font-mono text-emerald-400">{Math.round(letterSpacing * 100)}</span>
        </div>
        <input
          type="range"
          min="-10"
          max="80"
          step="1"
          value={Math.round(letterSpacing * 100)}
          onChange={(e) => onChangeLetterSpacing(Number(e.target.value) / 100)}
          className="w-full accent-emerald-500 cursor-pointer"
        />
      </div>

      {/* Line spacing slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
          <span>{t('typo.lineSpacing', 'Line spacing')}</span>
          <span className="font-mono text-emerald-400">{lineSpacing.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0.8"
          max="2.5"
          step="0.1"
          value={lineSpacing}
          onChange={(e) => onChangeLineSpacing(Number(e.target.value))}
          className="w-full accent-emerald-500 cursor-pointer"
        />
      </div>

      {/* Alignment */}
      <div className="space-y-1.5">
        <span className="block text-xs font-bold text-zinc-400">
          {t('typo.align', 'Alignment')}
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onChangeAlign('left')}
            className={`flex items-center justify-center rounded-xl p-2 text-xs font-bold transition-all ${
              align === 'left'
                ? 'border border-emerald-400 bg-emerald-500/20 text-emerald-300'
                : 'border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onChangeAlign('center')}
            className={`flex items-center justify-center rounded-xl p-2 text-xs font-bold transition-all ${
              align === 'center'
                ? 'border border-emerald-400 bg-emerald-500/20 text-emerald-300'
                : 'border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onChangeAlign('right')}
            className={`flex items-center justify-center rounded-xl p-2 text-xs font-bold transition-all ${
              align === 'right'
                ? 'border border-emerald-400 bg-emerald-500/20 text-emerald-300'
                : 'border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlignRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Anchor Text Box */}
      <div className="space-y-1.5">
        <span className="block text-xs font-bold text-zinc-400">
          {t('typo.anchor', 'Anchor text box')}
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onChangeAnchor('top')}
            className={`flex items-center justify-center gap-1 rounded-xl p-2 text-xs font-bold transition-all ${
              anchor === 'top'
                ? 'border border-emerald-400 bg-emerald-500/20 text-emerald-300'
                : 'border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowUpToLine className="h-4 w-4" />
            <span>{t('typo.anchorTop', 'Top')}</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeAnchor('middle')}
            className={`flex items-center justify-center gap-1 rounded-xl p-2 text-xs font-bold transition-all ${
              anchor === 'middle'
                ? 'border border-emerald-400 bg-emerald-500/20 text-emerald-300'
                : 'border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ChevronsUpDown className="h-4 w-4" />
            <span>{t('typo.anchorMid', 'Mid')}</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeAnchor('bottom')}
            className={`flex items-center justify-center gap-1 rounded-xl p-2 text-xs font-bold transition-all ${
              anchor === 'bottom'
                ? 'border border-emerald-400 bg-emerald-500/20 text-emerald-300'
                : 'border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowDownToLine className="h-4 w-4" />
            <span>{t('typo.anchorBot', 'Bot')}</span>
          </button>
        </div>
      </div>

      {/* Text Effects */}
      {onChangeEffect && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-800">
          <span className="block text-xs font-bold text-zinc-400">
            {t('typo.effects', 'Text effects')}
          </span>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ['none', t('typo.none', 'Plain')],
                ['shadow', t('typo.shadow', 'Shadow')],
                ['glow', t('typo.glow', 'Glow')],
                ['neon', t('typo.neon', 'Neon')],
                ['outline', t('typo.outline', 'Stroke')],
              ] as const
            ).map(([effKey, label]) => (
              <button
                key={effKey}
                type="button"
                onClick={() => onChangeEffect(effKey)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                  effect === effKey
                    ? 'border border-emerald-400 bg-emerald-500/20 text-emerald-300'
                    : 'border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
