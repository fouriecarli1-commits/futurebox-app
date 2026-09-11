/**
 * How an advert can look and sound, and when each look stops working.
 *
 * ── Why this is a file and not an API ────────────────────────────────────
 *
 * Carli, 11 September 2026: "kan dit nie sinvol wees om advertensie style na
 * te gaan in die tipe produk range en style uit te wys wat stylvol en
 * huidiglik die trend is nie? Ek weet nie of pinterest of canva sulke toegange
 * gee nie."
 *
 * I could not find out. developers.pinterest.com, canva.dev and
 * trends.pinterest.com are all blocked from the machine this was written on,
 * so anything I said about what they offer would be a guess dressed as a
 * fact — which this codebase has paid for twice this week.
 *
 * But the API is not the answer even if one exists, and that matters more.
 * A trends feed that breaks goes on returning last year's answer with a
 * confident face. A file with a date on it says how old it is, on the screen,
 * to the person deciding. Wrong and dated beats wrong and silent.
 *
 * ── What is in here, and what is not ─────────────────────────────────────
 *
 * Craft, not fashion. "A real hand doing the real thing" has worked for
 * twenty years and will work in five. "The specific transition everybody used
 * last March" is not in here and should never be: it is unknowable from a
 * desk, stale within weeks, and the one thing a person with a phone and a
 * local business cannot execute anyway.
 *
 * What each entry does carry is the honest half of "is this current": the
 * **tired** line — what makes this look done, right now, to somebody who sees
 * a hundred of these a week. That is the part that dates, and it is the part
 * that is dated.
 *
 * ── Whose opinion this is ────────────────────────────────────────────────
 *
 * Mine, on the date each entry says, and it is the weakest thing in this
 * repository. Carli sells in this market and I have never seen it. Every
 * entry is written to be argued with and corrected rather than trusted, and
 * `reviewed` is required by the type so that no entry can pretend to be
 * newer than it is.
 */

import type { AdFormat } from './adformats';

/** What is being sold. Coarse on purpose: a finer list chooses nothing. */
export const RANGES = [
  'food',
  'handmade',
  'service',
  'product',
  'property',
  'wellness',
  'teaching',
  'events',
  'community',
  'farming',
] as const;

export type Range = (typeof RANGES)[number];

export interface AdStyle {
  readonly id: string;
  readonly en: string;
  readonly af: string;
  /**
   * What it looks like, concretely enough to write a shot from.
   *
   * The test: could somebody who has never seen an advert build the prompt
   * from this line alone? "Authentic and relatable" fails it. "One hand,
   * daylight from a window, the object never fully in frame" passes.
   */
  readonly looks: string;
  /** Which ranges it suits. A style that suits everything suits nothing. */
  readonly ranges: readonly Range[];
  /** Why it works, in terms of what the viewer is doing. */
  readonly works: string;
  /**
   * What makes it look done.
   *
   * The entry that dates, and the reason the date is on every entry. Written
   * as a condition rather than a year — "when the hands are obviously stock"
   * stays true; "in 2026 this is over" does not.
   */
  readonly tired: string;
  /** Which formats it is a way of doing. Ids from `adformats.ts`. */
  readonly formats: readonly string[];
  /**
   * When somebody last looked at whether this is still true. ISO date.
   *
   * Required, and required to be a real date in the past — see
   * `check:adstyles`. An undated opinion presented beside dated ones is the
   * one a reader trusts most and should trust least.
   */
  readonly reviewed: string;
}

/* Every entry below was written on 11 September 2026 by me, from craft
   rather than from looking at a feed, because I cannot look at a feed. */
const ME = '2026-09-11';

