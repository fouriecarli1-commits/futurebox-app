'use client';

/**
 * Neural amp models, run in the browser.
 *
 * The tone drawer in the Pro Booth shapes a lane with a drive curve, a tilt
 * and a cabinet filter — see `lib/tone.ts`. That is an approximation of an
 * amplifier, honestly labelled as one. This is the other thing: a neural
 * capture of a real amplifier, the same file format the Neural Amp Modeler
 * plugin loads, run through the same inference engine compiled to
 * WebAssembly.
 *
 * The engine is `@opendaw/nam-wasm` — Steven Atkinson's NeuralAmpModelerCore
 * by way of the TONE3000 WASM port, MIT licensed, 350 KB, and it reads both
 * the original A1 files and the newer A2 ones.
 *
 * ── Why the binary is served from here ───────────────────────────────────
 *
 * Emscripten fetches its own .wasm beside the script it was loaded from. The
 * app's content policy allows `connect-src 'self'` and Supabase and nothing
 * else, so a fetch to a CDN is refused with no visible error — the amp would
 * simply never load and nothing would say why. The binary is copied into
 * `public/nam/` at build time and read from our own origin, and the bytes are
 * handed to the module rather than letting it fetch for itself.
 *
 * ── Mono, because an amplifier is ────────────────────────────────────────
 *
 * A NAM model takes one channel in and gives one out. A stereo lane is run
 * channel by channel through its own instance, so a stereo take keeps its
 * width instead of collapsing. Two instances is twice the work; a lane that
 * is really mono duplicated across two channels costs the same as one.
 */

import { createNamModule, NamModel, NamWasmModule } from '@opendaw/nam-wasm';

/** Where the binary is served from. Copied out of the package by `scripts/nam-copy.mjs`. */
export const WASM_PATH = '/nam/nam.wasm';

/**
 * Samples handed to the engine at a time.
 *
 * The block size does not change the answer — the model carries its own state
 * across calls — so this is only about how often the loop crosses into WASM.
 * 512 is small enough to stay in cache and large enough that the crossing is
 * not the cost. `check:nam` pins the "does not change the answer" part.
 */
export const BLOCK = 512;

/** One engine for the page. Loading it twice loads the binary twice. */
let engine: Promise<NamWasmModule> | null = null;

export function namEngine(): Promise<NamWasmModule> {
  if (!engine) {
    engine = (async () => {
      const wasmBinary = await fetch(WASM_PATH).then((r) => {
        if (!r.ok) throw new Error(`nam.wasm: ${r.status}`);
        return r.arrayBuffer();
      });
      const module = await createNamModule({ wasmBinary });
      return NamWasmModule.fromModule(module, BLOCK);
    })();
    // A failed load must not be remembered as a load, or every later attempt
    // returns the same rejection and the amp can never come back.
    engine.catch(() => { engine = null; });
  }
  return engine;
}

/** What the file says it is, for a name in the picker rather than "model.nam". */
export function ampName(modelJson: string): string {
  try {
    const model = NamModel.parse(modelJson);
    const meta = model.metadata ?? {};
    const made = [meta.gear_make, meta.gear_model].filter(Boolean).join(' ').trim();
    return (meta.name || made || model.architecture || 'Amp').slice(0, 60);
  } catch {
    return 'Amp';
  }
}

/**
 * The level the model was captured at, in dB, or null when the file does not
 * say.
 *
 * Captures are made at whatever level the person had, so two amps swapped one
 * for the other can differ by 20 dB. Every plugin that loads these normalises
 * against this number; so does `trimFor` below.
 */
export function loudnessOf(nam: NamWasmModule, id: number): number | null {
  return nam.hasModelLoudness(id) ? nam.getModelLoudness(id) : null;
}

/**
 * What to multiply the output by so one amp is not twice as loud as the next.
 *
 * −18 dB is the level NAM's own plugin normalises to. A model with no loudness
 * in it is left alone rather than guessed at: a wrong guess is worse than no
 * correction, because the person cannot tell which one they are hearing.
 */
export const NORMAL_DB = -18;

export function trimFor(loudnessDb: number | null): number {
  if (loudnessDb === null || !Number.isFinite(loudnessDb)) return 1;
  return 10 ** ((NORMAL_DB - loudnessDb) / 20);
}

/**
 * Run a buffer through an amp.
 *
 * Returns a new buffer; the input is untouched, so a lane can be auditioned
 * with and without the amp without re-reading the file.
 *
 * Throws when the model will not load. That is a real answer — a file that is
 * not a NAM capture, or a newer architecture than this engine reads — and it
 * has to reach the screen rather than come back as silence.
 */
export async function through(
  ctx: BaseAudioContext,
  buffer: AudioBuffer,
  modelJson: string,
  { normalise = true }: { normalise?: boolean } = {},
): Promise<AudioBuffer> {
  const nam = await namEngine();
  nam.setSampleRate(buffer.sampleRate);
  nam.setMaxBufferSize(BLOCK);

  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const block = new Float32Array(BLOCK);
  const done = new Float32Array(BLOCK);

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const id = nam.createInstance();
    try {
      if (!nam.loadModel(id, modelJson)) throw new Error('nam_model_refused');
      const trim = normalise ? trimFor(loudnessOf(nam, id)) : 1;
      const from = buffer.getChannelData(channel);
      const to = out.getChannelData(channel);
      for (let at = 0; at < from.length; at += BLOCK) {
        const size = Math.min(BLOCK, from.length - at);
        // The tail of the last block is zeroed rather than left holding the
        // previous block's samples, which would feed the model audio that is
        // not in the take.
        block.fill(0);
        block.set(from.subarray(at, at + size));
        nam.process(id, block, done);
        for (let i = 0; i < size; i += 1) to[at + i] = done[i] * trim;
      }
    } finally {
      nam.destroyInstance(id);
    }
  }
  return out;
}
