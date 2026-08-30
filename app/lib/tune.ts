'use client';

/**
 * Nudging a take onto the note.
 *
 * The question this answers was asked plainly: can the voice be improved after
 * it is recorded, smoothed out, made not to sound out of tune? ElevenLabs does
 * not do it — their audio isolation cleans the room and their speech-to-speech
 * replaces the voice with somebody else's, which defeats the point of singing
 * it yourself. So it is done here, on the samples, with the detector the booth
 * already uses to show the note.
 *
 * What it does, exactly: it measures the pitch about eighty times a second,
 * works out how far each moment is from the nearest note the song can use, and
 * moves it part of the way there. Three things keep it from sounding like a
 * robot, which is what everybody actually complains about when they complain
 * about tuning:
 *
 *   · **Strength.** It removes a fraction of the error, not all of it. At full
 *     strength this is the Auto-Tune sound. At a third of it, nobody can tell
 *     it was done, and the flat notes are no longer flat.
 *   · **Glide.** The correction is smoothed over about eighty milliseconds, so
 *     it cannot chase vibrato or a deliberate scoop into a note. Those are
 *     singing; a tuner that flattens them takes the person out of the take.
 *   · **A limit.** Nothing is moved more than a semitone. A note that is
 *     further out than that is the wrong note, and quietly making it a
 *     different note is not a correction, it is a lie about what was sung.
 *
 * The method is time-domain PSOLA: the signal is cut at its own pitch periods,
 * and those pieces are laid back down closer together or further apart. It
 * changes pitch without changing length or timbre, which is why it has been
 * the standard way to do this for thirty years. It is not magic and it should
 * not be sold as such: it fixes intonation, and intonation is only one of the
 * reasons a voice sounds bad.
 */

import { detectPitch } from './pitch';

/** How often the pitch is measured. Twelve milliseconds is about 80 times a second. */
const HOP_S = 0.012;
/** The rate the first, rough search runs at. A voice fits under 2 kHz easily. */
const COARSE_HZ = 4000;
/** The furthest anything is moved, in semitones. Past this it is a wrong note. */
const MAX_PULL = 1;
const DEFAULT_GLIDE_MS = 80;
/** A jump this big, in semitones, is a new note rather than the same one moving. */
const NEW_NOTE = 1;
/** The period used where there is no pitch, so unvoiced sound passes through. */
const UNVOICED_HZ = 200;

export interface Tuning {
  /** 0–1. How much of each note's error to take out. */
  readonly strength: number;
  /** How long the correction takes to arrive. Longer keeps vibrato and slides. */
  readonly glideMs?: number;
  /** Pitch classes the song uses, 0 = C. Undefined means any semitone. */
  readonly scale?: readonly number[];
}

export interface Tuned {
  readonly audio: Float32Array;
  /** How much of the take had a pitch in it at all. */
  readonly voicedSeconds: number;
  /** How much of that was already inside ten cents. 0–1. */
  readonly alreadyInTune: number;
  /** The average distance from the note, before anything was done, in cents. */
  readonly averageCents: number;
  /** The average correction actually applied, in cents. */
  readonly movedCents: number;
  /** The single worst moment, in cents. */
  readonly worstCents: number;
}

/**
 * The pitch classes of a key, from whatever the track calls itself.
 *
 * Worth doing rather than always snapping to the nearest semitone: a voice
 * that lands between two notes gets pulled to whichever is closer, and half
 * the time the closer one is not in the song. Null when the key cannot be
 * read, and then every semitone is allowed, which is the safe answer.
 */
