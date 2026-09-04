'use client';

/**
 * What you are paying, and one button that stops it.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * `app/api/subscription/route.ts` has been complete since it was written. It
 * reports the plan, what is next and when, and it disables the arrangement at
 * Paystack. Its own opening comment says why:
 *
 *     "A subscription somebody cannot see and cannot cancel from inside the
 *      app is a subscription they will cancel at their bank instead, and then
 *      ask for their money back."
 *
 * Nothing ever called it. Searched the whole app: no `.tsx` outside `app/api`
 * mentions the word. The route argued for one button and the button was never
 * built, so every member's only way out was their bank — which is a chargeback,
 * a fee, and a mark against the merchant account.
 *
 * Found while wiring the cancellation letter, because a letter for an event
 * that cannot happen is not a feature.
 *
 * ── The confirmation ─────────────────────────────────────────────────────
 *
 * One step, not a funnel. No offer, no survey, no "are you sure you want to
 * lose access to…". Somebody who came here to cancel has decided, and an app
 * that makes leaving hard is an app people warn their friends about. The
 * confirmation exists only because the button is irreversible from here.
 *
 * ── What it promises, exactly ────────────────────────────────────────────
 *
 * That the month already paid for is not cut short, because that is what the
 * route actually does — Paystack's "disable" stops the next charge and leaves
 * the current period alone. Saying "your access ends now" would be wrong, and
 * saying "you keep it forever" would be worse.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Loader2, Check } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { refusalText } from '../lib/apierror';
import { useLang } from '../lib/i18n';

interface State {
  readonly subscribed: boolean;
  readonly tier?: string;
  readonly name?: string;
  readonly status?: string;
  readonly nextPaymentAt?: string | null;
  readonly cancellable?: boolean;
}

export default function Subscription(): React.ReactElement | null {
  const { t, lang } = useLang();
  const [state, setState] = useState<State>({ subscribed: false });
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await accessToken();
    const response = await fetch('/api/subscription', {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    }).catch(() => null);
    if (!response?.ok) return;
    setState((await response.json()) as State);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Nothing to show somebody who is not paying anything.
  if (!state.subscribed) return null;

  const when = state.nextPaymentAt ? new Date(state.nextPaymentAt).toLocaleDateString() : null;

  const stop = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const token = await accessToken();
      // The language goes with the request so the letter is in it. The server
      // has no other way to know — see `lib/server/letters.ts`.
      const response = await fetch(`/api/subscription?lang=${lang}`, {
        method: 'DELETE',
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      });
      const said = (await response.json().catch(() => ({}))) as {
        stopped?: boolean;
        error?: string;
        message?: string;
      };
      if (!response.ok || !said.stopped) {
        setProblem(refusalText(said, lang, t('sub.failed', 'That could not be stopped just now.')));
        return;
      }
      setDone(true);
      setAsking(false);
      void load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <CreditCard className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-200">
            {t('sub.title', 'What you are paying')}
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {state.name}
            {state.status === 'non-renewing'
              ? when
                ? ` — ${t('sub.endsOn', 'ends on')} ${when}, ${t('sub.noMore', 'nothing further is charged')}`
                : ` — ${t('sub.ending', 'ending, nothing further is charged')}`
              : when
                ? ` — ${t('sub.nextOn', 'next payment')} ${when}`
                : ''}
          </p>
        </div>
      </div>

      {done && (
        <p className="text-sm text-emerald-300 flex items-center gap-1.5">
          <Check className="w-4 h-4 flex-shrink-0" />
          {t('sub.stopped', 'Stopped. Nothing further will be charged, and a confirmation is on its way to your inbox.')}
        </p>
      )}

      {state.cancellable && !done && !asking && (
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-600"
        >
          {t('sub.stop', 'Stop the monthly payment')}
        </button>
      )}

      {asking && !done && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3 space-y-2.5">
          <p className="text-sm text-zinc-300 leading-relaxed">
            {t(
              'sub.sure',
              'This stops the next payment. The month you have already paid for is not cut short and is not refunded — you keep everything you are on until it ends.',
            )}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void stop()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/60 bg-rose-500/10 px-3.5 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t('sub.confirm', 'Yes, stop it')}
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              disabled={busy}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm font-semibold text-zinc-400 hover:text-white disabled:opacity-50"
            >
              {t('sub.keep', 'Keep it')}
            </button>
          </div>
        </div>
      )}

      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
    </section>
  );
}
