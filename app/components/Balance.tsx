'use client';

/**
 * What is left, in the header.
 *
 * A number, not a meter — nothing here fills up or turns red at 20%. It says
 * what it says, and clicking it opens the packs. That click is the one place
 * outside running out where a price is shown, and it is the same moment
 * really: somebody who looks at their balance and reaches for it already knows
 * they are running low.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { loadWallet, NO_WALLET, type Wallet } from '../lib/wallet';
import { useLang } from '../lib/i18n';

export default function Balance({
  reloadKey,
  onTopUp,
}: {
  /** Bumped whenever something was spent, so the number follows. */
  reloadKey: number;
  onTopUp: (wallet: Wallet) => void;
}): React.ReactElement | null {
  const { t } = useLang();
  const [wallet, setWallet] = useState<Wallet>(NO_WALLET);
  /** Null until the first answer arrives, so nothing flashes on the way in. */
  const [asked, setAsked] = useState(false);

  const load = useCallback(() => {
    loadWallet().then((next) => {
      setWallet(next);
      setAsked(true);
    });
  }, []);

  useEffect(load, [load, reloadKey]);

  // Nothing to show before the first answer, or when this app has no accounts
  // at all — there is nothing being counted then and a zero would be a lie.
  if (!asked || !wallet.metered) return null;

  // Could not ask at all: a dash, not nothing. A silent disappearance is how a
  // broken /api/credits came to look exactly like a working free account.
  if (wallet.failed) {
    return (
      <span
        title={t('credits.cannotAsk', 'Could not read your credits just now')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-sm font-bold text-zinc-600"
      >
        <Zap className="w-3.5 h-3.5" />
        <span>—</span>
      </span>
    );
  }

  if (!wallet.signedIn) return null;

  const low = wallet.monthly > 0 && wallet.balance < wallet.monthly * 0.15;

  return (
    <button
      type="button"
      onClick={() => onTopUp(wallet)}
      title={t('credits.balanceTitle', 'What you have left to spend')}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-sm font-bold transition-all ${
        low
          ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
          : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600'
      }`}
    >
      <Zap className={`w-3.5 h-3.5 ${low ? 'text-amber-400' : 'text-emerald-400'}`} />
      <span className="tabular-nums">{wallet.balance}</span>
    </button>
  );
}
