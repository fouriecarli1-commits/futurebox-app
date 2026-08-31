/**
 * What a style sounds like, drawn in the browser.
 *
 * The soundboard used to play three mp3s hosted somewhere else across
 * seventeen genres — so "melodic techno" and "lo-fi study beats" were the same
 * recording, and when the host stopped answering every button went silent at
 * once with nothing on screen to say why. That is two failures: a claim that
 * was never true, and a way of breaking that could not be seen.
 *
 * So the sound is made here instead. A kick, a hat, a bass and a chord,
 * scheduled at the sample's own tempo and in its own key, with the arrangement
 * chosen by category. No network, no host, no file — it cannot go silent
 * because somebody else's CDN moved, and every genre genuinely differs from
 * every other because the numbers driving it do.
 *
 * ── What this is not ─────────────────────────────────────────────────────
 *
 * It is not a recording of the genre, and the screen must not suggest it is.
 * It is a sketch of the *feel*: the tempo you would count to, the key it sits
 * in, and the shape of the groove. That is genuinely the useful part when you
 * are about to write a style line — you are choosing a direction, not auditing
 * a master — and it is the honest thing to claim for four oscillators.
 *
 * The same rule the rest of this app runs on: the browser-drawn video says it
 * is browser-drawn, and this says it is a sketch.
 */

export interface Sketch {
  stop(): void;
}

/** Semitones from the root of a minor and a major triad, plus a seventh. */
const MINOR = [0, 3, 7, 10];
const MAJOR = [0, 4, 7, 11];

const NOTES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

/**
 * "D Minor" → the frequency of that D, low enough to be a bass note.
 *
 * Not simply the first letter. One entry on the shelf reads "Drop D", which is
 * a guitar tuning rather than a key — reading its first letter gives D by
 * coincidence, and a rule that is right by coincidence is a rule that breaks
 * on the next entry. So the note is taken as a standalone token, and where
 * there are several the one nearest the mode wins.
 */
function rootOf(key: string): { hz: number; minor: boolean } {
  const tokens = key.trim().split(/\s+/);
  const notes = tokens.filter((one) => /^[A-G][#b]?$/.test(one));
  // "Drop D" and "D Minor" both land on D; "in the key of A Major" lands on A.
  const chosen = notes.length ? notes[notes.length - 1] : null;
  const semitone = chosen ? NOTES[chosen] ?? 2 : 2;
  // Minor unless it says otherwise. A tuning like "Drop D" carries no mode,
  // and minor is the safer guess for the genres that use one.
  const minor = !/major/i.test(key);
  // A1 is 55Hz and is the octave a bass line actually lives in.
  return { hz: 55 * Math.pow(2, semitone / 12), minor };
}

/** Exported only so the checks can assert on the parse rather than the sound. */
export function readKey(key: string): { hz: number; minor: boolean } {
  return rootOf(key);
}

/** "124 BPM" → 124, and a sane fallback for anything unparseable. */
function tempoOf(bpm: string): number {
  const found = Number(/\d+/.exec(bpm)?.[0]);
  return Number.isFinite(found) && found >= 50 && found <= 220 ? found : 100;
}

/**
 * How a category is put together.
 *
 * Not a genre model — a handful of switches that make each family recognisably
 * itself: whether the kick lands on every beat or leaves room, how bright the
 * hats are, whether the bass is a saw or a sine, and how the chord sits.
 */
interface Kit {
  readonly fourOnFloor: boolean;
  readonly hats: 'off' | 'eighths' | 'sixteenths';
  readonly bass: 'saw' | 'sine' | 'square' | 'none';
  readonly pad: 'warm' | 'bright' | 'strings' | 'none';
  readonly swing: number;
  readonly cutoff: number;
}

const KITS: Record<string, Kit> = {
  'Electronic & EDM': { fourOnFloor: true, hats: 'sixteenths', bass: 'saw', pad: 'bright', swing: 0, cutoff: 2400 },
  'Pop & Synthpop': { fourOnFloor: true, hats: 'eighths', bass: 'saw', pad: 'bright', swing: 0, cutoff: 3200 },
  'Rock & Metal': { fourOnFloor: false, hats: 'eighths', bass: 'square', pad: 'none', swing: 0, cutoff: 3800 },
  'Hip-Hop & Trap': { fourOnFloor: false, hats: 'sixteenths', bass: 'sine', pad: 'warm', swing: 0.14, cutoff: 1600 },
  'R&B & Soul': { fourOnFloor: false, hats: 'eighths', bass: 'sine', pad: 'warm', swing: 0.18, cutoff: 1800 },
  'Country & Folk': { fourOnFloor: false, hats: 'off', bass: 'sine', pad: 'strings', swing: 0.1, cutoff: 2600 },
  'Cyberpunk & Darksynth': { fourOnFloor: true, hats: 'sixteenths', bass: 'saw', pad: 'bright', swing: 0, cutoff: 1400 },
  'Cinematic & Orchestral': { fourOnFloor: false, hats: 'off', bass: 'none', pad: 'strings', swing: 0, cutoff: 2000 },
  'Lo-Fi & Ambient': { fourOnFloor: false, hats: 'eighths', bass: 'sine', pad: 'warm', swing: 0.2, cutoff: 900 },
  'Afrobeats & Latin': { fourOnFloor: false, hats: 'sixteenths', bass: 'sine', pad: 'warm', swing: 0.08, cutoff: 2200 },
};

const FALLBACK: Kit = { fourOnFloor: true, hats: 'eighths', bass: 'sine', pad: 'warm', swing: 0, cutoff: 2000 };

/** Eight seconds: two bars at most tempos, which is one loop of the idea. */
const SECONDS = 8;

function kick(ctx: BaseAudioContext, out: AudioNode, at: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.setValueAtTime(140, at);
  osc.frequency.exponentialRampToValueAtTime(45, at + 0.11);
  gain.gain.setValueAtTime(0.9, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.28);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + 0.3);
}

/** Filtered noise. Short and bright is a hat; longer and duller is a snare. */
function noise(ctx: BaseAudioContext, out: AudioNode, at: number, length: number, hz: number, level: number): void {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * length));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = 'highpass';
  band.frequency.value = hz;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(level, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + length);
  source.connect(band).connect(gain).connect(out);
  source.start(at);
}

