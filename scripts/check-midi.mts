/**
 * The MIDI a lane hands over says what it is, and the bytes are real.
 *
 * ── Why this one is worth bytes ──────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"download midi, download wav. Dit gee die
 * geleentheid om 'n sekere klank te save vir 'n ander projek."*
 *
 * A MIDI file is the one thing this app produces that **nothing in this app
 * ever opens again**. A WAV that is wrong is wrong out loud, the first time
 * anybody presses play. A MIDI file goes into somebody else's sequencer, in a
 * week, on a different machine, and what comes back is either "it would not
 * load" or — far worse — a file that loads and is subtly wrong: notes a bar
 * early, a note that never ends, a hummed beat with its unpitched half
 * silently dropped.
 *
 * So this reads the bytes back out. Not "a blob was produced": the header, the
 * chunk lengths, the tempo, the track name, and every note-on and note-off
 * with its tick, decoded from the variable-length deltas the writer wrote.
 *
 * ── And it holds the honesty, which is the other half ────────────────────
 *
 * There are two ways a lane becomes MIDI and only one of them is a fact. A
 * lane BUILT from notes — the hum-an-instrument path — carries the notes it
 * was built from, and writing those is exact. A lane that is a recording has
 * to have its notes FOUND, and the finder follows one line at a time: a chord
 * comes out as a single note and a full mix comes out as nonsense shaped like
 * a melody.
 *
 * A file called `bass.mid` that is quietly a guess is the kind of thing
 * somebody builds a session on top of and finds out about two days later. So
 * the writer returns which of the two it did, and the room is held to saying
 * so before the download rather than after it.
 */

import { readFileSync } from 'node:fs';
import { midiFor, midiBlob, TICKS } from '../app/lib/midi.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── A reader, so the check is reading the file and not the writer ─────── */

interface Read {
  readonly format: number;
  readonly tracks: number;
  readonly ticks: number;
  readonly name: string;
  /** Microseconds per quarter note, as the tempo meta event carries it. */
  readonly perQuarter: number;
  readonly events: { at: number; kind: 'on' | 'off'; pitch: number; how: number }[];
  /** Whether every chunk's stated length matched what was actually there. */
  readonly lengthsRight: boolean;
}

function readMidi(bytes: Uint8Array): Read | null {
  const text = (at: number, length: number): string =>
    String.fromCharCode(...bytes.slice(at, at + length));
  const word = (at: number): number => (bytes[at] << 8) | bytes[at + 1];
  const long = (at: number): number =>
    (bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3];

  if (text(0, 4) !== 'MThd') return null;
  const headerLength = long(4);
  if (headerLength !== 6) return null;
  const format = word(8);
  const tracks = word(10);
  const ticks = word(12);

  if (text(14, 4) !== 'MTrk') return null;
  const trackLength = long(18);
  const body = bytes.slice(22);
  const lengthsRight = body.length === trackLength;

  let at = 0;
  let now = 0;
  let name = '';
  let perQuarter = 0;
  const events: Read['events'] = [];
  while (at < body.length) {
    /* The delta time, decoded rather than assumed. */
    let delta = 0;
    for (;;) {
      const byte = body[at];
      at += 1;
      delta = (delta << 7) | (byte & 0x7f);
      if (!(byte & 0x80)) break;
      if (at > body.length) return null;
    }
    now += delta;
    const status = body[at];
    at += 1;
    if (status === 0xff) {
      const kind = body[at];
      at += 1;
      let length = 0;
      for (;;) {
        const byte = body[at];
        at += 1;
        length = (length << 7) | (byte & 0x7f);
        if (!(byte & 0x80)) break;
      }
      if (kind === 0x03) name = text(22 + at, length);
      if (kind === 0x51) perQuarter = (body[at] << 16) | (body[at + 1] << 8) | body[at + 2];
      at += length;
      if (kind === 0x2f) break;
    } else if ((status & 0xf0) === 0x90 || (status & 0xf0) === 0x80) {
      events.push({
        at: now,
        kind: (status & 0xf0) === 0x90 ? 'on' : 'off',
        pitch: body[at],
        how: body[at + 1],
      });
      at += 2;
    } else {
      /* Running status or anything else this writer does not emit. If it
         ever does, this check stops being able to read its own files and
         says so rather than quietly skipping events. */
      return null;
    }
  }
  return { format, tracks, ticks, name, perQuarter, events, lengthsRight };
}

/* ── 1. It is a file, and the chunks say the truth about themselves ────── */

const simple = midiFor(
  [
    { midi: 60, from: 0, to: 0.5, loud: 1 },
    { midi: 64, from: 0.5, to: 1, loud: 0.5 },
  ],
  { bpm: 120, name: 'Bass', source: 'exact' },
);
const back = readMidi(simple.bytes);

