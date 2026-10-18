/**
 * The looper in the live jam room: what a loop is, in numbers.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner, 18 October 2026: *"Hierdie live jam room sal so cool wees as
 * daar 'n looper in gebou word, sodat 'n klank gehou kan word en gelayer
 * word."* And then the part that makes it a room rather than a toy: when
 * somebody in the room is looping, a small plus pulses on everybody else's
 * screen for as long as the loop plays — gone when it stops, back when a new
 * one starts — and pressing it puts that loop into your own.
 *
 * ── Two kinds of layer ───────────────────────────────────────────────────
 *
 * A PADS layer is a list of hits — which pad, and where in the loop as a
 * fraction of it. The room's four sounds are made by each browser's own
 * oscillators, so a pattern is the whole of the sound: a few hundred bytes,
 * and it plays identically on every screen.
 *
 * A VOICE layer is a recording off the microphone, one loop long, kept as
 * the compressed file the browser recorded (base64, so it travels inside the
 * loop). It is capped, because a loop is shared by being read by everybody
 * in the room.
 *
 * ── Different tempos ─────────────────────────────────────────────────────
 *
 * Every loop is two bars of four. A loop added from somebody at another
 * tempo keeps its bars: a pad pattern lands on the same beats of yours,
 * because hits are fractions, and a recording is played faster or slower to
 * fit — which changes its pitch, and the screen says so.
 *
 * Pure — `check:looper` reads it, and so does the server.
 */

export const PADS = ['kick', 'snare', 'hihat', 'riser'] as const;
export type Pad = (typeof PADS)[number];

export const TEMPOS = [80, 90, 100, 110, 120, 140] as const;
export const DEFAULT_BPM = 100;
export const BARS = 2;
export const BEATS_PER_BAR = 4;

/** How many layers one loop may hold. */
export const MOST_LAYERS = 8;
/** How many hits one pad layer may hold — a sixteenth on every pad is 128. */
export const MOST_HITS = 128;
/** The longest a voice layer may be, as base64 text. About 90 KB of audio. */
export const MOST_VOICE_CHARS = 120_000;
/** The most voice text in one loop, all layers together. */
export const MOST_LOOP_VOICE_CHARS = 360_000;

export interface PadHit {
  readonly pad: Pad;
  /** Where in the loop, 0 up to (not including) 1. */
  readonly at: number;
}

export type Layer =
  | { readonly id: string; readonly kind: 'pads'; readonly hits: readonly PadHit[]; readonly from?: string }
  | {
      readonly id: string;
      readonly kind: 'voice';
      /** The recording, base64, as the browser recorded it. */
      readonly audio: string;
      /** Its media type, e.g. `audio/webm;codecs=opus`. */
      readonly type: string;
      readonly from?: string;
      /** The tempo it was recorded at, so it can be fitted to another. */
      readonly bpm: number;
    };

export interface Loop {
  readonly bpm: number;
  readonly layers: readonly Layer[];
}

/** How long one pass of a loop is, in seconds. */
export function loopSeconds(bpm: number): number {
  return (BARS * BEATS_PER_BAR * 60) / bpm;
}

/** Where a moment falls in the loop, as a fraction, given when the loop started. */
export function placeIn(now: number, startedAt: number, bpm: number): number {
  const length = loopSeconds(bpm);
  const into = (now - startedAt) % length;
  return (into < 0 ? into + length : into) / length;
}

/**
 * A hit snapped to the nearest sixteenth.
 *
 * A finger is never exactly on the beat, and a loop repeats the miss every
 * pass. Snapping to a sixteenth — sixteen to a bar — is what a looper's
 * "quantise" does and is fine enough that nothing a person meant is lost.
 */
export function snap(at: number): number {
  const steps = BARS * BEATS_PER_BAR * 4;
  const snapped = Math.round(at * steps) / steps;
  return snapped >= 1 ? 0 : snapped;
}

/** How fast a recording made at `from` bpm plays to fit a loop at `to`. */
export function rateFor(from: number, to: number): number {
  return to / from;
}

