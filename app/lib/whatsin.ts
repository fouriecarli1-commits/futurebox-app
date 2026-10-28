/**
 * What is in a piece of sound: a voice, instruments, a steady hum, or quiet.
 *
 * The owner, 28 October 2026, with a piece marked in the Pro Booth: *"Hierdie
 * marker se AI magic moet dalk ook 'n gedeelte hê wat sê hum and instrument
 * or vocal in this part."* Heard on the device, from the samples the booth
 * already holds: nothing is sent and nothing is charged. It is a reading of
 * the sound's shape, not a model that knows what a voice is, so the screen
 * says "sounds like" and never more.
 *
 * ── How each is told ─────────────────────────────────────────────────────
 *
 * The piece is brought down to about 11 kHz (a voice and the body of most
 * instruments live well below 5 kHz) and read in short frames:
 *
 *  - **quiet**: almost every frame is near silence.
 *  - **hum**: a steady pitch that hardly moves and a sound that hardly
 *    changes frame to frame — a drone, a mains hum, a held organ note.
 *  - **voice**: a pitch that is there most of the time and keeps moving
 *    (sung or spoken), with its weight in the speech band, 300 Hz to 3.4 kHz.
 *  - **instruments**: everything with sound in it that is not only those —
 *    noisy hits, bass under a voice, chords.
 */
import { fft } from './spectrogram';

export type Heard = 'quiet' | 'voice' | 'instruments' | 'hum';

const TARGET = 11025;
const FRAME = 1024;
const MOST_FRAMES = 400;

/** Brought down to about 11 kHz by averaging, which also filters off what is above. */
function slower(mono: Float32Array, rate: number): { samples: Float32Array; rate: number } {
  const step = Math.max(1, Math.round(rate / TARGET));
  if (step === 1) return { samples: mono, rate };
  const out = new Float32Array(Math.floor(mono.length / step));
  for (let i = 0; i < out.length; i += 1) {
    let sum = 0;
    for (let k = 0; k < step; k += 1) sum += mono[i * step + k];
    out[i] = sum / step;
  }
  return { samples: out, rate: rate / step };
}

const median = (values: number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

export function whatsIn(mono: Float32Array, sampleRate: number): Heard[] {
  const { samples, rate } = slower(mono, sampleRate);
  if (samples.length < FRAME) return ['quiet'];
  const count = Math.min(MOST_FRAMES, Math.max(1, Math.floor((samples.length - FRAME) / (FRAME / 2)) + 1));
  const hop = count > 1 ? (samples.length - FRAME) / (count - 1) : 0;
  const window = new Float32Array(FRAME);
  for (let i = 0; i < FRAME; i += 1) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1));
  const hzPerBin = rate / FRAME;
  const minLag = Math.floor(rate / 1000);
  const maxLag = Math.min(FRAME - 1, Math.ceil(rate / 75));

  const levels: number[] = [];
  const frames: { level: number; speech: number; low: number; flat: number; flux: number; pitch: number | null }[] = [];
  let before: Float32Array | null = null;
  const re = new Float32Array(FRAME);
  const im = new Float32Array(FRAME);

  for (let f = 0; f < count; f += 1) {
    const from = Math.round(f * hop);
    let energy = 0;
    for (let i = 0; i < FRAME; i += 1) {
      const v = samples[from + i] ?? 0;
      energy += v * v;
      re[i] = v * window[i];
      im[i] = 0;
    }
    const level = Math.sqrt(energy / FRAME);
    levels.push(level);

    /* The pitch, by how well the frame lines up with itself one period on. */
    let pitch: number | null = null;
    if (level > 0.002) {
      let best = 0;
      let bestLag = 0;
      for (let lag = minLag; lag <= maxLag; lag += 1) {
        let sum = 0;
        let a = 0;
        let b = 0;
        for (let i = 0; i + lag < FRAME; i += 2) {
          const x = samples[from + i] ?? 0;
          const y = samples[from + i + lag] ?? 0;
          sum += x * y; a += x * x; b += y * y;
        }
        const r = a > 0 && b > 0 ? sum / Math.sqrt(a * b) : 0;
        if (r > best) { best = r; bestLag = lag; }
      }
      if (best > 0.6 && bestLag) pitch = rate / bestLag;
    }

    fft(re, im);
    const half = FRAME / 2;
    const magnitude = new Float32Array(half);
    let all = 0; let speech = 0; let low = 0; let logSum = 0; let linSum = 0; let counted = 0;
    for (let k = 1; k < half; k += 1) {
      const m = Math.hypot(re[k], im[k]);
      magnitude[k] = m;
      const hz = k * hzPerBin;
      const p = m * m;
      all += p;
      if (hz >= 300 && hz <= 3400) speech += p;
      if (hz < 250) low += p;
      if (hz >= 100 && hz <= 5000) { logSum += Math.log(m + 1e-9); linSum += m; counted += 1; }
    }
    let flux = 0;
    if (before) {
      let change = 0; let size = 0;
      for (let k = 1; k < half; k += 1) { change += Math.abs(magnitude[k] - before[k]); size += magnitude[k] + before[k]; }
      flux = size > 0 ? change / size : 0;
    }
    before = magnitude;
    frames.push({
      level,
      speech: all > 0 ? speech / all : 0,
      low: all > 0 ? low / all : 0,
      flat: counted && linSum > 0 ? Math.exp(logSum / counted) / (linSum / counted) : 0,
      flux,
      pitch,
    });
  }

  const loudest = Math.max(...levels);
  if (loudest < 0.003) return ['quiet'];
  const sounding = frames.filter((one) => one.level > Math.max(0.003, loudest * 0.05));
  if (sounding.length < frames.length * 0.15) return ['quiet'];

  const pitched = sounding.filter((one) => one.pitch !== null);
  const pitchedShare = pitched.length / sounding.length;
  const semitones = pitched.map((one) => 12 * Math.log2((one.pitch as number) / 110));
  const centre = median(semitones);
  const spread = semitones.length ? Math.sqrt(semitones.reduce((sum, v) => sum + (v - centre) ** 2, 0) / semitones.length) : 0;
  const speech = median(sounding.map((one) => one.speech));
  const low = median(sounding.map((one) => one.low));
  const flat = median(sounding.map((one) => one.flat));
  const flux = median(sounding.slice(1).map((one) => one.flux));
  const gaps = frames.length - sounding.length;

  const heard: Heard[] = [];
  if (pitchedShare > 0.7 && spread < 0.35 && flux < 0.2) {
    heard.push('hum');
  } else {
    const voice = pitchedShare > 0.4 && spread > 0.4 && speech > 0.45;
    if (voice) heard.push('voice');
    /* Instruments: whatever a voice alone does not explain — weight in the
       bass, a noisy (hit or strummed) sound, or no moving pitch at all. */
    if (!voice || low > 0.1 || flat > 0.1) heard.push('instruments');
  }
  if (gaps > frames.length * 0.4 && !heard.includes('hum')) heard.push('quiet');
  return heard;
}
