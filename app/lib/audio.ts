/**
 * The sketch engine.
 *
 * FutureBox has no music model behind it, and inventing an integration with a
 * provider I cannot reach would be a button that lies. So Generate does the one
 * thing that can honestly work in a browser: it renders a real piece of audio
 * from your chosen key, tempo and style — drums, bass, chords and a top line —
 * and hands you a file you can play, download and remix.
 *
 * It is a sketch, not a song, and the UI says so in those words. What it gives
 * you is the shape: does this tempo sit right, does this key suit the lyric, is
 * the section order working. Those are the questions you want answered before
 * you spend a generation on a real engine, and they are answerable from a
 * sketch. When an engine is connected, the same pipeline carries its audio
 * instead — see `app/lib/engines.ts`.
 */

const SAMPLE_RATE = 44100;

/** Semitone offsets from the root, by scale. */
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

const ROOTS: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6,
  Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

export interface SketchSpec {
  readonly bpm: number;
  /** e.g. "G Major", "D Minor". */
  readonly key: string;
  /** Drives which instruments show up and how busy they are. */
  readonly family: 'dance' | 'band' | 'acoustic' | 'hiphop' | 'cinematic';
  readonly bars: number;
  /** Same seed, same sketch. A new seed is a new take. */
  readonly seed: number;
}

export function familyFor(genre: string, tags: readonly string[]): SketchSpec['family'] {
  const t = `${genre} ${tags.join(' ')}`.toLowerCase();
  if (/techno|house|edm|dance|synth|drop|club/.test(t)) return 'dance';
  if (/hip.?hop|boom bap|trap|rap/.test(t)) return 'hiphop';
  if (/score|cinematic|orchestr|strings/.test(t)) return 'cinematic';
  if (/acoustic|folk|country|jingle|lo-?fi/.test(t)) return 'acoustic';
  return 'band';
}

