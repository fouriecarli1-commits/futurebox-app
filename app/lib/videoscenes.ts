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
  /**
   * What lands in the box. Edited, not sent as it is.
   *
   * Several per kind, because one is a template and several are inspiration —
   * and inspiration is what somebody staring at an empty box actually needs.
   * The desk shows one and offers the next, which is a smaller thing to build
   * than a gallery and a better thing to use than a wall of tiles.
   */
  readonly scaffolds: readonly string[];
  readonly aspect: '9:16' | '16:9' | '1:1';
  /**
   * Where the length picker starts for this kind. Not a limit — the grade
   * decides what is actually offered, and a scene that opens on a length its
   * engine cannot make is moved to the nearest one that exists.
   */
  readonly seconds: number;
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
    scaffolds: [
      'A lone figure walking away down a wet tar road at dusk, backlit by ' +
        'oncoming headlights. Slow dolly in, shallow depth of field. Low warm ' +
        'light, long shadows, dust in the beam. Still and a little sad.',
      'A hand trailing out of a moving car window, fields blurring past. ' +
        'Close shot, handheld, the horizon tilting. Hard golden light, lens ' +
        'flare across the frame. Free and slightly reckless.',
      'An empty dance floor after everyone has gone, one mirror ball still ' +
        'turning. Wide static shot, slow pan left. Cold blue with points of ' +
        'moving light. Quiet, and heavier than it looks.',
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    note: 'An advert with a line that is spoken',
    aspect: '16:9',
    seconds: 8,
    speaks: true,
    scaffolds: [
      'A young producer at a desk in a small home studio, turning to camera ' +
        'with a half smile. Medium shot, slow push in. Warm lamplight, ' +
        'monitors glowing behind her. Confident and unhurried.\n\n' +
        'She says, "I wrote this one on a Tuesday. It went out on Friday."',
      'A shop owner unlocking the front door at first light, turning the sign ' +
        'to open. Wide shot from the street, slow push in. Cold morning light ' +
        'warming as it lands. Ordinary and proud.\n\n' +
        'He says, "Twelve years. Same door, every morning."',
      'Two hands passing a coffee across a counter, steam rising. Close ' +
        'overhead, static. Soft window light from the left. Warm and unhurried.' +
        '\n\nA voice says, "Made this morning. Like every morning."',
    ],
  },
  {
    id: 'podcast',
    label: 'Podcast',
    note: 'A host talking, for a clip or a trailer',
    aspect: '16:9',
    seconds: 8,
    speaks: true,
    scaffolds: [
      'A host leaning into a studio microphone, headphones on, mid sentence. ' +
        'Close shot, static camera, shallow focus. Soft key light from one ' +
        'side, the room dark behind. Warm and conversational.\n\n' +
        'He says, "Welcome back. This week we are talking about the one thing ' +
        'nobody warns you about."',
      'Two people across a small table with microphones between them, one ' +
        'laughing. Medium two-shot, slight handheld. Warm practical lamps, ' +
        'dark corners. Easy and unrehearsed.\n\n' +
        'She says, "You are not going to believe how this one ended."',
    ],
  },
  {
    id: 'social',
    label: 'Reel',
    note: 'Vertical, made to stop a thumb',
    aspect: '9:16',
    seconds: 5,
    speaks: false,
    scaffolds: [
      'Hands on a battered acoustic guitar, close overhead shot, fingers ' +
        'moving fast. Handheld, slight sway. Hard afternoon light through a ' +
        'window, dust in the air. Urgent and alive.',
      'A pair of trainers hitting wet pavement, one stride after another. ' +
        'Low close shot tracking backwards. Streetlight orange on black water. ' +
        'Relentless.',
      'A spray can shaking, then the first line hitting a concrete wall. ' +
        'Close, handheld, following the arc. Hard midday sun, hard shadow. ' +
        'Sharp and quick.',
    ],
  },
  {
    id: 'product',
    label: 'Product',
    note: 'One object, lit properly',
    aspect: '1:1',
    seconds: 5,
    speaks: false,
    scaffolds: [
      'A pair of studio headphones on a dark stone surface, rotating slowly. ' +
        'Macro shot, rack focus across the earcup. One soft key from the left, ' +
        'deep shadow on the right. Clean and expensive.',
      'A glass bottle on wet slate, a drop running down the side. Close ' +
        'static shot, shallow focus. Backlit so the liquid glows. Cold and ' +
        'precise.',
      'A worn leather bag opening to show what is inside, hands out of frame. ' +
        'Overhead, slow push in. Warm side light picking out the grain. Solid ' +
        'and well used.',
    ],
  },
  {
    id: 'atmosphere',
    label: 'Atmosphere',
    note: 'A place, no people, endlessly cuttable',
    aspect: '16:9',
    seconds: 10,
    speaks: false,
    scaffolds: [
      'An empty Karoo road at first light, heat haze already rising off the ' +
        'tar. Wide static shot, horizon low in frame. Cold blue turning gold. ' +
        'Enormous and quiet.',
      'Rain running down a window with a city out of focus behind it. Close ' +
        'static shot, the focus shifting from glass to street. Neon bleeding ' +
        'through the water. Lonely and warm at once.',
      'Wind moving through long dry grass on a hillside, nothing else. Wide ' +
        'shot, slow drift right. Late sun raking across from the side. Patient.',
    ],
  },
];

/**
 * What a length is for.
 *
 * The desk used to offer five seconds and ten with nothing to choose between
 * them but the price, which makes the choice a guess. These say what each one
 * is actually good for, and the shelf a grade shows is filtered to what its
 * engine will really make — a length nobody can generate is not a choice, it
 * is a refusal waiting to happen.
 */
