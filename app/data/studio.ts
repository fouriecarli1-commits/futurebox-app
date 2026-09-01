/**
 * Seeded data for the Creator Studio.
 *
 * Everything in here is static and client-side: FutureBox has no backend yet,
 * so matching, pitching and competition state are computed in the browser from
 * these tables. Where a row describes something real (a podcast that exists, a
 * platform that exists) it carries a public URL and nothing invented — no
 * fabricated contact addresses. Where a row is demo material it says so via
 * `isDemo`, so nobody mistakes a placeholder for a real collaborator.
 */

import { BASE_PRICES } from '../lib/pricing';

// -----------------------------------------------------------------------------
// 1. (was: the AI model stack)
// -----------------------------------------------------------------------------
//
// There was a table here of eleven other companies' products — Suno, Udio,
// Runway, Sora, Veo, Kling, Luma, Midjourney, Flux — each with its name, its
// owner and a link to its website, drawn as a row of chips on the make screen
// under "Which AI made it".
//
// It is gone, and it should be. It sent people to the competition from inside
// the one screen where they were about to make something here, and it never
// even did the job it claimed: what a chip said had no effect on anything. The
// credits printed on a finished song come from what actually made it — the
// engine that answered, or `FutureBox sketch` when none did — and that is
// read from the generation itself a few hundred lines into MakeMusic, not
// from a row of buttons somebody ticked.
//
// So nothing true was lost. The honest provenance stays; the shop window for
// other people's products does not.

// -----------------------------------------------------------------------------
// 2. Podcast collaboration targets
// -----------------------------------------------------------------------------

/**
 * `reach` is deliberately blunt. A channel with a few hundred followers writing
 * to a show with millions of listeners is not a collaboration proposal, it is a
 * lottery ticket — and treating the two as the same is how creators burn the
 * one introduction they get. So the radar sorts realistic targets above
 * aspirational ones and says which is which.
 */
export type PodcastReach = 'peer' | 'reachable' | 'aspirational';

export interface PodcastTarget {
  readonly id: string;
  readonly name: string;
  readonly host: string;
  readonly topics: readonly string[];
  readonly format: string;
  readonly audience: string;
  readonly reach: PodcastReach;
  /** Public page for the show. We never invent an email address. */
  readonly url: string;
  readonly angle: string;
  readonly isDemo?: boolean;
}

export const REACH_LABELS: Record<PodcastReach, string> = {
  peer: 'Peer — swap audiences',
  reachable: 'Reachable — worth a real pitch',
  aspirational: 'Aspirational — needs a track record first',
};

