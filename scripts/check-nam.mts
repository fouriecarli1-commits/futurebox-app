/**
 * The neural amp engine actually runs.
 *
 * `lib/nam.ts` is a browser file — it fetches its own binary and makes
 * AudioBuffers — so what is pinned here is the layer underneath it: that the
 * WebAssembly module loads, that a model loads into it, that audio comes out
 * changed, that the same input gives the same output, and that the block size
 * the app happens to use does not change the answer.
 *
 * That last one matters. The model carries state across calls, so a loop that
 * hands it 512 samples at a time must produce exactly what one that hands it
 * 128 produces. If it did not, a lane would sound different depending on a
 * constant nobody thinks of as audible.
 *
 * The model here is a tiny WaveNet built for the test rather than a real
 * capture: a capture is somebody's file and this repository does not carry
 * one. Its weight count is found by growing the array until the loader
 * accepts it, because the count follows from the shape and writing it down by
 * hand is a number that goes stale the first time the engine is upgraded.
 */
import { readFileSync } from 'node:fs';
import { createNamModule, NamWasmModule } from '@opendaw/nam-wasm';

const RATE = 48000;
const problems: string[] = [];
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const bytes = readFileSync('node_modules/@opendaw/nam-wasm/dist/nam.wasm');
const module = await createNamModule({
  wasmBinary: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
});
const nam = NamWasmModule.fromModule(module, 512);
nam.setSampleRate(RATE);
nam.setMaxBufferSize(512);

const config = {
  layers: [{
    input_size: 1, condition_size: 1, head_size: 1, channels: 2, kernel_size: 1,
    dilations: [1], activation: 'Tanh', head_bias: false, gated: false,
  }],
  head: null,
  head_scale: 1.0,
};
const modelOf = (weights: number) => JSON.stringify({
  version: '0.5.2',
  architecture: 'WaveNet',
  config,
  weights: Array.from({ length: weights }, (_, i) => ((i % 7) - 3) / 10),
  metadata: { name: 'A test capture', gear_type: 'amp', tone_type: 'clean' },
});

const id = nam.createInstance();
check('the module loads and makes an instance', id >= 0 && nam.getInstanceCount() === 1);

let weights = -1;
for (let n = 1; n <= 400 && weights < 0; n += 1) {
  try { if (nam.loadModel(id, modelOf(n))) weights = n; } catch { /* grow */ }
}
check('a model loads', weights > 0, weights > 0 ? `${weights} weights for this shape` : 'no length was accepted');
check('the instance reports its model', nam.hasModel(id));

/** A quarter second of a tone, which is enough state for a WaveNet to matter. */
const LENGTH = RATE / 4;
const input = new Float32Array(LENGTH);
for (let i = 0; i < LENGTH; i += 1) input[i] = Math.sin((2 * Math.PI * 220 * i) / RATE) * 0.5;

/** Run the whole signal through in blocks of `size`, resetting first. */
function run(size: number): Float32Array {
  nam.reset(id);
  const out = new Float32Array(LENGTH);
  const block = new Float32Array(size);
  const done = new Float32Array(size);
  nam.setMaxBufferSize(size);
  for (let at = 0; at < LENGTH; at += size) {
    const take = Math.min(size, LENGTH - at);
    block.fill(0);
    block.set(input.subarray(at, at + take));
    nam.process(id, block, done);
    out.set(done.subarray(0, take), at);
  }
  return out;
}

const first = run(512);
let changed = 0;
let peak = 0;
for (let i = 0; i < LENGTH; i += 1) {
  if (first[i] !== input[i]) changed += 1;
  peak = Math.max(peak, Math.abs(first[i]));
}
check('the audio comes out changed', changed === LENGTH, `${changed}/${LENGTH} samples differ`);
check('and it is not silence', peak > 1e-6, `peak ${peak.toFixed(6)}`);
check('and it is not louder than the world', peak < 10, `peak ${peak.toFixed(6)}`);

const again = run(512);
let identical = true;
for (let i = 0; i < LENGTH; i += 1) if (first[i] !== again[i]) { identical = false; break; }
check('the same input gives the same output', identical);

const small = run(128);
let worst = 0;
for (let i = 0; i < LENGTH; i += 1) worst = Math.max(worst, Math.abs(first[i] - small[i]));
check('the block size does not change the answer', worst < 1e-6, `largest difference ${worst.toExponential(2)}`);

/* A file that is not a model has to be refused rather than quietly passed. */
let refused = false;
try { refused = !nam.loadModel(id, JSON.stringify({ version: '0.5.2', architecture: 'Nonsense', config: {}, weights: [1, 2, 3] })); }
catch { refused = true; }
check('a file that is not a capture is refused', refused);

nam.destroyInstance(id);
nam.dispose();

if (problems.length) {
  console.error(`\ncheck:nam — ${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\ncheck:nam — the neural amp engine loads, runs, repeats, and is block-size independent.');
