/**
 * Effects on the sound: a shot's own sound, and the song under the film.
 *
 * Carli, 16 October 2026, screenshots of a desktop editor's audio effects
 * shelf — equalisers, a compressor, reverbs, echo, a de-esser, a vocal
 * channel. What a phone browser can do honestly is the Web Audio graph:
 * filters, a compressor, a delay with feedback, a convolver fed a room we
 * make here. So these are those, named for what somebody hears rather than
 * what the node is called, and nothing here pretends to be a separation of a
 * voice from a room, which no browser has to give.
 *
 * One `chainAudioFx` builds the same graph for the export (`stitch.ts`) and
 * for the editor's preview, so the echo she hears while cutting is the echo
 * in the file. Each effect mixes its changed sound with the dry one by its
 * strength, so half strength is half of it rather than a different effect.
 */

export type AudioFxId =
  | 'clarity' | 'bass' | 'treble' | 'radio' | 'underwater'
  | 'loud' | 'room' | 'hall' | 'echo' | 'robot';

export type AudioFxGroup = 'voice' | 'tone' | 'space' | 'fun';

export const AUDIO_FX_GROUPS: readonly { readonly id: AudioFxGroup; readonly en: string; readonly af: string }[] = [
  { id: 'voice', en: 'Voice', af: 'Stem' },
  { id: 'tone', en: 'Tone', af: 'Toon' },
  { id: 'space', en: 'Space', af: 'Ruimte' },
  { id: 'fun', en: 'Character', af: 'Karakter' },
];

export interface AudioFxSpec {
  readonly id: AudioFxId;
  readonly group: AudioFxGroup;
  readonly en: string;
  readonly af: string;
  /** What it does, in a line she can read before pressing it. */
  readonly what: readonly [string, string];
  readonly rest: number;
}

export const AUDIO_FX: readonly AudioFxSpec[] = [
  { id: 'clarity', group: 'voice', en: 'Voice clarity', af: 'Helder stem', what: ['Rumble out, words brought forward, levels evened.', 'Gedreun uit, woorde nader, vlakke gelyk.'], rest: 0.8 },
  { id: 'loud', group: 'voice', en: 'Even and loud', af: 'Gelyk en hard', what: ['Quiet parts lifted and loud parts held, so it sits up in a feed.', 'Sagte dele op en harde dele vasgehou, sodat dit uitstaan.'], rest: 0.8 },
  { id: 'bass', group: 'tone', en: 'Bass boost', af: 'Meer bas', what: ['More weight underneath.', 'Meer gewig onder.'], rest: 0.6 },
  { id: 'treble', group: 'tone', en: 'Brighter', af: 'Helderder', what: ['More air on top.', 'Meer lug bo.'], rest: 0.6 },
  { id: 'radio', group: 'tone', en: 'Old radio', af: 'Ou radio', what: ['Thin and a little broken, like a speaker in a box.', 'Dun en effens stukkend, soos ’n luidspreker in ’n boks.'], rest: 0.9 },
  { id: 'underwater', group: 'tone', en: 'Muffled', af: 'Gedemp', what: ['From the next room, or under water.', 'Uit die volgende kamer, of onder water.'], rest: 0.9 },
  { id: 'room', group: 'space', en: 'Small room', af: 'Klein kamer', what: ['A short reflection off near walls.', '’n Kort weerklank van naby mure.'], rest: 0.4 },
  { id: 'hall', group: 'space', en: 'Big hall', af: 'Groot saal', what: ['A long tail, like a church or a hall.', '’n Lang stert, soos ’n kerk of ’n saal.'], rest: 0.4 },
  { id: 'echo', group: 'space', en: 'Echo', af: 'Eggo', what: ['Each word comes back, quieter each time.', 'Elke woord kom terug, elke keer sagter.'], rest: 0.4 },
  { id: 'robot', group: 'fun', en: 'Robot', af: 'Robot', what: ['A metal voice.', '’n Metaalstem.'], rest: 0.8 },
];

export interface AudioFxOn {
  readonly id: AudioFxId;
  readonly amount: number;
}

export const audioFxLabel = (one: { readonly en: string; readonly af: string }, lang: string): string =>
  (lang === 'af' ? one.af : one.en);

const held = (n: number): number => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** Only effects this file knows, each once, with a strength it can use. */
export function cleanAudioFx(list: readonly AudioFxOn[] | undefined): AudioFxOn[] {
  const seen = new Set<AudioFxId>();
  const out: AudioFxOn[] = [];
  for (const one of list ?? []) {
    if (!AUDIO_FX.some((spec) => spec.id === one.id) || seen.has(one.id)) continue;
    seen.add(one.id);
    out.push({ id: one.id, amount: held(one.amount) });
  }
  return out;
}

/** A room's echo, made here: noise dying away over `seconds`, a little different left and right. */
function roomOf(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.max(1, Math.round(ctx.sampleRate * seconds));
  const room = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = room.getChannelData(ch);
    let seed = 9301 + ch * 4999;
    for (let i = 0; i < length; i += 1) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const noise = (seed / 0x7fffffff) * 2 - 1;
      data[i] = noise * (1 - i / length) ** decay;
    }
  }
  return room;
}

/** A gentle curve that rounds the tops off, for the old radio's broken edge. */
function crushCurve(): Float32Array {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 3);
  }
  return curve;
}

/** One effect: what goes in, what comes out, and anything that has to be started and stopped. */
interface Stage {
  readonly input: AudioNode;
  readonly output: AudioNode;
  readonly running: readonly AudioScheduledSourceNode[];
}