export function scaleOf(key: string): number[] | null {
  const letters: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const text = key.trim().toLowerCase();
  const named = /^([a-g])\s*(#|s|♯|b|♭)?/.exec(text);
  if (!named) return null;
  let root = letters[named[1]];
  if (named[2] === '#' || named[2] === 's' || named[2] === '♯') root += 1;
  if (named[2] === 'b' || named[2] === '♭') root -= 1;
  root = ((root % 12) + 12) % 12;

  const minor = /\bmin|\bmineur|\bmol|\bm\b/.test(text) && !/\bmaj/.test(text);
  const steps = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  return steps.map((step) => (root + step) % 12);
}

/**
 * The signal at a lower rate, filtered properly on the way down.
 *
 * The first version averaged each block of samples, which is a filter but a
 * poor one: a voice has harmonics well above the new Nyquist, and the ones
 * that survive a block average fold back down as frequencies that are not
 * harmonics of anything. A Hann-weighted filter twice the length of the step
 * puts them far enough down to leave the reading alone.
 *
 * Worth saying plainly, because it was tried in the belief that it would fix
 * something else: this is not what cured the octave errors on a vibrato. It
 * changed almost nothing there. `refine` did that.
 */
function downsample(samples: Float32Array, factor: number): Float32Array {
  if (factor <= 1) return samples;
  const half = factor;
  const taps = new Float32Array(half * 2 + 1);
  let total = 0;
  for (let i = 0; i < taps.length; i += 1) {
    taps[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (taps.length - 1));
    total += taps[i];
  }
  for (let i = 0; i < taps.length; i += 1) taps[i] /= total || 1;

  const out = new Float32Array(Math.floor(samples.length / factor));
  for (let i = 0; i < out.length; i += 1) {
    const centre = i * factor;
    let sum = 0;
    for (let j = 0; j < taps.length; j += 1) {
      const at = centre + j - half;
      if (at < 0 || at >= samples.length) continue;
      sum += samples[at] * taps[j];
    }
    out[i] = sum;
  }
  return out;
}

interface Local {
  readonly hz: number;
  readonly score: number;
}

/** The best match near one guessed frequency, measured at the full rate. */
function around(samples: Float32Array, at: number, rate: number, guessHz: number, spread: number): Local | null {
  const guessLag = rate / guessHz;
  const low = Math.max(2, Math.floor(guessLag - spread));
  const high = Math.ceil(guessLag + spread);
  const span = Math.max(512, Math.round(guessLag * 3));
  const n = Math.min(span, samples.length - at - high - 1);
  if (n < 64) return null;

  const scores = new Float32Array(high + 2);
  let best = -1;
  let bestLag = -1;
  for (let lag = low; lag <= high; lag += 1) {
    let dot = 0;
    let here = 0;
    let there = 0;
    for (let i = 0; i < n; i += 1) {
      const a = samples[at + i];
      const b = samples[at + i + lag];
      dot += a * b;
      here += a * a;
      there += b * b;
    }
    const score = dot / (Math.sqrt(here * there) + 1e-9);
    scores[lag] = score;
    if (score > best) {
      best = score;
      bestLag = lag;
    }
  }
  if (bestLag < 0) return null;

  // Only interpolate a peak that has two neighbours inside the search.
  if (bestLag <= low || bestLag >= high) return { hz: rate / bestLag, score: best };
  const before = scores[bestLag - 1];
  const peak = scores[bestLag];
  const after = scores[bestLag + 1];
  const shift = (0.5 * (before - after)) / (before - 2 * peak + after || 1);
  const lag = bestLag + (Number.isFinite(shift) ? Math.max(-1, Math.min(1, shift)) : 0);
  return { hz: rate / lag, score: best };
}

/**
 * The rough reading measured properly, and its octave settled.
 *
 * The first pass runs at 4 kHz because searching every lag is the expensive
 * part and at 4 kHz there are twelve times fewer of them. Two things follow
 * from that. One lag step at 4 kHz is nearly two hundred cents near A4, so the
 * answer has to be re-measured at the full rate to be worth anything. And the
 * rough pass cannot be trusted about which octave it found: near 430 Hz the
 * true period falls between two lags at 4 kHz and matches neither well, while
 * the period twice as long lands almost exactly on one and wins. Tested on a
 * held note with an ordinary singer's vibrato, that read the bottom of every
 * cycle an octave down — and a target note that jumps an octave is a tuner
 * that fights the singer.
 *
 * So both octaves are measured at the full rate, where the scores mean
 * something, and the higher one is taken unless it is clearly worse.
 */
function refine(samples: Float32Array, at: number, rate: number, guessHz: number, spread: number): number {
  const here = around(samples, at, rate, guessHz, spread);
  if (!here) return guessHz;
  const octaveUp = around(samples, at, rate, guessHz * 2, Math.max(1, spread / 2));
  if (octaveUp && octaveUp.score >= here.score * 0.93) return octaveUp.hz;
  return here.hz;
}

/** The pitch of every frame, in hertz, and zero where there is no pitch. */
function track(samples: Float32Array, rate: number, hop: number): Float32Array {
  const factor = Math.max(1, Math.round(rate / COARSE_HZ));
  const small = downsample(samples, factor);
  const smallRate = rate / factor;
  const window = Math.max(192, Math.round(0.048 * smallRate));
  const frames = Math.max(0, Math.ceil(samples.length / hop));
  const f0 = new Float32Array(frames);

  for (let i = 0; i < frames; i += 1) {
    const at = i * hop;
    const smallAt = Math.floor(at / factor);
    if (smallAt + window > small.length) break;
    const coarse = detectPitch(small.subarray(smallAt, smallAt + window), smallRate);
    if (!coarse) continue;
    f0[i] = refine(samples, at, rate, coarse.hz, factor);
  }

  // A three-frame median, because one wrong frame in a held note is a click.
  const smoothed = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    const a = f0[Math.max(0, i - 1)];
    const b = f0[i];
    const c = f0[Math.min(frames - 1, i + 1)];
    smoothed[i] = Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
  }
  return smoothed;
}

