'use client';

/**
 * The counters.
 *
 * Every number here came out of the database. There is no seeding, no "join
 * 10,000 creators", no figure that starts at a flattering number and climbs —
 * and that restraint is the entire reason to put counters on a page at all. A
 * board that can be caught inventing once is never believed again, including
 * the parts of it that were true.
 *
 * Which means the empty case is a real case and is designed for rather than
 * avoided: a new app shows small numbers, and small true numbers are worth more
 * than large invented ones. When the database is not configured the board does
 * not render at all.
 *
 * The numbers move when they change. They roll from the previous real figure to
 * the new one, never from zero, because a count-up from zero on first paint
 * shows numbers that were never true for the sake of the animation.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Users, CreditCard, Music2, Video, GraduationCap, BookOpen, Headphones, Eye, type LucideIcon,
} from 'lucide-react';
import type { Board, EventKind } from '../lib/server/stats';
import { useLang } from '../lib/i18n';

export type { Board };

/** Which counters belong on which page. */
export type Scope = 'all' | 'masterclasses' | 'futurebox' | 'creations' | 'radar';

/**
 * The board, fetched once and refreshed while the page is being looked at.
 *
 * Polling stops when the tab is hidden. A counter nobody is watching is not
 * worth a request every half minute, times every open tab, forever.
 */
export function useBoard(): Board | null {
  const [board, setBoard] = useState<Board | null>(null);

  useEffect(() => {
    let alive = true;

    const read = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await fetch('/api/stats');
        // 204 is "no database configured", and the board stays hidden.
        if (!alive || response.status !== 200) return;
        setBoard((await response.json()) as Board);
      } catch {
        // Left as it was. A counter that fails is a counter that does not move,
        // not an error the person reading the page has to deal with.
      }
    };

    void read();
    const every = setInterval(() => void read(), 30_000);
    const onShow = () => void read();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      alive = false;
      clearInterval(every);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, []);

  return board;
}

/** 1284 → "1 284". Written out rather than left to a locale, so it cannot
 *  differ between the server's render and the browser's. */
function grouped(value: number): string {
  const digits = String(Math.max(0, Math.floor(value)));
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ' ';
    out += digits[i];
  }
  return out;
}

