/**
 * A child's story as the story engine writes it: pages of lines, each line
 * said by somebody, each page with a scene to draw, a way for that picture to
 * move, something sparkling over it, and a question that keeps the child
 * thinking.
 *
 * The owner, 19 October 2026: *"storie generasie moet meer motion en meer
 * visual wees. Dit moet regtig 'n kind se breim tickle."* The book was four
 * fixed paragraphs over an emoji on a gradient. Now a model writes it from
 * the child's choices, every page is drawn, every picture moves, and every
 * page ends on a "can you spot…?" or a "what do you think…?".
 *
 * Shared by the route that writes it, the screen that plays it and the check
 * that holds both to the same shape — so a field the route sends is a field
 * the player knows, by construction.
 */

import { bare, kidVoice, type KidVoiceId } from './kidsvoices';

export const MOTIONS = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'float', 'tilt'] as const;
export type Motion = (typeof MOTIONS)[number];

export const SPARKLES = ['stars', 'bubbles', 'snow', 'hearts', 'leaves', 'confetti', 'fireflies'] as const;
export type Sparkle = (typeof SPARKLES)[number];

/** What each sparkle is drawn with. */
export const SPARKLE_BITS: Readonly<Record<Sparkle, readonly string[]>> = {
  stars: ['⭐', '✨', '🌟'],
  bubbles: ['🫧', '○', '◦'],
  snow: ['❄️', '❅', '❆'],
  hearts: ['💖', '💗', '💛'],
  leaves: ['🍃', '🍂', '🌿'],
  confetti: ['🎉', '🎊', '✨'],
  fireflies: ['✨', '·', '•'],
};

export interface StoryLine {
  /** Which voice says it. */
  readonly who: KidVoiceId;
  /** The character's name, for the bubble. Empty for the storyteller. */
  readonly name: string;
  /** What is said, with any `[giggles]` the voice should perform. */
  readonly text: string;
}

export interface StoryPage {
  readonly lines: readonly StoryLine[];
  /** What to draw, in English, for the picture engine. Never shown. */
  readonly scene: string;
  readonly motion: Motion;
  readonly sparkle: Sparkle;
  /** "Can you spot the little red snail?" — asked when the page has been read. */
  readonly wonder: string;
}

export interface CastMember {
  readonly name: string;
  readonly voice: KidVoiceId;
  /** How they look, the same words on every page so every picture matches. */
  readonly looks: string;
}

export interface WrittenStory {
  readonly title: string;
  readonly cast: readonly CastMember[];
  readonly pages: readonly StoryPage[];
}

/** How many pages the engine writes. The parent's price list reads this. */
export const ENGINE_PAGES = 6;

/** The most one page may say, all its lines together. One reading, priced as one. */
export const PAGE_MOST_CHARS = 420;

/** The longest question a page may ask. */
export const WONDER_MOST = 160;

/** The most one page's reading may be, question included. What it is priced at. */
export const READ_MOST_CHARS = PAGE_MOST_CHARS + WONDER_MOST;

/** Which voice tells the story: whoever says the lines with no character name. */
export function tellerOf(lines: readonly StoryLine[]): KidVoiceId {
  return lines.find((line) => !line.name)?.who ?? 'owl';
}

/**
 * What is read aloud for a page: its lines, then its question in the
 * storyteller's voice — so the brain-tickler is asked, not only shown.
 */
export function spokenLines(page: { readonly lines: readonly StoryLine[]; readonly wonder?: string }): StoryLine[] {
  const wonder = page.wonder?.trim();
  return wonder
    ? [...page.lines, { who: tellerOf(page.lines), name: '', text: wonder }]
    : [...page.lines];
}

/** The words on a page, as the child reads them. */
export function pageWords(page: { readonly lines: readonly StoryLine[] }): string {
  return page.lines.map((line) => bare(line.text)).filter(Boolean).join(' ');
}

/**
 * Whatever came back, made into a story the player cannot trip on.
 *
 * A model held to a schema still sends a voice nobody has, a motion that is
 * not a motion, a page with nothing said on it, a page that is too long to
 * read for its price. None of those may reach a child's screen, so each is
 * put right here rather than trusted: an unknown voice is the storyteller's,
 * an unknown motion is a slow zoom, a page with no words is dropped, and a
 * page past `PAGE_MOST_CHARS` loses lines from its end.
 */
