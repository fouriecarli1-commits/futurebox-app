/**
 * A child's song, built the way a song is built: what it is about, how it
 * sounds, where it happens, and its parts — verse, chorus, bridge — each
 * chosen with a line that says what that part is for.
 *
 * The owner, 19 October 2026: *"Die music box vir kids se bubbles is vir my
 * crap … Eerstens kan hulle net daar 1 keuse maak, wat van multiple keuses,
 * wat van style? Dalk ook wat van setting? Dalk dit ook in kind visuele
 * manier uitlê om dit op te breek in verse, chorus, brug en deur keuses 'n
 * kind begelei om te verstaan waaroor elke gedeelte in 'n liedjie gaan."*
 *
 * Pure: the choices and the sentence the music engine is given. The screen is
 * `KidsSongLab.tsx`; the words still go through `/api/music`, where `guard`
 * reads every prompt.
 */

import { KID_SOUNDS, KID_TOPICS, kidWords } from './kidsong';

export interface SongChoice {
  readonly id: string;
  readonly emoji: string;
  readonly says: readonly [string, string];
  /** What it means to the music engine, in English. */
  readonly words: string;
}

/** Up to this many things to sing about. */
export const MOST_TOPICS = 3;

/** Where the song happens. */
export const KID_PLACES: readonly SongChoice[] = [
  { id: 'space', emoji: '🚀', says: ['kids.placeSpace', 'In space'], words: 'set in outer space among the planets and stars' },
  { id: 'jungle', emoji: '🌴', says: ['kids.placeJungle', 'In the jungle'], words: 'set in a green jungle full of animals' },
  { id: 'sea', emoji: '🌊', says: ['kids.placeSea', 'Under the sea'], words: 'set under the sea with fish and whales' },
  { id: 'castle', emoji: '🏰', says: ['kids.placeCastle', 'In a castle'], words: 'set in a magic castle' },
  { id: 'city', emoji: '🌃', says: ['kids.placeCity', 'In a city at night'], words: 'set in a city full of lights at night' },
  { id: 'farm', emoji: '🚜', says: ['kids.placeFarm', 'On a farm'], words: 'set on a busy farm' },
  { id: 'snow', emoji: '❄️', says: ['kids.placeSnow', 'In the snow'], words: 'set in a snowy winter wonderland' },
  { id: 'beach', emoji: '🏖️', says: ['kids.placeBeach', 'At the beach'], words: 'set on a sunny beach' },
  { id: 'savanna', emoji: '🦒', says: ['kids.placeSavanna', 'On the savanna'], words: 'set on the African savanna at sunset' },
  { id: 'home', emoji: '🏡', says: ['kids.placeHome', 'At home'], words: 'set at home with the family' },
];

export interface SongPart {
  readonly id: 'verse' | 'chorus' | 'bridge';
  readonly emoji: string;
  readonly says: readonly [string, string];
  /** What this part of a song is for, said to a child. */
  readonly what: readonly [string, string];
  readonly choices: readonly SongChoice[];
}

