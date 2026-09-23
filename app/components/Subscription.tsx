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
import { CreditCard, Loader2, Check, Pencil } from 'lucide-react';
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

  /* Somebody who is not paying anything.
 
     This used to render nothing at all, which is defensible — there is no
     subscription to cancel — and is exactly why Carli asked "waar is die
     unsubscribe button?". A person looking for the way out of a payment does
     not conclude "I must not have one" from an absence; they conclude the
     button is hidden, which is the reputation this panel exists to avoid.
 
     So it says so. One line, and it names where a charge would show if there
     ever were one. */
  if (!state.subscribed) {
    return (
      <p className="text-sm text-zinc-500 leading-snug">
        {t(
          'sub.none',
          'You are not on a paid plan, so there is nothing to cancel. If you ever are, the button to end it is here, on this screen.',
        )}
      </p>
    );
  }

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

  /* ── Changing the card ────────────────────────────────────────────────
 
     Carli, 23 September 2026: *"En met billing, dat hulle hul billing
     information kon verander?"* Seeing the arrangement and stopping it were
     both here; changing the card it is charged to was not — and a card
     expires long before anybody wants to leave, so the ordinary end of a
     membership here was a failed renewal and a plan that quietly stopped.
 
     A link to Paystack's own page rather than a card form on this screen. A
     card number typed into a field this app renders is a card number in this
     app's DOM, in its error reports, and in its scope for PCI, and none of
     that buys anything: the checkout already keeps every card at Paystack
     and this keeps the second one there too.
 
     Opened in this tab rather than a new one. A payment page in a popup is
     the one thing a phone's browser is most likely to block, and somebody
     who pressed a button and saw nothing happen concludes the app is broken
     rather than that the window was blocked. */
  const changeCard = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const token = await accessToken();
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      });
      const said = (await response.json().catch(() => ({}))) as {
        link?: string;
        error?: string;
        message?: string;
      };
      if (!response.ok || !said.link) {
        setProblem(refusalText(said, lang, t('sub.cardFailed', 'That page could not be opened just now.')));
        return;
      }
      window.location.href = said.link;
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

      {/* Above the way out, and on purpose. Somebody whose card has expired
          has come here to fix that, not to leave — and a screen that offers
          only "stop the payment" turns an expired card into a cancellation. */}
      {state.cancellable && !done && !asking && (
        <button
          type="button"
          onClick={() => void changeCard()}
          disabled={busy}
          data-changecard
          className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-emerald-500 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
          {t('sub.changeCard', 'Change the card')}
        </button>
      )}
      {state.cancellable && !done && !asking && (
        <p className="text-sm text-zinc-500 leading-snug">{t('sub.cardWhere')}</p>
      )}

      {state.cancellable && !done && !asking && (
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-600"
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
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-rose-500/60 bg-rose-500/10 px-3.5 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
            >
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t('sub.confirm', 'Yes, stop it')}
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              disabled={busy}
              className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm font-semibold text-zinc-400 hover:text-white disabled:opacity-50"
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
