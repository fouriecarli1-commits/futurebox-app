'use client';

/**
 * A loop from the jam room, on its way to the booth.
 *
 * The owner, 18 October 2026, choosing both of the booth ideas: a loop made
 * live in the jam room can be sent to ProBooth and lands there as a lane.
 *
 * ── Why it waits on the device ───────────────────────────────────────────
 *
 * ProBooth is always about a song — it opens from a song in the Booth — and
 * the jam room has no song. So "Send to ProBooth" renders one pass of the
 * loop to a WAV, puts it on a small shelf on this device, and opens the
 * Booth; whichever song she opens ProBooth on next finds it waiting and puts
 * it in as a lane that repeats. Nothing goes to a server: it is her loop on
 * her phone, moving from one room to another.
 *
 * ── Why one pass, rendered ───────────────────────────────────────────────
 *
 * A lane is a recording. The pads are made by oscillators and the voices
 * are compressed files, so the loop is rendered — offline, with the very
 * same `hit` the room plays — into one pass of audio. The lane's own repeat
 * then does what a loop does, sample-accurately, in the booth's mixer and in
 * the export alike.
 */
import { hit } from './jampads';
import { loopSeconds, rateFor, type Layer } from './looper';
import { shelfOf, type Put } from './ondevice';
import { encodeWav } from './wav';

export interface JamSent {
  readonly id: string;
  readonly made: number;
  /** One pass of the loop, as a WAV. */
  readonly wav: Blob;
  readonly bpm: number;
  /** How long one pass is. */
  readonly seconds: number;
}

/* A shelf of its own, so it never bumps another database's version. Three is
   plenty: the newest is what the booth takes, and the others are spare. */
const shelf = shelfOf<JamSent>({
  database: 'futurebox-jamloop',
  store: 'sent',
  most: 3,
  sound: (one) => one.wav instanceof Blob && one.wav.size > 44 && one.seconds > 0,
});

const RATE = 44_100;

const fromBase64 = (text: string): ArrayBuffer => {
  const raw = atob(text);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
};

/** One pass of the loop, rendered to audio exactly as the room plays it. */
export async function renderPass(layers: readonly Layer[], bpm: number, muted: ReadonlySet<string> = new Set()): Promise<AudioBuffer> {
  const seconds = loopSeconds(bpm);
  const offline = new OfflineAudioContext(2, Math.ceil(seconds * RATE), RATE);
  for (const layer of layers) {
    if (muted.has(layer.id)) continue;
    if (layer.kind === 'pads') {
      for (const one of layer.hits) hit(offline, one.pad, one.at * seconds);
      continue;
    }
    try {
      const buffer = await offline.decodeAudioData(fromBase64(layer.audio));
      const source = offline.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rateFor(layer.bpm, bpm);
      source.connect(offline.destination);
      source.start(0, 0, Math.min(buffer.duration, seconds * rateFor(layer.bpm, bpm)));
    } catch {
      /* A recording this browser cannot read is left out of the pass, as
         the room leaves it out of the loop. */
    }
  }
  return offline.startRendering();
}

/** Render and keep it for the booth. */
export async function sendToBooth(layers: readonly Layer[], bpm: number, muted?: ReadonlySet<string>): Promise<Put> {
  const pass = await renderPass(layers, bpm, muted);
  return shelf.keep({ id: `jam-${Date.now()}`, made: Date.now(), wav: encodeWav(pass), bpm, seconds: loopSeconds(bpm) });
}

/** The loop waiting for the booth, newest first, or null. */
export async function waitingLoop(): Promise<JamSent | null> {
  try {
    const all = await shelf.all();
    return all[0] ?? null;
  } catch {
    return null;
  }
}

/** Taken: off the shelf. */
export async function takenLoop(id: string): Promise<void> {
  await shelf.forget(id).catch(() => undefined);
}