export const AD_STYLES: readonly AdStyle[] = [
  {
    id: 'hands_working',
    en: 'A real hand, doing the real thing',
    af: '’n Regte hand, wat die regte ding doen',
    looks:
      'One pair of hands, close, daylight from a window or a door. The object is never fully in ' +
      'frame — you see the work, not the product shot. No face, no words for the first three seconds.',
    ranges: ['food', 'handmade', 'farming', 'service'],
    works:
      'It is the fastest possible proof that a person made this. A viewer decides whether something ' +
      'is real long before they decide whether they want it, and hands are how they decide.',
    tired:
      'When the hands are obviously not the maker’s — a manicure on a bakery, a stock pair on a farm. ' +
      'The whole effect is "this is mine", and a borrowed hand reverses it into "this is anyone’s".',
    formats: ['short_vertical', 'explainer_voice_over_stills'],
    reviewed: ME,
  },
  {
    id: 'one_take',
    en: 'One take, no cuts',
    af: 'Een skoot, geen snitte',
    looks:
      'A single unbroken shot, handheld, from start to finish. Nothing is edited out, including the ' +
      'pause where nothing happens.',
    ranges: ['food', 'handmade', 'service', 'farming', 'community'],
    works:
      'A cut is where a viewer suspects something was hidden. One take cannot hide, and everybody ' +
      'watching knows that without being told.',
    tired:
      'When nothing actually happens in it. One take is a claim that the thing is worth watching ' +
      'uncut; a boring unbroken shot proves the opposite of what it was for.',
    formats: ['short_vertical'],
    reviewed: ME,
  },
  {
    id: 'sound_off_text',
    en: 'The words are the advert',
    af: 'Die woorde ís die advertensie',
    looks:
      'Large text on screen, one line at a time, over a still or a slow-moving background. Readable ' +
      'with the sound off and nothing lost. Never more than seven words on screen at once.',
    ranges: ['service', 'product', 'property', 'teaching', 'events'],
    works:
      'Most of these are watched with the sound off, in a queue or in bed. A clip that needs audio to ' +
      'make sense is a clip most people never understood.',
    tired:
      'When the text is the caption read aloud in writing. If somebody could get the same thing from ' +
      'the post’s caption, the video added nothing and cost a generation.',
    formats: ['short_vertical', 'written_posts'],
    reviewed: ME,
  },
  {
    id: 'own_voice_unscripted',
    en: 'Your own voice, not read',
    af: 'Jou eie stem, nie voorgelees nie',
    looks:
      'You, talking, over your own photographs or straight to the camera. Said the way you would say ' +
      'it across a counter — not the way it is written down.',
    ranges: ['service', 'handmade', 'wellness', 'teaching', 'community'],
    works:
      'For a one-person business the person IS the product, and the buyer is deciding whether they ' +
      'want to deal with you. A script read aloud answers a different question.',
    tired:
      'The moment it sounds read. A cloned or performed voice reading marketing sentences is worse ' +
      'than no voice at all, because it tells the listener you were not really there.',
    formats: ['explainer_voice_over_stills', 'spoken_read', 'podcast_episode'],
    reviewed: ME,
  },
  {
    id: 'problem_then_thing',
    en: 'The problem first, the thing second',
    af: 'Eers die probleem, dan die ding',
    looks:
      'The first two seconds show the annoyance, not the product. The product arrives at the halfway ' +
      'point and is never explained, only used.',
    ranges: ['product', 'service', 'wellness', 'teaching'],
    works:
      'Nobody is looking for your product. They are recognising their own problem, which is the only ' +
      'thing that stops a scroll for somebody who has never heard of you.',
    tired:
      'When the problem is invented for the advert. A viewer who does not have it feels sold to, and ' +
      'one who does have it can tell you have never had it.',
    formats: ['short_vertical', 'explainer_film'],
    reviewed: ME,
  },
  {
    id: 'before_after',
    en: 'Before, and after',
    af: 'Voor, en na',
    looks:
      'Two shots from the same position, hard cut between them, no transition. The camera does not ' +
      'move. Both ends are real and neither is staged for the other.',
    ranges: ['service', 'property', 'wellness', 'handmade'],
    works:
      'It is the only structure that shows the result rather than describing it, and it survives being ' +
      'watched at speed with no sound.',
    tired:
      'When the "before" is obviously made worse on purpose. That is the version everybody has seen and ' +
      'it makes the "after" unbelievable too.',
    formats: ['short_vertical', 'explainer_voice_over_stills'],
    reviewed: ME,
  },
  {
    id: 'customer_says_it',
    en: 'The customer says it, not you',
    af: 'Die kliënt sê dit, nie jy nie',
    looks:
      'One person, their own words, their own phone if that is what there is. No lower third, no logo ' +
      'until the end. Kept messy.',
    ranges: ['service', 'wellness', 'teaching', 'property', 'events'],
    works:
      'A claim in your own mouth is an advert; the same claim in a buyer’s mouth is evidence. Nothing ' +
      'you can say about yourself competes with it.',
    tired:
      'The second it looks produced. A well-lit testimonial with clean audio reads as paid, and a paid ' +
      'testimonial is worth less than no testimonial.',
    formats: ['short_vertical', 'written_posts'],
    reviewed: ME,
  },
  {
    id: 'plain_ground',
    en: 'The object, a plain ground, and nothing else',
    af: 'Die voorwerp, ’n gewone agtergrond, en niks anders',
    looks:
      'One object, centred, on a single flat colour or a real surface — a table, a cloth, concrete. ' +
      'Slow turn or no movement at all. No props.',
    ranges: ['handmade', 'product', 'food'],
    works:
      'It says the thing can carry attention on its own. For anything whose form is the reason to buy ' +
      'it, every prop is a distraction from the argument.',
    tired:
      'When the object cannot carry it. This style is a claim about quality and it fails loudly — ' +
      'which is useful to know before spending money on the advert instead of the product.',
    formats: ['short_vertical', 'written_posts'],
    reviewed: ME,
  },
  {
    id: 'made_on_a_phone',
    en: 'Shot on a phone, and it shows',
    af: 'Op ’n foon geskiet, en dit wys',
    looks:
      'Vertical, natural light, no stabilisation, no grade. Framed well but not lit. Looks like it was ' +
      'made by somebody standing there, because it was.',
    ranges: ['food', 'community', 'events', 'farming', 'handmade'],
    works:
      'In a local feed this reads as a neighbour and a polished one reads as a chain. For a small ' +
      'business the amateur look is the competitive advantage, not a compromise.',
    tired:
      'When it is faked — a production made to look rough. People spot it, and the punishment is ' +
      'harsher than for being polished honestly.',
    formats: ['short_vertical', 'song_with_a_photo'],
    reviewed: ME,
  },
  {
    id: 'dry_afrikaans',
    en: 'Deadpan, in Afrikaans',
    af: 'Droog, in Afrikaans',
    looks:
      'Straight face, flat delivery, the joke never acknowledged. The line carries it; nothing on screen ' +
      'helps it along. No music sting, no reaction shot.',
    ranges: ['food', 'service', 'community', 'farming', 'events'],
    works:
      'It is the register a great deal of Afrikaans humour actually runs in, and almost nobody is ' +
      'advertising in it. A thing made properly in Afrikaans has a room to itself.',
    tired:
      'When it is an English joke in Afrikaans words. Translated comic timing is the most obvious ' +
      'import there is, and it lands as trying rather than as funny.',
    formats: ['short_vertical', 'spoken_read', 'song_with_a_photo'],
    reviewed: ME,
  },
  {
    id: 'the_list',
    en: 'Three things nobody tells you',
    af: 'Drie dinge wat niemand jou sê nie',
    looks:
      'A numbered list, one item per shot or per line, each one specific enough to be useful on its own. ' +
      'The product appears in one of the three, not all of them.',
    ranges: ['teaching', 'service', 'wellness', 'property', 'farming'],
    works:
      'It is useful before it is persuasive, so it earns the watch. Somebody who learned something from ' +
      'you has already decided you know what you are doing.',
    tired:
      'When the three things are generic. A list anybody could have written is a list that proves ' +
      'nothing about you, and the format makes that obvious rather than hiding it.',
    formats: ['explainer_film', 'written_posts', 'podcast_episode'],
    reviewed: ME,
  },
  {
    /* Added the day the catalogue was written, because `check:adstyles`
       found `jingle` with no look at all on its first run — twelve styles,
       every one of them visual, for a format that is audio and nothing
       else. A recommendation with no way to say how it should sound is the
       half-built card that check exists to prevent. */
    id: 'sonic_signature',
    en: 'The same four notes, every single time',
    af: 'Dieselfde vier note, elke enkele keer',
    looks:
      'Under five seconds. One instrument or one voice, never both. It lands on the last frame of ' +
      'every clip you post, in the same place, at the same volume, with nothing spoken over it. ' +
      'No lyrics beyond the name, if that.',
    ranges: ['food', 'service', 'product', 'community', 'events'],
    works:
      'Nothing else on this list compounds. The twentieth clip is recognised in the second before ' +
      'anybody reads the name, and that recognition is bought once and used for years.',
    tired:
      'When it changes. A signature that is different each time is not a signature — it is a jingle, ' +
      'and it does nothing. The version that is slightly better next month is worth less than the ' +
      'one you have already used forty times.',
    formats: ['jingle', 'song_with_a_photo'],
    reviewed: ME,
  },
  {
    id: 'the_place',
    en: 'Where it happens, before what it is',
    af: 'Waar dit gebeur, voor wat dit is',
    looks:
      'The workshop, the field, the kitchen, the room — in its real state, at the real hour. The product ' +
      'is in the frame but is not the subject.',
    ranges: ['handmade', 'farming', 'food', 'property', 'community'],
    works:
      'Place is the one thing a competitor cannot copy and a bigger company cannot fake. It also answers ' +
      '"are these people real" before the question is asked.',
    tired:
      'When the place is tidied for the camera. The mess is the evidence; cleaning it up removes the ' +
      'only thing the shot was for.',
    formats: ['short_vertical', 'explainer_voice_over_stills', 'song_with_a_photo'],
    reviewed: ME,
  },
];