export const PODCAST_TARGETS: readonly PodcastTarget[] = [
  {
    id: 'pod-lex',
    name: 'Lex Fridman Podcast',
    host: 'Lex Fridman',
    topics: ['ai', 'research', 'longform', 'philosophy'],
    format: 'Long-form interview (2h+)',
    audience: 'Millions',
    reach: 'aspirational',
    url: 'https://lexfridman.com/podcast/',
    angle: 'The creative-tooling side of AI: what changes when a song costs nothing to make.',
  },
  {
    id: 'pod-doac',
    name: 'The Diary of a CEO',
    host: 'Steven Bartlett',
    topics: ['business', 'ai', 'creators', 'longform'],
    format: 'Long-form interview',
    audience: 'Millions',
    reach: 'aspirational',
    url: 'https://stevenbartlett.com/doac/',
    angle: 'Building a media company where every release is AI-made and openly labelled.',
  },
  {
    id: 'pod-dwarkesh',
    name: 'Dwarkesh Podcast',
    host: 'Dwarkesh Patel',
    topics: ['ai', 'research', 'economics', 'longform'],
    format: 'Long-form interview',
    audience: 'Hundreds of thousands',
    reach: 'aspirational',
    url: 'https://www.dwarkesh.com/',
    angle: 'What generative media does to the economics of a creative career.',
  },
  {
    id: 'pod-allin',
    name: 'All-In Podcast',
    host: 'Chamath, Jason, Sacks & Friedberg',
    topics: ['business', 'venture', 'ai', 'panel'],
    format: 'Panel show',
    audience: 'Millions',
    reach: 'aspirational',
    url: 'https://www.allinpodcast.co/',
    angle: 'A working business model for AI-native creators, not a think-piece about one.',
  },
  {
    id: 'pod-huberman',
    name: 'Huberman Lab',
    host: 'Dr. Andrew Huberman',
    topics: ['science', 'health', 'longform'],
    format: 'Solo + guest science',
    audience: 'Millions',
    reach: 'aspirational',
    url: 'https://hubermanlab.com/',
    angle: 'Weak fit — only worth pitching with a music-and-focus research angle.',
  },
  // Demo rows: the shape a realistic target list takes once you start filling it
  // in yourself. Replace these — they are placeholders, not real shows.
  {
    id: 'pod-demo-1',
    name: '[Your target] AI music creator show',
    host: 'Add the host name',
    topics: ['ai music', 'suno', 'creators', 'production'],
    format: 'Weekly, 45 min, video + audio',
    audience: '5k – 50k',
    reach: 'reachable',
    url: '',
    angle: 'Demo a full track built live, start to finish, with the stack on screen.',
    isDemo: true,
  },
  {
    id: 'pod-demo-2',
    name: '[Your target] vibe-coding / indie build show',
    host: 'Add the host name',
    topics: ['vibe coding', 'indie', 'ai', 'building'],
    format: 'Fortnightly, 60 min',
    audience: '2k – 20k',
    reach: 'peer',
    url: '',
    angle: 'Build a FutureBox feature live and ship it during the episode.',
    isDemo: true,
  },
  {
    id: 'pod-demo-3',
    name: '[Your target] South African tech / creator podcast',
    host: 'Add the host name',
    topics: ['south africa', 'creators', 'ai', 'business'],
    format: 'Weekly, 40 min',
    audience: '1k – 15k',
    reach: 'peer',
    url: '',
    angle: 'Local angle: building an AI media channel from South Africa, in two languages.',
    isDemo: true,
  },
];

// -----------------------------------------------------------------------------
// 3. Music flavour catalogue
// -----------------------------------------------------------------------------

export interface TrackFlavour {
  readonly id: string;
  readonly title: string;
  readonly creator: string;
  readonly handle: string;
  readonly genre: string;
  readonly tags: readonly string[];
  readonly bpm: number;
  readonly key: string;
  readonly models: readonly string[];
  /** True for tracks that already live on the channel. */
  readonly onChannel: boolean;
  readonly isDemo?: boolean;
}

export const TRACK_FLAVOURS: readonly TrackFlavour[] = [
  {
    id: 'ai-1',
    title: 'Cherry Blossom Mail',
    creator: 'Anre Fourie',
    handle: '@anrefourie',
    genre: 'Jingle Pop / Acoustic',
    tags: ['acoustic', 'pop', 'warm', 'hand percussion', 'pedal steel'],
    bpm: 96,
    key: 'C Major',
    models: ['FutureBox'],
    onChannel: true,
  },
  {
    id: 'ai-2',
    title: 'Paul Gaan Skool Toe',
    creator: 'Anre Fourie',
    handle: '@anrefourie',
    genre: 'Pop Rock & Anthemic Folk',
    tags: ['anthemic', 'rock', 'folk', 'layered guitars', 'afrikaans'],
    bpm: 120,
    key: 'G Major',
    models: ['FutureBox'],
    onChannel: true,
  },
  {
    id: 'ai-3',
    title: 'BRICKZ — FORGET YESTERDAY',
    creator: 'JL Records',
    handle: '@brickz',
    genre: 'Sci-Fi Dance & Visual Hook',
    tags: ['dance', 'synth', 'retro-futuristic', 'hook'],
    bpm: 128,
    key: 'A Minor',
    models: ['FutureBox'],
    onChannel: true,
  },
  {
    id: 'flv-1',
    title: 'Neon Harvest',
    creator: 'Demo creator',
    handle: '@demo-neon',
    genre: 'Melodic Techno',
    tags: ['dance', 'synth', 'driving', 'afterlife'],
    bpm: 124,
    key: 'A Minor',
    models: ['FutureBox'],
    onChannel: false,
    isDemo: true,
  },
  {
    id: 'flv-2',
    title: 'Gravel Road Sunrise',
    creator: 'Demo creator',
    handle: '@demo-country',
    genre: 'Modern Country Pop',
    tags: ['acoustic', 'pop', 'warm', 'pedal steel', 'storytelling'],
    bpm: 104,
    key: 'G Major',
    models: ['FutureBox'],
    onChannel: false,
    isDemo: true,
  },
  {
    id: 'flv-3',
    title: 'Highveld Static',
    creator: 'Demo creator',
    handle: '@demo-sa',
    genre: 'Afro House',
    tags: ['dance', 'percussion', 'south africa', 'groove'],
    bpm: 122,
    key: 'F Minor',
    models: ['FutureBox'],
    onChannel: false,
    isDemo: true,
  },
  {
    id: 'flv-4',
    title: 'Paper Planes & Pixels',
    creator: 'Demo creator',
    handle: '@demo-lofi',
    genre: 'Lo-fi Beats',
    tags: ['lofi', 'warm', 'mellow', 'study'],
    bpm: 88,
    key: 'C Major',
    models: ['FutureBox'],
    onChannel: false,
    isDemo: true,
  },
];

