/**
 * Turning a hum into notes: where each one starts, how long it lasts, what
 * pitch it was, and how hard it was hummed.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 9 October 2026, about something Suno had launched: *"Wat oulik is
 * is dat mens die ritme van 'n liedjie met jou stem kan sing en in sit, en
 * dan kies jy net die instrument tipe."* Sing the rhythm of a song with your
 * voice, put it in, and then just pick the instrument.
 *
 * And on 22 October 2026, of this same feature: *"Gaan die Hum funksie na,
 * as daardie baie fyn, genuanseerd, en baie baie goed verfyn word … dan kan
 * dit ons selling point word."* So this file was gone through again with
 * the things a real hum does that a test tone does not.
 *
 * ── The rhythm lives in the energy ───────────────────────────────────────
 *
 * "Da da da" on one note is THREE notes, and a pitch track cannot see that:
 * the pitch never changes, so grouping frames by pitch gives one long note
 * and the rhythm — the whole point — is gone. So the onsets are found in the
 * loudness first (`onsetsIn`).
 *
 * ── And the melody lives in the pitch ────────────────────────────────────
 *
 * Which was the half the first version missed. People hum LEGATO: "mmm"
 * gliding from one note to the next with no breath and no dip in loudness
 * between them. Found by loudness alone, a four-note phrase hummed that way
 * is one note, pitched at whichever of the four the median landed on. So a
 * note is also split where the pitch moves to a new place and STAYS there
 * (`splitByPitch`) — with three guards, each of which is a thing a voice
 * does that is not a new note:
 *
 *   · vibrato swings a semitone either way five or six times a second. The
 *     pitch that is compared is averaged over one swing, which cancels it;
 *   · a scoop into a note, or a fall off the end of one, moves and never
 *     settles. A split needs the new pitch to hold for seventy milliseconds;
 *   · a split needs the move to be three quarters of a semitone. Less is
 *     intonation, and that is dealt with below, not by inventing a note.
 *
 * ── The pitch itself ─────────────────────────────────────────────────────
 *
 * `lib/humpitch.ts` — probabilistic YIN with a Viterbi path, which is the
 * method made for exactly this signal and the one that keeps an "mmm" with
 * almost no harmonics in the right octave. Each note's pitch is the median
 * of its steady frames, weighted by how sure each was, with the attack and
 * any glide left out — the median of a vibrato is its centre.
 *
 * ── Nobody hums at A = 440 ───────────────────────────────────────────────
 *
 * A person humming on their own is often a third of a semitone sharp or flat
 * throughout, and drifts as the phrase goes on. Rounding each note on its
 * own then splits the melody: the notes a little more out than the rest
 * round the other way, and a tune comes back with two wrong notes in it
 * that were sung perfectly well relative to each other. So the singer's own
 * tuning is measured from the notes around each one (`localTuning`) and taken
 * out before rounding. It is relative pitch that a melody is made of.
 *
 * ── Why the flux is in the log domain ────────────────────────────────────
 *
 * Because a person humming does not hum evenly. The difference between two
 * quiet notes is a tiny number of units of energy and the difference between
 * two loud ones is a large number, so a plain energy difference finds every
 * onset in the loud bar and none in the quiet one. A ratio does not care how
 * loud the passage is, and a difference of logs is a ratio. The threshold is
 * a moving median of that flux, for the same reason: what counts as a jump
 * in THIS part of THIS recording.
 */

import { HOP_S } from './tune';
import { medianVoiced, trackHum, type PitchFrames } from './humpitch';

/** Shorter than this is a click or a consonant, not a note. */
export const MIN_NOTE_S = 0.07;

/**
 * Two onsets closer together than this are one onset.
 *
 * Ninety milliseconds is about 166 notes a minute in straight eighths, which
 * is faster than anybody hums and slower than the double-trigger a single
 * plosive produces — the "t" of "ta" and the vowel after it are two energy
 * jumps forty milliseconds apart, and they are one note.
 */
export const MIN_GAP_S = 0.09;

/** Below this a frame's pitch is not trusted for the note's pitch. */
const SURE = 0.3;

