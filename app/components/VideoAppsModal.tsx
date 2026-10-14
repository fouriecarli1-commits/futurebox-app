'use client';

/**
 * Video Apps & Video Effects browser modal.
 *
 * The video apps & effects suite:
 *   · Video Reverser
 *   · Video effects: Video Upscaler, Video Cartoonify, Video FX Studio,
 *     Progress Bar Maker, Before After Maker, Artivive, FrameFusion,
 *     Video Translator, Before After Slide, Video Optimizer, Video Enhancer,
 *     AI Video Loop, Sato Video Player, Video Background, Vibe Visualizer,
 *     Video Speeder.
 */

import React, { useState, useMemo } from 'react';
import {
  X, Search, Sparkles, Wand2, RotateCcw, Clapperboard, SlidersHorizontal,
  SplitSquareVertical, Layers, Languages, Sliders, Play, Volume2, FastForward,
  Eye, Check, Crown, Flame, Zap, Camera, ShieldCheck,
} from 'lucide-react';
import { useLang } from '../lib/i18n';

export interface VideoAppItem {
  readonly id: string;
  readonly nameKey: string;
  readonly nameFallback: string;
  readonly descKey: string;
  readonly descFallback: string;
  readonly category: 'effects' | 'tools' | 'ai' | 'audio';
  readonly badge?: string;
  readonly icon: React.ReactNode;
  readonly gradient: string;
}

