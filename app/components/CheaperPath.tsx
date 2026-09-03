'use client';

/**
 * "There is a cheaper way to get the same thing."
 *
 * Not a warning and not an upsell in reverse — a comparison, with both numbers
 * on it, and a button that takes the cheaper road.
 *
 * The case it was built for is the one that costs people the most: a video with
 * a line of speech in it. Letting the engine speak moves the clip from Standard
 * to Better, which is exactly double. Making the same clip silent and reading
 * the line in the voice studio costs the Standard price plus about two credits,
 * because reading is charged per hundred and fifty characters. A fifteen-word
 * line is two credits. Thirty-two against sixty, for the same words.
 *
 * Two rules, both about not being a nag:
 *
 * It only appears when the cheaper path is *actually* cheaper for what is on
 * screen right now, with the real numbers, not as a general lesson about
 * economy. Somebody who has already chosen Premium on purpose does not need to
 * be told what Standard costs.
 *
 * It never changes anything by itself. The button is the offer; not pressing it
 * is a complete answer, and the panel does not come back louder.
 */

import React from 'react';
import { PiggyBank, ArrowRight } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function CheaperPath({
  now,
  instead,
  what,
  action,
  onTake,
}: {
  /** What the current choice costs, in credits. */
  now: number;
  /** What the suggested route costs, all in. */
  instead: number;
  /** One line naming the route, in the reader's language. */
  what: string;
  /** The button's words. */
  action: string;
  onTake: () => void;
}): React.ReactElement | null {
  const { t } = useLang();
  const saved = now - instead;
  // Under about a tenth it is noise, and a panel that appears to save you two
  // credits has cost you more attention than it saved you money.
  if (saved <= 0 || saved < now * 0.1) return null;

  return (
    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-2.5">
      <div className="flex items-start gap-2.5">
        <PiggyBank className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-300">
            {t('cheaper.title', 'Cheaper the other way')}
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">{what}</p>
          <p className="text-sm text-zinc-400">
            {now} {t('video.credits', 'credits')} {t('cheaper.against', 'against')} {instead}.{' '}
            <span className="text-emerald-300 font-semibold">
              {t('cheaper.saves', 'Saves')} {saved}.
            </span>
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onTake}
        className="flex items-center gap-2 text-sm font-semibold text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-3.5 py-2 transition-colors"
      >
        <span>{action}</span>
        <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
      </button>
    </div>
  );
}
