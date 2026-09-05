/**
 * Listening to a song somebody already likes, and writing a style from it.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * Carli: "Is daar nie 'n manier dat iemand 'n liedjie kan oplaai sodat die app
 * na die styl kan luister en daarna die styl vir die liedjie kies nie … dit is
 * net om 'n idee te kry vir 'n styl."
 *
 * Describing a sound in words is the hardest part of making a song here, and
 * getting it wrong costs a generation. Everybody has a song they can point at.
 * So: point at one, and the app measures it and writes the description.
 *
 * ── What it is not ───────────────────────────────────────────────────────
 *
 * It is not a fine-tune and it does not clone anything. Nothing of the file is
 * kept and nothing of it is sent anywhere — it is decoded in the browser,
 * measured, and the numbers become words. What reaches the engine is a
 * sentence like "112 BPM, A minor, warm, sparse, heavy low end", which is the
 * same kind of sentence somebody would have typed themselves.
 *
 * That matters legally as well as technically. Somebody else's recording never
 * leaves the device, so no rights in it are exercised: what is taken from it
 * is tempo, key and tone colour — facts about a sound, not the sound.
 *
 * ── What it actually measures ────────────────────────────────────────────
 *
 * Tempo, by the spacing of the loudest moments. Key, by which twelve notes
 * carry the energy, matched against the classical major and minor profiles.
 * Brightness, by where the energy sits in the spectrum. Weight, by how much of
 * it is under a hundred and twenty hertz. Density, by how often something new
 * starts. Punch, by peak against average.
 *
 * None of that is a genre and this file does not pretend otherwise: it says
 * "112 BPM, A minor, bright, busy", which is what it knows. A person reads
 * that and adds the word "boeremusiek" themselves, and that division of labour
 * is the honest one.
 *
 * ── Why the maths is here rather than in a library ───────────────────────
 *
 * Because it has to run on samples this file is handed, so it can be checked
 * against a signal built on purpose — a click at a known tempo, a chord in a
 * known key. Everything below takes a Float32Array and a sample rate. The
 * decoding is somebody else's problem, and it is separated for exactly that
 * reason.
 */

/** What the app heard, in numbers, before any of it becomes words. */
export interface Heard {
  /** Beats a minute, or 0 when nothing steady enough was found. */
  readonly bpm: number;
  /** "A minor", "C major", or an empty string when no key was clear. */
  readonly key: string;
  /** Where the energy sits, 0 (dark) to 1 (bright). */
  readonly brightness: number;
  /** How much is under 120 Hz, 0 to 1. */
  readonly weight: number;
  /** New sounds a second. */
  readonly density: number;
  /** Peak against average: high is punchy, low is squashed. */
  readonly punch: number;
  readonly seconds: number;
}

const PITCHES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

/* Krumhansl–Kessler's key profiles: how much each of the twelve notes is used
   in a major and a minor key, measured from listeners rather than assumed. */
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/**
 * A radix-2 FFT, in place, on interleaved real and imaginary parts.
 *
 * Written out rather than pulled in because the whole of this file has to run
 * on a Float32Array that a test can build, and a browser-only analyser node
 * cannot be handed one.
 */
function fft(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const step = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k += 1) {
        const angle = step * k;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const ar = real[i + k];
        const ai = imag[i + k];
        const br = real[i + k + len / 2] * cos - imag[i + k + len / 2] * sin;
        const bi = real[i + k + len / 2] * sin + imag[i + k + len / 2] * cos;
        real[i + k] = ar + br;
        imag[i + k] = ai + bi;
        real[i + k + len / 2] = ar - br;
        imag[i + k + len / 2] = ai - bi;
      }
    }
  }
}

/** How loud each short window is, which is what a beat is found in. */
function envelope(samples: Float32Array, rate: number, hop: number): Float32Array {
  const frames = Math.max(1, Math.floor(samples.length / hop));
  const out = new Float32Array(frames);
  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    const from = f * hop;
    const to = Math.min(samples.length, from + hop);
    for (let i = from; i < to; i += 1) sum += samples[i] * samples[i];
    out[f] = Math.sqrt(sum / Math.max(1, to - from));
  }
  return out;
}

