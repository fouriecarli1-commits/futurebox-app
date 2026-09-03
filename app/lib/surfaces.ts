/**
 * What each room in the studio is for.
 *
 * The copilot used to know one thing: the song canvas. It sat beside every
 * screen and could only ever see a title, a style and a lyric sheet — so
 * standing in the Booth with a take recorded, it still answered as though you
 * were writing a song. This file is what fixes that. It is the single place
 * that says what a room is, what can be changed in it, and what to suggest to
 * somebody who has just walked in.
 *
 * One registry, three consumers, so they cannot drift apart:
 *   - the copilot panel reads `seeds` for its starters
 *   - the copilot route reads `purpose` and `can` to build its context
 *   - the studio reads the ids to decide where the copilot may send somebody
 *
 * Adding a room means adding an entry here. If you add one and forget, the
 * copilot will say it does not know that screen rather than guessing — which is
 * the failure we want, because it is the one somebody notices.
 */

/** The rooms, in rail order. */
export const SURFACE_IDS = [
  'make',
  'studio',
  'booth',
  'video',
  'canvas',
  'hooks_feed',
  'channels',
  'collab',
  'live',
  'voice_studio',
  'podcast',
] as const;

export type SurfaceId = (typeof SURFACE_IDS)[number];

export interface Surface {
  readonly id: SurfaceId;
  /** What a person is doing here, in one line. Written for the copilot to read. */
  readonly purpose: string;
  /** What the copilot can actually change here. Nothing aspirational — only what the studio applies. */
  readonly can: readonly string[];
  /**
   * Three starters, shown before anything has been typed. They are the answer
   * to a blank panel, so they are specific: "make the chorus hit harder" is
   * worth a tap, "help me with my song" is not.
   */
  readonly seeds: readonly { readonly en: string; readonly af: string }[];
}

