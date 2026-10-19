/**
 * The voices that read a child's story: a storyteller, and a voice for each
 * character who speaks.
 *
 * The owner, 19 October 2026: *"Die story mode moet 'n ander AI engine
 * gebruik, die voorlesing moet so mooi wees soos die podcast. Dalk 'n paar
 * avatar stemme opstel."* The book was read by the phone's own voice, one
 * flat voice for the narrator and the dragon alike. It is now read the way a
 * podcast is — ElevenLabs' dialogue, the speakers hearing each other — with
 * the storyteller the child picks, and the characters in voices of their own.
 *
 * ── Personas, not voice ids ──────────────────────────────────────────────
 *
 * The browser only ever names a persona ("owl", "pip"). The route turns that
 * into a voice on the server, from ElevenLabs' own stock list, so a request
 * can never ask for somebody's cloned voice by guessing an id — the same
 * worry `api/dialogue` checks per voice, closed here by not taking ids at all.
 *
 * Each persona says which stock voices suit it, in order, and the first one
 * the account has is used. The ids under `fallback` are only for a list that
 * could not be fetched; ElevenLabs answers for whether they are right.
 */

export type KidVoiceId = 'owl' | 'fairy' | 'comet' | 'ember' | 'bruno' | 'pip';

export interface KidVoice {
  readonly id: KidVoiceId;
  readonly emoji: string;
  /** What the child calls them, `[key, English]`. */
  readonly name: readonly [string, string];
  /** One line about how they sound, `[key, English]`. */
  readonly about: readonly [string, string];
  /** Offered as the one who reads the story. The others are character voices. */
  readonly storyteller: boolean;
  /** ElevenLabs stock voices that suit this persona, by first name, best first. */
  readonly prefer: readonly string[];
  /** Used only when the stock list could not be read. */
  readonly fallback: string;
  /** The ring round the avatar while they speak. A literal, the same on any theme. */
  readonly glow: string;
}

export const KID_VOICES: readonly KidVoice[] = [
  {
    id: 'owl',
    emoji: '🦉',
    name: ['kids.voiceOwl', 'Professor Hoot'],
    about: ['kids.voiceOwlAbout', 'Warm and wise, like a bedtime story'],
    storyteller: true,
    prefer: ['George', 'Bill', 'Brian', 'Daniel'],
    fallback: 'JBFqnCBsd6RMkjVDRZzb',
    glow: '#fbbf24',
  },
  {
    id: 'fairy',
    emoji: '🧚',
    name: ['kids.voiceFairy', 'Twinkle'],
    about: ['kids.voiceFairyAbout', 'Soft and sparkly, full of wonder'],
    storyteller: true,
    prefer: ['Lily', 'Matilda', 'Alice', 'Charlotte'],
    fallback: 'pFZP5JQG7iQjIQuC4Bku',
    glow: '#f472b6',
  },
  {
    id: 'comet',
    emoji: '🚀',
    name: ['kids.voiceComet', 'Captain Comet'],
    about: ['kids.voiceCometAbout', 'Bold and excited, ready for adventure'],
    storyteller: true,
    prefer: ['Charlie', 'Liam', 'Will', 'Callum', 'Chris'],
    fallback: 'IKne3meq5aSn9XLyUdCD',
    glow: '#38bdf8',
  },
  {
    id: 'ember',
    emoji: '🐉',
    name: ['kids.voiceEmber', 'Ember the Dragon'],
    about: ['kids.voiceEmberAbout', 'Playful and giggly, a little bit cheeky'],
    storyteller: true,
    prefer: ['Jessica', 'Laura', 'Aria', 'Sarah'],
    fallback: 'cgSgspJ2msm6clMCkdW9',
    glow: '#fb923c',
  },
  {
    id: 'bruno',
    emoji: '🐻',
    name: ['kids.voiceBruno', 'Big Bruno'],
    about: ['kids.voiceBrunoAbout', 'Deep and cuddly, a gentle giant'],
    storyteller: false,
    prefer: ['Bill', 'Brian', 'Roger', 'Eric', 'Adam'],
    fallback: 'pqHfZKP75CvOlQylNhV4',
    glow: '#a3e635',
  },
  {
    id: 'pip',
    emoji: '🐭',
    name: ['kids.voicePip', 'Little Pip'],
    about: ['kids.voicePipAbout', 'Tiny and quick, always curious'],
    storyteller: false,
    prefer: ['Laura', 'Gigi', 'Freya', 'Jessica', 'Domi'],
    fallback: 'FGY2WhTYpPnrIDTdsKH5',
    glow: '#c084fc',
  },
];

export const STORYTELLERS: readonly KidVoice[] = KID_VOICES.filter((one) => one.storyteller);

export function kidVoice(id: unknown): KidVoice | null {
  return KID_VOICES.find((one) => one.id === id) ?? null;
}

/**
 * Persona → stock voice, each persona a different voice where the list allows.
 *
 * Distinct matters more than first choice: two characters in the same voice
 * is a conversation with itself, which is the flatness this replaces. So a
 * voice already given to an earlier persona is skipped, and a persona whose
 * favourites are all taken gets any stock voice nobody else has.
 */
export function castVoices(
  stock: readonly { readonly id: string; readonly name: string }[],
): Record<KidVoiceId, string> {
  const taken = new Set<string>();
  const first = (name: string): string => name.trim().split(/[\s-]+/)[0]?.toLowerCase() ?? '';
  const out = {} as Record<KidVoiceId, string>;
  for (const persona of KID_VOICES) {
    const liked = persona.prefer
      .map((want) => stock.find((one) => first(one.name) === want.toLowerCase() && !taken.has(one.id)))
      .find(Boolean);
    const spare = liked ?? stock.find((one) => !taken.has(one.id));
    const id = spare?.id ?? persona.fallback;
    taken.add(id);
    out[persona.id] = id;
  }
  return out;
}

/**
 * The stage directions eleven_v3 performs — `[giggles]`, `[whispers]` — and
 * no other model does: an older one reads them out, so a child hears the
 * word "giggles". Shown text never has them either.
 */
export const TAGS = /\[[^\]\n]{1,40}\]/g;

/** A line without its stage directions, as it is shown and as an older model reads it. */
export function bare(text: string): string {
  return text.replace(TAGS, ' ').replace(/\s{2,}/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim();
}
