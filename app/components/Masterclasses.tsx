'use client';

/**
 * The masterclass library.
 *
 * Deliberately plain, for the same reason the Radar had to be stripped back:
 * this is a shelf you scan, and a shelf that looks like work does not get
 * scanned. A title, who made it, how long, and what you can do afterwards.
 *
 * The one thing that is never quiet is provenance. It sits on every row,
 * before the click, because the moment a viewer works out unaided that a
 * lecture was generated, everything else this channel claims about quality
 * stops being believed.
 */

import React, { useMemo, useState } from 'react';
import {
  GraduationCap, Clock, Lock, Sparkles, RefreshCw, Route, PlayCircle,
  Music, Video, Code2, Cpu, TrendingUp, Microscope, Gamepad2,
} from 'lucide-react';
import {
  MASTERCLASSES, PATHS, BRIEF_SEEDS, TRACK_LABELS, LEVEL_LABELS,
  PROVENANCE_LABELS, PROVENANCE_NOTES,
  type Track, type Provenance, type Masterclass,
} from '../data/masterclasses';
import type { Plan } from '../lib/entitlements';
import { useLang } from '../lib/i18n';
import { signal } from '../lib/signal';
import { Views, type Board } from './Counters';
import Cover from './Cover';

const TRACK_ICONS: Record<Track, typeof Music> = {
  'ai-music': Music,
  'ai-video': Video,
  vibecoding: Code2,
  'which-ai': Cpu,
  business: TrendingUp,
  research: Microscope,
  'ai-games': Gamepad2,
};

const PROVENANCE_STYLE: Record<Provenance, string> = {
  curated: 'text-cyan-300',
  original: 'text-emerald-300',
  ai_video: 'text-amber-300',
};

function Card({
  item, userPlan, onUpgrade, board,
}: {
  item: Masterclass; userPlan: Plan; onUpgrade: () => void; board: Board | null;
}) {
  const locked = item.proOnly && userPlan === 'free';
  const unavailable = !item.url;
  const Icon = TRACK_ICONS[item.track];

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden flex flex-col hover:border-emerald-500/40 transition-all">
      {/* A real lecture shows its own thumbnail; everything else gets artwork
          drawn from its title. Never a stock photo of a stranger at a laptop. */}
      <Cover seed={item.id} label={item.title} url={item.url} className="aspect-video" />

      <div className="p-4 flex flex-col gap-3 flex-1">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-emerald-400" />
        </div>
        <span className="flex items-center gap-2.5 text-sm">
          <Views board={board} kind="masterclass" reference={item.id} />
          <span className={`font-semibold ${PROVENANCE_STYLE[item.provenance]}`}>
            {item.provenance === 'ai_video' ? 'AI-made' : item.provenance === 'curated' ? 'Picked for you' : 'Ours'}
          </span>
        </span>
      </div>

      <div className="flex-1">
        <h4 className="text-lg font-bold text-white leading-snug">{item.title}</h4>
        <p className="text-sm text-zinc-500 pt-1">
          {item.instructor} · {item.minutes} min · {LEVEL_LABELS[item.level]}
          {item.status && item.status !== 'published' && (
            <span className="text-amber-400"> · {item.status === 'in-production' ? 'coming soon' : 'planned'}</span>
          )}
        </p>
        <p className="text-base text-zinc-400 leading-relaxed pt-2">
          <span className="text-zinc-500">You will be able to: </span>
          {item.outcome}
        </p>
      </div>

      {locked ? (
        <button
          type="button"
          onClick={onUpgrade}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-amber-500/15 border border-amber-500/50 text-amber-300 hover:bg-amber-500/25 flex items-center justify-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5" />
          Pro only
        </button>
      ) : unavailable ? (
        <span className="w-full py-2.5 rounded-xl text-sm text-center text-zinc-600 border border-zinc-800">
          Not out yet
        </span>
      ) : (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          // Counted when it is opened, which is the only moment anybody can
          // honestly claim a class was watched from here — where the viewer
          // goes next happens on somebody else's site.
          onClick={() => signal('masterclass', { category: item.track, ref: item.id })}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-zinc-950 border border-zinc-700 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 flex items-center justify-center gap-1.5"
        >
          <PlayCircle className="w-4 h-4" />
          Watch it
        </a>
      )}
      </div>
    </article>
  );
}

