'use client';

/**
 * What is going to happen, in order, before it happens.
 *
 * A room that opens on a form asks somebody to fill it in before they know
 * what filling it in leads to. That is fine where the answer is obvious — a
 * search box needs no explanation — and it is not fine in a room that runs a
 * sequence: write, film, voice, publish. Somebody who cannot see the sequence
 * cannot tell whether the first box is the whole thing or a tenth of it, and
 * the honest reading of a form with no visible end is "this will want more from
 * me than I have".
 *
 * So: the steps, numbered, with the one you are on marked. Not a wizard — you
 * can work in any order and nothing here forces a sequence. It is a map, and
 * the only thing it changes is that you know where you are on it.
 *
 * Deliberately quiet: numbers rather than icons, one line each, the current one
 * carrying the accent and nothing else carrying anything. A progress display
 * that competes with the work for attention has misunderstood which of the two
 * matters.
 */

import React from 'react';
import { useLang } from '../lib/i18n';

export interface Step {
  /** Three or four words. What happens at this step. */
  readonly en: string;
  readonly af: string;
  /** One line under it, where the step needs it. */
  readonly noteEn?: string;
  readonly noteAf?: string;
}

export default function Steps({
  steps,
  at,
  className = '',
}: {
  steps: readonly Step[];
  /** Which step is current, from zero. Out of range marks none, which is right before anything has been done. */
  at: number;
  className?: string;
}): React.ReactElement {
  const { lang } = useLang();
  const af = lang === 'af';

  return (
    <ol className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {steps.map((step, index) => {
        const here = index === at;
        const done = index < at;
        return (
          <li
            key={step.en}
            aria-current={here ? 'step' : undefined}
            className={`rounded-xl border px-3 py-2.5 transition-colors ${
              here
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-zinc-800 bg-zinc-950/60'
            }`}
          >
            <span className="flex items-baseline gap-2">
              <span
                className={`text-xs font-bold tabular-nums ${
                  here ? 'text-emerald-300' : done ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-sm font-semibold leading-tight ${
                    here ? 'text-emerald-300' : 'text-zinc-200'
                  }`}
                >
                  {af ? step.af : step.en}
                </span>
                {(af ? step.noteAf : step.noteEn) && (
                  <span className="block text-xs text-zinc-500 leading-snug pt-0.5">
                    {af ? step.noteAf : step.noteEn}
                  </span>
                )}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