/** How much louder than the local median a frame must jump to be an onset. */
const JUMP = 0.22;

/** Half-width of the window the moving median is taken over. */
const LOCAL_S = 0.35;

/** A move this far, in semitones, held, is a new note. */
export const NEW_NOTE = 0.75;
/** And held this long, in seconds. */
const HOLD_S = 0.07;
/** Seconds either side the pitch is averaged over to cancel a vibrato. */
const SWING_S = 0.084;

export interface HumNote {
  /**
   * The note, as a MIDI number, or `null` when there was no pitch in it.
   *
   * `null` is not a failure. A tap on a table, a tongue click, a "ts" — all
   * of them are rhythm with no pitch, and a drum kit wants exactly those.
   */
  readonly midi: number | null;
  readonly from: number;
  readonly to: number;
  /** How hard it was hummed against the rest of the take, 0–1. */
  readonly loud: number;
  /**
   * The pitch as sung, in fractional semitones, with the singer's own
   * tuning taken out. `midi` is this rounded. Kept so the editor can show how
   * close a call it was, and so keeping to a key can go the way the voice
   * was leaning rather than guess.
   */
  readonly exact?: number;
  /** How sure the pitch reading was, 0–1. */
  readonly sure?: number;
}

/**
 * Loudness per frame, on the same twelve-millisecond grid as the pitch track.
 *
 * The same grid on purpose: one frame index then reads both, and a note found
 * in the energy can be pitched from the pitch track without any resampling
 * between the two. `hooks.ts` has an envelope of its own at a tenth of a
 * second, which is right for finding the loud half of a song and useless for
 * a rhythm — eight notes a second would be one reading.
 */
export function energyIn(samples: Float32Array, rate: number): Float32Array {
  const hop = Math.max(1, Math.round(HOP_S * rate));
  /* A window wider than the hop, so the readings overlap. Without the
     overlap a note landing between two frames is split across both and its
     attack is halved, which is the difference between an onset and nothing. */
  const window = hop * 2;
  const frames = Math.max(0, Math.floor(samples.length / hop));
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    const at = i * hop;
    const end = Math.min(samples.length, at + window);
    let sum = 0;
    for (let j = at; j < end; j += 1) sum += samples[j] * samples[j];
    out[i] = end > at ? Math.sqrt(sum / (end - at)) : 0;
  }
  return out;
}

/** A moving median, which is the local idea of "normal" around each frame. */
function movingMedian(values: Float32Array, half: number): Float32Array {
  const out = new Float32Array(values.length);
  const window: number[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const from = Math.max(0, i - half);
    const to = Math.min(values.length, i + half + 1);
    window.length = 0;
    for (let j = from; j < to; j += 1) window.push(values[j]);
    window.sort((a, b) => a - b);
    out[i] = window[window.length >> 1] ?? 0;
  }
  return out;
}

/**
 * Where the notes begin, in seconds.
 *
 * Exported so a check can drive it on its own, and because the drum voice
 * uses nothing else: a kit does not care what pitch anybody hummed.
 */
export function onsetsIn(energy: Float32Array): number[] {
  const eps = 1e-6;
  /* The rise in loudness, as a ratio rather than a difference — see the note
     at the top about quiet bars. Only the rises: a note ending is not a note
     starting, and keeping the falls would double every onset. */
  const flux = new Float32Array(energy.length);
  for (let i = 1; i < energy.length; i += 1) {
    flux[i] = Math.max(0, Math.log(energy[i] + eps) - Math.log(energy[i - 1] + eps));
  }

  const local = movingMedian(flux, Math.round(LOCAL_S / HOP_S));
  const gap = Math.round(MIN_GAP_S / HOP_S);

  const out: number[] = [];
  let last = -gap - 1;
  for (let i = 1; i < flux.length - 1; i += 1) {
    const bar = local[i] + JUMP;
    if (flux[i] < bar) continue;
    /* A local maximum, so the shoulder of a jump is not a second onset. */
    if (flux[i] < flux[i - 1] || flux[i] < flux[i + 1]) continue;
    if (i - last <= gap) continue;
    /* And there has to be something there. A ratio is happy to call the step
       from silence to slightly-less-silence a jump. */
    if (energy[i] < 0.005) continue;
    last = i;
    out.push(i * HOP_S);
  }
  return out;
}

