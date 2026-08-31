/**
 * What somebody is actually trying to make, and a start on saying it.
 *
 * The video panel used to be one empty box. An empty box is fine for a person
 * who already knows how a video model wants to be spoken to, and it is a wall
 * for everybody else — which is nearly everybody, because the way these models
 * want to be spoken to is not obvious and is not the way people write.
 *
 * So: a desk with a few kinds of video on it, each of which fills the box with
 * a scaffold to edit rather than a blank to fill. A scaffold is not a template.
 * It is deliberately half-written and obviously wrong in places, so the first
 * instinct is to change it rather than to press go.
 *
 * ── The shape a prompt wants to be ───────────────────────────────────────
 *
 * Every scaffold here is built the same way, because this is what these models
 * read well and it is worth learning once:
 *
 *   subject → what it is doing → the shot → the light → the mood
 *
 * And the one rule that is not obvious at all: **anything in quotation marks
 * is spoken aloud**. That is how Kling's own console asks for it, and it is
 * how a line of dialogue, a tagline, or a podcast host's greeting gets into
 * the clip as audio rather than as an instruction the model tries to draw.
 * Every scaffold that has a voice in it shows this rather than explaining it.
 */

export type SceneId =
  | 'music'
  | 'marketing'
  | 'podcast'
  | 'social'
  | 'product'
  | 'atmosphere';

export interface Scene {
  readonly id: SceneId;
  /** Two or three words on the tile. */
  readonly label: string;
  /** One line under it, saying what it is for. */
  readonly note: string;
  /** What lands in the box. Edited, not sent as it is. */
  readonly scaffold: string;
  readonly aspect: '9:16' | '16:9' | '1:1';
  readonly seconds: 5 | 10;
  /** True where the scaffold has a spoken line, so the panel can say so. */
  readonly speaks: boolean;
}

export const SCENES: readonly Scene[] = [
  {
    id: 'music',
    label: 'Music video',
    note: 'A shot to cut against a track',
    aspect: '9:16',
    seconds: 5,
    speaks: false,
    scaffold:
      'A lone figure walking away down a wet tar road at dusk, backlit by ' +
      'oncoming headlights. Slow dolly in, shallow depth of field. Low warm ' +
      'light, long shadows, dust in the beam. Still and a little sad.',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    note: 'An advert with a line that is spoken',
    aspect: '16:9',
    seconds: 10,
    speaks: true,
    scaffold:
      'A young producer at a desk in a small home studio, turning to camera ' +
      'with a half smile. Medium shot, slow push in. Warm lamplight, monitors ' +
      'glowing behind her. Confident and unhurried.\n\n' +
      'She says, "I wrote this one on a Tuesday. It went out on Friday."',
  },
  {
    id: 'podcast',
    label: 'Podcast',
    note: 'A host talking, for a clip or a trailer',
    aspect: '16:9',
    seconds: 10,
    speaks: true,
    scaffold:
      'A host leaning into a studio microphone, headphones on, mid sentence. ' +
      'Close shot, static camera, shallow focus. Soft key light from one side, ' +
      'the room dark behind. Warm and conversational.\n\n' +
      'He says, "Welcome back. This week we are talking about the one thing ' +
      'nobody warns you about."',
  },
  {
    id: 'social',
    label: 'Reel',
    note: 'Vertical, made to stop a thumb',
    aspect: '9:16',
    seconds: 5,
    speaks: false,
    scaffold:
      'Hands on a battered acoustic guitar, close overhead shot, fingers ' +
      'moving fast. Handheld, slight sway. Hard afternoon light through a ' +
      'window, dust in the air. Urgent and alive.',
  },
  {
    id: 'product',
    label: 'Product',
    note: 'One object, lit properly',
    aspect: '1:1',
    seconds: 5,
    speaks: false,
    scaffold:
      'A pair of studio headphones on a dark stone surface, rotating slowly. ' +
      'Macro shot, rack focus across the earcup. One soft key from the left, ' +
      'deep shadow on the right. Clean and expensive.',
  },
  {
    id: 'atmosphere',
    label: 'Atmosphere',
    note: 'A place, no people, endlessly cuttable',
    aspect: '16:9',
    seconds: 10,
    speaks: false,
    scaffold:
      'An empty Karoo road at first light, heat haze already rising off the ' +
      'tar. Wide static shot, horizon low in frame. Cold blue turning gold. ' +
      'Enormous and quiet.',
  },
];

export function sceneById(id: string): Scene | undefined {
  return SCENES.find((one) => one.id === id);
}

/**
 * The lines that will be spoken, pulled out of a prompt.
 *
 * Used to show somebody what they have actually asked for before they spend a
 * credit on it, because quotation marks are easy to leave off and the mistake
 * is invisible until the clip comes back silent. Straight and curly quotes
 * both count: a phone keyboard produces curly ones and nobody should have to
 * know that.
 */
export function spokenLines(prompt: string): string[] {
  const found = prompt.match(/["“]([^"”]{2,300})["”]/g) ?? [];
  return found.map((one) => one.slice(1, -1).trim()).filter(Boolean);
}

/**
 * Whether a prompt looks like it is trying to speak without saying so.
 *
 * A prompt with `says`, `sings` or `shouts` and no quotation marks anywhere is
 * almost always somebody who meant to have a line spoken and wrote it as prose.
 * The model will try to *draw* that instead, and the clip comes back with a
 * person mouthing nothing. Worth one sentence of warning; not worth refusing.
 */
export function looksUnquoted(prompt: string): boolean {
  if (spokenLines(prompt).length > 0) return false;
  // Two patterns rather than one: `\b` is decided by \w, which does not
  // include ê, so a trailing boundary after "sê" never matches and the whole
  // Afrikaans half of the list would be dead. Bounded by whitespace instead.
  const english = /\b(says?|saying|sings?|singing|shouts?|whispers?|asks?|tells?|announces?)\b/i;
  const afrikaans = /(^|\s)(sê|sing|sings|skree|skreeu|fluister|vra|vertel|kondig)(\s|$|[,.:;!?])/i;
  return english.test(prompt) || afrikaans.test(prompt);
}
