'use client';

/**
 * Elements Browser Modal for FutureBox Photo & Video Studio.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli: *"Die Photo editor moet ook 'n QR Code generator hê, en verskillende
 * templates om dit in te sit. En allerhande searchable graphics, animations, audio.
 * O ja, alles wat jy doen, moet jy in beide doen, in die enegelse blad, en
 * afrikaans vir die afrikaanse blad."*
 *
 * Screenshots:
 *   - Shapes: Lines, Basic shapes, Polygons, Stars, Arrows, Flowchart shapes.
 *   - Graphics: Recently used, Magic recommendations, Featured (Springbok, toast, WhatsApp),
 *     Gradient, Animations, Social Media.
 *   - Animations: Magic recommendations, Arrow animations, Word animations,
 *     Food animations, Shape animations, Emoji animations.
 *   - Audio: Voiceovers (AI voice), Recently used, Magic recommendations,
 *     Upbeat with real-time interactive audio previews.
 */

import { barClearance } from './TabBar';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search, Mic, X, ArrowLeft, Shapes, Flower2, Box, Smile,
  Image as ImageIcon, Crop, Grid, Video, Music, ToggleLeft,
  Shirt, BarChart3, Sheet, Table, Crown, Play, Pause, Volume2,
  Sparkles,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import {
  ELEMENT_CATEGORIES, STUDIO_ELEMENTS, type ElementCategory,
  type StudioElementItem,
} from '../lib/elementsdata';
import { useBackLayer } from '../lib/backstack';