// -----------------------------------------------------------------------------
// 4. TikTok Live
//
// The platform table itself now lives in `app/data/social.ts`, alongside the
// real profile and composer URLs it needs to be useful.
// -----------------------------------------------------------------------------

/** What has to exist before a TikTok Live collab is even bookable. */
export const TIKTOK_LAUNCH_STEPS: readonly { id: string; label: string; detail: string }[] = [
  { id: 'account', label: 'Create the @futurebox account', detail: 'Business account, not personal — you need the analytics and the scheduling.' },
  { id: 'brand', label: 'Set avatar, bio and link', detail: 'Same mark as the app. Bio states plainly that every release is AI-made.' },
  { id: 'seed', label: 'Post 5–10 clips before going live', detail: 'A live room on an empty account has nobody in it. Seed the feed first.' },
  { id: 'followers', label: 'Reach the LIVE threshold', detail: 'TikTok gates LIVE behind a follower minimum and an age minimum — check the current requirement in-app.' },
  { id: 'coshost', label: 'Confirm a co-host', detail: 'Co-hosting needs both accounts eligible for LIVE. Agree the slot in writing first.' },
  { id: 'rehearse', label: 'Rehearse the stack demo', detail: 'Screen-share of the model stack is the whole draw. Practise it once, offline.' },
];

// -----------------------------------------------------------------------------
// 5. Competitions
// -----------------------------------------------------------------------------

export type CompetitionCategory = 'music' | 'video' | 'app' | 'idea';

export interface Competition {
  readonly id: string;
  readonly title: string;
  readonly category: CompetitionCategory;
  readonly brief: string;
  /** Base price in US dollars. The local figure is derived per region. */
  readonly entryUsd: number;
  readonly prize: string;
  readonly runnerUp: string;
  readonly closesOn: string;
  readonly judging: string;
  readonly entries: number;
}

export const CATEGORY_LABELS: Record<CompetitionCategory, string> = {
  music: 'AI Music',
  video: 'AI Music Video',
  app: 'Vibe-coded App',
  idea: 'FutureBox Idea',
};

