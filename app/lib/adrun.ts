'use client';

/**
 * A run: one advert, going out to several places, on a day, with a link that
 * says which place it came from.
 *
 * ── The three things this is ─────────────────────────────────────────────
 *
 * `docs/ADS_AS_A_SERVICE.md` lists four things that need nobody's permission
 * to build. Three of them are the same object seen from different sides, so
 * they are one file:
 *
 *   the schedule       what goes out, where, on which day
 *   the UTM tags       so a click can be traced back to the place it came from
 *   the posting run    a checklist that walks the platforms and marks each done
 *
 * The fourth — the brand kit on the creative — was already built.
 *
 * ── Why the tags matter more than they look ──────────────────────────────
 *
 * Everything later in that document is gated on reading numbers back from
 * Meta and Google, and none of it can attribute anything to an advert that
 * went out with a bare link. Four platforms, one URL, one line in the
 * analytics: "direct". Tag it and the same four are four rows, for free,
 * today, with no API and nobody's approval.
 *
 * It is the cheapest thing in the whole document and the only one the later
 * stages cannot be built without.
 *
 * ── What the schedule is, and is not ─────────────────────────────────────
 *
 * A date on a run, and a list sorted by it. It is not a reminder: nothing here
 * sends anything, and the screen says so. A calendar that silently fails to
 * notify is worse than a list somebody knows to look at — and a real reminder
 * needs a member's address and a scheduled job, which is `/api/watch`'s shape
 * and a different piece of work.
 */

/** The five UTM parameters, in the order every analytics tool lists them. */
export interface Tags {
  /** Where it came from: `tiktok`, `instagram`. Per platform, always. */
  readonly source: string;
  /** How: `social`, `email`, `cpc`. One per kind of placement. */
  readonly medium: string;
  /** Which push: the campaign's name, the same across every platform. */
  readonly campaign: string;
  /** Which creative, when one campaign runs several. */
  readonly content?: string;
}

/**
 * A UTM value, made safe for a query string and readable in a report.
 *
 * Lower case with dashes, because analytics tools treat `Winter Sale` and
 * `winter sale` and `winter-sale` as three campaigns and nobody notices until
 * the report is split three ways. Normalising here is the only place it can be
 * done once for every platform.
 */
export function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * The link with its tags on it.
 *
 * Existing query parameters are kept and existing `utm_*` are replaced rather
 * than repeated: pasting a link that was already tagged for one platform and
 * tagging it for another is exactly what somebody does, and two
 * `utm_source` values is a row analytics drops.
 *
 * A hash survives, at the end, where it belongs. Anything that is not a URL
 * comes back untouched — a half-typed address is not a reason to throw.
 */
export function tagged(link: string, tags: Tags): string {
  const trimmed = link.trim();
  if (!trimmed) return '';
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return trimmed;
  }
  const put = (key: string, value: string) => {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  };
  put('utm_source', slug(tags.source));
  put('utm_medium', slug(tags.medium));
  put('utm_campaign', slug(tags.campaign));
  put('utm_content', tags.content ? slug(tags.content) : '');
  // `utm_term` is for paid search keywords and this is not that. Cleared
  // rather than left, in case the pasted link carried somebody else's.
  url.searchParams.delete('utm_term');
  return url.toString();
}

export interface Step {
  /** A platform id from `data/social.ts`. */
  readonly platform: string;
  readonly done: boolean;
  readonly doneAt?: string;
}

export interface Run {
  readonly id: string;
  /** What this push is called. Becomes `utm_campaign`. */
  readonly campaign: string;
  /** The advert's headline, so a list of runs is readable. */
  readonly headline: string;
  /** Where the click goes. Untagged — the tags are added per platform. */
  readonly link: string;
  /** The day it should go out, as `YYYY-MM-DD`. Empty means unscheduled. */
  readonly when: string;
  readonly steps: readonly Step[];
  readonly createdAt: string;
}

const KEY = 'futurebox.adruns.v1';

/** Enough to plan a month without the list becoming something to scroll. */
export const MOST_RUNS = 24;

export function loadRuns(): Run[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const said = JSON.parse(raw) as Run[];
    if (!Array.isArray(said)) return [];
    return said
      .filter((one) => one && typeof one.id === 'string')
      .slice(0, MOST_RUNS)
      .map((one) => ({
        id: one.id,
        campaign: String(one.campaign ?? ''),
        headline: String(one.headline ?? ''),
        link: String(one.link ?? ''),
        when: String(one.when ?? ''),
        createdAt: String(one.createdAt ?? new Date().toISOString()),
        steps: Array.isArray(one.steps)
          ? one.steps.map((step) => ({
              platform: String(step?.platform ?? ''),
              done: Boolean(step?.done),
              ...(step?.doneAt ? { doneAt: String(step.doneAt) } : {}),
            }))
          : [],
      }));
  } catch {
    return [];
  }
}

export function saveRuns(runs: readonly Run[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(runs.slice(0, MOST_RUNS)));
  } catch {
    // Storage blocked or full. The list still works for this session.
  }
}

export function runId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Done, out of how many. */
export function progress(run: Run): { done: number; of: number } {
  return { done: run.steps.filter((one) => one.done).length, of: run.steps.length };
}

/**
 * Where a run stands against today.
 *
 * `overdue` only counts a run that still has something to post: a run whose
 * day has passed and which went out in full is finished, not late, and
 * colouring it red would teach somebody to ignore the colour.
 */
export type Standing = 'done' | 'overdue' | 'today' | 'soon' | 'unscheduled';

export function standingOf(run: Run, today = new Date()): Standing {
  const { done, of } = progress(run);
  if (of > 0 && done === of) return 'done';
  if (!run.when) return 'unscheduled';
  const day = today.toISOString().slice(0, 10);
  if (run.when < day) return 'overdue';
  if (run.when === day) return 'today';
  return 'soon';
}

/**
 * The order to read them in: what is late, then what is due, then what is
 * coming, then what has no date, and everything finished at the bottom.
 */
const ORDER: Record<Standing, number> = {
  overdue: 0,
  today: 1,
  soon: 2,
  unscheduled: 3,
  done: 4,
};

export function sorted(runs: readonly Run[], today = new Date()): Run[] {
  return [...runs].sort((a, b) => {
    const byStanding = ORDER[standingOf(a, today)] - ORDER[standingOf(b, today)];
    if (byStanding !== 0) return byStanding;
    // Within a group, soonest first — and undated last, by when it was made.
    if (a.when && b.when) return a.when < b.when ? -1 : a.when > b.when ? 1 : 0;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}