export const LENGTHS: readonly { seconds: number; label: string; note: string }[] = [
  { seconds: 4, label: '4s', note: 'A single beat. A logo sting, a cutaway.' },
  { seconds: 5, label: '5s', note: 'One shot, one idea. The cheapest way to test a prompt.' },
  { seconds: 6, label: '6s', note: 'Room for a short line to be spoken.' },
  { seconds: 8, label: '8s', note: 'A shot that can breathe — a push in, a turn to camera.' },
  { seconds: 10, label: '10s', note: 'A whole moment. Enough for a reel on its own.' },
  { seconds: 15, label: '15s', note: 'An advert. The length a social platform will run whole.' },
  { seconds: 20, label: '20s', note: 'Two or three beats in sequence.' },
  { seconds: 30, label: '30s', note: 'A full spot. Longest anything here makes in one go.' },
];

export function lengthNote(seconds: number): string {
  return LENGTHS.find((one) => one.seconds === seconds)?.note ?? '';
}

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

/* ---------------------------------------------------------------------------
 * Looks for a music video.
 *
 * The video desk has a `music` scene, and it is the right thing there: the desk
 * makes one clip of any kind, and "a shot to cut against a track" is one kind
 * among six. The music video room is not that. It is pointed at a song you
 * already made, it knows its length, and what somebody needs there is not a
 * shot — it is an approach to the whole thing.
 *
 * So these are approaches, not scenes: five ways a music video can go, each
 * with the shape and the length that way of working usually wants.
 *
 * **None of them speaks.** In this engine anything inside quotation marks is
 * spoken aloud, and a voice over a song is two things fighting. The scaffolds
 * are written without a quoted line anywhere, and the room says so, so nobody
 * puts a tagline in and wonders why the mix went wrong.
 * ------------------------------------------------------------------------ */

export interface MusicLook {
  readonly id: string;
  /** Two or three words on the chip. */
  readonly label: string;
  /** One line under it. */
  readonly note: string;
  /**
   * What lands in the box, edited rather than sent as-is. Two each, for the
   * same reason the desk carries several: one is a template, and two is a
   * suggestion that somebody staring at an empty box can argue with.
   */
  readonly scaffolds: readonly string[];
  /** Only the two the music video renderer knows. There is no square here. */
  readonly aspect: '9:16' | '16:9';
  readonly seconds: number;
}

export const MUSIC_LOOKS: readonly MusicLook[] = [
  {
    id: 'performance',
    label: 'Performance',
    note: 'Somebody playing it, straight to camera',
    aspect: '9:16',
    seconds: 15,
    scaffolds: [
      'A singer alone in a bare rehearsal room, mouthing along, eyes closed. ' +
        'Medium close, static camera, very slight handheld drift. One hard ' +
        'window light from the left, deep shadow on the other side. Nothing ' +
        'staged, like a rehearsal somebody filmed.',
      'A band mid-take in a small room crowded with cable and amps, seen from ' +
        'behind the drummer. Wide, low, slow push in. Warm practical lamps, ' +
        'no fill, haze in the air. Loose and unglamorous.',
    ],
  },
  {
    id: 'story',
    label: 'Story',
    note: 'A fragment of something happening',
    aspect: '16:9',
    seconds: 15,
    scaffolds: [
      'A young woman locks a front door, stands still for a second, and walks ' +
        'off down the street with a bag. Following shot from behind, steady, ' +
        'shallow focus. Flat early morning light, nothing dramatic. Ordinary, ' +
        'and final.',
      'Two people at opposite ends of a long kitchen table, neither looking up. ' +
        'Wide static shot, symmetrical. Grey daylight through one window, no ' +
        'lamps on. Still, and about to break.',
    ],
  },
  {
    id: 'road',
    label: 'On the move',
    note: 'Landscape going past',
    aspect: '16:9',
    seconds: 10,
    scaffolds: [
      'A dirt road unspooling through dry veld, shot from the back of a moving ' +
        'bakkie. Wide, low, the horizon jolting with the suspension. Hard ' +
        'afternoon sun, dust hanging in the light. Endless and a bit reckless.',
      'A train window at speed, fields and pylons smearing past, a faint ' +
        'reflection in the glass. Close, static on the glass, the world moving ' +
        'behind it. Overcast and cool. Suspended, going somewhere.',
    ],
  },
  {
    id: 'room',
    label: 'One room',
    note: 'A single place, held',
    aspect: '9:16',
    seconds: 10,
    scaffolds: [
      'An unmade bed in a small flat, late afternoon, clothes on the floor and ' +
        'a curtain moving. Static wide, no camera move at all. Low sun in a ' +
        'strip across the wall. Warm, private, slightly abandoned.',
      'A kitchen after a party — glasses everywhere, one tap dripping, the ' +
        'light still on. Slow pan right across the counter. Cold overhead ' +
        'fluorescent against the dark window. Quiet and tired.',
    ],
  },
  {
    id: 'abstract',
    label: 'No people',
    note: 'Colour, texture, motion',
    aspect: '9:16',
    seconds: 10,
    scaffolds: [
      'Ink dropped into water, blooming and folding in slow motion against ' +
        'black. Macro, static, extremely shallow focus. One hard side light, ' +
        'everything else dark. Weightless and a little ominous.',
      'Rain running down a window at night with a street behind it out of ' +
        'focus, headlights turning into moving discs of colour. Close, static, ' +
        'the glass sharp and the world soft. Cold blues cut with sodium orange.',
    ],
  },
];

export function musicLookById(id: string): MusicLook | undefined {
  return MUSIC_LOOKS.find((look) => look.id === id);
}
