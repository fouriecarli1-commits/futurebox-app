/**
 * The drum game in Studio Games & Beats: a band plays, the child is the
 * drummer.
 *
 * The owner, 19 October 2026, with two screenshots of a drum trainer ("Simple
 * Rock — Pattern 1, Unit 1 … Great, Unit 2 unlocked!"): *"Ons kan so game by
 * sit by studio en beats. Daar moet lekker musiek met elektric guitar
 * byvoorbeeld speel, en die push van die buttons is die dromme vir die
 * liedjie en hou dan die beat. Onthou die awards wat kinders wen met elke
 * try."*
 *
 * So: a backing song with an electric guitar and a bass and no drums, notes
 * sliding along lanes to a line, three big pads that ARE the drums, units that
 * unlock one after another, and an award for every try — the first try too,
 * and a try that missed everything too, because a six-year-old who tried is a
 * six-year-old who should be asked to try again.
 *
 * Pure: the songs, the units, the judging, the awards. The screen
 * (`KidsDrumGame.tsx`) only plays it.
 */

export type Lane = 'kick' | 'snare' | 'hat';

export interface LaneLook {
  readonly id: Lane;
  readonly emoji: string;
  readonly says: readonly [string, string];
  /** The pad's and the notes' colour. A literal: the same on any theme. */
  readonly colour: string;
}

/** Top to bottom on the screen, left to right on the pads. */
export const LANES: readonly LaneLook[] = [
  { id: 'hat', emoji: '✨', says: ['drums.hat', 'Tss'], colour: '#f472b6' },
  { id: 'snare', emoji: '👏', says: ['drums.snare', 'Clap'], colour: '#facc15' },
  { id: 'kick', emoji: '🥁', says: ['drums.kick', 'Boom'], colour: '#38bdf8' },
];

/** One note to hit: a lane, and when. */
export interface Note {
  readonly lane: Lane;
  /** Counted in eighth notes from the first beat after the count-in. */
  readonly at: number;
}

export interface Unit {
  readonly id: number;
  /** What the child is learning, said in a few words. */
  readonly says: readonly [string, string];
  readonly notes: readonly Note[];
}

export interface DrumSong {
  readonly id: string;
  readonly icon: string;
  readonly says: readonly [string, string];
  readonly bpm: number;
  /**
   * The guitar's chords, one a bar, as the root's MIDI note. Power chords:
   * the root, its fifth and its octave, through a fuzz.
   */
  readonly chords: readonly number[];
  /** How the guitar strums inside a bar, in eighths: true is a hit. */
  readonly strum: readonly boolean[];
  readonly units: readonly Unit[];
}

/** Four bars of four beats, in eighths. */
export const BARS = 4;
export const EIGHTHS = BARS * 8;

/** Notes from a pattern of one bar, repeated for every bar. */
function every(lane: Lane, inBar: readonly number[]): Note[] {
  const out: Note[] = [];
  for (let bar = 0; bar < BARS; bar += 1) for (const at of inBar) out.push({ lane, at: bar * 8 + at });
  return out;
}

/** The last bar with a little fill on the clap, for the bigger units. */
function fill(): Note[] {
  return [4, 5, 6, 7].map((at) => ({ lane: 'snare' as const, at: (BARS - 1) * 8 + at }));
}

const sorted = (notes: Note[]): Note[] => notes.sort((a, b) => a.at - b.at || a.lane.localeCompare(b.lane));

/** The same five units for every song: one more thing to do each time. */
function units(): Unit[] {
  return [
    { id: 1, says: ['drums.unit1', 'Boom on every beat'], notes: sorted(every('kick', [0, 2, 4, 6])) },
    { id: 2, says: ['drums.unit2', 'Boom, clap, boom, clap'], notes: sorted([...every('kick', [0, 4]), ...every('snare', [2, 6])]) },
    { id: 3, says: ['drums.unit3', 'Add the tss in between'], notes: sorted([...every('kick', [0, 4]), ...every('snare', [2, 6]), ...every('hat', [1, 3, 5, 7])]) },
    { id: 4, says: ['drums.unit4', 'A double boom'], notes: sorted([...every('kick', [0, 3, 4]), ...every('snare', [2, 6]), ...every('hat', [1, 3, 5, 7])]) },
    {
      id: 5,
      says: ['drums.unit5', 'Rock star, with a drum fill'],
      notes: sorted([
        ...every('kick', [0, 3, 4]).filter((one) => one.at < (BARS - 1) * 8 + 4),
        ...every('snare', [2, 6]).filter((one) => one.at < (BARS - 1) * 8 + 4),
        ...every('hat', [0, 1, 2, 3, 4, 5, 6, 7]).filter((one) => one.at < (BARS - 1) * 8 + 4),
        ...fill(),
      ]),
    },
  ];
}

