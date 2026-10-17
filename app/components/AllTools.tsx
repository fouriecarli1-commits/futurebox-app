'use client';

/**
 * All tools, on one page: round buttons in groups, each straight to its tool.
 *
 * Carli, 16 October 2026, screenshots of another app's "All tools" page —
 * round buttons with a picture and a name under Generative AI, Video editing,
 * Photo editing, Shoot and record and Quick actions. Ours in our own look:
 * the dark studio, a soft neon ring per group, and a line under a tool that
 * costs credits so nothing is a surprise. `lib/alltools.ts` holds the list
 * and how a tool opens one panel inside its room.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  AudioLines, Blend, Boxes, Clapperboard, Crop, Eraser, Film, Grid2x2, Handshake, Image as ImageIcon,
  Layers, LayoutTemplate, Megaphone, Mic, Mic2, Music, Palette, Radio, ScanText, Scissors, Search,
  Shapes, SlidersHorizontal, Smartphone, Sparkles, SunMedium, Type, Wand2, Waves, X, ListMusic, Sliders,
  Combine, FileOutput, FilePen, FileText, Files, MessageSquare, ShieldCheck, Signature, SquareCheck,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';
import { TOOLS, TOOL_GROUPS, toolLabel, type Tool, type ToolGroup, type ToolIcon } from '../lib/alltools';

const ICON: Record<ToolIcon, typeof Sparkles> = {
  song: Music, video: Clapperboard, image: ImageIcon, wand: Wand2, art: Palette, ads: Megaphone, voice: Mic2,
  scissors: Scissors, transitions: Blend, titles: Type, effects: Sparkles, generators: Boxes, enhance: SunMedium,
  audiofx: AudioLines, photo: ImageIcon, templates: LayoutTemplate, grid: Grid2x2, filters: Film, adjust: SlidersHorizontal,
  cutout: Eraser, text: Type, grab: ScanText, layers: Layers, shapes: Shapes, studio: Sliders, booth: Mic,
  podcast: Radio, sound: Waves, hooks: Smartphone, live: Radio, channel: ListMusic, collab: Handshake,
  pdf: FileText, pages: Files, combine: Combine, sign: Signature, redact: Eraser, lock: ShieldCheck, form: SquareCheck,
  convert: FileOutput, comment: MessageSquare, pdfedit: FilePen,
};

/** Each group's own light, so the page reads as six shelves rather than one wall. */
const GLOW: Record<ToolGroup, readonly [string, string]> = {
  ai: ['#a78bfa', '#ff3dc8'],
  video: ['#22d3ee', '#3b82f6'],
  photo: ['#34d399', '#a3e635'],
  docs: ['#38bdf8', '#818cf8'],
  music: ['#f59e0b', '#ef4444'],
  share: ['#f472b6', '#a78bfa'],
};

export default function AllTools({
  open,
  onClose,
  onGo,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onGo: (tool: Tool) => void;
}): React.ReactElement | null {
  const { t, lang } = useLang();
  const [looking, setLooking] = useState('');
  useBackLayer(open, onClose);
  /* Each time it opens it shows every tool, not the last search. */
  useEffect(() => {
    if (open) setLooking('');
  }, [open]);
  const found = useMemo(() => {
    const q = looking.trim().toLowerCase();
    return q ? TOOLS.filter((one) => one.en.toLowerCase().includes(q) || one.af.toLowerCase().includes(q)) : null;
  }, [looking]);
  if (!open) return null;

  const button = (tool: Tool): React.ReactElement => {
    const Icon = ICON[tool.icon] ?? Crop;
    const [a, b] = GLOW[tool.group];
    return (
      <button
        key={tool.id}
        type="button"
        data-alltool={tool.id}
        onClick={() => onGo(tool)}
        className="flex min-h-[44px] flex-col items-center gap-1.5 text-center"
      >
        <span
          className="grid h-16 w-16 place-items-center rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 25%, ${a}55, ${b}22 60%, rgba(9,9,11,0.9))`,
            boxShadow: `0 0 0 1px ${a}66, 0 0 18px ${a}33`,
            color: '#f4f4f5',
          }}
        >
          <Icon className="h-7 w-7" />
        </span>
        <span className="text-xs font-semibold leading-tight text-zinc-200">{toolLabel(tool, lang)}</span>
        {tool.paid && <span className="text-[10px] leading-none text-zinc-500">{t('tools.credits', 'uses credits')}</span>}
      </button>
    );
  };

  return (
    <div
      data-alltools
      role="dialog"
      aria-modal="true"
      aria-label={t('tools.title', 'All tools')}
      className="fixed inset-0 z-[60] overflow-y-auto bg-zinc-950"
    >
      {/* Clear of the tab bar at the foot, by the bar's own measure. */}
      <div className="mx-auto w-full max-w-3xl px-4 pt-6" style={{ paddingBottom: barClearance(24) }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-3xl font-black tracking-tight text-zinc-50">{t('tools.title', 'All tools')}</h2>
          <button
            type="button"
            data-alltoolsclose
            onClick={onClose}
            aria-label={t('tools.close', 'Close all tools')}
            className="grid h-11 w-11 place-items-center rounded-full border border-zinc-700 text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3">
          <Search className="h-4 w-4 flex-shrink-0 text-zinc-500" />
          <input
            type="search"
            data-alltoolssearch
            value={looking}
            onChange={(event) => setLooking(event.target.value)}
            placeholder={t('tools.find', 'Find a tool')}
            aria-label={t('tools.find', 'Find a tool')}
            className="min-h-[44px] w-full bg-transparent text-sm text-zinc-100 outline-none"
          />
        </label>

        {found ? (
          <div className="mt-6 grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-6" data-alltoolsfound>
            {found.length ? found.map(button) : (
              <p className="col-span-4 text-sm text-zinc-500">{t('tools.none', 'No tool by that name.')}</p>
            )}
          </div>
        ) : (
          TOOL_GROUPS.map((group) => (
            <section key={group.id} className="mt-7" data-alltoolsgroup={group.id}>
              <h3 className="text-lg font-bold text-zinc-100">{toolLabel(group, lang)}</h3>
              <div className="mt-3 grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-6">
                {TOOLS.filter((one) => one.group === group.id).map(button)}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