/**
 * Which note each moment is *meant* to be, decided a note at a time.
 *
 * This cannot be decided instant by instant, and getting that wrong is the
 * whole difference between a tuner that helps and one that makes things worse.
 * A singer with a wide vibrato crosses the halfway line to the note below
 * several times a second; asking "which note is nearest, right now" follows
 * them down there and pulls. Tested: a note sung thirty cents flat with a
 * sixty cent vibrato came back *five cents flatter* than it went in.
 *
 * So the pitch track is cut into notes — a gap, or a jump of more than a
 * semitone, starts a new one — and the middle of each note decides what the
 * whole note is aiming at. Vibrato then moves around a target that does not
 * move, which is what vibrato is.
 */
function notesOf(midi: Float32Array, scale?: readonly number[]): Float32Array {
  const target = new Float32Array(midi.length);
  let from = -1;
  let running = 0;

  const settle = (to: number): void => {
    if (from < 0) return;
    const values: number[] = [];
    for (let j = from; j < to; j += 1) values.push(midi[j]);
    values.sort((a, b) => a - b);
    const note = snap(values[values.length >> 1], scale);
    for (let j = from; j < to; j += 1) target[j] = note;
    from = -1;
  };

  for (let i = 0; i < midi.length; i += 1) {
    if (!midi[i]) {
      settle(i);
      continue;
    }
    if (from < 0) {
      from = i;
      running = midi[i];
    } else if (Math.abs(midi[i] - running) > NEW_NOTE) {
      settle(i);
      from = i;
      running = midi[i];
    } else {
      running = running * 0.9 + midi[i] * 0.1;
    }
  }
  settle(midi.length);
  return target;
}

/** The note this moment should be, as a midi number. */
function snap(midi: number, scale?: readonly number[]): number {
  if (!scale || !scale.length) return Math.round(midi);
  let best = Math.round(midi);
  let closest = Infinity;
  for (let candidate = Math.floor(midi) - 1; candidate <= Math.ceil(midi) + 1; candidate += 1) {
    if (scale.indexOf(((candidate % 12) + 12) % 12) < 0) continue;
    const away = Math.abs(candidate - midi);
    if (away < closest) {
      closest = away;
      best = candidate;
    }
  }
  return best;
}

