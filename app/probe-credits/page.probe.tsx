'use client';
/**
 * The whole credit surface in one place, for `.probe/credits-ui.mjs`.
 *
 * PROBE=1 only. Where `probe-bal` isolates the chip, this one is the seam the
 * chip sits in: a balance in the header, a route refusing for want of credits,
 * the panel that opens, and a purchase leaving for the payment page.
 *
 * The packs come from the wallet rather than from `PACKS`, because the whole
 * point of the check is that prices are what the *server* said. A page that
 * drew the built-in list would pass while the server sent something else, and
 * a price the browser made up is the one thing a payment screen must never do.
 *
 * `#pretend-refused` stands in for a route answering 402. Reaching a genuine
 * refusal needs an account with a real empty balance, which this sandbox has
 * no way to make.
 */
import React, { useEffect, useState } from 'react';
import Balance from '../components/Balance';
import OutOfCredits from '../components/OutOfCredits';
import { loadWallet, NO_WALLET, type Short, type Wallet } from '../lib/wallet';
import { configured } from '../lib/cloud';

/** What the pretend refusal asked for. Twelve held against it is short by 18. */
const NEEDED = 30;

export default function P(): React.ReactElement {
  const [wallet, setWallet] = useState<Wallet>(NO_WALLET);
  const [short, setShort] = useState<Short | null>(null);

  useEffect(() => {
    loadWallet().then(setWallet);
  }, []);

  return (
    // Said out loud so the check can tell "the purchase is broken" apart
    // from "this build has no Supabase in it, so no session can exist".
    <div className="p-6 space-y-4" data-cloud={configured() ? 'yes' : 'no'}>
      <Balance
        reloadKey={0}
        onTopUp={(next) => setShort({ need: 0, balance: next.balance, message: '' })}
      />
      <button
        type="button"
        id="pretend-refused"
        onClick={() => setShort({ need: NEEDED, balance: wallet.balance, message: 'not enough credits' })}
      >
        pretend a route refused
      </button>
      <OutOfCredits short={short} packs={wallet.packs} onClose={() => setShort(null)} />
    </div>
  );
}