/** The beat length in seconds, for the plus's pulse. */
export function beatSeconds(bpm: number): number {
  return 60 / bpm;
}

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));
const tempoOf = (raw: unknown): number | null => {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 60 && value <= 180 ? Math.round(value) : null;
};
const nameOf = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  const text = raw.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  return text || undefined;
};
const idOf = (raw: unknown, at: number): string =>
  typeof raw === 'string' && /^[\w-]{1,40}$/.test(raw) ? raw : `layer-${at}`;

/**
 * A loop as it arrives — from the network or from storage — made safe, or
 * null when there is nothing in it worth playing.
 *
 * Everything is re-checked: a pad that is not one of the four is dropped, a
 * hit outside the loop is dropped, a recording that is not audio or is too
 * long is dropped, and the loop is cut to `MOST_LAYERS`.
 */
export function cleanLoop(raw: unknown): Loop | null {
  if (!raw || typeof raw !== 'object') return null;
  const got = raw as { bpm?: unknown; layers?: unknown };
  const bpm = tempoOf(got.bpm);
  if (bpm === null || !Array.isArray(got.layers)) return null;
  const layers: Layer[] = [];
  let voiceChars = 0;
  for (const [at, one] of got.layers.entries()) {
    if (layers.length >= MOST_LAYERS) break;
    if (!one || typeof one !== 'object') continue;
    const layer = one as Record<string, unknown>;
    const from = nameOf(layer.from);
    if (layer.kind === 'pads' && Array.isArray(layer.hits)) {
      const hits: PadHit[] = [];
      for (const hit of layer.hits.slice(0, MOST_HITS)) {
        const h = hit as { pad?: unknown; at?: unknown };
        const where = Number(h?.at);
        if (!PADS.includes(h?.pad as Pad) || !Number.isFinite(where) || where < 0 || where >= 1) continue;
        hits.push({ pad: h.pad as Pad, at: clamp(where, 0, 0.999999) });
      }
      if (hits.length) layers.push({ id: idOf(layer.id, at), kind: 'pads', hits, ...(from ? { from } : {}) });
      continue;
    }
    if (layer.kind === 'voice' && typeof layer.audio === 'string') {
      const audio = layer.audio;
      const type = typeof layer.type === 'string' ? layer.type : '';
      const recordedAt = tempoOf(layer.bpm) ?? bpm;
      if (!/^audio\/[\w.+-]+(;[\w=.,+ -]*)?$/.test(type)) continue;
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(audio) || audio.length > MOST_VOICE_CHARS) continue;
      if (voiceChars + audio.length > MOST_LOOP_VOICE_CHARS) continue;
      voiceChars += audio.length;
      layers.push({ id: idOf(layer.id, at), kind: 'voice', audio, type, bpm: recordedAt, ...(from ? { from } : {}) });
    }
  }
  return layers.length ? { bpm, layers } : null;
}

/**
 * Somebody else's loop, ready to go into yours.
 *
 * Every layer is marked with who made it (unless it already says), given an
 * id of its own so two adds of the same loop do not collide, and the result
 * is cut so the two together stay within `MOST_LAYERS` — yours first.
 */
export function addInto(mine: readonly Layer[], theirs: Loop, by: string, stamp: string): Layer[] {
  const room = MOST_LAYERS - mine.length;
  const added = theirs.layers.slice(0, Math.max(0, room)).map((layer, at): Layer => ({
    ...layer,
    id: `${stamp}-${at}`,
    from: layer.from ?? by,
  }));
  return [...mine, ...added];
}

/** How big a loop is on the wire, roughly, so a send that would be refused is not tried. */
export function sizeOf(loop: Loop): number {
  return JSON.stringify(loop).length;
}

/**
 * How many times one pass goes round to cover a song, for a loop sent to the
 * booth: at least once, never more than the booth lets a lane repeat, and
 * eight passes when there is no song length to go by.
 */
export function roundsFor(songSeconds: number, passSeconds: number, most: number): number {
  if (!(passSeconds > 0)) return 1;
  const want = songSeconds > 0 ? Math.ceil(songSeconds / passSeconds) : 8;
  return Math.max(1, Math.min(most, want));
}
