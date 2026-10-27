'use client';

/**
 * "A newer FutureBox is ready · Reload", when the server has moved on.
 *
 * A tab keeps the screens it loaded; the server answers with whatever was
 * deployed last. Asked on opening, every five minutes, and whenever the app
 * comes back to the front (`/api/version`). Only offered, never forced: a
 * reload in the middle of an edit would lose the edit.
 */
import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { builtFrom } from '../lib/whichbuild';

const EVERY_MS = 5 * 60_000;

export default function NewVersion(): React.ReactElement | null {
  const { t } = useLang();
  const [behind, setBehind] = useState(false);

  useEffect(() => {
    const mine = builtFrom();
    if (!mine) return undefined;
    let alive = true;
    const look = async (): Promise<void> => {
      try {
        const got = await fetch('/api/version', { cache: 'no-store' }).then((r) => r.json()) as { sha?: string };
        if (alive && got.sha && got.sha !== mine) setBehind(true);
      } catch { /* offline: ask again later */ }
    };
    void look();
    const timer = window.setInterval(() => { void look(); }, EVERY_MS);
    const back = (): void => { if (document.visibilityState === 'visible') void look(); };
    document.addEventListener('visibilitychange', back);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', back); };
  }, []);

  if (!behind) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[210] flex justify-center px-4" style={{ top: 'calc(env(safe-area-inset-top) + 10px)' }} data-newversion>
      <p className="fb-notice pointer-events-auto inline-flex items-center gap-2 rounded-2xl border border-emerald-400/60 bg-zinc-950/95 py-1.5 pl-4 pr-1.5 text-[13px] font-semibold text-emerald-50 shadow-lg">
        {t('version.ready', 'A newer FutureBox is ready.')}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-xs font-bold text-black"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('version.reload', 'Reload')}
        </button>
      </p>
    </div>
  );
}