export function cleanStory(raw: unknown, storyteller: KidVoiceId): WrittenStory | null {
  const row = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null;
  if (!row) return null;
  const text = (value: unknown, most: number): string => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, most);
  const cast: CastMember[] = (Array.isArray(row.cast) ? row.cast : []).slice(0, 4).map((one) => {
    const member = (one ?? {}) as Record<string, unknown>;
    const voice = kidVoice(member.voice)?.id ?? storyteller;
    return { name: text(member.name, 40), voice, looks: text(member.looks, 240) };
  }).filter((one) => one.name);
  const pages: StoryPage[] = [];
  for (const one of Array.isArray(row.pages) ? row.pages : []) {
    const page = (one ?? {}) as Record<string, unknown>;
    const lines: StoryLine[] = [];
    let chars = 0;
    for (const said of Array.isArray(page.lines) ? page.lines : []) {
      const line = (said ?? {}) as Record<string, unknown>;
      const words = text(line.text, PAGE_MOST_CHARS);
      if (!bare(words)) continue;
      if (chars + words.length > PAGE_MOST_CHARS && lines.length) break;
      chars += words.length;
      const who = kidVoice(line.who)?.id ?? storyteller;
      lines.push({ who, name: who === storyteller ? '' : text(line.name, 40), text: words });
    }
    if (!lines.length) continue;
    const motion = (MOTIONS as readonly string[]).includes(String(page.motion)) ? page.motion as Motion : 'zoom-in';
    const sparkle = (SPARKLES as readonly string[]).includes(String(page.sparkle)) ? page.sparkle as Sparkle : 'stars';
    pages.push({ lines, scene: text(page.scene, 600), motion, sparkle, wonder: text(page.wonder, WONDER_MOST) });
    if (pages.length >= ENGINE_PAGES) break;
  }
  if (pages.length < 3) return null;
  return { title: text(row.title, 80) || 'My story', cast, pages };
}

/**
 * When each line is said, as shares of the page's reading.
 *
 * The reading comes back as one sound with no timings in it, so the bubble
 * showing who is talking and the word lit under the reader's finger follow
 * the length of what is said. Each line also gets a little air for the
 * pause between speakers, which is where a podcast-style read leaves one.
 */
export function lineShares(lines: readonly { readonly text: string }[]): { start: number; end: number }[] {
  const AIR = 6;
  const weights = lines.map((line) => bare(line.text).length + AIR);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let at = 0;
  return weights.map((weight) => {
    const start = at / total;
    at += weight;
    return { start, end: at / total };
  });
}

/** Which word of a page is being said at `share` (0..1) of its reading. */
export function wordAt(lines: readonly { readonly text: string }[], share: number): number {
  const words = lines.flatMap((line) => bare(line.text).split(/\s+/).filter(Boolean));
  if (!words.length) return -1;
  const total = words.reduce((all, word) => all + word.length + 1, 0);
  const want = Math.max(0, Math.min(1, share)) * total;
  let at = 0;
  for (let i = 0; i < words.length; i += 1) {
    at += words[i].length + 1;
    if (at >= want) return i;
  }
  return words.length - 1;
}

/**
 * The words for the picture engine, for one page.
 *
 * The cast's looks go on every page, word for word, and the first page's
 * picture goes with the rest as the one to match — together that is what
 * keeps the dragon on page five the dragon from page one. No letters in the
 * picture, because a misspelt word in a child's book is the one thing a
 * parent notices.
 */
export function pageArt(story: WrittenStory, page: StoryPage, style: string, matchFirst: boolean): string {
  const who = story.cast.map((one) => `${one.name}: ${one.looks}`).filter((one) => one.length > 3).join('; ');
  return [
    matchFirst
      ? 'A new page of the same picture book: keep the characters, their looks and the art style exactly as in the picture given.'
      : 'The first page of a children’s picture book.',
    `Art style: ${style}.`,
    who ? `Characters: ${who}.` : '',
    `Scene: ${page.scene}`,
    'Bright, friendly and safe for young children. Full-bleed illustration with lots of small details to discover. No words, letters or numbers anywhere in the picture.',
  ].filter(Boolean).join(' ');
}
