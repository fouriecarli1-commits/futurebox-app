'use client';

/**
 * The welcome page, and the door in it.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 13 October 2026, with the "Welcoming en login page" Google drew: an
 * obsidian page lit from behind by two blurred emerald and cyan pools and a
 * faint grid; a glass header with the mark, three anchors, the language
 * switch and two buttons; a hero in two columns — the pitch on the left, and
 * on the right a glass card that IS the sign-in, with its tabs, Google, and
 * the email form; a bar of six small facts; six glass feature cards; four
 * price cards with the middle one lit; a four-column footer; and on a phone
 * a glass bar along the bottom. That is this file.
 *
 * ── What was kept from before it, and why ────────────────────────────────
 *
 * One job: say what this is, in a line somebody remembers, and show what it
 * costs. Every claim is a thing that is built, and every price comes from
 * `plans.ts` — the same table the app enforces and the same one the checkout
 * charges from. A landing page quoting a number the code does not honour is
 * the one mistake here that cannot be argued away afterwards. So where
 * Google's page said "SOC2 Type II" and "99.99% uptime" and "14-day trial",
 * none of which is a thing this app has, the six facts in the bar are six
 * things it does have, and the prices are the four tiers as they are.
 *
 * ── Why the form in the card is not drawn here ───────────────────────────
 *
 * Google's card had its own form with an `alert()` behind the button. The
 * real one — Supabase, the six-digit code, the forgotten-password letter,
 * the kids-room door — lives in `page.tsx` with the state it needs, and is
 * handed in as `door`. This file draws the card around it and the tabs on
 * top of it, and nothing about signing in is decided here.
 */

import React, { useEffect, useState } from 'react';
import {
  Baby, Check, Cpu, LogIn, Lock, Tags,
} from 'lucide-react';
import WelcomeVideo from './WelcomeVideo';
import { hasWelcomeVideo } from '../lib/welcomevideo';
import {
  guessRegion, keepRegion, keptRegion, REGIONS, regionByCode, regionsByName,
  type Region,
} from '../lib/pricing';
import { TIER_SPECS, TIERS, tierPrice } from '../lib/plans';
import { useLang } from '../lib/i18n';
import LanguagePicker from './LanguagePicker';
import ThemeSwitch from './ThemeSwitch';
import KidsBanner from './KidsBanner';

type Mode = 'signin' | 'signup' | 'forgot';

/** The one gutter, counted by `check:voordeur`: every centred box on the page is this wide. */
const GUTTER = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';

/** A glass panel, as Google's page drew them: a dark wash, blur, a hairline. */
const GLASS = 'bg-zinc-900/75 backdrop-blur-xl border border-white/10';

