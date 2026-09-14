/**
 * The booth's effect rack: one chain per lane, in the file as well as in the ear.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: *"Audio effects (Compressor; gate; limiter; EQ;
 * Utility; Visualizer; Amp modeler; Bit crusher; Saturater; Wave folder;
 * Chorus; Tremolo; Delay; Reverb; Voice tuner; vocoder) - As hierdie funksies
 * kleurvolle visualizers kon hê om te wys hoe buig die klankbaan sou dit baie
 * help."*
 *
 * ── The rule this file is built around ───────────────────────────────────
 *
 * `ProBooth` has said since it was written that what is here is real: *"every
 * fader, every mute, every offset is in the file that comes out the other
 * end, and `app/lib/session.ts` decides that once so the mixer and the
 * mixdown can never disagree about what you are listening to."*
 *
 * An effect rack is the easiest place in an app to break that promise, because
 * a knob that only moves a preview is indistinguishable from one that works
 * until somebody exports. So every effect in here is built from ordinary Web
 * Audio nodes and nothing else — no worklets, no script processors, no
 * hand-written sample loops. `wireLane` builds this chain once and both the
 * live `AudioContext` and the `OfflineAudioContext` of the mixdown get the
 * same graph. There is no second code path to drift.
 *
 * That constraint is also why this file is honest about what is missing
 * rather than longer than it should be.
 *
 * ── What is here, and what is not, and why ───────────────────────────────
 *
 * Built, because a native node does exactly the thing:
 *
 *   eq          three biquads — a low shelf, a bell, a high shelf
 *   compressor  DynamicsCompressorNode, which is a real compressor
 *   limiter     the same node driven hard. It is a fast, high-ratio
 *               compressor and the panel says so; a true look-ahead brickwall
 *               is a different animal and calling this one would be a lie
 *   utility     level trim, phase flip, and folding to mono
 *   saturator   a WaveShaper with a tanh curve
 *   folder      a WaveShaper with a triangle-fold curve
 *   crusher     a WaveShaper that quantises. BIT DEPTH ONLY: reducing the
 *               sample rate as well needs a worklet, and half a bit crusher
 *               labelled as a whole one is the kind of thing this app does
 *               not do
 *   tremolo     an oscillator on a gain
 *   chorus      an oscillator on a short delay, mixed back in
 *   delay       a delay with feedback and a wet level
 *   reverb      a convolver over a generated impulse
 *
 * NOT built, and named so nobody goes looking:
 *
 *   gate        a downward expander cannot be made from these nodes. Doing it
 *               properly means a worklet, which means a second code path for
 *               the offline render — the one thing this file exists to avoid
 *   voice tuner and vocoder — both are real signal processing, not a graph of
 *               nodes, and both deserve their own build
 *   amp modeler already exists, in `lib/nam.ts`, and runs before this chain
 *
 * ── The visualizers ──────────────────────────────────────────────────────
 *
 * *"om te wys hoe buig die klankbaan"* — literally, how the sound is bent.
 * For the three waveshapers that is not a metaphor: `curveOf` returns the
 * exact array handed to the `WaveShaperNode`, so the picture drawn IS the
 * function applied. For the EQ, `responseOf` asks the biquads themselves.
 * Nothing in the panel is an artist's impression of the sound.
 */

/* ── What a lane's rack is ─────────────────────────────────────────────── */

export interface EqSettings {
  /** Decibels, −18 to +18, at 120 Hz. */
  readonly low: number;
  /** Decibels, at `midHz`. */
  readonly mid: number;
  readonly midHz: number;
  /** Decibels, at 8 kHz. */
  readonly high: number;
}

export interface CompressorSettings {
  /** Decibels, −60 to 0. */
  readonly threshold: number;
  /** 1 to 20. */
  readonly ratio: number;
  /** Seconds. */
  readonly attack: number;
  readonly release: number;
}

export interface UtilitySettings {
  /** Decibels, −24 to +24. */
  readonly trim: number;
  /** Flip the waveform upside down. Silent on its own; audible against a
   *  second lane carrying the same sound, which is what it is for. */
  readonly flip: boolean;
  /** Fold both sides into one. */
  readonly mono: boolean;
}

export interface ShaperSettings {
  /** 0 to 1. Nought is a straight line, which is no effect at all. */
  readonly amount: number;
}

export interface CrusherSettings {
  /** 2 to 16. Sixteen is CD depth, which is no crushing. */
  readonly bits: number;
}

