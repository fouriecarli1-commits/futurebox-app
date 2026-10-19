/**
 * The kids room's story engine: a picture book written from a child's four
 * choices, for voices and pictures.
 *
 * The owner, 19 October 2026: *"Die story mode moet 'n ander AI engine
 * gebruik … storie generasie moet meer motion en meer visual wees. Dit moet
 * regtig 'n kind se breim tickle."* The Story Maker filled four fixed
 * paragraphs with the names of what was chosen. Now a model writes a real
 * story from the same choices — a hero with a want, a problem, a turn, an
 * ending that lands — with characters who speak in voices of their own, a
 * scene for every page to be drawn from, and a question on every page.
 *
 * The child chooses from cards, and may say an idea of their own into the
 * voice box. The cards travel as ids and are turned into words here, from
 * the same table the cards are drawn from; the said idea is screened as a
 * reading would be (`guard`) before the model sees it.
 *
 * Writing is not charged, like the story helper beside it: the credits are
 * spent on the pictures and the reading, which are charged where they are
 * made, from the kids room's allowance. Braked, so a child cannot make a
 * hundred.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { AFRIKAANS_RULE } from '@/app/lib/server/afrikaans';
import { DISCRETION_RULE } from '@/app/lib/server/discretion';
import { aiFault } from '@/app/lib/server/aifault';
import { cachedSystem, notecache } from '@/app/lib/server/aicache';
import { tooMany } from '@/app/lib/server/brake';
import { copilotAvailable } from '@/app/lib/server/aikey';
import { callerFrom, metered } from '@/app/lib/server/account';
import { guard } from '@/app/lib/server/safety';
import { STORY_SECTIONS, VISUAL_STYLES } from '@/app/lib/kidsstoryboard';
import { KID_VOICES, kidVoice, type KidVoiceId } from '@/app/lib/kidsvoices';
import { ENGINE_PAGES, MOTIONS, PAGE_MOST_CHARS, SPARKLES, cleanStory } from '@/app/lib/kidstory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

/** The longest idea a child can say: a few sentences. */
const IDEA_MOST = 300;

const VOICE_IDS = KID_VOICES.map((one) => one.id) as [KidVoiceId, ...KidVoiceId[]];

const BookSchema = z.object({
  title: z.string().describe('A short, fun title in the story’s language.'),
  cast: z.array(z.object({
    name: z.string().describe('The character’s name, in the story’s language.'),
    voice: z.enum(VOICE_IDS).describe('Which character voice speaks for them.'),
    looks: z.string().describe('In English: how they look, specific enough to draw the same on every page — species, colours, clothes, one special detail.'),
  })),
  pages: z.array(z.object({
    lines: z.array(z.object({
      who: z.enum(VOICE_IDS).describe('The storyteller’s voice for narration, or the speaking character’s voice.'),
      name: z.string().describe('The speaking character’s name, or empty for narration.'),
      text: z.string().describe('What is said, in the story’s language, with an optional performance tag such as [giggles].'),
    })),
    scene: z.string().describe('In English: exactly what the picture for this page shows — who, doing what, where, and the things to spot.'),
    motion: z.enum(MOTIONS).describe('How the camera moves over the picture.'),
    sparkle: z.enum(SPARKLES).describe('What floats over the picture.'),
    wonder: z.string().describe('One short question for the child, in the story’s language.'),
  })),
});

const SYSTEM = [
  'You write picture books for children aged three to eight, read aloud by a storyteller with the characters in voices of their own, a picture on every page.',
  '',
  'What makes these books good:',
  '- A hero who wants something, a problem in the way, a surprising turn, and an ending that solves it in a satisfying way. No moral spelled out.',
  '- Written for the ear: short sentences, sound words a child will shout along with (WHOOSH! Splish-splash!), and one little refrain that comes back on several pages.',
  '- The characters talk to each other. Most pages have at least one line said by a character, and the voices take turns like a conversation.',
  '- Every page is a picture: say what is in the scene. Bright places, funny details, things to find.',
  '- Keep the same characters, names and looks from the first page to the last.',
  '- Warm and safe: a little suspense is fine, nothing frightening, cruel or sad that a parent would skip. No real people, no characters somebody else owns, no brand names.',
  '',
  'Brain-ticklers. Every page ends with a `wonder` question, and they vary:',
  '- Spot it: "Can you find the little blue snail?" The thing must be in that page’s scene.',
  '- Count it: "How many stars can you count?" Put that exact number in the scene.',
  '- Guess it: "What do you think is inside the box?"',
  '- Feel it: "How would you feel if you could fly?"',
  '- Do it: "Can you roar like a dinosaur?"',
  'Never the same kind twice in a row. The last page asks something about the whole story.',
  '',
  'Voices:',
  '- Narration uses the storyteller’s voice, with `name` empty.',
  '- Give each speaking character a different voice from the character voices, never the storyteller’s, and put them in `cast` with that voice.',
  '- You may add one performance tag to a line where it helps, from: [giggles], [laughs], [whispers], [gasps], [excited], [sighs], [cheerfully], [softly], [shouts]. Never more than one a line.',
  `- All the lines on one page together stay under ${PAGE_MOST_CHARS - 40} characters, so a page is read in about twenty seconds.`,
  '',
  'Pictures:',
  '- `scene` and `looks` are always in English, whatever language the story is in, because they go to the illustrator.',
  '- Vary `motion` from page to page; choose `sparkle` to suit the page (fireflies at night, bubbles under the sea, confetti at a party).',
  '',
  'Language: write the title, names, lines and wonder questions in the language you are asked for. Afrikaans is written as a South African would say it to a child.',
  `${AFRIKAANS_RULE}`,
  `${DISCRETION_RULE}`,
].join('\n');

