'use client';

/**
 * What the engines have cost this month, on the account screen.
 *
 * ── Why it is not where it was ───────────────────────────────────────────
 *
 * This printed in the middle of the video desk: every provider, its model
 * version, and a spend bar, above the box somebody was writing a shot in.
 * Only the operator ever saw it — the server sends the figures to nobody else
 * — and the operator is the one person who does not need to be told
 * `veo-3.1-fast-generate-001` while deciding what a video should look like.
 * Carli: "daai hele bar van elevenlabs en veo."
 *
 * So it moved rather than went. A bill belongs on the screen where somebody
 * deals with the account, and this is that screen.
 *
 * ── It draws nothing unless there is something to draw ───────────────────
 *
 * `probeVideoEngine` answers for everybody; only the owner's answer carries
 * `engines`. So for every other account this renders null, and it does that
 * by having nothing rather than by checking a list — the list never reaches
 * a browser, which is the rule in `server/owners.ts`.
 */

import React, { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { probeVideoEngine, type VideoGrades } from '../lib/engines';
import { useLang } from '../lib/i18n';

export default function EngineSpend(): React.ReactElement | null {
  const { t } = useLang();
  const [engine, setEngine] = useState<VideoGrades | null>(null);

  useEffect(() => {
    let live = true;
    void probeVideoEngine().then((found) => {
      if (live) setEngine(found);
    });
    return () => {
      live = false;
    };
  }, []);

  const engines = engine?.engines ?? [];
  if (!engines.length) return null;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
      <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
        <Gauge className="w-4 h-4 text-emerald-400" />
        {t('spend.engines', 'What the engines have used this month')}
      </p>
      {engines.map((one) => (
        <div key={one.id} className="space-y-1.5">
          <p className="text-sm text-zinc-400">
            {one.name}{' '}
            <span className="text-zinc-200 font-semibold tabular-nums">
              {one.used} / {one.ceiling}
            </span>{' '}
            <span className="text-zinc-600">· {one.model}</span>
          </p>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all ${
                one.used / Math.max(1, one.ceiling) > 0.85 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{
                width: `${Math.min(100, Math.round((one.used / Math.max(1, one.ceiling)) * 100))}%`,
              }}
            />
          </div>
        </div>
      ))}
    </section>
  );
}
