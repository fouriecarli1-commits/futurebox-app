/**
 * What free gets, and what Pro adds.
 *
 * One table, read by every surface, so the answer to "what does the upgrade
 * include" is a thing you can point at rather than a sales page that drifts
 * from the code.
 *
 * The shape of the free tier is deliberate: every part of the platform does
 * something real without paying, and none of it is a demo. You can write a
 * song, score the feed, find a collaborator and enter a competition on a free
 * account. What free does not get is *volume* and *distribution* — the daily
 * counts are small, and publishing outward (posting to your channels, asking
 * for a boost, white-labelled exports) is the paid line. That is the honest
 * place to draw it: the cost of generating is small, the cost of being
 * amplified by the channel is the thing worth paying for.
 *
 * Counters are per-device and per-day, held in localStorage. With no backend
 * they are a courtesy, not enforcement — anyone can clear site data and start
 * over. The UI does not pretend otherwise, and nothing irreversible or costly
 * hangs off them.
 */

export type Plan = 'free' | 'pro';

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
  | 'arena.enter'
  | 'appearance'
  | 'soundboard';

export interface Entitlement {
  readonly label: string;
  /** Where it lives, for grouping in the comparison. */
  readonly area: string;
  /** A per-day cap, `0` for blocked, `null` for unlimited. */
  readonly free: number | null;
  readonly pro: number | null;
  /** How the limit reads to a person. */
  readonly unit: string;
  readonly freeNote: string;
}

export const ENTITLEMENTS: Record<Capability, Entitlement> = {
  'songwriter.help': {
    label: 'AI writing help',
    area: 'Songwriter',
    free: 3,
    pro: null,
    unit: 'rolls a day',
    freeNote: 'Enough to get unstuck on one song. The offline writing prompts stay unlimited.',
  },
  'publish.release': {
    label: 'Publish a release',
    area: 'Songwriter',
    free: 2,
    pro: null,
    unit: 'a day',
    freeNote: 'Two finished releases a day is more than most people write.',
  },
  soundboard: {
    label: 'Genre soundboard and voice studio',
    area: 'Songwriter',
    free: null,
    pro: null,
    unit: '',
    freeNote: 'Free, in full. Hearing what a genre sounds like should never be behind a paywall.',
  },
  'studio.edits': {
    label: 'Queued timeline edits',
    area: 'Studio',
    free: 5,
    pro: null,
    unit: 'a day',
    freeNote: 'Enough to fix a chorus. The timeline itself is free to use.',
  },
  'radar.items': {
    label: 'Items in the feed',
    area: 'Radar',
    free: 6,
    pro: 40,
    unit: 'per scan',
    freeNote: 'The six highest-scoring items. They are the same six Pro sees at the top.',
  },
  'radar.categories': {
    label: 'Categories at once',
    area: 'Radar',
    free: 2,
    pro: null,
    unit: '',
    freeNote: 'Pick the two you care about.',
  },
  'radar.breakdown': {
    label: 'Why an item scored what it did',
    area: 'Radar',
    free: 0,
    pro: null,
    unit: '',
    freeNote: 'The score is shown to everyone; the signal-by-signal breakdown is Pro.',
  },
  'radar.rejected': {
    label: 'The rejected pile and its reasons',
    area: 'Radar',
    free: 0,
    pro: null,
    unit: '',
    freeNote: 'The count of what was rejected is always shown. The reasons are Pro.',
  },
  'collab.pitch': {
    label: 'Podcast pitch drafts',
    area: 'Collab Radar',
    free: 2,
    pro: null,
    unit: 'a day',
    freeNote: 'Matching and scoring are free. Drafting the letter is what is capped.',
  },
  'collab.post': {
    label: 'Post to your channels',
    area: 'Collab Radar',
    free: 0,
    pro: null,
    unit: '',
    freeNote: 'Captions and hooks are free to write and copy. Posting from FutureBox is Pro.',
  },
  'collab.boost': {
    label: 'Ask FutureBox to boost a collab',
    area: 'Collab Radar',
    free: 0,
    pro: null,
    unit: '',
    freeNote: 'Being amplified by the channel is the thing Pro actually buys.',
  },
  'arena.enter': {
    label: 'Enter a competition',
    area: 'Arena',
    free: null,
    pro: null,
    unit: '',
    freeNote: 'Free and Pro enter on identical terms, including the free entry route. Never gated.',
  },
  appearance: {
    label: 'Every theme and layout',
    area: 'Everywhere',
    free: null,
    pro: null,
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

export function check(capability: Capability, plan: Plan): Check {
  const entitlement = ENTITLEMENTS[capability];
  const limit = plan === 'pro' ? entitlement.pro : entitlement.free;
  const count = used(capability);

  if (limit === null) return { allowed: true, used: count, limit: null, remaining: null, reason: null };
  if (limit === 0) {
    return {
      allowed: false,
      used: count,
      limit: 0,
      remaining: 0,
      reason: `${entitlement.label} is a Pro feature.`,
    };
  }
  const remaining = Math.max(0, limit - count);
  return {
    allowed: remaining > 0,
    used: count,
    limit,
    remaining,
    reason: remaining > 0 ? null : `You have used today's ${limit} ${entitlement.unit}. Pro removes the cap.`,
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
  const order = ['Songwriter', 'Studio', 'Collab Radar', 'Radar', 'Arena', 'Everywhere'];
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