export default function Masterclasses({
  userPlan,
  onUpgrade,
  board = null,
}: {
  userPlan: Plan;
  onUpgrade: () => void;
  /** The counters, so each class can say how many people opened it. */
  board?: Board | null;
}) {
  const [track, setTrack] = useState<Track | null>(null);
  const { t } = useLang();
  const [showProvenance, setShowProvenance] = useState(false);
  const [planTrack, setPlanTrack] = useState<Track>('ai-music');
  const [seed, setSeed] = useState(0);
  const [showPlanner, setShowPlanner] = useState(false);

  const shown = useMemo(
    () => MASTERCLASSES.filter((m) => (track === null ? true : m.track === track)),
    [track],
  );

  const brief = useMemo(() => {
    const pool = BRIEF_SEEDS[planTrack];
    const angle = pool.angle[seed % pool.angle.length];
    const format = pool.format[Math.floor(seed / pool.angle.length) % pool.format.length];
    return { angle, format };
  }, [planTrack, seed]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h3 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-emerald-400" />
          {t('mc.title')}
        </h3>
        <button
          type="button"
          onClick={() => setShowProvenance((v) => !v)}
          className="text-sm text-zinc-500 hover:text-zinc-200"
        >
          {t('mc.howLabel')}
        </button>
      </div>

      <p className="text-base text-zinc-400">
        {shown.length} classes across {Object.keys(TRACK_LABELS).length} tracks. Every one says who made it before you click.
      </p>

      {showProvenance && (
        <div className="text-sm text-zinc-400 leading-relaxed bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 space-y-1.5">
          {(Object.keys(PROVENANCE_LABELS) as Provenance[]).map((p) => (
            <p key={p}>
              <strong className={PROVENANCE_STYLE[p]}>{PROVENANCE_LABELS[p]}.</strong> {PROVENANCE_NOTES[p]}
            </p>
          ))}
        </div>
      )}

      {/* Sections, as things you can see and choose */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        <button
          type="button"
          onClick={() => setTrack(null)}
          className={`p-3 rounded-2xl border text-left transition-all ${
            track === null
              ? 'bg-emerald-500/15 border-emerald-500 text-white'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
          }`}
        >
          <GraduationCap className={`w-5 h-5 ${track === null ? 'text-emerald-400' : ''}`} />
          <p className="text-sm font-bold pt-1.5 leading-tight">{t('common.everything')}</p>
          <p className="text-sm text-zinc-500">{MASTERCLASSES.length}</p>
        </button>

        {(Object.keys(TRACK_LABELS) as Track[]).map((t) => {
          const Icon = TRACK_ICONS[t];
          const count = MASTERCLASSES.filter((m) => m.track === t).length;
          const active = track === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTrack(t)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                active
                  ? 'bg-emerald-500/15 border-emerald-500 text-white'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-emerald-400' : ''}`} />
              <p className="text-sm font-bold pt-1.5 leading-tight">{TRACK_LABELS[t]}</p>
              <p className="text-sm text-zinc-500">{count}</p>
            </button>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {shown.map((m) => (
          <Card key={m.id} item={m} userPlan={userPlan} onUpgrade={onUpgrade} board={board} />
        ))}
      </div>

      {/* Paths — a shelf is not a course */}
      <div className="space-y-3 pt-2">
        <h4 className="text-lg font-bold text-white flex items-center gap-2">
          <Route className="w-4 h-4 text-cyan-400" />
          Paths
        </h4>
        <div className="grid md:grid-cols-3 gap-3">
          {PATHS.map((path) => (
            <div key={path.id} className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
              <p className="text-base font-bold text-white leading-snug">{path.title}</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{path.blurb}</p>
              <p className="text-sm text-zinc-600">{path.classIds.length} classes, in order</p>
            </div>
          ))}
        </div>
      </div>

      {/* Planning the next one — the part that makes "regularly" real */}
      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 space-y-3">
        <button
          type="button"
          onClick={() => setShowPlanner((v) => !v)}
          className="text-base font-bold text-white flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Plan the next one
        </button>

        {showPlanner && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TRACK_LABELS) as Track[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPlanTrack(t)}
                  className={`px-2.5 py-1 rounded-lg text-sm border transition-all ${
                    planTrack === t ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300' : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {TRACK_LABELS[t]}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
              <p className="text-sm text-zinc-500">Angle</p>
              <p className="text-base text-white">{brief.angle}</p>
              <p className="text-sm text-zinc-500 pt-1.5">Format</p>
              <p className="text-base text-white">{brief.format}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setSeed((s) => s + 1)}
                className="px-3 py-1.5 rounded-lg text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Another
              </button>
              <p className="text-sm text-zinc-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                One a fortnight is a schedule you can keep. One a week is one you will abandon.
              </p>
            </div>

            <p className="text-sm text-zinc-500 leading-relaxed">
              Decide the outcome before you film — the sentence that starts &ldquo;afterwards you can&rdquo;. A class
              without one is a talk, and a talk is what people leave halfway through.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
