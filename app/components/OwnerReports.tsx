'use client';

/**
 * The owner's open reports, in the You tab, seen by her alone.
 *
 * Until 26 October 2026 a report reached her as an e-mail and nothing
 * else: reading it was easy, acting on it meant the database. This lists
 * the open ones, the urgent reasons first (`urgent()` in `lib/reports.ts`),
 * and gives each two presses:
 *
 *   Handled     — looked at, nothing to do.
 *   Take down   — the post comes out of the Live room, the account can no
 *                 longer sign in, and a record goes to her inbox. Steps 2
 *                 and 3 of `docs/CHILD-SAFETY-REPORTING.md`. It asks twice,
 *                 because suspending somebody is not a thing to do by a
 *                 slip of the thumb.
 *
 * Shown only when the owner's door answers, the same way as `OwnerCubed`.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Flag, ShieldAlert } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { PHOTO } from '../lib/photolook';
import { REPORT_REASONS, urgent, type ReportReason } from '../lib/reports';

interface Open {
  readonly id: number;
  readonly kind: string;
  readonly reason: ReportReason;
  readonly ref: string;
  readonly seen_in: string;
  readonly note: string;
  readonly created_at: string;
}

const reasonOf = (id: string): string => REPORT_REASONS.find((one) => one.id === id)?.says[1] ?? id;

export default function OwnerReports(): React.ReactElement | null {
  const [open, setOpen] = useState<readonly Open[] | null>(null);
  const [token, setToken] = useState('');
  const [arming, setArming] = useState<number | null>(null);
  const [said, setSaid] = useState('');

  const read = useCallback(async (with_: string): Promise<void> => {
    const answer = await fetch('/api/report', { headers: { Authorization: `Bearer ${with_}` } });
    if (!answer.ok) return;
    const got = await answer.json() as { reports?: Open[] };
    setOpen(got.reports ?? []);
  }, []);

  useEffect(() => {
    let live = true;
    void accessToken().then(async (one) => {
      if (!one || !live) return;
      setToken(one);
      await read(one);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [read]);

  const act = async (id: number, action: 'handled' | 'takedown'): Promise<void> => {
    setArming(null);
    const answer = await fetch('/api/report', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, action }),
    });
    const got = await answer.json().catch(() => ({})) as { removed?: boolean; suspended?: boolean; recorded?: boolean; message?: string };
    if (!answer.ok) {
      setSaid(got.message ?? 'That did not go through. Try again.');
      return;
    }
    setSaid(action === 'handled'
      ? `Report ${id} marked handled.`
      : [
        `Report ${id}:`,
        got.removed ? 'taken out of the Live room,' : 'nothing left in the Live room to take out,',
        got.suspended ? 'the account can no longer sign in,' : 'no account suspended,',
        got.recorded ? 'and the record is in your inbox.' : 'and the record could NOT be e-mailed — write down what happened.',
      ].join(' '));
    await read(token);
  };

  if (open === null) return null;

  return (
    <section className="rounded-2xl border border-rose-400/30 p-4" style={{ background: PHOTO.floor }} data-ownerreports>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-base font-bold text-white">
          <Flag className="h-4 w-4 text-rose-300" aria-hidden /> Reports
        </p>
        <span className="text-xs font-semibold text-zinc-400">{open.length} open · only you see this</span>
      </div>
      {said && <p className="mt-2 text-sm text-zinc-200" role="status" data-ownerreportssaid>{said}</p>}
      {open.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">Nothing waiting.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {open.map((one) => {
            const hot = urgent(one);
            const canTake = one.kind !== 'ai';
            return (
              <li key={one.id} className={`rounded-xl border px-3 py-3 ${hot ? 'border-rose-400/60 bg-rose-500/10' : 'border-white/10 bg-black/30'}`} data-ownerreport={one.id}>
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">
                  {hot && <ShieldAlert className="h-4 w-4 text-rose-300" aria-label="Urgent" />}
                  {reasonOf(one.reason)}
                  <span className="text-xs font-normal text-zinc-400">
                    {one.kind === 'ai' ? 'something the AI made' : one.kind === 'post' ? 'a post' : 'a member'}
                    {one.seen_in ? ` · ${one.seen_in}` : ''} · {new Date(one.created_at).toLocaleString()}
                  </span>
                </p>
                {one.note && <p className="mt-1 text-sm text-zinc-300">{one.note}</p>}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { void act(one.id, 'handled'); }}
                    className="min-h-[44px] rounded-xl border border-zinc-600 px-3 text-sm font-bold text-zinc-100"
                    data-ownerreporthandled
                  >
                    Handled
                  </button>
                  {canTake ? (
                    <button
                      type="button"
                      onClick={() => { if (arming === one.id) void act(one.id, 'takedown'); else setArming(one.id); }}
                      className={`min-h-[44px] rounded-xl border px-3 text-sm font-bold ${arming === one.id ? 'border-rose-300 bg-rose-500 text-white' : 'border-rose-400/60 text-rose-100'}`}
                      data-ownerreporttakedown
                    >
                      {arming === one.id ? 'Press again: remove and suspend' : 'Take down'}
                    </button>
                  ) : <span />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
