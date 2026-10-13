'use client';

/**
 * Future Insights Hub — High-Quality, Ad-Free Articles and Visionary Podcasts.
 *
 * ── What Carli asked for ─────────────────────────────────────────────────
 *
 * Carli, 12 October 2026: *"Kyk ook na elke kamer, na spotlight, hoe artikels
 * uitgelig word, ek is ook opsoek na kwaliteit toekomsgerigte artikels, oor AI,
 * besigheid, vibecoding, gaming, en technologies oor alle velde wat vooruitgaan.
 * Die artikels word gerate volgens kwaliteit van bronne, en die artikels moet ad
 * free wees. Dieselfde met toekomsgerigte podcasts (soos dairy of a CEO, en
 * ander)... Ek wil mense se aandag trek. Hou asb by die futurebox groen...
 * want ons word die voorlopers vir die toekoms, kom ons dink anders en doen anders."*
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Cpu,
  TrendingUp,
  Code2,
  Gamepad2,
  Rocket,
  Headphones,
  ShieldCheck,
  Check,
  Clock,
  ArrowRight,
  X,
  BookOpen,
  Star,
  ExternalLink,
  Play,
  Pause,
  Mic,
  Volume2,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { barClearance } from './TabBar';
import {
  INSIGHT_CATEGORIES,
  FUTURE_INSIGHTS,
  type InsightCategory,
  type InsightArticle,
  getInsightsByCategory,
} from '../lib/futureinsights';

interface FutureInsightsHubProps {
  onOpenStudio?: () => void;
  onOpenPodcast?: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactElement> = {
  sparkles: <Sparkles className="h-4 w-4" />,
  cpu: <Cpu className="h-4 w-4" />,
  trendingUp: <TrendingUp className="h-4 w-4" />,
  code2: <Code2 className="h-4 w-4" />,
  gamepad: <Gamepad2 className="h-4 w-4" />,
  rocket: <Rocket className="h-4 w-4" />,
  headphones: <Headphones className="h-4 w-4" />,
};

export default function FutureInsightsHub({
  onOpenStudio,
  onOpenPodcast,
}: FutureInsightsHubProps): React.ReactElement {
  const { lang, t } = useLang();
  const [viewFilter, setViewFilter] = useState<'all' | 'podcasts' | 'articles'>('all');
  const [activeCategory, setActiveCategory] = useState<InsightCategory>('all');
  const [readingArticle, setReadingArticle] = useState<InsightArticle | null>(null);
  const [isPlayingPodcast, setIsPlayingPodcast] = useState(false);

  const displayedArticles = FUTURE_INSIGHTS.filter((item) => {
    if (viewFilter === 'podcasts' && item.category !== 'podcast' && !item.podcastRef) {
      return false;
    }
    if (viewFilter === 'articles' && (item.category === 'podcast' || item.podcastRef)) {
      return false;
    }
    if (activeCategory !== 'all' && item.category !== activeCategory) {
      return false;
    }
    return true;
  });

  return (
    <section className="space-y-6 pt-4" data-futureinsights>
      {/* ── 1. Section Header & Ad-Free / Quality Badges ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/50 px-3 py-1 text-xs font-black text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              {t('insight.adFreeBadge', '100% Ad-Free • Advertensievry')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-950/40 px-3 py-1 text-xs font-bold text-teal-300">
              <Star className="h-3.5 w-3.5 text-teal-400 fill-teal-400/30" />
              {t('insight.ratingBadge', 'Quality Verified • 95%+ Bron-gehalte')}
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-emerald-400 flex-shrink-0" />
            <span>{t('insight.hubTitle', 'Future Insights & Thought Leadership')}</span>
          </h3>
          <p className="text-sm text-zinc-400 pt-1 max-w-2xl">
            {t(
              'insight.hubSub',
              'Deep, curated analysis on AI, autonomous software, creator sovereignty, and frontier technologies.',
            )}
          </p>
        </div>

        {/* Quick View Filter: All, Visionary Podcasts, or Curated Articles */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setViewFilter('all');
              setActiveCategory('all');
            }}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewFilter === 'all'
                ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                : 'border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t('insight.quickAll', 'All Insights')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewFilter('podcasts');
              setActiveCategory('all');
            }}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewFilter === 'podcasts'
                ? 'bg-teal-500 text-zinc-950 shadow-md font-black'
                : 'border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white'
            }`}
          >
            <Headphones className="h-3.5 w-3.5" />
            <span>{t('insight.quickPodcasts', 'Visionary Podcasts')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setViewFilter('articles');
              setActiveCategory('all');
            }}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewFilter === 'articles'
                ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                : 'border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>{t('insight.quickArticles', 'Curated Articles')}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Category Selector Chips ─────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {INSIGHT_CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.id && viewFilter === 'all';
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setViewFilter('all');
                setActiveCategory(cat.id);
              }}
              className={`inline-flex min-h-[44px] flex-shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                isSelected
                  ? 'border border-emerald-400 bg-emerald-950 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'border border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {CATEGORY_ICONS[cat.iconName]}
              <span>{lang === 'af' ? cat.af : cat.en}</span>
            </button>
          );
        })}
      </div>

      {/* ── 3. Articles Grid (Responsive Mobile, Tablet, Desktop) ──────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedArticles.map((article) => {
          const title = lang === 'af' ? article.titleAf : article.titleEn;
          const blurb = lang === 'af' ? article.blurbAf : article.blurbEn;
          const readTime = lang === 'af' ? article.readTimeAf : article.readTimeEn;
          const isPodcast = article.category === 'podcast' || Boolean(article.podcastRef);

          return (
            <article
              key={article.id}
              className={`flex flex-col justify-between rounded-2xl border p-5 transition-all group ${
                isPodcast
                  ? 'border-teal-500/30 bg-gradient-to-b from-teal-950/20 via-zinc-900/80 to-zinc-950/90 hover:border-teal-400/60 hover:shadow-[0_0_25px_rgba(20,184,166,0.15)]'
                  : 'border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.12)]'
              }`}
            >
              <div className="space-y-3">
                {/* Meta row: Category pill & Source Rating badge */}
                <div className="flex items-center justify-between gap-2">
                  {isPodcast ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-950/70 border border-teal-500/40 px-2 py-0.5 text-[11px] font-mono font-bold text-teal-300">
                      <Headphones className="h-3 w-3 text-teal-400" />
                      <span>{t('insight.podcastBadge', 'Visionary Podcast')}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-300">
                      {article.category.toUpperCase()}
                    </span>
                  )}
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-300"
                    title={t('insight.sourceTooltip', 'Source Reliability Rating')}
                  >
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span>{article.sourceRating}% {t('insight.scoreShort', 'Quality')}</span>
                  </span>
                </div>

                {/* Title */}
                <h4 className={`text-base font-bold leading-snug transition-colors ${
                  isPodcast
                    ? 'text-white group-hover:text-teal-300'
                    : 'text-white group-hover:text-emerald-300'
                }`}>
                  {title}
                </h4>

                {/* Blurb */}
                <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                  {blurb}
                </p>

                {/* Podcast reference details if available */}
                {article.podcastRef && (
                  <div className="rounded-xl border border-teal-500/25 bg-teal-950/30 p-2.5 flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-teal-200 truncate">
                      {article.podcastRef.show} · {article.podcastRef.host}
                    </span>
                    <span className="text-[11px] font-mono text-teal-400/90 flex-shrink-0">
                      {article.podcastRef.duration}
                    </span>
                  </div>
                )}

                {/* Source citation */}
                <p className="text-[11px] text-zinc-500 font-mono truncate">
                  {t('insight.sourceBy', 'Source:')} {article.sourceName}
                </p>
              </div>

              {/* Bottom footer: Read time & Open Reader / Listen button */}
              <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-2 mt-4">
                <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  <span>{readTime}</span>
                </span>
                <div className="flex items-center gap-2">
                  {isPodcast ? (
                    <>
                      {onOpenPodcast && (
                        <button
                          type="button"
                          onClick={() => onOpenPodcast()}
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-teal-500/30 bg-teal-950/40 hover:bg-teal-900/50 px-2.5 py-1.5 text-xs font-bold text-teal-300 transition-colors"
                          title={t('insight.openInPodcastStudio', 'Open in Podcast Studio')}
                        >
                          <Mic className="h-3.5 w-3.5 text-teal-400" />
                          <span className="hidden sm:inline">{t('insight.studioShort', 'Studio')}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setReadingArticle(article);
                          setIsPlayingPodcast(true);
                        }}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 px-3.5 py-1.5 text-xs font-black text-zinc-950 transition-colors shadow-sm"
                      >
                        <Headphones className="h-3.5 w-3.5" />
                        <span>{t('insight.listenPodcast', 'Listen to Podcast')}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setReadingArticle(article);
                        setIsPlayingPodcast(false);
                      }}
                      className="inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>{t('insight.readArticle', 'Read Insights')}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ── 4. Full-Screen / Modal Reader (Ad-Free Reading Experience) ─── */}
      {readingArticle && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-6 backdrop-blur-md overflow-y-auto"
          /* Below the tab bar, so the strip stays reachable — the rule every
             overlay under z-50 keeps; `check:belowtabs` holds it by name. */
          style={{ paddingBottom: barClearance(16) }}
        >
          <div className="relative w-full max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-10 shadow-2xl space-y-6 my-auto">
            {/* Header row with badges and close */}
            <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 text-xs font-bold text-emerald-300">
                  {t('insight.verifiedSource', 'Verified Source')} · {readingArticle.sourceRating}%
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
                  {readingArticle.sourceName}
                </span>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-950/30 px-3 py-1 text-xs font-bold text-emerald-400">
                  {t('insight.noAdsGuaranteed', '100% Ad-Free')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReadingArticle(null);
                  setIsPlayingPodcast(false);
                }}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white"
                aria-label={t('insight.close', 'Close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Title & Published Date */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {lang === 'af' ? readingArticle.titleAf : readingArticle.titleEn}
              </h2>
              <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                <span>{readingArticle.publishedDate}</span>
                <span>•</span>
                <span>{lang === 'af' ? readingArticle.readTimeAf : readingArticle.readTimeEn}</span>
              </div>
            </div>

            {/* Podcast Player Card with Live Waveform Animation if present */}
            {readingArticle.podcastRef && (
              <div className="rounded-2xl border border-teal-500/40 bg-gradient-to-r from-teal-950/60 via-zinc-900 to-zinc-950 p-5 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-300">
                    <Headphones className="h-4 w-4" />
                    <span>{t('insight.featuredPodcast', 'Featured Visionary Podcast')}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-teal-400">
                    {readingArticle.podcastRef.duration}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">
                    {readingArticle.podcastRef.show} — {readingArticle.podcastRef.host}
                  </h4>
                  <p className="text-xs text-zinc-300">
                    {lang === 'af' ? readingArticle.podcastRef.topicAf : readingArticle.podcastRef.topicEn}
                  </p>
                </div>

                {/* Audio Simulation Player */}
                <div className="rounded-xl border border-teal-500/20 bg-zinc-900/90 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPlayingPodcast(!isPlayingPodcast)}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-teal-500 text-zinc-950 hover:bg-teal-400 transition-colors font-bold flex-shrink-0"
                      aria-label={isPlayingPodcast ? t('insight.pausePreview', 'Pause Audio Preview') : t('insight.playPreview', 'Play Audio Preview')}
                    >
                      {isPlayingPodcast ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                    </button>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                        <span className="flex items-center gap-1.5 text-teal-300 font-bold truncate">
                          {isPlayingPodcast && <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping flex-shrink-0" />}
                          <span>{isPlayingPodcast ? t('insight.playingEpisode', 'Playing Visionary Episode') : t('insight.playPreview', 'Play Audio Preview')}</span>
                        </span>
                        <span className="flex-shrink-0">{isPlayingPodcast ? '02:45 / ' + readingArticle.podcastRef.duration : '00:00 / ' + readingArticle.podcastRef.duration}</span>
                      </div>
                      {/* Animated Equalizer wave bars */}
                      <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden flex items-center gap-0.5 px-0.5">
                        {[40, 70, 95, 60, 80, 50, 100, 75, 45, 90, 65, 85, 30, 95, 55, 75, 85, 60].map((h, i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-all duration-300 ${
                              isPlayingPodcast ? 'bg-teal-400' : 'bg-zinc-700'
                            }`}
                            style={{
                              height: isPlayingPodcast ? `${Math.max(20, (h + (i % 3) * 15) % 100)}%` : '30%',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {onOpenPodcast && (
                  <div className="pt-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setReadingArticle(null);
                        setIsPlayingPodcast(false);
                        onOpenPodcast();
                      }}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-teal-500/40 bg-teal-950/60 hover:bg-teal-900/80 px-4 py-2 text-xs font-bold text-teal-200 transition-colors"
                    >
                      <Mic className="h-4 w-4 text-teal-400" />
                      <span>{t('insight.openInPodcastStudio', 'Open in Podcast Studio')}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-teal-400" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Key Takeaways block */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t('insight.keyTakeaways', 'Executive Takeaways')}</span>
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-zinc-200">
                {(lang === 'af' ? readingArticle.takeawaysAf : readingArticle.takeawaysEn).map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Full article body paragraphs */}
            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-zinc-300 font-normal">
              {(lang === 'af' ? readingArticle.bodyAf : readingArticle.bodyEn).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {/* Action footer */}
            <div className="border-t border-zinc-800 pt-5 flex items-center justify-between gap-4">
              <span className="text-xs text-zinc-500">
                Futurebox Thought Leadership Series
              </span>
              <button
                type="button"
                onClick={() => {
                  setReadingArticle(null);
                  setIsPlayingPodcast(false);
                }}
                className="min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 text-sm font-bold text-zinc-950 transition-colors"
              >
                {t('insight.doneReading', 'Done Reading')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
