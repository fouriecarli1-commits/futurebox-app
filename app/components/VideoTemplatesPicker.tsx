'use client';

/**
 * Starting points for a film, drawn as a picker in the cutting room.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"Wat ek ook wil in sit by video desk is templates vir
 * videos? ... AS mens kyk na nano banana, en veo ens. is daar templates wat help
 * om keuses te maak. Ek wil dit in die app integrate op 'n moderne stylish manier
 * vir kliente om van te kies."*
 *
 * The starting points themselves are `lib/filmstart.ts` — the shape, one look
 * across every shot, how the shots join, a title and a sign-off. This only
 * draws them. Pressing one hands it to the cutting room, which dresses the
 * clips that are already there; it cannot film anything, and the note under
 * the grid says so.
 *
 * ── Painted with the room's own palette ──────────────────────────────────
 *
 * The cutting room is `[data-cutroom]` and paints itself from `lib/cutlook.ts`
 * rather than from the zinc classes, because inside that room the surface
 * tokens are the room's own dark ones and zinc-800 on zinc-300 lands at
 * 1.5:1. The first version of this picker used the classes and
 * `check:contrast` found thirty-five labels below AA in one bench. Every
 * colour here is INK, INK_DIM, PANEL or RAISED now, the way the rest of the
 * room does it.
 *
 * A section that offered three "Veo prompts" to copy and take to Google's own
 * site was taken out: the video desk already runs Veo inside the app, and a
 * button whose job is to send a member elsewhere is not a feature.
 */

import React, { useState } from 'react';
import { Clapperboard, Film, Smartphone, Square, Tv } from 'lucide-react';
import { STARTS, type FilmStart } from '../lib/filmstart';
import { useLang } from '../lib/i18n';
import { EDGE, INK, INK_DIM, LIT, PANEL, RAISED } from '../lib/cutlook';

interface VideoTemplatesPickerProps {
  onSelectStart: (start: FilmStart) => void;
  piecesCount: number;
  currentShape?: string;
}

const SHAPE_ICONS: Record<string, React.ReactElement> = {
  tall: <Smartphone className="h-3.5 w-3.5" />,
  wide: <Tv className="h-3.5 w-3.5" />,
  square: <Square className="h-3.5 w-3.5" />,
};

/** Ratios rather than words, so the chip reads the same in both languages. */
const SHAPE_LABELS: Record<string, string> = {
  tall: '9:16',
  wide: '16:9',
  square: '1:1',
};

const CHIP = { background: 'rgba(255,255,255,0.07)', color: INK_DIM } as const;

export default function VideoTemplatesPicker({
  onSelectStart,
  piecesCount,
  currentShape,
}: VideoTemplatesPickerProps): React.ReactElement {
  const { t } = useLang();
  const [selectedStartId, setSelectedStartId] = useState<string | null>(null);

  const handleApplyStart = (start: FilmStart) => {
    setSelectedStartId(start.id);
    onSelectStart(start);
  };

  return (
    <div
      className="space-y-4 rounded-2xl border p-4 shadow-xl"
      style={{ background: PANEL, borderColor: EDGE, color: INK }}
    >
      <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: EDGE }}>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl border"
          style={{ borderColor: EDGE, background: 'rgba(52,211,153,0.12)', color: LIT }}
        >
          <Film className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-black tracking-tight" style={{ color: INK }}>
            {t('edit.start', 'Start from something')}
          </h3>
          <p className="text-[11px]" style={{ color: INK_DIM }}>
            {t(
              'edit.startWhy',
              'Each one sets the shape, one look across every shot, transitions, a title and sign-off.',
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {STARTS.map((start) => {
          const isSelected = selectedStartId === start.id;
          const sameShape = currentShape === start.shape;
          return (
            <button
              key={start.id}
              type="button"
              data-editorstart={start.id}
              onClick={() => handleApplyStart(start)}
              className="group flex min-h-[44px] flex-col justify-between rounded-xl border p-3 text-left transition-all"
              style={{
                background: isSelected ? RAISED : PANEL,
                borderColor: isSelected ? LIT : EDGE,
                boxShadow: isSelected ? `0 0 0 1px ${LIT}` : undefined,
                color: INK,
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5 text-xs font-black" style={{ color: INK }}>
                    <Clapperboard className="h-3.5 w-3.5" style={{ color: LIT }} />
                    <span>{t(start.name[0], start.name[1])}</span>
                  </span>
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                    style={sameShape ? { background: 'rgba(52,211,153,0.18)', color: INK } : CHIP}
                    title={sameShape ? t('edit.startSameShape', 'The shape your film is in now') : undefined}
                  >
                    {SHAPE_ICONS[start.shape]}
                    <span>{SHAPE_LABELS[start.shape] ?? start.shape}</span>
                  </span>
                </div>

                <p className="mt-1.5 text-[11px] leading-snug" style={{ color: INK_DIM }}>
                  {t(start.what[0], start.what[1])}
                </p>
              </div>

              <div
                className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2 text-[10px]"
                style={{ borderColor: EDGE }}
              >
                <span className="rounded px-1.5 py-0.5 font-semibold" style={CHIP}>
                  {t('edit.startLook', 'Look')}: <span className="font-bold" style={{ color: INK }}>{start.look}</span>
                </span>
                <span className="rounded px-1.5 py-0.5 font-semibold" style={CHIP}>
                  {t('edit.startJoin', 'Join')}: <span className="font-bold" style={{ color: INK }}>{start.join}</span>
                </span>
                {start.title && (
                  <span className="max-w-[130px] truncate rounded px-1.5 py-0.5 font-semibold" style={{ ...CHIP, color: INK }}>
                    &quot;{t(start.title.says[0], start.title.says[1])}&quot;
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {piecesCount === 0 && (
        <p className="text-[11px] italic" style={{ color: INK_DIM }}>
          {t(
            'edit.startEmpty',
            'Bring a clip in first. A starting point dresses your own film — one look across every shot, how they come in after one another, a title and a sign-off — it cannot film it for you.',
          )}
        </p>
      )}
    </div>
  );
}