export const COMPETITIONS: readonly Competition[] = [
  {
    id: 'cmp-music',
    title: 'Best AI Song of the Month',
    category: 'music',
    brief: 'One original track, any genre. The prompt and the full model stack must be submitted with it — the prompt is part of the entry, not a secret.',
    entryUsd: BASE_PRICES.entryMusic,
    prize: 'FutureBox Pro free for 12 months + featured release slot on the channel',
    runnerUp: 'Pro free for 3 months',
    closesOn: '2026-09-30',
    judging: 'Skill-judged against a published rubric: songwriting, production, originality, prompt craft. Public vote counts for 30%.',
    entries: 41,
  },
  {
    id: 'cmp-video',
    title: 'Best AI Music Video',
    category: 'video',
    brief: 'A finished music video, 9:16 or 16:9. Bonus weight for a coherent visual treatment across the whole runtime rather than a reel of pretty shots.',
    entryUsd: BASE_PRICES.entryMusic,
    prize: 'Pro free for 12 months + a co-directed release with the channel',
    runnerUp: 'Pro free for 3 months',
    closesOn: '2026-10-15',
    judging: 'Skill-judged: direction, edit, sync to the track, consistency. Public vote counts for 30%.',
    entries: 23,
  },
  {
    id: 'cmp-app',
    title: 'Vibe-coded App Sprint',
    category: 'app',
    brief: 'Ship a working app in a weekend. It must run — a repo that does not start is not an entry. Small and finished beats large and broken.',
    entryUsd: BASE_PRICES.entryApp,
    prize: 'Pro free for 12 months + a VibefyCode assessment of the app',
    runnerUp: 'Pro free for 3 months',
    closesOn: '2026-09-21',
    judging: 'Skill-judged: does it run, is it useful, is it honest about what it does. Panel only, no public vote.',
    entries: 12,
  },
  {
    id: 'cmp-idea',
    title: 'The FutureBox Idea Prize',
    category: 'idea',
    brief: 'One paragraph. A feature, a format, or a business the channel should build. No prototype needed — the idea is the entry.',
    entryUsd: BASE_PRICES.entryIdea,
    prize: 'Pro free for 12 months + the idea gets built and credited on the channel',
    runnerUp: 'Pro free for 3 months',
    closesOn: '2026-09-14',
    judging: 'Skill-judged by a panel on originality, fit and feasibility.',
    entries: 67,
  },
];

/** Building blocks for the "design a new competition" generator. */
export const COMPETITION_SEEDS = {
  music: {
    constraint: ['under 90 seconds', 'one instrument only', 'no drums at all', 'a single unbroken take', 'built from a 4-word prompt'],
    theme: ['a place you have never been', 'the last day of something', 'a machine falling in love', 'a South African summer', 'the year 2099'],
  },
  video: {
    constraint: ['no human faces', 'one continuous shot', 'black and white only', 'shot entirely in 9:16', 'no text on screen'],
    theme: ['a city that runs itself', 'analog vs neural', 'a road trip with nobody driving', 'the archive wakes up'],
  },
  app: {
    constraint: ['one screen only', 'no sign-in', 'works offline', 'built in under 4 hours', 'no database'],
    theme: ['a tool for musicians', 'something that makes a podcast easier', 'a thing your parents could use', 'a toy that teaches'],
  },
  idea: {
    constraint: ['explain it in one sentence', 'it must cost under R100 to test', 'no new hires', 'it has to work in two languages'],
    theme: ['a new FutureBox format', 'a reason to come back daily', 'a way to pay creators', 'a collab nobody has done'],
  },
} as const;

// -----------------------------------------------------------------------------
// 6. Songwriting
// -----------------------------------------------------------------------------

/**
 * Style presets for the songwriter.
 *
 * A generator takes a style line and a lyric block, and the style line is where
 * most attempts are lost: "make it country" produces an average of every country
 * song, while a tempo, a key and three named instruments produce a specific one.
 * So each preset carries the things worth stating and nothing decorative.
 */
export interface StylePreset {
  readonly id: string;
  readonly family: string;
  readonly name: string;
  readonly bpm: number;
  readonly key: string;
  readonly tags: readonly string[];
}