function wetStage(ctx: BaseAudioContext, id: AudioFxId): Stage {
  const running: AudioScheduledSourceNode[] = [];
  const entry = ctx.createGain();
  const exit = ctx.createGain();
  const filter = (type: BiquadFilterType, frequency: number, gain = 0, q = 0.7): BiquadFilterNode => {
    const one = ctx.createBiquadFilter();
    one.type = type;
    one.frequency.value = frequency;
    one.gain.value = gain;
    one.Q.value = q;
    return one;
  };
  const line = (...nodes: AudioNode[]): void => {
    let at: AudioNode = entry;
    for (const node of nodes) { at.connect(node); at = node; }
    at.connect(exit);
  };
  switch (id) {
    case 'clarity': {
      const squeeze = ctx.createDynamicsCompressor();
      squeeze.threshold.value = -24;
      squeeze.ratio.value = 3;
      line(filter('highpass', 90), filter('peaking', 3200, 5, 1), squeeze);
      break;
    }
    case 'loud': {
      const squeeze = ctx.createDynamicsCompressor();
      squeeze.threshold.value = -30;
      squeeze.knee.value = 10;
      squeeze.ratio.value = 6;
      squeeze.attack.value = 0.005;
      squeeze.release.value = 0.2;
      const lift = ctx.createGain();
      lift.gain.value = 1.8;
      line(squeeze, lift);
      break;
    }
    case 'bass':
      line(filter('lowshelf', 180, 9));
      break;
    case 'treble':
      line(filter('highshelf', 4500, 8));
      break;
    case 'radio': {
      const crush = ctx.createWaveShaper();
      crush.curve = crushCurve() as Float32Array<ArrayBuffer>;
      line(filter('highpass', 400), filter('lowpass', 3200), crush);
      break;
    }
    case 'underwater':
      line(filter('lowpass', 520, 0, 1.2));
      break;
    case 'room':
    case 'hall': {
      const verb = ctx.createConvolver();
      verb.buffer = id === 'room' ? roomOf(ctx, 0.6, 3) : roomOf(ctx, 2.8, 2);
      line(verb);
      break;
    }
    case 'echo': {
      const delay = ctx.createDelay(2);
      delay.delayTime.value = 0.32;
      const back = ctx.createGain();
      back.gain.value = 0.42;
      entry.connect(delay);
      delay.connect(back);
      back.connect(delay);
      delay.connect(exit);
      break;
    }
    case 'robot': {
      /* Ring modulation: the sound multiplied by a low hum. */
      const ring = ctx.createGain();
      ring.gain.value = 0;
      const hum = ctx.createOscillator();
      hum.frequency.value = 55;
      hum.connect(ring.gain);
      hum.start();
      running.push(hum);
      line(ring);
      break;
    }
    default:
      line();
  }
  return { input: entry, output: exit, running };
}

/**
 * Put a chain of sound effects between `from` and `to`. Answers a function
 * that takes it apart again — for the preview, when the effects change.
 */
export function chainAudioFx(ctx: BaseAudioContext, from: AudioNode, to: AudioNode, list: readonly AudioFxOn[] | undefined): () => void {
  const fx = cleanAudioFx(list);
  const made: AudioNode[] = [];
  const running: AudioScheduledSourceNode[] = [];
  let at: AudioNode = from;
  for (const one of fx) {
    /* Dry and wet side by side, mixed by the strength. */
    const split = ctx.createGain();
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    const join = ctx.createGain();
    dry.gain.value = 1 - one.amount;
    wet.gain.value = one.amount;
    const stage = wetStage(ctx, one.id);
    at.connect(split);
    split.connect(dry);
    split.connect(stage.input);
    stage.output.connect(wet);
    dry.connect(join);
    wet.connect(join);
    made.push(split, dry, wet, join, stage.input, stage.output);
    running.push(...stage.running);
    at = join;
  }
  at.connect(to);
  return () => {
    try { from.disconnect(); } catch { /* already */ }
    for (const node of made) { try { node.disconnect(); } catch { /* already */ } }
    for (const one of running) { try { one.stop(); } catch { /* already */ } }
  };
}

/* ── Sound across a transition ───────────────────────────────────────────
   Carli's screenshots carried the audio transitions too: cross fades at 0,
   +3 and −3 dB. Shots in this room play one after another, so the sound of
   a shot fades out into a transition and the next one fades in out of it —
   which is what a cross fade sounds like when the two never overlap. The
   curve is the difference between them. */

export type SoundJoin = 'cut' | 'even' | 'smooth' | 'quick';

export const SOUND_JOINS: readonly { readonly id: SoundJoin; readonly en: string; readonly af: string }[] = [
  { id: 'smooth', en: 'Cross fade +3 dB (smooth)', af: 'Kruisdoof +3 dB (glad)' },
  { id: 'even', en: 'Cross fade 0 dB (even)', af: 'Kruisdoof 0 dB (eweredig)' },
  { id: 'quick', en: 'Cross fade −3 dB (quick)', af: 'Kruisdoof −3 dB (vinnig)' },
  { id: 'cut', en: 'Sound cuts with the picture', af: 'Klank sny saam met die prent' },
];

/** How loud a shot's sound is, `p` of the way through a fade in (0 silent, 1 whole). */
export function fadeLevel(join: SoundJoin, p: number): number {
  const x = Math.min(1, Math.max(0, Number.isFinite(p) ? p : 1));
  switch (join) {
    case 'cut': return 1;
    case 'even': return x;
    case 'quick': return x * x;
    default: return Math.sin((x * Math.PI) / 2);
  }
}