export interface WobbleSettings {
  /** Hertz. */
  readonly rate: number;
  /** 0 to 1. */
  readonly depth: number;
}

export interface DelaySettings {
  /** Seconds. */
  readonly time: number;
  /** 0 to 0.9. Above that it never dies away. */
  readonly feedback: number;
  /** 0 to 1, how much of the delayed sound is heard. */
  readonly mix: number;
}

export interface ReverbSettings {
  /** Seconds the tail takes to die away. */
  readonly size: number;
  /** 0 to 1. */
  readonly mix: number;
}

/**
 * Everything on one lane's rack. Every field optional: absent means the
 * effect is not in the chain at all, which is not the same as being in it
 * and set to nothing — an effect set to nothing still costs a node and still
 * rounds the sound.
 */
export interface Fx {
  readonly eq?: EqSettings;
  readonly compressor?: CompressorSettings;
  readonly limiter?: { readonly ceiling: number };
  readonly utility?: UtilitySettings;
  readonly saturator?: ShaperSettings;
  readonly folder?: ShaperSettings;
  readonly crusher?: CrusherSettings;
  readonly tremolo?: WobbleSettings;
  readonly chorus?: WobbleSettings;
  readonly delay?: DelaySettings;
  readonly reverb?: ReverbSettings;
}

/** What a rack with nothing switched on looks like. */
export const NO_FX: Fx = {};

/** Sensible starting points, so switching an effect on does something audible
 *  but not alarming. A default that does nothing reads as a broken control. */
export const FX_DEFAULTS = {
  eq: { low: 0, mid: 0, midHz: 1000, high: 0 } as EqSettings,
  compressor: { threshold: -18, ratio: 3, attack: 0.01, release: 0.2 } as CompressorSettings,
  limiter: { ceiling: -1 },
  utility: { trim: 0, flip: false, mono: false } as UtilitySettings,
  saturator: { amount: 0.3 } as ShaperSettings,
  folder: { amount: 0.25 } as ShaperSettings,
  crusher: { bits: 8 } as CrusherSettings,
  tremolo: { rate: 5, depth: 0.5 } as WobbleSettings,
  chorus: { rate: 0.8, depth: 0.5 } as WobbleSettings,
  delay: { time: 0.32, feedback: 0.35, mix: 0.3 } as DelaySettings,
  reverb: { size: 1.8, mix: 0.25 } as ReverbSettings,
} as const;

/** Whether anything at all is switched on. */
export function anyFx(fx: Fx | undefined): boolean {
  return Boolean(fx && Object.keys(fx).length > 0);
}

/* ── The curves, which are also the pictures ───────────────────────────── */

const CURVE = 1024;

/**
 * The exact array a `WaveShaperNode` is given, for each of the three shapers.
 *
 * Returned rather than built inline so the panel can draw it. Carli asked for
 * a picture of how the sound is bent; for these three the honest picture is
 * the function itself, and a second hand-drawn approximation of it would be a
 * picture of something the app is not doing.
 */
export function curveOf(kind: 'saturator' | 'folder' | 'crusher', amount: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(new ArrayBuffer(CURVE * 4));
  for (let i = 0; i < CURVE; i += 1) {
    const x = (i / (CURVE - 1)) * 2 - 1;
    out[i] = bend(kind, x, amount);
  }
  return out;
}

function bend(kind: 'saturator' | 'folder' | 'crusher', x: number, amount: number): number {
  if (kind === 'saturator') {
    /* tanh, with the drive rising as the knob does. At nought this is a
       straight line: `k` is 1 and tanh(x)/tanh(1) is close enough to x that
       nothing audible happens, which is what "off" has to mean. */
    const k = 1 + amount * 24;
    return Math.tanh(k * x) / Math.tanh(k);
  }
  if (kind === 'folder') {
    /* Fold: drive it past one and reflect it back instead of clipping. That
       is the whole character of the thing — a clipper flattens the top, a
       folder turns it inside out, and they sound nothing alike. */
    const k = 1 + amount * 6;
    let y = x * k;
    for (let n = 0; n < 4; n += 1) {
      if (y > 1) y = 2 - y;
      else if (y < -1) y = -2 - y;
      else break;
    }
    return y;
  }
  /* The crusher's `amount` is a bit depth, not a 0–1 knob. Quantising to
     2^bits steps is exactly what dropping the depth does to a sample. */
  const steps = Math.pow(2, Math.max(1, amount)) / 2;
  return Math.round(x * steps) / steps;
}

