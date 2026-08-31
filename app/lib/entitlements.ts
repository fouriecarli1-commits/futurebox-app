/**
 * What free gets, and what Pro adds.
 *
 * One table, read by every surface, so the answer to "what does the upgrade
 * include" is a thing you can point at rather than a sales page that drifts
 * from the code.
 *
 * The shape of the free tier is deliberate: every part of the platform does
 * something real without paying, and none of it is a demo. You can write a
 * song, score the feed and find a collaborator on a free account. What free
 * does not get is *volume* and *distribution* — the daily counts are small,
 * and publishing outward is the paid line.
 *
 * ── Why the three paid tiers now differ ──────────────────────────────────
 *
 * They used to be identical here. Every capability read
 * `{ free: n, maker: null, studio: null, label: null }`, so the only reason to
 * move from Maker to Studio was credits. A subscription that adds nothing but
 * a bigger number is a subscription people downgrade the month they generate
 * less, and it left the reading, the classes and the collab work — none of
 * which costs a cent to serve — doing no work at all.
 *
 * So the ladder climbs here too. The principle is not cost, because these are
 * free to serve; it is depth. Free samples everything. Maker gets enough of it
 * to work daily. Studio gets the parts you need when you are releasing on a
 * schedule — the reasons behind a score, the guided paths, the boost. Label
 * gets no ceilings at all.
 *
 * What stays free at every tier is anything whose absence would make the app
 * feel mean rather than limited: the booth, the soundboard, every theme, and
 * the score on every item in the feed.
 *
 * Counters are per-device and per-day, held in localStorage. With no backend
 * they are a courtesy, not enforcement — anyone can clear site data and start
 * over. The UI does not pretend otherwise, and nothing irreversible or costly
 * hangs off them.
 */

/**
 * The tiers as sold. `plans.ts` holds their prices and what each is for; this
 * file holds only what each may do, so a cap and a price cannot disagree.
 */
export type Plan = 'free' | 'maker' | 'studio' | 'label';

/** What `pro` used to mean, for anything still thinking in two tiers. */
export const DEFAULT_PAID: Plan = 'studio';

export type Capability =
  | 'songwriter.help'
  | 'studio.edits'
  | 'radar.items'
  | 'radar.categories'
  | 'radar.breakdown'
  | 'radar.rejected'
  | 'collab.pitch'
  | 'collab.post'
  | 'collab.boost'
  | 'publish.release'
  | 'appearance'
  | 'soundboard'
  | 'class.watch'
  | 'class.paths';

export interface Entitlement {
  readonly label: string;
  /** Where it lives, for grouping in the comparison. */
  readonly area: string;
  /** Per-day caps by tier. `0` blocks, `null` is unlimited. */
  readonly caps: Readonly<Record<Plan, number | null>>;
  /** How the limit reads to a person. */
  readonly unit: string;
  readonly freeNote: string;
}

export const ENTITLEMENTS: Record<Capability, Entitlement> = {
  'songwriter.help': {
    label: 'AI writing help',
    area: 'Songwriter',
    caps: { free: 3, maker: 20, studio: null, label: null },
    unit: 'rolls a day',
    freeNote: 'Enough to get unstuck on one song. The offline writing prompts stay unlimited.',
  },
  'publish.release': {
    label: 'Publish a release',
    area: 'Songwriter',
    caps: { free: 2, maker: 10, studio: null, label: null },
    unit: 'a day',
    freeNote: 'Two finished releases a day is more than most people write.',
  },
  soundboard: {
    label: 'Genre soundboard and voice studio',
    area: 'Songwriter',
    caps: { free: null, maker: null, studio: null, label: null },
    unit: '',
    freeNote: 'Free, in full. Hearing what a genre sounds like should never be behind a paywall.',
  },
  'studio.edits': {
    label: 'Queued timeline edits',
    area: 'Studio',
    caps: { free: 5, maker: 30, studio: null, label: null },
    unit: 'a day',
    freeNote: 'Enough to fix a chorus. The timeline itself is free to use.',
  },
  'radar.items': {
    label: 'Items in the feed',
    area: 'Radar',
    caps: { free: 6, maker: 20, studio: 40, label: null },
    unit: 'per scan',
    freeNote: 'The six highest-scoring items — the same six at the top of everybody else\u2019s feed.',
  },
  'radar.categories': {
    label: 'Categories at once',
    area: 'Radar',
    caps: { free: 2, maker: 4, studio: null, label: null },
    unit: '',
    freeNote: 'Pick the two you care about.',
  },
  'radar.breakdown': {
    label: 'Why an item scored what it did',
    area: 'Radar',
    caps: { free: 0, maker: null, studio: null, label: null },
    unit: '',
    freeNote: 'The score is shown to everyone; the signal-by-signal breakdown is Pro.',
  },
  'radar.rejected': {
    label: 'The rejected pile and its reasons',
    area: 'Radar',
    caps: { free: 0, maker: 0, studio: null, label: null },
    unit: '',
    freeNote: 'The count of what was rejected is always shown. The reasons start on Studio.',
  },
  'collab.pitch': {
    label: 'Podcast pitch drafts',
    area: 'Collab Radar',
    caps: { free: 2, maker: 10, studio: null, label: null },
    unit: 'a day',
    freeNote: 'Matching and scoring are free. Drafting the letter is what is capped.',
  },
  'collab.post': {
    label: 'Post to your channels',
    area: 'Collab Radar',
    caps: { free: 0, maker: null, studio: null, label: null },
    unit: '',
    freeNote: 'Captions and hooks are free to write and copy. Posting from FutureBox is Pro.',
  },
  'collab.boost': {
    label: 'Ask FutureBox to boost a collab',
    area: 'Collab Radar',
    caps: { free: 0, maker: 0, studio: null, label: null },
    unit: '',
    freeNote: 'Being amplified by the channel is the thing a plan actually buys. Studio and up.',
  },
  'class.watch': {
    label: 'Masterclasses a day',
    area: 'Masterclasses',
    caps: { free: 2, maker: null, studio: null, label: null },
    unit: 'a day',
    freeNote: 'Two a day, and every class is listed with what it covers before you open it.',
  },
  'class.paths': {
    label: 'The guided paths',
    area: 'Masterclasses',
    caps: { free: 0, maker: 0, studio: null, label: null },
    unit: '',
    freeNote: 'Single classes are open. A path is four sittings that end in a finished release \u2014 Studio and up.',
  },
  appearance: {
    label: 'Every theme and layout',
    area: 'Everywhere',
    caps: { free: null, maker: null, studio: null, label: null },
    unit: '',
    freeNote: 'Free. Charging for a dark mode is not a business.',
  },
};

