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

import React, { useMemo, useState } from 'react';
import {
  RefreshCw, ShieldCheck, ChevronDown, ChevronRight, Lock, ExternalLink,
  Clock, Filter, EyeOff,
} from 'lucide-react';
import { FEED_ITEMS, CATEGORIES } from '../data/feed';
import {
  assess, BAR, BAND_LABELS, BAND_STYLES, TIER_LIMITS, type FeedItem, type Verdict,
} from '../lib/curation';

interface Scored {
  readonly item: FeedItem;
  readonly verdict: Verdict;
}

export default function QualityRadar({
  userPlan,
  onUpgrade,
}: {
  userPlan: 'free' | 'pro';
  onUpgrade: () => void;
}) {
  const limits = TIER_LIMITS[userPlan];

  // The clock is captured on the client after mount, not during render: a
  // timestamp baked into the static HTML would be wrong the moment it is served.
  const [now, setNow] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);
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
  const visible = passing.filter((s) => !(s.item.proOnly && userPlan === 'free')).slice(0, limits.maxItems);

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
      setSyncing(false);
    }, 900);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            The Radar
          </h3>
          <p className="text-sm text-zinc-400 pt-1 leading-relaxed">
            Everything is scored before it is shown. Items below {BAR}/100 do not appear in the feed — they are counted
            in the rejected pile with the reason. Scores decay with age, so nothing sits at the top forever.
          </p>
        </div>
        <button
          type="button"
          onClick={resync}
          disabled={syncing}
          className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Re-scoring…' : 'Re-scan and re-score'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {now === null ? 'Scoring…' : `Scored ${new Date(now).toLocaleTimeString()}`}
        </span>
        <span>{passing.length} passed</span>
        <span className="text-rose-400">{rejected.length} below the bar</span>
        {userPlan === 'free' && locked.length > 0 && <span className="text-amber-400">{locked.length} Pro-only</span>}
      </div>

      {/* Categories — free plans pick a couple, Pro picks freely */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          Categories
          <span className="font-normal text-zinc-500">
            {limits.maxCategories >= 99 ? '· pick as many as you like' : `· ${categories.length}/${limits.maxCategories} on this plan`}
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const active = categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                  active
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                {c}
              </button>
            );
          })}
          {categories.length > 0 && (
            <button
              type="button"
              onClick={() => setCategories([])}
              className="px-3 py-1.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* The feed */}
      <div className="space-y-2.5">
        {visible.map(({ item, verdict }) => {
          const open = openItem === item.id;
          return (
            <article key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-all">
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-white leading-snug">{item.title}</h4>
                    <p className="text-sm text-zinc-500 pt-0.5">
                      {item.source} · {item.kind} · {item.minutes} min · {item.category}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-sm font-bold border flex-shrink-0 ${BAND_STYLES[verdict.band]}`}>
                    {verdict.score} · {BAND_LABELS[verdict.band]}
                  </span>
                </div>

                <p className="text-sm text-zinc-400 leading-relaxed">{item.summary}</p>

                <div className="flex items-center gap-3">
                  <div className="h-1 flex-1 rounded-full bg-zinc-800 overflow-hidden max-w-[160px]">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.round(verdict.freshness * 100)}%` }} />
                  </div>
                  <span className="text-sm text-zinc-500">{Math.round(verdict.freshness * 100)}% fresh</span>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-sm text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {limits.seesScoreBreakdown ? (
                  <button
                    type="button"
                    onClick={() => setOpenItem(open ? null : item.id)}
                    className="text-sm text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Why it scored {verdict.score}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onUpgrade}
                    className="text-sm text-amber-400 hover:underline flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    See the score breakdown with Pro
                  </button>
                )}

                {open && limits.seesScoreBreakdown && (
                  <ul className="space-y-1 pt-1 border-t border-zinc-800">
                    {verdict.signals.map((sig) => (
                      <li key={sig.label} className="flex items-start gap-2 text-sm">
                        <span
                          className={`font-bold w-10 flex-shrink-0 text-right ${
                            sig.delta > 0 ? 'text-emerald-400' : sig.delta < 0 ? 'text-rose-400' : 'text-zinc-500'
                          }`}
                        >
                          {sig.delta > 0 ? '+' : ''}
                          {sig.delta}
                        </span>
                        <span>
                          <span className="text-zinc-200 font-medium">{sig.label}.</span>{' '}
                          <span className="text-zinc-500">{sig.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          );
        })}

        {now !== null && visible.length === 0 && (
          <p className="text-sm text-zinc-500 p-6 text-center border border-dashed border-zinc-800 rounded-2xl">
            Nothing passed the bar in those categories. That is the gate working, not an empty feed.
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
            {passing.length - visible.length} more items passed the bar than this plan shows
          </p>
          <p className="text-sm text-zinc-400 pt-0.5">
            Pro lifts the cap to {TIER_LIMITS.pro.maxItems}, opens every category, and shows the score breakdown and
            the rejected pile.
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
            <span className="text-sm font-bold text-white">{rejected.length} items were rejected this cycle</span>
          </span>
          <span className="text-sm text-zinc-400 flex items-center gap-1">
            {limits.seesRejected ? (
              <>
                {showRejected ? 'Hide' : 'Show why'}
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

      <p className="text-sm text-zinc-600 leading-relaxed">
        These entries are sample data — FutureBox has no ingestion pipeline yet, so nothing here was fetched from a
        source. The scoring is real and runs on every item; what is missing is the feed behind it. Scoring also only
        reads what a feed entry exposes: who published it, how the title and summary are written, how long it is and
        how old. Judging whether an argument is <em>correct</em> needs the full text and, past that, a person.
      </p>
    </div>
  );
}
