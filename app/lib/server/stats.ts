/**
 * The counters, and the one place that writes what they count.
 *
 * A number on a page is a claim, so this module has one rule above all others:
 * it never invents. If the database is not configured, `board()` returns null
 * and the page shows nothing at all — which is honest — rather than a row of
 * zeros or, worse, a plausible-looking figure. A visitor counter that is
 * decoration is a lie told in a font.
 *
 * Reach is written here; songs and money are not. Those already have tables —
 * `generations` and `purchases` — written at the moment they actually happen,
 * and a number with two sources eventually has two answers.
 */

import { admin } from './account';

/** The things worth counting that nothing else records. */
/**
 * `play` was added last, and it is the only one the board does not count.
 *
 * The board counts reach — visits, videos rendered, things opened. A play is
 * for the charts on Spotlight and nothing else, which is why adding it changed
 * no number anywhere: `stats_board` asks for the kinds it names, and `play` is
 * not one of them. `supabase/charts.sql` explains why a play may be written
 * from the browser when a song may not.
 */
export const EVENT_KINDS = ['visit', 'video', 'masterclass', 'article', 'podcast', 'play'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export function isEventKind(value: unknown): value is EventKind {
  return typeof value === 'string' && (EVENT_KINDS as readonly string[]).indexOf(value) !== -1;
}

export interface Totals {
  readonly visitors: number;
  readonly songs: number;
  readonly videos: number;
  readonly masterclasses: number;
  readonly articles: number;
  readonly podcasts: number;
  readonly payers: number;
}

export interface CategoryCount {
  readonly kind: EventKind;
  readonly category: string;
  readonly count: number;
}

/** How many people opened one particular thing. What a card shows. */
export interface RefCount {
  readonly kind: EventKind;
  readonly ref: string;
  readonly count: number;
}

export interface Board {
  /** When the first thing was recorded, so the page can say what period this is. */
  readonly since: string | null;
  readonly totals: Totals;
  readonly byCategory: readonly CategoryCount[];
  readonly byRef: readonly RefCount[];
}

/**
 * One event, written once per person per thing per day.
 *
 * The uniqueness is the database's, not this function's — anyone can call the
 * endpoint above it, so a rule enforced here would be a rule enforced in the
 * place the caller controls. A repeat is not an error and is not reported as
 * one: it means the person came back, which is the answer, not a failure.
 */
export async function recordEvent(event: {
  kind: EventKind;
  category?: string | null;
  ref?: string | null;
  owner?: string | null;
  visitor: string;
}): Promise<void> {
  const client = admin();
  if (!client) return;
  await client.from('events').insert({
    kind: event.kind,
    category: event.category ?? null,
    ref: event.ref ?? null,
    owner: event.owner ?? null,
    visitor: event.visitor,
  });
}

/**
 * How long a set of totals is served before it is asked for again.
 *
 * Every visitor's first paint asks for these, so without a cache the counters
 * would put one query on the database per page view — the counter costing more
 * than the thing it counts. Half a minute stale is invisible on a number in the
 * thousands and is the difference between a board that scales and one that
 * falls over on the day it finally matters.
 */
const CACHE_MS = 30_000;

let cached: { at: number; board: Board | null } | null = null;

export async function board(): Promise<Board | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.board;

  const client = admin();
  if (!client) {
    cached = { at: Date.now(), board: null };
    return null;
  }

  const { data, error } = await client.rpc('stats_board');
  if (error || !data) {
    // Not cached as a failure for long: a board that is briefly unavailable
    // should come back on its own, and a missing function — the migration has
    // not been run yet — should stop being asked about every request.
    cached = { at: Date.now(), board: null };
    return null;
  }

  const raw = data as {
    since?: string | null;
    totals?: Partial<Record<keyof Totals, number>>;
    byCategory?: Array<{ kind?: string; category?: string; count?: number }>;
    byRef?: Array<{ kind?: string; ref?: string; count?: number }>;
  };

  const board: Board = {
    since: raw.since ?? null,
    totals: {
      visitors: whole(raw.totals?.visitors),
      songs: whole(raw.totals?.songs),
      videos: whole(raw.totals?.videos),
      masterclasses: whole(raw.totals?.masterclasses),
      articles: whole(raw.totals?.articles),
      podcasts: whole(raw.totals?.podcasts),
      payers: whole(raw.totals?.payers),
    },
    byCategory: (raw.byCategory ?? [])
      .filter((row): row is { kind: string; category: string; count: number } =>
        isEventKind(row.kind) && typeof row.category === 'string',
      )
      .map((row) => ({ kind: row.kind as EventKind, category: row.category, count: whole(row.count) })),
    byRef: (raw.byRef ?? [])
      .filter((row): row is { kind: string; ref: string; count: number } =>
        isEventKind(row.kind) && typeof row.ref === 'string',
      )
      .map((row) => ({ kind: row.kind as EventKind, ref: row.ref, count: whole(row.count) })),
  };

  cached = { at: Date.now(), board };
  return board;
}

/** Postgres returns counts as strings once they are big enough to need to. */
function whole(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : 0;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}
