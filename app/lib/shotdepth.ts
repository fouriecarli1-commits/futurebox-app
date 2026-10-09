/**
 * Is there enough in this shot for an engine to make a sensible video?
 *
 * ── What she asked, twice ────────────────────────────────────────────────
 *
 * Carli, 11 September 2026: *"CoPilot moet net baie meer descriptive wees
 * wanneer video shots geskryf word."* And again, 9 October 2026: *"Die video
 * studio se ai is baie kort af. Dit moet baie descriptive wees en daardie ai
 * moet weet wat verwag word, om genoeg beskrywing te gee sodat 'n ai 'n
 * sinvolle video kan maak."*
 *
 * The same complaint a month apart, which means the first fix was the wrong
 * shape. It was a longer instruction — `set_prompt` in `lib/surfaces.ts` now
 * names the subject, the setting, the light, the camera, the lens and the
 * mood, and asks for three or four sentences. The shots stayed short.
 *
 * ── Why asking harder could not have worked ──────────────────────────────
 *
 * Three reasons, and none of them is about how the instruction is worded.
 *
 * **One.** `write_scenes` — the operation that actually fills the board —
 * said *"one shot per line"*, while `set_prompt` asked for *"three or four
 * sentences"*. Those two cannot both be obeyed. A model resolving the
 * contradiction keeps the format rule, because the format rule is the one
 * that looks like it will break something, and a shot squeezed into a line
 * is a clause.
 *
 * **Two.** `shotsFrom` split on `\n`, so the format rule was real: a shot
 * could not be a paragraph even if the model wrote one. It would have become
 * four shots.
 *
 * **Three.** The desk accepted a shot of **twelve characters**. "A dog runs"
 * is eleven. So nothing anywhere in the room ever told anybody — the copilot
 * or her — that what they had written was not enough to make a video from,
 * and a thin shot went to the engine, which invented the other ninety per
 * cent.
 *
 * This file is the third one. It is the floor, and it is shared on purpose:
 * the desk refuses below it, the copilot is told what it is, and
 * `check:skootdiepte` asserts that the example in the copilot's own
 * instructions clears it — because an instruction whose example is thin
 * teaches thinness, whatever the sentences around it ask for.
 *
 * ── Why a floor and a fullness, not one number ───────────────────────────
 *
 * Refusing everything that is not perfect would be a room that will not make
 * a video. So there are two readings: `enough`, below which the desk does not
 * spend somebody's money, and `full`, below which it says what is missing and
 * makes it anyway if asked. The difference matters because her own typing is
 * measured by the same rule, and she is allowed to know better than it.
 */

/** Below this, the desk does not send it. Twelve characters was the old floor. */
export const SHOT_MIN_WORDS = 25;

/** At or above this, with the four things named, nothing is missing. */
export const SHOT_FULL_WORDS = 45;

/**
 * The four things a video engine fills in itself when they are absent, and
 * the words that count as naming each.
 *
 * Deliberately generous lists. The question is not whether the writing is
 * good, it is whether the shot says anything at all about the camera — and a
 * check that demands a particular vocabulary is a check that fails good
 * prose.
 */
export const NAMES = {
  camera: [
    'camera', 'shot', 'close', 'wide', 'mid', 'push', 'pull', 'pan', 'tilt',
    'track', 'dolly', 'crane', 'handheld', 'static', 'follows', 'zoom',
    'angle', 'overhead', 'aerial', 'frame', 'framing', 'lens', 'mm',
  ],
  light: [
    'light', 'lit', 'sun', 'sunlight', 'sunset', 'sunrise', 'dawn', 'dusk',
    'golden', 'shadow', 'shade', 'bright', 'dark', 'dim', 'neon', 'lamp',
    'candle', 'moonlight', 'backlit', 'silhouette', 'overcast', 'night',
    'morning', 'afternoon', 'evening', 'daylight',
  ],
  setting: [
    'room', 'street', 'field', 'beach', 'kitchen', 'studio', 'stage', 'car',
    'forest', 'city', 'desert', 'mountain', 'river', 'sea', 'indoors',
    'outdoors', 'inside', 'outside', 'window', 'door', 'wall', 'floor',
    'table', 'bed', 'garden', 'road', 'bar', 'club', 'church', 'hall',
    'rooftop', 'alley', 'bridge', 'station', 'shop', 'office', 'home',
  ],
  mood: [
    'mood', 'calm', 'quiet', 'tense', 'warm', 'cold', 'lonely', 'joyful',
    'happy', 'sad', 'hopeful', 'uneasy', 'gentle', 'urgent', 'still',
    'triumphant', 'wistful', 'playful', 'serious', 'tender', 'raw',
    'dreamlike', 'nostalgic', 'intimate', 'epic',
  ],
} as const;

