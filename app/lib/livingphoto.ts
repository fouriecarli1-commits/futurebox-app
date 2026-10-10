/**
 * A photograph given a little motion, and nothing more.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026, reading Google's capability list: *"Ek hou nogal
 * van die funksie Image-to-Video: Transform static images into videos. Ek
 * wonder ook of google se modelle net bietjie motion kan gee aan foto's? Dit
 * kan baie van ons photo editing tools verbeter, en vir al ook vir foto's wat
 * vir bemarking gebruik word en social media."*
 *
 * Yes — and it needs no new engine. Veo has taken a start frame since the day
 * it was wired, and the whole trick is in the PROMPT: a photograph plus
 * "almost nothing moves" is a living photo, where the same photograph plus
 * "a woman walks into the room" is a new scene that happens to start from her
 * picture.
 *
 * ── Why it loops, which is the part that makes it usable ─────────────────
 *
 * A four-second clip that drifts away from the photograph and stops is a
 * clip. A four-second clip that comes back to where it began plays over and
 * over without a seam, which is what a living photo IS and what every
 * platform does with a short vertical video.
 *
 * That is only possible because of the closing frame added earlier the same
 * day: the photograph goes up as the opening frame AND as the closing one, so
 * the engine has to return to it. Without that it drifts and the loop jumps.
 *
 * ── Why the motions are a list and not a text box ────────────────────────
 *
 * Because the text box is already next door. The cutting room takes any
 * sentence and charges for whatever comes back; this is the opposite tool —
 * one press on a photograph she has already finished, with no writing. A list
 * of motions is what makes it one press.
 *
 * Every entry is written in the one way a video model reliably obeys: name
 * what moves, name what must NOT, and say how much. "Subtle" alone is
 * ignored; "the clouds drift slowly, everything else perfectly still" is not.
 *
 * ── And why the prompt says the same three things every time ─────────────
 *
 * `HOLD` is appended to all of them. A video model's instinct is to make
 * something happen — a camera move, a cut, a person entering — and on a
 * photograph that is the one thing that ruins it: the subject's face changes
 * and it stops being her photograph. So every prompt says, in the same words,
 * that the camera is locked and the subject is unchanged.
 */

export interface Motion {
  readonly id: string;
  /** The i18n key and the English. */
  readonly says: readonly [string, string];
  /** What it is for, in a few words, so the list is not twelve nouns. */
  readonly what: readonly [string, string];
  /** What goes in the prompt. English, because the engines are. */
  readonly words: string;
}

/**
 * Said on every one of them.
 *
 * The camera, the subject and the frame. Written once rather than into each
 * entry, so a thirteenth motion cannot forget it — which is exactly how one
 * of them would come back as a different person's face.
 */
export const HOLD = 'The camera does not move at all: no pan, no zoom, no tilt,'
  + ' locked off as if on a tripod. No cuts. Nobody enters or leaves. Every'
  + ' person keeps exactly the same face, hair, build, clothing and pose as in'
  + ' the photograph. The composition, the framing and the colours stay as they'
  + ' are. The motion is small and slow, and at the end of the clip everything'
  + ' has returned to where it started.';

/**
 * The motions.
 *
 * Ordered by how often somebody would reach for them rather than
 * alphabetically: the weather and the light first, because those are the ones
 * that work on almost any photograph; the specific ones after.
 */
