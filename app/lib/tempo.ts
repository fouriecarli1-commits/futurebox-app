/**
 * Bars, beats, and the clock a musician actually reads.
 *
 * ── Why this is a file of its own ────────────────────────────────────────
 *
 * Everything in a session that is not a waveform is this arithmetic: where the
 * metronome clicks, where a lane lands when it snaps, what "001 01" says at
 * the top of the screen, and how long a count-in runs before the recording
 * starts. Four features, one set of sums, and every one of them is wrong in
 * the same way if the sums are wrong — a click and a snap that disagree by a
 * few milliseconds put a recording a hair behind the grid it was played to,
 * which is audible and which nobody can see on a screen.
 *
 * So the sums live here, with no browser in them, and `check:tempo` pins them.
 *
 * ── What a beat is here ──────────────────────────────────────────────────
 *
 * The tempo counts the *unit* note of the time signature. In 4/4 at 120 that
 * is a crotchet twice a second, which is what everybody means. In 6/8 at 120
 * it is a quaver twice a second, which is what a musician working in 6/8
 * means, and not what a naive `60 / bpm` on quarter notes would give. Stating
 * it is the whole point: the two readings differ by a factor of two, and a
 * metronome that picks the other one is not slightly off, it is in a different
 * time.
 */

export interface Meter {
  /** Unit notes per minute. See the note above about what a unit is. */
  readonly bpm: number;
  /** Top of the time signature: how many units make a bar. */
  readonly beats: number;
  /** Bottom of it: which note is the unit. 4 is a crotchet, 8 a quaver. */
  readonly unit: number;
  /** The root, for the panel that shows it. Not used in any arithmetic here. */
  readonly key: string;
}

export const DEFAULT_METER: Meter = { bpm: 120, beats: 4, unit: 4, key: 'C' };

/** What a tempo may be set to. Below 20 a metronome is a doorbell; above 300
 *  the clicks are closer together than the ear separates them. */
export const SLOWEST = 20;
export const FASTEST = 300;

export function sane(meter: Meter): Meter {
  return {
    bpm: Math.min(FASTEST, Math.max(SLOWEST, Math.round(meter.bpm) || DEFAULT_METER.bpm)),
    beats: Math.min(16, Math.max(1, Math.round(meter.beats) || DEFAULT_METER.beats)),
    unit: [1, 2, 4, 8, 16].includes(meter.unit) ? meter.unit : DEFAULT_METER.unit,
    key: meter.key || DEFAULT_METER.key,
  };
}

export function beatSeconds(meter: Meter): number {
  return 60 / sane(meter).bpm;
}

export function barSeconds(meter: Meter): number {
  return beatSeconds(meter) * sane(meter).beats;
}

export interface Position {
  /** One-based, as every sequencer since the first one has counted them. */
  readonly bar: number;
  readonly beat: number;
  /** How far past that beat, 0–1. */
  readonly into: number;
}

export function positionOf(seconds: number, meter: Meter): Position {
  const beat = beatSeconds(meter);
  const per = sane(meter).beats;
  const beats = Math.max(0, seconds) / beat;
  const whole = Math.floor(beats);
  return {
    bar: Math.floor(whole / per) + 1,
    beat: (whole % per) + 1,
    into: beats - whole,
  };
}

/** "001 01", the way the transport reads it. */
export function displayOf(seconds: number, meter: Meter): string {
  const at = positionOf(seconds, meter);
  return `${String(at.bar).padStart(3, '0')} ${String(at.beat).padStart(2, '0')}`;
}

/** The other direction: where bar 9 beat 1 falls, in seconds. */
export function secondsOf(bar: number, beat: number, meter: Meter): number {
  const per = sane(meter).beats;
  const beats = (Math.max(1, bar) - 1) * per + (Math.max(1, beat) - 1);
  return beats * beatSeconds(meter);
}

/* ── Snapping ────────────────────────────────────────────────────────────── */

export type Snap = 'off' | 'bar' | 'beat' | 'smart';

/**
 * Smart, defined rather than gestured at.
 *
 * Nearest beat, unless a bar line is within a beat of it — then the bar. It is
 * the rule that does what somebody dragging a loop actually means: roughly at
 * the start of a bar snaps to the bar, roughly on a beat snaps to the beat.
 * "Smart" in a menu with no stated rule is a coin toss the user cannot predict,
 * and an unpredictable snap is worse than none.
 */
export function snapped(seconds: number, meter: Meter, snap: Snap): number {
  if (snap === 'off') return seconds;
  const beat = beatSeconds(meter);
  const bar = barSeconds(meter);
  if (snap === 'bar') return Math.round(seconds / bar) * bar;
  if (snap === 'beat') return Math.round(seconds / beat) * beat;

  const toBar = Math.round(seconds / bar) * bar;
  if (Math.abs(seconds - toBar) <= beat) return toBar;
  return Math.round(seconds / beat) * beat;
}

/* ── The metronome ───────────────────────────────────────────────────────── */

/**
 * Clicks per beat. `1/1` is one on each beat; `1/2` adds the off-beat.
 *
 * Written as fractions of a beat because that is what the panel says, and the
 * number underneath is how many clicks that means.
 */
export const DIVISIONS = [
  { id: '1/1', per: 1 },
  { id: '1/2', per: 2 },
  { id: '1/4', per: 4 },
  { id: '1/8', per: 8 },
] as const;

export type DivisionId = (typeof DIVISIONS)[number]['id'];

export function clicksPerBeat(division: DivisionId): number {
  return DIVISIONS.find((one) => one.id === division)?.per ?? 1;
}

export interface Click {
  /** Seconds on the session clock. */
  readonly at: number;
  /** The first beat of a bar, which is louder. */
  readonly downbeat: boolean;
  /** A whole beat rather than a subdivision of one. Also louder. */
  readonly onBeat: boolean;
}

/**
 * Every click from `from` up to but not including `to`.
 *
 * Half-open on purpose. Scheduling runs in windows — schedule the next half
 * second, come back, schedule the next — and a closed interval emits the click
 * on the boundary in both windows. Two clicks a few milliseconds apart is a
 * flam, and it is the classic bug in every metronome ever written.
 */
export function clicksIn(
  from: number,
  to: number,
  meter: Meter,
  division: DivisionId,
): Click[] {
  if (!(to > from)) return [];
  const per = clicksPerBeat(division);
  const step = beatSeconds(meter) / per;
  const inBar = sane(meter).beats * per;

  /* Counted in whole steps from zero rather than added up, because adding a
     step at a time accumulates float error — at 1/8 for four minutes that is
     enough drift to hear against the recording. */
  const first = Math.max(0, Math.ceil(from / step - 1e-9));
  const last = Math.ceil(to / step - 1e-9);

  const out: Click[] = [];
  for (let n = first; n < last; n += 1) {
    const at = n * step;
    if (at < from - 1e-9) continue;
    out.push({
      at,
      downbeat: n % inBar === 0,
      onBeat: n % per === 0,
    });
  }
  return out;
}

/* ── Counting in ─────────────────────────────────────────────────────────── */

export const COUNT_INS = [0, 1, 2] as const;
export type CountIn = (typeof COUNT_INS)[number];

/** How long the count runs before the take starts. */
export function countInSeconds(bars: CountIn, meter: Meter): number {
  return bars * barSeconds(meter);
}