export function styleById(id: string): AdStyle | null {
  return AD_STYLES.find((one) => one.id === id) ?? null;
}

export const STYLE_IDS = AD_STYLES.map((one) => one.id);

/** How long ago an entry was last looked at, in whole days. */
export function daysSince(reviewed: string, now: Date = new Date()): number {
  const at = new Date(`${reviewed}T00:00:00Z`);
  if (Number.isNaN(at.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now.getTime() - at.getTime()) / 86_400_000));
}

/**
 * The oldest review in the catalogue, which is what the screen should say.
 *
 * The oldest rather than the average, because an average hides the one entry
 * nobody has looked at since it was written — which is the entry most likely
 * to be wrong.
 */
export function oldestReview(now: Date = new Date()): number {
  return AD_STYLES.reduce((worst, one) => Math.max(worst, daysSince(one.reviewed, now)), 0);
}

/** The styles that suit one format, for the model to choose within. */
export function stylesFor(format: AdFormat | null): readonly AdStyle[] {
  if (!format) return AD_STYLES;
  const fits = AD_STYLES.filter((one) => one.formats.includes(format.id));
  return fits.length > 0 ? fits : AD_STYLES;
}

/**
 * The catalogue, written out for the model.
 *
 * The `tired` line is included and is the point. A list of twelve looks that
 * are all good is a list a model picks the first item from; what makes a
 * choice a choice is knowing what each one costs.
 */
export function describeStyles(): string {
  return AD_STYLES.map(
    (one) =>
      `- ${one.id} — ${one.en}. Looks like: ${one.looks}\n` +
      `    suits: ${one.ranges.join(', ')}\n` +
      `    works because: ${one.works}\n` +
      `    looks done when: ${one.tired}`,
  ).join('\n');
}
