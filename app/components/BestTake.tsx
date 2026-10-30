'use client';

/**
 * "Choose the best pass for me": shown under the open lane when it is one of
 * several passes of a loop take (`lib/besttake.ts`). For the marked piece the
 * winner is comped in there; for the whole take the winner plays and the
 * other passes are muted. Every pass's score stays on the screen, and for the
 * whole take any other pass can still be chosen with one press.
 */
import React, { useState } from 'react';
import { Check, Crown, Sparkles } from 'lucide-react';
import type { PassScore } from '../lib/besttake';

type Say = (key: string, fallback: string) => string;

interface Result {
  readonly where: 'all' | 'marked';
  /** One per pass; a pass's id is its name. */
  readonly scores: readonly PassScore[];
}

export default function BestTake({
  t,
  passes,
  marked,
  onChoose,
  onKeep,
}: {
  readonly t: Say;
  /** How many passes this take has. */
  readonly passes: number;
  /** A piece is marked on the timeline. */
  readonly marked: boolean;
  readonly onChoose: (where: 'all' | 'marked') => PassScore[] | null;
  /** Keep this pass, by name, for the whole take instead. */
  readonly onKeep: (pass: string) => void;
}): React.ReactElement {
  const [result, setResult] = useState<Result | null>(null);
  const [kept, setKept] = useState<string | null>(null);

  const run = (where: 'all' | 'marked'): void => {
    const scores = onChoose(where);
    if (scores) {
      setResult({ where, scores });
      setKept(scores[0]?.id ?? null);
    }
  };

  const button = 'inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold disabled:opacity-40';

  return (
    <section data-besttake className="space-y-3 rounded-2xl border border-amber-400/25 bg-zinc-950/60 p-3">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 shrink-0 text-amber-300" />
        <h4 className="text-sm font-black text-white">{t('best.title', 'Choose the best pass for me')}</h4>
      </div>
      <p data-keep className="text-xs leading-snug text-zinc-400">
        {t('best.what', 'This take has {n} passes. Each is scored on how in tune it is, how steady, whether all of it was sung, and whether it clipped.').replace('{n}', String(passes))}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" data-bestmarked disabled={!marked} onClick={() => run('marked')} className={`${button} border-amber-400/50 bg-amber-400/15 text-amber-100`}>
          <Sparkles className="h-4 w-4" />
          {t('best.marked', 'For the marked piece')} · {t('script.noCredits', 'no credits')}
        </button>
        <button type="button" data-bestall onClick={() => run('all')} className={`${button} border-zinc-700 bg-zinc-900 text-zinc-100`}>
          <Sparkles className="h-4 w-4" />
          {t('best.all', 'For the whole take')} · {t('script.noCredits', 'no credits')}
        </button>
      </div>
      {!marked && (
        <p data-keep className="text-xs leading-snug text-zinc-500">
          {t('best.markFirst', 'Mark a phrase on the timeline to choose the best pass for just that phrase, then the next phrase, and so on.')}
        </p>
      )}

      {result && (
        <ol data-bestscores className="space-y-1.5">
          {result.scores.map((one, at) => {
            const on = result.where === 'all' ? kept === one.id : at === 0;
            return (
              <li key={one.id} data-bestscore={one.score} className={`flex flex-wrap items-center gap-2 rounded-xl border p-2 ${on ? 'border-amber-400/60 bg-amber-400/10' : 'border-zinc-800 bg-zinc-900/60'}`}>
                <span className="min-w-0 flex-1 basis-40">
                  <span className="block truncate text-sm font-bold text-white">
                    {on && <Check className="mr-1 inline h-3.5 w-3.5 text-amber-300" />}
                    {one.id}
                    <span className="ml-2 tabular-nums text-amber-200">{one.score}</span>
                  </span>
                  <span className="block text-xs tabular-nums text-zinc-400">
                    {Math.round(one.inTune * 100)}% {t('best.inTune', 'in tune')} · {Math.round(one.cents)} {t('best.cents', 'cents off on average')} · {Math.round(one.filled * 100)}% {t('best.sung', 'sung')}{one.clipped > 0.001 ? ` · ${t('best.clips', 'clips')}` : ''}
                  </span>
                </span>
                {result.where === 'all' && !on && (
                  <button
                    type="button"
                    data-bestpick={one.id}
                    onClick={() => { onKeep(one.id); setKept(one.id); }}
                    className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-xs font-bold text-zinc-200"
                  >
                    {t('best.useThis', 'Use this one')}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {result?.where === 'marked' && (
        <p data-keep className="text-xs leading-snug text-zinc-500">
          {t('best.markedDone', 'The winner plays in the marked piece and the other passes step aside there. Undo to hear it as it was.')}
        </p>
      )}
    </section>
  );
}