/**
 * The EQ's actual response, asked of the biquads rather than drawn from the
 * numbers on the dials. Three filters in series interact — a bell at 1 kHz
 * and a high shelf at 8 kHz overlap — and only the nodes know by how much.
 */
export function responseOf(
  ctx: BaseAudioContext,
  eq: EqSettings,
  hz: Float32Array<ArrayBuffer>,
): Float32Array<ArrayBuffer> {
  const out = new Float32Array(new ArrayBuffer(hz.length * 4)).fill(1);
  const one = new Float32Array(new ArrayBuffer(hz.length * 4));
  const phase = new Float32Array(new ArrayBuffer(hz.length * 4));
  for (const filter of eqNodes(ctx, eq)) {
    filter.getFrequencyResponse(hz, one, phase);
    for (let i = 0; i < out.length; i += 1) out[i] *= one[i];
  }
  return out;
}

function eqNodes(ctx: BaseAudioContext, eq: EqSettings): BiquadFilterNode[] {
  const low = ctx.createBiquadFilter();
  low.type = 'lowshelf';
  low.frequency.value = 120;
  low.gain.value = eq.low;

  const mid = ctx.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = Math.max(80, Math.min(12000, eq.midHz));
  mid.Q.value = 1;
  mid.gain.value = eq.mid;

  const high = ctx.createBiquadFilter();
  high.type = 'highshelf';
  high.frequency.value = 8000;
  high.gain.value = eq.high;

  return [low, mid, high];
}

/**
 * A room, as an impulse.
 *
 * Generated rather than shipped: a real impulse response is a file of a real
 * room, which is a licence question and half a megabyte, and neither is worth
 * it for a reverb somebody uses to thicken a double. Noise decaying
 * exponentially is the textbook cheap reverb and it sounds like one — a
 * plate, not a cathedral. Written down so nobody measures this against a
 * convolution reverb and calls it broken.
 */
function roomOf(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const frames = Math.max(1, Math.floor(rate * Math.max(0.1, Math.min(8, seconds))));
  const room = ctx.createBuffer(2, frames, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = room.getChannelData(channel);
    for (let i = 0; i < frames; i += 1) {
      /* Deterministic, not `Math.random()`. The mixdown renders the same
         session again in an offline context, and a reverb built from fresh
         noise each time would make two exports of one unchanged session
         measurably different — which `check:mixdown` would be right to call
         a bug and nobody would be able to explain. */
      const noise = Math.sin((i + 1) * (channel === 0 ? 12.9898 : 78.233)) * 43758.5453;
      const rough = noise - Math.floor(noise);
      data[i] = (rough * 2 - 1) * Math.pow(1 - i / frames, 2.5);
    }
  }
  return room;
}

/* ── The chain ─────────────────────────────────────────────────────────── */

export interface Chain {
  readonly input: AudioNode;
  readonly output: AudioNode;
  /** Oscillators the chain needs running. `wireLane` starts them. */
  readonly running: readonly AudioScheduledSourceNode[];
}

/**
 * Build one lane's rack.
 *
 * The order is a desk's order and it is not arbitrary. Shaping before
 * dynamics, dynamics before the ambient effects, and the two ambient ones
 * last because a delay of a compressed sound is what a studio does and a
 * compressor chasing its own delay tail is not. `null` when nothing is on, so
 * a lane with an empty rack has exactly the graph it had before this existed.
 */
