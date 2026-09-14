/**
 * What the copilot is allowed to do to a mix, and what it is not.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: *"AI icon (Copilot pop op en vra dat persoon 'n
 * mixing voorstel en copilot kan die mixing verander volgens die vraag en
 * voorstel)"* — the copilot asks for a mixing suggestion and can change the
 * mix according to it.
 *
 * ── Why the rules are here and not in the route ─────────────────────────
 *
 * The same reason `copilotplan.ts` exists: a model is not a contract. It is
 * asked for changes inside a range and it will mostly stay inside it, and
 * "mostly" is not a property you can build a fader on. Every number that
 * comes back is clamped here, every change naming a lane that is not in the
 * session is dropped here, and the list is cut to a length a person can read
 * here — so all of it can be tested without an API key, by
 * `scripts/check-mixplan.mts`, which is the point.
 *
 * ── The one rule that is not about numbers ──────────────────────────────
 *
 * Nothing is applied on its own. The panel shows what it proposes and the
 * person presses Apply. That is not caution for its own sake: a mix is
 * somebody's taste, and an assistant that silently moved eight faders while
 * they were listening would be indistinguishable from a bug. She asked for a
 * copilot that *can* change the mix — being able to and doing it unasked are
 * different things, and the first is what makes the second safe to offer.
 *
 * This file cannot enforce that on its own, so `check:mixplan` asserts the
 * panel's Apply button exists and that nothing calls the change function
 * without it.
 */

import { FX_DEFAULTS, type Fx } from './fx';

/** The most changes one answer may carry. More than this is not advice. */
export const MOST_MOVES = 8;

/** A lane, as much of it as the copilot is told about. */
export interface LaneNow {
  readonly id: string;
  readonly name: string;
  /** 0–1.5, as the fader holds it. */
  readonly gain: number;
  /** −1 to 1. */
  readonly pan: number;
  readonly muted: boolean;
  /** Which effects are on, by name. Not their settings — the model does not
   *  need them to say "the voice needs less reverb". */
  readonly fx: readonly string[];
}

/** One thing the copilot wants to change, after this file has been through it. */
export interface Move {
  readonly laneId: string;
  /** What to set. Only the fields it asked for. */
  readonly gain?: number;
  readonly pan?: number;
  /** Switch an effect on with sensible settings, or off. */
  readonly fxOn?: keyof Fx;
  readonly fxOff?: keyof Fx;
  /** One line, in the language they asked in, saying why. */
  readonly why: string;
}

/** What the model is allowed to return, before this file cleans it. */
export interface RawMove {
  readonly laneId?: unknown;
  readonly gain?: unknown;
  readonly pan?: unknown;
  readonly fxOn?: unknown;
  readonly fxOff?: unknown;
  readonly why?: unknown;
}

const FX_NAMES = Object.keys(FX_DEFAULTS) as (keyof Fx)[];

function clamp(value: unknown, low: number, high: number): number | undefined {
  const number = Number(value);
  if (!Number.isFinite(number)) return undefined;
  return Math.max(low, Math.min(high, number));
}

/**
 * Clean one answer into moves that can actually be applied.
 *
 * Dropped rather than corrected where the fault is about identity — a change
 * to a lane that is not in the session is not a change with a typo in it, it
 * is a change to something else. Clamped rather than dropped where the fault
 * is about degree: a model asking for a gain of 4 means "much louder", and
 * turning that into 1.5 is the honest reading of it.
 */
export function planMix(raw: readonly RawMove[], lanes: readonly LaneNow[]): Move[] {
  const known = new Set(lanes.map((one) => one.id));
  const out: Move[] = [];
  const touched = new Set<string>();

  for (const one of raw) {
    const laneId = String(one.laneId ?? '');
    if (!known.has(laneId)) continue;
    /* One move per lane. Two changes to the same fader in one answer is the
       model arguing with itself, and applying both in order would silently
       pick the last — which is a coin toss dressed as advice. */
    if (touched.has(laneId)) continue;

    const gain = one.gain === undefined ? undefined : clamp(one.gain, 0, 1.5);
    const pan = one.pan === undefined ? undefined : clamp(one.pan, -1, 1);
    const fxOn = FX_NAMES.includes(one.fxOn as keyof Fx) ? (one.fxOn as keyof Fx) : undefined;
    const fxOff = FX_NAMES.includes(one.fxOff as keyof Fx) ? (one.fxOff as keyof Fx) : undefined;
    /* A move that changes nothing is noise on the screen. */
    if (gain === undefined && pan === undefined && !fxOn && !fxOff) continue;

    const why = String(one.why ?? '').trim().slice(0, 200);
    if (!why) continue;

    touched.add(laneId);
    out.push({ laneId, gain, pan, fxOn, fxOff, why });
    if (out.length >= MOST_MOVES) break;
  }
  return out;
}

/**
 * What a move does to a lane, as the fields to merge into it.
 *
 * Kept apart from the panel so the arithmetic — switching an effect on means
 * giving it the defaults, switching it off means removing the key rather
 * than zeroing it — is in one place and testable. Zeroing would leave a node
 * in the chain doing nothing, which is not the same as no node; see the note
 * on `Fx` in `lib/fx.ts`.
 */
export function applyMove(move: Move, was: { gain: number; pan?: number; fx?: Fx }): {
  gain?: number;
  pan?: number;
  fx?: Fx;
} {
  const out: { gain?: number; pan?: number; fx?: Fx } = {};
  if (move.gain !== undefined) out.gain = move.gain;
  if (move.pan !== undefined) out.pan = move.pan;
  if (move.fxOn || move.fxOff) {
    const fx: Record<string, unknown> = { ...(was.fx ?? {}) };
    if (move.fxOn) fx[move.fxOn] = FX_DEFAULTS[move.fxOn as keyof typeof FX_DEFAULTS];
    if (move.fxOff) delete fx[move.fxOff];
    out.fx = fx as Fx;
  }
  void was.gain;
  return out;
}

/** A move in words, for the list the person reads before agreeing to it. */
export function sayMove(move: Move, lanes: readonly LaneNow[]): string {
  const lane = lanes.find((one) => one.id === move.laneId);
  const name = lane?.name ?? move.laneId;
  const parts: string[] = [];
  if (move.gain !== undefined && lane) {
    const db = 20 * Math.log10(Math.max(0.0001, move.gain) / Math.max(0.0001, lane.gain));
    parts.push(`${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`);
  } else if (move.gain !== undefined) {
    parts.push(`level ${move.gain.toFixed(2)}`);
  }
  if (move.pan !== undefined) {
    const where = move.pan === 0 ? 'centre' : `${Math.abs(Math.round(move.pan * 100))}% ${move.pan < 0 ? 'left' : 'right'}`;
    parts.push(where);
  }
  if (move.fxOn) parts.push(`${String(move.fxOn)} on`);
  if (move.fxOff) parts.push(`${String(move.fxOff)} off`);
  return `${name}: ${parts.join(', ')}`;
}
