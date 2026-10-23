/**
 * The characters people stand behind in the live jam room.
 *
 * ── What the owner asked for ─────────────────────────────────────────────
 *
 * The owner, 22 October 2026: *"Daar moet templates wees van animated
 * characters dat iemand heeltemal agter templates skuil."* Somebody in the
 * jam room never shows a face. They pick a character and a colour, and that
 * character is all the room ever sees of them: it breathes and blinks on its
 * own, moves to the loudness of what they are playing, and jumps when they
 * drop a loop.
 *
 * ── What travels, and what does not ──────────────────────────────────────
 *
 * A look is two words from two fixed lists — a character id and a colour id
 * — and nothing else. No picture, no camera frame, no free text: whatever
 * arrives from the room is read through `cleanLook`, and anything that is not
 * on the lists becomes the default rather than being drawn. The loudness that
 * makes somebody's character move travels as one small whole number
 * (`cleanPulse`), so a message that is not one cannot put anything on a
 * screen.
 *
 * Pure apart from the two storage helpers, which only ever touch this
 * device's own choice — `check:jamcharacters` reads all of it.
 */

export const CHARACTERS = [
  'robot', 'astronaut', 'fox', 'cat', 'alien', 'panda',
  'ghost', 'dragon', 'skeleton', 'cube', 'mushroom', 'owl',
] as const;
export type Character = (typeof CHARACTERS)[number];

/** Each character's name on screen: an i18n key and its English fallback. */
export const CHARACTER_WORDS: Readonly<Record<Character, { key: string; fallback: string }>> = {
  robot: { key: 'jam.charRobot', fallback: 'Robot' },
  astronaut: { key: 'jam.charAstronaut', fallback: 'Astronaut' },
  fox: { key: 'jam.charFox', fallback: 'Fox' },
  cat: { key: 'jam.charCat', fallback: 'Cat' },
  alien: { key: 'jam.charAlien', fallback: 'Alien' },
  panda: { key: 'jam.charPanda', fallback: 'DJ panda' },
  ghost: { key: 'jam.charGhost', fallback: 'Ghost' },
  dragon: { key: 'jam.charDragon', fallback: 'Dragon' },
  skeleton: { key: 'jam.charSkeleton', fallback: 'Skeleton rocker' },
  cube: { key: 'jam.charCube', fallback: 'Neon cube' },
  mushroom: { key: 'jam.charMushroom', fallback: 'Mushroom' },
  owl: { key: 'jam.charOwl', fallback: 'Owl' },
};

/**
 * The colours a character can wear: the app's own neon, each bright enough
 * to glow on the near-black stage.
 */
export const COLOURS = {
  mint: '#34d399',
  cyan: '#22d3ee',
  violet: '#a78bfa',
  pink: '#f472b6',
  amber: '#fbbf24',
  lime: '#a3e635',
  coral: '#fb7185',
  sky: '#60a5fa',
} as const;
export type Colour = keyof typeof COLOURS;
export const COLOUR_IDS = Object.keys(COLOURS) as Colour[];

/** Each colour's name, for the swatch's label. */
export const COLOUR_WORDS: Readonly<Record<Colour, { key: string; fallback: string }>> = {
  mint: { key: 'jam.colMint', fallback: 'Mint' },
  cyan: { key: 'jam.colCyan', fallback: 'Cyan' },
  violet: { key: 'jam.colViolet', fallback: 'Violet' },
  pink: { key: 'jam.colPink', fallback: 'Pink' },
  amber: { key: 'jam.colAmber', fallback: 'Amber' },
  lime: { key: 'jam.colLime', fallback: 'Lime' },
  coral: { key: 'jam.colCoral', fallback: 'Coral' },
  sky: { key: 'jam.colSky', fallback: 'Sky' },
};

export interface Look {
  readonly character: Character;
  readonly colour: Colour;
}

export const DEFAULT_LOOK: Look = { character: 'robot', colour: 'mint' };

/**
 * A look as it arrives — from this device's storage or from somebody else in
 * the room — made into one that can be drawn. Each half is checked on its
 * own, so a known character in an unknown colour keeps its character.
 */
