/**
 * The piano in the kids room: an octave of keys, four tunes to copy, and a
 * way to keep a tune as a song. Everything plays on the browser's own
 * oscillator (`kidsbeat.ts`) and nothing here asks a server for anything.
 *
 * Carli, 13 October 2026: *"Maybe a game section to play with music, piano,
 * music editing and DAW stuff and creating their own songs on a childs way
 * with guidance."*
 *
 * The guidance is "copy me": the piano plays a short tune with the keys
 * lighting up, and the child plays it back. The tunes are the ones every
 * child already half knows, so the win is reachable on the first evening.
 */
import { writeWav } from './wav';

export interface Key {
  readonly id: string;
  /** The letter, the same in both languages. */
  readonly name: string;
  readonly hz: number;
  readonly black: boolean;
  /** Each white key its own colour, so a tune can be read as colours. */
  readonly colour: string;
}

/** C4 to C5, white and black, as a piano has them. */
export const KEYS: readonly Key[] = [
  { id: 'c4', name: 'C', hz: 261.63, black: false, colour: '#ef4444' },
  { id: 'cs4', name: 'C#', hz: 277.18, black: true, colour: '#1f2937' },
  { id: 'd4', name: 'D', hz: 293.66, black: false, colour: '#f97316' },
  { id: 'ds4', name: 'D#', hz: 311.13, black: true, colour: '#1f2937' },
  { id: 'e4', name: 'E', hz: 329.63, black: false, colour: '#facc15' },
  { id: 'f4', name: 'F', hz: 349.23, black: false, colour: '#22c55e' },
  { id: 'fs4', name: 'F#', hz: 369.99, black: true, colour: '#1f2937' },
  { id: 'g4', name: 'G', hz: 392.0, black: false, colour: '#3b82f6' },
  { id: 'gs4', name: 'G#', hz: 415.3, black: true, colour: '#1f2937' },
  { id: 'a4', name: 'A', hz: 440.0, black: false, colour: '#a855f7' },
  { id: 'as4', name: 'A#', hz: 466.16, black: true, colour: '#1f2937' },
  { id: 'b4', name: 'B', hz: 493.88, black: false, colour: '#ec4899' },
  { id: 'c5', name: 'C', hz: 523.25, black: false, colour: '#ef4444' },
];

export const keyOf = (id: string): Key | undefined => KEYS.find((one) => one.id === id);

export interface Tune {
  readonly id: string;
  readonly says: readonly [string, string];
  /** Key ids, in order. Short on purpose: a phrase, not the whole song. */
  readonly notes: readonly string[];
}

export const TUNES: readonly Tune[] = [
  { id: 'twinkle', says: ['kids.tuneTwinkle', 'Twinkle, twinkle'], notes: ['c4', 'c4', 'g4', 'g4', 'a4', 'a4', 'g4'] },
  { id: 'mary', says: ['kids.tuneMary', 'Mary had a little lamb'], notes: ['e4', 'd4', 'c4', 'd4', 'e4', 'e4', 'e4'] },
  { id: 'ladder', says: ['kids.tuneLadder', 'Up the ladder'], notes: ['c4', 'd4', 'e4', 'f4', 'g4', 'a4', 'b4', 'c5'] },
  { id: 'happy', says: ['kids.tuneHappy', 'Happy birthday'], notes: ['c4', 'c4', 'd4', 'c4', 'f4', 'e4'] },
];

/** One pressed note, as the recorder keeps it. */
export interface Pressed {
  readonly id: string;
  /** Milliseconds after the first press. */
  readonly at: number;
}

/** The keys' own paint: ivory, ebony, the lit black key, and the ink on a lit white one. */
export const IVORY = '#fffdf5';
export const EBONY = '#111827';
export const LIT_EBONY = '#34d399';
export const LIT_INK = '#ffffff';

/** The longest tune the recorder keeps, in milliseconds. */
export const RECORD_MOST_MS = 30_000;

/** The note's shape: a soft triangle with a quick rise and a slow fall. */
export const NOTE_SECONDS = 0.5;

/**
 * Play one key on a context, now or at a time. Shared by the live piano and
 * the offline render, so a kept tune sounds like the one that was played.
 */
export function strike(ctx: BaseAudioContext, hz: number, at: number, out: AudioNode): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = hz;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.45, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + NOTE_SECONDS);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + NOTE_SECONDS + 0.05);
}

/**
 * A recorded tune as a WAV, rendered offline at the times it was played.
 * Mono, 44.1 kHz, half a second of air at the end so the last note rings.
 */
export async function renderTune(pressed: readonly Pressed[]): Promise<Blob | null> {
  if (!pressed.length || typeof OfflineAudioContext === 'undefined') return null;
  const rate = 44_100;
  const last = pressed[pressed.length - 1].at / 1000;
  const seconds = Math.min(RECORD_MOST_MS / 1000, last) + NOTE_SECONDS + 0.5;
  const room = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
  for (const one of pressed) {
    const key = keyOf(one.id);
    if (key) strike(room, key.hz, one.at / 1000, room.destination);
  }
  const done = await room.startRendering();
  return writeWav([done.getChannelData(0)], rate);
}
