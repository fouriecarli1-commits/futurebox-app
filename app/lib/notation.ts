/**
 * The notes somebody sang, placed on a stave.
 *
 * ── Why this is allowed to exist now, when `pitch.ts` says it should not ─
 *
 * `lib/pitch.ts` argues against sheet music, and it is right about the thing
 * it is arguing about: the engine returns a finished mix and no score, and a
 * stave transcribed from under drums and bass would be confidently wrong.
 *
 * This is the other case. `lib/melody.ts` reads a **monophonic** signal —
 * somebody's own take in the Booth, or a separated voice — and its own
 * `readable()` measures whether the reading is trustworthy before anything is
 * shown. That gate is not weakened here and is not duplicated here: nothing
 * in this file decides whether a melody may be drawn, only how it is drawn
 * once something else has decided it may be.
 *
 * ── What it is for ──────────────────────────────────────────────────────
 *
 * `docs/MUSIEKDENKE.md` §3.4:
 *
 *   "Sy het 'hoe om musiek te lees' gesê, en dit hoef nie 'n metafoor te wees
 *    nie … Niemand hoef dit te kan lees om die app te gebruik nie. Maar dit
 *    sit notasie voor hulle, vasgemaak aan hulle eie stem."
 *
 * Nobody is taught to read music. Their own voice is written down the way a
 * musician would write it, next to the thing they just sang, and somebody who
 * records forty takes ends up able to read the shape of a line without ever
 * having opened a lesson.
 *
 * ── The three pieces of engraving this does ─────────────────────────────
 *
 * 1. **Spelling.** MIDI 61 is C♯ in D major and D♭ in A♭ major. The same
 *    sound, two names, and which one is right depends on the key. Getting it
 *    wrong is not cosmetic — it is the difference between a line that reads
 *    and one a musician has to decode.
 * 2. **The key signature**, so a note already sharpened by the key carries no
 *    accidental of its own. A stave with a sharp on every F is what somebody
 *    who has never engraved anything produces, and it is unreadable.
 * 3. **Note values**, from seconds and a tempo. A crotchet is not a length of
 *    time; it is a fraction of a beat, and the beat comes from the song.
 */

/** One note, as `lib/melody.ts` reads it out of the audio. */
export interface Heard {
  readonly from: number;
  readonly to: number;
  /** MIDI number: 69 is A4. */
  readonly midi: number;
}

export type Clef = 'treble' | 'bass';
export type Accidental = '' | '#' | 'b' | 'n';
export type Value = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

export interface Placed {
  readonly from: number;
  readonly to: number;
  readonly midi: number;
  /**
   * Where it sits, in diatonic steps above the bottom line of the stave.
   *
   * 0 is the bottom line, 1 the space above it, 8 the top line. Below 0 and
   * above 8 are ledger lines. Steps rather than pixels because a stave is a
   * diatonic instrument: C♯ and C sit on the same line, which is the whole
   * reason accidentals exist and the reason a chromatic position would be
   * wrong.
   */
  readonly step: number;
  /** Drawn before the notehead, or '' when the key signature already says it. */
  readonly accidental: Accidental;
  readonly value: Value;
  /** A dotted note is half as long again. */
  readonly dotted: boolean;
  /** The name a person would say: "F♯4". */
  readonly name: string;
}

export interface Score {
  readonly clef: Clef;
  /** Sharps in the key signature, or a negative number of flats. -7…7. */
  readonly signature: number;
  readonly notes: readonly Placed[];
  readonly seconds: number;
}

export const NO_SCORE: Score = { clef: 'treble', signature: 0, notes: [], seconds: 0 };

/* ── The key ────────────────────────────────────────────────────────────── */

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
/** Semitones above C for each letter. */
const NATURAL = [0, 2, 4, 5, 7, 9, 11];

/** The circle of fifths, as majors. Index is the number of sharps. */
const SHARP_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const FLAT_KEYS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];

/**
 * How many sharps (or flats, as a negative) a key signature carries.
 *
 * Takes what `Track.key` holds — "A Minor", "C major", "F#", "Eb minor" — and
 * the empty string for a song whose key was never worked out, which is C: no
 * signature and every accidental drawn where it falls. That is the honest
 * default rather than a guess, and it is what a lead sheet does for a tune
 * nobody has decided the key of.
 */
