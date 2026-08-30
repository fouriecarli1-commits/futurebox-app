/**
 * What actually gets sent to ElevenLabs to make a song.
 *
 * Lifted out of the route so it can be run and checked on its own. A pure
 * function living inside a route handler is a pure function nobody can test,
 * and the mapping it does — our words to their field names, and a trained
 * sound to `finetune_id` — is exactly the part worth having a test for.
 *
 * Nothing here decides what anybody is allowed to ask for. The route does
 * that, before this is called, and strips anything the caller may not have.
 */

/**
 * music_v1 is marked deprecated in ElevenLabs' own SDK. v2 is current, and it
 * takes a different plan: a flat list of chunks, each with its own text, length
 * and styles, rather than v1's sections under a global style. The field names
 * below come from the SDK's serialisers, not from memory.
 */
const MODEL_ID = 'music_v2';

/** ElevenLabs' own bounds. Sending outside them is a 422, so clamp first. */
const MIN_MS = 3_000;
const MAX_MS = 600_000;
const SECTION_MIN_MS = 3_000;
const SECTION_MAX_MS = 120_000;
const MAX_LINES_PER_SECTION = 30;
const MAX_LINE_CHARS = 200;

export interface MusicSection {
  name: string;
  lines: string[];
  seconds: number;
}

export interface Body {
  /** What it should sound like. Free text, and the styles are derived from it. */
  style?: string;
  /** Sung lyrics, split into sections. Empty means an instrumental. */
  sections?: MusicSection[];
  /** Used when there are no sections: a single prompt for the whole track. */
  prompt?: string;
  seconds?: number;
  instrumental?: boolean;
  /**
   * A sound of the caller's own, trained on their own songs.
   *
   * Never trusted as sent: the id is checked against the finetunes table
   * before it goes anywhere near ElevenLabs. The account behind the app is one
   * account, so an unchecked id here would let anybody generate in anybody
   * else's trained sound just by knowing the string.
   */
  finetuneId?: string;
}

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, Math.round(value)));

/**
 * A section's lyrics, trimmed to what the API accepts. Over-long lines are cut
 * rather than dropped: losing the tail of one line beats losing the verse.
 */
function toLines(lines: string[]): string[] {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES_PER_SECTION)
    .map((line) => (line.length > MAX_LINE_CHARS ? line.slice(0, MAX_LINE_CHARS) : line));
}

/** Style text becomes the list of directions the model reads. */
function toStyles(style: string): string[] {
  return style
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * The request body. With sections we send a composition plan, which is the only
 * way to say which words belong to which part of the song. Without them we send
 * a plain prompt and let the model decide the shape.
 */
export function buildRequest(body: Body): Record<string, unknown> {
  const styles = toStyles(body.style ?? '');
  const sections = (body.sections ?? [])
    .map((section) => ({ ...section, lines: toLines(section.lines ?? []) }))
    .filter((section) => section.lines.length > 0);

  if (sections.length > 0) {
    // A backing track to sing over is still a structured song: same sections,
    // same lengths, no voice. Dropping to the plain-prompt path would have lost
    // the section timing, and that timing is what lets the words follow the
    // music on the way back.
    const wordless = Boolean(body.instrumental);
    const leading = wordless ? ['instrumental', 'no vocals'].concat(styles) : styles;
    const against = wordless
      ? ['vocals', 'singing', 'spoken word', 'muddy mix', 'distorted']
      : ['muddy mix', 'distorted', 'off-key vocal'];

    return {
      model_id: MODEL_ID,
      ...(body.finetuneId ? { finetune_id: body.finetuneId } : {}),
      composition_plan: {
        chunks: sections.map((section, index) => ({
          // The section name in square brackets is how v2 is told what this
          // part of the song is; the lines follow it, one per line — unless
          // nobody is singing them, in which case the name is the whole text.
          text: wordless ? `[${section.name}]` : `[${section.name}]\n${section.lines.join('\n')}`,
          duration_ms: clamp((section.seconds || 20) * 1000, SECTION_MIN_MS, SECTION_MAX_MS),
          // The first chunk's styles set the whole song, so it carries the full
          // list and later chunks carry a shorter one. That is the SDK's own
          // advice, and it is why these are not simply the same array copied.
          positive_styles: index === 0 ? withDefaults(leading) : leading.slice(0, 6),
          negative_styles: index === 0 ? against : [],
        })),
      },
    };
  }

  const prompt = [body.prompt, body.style].filter(Boolean).join('. ').trim();
  return {
    model_id: MODEL_ID,
    ...(body.finetuneId ? { finetune_id: body.finetuneId } : {}),
    prompt: prompt || 'An instrumental track with a clear groove and a memorable hook.',
    music_length_ms: clamp((body.seconds || 60) * 1000, MIN_MS, MAX_MS),
    force_instrumental: Boolean(body.instrumental),
  };
}

/**
 * The first chunk wants six or seven styles before the direction is settled,
 * so a request carrying two gets padded rather than under-specified.
 */
function withDefaults(styles: string[]): string[] {
  const base = styles.length ? styles.slice() : ['modern production', 'clear vocal'];
  // Enough of these to reach seven from a two-word style. Deliberately generic:
  // they describe how it should be made, not what it should sound like, so they
  // never argue with whatever the person actually asked for.
  const padding = [
    'great production quality',
    'balanced mix',
    'clear vocal',
    'warm analogue character',
    'tight low end',
    'natural stereo width',
    'dynamic performance',
  ];
  padding.forEach((extra) => {
    if (base.length < 7 && base.indexOf(extra) === -1) base.push(extra);
  });
  return base;
}
