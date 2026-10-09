/**
 * Turning a hum into notes: where each one starts, how long it lasts, and
 * what pitch it was.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026, about something Suno had launched: *"Wat oulik is
 * is dat mens die ritme van 'n liedjie met jou stem kan sing en in sit, en
 * dan kies jy net die instrument tipe."* Sing the rhythm of a song with your
 * voice, put it in, and then just pick the instrument.
 *
 * ── Why the rhythm is the hard half, and the pitch is the easy one ───────
 *
 * This app already finds pitch, and finds it well: `lib/pitch.ts` does
 * normalised autocorrelation and `lib/tune.ts` builds a pitch track across a
 * whole recording at twelve-millisecond frames, with octave checking and a
 * median filter. None of that is rewritten here; `notesIn` calls it.
 *
 * What was missing is the thing she actually described. "Da da da" on one
 * note is THREE notes, and a pitch track cannot see that: the pitch never
 * changes, so grouping frames by pitch gives one long note and the rhythm —
 * the whole point — is gone. Rhythm lives in the energy, not the pitch, so
 * the onsets are found first and the pitch is read per note afterwards.
 *
 * ── Why the flux is in the log domain ────────────────────────────────────
 *
 * Because a person humming does not hum evenly. The difference between two
 * quiet notes is a tiny number of units of energy and the difference between
 * two loud ones is a large number, so a plain energy difference finds every
 * onset in the loud bar and none in the quiet one — which is a rhythm with
 * holes in exactly the places somebody sang softly. A ratio does not care
 * how loud the passage is, and a difference of logs is a ratio.
 *
 * ── Why the threshold moves ──────────────────────────────────────────────
 *
 * A fixed one is the same mistake in slower motion: it is tuned on one
 * recording, on one phone, at one distance from the mouth. The threshold
 * here is a median of the flux around each frame, which is a local reading
 * of "what counts as a jump in THIS part of THIS recording". The median
 * rather than the mean because an onset is itself a large value, and a mean
 * is dragged up by the very thing it is trying to detect.
 */

import { HOP_S, pitchTrack } from './tune';

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

/** Below this the pitch reading is not trusted and the note is unpitched. */
const SURE = 0.6;

/** How much louder than the local median a frame must jump to be an onset. */
const JUMP = 0.22;

/** Half-width of the window the moving median is taken over. */
const LOCAL_S = 0.35;

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
  /** Peak loudness inside the note, 0–1, for how hard the instrument plays it. */
  readonly loud: number;
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

/** The median of the numbers given, or null when there are none. */
function middle(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1];
}

/**
 * The hum, as notes.
 *
 * The onsets give the starts. A note runs to the next onset, or to where it
 * has been quiet for long enough, whichever comes first — so a held note is
 * held and a short one is short, which is the whole rhythm.
 */
export function notesIn(samples: Float32Array, rate: number): HumNote[] {
  const hop = Math.max(1, Math.round(HOP_S * rate));
  const energy = energyIn(samples, rate);
  const starts = onsetsIn(energy);
  if (!starts.length) return [];

  const track = pitchTrack(samples, rate, hop);
  const frames = energy.length;

  const notes: HumNote[] = [];
  for (let n = 0; n < starts.length; n += 1) {
    const first = Math.round(starts[n] / HOP_S);
    const limit = n + 1 < starts.length
      ? Math.round(starts[n + 1] / HOP_S)
      : frames;

    /* Peak loudness in the note, and where it goes quiet. "Quiet" is a
       fraction of this note's own peak rather than an absolute, for the same
       reason the flux is a ratio. */
    let peak = 0;
    for (let i = first; i < limit; i += 1) peak = Math.max(peak, energy[i]);
    const floor = Math.max(0.004, peak * 0.22);

    let end = limit;
    let quiet = 0;
    for (let i = first + 1; i < limit; i += 1) {
      quiet = energy[i] < floor ? quiet + 1 : 0;
      /* Three frames, so one dipped frame inside a note does not end it. */
      if (quiet >= 3) { end = i - 2; break; }
    }

    const from = first * HOP_S;
    const to = Math.max(from + MIN_NOTE_S, end * HOP_S);

    /* The pitch, skipping the attack. The first forty milliseconds of a
       hummed note are a consonant and a glide, and their pitch readings are
       the ones that put a note a fourth away from where it was sung. */
    const after = first + Math.round(0.04 / HOP_S);
    const heard: number[] = [];
    for (let i = after; i < end && i < track.hz.length; i += 1) {
      if (track.score[i] >= SURE && track.hz[i] > 0) {
        heard.push(69 + 12 * Math.log2(track.hz[i] / 440));
      }
    }
    const pitch = middle(heard);

    notes.push({
      midi: pitch === null ? null : Math.round(pitch),
      from,
      to,
      loud: Math.min(1, peak * 4),
    });
  }

  /* A note shorter than the floor is a click. Dropped last rather than
     never made, because its onset still ended the note before it — which is
     correct: somebody who taps between two hums has shortened the first. */
  return notes.filter((one) => one.to - one.from >= MIN_NOTE_S);
}

/**
 * Put the notes on the grid.
 *
 * Carli's own instinct about this feature, and the right one: a hummed
 * rhythm is never quite in time, and the point is to get something usable
 * rather than something faithful. Sixteenths, because eighths flatten a
 * swung or dotted figure into a march and thirty-seconds snap to nothing.
 *
 * Lengths are snapped too, and floored at one division — a note cannot
 * become zero long, which is the one outcome that would silently delete it.
 */
export function snapTo(notes: readonly HumNote[], bpm: number): HumNote[] {
  if (!Number.isFinite(bpm) || bpm <= 0) return [...notes];
  const division = 60 / bpm / 4;
  return notes.map((one) => {
    const from = Math.round(one.from / division) * division;
    const steps = Math.max(1, Math.round((one.to - one.from) / division));
    return { ...one, from, to: from + steps * division };
  });
}