export const SONG_PARTS: readonly SongPart[] = [
  {
    id: 'verse',
    emoji: '📖',
    says: ['kids.partVerse', 'Verse'],
    what: ['kids.partVerseWhat', 'The verse tells the story. Each verse says what happens next.'],
    choices: [
      { id: 'adventure', emoji: '🧭', says: ['kids.verseAdventure', 'We go on an adventure'], words: 'the verses tell of going on an adventure' },
      { id: 'friend', emoji: '🤝', says: ['kids.verseFriend', 'We meet a new friend'], words: 'the verses tell of meeting a new friend' },
      { id: 'problem', emoji: '🧩', says: ['kids.verseProblem', 'Something goes wrong'], words: 'the verses tell of a small problem and how it gets fixed' },
      { id: 'discover', emoji: '🔭', says: ['kids.verseDiscover', 'We find something amazing'], words: 'the verses tell of discovering something amazing' },
      { id: 'day', emoji: '☀️', says: ['kids.verseDay', 'A day from morning to night'], words: 'the verses go through a whole day, from morning to bedtime' },
      { id: 'learn', emoji: '💡', says: ['kids.verseLearn', 'We learn something new'], words: 'the verses tell of learning something new' },
    ],
  },
  {
    id: 'chorus',
    emoji: '🎤',
    says: ['kids.partChorus', 'Chorus'],
    what: ['kids.partChorusWhat', 'The chorus is the part everybody sings again and again. It is the big feeling of the song.'],
    choices: [
      { id: 'hooray', emoji: '🎉', says: ['kids.chorusHooray', 'Jump and shout hooray!'], words: 'the chorus is a big happy shout of hooray' },
      { id: 'brave', emoji: '💪', says: ['kids.chorusBrave', 'We can do it!'], words: 'the chorus says we can do it, brave and strong' },
      { id: 'love', emoji: '💖', says: ['kids.chorusLove', 'I love you so'], words: 'the chorus is a warm I love you' },
      { id: 'silly', emoji: '🤪', says: ['kids.chorusSilly', 'A silly word to sing'], words: 'the chorus repeats a silly made-up word that is fun to sing' },
      { id: 'clap', emoji: '👏', says: ['kids.chorusClap', 'Clap your hands and dance'], words: 'the chorus asks everyone to clap and dance' },
      { id: 'dream', emoji: '🌠', says: ['kids.chorusDream', 'Dream big'], words: 'the chorus is about dreaming big' },
    ],
  },
  {
    id: 'bridge',
    emoji: '🌉',
    says: ['kids.partBridge', 'Bridge'],
    what: ['kids.partBridgeWhat', 'The bridge is a surprise before the last chorus. Something changes, then the chorus comes back even bigger.'],
    choices: [
      { id: 'quiet', emoji: '🤫', says: ['kids.bridgeQuiet', 'It gets very quiet'], words: 'the bridge goes soft and quiet' },
      { id: 'surprise', emoji: '🎁', says: ['kids.bridgeSurprise', 'A surprise happens'], words: 'the bridge has a surprise twist' },
      { id: 'echo', emoji: '🗣️', says: ['kids.bridgeEcho', 'Everybody sings it back'], words: 'the bridge is a call and response that everyone sings back' },
      { id: 'faster', emoji: '⚡', says: ['kids.bridgeFaster', 'It gets faster and faster'], words: 'the bridge speeds up' },
      { id: 'solo', emoji: '🎸', says: ['kids.bridgeSolo', 'An instrument plays alone'], words: 'the bridge is an instrumental solo' },
      { id: 'countdown', emoji: '🔟', says: ['kids.bridgeCountdown', 'A countdown: 3, 2, 1!'], words: 'the bridge counts down three, two, one before the last chorus' },
    ],
  },
];

/** The shape of every song in the Song Lab, drawn as blocks to show a child. */
export const SONG_SHAPE: readonly SongPart['id'][] = ['verse', 'chorus', 'verse', 'bridge', 'chorus'];

export interface SongPlan {
  readonly topics: readonly string[];
  readonly sound: string;
  readonly place: string;
  readonly verse: string;
  readonly chorus: string;
  readonly bridge: string;
  /** The child's own words, typed or said. */
  readonly own: string;
}

export const EMPTY_PLAN: SongPlan = { topics: [], sound: '', place: '', verse: '', chorus: '', bridge: '', own: '' };

/** A topic pressed: in if it was out (up to three), out if it was in. */
export function toggled(topics: readonly string[], id: string): string[] {
  if (topics.includes(id)) return topics.filter((one) => one !== id);
  return topics.length >= MOST_TOPICS ? [...topics.slice(1), id] : [...topics, id];
}

const find = (list: readonly SongChoice[] | readonly { readonly id: string; readonly words: string }[], id: string) =>
  (list as readonly { readonly id: string; readonly words: string }[]).find((one) => one.id === id);

/** Enough chosen to make a song: something to sing about, and a sound. */
export function ready(plan: SongPlan): boolean {
  return (plan.topics.length > 0 || Boolean(kidWords(plan.own))) && Boolean(find(KID_SOUNDS, plan.sound));
}

/**
 * The plan as the music engine reads it: what the song is about, and how it
 * is built — so a chorus chosen as "we can do it" is sung as one.
 */
export function songPrompt(plan: SongPlan): { prompt: string; style: string } | null {
  if (!ready(plan)) return null;
  const about = plan.topics.map((id) => find(KID_TOPICS, id)?.words).filter(Boolean);
  const own = kidWords(plan.own);
  const place = find(KID_PLACES, plan.place)?.words;
  const parts = SONG_PARTS
    .map((part) => find(part.choices, plan[part.id])?.words)
    .filter(Boolean);
  const prompt = [
    about.length ? `A children's song combining: ${about.join('; ')}` : '',
    own,
    place ? `It is ${place}` : '',
    parts.length ? `Built as verse, chorus, verse, bridge, chorus: ${parts.join('; ')}` : '',
    'Simple words a young child can sing along to, and a chorus that repeats',
  ].filter(Boolean).join('. ');
  return { prompt, style: find(KID_SOUNDS, plan.sound)!.words };
}
