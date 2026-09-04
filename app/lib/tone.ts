/**
 * Drive, colour and a speaker, on one lane.
 *
 * ── What this is, said plainly, because the category invites lying ───────
 *
 * It is a tone stack built out of Web Audio nodes: a soft-clipping curve, a
 * shelf, and a band the shape of a guitar speaker. It is not a model of any
 * particular amplifier. Nothing here was measured against a Fender or a
 * Marshall, no impulse response of a real cabinet is loaded, and no neural
 * profile is run — those are somebody else's licensed product and calling this
 * one of them would be a lie a guitarist would spot in four seconds.
 *
 * What it does do is real, and it is most of what a phone recording of a
 * guitar actually needs: something to stop it sounding like a phone.
 *
 * ── Why the curve is normalised ──────────────────────────────────────────
 *
 * Turning up the drive on most plugins also turns up the volume, and louder is
 * reliably mistaken for better — so the setting gets pushed until it is louder
 * than everything else rather than until it sounds right. The curve here maps
 * full scale in to full scale out at every setting, so moving the knob changes
 * the shape and not the level. What you hear is the only thing that changed.
 */

export interface Tone {
  /** 0 is a straight wire. 1 is heavily squashed. */
  readonly drive: number;
  /** 0 dark, 0.5 flat, 1 bright. A tilt, not an equaliser. */
  readonly colour: number;
  /** The band a guitar speaker passes, which is narrower than people expect. */
  readonly cabinet: boolean;
  /** How much of the shaped signal is heard against the untouched one. */
  readonly mix: number;
}

export const CLEAN: Tone = { drive: 0, colour: 0.5, cabinet: false, mix: 1 };

/** Nothing is being done, so nothing should be built. */
export function isClean(tone: Tone | undefined): boolean {
  if (!tone) return true;
  return tone.drive <= 0.001 && Math.abs(tone.colour - 0.5) < 0.001 && !tone.cabinet;
}

/** How many points the curve is drawn with. Enough that the steps are inaudible. */
export const CURVE_POINTS = 1024;

/**
 * The shaping curve: a hyperbolic tangent, normalised.
 *
 * `tanh` because it is the standard soft clip — it bends progressively rather
 * than cornering, which is what makes it sound like an amplifier being pushed
 * instead of like a fault. Dividing by `tanh(k)` is what keeps full scale
 * mapping to full scale at every setting; see the note above about why that
 * matters more than it looks.
 *
 * No drive is a straight line — as straight as a `Float32Array` can hold,
 * which is where this comment went wrong twice and both times are worth
 * keeping. First it claimed twelve decimal places from letting `k` approach
 * zero, and the formula only tends to the identity to about seven. Then, with
 * zero given its own case and the values written exactly, it still missed by a
 * billionth: a curve table is single-precision, so seven digits is not a
 * property of the arithmetic, it is the ceiling of the container.
 *
 * The wire is a wire and the claim now says which precision it is a wire to.
 * A comment that is wrong is how the next person builds on something that does
 * not hold.
 */
export const STRAIGHT = 0.001;

export function curveFor(drive: number): Float32Array<ArrayBuffer> {
  const amount = Math.max(0, Math.min(1, drive));
  /* Backed by an ordinary `ArrayBuffer` rather than whatever the runtime feels
     like: `WaveShaperNode.curve` will not take one that might be shared, and
     the error only appears at the assignment, three files from here. */
  const curve = new Float32Array(new ArrayBuffer(CURVE_POINTS * 4));
  const at = (i: number) => (i / (CURVE_POINTS - 1)) * 2 - 1;

  if (amount <= STRAIGHT) {
    for (let i = 0; i < CURVE_POINTS; i += 1) curve[i] = at(i);
    return curve;
  }

  const k = amount * 12;
  const top = Math.tanh(k);
  for (let i = 0; i < CURVE_POINTS; i += 1) curve[i] = Math.tanh(k * at(i)) / top;
  return curve;
}

