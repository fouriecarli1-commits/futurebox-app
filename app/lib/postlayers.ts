/**
 * The photo editor's layers.
 *
 * Carli, 16 October 2026: *"Die photo editor sal moet layers kry. As mens op
 * die layers click moet mens kan kies op watter layer jy nou edit, en
 * natuurlik 'n all layer wat alles by mekaar het."*
 *
 * ── What a layer is here ─────────────────────────────────────────────────
 *
 * The room already had layers in all but name: a colour behind, the
 * photograph, the shapes over it and the words over those. What it did not
 * have was a list of them, a way to say "this one, and nothing else", or any
 * say in their order — every shape sat under every line of words, always.
 *
 * So each shape and each line of words is one layer, in ONE stack, ordered
 * by `z`. The photograph and the background are layers too, fixed at the
 * bottom: a line of words under the photograph would be a line nobody can
 * see, and offering that move is offering a way to lose something.
 *
 * `z` is optional on purpose. Everything made before today has none, and
 * `zOf` gives it the place it always had — shapes first, words above — so
 * a post opened tomorrow looks exactly as it did.
 *
 * ── "All" ────────────────────────────────────────────────────────────────
 *
 * Every layer at once: anything on the glass can be taken hold of, which is
 * how the room has always worked, and How it reads changes the whole
 * finished picture — words and shapes as well — instead of the photograph
 * alone. Choosing one layer is the opposite: only that one answers a thumb,
 * so a line of words under a big shape can be moved without the shape
 * getting in the way.
 */

/** Which layer is being edited: one of the stack's ids, the photo, the background, or all of them. */
export type LayerOn = 'all' | 'photo' | 'back' | string;

/** What a stacked layer needs to be ordered and shown. */
export interface Layered {
  readonly id: string;
  /** Where it sits in the stack; higher is nearer the front. Absent is where it always was. */
  readonly z?: number;
  /** Switched off: not drawn on the glass, not in the file, not taken hold of. */
  readonly hidden?: boolean;
  /** How see-through the whole layer is, 0.1 to 1. Absent is solid. */
  readonly alpha?: number;
}

export interface Stacked<M, W> {
  readonly kind: 'mark' | 'words';
  readonly id: string;
  readonly z: number;
  readonly item: M | W;
}

/** Words sat over every shape before there was an order, so their place starts here. */
export const WORDS_ABOVE = 1000;

/** Where a layer sits when it has never been moved. */
export function zOf(item: Layered, kind: 'mark' | 'words', at: number): number {
  if (typeof item.z === 'number' && Number.isFinite(item.z)) return item.z;
  return kind === 'mark' ? at : WORDS_ABOVE + at;
}

/** Every shape and line of words, back to front. Ties keep the order they were made in. */
export function stackOf<M extends Layered, W extends Layered>(
  marks: readonly M[],
  words: readonly W[],
): Stacked<M, W>[] {
  const all: Stacked<M, W>[] = [
    ...marks.map((item, at) => ({ kind: 'mark' as const, id: item.id, z: zOf(item, 'mark', at), item })),
    ...words.map((item, at) => ({ kind: 'words' as const, id: item.id, z: zOf(item, 'words', at), item })),
  ];
  return all
    .map((one, made) => ({ one, made }))
    .sort((a, b) => a.one.z - b.one.z || a.made - b.made)
    .map(({ one }) => one);
}

/** The place for something new: in front of everything already there. */
export function frontZ(marks: readonly Layered[], words: readonly Layered[]): number {
  const stack = stackOf(marks, words);
  return stack.length ? stack[stack.length - 1].z + 1 : 0;
}

/**
 * The stack after one layer is moved a step towards the front (`1`) or the
 * back (`-1`), as a new `z` for every layer: 0, 1, 2… in the new order. Every
 * layer is renumbered, not just the two that swap, so the numbers never
 * collide and the order is the list she sees, exactly.
 */
export function movedOne(
  marks: readonly Layered[],
  words: readonly Layered[],
  id: string,
  by: 1 | -1,
): Map<string, number> {
  const order = stackOf(marks, words).map((one) => one.id);
  const from = order.indexOf(id);
  const to = from + by;
  if (from >= 0 && to >= 0 && to < order.length) {
    [order[from], order[to]] = [order[to], order[from]];
  }
  return new Map(order.map((one, at) => [one, at]));
}

/** Whether a thumb on the glass may take hold of this layer while `on` is the one chosen. */
export function canTouch(on: LayerOn, item: Layered): boolean {
  if (item.hidden) return false;
  return on === 'all' || on === item.id;
}
