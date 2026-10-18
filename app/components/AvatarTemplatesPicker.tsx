'use client';

/**
 * Podcast Avatar Templates & Google AI persona generation suggestions.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner, 11 October 2026: *"By podcasts, ook templates van avatars...
 * AS mens kyk na nano banana, en veo ens. is daar templates wat help om keuses
 * te maak. Ek wil dit in die app integrate op 'n moderne stylish manier vir
 * kliente om van te kies."*
 */

import React, { useState } from 'react';
import {
  Mic,
  Headphones,
  Radio,
  Sparkles,
  Tv,
  Flame,
  Copy,
  Check,
  UserCheck,
} from 'lucide-react';
import { AVATAR_TEMPLATES, type AvatarTemplate } from '../lib/avatartemplates';
import { useLang } from '../lib/i18n';

const AVATAR_ICONS: Record<string, React.ReactElement> = {
  'avatar-anchor': <Tv className="h-4 w-4 text-blue-400" />,
  'avatar-tech': <Headphones className="h-4 w-4 text-cyan-400" />,
  'avatar-storyteller': <Radio className="h-4 w-4 text-amber-400" />,
  'avatar-creator': <Mic className="h-4 w-4 text-emerald-400" />,
  'avatar-latenight': <Sparkles className="h-4 w-4 text-purple-400" />,
  'avatar-afrofuturist': <Flame className="h-4 w-4 text-yellow-400" />,
};

export default function AvatarTemplatesPicker({
  onSelectAvatar,
  currentId,
}: {
  onSelectAvatar?: (template: AvatarTemplate) => void;
  currentId?: string;
}): React.ReactElement {
  const { lang, t } = useLang();
  const [chosen, setChosen] = useState<string>(currentId ?? AVATAR_TEMPLATES[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selected = AVATAR_TEMPLATES.find((one) => one.id === chosen) ?? AVATAR_TEMPLATES[0];

  const handleCopyPrompt = async (template: AvatarTemplate) => {
    const promptText = lang === 'af' ? template.aiPrompt[1] : template.aiPrompt[1];
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // Clipboard fallback
    }
  };

  const handleChoose = (template: AvatarTemplate) => {
    setChosen(template.id);
    onSelectAvatar?.(template);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
            <Mic className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight text-zinc-100">
              {t('avatar.title', 'Podcast Avatar Templates')}
            </h3>
            <p className="text-[11px] text-zinc-400">
              {t('avatar.sub', 'Choose a stylish host persona or generate one with Google AI.')}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Google AI (Nano Banana)</span>
        </div>
      </div>

      {/* Grid of Avatars */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {AVATAR_TEMPLATES.map((avatar) => {
          const isChosen = avatar.id === chosen;
          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => handleChoose(avatar)}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 text-left transition-all ${
                isChosen
                  ? 'border-blue-400/80 bg-zinc-900 shadow-md ring-1 ring-blue-400/50'
                  : 'border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1.5 text-xs font-black text-zinc-100">
                  {AVATAR_ICONS[avatar.id]}
                  <span className="truncate">{t(avatar.name[0], avatar.name[1])}</span>
                </span>
                <span
                  className="rounded-md border border-zinc-700/60 bg-zinc-800/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-300"
                  style={{ borderLeftColor: avatar.accentColor, borderLeftWidth: '2px' }}
                >
                  {t(avatar.badge[0], avatar.badge[1])}
                </span>
              </div>

              <div className="pt-2">
                <span className="block text-[11px] font-medium leading-tight text-zinc-400 group-hover:text-zinc-200">
                  {t(avatar.persona[0], avatar.persona[1])}
                </span>
                <span className="mt-1 block text-[10px] font-bold text-zinc-500">
                  {t(avatar.style[0], avatar.style[1])}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Avatar Detail & Prompt Box */}
      <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/70 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-zinc-100">{t(selected.name[0], selected.name[1])}</span>
              <span className="text-xs font-semibold text-zinc-400">· {t(selected.style[0], selected.style[1])}</span>
            </div>
            <p className="pt-1 text-xs leading-relaxed text-zinc-300">
              {t(selected.what[0], selected.what[1])}
            </p>
            <p className="pt-0.5 text-[10px] text-zinc-500">
              <span className="font-semibold text-zinc-400">Lighting:</span> {selected.lighting}
            </p>
          </div>

          {onSelectAvatar && (
            <button
              type="button"
              onClick={() => handleChoose(selected)}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/20 px-3.5 py-1.5 text-xs font-bold text-blue-300 transition-all hover:border-blue-400 hover:bg-blue-500/30"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>{t('avatar.selectPersona', 'Choose Avatar Style')}</span>
            </button>
          )}
        </div>

        {/* Google AI Prompt Suggestion Box */}
        <div className="mt-3 rounded-lg border border-blue-500/25 bg-blue-950/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-300">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span>Google AI Prompt (Nano Banana / Gemini):</span>
            </span>

            <button
              type="button"
              onClick={() => handleCopyPrompt(selected)}
              className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/40 bg-blue-500/20 px-2.5 py-1 text-[11px] font-bold text-blue-200 transition-all hover:bg-blue-500/30"
            >
              {copiedId === selected.id ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">{t('avatar.copied', 'Avatar prompt copied for Google AI!')}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>{t('avatar.copyPrompt', 'Copy Google AI Prompt')}</span>
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
