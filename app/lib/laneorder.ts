/**
 * Moving a lane up and down the stack, with its locked group.
 *
 * ── Why this is its own file ─────────────────────────────────────────────
 *
 * Carli, 18 September 2026: *"Die probooth moet 'n op en af skuif knoppie hê
 * heel links by elke tydlyn, daar by die S en M en die tydlyne moet dan kan
 * op en af skuif."* And in the same breath, the reason: *"dit raak belangrik
 * wanneer 'n hele tydlyn se klankbane gelyktydig opgeskuif moet word."*
 *
 * So this is not "swap two rows". The interesting half is the interlock, and
 * the interesting half is arithmetic rather than layout — which is why it
 * lives here, where a check can ask it questions, instead of inside a button
 * handler where the only way to ask is to open a browser.
 *
 * ── What it was before ───────────────────────────────────────────────────
 *
 * Nothing. The commit that built the magnet and the interlock is titled
 * *"'n Magneet, 'n interlock, en bane wat op en af kan skuif"* and the third
 * of those three was never written. There is a comment in
 * `BoothTimeline.tsx` about "when a lane is reordered past another lock",
 * written as though it existed. It did not.
 *
 * ── A locked group moves as one, and comes out contiguous ────────────────
 *
 * `lane.link` is a group NAME, not a pointer at a neighbour, so a group's
 * members need not be next to each other in the stack. That matters here:
 * "move this group up one place" has no single meaning while another lane
 * sits between two of its members.
 *
 * The decision, stated rather than left to fall out of the code: the group
 * is lifted out in its own order and put back as a block. Lanes locked
 * together end up adjacent. That is a change somebody might not expect the
 * first time, and it is the only reading under which "the whole timeline's
 * lanes move at once" means anything — an interleaved group is not moving
 * together, it is two groups that share a name.
 *
 * ── Nothing silently does nothing ────────────────────────────────────────
 *
 * A move with nowhere to go returns the SAME array, not a copy. The caller
 * can compare by identity to know whether to write anything down, and a
 * button at the top of the stack can be disabled from the same fact rather
 * than from a second opinion about what the top means.
 */

/** Only what ordering needs. The booth's Lane has far more on it. */
export interface Ordered {
  readonly id: string;
  /** The interlock group's name, when this lane is in one. */
  readonly link?: string;
}

export type Direction = 'up' | 'down';

/**
 * Where a lane's block starts and ends, and what is in it.
 *
 * Exported because the buttons need to know whether a move is possible
 * before it is pressed, and asking `move()` and comparing identities to
 * decide whether to grey out a button would run the whole thing on every
 * render of every lane.
 */
export function blockOf<T extends Ordered>(lanes: readonly T[], id: string): number[] {
  const at = lanes.findIndex((one) => one.id === id);
  if (at < 0) return [];
  const group = lanes[at].link;
  if (!group) return [at];
  return lanes.reduce<number[]>((all, one, index) => {
    if (one.link === group) all.push(index);
    return all;
  }, []);
}

/** Whether pressing that arrow would do anything. */
export function canMove<T extends Ordered>(
  lanes: readonly T[],
  id: string,
  way: Direction,
): boolean {
  const block = blockOf(lanes, id);
  if (!block.length) return false;
  return way === 'up'
    ? block[0] > 0 && block.length < lanes.length
    : block[block.length - 1] < lanes.length - 1 && block.length < lanes.length;
}

/**
 * The stack with the lane — and its group — one place further along.
 *
 * @returns a new array, or the one it was given when there is nowhere to go.
 */
export function move<T extends Ordered>(
  lanes: readonly T[],
  id: string,
  way: Direction,
): readonly T[] {
  const block = blockOf(lanes, id);
  if (!block.length || block.length === lanes.length) return lanes;

  const inBlock = new Set(block);
  /* The lane the block steps over: the nearest one outside it, in the
     direction of travel. Nearest rather than "the next index", because a
     group with a gap in it has indexes inside the block on both sides of
     lanes that are not. */
  const over = way === 'up'
    ? [...Array(block[0]).keys()].reverse().find((index) => !inBlock.has(index))
    : lanes.reduce<number | undefined>((found, _one, index) => {
      if (found !== undefined) return found;
      return index > block[block.length - 1] && !inBlock.has(index) ? index : undefined;
    }, undefined);
  if (over === undefined) return lanes;

  const moving = block.map((index) => lanes[index]);
  const rest = lanes.filter((_one, index) => !inBlock.has(index));
  /* Where the stepped-over lane sits once the block is out of the way. Going
     up the block lands on it; going down it lands just after it. */
  const landing = rest.indexOf(lanes[over]) + (way === 'up' ? 0 : 1);
  return [...rest.slice(0, landing), ...moving, ...rest.slice(landing)];
}
