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
  FileText, Newspaper, PlayCircle, Headphones,
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

/**
 * A mark for what the thing is: a paper, an article, a talk, a listen.
 *
 * Deliberately a symbol and deliberately grey. The rows already carry one
 * colour — the score — and that colour means something. A second colour that
 * means nothing competes with it, which is how the artwork this replaced ended
 * up being the loudest thing on a page about judging quality.
 */
function KindMark({ kind }: { kind: FeedItem['kind'] }): React.ReactElement {
  const { t } = useLang();
  const marks = {
    paper: { Icon: FileText, label: t('radar.kind.paper', 'Paper') },
    article: { Icon: Newspaper, label: t('radar.kind.article', 'Article') },
    video: { Icon: PlayCircle, label: t('radar.kind.video', 'Watch') },
    podcast: { Icon: Headphones, label: t('radar.kind.podcast', 'Listen') },
  } as const;
  const { Icon, label } = marks[kind];
  return (
    <span
      title={label}
      className="hidden sm:flex flex-col items-center gap-1 w-14 flex-shrink-0 pt-0.5 text-zinc-500"
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      <span className="text-[11px] font-semibold leading-none">{label}</span>
    </span>
  );
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
  /* Rotate, always — not only when there is more than a screenful.
     The window was skipped entirely when everything already fitted, which on a
     paid plan is the normal case: forty slots against about twenty items. So
     the button that says "show me others" provably could not change the list,
     which is exactly how it felt. Rotating by a smaller step than the page
     size also means the list *reorders* rather than jumping a whole screen,
     which is the point — you are looking for something you have not read, and
     it is easier to spot at the top than three screens down. */
  const step = Math.max(1, Math.round(limits.maxItems / 3));
  const start = available.length === 0 ? 0 : (cycle * step) % available.length;
  const shown = Math.min(limits.maxItems, available.length);
  const visible = Array.from({ length: shown }, (_, i) => available[(start + i) % available.length]);

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
    /* Two real things happen, and neither is fetching a story that did not
       exist a second ago: everything is re-scored against the current clock,
       which re-ages it, and the order rotates so a different set leads.
       There is no live ingestion behind this yet — the button's words say
       "show me others" rather than "find new stories" for that reason, and the
       line under the heading says where these come from. */
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
            aria-expanded={showHow}
            className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
              showHow
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {t('radar.howWeChoose')}
          </button>
          <button
            type="button"
            onClick={resync}
            disabled={syncing}
            className="px-3 py-1.5 rounded-xl text-sm bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center gap-1.5 disabled:opacity-50"
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

      {/* Where they come from, said once. The refresh re-ages and reorders a
          curated set; it does not go and look. Better said here than implied
          by a button. */}
      <p className="text-xs text-zinc-500 leading-relaxed">
        {t('radar.source', 'A curated set, re-scored and reordered each time you ask. Not a live feed.')}
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
              aria-pressed={active}
              className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                active
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
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
            className="px-3 py-1.5 rounded-xl text-sm bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          >
            {t('radar.clear', 'Clear')}
          </button>
        )}
      </div>

      {/* The feed. One line of metadata, one line of summary, a quiet score. */}
      <div className="divide-y divide-zinc-800/70 border-y border-zinc-800/70">
        {visible.map(({ item, verdict }) => {
          const open = openItem === item.id;
          return (
            <article key={item.id} className="py-4 group">
              <div className="flex items-start gap-3">
                {/* What kind of thing this is, and nothing more.

                    This was a picture: a wide block of generated artwork drawn
                    from the title. It looked like a photograph of the article
                    and it was not one — we hold no image for any of these, and
                    an invented one next to a real paper is the app implying
                    something untrue, which is the whole thing it refuses to do
                    everywhere else. So the colour is gone and the space with
                    it, and what is left is a mark that says paper, article,
                    talk or listen — clearly a symbol, and the fastest thing to
                    read in a list you are scanning. */}
                <KindMark kind={item.kind} />
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