function tone(
  ctx: BaseAudioContext,
  out: AudioNode,
  at: number,
  hz: number,
  length: number,
  shape: OscillatorType,
  level: number,
  cutoff: number,
): void {
  const osc = ctx.createOscillator();
  osc.type = shape;
  osc.frequency.value = hz;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(level, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(filter).connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

/**
 * Play a sketch of one style. Returns a handle, because the caller has to be
 * able to stop it when another button is pressed.
 *
 * Throws nothing: a browser with no Web Audio returns a handle that does
 * nothing, and the caller checks `supported()` first rather than guessing from
 * a silence.
 */
export function sketch(input: { bpm: string; key: string; category: string }): Sketch {
  const Ctor = typeof window === 'undefined' ? undefined : window.AudioContext;
  if (!Ctor) return { stop: () => {} };

  const ctx = new Ctor();
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  schedule(ctx, master, input, ctx.currentTime + 0.08);

  let stopped = false;
  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    // Faded rather than cut: closing a context mid-note is an audible click.
    master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
    window.setTimeout(() => void ctx.close().catch(() => {}), 120);
  };

  window.setTimeout(stop, (SECONDS + 0.6) * 1000);
  return { stop };
}

/**
 * Write the notes into a context. Separated from `sketch` so it can be
 * rendered offline and *measured* — the claim "the play button makes a sound"
 * is worth proving rather than asserting, and the version of this file that
 * shipped before had a play button that made none.
 */
export function schedule(
  ctx: BaseAudioContext,
  master: AudioNode,
  input: { bpm: string; key: string; category: string },
  start: number,
): void {
  const kit = KITS[input.category] ?? FALLBACK;
  const { hz, minor } = rootOf(input.key);
  const beat = 60 / tempoOf(input.bpm);
  const chord = minor ? MINOR : MAJOR;

  for (let step = 0; step * (beat / 2) < SECONDS; step += 1) {
    // Swing pushes the off-beats late, which is most of what separates a
    // shuffle from a grid.
    const swung = step % 2 === 1 ? kit.swing * (beat / 2) : 0;
    const at = start + step * (beat / 2) + swung;
    const onBeat = step % 2 === 0;
    const bar = Math.floor(step / 8) % 2;

    if (kit.fourOnFloor ? onBeat : step % 8 === 0 || step % 8 === 6) kick(ctx, master, at);
    // Backbeat: the two and the four, which is the other half of a groove.
    if (step % 8 === 4) noise(ctx, master, at, 0.16, 1200, 0.35);
    if (kit.hats === 'eighths' && onBeat) noise(ctx, master, at, 0.04, 7000, 0.12);
    if (kit.hats === 'sixteenths') noise(ctx, master, at, 0.03, 8000, onBeat ? 0.12 : 0.07);

    if (kit.bass !== 'none' && step % 4 === 0) {
      // Root, then the fifth in the second bar: enough movement to hear a key.
      const note = hz * Math.pow(2, (bar === 0 ? 0 : 7) / 12);
      tone(ctx, master, at, note, beat * 0.9, kit.bass === 'saw' ? 'sawtooth' : kit.bass === 'square' ? 'square' : 'sine', 0.28, kit.cutoff);
    }

    if (kit.pad !== 'none' && step % 16 === 0) {
      for (const interval of chord) {
        const note = hz * 4 * Math.pow(2, (interval + (bar === 0 ? 0 : 5)) / 12);
        tone(
          ctx,
          master,
          at,
          note,
          beat * 3.6,
          kit.pad === 'strings' ? 'triangle' : 'sawtooth',
          kit.pad === 'bright' ? 0.06 : 0.045,
          kit.pad === 'bright' ? kit.cutoff : kit.cutoff * 0.6,
        );
      }
    }
  }

}

export function supported(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext === 'function';
}

/** How long a sketch runs, so a screen can show a progress line that is true. */
export const SKETCH_SECONDS = SECONDS;