/* ── Small sums ─────────────────────────────────────────────────────────── */

function medianOf(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

/** The median, with each value counted by its weight. */
function weightedMedian(values: readonly number[], weights: readonly number[]): number {
  const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  const total = weights.reduce((sum, one) => sum + one, 0);
  let run = 0;
  for (const i of order) {
    run += weights[i];
    if (run >= total / 2) return values[i];
  }
  return values[order[order.length - 1]];
}

/**
 * The pitch averaged over one vibrato swing either side, voiced frames only.
 *
 * What a note change is measured against. A vibrato goes up and comes back
 * inside this window, so its average is its centre; a new note goes up and
 * stays, so its average follows it.
 */
function swingOf(midi: Float32Array, half: number): Float32Array {
  const out = new Float32Array(midi.length).fill(Number.NaN);
  for (let i = 0; i < midi.length; i += 1) {
    if (!Number.isFinite(midi[i])) continue;
    let sum = 0;
    let n = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(midi.length - 1, i + half); j += 1) {
      if (Number.isFinite(midi[j])) { sum += midi[j]; n += 1; }
    }
    out[i] = sum / n;
  }
  return out;
}

/** The first place from `start` where the averaged pitch holds still, and where. */
function steadyFrom(start: number, end: number, swing: Float32Array, hold: number): { at: number; pitch: number } | null {
  for (let j = Math.max(0, start); j + hold <= end; j += 1) {
    let low = Infinity;
    let high = -Infinity;
    let whole = true;
    for (let k = j; k < j + hold; k += 1) {
      const v = swing[k];
      if (!Number.isFinite(v)) { whole = false; break; }
      low = Math.min(low, v);
      high = Math.max(high, v);
    }
    if (whole && high - low < 0.35) {
      const window: number[] = [];
      for (let k = j; k < j + hold; k += 1) window.push(swing[k]);
      return { at: j, pitch: medianOf(window) };
    }
  }
  return null;
}

/**
 * Where, inside one stretch of hum, the melody moved to a new note.
 *
 * Returns frame indices to cut at. See the note at the top for the three
 * guards; `hold` is how long the new pitch has to stay, and the cut goes
 * where the voice crossed half-way between the two notes, which is where a
 * listener hears the change.
 */
export function splitByPitch(
  from: number,
  to: number,
  smooth: Float32Array,
  swing: Float32Array,
): number[] {
  const hold = Math.max(3, Math.round(HOLD_S / HOP_S));
  const shortest = Math.max(2, Math.round(MIN_NOTE_S / HOP_S));
  const first = steadyFrom(from, to, swing, hold);
  if (!first) return [];
  let centre = first.pitch;
  const cuts: number[] = [];
  let away = 0;
  for (let i = first.at; i < to; i += 1) {
    const v = swing[i];
    if (!Number.isFinite(v)) continue;
    if (Math.abs(v - centre) <= NEW_NOTE) {
      away = 0;
      /* Followed slowly, so a note that drifts in tuning while it is held
         is still the same note. */
      centre += 0.06 * (v - centre);
      continue;
    }
    away += 1;
    if (away < hold) continue;
    const left = i - away + 1;
    const settle = steadyFrom(left, to, swing, hold);
    if (!settle || Math.abs(settle.pitch - centre) <= NEW_NOTE) {
      /* It moved and never settled: a fall off the end of the note, or a
         scoop that came back. Not a note. */
      away = 0;
      continue;
    }
    const halfway = (centre + settle.pitch) / 2;
    const rising = settle.pitch > centre;
    let cut = settle.at;
    for (let k = Math.max(from + 1, left - hold * 2); k <= settle.at; k += 1) {
      const s = smooth[k];
      if (Number.isFinite(s) && (rising ? s >= halfway : s <= halfway)) { cut = k; break; }
    }
    const previous = cuts.length ? cuts[cuts.length - 1] : from;
    if (cut - previous >= shortest && to - cut >= shortest) cuts.push(cut);
    centre = settle.pitch;
    away = 0;
    i = Math.max(i, settle.at);
  }
  return cuts;
}

