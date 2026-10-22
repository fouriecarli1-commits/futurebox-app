'use client';

/**
 * The owner's Cubed³ desk, in the You tab, seen by her alone.
 *
 * The owner, 22 October 2026: *"Die presenter blad moet op my as eienaar se
 * app skerm wees, dalk in You. Sodat ek kan sien hoe lyk dit en die
 * applications in real time kan besigtig."* Two doors: the presenter page as
 * a presenter sees it (a preview that saves nothing), and the inbox, which
 * keeps itself up to date. The counts here are read again every thirty
 * seconds while the tab is on screen.
 *
 * Shown only when the owner's door answers. Everybody else asks once, gets a
 * 404 and sees nothing; somebody signed out does not ask at all.
 */
import React, { useEffect, useState } from 'react';
import { Eye, Inbox } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { PHOTO } from '../lib/photolook';

interface Line { readonly openedAt: string | null; readonly signedAt: string | null; readonly revokedAt: string | null }

export default function OwnerCubed(): React.ReactElement | null {
  const [lines, setLines] = useState<readonly Line[] | null>(null);

  useEffect(() => {
    let live = true;
    let token = '';
    const read = async (): Promise<void> => {
      if (document.visibilityState !== 'visible') return;
      const answer = await fetch('/api/cubed/hosts', { headers: { Authorization: `Bearer ${token}` } });
      if (!answer.ok) return;
      const got = await answer.json() as { hosts?: Line[] };
      if (live) setLines(got.hosts ?? []);
    };
    let every = 0;
    void accessToken().then(async (one) => {
      if (!one || !live) return;
      token = one;
      const peek = await fetch('/api/cubed/hosts?peek=1', { headers: { Authorization: `Bearer ${token}` } });
      if (!peek.ok || !live) return;
      await read();
      every = window.setInterval(() => { void read(); }, 30_000);
    }).catch(() => undefined);
    return () => { live = false; window.clearInterval(every); };
  }, []);

  if (lines === null) return null;
  const current = lines.filter((one) => !one.revokedAt);
  const signed = current.filter((one) => one.signedAt).length;
  const busy = current.filter((one) => one.openedAt && !one.signedAt).length;
  const waiting = current.filter((one) => !one.openedAt).length;

  return (
    <section className="rounded-2xl border border-sky-400/30 p-4" style={{ background: PHOTO.floor }} data-ownercubed>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-bold text-white">Cubed³ presenters</p>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden /> Live · only you see this
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Signed', value: signed },
          { label: 'Filling in', value: busy },
          { label: 'Not opened', value: waiting },
        ].map((one) => (
          <div key={one.label} className="rounded-xl border border-white/10 bg-black/30 px-2 py-2.5">
            <dd className="text-2xl font-black text-white">{one.value}</dd>
            <dt className="text-xs text-zinc-400">{one.label}</dt>
          </div>
        ))}
      </dl>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <a href="/cubed/hosts" className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-sky-400/50 bg-sky-500/15 px-4 text-sm font-bold text-sky-50" data-ownercubedinbox>
          <Inbox className="h-4 w-4" /> Applications
        </a>
        <a href="/cubed/host#preview" className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-zinc-600 px-4 text-sm font-bold text-zinc-100" data-ownercubedpreview>
          <Eye className="h-4 w-4" /> See the presenter page
        </a>
      </div>
    </section>
  );
}
