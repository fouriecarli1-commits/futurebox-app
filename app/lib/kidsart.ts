/**
 * What Google is asked to draw for the child's room.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Kan jy asb nie op jou eie engine staat maak om
 * kreatiewe idees uit te dink vir die kids room nie. Jy is nie goed daarmee
 * nie. Jy sal moet ons google engines gebruik!"*
 *
 * She is right. The bubbles in that room carry line icons chosen from a
 * library, which is a drawing made by picking rather than by drawing. The
 * pictures a six-year-old should be looking at are pictures somebody drew,
 * and the engine that can draw twenty-three of them in one press is hers,
 * not mine.
 *
 * ── The rule, which is the same one the logo bench has ───────────────────
 *
 * Nothing we have drawn is sent. The prompt is words only — this file holds
 * no reference picture and the route passes none — because an image model
 * handed a drawing reproduces it, and the whole point of asking is to get
 * something neither of us would have made.
 *
 * ── Why each picture is asked for the same way ───────────────────────────
 *
 * Twenty-three pictures that are going to sit beside each other have to look
 * like a set. So every ask is HOUSE plus the one topic's own words, and
 * nothing else varies: one style sentence, one shape, one ground. Letting
 * each prompt describe its own style is how a sticker sheet ends up with
 * four of them in watercolour and one photographic.
 *
 * ── And why the ground is plain white rather than transparent ────────────
 *
 * Because an image model cannot make transparency — it draws a PICTURE of a
 * checkerboard when asked for one. That was measured on her logo. White cuts
 * out cleanly with the remover in `lib/flatcut.ts`, so the way to a
 * see-through sticker is white first and the remover second.
 */

import { KID_SOUNDS, KID_TOPICS } from './kidsong';

/** Said before every one of them, so twenty-three pictures are one set. */
export const HOUSE = [
  'A single flat illustration for a small child, in a friendly modern'
  + ' picture-book style: bold simple shapes, thick confident outlines, warm'
  + ' bright colours, no shading or gradients.',
  'One subject, centred, filling the frame, seen straight on.',
  'On a plain pure white background, no scene, no floor, no shadow.',
  'No text, no letters, no numbers anywhere in the image.',
].join(' ');

export type Drawing = {
  readonly id: string;
  /** Which list it came from, so the room knows where to put it. */
  readonly of: 'topic' | 'sound';
  /** What the child sees under it, in both languages. */
  readonly says: readonly [string, string];
  /** The subject, in words. */
  readonly words: string;
};

/**
 * What to draw for each topic.
 *
 * Written out rather than taken from the song's own words, which was the
 * first attempt: those say "a happy SONG about a dog", and a picture model
 * handed that draws sheet music. Stripping the word with a regular
 * expression half worked — "a simple counting song from one to ten" and "a
 * slow, calm song for falling asleep" both kept it, and the check said so.
 *
 * A picture is a different thing from a song about the same subject, and
 * pretending one prompt can be both is how twenty-three pictures come back
 * with four of them wrong and no way to say which.
 */
const TOPIC_SUBJECTS: Record<string, string> = {
  dog: 'a cheerful dog with a wagging tail',
  cat: 'a contented cat curled up asleep',
  space: 'a small rocket flying past a ringed planet and some stars',
  birthday: 'a birthday cake with lit candles on it',
  sea: 'a rolling blue wave with two little fish in it',
  rain: 'a bright umbrella with raindrops falling around it',
  brave: 'a small child standing tall wearing a cape',
  dinos: 'a friendly green dinosaur with a long neck',
  farm: 'a red barn with a cow and a chicken beside it',
  bedtime: 'a crescent moon above a cosy bed with a sleeping teddy',
  friends: 'two children holding hands and smiling',
  counting: 'a row of five brightly coloured wooden blocks',
  colours: 'a splash of paint in many colours, like an open paintbox',
  school: 'a satchel, a pencil and an apple together',
};

/**
 * What to draw for each sound.
 *
 * A sound is not a thing, so "draw kwaito" gets a picture of a word. Each one
 * is given an OBJECT a child would recognise instead, chosen so the nine do
 * not collide: nine different instruments and objects, not nine happy faces.
 */
const SOUND_SUBJECTS: Record<string, string> = {
  happy: 'a smiling yellow sun wearing headphones',
  quiet: 'a crescent moon resting on a soft cloud',
  rock: 'a bright red electric guitar',
  dance: 'a pair of colourful dancing shoes mid-step',
  march: 'a shiny marching drum with two sticks crossed on it',
  funny: 'a cheerful cartoon duck holding a squeaky horn',
  country: 'an acoustic guitar leaning on a wooden fence post',
  kwaito: 'a pair of bold street speakers stacked up',
  musicbox: 'an open wind-up music box with a tiny dancer on it',
};

/** Every picture the room wants, in the order it shows them. */
/**
 * What a choice gets when nobody wrote it a subject.
 *
 * Exported so a check can find it. A fallback is the right thing to have —
 * nothing should ever render bare — and it is also the thing that hides a
 * missing entry: delete one sound's subject and the set still draws
 * twenty-three pictures, five of which are a musical note. That mutation went
 * through this file unnoticed until the check was taught to look for it.
 */
export const NOTHING_WRITTEN = 'a bright musical note';

export const DRAWINGS: readonly Drawing[] = [
  ...KID_TOPICS.map((one) => ({
    id: one.id,
    of: 'topic' as const,
    says: one.says,
    words: TOPIC_SUBJECTS[one.id] ?? NOTHING_WRITTEN,
  })),
  ...KID_SOUNDS.map((one) => ({
    id: one.id,
    of: 'sound' as const,
    says: one.says,
    words: SOUND_SUBJECTS[one.id] ?? NOTHING_WRITTEN,
  })),
];

export const drawingById = (id: string, of: 'topic' | 'sound'): Drawing | undefined =>
  DRAWINGS.find((one) => one.id === id && one.of === of);

/** Exactly what is handed to Google for one picture. */
export type Ask = {
  readonly words: string;
  /** No picture. Never a picture. See `check:kinderkuns`. */
  readonly from: undefined;
  /** Square, because every one of them is drawn inside a round bubble. */
  readonly aspect: '1:1';
};

export function askFor(one: Drawing): Ask {
  return { words: `${HOUSE} The subject is ${one.words}.`, from: undefined, aspect: '1:1' };
}