/**
 * The tempo, from how far apart the loud moments are.
 *
 * The rises in loudness are what a listener taps along to, so the envelope is
 * differentiated — only what got louder counts — and then correlated with
 * itself at every spacing between 60 and 190 beats a minute. The spacing that
 * matches itself best is the beat.
 */
export function tempoOf(samples: Float32Array, rate: number): number {
  const hop = Math.max(1, Math.round(rate / 100)); // ten milliseconds
  const env = envelope(samples, rate, hop);
  if (env.length < 200) return 0;

  const rise = new Float32Array(env.length);
  for (let i = 1; i < env.length; i += 1) rise[i] = Math.max(0, env[i] - env[i - 1]);

  const perFrame = rate / hop;
  const lowest = Math.floor((perFrame * 60) / 190);
  const highest = Math.ceil((perFrame * 60) / 60);

  let best = 0;
  let bestScore = 0;
  for (let lag = lowest; lag <= highest && lag < rise.length / 2; lag += 1) {
    let score = 0;
    for (let i = 0; i + lag < rise.length; i += 1) score += rise[i] * rise[i + lag];
    /* Divided by the count, or a short lag wins simply by having more terms to
       add up — which is how a tempo detector ends up saying 190 for everything. */
    score /= rise.length - lag;
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  if (!best) return 0;

  let bpm = (perFrame * 60) / best;
  /* Halved or doubled into the range people actually count in. A detector that
     answers 172 for a 86 BPM ballad is not wrong about the spacing, it is
     wrong about which spacing is the beat. */
  while (bpm > 190) bpm /= 2;
  while (bpm < 60) bpm *= 2;
  return Math.round(bpm);
}

/**
 * The twelve notes, and how much of the song each one carries.
 *
 * A handful of windows across the file rather than the whole of it: a chorus
 * and a verse are in the same key, and forty FFTs answer the question as well
 * as four thousand do.
 */
export function chromaOf(samples: Float32Array, rate: number): number[] {
  const size = 4096;
  const chroma = new Array<number>(12).fill(0);
  const windows = Math.min(40, Math.max(1, Math.floor(samples.length / size)));
  if (samples.length < size) return chroma;
  const step = Math.floor((samples.length - size) / windows) || size;

  for (let w = 0; w < windows; w += 1) {
    const from = w * step;
    const real = new Float32Array(size);
    const imag = new Float32Array(size);
    for (let i = 0; i < size; i += 1) {
      // Hann, so the edges of the window do not ring across the spectrum.
      const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
      real[i] = (samples[from + i] ?? 0) * hann;
    }
    fft(real, imag);
    for (let bin = 2; bin < size / 2; bin += 1) {
      const hz = (bin * rate) / size;
      if (hz < 55 || hz > 2000) continue;
      const power = real[bin] * real[bin] + imag[bin] * imag[bin];
      // A4 = 440 Hz is pitch class 9; everything else follows from twelve
      // equal steps to the octave.
      const note = Math.round(12 * Math.log2(hz / 440) + 69) % 12;
      chroma[(note + 12) % 12] += power;
    }
  }
  const most = Math.max(...chroma) || 1;
  return chroma.map((one) => one / most);
}

/** Which key those twelve notes fit best, or nothing when none of them does. */
export function keyOf(chroma: readonly number[]): string {
  const total = chroma.reduce((sum, one) => sum + one, 0);
  if (total <= 0) return '';

  const score = (profile: readonly number[], root: number): number => {
    let sum = 0;
    for (let i = 0; i < 12; i += 1) sum += chroma[(root + i) % 12] * profile[i];
    return sum;
  };

  let best = { name: '', value: -Infinity };
  for (let root = 0; root < 12; root += 1) {
    const major = score(MAJOR, root);
    const minor = score(MINOR, root);
    if (major > best.value) best = { name: `${PITCHES[root]} major`, value: major };
    if (minor > best.value) best = { name: `${PITCHES[root]} minor`, value: minor };
  }
  return best.name;
}

/** Everything measurable about a stretch of sound. */
export function measure(samples: Float32Array, rate: number): Heard {
  const seconds = samples.length / rate;

  let peak = 0;
  let square = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.abs(samples[i]);
    if (value > peak) peak = value;
    square += samples[i] * samples[i];
  }
  const rms = Math.sqrt(square / Math.max(1, samples.length));
  const punch = rms > 0 ? peak / rms : 0;

  /* Brightness and weight from one pass of the spectrum, averaged over the
     same windows the chroma uses. */
  const size = 4096;
  let centroid = 0;
  let low = 0;
  let all = 0;
  const windows = Math.min(20, Math.max(1, Math.floor(samples.length / size)));
  if (samples.length >= size) {
    const step = Math.floor((samples.length - size) / windows) || size;
    for (let w = 0; w < windows; w += 1) {
      const real = new Float32Array(size);
      const imag = new Float32Array(size);
      for (let i = 0; i < size; i += 1) {
        const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
        real[i] = (samples[w * step + i] ?? 0) * hann;
      }
      fft(real, imag);
      for (let bin = 1; bin < size / 2; bin += 1) {
        const hz = (bin * rate) / size;
        const power = Math.sqrt(real[bin] * real[bin] + imag[bin] * imag[bin]);
        centroid += hz * power;
        all += power;
        if (hz < 120) low += power;
      }
    }
  }
  const centre = all > 0 ? centroid / all : 0;

  /* Onsets: a frame that is markedly louder than the one before it. The
     threshold is relative, so a quiet recording is not called sparse for being
     quiet. */
  const hop = Math.max(1, Math.round(rate / 100));
  const env = envelope(samples, rate, hop);
  let mean = 0;
  for (let i = 0; i < env.length; i += 1) mean += env[i];
  mean /= Math.max(1, env.length);
  let onsets = 0;
  for (let i = 1; i < env.length; i += 1) {
    if (env[i] - env[i - 1] > mean * 0.35) onsets += 1;
  }

  return {
    bpm: tempoOf(samples, rate),
    key: keyOf(chromaOf(samples, rate)),
    /* Four thousand hertz as the top of the scale: a centroid above that is
       a cymbal wash rather than a bright mix. */
    brightness: Math.min(1, centre / 4000),
    weight: all > 0 ? low / all : 0,
    density: seconds > 0 ? onsets / seconds : 0,
    punch,
    seconds,
  };
}

