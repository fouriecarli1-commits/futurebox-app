/**
 * A lane's notes, as a file another program can open.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Ons sal ook die funksie op probooth moet bied waar
 * iemand op 'n spesifieke track kan click en dan is daar 'n dropdownmenu wat
 * die opsie gee vir download midi, download wav. Dit gee die geleentheid om 'n
 * sekere klank te save vir 'n ander projek."*
 *
 * The WAV half needs nothing new — `lib/wav.ts` already writes one and
 * `pieceOf` already hands over the cut piece. This is the other half, and it
 * is the half that can be dishonest, so the honesty is built into the type
 * rather than left to the screen.
 *
 * ── A transcription is not a recording, and the file says which ──────────
 *
 * MIDI is notes, not sound. This room holds audio. So there are exactly two
 * ways a lane can become MIDI and they are not equally good:
 *
 *   **`exact`** — the lane was BUILT from notes. The hum-an-instrument path
 *   finds the notes, plays them with one of the twenty-four voices, and puts
 *   the result on a lane. Those notes are the truth and they are what gets
 *   written. Nothing is measured and nothing can be wrong.
 *
 *   **`heard`** — the lane is a recording, and the notes have to be found in
 *   it. `notesIn` does that, and it is honest work driven by `check:neurie`,
 *   but it is **one line at a time**: it follows the strongest pitch, so a
 *   chord comes out as a single note and a full mix comes out as nonsense
 *   wearing the shape of a melody.
 *
 * `midiFor` returns which of the two it did, and the room is required to say
 * so before the download. A file called `bass.mid` that is quietly a guess is
 * the kind of thing somebody builds a session on top of and finds out about
 * two days later.
 *
 * ── Why the file is written here rather than by a library ────────────────
 *
 * A standard MIDI file is a fourteen-byte header and a list of events with
 * variable-length delta times. That is less code than the explanation of
 * which package to trust with it, it has no supply chain, and
 * `check:midi` reads the bytes back out.
 */

import type { HumNote } from './humnotes';

/** Ticks per quarter note. 480 divides by 2, 3, 4, 5, 6 and 8 cleanly. */
export const TICKS = 480;

/** Where the notes came from, which decides what the room is allowed to say. */
export type Source = 'exact' | 'heard';

export interface Written {
  readonly bytes: Uint8Array;
  readonly source: Source;
  /** How many notes are in it. Zero means nothing was found, not a silent file. */
  readonly notes: number;
}

/** A variable-length quantity, which is how MIDI writes every delta time. */
function varLen(value: number): number[] {
  const whole = Math.max(0, Math.round(value));
  const out = [whole & 0x7f];
  let left = whole >> 7;
  while (left > 0) {
    out.unshift((left & 0x7f) | 0x80);
    left >>= 7;
  }
  return out;
}

function word(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function long(value: number): number[] {
  return [(value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function chunk(kind: string, body: readonly number[]): number[] {
  return [...[...kind].map((one) => one.charCodeAt(0)), ...long(body.length), ...body];
}

/**
 * The name of the track, as a meta event.
 *
 * Carried because the whole point of naming a lane is so a professional knows
 * which instrument is where, and a file that loses the name on the way out
 * loses it exactly where it was needed. Latin-1 and truncated: the meta event
 * is bytes, and a name with an ë in it must not become two mojibake bytes in
 * somebody else's sequencer.
 */
function trackName(name: string): number[] {
  const text = [...name.slice(0, 64)]
    .map((one) => one.codePointAt(0) ?? 63)
    .map((one) => (one > 0 && one < 256 ? one : 63));
  return [0x00, 0xff, 0x03, ...varLen(text.length), ...text];
}

/**
 * The notes of a lane as a one-track MIDI file.
 *
 * `bpm` writes the tempo so that the bars line up when the file is opened
 * beside the song it came from. Note times are still absolute seconds
 * converted at that tempo, so a wrong tempo moves the bar lines and never the
 * notes.
 *
 * An unpitched note — a tap, a click, the rhythm half of a hum — is written on
 * MIDI note 38, an acoustic snare on channel 10's general-midi map. Dropping
 * them would be worse: a hummed beat is mostly those, and a file with the
 * pitched notes only is a rhythm with its backbone taken out.
 */
export function midiFor(
  notes: readonly HumNote[],
  { bpm = 120, name = 'Lane', source }: { bpm?: number; name?: string; source: Source },
): Written {
  const live = notes
    .filter((one) => one.to > one.from)
    .slice()
    .sort((one, two) => one.from - two.from);

  const pace = Math.min(400, Math.max(20, bpm));
  const perSecond = (TICKS * pace) / 60;
  const tick = (second: number): number => Math.max(0, Math.round(second * perSecond));

  /* Note-ons and note-offs as one list sorted by tick, because a held note
     overlapping the next one needs its off AFTER that on — and writing each
     note as on-then-off in note order gets that wrong every time. */
  const events: { at: number; data: number[] }[] = [];
  for (const note of live) {
    const pitch = note.midi === null ? 38 : Math.min(127, Math.max(0, Math.round(note.midi)));
    const how = Math.min(127, Math.max(1, Math.round(Math.min(1, Math.max(0, note.loud)) * 127)));
    events.push({ at: tick(note.from), data: [0x90, pitch, how] });
    /* At least one tick long. A note whose on and off share a tick is a note
       some sequencers show and none of them play. */
    events.push({ at: Math.max(tick(note.to), tick(note.from) + 1), data: [0x80, pitch, 0x40] });
  }
  /* A note-off before a note-on at the same tick, so a repeated pitch
     retriggers instead of the off killing the on that just started. */
  events.sort((one, two) => one.at - two.at || (one.data[0] & 0xf0) - (two.data[0] & 0xf0));

  const body: number[] = [...trackName(name)];
  /* Microseconds per quarter note, which is the only way MIDI says tempo. */
  const perQuarter = Math.round(60_000_000 / pace);
  body.push(0x00, 0xff, 0x51, 0x03,
    (perQuarter >> 16) & 0xff, (perQuarter >> 8) & 0xff, perQuarter & 0xff);

  let was = 0;
  for (const event of events) {
    body.push(...varLen(event.at - was), ...event.data);
    was = event.at;
  }
  body.push(0x00, 0xff, 0x2f, 0x00); // end of track

  const header = chunk('MThd', [...word(0), ...word(1), ...word(TICKS)]);
  return {
    bytes: new Uint8Array([...header, ...chunk('MTrk', body)]),
    source,
    notes: live.length,
  };
}

/** The file, ready to hand to a download. */
export function midiBlob(written: Written): Blob {
  /* A fresh ArrayBuffer rather than the view: `Uint8Array` is `ArrayBufferLike`
     and `BlobPart` wants an `ArrayBuffer`, and a slice is one. */
  return new Blob([written.bytes.slice().buffer as ArrayBuffer], { type: 'audio/midi' });
}