export function cleanLook(raw: unknown): Look {
  const one = (raw && typeof raw === 'object' ? raw : {}) as { character?: unknown; colour?: unknown };
  const character = (CHARACTERS as readonly string[]).includes(String(one.character))
    ? (one.character as Character)
    : DEFAULT_LOOK.character;
  const colour = Object.prototype.hasOwnProperty.call(COLOURS, String(one.colour))
    ? (one.colour as Colour)
    : DEFAULT_LOOK.colour;
  return { character, colour };
}

/** Where this device keeps its own choice. Only the choice: two short words. */
export const LOOK_KEY = 'fb.jam.look';

/**
 * The look this device chose last time, or the default. Storage can be
 * missing or refuse (a private window), which is the default too.
 */
export function readLook(): Look {
  try {
    return cleanLook(JSON.parse(window.localStorage.getItem(LOOK_KEY) ?? 'null'));
  } catch {
    return DEFAULT_LOOK;
  }
}

export function saveLook(look: Look): void {
  try {
    window.localStorage.setItem(LOOK_KEY, JSON.stringify(cleanLook(look)));
  } catch {
    /* A device that will not keep it asks again next time. Nothing to say. */
  }
}

/* ── Loudness ─────────────────────────────────────────────────────────── */

/**
 * How loud a block of sound is, from an AnalyserNode's time-domain bytes
 * (128 is silence): the root mean square, 0 to 1.
 */
export function rmsOf(bytes: ArrayLike<number>): number {
  if (!bytes.length) return 0;
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    const v = (bytes[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / bytes.length);
}

/**
 * Loudness as a character shows it, 0 to 1. A kick at full tilt is about
 * 0.3 RMS and a voice close to a phone's microphone about 0.1, so the curve
 * lifts the quiet end — a hum still moves the mouth — and anything under the
 * room's own hiss is still.
 */
export function toLevel(rms: number): number {
  if (!Number.isFinite(rms) || rms <= 0.006) return 0;
  return Math.min(1, Math.sqrt((rms - 0.006) / 0.3));
}

/**
 * One step of the motion: quick to rise, slow to fall, so a hit snaps the
 * character up and it settles back rather than flickering.
 */
export function follow(shown: number, heard: number): number {
  const rate = heard > shown ? 0.6 : 0.12;
  const next = shown + (heard - shown) * rate;
  return next < 0.004 ? 0 : next;
}

/** The most steps a level is sent in. Ten is plenty for a bob and a glow. */
export const PULSE_STEPS = 9;

/** A level, as the whole number that is sent to the room. */
export function toPulse(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.min(PULSE_STEPS, Math.round(level * PULSE_STEPS)));
}

/** A tag: which tile in the room a pulse belongs to. Random, per visit. */
export const TAG = /^[a-f0-9]{16}$/;

export function newTag(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * A pulse as it arrives from the room, or nothing. A level is a whole number
 * from nought to `PULSE_STEPS`; a drop is `d: 1`. Anything else — text, a
 * tag that is not one, a number out of range — is dropped rather than drawn.
 */
export function cleanPulse(raw: unknown): { tag: string; level: number | null; drop: boolean } | null {
  if (!raw || typeof raw !== 'object') return null;
  const one = raw as { t?: unknown; l?: unknown; d?: unknown };
  if (typeof one.t !== 'string' || !TAG.test(one.t)) return null;
  const drop = one.d === 1;
  const level = typeof one.l === 'number' && Number.isInteger(one.l) && one.l >= 0 && one.l <= PULSE_STEPS
    ? one.l / PULSE_STEPS
    : null;
  if (level === null && !drop) return null;
  return { tag: one.t, level, drop };
}

/* ── The room's stage ─────────────────────────────────────────────────── */

/** Somebody else on the stage, as `/api/live/jammers` answers. */
export interface Jammer {
  readonly who: string;
  readonly name: string;
  readonly look: Look;
  readonly tag: string;
  /** Looping now, and at what tempo: their character moves on that beat. */
  readonly looping: boolean;
  readonly bpm: number | null;
}

/** A tempo a character may move to, or nothing. */
export function cleanBpm(raw: unknown): number | null {
  const bpm = Number(raw);
  return Number.isInteger(bpm) && bpm >= 40 && bpm <= 240 ? bpm : null;
}
