'use client';

import { isClean, isUncleaned, wireClean, wireTone, type Clean, type Tone } from './tone';
import { anyFx, wireFx, type Fx } from './fx';

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
  /**
   * The piece of this lane that plays, in seconds into its own audio.
   *
   * Carli: "Ek dink maar net of klanke gecut kan word?"
   *
   * A cut and not a deletion. The recording underneath is untouched, so the
   * cut can be moved or undone, and the amp and the stems — which are baked
   * from `audio` — do not have to be redone every time somebody drags an edge.
   * `windowOf` reads them; nothing else should, because a window that
   * collapses to nothing means the whole lane and that rule belongs in one
   * place.
   *
   * Absent means the whole thing, which is every lane made before this
   * existed.
   */
  readonly from?: number;
  readonly to?: number;
  /**
   * How many times the cut piece plays, end to end. Absent or 1 is once.
   *
   * Carli, 15 September: *"Kan nie die instrument generated parts drag om
   * groter te word nie."*
   *
   * Right, and it was not a broken handle: the end of a clip stopped at the
   * end of its recording, because you cannot reveal audio that does not
   * exist. What she was asking for is the other thing a clip's end does in
   * every desk there is — drag it past the recording and the recording
   * repeats. A generated part is eight bars; a song is three minutes; the
   * whole point of eight bars is that they go round.
   *
   * A count rather than a length, because a part that repeats two and a half
   * times is not a thing anybody asks a band for. `windowOf` still owns the
   * piece; this owns how many times it goes.
   */
  readonly repeat?: number;
  /** −1 hard left to 1 hard right. Absent means centre, for lanes made before
   *  there was a pan at all. */
  readonly pan?: number;
  /** Drive, colour and a speaker. Absent means untouched. */
  readonly tone?: Tone;
  /**
   * The effect rack — EQ, compressor, delay, reverb and the rest.
   *
   * Absent, or empty, means no rack at all and the graph this lane had
   * before racks existed. That is deliberately not the same as a rack with
   * everything set to nothing: an effect switched on and turned down still
   * costs a node and still rounds the sound.
   *
   * It goes in `wireLane` with everything else, which is the whole point —
   * see the note there. A rack that only moved the preview would be
   * indistinguishable from one that works until somebody exports.
   */
  readonly fx?: Fx;
  /**
   * What to take *off* before any of that.
   *
   * A separate thing from `tone` and it runs first: driving a take that still
   * has desk rumble in it drives the rumble too, and no amount of tilting
   * afterwards puts that back. Absent means nothing is taken off, which is
   * every lane made before this existed.
   */
  readonly clean?: Clean;
  /**
   * A neural amp capture, already run through.
   *
   * The rendered buffer rather than the model, because inference is not an
   * AudioNode: it is a function over samples, and there is nothing to put in
   * an audio graph. Baking it means the live path and the mixdown play the
   * same samples, which is the rule this file exists for. `audio` keeps the
   * recording untouched, so taking the amp off is free and does not need the
   * take read from disk again.
   */
  readonly amped?: { readonly name: string; readonly audio: AudioBuffer };
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
  /**
   * Take the rumble off: everything below this many hertz, in dB per octave
   * of roll-off that a single biquad gives. 0 is off.
   *
   * Carli asked for "take off rumble" on the mastering list. It is a
   * high-pass and nothing cleverer: a phone microphone picks up traffic, a
   * table being knocked and the singer's own breath as energy under 60 Hz
   * that nobody hears and every limiter ducks for.
   */
  readonly rumbleHz?: number;
  /**
   * Take the hiss off: a shelf that pulls the very top down. 0 is off.
   *
   * Named for what it is rather than what she asked for. "Hiss" suggests a
   * de-noiser, which listens to the noise and subtracts it; this is a gentle
   * shelf above 9 kHz, which makes a hissy phone recording easier to listen
   * to and cannot tell hiss from a cymbal. The panel says so.
   */
  readonly hissDb?: number;
}

