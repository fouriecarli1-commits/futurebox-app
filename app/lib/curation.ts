/**
 * Quality scoring for the discovery feed.
 *
 * "We only show good things" is a claim, and a claim nobody can inspect is
 * worth nothing. So the gate here is arithmetic over stated signals, every item
 * carries the reasons it scored what it did, and what gets rejected is counted
 * and shown rather than quietly dropped. A reader who disagrees with the score
 * can see exactly which signal produced it.
 *
 * What this is not: it does not read the article. It scores the things that are
 * knowable from a feed entry — who published it, how the title is written, how
 * specific the summary is, how long the thing is, and how old. That catches
 * most of what makes a feed bad (engagement bait, thin rewrites, generated
 * filler, stale reposts) and none of what makes a specific claim wrong. Judging
 * the argument needs a model pass over the full text and, past that, a person.
 */

export type ItemKind = 'video' | 'article' | 'podcast' | 'paper';

export interface FeedItem {
  readonly id: string;
  readonly title: string;
  readonly source: string;
  readonly summary: string;
  readonly kind: ItemKind;
  readonly minutes: number;
  /** ISO date. */
  readonly published: string;
  readonly category: string;
  readonly url: string;
  /** Fundamentals age slowly; news does not. */
  readonly durability: 'durable' | 'timely';
  readonly proOnly?: boolean;
}

export interface Signal {
  readonly label: string;
  readonly delta: number;
  readonly detail: string;
}

export type Band = 'signal' | 'solid' | 'noise';

export interface Verdict {
  readonly score: number;
  readonly band: Band;
  readonly signals: readonly Signal[];
  readonly freshness: number;
}

export const BAND_LABELS: Record<Band, string> = {
  signal: 'Signal',
  solid: 'Solid',
  noise: 'Below the bar',
};

export const BAND_STYLES: Record<Band, string> = {
  signal: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  solid: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  noise: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
};

/** Nothing below this renders. It is shown in the rejected drawer instead. */
export const BAR = 55;

// -----------------------------------------------------------------------------
// The signals
// -----------------------------------------------------------------------------

/**
 * Sources we are willing to stand behind, by what they are rather than by
 * reputation alone: primary publishers of the thing being discussed, and shows
 * with an editorial record. An unknown source is not penalised into oblivion —
 * it just has to earn the score on the other signals.
 */
const TRUSTED_SOURCES: Record<string, number> = {
  'anthropic': 14, 'openai': 14, 'google deepmind': 14, 'deepmind': 14, 'meta ai': 12,
  'arxiv': 12, 'nature': 14, 'science': 14, 'mit technology review': 11,
  'stanford hai': 12, 'berkeley bair': 11, 'hugging face': 10,
  'lex fridman': 9, 'dwarkesh': 9, 'the diary of a ceo': 6, 'all-in': 6,
  'a16z': 7, 'sequoia': 7, 'stratechery': 10, 'the information': 10,
  'ieee spectrum': 10, 'ars technica': 8, 'the verge': 6,
};

const CLICKBAIT = [
  "you won't believe", 'shocking', 'this changes everything', 'nobody is talking about',
  'they don’t want you to know', 'gurus hate', 'insane', 'crazy', 'destroyed',
  'the truth about', 'i tried', 'in just', 'secret', 'hack', 'must watch', 'must see',
];

const SLOP = [
  'in today’s fast-paced world', 'in the ever-evolving', 'delve into', 'game-changer',
  'game changer', 'revolutionize', 'revolutionise', 'unlock the power', 'harness the power',
  'the future is here', 'buckle up', 'let that sink in', 'paradigm shift',
];

/** Concrete writing names things. Vague writing gestures at them. */
const SPECIFIC = /\b(\d+(\.\d+)?%|\d{4}|\$\d|\d+x|benchmark|dataset|parameters|latency|throughput|ablation|replication|sample size|methodology|open-sourced?|peer[- ]reviewed)\b/i;

