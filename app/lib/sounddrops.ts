/**
 * The podcast desk's sound pads: four built in, each one replaceable by a
 * sound the member describes in words.
 *
 * The pads were labelled Intro theme, Applause, Stinger and Sonar, and played
 * whatever effect the app's button sounds had to hand: "Applause" was a
 * sparkle. Now each built-in pad is the sound it says, drawn on the device
 * (no file to download, nothing charged), and any pad can be made into
 * something of the member's own from a sentence ("a taxi hooter, twice",
 * "a crowd in a small club cheering") through the sound-effect engine the
 * video editor already uses, at its price. A made sound is kept on the
 * device under the pad and can be put back to the built-in one.
 */
import { deleteAudio, getAudio, putAudio } from './library';

export const PADS = ['intro', 'applause', 'stinger', 'drumroll'] as const;
export type PadId = (typeof PADS)[number];

export const PAD_NAMES: Record<PadId, readonly [string, string]> = {
  intro: ['pod.padIntro', 'Intro'],
  applause: ['pod.padApplause', 'Applause'],
  stinger: ['pod.padStinger', 'Stinger'],
  drumroll: ['pod.padDrumroll', 'Drum roll'],
};

const RATE = 44100;

/** A little seeded noise, so a pad sounds the same every time it is drawn. */
function noise(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s / 0xffffffff) * 2 - 1;
  };
}

/** One clap: a burst of noise with a fast attack and a short tail. */
function clap(out: Float32Array, at: number, loud: number, rand: () => number): void {
  const length = Math.round(0.06 * RATE);
  for (let i = 0; i < length && at + i < out.length; i += 1) {
    const env = Math.exp(-i / (0.012 * RATE));
    out[at + i] += rand() * env * loud;
  }
}

/** The built-in pads, as raw samples, never louder than -2 dB. */
export function builtIn(pad: PadId): Float32Array {
  const samples = drawn(pad);
  let top = 0;
  for (let i = 0; i < samples.length; i += 1) top = Math.max(top, Math.abs(samples[i]));
  const scale = top > 0 ? 0.8 / top : 1;
  for (let i = 0; i < samples.length; i += 1) samples[i] *= scale;
  return samples;
}

function drawn(pad: PadId): Float32Array {
  const rand = noise(PADS.indexOf(pad) + 7);
  if (pad === 'applause') {
    const seconds = 3.2;
    const out = new Float32Array(Math.round(seconds * RATE));
    /* A room of people: claps at random, thickening, then thinning. */
    for (let n = 0; n < 900; n += 1) {
      const t = Math.abs(rand()) * seconds;
      const swell = Math.sin(Math.PI * Math.min(1, t / seconds)) ** 0.6;
      clap(out, Math.round(t * RATE), 0.18 * swell * (0.5 + Math.abs(rand())), rand);
    }
    return out;
  }
  if (pad === 'drumroll') {
    const seconds = 2.2;
    const out = new Float32Array(Math.round(seconds * RATE));
    /* Strokes closer and louder, then one hit. */
    let t = 0;
    while (t < 1.8) {
      const progress = t / 1.8;
      clap(out, Math.round(t * RATE), 0.15 + 0.35 * progress, rand);
      t += 0.07 - 0.04 * progress;
    }
    const hit = Math.round(1.85 * RATE);
    for (let i = 0; hit + i < out.length; i += 1) {
      const env = Math.exp(-i / (0.12 * RATE));
      out[hit + i] += (rand() * 0.6 + Math.sin((2 * Math.PI * 70 * i) / RATE) * 0.8) * env * 0.7;
    }
    return out;
  }
  if (pad === 'stinger') {
    const seconds = 1.6;
    const out = new Float32Array(Math.round(seconds * RATE));
    /* A rising whoosh into a bright chord. */
    let low = 0;
    for (let i = 0; i < Math.round(0.7 * RATE); i += 1) {
      const p = i / (0.7 * RATE);
      const k = 0.02 + p * 0.3;
      low += k * (rand() - low);
      out[i] = low * p * 0.9;
    }
    const at = Math.round(0.7 * RATE);
    for (let i = 0; at + i < out.length; i += 1) {
      const env = Math.exp(-i / (0.35 * RATE));
      const s = [523.25, 659.25, 783.99, 1046.5]
        .reduce((sum, f) => sum + Math.sin((2 * Math.PI * f * i) / RATE), 0) / 4;
      out[at + i] += s * env * 0.6;
    }
    return out;
  }
  /* The intro: three rising notes and a held chord. */
  const seconds = 2.6;
  const out = new Float32Array(Math.round(seconds * RATE));
  const notes = [[0, 392], [0.25, 523.25], [0.5, 659.25]] as const;
  for (const [start, f] of notes) {
    const from = Math.round(start * RATE);
    for (let i = 0; from + i < out.length; i += 1) {
      const env = Math.min(1, i / (0.01 * RATE)) * Math.exp(-i / (1.1 * RATE));
      const tone = Math.sin((2 * Math.PI * f * i) / RATE) + 0.3 * Math.sin((2 * Math.PI * f * 2 * i) / RATE);
      out[from + i] += tone * env * 0.22;
    }
  }
  return out;
}

/** The key a made sound is kept under on the device. */
export const madeKey = (pad: PadId): string => `drop:${pad}`;

/** A pad's sound, ready to play: the member's own if they made one, else the built-in. */
export async function padSound(context: BaseAudioContext, pad: PadId): Promise<{ buffer: AudioBuffer; made: boolean }> {
  const own = await getAudio(madeKey(pad)).catch(() => null);
  if (own) {
    try {
      return { buffer: await context.decodeAudioData(await own.arrayBuffer()), made: true };
    } catch {
      /* A kept file that no longer decodes falls back to the built-in. */
    }
  }
  const samples = builtIn(pad);
  const buffer = context.createBuffer(1, samples.length, RATE);
  buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
  return { buffer, made: false };
}

export const keepMade = (pad: PadId, audio: Blob): Promise<void> => putAudio(madeKey(pad), audio);
export const forgetMade = (pad: PadId): Promise<void> => deleteAudio(madeKey(pad));
