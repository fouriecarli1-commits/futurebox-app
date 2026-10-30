'use client';

/**
 * What the mix critic heard (`lib/mixcritic.ts`), each finding with the one
 * press that fixes it. Fixed findings drop off the list; "Listen again" reads
 * the mix as it now is. Everything here is done on the device.
 */
import React from 'react';
import { Check, Ear, Loader2, Sparkles } from 'lucide-react';
import { fill, type Finding } from '../lib/mixcritic';

type Say = (key: string, fallback: string) => string;

export default function MixCritic({
  t,
  findings,
  fixed,
  listening,
  disabled,
  onListen,
  onFix,
}: {
  readonly t: Say;
  /** Null until it has listened. */
  readonly findings: readonly Finding[] | null;
  readonly fixed: ReadonlySet<string>;
  readonly listening: boolean;
  readonly disabled: boolean;
  readonly onListen: () => void;
  readonly onFix: (finding: Finding) => void;
}): React.ReactElement {
  const open = findings?.filter((one) => !fixed.has(one.id)) ?? [];
  return (
    <div className="space-y-2">
      <button
        type="button"
        data-mixcritic
        onClick={onListen}
        disabled={disabled || listening}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-violet-400/50 bg-violet-500/15 px-3 text-sm font-bold text-violet-100 disabled:opacity-40"
      >
        {listening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ear className="h-4 w-4" />}
        {listening
          ? t('critic.listening', 'Listening…')
          : findings ? t('critic.again', 'Listen again') : t('critic.listen', 'Listen to my mix')}
        {' · '}{t('script.noCredits', 'no credits')}
      </button>

      {findings && open.length === 0 && (
        <p data-keep data-mixclear className="flex items-center gap-2 text-sm text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          {findings.length
            ? t('critic.allFixed', 'All of it fixed. Listen again to hear the mix as it is now.')
            : t('critic.nothing', 'Nothing stands out: the levels sit together, nothing rumbles, and the loudness is where it should be.')}
        </p>
      )}

      {open.map((one) => (
        <div key={one.id} data-mixfinding={one.what} className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-2.5">
          <p data-keep className="min-w-0 flex-1 basis-56 text-sm leading-snug text-zinc-200">
            {fill(t(one.say[0], one.say[1]), one.values)}
          </p>
          <button
            type="button"
            data-mixfix={one.id}
            onClick={() => onFix(one)}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-violet-400/50 bg-violet-500/15 px-3 text-xs font-bold text-violet-100"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t(one.press[0], one.press[1])}
          </button>
        </div>
      ))}

      {open.length > 1 && (
        <button
          type="button"
          data-mixfixall
          onClick={() => open.forEach((one) => onFix(one))}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100"
        >
          <Sparkles className="h-4 w-4" />
          {t('critic.all', 'Do all of it')}
        </button>
      )}
    </div>
  );
}
