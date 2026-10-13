'use client';

/**
 * Era Templates & Google AI photo insertion suggestions.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"en by photo editor, templates van verskillende eras,
 * en voorstelle waarin mense hulle eie foto's in edit, of in sit deur google se
 * AI engine. AS mens kyk na nano banana, en veo ens. is daar templates wat help
 * om keuses te maak. Ek wil dit in die app integrate op 'n moderne stylish
 * manier vir kliente om van te kies."*
 */

import React, { useState } from 'react';
import { Sparkles, Copy, Check, Disc, Zap, Radio, Disc3, Shield, Compass, Camera } from 'lucide-react';
import { ERA_TEMPLATES, type EraTemplate } from '../lib/eratemplates';
import type { Look } from '../lib/postlook';
import { useLang } from '../lib/i18n';

const ICONS: Record<string, React.ReactElement> = {
  'era-70s': <Disc className="h-4 w-4 text-amber-400" />,
  'era-80s': <Zap className="h-4 w-4 text-pink-400" />,
  'era-90s': <Radio className="h-4 w-4 text-zinc-300" />,
  'era-2000s': <Disc3 className="h-4 w-4 text-cyan-400" />,
  'era-modern': <Shield className="h-4 w-4 text-emerald-400" />,
  'era-afro': <Compass className="h-4 w-4 text-yellow-400" />,
};

export default function EraTemplatesPicker({
  onApplyEra,
}: {
  onApplyEra: (look: Partial<Look>, size: string) => void;
}): React.ReactElement {
  const { lang, t } = useLang();
  const [chosen, setChosen] = useState<string>(ERA_TEMPLATES[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selected = ERA_TEMPLATES.find((one) => one.id === chosen) ?? ERA_TEMPLATES[0];

  const handleCopyPrompt = async (template: EraTemplate) => {
    const promptText = lang === 'af' ? template.aiPrompt[1] : template.aiPrompt[1];
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // Clipboard fallback
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight text-white">
              {t('era.pickerTitle', 'Templates & Eras')}
            </h3>
            <p className="text-[11px] text-zinc-400">
              {t('era.pickerSub', 'Start from a historic era or copy a Google AI prompt for your own photo.')}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>{t('era.googleAiEngine', 'Google AI Engine (Nano Banana / Gemini)')}</span>
        </div>
      </div>

      {/* Era Selection Carousel / Chips */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ERA_TEMPLATES.map((era) => {
          const isChosen = era.id === chosen;
          return (
            <button
              key={era.id}
              type="button"
              onClick={() => setChosen(era.id)}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 text-left transition-all ${
                isChosen
                  ? 'border-amber-400/80 bg-zinc-900 shadow-md ring-1 ring-amber-400/50'
                  : 'border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-white">
                  {ICONS[era.id]}
                  <span>{era.era}</span>
                </span>
                <span className="rounded-md border border-zinc-700/60 bg-zinc-800/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-300">
                  {t(era.badge[0], era.badge[1])}
                </span>
              </div>

              <div className="pt-2">
                <span className="block text-xs font-bold leading-snug text-zinc-200 group-hover:text-amber-300">
                  {t(era.name[0], era.name[1])}
                </span>
              </div>

              {/* Palette dots */}
              <div className="mt-2.5 flex items-center gap-1">
                {era.palette.map((c, i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full border border-black/30"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Era Detail & Google AI Prompt Showcase */}
      <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/70 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">{t(selected.name[0], selected.name[1])}</span>
              <span className="text-xs font-semibold text-zinc-400">· {selected.era}</span>
            </div>
            <p className="pt-1 text-xs leading-relaxed text-zinc-300">
              {t(selected.what[0], selected.what[1])}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onApplyEra(selected.look, selected.size)}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-emerald-300 transition-all hover:border-emerald-400 hover:bg-emerald-500/30"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>{t('era.applyLook', 'Apply Era to Photo')}</span>
          </button>
        </div>

        {/* Google AI Prompt Suggestion Box */}
        <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-950/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>{t('era.insertYourPhoto', 'How to edit your photo in with Google AI:')}</span>
            </span>

            <button
              type="button"
              onClick={() => handleCopyPrompt(selected)}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-200 transition-all hover:bg-amber-500/30"
            >
              {copiedId === selected.id ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">{t('era.promptCopied', 'Prompt copied for Google AI!')}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>{t('era.copyPrompt', 'Copy Google AI Prompt')}</span>
                </>
              )}
            </button>
          </div>

          <p className="mt-2 font-mono text-[11px] leading-relaxed text-zinc-300 select-all rounded bg-zinc-950/80 p-2.5 border border-zinc-800">
            {selected.aiPrompt[1]}
          </p>

          <p className="mt-2 text-[10px] text-zinc-400">
            {t('era.insertStep', '1. Copy prompt · 2. Insert your photo into Google AI Studio · 3. Download and place right here')}
          </p>
        </div>
      </div>
    </div>
  );
}
