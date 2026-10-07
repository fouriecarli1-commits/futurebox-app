/**
 * Somewhere to start, for the post somebody is actually making.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli's list, 7 October 2026: *"Video, etc templates."*
 *
 * ── Why a starting point and not a design ────────────────────────────────
 *
 * The empty room is the hardest screen in this app. Everything in the photo
 * editor works and none of it tells somebody what to make: a picture, a
 * shape, three fonts, a colour and a blank text box is twenty decisions
 * before the first word, and the person who came to announce a show on
 * Friday is still choosing a font.
 *
 * So each of these is a shape, a look and the words already in place, for one
 * of the six things people posting about their own work actually post. Press
 * it and the post is made; then change every part of it, because none of this
 * is locked and the words are hers the moment she touches them.
 *
 * ── Why the words are real sentences and not "YOUR TEXT HERE" ────────────
 *
 * A placeholder is a second job. Somebody who presses "Show on Friday" and
 * gets `HEADLINE` has been handed the same blank page with more steps; one
 * who gets "FRIDAY 8PM" and the name of a venue has a post that is wrong in
 * the details and right in the shape, which is a thing to correct rather than
 * a thing to invent. They are in both languages for the same reason every
 * other sentence in this app is.
 *
 * ── What a template may not do ───────────────────────────────────────────
 *
 * Put words where the platform prints its own. A story has a caption bar, a
 * send box and a row of buttons over the bottom quarter, and `safezones.ts`
 * knows where. A template that lands its words there is worse than no
 * template: it is the app's own suggestion, in the app's own voice, and it
 * comes out covered. `check:posttemplates` holds every one of them to that,
 * at the size it chooses, in both languages.
 */

import type { FaceId } from './postfaces';
import type { Look } from './postlook';

/** Where on the picture a line sits. The same three the room offers. */
export type Spot = 'top' | 'middle' | 'lower' | 'bottom';

export interface TemplateWords {
  /** The i18n key and the English, as `t` takes them. */
  readonly says: readonly [string, string];
  readonly face: FaceId;
  readonly spot: Spot;
  readonly ink: string;
}

export interface Template {
  readonly id: string;
  readonly name: readonly [string, string];
  readonly what: readonly [string, string];
  /** Which `POST_SIZES` id it starts in. */
  readonly size: string;
  /** What to do to the picture. Nothing is left as it came. */
  readonly look?: Partial<Look>;
  readonly words: readonly TemplateWords[];
}

const WHITE = '#ffffff';
const GOLD = '#fbbf24';

export const TEMPLATES: readonly Template[] = [
  {
    id: 'show',
    name: ['post.tplShow', 'A show on Friday'],
    what: ['post.tplShowWhat', 'The date and the place, big, over a photograph.'],
    size: 'story',
    look: { bright: 0.86, contrast: 1.14 },
    words: [
      { says: ['post.tplShowOne', 'FRIDAY 8PM'], face: 'poster', spot: 'middle', ink: GOLD },
      { says: ['post.tplShowTwo', 'Aandklas, Stellenbosch'], face: 'plain', spot: 'lower', ink: WHITE },
    ],
  },
  {
    id: 'song',
    name: ['post.tplSong', 'A song is out'],
    what: ['post.tplSongWhat', 'The name of it, and where to hear it.'],
    size: 'square',
    look: { contrast: 1.1, colour: 1.12 },
    words: [
      { says: ['post.tplSongOne', 'OUT NOW'], face: 'poster', spot: 'top', ink: GOLD },
      { says: ['post.tplSongTwo', 'Everywhere you listen'], face: 'plain', spot: 'bottom', ink: WHITE },
    ],
  },
  {
    id: 'quote',
    name: ['post.tplQuote', 'Something somebody said'],
    what: ['post.tplQuoteWhat', 'A line in the middle, with the picture pulled back.'],
    size: 'square',
    look: { bright: 0.78, colour: 0.7, blur: 2 },
    words: [
      { says: ['post.tplQuoteOne', '“We made the whole thing on a phone.”'], face: 'book', spot: 'middle', ink: WHITE },
    ],
  },
  {
    id: 'behind',
    name: ['post.tplBehind', 'Behind the scenes'],
    what: ['post.tplBehindWhat', 'One line at the bottom, out of the way of the picture.'],
    size: 'portrait',
    look: { warmth: 0.18, contrast: 1.06 },
    words: [
      { says: ['post.tplBehindOne', 'Day three. Still going.'], face: 'plain', spot: 'bottom', ink: WHITE },
    ],
  },
  {
    id: 'thanks',
    name: ['post.tplThanks', 'Thank you'],
    what: ['post.tplThanksWhat', 'After the show, after the release, after anything.'],
    size: 'square',
    look: { bright: 0.84, warmth: 0.2 },
    words: [
      { says: ['post.tplThanksOne', 'DANKIE'], face: 'poster', spot: 'middle', ink: WHITE },
      { says: ['post.tplThanksTwo', 'Every one of you'], face: 'plain', spot: 'bottom', ink: GOLD },
    ],
  },
  {
    id: 'wide',
    name: ['post.tplWide', 'A cover, lying down'],
    what: ['post.tplWideWhat', 'The wide shape, for a video cover or a header.'],
    size: 'wide',
    look: { contrast: 1.12 },
    words: [
      { says: ['post.tplWideOne', 'The whole studio, in your phone'], face: 'plain', spot: 'bottom', ink: WHITE },
    ],
  },
];

export const templateOf = (id: string): Template | null =>
  TEMPLATES.find((one) => one.id === id) ?? null;
