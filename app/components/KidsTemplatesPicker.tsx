'use client';

/**
 * Visual template picker for the children's room.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"Die kids room het ook baie templates nodig vir
 * 'n kind om net van te kies."*
 *
 * ── Why templates for a child ────────────────────────────────────────────
 *
 * Allows a child to tap one single lively adventure sticker to set both
 * what to sing about (topic) and how it sounds (sound), while updating the
 * mascot and priming the "Make my song" button.
 *
 * ── Safety constraints held ──────────────────────────────────────────────
 *
 *   · No text input or contentEditable: everything is tapped.
 *   · No links or routing: stays locked inside the kids room.
 *   · No grid-cols-3 (held by check:kinderkleur).
 *   · No bg-white classes (held by check:theme).
 */

import React, { useState } from 'react';
import { Sparkles, Check, Wand2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { KID_TEMPLATES, type KidTemplate } from '../lib/kidstemplates';

export default function KidsTemplatesPicker({
  selectedTopic,
  selectedSound,
  onPick,
  disabled = false,
}: {
  readonly selectedTopic: string;
  readonly selectedSound: string;
  readonly onPick: (template: KidTemplate) => void;
  readonly disabled?: boolean;
}): React.ReactElement {
  const { t } = useLang();
  const [filter, setFilter] = useState<'all' | 'adventures' | 'animals' | 'party' | 'calm'>('all');

  const visibleTemplates = filter === 'all'
    ? KID_TEMPLATES
    : KID_TEMPLATES.filter((tpl) => tpl.category === filter);

  return (
    <div className="space-y-4 rounded-3xl border-4 border-surface-200/90 bg-surface-50/95 p-4 sm:p-5 shadow-xl backdrop-blur-sm">
      {/* Header with playful mascot wand */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-surface-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 text-2xl select-none">
            <span aria-hidden>✨</span>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-surface-950">
              {t('kids.templatesTitle', 'Magic Adventure Templates')}
            </h3>
            <p className="text-xs font-bold text-surface-600">
              {t('kids.templatesSub', 'Pick an adventure in one tap to start singing right away!')}
            </p>
          </div>
        </div>

        {/* Quick filter pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
          {(
            [
              ['all', t('kids.filterAll', 'All (14)')],
              ['adventures', t('kids.filterAdventures', '🚀 Adventures')],
              ['animals', t('kids.filterAnimals', '🐶 Animals')],
              ['party', t('kids.filterParty', '🎉 Party')],
              ['calm', t('kids.filterCalm', '🌙 Bedtime')],
            ] as const
          ).map(([catKey, label]) => {
            const active = filter === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setFilter(catKey)}
                disabled={disabled}
                className={`min-h-[36px] rounded-full px-3 py-1 text-xs font-black transition-all ${
                  active
                    ? 'bg-surface-950 text-surface-50 shadow-md scale-105'
                    : 'bg-surface-200/70 text-surface-700 hover:bg-surface-300 hover:text-surface-950'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards container: using flex-wrap and responsive 2-column or 4-column cards (NEVER grid-cols-3) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {visibleTemplates.map((tpl) => {
          const isSelected = selectedTopic === tpl.topic && selectedSound === tpl.sound;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onPick(tpl)}
              disabled={disabled}
              data-kidstemplate={tpl.id}
              aria-pressed={isSelected}
              style={{
                background: `linear-gradient(145deg, ${tpl.from}, ${tpl.to})`,
                color: tpl.ink,
                transform: isSelected ? 'scale(1.04)' : undefined,
                boxShadow: isSelected
                  ? '0 10px 0 rgba(0,0,0,0.22), 0 0 0 4px rgba(255,255,255,0.95), 0 16px 24px -4px rgba(0,0,0,0.25)'
                  : '0 5px 0 rgba(0,0,0,0.14), 0 6px 12px -2px rgba(0,0,0,0.1)',
              }}
              className="relative flex min-h-[118px] flex-col justify-between rounded-3xl p-3.5 text-left transition-all duration-150 disabled:opacity-40 hover:brightness-105 active:scale-95"
            >
              {/* Selected badge in top-right */}
              {isSelected && (
                <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-2 ring-white">
                  <Check className="h-4 w-4 stroke-[3]" />
                </span>
              )}

              {/* Icon & Badge pill */}
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-3xl select-none" aria-hidden>
                  {tpl.icon}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-md"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.18)',
                    color: tpl.ink,
                  }}
                >
                  {t(tpl.badge[0], tpl.badge[1])}
                </span>
              </div>

              {/* Title & subtitle */}
              <div className="mt-2 min-w-0">
                <h4 className="text-xs sm:text-sm font-black leading-tight truncate">
                  {t(tpl.title[0], tpl.title[1])}
                </h4>
                <p className="mt-0.5 text-[11px] font-bold leading-snug line-clamp-2 opacity-90">
                  {t(tpl.sub[0], tpl.sub[1])}
                </p>
              </div>

              {/* Google Veo video ready icon tag */}
              <div className="mt-2 flex items-center gap-1 text-[10px] font-black opacity-85">
                <Wand2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {t('kids.veoReady', 'Google Veo ready')}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