interface Body {
  hero?: string;
  setting?: string;
  twist?: string;
  ending?: string;
  visual?: string;
  storyteller?: string;
  /** What the child said into the voice box, if anything. */
  idea?: string;
  lang?: string;
}

/** A choice id as the English words the card stands for, or null if no card says it. */
function chosen(section: number, id: unknown): string | null {
  const card = STORY_SECTIONS[section]?.choices.find((one) => one.id === id);
  return card ? `${card.title[1]} — ${card.blurb[1]} (${card.visualScene})` : null;
}

const LIMITS = { perMinute: 3, perHour: 20 };

export async function POST(request: Request): Promise<Response> {
  if (tooMany('kids-story', request, LIMITS)) {
    return Response.json(
      { error: 'rate_limited', message: 'That is a lot of stories at once. Read this one first!' },
      { status: 429 },
    );
  }
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'Send JSON.' }, { status: 400 });
  }

  const hero = chosen(0, body.hero);
  const setting = chosen(1, body.setting);
  const twist = chosen(2, body.twist);
  const ending = chosen(3, body.ending);
  const style = VISUAL_STYLES.find((one) => one.id === body.visual) ?? VISUAL_STYLES[0];
  const teller = kidVoice(body.storyteller);
  if (!hero || !setting || !twist || !ending || !teller?.storyteller) {
    return Response.json({ error: 'unknown_choice', message: 'Pick a card in every step first.' }, { status: 400 });
  }

  /* ── The child's own idea, said aloud ────────────────────────────────
     The owner, 19 October 2026: "Ek sien die story maker het nie 'n ai
     voice box vir kinders om self te prompt nie." Said, not typed, and
     screened like any reading before the model sees a word of it. */
  const idea = String(body.idea ?? '').replace(/\s+/g, ' ').trim().slice(0, IDEA_MOST);
  if (idea) {
    const caller = metered() ? await callerFrom(request) : null;
    const allowed = await guard(request, idea, 'speech', caller);
    if (!allowed.ok) return allowed.response;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'no_key', message: 'The story engine is not switched on, so the Story Maker writes this one itself.' },
      { status: 503 },
    );
  }

  const af = body.lang === 'af';
  const voices = KID_VOICES
    .map((one) => `- ${one.id}: ${one.name[1]}, ${one.about[1].toLowerCase()}${one.id === teller.id ? ' (THE STORYTELLER)' : ''}`)
    .join('\n');
  const ask = [
    `Write a ${ENGINE_PAGES}-page picture book in ${af ? 'Afrikaans' : 'English'}.`,
    '',
    `The hero: ${hero}`,
    `Where it happens: ${setting}`,
    `The surprise: ${twist}`,
    `How it ends: ${ending}`,
    `The pictures are drawn as: ${style.stylePrompt}`,
    ...(idea ? ['', `The child said their own idea out loud. Build the story around it, with the cards above as the frame, and leave out anything in it that would not belong in a picture book: "${idea}"`] : []),
    '',
    `The storyteller is "${teller.id}". The voices:`,
    voices,
  ].join('\n');

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 8000,
      system: cachedSystem(SYSTEM),
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low', format: zodOutputFormat(BookSchema) },
      messages: [{ role: 'user', content: ask }],
    });
    await notecache('kids-story', response.usage);

    if (response.stop_reason === 'refusal') {
      return Response.json({ error: 'refused', message: 'The story engine would not write that one. Try other cards.' }, { status: 422 });
    }
    const story = cleanStory(response.parsed_output, teller.id);
    if (!story) {
      return Response.json({ error: 'unparsed', message: 'The story came back in pieces. Press it again.' }, { status: 502 });
    }
    return Response.json({ story, style: style.stylePrompt });
  } catch (error) {
    return aiFault(error, 'The story engine could not be reached.');
  }
}

/** Whether there is a model behind this, so the room knows which book it will get. */
export async function GET(): Promise<Response> {
  return Response.json({ available: copilotAvailable() });
}