export const DRUM_SONGS: readonly DrumSong[] = [
  {
    id: 'rock', icon: '🎸', says: ['drums.songRock', 'Simple Rock'], bpm: 92,
    chords: [40, 36, 38, 40],
    strum: [true, true, true, true, true, true, true, true],
    units: units(),
  },
  {
    id: 'surf', icon: '🏄', says: ['drums.songSurf', 'Surf Party'], bpm: 100,
    chords: [45, 43, 41, 40],
    strum: [true, false, true, true, false, true, true, false],
    units: units(),
  },
  {
    id: 'dino', icon: '🦖', says: ['drums.songDino', 'Dino Stomp'], bpm: 84,
    chords: [40, 40, 43, 38],
    strum: [true, false, false, true, true, false, true, false],
    units: units(),
  },
];

/** Milliseconds of one eighth note at a tempo. */
export const eighthMs = (bpm: number): number => (60_000 / bpm) / 2;

/** A count of four before the notes start, so nobody is caught out. */
export const COUNT_IN = 8;

/* ── Judging a press ──────────────────────────────────────────────────── */

/** How far off a press may be, in milliseconds. Generous: these are small hands. */
export const PERFECT_MS = 90;
export const GOOD_MS = 190;

export type Hit = 'perfect' | 'good' | 'miss';

export function judge(offMs: number): Hit {
  const off = Math.abs(offMs);
  if (off <= PERFECT_MS) return 'perfect';
  if (off <= GOOD_MS) return 'good';
  return 'miss';
}

/**
 * Which note a press on a lane is for: the nearest not yet played on that
 * lane, if it is close enough to count. `null` when the press is between notes
 * — which is not punished, only not counted.
 */
export function noteFor(
  notes: readonly Note[],
  played: ReadonlySet<number>,
  lane: Lane,
  nowEighths: number,
  eighth: number,
): { index: number; off: number } | null {
  let best: { index: number; off: number } | null = null;
  notes.forEach((note, index) => {
    if (note.lane !== lane || played.has(index)) return;
    const off = (nowEighths - note.at) * eighth;
    if (Math.abs(off) > GOOD_MS) return;
    if (!best || Math.abs(off) < Math.abs(best.off)) best = { index, off };
  });
  return best;
}

/* ── How a try went ───────────────────────────────────────────────────── */

export interface Score {
  readonly perfect: number;
  readonly good: number;
  readonly total: number;
  /** The longest run without a miss. */
  readonly streak: number;
}

/** Hits as a share of the notes, a "good" counting as most of a "perfect". */
export function share(score: Score): number {
  if (!score.total) return 0;
  return Math.min(1, (score.perfect + score.good * 0.8) / score.total);
}

/** Stars for a try: none to three. */
export function starsFor(score: Score): number {
  const got = share(score);
  if (got >= 0.9) return 3;
  if (got >= 0.7) return 2;
  if (got >= 0.45) return 1;
  return 0;
}

/** Enough to open the next unit: one star. Forgiving on purpose. */
export const opensNext = (score: Score): boolean => starsFor(score) >= 1;

/* ── Awards, one for every try ───────────────────────────────────────── */

export interface Award {
  readonly id: string;
  readonly icon: string;
  readonly says: readonly [string, string];
}

