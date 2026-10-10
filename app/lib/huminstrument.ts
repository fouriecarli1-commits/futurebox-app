/**
 * Playing a hum back as an instrument.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Wat oulik is is dat mens die ritme van 'n liedjie
 * met jou stem kan sing en in sit, en dan kies jy net die instrument
 * tipe."* `lib/humnotes.ts` is the first half — the hum, as notes. This is
 * the second: those notes, played.
 *
 * ── Why this is arithmetic and not Web Audio ─────────────────────────────
 *
 * `renderSketch` in `lib/audio.ts` already writes samples into a
 * `Float32Array` by hand and hands them to `encodeWav`, and this follows it
 * for the reason that pattern exists: a function that fills an array is a
 * function a check can call. An `OfflineAudioContext` is only in a browser,
 * so a synth built on one can be looked at and never driven — and the way a
 * synth goes wrong is not an exception, it is a note in the wrong place or a
 * click where an envelope should be.
 *
 * It is also the only version that works on the phone this runs on. Nothing
 * here is sent anywhere, nothing is charged, and a hum turns into a bass
 * line with the device in aeroplane mode.
 *
 * ── It said "why four and not twenty", and she asked for twenty ──────────
 *
 * The paragraph that used to be here argued that four was enough: a low end,
 * a sustained one, a short percussive one, and a kit. Carli, 9 October 2026:
 * *"Ek dink ook daar moet heelwat 'n verskeidenheid van teks opsies wees,
 * daar moet van alles wat opsies is, 'n verskeidenheid wees."*
 *
 * So the argument was mine and it was wrong in a particular way: it defended
 * a short list on the grounds that each entry must be worth choosing, which
 * is true, and then used it to excuse not writing the other ones. A person
 * humming a bass line and a person humming a music-box melody are reaching
 * for different things, and offering them both the same three timbres is the
 * room deciding for them.
 *
 * ── What made it a short list, which was the real reason ─────────────────
 *
 * `play` below was a chain of `if (voice.id === 'bass') … else if (keys) …`,
 * so every new instrument was a new branch in the middle of a loop that runs
 * forty-four thousand times a second. That is a thing nobody adds a
 * fourteenth entry to.
 *
 * The timbre is DATA now — harmonics, decay, attack, detune, breath — and
 * `play` reads it. An instrument is a row, `check:neurie` drives every row
 * the same way, and the three that existed before are written as the exact
 * numbers they were so nothing she has already heard changes.
 *
 * ── Why they are grouped ─────────────────────────────────────────────────
 *
 * Thirteen nouns in a column is the list nobody reads past the third, which
 * was the honest half of the old paragraph. They are ordered as a person
 * looks for them: the low end, then the held instruments, then the struck
 * and plucked ones, then the kit. `GROUPS` carries the headings.
 */

/** The one this app writes samples at, as `lib/audio.ts` does. */
export const RATE = 44100;

export type VoiceId =
  | 'subbass' | 'bass'
  | 'keys' | 'organ' | 'strings' | 'brass' | 'flute' | 'choir' | 'lead'
  | 'pluck' | 'guitar' | 'marimba' | 'bell'
  | 'drums';

/** Which heading an instrument sits under, so thirteen read as four. */
export type GroupId = 'low' | 'held' | 'struck' | 'kit';

export const GROUPS: readonly { id: GroupId; says: readonly [string, string] }[] = [
  { id: 'low', says: ['hum.groupLow', 'The low end'] },
  { id: 'held', says: ['hum.groupHeld', 'Held and sustained'] },
  { id: 'struck', says: ['hum.groupStruck', 'Struck and plucked'] },
  { id: 'kit', says: ['hum.groupKit', 'Rhythm only'] },
];

