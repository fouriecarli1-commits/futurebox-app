'use client';

/**
 * A session: several pieces of audio on one clock.
 *
 * The booth was built around one voice over one backing, which is the right
 * shape for somebody singing along to a song they generated. It is the wrong
 * shape for somebody who does this for a living. A musician wants lanes — a
 * lead, a double, a harmony, a guitar they recorded on their phone, a sound
 * they generated and dropped in — each with its own level and its own place in
 * time, and a mix at the end that is theirs rather than the app's.
 *
 * This is that model and nothing else: no drawing, no buttons, no browser
 * except where a buffer has to be made. Which means the arithmetic here can be
 * tested without a screen, and the screen can be argued about without touching
 * the arithmetic.
 */

export interface Lane {
  readonly id: string;
  readonly name: string;
  readonly audio: AudioBuffer;
  /** Where it starts on the session's clock, in seconds. Negative is trimmed. */
  readonly at: number;
  /** 0–1.5. Above one is a boost, which a quiet phone recording often needs. */
  readonly gain: number;
  readonly muted: boolean;
  readonly soloed: boolean;
  /** True for the song everything else was recorded against. */
  readonly backing?: boolean;
}

/**
 * Which lanes are actually heard.
 *
 * Solo is not a property of a lane, it is a property of the session: the
 * moment anything is soloed, everything not soloed goes quiet, whatever its
 * own mute says. Working that out in one place is what stops the mixer and the
 * mixdown ever disagreeing about what a person is listening to.
 */
export function audible(lanes: readonly Lane[]): Lane[] {
  const soloing = lanes.some((lane) => lane.soloed && !lane.muted);
  return lanes.filter((lane) => (soloing ? lane.soloed && !lane.muted : !lane.muted));
}

/** How long the session runs: the last thing to finish. */
export function span(lanes: readonly Lane[]): number {
  return lanes.reduce((longest, lane) => Math.max(longest, lane.at + lane.audio.duration), 0);
}

/** A lane's level once solo and mute have had their say. */
export function levelOf(lanes: readonly Lane[], lane: Lane): number {
  return audible(lanes).indexOf(lane) >= 0 ? lane.gain : 0;
}

/**
 * The whole session rendered to one buffer.
 *
 * Offline, so a five-minute session takes about a second rather than five
 * minutes and comes out the same every time. A lane that starts before zero is
 * trimmed rather than moving everything else, because the backing is what the
 * clock belongs to and it must not shift.
 */
export async function mixSession(lanes: readonly Lane[], rate: number): Promise<AudioBuffer | null> {
  const heard = audible(lanes);
  if (!heard.length) return null;
  const Ctx = (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext;
  if (!Ctx) return null;

  const seconds = span(heard);
  if (!(seconds > 0)) return null;
  const offline = new Ctx(2, Math.ceil(seconds * rate), rate);

  heard.forEach((lane) => {
    const source = offline.createBufferSource();
    source.buffer = lane.audio;
    const level = offline.createGain();
    level.gain.value = lane.gain;
    source.connect(level).connect(offline.destination);
    if (lane.at >= 0) source.start(lane.at);
    else source.start(0, Math.min(-lane.at, lane.audio.duration));
  });

  try {
    return await offline.startRendering();
  } catch {
    return null;
  }
}

/** A buffer from a file somebody dropped in, at the session's own rate. */
export async function readInto(file: Blob, rate: number): Promise<AudioBuffer | null> {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx({ sampleRate: rate });
  try {
    return await ctx.decodeAudioData(await file.arrayBuffer());
  } catch {
    return null;
  } finally {
    void ctx.close();
  }
}
