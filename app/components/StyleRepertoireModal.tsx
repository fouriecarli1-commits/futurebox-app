'use client';

/**
 * Style Repertoire Modal — Browse, filter, and listen to music styles.
 *
 * Provides auditioning of genre styles with Web Audio sketch previews
 * before applying the style snippet to the song canvas.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Music, Pause, Play, Search, Volume2, X } from 'lucide-react';
import { GENRE_CATEGORIES, GENRE_SAMPLES, type GenreSample } from '../data/genres';
import { sketch, supported, type Sketch } from '../lib/preview';
import { useLang } from '../lib/i18n';

interface StyleRepertoireModalProps {
  readonly currentStyle: string;
  readonly onClose: () => void;
  readonly onSelectStyle: (promptSnippet: string, append: boolean) => void;
}

export default function StyleRepertoireModal({
  currentStyle,
  onClose,
  onSelectStyle,
}: StyleRepertoireModalProps): React.ReactElement {
  const { t, lang } = useLang();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [playingName, setPlayingName] = useState<string | null>(null);
  const activeSketch = useRef<Sketch | null>(null);
  const audioSupported = useMemo(() => supported(), []);

  // Cleanup sketch when unmounting or changing tracks
  useEffect(() => {
    return () => {
      activeSketch.current?.stop();
      activeSketch.current = null;
    };
  }, []);

  const stopAudio = () => {
    activeSketch.current?.stop();
    activeSketch.current = null;
    setPlayingName(null);
  };

  const toggleAudition = (sample: GenreSample) => {
    if (playingName === sample.name) {
      stopAudio();
      return;
    }
    stopAudio();
    if (!audioSupported) return;
    try {
      const s = sketch(sample);
      if (s) {
        activeSketch.current = s;
        setPlayingName(sample.name);
      }
    } catch {
      stopAudio();
    }
  };

  const filteredSamples = useMemo(() => {
    return GENRE_SAMPLES.filter((sample) => {
      const matchCat =
        selectedCategory === 'All' || sample.category === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        sample.name.toLowerCase().includes(q) ||
        sample.subgenre.toLowerCase().includes(q) ||
        sample.description.toLowerCase().includes(q) ||
        sample.promptSnippet.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [selectedCategory, search]);

  const allCategories = useMemo(() => ['All', ...GENRE_CATEGORIES], []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('repertoire.title', 'Song Style Repertoire')}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-scrim/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/60 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{t('repertoire.title', 'Song Style Repertoire')}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                  {GENRE_SAMPLES.length} {t('repertoire.styles', 'styles')}
                </span>
              </h3>
              <p className="text-xs text-zinc-400 truncate">
                {t(
                  'repertoire.subtitle',
                  'Browse real genres, audition grooves in your browser, and apply to your song.',
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopAudio();
              onClose();
            }}
            aria-label={t('common.close', 'Close')}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/30 space-y-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(
                  'repertoire.searchPlaceholder',
                  'Search styles, tempo, instruments, feeling…',
                )}
                className="w-full pl-9 pr-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            {playingName && (
              <button
                type="button"
                onClick={stopAudio}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold hover:bg-rose-500/25 transition-all"
              >
                <Pause className="w-3.5 h-3.5 animate-pulse" />
                <span>{t('repertoire.stopAudio', 'Stop sound')}</span>
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pb-1 scrollbar-thin">
            {allCategories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-emerald-500 border border-emerald-400 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                      : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat === 'All' ? t('repertoire.all', 'All') : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Style Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
          {filteredSamples.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 space-y-2">
              <Music className="w-10 h-10 mx-auto text-zinc-700" />
              <p className="text-sm font-semibold">{t('repertoire.empty', 'No styles match your search.')}</p>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                }}
                className="text-xs text-emerald-400 underline hover:text-emerald-300"
              >
                {t('repertoire.resetFilters', 'Reset filters')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSamples.map((sample) => {
                const isPlaying = playingName === sample.name;
                const isSelected = currentStyle.toLowerCase().includes(sample.name.toLowerCase());

                return (
                  <div
                    key={sample.name}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isPlaying
                        ? 'bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                        : isSelected
                        ? 'bg-zinc-900/80 border-emerald-500/40'
                        : 'bg-zinc-900/40 hover:bg-zinc-900/70 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                            <span>{sample.name}</span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            )}
                          </h4>
                          <p className="text-xs font-semibold text-emerald-400/90">{sample.subgenre}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-zinc-800/90 text-zinc-300 border border-zinc-700/60 flex-shrink-0">
                          <span>{sample.bpm}</span>
                          <span>·</span>
                          <span>{sample.key}</span>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                        {sample.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-zinc-800/60">
                      {/* Audition Play Button */}
                      <button
                        type="button"
                        onClick={() => toggleAudition(sample)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isPlaying
                            ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span>{t('repertoire.playing', 'Listening…')}</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>{t('repertoire.audition', 'Listen')}</span>
                          </>
                        )}
                      </button>

                      {/* Select Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            stopAudio();
                            onSelectStyle(sample.promptSnippet, true);
                            onClose();
                          }}
                          title={t('repertoire.appendTip', 'Add this style to current sound')}
                          className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-all"
                        >
                          + {t('repertoire.append', 'Add')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            stopAudio();
                            onSelectStyle(sample.promptSnippet, false);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 hover:text-emerald-200 text-xs font-bold transition-all"
                        >
                          {t('repertoire.select', 'Choose style')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
