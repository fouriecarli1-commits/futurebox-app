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
  /** −1 hard left to 1 hard right. Absent means centre, for lanes made before
   *  there was a pan at all. */
  readonly pan?: number;
}

/**
 * The master: what happens to the whole mix after the lanes are summed.
 *
 * ── Why there is a `trim` and not a compressor ───────────────────────────
 *
 * The rule this whole file exists for is that the mixer and the mixdown can
 * never disagree about what somebody is listening to. A dynamics processor in
 * the live path and a different one in the offline path breaks that rule
 * quietly: the mix that comes out is not the mix that was approved, and the
 * difference is exactly the kind nobody can point at.
 *
 * So the master is arithmetic. `trim` is one number, worked out once from the
 * rendered mix, and applied identically in both places — a multiplication is a
 * multiplication whether it happens in an `AudioContext` or in a `for` loop.
 * Loudness matching and peak safety both come out of that one number.
 */
export interface Master {
  /** The fader, 0–2. */
  readonly gain: number;
  /** Nothing may go above this, in dBFS. */
  readonly ceilingDb: number;
  /** Bring the mix up towards the level streaming services play things at. */
  readonly matchLoudness: boolean;
}

export const FLAT_MASTER: Master = { gain: 1, ceilingDb: -1, matchLoudness: false };

/**
 * What "as loud as everything else" is aimed at, as RMS.
 *
 * Stated as RMS and not as LUFS, because it is RMS. LUFS is K-weighted — it
 * filters the signal to approximate what an ear does before it measures, and
 * this does not. On dense music the two land within a decibel or so of each
 * other; on a sparse piano piece they do not. Calling this LUFS would be a
 * measurement claim that is not true, and a number on a screen that is not
 * true is worse than no number.
 */
export const TARGET_RMS = 0.1995; // −14 dBFS

export function dbOf(level: number): number {
  return level > 0 ? 20 * Math.log10(level) : -Infinity;
}

export function levelOfDb(db: number): number {
  return 10 ** (db / 20);
}

/** The loudest single sample in a rendered mix. */
export function peakOf(buffer: AudioBuffer): number {
  let most = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i += 1) {
      const size = Math.abs(data[i]);
      if (size > most) most = size;
    }
  }
  return most;
}

/** And how loud it is on average, which is what an ear judges. */
export function rmsOf(buffer: AudioBuffer): number {
  let sum = 0;
  let n = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i += 1) {
      sum += data[i] * data[i];
      n += 1;
    }
  }
  return n ? Math.sqrt(sum / n) : 0;
}

/** Never boost by more than this. Near-silence multiplied by forty is hiss. */
export const MOST_BOOST = 8;

/**
 * The one number the master applies, worked out from the rendered mix.
 *
 * Loudness first, then the ceiling — in that order, because the ceiling has to
 * be able to overrule the loudness. A mix brought up to the target and then
 * clipping is not "loud enough", it is broken, and the whole reason to compute
 * this rather than run a limiter is that the answer is knowable in advance.
 */
export function trimFor(peak: number, rms: number, master: Master): number {
  let trim = 1;
  if (master.matchLoudness && rms > 0) {
    trim = Math.min(MOST_BOOST, TARGET_RMS / rms);
  }
  const ceiling = levelOfDb(master.ceilingDb);
  if (peak > 0 && peak * trim > ceiling) trim = ceiling / peak;
  /* Silence stays silence. Without this a lane of nothing gets multiplied by
     the boost ceiling and becomes a lane of amplified nothing. */
  return peak > 0 ? Math.max(0, trim) : 1;
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
 * One lane, wired up: source → level → pan.
 *
 * Shared by the live path and the offline one on purpose. Two copies of this
 * five-line function is how a mixer and a mixdown come to disagree — the pan
 * gets added to one of them, and nobody notices until a file comes out
 * different from what was approved.
 */
export function wireLane(
  ctx: BaseAudioContext,
  lane: Lane,
  to: AudioNode,
): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = lane.audio;
  const level = ctx.createGain();
  level.gain.value = lane.gain;
  /* Equal power, which is what a `StereoPannerNode` does and what every desk
     does: a mono lane in the centre comes out at 1/√2 in each channel, so the
     two together carry the power it had and moving it across the field does
     not change how loud it is. Duplicating it at full level into both would
     be 3 dB louder in the middle than at the sides — everything would drift
     quieter as it was spread out, which is the opposite of what a pan is for.
     `audit/mixdown.mjs` pins the law, because swapping this for a linear
     panner would change every mix in the app and nothing would say so. */
  const place = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
  if (place) {
    place.pan.value = Math.max(-1, Math.min(1, lane.pan ?? 0));
    source.connect(level).connect(place).connect(to);
  } else {
    /* Safari long ago, and some embedded browsers. Losing the pan is the right
       failure: the alternative is a hand-rolled panner that sounds different
       from the one everybody else hears. */
    source.connect(level).connect(to);
  }
  return source;
}

/** Every sample multiplied by one number. What the master actually is. */
export function applyTrim(buffer: AudioBuffer, trim: number): AudioBuffer {
  if (trim === 1) return buffer;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i += 1) data[i] *= trim;
  }
  return buffer;
}

/**
 * The whole session rendered to one buffer.
 *
 * Offline, so a five-minute session takes about a second rather than five
 * minutes and comes out the same every time. A lane that starts before zero is
 * trimmed rather than moving everything else, because the backing is what the
 * clock belongs to and it must not shift.
 */
export async function mixSession(
  lanes: readonly Lane[],
  rate: number,
  master: Master = FLAT_MASTER,
  /** The trim the mixer was listening through. Worked out once, used twice. */
  trim = 1,
): Promise<AudioBuffer | null> {
  const heard = audible(lanes);
  if (!heard.length) return null;
  const Ctx = (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext;
  if (!Ctx) return null;

  const seconds = span(heard);
  if (!(seconds > 0)) return null;
  const offline = new Ctx(2, Math.ceil(seconds * rate), rate);

  const bus = offline.createGain();
  bus.gain.value = master.gain;
  bus.connect(offline.destination);

  heard.forEach((lane) => {
    const source = wireLane(offline, lane, bus);
    if (lane.at >= 0) source.start(lane.at);
    else source.start(0, Math.min(-lane.at, lane.audio.duration));
  });

  try {
    return applyTrim(await offline.startRendering(), trim);
  } catch {
    return null;
  }
}

export interface Reading {
  readonly peak: number;
  readonly rms: number;
  readonly trim: number;
}

/**
 * Measure the mix, and work out the one number the master applies.
 *
 * Rendered without the trim, because the trim is what is being worked out.
 * Cheap enough to be a button and too slow to be a keystroke — a four-minute
 * session is about a second — so the screen asks for it rather than doing it
 * on every change, and says when what is on it is out of date.
 */
export async function readSession(
  lanes: readonly Lane[],
  rate: number,
  master: Master,
): Promise<Reading | null> {
  const mixed = await mixSession(lanes, rate, master, 1);
  if (!mixed) return null;
  const peak = peakOf(mixed);
  const rms = rmsOf(mixed);
  return { peak, rms, trim: trimFor(peak, rms, master) };
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