export const SURFACES: Readonly<Record<SurfaceId, Surface>> = {
  make: {
    id: 'make',
    purpose: 'Making a song from nothing: a title, a style, the words, then the track itself.',
    can: ['set the title', 'set the style', 'write or rewrite the words', 'make the track'],
    seeds: [
      { en: 'Write me a chorus about leaving home', af: 'Skryf vir my ’n koor oor weggaan van die huis af' },
      { en: 'What style suits these words?', af: 'Watter styl pas by hierdie woorde?' },
      { en: 'Give me three titles for this', af: 'Gee my drie titels hiervoor' },
    ],
  },
  studio: {
    id: 'studio',
    purpose: 'Editing a song that already exists: its sections, its arrangement, its timing.',
    can: ['rewrite a section', 'reorder or retitle sections', 'set the style for a regenerate'],
    seeds: [
      { en: 'This second verse is weak — fix it', af: 'Hierdie tweede vers is swak — maak dit reg' },
      { en: 'Where should the bridge go?', af: 'Waar moet die brug wees?' },
      { en: 'Make the chorus hit harder', af: 'Laat die koor harder tref' },
    ],
  },
  booth: {
    id: 'booth',
    purpose: 'Singing on your own track: recording takes over the backing, and lifting a vocal back out.',
    can: ['say which take to keep', 'clean up a take', 'write words to sing to'],
    seeds: [
      { en: 'Which of my takes is the best one?', af: 'Watter een van my opnames is die beste?' },
      { en: 'My timing is off — what do I do?', af: 'My tydsberekening is uit — wat doen ek?' },
      { en: 'Clean up the take I just did', af: 'Maak die opname skoon wat ek nou gedoen het' },
    ],
  },
  video: {
    id: 'video',
    purpose: 'Turning one of your songs into a music video.',
    can: ['describe the video', 'pick the length', 'set the look'],
    seeds: [
      { en: 'What should this video look like?', af: 'Hoe moet hierdie video lyk?' },
      { en: 'Describe a video for my last song', af: 'Beskryf ’n video vir my laaste snit' },
      { en: 'How long should it be?', af: 'Hoe lank moet dit wees?' },
    ],
  },
  canvas: {
    id: 'canvas',
    purpose: 'The video desk: marketing, podcast and social clips built scene by scene.',
    can: ['write a scene', 'pick a template', 'set the length and shape'],
    seeds: [
      { en: 'Make me a 30 second advert for this', af: 'Maak vir my ’n 30 sekonde advertensie hiervoor' },
      { en: 'Which shape for Instagram?', af: 'Watter vorm vir Instagram?' },
      { en: 'Write three scenes for a trailer', af: 'Skryf drie tonele vir ’n lokprent' },
    ],
  },
  hooks_feed: {
    id: 'hooks_feed',
    purpose: 'Short vertical clips — the fifteen seconds that make somebody stop scrolling.',
    can: ['pick the moment to cut', 'write the caption', 'set the length'],
    seeds: [
      { en: 'Which part of this song is the hook?', af: 'Watter deel van hierdie snit is die hook?' },
      { en: 'Write a caption for this clip', af: 'Skryf ’n byskrif vir hierdie knipsel' },
      { en: 'Cut me a fifteen second version', af: 'Sny vir my ’n vyftien sekonde weergawe' },
    ],
  },
  channels: {
    id: 'channels',
    purpose: 'Your channel: your released music, in the order you want people to hear it.',
    can: ['set the running order', 'write the description', 'name a playlist'],
    seeds: [
      { en: 'What order should these go in?', af: 'In watter volgorde moet hierdie wees?' },
      { en: 'Write the description for my channel', af: 'Skryf die beskrywing vir my kanaal' },
      { en: 'Which track should open it?', af: 'Watter snit moet dit oopmaak?' },
    ],
  },
  collab: {
    id: 'collab',
    purpose: 'Finding another maker and working with them — the radar, the ask, and the room you share.',
    can: ['draft the message you send', 'summarise a thread', 'suggest who to ask'],
    seeds: [
      { en: 'Write the message asking them to collab', af: 'Skryf die boodskap wat hulle vra om saam te werk' },
      { en: 'Who here fits what I make?', af: 'Wie hier pas by wat ek maak?' },
      { en: 'Sum up this conversation for me', af: 'Som hierdie gesprek vir my op' },
    ],
  },
  live: {
    id: 'live',
    purpose: 'The live room: one channel, everybody in it at the same time.',
    can: ['write what you announce', 'set the running order', 'suggest what to play next'],
    seeds: [
      { en: 'What should I say when I open?', af: 'Wat moet ek sê as ek oopmaak?' },
      { en: 'What should I play next?', af: 'Wat moet ek volgende speel?' },
      { en: 'Write the announcement for this', af: 'Skryf die aankondiging hiervoor' },
    ],
  },
  voice_studio: {
    id: 'voice_studio',
    purpose: 'Your voice: cloning it once, then reading anything in it.',
    can: ['write the script to read', 'pick a voice', 'set how it is read'],
    seeds: [
      { en: 'Write me a thirty second read', af: 'Skryf vir my ’n dertig sekonde lees' },
      { en: 'Which voice suits this script?', af: 'Watter stem pas by hierdie teks?' },
      { en: 'Make this sound less formal', af: 'Laat dit minder formeel klink' },
    ],
  },
  podcast: {
    id: 'podcast',
    purpose: 'A show with its own feed: episodes, hosts, and the dub into other languages.',
    can: ['write or tighten the script', 'set the hosts', 'pick the language to dub into'],
    seeds: [
      { en: 'Write the opening for this episode', af: 'Skryf die opening vir hierdie episode' },
      { en: 'Tighten this script by a minute', af: 'Maak hierdie teks ’n minuut korter' },
      { en: 'Which language should I dub into?', af: 'In watter taal moet ek dit oorklank?' },
    ],
  },
};

/** Narrowing helper: is this string one of the rooms? Used to vet what the model names. */
export function isSurfaceId(value: string): value is SurfaceId {
  return (SURFACE_IDS as readonly string[]).includes(value);
}

/**
 * The model is allowed to say `hooks`, because that is what a person calls it.
 * The studio's own id has always been `hooks_feed`. One place to translate, so
 * the alias cannot be half-applied.
 */
export function resolveSurfaceId(value: string): SurfaceId | null {
  const cleaned = value.trim().toLowerCase();
  const alias: Record<string, SurfaceId> = {
    hooks: 'hooks_feed',
    voice: 'voice_studio',
    write: 'make',
    song: 'make',
  };
  const resolved = alias[cleaned] ?? cleaned;
  return isSurfaceId(resolved) ? resolved : null;
}

/** The starters for a room, in the reader's language. */
export function seedsFor(id: SurfaceId, lang: 'en' | 'af'): string[] {
  return SURFACES[id].seeds.map((seed) => seed[lang]);
}

/** The room list as the copilot route describes it to the model. */
export function surfaceDirectory(): string {
  return SURFACE_IDS.map((id) => `- ${id}: ${SURFACES[id].purpose}`).join('\n');
}
