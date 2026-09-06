'use client';

/**
 * The advertisement for the advertising desk.
 *
 * ── What a sales screen inside an app has to do differently ──────────────
 *
 * A landing page is read by somebody deciding whether to try the product. This
 * is read by somebody already inside it, who has just written an advert and
 * hit a wall. That person does not need convincing that the app is good — they
 * need to know exactly what is behind the wall, exactly what it costs, and to
 * not feel that the thing they were using has been taken away from them.
 *
 * So the brief and the ad writer stay open, and this says so. Selling by
 * removing something somebody was already using is how an app loses the
 * customer it already had.
 *
 * ── And what it must not do ──────────────────────────────────────────────
 *
 * Not one sentence here promises anything that is not built. No "coming soon",
 * no automatic posting to platforms this app cannot post to. The queue reminds
 * you; the page says it reminds you. Anything else and the first month's
 * refund request writes itself.
 */

import React, { useState } from 'react';
import { ChevronDown, Lock, Check, Loader2, Sparkles } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { MARKETING, MARKETING_INCLUDES } from '../lib/addons';
import { startCheckout } from '../lib/purchases';
import { priceOf, type Unlocked } from '../lib/unlocked';
import Note from './Note';

export default function AddOn({
  what,
  onBought,
}: {
  readonly what: Unlocked;
  /** Called after the browser comes back from a checkout, to ask again. */
  readonly onBought?: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /**
   * Shut, until somebody wants to know.
   *
   * This panel is the single biggest thing on the advert desk — measured at
   * about half of the room's prose before anybody had pressed anything, in a
   * room whose job is writing an advert rather than buying one. That is a
   * sales page standing in front of a tool.
   *
   * Not folded behind a hint mark, which is for explaining a control: this is
   * an offer, and an offer reduced to a question mark is an offer nobody
   * takes. A name, a price and a chevron — which is what the screenshots do
   * with everything — leaves it findable and stops it being the room.
   */
  const [open, setOpen] = useState(false);

  const rand = priceOf(what, MARKETING, 199);

  const buy = async () => {
    setProblem(null);
    setBusy(true);
    const failed = await startCheckout({ kind: 'addon', addon: MARKETING });
    setBusy(false);
    if (failed) setProblem(failed);
    else onBought?.();
  };

  return (
    <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent p-5 space-y-4">
      {/* The whole panel opens from its own heading, so the price is visible
          shut and the case for it is one press away. */}
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15">
          <Sparkles className="h-5 w-5 text-emerald-400" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-black leading-tight tracking-tight text-white">
            {t('addon.title', 'The marketing desk')}
          </span>
          <span className="block text-sm text-zinc-400">
            R{rand} {t('addon.perMonth', 'a month')}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <p className="text-sm text-zinc-400 leading-relaxed">
          {t(
            'addon.pitch',
            'An advert is the easy half. This is the other half: what you are actually selling, who buys it, what they are deciding between, and a week of posting with the days, the times and the platforms written down.',
          )}
        </p>
      )}

      {/* ── What is in it ─────────────────────────────────────────────── */}
      {open && (
      <ul className="space-y-1.5">
        {MARKETING_INCLUDES.map((key) => (
          <li key={key} className="flex items-start gap-2 text-sm text-zinc-300 leading-snug">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="min-w-0">{t(key, key)}</span>
          </li>
        ))}
      </ul>
      )}

      {/* ── What stays free, said before the price ─────────────────────
          Somebody reading a price is working out what they lose by saying no.
          Answering that first is honest and it is also the thing that stops
          this reading as a hostage note. */}
      {open && (
        <p className="text-xs text-zinc-500 leading-relaxed border-t border-zinc-800 pt-3">
          {t(
            'addon.stillFree',
            'The brief and the advert writer above stay open on every plan, including the free one. This add-on is the planning and the scheduling around them.',
          )}
        </p>
      )}

      {/* ── The price ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {open && (
          <div>
            <p className="text-2xl font-black text-white tabular-nums leading-none">R{rand}</p>
            <p className="text-xs text-zinc-500">{t('addon.perMonth', 'a month')}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => void buy()}
          disabled={busy}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {t('addon.buy', 'Unlock the marketing desk')}
        </button>
      </div>

      <Note className="text-xs text-zinc-500 leading-relaxed">{t(
          'addon.cancel',
          'Stops whenever you say so, from your account screen. What you have already planned stays where it is and you can still take it out of the queue after it lapses.',
        )}</Note>

      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

      {/* ── When it cannot be sold at all ─────────────────────────────
          Different from not having bought it. Somebody who has paid and is
          being shown this because a migration was missed needs to be told
          that, not sold to again. */}
      {!what.ready && (
        <p className="text-sm text-amber-400 leading-snug rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          {t(
            'addon.notReady',
            'This cannot be bought yet — the app is still being set up. If you have already paid for it, nothing is lost; it will appear once that is finished.',
          )}
        </p>
      )}
    </section>
  );
}
