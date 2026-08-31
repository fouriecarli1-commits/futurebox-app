'use client';

/**
 * The only place a top-up price is ever shown.
 *
 * Not on the billing page, not in a menu, not beside the plans. Prices belong
 * where somebody is asking, and there are exactly two moments when they are:
 *
 *   **Refused.** They asked for something and were told they were short. It
 *   says by how much, and the smallest pack that clears the gap is drawn as
 *   the answer — making somebody work out which of three numbers covers a
 *   shortfall of forty is a needless sum at the worst moment.
 *
 *   **Asking.** They pressed their own balance to buy more. Nothing is short,
 *   nothing needs clearing, and no pack is the answer because there is no
 *   question. It says what they have and shows the shelf.
 *
 * Those two need different words, and until now they shared one set: opening
 * it from the balance with 1570 credits read "You are short by 0. That needed
 * 0, and you have 1570." A panel that reports a shortfall of nothing to
 * somebody who is not short reads as a bug, because it is one.
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

  // `need: 0` is how the balance chip opens this: a request to see the shelf,
  // not a refusal to explain.
  const refused = short.need > 0;
  const missing = Math.max(0, short.need - short.balance);
  // The smallest pack that actually covers the gap, or the largest if none do.
  // Nothing is highlighted when nothing was refused — there is no answer to
  // point at when no question was asked.
  const enough = refused
    ? packs.find((one) => one.credits >= missing) ?? packs[packs.length - 1]
    : null;

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
              {refused
                ? `${t('credits.short', 'You are short by')} ${missing}`
                : `${short.balance} ${t('credits.youHave', 'credits')}`}
            </p>
            <p className="text-sm text-zinc-400 leading-snug pt-1">
              {refused ? (
                <>
                  {t('credits.shortNote', 'That needed')} {short.need},{' '}
                  {t('credits.andYouHave', 'and you have')} {short.balance}.{' '}
                </>
              ) : (
                <>{t('credits.browsing', 'Nothing is short — this is the shelf.')} </>
              )}
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
            const answers = enough !== null && pack.id === enough.id;
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

        {/* Said plainly, because it is true and because a pack that quietly
            undercut the plans would make the plans pointless. */}
        <p className="text-xs text-zinc-500 leading-snug">
          {t(
            'credits.subNote',
            'A pack costs more per credit than any monthly plan — it is for the month you needed more than usual. If you need more every month, a plan is the cheaper way.',
          )}
        </p>
      </div>
    </div>
  );
}