export const AWARDS: readonly Award[] = [
  { id: 'brave', icon: '🥁', says: ['drums.awardBrave', 'Brave Drummer — you had a go!'] },
  { id: 'again', icon: '💪', says: ['drums.awardAgain', 'Never Give Up — another try!'] },
  { id: 'steady', icon: '🥉', says: ['drums.awardSteady', 'Steady Beat'] },
  { id: 'groove', icon: '🥈', says: ['drums.awardGroove', 'Groove Maker'] },
  { id: 'rockstar', icon: '🥇', says: ['drums.awardRockstar', 'Rock Star'] },
  { id: 'perfect', icon: '🏆', says: ['drums.awardPerfect', 'Perfect Drummer'] },
  { id: 'streak', icon: '🔥', says: ['drums.awardStreak', 'On Fire — ten in a row!'] },
  { id: 'unlock', icon: '🔓', says: ['drums.awardUnlock', 'New Unit Unlocked'] },
  { id: 'band', icon: '🎸', says: ['drums.awardBand', 'Whole Band — every unit of a song'] },
];

/**
 * The award for a try. Always one: the best the try earned, and for a try
 * that earned none of the others, a cheer for having a go.
 */
export function awardFor(score: Score, unlocked: boolean, lastUnit: boolean, tries: number): Award {
  const pick = (id: string): Award => AWARDS.find((one) => one.id === id)!;
  const got = share(score);
  if (score.total && score.perfect === score.total) return pick('perfect');
  if (lastUnit && opensNext(score)) return pick('band');
  if (got >= 0.9) return pick('rockstar');
  if (score.streak >= 10) return pick('streak');
  if (unlocked) return pick('unlock');
  if (got >= 0.7) return pick('groove');
  if (got >= 0.45) return pick('steady');
  return pick(tries <= 1 ? 'brave' : 'again');
}

/* ── What is kept on the phone ───────────────────────────────────────── */

export const DRUMS_KEY = 'futurebox.kids.drums.v1';

export interface DrumsKept {
  /** The highest unit open, per song. One is always open. */
  readonly open: Readonly<Record<string, number>>;
  /** Best stars per song and unit, as "rock:2". */
  readonly best: Readonly<Record<string, number>>;
  /** Every award won, newest first, kept to a shelf's worth. */
  readonly awards: readonly { readonly id: string; readonly at: number }[];
  readonly tries: number;
}

export const NO_DRUMS: DrumsKept = { open: {}, best: {}, awards: [], tries: 0 };

/** The most awards kept. A shelf, not a log. */
export const MOST_AWARDS = 60;

export function readDrums(raw: unknown): DrumsKept {
  const row = raw && typeof raw === 'object' ? raw as Partial<DrumsKept> : {};
  const open: Record<string, number> = {};
  for (const song of DRUM_SONGS) {
    const at = Number((row.open as Record<string, unknown> | undefined)?.[song.id]);
    open[song.id] = Number.isInteger(at) ? Math.max(1, Math.min(song.units.length, at)) : 1;
  }
  const best: Record<string, number> = {};
  for (const [key, value] of Object.entries((row.best as Record<string, unknown>) ?? {})) {
    const stars = Number(value);
    if (/^[a-z]+:\d+$/.test(key) && Number.isInteger(stars)) best[key] = Math.max(0, Math.min(3, stars));
  }
  const awards = (Array.isArray(row.awards) ? row.awards : [])
    .filter((one) => AWARDS.some((award) => award.id === one?.id) && Number.isFinite(one?.at))
    .slice(0, MOST_AWARDS)
    .map((one) => ({ id: String(one.id), at: Number(one.at) }));
  return { open, best, awards, tries: Math.max(0, Math.floor(Number(row.tries) || 0)) };
}

/** A try written down: the award, the best stars, and the next unit if it opened. */
export function afterTry(kept: DrumsKept, song: DrumSong, unit: number, score: Score, at: number): { kept: DrumsKept; award: Award; unlocked: boolean } {
  const opening = opensNext(score) && unit === (kept.open[song.id] ?? 1) && unit < song.units.length;
  const award = awardFor(score, opening, unit === song.units.length, kept.tries + 1);
  const key = `${song.id}:${unit}`;
  return {
    award,
    unlocked: opening,
    kept: {
      open: { ...kept.open, [song.id]: opening ? unit + 1 : (kept.open[song.id] ?? 1) },
      best: { ...kept.best, [key]: Math.max(kept.best[key] ?? 0, starsFor(score)) },
      awards: [{ id: award.id, at }, ...kept.awards].slice(0, MOST_AWARDS),
      tries: kept.tries + 1,
    },
  };
}
