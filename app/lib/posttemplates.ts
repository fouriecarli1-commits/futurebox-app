/**
 * Somewhere to start, for the post somebody is actually making.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner's list, 7 October 2026: *"Video, etc templates."*
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
import type { GlowId } from './postglow';
import type { Look } from './postlook';

/** Where on the picture a line sits. The same three the room offers. */
export type Spot = 'top' | 'middle' | 'lower' | 'bottom';

export interface TemplateWords {
  /** The i18n key and the English, as `t` takes them. */
  readonly says: readonly [string, string];
  readonly face: FaceId;
  readonly spot: Spot;
  readonly ink: string;
  /** The light the line gives off. Absent is none, which every older template is. */
  readonly glow?: GlowId;
  readonly letterGap?: number;
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
  /**
   * The two ends of the tile the picker draws for it — the owner, 13 October
   * 2026, with Google's page: a starter pack is chosen by its look, so the
   * button that chooses it has to carry the look. Absent draws a plain
   * button, which is what every template had until today.
   */
  readonly tile?: readonly [string, string];
}

const WHITE = '#ffffff';
const GOLD = '#fbbf24';
const NEON_CYAN = '#22d3ee';
const NEON_PINK = '#f472b6';
const NEON_EMERALD = '#34d399';
const NEON_VIOLET = '#a78bfa';
const NEON_LIME = '#a3e635';

export const TEMPLATES: readonly Template[] = [
  /* ── The futuristic and phantasm starter packs ────────────────────────
     The owner, 13 October 2026: "ons kort amazing futuristic text, foto, en
     shape templates. Neon, futuristic, phantasm, etc." The four Google's
     page drew, with the glow and the face that make them what they are. */
  {
    id: 'phantasm',
    name: ['post.tplPhantasm', 'Phantasm 2026'],
    what: ['post.tplPhantasmWhat', 'Synthwave: pink and violet light over a dark picture, for a night that is a show.'],
    size: 'square',
    look: { bright: 0.84, contrast: 1.28, colour: 1.3 },
    tile: ['#581c87', '#831843'],
    words: [
      { says: ['post.tplPhantasmOne', 'PHANTASM 2026'], face: 'poster', spot: 'middle', ink: '#fbcfe8', glow: 'synth', letterGap: 0.12 },
      { says: ['post.tplPhantasmTwo', 'Neon cyber glow, all night'], face: 'plain', spot: 'lower', ink: '#f472b6', glow: 'synth' },
    ],
  },
  {
    id: 'matrix',
    name: ['post.tplMatrix', 'Future Pro'],
    what: ['post.tplMatrixWhat', 'Emerald and cyan on near-black: the quantum grid, for anything made with the machine.'],
    size: 'story',
    look: { bright: 0.8, contrast: 1.3, colour: 1.1 },
    tile: ['#022c22', '#083344'],
    words: [
      { says: ['post.tplMatrixOne', 'FUTURE PRO'], face: 'future', spot: 'middle', ink: '#ecfdf5', glow: 'neon', letterGap: 0.22 },
      { says: ['post.tplMatrixTwo', 'Made in the black box'], face: 'type', spot: 'lower', ink: '#34d399', glow: 'neon', letterGap: 0.16 },
    ],
  },
  {
    id: 'glitch',
    name: ['post.tplGlitch', 'Static Wave'],
    what: ['post.tplGlitchWhat', 'Glitch art: ice-blue light with a wide, cold tracking, for a drop or a remix.'],
    size: 'square',
    look: { bright: 0.9, contrast: 1.35, colour: 0.85 },
    tile: ['#172554', '#3b0764'],
    words: [
      { says: ['post.tplGlitchOne', 'STATIC WAVE'], face: 'future', spot: 'top', ink: '#e0f2fe', glow: 'ice', letterGap: 0.3 },
      { says: ['post.tplGlitchTwo', 'Remix out now'], face: 'type', spot: 'bottom', ink: '#67e8f9', glow: 'holo', letterGap: 0.2 },
    ],
  },
  {
    id: 'golden',
    name: ['post.tplGolden', 'Studio Art'],
    what: ['post.tplGoldenWhat', 'Golden hour: warm light and a serif, for a portrait or an album moment.'],
    size: 'portrait',
    look: { bright: 0.96, contrast: 1.12, colour: 1.18 },
    tile: ['#451a03', '#1c1917'],
    words: [
      { says: ['post.tplGoldenOne', 'STUDIO ART'], face: 'book', spot: 'top', ink: '#fde68a', glow: 'gold', letterGap: 0.2 },
      { says: ['post.tplGoldenTwo', 'Shot in the golden hour'], face: 'hand', spot: 'bottom', ink: '#fef3c7', glow: 'gold' },
    ],
  },
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
    id: 'neon_cyber',
    name: ['post.tplNeonCyber', 'Neon Cyber Glow'],
    what: ['post.tplNeonCyberWhat', 'Electric cyan and fuchsia typography with a sleek synthwave look.'],
    size: 'story',
    look: { bright: 0.92, contrast: 1.25, colour: 1.3 },
    words: [
      { says: ['post.tplNeonCyberOne', 'CYBER LIVE'], face: 'poster', spot: 'middle', ink: NEON_CYAN },
      { says: ['post.tplNeonCyberTwo', 'Laser lights and synthesizer nights'], face: 'plain', spot: 'lower', ink: NEON_PINK },
    ],
  },
  {
    id: 'neon_club',
    name: ['post.tplNeonClub', 'Neon Club Night'],
    what: ['post.tplNeonClubWhat', 'Loud nightlife neon design for DJs, parties and dance tracks.'],
    size: 'square',
    look: { bright: 0.88, contrast: 1.3, colour: 1.35 },
    words: [
      { says: ['post.tplNeonClubOne', 'MIDNIGHT BEATS'], face: 'poster', spot: 'top', ink: NEON_EMERALD },
      { says: ['post.tplNeonClubTwo', 'Doors open 10PM · Cape Town'], face: 'plain', spot: 'bottom', ink: NEON_PINK },
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
    id: 'neon_wave',
    name: ['post.tplNeonWave', 'Neon Retro Wave'],
    what: ['post.tplNeonWaveWhat', 'Vibrant ultraviolet glow with warm golden neon highlights.'],
    size: 'portrait',
    look: { bright: 0.9, contrast: 1.2, warmth: 0.15, colour: 1.25 },
    words: [
      { says: ['post.tplNeonWaveOne', 'NEON HORIZON'], face: 'poster', spot: 'middle', ink: NEON_VIOLET },
      { says: ['post.tplNeonWaveTwo', 'New single streaming everywhere'], face: 'plain', spot: 'bottom', ink: GOLD },
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
    id: 'neon_stage',
    name: ['post.tplNeonStage', 'Neon Stage Lights'],
    what: ['post.tplNeonStageWhat', 'Concert stadium lighting with electric lime and cyan glow.'],
    size: 'wide',
    look: { contrast: 1.22, colour: 1.3 },
    words: [
      { says: ['post.tplNeonStageOne', 'ELECTRIC ARENA TOUR'], face: 'poster', spot: 'middle', ink: NEON_LIME },
      { says: ['post.tplNeonStageTwo', 'Tickets available now'], face: 'plain', spot: 'bottom', ink: NEON_CYAN },
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