function titleSignals(title: string): Signal[] {
  const out: Signal[] = [];
  const lower = title.toLowerCase();

  const bait = CLICKBAIT.filter((p) => lower.includes(p));
  if (bait.length > 0) {
    out.push({
      label: 'Engagement bait in the title',
      delta: -12 * bait.length,
      detail: `Matched: ${bait.join(', ')}. A title written to be clicked rather than to describe.`,
    });
  }

  const letters = title.replace(/[^A-Za-z]/g, '');
  const caps = letters.length === 0 ? 0 : (title.match(/[A-Z]/g)?.length ?? 0) / letters.length;
  if (caps > 0.4 && letters.length > 12) {
    out.push({ label: 'Shouting', delta: -8, detail: `${Math.round(caps * 100)}% of the letters are capitals.` });
  }

  const emoji = (title.match(/[\u2600-\u27BF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g) ?? []).length;
  if (emoji >= 2) {
    out.push({ label: 'Emoji in the title', delta: -5, detail: `${emoji} of them. Rarely a sign of a careful piece.` });
  }

  if (/^\d+\s+(things|ways|tips|tools|reasons|secrets)/i.test(title.trim())) {
    out.push({ label: 'Listicle framing', delta: -6, detail: 'Counted lists optimise for scanning, not for understanding.' });
  }

  if (out.length === 0) {
    out.push({ label: 'Title describes the thing', delta: 6, detail: 'No bait patterns, no shouting, no padding.' });
  }
  return out;
}

function sourceSignal(source: string): Signal {
  const key = source.toLowerCase();
  const hit = Object.keys(TRUSTED_SOURCES).find((k) => key.includes(k));
  if (hit) {
    return {
      label: 'Known source',
      delta: TRUSTED_SOURCES[hit],
      detail: `${source} publishes primary material or has an editorial record.`,
    };
  }
  return {
    label: 'Unknown source',
    delta: 0,
    detail: `${source} is not on the known list. Not a mark against it — it just has to earn the score elsewhere.`,
  };
}

function substanceSignal(summary: string): Signal {
  const slop = SLOP.filter((p) => summary.toLowerCase().includes(p));
  if (slop.length > 0) {
    return {
      label: 'Filler phrasing',
      delta: -10 * slop.length,
      detail: `Matched: ${slop.join(', ')}. Phrases that fill a paragraph without saying anything.`,
    };
  }
  if (SPECIFIC.test(summary)) {
    return {
      label: 'Specific claims',
      delta: 14,
      detail: 'The summary names figures, methods or systems rather than gesturing at them.',
    };
  }
  if (summary.trim().length < 60) {
    return { label: 'Thin summary', delta: -6, detail: 'Too little to judge. Usually a sign of a thin piece.' };
  }
  return { label: 'Readable but general', delta: 2, detail: 'No filler, but nothing concrete to check either.' };
}

function depthSignal(kind: ItemKind, minutes: number): Signal {
  if (kind === 'paper') return { label: 'Primary research', delta: 12, detail: 'A paper, not a summary of one.' };
  if (minutes < 4) {
    return { label: 'Very short', delta: -8, detail: `${minutes} minutes cannot carry an argument, only a claim.` };
  }
  if (minutes >= 40) {
    return { label: 'Long form', delta: 8, detail: `${minutes} minutes — room to be wrong in public and get corrected.` };
  }
  return { label: 'Reasonable length', delta: 4, detail: `${minutes} minutes.` };
}

/** 1 at publication, decaying on a half-life set by how durable the item is. */
export function freshness(published: string, durability: FeedItem['durability'], now: number): number {
  const ageDays = Math.max(0, (now - new Date(published).getTime()) / 86_400_000);
  const halfLife = durability === 'durable' ? 540 : 45;
  return Math.pow(0.5, ageDays / halfLife);
}

function freshnessSignal(value: number, durability: FeedItem['durability']): Signal {
  const pct = Math.round(value * 100);
  if (value > 0.7) return { label: 'Current', delta: 8, detail: `${pct}% fresh.` };
  if (value > 0.35) {
    return { label: 'Ageing', delta: 0, detail: `${pct}% fresh. Still worth reading, no longer news.` };
  }
  return {
    label: 'Stale',
    delta: durability === 'durable' ? -6 : -16,
    detail: `${pct}% fresh. ${durability === 'timely' ? 'This one was about a moment that has passed.' : 'Fundamentals age slowly, but this is old.'}`,
  };
}

export function assess(item: FeedItem, now: number): Verdict {
  const fresh = freshness(item.published, item.durability, now);
  const signals: Signal[] = [
    sourceSignal(item.source),
    ...titleSignals(item.title),
    substanceSignal(item.summary),
    depthSignal(item.kind, item.minutes),
    freshnessSignal(fresh, item.durability),
  ];
  // 50 is the neutral starting point: an unremarkable item from an unknown
  // source, neither promoted nor buried.
  const score = Math.max(0, Math.min(100, 50 + signals.reduce((sum, s) => sum + s.delta, 0)));
  const band: Band = score >= 75 ? 'signal' : score >= BAR ? 'solid' : 'noise';
  return { score: Math.round(score), band, signals, freshness: fresh };
}

// -----------------------------------------------------------------------------
// What each tier gets
// -----------------------------------------------------------------------------

export interface TierLimits {
  readonly maxItems: number;
  readonly maxCategories: number;
  readonly seesRejected: boolean;
  readonly seesScoreBreakdown: boolean;
}

/** Every paid tier sees the whole radar; the split is free against paid. */
const PAID: TierLimits = { maxItems: 40, maxCategories: 99, seesRejected: true, seesScoreBreakdown: true };

export const TIER_LIMITS: Record<'free' | 'maker' | 'studio' | 'label', TierLimits> = {
  free: { maxItems: 6, maxCategories: 2, seesRejected: false, seesScoreBreakdown: false },
  maker: PAID,
  studio: PAID,
  label: PAID,
};