export const STYLE_PRESETS: readonly StylePreset[] = [
  { id: 'sp-melodic-techno', family: 'Electronic', name: 'Melodic techno', bpm: 124, key: 'D Minor', tags: ['analog arps', 'sidechained pads', 'driving kick', 'reverb tails'] },
  { id: 'sp-afro-house', family: 'Electronic', name: 'Afro house', bpm: 122, key: 'F Minor', tags: ['log drums', 'shakers', 'warm bass', 'chanted vocal'] },
  { id: 'sp-synthwave', family: 'Electronic', name: 'Synthwave', bpm: 110, key: 'A Minor', tags: ['analog synths', 'gated snare', 'neon pads', 'octave bass'] },
  { id: 'sp-lofi', family: 'Electronic', name: 'Lo-fi beats', bpm: 88, key: 'C Major', tags: ['dusty drums', 'rhodes', 'vinyl crackle', 'mellow'] },
  { id: 'sp-anthemic-pop', family: 'Pop', name: 'Anthemic pop', bpm: 120, key: 'G Major', tags: ['stacked chorus vocals', 'punchy kick', 'clapping snare', 'wide guitars'] },
  { id: 'sp-jingle-pop', family: 'Pop', name: 'Jingle pop', bpm: 96, key: 'C Major', tags: ['hand percussion', 'brushed snare', 'acoustic strums', 'three-part harmony'] },
  { id: 'sp-country-pop', family: 'Country', name: 'Modern country pop', bpm: 104, key: 'G Major', tags: ['pedal steel', 'fingerpicked acoustic', 'upright bass', 'storytelling'] },
  { id: 'sp-folk-rock', family: 'Rock', name: 'Folk rock', bpm: 118, key: 'D Major', tags: ['layered electrics', 'close-miked vocal', 'tambourine', 'big last chorus'] },
  { id: 'sp-indie-rock', family: 'Rock', name: 'Indie rock', bpm: 132, key: 'E Minor', tags: ['jangly guitars', 'dry drums', 'room reverb', 'half-shouted vocal'] },
  { id: 'sp-soul', family: 'Soul', name: 'Neo-soul', bpm: 84, key: 'B♭ Minor', tags: ['rhodes', 'slippery bass', 'brush kit', 'breathy vocal'] },
  { id: 'sp-hiphop', family: 'Hip-hop', name: 'Boom bap', bpm: 92, key: 'A Minor', tags: ['sampled loop', 'hard snare', 'upright bass', 'scratch fills'] },
  { id: 'sp-cinematic', family: 'Score', name: 'Cinematic build', bpm: 70, key: 'D Minor', tags: ['strings', 'low brass', 'taiko', 'no vocal'] },
];

/** The section tags a generator understands, in the order a song uses them. */
export const SONG_SECTIONS = [
  { tag: 'Intro', hint: 'Sets the room. Often instrumental.' },
  { tag: 'Verse', hint: 'Carries the story. Keep the melody lower than the chorus.' },
  { tag: 'Pre-Chorus', hint: 'The lift. Two or four lines, rising.' },
  { tag: 'Chorus', hint: 'The line people remember. Say the title here.' },
  { tag: 'Post-Chorus', hint: 'A hook without words — oohs, a riff, a chant.' },
  { tag: 'Bridge', hint: 'Somewhere new. Change the chords or the point of view.' },
  { tag: 'Drop', hint: 'Dance only. The payoff after the build.' },
  { tag: 'Instrumental', hint: 'A solo or a break. Name the instrument.' },
  { tag: 'Outro', hint: 'How it lets go. Fade, cut, or one last line.' },
] as const;

export const VOCAL_CHOICES = [
  { id: 'female-pop', label: 'Female pop vocal' },
  { id: 'male-rock', label: 'Male rock vocal' },
  { id: 'female-folk', label: 'Female folk vocal, close-miked' },
  { id: 'male-soul', label: 'Male soul vocal' },
  { id: 'duet', label: 'Duet, trading lines' },
  { id: 'choir', label: 'Choir / group vocal' },
  { id: 'vocoder', label: 'Vocoder / robotic' },
  { id: 'none', label: 'Instrumental — no vocal' },
] as const;

export const MOOD_TAGS = [
  'warm', 'melancholy', 'euphoric', 'hopeful', 'menacing', 'nostalgic',
  'intimate', 'defiant', 'playful', 'sparse', 'lush', 'raw',
] as const;
