/**
 * The beat machine in the kids room: eight steps, five sounds, no credits.
 *
 * ── Where it came from ───────────────────────────────────────────────────
 *
 * The owner, 13 October 2026, with a page Google drew of a "Kids Dream Studio":
 * *"Kom ons begin om die app self te upgrade. Hier is 'n nuwe kids studio."*
 * The page had a step sequencer a child fills by pressing squares, four
 * ready-made beats to start from, and a soundboard to bang on. All of it ran
 * on the browser's own oscillators, and that is the part worth keeping
 * exactly: a thing a six-year-old can press four hundred times costs nothing
 * and sends nothing anywhere.
 *
 * ── Why the engine is one object outside React ───────────────────────────
 *
 * The beat has to keep playing when the child goes from the music tab to the
 * stage — "Use in Video Studio" on Google's page was exactly that — and a
 * timer owned by a component dies when the tab it was drawn in is taken off
 * the screen. So the beat, the tempo and the clock live here, and the
 * components subscribe. The stage subscribes too: the dancers jump on the
 * step, which is the whole reason a child wants the beat on the stage.
 *
 * ── Why the sounds are drawn and not loaded ──────────────────────────────
 *
 * Seven sounds as oscillator envelopes rather than samples: nothing to fetch,
 * nothing to license, and they play the instant a finger lands, which on a
 * phone a sample does not always do. A kick is a sine sweep, a hi-hat is a
 * short square, a dinosaur is a sawtooth falling over.
 */

export type TrackId = 'kick' | 'snare' | 'hihat' | 'high' | 'low';
export type Sound = 'kick' | 'snare' | 'hihat' | 'bell' | 'synth' | 'dino' | 'laser';

export interface Track {
  readonly id: TrackId;
  readonly icon: string;
  /** The i18n key and the English, as `t` takes them. */
  readonly says: readonly [string, string];
  readonly sound: Sound;
  readonly pitch?: number;
}

export const STEPS = 8;

export const TRACKS: readonly Track[] = [
  { id: 'kick', icon: '🥁', says: ['kids.trackKick', 'Boomer Kick'], sound: 'kick' },
  { id: 'snare', icon: '💥', says: ['kids.trackSnare', 'Snappy Clap'], sound: 'snare' },
  { id: 'hihat', icon: '✨', says: ['kids.trackHihat', 'Sparkle Chime'], sound: 'hihat' },
  { id: 'high', icon: '⭐', says: ['kids.trackHigh', 'Joy Melody (High)'], sound: 'bell', pitch: 659.25 },
  { id: 'low', icon: '🎈', says: ['kids.trackLow', 'Joy Melody (Low)'], sound: 'synth', pitch: 523.25 },
];

export type Beat = Record<TrackId, boolean[]>;

const row = (dots: string): boolean[] => dots.split('').map((one) => one === 'x');

export const emptyBeat = (): Beat => ({
  kick: row('--------'), snare: row('--------'), hihat: row('--------'), high: row('--------'), low: row('--------'),
});

/** The beat the room opens with: a plain four-to-the-floor with a tune on top. */
export const FIRST_BEAT: Beat = {
  kick: row('x---x---'),
  snare: row('--x---x-'),
  hihat: row('xxxxxxxx'),
  high: row('x--x--x-'),
  low: row('-x--x--x'),
};

export interface BeatTemplate {
  readonly id: string;
  readonly icon: string;
  readonly says: readonly [string, string];
  readonly blurb: readonly [string, string];
  /** The tile's own colour, dark enough for pale words. */
  readonly wash: string;
  readonly beat: Beat;
}

/** Four beats to start from, one press each. Google's four, patterns and all. */
export const TEMPLATES: readonly BeatTemplate[] = [
  {
    id: 'dino', icon: '🦖', says: ['kids.beatDino', 'Dino Safari Party'], blurb: ['kids.beatDinoWhy', 'Heavy fun stomp beat!'], wash: '#047857',
    beat: { kick: row('x-x-x-x-'), snare: row('--x---x-'), hihat: row('x-x-x-x-'), high: row('--x---x-'), low: row('xx--xx--') },
  },
  {
    id: 'unicorn', icon: '🦄', says: ['kids.beatUnicorn', 'Rainbow Unicorn'], blurb: ['kids.beatUnicornWhy', 'Sparkly chime magic!'], wash: '#0f766e',
    beat: { kick: row('x---x---'), snare: row('----x---'), hihat: row('xxxxxxxx'), high: row('xxx-xxx-'), low: row('---x---x') },
  },
  {
    id: 'space', icon: '🚀', says: ['kids.beatSpace', 'Space Bubble Jam'], blurb: ['kids.beatSpaceWhy', 'Cosmic bouncy synth!'], wash: '#0e7490',
    beat: { kick: row('x--x--x-'), snare: row('--x--x--'), hihat: row('xx-xx-xx'), high: row('-x-x-x-x'), low: row('x-x-x-x-') },
  },
  {
    id: 'monkey', icon: '🐒', says: ['kids.beatMonkey', 'Monkey Boogie'], blurb: ['kids.beatMonkeyWhy', 'Fast giggly drums!'], wash: '#4d7c0f',
    beat: { kick: row('xx-xx-x-'), snare: row('--x--xx-'), hihat: row('xxxxxxxx'), high: row('x--xx--x'), low: row('-xx--xx-') },
  },
];