/** A number that rolls to its new value over about half a second. */
function Rolling({ value }: { value: number }): React.ReactElement {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const began = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const done = Math.min(1, (now - began) / 600);
      // Eased out, so it settles rather than stopping dead.
      const eased = 1 - (1 - done) * (1 - done);
      setShown(Math.round(start + (value - start) * eased));
      if (done < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className="tabular-nums">{grouped(shown)}</span>;
}

/**
 * How many people opened this one thing.
 *
 * A bare number on a card reads as a price, a duration, or nothing at all —
 * the eye is what makes it a view count without a word of explanation. Hidden
 * at zero: a card announcing that nobody has opened it is worse than a card
 * that says nothing, and it is not information anybody acts on.
 */
export function Views({
  board,
  kind,
  reference,
}: {
  board: Board | null;
  kind: EventKind;
  reference: string;
}): React.ReactElement | null {
  const row = board?.byRef.find((entry) => entry.kind === kind && entry.ref === reference);
  if (!row || row.count < 1) return null;
  return (
    <span className="inline-flex items-center gap-1 text-zinc-400" title={`${grouped(row.count)} opened this`}>
      <Eye className="w-3.5 h-3.5" />
      <span className="tabular-nums">{grouped(row.count)}</span>
    </span>
  );
}

interface Tile {
  readonly key: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: number;
  /** What the number counts, said plainly, so it cannot be read as something bigger. */
  readonly note: string;
}

type TileKey = 'visitors' | 'payers' | 'songs' | 'videos' | 'masterclasses' | 'articles' | 'podcasts';

function allTiles(board: Board, t: (key: string, fallback?: string) => string): Record<TileKey, Tile> {
  const totals = board.totals;
  return {
    visitors: {
      key: 'visitors', icon: Users, value: totals.visitors,
      label: t('counters.visitors', 'People here'),
      note: t('counters.visitors.note', 'Counted once a day each'),
    },
    payers: {
      key: 'payers', icon: CreditCard, value: totals.payers,
      label: t('counters.payers', 'Paying'),
      note: t('counters.payers.note', 'A song bought, or on a plan'),
    },
    songs: {
      key: 'songs', icon: Music2, value: totals.songs,
      label: t('counters.songs', 'Songs made'),
      note: t('counters.songs.note', 'Finished, not attempted'),
    },
    videos: {
      key: 'videos', icon: Video, value: totals.videos,
      label: t('counters.videos', 'Videos made'),
      note: t('counters.videos.note', 'Rendered and saved'),
    },
    masterclasses: {
      key: 'masterclasses', icon: GraduationCap, value: totals.masterclasses,
      label: t('counters.classes', 'Masterclasses opened'),
      note: t('counters.classes.note', 'Once per person per class, per day'),
    },
    articles: {
      key: 'articles', icon: BookOpen, value: totals.articles,
      label: t('counters.articles', 'Articles read'),
      note: t('counters.articles.note', 'Opened from the feed'),
    },
    podcasts: {
      key: 'podcasts', icon: Headphones, value: totals.podcasts,
      label: t('counters.podcasts', 'Episodes opened'),
      note: t('counters.podcasts.note', 'Played or opened elsewhere'),
    },
  };
}

/** Which counters belong on which page, and in what order. */
const ON_PAGE: Record<Scope, TileKey[]> = {
  all: ['visitors', 'payers', 'songs', 'videos', 'masterclasses', 'articles'],
  masterclasses: ['masterclasses', 'visitors'],
  futurebox: ['podcasts', 'visitors'],
  creations: ['songs', 'videos', 'payers'],
  radar: ['articles', 'visitors'],
};

/**
 * The three that answer "is anybody actually here".
 *
 * They lead the Spotlight board at a size you cannot miss, because that page's
 * job is to show the place is alive. The rest are true and quieter.
 */
const LEADING: TileKey[] = ['visitors', 'songs', 'videos'];

/** Which event kind a page's breakdown is about. */
const BREAKDOWN: Partial<Record<Scope, EventKind>> = {
  masterclasses: 'masterclass',
  futurebox: 'podcast',
  radar: 'article',
};

export function Counters({
  board,
  scope,
  labels,
}: {
  board: Board | null;
  scope: Scope;
  /** Turns a stored category into the name people see. */
  labels?: Record<string, string>;
}): React.ReactElement | null {
  const { t, lang } = useLang();

  const tiles = useMemo(() => {
    if (!board) return [];
    const made = allTiles(board, t);
    return ON_PAGE[scope].map((key) => made[key]);
  }, [board, scope, t]);

  const breakdown = useMemo(() => {
    if (!board) return [];
    const kind = BREAKDOWN[scope];
    if (!kind) return [];
    return board.byCategory.filter((row) => row.kind === kind).slice(0, 8);
  }, [board, scope]);

  // No database, no board. Shown as nothing rather than as zeros.
  if (!board) return null;

  const since = board.since
    ? new Date(board.since).toLocaleDateString(lang === 'af' ? 'af-ZA' : 'en-ZA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  // Spotlight leads with three numbers at a size nobody scrolls past. That page
  // has one job — show the place is being used — and a row of small tiles reads
  // as an admin panel rather than as a room with people in it.
  if (scope === 'all') {
    const made = allTiles(board, t);
    const lead = LEADING.map((key) => made[key]);
    const rest = ON_PAGE.all.filter((key) => LEADING.indexOf(key) === -1).map((key) => made[key]);

    return (
      <section className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-zinc-900/70 to-zinc-950 p-6 md:p-10 space-y-8 shadow-2xl">
        {/* A soft light behind the numbers, so the panel reads as the top of
            the page rather than as another card in the stack. */}
        <div className="pointer-events-none absolute -top-24 -right-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {t('counters.live', 'On FutureBox so far')}
          </span>
          {since && (
            <span className="text-sm text-zinc-500">
              {t('counters.since', 'Since')} {since}
            </span>
          )}
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
          {lead.map((tile) => {
            const Icon = tile.icon;
            return (
              <div key={tile.key} className="space-y-1">
                <Icon className="w-5 h-5 text-emerald-400" />
                <span className="block text-5xl md:text-6xl font-black text-white leading-none tracking-tight">
                  <Rolling value={tile.value} />
                </span>
                <span className="block text-base font-bold text-zinc-200 pt-1">{tile.label}</span>
                <span className="block text-sm text-zinc-500 leading-snug">{tile.note}</span>
              </div>
            );
          })}
        </div>

        <div className="relative grid grid-cols-3 gap-4 pt-5 border-t border-white/10">
          {rest.map((tile) => {
            const Icon = tile.icon;
            return (
              <div key={tile.key} className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <span className="min-w-0">
                  <span className="block text-xl font-extrabold text-white leading-none">
                    <Rolling value={tile.value} />
                  </span>
                  <span className="block text-sm text-zinc-400 leading-snug truncate">{tile.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 md:p-6 space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-bold text-white tracking-wide">
          {t('counters.title', 'What has actually happened here')}
        </h3>
        {since && (
          <span className="text-[11px] text-zinc-500">
            {t('counters.since', 'Since')} {since}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.key}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5 flex flex-col gap-1.5"
            >
              <Icon className="w-4 h-4 text-emerald-400" />
              <span className="text-2xl font-extrabold text-white leading-none">
                <Rolling value={tile.value} />
              </span>
              <span className="text-[11px] font-semibold text-zinc-300 leading-tight">{tile.label}</span>
              <span className="text-[10px] text-zinc-500 leading-tight">{tile.note}</span>
            </div>
          );
        })}
      </div>

      {breakdown.length > 0 && (
        <div className="pt-1 space-y-1.5">
          <span className="text-[11px] uppercase tracking-widest text-zinc-500">
            {t('counters.breakdown', 'By category')}
          </span>
          {breakdown.map((row) => {
            const most = breakdown[0].count || 1;
            return (
              <div key={`${row.kind}:${row.category}`} className="flex items-center gap-3">
                <span className="text-[11px] text-zinc-400 w-32 flex-shrink-0 truncate">
                  {labels?.[row.category] ?? row.category}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500/70"
                    style={{ width: `${Math.max(4, Math.round((row.count / most) * 100))}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-zinc-300 tabular-nums w-12 text-right">
                  {grouped(row.count)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
