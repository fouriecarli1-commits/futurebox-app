/**
 * The spectrogram's arithmetic, held to a sound whose answer is known.
 *
 * A sine at 440 Hz has to land in the row that holds 440 Hz on the
 * log-pitch ladder; silence has to draw nothing; and an impulse has to
 * come out of the transform flat — the three things that go wrong in a
 * hand-written FFT.
 */
import { fft, heat, pixelsOf, rowEdges, spectrogramOf, FRAME, LOW, HIGH } from '../app/lib/spectrogram.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const rate = 44100;
const bufferOf = (samples: Float32Array): AudioBuffer => ({
  length: samples.length, numberOfChannels: 1, sampleRate: rate, duration: samples.length / rate,
  getChannelData: () => samples,
} as unknown as AudioBuffer);

/* An impulse through the transform is flat. */
{
  const re = new Float32Array(FRAME); const im = new Float32Array(FRAME); re[0] = 1;
  fft(re, im);
  let low = Infinity; let high = -Infinity;
  for (let k = 0; k < FRAME / 2; k += 1) { const m = Math.hypot(re[k], im[k]); low = Math.min(low, m); high = Math.max(high, m); }
  ok('an impulse comes out of the transform flat', Math.abs(high - 1) < 1e-4 && Math.abs(low - 1) < 1e-4, `${low}…${high}`);
}

/* A 440 Hz sine lands in the row that holds 440 Hz. */
{
  const n = rate; const s = new Float32Array(n);
  for (let i = 0; i < n; i += 1) s[i] = Math.sin((2 * Math.PI * 440 * i) / rate) * 0.5;
  const bins = 48;
  const picture = spectrogramOf(bufferOf(s), 32, bins);
  const expected = Math.floor((bins * Math.log(440 / LOW)) / Math.log(HIGH / LOW));
  let bestRow = -1; let best = -1;
  for (let r = 0; r < bins; r += 1) { let sum = 0; for (let c = 0; c < picture.columns; c += 1) sum += picture.cells[r * picture.columns + c]; if (sum > best) { best = sum; bestRow = r; } }
  ok(`a 440 Hz sine lands in row ${expected} of ${bins}`, Math.abs(bestRow - expected) <= 1, `loudest row ${bestRow}`);
  ok('  and the loudest cell is full scale', Math.max(...picture.cells) === 255);
  ok('  and the picture is as wide as asked', picture.columns === 32 && picture.bins === bins && Math.abs(picture.duration - 1) < 1e-6);
  /* The rows above and below the tone are quiet: a sine is one line, not a smear. */
  let far = 0; for (let r = 0; r < bins; r += 1) if (Math.abs(r - expected) > 4) for (let c = 0; c < picture.columns; c += 1) far = Math.max(far, picture.cells[r * picture.columns + c]);
  ok('  and the rows far from it are quiet', far < 120, `${far}`);
}

/* Silence draws nothing. */
{
  const picture = spectrogramOf(bufferOf(new Float32Array(rate)), 16, 24);
  ok('silence is an empty picture', picture.cells.every((v) => v === 0));
}

/* The ladder is log-pitch: each octave gets the same number of rows. */
{
  const edges = rowEdges(48, rate);
  const hz = (r: number) => (edges[r] * rate) / FRAME;
  /* The step between neighbouring rows is one ratio all the way up. */
  let steady = true;
  const step = hz(1) / hz(0);
  for (let r = 1; r < 48; r += 1) if (Math.abs(hz(r + 1) / hz(r) - step) > 1e-6) steady = false;
  ok('the rows climb by one ratio, from 40 Hz to 16 kHz', steady && Math.abs(hz(0) - LOW) < 1e-6 && Math.abs(hz(48) - HIGH) < 1e-3, `${hz(0)}…${hz(48)}`);
}

/* The colours run dark to hot. */
{
  const l = (c: string) => c.match(/\d+/g)!.map(Number).reduce((a, b) => a + b, 0);
  ok('the ramp runs from dark to hot', l(heat(0)) < l(heat(120)) && l(heat(120)) < l(heat(255)) && l(heat(255)) > 600);
}

/* The pixels put the highest pitch at the top. */
{
  const n = rate; const s = new Float32Array(n);
  for (let i = 0; i < n; i += 1) s[i] = Math.sin((2 * Math.PI * 8000 * i) / rate) * 0.5;
  const picture = spectrogramOf(bufferOf(s), 8, 32);
  const px = pixelsOf(picture);
  const rowLight = (y: number) => { let t = 0; for (let c = 0; c < picture.columns; c += 1) { const i = (y * picture.columns + c) * 4; t += px[i] + px[i + 1] + px[i + 2]; } return t; };
  let brightest = 0; let best = -1; for (let y = 0; y < picture.bins; y += 1) if (rowLight(y) > best) { best = rowLight(y); brightest = y; }
  ok('a high tone is painted near the top of the picture', brightest < picture.bins / 3, `row ${brightest} of ${picture.bins}`);
  ok('  and every pixel is opaque', px.every((v, i) => i % 4 !== 3 || v === 255));
}

if (bad) { console.log(`\ncheck:spectrogram — ${bad} problem(s)`); process.exit(1); }
console.log('\ncheck:spectrogram — a sine lands in its row, silence draws nothing, and the transform is flat for an impulse.');