ok('what comes out reads back as a standard MIDI file',
  back !== null,
  'a file another program cannot open is the whole feature failing, and it'
  + ' fails in somebody else’s sequencer a week later');

ok('  and every chunk’s stated length is what is actually there',
  back?.lengthsRight === true,
  'a chunk length that is a byte out is the commonest way a hand-written MIDI'
  + ' file loads in one program and not in another');

ok('  and it is one track, at the stated division',
  back?.format === 0 && back?.tracks === 1 && back?.ticks === TICKS,
  `answered format ${back?.format}, ${back?.tracks} track(s), ${back?.ticks} ticks`);

/* ── 2. The notes are where they were ─────────────────────────────────── */

ok('a note at half a second lands on the right tick',
  (() => {
    /* 120 BPM is two quarter notes a second, so half a second is one quarter
       note, which is exactly TICKS. Worked out from the tempo rather than
       read off the writer. */
    const on = back?.events.filter((one) => one.kind === 'on') ?? [];
    return on.length === 2 && on[0].at === 0 && on[1].at === TICKS;
  })(),
  'a file whose notes are a beat early loads fine and is wrong, which is the'
  + ` worse of the two failures — answered ${
    back?.events.filter((one) => one.kind === 'on').map((one) => one.at).join(', ')}`);

ok('  and the tempo is written, so the bars line up with the song',
  back?.perQuarter === 500_000,
  `120 BPM is 500000 microseconds a quarter note — answered ${back?.perQuarter}`);

ok('  and every note that starts also stops',
  (() => {
    const on = back?.events.filter((one) => one.kind === 'on').length ?? 0;
    const off = back?.events.filter((one) => one.kind === 'off').length ?? 0;
    return on > 0 && on === off;
  })(),
  'a note with no note-off is a note that plays until the sequencer is'
  + ' restarted, and it is the classic hand-written-MIDI fault');

ok('  and how hard it is played survives',
  (() => {
    const on = back?.events.filter((one) => one.kind === 'on') ?? [];
    return on.length === 2 && on[0].how === 127 && on[1].how > 60 && on[1].how < 70;
  })(),
  'a hum has dynamics in it and a file at one flat velocity is a different'
  + ' performance');

/* ── 3. The two faults a sorted-by-note writer makes ──────────────────── */

ok('a held note’s stop comes after the next note’s start',
  (() => {
    /* Two overlapping notes. Written note by note, the first note's off is
       emitted before the second note's on, and every delta after it goes
       negative — which a variable-length quantity cannot carry, so the
       second note moves. */
    const held = midiFor(
      [
        { midi: 60, from: 0, to: 2 },
        { midi: 67, from: 0.5, to: 1 },
      ].map((one) => ({ ...one, loud: 1 })),
      { bpm: 120, name: 'Pad', source: 'exact' },
    );
    const got = readMidi(held.bytes);
    if (!got) return false;
    const second = got.events.find((one) => one.kind === 'on' && one.pitch === 67);
    const firstOff = got.events.find((one) => one.kind === 'off' && one.pitch === 60);
    return second?.at === TICKS && firstOff !== undefined && firstOff.at > (second?.at ?? 0);
  })(),
  'written note by note, the held note’s stop is emitted before the second'
  + ' note’s start and every delta after it goes negative');

ok('  and a repeated note retriggers rather than being killed',
  (() => {
    /* The same pitch twice, the first ending exactly where the second begins,
       and handed over OUT OF ORDER — which is what a caller is allowed to do:
       `notesIn` answers in time order but `lane.notes` is whatever put it
       there, and nothing in the type says sorted.

       What this holds is the PROPERTY, and the property is guarded twice: the
       writer sorts the notes by start before it emits anything, and it breaks
       a tie at a shared tick in favour of the note-off. Either one alone is
       enough, measured rather than assumed — taking out the tie-break leaves
       this green, taking out the pre-sort leaves this green, taking out both
       turns it red. That is the right relationship for a check: it is holding
       the behaviour, not one mechanism, and the regression it is really
       waiting for is a rewrite that emits note-by-note with no sort at all. */
    const twice = midiFor(
      [
        { midi: 60, from: 0.5, to: 1, loud: 1 },
        { midi: 60, from: 0, to: 0.5, loud: 1 },
      ],
      { bpm: 120, name: 'Kick', source: 'exact' },
    );
    const got = readMidi(twice.bytes);
    if (!got) return false;
    const at = got.events.filter((one) => one.at === TICKS);
    return at.length === 2 && at[0].kind === 'off' && at[1].kind === 'on';
  })(),
  'the off has to come first at a shared tick, or the second note is silenced'
  + ' the instant it starts');

