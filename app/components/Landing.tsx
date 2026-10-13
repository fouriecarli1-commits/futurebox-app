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
  ArrowRight, Baby, Check, ChevronRight, Cpu, GraduationCap, Globe, Languages, LayoutGrid, LogIn,
  Lock, Mic2, Music2, Palette, Podcast, Rss, Sparkles, Tags, Video, Wand2,
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

type Mode = 'signin' | 'signup' | 'forgot';

/** The one gutter, counted by `check:voordeur`: every centred box on the page is this wide. */
const GUTTER = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';

/** A glass panel, as Google's page drew them: a dark wash, blur, a hairline. */
const GLASS = 'bg-zinc-900/75 backdrop-blur-xl border border-white/10';

export default function Landing({
  onStart,
  onSignIn,
  onGoogle,
  mode,
  onMode,
  door,
}: {
  /** "Get started": the card in create-account mode. */
  readonly onStart: () => void;
  /** "Sign in": the card in sign-in mode. */
  readonly onSignIn: () => void;
  /** Sign in with a Google account. Returns a reason when it cannot. */
  readonly onGoogle: () => void;
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
  const rooms: readonly {
    readonly icon: React.ReactNode; readonly badge: string; readonly title: string;
    readonly note: string; readonly tone: string;
  }[] = [
    {
      icon: <Music2 className="h-5 w-5" />, badge: t('landing.badgeBooth', 'AUDIO ENGINE'),
      title: t('landing.roomBooth', 'ProBooth Multi-Track'),
      note: t('landing.roomBoothNote', 'Full session lanes, Google Lyria AI neural chord progressions and instrument generation, plus Google Gemini Flash mixing engineer.'),
      tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      icon: <Video className="h-5 w-5" />, badge: t('landing.badgeVideo', 'GOOGLE VEO'),
      title: t('landing.roomVideo', 'Cinema Video Desk'),
      note: t('landing.roomVideoNote', '9:16 reels and 16:9 widescreen scenes directed by Google Veo with cinematic camera movements, prompts, and auto-scroll prompters.'),
      tone: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      icon: <Mic2 className="h-5 w-5" />, badge: t('landing.badgeVoice', 'VOICE SYNTHESIS'),
      title: t('landing.roomVoice', 'Your Own Voice, Cloned'),
      note: t('landing.roomVoiceNote', 'Read a script in your own voice for the show, with your consent on record before a word is made.'),
      tone: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    },
    {
      icon: <Palette className="h-5 w-5" />, badge: t('landing.badgeArt', 'ART & DESIGN'),
      title: t('landing.roomPhoto', 'Post & Photo Studio'),
      note: t('landing.roomPhotoNote', 'Instant vector artwork templates, layered graphics canvas, rich typographic inspector, and multi-format release exports.'),
      tone: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      icon: <Podcast className="h-5 w-5" />, badge: t('landing.badgeInsights', 'MEDIA HUB'),
      title: t('landing.roomInsights', 'Future Insights & Podcasts'),
      note: t('landing.roomInsightsNote', '100% ad-free visionary articles and podcasts rated 96%–99% on source credibility across AI, vibecoding, tech, and business.'),
      tone: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
    {
      icon: <GraduationCap className="h-5 w-5" />, badge: t('landing.badgeCubed', 'CLASSES & COLLAB'),
      title: t('landing.roomCubed', 'Cubed³ Masterclasses & Collab'),
      note: t('landing.roomCubedNote', 'Real lectures, three to a masterclass, and a room where you ask another maker and work together.'),
      tone: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    },
  ];

  /* Six things the app can promise, because each one is in the code. */
  const trust: readonly [React.ReactNode, string, string][] = [
    [<Tags key="t1" className="h-5 w-5 text-emerald-400" />, t('landing.trust1', 'Rand pricing'), t('landing.trust1n', 'Converted for {n} countries').replace('{n}', String(REGIONS.length))],
    [<Languages key="t2" className="h-5 w-5 text-cyan-400" />, t('landing.trust2', 'Afrikaans & English'), t('landing.trust2n', 'Every room, both languages')],
    [<Lock key="t3" className="h-5 w-5 text-emerald-400" />, t('landing.trust3', 'Your voice, your consent'), t('landing.trust3n', 'On record before a clone is made')],
    [<Sparkles key="t4" className="h-5 w-5 text-cyan-400" />, t('landing.trust4', 'Says what made it'), t('landing.trust4n', 'On every release, every time')],
    [<Baby key="t5" className="h-5 w-5 text-emerald-400" />, t('landing.trust5', 'A kids room'), t('landing.trust5n', 'With an allowance a grown-up sets')],
    [<Rss key="t6" className="h-5 w-5 text-amber-400" />, t('landing.trust6', 'Real podcast feeds'), t('landing.trust6n', 'Ones Apple and Spotify accept')],
  ];

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
            <span className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
              <span className="flex h-full w-full items-center justify-center rounded-[10px] bg-black">
                <Cpu className="h-5 w-5 text-emerald-400" />
              </span>
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
            <button type="button" onClick={to('suite')} className="min-h-[44px] transition-colors hover:text-emerald-400">{t('landing.navPlatform', 'Platform')}</button>
            <button type="button" onClick={to('features')} className="min-h-[44px] transition-colors hover:text-emerald-400">{t('landing.navFeatures', 'Features')}</button>
            <button type="button" onClick={to('pricing')} className="min-h-[44px] transition-colors hover:text-emerald-400">{t('landing.navPricing', 'Pricing')}</button>
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
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-8 text-left">
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

              <div className="flex flex-wrap gap-2.5">
                {[
                  [<Wand2 key="a" className="h-3 w-3 text-emerald-400" />, t('landing.tagDeepMind', 'Google DeepMind')],
                  [<Globe key="b" className="h-3 w-3 text-cyan-400" />, t('landing.tagVertex', 'Vertex AI Engine')],
                  [<Sparkles key="c" className="h-3 w-3 text-amber-400" />, t('landing.tagGemini', 'Gemini & Veo Integrated')],
                ].map(([icon, label]) => (
                  <span key={String(label)} className="flex items-center gap-1.5 rounded-md border border-zinc-700/50 bg-zinc-800/80 px-3 py-1 text-[11px] font-medium text-zinc-300">
                    {icon} {label}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ['emerald', t('landing.hl1', 'Pro Audio & Voice Studio'), t('landing.hl1n', 'Stem separation, your voice cloned with consent, and a multi-track booth.')],
                  ['cyan', t('landing.hl2', 'AI Video & Visuals'), t('landing.hl2n', 'Music videos drawn from your audio, or directed by Google Veo.')],
                ].map(([tone, title, note]) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border ${tone === 'cyan' ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}>
                      <Check className={`h-3 w-3 ${tone === 'cyan' ? 'text-cyan-400' : 'text-emerald-400'}`} />
                    </div>
                    <p className="text-xs text-zinc-300">
                      <strong className="block font-semibold text-white">{title}</strong>
                      {note}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-stretch gap-4 pt-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={onStart}
                  className="flex min-h-[52px] items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 text-sm font-extrabold tracking-wide text-onAccent shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:from-emerald-400 hover:to-cyan-400"
                >
                  <span>{t('landing.startFree', 'Start free')}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onGoogle}
                  /* Literal white, deliberately outside the theme. Google's
                     sign-in button is theirs and their guidelines say what it
                     looks like: a white field with dark text beside their
                     mark. It is the one control here that must not follow a
                     palette, and `check:theme` knows this line by name. */
                  className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-[#ffffff] px-6 text-sm font-bold text-[#1f1f1f] transition-opacity hover:opacity-90"
                >
                  <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.2-3.8 6.6-9.5 6.6-16.2z" />
                    <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.4s.3-3 .8-4.4l-7.8-6.1C1 17 0 20.4 0 24s1 7 2.6 10.1l7.8-5.4z" />
                    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.4 0-11.7-3.7-13.6-9.1l-7.8 5.4C6.5 42.6 14.6 48 24 48z" />
                  </svg>
                  {t('welcome.google', 'Continue with Google')}
                </button>
                <button type="button" onClick={to('pricing')} className="min-h-[44px] px-2 text-sm font-semibold text-zinc-400 hover:text-white">
                  {t('welcome.seePlans', 'See the plans')}
                </button>
              </div>

              <p className="text-sm text-zinc-500">
                {t('landing.noCard', 'No card to start. The free tier is a real one, not a trial.')}
              </p>
            </div>

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

        {/* ── Six facts ─────────────────────────────────────────────────── */}
        <section className="border-y border-zinc-800/80 bg-zinc-950/40 py-8 backdrop-blur-md">
          <div className={GUTTER}>
            <p className="mb-6 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {t('landing.trustTitle', 'What you can count on')}
            </p>
            <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-3 lg:grid-cols-6">
              {trust.map(([icon, title, note]) => (
                <div key={title} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3">
                  <div className="mb-1 flex justify-center">{icon}</div>
                  <h3 className="text-xs font-bold text-white">{title}</h3>
                  <p className="text-[10px] text-zinc-400">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── The video, when this language has one ─────────────────────── */}
        {video && (
          <section className={`${GUTTER} pt-16`}>
            <div className="mx-auto w-full max-w-3xl">
              <p className="pb-4 text-center text-xs font-bold uppercase tracking-widest text-emerald-400">
                {t('landing.seeIt', 'See it in thirty seconds')}
              </p>
              <WelcomeVideo />
            </div>
          </section>
        )}

        {/* ── The six rooms ─────────────────────────────────────────────── */}
        <section id="suite" className={`${GUTTER} scroll-mt-24 py-24`}>
          <div className="mx-auto mb-16 max-w-3xl space-y-4 text-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {t('landing.suiteTag', 'Creative Studio Suite')}
            </h2>
            <h3 className="text-3xl font-black text-white sm:text-4xl">
              {t('landing.suiteTitle2', 'One Suite. Six Creative Rooms.')}
            </h3>
            <p className="text-sm text-zinc-400">
              {t('landing.suiteSub2', 'From a voice in a microphone to a video on a channel, every room is inside the same black box.')}
            </p>
          </div>

          <div id="features" className="grid grid-cols-1 gap-8 scroll-mt-24 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <button
                key={room.title}
                type="button"
                onClick={onStart}
                className="group relative rounded-2xl border border-zinc-800 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 text-left backdrop-blur-md transition-all hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-[0_12px_30px_-10px_rgba(16,185,129,0.25)]"
              >
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl border transition-transform group-hover:scale-110 ${room.tone}`}>
                  {room.icon}
                </div>
                <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-300">{room.badge}</span>
                <h4 className="mb-2 mt-2 text-xl font-bold text-white">{room.title}</h4>
                <p className="mb-4 text-xs leading-relaxed text-zinc-400">{room.note}</p>
                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 text-xs">
                  <span className="font-medium text-emerald-400">{t('landing.explore', 'Explore')}</span>
                  <ChevronRight className="h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            ))}
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
      <footer className="relative z-10 border-t border-zinc-800 bg-black py-12 text-xs text-zinc-400">
        <div className={`${GUTTER} mb-12 grid grid-cols-1 gap-8 md:grid-cols-4`}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-bold text-white">FUTUREBOX</span>
            </div>
            <p className="leading-relaxed text-zinc-500">
              {t('landing.footBlurb', 'The whole studio in one black box: songs, voices, podcasts, videos, classes, and the people to make them with.')}
            </p>
          </div>
          <div>
            <h5 className="mb-3 font-bold uppercase tracking-wider text-white">{t('landing.footPlatform', 'Platform')}</h5>
            <ul className="space-y-2">
              {rooms.slice(0, 4).map((room) => (
                <li key={room.title}>
                  <button type="button" onClick={to('suite')} className="transition-colors hover:text-emerald-400">{room.title}</button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="mb-3 font-bold uppercase tracking-wider text-white">{t('landing.footResources', 'Resources')}</h5>
            <ul className="space-y-2">
              <li><a href="/guide" className="transition-colors hover:text-emerald-400">{t('landing.footGuide', 'Guide')}</a></li>
              <li><a href="/help" className="transition-colors hover:text-emerald-400">{t('landing.footHelp', 'Help')}</a></li>
              <li><a href="/blog" className="transition-colors hover:text-emerald-400">{t('landing.footBlog', 'Blog')}</a></li>
              <li><a href="/uitspraak" className="transition-colors hover:text-emerald-400">{t('landing.footSay', 'Pronunciation')}</a></li>
            </ul>
          </div>
          <div>
            <h5 className="mb-3 font-bold uppercase tracking-wider text-white">{t('landing.footLegal', 'Legal')}</h5>
            <ul className="space-y-2">
              <li><a href="/privacy" className="transition-colors hover:text-emerald-400">{t('landing.footPrivacy', 'Privacy Policy')}</a></li>
              <li><a href="/terms" className="transition-colors hover:text-emerald-400">{t('landing.footTerms', 'Terms of Service')}</a></li>
              <li><a href="/legal" className="transition-colors hover:text-emerald-400">{t('landing.footLegalPage', 'Legal & Company')}</a></li>
              <li className="pt-2 text-zinc-500">
                {t('landing.region', 'Region')}: <span className="text-emerald-400">{region.name} ({region.currency})</span>
              </li>
            </ul>
          </div>
        </div>
        <div className={`${GUTTER} flex flex-col items-center justify-between gap-3 border-t border-zinc-900 pt-6 text-[11px] text-zinc-600 sm:flex-row`}>
          {/* The copyright line and the policy links are the site footer's,
              drawn under this one on every page — so this row carries only
              what that one does not. */}
          <p>{t('welcome.footer', 'Everything made here says what made it, on the release.')}</p>
          <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] text-emerald-400">futurebox.studio</span>
        </div>
      </footer>

      {/* ── On a phone, a bar along the bottom ─────────────────────────── */}
      <div className={`fixed inset-x-0 bottom-0 z-40 flex items-center justify-around p-2 md:hidden ${GLASS} border-x-0 border-b-0`} data-landingbar>
        <button type="button" onClick={to('suite')} className="flex min-h-[44px] flex-col items-center justify-center gap-1 px-4 text-[10px] text-zinc-400 hover:text-emerald-400">
          <LayoutGrid className="h-4 w-4" />
          <span>{t('landing.navSuite', 'Suite')}</span>
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