/**
 * The singer's own tuning around each note, in semitones, −0.5 to 0.5.
 *
 * For every note, how far off the twelve-note grid it and its neighbours
 * (four either side) sit, averaged on a circle — 0.45 and −0.55 are the same
 * tuning, one rounded up and one down, and a straight average of the two
 * would be nonsense. Only used where the neighbours agree (the length of the
 * averaged arrow); where they do not, the note is rounded as it was sung.
 */
export function localTuning(notes: readonly { readonly exact: number; readonly weight: number }[]): number[] {
  return notes.map((_, n) => {
    let x = 0;
    let y = 0;
    let total = 0;
    let count = 0;
    for (let m = Math.max(0, n - 4); m <= Math.min(notes.length - 1, n + 4); m += 1) {
      const off = notes[m].exact - Math.round(notes[m].exact);
      x += notes[m].weight * Math.cos(2 * Math.PI * off);
      y += notes[m].weight * Math.sin(2 * Math.PI * off);
      total += notes[m].weight;
      count += 1;
    }
    if (count < 3 || total <= 0) return 0;
    const agree = Math.hypot(x, y) / total;
    if (agree < 0.6) return 0;
    return Math.atan2(y, x) / (2 * Math.PI);
  });
}

/** What was heard in a take, before anything is done to it. */
export interface Heard {
  readonly notes: HumNote[];
  /** The pitch frame by frame, which the note editor draws under the notes. */
  readonly pitch: PitchFrames;
  /** The singer's tuning across the take against A = 440, in cents. */
  readonly tuningCents: number;
}

/**
 * The hum, as notes, with what they were read from.
 *
 * The onsets give the starts. A note runs to the next onset, or to where it
 * has been quiet for long enough, whichever comes first — so a held note is
 * held and a short one is short, which is the whole rhythm. Inside that,
 * the melody can still move (`splitByPitch`).
 */
