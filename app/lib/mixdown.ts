'use client';

/**
 * Your own voice over the music.
 *
 * ElevenLabs Music has no voice parameter and cannot be handed a cloned voice
 * to sing with — their cloning is for speech. So the honest way to get your
 * own voice onto a track is the way it has always been done: the engine makes
 * the backing, you sing over it, and the two are mixed. Nothing here imitates
 * anybody, because nothing here is generated — the vocal is a recording of a
 * person.
 *
 * The hard part is not the mixing, it is the alignment. A browser plays the
 * backing through the speakers and captures the microphone on a different
 * clock, and the round trip — output buffer, air, input buffer — is anywhere
 * between about 20 and 300 milliseconds depending on the machine. That is the
 * difference between a take that sits in the pocket and one that sounds drunk.
 * Two things deal with it:
 *
 *   · the recorder is started before the music and the gap between the two is
 *     measured, so most of the offset is a known quantity rather than a guess;
 *   · what is left is a slider, previewed live, because no amount of arithmetic
 *     beats a person hearing it line up.
 */

import { encodeWav } from './wav';

function context(): typeof AudioContext | null {
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  );
}

/** Decodes a file into samples. Null rather than a throw: callers all recover. */
export async function decode(blob: Blob): Promise<AudioBuffer | null> {
  const Ctx = context();
  if (!Ctx) return null;
  const ctx = new Ctx();
  try {
    return await ctx.decodeAudioData(await blob.arrayBuffer());
  } catch {
    return null;
  } finally {
    await ctx.close();
  }
}

export interface Mix {
  readonly music: AudioBuffer;
  readonly take: AudioBuffer;
  /**
   * Where the take starts against the music, in seconds.
   *
   * Positive delays the voice, negative pulls it earlier. Negative is normal:
   * the recording contains the round-trip latency as silence at the front.
   */
  readonly offset: number;
  readonly musicGain: number;
  readonly takeGain: number;
}

/**
 * The two rendered into one file.
 *
 * Offline, so a three-minute mix takes about a second rather than three
 * minutes, and the result is identical every time — a real-time capture would
 * pick up whatever else the machine was doing.
 */
export async function mixdown(mix: Mix): Promise<Blob | null> {
  const Ctx =
    (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext;
  if (!Ctx) return null;

  const rate = mix.music.sampleRate;
  // Long enough for both, wherever the take has been nudged to.
  const takeEnd = Math.max(0, mix.offset) + mix.take.duration;
  const seconds = Math.max(mix.music.duration, takeEnd);
  const channels = Math.max(mix.music.numberOfChannels, mix.take.numberOfChannels, 2);

  const offline = new Ctx(Math.min(2, channels), Math.ceil(seconds * rate), rate);

  const music = offline.createBufferSource();
  music.buffer = mix.music;
  const musicLevel = offline.createGain();
  musicLevel.gain.value = mix.musicGain;
  music.connect(musicLevel).connect(offline.destination);
  music.start(0);

  const take = offline.createBufferSource();
  take.buffer = mix.take;
  const takeLevel = offline.createGain();
  takeLevel.gain.value = mix.takeGain;
  take.connect(takeLevel).connect(offline.destination);
  // A negative offset means the front of the recording is trimmed rather than
  // the music being pushed later — the music is the thing everything else is
  // measured against and it must not move.
  if (mix.offset >= 0) take.start(mix.offset);
  else take.start(0, Math.min(-mix.offset, mix.take.duration));

  try {
    const rendered = await offline.startRendering();
    return encodeWav(rendered);
  } catch {
    return null;
  }
}

/**
 * What the browser itself says the round trip costs, where it says anything.
 *
 * `outputLatency` is the honest figure and is not implemented everywhere;
 * `baseLatency` is only the output buffer and undersells it. Zero when neither
 * is available, which is why the slider exists.
 */
export function knownLatency(): number {
  const Ctx = context();
  if (!Ctx) return 0;
  const ctx = new Ctx();
  const guess =
    (ctx as unknown as { outputLatency?: number }).outputLatency ?? ctx.baseLatency ?? 0;
  void ctx.close();
  return Number.isFinite(guess) ? guess : 0;
}