/** Where the shelf sits, and how far it tilts at either end. */
export const SHELF_HZ = 1600;
export const MOST_TILT_DB = 12;

export function tiltDb(colour: number): number {
  return (Math.max(0, Math.min(1, colour)) - 0.5) * 2 * MOST_TILT_DB;
}

/**
 * A guitar speaker passes less than people expect.
 *
 * Roughly 80 Hz to 5 kHz with a lift around two, which is why a direct guitar
 * sounds thin and fizzy and a miked one does not. Ordinary filters, no impulse
 * response — an IR is a recording of a specific cabinet and shipping one means
 * licensing it.
 *
 * ── Why the slopes are doubled ───────────────────────────────────────────
 *
 * The first version used one filter at each end. `audit/mixdown.mjs` measured
 * it and 9 kHz — well outside anything a speaker passes — came through only
 * 5 dB down, because a single biquad is twelve decibels an octave and 9 kHz is
 * less than an octave above five. A real cabinet is twenty or thirty down by
 * there. So the control was named "speaker" and did not sound like one, which
 * is the failure this whole file is written to avoid.
 *
 * Two stages at each end is twenty-four decibels an octave, which puts 9 kHz
 * about twenty down and sounds like what it says on the button.
 */
export const CABINET = { lowHz: 80, highHz: 5000, presenceHz: 2000, presenceDb: 4, stages: 2 };

/**
 * Build the chain, and hand back what to feed and what comes out.
 *
 * Built the same way wherever it is built — the live graph and the offline
 * render both call this — for the same reason `wireLane` is shared: two copies
 * is how a mixer and a mixdown come to disagree.
 */
export function wireTone(
  ctx: BaseAudioContext,
  tone: Tone,
): { input: AudioNode; output: AudioNode } | null {
  if (isClean(tone)) return null;

  const input = ctx.createGain();
  const output = ctx.createGain();

  /* Dry and wet in parallel rather than one after the other, so `mix` is a
     blend and not a bypass. A guitarist blending a clean signal under a driven
     one is doing something specific, and it is the thing that keeps the pick
     attack when the drive is high. */
  const dry = ctx.createGain();
  dry.gain.value = 1 - Math.max(0, Math.min(1, tone.mix));
  input.connect(dry).connect(output);

  const wet = ctx.createGain();
  wet.gain.value = Math.max(0, Math.min(1, tone.mix));

  let end: AudioNode = input;

  if (tone.drive > 0.001) {
    const shape = ctx.createWaveShaper();
    shape.curve = curveFor(tone.drive);
    shape.oversample = '4x';
    end.connect(shape);
    end = shape;
  }

  if (Math.abs(tone.colour - 0.5) >= 0.001) {
    const shelf = ctx.createBiquadFilter();
    shelf.type = 'highshelf';
    shelf.frequency.value = SHELF_HZ;
    shelf.gain.value = tiltDb(tone.colour);
    end.connect(shelf);
    end = shelf;
  }

  if (tone.cabinet) {
    for (let stage = 0; stage < CABINET.stages; stage += 1) {
      const low = ctx.createBiquadFilter();
      low.type = 'highpass';
      low.frequency.value = CABINET.lowHz;
      /* Butterworth per stage, so cascading them does not build a resonant
         peak at the corner. The default Q of 1 would put a bump right where
         the speaker is supposed to be rolling away. */
      low.Q.value = Math.SQRT1_2;
      end.connect(low);
      end = low;
    }
    for (let stage = 0; stage < CABINET.stages; stage += 1) {
      const high = ctx.createBiquadFilter();
      high.type = 'lowpass';
      high.frequency.value = CABINET.highHz;
      high.Q.value = Math.SQRT1_2;
      end.connect(high);
      end = high;
    }
    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = CABINET.presenceHz;
    presence.Q.value = 0.8;
    presence.gain.value = CABINET.presenceDb;
    end.connect(presence);
    end = presence;
  }

  end.connect(wet).connect(output);
  return { input, output };
}