export interface Voice {
  readonly id: VoiceId;
  /** The i18n key and the English. */
  readonly says: readonly [string, string];
  /** One line on what it is for, so the choice is not four nouns. */
  readonly what: readonly [string, string];
  /** Shifted by this many semitones before it is played. */
  readonly shift: number;
  /** Does it care what pitch was hummed? */
  readonly pitched: boolean;
  /** Which heading it sits under. */
  readonly group: GroupId;
  /**
   * The harmonics, from the first upward, as amplitudes.
   *
   * `[1]` is a bare sine. `[1, 0.35, 0.12]` is a fundamental with some second
   * and a little third, which is what a soft keyboard is. A zero is a
   * harmonic deliberately absent — odd-only partials are what make a
   * clarinet, a marimba and an organ pipe sound hollow rather than thin.
   */
  readonly partials: readonly number[];
  /**
   * Seconds for the note to fall to about a third of its loudness.
   *
   * Zero means it does not fall on its own — it is held for as long as it
   * was hummed, and `decayFloor` is the shortest that fall may be taken as.
   * A fixed number is a note that dies whatever happens: a pluck, a bell.
   */
  readonly decay: number;
  /** When `decay` is zero, the shortest the held fall may be. */
  readonly decayFloor?: number;
  /** Seconds to come in. Long is a bow or a pad; short is a hammer. */
  readonly attack: number;
  /** Seconds to go out, so nothing ends on a click. */
  readonly release: number;
  /** Longest one note may last, however long it was hummed. */
  readonly most?: number;
  /**
   * A second copy a little out of tune, which is what makes a sound WIDE.
   *
   * Two strings on a twelve-string, two oscillators on a synth, sixteen
   * violins that are not quite together. Without it a sustained tone is a
   * test signal.
   */
  readonly detune?: { readonly ratio: number; readonly level: number };
  /** Breath, bow or hammer noise mixed in, as an amplitude. */
  readonly breath?: number;
  /** How much of the note's start the breath covers. 1 is all of it. */
  readonly breathFor?: number;
}

