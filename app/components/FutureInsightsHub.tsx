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
  Mic,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
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
  /* The reader paints over the whole app, so Back must close it rather than
     unwind past it — the rule every overlay keeps, held by `check:backlayers`. */
  useBackLayer(Boolean(readingArticle), () => setReadingArticle(null));

  const displayedArticles = FUTURE_INSIGHTS.filter((item) => {
    if (viewFilter === 'podcasts' && item.category !== 'podcast' && !item.episode) {
      return false;
    }
    if (viewFilter === 'articles' && (item.category === 'podcast' || item.episode)) {
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
              {t('insight.adFreeBadge', 'No adverts, ever')}
            </span>
            {/* No "quality verified" badge beside it: nothing here has been
                verified against anything, and a percentage that nobody measured
                is the kind of number this app does not show. `lib/futureinsights.ts`
                carries the note. */}
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
                ? 'bg-emerald-500 text-onAccent shadow-md font-black'
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
                ? 'bg-teal-500 text-onAccent shadow-md font-black'
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
                ? 'bg-emerald-500 text-onAccent shadow-md font-black'
                : 'border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>{t('insight.quickArticles', 'Curated Articles')}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Category Selector Chips ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
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
                  ? 'border border-emerald-400 bg-emerald-500 text-onAccent shadow-[0_0_15px_rgba(16,185,129,0.25)]'
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
          const isPodcast = article.category === 'podcast' || Boolean(article.episode);

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

                {/* An episode outline says what the recording would be about */}
                {article.episode && (
                  <div className="rounded-xl border border-teal-500/25 bg-teal-950/30 p-2.5 text-xs">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-teal-400">
                      {t('insight.episodeOutline', 'Episode outline for the podcast studio')}
                    </span>
                    <span className="block text-teal-200 pt-0.5">
                      {lang === 'af' ? article.episode.topicAf : article.episode.topicEn}
                    </span>
                  </div>
                )}

                <p className="text-[11px] text-zinc-500 font-mono truncate">
                  {t('insight.byFutureBox', 'Written by FutureBox')}
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
                          <span className="hidden sm:inline">{t('insight.openInPodcastStudio', 'Open in Podcast Studio')}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setReadingArticle(article)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 px-3.5 py-1.5 text-xs font-black text-onAccent transition-colors shadow-sm"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{t('insight.readEpisode', 'Read the outline')}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReadingArticle(article)}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/85 p-4 sm:p-6 backdrop-blur-md overflow-y-auto"
          /* Below the tab bar, so the strip stays reachable — the rule every
             overlay under z-50 keeps; `check:belowtabs` holds it by name. */
          style={{ paddingBottom: barClearance(16) }}
        >
          <div className="relative w-full max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-10 shadow-2xl space-y-6 my-auto">
            {/* Header row with badges and close */}
            <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
                  {t('insight.byFutureBox', 'Written by FutureBox')}
                </span>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-950/30 px-3 py-1 text-xs font-bold text-emerald-400">
                  {t('insight.noAdsGuaranteed', 'No adverts')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReadingArticle(null)}
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

            {/* The episode outline, and the door to the room that records it.
                What stood here until 12 October 2026 was a play button, a
                "02:45" counter and eighteen bars that danced — over no audio
                file at all. A player with nothing behind it is a broken player
                dressed up, so it is gone; the outline and the door are what is
                real. */}
            {readingArticle.episode && (
              <div className="rounded-2xl border border-teal-500/40 bg-gradient-to-r from-teal-950/60 via-zinc-900 to-zinc-950 p-5 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-300">
                  <Headphones className="h-4 w-4" />
                  <span>{t('insight.episodeOutline', 'Episode outline for the podcast studio')}</span>
                </div>
                <p className="text-base font-bold text-white">
                  {lang === 'af' ? readingArticle.episode.topicAf : readingArticle.episode.topicEn}
                </p>
                {onOpenPodcast && (
                  <div className="pt-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setReadingArticle(null);
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
                {t('insight.byFutureBox', 'Written by FutureBox')}
              </span>
              <button
                type="button"
                onClick={() => setReadingArticle(null)}
                className="min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 text-sm font-bold text-onAccent transition-colors"
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