ok('  and a note shorter than a tick still has a length',
  (() => {
    const flick = midiFor([{ midi: 60, from: 0, to: 0.0001, loud: 1 }], { bpm: 120, name: 'x', source: 'exact' });
    const got = readMidi(flick.bytes);
    const on = got?.events.find((one) => one.kind === 'on');
    const off = got?.events.find((one) => one.kind === 'off');
    return on !== undefined && off !== undefined && off.at > on.at;
  })(),
  'a note whose on and off share a tick is a note some sequencers show and'
  + ' none of them play');

/* ── 4. The rhythm half of a hum is not thrown away ───────────────────── */

ok('an unpitched tap is written rather than dropped',
  (() => {
    const beat = midiFor(
      [
        { midi: null, from: 0, to: 0.1, loud: 1 },
        { midi: null, from: 0.5, to: 0.6, loud: 1 },
      ],
      { bpm: 120, name: 'Taps', source: 'heard' },
    );
    const got = readMidi(beat.bytes);
    return beat.notes === 2 && (got?.events.filter((one) => one.kind === 'on').length ?? 0) === 2;
  })(),
  'a hummed beat is mostly unpitched, and a file with the pitched notes only'
  + ' is a rhythm with its backbone taken out');

/* ── 5. The name, because that is why a lane has one ──────────────────── */

ok('the lane’s name is in the file',
  back?.name === 'Bass',
  'the whole point of naming a lane is so somebody knows which instrument is'
  + ` where, and a file that loses the name loses it there — answered "${back?.name}"`);

ok('  and a letter that is not a byte does not become two',
  (() => {
    const odd = midiFor([{ midi: 60, from: 0, to: 1, loud: 1 }], { bpm: 120, name: 'Tj’ello — 2', source: 'exact' });
    const got = readMidi(odd.bytes);
    /* Every byte in the name is one character's worth, whatever it was. A
       UTF-8 ’ written raw would be three bytes reading as mojibake in
       somebody else's sequencer. */
    return got !== null && got.name.length === 'Tj’ello — 2'.length;
  })(),
  'the meta event is bytes, and a UTF-8 ’ written raw is three of them');

/* ── 6. Nothing in, nothing out, and it says so ───────────────────────── */

ok('no notes gives a file that says it has none',
  (() => {
    const empty = midiFor([], { bpm: 120, name: 'Empty', source: 'heard' });
    const got = readMidi(empty.bytes);
    return empty.notes === 0 && got !== null && got.events.length === 0;
  })(),
  'the room has to be able to tell "nothing was found" from "a silent file",'
  + ' because the first is worth a sentence and the second is a bug');

ok('  and a note that ends before it starts is not written',
  midiFor([{ midi: 60, from: 1, to: 0.5, loud: 1 }], { bpm: 120, name: 'x', source: 'heard' }).notes === 0,
  'a negative length note is the one thing that can make the delta stream'
  + ' unreadable from that point on');

/* ── 7. The honesty, which the screen is held to ──────────────────────── */

ok('the writer reports which of the two it did',
  midiFor([], { bpm: 120, name: 'x', source: 'exact' }).source === 'exact'
  && midiFor([], { bpm: 120, name: 'x', source: 'heard' }).source === 'heard',
  'a file called bass.mid that is quietly a guess is the kind of thing'
  + ' somebody builds a session on top of');

ok('  and the booth says so before the download, not after',
  (() => {
    const room = withoutComments(readFileSync('app/components/ProBooth.tsx', 'utf8'));
    /* The word has to be on the screen, from the writer's own answer, in the
       room that offers the button. Read from code with the comments stripped:
       an explanation of why honesty matters is not honesty. */
    return /pro\.midiHeard/.test(room) && /source === 'heard'/.test(room);
  })(),
  'the finder follows one line at a time, so a chord comes out as a single'
  + ' note and a full mix comes out as nonsense shaped like a melody — and'
  + ' the person has to be told that before they spend a week on it');

/* ── 8. The blob, because that is what a download takes ───────────────── */

ok('the file is handed over as audio/midi',
  (() => {
    const blob = midiBlob(simple);
    return blob.type === 'audio/midi' && blob.size === simple.bytes.length;
  })(),
  'a blob with the wrong type is a download somebody’s phone refuses to'
  + ' hand to anything');

console.log(bad === 0
  ? '\n  The MIDI reads back as a MIDI file, the notes are where they were, and\n'
    + '  the room says whether they were known or heard.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
