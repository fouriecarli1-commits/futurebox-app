/**
 * The colours and the shape of the child's room.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Sjoe, die kids room page is dood en vervelig,
 * dit moet colourful en exciting wees… dit moet vol kleur en excitement
 * wees, en selfs die uitleg moet anders en uniek wees as die status quo."*
 *
 * ── Why the colours live here and not in the room ────────────────────────
 *
 * Because there are fourteen of them and they have to hold two rules that
 * nobody can see by looking at one at a time: every topic is a DIFFERENT
 * colour, and every one of them is light enough to put near-black words on.
 * Fourteen colours written into fourteen bits of JSX is fourteen chances for
 * two of them to be the same green and for one of them to be a navy nobody
 * can read a label on. Here they are a list, and `check:kinderkleur` counts
 * them and measures the contrast.
 *
 * ── Why a child's room gets its own palette at all ───────────────────────
 *
 * The rest of this app is near-black with one green in it, which is right
 * for somebody editing a film at night and wrong for a six-year-old. The
 * room declares `data-kidsroom`, and the block in `globals.css` repaints the
 * ground under it — the same mechanism the Cubed room uses, so there is one
 * way of doing this and not two.
 */

/** A topic's own colour: the wash behind its bubble, and ink that reads on it. */
export type Paint = {
  /** The two ends of the bubble's gradient. */
  readonly from: string;
  readonly to: string;
  /** Near-black or near-white, whichever can be read on `from`. */
  readonly ink: string;
};

/**
 * How bright a colour is, 0 to 1, the way an eye weighs it.
 *
 * Rec. 709 luma. Used to choose the ink, because a yellow bubble with white
 * words on it is a bubble with no words on it, and the fault is invisible to
 * anybody who picked the yellow.
 */