export type ShotPart = keyof typeof NAMES;

/** The four, in the order the desk says them. */
export const PARTS: readonly ShotPart[] = ['camera', 'light', 'setting', 'mood'];

export interface Depth {
  readonly words: number;
  /** Which of the four the shot names. */
  readonly names: Readonly<Record<ShotPart, boolean>>;
  /** Enough to spend money on. */
  readonly enough: boolean;
  /** Nothing an engine has to invent. */
  readonly full: boolean;
  /** Which of the four are absent, for the room to say out loud. */
  readonly missing: readonly ShotPart[];
}

/* Words, not characters. "A dog runs" and "aaaaaaaaaaaa" are the same twelve
   characters and only one of them is a shot, which is why the old floor let
   everything through. */
const wordsIn = (text: string): string[] =>
  text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export function depthOf(prompt: string): Depth {
  const words = wordsIn(prompt);
  /* A set, so a shot that says "camera" eight times does not count eight
     times — which is the shape a model falls into when a check it cannot see
     is counting keywords. */
  const said = new Set(words);
  const names = Object.fromEntries(
    PARTS.map((part) => [part, NAMES[part].some((one) => said.has(one))]),
  ) as Record<ShotPart, boolean>;
  const missing = PARTS.filter((part) => !names[part]);
  return {
    words: words.length,
    names,
    enough: words.length >= SHOT_MIN_WORDS,
    full: words.length >= SHOT_FULL_WORDS && missing.length === 0,
    missing,
  };
}

/**
 * A worked example of one shot, as the copilot is shown it.
 *
 * Exported rather than written into the instruction, because
 * `check:skootdiepte` runs `depthOf` over this exact string and fails if it
 * does not clear `full`. That is the assertion that matters most in this
 * whole piece: an instruction can ask for detail in any number of words and
 * a model will copy the EXAMPLE. The previous instruction's example was
 * *"as you would tell a camera operator"*, which is a register rather than a
 * shot, and the shots that came back were registers too.
 *
 * It carries a quoted line because the desk's whole speech convention hangs
 * off quotation marks — see `check:shotwords`, which has that half.
 */
export const SHOT_EXAMPLE = 'A woman in her fifties stands at a kitchen window '
  + 'in the last of the afternoon light, holding a cold cup of coffee she has '
  + 'forgotten about. The camera is a slow push in from a mid shot to a close '
  + 'one, ending just off her eyeline. Outside the window the street is '
  + 'overcast and empty. The mood is quiet and a little lonely, warm colours '
  + 'against grey glass. She says “ek gaan nie terug nie”, barely '
  + 'above a whisper.';

/**
 * What the desk says when a shot is too thin to send.
 *
 * Written here rather than in the room so the copilot can be told the same
 * sentence, and so there is one place the number lives. The room passes its
 * own translator in, which is why this takes one.
 */
export function thinSays(
  depth: Depth,
  t: (key: string, fallback: string) => string,
): string {
  return `${t(
    'board.tooThin',
    'There is not enough in that shot to make a video from — the engine would invent most of it.',
  )} ${t('board.tooThinSay', 'Say who is in it and what they are doing, where it is, what the light is like, and what the camera does.')}`
    + ` (${depth.words}/${SHOT_MIN_WORDS} ${t('board.words', 'words')})`;
}