export const FLAT_MASTER: Master = { gain: 1, ceilingDb: -1, matchLoudness: false };

/**
 * The master bus, built once and used in both places.
 *
 * ── Why this function exists ─────────────────────────────────────────────
 *
 * The note above this file's `Master` is about one rule: what somebody hears
 * and what comes out of the render have to be the same thing. It held while
 * the master was one multiplication, because a multiplication is a
 * multiplication wherever it happens.
 *
 * The moment the master grew a filter, it stopped holding by itself. The
 * preview builds its bus in `ProBooth`; the render builds its own in
 * `mixSession`. Two places to add a filter to is one place to forget, and a
 * mix that is bright in the ears and dull in the file is exactly the fault
 * nobody can point at.
 *
 * So there is one builder. Both call it, and neither knows what is in it.
 *
 * @param level what the fader multiplies by — the preview folds the trim
 *   into it, the render applies the trim to the rendered buffer afterwards,
 *   and that difference is the one thing the two do not share.
 * @returns the node lanes connect INTO. Its far end is already connected to
 *   the context's destination.
 */
export function wireMaster(ctx: BaseAudioContext, master: Master, level: number): AudioNode {
  const fader = ctx.createGain();
  fader.gain.value = level;
  fader.connect(ctx.destination);

  let head: AudioNode = fader;

  /* Built back to front, so each filter is put in FRONT of what is already
     there. The order the sound travels is therefore: rumble, hiss, fader —
     tone before level, which is the order a desk is laid out in. */
  if (master.hissDb && master.hissDb < 0) {
    const shelf = ctx.createBiquadFilter();
    shelf.type = 'highshelf';
    shelf.frequency.value = 9000;
    shelf.gain.value = master.hissDb;
    shelf.connect(head);
    head = shelf;
  }
  if (master.rumbleHz && master.rumbleHz > 0) {
    const cut = ctx.createBiquadFilter();
    cut.type = 'highpass';
    cut.frequency.value = master.rumbleHz;
    /* 0.707 is the flattest a single biquad gets — no bump at the corner.
       Anything higher rings, and a resonant peak at 60 Hz is the opposite of
       taking the rumble off. */
    cut.Q.value = 0.707;
    cut.connect(head);
    head = cut;
  }

  return head;
}

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

/**
 * The piece of a lane that plays.
 *
 * Clamped to the audio, and a window that has collapsed to nothing is read as
 * the whole lane rather than as silence. That last rule is deliberate and it
 * is the same one `lib/stitch.ts` uses on a scene: a lane somebody put in the
 * session should be in the session, and an empty window is far more likely to
 * be a drag that went wrong than a request for nothing.
 */
export function windowOf(lane: Lane): { readonly from: number; readonly to: number } {
  const length = (lane.amped?.audio ?? lane.audio).duration;
  if (!(length > 0)) return { from: 0, to: 0 };
  const from = Math.min(Math.max(0, lane.from ?? 0), length);
  const to = Math.min(Math.max(from, lane.to ?? length), length);
  return to - from < 0.01 ? { from: 0, to: length } : { from, to };
}

/**
 * How many times a lane's piece plays.
 *
 * Whole, at least one, and capped. The cap is not defensive tidiness: the
 * count comes from a drag, a drag comes from a finger, and a finger on a
 * rescaling timeline can ask for a part to repeat four thousand times —
 * which is a session that will not render and a number nobody typed.
 */
export function repeatOf(lane: Lane): number {
  const want = Math.round(lane.repeat ?? 1);
  return Number.isFinite(want) ? Math.min(64, Math.max(1, want)) : 1;
}

/** How long a lane plays for, after its cut and its repeats. */
export function lengthOf(lane: Lane): number {
  const window = windowOf(lane);
  return (window.to - window.from) * repeatOf(lane);
}

