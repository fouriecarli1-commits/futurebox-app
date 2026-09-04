'use client';

/**
 * The welcome page.
 *
 * One job: say what this is, in a line somebody remembers, and show what it
 * costs. Nothing else.
 *
 * It used to run the real scorer over a sample feed in front of the visitor.
 * That was an argument about honesty made to people who had not yet been told
 * what the product was — the proof of a claim nobody had heard. The proof
 * belongs inside, on every release, where it already is. Out here the job is
 * to be understood.
 *
 * Every claim is a thing that is built, and every price comes from `plans.ts`
 * — the same table the app enforces and the same one the checkout charges
 * from. A landing page quoting a number the code does not honour is the one
 * mistake here that cannot be argued away afterwards.
 */

import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Cpu } from 'lucide-react';
import WelcomeVideo from './WelcomeVideo';
import { guessRegion, REGIONS, type Region } from '../lib/pricing';
import { TIER_SPECS, TIERS, tierPrice } from '../lib/plans';
import { useLang } from '../lib/i18n';
import LanguagePicker from './LanguagePicker';

export default function Landing({
  onStart,
  onGoogle,
}: {
  onStart: () => void;
  /** Sign in with a Google account. Returns a reason when it cannot. */
  onGoogle: () => void;
}) {
  const { t } = useLang();
  const [region, setRegion] = useState<Region>(REGIONS[0]);

  // Guessed after mount, never during render: the server has no idea where the
  // visitor is, and a price that changes on hydration is a price nobody trusts.
  useEffect(() => {
    setRegion(guessRegion().region);
  }, []);

  const toPricing = () => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen">
      <header className="max-w-4xl mx-auto px-6 pt-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-onAccent" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              FUTURE<span className="text-emerald-400">BOX</span>
            </span>
          </div>
          <LanguagePicker />
        </div>
      </header>

      {/* ── The mark, at the size it deserves ─────────────────────────────
          The name is the first thing and it is drawn rather than mentioned:
          somebody who lands here and leaves in four seconds should still be
          able to say afterwards what it was called. The small mark stays in
          the header for every page below this one. */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-16 md:pt-20 md:pb-24">
        <div className="flex items-center gap-4 md:gap-5">
          <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center flex-shrink-0 shadow-[0_0_60px_rgba(16,185,129,0.25)]">
            <Cpu className="w-9 h-9 md:w-14 md:h-14 text-onAccent" />
          </div>
          <p className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tighter text-white leading-none">
            FUTURE<span className="text-emerald-400">BOX</span>
          </p>
        </div>

        <p className="text-xl md:text-2xl text-zinc-300 font-semibold pt-6 tracking-tight">
          {t('welcome.black', 'The black box of the future.')}
        </p>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.02] pt-8">
          {t('welcome.line1', 'Put your voice in.')}{' '}
          <span className="text-emerald-400">{t('welcome.line2', 'Take a record out.')}</span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 leading-relaxed pt-5 max-w-2xl">
          {t(
            'welcome.sub',
            'FutureBox is the black box of the future — the whole studio in one place. Write it with AI, sing it yourself, clone your voice for the show, and put a video to it.',
          )}
        </p>

        {/* ── What it gives you ───────────────────────────────────────────
            Six, each one a thing that is built and reachable from the rail
            inside. Nothing aspirational: a landing page listing a feature the
            code does not have is the one mistake here that cannot be argued
            away afterwards. */}
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3.5 pt-9 max-w-3xl">
          {[
            [t('welcome.offer1', 'Songs you sing on'), t('welcome.offer1n', 'Write it with the copilot, generate it, keep the stems')],
            [t('welcome.offer2', 'Your own voice, cloned'), t('welcome.offer2n', 'Read a script in it, with your consent on record')],
            [t('welcome.offer3', 'Podcasts with a real feed'), t('welcome.offer3n', 'A show Apple and Spotify will accept')],
            [t('welcome.offer4', 'Music videos'), t('welcome.offer4n', 'Drawn from your own audio, or made by the engine')],
            [t('welcome.offer5', 'Masterclasses'), t('welcome.offer5n', 'Real lectures, not a course somebody spun up')],
            [t('welcome.offer6', 'Collaboration'), t('welcome.offer6n', 'Ask another maker, and work in a room together')],
          ].map(([title, note]) => (
            <span key={title} className="flex gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-1" />
              <span className="min-w-0">
                <span className="block text-base text-zinc-200 font-semibold leading-snug">{title}</span>
                <span className="block text-sm text-zinc-500 leading-snug">{note}</span>
              </span>
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-9">
          <button
            type="button"
            onClick={onStart}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            {t('landing.startFree', 'Start free')}
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onGoogle}
            /* Literal white, deliberately outside the theme.

                 Google's sign-in button is theirs and their guidelines say what
                 it looks like: a white field with dark text beside their mark.
                 It is the one control here that must not follow a palette, so
                 the colours are written out rather than taken from a token —
                 and `check:theme` knows about this line by name. */
            className="px-5 py-3.5 rounded-xl bg-[#ffffff] text-[#1f1f1f] font-bold flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            {/* Google's own mark, drawn rather than fetched: an external image
                on the first screen is a request that can be slow or blocked. */}
            <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.2-3.8 6.6-9.5 6.6-16.2z" />
              <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.4s.3-3 .8-4.4l-7.8-6.1C1 17 0 20.4 0 24s1 7 2.6 10.1l7.8-5.4z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.4 0-11.7-3.7-13.6-9.1l-7.8 5.4C6.5 42.6 14.6 48 24 48z" />
            </svg>
            {t('welcome.google', 'Continue with Google')}
          </button>
          <button
            type="button"
            onClick={toPricing}
            className="px-4 py-3.5 text-zinc-400 hover:text-white font-semibold"
          >
            {t('welcome.seePlans', 'See the plans')}
          </button>
        </div>

        <p className="text-sm text-zinc-600 pt-5">
          {t('landing.noCard', 'No card to start. The free tier is a real one, not a trial.')}
        </p>

        {/* Below the buttons on purpose: somebody already convinced should
            reach the way in before they reach a ten-second wait. Renders
            nothing on the Afrikaans page — see WelcomeVideo. */}
        <div className="pt-12">
          <WelcomeVideo />
        </div>
      </section>

      {/* ── What it costs ─────────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16 border-t border-zinc-800/70 scroll-mt-8">
        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          {t('welcome.plansTitle', 'What it costs')}
        </h2>
        <p className="text-base text-zinc-400 pt-2 max-w-2xl leading-relaxed">
          {t(
            'welcome.plansNote',
            'A month at a time, cancelled from inside the app whenever you like. Everything included is a monthly allowance — songs, videos, and the voice work that goes with them.',
          )}
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-8">
          {TIERS.map((tier) => {
            const spec = TIER_SPECS[tier];
            const price = tierPrice(tier, region);
            // Studio is the one most people should be on, so it is the one
            // drawn to look like an answer rather than a column.
            const lead = tier === 'studio';
            return (
              <div
                key={tier}
                className={`rounded-2xl border p-5 flex flex-col ${
                  lead
                    ? 'border-emerald-500 bg-emerald-500/[0.06] shadow-[0_0_30px_rgba(16,185,129,0.12)]'
                    : 'border-zinc-800 bg-zinc-950/60'
                }`}
              >
                {lead && (
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 pb-1.5">
                    {t('welcome.most', 'Most people')}
                  </span>
                )}
                <p className="text-lg font-black text-white">{spec.name}</p>
                <p className="text-3xl font-black text-white pt-1.5 tabular-nums">
                  {spec.rand === 0 ? t('welcome.free', 'Free') : price.display}
                  {spec.rand > 0 && (
                    <span className="text-sm font-semibold text-zinc-500">
                      {' '}
                      /{t('welcome.month', 'month')}
                    </span>
                  )}
                </p>
                <p className="text-sm text-zinc-500 leading-snug pt-2">{spec.who}</p>

                <ul className="space-y-1.5 pt-4 flex-1">
                  {spec.includes.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-sm text-zinc-300 leading-snug">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      {line}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={onStart}
                  className={`w-full mt-5 py-2.5 rounded-xl text-sm font-bold ${
                    lead
                      ? 'bg-emerald-500 text-onAccent'
                      : 'bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300'
                  }`}
                >
                  {spec.rand === 0 ? t('landing.startFree', 'Start free') : t('welcome.choose', 'Choose')}{' '}
                  {spec.rand === 0 ? '' : spec.name}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-sm text-zinc-600 pt-6 max-w-2xl leading-relaxed">
          {t(
            'welcome.plansSmall',
            'Prices are in rand and converted for where you are. A month you have paid for runs to its end even if you cancel on the first day.',
          )}
        </p>
      </section>

      {/* The policy links used to sit here, because from outside there was
          no policy at all — which is what an outside assessment found. They
          are now in the site footer, below this one and on every page, so
          they are also reachable from the policy pages themselves. */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-zinc-800/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          {t('welcome.footer', 'Everything made here says what made it, on the release.')}
        </p>
      </footer>
    </div>
  );
}