export const VOICES: readonly Voice[] = [
  /* ── The low end ──────────────────────────────────────────────────────

     Both shifted down, because a voice hums a bass part an octave above
     where a bass plays it — everybody does, and transposing it back is the
     difference between a bass line and a sung one. */
  {
    id: 'subbass',
    says: ['hum.subbass', 'Sub bass'],
    what: ['hum.subbassWhat', 'Two octaves down, almost pure. For the floor under everything.'],
    shift: -24,
    pitched: true,
    group: 'low',
    /* Nearly a sine, with a whisper of the octave so it is not inaudible on
       a phone speaker — which has nothing at all below about 200Hz, so two
       octaves down is felt on a desk and guessed at on a handset. */
    partials: [1, 0.12],
    decay: 0,
    decayFloor: 0.3,
    attack: 0.008,
    release: 0.04,
  },
  {
    id: 'bass',
    says: ['hum.bass', 'Bass'],
    what: ['hum.bassWhat', 'An octave down from what you hummed, round and short.'],
    shift: -12,
    pitched: true,
    group: 'low',
    /* A sine with a little of the octave above it. A pure sine disappears on
       a phone speaker; the harmonic is what makes the line audible there at
       all. These are the numbers this voice has always had. */
    partials: [1, 0.25],
    decay: 0,
    decayFloor: 0.2,
    attack: 0.004,
    release: 0.03,
  },

  /* ── Held and sustained ───────────────────────────────────────────────

     The ones that stay up for as long as the note was hummed. `decay: 0`
     with a floor, rather than a fixed fall. */
  {
    id: 'keys',
    says: ['hum.keys', 'Electric piano'],
    what: ['hum.keysWhat', 'Soft and sustained, at the pitch you hummed.'],
    shift: 0,
    pitched: true,
    group: 'held',
    partials: [1, 0.35, 0.12],
    decay: 0,
    decayFloor: 0.6,
    attack: 0.012,
    release: 0.06,
  },
  {
    id: 'organ',
    says: ['hum.organ', 'Organ'],
    what: ['hum.organWhat', 'Does not fade at all. Holds flat for as long as you held the note.'],
    shift: 0,
    pitched: true,
    group: 'held',
    /* Drawbars: the fundamental, the octave, the twelfth and the double
       octave, which is the registration everybody recognises as an organ.
       The gaps are deliberate — a full harmonic series here sounds like a
       saw, not a pipe. */
    partials: [1, 0.6, 0, 0.35, 0, 0.2],
    decay: 0,
    /* High, so the fall is effectively flat for any note somebody hums. An
       organ is the one instrument with no decay at all, and that is the
       whole reason to offer it. */
    decayFloor: 30,
    attack: 0.02,
    release: 0.03,
  },
  {
    id: 'strings',
    says: ['hum.strings', 'Strings'],
    what: ['hum.stringsWhat', 'Comes in slowly and swells. For a line underneath a chorus.'],
    shift: 0,
    pitched: true,
    group: 'held',
    partials: [1, 0.5, 0.3, 0.18, 0.1, 0.06],
    decay: 0,
    decayFloor: 20,
    /* The slow bow. This is the whole character: a string section that comes
       in in four milliseconds is a synth patch. */
    attack: 0.18,
    release: 0.14,
    /* Sixteen violins are never quite together, and that is what makes a
       string section sound like more than one instrument. */
    detune: { ratio: 1.006, level: 0.7 },
    breath: 0.03,
    breathFor: 1,
  },
  {
    id: 'brass',
    says: ['hum.brass', 'Brass'],
    what: ['hum.brassWhat', 'Bright and firm, with a bit of a push at the start. For a hook.'],
    shift: 0,
    pitched: true,
    group: 'held',
    partials: [1, 0.7, 0.55, 0.4, 0.28, 0.18, 0.1],
    decay: 0,
    decayFloor: 8,
    attack: 0.05,
    release: 0.07,
    detune: { ratio: 1.002, level: 0.3 },
  },
  {
    id: 'flute',
    says: ['hum.flute', 'Flute'],
    what: ['hum.fluteWhat', 'Almost a pure tone, with the breath left in. Sits above everything.'],
    shift: 12,
    pitched: true,
    group: 'held',
    /* Nearly a sine with a touch of the third, and shifted UP an octave,
       because a flute lives above where anybody hums. */
    partials: [1, 0.04, 0.12],
    decay: 0,
    decayFloor: 10,
    attack: 0.06,
    release: 0.08,
    /* The breath is the instrument. Without it this is a test tone. */
    breath: 0.1,
    breathFor: 1,
  },
  {
    id: 'choir',
    says: ['hum.choir', 'Voices'],
    what: ['hum.choirWhat', 'A soft pad of hummed voices. For a bed under the whole thing.'],
    shift: 0,
    pitched: true,
    group: 'held',
    /* A strong second and fourth against a weak third is roughly where the
       vowel in "ooh" sits — not a formant filter, but near enough that a
       chord of these reads as voices rather than as a keyboard. */
    partials: [1, 0.45, 0.1, 0.3, 0.08, 0.12],
    decay: 0,
    decayFloor: 20,
    attack: 0.14,
    release: 0.2,
    detune: { ratio: 1.004, level: 0.8 },
    breath: 0.05,
    breathFor: 1,
  },
  {
    id: 'lead',
    says: ['hum.lead', 'Synth lead'],
    what: ['hum.leadWhat', 'Thick and buzzy, two oscillators apart. Cuts through a busy mix.'],
    shift: 0,
    pitched: true,
    group: 'held',
    /* A falling series is a sawtooth, which is what every lead sound in
       popular music is built on. */
    partials: [1, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14, 0.12],
    decay: 0,
    decayFloor: 12,
    attack: 0.006,
    release: 0.04,
    detune: { ratio: 1.01, level: 0.85 },
  },

  /* ── Struck and plucked ───────────────────────────────────────────────

     A fixed fall: the note dies on its own however long it was held, which
     is what being struck means. */
  {
    id: 'pluck',
    says: ['hum.pluck', 'Plucked string'],
    what: ['hum.pluckWhat', 'Short and bright, good for a riff.'],
    shift: 0,
    pitched: true,
    group: 'struck',
    /* The numbers this voice has always had: fundamental, no second, some
       third, and a detuned twin a few cents off so it is not a dead tone. */
    partials: [1, 0, 0.3],
    decay: 0.22,
    attack: 0.004,
    release: 0.03,
    most: 0.5,
    detune: { ratio: 1.003, level: 0.5 },
  },
  {
    id: 'guitar',
    says: ['hum.guitar', 'Guitar'],
    what: ['hum.guitarWhat', 'Warmer than the pluck and it rings for longer.'],
    shift: 0,
    pitched: true,
    group: 'struck',
    partials: [1, 0.45, 0.3, 0.14, 0.09, 0.05],
    decay: 0.8,
    attack: 0.003,
    release: 0.05,
    most: 2.2,
    detune: { ratio: 1.0015, level: 0.45 },
    /* The plectrum. A tenth of a note's start, which is the difference
       between a string being struck and a tone appearing. */
    breath: 0.22,
    breathFor: 0.06,
  },
  {
    id: 'marimba',
    says: ['hum.marimba', 'Marimba'],
    what: ['hum.marimbaWhat', 'Wooden and hollow, gone almost at once. Good for a fast line.'],
    shift: 0,
    pitched: true,
    group: 'struck',
    /* Odd harmonics only, which is what makes a tube or a bar sound hollow
       rather than merely quiet. */
    partials: [1, 0, 0.4, 0, 0.12],
    decay: 0.28,
    attack: 0.002,
    release: 0.04,
    most: 0.9,
    breath: 0.12,
    breathFor: 0.04,
  },
  {
    id: 'bell',
    says: ['hum.bell', 'Music box'],
    what: ['hum.bellWhat', 'High and glassy, and it rings on. For a lullaby or an ending.'],
    shift: 12,
    pitched: true,
    group: 'struck',
    /* Up an octave and weighted high, with gaps: a struck metal bar's
       partials are not a neat series, and the spread above the fundamental
       is what makes it read as glass rather than as a thin piano. */
    partials: [1, 0.2, 0.35, 0.15, 0.3, 0.1, 0.18],
    decay: 1.6,
    attack: 0.002,
    release: 0.12,
    most: 3.5,
  },

  /* ── Rhythm only ──────────────────────────────────────────────────────

     The one voice that ignores pitch entirely. Kept last because it is the
     one somebody reaches for on purpose rather than by browsing. */
  {
    id: 'drums',
    says: ['hum.drums', 'Drum kit'],
    what: ['hum.drumsWhat', 'Ignores the notes and keeps the rhythm. Hum low for a kick, high for a snare.'],
    shift: 0,
    pitched: false,
    group: 'kit',
    /* Unused: the kit is drawn by `play` rather than from harmonics. Present
       because the shape requires it, and a check holds that every pitched
       voice has real ones. */
    partials: [1],
    decay: 0.05,
    attack: 0,
    release: 0,
  },
];

