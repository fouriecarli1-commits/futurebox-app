'use client';

/**
 * Modern Video Templates & Google Veo Scene Inspiration for Video Desk.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"Wat ek ook wil in sit by video desk is templates vir
 * videos? ... AS mens kyk na nano banana, en veo ens. is daar templates wat help
 * om keuses te maak. Ek wil dit in die app integrate op 'n moderne stylish manier
 * vir kliente om van te kies."*
 */

import React, { useState } from 'react';
import {
  Film,
  Sparkles,
  Copy,
  Check,
  Clapperboard,
  Tv,
  Smartphone,
  Square,
  Wand2,
} from 'lucide-react';
import { STARTS, type FilmStart } from '../lib/filmstart';
import { useLang } from '../lib/i18n';

interface VideoTemplatesPickerProps {
  onSelectStart: (start: FilmStart) => void;
  piecesCount: number;
  currentShape?: string;
}

const SHAPE_ICONS: Record<string, React.ReactElement> = {
  tall: <Smartphone className="h-3.5 w-3.5 text-emerald-400" />,
  wide: <Tv className="h-3.5 w-3.5 text-blue-400" />,
  square: <Square className="h-3.5 w-3.5 text-purple-400" />,
};

const SHAPE_LABELS: Record<string, string> = {
  tall: '9:16 Story/Reel',
  wide: '16:9 Cinema',
  square: '1:1 Square',
};

const VEO_PROMPTS = [
  {
    id: 'veo-afro',
    titleEn: 'Afrobeats Live Stage',
    titleAf: 'Afrobeats Verhoog',
    badge: '4K Cinema',
    key: 'video.veoPrompt1',
    defaultPrompt:
      'Cinematic 4K slow motion tracking shot of Afrobeats artist on dimly lit stage with haze, golden rim lighting, anamorphic lens flare.',
  },
  {
    id: 'veo-retro',
    titleEn: '1980s Synthwave Drive',
    titleAf: '1980’s Sintgolf-Kusrit',
    badge: 'Retro Neon',
    key: 'video.veoPrompt2',
    defaultPrompt:
      '1980s retro neon sunset coastal highway drive in retro convertible, synthwave aesthetic, cyan and magenta twilight, VHS nostalgia grain.',
  },
  {
    id: 'veo-acoustic',
    titleEn: 'Acoustic Studio Session',
    titleAf: 'Akoestiese Ateljeesessie',
    badge: 'Warm 35mm',
    key: 'video.veoPrompt3',
    defaultPrompt:
      'Intimate acoustic recording studio session at golden hour, dust motes in sunbeams, vintage microphone, warm 35mm film aesthetic.',
  },
];

export default function VideoTemplatesPicker({
  onSelectStart,
  piecesCount,
  currentShape,
}: VideoTemplatesPickerProps): React.ReactElement {
  const { lang, t } = useLang();
  const [selectedStartId, setSelectedStartId] = useState<string | null>(null);
  const [copiedVeoId, setCopiedVeoId] = useState<string | null>(null);

  const handleCopyVeo = async (id: string, key: string, fallback: string) => {
    const text = t(key, fallback);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedVeoId(id);
      setTimeout(() => setCopiedVeoId(null), 2500);
    } catch {
      // Clipboard fallback
    }
  };

  const handleApplyStart = (start: FilmStart) => {
    setSelectedStartId(start.id);
    onSelectStart(start);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Film className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight text-zinc-100">
              {t('edit.start', 'Start from something')}
            </h3>
            <p className="text-[11px] text-zinc-400">
              {t(
                'edit.startWhy',
                'Each one sets the shape, one look across every shot, transitions, a title and sign-off.',
              )}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Google Veo + FutureBox Engine</span>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {STARTS.map((start) => {
          const isSelected = selectedStartId === start.id;
          return (
            <button
              key={start.id}
              type="button"
              data-editorstart={start.id}
              onClick={() => handleApplyStart(start)}
              className={`group flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? 'border-emerald-400/80 bg-zinc-900 shadow-md ring-1 ring-emerald-400/50'
                  : 'border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5 text-xs font-black text-zinc-100">
                    <Clapperboard className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{t(start.name[0], start.name[1])}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-zinc-700/60 bg-zinc-800/80 px-1.5 py-0.5 text-[9px] font-bold text-zinc-300">
                    {SHAPE_ICONS[start.shape]}
                    <span>{SHAPE_LABELS[start.shape] ?? start.shape}</span>
                  </span>
                </div>

                <p className="mt-1.5 text-[11px] leading-snug text-zinc-400 group-hover:text-zinc-200">
                  {t(start.what[0], start.what[1])}
                </p>
              </div>

              {/* Badges for Look & Transition */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-zinc-800/60 pt-2 text-[10px]">
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-semibold text-zinc-300">
                  Look: <span className="text-emerald-300 font-bold">{start.look}</span>
                </span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-semibold text-zinc-300">
                  Join: <span className="text-cyan-300 font-bold">{start.join}</span>
                </span>
                {start.title && (
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-semibold text-amber-300 truncate max-w-[130px]">
                    &quot;{t(start.title.says[0], start.title.says[1])}&quot;
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {piecesCount === 0 && (
        <p className="text-[11px] text-zinc-500 italic">
          {t(
            'edit.startEmpty',
            'Bring a clip in first. A starting point dresses your own film — one look across every shot, how they come in after one another, a title and a sign-off — it cannot film it for you.',
          )}
        </p>
      )}

      {/* Google Veo Scene Inspiration Section */}
      <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/70 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-tight text-zinc-100">
                {t('video.veoTitle', 'Google Veo Scene Inspiration')}
              </h4>
              <p className="text-[11px] text-zinc-400">
                {t(
                  'video.veoSub',
                  'Generate stunning 4K scenes with Google Veo to use as clips in your film.',
                )}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-300">
            <Wand2 className="h-3 w-3" />
            <span>Google Veo 4K</span>
          </div>
        </div>

        {/* 3 Curated Prompts */}
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {VEO_PROMPTS.map((item) => {
            const promptText = t(item.key, item.defaultPrompt);
            const isCopied = copiedVeoId === item.id;
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-zinc-200">
                      {lang === 'af' ? item.titleAf : item.titleEn}
                    </span>
                    <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-bold text-purple-300">
                      {item.badge}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[10px] leading-relaxed text-zinc-300 line-clamp-3">
                    {promptText}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyVeo(item.id, item.key, item.defaultPrompt)}
                  className="mt-3 inline-flex min-h-[30px] w-full items-center justify-center gap-1.5 rounded-md border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 text-[11px] font-bold text-purple-200 transition-all hover:bg-purple-500/20"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">
                        {t('video.veoCopied', 'Veo prompt copied for Google AI!')}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>{t('video.veoCopy', 'Copy Veo Prompt')}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