export function brightnessOf(hex: string): number {
  const at = hex.replace('#', '');
  const r = parseInt(at.slice(0, 2), 16) / 255;
  const g = parseInt(at.slice(2, 4), 16) / 255;
  const b = parseInt(at.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Near-black on a bright colour, near-white on a dark one. */
export const inkOn = (hex: string): string =>
  (brightnessOf(hex) > 0.5 ? '#1a1206' : '#fffaf2');

const paint = (from: string, to: string): Paint => ({ from, to, ink: inkOn(from) });

/**
 * One colour per topic, in the order the topics are listed.
 *
 * Chosen so that no two neighbours in the grid are the same family — a sheet
 * of fourteen bubbles where three greens sit together reads as a mistake even
 * to somebody who cannot say why.
 */
export const PAINTS: Record<string, Paint> = {
  dog: paint('#ffb020', '#ff7a18'),
  cat: paint('#ff6fa5', '#ff3d7f'),
  space: paint('#7b61ff', '#4b2fd6'),
  birthday: paint('#ff5fd2', '#c42bb0'),
  sea: paint('#2fd0e0', '#0e9bb8'),
  rain: paint('#58a6ff', '#2b6fe0'),
  brave: paint('#ff8a3d', '#e2521a'),
  dinos: paint('#53d86a', '#1f9e46'),
  farm: paint('#d6b24a', '#a67c1f'),
  bedtime: paint('#5a63b8', '#2f3578'),
  friends: paint('#ff9e7d', '#e85d3a'),
  counting: paint('#43c6ac', '#1a8f85'),
  colours: paint('#ff4d6d', '#d61f45'),
  school: paint('#45b7ff', '#1178cc'),
};

/**
 * One colour per way a song can sound. There are nine of them.
 *
 * Nine, and the first draft of this file had four — because four is what the
 * room's grid used to show and nobody counted. Five sounds would have come
 * out in the fallback grey, in a room whose whole point is colour, and it
 * would have looked deliberate. `check:kinderkleur` counts these against the
 * real list now rather than against a memory of it.
 */
export const SOUND_PAINTS: Record<string, Paint> = {
  happy: paint('#ffd43b', '#f0a500'),
  quiet: paint('#9db8ff', '#5f7ee0'),
  rock: paint('#ff5a3c', '#cf2a10'),
  dance: paint('#49e0a0', '#18ae78'),
  march: paint('#c9a227', '#8a6b10'),
  funny: paint('#ff8fe0', '#e04bbd'),
  country: paint('#e0a86b', '#b07434'),
  kwaito: paint('#6ee7f5', '#17a2bd'),
  musicbox: paint('#cdb4ff', '#8b6ae0'),
};

/** Whatever colour is asked for, or a plain one, so nothing ever renders bare. */
export const paintOf = (which: Record<string, Paint>, id: string | null): Paint =>
  (id && which[id]) || paint('#d9d2c5', '#a8a090');

/**
 * How big a bubble is, so the sheet is not a grid.
 *
 * Her words: *"selfs die uitleg moet anders en uniek wees as die status
 * quo."* A grid of equal squares is the status quo — it is what every app
 * does and what this room did. Three sizes in a repeating-but-not-obvious
 * run give a sheet that reads as scattered stickers while still being an
 * ordinary wrapping row underneath, which is what keeps it working on a
 * phone and keeps every bubble a real button.
 *
 * The run is 14 long and prime-ish on purpose: a 3-step cycle against 14
 * items means the second row does not line up with the first.
 */
export const SIZES = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 1, 2, 3, 1] as const;

export const sizeAt = (at: number): number => SIZES[at % SIZES.length];

/**
 * The magic wheel, and the mascot — both of them Google's ideas, not mine.
 *
 * ── Where they came from ─────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Kan jy asb nie op jou eie engine staat maak om
 * kreatiewe idees uit te dink vir die kids room nie. Jy is nie goed daarmee
 * nie. Jy sal moet ons google engines gebruik!"* She then took the question to
 * Google herself and sent back what it drew: a bright room with a bobbing
 * mascot that talks, a spin-the-wheel for when a child cannot decide, pads to
 * tap, confetti, and a rounded face.
 *
 * The wheel and the mascot are taken from that. They are good ideas and they
 * are not mine.
 *
 * ── What was NOT taken from it, and why ──────────────────────────────────
 *
 * Google's version also had a "Kids Club" sign-up with a nickname TEXT BOX in
 * it, a Render button that says "Video Rendered & Saved!" without rendering
 * anything, and COPPA and POPIA badges as decoration.
 *
 * The text box breaks the one rule this room is built on — a child typing
 * free text into a prompt that reaches a music model — and `check:kinderkleur`
 * fails the build on it. The fake Render button is a button that lies. And a
 * compliance badge is a claim: this app has real legal pages and they are
 * where a claim like that belongs, checked, not drawn on a child's wall.
 *
 * A good idea and a dangerous one arrive in the same paste. Taking the whole
 * thing because the look is right is how the look arrives with a text box in
 * it.
 */

/** What the mascot says. Fixed lines: nothing here calls a model. */
export const MASCOT_SAYS: readonly (readonly [string, string])[] = [
  ['Pick a thing and a sound, and I will sing it!', 'Kies \u2019n ding en \u2019n klank, dan sing ek dit!'],
  ['You are a rockstar. I can tell.', 'Jy is \u2019n rockstar. Ek kan sien.'],
  ['Spin the wheel if you cannot decide!', 'Draai die wiel as jy nie kan besluit nie!'],
  ['That one is going to be good.', 'Daai een gaan goed wees.'],
  ['Make one about your dog. Dogs love songs.', 'Maak een oor jou hond. Honde hou van liedjies.'],
  ['Ready when you are!', 'Reg wanneer jy is!'],
];

/**
 * Two choices made at random, for the wheel.
 *
 * `pick` is handed in rather than called here so the room can be driven with
 * a known sequence: a wheel that reaches for Math.random inside itself is a
 * wheel no check can ever land on a known answer.
 */
export function spin(
  topics: readonly { readonly id: string }[],
  sounds: readonly { readonly id: string }[],
  pick: () => number = Math.random,
): { readonly topic: string; readonly sound: string } {
  return {
    topic: topics[Math.min(topics.length - 1, Math.floor(pick() * topics.length))].id,
    sound: sounds[Math.min(sounds.length - 1, Math.floor(pick() * sounds.length))].id,
  };
}
