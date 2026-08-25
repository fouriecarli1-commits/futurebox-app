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

// -----------------------------------------------------------------------------
// 1. The AI model stack
// -----------------------------------------------------------------------------

/**
 * The point of showing the stack is that a FutureBox release is visibly made by
 * several different AIs, each doing the job it is best at. So every model
 * carries the role it plays, and the UI groups by role rather than listing
 * names in a row.
 */
export type ModelRole = 'music' | 'video' | 'voice' | 'image';

export interface AiModel {
  readonly name: string;
  readonly provider: string;
  readonly role: ModelRole;
  readonly url: string;
}

export const ROLE_LABELS: Record<ModelRole, string> = {
  music: 'Music & Song',
  video: 'Video & Cinema',
  voice: 'Voice & Vocals',
  image: 'Image & Art Direction',
};

export const ROLE_ACCENTS: Record<ModelRole, string> = {
  music: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  video: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',
  voice: 'text-violet-300 border-violet-500/40 bg-violet-500/10',
  image: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
};

export const AI_MODELS: readonly AiModel[] = [
  { name: 'Suno v5', provider: 'Suno', role: 'music', url: 'https://suno.com' },
  { name: 'Udio', provider: 'Udio', role: 'music', url: 'https://udio.com' },
  { name: 'Stable Audio', provider: 'Stability AI', role: 'music', url: 'https://stableaudio.com' },
  { name: 'Runway Gen-3', provider: 'Runway', role: 'video', url: 'https://runwayml.com' },
  { name: 'Sora', provider: 'OpenAI', role: 'video', url: 'https://openai.com/sora' },
  { name: 'Veo', provider: 'Google DeepMind', role: 'video', url: 'https://deepmind.google/models/veo/' },
  { name: 'Kling AI', provider: 'Kuaishou', role: 'video', url: 'https://klingai.com' },
  { name: 'Luma Dream Machine', provider: 'Luma AI', role: 'video', url: 'https://lumalabs.ai/dream-machine' },
  { name: 'ElevenLabs Voice', provider: 'ElevenLabs', role: 'voice', url: 'https://elevenlabs.io' },
  { name: 'Midjourney', provider: 'Midjourney', role: 'image', url: 'https://midjourney.com' },
  { name: 'Flux', provider: 'Black Forest Labs', role: 'image', url: 'https://blackforestlabs.ai' },
];

export function modelByName(name: string): AiModel | undefined {
  return AI_MODELS.find((m) => m.name === name);
}

/** Groups a selection into the roles it covers, in a fixed display order. */
export function groupByRole(names: readonly string[]): Array<{ role: ModelRole; models: AiModel[] }> {
  const order: ModelRole[] = ['music', 'video', 'voice', 'image'];
  return order
    .map((role) => ({
      role,
      models: names.map(modelByName).filter((m): m is AiModel => Boolean(m) && m!.role === role),
    }))
    .filter((group) => group.models.length > 0);
}

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
    models: ['Suno v5', 'Runway Gen-3'],
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
    models: ['Suno v5', 'Kling AI'],
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
    models: ['Suno v5', 'Sora'],
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
    models: ['Suno v5', 'Luma Dream Machine'],
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
    models: ['Suno v5', 'ElevenLabs Voice'],
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
    models: ['Udio', 'Kling AI'],
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
    models: ['Suno v5'],
    onChannel: false,
    isDemo: true,
  },
];

// -----------------------------------------------------------------------------
// 4. Social platforms
// -----------------------------------------------------------------------------

export interface SocialPlatform {
  readonly id: string;
  readonly name: string;
  readonly handle: string;
  readonly status: 'live' | 'not_created';
  readonly bestFormat: string;
  readonly hookWindow: string;
  readonly maxHashtags: number;
}

export const PLATFORMS: readonly SocialPlatform[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: '@futurebox',
    status: 'not_created',
    bestFormat: '9:16 vertical, 15–34s',
    hookWindow: 'First 1.5 seconds',
    maxHashtags: 5,
  },
  {
    id: 'youtube',
    name: 'YouTube Shorts',
    handle: '@futurebox',
    status: 'live',
    bestFormat: '9:16 vertical, up to 60s',
    hookWindow: 'First 3 seconds',
    maxHashtags: 3,
  },
  {
    id: 'instagram',
    name: 'Instagram Reels',
    handle: '@futurebox',
    status: 'not_created',
    bestFormat: '9:16 vertical, 15–30s',
    hookWindow: 'First 2 seconds',
    maxHashtags: 5,
  },
  {
    id: 'x',
    name: 'X',
    handle: '@futurebox',
    status: 'not_created',
    bestFormat: 'Native video, under 2:20',
    hookWindow: 'The first line of text',
    maxHashtags: 2,
  },
];

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
  /** Minor units of ZAR, kept small on purpose. */
  readonly entryFeeCents: number;
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
    entryFeeCents: 1000,
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
    entryFeeCents: 1000,
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
    entryFeeCents: 1500,
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
    entryFeeCents: 500,
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