export function heardIn(samples: Float32Array, rate: number): Heard {
  const energy = energyIn(samples, rate);
  const pitch = trackHum(samples, rate);
  const frames = energy.length;
  const smooth = medianVoiced(pitch.midi, 2);
  const swing = swingOf(smooth, Math.round(SWING_S / HOP_S));
  const gap = Math.round(MIN_GAP_S / HOP_S);

  /* The onsets in the loudness, and the places the VOICE comes back after a
     break without the loudness jumping — a breath taken quietly, or a hum
     that dips into "hhh" and out again. The loudness has to have dipped in
     the break, or a frame the tracker was unsure of would split a note. */
  const starts = onsetsIn(energy).map((one) => Math.round(one / HOP_S));
  let silent = 99;
  let lowest = Infinity;
  for (let i = 0; i < Math.min(frames, smooth.length); i += 1) {
    if (Number.isFinite(smooth[i])) {
      let after = 0;
      for (let k = i; k < Math.min(frames, i + 6); k += 1) after = Math.max(after, energy[k]);
      if (silent >= 7 && energy[i] >= 0.005 && lowest < after * 0.6
        && !starts.some((one) => Math.abs(one - i) <= gap)) starts.push(i);
      silent = 0;
      lowest = Infinity;
    } else {
      silent += 1;
      lowest = Math.min(lowest, energy[i]);
    }
  }
  starts.sort((a, b) => a - b);
  if (!starts.length) return { notes: [], pitch, tuningCents: 0 };

  interface Raw { from: number; to: number; exact: number | null; sure: number; peak: number }
  const raws: Raw[] = [];
  const shortest = Math.round(MIN_NOTE_S / HOP_S);
  for (let n = 0; n < starts.length; n += 1) {
    const first = starts[n];
    const limit = n + 1 < starts.length ? starts[n + 1] : frames;

    /* Peak loudness in the note, and where it goes quiet. "Quiet" is a
       fraction of this note's own peak rather than an absolute, for the
       same reason the flux is a ratio. Three frames, so one dipped frame
       inside a note does not end it. */
    let peak = 0;
    for (let i = first; i < limit; i += 1) peak = Math.max(peak, energy[i]);
    const floor = Math.max(0.004, peak * 0.22);
    let end = limit;
    let quiet = 0;
    for (let i = first + 1; i < limit; i += 1) {
      quiet = energy[i] < floor ? quiet + 1 : 0;
      if (quiet >= 3) { end = i - 2; break; }
    }

    const cuts = [first, ...splitByPitch(first, end, smooth, swing), end];
    for (let c = 0; c + 1 < cuts.length; c += 1) {
      const a = cuts[c];
      let b = cuts[c + 1];
      /* The pitch, from the steady part. After an onset the first forty
         milliseconds are a consonant and a scoop, and their readings are the
         ones that put a note a fourth away from where it was sung. */
      const skip = c === 0 && b - a > 12 ? Math.round(0.04 / HOP_S) : 0;
      const values: number[] = [];
      const weights: number[] = [];
      let lastVoiced = -1;
      for (let i = a; i < b && i < smooth.length; i += 1) {
        if (!Number.isFinite(smooth[i])) continue;
        lastVoiced = i;
        if (i < a + skip || pitch.sure[i] < SURE) continue;
        values.push(smooth[i]);
        weights.push(pitch.sure[i]);
      }
      let exact: number | null = null;
      let sure = 0;
      if (values.length >= 3) {
        /* Twice: the plain median says roughly where the note is, then the
           readings more than most of a semitone away from it — a glide in,
           a fall out — are dropped and the rest are weighed by how sure
           each one was. */
        const rough = medianOf(values);
        const keepV: number[] = [];
        const keepW: number[] = [];
        values.forEach((one, k) => { if (Math.abs(one - rough) < 0.8) { keepV.push(one); keepW.push(weights[k]); } });
        exact = weightedMedian(keepV, keepW);
        sure = keepW.reduce((sum, one) => sum + one, 0) / keepW.length;
        /* A sung note ends where the voice does. Breath after it is not the
           note held longer. */
        if (c + 2 === cuts.length && lastVoiced >= 0 && b - lastVoiced > 5) {
          b = Math.max(a + shortest, lastVoiced + 1);
        }
      }
      let notePeak = 0;
      for (let i = a; i < b; i += 1) notePeak = Math.max(notePeak, energy[i] ?? 0);
      raws.push({ from: a * HOP_S, to: Math.max(a * HOP_S + MIN_NOTE_S, b * HOP_S), exact, sure, peak: notePeak });
    }
  }

  /* The singer's tuning, taken out before anything is rounded. */
  const pitched = raws.filter((one) => one.exact !== null);
  const offsets = localTuning(pitched.map((one) => ({ exact: one.exact as number, weight: one.to - one.from })));
  /* And across the whole take, for the editor to say. */
  let ax = 0;
  let ay = 0;
  for (const one of pitched) {
    const off = (one.exact as number) - Math.round(one.exact as number);
    ax += (one.to - one.from) * Math.cos(2 * Math.PI * off);
    ay += (one.to - one.from) * Math.sin(2 * Math.PI * off);
  }
  const across = pitched.length ? Math.atan2(ay, ax) / (2 * Math.PI) : 0;
  const offsetOf = new Map<Raw, number>();
  pitched.forEach((one, k) => offsetOf.set(one, offsets[k]));

  /* How hard each note was hummed, against the loudest note in the take
     rather than against full scale: a hum recorded quietly is still a hum
     with accents in it, and those are what the instrument should play. */
  const loudest = raws.reduce((most, one) => Math.max(most, one.peak), 1e-6);
  const loudOf = (peak: number): number => {
    const below = 20 * Math.log10(Math.max(1e-6, peak) / loudest);
    return Math.max(0.1, Math.min(1, 0.25 + 0.75 * (1 + below / 30)));
  };

  const notes: HumNote[] = [];
  for (const one of raws) {
    if (one.to - one.from < MIN_NOTE_S - 1e-9) continue;
    if (one.exact === null) {
      notes.push({ midi: null, from: one.from, to: one.to, loud: loudOf(one.peak) });
      continue;
    }
    const exact = one.exact - (offsetOf.get(one) ?? 0);
    const midi = Math.round(exact);
    const before = notes[notes.length - 1];
    /* A cut that came out on the same note both sides is a scoop that
       settled where it started: one note. */
    if (before && before.midi === midi && Math.abs(before.to - one.from) < 1e-6 && one.from - before.from > 0) {
      notes[notes.length - 1] = { ...before, to: one.to, loud: Math.max(before.loud, loudOf(one.peak)) };
      continue;
    }
    notes.push({
      midi,
      from: one.from,
      to: one.to,
      loud: loudOf(one.peak),
      exact: Math.round(exact * 100) / 100,
      sure: Math.round(one.sure * 100) / 100,
    });
  }
  return { notes, pitch, tuningCents: Math.round(across * 100) };
}

