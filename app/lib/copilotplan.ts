/**
 * What the copilot is allowed to do in one reply.
 *
 * Until 11 September 2026 the answer was "one thing". The reply schema carried
 * a single action described as "One action, or none. Never more than one." —
 * which made the adverts desk impossible by construction. A brief there has
 * five fields (what, who, the offer, the tone, the market) and the copilot
 * could fill one of them per turn, so it did the only other thing available
 * and wrote a paragraph about the rest.
 *
 * Carli, that morning: "copilot het mooi geskryf, maar dit het niks van die
 * hele platform se bars help invul nie." Nothing was disconnected. Campaign.tsx
 * registered all five operations and surfaces.ts described all five. The wiring
 * was whole and the schema was one field wide — the same shape of fault as the
 * voice picker, which was reachable, correct, and thrown away by position.
 *
 * So a reply carries a list. This module holds the two rules that list must
 * keep, in one place, as a plain function — because the schema asks the model
 * for them and a model is not a contract, and because a rule that only exists
 * inside a route handler cannot be tested without an API key.
 *
 * See `scripts/check-copilotplan.mts`.
 */

export interface PlannedAction {
  kind: string;
  op?: string;
  value: string;
}

/** Actions that cost money or move the person somewhere else. */
const HEAVY = new Set(['generate', 'go']);

export function isHeavy(kind: string): boolean {
  return HEAVY.has(kind);
}

/**
 * Put a reply's actions into the order the studio can safely apply.
 *
 *   1. `none` is dropped. It is a way of saying nothing, not a thing to do.
 *   2. Everything free comes first, in the order the model asked for.
 *   3. One `generate` or one `go` goes last — so a reply cannot navigate away
 *      and then set four fields in the room it just left, and so a paid
 *      generation cannot hide in the middle of a list where the confirm step
 *      never looks at it.
 *   4. Two or more heavy actions: none of them run. A reply that wants to both
 *      generate and go, or go twice, is one that has lost the thread, and
 *      guessing which it meant is worse than doing neither. The free work in
 *      that same reply still stands — it is reversible and visible.
 */
export function planActions(asked: readonly PlannedAction[]): PlannedAction[] {
  const list = Array.isArray(asked) ? asked : [];
  const heavy = list.filter((one) => isHeavy(one.kind));
  return [
    ...list.filter((one) => one.kind !== 'none' && !isHeavy(one.kind)),
    ...(heavy.length === 1 ? heavy : []),
  ];
}
