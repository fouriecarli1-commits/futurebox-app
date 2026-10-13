'use client';

/**
 * Spotlight — The premier front door and showcase of FutureBox.
 *
 * Fully liberated modern studio experience:
 * - High-tech cyber-emerald and deep onyx aesthetic
 * - 4 Interactive Pro Studio Suite showcase cards (VideoEditor NLE, ProBooth DAW,
 *   Neurale Musiek & Rym Lab, and Kids Adventure Studio)
 * - Live interactive waveform equalizer audio demo bar
 * - The 8 distinctive superpowers in a glowing visual matrix
 * - Direct doors into song generation, voice recording, podcasts, radar, and themes
 * - Full audit compliance: data-spotlightblog, href="/blog", onOpenLive, Charts & Insights
 */

import React, { useEffect, useState } from 'react';
import {
  Check,
  BookOpen,
  Paintbrush,
  Sparkles,
  Play,
  Pause,
  Film,
  Mic,
  Music,
  Radio,
  Users,
  Compass,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sliders,
  Volume2,
  Video,
  Layers,
  Baby,
} from 'lucide-react';
import Link from 'next/link';
import { inOrder, saidIn } from '../lib/blog';
import { useLang } from '../lib/i18n';
import HereNow from './HereNow';
import LanguagePicker from './LanguagePicker';
import Charts from './Charts';
import FutureInsightsHub from './FutureInsightsHub';
import { studioAudio } from '../lib/demoaudio';

