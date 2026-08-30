'use client';

/**
 * The notes in a piece of audio, as something that can be drawn.
 *
 * This is the honest version of the sheet music that was asked for. There is
 * no score anywhere in this app — the engine returns a finished audio file and
 * nothing else — so notation can only come from listening to the file. That is
 * exactly as reliable as the listening is, and the rule here is that it says
 * nothing rather than guessing:
 *
 *   · a reading is used only when the detector is sure of it;
 *   · a note is kept only when it holds still long enough to be a note;
 *   · everything else leaves a gap, and a gap on the bar means "this part was
 *     not clear enough to read", not "there is nothing here".
 *
 * On a busy mix that leaves a broken line, which is the truth about a busy
 * mix. On a backing made for singing over, or on somebody's own take, it comes
 * out as a melody you can follow.
 */

import { HOP_S, pitchTrack } from './tune';

/** How sure the detector has to be before a reading counts as a note. */
const SURE = 0.93;
/** Shorter than this is a slide or a stray reading, not a note. */
const SHORTEST = 0.12;
/** A gap this short inside one note is a dropped frame, not a rest. */
const BRIDGE = 0.06;

export interface Note {
  readonly from: number;
  readonly to: number;
  /** The note, as a midi number: 69 is A4. */
  readonly midi: number;
}

export function melodyOf(samples: Float32Array, rate: number): Note[] {
  const hop = Math.max(1, Math.round(HOP_S * rate));
  const track = pitchTrack(samples, rate, hop);
  const seconds = hop / rate;

  const steps = new Int16Array(track.hz.length);
  for (let i = 0; i < track.hz.length; i += 1) {
    steps[i] =
      track.hz[i] > 0 && track.score[i] >= SURE
        ? Math.round(69 + 12 * Math.log2(track.hz[i] / 440))
        : 0;
  }

  const out: Note[] = [];
  let from = -1;
  let step = 0;
  let missing = 0;
  const bridge = Math.max(1, Math.round(BRIDGE / seconds));

  const close = (to: number): void => {
    if (from < 0) return;
    const length = (to - from) * seconds;
    if (length >= SHORTEST) out.push({ from: from * seconds, to: to * seconds, midi: step });
    from = -1;
  };

  for (let i = 0; i < steps.length; i += 1) {
    if (steps[i] === step && from >= 0) {
      missing = 0;
      continue;
    }
    if (!steps[i] && from >= 0) {
      // Hold through a dropped frame or two rather than cutting the note.
      missing += 1;
      if (missing <= bridge) continue;
      close(i - missing);
      missing = 0;
      continue;
    }
    if (steps[i]) {
      close(i - missing);
      missing = 0;
      from = i;
      step = steps[i];
    }
  }
  close(steps.length - missing);
  return out;
}

/**
 * Whether a reading is worth putting in front of a singer.
 *
 * This exists because of what happens when it is not checked. Measured on
 * built mixes where the right answer was known: a single line — a bare lead,
 * a quiet solo voice, somebody's own take — comes back 91% correct, note for
 * note. Put a bass under that same lead and the detector follows the bass
 * instead and reports G2, F2, C3 with complete confidence: not one note right,
 * and no sign on the screen that anything is wrong. A full mix reads nothing
 * at all, which is at least honest.
 *
 * Two things separate those cases, and together they got all seven test mixes
 * right: how much of the time was read at all, and whether what came back is
 * in a range a person could sing. The bass fails both.
 *
 * So a melody is only ever offered when it passes this. A finished song does
 * not pass, and it is not supposed to — reading a tune out of a full mix is a
 * different and much harder job than this, and pretending otherwise would put
 * the wrong notes in front of somebody who is trusting them.
 *
 * `seconds` is how long there was *to* read, which is not always the length of
 * the file. On a separated voice it is the time somebody is actually singing:
 * a song with a long intro, a solo and an outro can be four minutes of file
 * and one minute of singing, and measuring the coverage against four minutes
 * would throw away notes that are all correct for the sole reason that the
 * band plays for a while.
 */
export function readable(notes: readonly Note[], seconds: number): boolean {
  if (!notes.length || seconds <= 0) return false;
  let covered = 0;
  let singable = 0;
  notes.forEach((one) => {
    covered += one.to - one.from;
    // C3 to C6. Outside that it is the bass or a cymbal, not a melody.
    if (one.midi >= 48 && one.midi <= 84) singable += 1;
  });
  return covered / seconds >= 0.6 && singable / notes.length >= 0.8;
}
