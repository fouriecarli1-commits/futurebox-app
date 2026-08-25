/**
 * The masterclass library.
 *
 * `provenance` is the load-bearing field and it is never optional. A channel
 * whose whole claim is "here you get quality" cannot put an AI-generated
 * lecture next to a researcher's own talk and let the viewer guess which is
 * which — the moment someone works that out unaided, the Radar's quality gate
 * stops meaning anything either. So every entry says what it is, on the card,
 * before you click.
 *
 *   curated  — someone else made it, it is genuinely good, we point at it and
 *              send the traffic to them. Never re-hosted, never re-narrated.
 *   original — FutureBox made it. A person on camera who did the thing.
 *   ai_video — generated. Labelled as generated everywhere it appears, and
 *              only ever for material where nobody's authority is being
 *              borrowed: explainers, walkthroughs, recaps. Never a synthesised
 *              expert, never a claim about research nobody here has read.
 *
 * The rule that keeps this honest: an AI-generated class may explain a method,
 * never assert a finding. Findings need a person who read the paper.
 */

export type Provenance = 'curated' | 'original' | 'ai_video';

export type Track =
  | 'ai-music'
  | 'ai-video'
  | 'vibecoding'
  | 'which-ai'
  | 'business'
  | 'research';

export type Level = 'start-here' | 'working' | 'deep';

export interface Masterclass {
  readonly id: string;
  readonly title: string;
  readonly instructor: string;
  readonly provenance: Provenance;
  readonly track: Track;
  readonly level: Level;
  readonly minutes: number;
  /** What you can do afterwards that you could not do before. */
  readonly outcome: string;
  readonly url: string;
  /** Only for `curated` — where it actually came from. */
  readonly source?: string;
  /** Only for `original` and `ai_video` — not published yet. */
  readonly status?: 'published' | 'in-production' | 'planned';
  readonly proOnly?: boolean;
}

export const TRACK_LABELS: Record<Track, string> = {
  'ai-music': 'AI Music',
  'ai-video': 'AI Video & Cinema',
  vibecoding: 'Vibe Coding',
  'which-ai': 'Which AI for What',
  business: 'Business & the Future',
  research: 'Breakthrough Research',
};

export const LEVEL_LABELS: Record<Level, string> = {
  'start-here': 'Start here',
  working: 'Working knowledge',
  deep: 'Deep',
};

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  curated: 'Curated — made by someone else',
  original: 'FutureBox original',
  ai_video: 'AI-generated',
};

export const PROVENANCE_NOTES: Record<Provenance, string> = {
  curated:
    'Someone else made this and made it well. We point at it and the traffic goes to them — nothing is re-hosted or re-narrated.',
  original: 'Made by FutureBox. A person who did the thing, on camera.',
  ai_video:
    'Generated, and labelled as generated wherever it appears. These explain a method; they never assert a finding. Findings need a person who read the paper.',
};

/**
 * Curated entries are real, published lectures. The list is deliberately short —
 * a shelf of ten things worth watching beats a hundred nobody has vetted, and
 * every addition has to be watched by a person first.
 */