export default function ElementsBrowserModal({
  onInsertElement,
  onClose,
}: {
  readonly onInsertElement: (element: StudioElementItem) => void;
  readonly onClose: () => void;
}): React.ReactElement {
  const { t, lang } = useLang();
  /* Back closes it, as every overlay that covers the app does (`check:backlayers`). */
  useBackLayer(true, onClose);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ElementCategory | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const stopAudioRef = useRef<(() => void) | null>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }
    };
  }, []);

  const handlePlayAudio = (element: StudioElementItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingAudioId === element.id) {
      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }

    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const audioType = element.audioType || 'pop';
      const notes = audioType === 'piano'
        ? [261.63, 329.63, 392.00, 523.25, 392.00, 329.63]
        : audioType === 'upbeat'
        ? [349.23, 440.00, 523.25, 587.33, 659.25, 587.33]
        : [440.00, 493.88, 554.37, 659.25, 554.37, 493.88];
      const duration = 0.28;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = audioType === 'piano' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * duration);
        gain.gain.setValueAtTime(0.18, now + idx * duration);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * duration + duration - 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * duration);
        osc.stop(now + idx * duration + duration);
      });

      stopAudioRef.current = () => {
        try { void ctx.close(); } catch {}
      };

      setPlayingAudioId(element.id);
      setTimeout(() => {
        setPlayingAudioId((curr) => (curr === element.id ? null : curr));
      }, notes.length * duration * 1000);
    } catch {
      // Audio playback not supported or user disabled
    }
  };

  const handleAiVoiceoverClick = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const phrase = lang === 'af' ? 'Welkom by FutureBox Studio!' : 'Welcome to FutureBox Studio!';
      const utter = new SpeechSynthesisUtterance(phrase);
      utter.rate = 1.0;
      window.speechSynthesis.speak(utter);
    }
    // Also insert the pop party audio badge as a sample
    const sample = STUDIO_ELEMENTS.find((e) => e.id === 'audio_pop_party');
    if (sample) {
      onInsertElement(sample);
      onClose();
    }
  };

  // Top-level Recently used samples (matching Screenshot 2: Scenic frame, cloud circle, etc.)
  const topRecentElements = useMemo(() => [
    STUDIO_ELEMENTS.find((e) => e.id === 'frame_square_cloud')!,
    STUDIO_ELEMENTS.find((e) => e.id === 'frame_circle_cloud')!,
    STUDIO_ELEMENTS.find((e) => e.id === 'threed_cube')!,
    STUDIO_ELEMENTS.find((e) => e.id === 'graphic_springbok')!,
  ].filter(Boolean), []);

  const filteredElements = useMemo(() => {
    let list = STUDIO_ELEMENTS;
    if (selectedCategory) {
      list = list.filter((e) => e.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.nameEn.toLowerCase().includes(q)
          || e.nameAf.toLowerCase().includes(q)
          || (e.artist && e.artist.toLowerCase().includes(q))
          || e.keywords.some((k) => k.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [selectedCategory, searchQuery]);

  const renderCategoryIcon = (iconType: string) => {
    const cls = 'h-5 w-5 text-zinc-100';
    switch (iconType) {
      case 'shapes':
        return <Shapes className={cls} />;
      case 'flower':
        return <Flower2 className={cls} />;
      case 'box3d':
        return <Box className={cls} />;
      case 'smile':
        return <Smile className={cls} />;
      case 'photo':
        return <ImageIcon className={cls} />;
      case 'frame':
        return <Crop className={cls} />;
      case 'grid':
        return <Grid className={cls} />;
      case 'video':
        return <Video className={cls} />;
      case 'music':
        return <Music className={cls} />;
      case 'toggle':
        return <ToggleLeft className={cls} />;
      case 'shirt':
        return <Shirt className={cls} />;
      case 'chart':
        return <BarChart3 className={cls} />;
      case 'sheet':
        return <Sheet className={cls} />;
      case 'table':
        return <Table className={cls} />;
      default:
        return <Shapes className={cls} />;
    }
  };

  // Render horizontal carousel of elements with title and "See all"
  const renderSubcategoryCarousel = (
    title: string,
    items: readonly StudioElementItem[],
    aspectRatioSquare = true,
  ) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-200">{title}</span>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-200"
          >
            {t('elem.seeAll', 'See all')}
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap pb-1 scrollbar-thin">
          {items.map((el) => (
            <button
              key={el.id}
              type="button"
              onClick={() => {
                onInsertElement(el);
                onClose();
              }}
              className={`relative flex shrink-0 flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2 hover:border-amber-400/60 hover:bg-zinc-900 transition-all group ${
                aspectRatioSquare ? 'h-20 w-20' : 'h-20 w-32'
              }`}
            >
              {el.hasCrown && (
                <div className="absolute top-1.5 right-1.5 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-md bg-amber-500 text-zinc-950">
                  <Crown className="h-2 w-2 stroke-[2.5]" />
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={el.previewSvg}
                alt={lang === 'af' ? el.nameAf : el.nameEn}
                className="h-full w-full object-contain group-hover:scale-105 transition-transform"
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render audio list items matching Screenshot 3
  const renderAudioSection = (title: string, items: readonly StudioElementItem[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-200">{title}</span>
          <span className="text-[11px] font-semibold text-zinc-400">
            {t('elem.seeAll', 'See all')}
          </span>
        </div>
        <div className="space-y-2">
          {items.map((track) => {
            const isPlaying = playingAudioId === track.id;
            return (
              <div
                key={track.id}
                onClick={() => {
                  onInsertElement(track);
                  onClose();
                }}
                className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-2.5 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  {/* Play / Pause circular button */}
                  <button
                    type="button"
                    onClick={(e) => handlePlayAudio(track, e)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-black shadow-md hover:bg-emerald-400 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 fill-current" />
                    ) : (
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    )}
                  </button>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-100 group-hover:text-emerald-300 transition-colors">
                      {lang === 'af' ? track.nameAf : track.nameEn}
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      {track.artist} • {track.duration}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {track.hasCrown && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500 text-zinc-950">
                      <Crown className="h-3 w-3 stroke-[2.5]" />
                    </div>
                  )}
                  {isPlaying && (
                    <Volume2 className="h-4 w-4 text-emerald-400 animate-pulse" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('elem.modalTitle', 'Elements')}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-scrim/80 backdrop-blur-md" style={{ paddingBottom: barClearance(12) }}
    >
      <div className="flex h-full max-h-[92dvh] w-full max-w-2xl flex-col rounded-3xl border border-zinc-700/80 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header & Search Bar (Screenshot 1, 3, 4, 5) */}
        <div className="flex shrink-0 flex-col border-b border-zinc-800/80 p-4 sm:p-5 gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-100">
                {selectedCategory
                  ? t(
                    ELEMENT_CATEGORIES.find((c) => c.id === selectedCategory)?.nameKey ?? '',
                    ELEMENT_CATEGORIES.find((c) => c.id === selectedCategory)?.nameAf ?? 'Elemente',
                  )
                  : t('elem.modalTitle', 'Elements')}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('elem.close', 'Close')}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search bar matching screenshots */}
          <div className="relative flex items-center">
            <div className="pointer-events-none absolute left-3.5 flex items-center text-zinc-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('elem.searchPlaceholder', 'Search elements...')}
              className="w-full rounded-2xl border border-zinc-700/80 bg-zinc-900/90 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 shadow-inner focus:border-amber-400 focus:outline-hidden"
            />
            <div className="absolute right-3.5 flex items-center text-zinc-400 hover:text-zinc-200 cursor-pointer">
              <Mic className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* If actively searching: show unified matching grid */}
          {searchQuery.trim() ? (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredElements.map((el) => (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => {
                      onInsertElement(el);
                      onClose();
                    }}
                    className="flex flex-col items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 hover:border-amber-400/60 hover:bg-zinc-900 transition-all group"
                  >
                    <div className="flex h-24 w-full items-center justify-center p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={el.previewSvg}
                        alt={lang === 'af' ? el.nameAf : el.nameEn}
                        className="h-full w-full object-contain group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-300 text-center line-clamp-1 mt-1">
                      {lang === 'af' ? el.nameAf : el.nameEn}
                    </span>
                  </button>
                ))}
              </div>
              {filteredElements.length === 0 && (
                <div className="py-12 text-center text-xs text-zinc-500">
                  {t('elem.noResults', 'No elements found for your search.')}
                </div>
              )}
            </div>
          ) : selectedCategory === 'shapes' ? (
            /* ── Shapes Subview (Screenshot 1) ── */
            <div className="space-y-6">
              {renderSubcategoryCarousel(
                t('elem.recentlyUsed', 'Recently used'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'shapes' && (e.subcategory === 'basic' || e.subcategory === 'lines')).slice(0, 5),
              )}
              {renderSubcategoryCarousel(
                t('elem.lines', 'Lines'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'shapes' && e.subcategory === 'lines'),
              )}
              {renderSubcategoryCarousel(
                t('elem.basicShapes', 'Basic shapes'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'shapes' && e.subcategory === 'basic'),
              )}
              {renderSubcategoryCarousel(
                t('elem.polygons', 'Polygons'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'shapes' && e.subcategory === 'polygons'),
              )}
              {renderSubcategoryCarousel(
                t('elem.stars', 'Stars'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'shapes' && e.subcategory === 'stars'),
              )}
              {renderSubcategoryCarousel(
                t('elem.arrows', 'Arrows'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'shapes' && e.subcategory === 'arrows'),
              )}
              {renderSubcategoryCarousel(
                t('elem.flowchart', 'Flowchart shapes'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'shapes' && e.subcategory === 'flowchart'),
              )}
              {renderSubcategoryCarousel(
                t('elem.speechBubbles', 'Speech bubbles'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'shapes' && e.subcategory === 'speech'),
              )}
              {renderSubcategoryCarousel(
                t('elem.clouds', 'Clouds'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'shapes' && e.subcategory === 'clouds'),
              )}
              {renderSubcategoryCarousel(
                t('elem.hearts', 'Hearts'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'shapes' && e.subcategory === 'hearts'),
              )}
              {renderSubcategoryCarousel(
                t('elem.banners', 'Banners'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'shapes' && e.subcategory === 'banners'),
              )}
              {renderSubcategoryCarousel(
                t('elem.teardrops', 'Teardrops'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'shapes' && e.subcategory === 'teardrops'),
              )}
              {renderSubcategoryCarousel(
                t('elem.cogs', 'Cogs & engines'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'shapes' && e.subcategory === 'cogs'),
              )}
            </div>
          ) : selectedCategory === 'graphics' ? (
            /* ── Graphics Subview (Screenshot 4) ── */
            <div className="space-y-6">
              {renderSubcategoryCarousel(
                t('elem.recentlyUsed', 'Recently used'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'graphics' && e.subcategory === 'recent'),
              )}
              {renderSubcategoryCarousel(
                t('elem.magicRecommendations', 'Magic recommendations'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'graphics' && e.subcategory === 'magic'),
              )}
              {renderSubcategoryCarousel(
                t('elem.featured', 'Featured'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'graphics' && e.subcategory === 'featured'),
              )}
              {renderSubcategoryCarousel(
                t('elem.gradients', 'Gradients'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'graphics' && e.subcategory === 'gradient'),
              )}
              {renderSubcategoryCarousel(
                t('elem.socialMedia', 'Social media'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'graphics' && e.subcategory === 'social'),
              )}
            </div>
          ) : selectedCategory === 'animations' ? (
            /* ── Animations Subview (Screenshot 5) ── */
            <div className="space-y-6">
              {renderSubcategoryCarousel(
                t('elem.magicRecommendations', 'Magic recommendations'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'animations' && e.subcategory === 'magic'),
              )}
              {renderSubcategoryCarousel(
                t('elem.arrowAnimations', 'Arrow animations'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'animations' && e.subcategory === 'arrows'),
              )}
              {renderSubcategoryCarousel(
                t('elem.wordAnimations', 'Word animations'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'animations' && e.subcategory === 'words'),
              )}
              {renderSubcategoryCarousel(
                t('elem.foodAnimations', 'Food animations'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'animations' && e.subcategory === 'food'),
              )}
              {renderSubcategoryCarousel(
                t('elem.emojiAnimations', 'Emoji animations'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'animations' && e.subcategory === 'emojis'),
              )}
            </div>
          ) : selectedCategory === 'audio' ? (
            /* ── Audio Subview (Screenshot 3) ── */
            <div className="space-y-6">
              {/* Voiceovers purple banner */}
              <div>
                <span className="text-xs font-bold text-zinc-200 block pb-2">
                  {t('elem.voiceovers', 'Voice-overs')}
                </span>
                <button
                  type="button"
                  onClick={handleAiVoiceoverClick}
                  className="flex w-full items-center gap-4 rounded-2xl border border-purple-500/30 bg-linear-to-r from-purple-600/30 via-fuchsia-600/20 to-purple-800/30 p-3.5 text-left hover:border-purple-400/60 transition-all group"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-tr from-purple-500 to-fuchsia-500 text-white shadow-lg group-hover:scale-105 transition-transform">
                    <span className="text-base font-black">Aa</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-zinc-100 group-hover:text-purple-300 transition-colors">
                      {t('elem.generateAiVoice', 'Make an AI voice')}
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      {t('elem.aiVoiceSub', 'Make a spoken voice-over or sound for your post')}
                    </p>
                  </div>
                </button>
              </div>

              {renderAudioSection(
                t('elem.recentlyUsed', 'Recently used'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'audio' && e.subcategory === 'recent'),
              )}
              {renderAudioSection(
                t('elem.magicRecommendations', 'Magic recommendations'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'audio' && e.subcategory === 'magic'),
              )}
              {renderAudioSection(
                t('elem.upbeatTracks', 'Upbeat'),
                STUDIO_ELEMENTS.filter((e) => e.category === 'audio' && e.subcategory === 'upbeat'),
              )}
            </div>
          ) : selectedCategory ? (
            /* Generic category elements grid */
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredElements.map((el) => (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => {
                      onInsertElement(el);
                      onClose();
                    }}
                    className="flex flex-col items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 hover:border-amber-400/60 hover:bg-zinc-900 transition-all group"
                  >
                    <div className="flex h-24 w-full items-center justify-center p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={el.previewSvg}
                        alt={lang === 'af' ? el.nameAf : el.nameEn}
                        className="h-full w-full object-contain group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-300 text-center line-clamp-1 mt-1">
                      {lang === 'af' ? el.nameAf : el.nameEn}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Top-level Overview (Screenshot 2) ── */
            <div className="space-y-6">
              {/* Recently Used Carousel */}
              <div>
                <div className="flex items-center justify-between pb-2.5">
                  <span className="text-xs font-bold text-zinc-200">
                    {t('elem.recentlyUsed', 'Recently used')}
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400">
                    {t('elem.seeAll', 'See all')}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap pb-1 scrollbar-thin">
                  {topRecentElements.map((el) => (
                    <button
                      key={el.id}
                      type="button"
                      onClick={() => {
                        onInsertElement(el);
                        onClose();
                      }}
                      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2 hover:border-amber-400/60 hover:bg-zinc-900 transition-all group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={el.previewSvg}
                        alt={lang === 'af' ? el.nameAf : el.nameEn}
                        className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Browse Categories Grid */}
              <div>
                <span className="text-xs font-bold text-zinc-200 block pb-3">
                  {t('elem.browseCategories', 'Browse categories')}
                </span>
                <div className="grid grid-cols-3 gap-3.5 sm:gap-4">
                  {ELEMENT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-3 hover:border-zinc-700 hover:bg-zinc-900 transition-all group shadow-xs"
                    >
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-tr ${cat.colorGradient} shadow-md group-hover:scale-105 transition-transform`}
                      >
                        {renderCategoryIcon(cat.iconType)}
                      </div>
                      <span className="mt-2 text-xs font-bold text-zinc-200 group-hover:text-white text-center">
                        {lang === 'af' ? cat.nameAf : cat.nameEn}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