export function signatureOf(key: string): number {
  const text = key.trim();
  if (!text) return 0;
  const match = /^([A-Ga-g])\s*([#♯b♭]?)/.exec(text);
  if (!match) return 0;
  const root = match[1].toUpperCase() + (match[2] === '♯' ? '#' : match[2] === '♭' ? 'b' : match[2]);
  const minor = /min/i.test(text);
  /* A minor key has the signature of its relative major, three semitones up:
     A minor is C major's, which is why both are drawn with nothing. */
  const major = minor ? relativeMajor(root) : root;
  const sharps = SHARP_KEYS.indexOf(major);
  if (sharps >= 0) return sharps;
  const flats = FLAT_KEYS.indexOf(major);
  return flats > 0 ? -flats : 0;
}

/**
 * The key on the other side of a signature.
 *
 * A minor key and its relative major have the same seven notes and a
 * different home, which is the single most useful thing a person can be told
 * about a key — it is why a song moves between them without changing key, and
 * it is what `lib/musictalk.ts` says out loud beside a measurement.
 *
 * Takes what `keyOf` produces — "A minor", "C♯ major" — and gives back the
 * same shape, or '' for anything it cannot read.
 */
export function relativeOf(key: string): string {
  const text = key.trim();
  const match = /^([A-Ga-g])\s*([#♯b♭]?)/.exec(text);
  if (!match) return '';
  const root = match[1].toUpperCase() + (match[2] === '♯' ? '#' : match[2] === '♭' ? 'b' : match[2]);
  if (/min/i.test(text)) return `${relativeMajor(root)} major`;
  /* Down three semitones for the relative minor, spelled the way the major
     is: E♭ major's is C minor, and A♭ major's is F minor. */
  const semitone = (NATURAL[LETTERS.indexOf(root[0] as (typeof LETTERS)[number])]
    + (root[1] === '#' ? 1 : root[1] === 'b' ? -1 : 0) - 3 + 12) % 12;
  const wantFlat = root.includes('b') || root === 'F';
  const names = wantFlat
    ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
    : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${names[semitone]} minor`;
}

/** The major a minor key shares its signature with. */
function relativeMajor(root: string): string {
  const semitone = (NATURAL[LETTERS.indexOf(root[0] as (typeof LETTERS)[number])]
    + (root[1] === '#' ? 1 : root[1] === 'b' ? -1 : 0) + 3 + 12) % 12;
  /* Spelled to match the minor: a sharp minor gives a sharp major, a flat one
     a flat major. E♭ minor's relative is G♭ major, not F♯ major, and drawing
     six sharps where the singer was told six flats is a different key on the
     page. */
  const wantFlat = root.includes('b');
  const names = wantFlat
    ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'Cb']
    : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return names[semitone];
}

/* ── Spelling a note ────────────────────────────────────────────────────── */

/** Which of the twelve is sharpened by a signature of `n` sharps. */
const SHARP_ORDER = [3, 0, 4, 1, 5, 2, 6]; // F C G D A E B, as letter indexes
const FLAT_ORDER = [6, 2, 5, 1, 4, 0, 3]; // B E A D G C F

/**
 * The letter and accidental for a midi note in a given key.
 *
 * Black keys are spelled the way the key spells them — sharps in a sharp key,
 * flats in a flat one — and a white key that the signature has altered gets a
 * natural. Everything the signature already says is left off the note.
 */
export function spell(midi: number, signature: number): { letter: number; octave: number; accidental: Accidental } {
  const semitone = ((midi % 12) + 12) % 12;
  const flat = signature < 0;
  const table = flat
    ? [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]]
    : [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];
  const [letter, alter] = table[semitone] as [number, number];

  /* The octave belongs to the letter, not to the pitch — C♭4 sounds below C4
     and is written on the B line of the octave beneath it, so an octave taken
     straight from `midi / 12` would be a line and a bit out.

     The two tables above never produce C♭ or B♯: a flat key spells semitone 0
     as C and semitone 11 as B, and a sharp key does the same. So the simple
     octave is right for every spelling this file can emit, and the case is
     named here rather than guarded against, because a guard for something
     that cannot happen is a guard nobody can ever test. */
  const octave = Math.floor(midi / 12) - 1;

  /* Is this letter already altered by the key signature? */
  const altered = signature > 0
    ? SHARP_ORDER.slice(0, signature).includes(letter)
    : FLAT_ORDER.slice(0, -signature).includes(letter);
  const keyAlter = altered ? (signature > 0 ? 1 : -1) : 0;

  let accidental: Accidental = '';
  if (alter !== keyAlter) accidental = alter === 1 ? '#' : alter === -1 ? 'b' : 'n';

  return { letter, octave, accidental };
}

/** "F♯4", as somebody would say it. */
function nameOf(letter: number, octave: number, accidental: Accidental, signature: number): string {
  const altered = signature > 0
    ? SHARP_ORDER.slice(0, signature).includes(letter)
    : FLAT_ORDER.slice(0, -signature).includes(letter);
  const mark = accidental === '#' ? '♯' : accidental === 'b' ? '♭' : accidental === 'n' ? '♮'
    : altered ? (signature > 0 ? '♯' : '♭') : '';
  return `${LETTERS[letter]}${mark}${octave}`;
}

/* ── Where it sits ──────────────────────────────────────────────────────── */

/**
 * Diatonic steps above the stave's bottom line.
 *
 * Treble's bottom line is E4, bass's is G2. Counting in letters rather than
 * semitones is the point: every spelling of C sits on the C line.
 */
function stepOf(letter: number, octave: number, clef: Clef): number {
  const index = octave * 7 + letter;
  const bottom = clef === 'treble' ? 4 * 7 + 2 : 2 * 7 + 4; // E4, G2
  return index - bottom;
}

/**
 * Which clef this melody belongs in.
 *
 * By the middle of the range rather than by the extremes, so one low note at
 * the end of a phrase does not drop a soprano line onto the bass stave. B3 —
 * midi 59, the note between the two staves — is the divide.
 */
export function clefFor(notes: readonly Heard[]): Clef {
  if (!notes.length) return 'treble';
  const sorted = [...notes].map((one) => one.midi).sort((a, b) => a - b);
  const middle = sorted[Math.floor(sorted.length / 2)];
  return middle >= 59 ? 'treble' : 'bass';
}

/* ── How long it is ─────────────────────────────────────────────────────── */

/** Beats, and what to call them. Longest first. */
const VALUES: ReadonlyArray<readonly [number, Value, boolean]> = [
  [4, 'whole', false],
  [3, 'half', true],
  [2, 'half', false],
  [1.5, 'quarter', true],
  [1, 'quarter', false],
  [0.75, 'eighth', true],
  [0.5, 'eighth', false],
  [0.25, 'sixteenth', false],
];

/**
 * The nearest written value to a sung length.
 *
 * Nearest in *ratio*, not in beats, because duration is heard
 * multiplicatively. The boundary between a crotchet and a quaver belongs at
 * their geometric mean — 0.71 of a beat — rather than halfway between them at
 * 0.75, since holding a note forty per cent long is the same size of mistake
 * whether the note is long or short. The two metrics agree almost everywhere
 * and disagree in a narrow band around each boundary, always in that
 * direction: just under three and a half beats is a semibreve here and a
 * dotted minim under the arithmetic reading, and it is much nearer four than
 * three to anybody listening.
 *
 * Somebody singing is never exactly on the value anyway — which is the point
 * of a person singing — so this is a reading, not a measurement.
 */
export function valueOf(seconds: number, bpm: number): { value: Value; dotted: boolean } {
  const beats = (seconds * Math.max(1, bpm)) / 60;
  let best = VALUES[VALUES.length - 1];
  let closest = Infinity;
  for (const one of VALUES) {
    const off = Math.abs(Math.log2(beats / one[0]));
    if (off < closest) {
      closest = off;
      best = one;
    }
  }
  return { value: best[1], dotted: best[2] };
}

/* ── The whole thing ────────────────────────────────────────────────────── */

/**
 * A melody, engraved.
 *
 * @param key what `Track.key` holds — "A Minor" — or '' when nobody knows.
 * @param bpm the song's tempo. A missing or nonsense tempo falls back to 100,
 *            which makes the values a guess rather than a lie: the shape of
 *            the line is still right and the durations are still relative to
 *            each other.
 */
export function engrave(notes: readonly Heard[], { key = '', bpm = 100 } = {}): Score {
  if (!notes.length) return NO_SCORE;
  const signature = signatureOf(key);
  const clef = clefFor(notes);
  const tempo = Number.isFinite(bpm) && bpm > 0 ? bpm : 100;

  const placed = notes.map((one) => {
    const { letter, octave, accidental } = spell(one.midi, signature);
    const { value, dotted } = valueOf(one.to - one.from, tempo);
    return {
      from: one.from,
      to: one.to,
      midi: one.midi,
      step: stepOf(letter, octave, clef),
      accidental,
      value,
      dotted,
      name: nameOf(letter, octave, accidental, signature),
    };
  });

  return { clef, signature, notes: placed, seconds: notes[notes.length - 1].to };
}