export const voiceById = (id: string): Voice | undefined =>
  VOICES.find((one) => one.id === id);

const hzOf = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/**
 * A cheap deterministic noise, for the kit.
 *
 * `Math.random` would make this unrepeatable, and a synth that gives a
 * different answer each time is a synth no check can hold. A counter through
 * a hash gives the same hiss every run.
 */
function noiseAt(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** Linear fade in and out, so no note begins or ends with a click. */
function shaped(at: number, length: number, attack: number, release: number): number {
  const up = attack > 0 ? Math.min(1, at / attack) : 1;
  const down = release > 0 ? Math.min(1, (length - at) / release) : 1;
  return Math.max(0, Math.min(up, down));
}

export interface Played {
  readonly midi: number | null;
  readonly from: number;
  readonly to: number;
  readonly loud: number;
}

/**
 * One note, mixed into `out` at `from`.
 *
 * Added rather than written, so two notes that overlap — a held one under a
 * short one — sum instead of the second erasing the first.
 */
function play(
  out: Float32Array,
  voice: Voice,
  note: Played,
  rate: number,
): void {
  const start = Math.max(0, Math.round(note.from * rate));
  const held = Math.max(0.05, note.to - note.from);
  const loud = Math.max(0.08, Math.min(1, note.loud));

  if (!voice.pitched) {
    /* The kit. Pitch chooses the drum rather than the note: a hum below
       about middle C is a kick, above it a snare, and an unpitched tap is a
       hat. That is the mapping her own description implies — "hum low for a
       kick" — and it means one take can be a whole beat. */
    const kind = note.midi === null ? 'hat' : note.midi < 60 ? 'kick' : 'snare';
    const length = kind === 'kick' ? 0.18 : kind === 'snare' ? 0.16 : 0.05;
    const n = Math.min(out.length - start, Math.round(length * rate));
    for (let i = 0; i < n; i += 1) {
      const t = i / rate;
      const fall = Math.exp(-t / (kind === 'kick' ? 0.055 : 0.03));
      let value: number;
      if (kind === 'kick') {
        /* A pitch that drops, which is what a kick is. */
        const hz = 110 * Math.exp(-t / 0.03) + 42;
        value = Math.sin(2 * Math.PI * hz * t);
      } else if (kind === 'snare') {
        value = 0.7 * noiseAt(start + i) + 0.3 * Math.sin(2 * Math.PI * 190 * t);
      } else {
        value = noiseAt(start + i) * 0.5;
      }
      out[start + i] += value * fall * loud * 0.8;
    }
    return;
  }

  const midi = (note.midi ?? 60) + voice.shift;
  const hz = hzOf(midi);
  /* How long the note sounds. A struck instrument has a ceiling of its own
     — `most` — because a hum held for four seconds does not make a marimba
     ring for four seconds. A held one lasts as long as it was hummed. */
  const length = voice.most ? Math.min(held, voice.most) : held;
  const n = Math.min(out.length - start, Math.round(length * rate));

  /* The fall. A fixed `decay` is a note that dies on its own; zero means it
     is held, and then the fall is taken over the note's own length with a
     floor under it — which is how the three voices that existed before this
     was data were written, and these are their numbers unchanged. */
  const fall = voice.decay > 0
    ? voice.decay
    : Math.max(voice.decayFloor ?? 0.2, length);

  /* Normalised, so an instrument with eight harmonics is not eight times as
     loud as one with two. Without this, adding a richer voice to the list
     would quietly make it the loudest thing in the room — and a part that
     clips is a part somebody blames the recording for. */
  const weight = voice.partials.reduce((all, one) => all + Math.abs(one), 0)
    * (1 + (voice.detune?.level ?? 0));
  const level = weight > 0 ? 1 / weight : 1;

  for (let i = 0; i < n; i += 1) {
    const t = i / rate;
    const env = shaped(t, length, voice.attack, voice.release);

    /* The harmonics, summed. Index zero is the fundamental, so harmonic
       `k + 1` is at `(k + 1) × hz`. */
    let value = 0;
    for (let k = 0; k < voice.partials.length; k += 1) {
      const amount = voice.partials[k];
      if (amount === 0) continue;
      value += amount * Math.sin(2 * Math.PI * hz * (k + 1) * t);
    }

    /* The twin a little out of tune. One copy of the fundamental is enough
       for the width — detuning every harmonic as well is a chorus pedal and
       costs eight more sines a sample. */
    if (voice.detune) {
      value += voice.detune.level * Math.sin(2 * Math.PI * hz * voice.detune.ratio * t);
    }

    /* Breath, bow or plectrum. Over the whole note for a wind instrument,
       over the first few milliseconds for something struck. */
    if (voice.breath) {
      const over = voice.breathFor ?? 1;
      const within = over >= 1 ? 1 : Math.max(0, 1 - t / (over * Math.max(0.001, length)));
      if (within > 0) value += voice.breath * noiseAt(start + i) * within;
    }

    out[start + i] += value * level * env * Math.exp(-t / Math.max(0.02, fall))
      * loud * 0.9;
  }
}

/**
 * The whole part, as samples.
 *
 * `seconds` is how long the result should be — normally the length of the
 * take it came from, so the part lines up with everything else recorded
 * against the same click. A tail is added for the last note's decay, because
 * a part that ends exactly on its last note ends with a click.
 */
export function renderHum(
  notes: readonly Played[],
  voice: Voice,
  seconds?: number,
  /* The session's rate, when there is one. A part rendered at 44,100 and
     dropped into a desk running at 48,000 plays a semitone and a bit flat,
     which is the kind of wrong that sounds like the pitch detection failing
     rather than like a resampling bug. */
  rate: number = RATE,
): Float32Array {
  const last = notes.reduce((most, one) => Math.max(most, one.to), 0);
  const total = Math.max(seconds ?? 0, last) + 0.4;
  const out = new Float32Array(Math.max(1, Math.round(total * rate)));
  for (const note of notes) play(out, voice, note, rate);

  /* Soft clipping rather than hard, the same as `renderSketch` does: notes
     that overlap sum past 1, and a hard clip on a sine is a buzz. */
  for (let i = 0; i < out.length; i += 1) out[i] = Math.tanh(out[i] * 1.1) * 0.85;
  return out;
}