export const MASTERCLASSES: readonly Masterclass[] = [
  {
    id: 'mc-karpathy-llm',
    title: 'Intro to Large Language Models',
    instructor: 'Andrej Karpathy',
    provenance: 'curated',
    source: 'YouTube — Andrej Karpathy',
    track: 'which-ai',
    level: 'start-here',
    minutes: 60,
    outcome: 'Explain to somebody else what a token is, why context has a limit, and what fine-tuning actually changes.',
    url: 'https://www.youtube.com/watch?v=zjkBMFhNj_g',
  },
  {
    id: 'mc-karpathy-gpt',
    title: "Let's build GPT: from scratch, in code",
    instructor: 'Andrej Karpathy',
    provenance: 'curated',
    source: 'YouTube — Andrej Karpathy',
    track: 'which-ai',
    level: 'deep',
    minutes: 116,
    outcome: 'Read a transformer diagram and know which line of code each box is.',
    url: 'https://www.youtube.com/watch?v=kCc8FmEb1nY',
  },
  {
    id: 'mc-3b1b-nn',
    title: 'Neural networks, visually',
    instructor: '3Blue1Brown',
    provenance: 'curated',
    source: 'YouTube — 3Blue1Brown',
    track: 'which-ai',
    level: 'start-here',
    minutes: 64,
    outcome: 'Picture what gradient descent is doing instead of repeating the phrase.',
    url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi',
  },
  {
    id: 'mc-music-prompt',
    title: 'Prompting a generator that will not stay in key',
    instructor: 'Anre Fourie',
    provenance: 'original',
    status: 'in-production',
    track: 'ai-music',
    level: 'working',
    minutes: 35,
    outcome: 'Write a style line specific enough that the third attempt is usable, not the thirtieth.',
    url: '',
  },
  {
    id: 'mc-music-structure',
    title: 'Structure: why your generated song falls apart at 2:10',
    instructor: 'Anre Fourie',
    provenance: 'original',
    status: 'planned',
    track: 'ai-music',
    level: 'working',
    minutes: 30,
    outcome: 'Lay out an arrangement in sections a generator can actually hold together.',
    url: '',
  },
  {
    id: 'mc-video-continuity',
    title: 'Continuity across a three-minute cut',
    instructor: 'Anre Fourie',
    provenance: 'original',
    status: 'planned',
    track: 'ai-video',
    level: 'deep',
    minutes: 45,
    outcome: 'Plan a music video as one visual treatment rather than a reel of pretty shots.',
    url: '',
    proOnly: true,
  },
  {
    id: 'mc-stack-map',
    title: 'Which AI for which job, and what each one is bad at',
    instructor: 'FutureBox',
    provenance: 'ai_video',
    status: 'planned',
    track: 'which-ai',
    level: 'start-here',
    minutes: 18,
    outcome: 'Pick the right tool for a task in under a minute instead of trying four.',
    url: '',
  },
  {
    id: 'mc-vibecode-weekend',
    title: 'Ship a working app in a weekend',
    instructor: 'Anre Fourie',
    provenance: 'original',
    status: 'planned',
    track: 'vibecoding',
    level: 'working',
    minutes: 50,
    outcome: 'Get something that runs and is honest about what it does — small and finished, not large and broken.',
    url: '',
  },
  {
    id: 'mc-vibecode-review',
    title: 'Reading generated code before you ship it',
    instructor: 'FutureBox',
    provenance: 'ai_video',
    status: 'planned',
    track: 'vibecoding',
    level: 'working',
    minutes: 22,
    outcome: 'Spot the three failure classes that generated code produces most often.',
    url: '',
    proOnly: true,
  },
  {
    id: 'mc-one-person-company',
    title: 'The economics of a one-person media company',
    instructor: 'Anre Fourie',
    provenance: 'original',
    status: 'planned',
    track: 'business',
    level: 'working',
    minutes: 40,
    outcome: 'Work out your own cost per finished minute, and where the model stops helping.',
    url: '',
    proOnly: true,
  },
  {
    id: 'mc-research-reading',
    title: 'Reading a paper you are not qualified to read',
    instructor: 'FutureBox',
    provenance: 'ai_video',
    status: 'planned',
    track: 'research',
    level: 'start-here',
    minutes: 20,
    outcome: 'Find the claim, the sample size and the limitation section — in that order — without pretending to follow the maths.',
    url: '',
  },
];

/** Ordered runs through the library. A shelf is not a course. */
export interface Path {
  readonly id: string;
  readonly title: string;
  readonly blurb: string;
  readonly classIds: readonly string[];
}

export const PATHS: readonly Path[] = [
  {
    id: 'path-music',
    title: 'AI music, from nothing to a release',
    blurb: 'Four sittings. You finish with a track published on your own channel and the stack listed under it.',
    classIds: ['mc-karpathy-llm', 'mc-music-prompt', 'mc-music-structure', 'mc-video-continuity'],
  },
  {
    id: 'path-build',
    title: 'Vibe code something that runs',
    blurb: 'For people who can describe software but have not shipped any.',
    classIds: ['mc-stack-map', 'mc-vibecode-weekend', 'mc-vibecode-review'],
  },
  {
    id: 'path-understand',
    title: 'Actually understand what you are using',
    blurb: 'No code. Enough to stop being sold to.',
    classIds: ['mc-3b1b-nn', 'mc-karpathy-llm', 'mc-research-reading', 'mc-karpathy-gpt'],
  },
];

/**
 * Building blocks for planning the next one. Producing a class regularly is an
 * operations problem, not a content problem — the hard part is deciding what it
 * is *for* before you start filming.
 */
export const BRIEF_SEEDS: Record<Track, { angle: string[]; format: string[] }> = {
  'ai-music': {
    angle: ['a technique that fails on the first three attempts', 'a genre nobody prompts well', 'the gap between draft and publishable', 'what a mastering engineer would say about it'],
    format: ['build one track start to finish, unedited', 'three attempts at the same brief, compared', 'teardown of a track that worked'],
  },
  'ai-video': {
    angle: ['continuity across shots', 'directing without a camera vocabulary', 'when the model breaks and why', 'matching a cut to a track'],
    format: ['one shot, twenty prompts, on screen', 'side-by-side of four models on one brief', 'a full video, narrated as it is made'],
  },
  vibecoding: {
    angle: ['what generated code gets wrong most often', 'shipping something small and finished', 'reading a diff you did not write', 'the deploy step everybody skips'],
    format: ['live build with the timer running', 'a code review of generated code', 'take a broken repo and make it run'],
  },
  'which-ai': {
    angle: ['one job, five tools, honest results', 'what each model is actually bad at', 'cost per finished output', 'when the free tier is enough'],
    format: ['a bake-off with the same brief', 'a decision tree walked through out loud'],
  },
  business: {
    angle: ['unit economics of a one-person operation', 'what the first hundred subscribers cost', 'pricing for a country that is not the US', 'what a channel owes its audience'],
    format: ['numbers on screen, no slides', 'an interview with somebody who did it'],
  },
  research: {
    angle: ['a result that changed a field', 'a replication that failed', 'what a limitation section actually says', 'the gap between a paper and a product'],
    format: ['read the paper together, slowly', 'interview the author', 'explain the method, not the finding'],
  },
};
