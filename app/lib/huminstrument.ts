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
 * ── Why four and not twenty ──────────────────────────────────────────────
 *
 * Because every one of them has to be worth choosing. Four voices that each
 * do something a hum cannot — a low end, a sustained chord instrument, a
 * short percussive one, and a kit that ignores pitch entirely — cover what
 * somebody humming a part is actually reaching for. A list of twenty is a
 * list nobody reads past the third.
 */

/** The one this app writes samples at, as `lib/audio.ts` does. */
export const RATE = 44100;

export type VoiceId = 'bass' | 'keys' | 'pluck' | 'drums';

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
}

export const VOICES: readonly Voice[] = [
  {
    id: 'bass',
    says: ['hum.bass', 'Bass'],
    what: ['hum.bassWhat', 'An octave down from what you hummed, round and short.'],
    /* Down an octave, because a voice hums a bass part an octave above where
       a bass plays it — everybody does, and transposing it back is the
       difference between a bass line and a sung one. */
    shift: -12,
    pitched: true,
  },
  {
    id: 'keys',
    says: ['hum.keys', 'Electric piano'],
    what: ['hum.keysWhat', 'Soft and sustained, at the pitch you hummed.'],
    shift: 0,
    pitched: true,
  },
  {
    id: 'pluck',
    says: ['hum.pluck', 'Plucked string'],
    what: ['hum.pluckWhat', 'Short and bright, good for a riff.'],
    shift: 0,
    pitched: true,
  },
  {
    id: 'drums',
    says: ['hum.drums', 'Drum kit'],
    what: ['hum.drumsWhat', 'Ignores the notes and keeps the rhythm. Hum low for a kick, high for a snare.'],
    shift: 0,
    pitched: false,
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
  const length = voice.id === 'pluck' ? Math.min(held, 0.5) : held;
  const n = Math.min(out.length - start, Math.round(length * rate));
  const attack = voice.id === 'keys' ? 0.012 : 0.004;
  const release = voice.id === 'keys' ? 0.06 : 0.03;

  for (let i = 0; i < n; i += 1) {
    const t = i / rate;
    const env = shaped(t, length, attack, release);
    let value: number;
    if (voice.id === 'bass') {
      /* A sine with a little of the octave above it. A pure sine disappears
         on a phone speaker, which has nothing below about 200Hz — the
         harmonic is what makes the line audible there at all. */
      value = Math.sin(2 * Math.PI * hz * t) + 0.25 * Math.sin(4 * Math.PI * hz * t);
      value *= Math.exp(-t / Math.max(0.2, length));
    } else if (voice.id === 'keys') {
      value = Math.sin(2 * Math.PI * hz * t)
        + 0.35 * Math.sin(4 * Math.PI * hz * t)
        + 0.12 * Math.sin(6 * Math.PI * hz * t);
      value *= Math.exp(-t / Math.max(0.6, length));
    } else {
      /* Plucked: bright at the attack and gone quickly, with a second voice
         a few cents off so it is not a dead tone. */
      value = Math.sin(2 * Math.PI * hz * t)
        + 0.5 * Math.sin(2 * Math.PI * hz * 1.003 * t)
        + 0.3 * Math.sin(6 * Math.PI * hz * t);
      value *= Math.exp(-t / 0.22);
    }
    out[start + i] += value * env * loud * 0.3;
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
