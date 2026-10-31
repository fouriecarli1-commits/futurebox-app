/**
 * The song's beat, on the film's clock, and every cut landed on it.
 *
 * The owner, 31 October 2026: *"Doen ook net goeie navorsing van video
 * editors. Dit moet al die features hê en ons slim AI intergrations."* Every
 * leading editor now marks the beat on the music and lets the cuts snap to
 * it (docs/VIDEO-EDITOR-ROADMAP.md, gap 1). Ours had the two halves already:
 * `tempoOf` in `lib/listen.ts` hears the tempo and `lib/onbeat.ts` does the
 * beat arithmetic. What was missing is WHERE the beats fall — a tempo alone
 * says how far apart they are, not where the first one is — and the walk
 * from the song's clock to the film's, through the part of the song chosen
 * and the stretches cut out of it.
 *
 * All on the device: nothing is sent anywhere and it costs no credits.
 */
import { tempoOf } from './listen';
import { beatOf, sane } from './onbeat';

/** A song's beat: how fast, and where the first one falls, in the song's seconds. */
export interface Grid {
  readonly bpm: number;
  readonly phase: number;
}

/** The hop the onsets are read at: ten milliseconds, as `tempoOf` reads them. */
const HOP_SECONDS = 0.01;

/** How much louder each ten milliseconds is than the one before: where notes start. */
export function onsets(samples: Float32Array, rate: number): Float32Array {
  const hop = Math.max(1, Math.round(rate * HOP_SECONDS));
  const frames = Math.floor(samples.length / hop);
  const level = new Float32Array(frames);
  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    for (let i = f * hop; i < (f + 1) * hop; i += 1) sum += samples[i] * samples[i];
    level[f] = Math.sqrt(sum / hop);
  }
  const rise = new Float32Array(frames);
  for (let f = 1; f < frames; f += 1) rise[f] = Math.max(0, level[f] - level[f - 1]);
  return rise;
}

/**
 * Where the first beat falls, in seconds from the start of the samples: the
 * offset, within one beat, at which the beats land on the most note-starts.
 */
export function phaseOf(samples: Float32Array, rate: number, bpm: number): number {
  if (!sane(bpm)) return 0;
  const rise = onsets(samples, rate);
  /* The hop as it really is in samples: 10 ms at 22 050 Hz is 220.5, rounded
     to 221, and reading that as exactly 10 ms drifts the beats 45 ms early
     over twenty seconds — the first version of this did exactly that. */
  const hopSeconds = Math.max(1, Math.round(rate * HOP_SECONDS)) / rate;
  const beatFrames = beatOf(bpm) / hopSeconds;
  let best = 0;
  let bestScore = -1;
  for (let offset = 0; offset < beatFrames; offset += 1) {
    let score = 0;
    for (let at = offset; at < rise.length; at += beatFrames) {
      const f = Math.round(at);
      /* A frame either side too: a beat is heard within a few milliseconds. */
      score += rise[f] + 0.5 * ((rise[f - 1] ?? 0) + (rise[f + 1] ?? 0));
    }
    if (score > bestScore) { bestScore = score; best = offset; }
  }
  return best * hopSeconds;
}

/** The longest stretch of a song listened to: a minute and a half is plenty to hear its beat. */
const HEARD_SECONDS = 90;

/**
 * Decode a song and hear its beat. Null when it cannot be decoded or has no
 * steady beat to find (speech, an ambient wash).
 */
export async function hearGrid(song: Blob): Promise<Grid | null> {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const context = new Ctx();
  try {
    const decoded = await context.decodeAudioData(await song.arrayBuffer());
    const rate = decoded.sampleRate;
    const length = Math.min(decoded.length, Math.round(HEARD_SECONDS * rate));
    const mono = new Float32Array(length);
    for (let c = 0; c < decoded.numberOfChannels; c += 1) {
      const data = decoded.getChannelData(c);
      for (let i = 0; i < length; i += 1) mono[i] += data[i] / decoded.numberOfChannels;
    }
    const bpm = Math.round(tempoOf(mono, rate) * 10) / 10;
    if (!sane(bpm)) return null;
    return { bpm, phase: phaseOf(mono, rate, bpm) };
  } catch {
    return null;
  } finally {
    void context.close().catch(() => undefined);
  }
}

/** The same beat, heard at half or twice the speed: the usual mistake in hearing a tempo. */
export function retimed(grid: Grid, by: 0.5 | 2): Grid | null {
  const bpm = Math.round(grid.bpm * by * 10) / 10;
  return sane(bpm) ? { bpm, phase: grid.phase % beatOf(bpm) } : null;
}

/** One stretch of the song under the film: from `at` on the film's clock, `from` in the song, for `long` seconds of film. */
export interface Run {
  readonly at: number;
  readonly from: number;
  readonly long: number;
}

/**
 * Every beat, in the film's seconds, through the parts of the song the film
 * plays (`stretches` in `lib/videospan.ts`) at the song's speed.
 */
export function filmBeats(grid: Grid, runs: readonly Run[], speed = 1): number[] {
  if (!sane(grid.bpm)) return [];
  const beat = beatOf(grid.bpm);
  const rate = Math.max(0.5, Math.min(2, speed));
  const out: number[] = [];
  for (const run of runs) {
    const songEnd = run.from + run.long * rate;
    let k = Math.ceil((run.from - grid.phase) / beat - 1e-9);
    for (let song = grid.phase + k * beat; song < songEnd - 1e-9; k += 1, song = grid.phase + k * beat) {
      out.push(Math.round((run.at + (song - run.from) / rate) * 1000) / 1000);
    }
  }
  return out;
}

/** A shot on the film, as far as cutting it on the beat needs to know. */
export interface Shot {
  readonly id: string;
  readonly from: number;
  readonly to: number;
  readonly speed?: number;
  /** How long the clip itself is, in its own seconds. */
  readonly real: number;
}

/** The shortest a shot is made by landing it on a beat. */
export const SHORTEST_ON_BEAT = 0.25;

/**
 * Every shot's end moved to the beat nearest where it ended, in order, so
 * each cut after the first lands on the music. A shot is only ever made as
 * long as its clip allows; one whose clip cannot reach any beat is left as
 * it was. Answers the new end (in the clip's own seconds) for each shot
 * that moved.
 */
export function onTheBeat(shots: readonly Shot[], beats: readonly number[]): Map<string, number> {
  const moved = new Map<string, number>();
  let start = 0;
  for (const shot of shots) {
    const fast = Math.max(0.1, Math.min(4, shot.speed ?? 1));
    const long = Math.max(0, (shot.to - shot.from) / fast);
    const most = Math.max(0, (shot.real - shot.from) / fast);
    const want = start + long;
    const fits = beats.filter((b) => b >= start + SHORTEST_ON_BEAT - 1e-9 && b <= start + most + 1e-9);
    if (!fits.length) { start += long; continue; }
    const end = fits.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a));
    const to = Math.round((shot.from + (end - start) * fast) * 1000) / 1000;
    if (Math.abs(to - shot.to) > 0.005) moved.set(shot.id, to);
    start = end;
  }
  return moved;
}