export function tune(samples: Float32Array, rate: number, tuning: Tuning): Tuned {
  const strength = Math.max(0, Math.min(1, tuning.strength));
  const glideMs = Math.max(5, tuning.glideMs ?? DEFAULT_GLIDE_MS);
  const hop = Math.max(1, Math.round(HOP_S * rate));
  const f0 = track(samples, rate, hop);
  const frames = f0.length;

  const midi = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) midi[i] = f0[i] > 0 ? 69 + 12 * Math.log2(f0[i] / 440) : 0;

  const target = notesOf(midi, tuning.scale);

  const cents = new Float32Array(frames);
  const alpha = Math.exp(-((hop / rate) * 1000) / glideMs);
  let smooth = 0;
  let voiced = 0;
  let inTune = 0;
  let errorSum = 0;
  let movedSum = 0;
  let worst = 0;

  for (let i = 0; i < frames; i += 1) {
    let want = 0;
    if (f0[i] > 0) {
      const error = target[i] - midi[i];
      const pull = Math.max(-MAX_PULL, Math.min(MAX_PULL, error)) * strength;
      want = pull * 100;
      voiced += 1;
      const off = Math.abs(error) * 100;
      errorSum += off;
      if (off <= 10) inTune += 1;
      if (off > worst) worst = off;
    }
    smooth = alpha * smooth + (1 - alpha) * want;
    cents[i] = smooth;
    if (f0[i] > 0) movedSum += Math.abs(smooth);
  }

  const report = {
    voicedSeconds: (voiced * hop) / rate,
    alreadyInTune: voiced ? inTune / voiced : 0,
    averageCents: voiced ? errorSum / voiced : 0,
    movedCents: voiced ? movedSum / voiced : 0,
    worstCents: worst,
  };

  // Nothing to do, and re-synthesising for nothing only costs quality.
  if (!voiced || strength === 0) return { audio: samples, ...report };

  const frameOf = (index: number): number =>
    Math.min(frames - 1, Math.max(0, Math.round(index / hop)));
  const periodAt = (index: number): number => {
    const hz = f0[frameOf(index)];
    return hz > 0 ? rate / hz : rate / UNVOICED_HZ;
  };

  /**
   * Where each piece is cut from: one measured period apart, all the way
   * through, with the fraction carried rather than rounded away.
   *
   * The first version of this looked for the loudest sample near each
   * predicted mark, on the theory that a period of a voice begins at its
   * pulse. It does, but a voice also has a second, nearly equal peak on the
   * other side of that pulse, and the search kept changing its mind between
   * them. The marks came out 111, 96, 127, 111, 96, 127 samples apart instead
   * of 111 every time, and a pattern that repeats every three periods is a
   * pitch three times lower: a 431 Hz note came back at 147 Hz. Keeping the
   * spacing exact keeps every mark at the same point in the cycle, which is
   * the only property the overlap-add actually needs.
   */
  const marks: number[] = [];
  let p = 0;
  while (p < samples.length) {
    marks.push(Math.round(p));
    p += Math.max(8, periodAt(p));
  }

  const out = new Float32Array(samples.length);
  let q = marks.length ? marks[0] : 0;
  let k = 0;
  while (q < samples.length) {
    while (k + 1 < marks.length && Math.abs(marks[k + 1] - q) <= Math.abs(marks[k] - q)) k += 1;
    const mark = marks[k];
    // Fractional, because the step is what sets the output pitch: rounding
    // 111.3 samples to 111 is a quarter of a percent, which is five cents, and
    // five cents is the difference between corrected and nearly corrected.
    const period = Math.max(8, periodAt(mark));
    const half = Math.max(8, Math.round(period));
    const ratio = Math.pow(2, cents[frameOf(Math.round(q))] / 1200);
    // Laying the pieces closer together raises the pitch and, because there are
    // then more of them per second, also raises the level. Dividing by the same
    // ratio takes that back out exactly.
    const gain = 1 / ratio;
    const centre = Math.round(q);
    for (let j = -half; j <= half; j += 1) {
      const from = mark + j;
      const to = centre + j;
      if (from < 0 || from >= samples.length) continue;
      if (to < 0 || to >= out.length) continue;
      // Hann across two periods: at this spacing the pieces sum back to one.
      out[to] += samples[from] * (0.5 - 0.5 * Math.cos((Math.PI * (j + half)) / half)) * gain;
    }
    q += period / ratio;
  }

  return { audio: out, ...report };
}

/**
 * The same thing on a buffer the browser can play.
 *
 * Mono out: the take is one microphone, and correcting two channels
 * independently would pull them apart from each other.
 */
export function tuneBuffer(buffer: AudioBuffer, tuning: Tuning): { buffer: AudioBuffer; report: Tuned } | null {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const result = tune(buffer.getChannelData(0), buffer.sampleRate, tuning);
  const ctx = new Ctx();
  const made = ctx.createBuffer(1, result.audio.length, buffer.sampleRate);
  made.getChannelData(0).set(result.audio);
  void ctx.close();
  return { buffer: made, report: result };
}