export function wireFx(ctx: BaseAudioContext, fx: Fx | undefined): Chain | null {
  if (!anyFx(fx) || !fx) return null;

  const nodes: AudioNode[] = [];
  const running: AudioScheduledSourceNode[] = [];
  /** Add a node in series. */
  const add = (node: AudioNode): void => {
    nodes.push(node);
  };

  if (fx.utility) {
    const trim = ctx.createGain();
    /* The flip is a sign, not a phase shift. Multiplying by −1 turns the
       waveform upside down exactly; anything cleverer would be a delay
       pretending to be a polarity switch. */
    trim.gain.value = Math.pow(10, fx.utility.trim / 20) * (fx.utility.flip ? -1 : 1);
    add(trim);
    if (fx.utility.mono) {
      /* Both sides into one, then back out to both. A `ChannelMergerNode`
         fed the same signal twice is the honest way to say "the same on the
         left and the right". */
      const split = ctx.createChannelSplitter(2);
      const both = ctx.createGain();
      both.channelCount = 1;
      both.channelCountMode = 'explicit';
      both.channelInterpretation = 'speakers';
      split.connect(both, 0);
      split.connect(both, 1);
      /* Half, or folding two identical sides makes it 6 dB louder and the
         mono button reads as a volume control. */
      both.gain.value = 0.5;
      add(split);
      add(both);
    }
  }

  if (fx.eq) for (const filter of eqNodes(ctx, fx.eq)) add(filter);

  for (const [kind, settings] of [
    ['saturator', fx.saturator],
    ['folder', fx.folder],
  ] as const) {
    if (!settings) continue;
    const shaper = ctx.createWaveShaper();
    shaper.curve = curveOf(kind, settings.amount);
    /* `4x`, because a waveshaper generates harmonics above the sample rate
       and without oversampling they fold back down as aliasing — which is a
       harsh metallic ring nobody asked for and which a listener will blame on
       the recording rather than on the knob. */
    shaper.oversample = '4x';
    add(shaper);
  }

  if (fx.crusher) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = curveOf('crusher', fx.crusher.bits);
    /* NOT oversampled, unlike the two above. Oversampling a quantiser
       smooths the steps, and the steps are the effect. */
    shaper.oversample = 'none';
    add(shaper);
  }

  if (fx.compressor) {
    const squash = ctx.createDynamicsCompressor();
    squash.threshold.value = fx.compressor.threshold;
    squash.ratio.value = fx.compressor.ratio;
    squash.attack.value = fx.compressor.attack;
    squash.release.value = fx.compressor.release;
    squash.knee.value = 6;
    add(squash);
  }

  if (fx.limiter) {
    const stop = ctx.createDynamicsCompressor();
    stop.threshold.value = fx.limiter.ceiling;
    stop.ratio.value = 20;
    stop.attack.value = 0.001;
    stop.release.value = 0.05;
    /* No knee: a limiter that eases in is a compressor. */
    stop.knee.value = 0;
    add(stop);
  }

  if (fx.tremolo) {
    const wobble = ctx.createGain();
    /* The gain rides between 1 and 1 − depth, so at full depth it reaches
       silence and never goes negative — a gain that crosses zero flips the
       waveform and that is a different effect. */
    wobble.gain.value = 1 - fx.tremolo.depth / 2;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = fx.tremolo.rate;
    const swing = ctx.createGain();
    swing.gain.value = fx.tremolo.depth / 2;
    lfo.connect(swing).connect(wobble.gain);
    running.push(lfo);
    add(wobble);
  }

  const output = ctx.createGain();

  /* Everything above is in series. The two below are in parallel with it,
     because that is what a send is: the dry sound goes on to the output and a
     copy of it goes through the effect and is mixed back in. Putting a reverb
     in series would mean turning it up turned the dry sound down. */
  const input: AudioNode = nodes[0] ?? ctx.createGain();
  if (!nodes.length) nodes.push(input);
  for (let i = 0; i < nodes.length - 1; i += 1) nodes[i].connect(nodes[i + 1]);
  const dry = nodes[nodes.length - 1];
  dry.connect(output);

  if (fx.chorus) {
    /* A chorus is a short delay whose length wobbles: the sound arrives a few
       milliseconds late and the lateness moves, which is the pitch drift that
       makes one voice sound like two. */
    const late = ctx.createDelay(0.05);
    late.delayTime.value = 0.02;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = fx.chorus.rate;
    const swing = ctx.createGain();
    swing.gain.value = 0.008 * fx.chorus.depth;
    lfo.connect(swing).connect(late.delayTime);
    running.push(lfo);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    dry.connect(late).connect(wet).connect(output);
  }

  if (fx.delay) {
    const echo = ctx.createDelay(Math.max(0.05, Math.min(4, fx.delay.time) + 0.1));
    echo.delayTime.value = Math.max(0.01, Math.min(4, fx.delay.time));
    const again = ctx.createGain();
    /* Capped under one. At one the echo never dies and the lane grows until
       it clips, which on a phone is a horrible surprise with no obvious
       cause. */
    again.gain.value = Math.max(0, Math.min(0.9, fx.delay.feedback));
    const wet = ctx.createGain();
    wet.gain.value = Math.max(0, Math.min(1, fx.delay.mix));
    dry.connect(echo);
    echo.connect(again).connect(echo);
    echo.connect(wet).connect(output);
  }

  if (fx.reverb) {
    const room = ctx.createConvolver();
    room.buffer = roomOf(ctx, fx.reverb.size);
    const wet = ctx.createGain();
    wet.gain.value = Math.max(0, Math.min(1, fx.reverb.mix));
    dry.connect(room).connect(wet).connect(output);
  }

  return { input, output, running };
}