export default function VideoAppsModal({
  onSelectApp,
  onClose,
}: {
  readonly onSelectApp: (appId: string) => void;
  readonly onClose: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'effects' | 'tools' | 'ai' | 'audio'>('all');
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  const APPS: readonly VideoAppItem[] = useMemo(
    () => [
      {
        id: 'video_reverser',
        nameKey: 'videoapps.reverser',
        nameFallback: 'Video Reverser',
        descKey: 'videoapps.reverserSub',
        descFallback: 'Play video backwards with pitch correction',
        category: 'tools',
        badge: 'PRO',
        gradient: 'from-blue-500 via-indigo-500 to-pink-500',
        icon: <RotateCcw className="h-6 w-6 text-white" />,
      },
      {
        id: 'video_upscaler',
        nameKey: 'videoapps.upscaler',
        nameFallback: 'Video Upscaler',
        descKey: 'videoapps.upscalerSub',
        descFallback: 'AI HD super-resolution and edge clarity',
        category: 'ai',
        badge: '4K AI',
        gradient: 'from-amber-500 via-red-500 to-rose-600',
        icon: <Sparkles className="h-6 w-6 text-white" />,
      },
      {
        id: 'video_cartoonify',
        nameKey: 'videoapps.cartoonify',
        nameFallback: 'Video Cartoonify',
        descKey: 'videoapps.cartoonifySub',
        descFallback: 'Turn footage into vibrant animated comic art',
        category: 'effects',
        badge: 'FX',
        gradient: 'from-amber-600 via-emerald-600 to-teal-700',
        icon: <Wand2 className="h-6 w-6 text-white" />,
      },
      {
        id: 'video_fx_studio',
        nameKey: 'videoapps.fxStudio',
        nameFallback: 'Video FX Studio',
        descKey: 'videoapps.fxStudioSub',
        descFallback: 'Glitch, chromatic aberration, and vintage VHS',
        category: 'effects',
        badge: 'PRO',
        gradient: 'from-cyan-500 via-blue-600 to-purple-600',
        icon: <Zap className="h-6 w-6 text-white" />,
      },
      {
        id: 'progress_bar_maker',
        nameKey: 'videoapps.progressBar',
        nameFallback: 'Progress Bar Maker',
        descKey: 'videoapps.progressBarSub',
        descFallback: 'Custom animated timelines for social reels',
        category: 'tools',
        gradient: 'from-amber-400 via-orange-500 to-amber-600',
        icon: <SlidersHorizontal className="h-6 w-6 text-white" />,
      },
      {
        id: 'before_after_maker',
        nameKey: 'videoapps.beforeAfter',
        nameFallback: 'Before After Maker',
        descKey: 'videoapps.beforeAfterSub',
        descFallback: 'Split-screen side-by-side comparison video',
        category: 'tools',
        badge: 'SPLIT',
        gradient: 'from-indigo-400 via-purple-500 to-pink-500',
        icon: <SplitSquareVertical className="h-6 w-6 text-white" />,
      },
      {
        id: 'artivive',
        nameKey: 'videoapps.artivive',
        nameFallback: 'Artivive',
        descKey: 'videoapps.artiviveSub',
        descFallback: 'Augmented reality digital art video overlays',
        category: 'effects',
        badge: 'AR',
        gradient: 'from-blue-600 via-indigo-600 to-sky-500',
        icon: <Layers className="h-6 w-6 text-white" />,
      },
      {
        id: 'frame_fusion',
        nameKey: 'videoapps.frameFusion',
        nameFallback: 'FrameFusion',
        descKey: 'videoapps.frameFusionSub',
        descFallback: 'Fluid motion blending and multi-angle cuts',
        category: 'ai',
        badge: 'KI',
        gradient: 'from-rose-500 via-pink-600 to-purple-600',
        icon: <Camera className="h-6 w-6 text-white" />,
      },
      {
        id: 'video_translator',
        nameKey: 'videoapps.translator',
        nameFallback: 'Video Translator',
        descKey: 'videoapps.translatorSub',
        descFallback: 'AI multilingual voice dubbing and live captions',
        category: 'ai',
        badge: 'VOICE',
        gradient: 'from-red-500 via-orange-500 to-amber-500',
        icon: <Languages className="h-6 w-6 text-white" />,
      },
      {
        id: 'before_after_slide',
        nameKey: 'videoapps.beforeAfterSlide',
        nameFallback: 'Before After Slide',
        descKey: 'videoapps.beforeAfterSlideSub',
        descFallback: 'Interactive wipe slider between two video clips',
        category: 'tools',
        badge: 'WIPE',
        gradient: 'from-violet-500 via-purple-600 to-fuchsia-600',
        icon: <SplitSquareVertical className="h-6 w-6 text-white" />,
      },
      {
        id: 'video_optimizer',
        nameKey: 'videoapps.optimizer',
        nameFallback: 'Video Optimizer',
        descKey: 'videoapps.optimizerSub',
        descFallback: 'Auto exposure, contrast, and bitrate tuning',
        category: 'tools',
        gradient: 'from-blue-500 via-cyan-500 to-teal-500',
        icon: <Sliders className="h-6 w-6 text-white" />,
      },
      {
        id: 'video_enhancer',
        nameKey: 'videoapps.enhancer',
        nameFallback: 'Video Enhancer',
        descKey: 'videoapps.enhancerSub',
        descFallback: 'Atmospheric landscape and scenery detail booster',
        category: 'ai',
        badge: 'HDR',
        gradient: 'from-emerald-500 via-teal-600 to-cyan-600',
        icon: <Eye className="h-6 w-6 text-white" />,
      },
      {
        id: 'ai_video_loop',
        nameKey: 'videoapps.loop',
        nameFallback: 'AI Video Loop',
        descKey: 'videoapps.loopSub',
        descFallback: 'Seamless infinite loop creation for backgrounds',
        category: 'ai',
        badge: 'LOOP',
        gradient: 'from-purple-900 via-violet-800 to-black',
        icon: <Play className="h-6 w-6 text-cyan-300" />,
      },
      {
        id: 'sato_video_player',
        nameKey: 'videoapps.satoPlayer',
        nameFallback: 'Sato Video Player',
        descKey: 'videoapps.satoPlayerSub',
        descFallback: 'Custom branded web player styles and controls',
        category: 'tools',
        gradient: 'from-orange-500 via-amber-500 to-red-500',
        icon: <Play className="h-6 w-6 text-white" />,
      },
      {
        id: 'video_background',
        nameKey: 'videoapps.videoBg',
        nameFallback: 'Video Background',
        descKey: 'videoapps.videoBgSub',
        descFallback: 'Instant green-screen background cutout and replace',
        category: 'ai',
        badge: 'AUTO',
        gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
        icon: <Clapperboard className="h-6 w-6 text-white" />,
      },
      {
        id: 'vibe_visualizer',
        nameKey: 'videoapps.visualizer',
        nameFallback: 'Vibe Visualizer',
        descKey: 'videoapps.visualizerSub',
        descFallback: 'Reactive audio spectrum waveform overlay',
        category: 'audio',
        badge: 'SPECTRUM',
        gradient: 'from-fuchsia-600 via-pink-600 to-indigo-700',
        icon: <Volume2 className="h-6 w-6 text-white" />,
      },
      {
        id: 'video_speeder',
        nameKey: 'videoapps.speeder',
        nameFallback: 'Video Speeder',
        descKey: 'videoapps.speederSub',
        descFallback: 'Dynamic speed ramping and smooth slow-motion',
        category: 'tools',
        badge: 'SPEED',
        gradient: 'from-zinc-800 via-zinc-900 to-black',
        icon: <FastForward className="h-6 w-6 text-amber-400" />,
      },
    ],
    [],
  );

  const filteredApps = useMemo(() => {
    return APPS.filter((app) => {
      const matchesTab = activeTab === 'all' || app.category === activeTab;
      if (!matchesTab) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const name = t(app.nameKey, app.nameFallback).toLowerCase();
      const desc = t(app.descKey, app.descFallback).toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [APPS, activeTab, query, t]);

  const handleApply = (appId: string): void => {
    setSelectedApp(appId);
    onSelectApp(appId);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-apps-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/80 backdrop-blur-md p-4 sm:p-6"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20">
              <Clapperboard className="h-5 w-5" />
            </div>
            <div>
              <h2 id="video-apps-modal-title" className="text-lg font-bold tracking-tight text-zinc-100">
                {t('videoapps.title', 'Video Apps & Effects')}
              </h2>
              <p className="text-xs text-zinc-400">
                {t('videoapps.subtitle', 'AI video tools, filters, and creative enhancements')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Category Tabs */}
        <div className="flex flex-col gap-3 border-b border-zinc-800/60 bg-zinc-900/40 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('videoapps.searchPlaceholder', 'Search video apps and effects...')}
              className="h-10 w-full rounded-xl border border-zinc-700/80 bg-zinc-950/80 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap no-scrollbar">
            {(
              [
                { id: 'all', label: t('videoapps.tabAll', 'All') },
                { id: 'effects', label: t('videoapps.effects', 'Video effects') },
                { id: 'ai', label: t('videoapps.tabAi', 'AI Tools') },
                { id: 'tools', label: t('videoapps.tabTools', 'Utilities') },
                { id: 'audio', label: t('videoapps.tabAudio', 'Audio & Visualizer') },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Apps Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredApps.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => handleApply(app.id)}
                className="group relative flex flex-col items-start rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 text-left transition-all hover:border-zinc-700 hover:bg-zinc-900 hover:shadow-xl hover:shadow-cyan-500/5"
              >
                {/* App Icon Tile */}
                <div
                  className={`relative mb-3.5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${app.gradient} shadow-lg transition-transform duration-200 group-hover:scale-105`}
                >
                  {app.icon}
                  {app.badge && (
                    <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black shadow">
                      {app.badge === 'PRO' && <Crown className="h-2.5 w-2.5 fill-black" />}
                      {app.badge}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="line-clamp-1 text-sm font-bold text-zinc-100 group-hover:text-cyan-300">
                  {t(app.nameKey, app.nameFallback)}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400 group-hover:text-zinc-300">
                  {t(app.descKey, app.descFallback)}
                </p>

                <div className="mt-3 flex w-full items-center justify-between pt-2 border-t border-zinc-800/40 text-[11px] font-medium text-cyan-400">
                  <span>{t('videoapps.launch', 'Open App')}</span>
                  <span className="text-zinc-500 group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </button>
            ))}
          </div>

          {filteredApps.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
              <Sparkles className="h-10 w-10 text-zinc-600 mb-2" />
              <p className="text-sm font-semibold">{t('videoapps.noResults', 'No video apps matched your search.')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
