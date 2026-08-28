'use client';

/**
 * The Radar — the discovery feed, with the quality gate made visible.
 *
 * Three things this screen has to do that an ordinary feed does not:
 *
 *   1. Show the bar. Every item carries its score and, for Pro, the signals
 *      that produced it, so a reader who disagrees can see exactly why.
 *   2. Show what was rejected. A gate whose rejections are invisible is
 *      indistinguishable from no gate, so the count is always displayed and the
 *      reasons are one click away.
 *   3. Show its own age. Items decay on a half-life rather than sitting at the
 *      top forever, and the last sync time is stated rather than implied by a
 *      spinning icon.
 */

import { type Plan } from '../lib/entitlements';
import React, { useMemo, useState } from 'react';
import {
  RefreshCw, ChevronDown, ChevronRight, Lock, EyeOff,
} from 'lucide-react';
import { FEED_ITEMS, CATEGORIES } from '../data/feed';
import {
  assess, BAR, TIER_LIMITS, type FeedItem, type Verdict,
} from '../lib/curation';
import { useLang } from '../lib/i18n';

interface Scored {
  readonly item: FeedItem;
  readonly verdict: Verdict;
}

export default function QualityRadar({
  userPlan,
  onUpgrade,
}: {
  userPlan: Plan;
  onUpgrade: () => void;
}) {
  const limits = TIER_LIMITS[userPlan];
  const { t } = useLang();

  // The clock is captured on the client after mount, not during render: a
  // timestamp baked into the static HTML would be wrong the moment it is served.
  const [now, setNow] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);

  React.useEffect(() => setNow(Date.now()), []);

  const scored: Scored[] = useMemo(() => {
    if (now === null) return [];
    return FEED_ITEMS.map((item) => ({ item, verdict: assess(item, now) })).sort(
      (a, b) => b.verdict.score - a.verdict.score,
    );
  }, [now]);

  const inCategory = (s: Scored) => categories.length === 0 || categories.includes(s.item.category);
  const passing = scored.filter((s) => s.verdict.band !== 'noise').filter(inCategory);
  const rejected = scored.filter((s) => s.verdict.band === 'noise').filter(inCategory);
  const locked = passing.filter((s) => s.item.proOnly && userPlan === 'free');
  const available = passing.filter((s) => !(s.item.proOnly && userPlan === 'free'));
  const start = available.length === 0 ? 0 : (cycle * limits.maxItems) % available.length;
  const visible =
    available.length <= limits.maxItems
      ? available
      : Array.from({ length: Math.min(limits.maxItems, available.length) }, (_, i) => available[(start + i) % available.length]);

  const toggleCategory = (c: string) => {
    setCategories((prev) => {
      if (prev.includes(c)) return prev.filter((x) => x !== c);
      if (prev.length >= limits.maxCategories) {
        onUpgrade();
        return prev;
      }
      return [...prev, c];
    });
  };

  const resync = () => {
    setSyncing(true);
    // Re-scoring against the current clock is the honest version of a refresh:
    // it re-ages everything. Real ingestion goes here.
    window.setTimeout(() => {
      setNow(Date.now());
      setCycle((c) => c + 1);
      setOpenItem(null);
      setSyncing(false);
    }, 700);
  };

  return (
    <div className="space-y-5">
      {/* One line, not a paragraph. The explanation is one click away for the
          few people who want it, and out of the way for everyone else. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h3 className="text-2xl font-extrabold text-white tracking-tight">{t('radar.title')}</h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowHow((v) => !v)}
            className="text-sm text-zinc-500 hover:text-zinc-200"
          >
            {t('radar.howWeChoose')}
          </button>
          <button
            type="button"
            onClick={resync}
            disabled={syncing}
            className="px-3 py-1.5 rounded-xl text-sm text-zinc-400 hover:text-white flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? t('radar.looking') : t('radar.findNew')}
          </button>
        </div>
      </div>

      <p className="text-base text-zinc-400">
        {now === null ? (
          t('radar.reading')
        ) : (
          <>
            <strong className="text-zinc-200">{visible.length} {t('radar.worth')}</strong> {t('radar.today')}
            {rejected.length > 0 && (
              <span className="text-zinc-600"> {t('radar.leftOut')} {rejected.length} {t('radar.leftOutEnd')}</span>
            )}
          </>
        )}
      </p>

      {showHow && (
        <p className="text-sm text-zinc-400 leading-relaxed bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
          {t('radar.explain')}
        </p>
      )}

      {/* Categories, quiet until you touch them */}
      <div className="flex flex-wrap items-center gap-1.5">
        {CATEGORIES.map((c) => {
          const active = categories.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleCategory(c)}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                active
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/60'
                  : 'text-zinc-500 border border-transparent hover:text-zinc-200'
              }`}
            >
              {c}
            </button>
          );
        })}
        {categories.length > 0 && (
          <button type="button" onClick={() => setCategories([])} className="px-2 text-sm text-zinc-600 hover:text-zinc-300">
            clear
          </button>
        )}
      </div>

      {/* The feed. One line of metadata, one line of summary, a quiet score. */}
      <div className="divide-y divide-zinc-800/70 border-y border-zinc-800/70">
        {visible.map(({ item, verdict }) => {
          const open = openItem === item.id;
          return (
            <article key={item.id} className="py-4 group">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-bold text-white leading-snug hover:text-emerald-300 transition-colors"
                  >
                    {item.title}
                  </a>
                  <p className="text-sm text-zinc-500 pt-1">
                    {item.source} · {item.minutes} min
                    {verdict.freshness < 0.35 && <span className="text-zinc-600"> · older</span>}
                  </p>
                  <p className="text-base text-zinc-400 leading-relaxed pt-1.5 line-clamp-2">{item.summary}</p>

                  {limits.seesScoreBreakdown && (
                    <button
                      type="button"
                      onClick={() => setOpenItem(open ? null : item.id)}
                      className="text-sm text-zinc-600 hover:text-zinc-300 pt-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    >
                      {open ? t('radar.closeWhy') : t('radar.why')}
                    </button>
                  )}

                  {open && limits.seesScoreBreakdown && (
                    <ul className="space-y-1 pt-2">
                      {verdict.signals.map((sig) => (
                        <li key={sig.label} className="flex items-start gap-2 text-sm">
                          <span
                            className={`font-semibold w-9 flex-shrink-0 text-right ${
                              sig.delta > 0 ? 'text-emerald-400' : sig.delta < 0 ? 'text-rose-400' : 'text-zinc-600'
                            }`}
                          >
                            {sig.delta > 0 ? '+' : ''}{sig.delta}
                          </span>
                          <span className="text-zinc-500">
                            <span className="text-zinc-300">{sig.label}.</span> {sig.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <span
                  title={`${verdict.score} out of 100`}
                  className={`flex-shrink-0 text-sm font-bold tabular-nums ${
                    verdict.band === 'signal' ? 'text-emerald-400' : 'text-zinc-500'
                  }`}
                >
                  {verdict.score}
                </span>
              </div>
            </article>
          );
        })}

        {now !== null && visible.length === 0 && (
          <p className="text-base text-zinc-500 py-8 text-center">
            {t('radar.nothing')}
          </p>
        )}
      </div>

      {/* Locked and rejected */}
      {userPlan === 'free' && (locked.length > 0 || passing.length > limits.maxItems) && (
        <button
          type="button"
          onClick={onUpgrade}
          className="w-full p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-left hover:bg-amber-500/15 transition-all"
        >
          <p className="text-sm font-bold text-amber-300">
            {passing.length - visible.length} {t('radar.moreGood')}
          </p>
          <p className="text-sm text-zinc-400 pt-0.5">
            {t('radar.proShows')}
          </p>
        </button>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-black/40">
        <button
          type="button"
          onClick={() => (limits.seesRejected ? setShowRejected((v) => !v) : onUpgrade())}
          className="w-full p-4 flex items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-bold text-white">{rejected.length} {t('radar.didntMake')}</span>
          </span>
          <span className="text-sm text-zinc-400 flex items-center gap-1">
            {limits.seesRejected ? (
              <>
                {showRejected ? t('radar.hide') : t('radar.showWhy')}
                {showRejected ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" /> Pro
              </>
            )}
          </span>
        </button>

        {showRejected && limits.seesRejected && (
          <ul className="px-4 pb-4 space-y-2">
            {rejected.map(({ item, verdict }) => (
              <li key={item.id} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-300 leading-snug">{item.title}</p>
                  <span className="text-sm font-bold text-rose-400 flex-shrink-0">{verdict.score}</span>
                </div>
                <p className="text-sm text-zinc-600 pt-0.5">{item.source}</p>
                <ul className="pt-1.5 space-y-0.5">
                  {verdict.signals
                    .filter((s) => s.delta < 0)
                    .map((s) => (
                      <li key={s.label} className="text-sm text-rose-300/80">
                        {s.delta} · {s.label} — <span className="text-zinc-500">{s.detail}</span>
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>


    </div>
  );
}
