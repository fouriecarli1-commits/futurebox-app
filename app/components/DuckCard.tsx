'use client';

/**
 * Make it pump: the sidechain (`duck` on a lane, `withDucks` in
 * `lib/session.ts`). One press finds the beat, the lane with the most kicks
 * a second, and ducks every other lane under it; or choose the key, how far
 * the others dip, and which of them do, by hand. The song a session was
 * recorded against is left alone unless chosen: its own drums are already
 * in it.
 */
import React, { useMemo } from 'react';
import { Activity, Wand2 } from 'lucide-react';
import { hitsOf, lengthOf, type Lane } from '../lib/session';

type Say = (key: string, fallback: string) => string;

export interface Ducking {
  readonly by: string;
  readonly depth: number;
  readonly lanes: readonly string[];
}

/** The lane most like a beat: the most low hits a second, a drum-pad lane first. */
export function beatLaneOf(lanes: readonly Lane[], bpm: number): Lane | null {
  let best: { lane: Lane; rate: number } | null = null;
  for (const lane of lanes) {
    if (lane.muted || lane.backing) continue;
    const hits = hitsOf(lane, bpm);
    const seconds = Math.max(0.5, lengthOf(lane));
    const rate = hits.length / seconds + (lane.beat ? 100 : 0);
    if (hits.length >= 2 && (!best || rate > best.rate)) best = { lane, rate };
  }
  return best?.lane ?? null;
}

export default function DuckCard({
  t,
  lanes,
  bpm,
  onSet,
}: {
  readonly t: Say;
  readonly lanes: readonly Lane[];
  readonly bpm: number;
  readonly onSet: (next: Ducking | null) => void;
}): React.ReactElement {
  const now = useMemo<Ducking | null>(() => {
    const ducked = lanes.filter((one) => one.duck);
    if (!ducked.length) return null;
    return { by: ducked[0].duck?.by ?? '', depth: ducked[0].duck?.depth ?? 0.5, lanes: ducked.map((one) => one.id) };
  }, [lanes]);

  const pump = (): void => {
    const key = beatLaneOf(lanes, bpm);
    if (!key) return;
    onSet({ by: key.id, depth: 0.5, lanes: lanes.filter((one) => one.id !== key.id && !one.backing && !one.muted).map((one) => one.id) });
  };

  const key = now ? lanes.find((one) => one.id === now.by) : null;
  const chip = (on: boolean): string =>
    `inline-flex min-h-[44px] max-w-[11rem] items-center rounded-xl border px-3 text-xs font-bold ${on ? 'border-emerald-400 bg-emerald-400/15 text-emerald-100' : 'border-zinc-700 bg-zinc-900 text-zinc-300'}`;

  return (
    <div className="space-y-2.5" data-duck>
      <button
        type="button"
        data-duckpump
        onClick={pump}
        disabled={lanes.length < 2}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/15 px-3 text-sm font-bold text-emerald-100 disabled:opacity-40"
      >
        <Wand2 className="h-4 w-4" />
        {t('duck.pump', 'Make it pump')} · {t('script.noCredits', 'no credits')}
      </button>
      {now && key ? (
        <>
          <p data-keep data-ducksays className="text-xs leading-snug text-zinc-400">
            {t('duck.now', '{n} lanes dip on every hit of {key}.').replace('{n}', String(now.lanes.length)).replace('{key}', key.name)}
          </p>
          <label className="flex items-center gap-3 text-xs font-semibold text-zinc-400">
            {t('duck.key', 'Ducked by')}
            <select
              data-duckkey
              value={now.by}
              onChange={(event) => onSet({ ...now, by: event.target.value, lanes: now.lanes.filter((id) => id !== event.target.value) })}
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100"
            >
              {lanes.map((one) => <option key={one.id} value={one.id}>{one.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 text-xs font-semibold text-zinc-400">
            <Activity className="h-4 w-4 shrink-0" />
            {t('duck.depth', 'How far they dip')}
            <input
              type="range"
              data-duckdepth
              min={10}
              max={90}
              value={Math.round(now.depth * 100)}
              onChange={(event) => onSet({ ...now, depth: Number(event.target.value) / 100 })}
              aria-label={t('duck.depth', 'How far they dip')}
              className="h-11 min-w-0 flex-1 accent-emerald-400"
            />
            <span className="w-10 text-right tabular-nums text-zinc-200">{Math.round(now.depth * 100)}%</span>
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('duck.which', 'Which lanes dip')}>
            {lanes.filter((one) => one.id !== now.by).map((one) => {
              const on = now.lanes.includes(one.id);
              return (
                <button
                  key={one.id}
                  type="button"
                  data-duckon={one.id}
                  aria-pressed={on}
                  onClick={() => onSet({ ...now, lanes: on ? now.lanes.filter((id) => id !== one.id) : [...now.lanes, one.id] })}
                  className={chip(on)}
                >
                  <span className="truncate">{one.name}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            data-duckoff
            onClick={() => onSet(null)}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-zinc-200"
          >
            {t('duck.off', 'Stop the pumping')}
          </button>
        </>
      ) : (
        <p data-keep className="text-xs leading-snug text-zinc-500">
          {t('duck.what', 'Finds the beat and makes the other lanes dip on every kick and come back up, the way dance music breathes. Heard as it plays and in every file.')}
        </p>
      )}
    </div>
  );
}