export default function Spotlight({
  onGo,
  onAppearance,
  onOpenRadar,
  onOpenLive,
}: {
  /** Open the studio on one of its screens. */
  onGo: (tab: 'make' | 'voice_studio' | 'podcast') => void;
  onAppearance: () => void;
  /** The radar bar is a door to the radar tab, which is a page of its own. */
  onOpenRadar: () => void;
  /** Where a charting song actually is. See the note in `Charts`. */
  onOpenLive: () => void;
}): React.ReactElement {
  const { lang, t } = useLang();
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);

  useEffect(() => {
    return studioAudio.subscribe(setIsPlayingDemo);
  }, []);

  const toggleDemoAudio = () => {
    if (isPlayingDemo) {
      studioAudio.stopStudioDemoTrack();
    } else {
      studioAudio.playStudioDemoTrack();
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Main Pro Studio Showcase Hero ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 via-zinc-950/90 to-black p-6 sm:p-10 md:p-12 shadow-[0_0_60px_rgba(16,185,129,0.12)]">
        {/* Ambient atmospheric glow mesh */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 max-w-5xl space-y-8">
          {/* ── Top Bar: Active Creators, Language Switcher & Style Customizer ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-6">
            <HereNow />
            <div className="flex flex-wrap items-center gap-2.5">
              <LanguagePicker />
              <button
                type="button"
                onClick={onAppearance}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-500/40 bg-zinc-900/90 px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-300 transition-all hover:border-emerald-400 hover:bg-emerald-950/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                title={t('hero.themeTooltip', 'Pasmaak ateljee styl, kleure en voorkoms')}
              >
                <Paintbrush className="h-4 w-4 text-emerald-400" />
                <span>{t('hero.customizeTheme', 'Pas Styl & Kleure Aan')}</span>
                <span className="flex items-center gap-1 pl-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-1 ring-white/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-400 ring-1 ring-white/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 ring-1 ring-white/30" />
                </span>
              </button>
            </div>
          </div>

          {/* ── Tech Engine Badges ── */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-gradient-to-r from-teal-950/80 via-emerald-950/50 to-zinc-900/90 px-4 py-1.5 text-xs font-bold text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.2)]">
              <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-teal-400" />
              <span>{t('hero.googleEngineBadge', 'Google DeepMind & Vertex AI • Lyria 3 Musiek • Veo 3.1 4K Video • Gemini Pro Copilot')}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-300">
              <Zap className="h-3 w-3 text-emerald-400" />
              <span>{t('hero.afrikaansNative', '100% Inheems Afrikaans')}</span>
            </span>
          </div>

          {/* ── Main Hero Title & Lead ── */}
          <div className="space-y-4">
            <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05]">
              {t('hero.yourVoice', 'Jou stem.')}{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                {t('hero.yourSongs', 'Jou liedjies.')}
              </span>{' '}
              {t('hero.yourShow', 'Jou vertoning.')}
            </h2>
            <p className="max-w-3xl text-base sm:text-lg text-zinc-300 leading-relaxed">
              {lang === 'af'
                ? 'Die alles-in-een kreatiewe ateljee vir musikante, skeppers en bemarkers. Skep ateljee-gehalte musiek met Lyria 3, redigeer 4K video’s op ’n multi-baan NLE tydlyn, en neem professionele sang op in die 4-baan DAW.'
                : 'The all-in-one creative studio for musicians, creators, and marketers. Produce studio-grade songs with Lyria 3, edit 4K video on a multi-track NLE timeline, and record professional vocals in the 4-track DAW.'}
            </p>
          </div>

          {/* ── Primary Action CTAs ── */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onGo('make')}
              className="inline-flex min-h-[48px] items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-3.5 text-sm font-black text-zinc-950 shadow-[0_0_30px_rgba(16,185,129,0.35)] transition-all hover:from-emerald-400 hover:to-teal-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Music className="h-4 w-4 text-zinc-950" />
              <span>{t('hero.start', 'Maak ’n liedjie')}</span>
              <ArrowRight className="h-4 w-4 text-zinc-950" />
            </button>
            <button
              type="button"
              onClick={() => onGo('voice_studio')}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 px-5 py-3.5 text-sm font-bold text-zinc-200 transition-all hover:border-emerald-500 hover:bg-emerald-950/40 hover:text-emerald-300"
            >
              <Mic className="h-4 w-4 text-emerald-400" />
              <span>{t('hero.sing', 'Neem stem op (ProBooth)')}</span>
            </button>
            <button
              type="button"
              onClick={() => onGo('podcast')}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 px-5 py-3.5 text-sm font-bold text-zinc-200 transition-all hover:border-teal-500 hover:bg-teal-950/40 hover:text-teal-300"
            >
              <Radio className="h-4 w-4 text-teal-400" />
              <span>{t('hero.podcast', 'Begin ’n potgooi')}</span>
            </button>
            <button
              type="button"
              onClick={onAppearance}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-emerald-500/30 bg-zinc-950/80 px-4 py-3.5 text-sm font-bold text-emerald-400 transition-all hover:border-emerald-400 hover:bg-zinc-900"
            >
              <Paintbrush className="h-4 w-4 text-emerald-400" />
              <span>{t('hero.openThemeStudio', 'Ateljee Styl')}</span>
            </button>
          </div>

          {/* ── Live Interactive Audio Equalizer Demo Strip ── */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-zinc-950/80 p-4 sm:p-5 shadow-inner">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={toggleDemoAudio}
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95"
                  title={isPlayingDemo ? 'Pouseer demonstrasie' : 'Speel voorbeeld'}
                >
                  {isPlayingDemo ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      {isPlayingDemo ? 'Speel tans • Lewendig' : 'Ateljee Voorbeeld'}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <h4 className="text-sm font-bold text-white sm:text-base">
                    FutureBox Studio — &quot;Feel The Vibe&quot; (Afrikaans Master)
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Stereo 48kHz • 124 BPM • Toonsoort F-Majoor • FutureBox Neurale Klank Enjin
                  </p>
                </div>
              </div>

              {/* Dynamic waveform visualizer bars */}
              <div className="flex items-center gap-1 sm:justify-end">
                {[40, 75, 55, 90, 65, 80, 45, 95, 70, 85, 60, 50, 75, 90, 60, 80, 40].map((height, i) => (
                  <span
                    key={i}
                    style={{ height: isPlayingDemo ? `${height}%` : '25%' }}
                    className={`w-1 rounded-full transition-all duration-300 ${
                      isPlayingDemo
                        ? 'bg-gradient-to-t from-emerald-500 to-cyan-400 animate-pulse'
                        : 'bg-zinc-700 h-2'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── The 4 Pro Studio Suite Showcase Cards ── */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-400" />
                <span>{lang === 'af' ? 'Vier Volwaardige Skeppingskamers' : 'Four Full Production Suites'}</span>
              </h3>
              <span className="text-xs font-bold text-zinc-400">
                {lang === 'af' ? 'Klik om dadelik te open' : 'Click to launch directly'}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Suite 1: VideoEditor NLE Pro */}
              <div
                onClick={() => onGo('make')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onGo('make');
                }}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-zinc-900/80 to-zinc-950 p-5 transition-all hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 group-hover:scale-105 transition-transform">
                      <Film className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Video Redigering</span>
                      <h4 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                        VideoEditor NLE Pro
                      </h4>
                    </div>
                  </div>
                  <span className="rounded-full bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-1 text-[11px] font-bold text-cyan-300">
                    9:16 &amp; 16:9 4K
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  {lang === 'af'
                    ? 'Veo 3.1 4K video-enjin, multi-baan tydlyn vir video, oudio en neon onderskrifte, agtergrond-verwyderaar en magiese uitveër.'
                    : 'Veo 3.1 4K video engine, multi-track timeline for video, audio and neon subtitles, background remover and magic eraser.'}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>Veo 3.1 • Neon Captions • Tydlyn</span>
                  </div>
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    {lang === 'af' ? 'Open Redigeerder' : 'Open Editor'} →
                  </span>
                </div>
              </div>

              {/* Suite 2: ProBooth DAW & Stem Ateljee */}
              <div
                onClick={() => onGo('voice_studio')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onGo('voice_studio');
                }}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-zinc-900/80 to-zinc-950 p-5 transition-all hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 group-hover:scale-105 transition-transform">
                      <Mic className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Stem &amp; Opname</span>
                      <h4 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                        ProBooth DAW &amp; Ateljee
                      </h4>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                    4-Baan Multitrack
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  {lang === 'af'
                    ? 'Mikrofoon golf-meting, C# intydse toonhoogte-opspoorder, Kits & ElevenLabs stemkloning, stemskeiding en 20x herstel-stappe.'
                    : 'Microphone wave meter, C# real-time pitch tracker, Kits & ElevenLabs voice cloning, stem isolation and 20-step undo history.'}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Kits RVC • Toonhoogte • 4 Spore</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    {lang === 'af' ? 'Open ProBooth' : 'Open ProBooth'} →
                  </span>
                </div>
              </div>

              {/* Suite 3: Neurale Musiekateljee */}
              <div
                onClick={() => onGo('make')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onGo('make');
                }}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-zinc-900/80 to-zinc-950 p-5 transition-all hover:border-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 group-hover:scale-105 transition-transform">
                      <Music className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400">KI Musiek</span>
                      <h4 className="text-base font-black text-white group-hover:text-amber-300 transition-colors">
                        Neurale Musiek &amp; Rym Ateljee
                      </h4>
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-950/80 border border-amber-500/30 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                    100+ Genres
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  {lang === 'af'
                    ? 'Skep volledige liedjies in Afrikaans, pop, rock, amapiano, sokkie of ballades met outomatiese akkoorde en lirieke.'
                    : 'Generate complete tracks in Afrikaans, pop, rock, amapiano, sokkie, or ballads with automatic chords and lyrics.'}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span>FutureBox • Afrikaanse Rym • Studio Master</span>
                  </div>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    {lang === 'af' ? 'Skep Liedjie' : 'Create Track'} →
                  </span>
                </div>
              </div>

              {/* Suite 4: Kinder Avontuur & Storie Kamer */}
              <Link
                href="/kids"
                className="group relative block overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-zinc-900/80 to-zinc-950 p-5 transition-all hover:border-purple-400 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-300 group-hover:scale-105 transition-transform">
                      <Baby className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Kindermodus</span>
                      <h4 className="text-base font-black text-white group-hover:text-purple-300 transition-colors">
                        Kinder Avontuur &amp; Stories
                      </h4>
                    </div>
                  </div>
                  <span className="rounded-full bg-purple-950/80 border border-purple-500/30 px-2.5 py-1 text-[11px] font-bold text-purple-300">
                    100% Kindveilig
                  </span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  {lang === 'af'
                    ? '14 prettige templates (Ruimte, Hondjie, Rock, Oseaan), storieboeke met stem en video, en beheerde ouerlike krediet-toelae.'
                    : '14 fun adventure templates (Space, Puppy, Rock, Ocean), voice-read storybooks with video, and parent-controlled credit allowance.'}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                    <span>14 Templates • Stories • Veilige Toelaag</span>
                  </div>
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    {lang === 'af' ? 'Gaan na Kinders' : 'Visit Kids Room'} →
                  </span>
                </div>
              </Link>
            </div>
          </div>

          {/* ── The 8 Unique Core Superpowers Matrix ── */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400">
              {lang === 'af' ? 'Die 8 Unieke Voordele van FutureBox' : 'The 8 Unique Powers of FutureBox'}
            </h3>
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  text: t('hero.f1', 'ProBooth, for professional musicians'),
                  sub: '4-Baan DAW & multitrack',
                  icon: Mic,
                },
                {
                  text: t('hero.f2', 'Advert planning, for marketers'),
                  sub: 'Sosiale veldtogte & formaat',
                  icon: Sliders,
                },
                {
                  text: t('hero.f3', 'Clone your voice'),
                  sub: 'Kits RVC & ElevenLabs',
                  icon: Zap,
                },
                {
                  text: t('hero.f4', 'Train your own unique sound'),
                  sub: 'Eie styl- & klankprofiel',
                  icon: Sparkles,
                },
                {
                  text: t('hero.f5', 'A live music room'),
                  sub: 'Lewendige stroom & radio',
                  icon: Radio,
                },
                {
                  text: t('hero.f6', 'Collab Radar, to create with like-minded artists'),
                  sub: 'Vind kunstenaars naby jou',
                  icon: Compass,
                },
                {
                  text: t('hero.f7', 'Video generation'),
                  sub: 'Veo 3.1 4K video-enjin',
                  icon: Video,
                },
                {
                  text: t('hero.f8', 'Everything in Afrikaans — music, videos, podcasts'),
                  sub: '100% outentieke Afrikaans',
                  icon: ShieldCheck,
                },
              ].map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-zinc-800/90 bg-zinc-950/60 p-3 transition-colors hover:border-emerald-500/50 hover:bg-zinc-900/60"
                  >
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold leading-snug text-zinc-200">
                        {item.text}
                      </span>
                      <span className="block text-[10px] text-zinc-500">
                        {item.sub}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ── Choose your own style and colors callout ── */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-900/70 to-zinc-950/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="space-y-1">
              <p className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Paintbrush className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{t('hero.styleTitle', 'Kies jou eie styl en kleure')}</span>
              </p>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                {t(
                  'hero.styleDesc',
                  'Pas primêre kleure, aksente, donker oppervlakke, fonts en uitleg aan volgens jou smaak.'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onAppearance}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5 text-xs sm:text-sm font-black text-zinc-950 shadow-md transition-all flex-shrink-0 active:scale-95"
            >
              <Paintbrush className="w-4 h-4 text-zinc-950" />
              <span>{t('hero.openThemeStudio', 'Open Styl Ateljee')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── What is actually happening here, as bars you press ──────────
          Under the hero: Charts & Radar door */}
      <Charts onOpenRadar={onOpenRadar} onOpenLive={onOpenLive} />

      {/* ── Future Insights & Ad-Free Curated Knowledge ─────────────── */}
      <FutureInsightsHub
        onOpenStudio={() => onGo('make')}
        onOpenPodcast={() => onGo('podcast')}
      />

      {/* ── How it works & Blog Section ────────────────────────────────────
          Carli, 10 October 2026: "Ek besef ook in spotlight gaan ons 'n Blog
          ook moet hê, daarin sal ek artikels moet deel oor hoe die
          verskillende funksies in die app werk."
          Checked by scripts/check-blog.mts:
          requires [data-spotlightblog] and href="/blog" */}
      <section className="space-y-4 rounded-3xl border border-zinc-800/80 bg-zinc-950/60 p-6 sm:p-8" data-spotlightblog>
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg sm:text-xl font-black text-white">
              <BookOpen className="h-5 w-5 flex-shrink-0 text-emerald-400" />
              <span>{t('blog.title', 'Hoe dit werk — Kennis & Handleidings')}</span>
            </h3>
            <p className="text-xs text-zinc-400">
              {lang === 'af'
                ? 'Artikels en gidse oor hoe die verskillende funksies in FutureBox werk'
                : 'Articles and guides on how each room and feature in FutureBox works'}
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-300 hover:border-emerald-400 hover:bg-emerald-950/60 transition-all"
          >
            <span>{t('blog.all', 'Al die artikels')}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <ul className="grid gap-3 sm:grid-cols-3">
          {inOrder().slice(0, 3).map((piece) => (
            <li key={piece.id}>
              <Link
                href={`/blog/${piece.id}`}
                data-spotlightpiece={piece.id}
                className="group block h-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition-all hover:border-emerald-500/60 hover:bg-zinc-900 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
              >
                <span className="block text-sm font-bold leading-snug text-white group-hover:text-emerald-300 transition-colors">
                  {saidIn(piece.title, lang)}
                </span>
                <span className="block pt-2 text-xs leading-relaxed text-zinc-400">
                  {saidIn(piece.blurb, lang)}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                  {lang === 'af' ? 'Lees artikel' : 'Read article'} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
