'use client';

/**
 * The only place a top-up price is ever shown.
 *
 * Not on the billing page, not in a menu, not beside the plans. It appears at
 * the moment somebody asked for something and was told they were short — which
 * is the one moment they actually want to know what a pack costs, and the one
 * moment a price list is help rather than a sales pitch.
 *
 * It says how short they were, so the smallest pack that gets them there is
 * the one drawn as the answer. Making somebody work out which of three numbers
 * clears a shortfall of forty is a needless sum at the worst moment.
 */

import React, { useState } from 'react';
import { Loader2, X, Zap } from 'lucide-react';
import { startCheckout } from '../lib/purchases';
import { buys, type Pack } from '../lib/credits';
import type { Short } from '../lib/wallet';
import { useLang } from '../lib/i18n';

export default function OutOfCredits({
  short,
  packs,
  onClose,
}: {
  /** Null when nothing is short, which is when this renders nothing at all. */
  short: Short | null;
  packs: readonly Pack[];
  onClose: () => void;
}): React.ReactElement | null {
  const { t } = useLang();
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  if (!short) return null;

  const missing = Math.max(0, short.need - short.balance);
  // The smallest pack that actually covers the gap, or the largest if none do.
  const enough = packs.find((one) => one.credits >= missing) ?? packs[packs.length - 1];

  const buy = async (pack: Pack): Promise<void> => {
    setProblem(null);
    setBusy(pack.id);
    const failed = await startCheckout({ kind: 'credits', pack: pack.id });
    if (failed) {
      setProblem(failed);
      setBusy(null);
    }
    // On success the browser leaves for the payment page, so there is nothing
    // to reset — and resetting would flash the button back for a moment first.
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl p-6 space-y-5 shadow-2xl my-auto">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xl font-black text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
              {t('credits.short', 'You are short by')} {missing}
            </p>
            <p className="text-sm text-zinc-400 leading-snug pt-1">
              {t('credits.shortNote', 'That needed')} {short.need},{' '}
              {t('credits.andYouHave', 'and you have')} {short.balance}.{' '}
              {t('credits.topUpNote', 'A pack never expires, and it is used before next month’s allowance.')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white flex-shrink-0"
            aria-label={t('credits.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {packs.map((pack) => {
            const answers = pack.id === enough.id;
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => void buy(pack)}
                disabled={busy !== null}
                className={`w-full text-left px-4 py-3 rounded-2xl border transition-all flex items-center justify-between gap-4 disabled:opacity-50 ${
                  answers
                    ? 'border-emerald-500 bg-emerald-500/[0.08]'
                    : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-600'
                }`}
              >
                <span className="min-w-0">
                  <span className={`block text-base font-black ${answers ? 'text-emerald-300' : 'text-white'}`}>
                    {pack.credits} {t('credits.credits', 'credits')}
                  </span>
                  <span className="block text-sm text-zinc-500 leading-snug">{buys(pack.credits)}</span>
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-lg font-black text-white tabular-nums">R{pack.rand}</span>
                  {busy === pack.id && <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />}
                </span>
              </button>
            );
          })}
        </div>

        {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

        <p className="text-xs text-zinc-600 leading-snug">
          {t(
            'credits.subNote',
            'A subscription is the cheaper way to get the first few hundred every month. A pack is for the month you needed more than usual.',
          )}
        </p>
      </div>
    </div>
  );
}
