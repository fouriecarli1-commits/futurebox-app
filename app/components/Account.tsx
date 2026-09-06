'use client';

/**
 * Everything about the account, in the place people look for it.
 *
 * ── Why this had to exist ────────────────────────────────────────────────
 *
 * All of it was already built and none of it was findable. The plan, what it
 * costs and the cancel button were inside the Channel room, three presses in,
 * under the playlists — because that is where the panel happened to be added.
 * Nobody looking for "what am I paying and how do I stop" goes to a room
 * called Channel; they press their own name in the corner.
 *
 * That press did nothing. It set the studio's room to Make a song, which
 * changes nothing at all unless the studio is already open, so pressing your
 * own name was a dead control on every screen.
 *
 * So this is not new machinery. It is `Subscription`, the wallet and the plan
 * table brought together behind the press people were already making.
 *
 * ── What is deliberately not here ────────────────────────────────────────
 *
 * The question box and the answering copilot. Both are on Help, which is one
 * press away and is where somebody looks for them; a second copy here would be
 * a second thing to keep true. Deleting the account stays on the channel, for
 * a harder reason: a destructive, irreversible control in two places is one
 * place too many, and the one it is in already explains what goes with it.
 * Both are linked rather than copied.
 */

import React, { useEffect, useState } from 'react';
import { X, CreditCard, Sparkles, LifeBuoy, ArrowRight, Mail, ListMusic, Brain, Loader2 } from 'lucide-react';
import RecordingName from './RecordingName';
import Connections from './Connections';
import DeleteAccount from './DeleteAccount';
import type { Creator } from '../lib/radar';
import { useLang } from '../lib/i18n';
import { TIER_SPECS, tierPrice, type Tier } from '../lib/plans';
import type { Region } from '../lib/pricing';
import { loadWallet, NO_WALLET, type Wallet } from '../lib/wallet';
import { loadTaste, forgetTaste, NO_TASTE, type Taste } from '../lib/taste';
import Subscription from './Subscription';
import Note from './Note';