export default function Landing({
  onStart,
  onSignIn,
  mode,
  onMode,
  door,
}: {
  /** "Get started": the card in create-account mode. */
  readonly onStart: () => void;
  /** "Sign in": the card in sign-in mode. */
  readonly onSignIn: () => void;
  /** Sign in with a Google account. Returns a reason when it cannot. */
  /** Kept on the type for `page.tsx`; the door carries Google's button itself. */
  readonly onGoogle?: () => void;
  /** Which face the card is showing. */
  readonly mode: Mode;
  readonly onMode: (mode: Mode) => void;
  /** The real sign-in form, drawn by `page.tsx`. */
  readonly door: React.ReactNode;
}) {
  const { t, lang } = useLang();
  const [region, setRegion] = useState<Region>(REGIONS[0]);
  /** Whether this is still only a guess, which decides whether it says so. */
  const [regionGuessed, setRegionGuessed] = useState(true);

  /* Guessed after mount, never during render: the server has no idea where the
     visitor is, and a price that changes on hydration is a price nobody
     trusts. A choice this visitor made before beats the guess — this is the
     page somebody reads BEFORE they have an account, so it is where a price
     in the wrong currency costs a sale rather than a support message. */
  useEffect(() => {
    const chosen = keptRegion();
    if (chosen) {
      setRegion(chosen);
      setRegionGuessed(false);
      return;
    }
    setRegion(guessRegion(lang).region);
    setRegionGuessed(true);
  }, [lang]);

  /* Kept on the device, so somebody who sets it here does not set it again
     inside the app. An empty value forgets the choice and goes back to the
     guess, which is the only way back once somebody has picked wrong. */
  const chooseRegion = (code: string): void => {
    if (code === '') {
      keepRegion(null);
      setRegion(guessRegion(lang).region);
      setRegionGuessed(true);
      return;
    }
    keepRegion(code);
    setRegion(regionByCode(code));
    setRegionGuessed(false);
  };

  /* `WelcomeVideo` draws NOTHING in a language with no recording — Afrikaans
     has one only if a variable is set in Vercel — so the section that holds
     it is opened by this question rather than assumed. `lib/welcomevideo.ts`
     owns the answer and the player acts on the same one; `check:voordeur`
     drives the two against each other. */
  const video = hasWelcomeVideo(lang);

  const to = (id: string) => (): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* The six rooms, each one built and reachable from the rail inside. */

  /* Six things the app can promise, because each one is in the code. */

  const doorTitle = mode === 'signin'
    ? t('landing.doorSignIn', 'Sign in to FutureBox')
    : mode === 'forgot'
      ? t('landing.doorForgot', 'Get back into your account')
      : t('landing.doorCreate', 'Create your FutureBox account');

  return (
    <div className="relative min-h-screen pb-20 md:pb-0" data-landing>
      {/* ── The light behind the page ─────────────────────────────────
          Two pools of colour blurred past recognition and a faint grid,
          fixed, so the page scrolls over them. They are decoration, which
          is why they cannot be pointed at. */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-emerald-600/20 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-cyan-600/15 blur-[150px]" />
        <div className="absolute bottom-10 left-1/4 h-80 w-80 rounded-full bg-emerald-900/20 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundSize: '40px 40px',
            backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
          }}
        />
      </div>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-40 w-full ${GLASS} border-x-0 border-t-0`}>
        <div className={`${GUTTER} flex h-20 items-center justify-between gap-3`}>
          <button type="button" onClick={to('top')} className="flex items-center gap-3 text-left">
            {/* The app icon's own tile (`scripts/icon.mjs`): green, lit, the
                chip black. Carli, 13 October 2026: "die groen om die icon
                moet brighter en neon wees, en die swart lyne bly swart". */}
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-500 shadow-[0_0_18px_rgba(5,255,147,0.55)]">
              <Cpu className="h-5 w-5 text-onAccent" />
            </span>
            <span>
              {/* The word is hidden on a phone: beside the language switch
                  and the one button, 390 pixels holds the mark or the name,
                  and the name is drawn large again four lines below. */}
              <span className="hidden text-xl font-black tracking-wider text-white sm:inline">
                FUTURE<span className="text-emerald-400">BOX</span>
              </span>
              <span className="ml-2 hidden rounded-full border border-emerald-500/30 bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400 sm:inline-block">
                AI Studio
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-300 md:flex" aria-label={t('landing.navPlatform', 'Platform')}>
            <button type="button" onClick={to('pricing')} className="min-h-[44px] transition-colors hover:text-emerald-400">{t('landing.navPricing', 'Pricing')}</button>
            <button type="button" onClick={to('kids')} className="min-h-[44px] transition-colors hover:text-emerald-400">{t('landing.navKids', 'Kids')}</button>
            <LanguagePicker compact />
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* The dark-or-light switch stays out of the desktop-only nav:
                a phone must be able to flip it on the home page too. */}
            <ThemeSwitch />
            <span className="md:hidden"><LanguagePicker compact /></span>
            <button
              type="button"
              onClick={onSignIn}
              data-landingsignin
              className="hidden min-h-[44px] rounded-full border border-zinc-700/60 bg-zinc-800/60 px-5 text-xs font-semibold text-zinc-200 transition-all hover:bg-zinc-700/80 hover:text-white sm:inline-flex sm:items-center"
            >
              {t('landing.navSignIn', 'Sign In')}
            </button>
            <button
              type="button"
              onClick={onStart}
              data-landingstart
              className="group relative min-h-[44px] overflow-hidden rounded-full p-[1px] text-xs font-semibold shadow-lg shadow-emerald-950"
            >
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" />
              <span className="relative flex h-full min-h-[42px] items-center whitespace-nowrap rounded-full bg-black px-4 font-bold text-white transition-colors group-hover:bg-transparent group-hover:text-onAccent sm:px-5">
                {t('landing.getStarted', 'Get Started Free')}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* ── Hero: the pitch, and the door beside it ──────────────────── */}
        <section id="top" className={`${GUTTER} pb-16 pt-12 lg:pb-24 lg:pt-20`}>
          <div className="mx-auto max-w-3xl">
            <div className="space-y-6 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3.5 py-1.5 text-xs font-semibold text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span>{t('landing.heroTag', 'NEXT-GEN MUSIC & MEDIA STUDIO')}</span>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.25)] sm:h-14 sm:w-14">
                  <Cpu className="h-7 w-7 text-onAccent sm:h-8 sm:w-8" />
                </div>
                <p className="text-3xl font-black leading-none tracking-tighter text-white sm:text-5xl">
                  FUTURE<span className="text-emerald-400">BOX</span>
                </p>
              </div>

              <h1 className="text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {t('landing.heroTitle', 'THE WHOLE STUDIO,')}
                <br />
                <span className="bg-gradient-to-r from-white via-cyan-200 to-emerald-400 bg-clip-text text-transparent">
                  {t('landing.heroTitle2', 'IN ONE BLACK BOX.')}
                </span>
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
                {t('landing.heroDesc', 'Write it with the copilot, sing it yourself, clone your voice for the show, and put a video to it. Built on Google DeepMind, Vertex AI, Gemini and Veo.')}
              </p>

              <p className="text-sm text-zinc-500">
                {t('landing.noCard', 'No card to start. The free tier is a real one, not a trial.')}
              </p>
            </div>

          </div>
        </section>

        {/* ── The video, when this language has one ─────────────────────── */}
        {video && (
          <section className={`${GUTTER} pt-4`} data-landingvideo>
            <div className="mx-auto w-full max-w-3xl">
              <p className="pb-4 text-center text-xs font-bold uppercase tracking-widest text-emerald-400">
                {t('landing.seeIt', 'See it in thirty seconds')}
              </p>
              <WelcomeVideo />
            </div>
          </section>
        )}

        {/* ── The door, under the video ──────────────────────────────
            Carli, 13 October 2026: "Die video moet bo die log in wees. Net
            onder die login moet die kids room bemark word, en dan daarna
            die pricing." The form is the real one from `page.tsx`, handed
            in as `door`; the hero no longer carries a second way in. */}
        <section className={`${GUTTER} pt-12`}>
          <div className="mx-auto w-full max-w-md">
        {/* ── The door ──────────────────────────────────────────────
            Google drew a sign-in card in the hero, and it is the right
            place for it: somebody who already has an account should not
            have to find a button to get to a form. The form is the real
            one from `page.tsx`, handed in as `door`. */}
        <div id="door" className="scroll-mt-24">
          <div className={`${GLASS} group relative overflow-hidden rounded-2xl p-6 shadow-2xl sm:p-8`} data-landingdoor>
            <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="relative mb-6 flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Lock className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                  <span>{doorTitle}</span>
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">{t('landing.doorSub', 'Open your studio and everything you made in it.')}</p>
              </div>
            </div>

            <div className="relative mb-6 flex rounded-xl border border-zinc-800 bg-zinc-950/80 p-1" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode !== 'signup'}
                onClick={() => onMode('signin')}
                className={`min-h-[40px] flex-1 rounded-lg text-xs font-semibold transition-all ${mode !== 'signup' ? 'bg-emerald-500 text-onAccent shadow' : 'text-zinc-400 hover:text-white'}`}
              >
                {t('landing.tabSignIn', 'Sign In')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={() => onMode('signup')}
                className={`min-h-[40px] flex-1 rounded-lg text-xs font-semibold transition-all ${mode === 'signup' ? 'bg-emerald-500 text-onAccent shadow' : 'text-zinc-400 hover:text-white'}`}
              >
                {t('landing.tabCreate', 'Create Account')}
              </button>
            </div>

            <div className="relative space-y-5">
              {door}
            </div>
          </div>
        </div>
          </div>
        </section>

        {/* ── The kids room, for the parent reading this ──────────────────
            Carli, 13 October 2026: "die kids studio moet baie duidelik en
            gefeature wees ook op die landing page. Dit moet ouers gerus
            stel." Her picture, and under it only what the room really does. */}
        <section id="kids" className={`${GUTTER} scroll-mt-24 border-t border-zinc-800/80 py-24`} data-landingkids>
          <div className="mx-auto mb-10 max-w-3xl space-y-4 text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {t('landing.kidsTag', 'Kids Dream Studio')}
            </h2>
            <h3 className="text-3xl font-black text-white sm:text-4xl">
              {t('landing.kidsTitle', 'A studio of their own, with you holding the keys.')}
            </h3>
          </div>
          <div className="mx-auto max-w-4xl">
            <KidsBanner onPlans={to('pricing')} />
          </div>
        </section>

        {/* ── What it costs ─────────────────────────────────────────────── */}
        <section id="pricing" className={`${GUTTER} scroll-mt-24 border-t border-zinc-800/80 py-24`}>
          <div className="mx-auto mb-12 max-w-3xl space-y-4 text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {t('landing.pricingTag', 'Flexible studio plans')}
            </h2>
            <h3 className="text-3xl font-black text-white sm:text-4xl">
              {t('landing.pricingTitle', 'Transparent pricing for every scale')}
            </h3>
            <p className="text-sm text-zinc-400">
              {t('welcome.plansNote', 'A month at a time, cancelled from inside the app whenever you like. Everything included is a monthly allowance — songs, videos, and the voice work that goes with them.')}
            </p>

            {/* ── Which country these prices are in ───────────────────
                Carli, 11 October 2026: *"Maak 'n country picker"*. A plain
                `<select>`, so the operating system draws it: nineteen
                countries on a 390px phone is the one job a native picker
                does better than anything built here. The first option
                forgets a choice rather than making one, because without it
                there is no way back to the guess. */}
            <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full border border-zinc-800 bg-zinc-900 p-1.5 pl-4">
              <label htmlFor="welcome-region" className="text-xs font-bold text-zinc-400">
                {t('pay.pricesIn', 'Prices in')}
              </label>
              <select
                id="welcome-region"
                value={regionGuessed ? '' : region.code}
                onChange={(event) => chooseRegion(event.target.value)}
                className="min-h-[36px] rounded-full border border-emerald-500/40 bg-black px-3.5 text-xs font-bold text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="">
                  {t('pay.regionAuto', 'My device’s country')}
                  {regionGuessed ? ` — ${region.name}` : ''}
                </option>
                {regionsByName().map((one) => (
                  <option key={one.code} value={one.code}>
                    {one.name} · {one.currency}
                  </option>
                ))}
              </select>
            </div>
            {regionGuessed && (
              <p className="text-xs leading-relaxed text-zinc-500">
                {t('pay.regionGuess',
                  'Worked out from your device, so it can be wrong — change it above if it is. What you are charged is set by the country of your card either way.')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((tier) => {
              const spec = TIER_SPECS[tier];
              const price = tierPrice(tier, region);
              /* Studio is the one most people should be on, so it is the one
                 drawn to look like an answer rather than a column. */
              const lead = tier === 'studio';
              return (
                <div
                  key={tier}
                  className={`relative flex flex-col justify-between rounded-2xl p-6 backdrop-blur-md ${
                    lead
                      ? 'border-2 border-emerald-500 bg-gradient-to-b from-emerald-950/30 to-black shadow-[0_0_35px_rgba(16,185,129,0.35)]'
                      : 'border border-zinc-800 bg-gradient-to-br from-white/[0.04] to-white/[0.01]'
                  }`}
                >
                  {lead && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-onAccent shadow-lg">
                      {t('landing.mostPopular', 'MOST POPULAR')}
                    </span>
                  )}
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${lead ? 'text-emerald-400' : 'text-zinc-400'}`}>{spec.name}</span>
                    <div className="my-4">
                      <span className="text-3xl font-black text-white tabular-nums">
                        {spec.rand === 0 ? t('welcome.free', 'Free') : price.display}
                      </span>
                      {spec.rand > 0 && (
                        <span className="text-xs text-zinc-400"> / {t('welcome.month', 'month')}</span>
                      )}
                    </div>
                    {/* The plan tables live in `lib/plans.ts`, which the server
                        reads too and so has no language. The English there is
                        the fallback; the dictionary carries the Afrikaans. */}
                    <p className="mb-6 text-xs text-zinc-400">{t(`plan.${spec.id}.who`, spec.who)}</p>
                    <ul className="space-y-3 border-t border-zinc-800 pt-6 text-xs text-zinc-300">
                      {spec.includes.map((line, i) => (
                        <li key={line} className="flex items-start gap-2 leading-snug">
                          <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                          {t(`plan.${spec.id}.inc.${i}`, line)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={onStart}
                    className={`mt-8 min-h-[44px] w-full rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      lead
                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-onAccent shadow-lg shadow-emerald-500/20 hover:scale-[1.02]'
                        : 'border border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700'
                    }`}
                  >
                    {spec.rand === 0 ? t('landing.startFree', 'Start free') : `${t('welcome.choose', 'Choose')} ${spec.name}`}
                  </button>
                </div>
              );
            })}
          </div>

          <p className="mx-auto pt-8 max-w-2xl text-center text-xs leading-relaxed text-zinc-500">
            {t('welcome.plansSmall', 'Prices are in rand and converted for where you are. A month you have paid for runs to its end even if you cancel on the first day.')}
          </p>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}

      {/* ── On a phone, a bar along the bottom ─────────────────────────── */}
      <div className={`fixed inset-x-0 bottom-0 z-40 flex items-center justify-around p-2 md:hidden ${GLASS} border-x-0 border-b-0`} data-landingbar>
        <button type="button" onClick={to('kids')} className="flex min-h-[44px] flex-col items-center justify-center gap-1 px-4 text-[10px] text-zinc-400 hover:text-emerald-400">
          <Baby className="h-4 w-4" />
          <span>{t('landing.navKids', 'Kids')}</span>
        </button>
        <button type="button" onClick={to('pricing')} className="flex min-h-[44px] flex-col items-center justify-center gap-1 px-4 text-[10px] text-zinc-400 hover:text-emerald-400">
          <Tags className="h-4 w-4" />
          <span>{t('landing.navPricing', 'Pricing')}</span>
        </button>
        <button type="button" onClick={onSignIn} className="flex min-h-[44px] flex-col items-center justify-center gap-1 px-4 text-[10px] text-emerald-400">
          <LogIn className="h-4 w-4" />
          <span>{t('landing.navSignIn', 'Sign In')}</span>
        </button>
      </div>
    </div>
  );
}