export const MOTIONS: readonly Motion[] = [
  {
    id: 'clouds',
    says: ['live.clouds', 'Drifting clouds'],
    what: ['live.cloudsWhat', 'Any photograph with sky in it'],
    words: 'Only the clouds in the sky drift slowly across. The ground, the'
      + ' buildings, the people and the trees are perfectly still.',
  },
  {
    id: 'breeze',
    says: ['live.breeze', 'A breeze'],
    what: ['live.breezeWhat', 'Hair, leaves, grass, a curtain, washing on a line'],
    words: 'A gentle breeze moves only the soft things: loose hair, leaves,'
      + ' grass, fabric, a curtain. Everything solid is perfectly still.',
  },
  {
    id: 'light',
    says: ['live.light', 'Changing light'],
    what: ['live.lightWhat', 'A portrait or an interior, without moving anything'],
    words: 'Nothing in the scene moves. Only the light changes, very slowly, as'
      + ' if a cloud were passing in front of the sun: the shadows soften and'
      + ' deepen a little and then return.',
  },
  {
    id: 'water',
    says: ['live.water', 'Rippling water'],
    what: ['live.waterWhat', 'The sea, a pool, a river, a puddle'],
    words: 'Only the surface of the water ripples and catches the light, with'
      + ' small natural waves. Everything out of the water is perfectly still.',
  },
  {
    id: 'rain',
    says: ['live.rain', 'Falling rain'],
    what: ['live.rainWhat', 'Any outdoor photograph, with or without clouds'],
    words: 'Fine rain falls steadily through the frame, with faint ripples'
      + ' where it lands. Nothing else in the scene moves.',
  },
  {
    id: 'steam',
    says: ['live.steam', 'Rising steam'],
    what: ['live.steamWhat', 'Coffee, a plate of food, a braai, a kettle'],
    words: 'Thin steam rises and curls slowly from the hot food or drink and'
      + ' fades. Everything else, including the hands and the table, is'
      + ' perfectly still.',
  },
  {
    id: 'fire',
    says: ['live.fire', 'Flickering flame'],
    what: ['live.fireWhat', 'A candle, a braai, a fireplace, a lamp'],
    words: 'The flame flickers gently and its light moves a little on the'
      + ' nearby surfaces. Nothing else in the scene moves.',
  },
  {
    id: 'blink',
    says: ['live.blink', 'A breath and a blink'],
    what: ['live.blinkWhat', 'A portrait — the smallest motion there is'],
    words: 'The person blinks once, naturally, and breathes very slightly.'
      + ' Their expression, their head position and everything else in the'
      + ' frame stay exactly as they are.',
  },
  {
    id: 'traffic',
    says: ['live.traffic', 'A street going by'],
    what: ['live.trafficWhat', 'A street, a shopfront, a city view'],
    words: 'Distant traffic and distant people move past in the background at'
      + ' a natural pace. Everything in the foreground is perfectly still.',
  },
  {
    id: 'neon',
    says: ['live.neon', 'Flickering sign'],
    what: ['live.neonWhat', 'A sign, a screen, a string of lights, a shopfront'],
    words: 'Only the lights change: the sign or the string of lights flickers'
      + ' and pulses gently. Nothing physical in the scene moves.',
  },
  {
    id: 'dust',
    says: ['live.dust', 'Dust in the light'],
    what: ['live.dustWhat', 'A sunbeam, a window, a workshop, a warm interior'],
    words: 'Fine dust drifts slowly through the shaft of light. Nothing else'
      + ' in the scene moves at all.',
  },
  {
    id: 'cloth',
    says: ['live.cloth', 'Moving fabric'],
    what: ['live.clothWhat', 'A product shot — a dress, a flag, a tablecloth'],
    words: 'Only the fabric moves, settling and lifting very slightly as if in'
      + ' still air. The person or object wearing or holding it does not move.',
  },
];

export const MOTION_DEFAULT = 'breeze';

export const motionById = (id: string): Motion | undefined =>
  MOTIONS.find((one) => one.id === id);

/**
 * The whole prompt for one motion.
 *
 * The motion first and `HOLD` after it, because the thing being asked for
 * should be the first thing read and the restrictions qualify it. The other
 * order reads as a list of prohibitions with an afterthought.
 *
 * An unknown id falls back to the default rather than returning nothing: the
 * credit is taken before the engine is called, so this cannot be the thing
 * that makes a paid press do nothing.
 */
export function motionWords(id: string): string {
  const one = motionById(id) ?? motionById(MOTION_DEFAULT)!;
  return `${one.words} ${HOLD}`;
}

/**
 * How long a living photo runs.
 *
 * The shortest Veo makes. Deliberately: this is priced by the second, the
 * motion is meant to be small, and a longer clip gives the engine more room
 * to drift away from the photograph — which is the one way the whole thing
 * fails. It loops, so four seconds plays as long as anybody watches.
 */
export const LIVE_SECONDS = 4;
