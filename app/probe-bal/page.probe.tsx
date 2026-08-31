'use client';
/**
 * The balance chip and the panel it opens, for `.probe/balance.mjs`.
 *
 * PROBE=1 only. It mounts both together because the bug worth checking lives
 * in the seam: pressing your own balance opens the same panel that a refusal
 * opens, and with 1,570 credits it used to read "You are short by 0". The chip
 * and the panel are each correct on their own; the wrong words come from which
 * of the two moments this is.
 *
 * The chip is wrapped in `#chip` so the check can read the chip rather than
 * the page. Reading the page is how this check quietly stopped working: a site
 * footer was added to the layout and every one of its eight exact-match
 * comparisons began to fail at once, for a reason that had nothing to do with
 * credits.
 */
import React, { useState } from 'react';
import Balance from '../components/Balance';
import OutOfCredits from '../components/OutOfCredits';
import { PACKS } from '../lib/credits';
import type { Short } from '../lib/wallet';

export default function P(): React.ReactElement {
  const [short, setShort] = useState<Short | null>(null);
  return (
    <div className="p-6">
      <div id="chip">
        <Balance
          reloadKey={0}
          // Exactly what the studio header does: opening the shelf, with
          // nothing owing. `need: 0` is what says which of the two this is.
          onTopUp={(wallet) => setShort({ need: 0, balance: wallet.balance, message: '' })}
        />
      </div>
      {/* And the other moment, reachable without a refusal happening. */}
      <button type="button" id="refuse" onClick={() => setShort({ need: 40, balance: 5, message: 'x' })}>
        pretend a refusal
      </button>
      <OutOfCredits short={short} packs={PACKS} onClose={() => setShort(null)} />
    </div>
  );
}