/** How long the session runs: the last thing to finish. */
export function span(lanes: readonly Lane[]): number {
  return lanes.reduce((longest, lane) => Math.max(longest, lane.at + lengthOf(lane)), 0);
}

/**
 * A lane started at the right moment, from the right place, for the right
 * length.
 *
 * ── Why this is a function and not two call sites ────────────────────────
 *
 * It was two. The live path in the Pro Booth worked out where to join a lane
 * that had already begun; `mixSession` worked out the same thing again for a
 * render. Both were four lines and neither knew about a cut, so adding one to
 * either would have made the mixer and the mixdown disagree about what is in
 * the song — which is the exact failure the note at the top of this file says
 * must never happen. `wireLane` was already shared for the same reason; the
 * `start` call was the piece left outside it.
 *
 * @param playFrom where on the session's clock playback begins.
 * @param when     the context time that moment corresponds to.
 */
export function startLane(
  source: AudioBufferSourceNode,
  lane: Lane,
  playFrom = 0,
  when = 0,
): void {
  const window = windowOf(lane);
  const once = window.to - window.from;
  if (!(once > 0)) return;
  const times = repeatOf(lane);
  const length = once * times;

  // How far into the lane playback already is. Negative means it has not
  // started yet and is scheduled ahead.
  const into = playFrom - lane.at;
  if (into >= length) return; // Already finished before this moment.

  if (times === 1) {
    if (into >= 0) source.start(when, window.from + into, length - into);
    else source.start(when - into, window.from, length);
    return;
  }

  /* ── Repeats, done by the node rather than by us ─────────────────

     `loop` with a start and an end is what an `AudioBufferSourceNode` is
     for, and it is sample-accurate in an `OfflineAudioContext` exactly as it
     is in a live one — which is the whole requirement here, because the two
     have to agree about what the song is.

     Scheduling N separate sources instead would drift: each `start()` is
     quantised to the render quantum, so eight repeats of a bar would land
     eight slightly different lengths apart, and the file would differ from
     what was approved.

     Stopped by `stop()` and not by `start()`'s duration. The spec lets an
     implementation read `duration` against the looped stream or against the
     buffer, and browsers have historically disagreed; `stop()` at a wall
     time has one meaning everywhere. */
  source.loop = true;
  source.loopStart = window.from;
  source.loopEnd = window.to;
  if (into >= 0) {
    /* Part-way through: which repetition, and how far into it. */
    source.start(when, window.from + (into % once));
    source.stop(when + (length - into));
  } else {
    source.start(when - into, window.from);
    source.stop(when - into + length);
  }
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
  /* The amp first, because it is the amplifier: what the tone stack shapes is
     what came out of the speaker, not what went into it. */
  source.buffer = lane.amped?.audio ?? lane.audio;

  /* Tone first, then level, then pan. The order is the order a desk has and it
     is not arbitrary: shaping after the fader would mean the fader changed how
     hard the lane is driven, so turning a lane down would clean it up and
     turning it up would dirty it. Nobody expects a volume control to do that. */
  const shaped = lane.tone && !isClean(lane.tone) ? wireTone(ctx, lane.tone) : null;
  /* Cleaning before shaping. See `Clean` in `lib/tone.ts` for why the order is
     not a preference. Built here rather than inside `wireTone` so a lane can
     be cleaned without being shaped, which is the common case. */
  const cleaned = lane.clean && !isUncleaned(lane.clean) ? wireClean(ctx, lane.clean) : null;

  /* ── The rack ──────────────────────────────────────────────────────
 
     After the amp and the tone stack, before the fader, for the same reason
     the tone stack is before the fader: a compressor after the fader would
     be driven harder as the lane was turned up, so the volume control would
     change the character of the sound. Nobody expects that.
 
     Built here and nowhere else. Both the live context and the offline one
     the mixdown renders into come through this function, so there is no
     second code path for the effects to drift along. */
  const rack = anyFx(lane.fx) ? wireFx(ctx, lane.fx) : null;

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
  /* clean → tone → rack → level → pan. Whichever of the first three exist. */
  const afterTone: AudioNode = rack ? rack.input : level;
  const head: AudioNode = cleaned ? cleaned.input : shaped ? shaped.input : afterTone;
  if (cleaned) cleaned.output.connect(shaped ? shaped.input : afterTone);
  if (shaped) shaped.output.connect(afterTone);
  if (rack) rack.output.connect(level);
  /* The oscillators a tremolo or a chorus needs. Started here rather than
     inside `wireFx` so the one function that builds the graph is also the
     one that starts everything in it — an oscillator nobody starts is an
     effect that silently does nothing, and in an offline render there is no
     sound to notice it by. */
  for (const source of rack?.running ?? []) source.start(0);

  if (place) {
    place.pan.value = Math.max(-1, Math.min(1, lane.pan ?? 0));
    source.connect(head);
    level.connect(place).connect(to);
  } else {
    /* Safari long ago, and some embedded browsers. Losing the pan is the right
       failure: the alternative is a hand-rolled panner that sounds different
       from the one everybody else hears. */
    source.connect(head);
    level.connect(to);
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

  /* The same builder the preview uses. See `wireMaster`. */
  const bus = wireMaster(offline, master, master.gain);

  heard.forEach((lane) => {
    startLane(wireLane(offline, lane, bus), lane);
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

/**
 * One lane on its own, as a buffer, with nothing else in the session in it.
 *
 * What separation and voice conversion are handed. A lane sitting at 40
 * seconds is sent as itself, from its own first sample — not as forty seconds
 * of silence with a take on the end, which is what taking it out of the mix
 * would give and which would be paid for by the minute.
 */
export function laneAlone(lane: Lane): AudioBuffer {
  return lane.audio;
}

/**
 * The part of a lane that plays, as a buffer of its own.
 *
 * What gets separated, voice-changed or read has to be what she can hear. A
 * lane trimmed to its chorus and then sent whole would be billed by the minute
 * for the verses she cut out, and the stems that came back would not line up
 * with the lane they were made from.
 *
 * The uncut case returns the buffer untouched rather than copying it: these
 * are minutes of audio and a copy nobody needed is a phone running out of
 * memory.
 */
export function pieceOf(lane: Lane, ctx: BaseAudioContext): AudioBuffer {
  const source = lane.amped?.audio ?? lane.audio;
  const window = windowOf(lane);
  const rate = source.sampleRate;
  const from = Math.round(window.from * rate);
  const to = Math.min(source.length, Math.round(window.to * rate));
  if (from <= 0 && to >= source.length) return source;

  const length = Math.max(1, to - from);
  const out = ctx.createBuffer(source.numberOfChannels, length, rate);
  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    out.getChannelData(channel).set(source.getChannelData(channel).subarray(from, to));
  }
  return out;
}

/**
 * A lane folded down to one channel.
 *
 * Separation and voice conversion are billed by the minute and capped by file
 * size, and a stereo 48 kHz WAV of a four-minute take is over the cap on its
 * own. Mono halves it, and neither of those services returns anything that
 * depended on the stereo image: the vocal comes back as a vocal. Losing the
 * width of a take that is about to be replaced costs nothing; being refused
 * for size after the credits are spent costs a person their afternoon.
 */
export function monoOf(buffer: AudioBuffer, ctx: BaseAudioContext): AudioBuffer {
  if (buffer.numberOfChannels === 1) return buffer;
  const out = ctx.createBuffer(1, buffer.length, buffer.sampleRate);
  const into = out.getChannelData(0);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const from = buffer.getChannelData(channel);
    for (let i = 0; i < from.length; i += 1) into[i] += from[i] / buffer.numberOfChannels;
  }
  return out;
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