/** The hum, as notes. */
export function notesIn(samples: Float32Array, rate: number): HumNote[] {
  return heardIn(samples, rate).notes;
}

/* ── The key ───────────────────────────────────────────────────────────── */

/* Krumhansl and Kessler's key profiles: how strongly each of the twelve
   notes says "this key" to a listener, measured in the 1980s and still the
   standard way to read a key from a melody. */
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

export interface HeardKey {
  /** 0 is C. */
  readonly root: number;
  readonly minor: boolean;
  /** How far ahead of the next best it is, 0–1. Low means "could be either". */
  readonly sure: number;
}

/**
 * The key the hum is in, from how long each note was held.
 *
 * Null for fewer than five pitched notes: four notes fit a dozen keys, and a
 * confident answer from them is a guess with a number on it.
 */
export function keyOf(notes: readonly HumNote[]): HeardKey | null {
  const weight = new Array<number>(12).fill(0);
  let count = 0;
  for (const one of notes) {
    if (one.midi === null) continue;
    weight[((one.midi % 12) + 12) % 12] += (one.to - one.from) * (0.5 + one.loud);
    count += 1;
  }
  if (count < 5) return null;
  const correlate = (profile: readonly number[], root: number): number => {
    const mx = weight.reduce((s, v) => s + v, 0) / 12;
    const my = profile.reduce((s, v) => s + v, 0) / 12;
    let top = 0;
    let xx = 0;
    let yy = 0;
    for (let i = 0; i < 12; i += 1) {
      const x = weight[(i + root) % 12] - mx;
      const y = profile[i] - my;
      top += x * y;
      xx += x * x;
      yy += y * y;
    }
    return top / Math.sqrt(xx * yy || 1);
  };
  const all: { root: number; minor: boolean; r: number }[] = [];
  for (let root = 0; root < 12; root += 1) {
    all.push({ root, minor: false, r: correlate(MAJOR, root) });
    all.push({ root, minor: true, r: correlate(MINOR, root) });
  }
  all.sort((a, b) => b.r - a.r);
  /* The relative major and minor share every note, so the runner-up that
     matters is the best one that is not the same notes. */
  const best = all[0];
  const sameNotes = (one: { root: number; minor: boolean }): boolean =>
    one.minor !== best.minor && ((best.minor ? best.root + 3 : best.root + 9) % 12) === one.root;
  const next = all.find((one, i) => i > 0 && !sameNotes(one)) ?? all[1];
  return { root: best.root, minor: best.minor, sure: Math.max(0, Math.min(1, (best.r - next.r) * 4)) };
}

/** The notes of a key, as twelve-note classes, 0 = C. */
export function scaleNotes(root: number, minor: boolean): number[] {
  const steps = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  return steps.map((step) => (((root + step) % 12) + 12) % 12);
}