export interface Pad {
  readonly id: string;
  readonly icon: string;
  readonly says: readonly [string, string];
  readonly sound: Sound;
  readonly wash: string;
}

/** The soundboard: six pads to bang on while the beat runs, or instead of it. */
export const SOUNDBOARD: readonly Pad[] = [
  { id: 'kick', icon: '🥁', says: ['kids.padKick', 'Big Boomer'], sound: 'kick', wash: '#047857' },
  { id: 'snare', icon: '💥', says: ['kids.padSnare', 'Snappy Clap'], sound: 'snare', wash: '#0f766e' },
  { id: 'hihat', icon: '✨', says: ['kids.padHihat', 'Tinkly Hat'], sound: 'hihat', wash: '#065f46' },
  { id: 'bell', icon: '🔔', says: ['kids.padBell', 'Magic Bell'], sound: 'bell', wash: '#a16207' },
  { id: 'dino', icon: '🦕', says: ['kids.padDino', 'Dino Roar'], sound: 'dino', wash: '#15803d' },
  { id: 'laser', icon: '🚀', says: ['kids.padLaser', 'Laser Zwoop'], sound: 'laser', wash: '#4338ca' },
];

export const BPM_LEAST = 70;
export const BPM_MOST = 170;
export const BPM_FIRST = 115;

/** Half a beat per step, so eight steps are two bars of a bouncy four. */
export const stepMs = (bpm: number): number => (60 / bpm / 2) * 1000;

/** A beat thrown together, for "Surprise me". `pick` is handed in so a check can land on a known one. */
export const randomBeat = (pick: () => number = Math.random): Beat => {
  const line = (): boolean[] => Array.from({ length: STEPS }, () => pick() > 0.6);
  return { kick: line(), snare: line(), hihat: line(), high: line(), low: line() };
};

/* ── The sounds ─────────────────────────────────────────────────────── */

let held: AudioContext | null = null;

/** The one AudioContext, made on the first press and woken on every one. */
export function soundContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!held) {
    const Made = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Made) return null;
    held = new Made();
  }
  if (held.state === 'suspended') void held.resume();
  return held;
}

/** Play one sound now. Never throws: a muted or absent context is silence, not a crash. */
export function playSound(sound: Sound, pitch?: number): void {
  try {
    const ctx = soundContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (sound === 'kick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);
      gain.gain.setValueAtTime(1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now); osc.stop(now + 0.25);
    } else if (sound === 'snare') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now); osc.stop(now + 0.16);
    } else if (sound === 'hihat') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(8000, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now); osc.stop(now + 0.06);
    } else if (sound === 'bell') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch ?? 880, now);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now); osc.stop(now + 0.65);
    } else if (sound === 'synth') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch ?? 523.25, now);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now); osc.stop(now + 0.4);
    } else if (sound === 'dino') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.4);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.start(now); osc.stop(now + 0.5);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.25);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.start(now); osc.stop(now + 0.3);
    }
  } catch {
    /* No sound is the worst that happens. */
  }
}

export const playTrack = (track: Track): void => playSound(track.sound, track.pitch);

/* ── The engine ─────────────────────────────────────────────────────── */

type Listener = () => void;

/**
 * The beat, the tempo and the clock, owned once for the whole room.
 *
 * `step` is the step that just sounded, or -1 while stopped. Every change
 * tells the listeners, and the listeners are React components that re-read
 * the fields — so there is one clock, however many tabs draw it.
 */
class BeatEngine {
  beat: Beat = { ...FIRST_BEAT };
  bpm = BPM_FIRST;
  playing = false;
  step = -1;
  private next = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private tell(): void {
    this.listeners.forEach((fn) => fn());
  }

  toggle(track: TrackId, at: number): void {
    const line = [...this.beat[track]];
    line[at] = !line[at];
    this.beat = { ...this.beat, [track]: line };
    if (line[at]) {
      const found = TRACKS.find((one) => one.id === track);
      if (found) playTrack(found);
    }
    this.tell();
  }

  load(beat: Beat): void {
    this.beat = { kick: [...beat.kick], snare: [...beat.snare], hihat: [...beat.hihat], high: [...beat.high], low: [...beat.low] };
    this.tell();
  }

  clear(): void { this.load(emptyBeat()); }

  setBpm(bpm: number): void {
    this.bpm = Math.min(BPM_MOST, Math.max(BPM_LEAST, Math.round(bpm)));
    this.tell();
  }

  /** How many squares are lit: zero is a beat that plays silence. */
  lit(): number {
    return TRACKS.reduce((sum, one) => sum + this.beat[one.id].filter(Boolean).length, 0);
  }

  play(): void {
    if (this.playing) return;
    soundContext();
    this.playing = true;
    this.next = 0;
    this.tick();
  }

  stop(): void {
    this.playing = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.step = -1;
    this.tell();
  }

  private tick = (): void => {
    if (!this.playing) return;
    const at = this.next;
    TRACKS.forEach((one) => { if (this.beat[one.id][at]) playTrack(one); });
    this.step = at;
    this.next = (at + 1) % STEPS;
    this.tell();
    this.timer = setTimeout(this.tick, stepMs(this.bpm));
  };
}

export const beatEngine = new BeatEngine();