/**
 * The measurements, as words somebody would actually write in the style box.
 *
 * Deliberately short. A style list is a direction and the model weights the
 * early entries most, so this contributes four or five things it is sure of
 * and leaves the genre to the person — who knows it and cannot be told it by
 * a spectrum.
 */
export function wordsFor(heard: Heard): string[] {
  const words: string[] = [];
  if (heard.bpm > 0) words.push(`${heard.bpm} BPM`);
  if (heard.key) words.push(heard.key);

  words.push(
    heard.brightness > 0.55 ? 'bright' : heard.brightness > 0.3 ? 'warm' : 'dark',
  );
  if (heard.weight > 0.35) words.push('heavy low end');
  else if (heard.weight < 0.12) words.push('light on the bass');

  if (heard.density > 6) words.push('busy arrangement');
  else if (heard.density < 2) words.push('sparse arrangement');

  if (heard.punch > 6) words.push('punchy, lots of dynamics');
  else if (heard.punch < 3) words.push('steady, compressed');

  return words;
}

/**
 * Listen to a file and describe it. Browser only — it needs a decoder.
 *
 * Mixed to mono first: a style is not a stereo image, and one channel of a
 * wide mix is missing whatever was panned away from it.
 */
export async function listenTo(file: Blob): Promise<Heard | null> {
  const Ctx =
    typeof window === 'undefined'
      ? null
      : window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  const context = new Ctx();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    const length = buffer.length;
    const mono = new Float32Array(length);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) mono[i] += data[i] / buffer.numberOfChannels;
    }
    /* Ninety seconds is plenty and keeps a ten-minute file from locking the
       page up. Taken from a quarter of the way in, past the intro. */
    const rate = buffer.sampleRate;
    const most = Math.min(length, rate * 90);
    const from = Math.min(Math.floor(length / 4), Math.max(0, length - most));
    return measure(mono.subarray(from, from + most), rate);
  } catch {
    return null;
  } finally {
    void context.close();
  }
}
