'use client';

/**
 * How many people are on the site right now.
 *
 * Under the logo, because that is where somebody looks to see whether a place
 * is alive. It is a real number: every open tab says hello every half minute
 * and the count is of the ones that said hello in the last two minutes. Close
 * the tab and you drop out of it within two minutes.
 *
 * It shows nothing at all when there is no database behind it. A hard-coded
 * "1 person here" would be the kind of small lie that makes everything else on
 * a page worth doubting, and an empty space says less but says it truthfully.
 */

import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { visitorId } from '../lib/signal';
import { useLang } from '../lib/i18n';

/** Often enough that the two-minute window never closes on an open tab. */
const EVERY_MS = 30_000;

export default function HereNow(): React.ReactElement | null {
  const { t } = useLang();
  const [here, setHere] = useState<number | null>(null);

  useEffect(() => {
    let live = true;

    const hello = async (): Promise<void> => {
      // A tab in the background is not somebody on the site, and telling the
      // server otherwise would inflate the number all day.
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await fetch('/api/here', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitor: visitorId() }),
        });
        if (!live) return;
        if (response.status === 204) {
          setHere(null);
          return;
        }
        const body = (await response.json()) as { here?: number };
        if (live && typeof body.here === 'number') setHere(body.here);
      } catch {
        // Offline, or the route is not there. Say nothing rather than a zero.
      }
    };

    void hello();
    const timer = window.setInterval(() => void hello(), EVERY_MS);
    document.addEventListener('visibilitychange', hello);
    return () => {
      live = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', hello);
    };
  }, []);

  if (here === null) return null;

  return (
    <span
      className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-zinc-400"
      title={t('here.title', 'People on FutureBox right now')}
    >
      <Eye className="w-3 h-3 text-emerald-400" />
      <span className="tabular-nums text-emerald-400 font-bold">{here.toLocaleString()}</span>
      <span>{here === 1 ? t('here.one', 'here now') : t('here.many', 'here now')}</span>
    </span>
  );
}