// -----------------------------------------------------------------------------
// Counting
// -----------------------------------------------------------------------------

const KEY = 'futurebox.usage.v1';

interface Usage {
  day: string;
  counts: Partial<Record<Capability, number>>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function read(): Usage {
  if (typeof window === 'undefined') return { day: today(), counts: {} };
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Usage) : null;
    // A stale day resets the counters rather than carrying yesterday forward.
    if (!parsed || parsed.day !== today()) return { day: today(), counts: {} };
    return parsed;
  } catch {
    return { day: today(), counts: {} };
  }
}

function write(usage: Usage): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(usage));
  } catch {
    // Storage blocked; the session simply is not counted.
  }
}

export function used(capability: Capability): number {
  return read().counts[capability] ?? 0;
}

export interface Check {
  readonly allowed: boolean;
  readonly used: number;
  readonly limit: number | null;
  readonly remaining: number | null;
  readonly reason: string | null;
}

/** Cheapest to dearest, so "the next one up" is a position in this list. */
const LADDER: readonly Plan[] = ['free', 'maker', 'studio', 'label'];

const TIER_NAMES: Record<Plan, string> = {
  free: 'Free',
  maker: 'Maker',
  studio: 'Studio',
  label: 'Label',
};

/**
 * The cheapest tier that actually unlocks this, by name.
 *
 * The refusals used to say "Pro", which was true when there were two tiers and
 * is a guess now that there are four. Telling somebody on Maker that a thing
 * "needs a paid plan" when they are already paying is the kind of small lie
 * that makes an upgrade feel like a trick.
 */
export function unlockedBy(capability: Capability, from: Plan): string | null {
  const caps = ENTITLEMENTS[capability].caps;
  const here = caps[from];
  // Already unlimited: there is nothing above this to sell, and offering one
  // anyway is how a pricing page ends up recommending an upgrade that changes
  // nothing.
  if (here === null) return null;

  for (let i = LADDER.indexOf(from) + 1; i < LADDER.length; i += 1) {
    const limit = caps[LADDER[i]];
    if (limit === null || limit > here) return TIER_NAMES[LADDER[i]];
  }
  return null;
}

export function check(capability: Capability, plan: Plan): Check {
  const entitlement = ENTITLEMENTS[capability];
  const limit = entitlement.caps[plan];
  const count = used(capability);

  if (limit === null) return { allowed: true, used: count, limit: null, remaining: null, reason: null };
  if (limit === 0) {
    const next = unlockedBy(capability, plan);
    return {
      allowed: false,
      used: count,
      limit: 0,
      remaining: 0,
      reason: next
        ? `${entitlement.label} starts on ${next}.`
        : `${entitlement.label} is not available on your plan.`,
    };
  }
  const remaining = Math.max(0, limit - count);
  return {
    allowed: remaining > 0,
    used: count,
    limit,
    remaining,
    reason:
      remaining > 0
        ? null
        : (() => {
            const next = unlockedBy(capability, plan);
            return next
              ? `You have used today's ${limit} ${entitlement.unit}. ${next} gives you more.`
              : `You have used today's ${limit} ${entitlement.unit}.`;
          })(),
  };
}

/** Call only once the thing actually happened. */
export function record(capability: Capability): void {
  const usage = read();
  usage.counts[capability] = (usage.counts[capability] ?? 0) + 1;
  write(usage);
}

/** Grouped for the comparison table in the pricing panel. */
export function byArea(): Array<{ area: string; rows: Array<Entitlement & { key: Capability }> }> {
  const order = ['Songwriter', 'Studio', 'Collab Radar', 'Radar', 'Everywhere'];
  return order
    .map((area) => ({
      area,
      rows: (Object.entries(ENTITLEMENTS) as Array<[Capability, Entitlement]>)
        .filter(([, e]) => e.area === area)
        .map(([key, e]) => ({ ...e, key })),
    }))
    .filter((group) => group.rows.length > 0);
}

export function describe(limit: number | null, unit: string): string {
  if (limit === null) return 'Unlimited';
  if (limit === 0) return 'Not included';
  return `${limit}${unit ? ` ${unit}` : ''}`;
}