function parseKey(key: string): { root: number; scale: number[] } {
  const match = key.trim().match(/^([A-G][#b♭♯]?)\s*(major|minor)?/i);
  const rootName = (match?.[1] ?? 'C').replace('♭', 'b').replace('♯', '#');
  const isMinor = /minor/i.test(key);
  return { root: ROOTS[rootName] ?? 0, scale: isMinor ? MINOR : MAJOR };
}

/** Midi note number to frequency. */
function hz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Deterministic, so the same seed always renders the same sketch. */
function rng(seed: number): () => number {
  let state = (seed * 1664525 + 1013904223) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

/** Four-chord loops that carry a whole sketch without wearing out. */
const PROGRESSIONS: Record<SketchSpec['family'], number[][]> = {
  dance: [[0, 5, 3, 4], [0, 3, 4, 3]],
  band: [[0, 4, 5, 3], [0, 5, 3, 4]],
  acoustic: [[0, 3, 4, 0], [0, 4, 5, 4]],
  hiphop: [[0, 5, 3, 4], [0, 2, 3, 4]],
  cinematic: [[0, 5, 3, 6], [0, 3, 5, 4]],
};

interface Voice {
  render(buffer: Float32Array, spec: SketchSpec, random: () => number): void;
}

function envelope(i: number, length: number, attack: number, release: number): number {
  const a = Math.min(1, i / Math.max(1, attack));
  const r = Math.min(1, (length - i) / Math.max(1, release));
  return Math.max(0, Math.min(a, r));
}

function addTone(
  buffer: Float32Array,
  startSample: number,
  lengthSamples: number,
  frequency: number,
  gain: number,
  timbre: 'sine' | 'saw' | 'square' | 'triangle',
  attack = 200,
  release = 2000,
): void {
  for (let i = 0; i < lengthSamples; i++) {
    const at = startSample + i;
    if (at >= buffer.length) break;
    const phase = (frequency * at) / SAMPLE_RATE;
    const cycle = phase - Math.floor(phase);
    let sample: number;
    switch (timbre) {
      case 'saw': sample = 2 * cycle - 1; break;
      case 'square': sample = cycle < 0.5 ? 1 : -1; break;
      case 'triangle': sample = 4 * Math.abs(cycle - 0.5) - 1; break;
      default: sample = Math.sin(2 * Math.PI * phase);
    }
    buffer[at] += sample * gain * envelope(i, lengthSamples, attack, release);
  }
}

function addNoise(buffer: Float32Array, startSample: number, lengthSamples: number, gain: number, random: () => number): void {
  for (let i = 0; i < lengthSamples; i++) {
    const at = startSample + i;
    if (at >= buffer.length) break;
    buffer[at] += (random() * 2 - 1) * gain * envelope(i, lengthSamples, 20, lengthSamples * 0.8);
  }
}

function addKick(buffer: Float32Array, startSample: number, gain: number): void {
  const length = Math.floor(SAMPLE_RATE * 0.28);
  for (let i = 0; i < length; i++) {
    const at = startSample + i;
    if (at >= buffer.length) break;
    // The pitch drop is what makes a sine sound like a kick rather than a beep.
    const sweep = 110 * Math.exp((-i / SAMPLE_RATE) * 22) + 42;
    buffer[at] += Math.sin((2 * Math.PI * sweep * i) / SAMPLE_RATE) * gain * Math.exp((-i / SAMPLE_RATE) * 9);
  }
}

/** Renders the sketch as mono float samples. */
export function renderSketch(spec: SketchSpec): Float32Array {
  const { root, scale } = parseKey(spec.key);
  const random = rng(spec.seed);
  const secondsPerBeat = 60 / spec.bpm;
  const samplesPerBeat = Math.floor(SAMPLE_RATE * secondsPerBeat);
  const samplesPerBar = samplesPerBeat * 4;
  const total = samplesPerBar * spec.bars + SAMPLE_RATE; // a bar's worth of tail
  const buffer = new Float32Array(total);

  const progression = PROGRESSIONS[spec.family][Math.floor(random() * PROGRESSIONS[spec.family].length)];
  const busy = spec.family === 'dance' || spec.family === 'hiphop';

  for (let bar = 0; bar < spec.bars; bar++) {
    const barStart = bar * samplesPerBar;
    const degree = progression[bar % progression.length];
    const chordRoot = 48 + root + scale[degree % scale.length] + (degree >= scale.length ? 12 : 0);

    // Chords — the bed everything else sits on.
    if (spec.family !== 'hiphop') {
      [0, 2, 4].forEach((step, i) => {
        const note = chordRoot + scale[(degree + step) % scale.length] - scale[degree % scale.length] + (step === 0 ? 0 : 0);
        addTone(
          buffer, barStart, samplesPerBar,
          hz(note + 12),
          spec.family === 'cinematic' ? 0.10 : 0.07,
          spec.family === 'acoustic' ? 'triangle' : 'saw',
          spec.family === 'cinematic' ? 12000 : 1500,
          samplesPerBar * 0.4,
        );
      });
    }

    // Bass — root of the chord, on the beat.
    const bassBeats = busy ? [0, 1, 2, 3] : [0, 2];
    bassBeats.forEach((beat) => {
      addTone(buffer, barStart + beat * samplesPerBeat, Math.floor(samplesPerBeat * 0.9), hz(chordRoot - 12), 0.24, 'triangle', 300, 3000);
    });

    // Drums.
    if (spec.family !== 'cinematic') {
      const kickBeats = spec.family === 'hiphop' ? [0, 2.5] : busy ? [0, 1, 2, 3] : [0, 2];
      kickBeats.forEach((beat) => addKick(buffer, barStart + Math.floor(beat * samplesPerBeat), 0.55));
      [1, 3].forEach((beat) => addNoise(buffer, barStart + beat * samplesPerBeat, Math.floor(SAMPLE_RATE * 0.11), 0.16, random));
      if (busy) {
        for (let eighth = 0; eighth < 8; eighth++) {
          addNoise(buffer, barStart + Math.floor((eighth * samplesPerBeat) / 2), Math.floor(SAMPLE_RATE * 0.03), 0.05, random);
        }
      }
    }

    // Top line — only once the bed is established, so the opening breathes.
    if (bar >= 2) {
      const steps = busy ? 8 : 4;
      for (let step = 0; step < steps; step++) {
        if (random() < 0.35) continue;
        const degreeUp = degree + Math.floor(random() * 5) * 2;
        const note = 60 + root + scale[degreeUp % scale.length] + (degreeUp >= scale.length ? 12 : 0);
        addTone(
          buffer,
          barStart + Math.floor((step * samplesPerBar) / steps),
          Math.floor(samplesPerBar / steps),
          hz(note),
          0.12,
          spec.family === 'dance' ? 'square' : 'sine',
          400,
          1200,
        );
      }
    }
  }

  // Fade the last bar so it ends rather than stops.
  const fade = samplesPerBar;
  for (let i = 0; i < fade; i++) {
    const at = buffer.length - fade + i;
    if (at >= 0 && at < buffer.length) buffer[at] *= 1 - i / fade;
  }

  // Soft-clip rather than letting peaks tear.
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.tanh(buffer[i] * 1.1) * 0.85;
  }
  return buffer;
}

/** Wraps mono samples in a WAV container so it can be played and downloaded. */
export function encodeWav(samples: Float32Array): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);            // PCM
  view.setUint16(22, 1, true);            // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped * 0x7fff, true);
    offset += 2;
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

export function sketchDurationSeconds(spec: SketchSpec): number {
  return (spec.bars * 4 * 60) / spec.bpm;
}
