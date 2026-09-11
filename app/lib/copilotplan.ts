/**
 * What the copilot is allowed to do in one reply, and where each part lands.
 *
 * ── One thing, which made a five-field brief impossible ──────────────────
 *
 * Until 11 September 2026 a reply carried a single action, described as "One
 * action, or none. Never more than one." The adverts brief has five fields
 * (what, who, the offer, the tone, the market) and the copilot could fill one
 * of them per turn, so it did the only other thing available and wrote a
 * paragraph about the rest.
 *
 * Carli, that morning: "copilot het mooi geskryf, maar dit het niks van die
 * hele platform se bars help invul nie." Nothing was disconnected.
 * Campaign.tsx registered all five operations and surfaces.ts described all
 * five. The wiring was whole and the schema was one field wide — the same
 * shape of fault as the voice picker, which was reachable, correct, and
 * thrown away by position.
 *
 * ── And the same fault one level up: the room you are walking into ───────
 *
 * The first fix let a reply fill five fields in the room you are standing in.
 * It did not let it fill anything in a room you are not standing in yet — so
 * from Make a song, somebody asking for help with their marketing could be
 * sent to the adverts desk and would arrive at five empty boxes, having just
 * described what they sell.
 *
 * Which is the identical failure: every part was already built. The desk
 * registers its operations, the registry describes them, `CopilotBus.handoff`
 * was written for precisely this ("deliver if you can, wait if you cannot"),
 * and the model was simply never told the other rooms had operations at all.
 *
 * So an action may name the room it is for. This module holds the rules that
 * makes safe, in one place, as a plain function — because the schema asks the
 * model for them and a model is not a contract, and because a rule that only
 * exists inside a route handler cannot be tested without an API key.
 *
 * See `scripts/check-copilotplan.mts`.
 */

import { isSurfaceId, resolveSurfaceId, type SurfaceId } from './surfaces';

export interface PlannedAction {
  kind: string;
  op?: string;
  value: string;
  /**
   * Which room a `surface_op` is for, resolved.
   *
   * Empty means the room they are standing in, which is the ordinary case.
   * Set only where the same reply also moves them somewhere — see
   * `planActions`. The client uses it to choose between `dispatch` (act on
   * what is in front of them) and `handoff` (put it in the room they are
   * about to walk into).
   */
  room?: string;
}

/** Actions that cost money or move the person somewhere else. */
const HEAVY = new Set(['generate', 'go']);

export function isHeavy(kind: string): boolean {
  return HEAVY.has(kind);
}

/** Where a `go` is sending them, or null when it names nowhere real. */
function destinationOf(list: readonly PlannedAction[]): SurfaceId | null {
  const going = list.filter((one) => one.kind === 'go');
  if (going.length !== 1) return null;
  return resolveSurfaceId(going[0].value ?? '');
}

/**
 * Put a reply's actions into the order the studio can safely apply, and say
 * which room each one is for.
 *
 *   1. `none` is dropped. It is a way of saying nothing, not a thing to do.
 *   2. Everything free comes first, in the order the model asked for.
 *   3. One `generate` or one `go` goes last — so the fields are filled in
 *      before the move rather than after it, and so a paid generation cannot
 *      hide in the middle of a list where the confirm step never looks at it.
 *   4. Two or more heavy actions: none of them run. A reply that wants to both
 *      generate and go, or go twice, is one that has lost the thread, and
 *      guessing which it meant is worse than doing neither. The free work in
 *      that same reply still stands — it is reversible and visible.
 *   5. A `surface_op` may name another room ONLY when the same reply is
 *      moving them there. Anything else is dropped rather than delivered.
 *
 * Rule 5 is the one worth being exact about. `handoff` waits for a room that
 * has not mounted, which is the right behaviour for "I am taking you there
 * and setting it up" and a trap for anything else: an operation aimed at a
 * room nobody is walking into would sit in the queue and fire much later,
 * when they happened to open that room for their own reasons, and change
 * something under them with no reply on screen to explain it. So the only
 * room an action may name is the one the reply itself is opening.
 */
export function planActions(asked: readonly PlannedAction[], here?: string): PlannedAction[] {
  const list = Array.isArray(asked) ? asked : [];
  const heavy = list.filter((one) => isHeavy(one.kind));
  /* Only a reply that actually moves them may aim elsewhere — and only when
     it moves them exactly once, since two `go`s are dropped by rule 4 and
     nobody arrives anywhere. */
  const going = heavy.length === 1 ? destinationOf(list) : null;
  const standingIn = here && isSurfaceId(here) ? here : null;

  const free: PlannedAction[] = [];
  for (const one of list) {
    if (one.kind === 'none' || isHeavy(one.kind)) continue;
    if (one.kind !== 'surface_op') {
      free.push(one);
      continue;
    }
    const named = (one.room ?? '').trim();
    if (!named) {
      free.push({ ...one, ...(standingIn ? { room: standingIn } : {}) });
      continue;
    }
    const room = resolveSurfaceId(named);
    // Aimed at the room they are already in: ordinary, and not a hand-off.
    if (room && standingIn && room === standingIn) {
      free.push({ ...one, room });
      continue;
    }
    // Aimed somewhere else: allowed only if this reply is opening that room.
    if (room && going && room === going) {
      free.push({ ...one, room });
      continue;
    }
    // Aimed at a room nobody is going to, or at nothing at all. Dropped.
  }

  return [...free, ...(heavy.length === 1 ? heavy : [])];
}