export default function Account({
  open,
  onClose,
  email,
  name,
  handle,
  plan,
  region,
  onSeePlans,
  onGoToChannel,
  onNamed,
  onSignOut,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  /** Leaving, from the screen a person comes to for account things. */
  readonly onSignOut: () => void;
  readonly email?: string;
  readonly name?: string;
  readonly handle?: string;
  readonly plan: Tier;
  readonly region: Region;
  readonly onSeePlans: () => void;
  readonly onGoToChannel: () => void;
  /** The saved row, so the app above can redraw the name it is showing. */
  readonly onNamed?: (creator: Creator) => void;
}): React.ReactElement | null {
  const { t, lang } = useLang();
  const [wallet, setWallet] = useState<Wallet>(NO_WALLET);
  /** Null until the first answer, so a real balance never flashes as zero. */
  const [asked, setAsked] = useState(false);
  const [taste, setTaste] = useState<Taste>(NO_TASTE);
  const [forgetting, setForgetting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void loadWallet().then((got) => {
      if (!live) return;
      setWallet(got);
      setAsked(true);
    });
    void loadTaste().then((got) => {
      if (live) setTaste(got);
    });
    return () => {
      live = false;
    };
  }, [open]);

  // Escape closes it, like every other overlay in this app.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const spec = TIER_SPECS[plan];
  const price = tierPrice(plan, region);

  return (
    <div
      /* The bottom padding clears the tab bar, which sits over this panel so
         somebody can leave it by pressing a tab rather than hunting for an X. */
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 pb-24 sm:p-6 sm:pb-24 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t('account.title', 'Your account')}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl my-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7 space-y-5">
        {/* ── Who ────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-cyan-500 text-onAccent font-black flex items-center justify-center text-lg flex-shrink-0">
              {(name ?? email ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-black text-white leading-tight truncate">
                {name || t('account.title', 'Your account')}
              </p>
              {/* The address they signed up with, which is the thing somebody
                  opening this screen most often wants to check. */}
              <p className="text-sm text-zinc-400 truncate flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                {email || '—'}
              </p>
              {handle && <p className="text-sm text-emerald-400 truncate">{handle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('account.close', 'Close')}
            className="min-h-[44px] min-w-[44px] rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── The name your work goes out under ──────────────────────────

            On this screen because this is where somebody looks for their own
            name, and it is the same component the channel carries. The name in
            the corner of the app used to be a fragment of a sign-up email with
            nowhere to change it; the one on their releases was somewhere else
            entirely. Both are this. */}
        <RecordingName onSaved={(row) => onNamed?.(row)} compact />

        {/* ── Where else you are ─────────────────────────────────────────

            "ek dink binne iemand se profile moet al die connection buttons
             wees."

            They were inside the Collab Radar, behind a panel about how
            matches are computed. That is a fine place to be reminded a handle
            makes a link work and a strange place for the only screen in the
            app where somebody says who they are elsewhere. Directly under the
            name their work goes out under, which is the thing it is about. */}
        <Connections />

        {/* ── The plan ───────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              {t('account.plan', 'Your plan')}
            </p>
            <p className="text-sm text-zinc-400 tabular-nums">
              <span className="text-white font-bold">{spec.name}</span>
              {plan !== 'free' && ` · ${price.display} ${t('account.aMonth', 'a month')}`}
            </p>
          </div>
          {/* Same dictionary keys as the sales page, so the plan somebody
              bought is described to them in the same words they bought it in. */}
          <p className="text-sm text-zinc-500 leading-snug">{t(`plan.${spec.id}.who`, spec.who)}</p>
          <ul className="text-sm text-zinc-400 space-y-1">
            {spec.includes.slice(0, 4).map((one, i) => (
              <li key={one} className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">·</span>
                <span>{t(`plan.${spec.id}.inc.${i}`, one)}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSeePlans();
            }}
            className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold inline-flex items-center justify-center gap-2"
          >
            {plan === 'free'
              ? t('account.seePlans', 'See the plans')
              : t('account.changePlan', 'Change your plan')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>

        {/* ── What is left in the wallet ─────────────────────────────────── */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
          <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            {t('account.credits', 'Credits')}
          </p>
          {/* Held blank rather than shown as zero until the answer arrives: a
              real balance flashing as nothing is how somebody decides the app
              has lost their money. */}
          {/* And the three ways there is no number are three different
              sentences. `wallet.ts` keeps them apart on purpose — a request
              that never arrived used to look exactly like a working free
              account — so this screen keeps them apart too. */}
          {!asked ? (
            <p className="text-2xl font-black text-white tabular-nums">&nbsp;</p>
          ) : wallet.failed ? (
            <p className="text-sm text-amber-400 leading-snug">
              {t(
                'account.creditsUnreachable',
                'Your balance could not be fetched just now. Nothing has been spent — try again in a moment.',
              )}
            </p>
          ) : !wallet.metered ? (
            <Note>{t('account.creditsOff', 'This app has no accounts set up, so nothing is counted.')}</Note>
          ) : (
            <>
              <p className="text-2xl font-black text-white tabular-nums">{wallet.balance}</p>
              {wallet.monthly > 0 && (
                <p className="text-sm text-zinc-500 tabular-nums">
                  {wallet.monthly} {t('account.creditsMonthly', 'a month on this plan')}
                </p>
              )}
            </>
          )}
          <Note>{t(
              'account.creditsNote',
              'What a generation costs is said on the button before you press it. Credits from your plan land each month; anything you buy on top does not expire.',
            )}</Note>
        </section>

        {/* ── What the app has noticed, and a way to make it stop ────────── */}
        {taste.ready && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Brain className="w-4 h-4 text-emerald-400" />
              {t('account.taste', 'What the app has noticed')}
            </p>
            {/* Shown in full, because a screen that says "we remember some
                things about you" without saying which is worse than one that
                says nothing. It is a short list on purpose — there is nothing
                here but counts. */}
            {taste.lines.length === 0 ? (
              <Note>{t('account.tasteNone', 'Nothing yet. Make a few things and it will start suggesting the kind you actually make.')}</Note>
            ) : (
              <ul className="text-sm text-zinc-400 space-y-1">
                {taste.lines.slice(0, 8).map((one) => (
                  <li key={`${one.kind}:${one.label}`} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {one.label}
                      <span className="text-zinc-600">
                        {' '}
                        · {one.kind === 'genre'
                          ? t('account.tasteGenre', 'what you make')
                          : t('account.tasteRoom', 'where you work')}
                      </span>
                    </span>
                    <span className="tabular-nums text-zinc-500 flex-shrink-0">
                      {one.times}×
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Note className="text-xs text-zinc-500 leading-relaxed">{t(
                'account.tasteNote',
                'A count of each kind and when it last happened — not a record of when you work. It is what lets the welcome screen and the copilot suggest the kind of thing you actually make, on any device you sign in on.',
              )}</Note>
            {taste.lines.length > 0 && (
              <button
                type="button"
                disabled={forgetting}
                onClick={() => {
                  setForgetting(true);
                  void forgetTaste().then((done) => {
                    setForgetting(false);
                    if (done) setTaste({ lines: [], ready: true });
                  });
                }}
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white inline-flex items-center gap-2 disabled:opacity-60"
              >
                {forgetting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('account.tasteForget', 'Clear this and start again')}
              </button>
            )}
          </section>
        )}

        {/* ── The subscription itself, and the way out of it ─────────────── */}
        <Subscription />

        {/* ── Where the other two things live ────────────────────────────── */}
        <section className="border-t border-zinc-800 pt-4 space-y-2">
          <a
            href="/help"
            className="min-h-[44px] rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 flex items-center gap-3 hover:border-emerald-500/60 hover:text-white text-zinc-300"
          >
            <LifeBuoy className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight">
                {t('account.help', 'A question, or a problem')}
              </span>
              <span className="block text-xs text-zinc-500 leading-snug">
                {t(
                  'account.helpNote',
                  'Ask about the app, your plan or a charge and get an answer here — or write to a person.',
                )}
              </span>
            </span>
          </a>
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToChannel();
            }}
            className="w-full min-h-[44px] rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 flex items-center gap-3 text-left hover:border-emerald-500/60 hover:text-white text-zinc-300"
          >
            <ListMusic className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight">
                {t('account.channel', 'Your channel and your picture')}
              </span>
              <span className="block text-xs text-zinc-500 leading-snug">
                {t(
                  'account.channelNote',
                  'Your songs, your playlists, your profile picture.',
                )}
              </span>
            </span>
          </button>
        </section>

        {/* The engine bill used to be here, and is gone.

            "haal die elevenlabs en kling kaart heeltemal uit."

            It appeared the hour OWNER_EMAIL was set and read, from her side,
            as the app putting two suppliers' names on her own profile. It was
            hers and only hers — no member ever had it — and it was still the
            wrong thing on this screen. Removed rather than folded: the whole
            chain behind it went too, because a route that assembles somebody's
            spend and sends it to nothing is worse than one that never did.

            What it told her lives where an operator actually looks for a bill:
            the ElevenLabs and Kling dashboards, and `/api/analyse/setup`. */}

        {/* ── Deleting the account ─────────────────────────────────────

            Here, and last, and nowhere else.

            It used to sit in the channel, between a help link and the copilot
            — a red button in the middle of the room somebody works in, which
            is the one place it must never be. Carli: "mense gaan dit per
            ongeluk druk en alles gaan delete." A destruction somebody can
            reach by mistake is not a feature, it is a trap.

            This screen is where a person comes to deal with their account
            rather than to make something, and the bottom of it is where they
            arrive last. The confirmation — typing your own address — stays
            where it is, and is now the second thing standing between somebody
            and losing everything rather than the only one. */}
        {/* Signing out, above deleting.

            It lived only in the page header, which the front door covers — so
            once landing on Make became the rule, the way out of an account was
            behind the first screen somebody sees. This is where account things
            live now; the header keeps its copy for anybody already looking at
            the feed.

            Above the delete, and drawn quietly, because they are the two
            buttons on this screen nobody wants to press by accident and the
            gentler one should not be the harder to find. */}
        <section className="pt-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="min-h-[44px] w-full rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-300 hover:border-zinc-500 hover:text-white"
          >
            {t('auth.signOut', 'Sign out')}
          </button>
        </section>

        {email && (
          <section className="pt-1">
            <DeleteAccount email={email} />
          </section>
        )}

        <p className="text-xs text-zinc-600 leading-relaxed">
          {t('account.legal', 'The')}{' '}
          <a href="/terms" className="underline hover:text-zinc-400">
            {t('account.terms', 'terms')}
          </a>{' '}
          {t('account.and', 'and the')}{' '}
          <a href="/privacy" className="underline hover:text-zinc-400">
            {t('account.privacy', 'privacy notice')}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
