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
import { GraduationCap, Clock, Lock, ExternalLink, Sparkles, RefreshCw, Route } from 'lucide-react';
import {
  MASTERCLASSES, PATHS, BRIEF_SEEDS, TRACK_LABELS, LEVEL_LABELS,
  PROVENANCE_LABELS, PROVENANCE_NOTES,
  type Track, type Provenance, type Masterclass,
} from '../data/masterclasses';
import type { Plan } from '../lib/entitlements';

const PROVENANCE_STYLE: Record<Provenance, string> = {
  curated: 'text-cyan-300',
  original: 'text-emerald-300',
  ai_video: 'text-amber-300',
};

function Row({ item, userPlan, onUpgrade }: { item: Masterclass; userPlan: Plan; onUpgrade: () => void }) {
  const locked = item.proOnly && userPlan === 'free';
  const unavailable = !item.url;

  return (
    <article className="py-4 flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          {locked || unavailable ? (
            <span className="text-lg font-bold text-white leading-snug">{item.title}</span>
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-bold text-white leading-snug hover:text-emerald-300 transition-colors"
            >
              {item.title}
            </a>
          )}
          <span className={`text-sm ${PROVENANCE_STYLE[item.provenance]}`}>
            {item.provenance === 'ai_video' ? 'AI-generated' : item.provenance === 'curated' ? 'Curated' : 'Original'}
          </span>
        </div>

        <p className="text-sm text-zinc-500 pt-1">
          {item.instructor}
          {item.source && ` · ${item.source}`} · {item.minutes} min · {LEVEL_LABELS[item.level]}
          {item.status && item.status !== 'published' && (
            <span className="text-amber-400"> · {item.status === 'in-production' ? 'in production' : 'planned'}</span>
          )}
        </p>

        <p className="text-base text-zinc-400 leading-relaxed pt-1.5">
          <span className="text-zinc-500">Afterwards you can: </span>
          {item.outcome}
        </p>

        {locked && (
          <button type="button" onClick={onUpgrade} className="text-sm text-amber-400 hover:underline pt-1.5 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Pro
          </button>
        )}
      </div>

      {!locked && !unavailable && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-sm text-zinc-500 hover:text-emerald-300 flex items-center gap-1"
        >
          Watch <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </article>
  );
}

export default function Masterclasses({
  userPlan,
  onUpgrade,
}: {
  userPlan: Plan;
  onUpgrade: () => void;
}) {
  const [track, setTrack] = useState<Track | null>(null);
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
          Masterclasses
        </h3>
        <button
          type="button"
          onClick={() => setShowProvenance((v) => !v)}
          className="text-sm text-zinc-500 hover:text-zinc-200"
        >
          How we label these
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

      {/* Tracks */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setTrack(null)}
          className={`px-3 py-1 rounded-full text-sm transition-all ${
            track === null ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/60' : 'text-zinc-500 border border-transparent hover:text-zinc-200'
          }`}
        >
          Everything
        </button>
        {(Object.keys(TRACK_LABELS) as Track[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTrack(t)}
            className={`px-3 py-1 rounded-full text-sm transition-all ${
              track === t ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/60' : 'text-zinc-500 border border-transparent hover:text-zinc-200'
            }`}
          >
            {TRACK_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="divide-y divide-zinc-800/70 border-y border-zinc-800/70">
        {shown.map((m) => (
          <Row key={m.id} item={m} userPlan={userPlan} onUpgrade={onUpgrade} />
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
