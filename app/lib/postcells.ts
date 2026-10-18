/**
 * Photo grids: more than one photograph on a post, each in a frame of its own.
 *
 * The owner, 16 October 2026, with a collage open on her phone: *"Kyk ook
 * wanneer foto's in so grid is dan moet mens op een foto kan kliek en dit kan
 * ge-edit word."* The post she showed is four photographs in a grid with
 * words and stars over them; tapping one photograph gives that photograph
 * its own tools.
 *
 * A cell is a layer like the shapes and the words (`postlayers.ts`): it has a
 * place in the stack, can be hidden, faded, moved forward or back. What it
 * adds is a FRAME — where on the post it sits, as shares of the post — and a
 * photograph inside it, placed by the same `place()` the main photograph
 * uses, so dragging a photo about inside its frame is the same arithmetic as
 * dragging the main one about inside the post.
 *
 * A cell with no photograph yet is an empty frame that says "tap to add a
 * photo", which is how a layout is filled.
 */
import { MIDDLE, type Crop } from './postcrop';
import type { Layered } from './postlayers';

/** How a frame is dressed. */
export type CellLook = 'plain' | 'round' | 'polaroid';

export interface Cell extends Layered {
  readonly id: string;
  /** Where the frame sits, as shares of the post. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Turned, in degrees — a scattered polaroid. Absent is straight. */
  readonly turn?: number;
  readonly look?: CellLook;
  /** The photograph, or nothing yet. */
  readonly image?: HTMLImageElement | null;
  /** Which part of it shows in the frame, and how close. */
  readonly crop: Crop;
  readonly alpha?: number;
}

export interface Layout {
  readonly id: string;
  readonly name: readonly [string, string];
  /** The frames, as shares of the post, before the gap is taken out of them. */
  readonly frames: readonly { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly turn?: number }[];
  readonly look?: CellLook;
}

const thirds = [0, 1 / 3, 2 / 3];

export const LAYOUTS: readonly Layout[] = [
  { id: 'one', name: ['post.grid.one', 'One framed'], frames: [{ x: 0.08, y: 0.08, w: 0.84, h: 0.84 }], look: 'round' },
  { id: 'twoSide', name: ['post.grid.twoSide', 'Two side by side'], frames: [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }] },
  { id: 'twoStack', name: ['post.grid.twoStack', 'Two stacked'], frames: [{ x: 0, y: 0, w: 1, h: 0.5 }, { x: 0, y: 0.5, w: 1, h: 0.5 }] },
  { id: 'threeCols', name: ['post.grid.threeCols', 'Three columns'], frames: thirds.map((x) => ({ x, y: 0, w: 1 / 3, h: 1 })) },
  { id: 'threeRows', name: ['post.grid.threeRows', 'Three rows'], frames: thirds.map((y) => ({ x: 0, y, w: 1, h: 1 / 3 })) },
  { id: 'bigLeft', name: ['post.grid.bigLeft', 'One big, two small'], frames: [{ x: 0, y: 0, w: 0.6, h: 1 }, { x: 0.6, y: 0, w: 0.4, h: 0.5 }, { x: 0.6, y: 0.5, w: 0.4, h: 0.5 }] },
  { id: 'bigTop', name: ['post.grid.bigTop', 'One big on top'], frames: [{ x: 0, y: 0, w: 1, h: 0.6 }, { x: 0, y: 0.6, w: 0.5, h: 0.4 }, { x: 0.5, y: 0.6, w: 0.5, h: 0.4 }] },
  { id: 'four', name: ['post.grid.four', 'Four'], frames: [{ x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }] },
  { id: 'mosaic', name: ['post.grid.mosaic', 'Mosaic'], frames: [{ x: 0, y: 0, w: 0.5, h: 0.62 }, { x: 0.5, y: 0, w: 0.5, h: 0.38 }, { x: 0.5, y: 0.38, w: 0.5, h: 0.62 }, { x: 0, y: 0.62, w: 0.5, h: 0.38 }] },
  { id: 'bigFour', name: ['post.grid.bigFour', 'One big, three small'], frames: [{ x: 0, y: 0, w: 1, h: 0.66 }, ...thirds.map((x) => ({ x, y: 0.66, w: 1 / 3, h: 0.34 }))] },
  { id: 'strip', name: ['post.grid.strip', 'Photo strip'], frames: [0, 0.25, 0.5, 0.75].map((y) => ({ x: 0.2, y, w: 0.6, h: 0.25 })) },
  { id: 'six', name: ['post.grid.six', 'Six'], frames: [0, 0.5].flatMap((y) => thirds.map((x) => ({ x, y, w: 1 / 3, h: 0.5 }))) },
  { id: 'nine', name: ['post.grid.nine', 'Nine'], frames: thirds.flatMap((y) => thirds.map((x) => ({ x, y, w: 1 / 3, h: 1 / 3 }))) },
  {
    id: 'scatter', name: ['post.grid.scatter', 'Scattered polaroids'], look: 'polaroid',
    frames: [{ x: 0.06, y: 0.08, w: 0.46, h: 0.5, turn: -7 }, { x: 0.48, y: 0.14, w: 0.46, h: 0.5, turn: 6 }, { x: 0.24, y: 0.44, w: 0.5, h: 0.5, turn: -2 }],
  },
];

/** The gap between frames, as a share of the post's shorter side. */
export const GAPS = [0, 0.01, 0.025, 0.045] as const;

/**
 * The cells a layout makes, with the gap taken out between them. Photographs
 * already in the post are carried into the new frames in order, so changing
 * the layout does not throw away what was put in.
 */
export function cellsOf(
  layout: Layout,
  gap: number,
  aspect: number,
  fresh: () => string,
  carry: readonly Cell[] = [],
  front = -500,
): Cell[] {
  /* A gap that is the same on screen across and down, on any shape of post. */
  const gx = aspect >= 1 ? gap / aspect : gap;
  const gy = aspect >= 1 ? gap : gap * aspect;
  const carried = carry.filter((one) => one.image);
  return layout.frames.map((frame, at) => {
    const was = carried[at];
    const inset = layout.look === 'polaroid' ? 0 : 1;
    return {
      id: fresh(),
      x: frame.x + (gx / 2) * inset,
      y: frame.y + (gy / 2) * inset,
      w: Math.max(0.02, frame.w - gx * inset),
      h: Math.max(0.02, frame.h - gy * inset),
      ...(frame.turn ? { turn: frame.turn } : {}),
      ...(layout.look ? { look: layout.look } : {}),
      image: was?.image ?? null,
      crop: was?.crop ?? MIDDLE,
      z: front + at,
    };
  });
}

/** The frame of a cell in post units. */
export function frameOf(cell: Cell, width: number, height: number): { x: number; y: number; w: number; h: number } {
  return { x: cell.x * width, y: cell.y * height, w: cell.w * width, h: cell.h * height };
}

/** Whether a point (shares of the post) is inside a cell's frame, allowing for its turn. */
export function cellHas(cell: Cell, px: number, py: number, width: number, height: number): boolean {
  const f = frameOf(cell, width, height);
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;
  const a = (-(cell.turn ?? 0) * Math.PI) / 180;
  const dx = px * width - cx;
  const dy = py * height - cy;
  const rx = dx * Math.cos(a) - dy * Math.sin(a);
  const ry = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(rx) <= f.w / 2 && Math.abs(ry) <= f.h / 2;
}