/**
 * Every pitched note moved onto the key, the way the voice was leaning.
 *
 * A note outside the key has a neighbour in it a semitone either side. The
 * one taken is the one nearer to what was actually sung (`exact`): a note
 * sung forty cents sharp of an F# in C major is an G that was reached for,
 * not an F that was overshot. Without `exact`, it goes to whichever is
 * nearer the note before it, which is how a melody usually moves.
 */
export function inKey(notes: readonly HumNote[], root: number, minor: boolean): HumNote[] {
  const allowed = new Set(scaleNotes(root, minor));
  const inside = (midi: number): boolean => allowed.has(((midi % 12) + 12) % 12);
  let before: number | null = null;
  return notes.map((one) => {
    if (one.midi === null) return one;
    let midi = one.midi;
    if (!inside(midi)) {
      const up = midi + 1;
      const down = midi - 1;
      const options = [up, down].filter(inside);
      const aim = one.exact ?? before ?? midi;
      midi = options.reduce((best, opt) => (Math.abs(opt - aim) < Math.abs(best - aim) ? opt : best), options[0] ?? midi);
    }
    before = midi;
    return midi === one.midi ? one : { ...one, midi };
  });
}

/* ── The grid ──────────────────────────────────────────────────────────── */

export type GridId = '1/4' | '1/8' | '1/16' | '1/8T' | '1/16T';

/** The grids offered, as fractions of a beat. */
export const GRIDS: readonly { readonly id: GridId; readonly beat: number }[] = [
  { id: '1/4', beat: 1 },
  { id: '1/8', beat: 1 / 2 },
  { id: '1/8T', beat: 1 / 3 },
  { id: '1/16', beat: 1 / 4 },
  { id: '1/16T', beat: 1 / 6 },
];

export interface Snapping {
  /** Which grid. Sixteenths unless asked. */
  readonly grid?: GridId;
  /** 0–1: how far each note is moved towards the grid. 1 is all the way. */
  readonly strength?: number;
  /**
   * Where the take starts on the session clock, in seconds.
   *
   * The grid is the SONG's grid, not the take's: a take that starts half a
   * beat into a bar, snapped to its own start, lands every note half a beat
   * off the click it was sung against.
   */
  readonly offset?: number;
}

/**
 * Put the notes on the grid.
 *
 * The owner's own instinct about this feature, and the right one: a hummed
 * rhythm is never quite in time, and the point is to get something usable
 * rather than something faithful. Sixteenths by default, because eighths
 * flatten a swung or dotted figure into a march; triplets for a part that
 * is in three; and a strength under one for a part that should sit closer
 * to the click without losing its feel.
 *
 * Lengths are snapped too, and floored at one division — a note cannot
 * become zero long, which is the one outcome that would silently delete it.
 * Two notes that land on the same line are not stacked: the later one moves
 * to the next line, because a hum is one note at a time.
 */
export function snapTo(notes: readonly HumNote[], bpm: number, how: Snapping = {}): HumNote[] {
  if (!Number.isFinite(bpm) || bpm <= 0) return [...notes];
  const beat = GRIDS.find((one) => one.id === (how.grid ?? '1/16'))?.beat ?? 1 / 4;
  const division = (60 / bpm) * beat;
  const strength = Math.max(0, Math.min(1, how.strength ?? 1));
  const offset = how.offset ?? 0;
  const sorted = [...notes].sort((a, b) => a.from - b.from);
  const out: HumNote[] = [];
  for (const one of sorted) {
    const onGrid = Math.round((one.from + offset) / division) * division - offset;
    let from = one.from + strength * (onGrid - one.from);
    const length = one.to - one.from;
    const steps = Math.max(1, Math.round(length / division));
    let to = from + length + strength * (steps * division - length);
    const before = out[out.length - 1];
    if (before && from <= before.from + 1e-6) {
      from = before.from + division * Math.max(0.25, strength);
      to = Math.max(to, from + division * Math.max(0.25, strength));
    }
    if (before && before.to > from) out[out.length - 1] = { ...before, to: from };
    to = Math.max(to, from + Math.min(division, length));
    out.push({ ...one, from, to });
  }
  return out;
}
