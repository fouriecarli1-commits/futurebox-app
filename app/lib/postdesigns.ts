/**
 * Photo templates: whole designs with places for her photographs.
 *
 * Carli, 16 October 2026, with a page of finished designs open in another
 * app: *"Hoe hou ons sulke cool templates? Moet ons dit generate en oor tyd
 * op bou?"* — and afterwards, *"gaan aan met die template-stelsel."*
 *
 * So two halves. A starting set written here (`DESIGNS`), sixteen of them
 * across the things people post — a show, a release, a sale, a photo dump, a
 * birthday, a quote, an introduction — and a set that grows: the owner makes
 * a post she likes and saves it as a template for everybody (`/api/designs`,
 * `supabase/designs.sql`). Built up over time, as she asked, by her.
 *
 * A design is not a picture. It is the post's own parts as data: the shape,
 * the colour behind it, the frames her photographs go into (the photo grid's
 * cells, `postcells.ts`), the lines of words and the shapes. Choosing one
 * puts those parts on the post, every one of them still editable, and a
 * photograph already in the room goes into the first frame rather than being
 * thrown away. Tapping an empty frame asks for a photo — the grid's own flow.
 *
 * The previews are drawn, not stored: our own drawn scenes in the frames
 * (`drawSample`, turned to a different colour per frame), so the tiles are
 * ours rather than somebody's stock photography, and a saved design needs no
 * picture uploaded with it.
 */
import { GLOWS } from './postglow';
import { MARK_KINDS, type MarkKind } from './postshapes';
import { BACKDROPS } from './posttext';

export type DesignSize = 'square' | 'story' | 'portrait';
export type DesignCategory = 'event' | 'release' | 'sale' | 'collage' | 'celebrate' | 'quote' | 'brand';

export const DESIGN_CATEGORIES: readonly { readonly id: DesignCategory; readonly en: string; readonly af: string }[] = [
  { id: 'event', en: 'Events and shows', af: 'Geleenthede en vertonings' },
  { id: 'release', en: 'New music', af: 'Nuwe musiek' },
  { id: 'sale', en: 'Sales and offers', af: 'Uitverkopings en aanbiedinge' },
  { id: 'collage', en: 'Photo collages', af: 'Fotocollages' },
  { id: 'celebrate', en: 'Celebrate', af: 'Vier' },
  { id: 'quote', en: 'Quotes', af: 'Aanhalings' },
  { id: 'brand', en: 'About you', af: 'Oor jou' },
];

/** The faces a design may name — the same ids as `postfaces.ts`, held equal by `check:designs`. */
export const DESIGN_FACES = ['plain', 'poster', 'book', 'hand', 'type', 'round', 'future', 'script', 'spray', 'comic', 'classic', 'retro', 'pixel', 'block', 'fashion'] as const;

export interface DesignWords {
  readonly en: string;
  readonly af: string;
  readonly face: string;
  /** Where the middle of the block sits, as shares of the post. */
  readonly x: number;
  readonly y: number;
  /** Against the room's own fitted size; 1 is as the room fits it. */
  readonly size?: number;
  readonly ink: string;
  readonly glow?: string;
  readonly behind?: string;
  readonly align?: 'left' | 'center' | 'right';
  readonly letterGap?: number;
}

export interface DesignSlot {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly turn?: number;
  readonly look?: 'plain' | 'round' | 'polaroid';
}

export interface DesignMark {
  readonly kind: MarkKind;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly ink: string;
  readonly glow?: string;
  readonly opacity?: number;
  readonly stretch?: number;
}

export interface Design {
  readonly id: string;
  readonly en: string;
  readonly af: string;
  readonly category: DesignCategory;
  readonly size: DesignSize;
  /** The colour behind everything; null is see-through. */
  readonly back: string | null;
  readonly slots: readonly DesignSlot[];
  readonly words: readonly DesignWords[];
  readonly marks: readonly DesignMark[];
  /** Saved by the owner, rather than one of the starting set. */
  readonly saved?: boolean;
}

export const designLabel = (one: { readonly en: string; readonly af: string }, lang: string): string =>
  (lang === 'af' ? one.af : one.en);

/* ── The starting set ─────────────────────────────────────────────────────
   Written as real sentences, never "YOUR TEXT HERE" — see the note in
   `posttemplates.ts`: a post that is wrong in the details and right in the
   shape is a thing to correct, a placeholder is a second blank page. */

const w = (en: string, af: string, face: string, x: number, y: number, size: number, ink: string, more: Partial<DesignWords> = {}): DesignWords => ({
  en, af, face, x, y, size, ink, ...more,
});

export const DESIGNS: readonly Design[] = [
  {
    id: 'liveFriday', en: 'Live this Friday', af: 'Lewendig Vrydag', category: 'event', size: 'story', back: '#0b0221',
    slots: [{ x: 0.07, y: 0.12, w: 0.86, h: 0.46, look: 'round' }],
    words: [
      w('LIVE THIS FRIDAY', 'LEWENDIG HIERDIE VRYDAG', 'poster', 0.5, 0.64, 0.75, '#ff3dc8', { glow: 'pink' }),
      w('8PM · The Venue · Tickets at the door', '20:00 · Die Venue · Kaartjies by die deur', 'plain', 0.5, 0.73, 0.38, '#ffffff'),
    ],
    marks: [{ kind: 'ring', x: 0.84, y: 0.2, size: 0.14, ink: '#22d3ee', glow: 'neon' }],
  },
  {
    id: 'gigPoster', en: 'Gig poster', af: 'Konsertplakkaat', category: 'event', size: 'portrait', back: '#111113',
    slots: [{ x: 0, y: 0, w: 1, h: 0.62 }],
    words: [
      w('THE NIGHT SHIFT', 'DIE NAGSKOF', 'spray', 0.5, 0.72, 0.65, '#fde047'),
      w('Saturday 25 Oct · Doors 7pm', 'Saterdag 25 Okt · Deure 19:00', 'type', 0.5, 0.84, 0.36, '#ffffff'),
    ],
    marks: [{ kind: 'rect', x: 0.5, y: 0.625, size: 1.2, ink: '#fde047', stretch: 40 }],
  },
  {
    id: 'newSingle', en: 'New single', af: 'Nuwe enkelsnit', category: 'release', size: 'square', back: '#1a0b2e',
    slots: [{ x: 0.2, y: 0.17, w: 0.6, h: 0.6, look: 'round' }],
    words: [
      w('NEW SINGLE', 'NUWE ENKELSNIT', 'future', 0.5, 0.09, 0.42, '#a78bfa', { glow: 'synth', letterGap: 0.12 }),
      w('Out everywhere now', 'Nou oral beskikbaar', 'round', 0.5, 0.87, 0.4, '#ffffff'),
    ],
    marks: [],
  },
  {
    id: 'albumOut', en: 'Album out now', af: 'Album nou uit', category: 'release', size: 'story', back: '#020617',
    slots: [
      { x: 0.08, y: 0.12, w: 0.84, h: 0.32, look: 'round' },
      { x: 0.08, y: 0.46, w: 0.84, h: 0.18, look: 'round' },
    ],
    words: [
      w('ALBUM OUT NOW', 'ALBUM NOU UIT', 'poster', 0.5, 0.69, 0.7, '#22d3ee', { glow: 'ice' }),
      w('Ten songs. One summer.', 'Tien liedjies. Een somer.', 'book', 0.5, 0.75, 0.36, '#e2e8f0'),
    ],
    marks: [],
  },
  {
    id: 'newEpisode', en: 'New episode', af: 'Nuwe episode', category: 'release', size: 'square', back: '#0f172a',
    slots: [{ x: 0.08, y: 0.22, w: 0.42, h: 0.42, look: 'round' }],
    words: [
      w('NEW EPISODE', 'NUWE EPISODE', 'poster', 0.5, 0.1, 0.42, '#f59e0b'),
      w('Ep. 12 — Starting from nothing', 'Ep. 12 — Begin by niks', 'plain', 0.74, 0.42, 0.4, '#ffffff', { align: 'left' }),
      w('Listen wherever you get your podcasts', 'Luister waar jy ook al jou podsendings kry', 'plain', 0.5, 0.86, 0.3, '#94a3b8'),
    ],
    marks: [{ kind: 'circle', x: 0.29, y: 0.43, size: 0.5, ink: '#f59e0b', opacity: 0.25 }],
  },
  {
    id: 'bigSale', en: 'Big sale', af: 'Groot uitverkoping', category: 'sale', size: 'square', back: '#fde047',
    slots: [{ x: 0, y: 0, w: 0.5, h: 1 }],
    words: [
      w('SALE', 'UITVERKOPING', 'poster', 0.75, 0.38, 0.6, '#111111'),
      w('Up to 50% off this weekend', 'Tot 50% af hierdie naweek', 'plain', 0.75, 0.6, 0.36, '#111111'),
    ],
    marks: [{ kind: 'circle', x: 0.75, y: 0.82, size: 0.18, ink: '#ef4444' }],
  },
  {
    id: 'promoCode', en: 'Promo code', af: 'Afslagkode', category: 'sale', size: 'story', back: '#ff3dc8',
    slots: [{ x: 0.1, y: 0.1, w: 0.8, h: 0.44, look: 'polaroid', turn: -3 }],
    words: [
      w('20% OFF', '20% AF', 'poster', 0.5, 0.62, 0.8, '#ffffff'),
      w('Use code FUTURE at checkout', 'Gebruik kode FUTURE by die betaalpunt', 'round', 0.5, 0.72, 0.38, '#2a0b5c'),
    ],
    marks: [],
  },
  {
    id: 'photoDump', en: 'Photo dump', af: 'Fotohoop', category: 'collage', size: 'portrait', back: '#f5f1e6',
    slots: [
      { x: 0.04, y: 0.04, w: 0.45, h: 0.5 }, { x: 0.51, y: 0.04, w: 0.45, h: 0.3 },
      { x: 0.51, y: 0.36, w: 0.45, h: 0.48 }, { x: 0.04, y: 0.56, w: 0.45, h: 0.28 },
    ],
    words: [w('photo dump', 'fotohoop', 'hand', 0.5, 0.92, 0.42, '#111111')],
    marks: [],
  },
  {
    id: 'memories', en: 'Memories', af: 'Herinneringe', category: 'collage', size: 'square', back: '#e7d9c4',
    slots: [
      { x: 0.06, y: 0.08, w: 0.44, h: 0.48, turn: -7, look: 'polaroid' },
      { x: 0.5, y: 0.12, w: 0.44, h: 0.48, turn: 6, look: 'polaroid' },
      { x: 0.27, y: 0.42, w: 0.46, h: 0.48, turn: -2, look: 'polaroid' },
    ],
    words: [w('memories', 'herinneringe', 'script', 0.5, 0.94, 0.4, '#5b3a1a')],
    marks: [],
  },
  {
    id: 'weekendRecap', en: 'Weekend recap', af: 'Naweek-terugblik', category: 'collage', size: 'story', back: '#0b0b10',
    slots: [0.19, 0.4, 0.61].flatMap((y) => [0.04, 0.52].map((x) => ({ x, y, w: 0.44, h: 0.19, look: 'round' as const }))),
    words: [w('WEEKEND RECAP', 'NAWEEK-TERUGBLIK', 'future', 0.5, 0.14, 0.5, '#39ff14', { glow: 'neon' })],
    marks: [],
  },
  {
    id: 'birthday', en: 'Happy birthday', af: 'Gelukkige verjaarsdag', category: 'celebrate', size: 'square', back: '#fce7f3',
    slots: [{ x: 0.25, y: 0.16, w: 0.5, h: 0.5, look: 'round' }],
    words: [
      w('Happy birthday!', 'Gelukkige verjaarsdag!', 'script', 0.5, 0.78, 0.5, '#db2777'),
      w('Lots of love today', 'Baie liefde vandag', 'round', 0.5, 0.89, 0.32, '#831843'),
    ],
    marks: [
      { kind: 'circle', x: 0.12, y: 0.14, size: 0.06, ink: '#f59e0b' },
      { kind: 'circle', x: 0.88, y: 0.2, size: 0.05, ink: '#22d3ee' },
      { kind: 'circle', x: 0.85, y: 0.7, size: 0.07, ink: '#a78bfa' },
      { kind: 'circle', x: 0.14, y: 0.66, size: 0.05, ink: '#34d399' },
    ],
  },
  {
    id: 'thankYou', en: 'Thank you', af: 'Dankie', category: 'celebrate', size: 'portrait', back: '#14532d',
    slots: [{ x: 0.1, y: 0.08, w: 0.8, h: 0.56, look: 'round' }],
    words: [
      w('THANK YOU', 'DANKIE', 'classic', 0.5, 0.74, 0.62, '#fde68a'),
      w('for 1 000 followers', 'vir 1 000 volgers', 'book', 0.5, 0.84, 0.38, '#ecfccb'),
    ],
    marks: [],
  },
  {
    id: 'quoteCard', en: 'Quote card', af: 'Aanhalingskaart', category: 'quote', size: 'square', back: '#111827',
    slots: [{ x: 0.42, y: 0.72, w: 0.16, h: 0.16, look: 'round' }],
    words: [
      w('“Make the thing you wish existed.”', '“Maak die ding wat jy wens bestaan het.”', 'book', 0.5, 0.4, 0.6, '#f9fafb'),
      w('— Carli', '— Carli', 'plain', 0.5, 0.93, 0.28, '#9ca3af'),
    ],
    marks: [],
  },
  {
    id: 'bigNews', en: 'Big news', af: 'Groot nuus', category: 'brand', size: 'story', back: '#7c3aed',
    slots: [{ x: 0, y: 0, w: 1, h: 0.5 }],
    words: [
      w('BIG NEWS', 'GROOT NUUS', 'poster', 0.5, 0.6, 0.8, '#ffffff'),
      w('Something new is coming on 1 November', 'Iets nuuts kom op 1 November', 'round', 0.5, 0.7, 0.38, '#ede9fe'),
    ],
    marks: [{ kind: 'triangle', x: 0.85, y: 0.56, size: 0.1, ink: '#fde047' }],
  },
  {
    id: 'meetArtist', en: 'Meet the artist', af: 'Ontmoet die kunstenaar', category: 'brand', size: 'portrait', back: '#0c0a09',
    slots: [{ x: 0.22, y: 0.12, w: 0.56, h: 0.45, look: 'round' }],
    words: [
      w('MEET THE ARTIST', 'ONTMOET DIE KUNSTENAAR', 'future', 0.5, 0.66, 0.46, '#f472b6', { glow: 'pink' }),
      w('Singer · songwriter · Pretoria', 'Sanger · liedjieskrywer · Pretoria', 'plain', 0.5, 0.76, 0.34, '#e7e5e4'),
    ],
    marks: [{ kind: 'frame', x: 0.5, y: 0.345, size: 0.64, ink: '#f472b6', glow: 'pink' }],
  },
  {
    id: 'behindScenes', en: 'Behind the scenes', af: 'Agter die skerms', category: 'brand', size: 'story', back: '#18181b',
    slots: [
      { x: 0.08, y: 0.12, w: 0.58, h: 0.3, turn: -4, look: 'polaroid' },
      { x: 0.34, y: 0.36, w: 0.58, h: 0.3, turn: 5, look: 'polaroid' },
    ],
    words: [w('behind the scenes', 'agter die skerms', 'hand', 0.5, 0.74, 0.5, '#fafafa')],
    marks: [],
  },
];

/* ── A saved design, checked ─────────────────────────────────────────────
   The same function on both sides: the owner's room builds a design from
   her post and the server holds it to this before it goes into the table,
   so a row in the table is a design every member's room can draw. */

const share = (n: unknown, low = 0, high = 1): number | null =>
  (typeof n === 'number' && Number.isFinite(n) ? Math.min(high, Math.max(low, n)) : null);
const text = (n: unknown, most: number): string => (typeof n === 'string' ? n.slice(0, most) : '');
const ink = (n: unknown): string | null => (typeof n === 'string' && /^#[0-9a-f]{6}$/i.test(n) ? n : null);

/** A design as the room or the server may keep it, or null when it is not one. */
export function cleanDesign(raw: unknown): Omit<Design, 'id' | 'saved'> | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  const category = DESIGN_CATEGORIES.some((one) => one.id === d.category) ? d.category as DesignCategory : null;
  const size = d.size === 'square' || d.size === 'story' || d.size === 'portrait' ? d.size : null;
  const en = text(d.en, 60).trim();
  const af = text(d.af, 60).trim() || en;
  if (!category || !size || !en) return null;
  const slots = (Array.isArray(d.slots) ? d.slots : []).slice(0, 12).flatMap((one): DesignSlot[] => {
    const s = one as Record<string, unknown>;
    const [x, y, sw, sh] = [share(s.x), share(s.y), share(s.w, 0.02), share(s.h, 0.02)];
    if (x === null || y === null || sw === null || sh === null) return [];
    const turn = share(s.turn, -45, 45);
    const look = s.look === 'round' || s.look === 'polaroid' ? s.look : undefined;
    return [{ x, y, w: sw, h: sh, ...(turn ? { turn } : {}), ...(look ? { look } : {}) }];
  });
  const words = (Array.isArray(d.words) ? d.words : []).slice(0, 12).flatMap((one): DesignWords[] => {
    const s = one as Record<string, unknown>;
    const wEn = text(s.en, 300);
    const x = share(s.x);
    const y = share(s.y);
    const colour = ink(s.ink);
    if (!wEn.trim() || x === null || y === null || !colour) return [];
    const face = (DESIGN_FACES as readonly string[]).includes(String(s.face)) ? String(s.face) : 'plain';
    const glow = GLOWS.some((g) => g.id === s.glow && g.id !== 'none') ? String(s.glow) : undefined;
    const behind = (BACKDROPS as readonly string[]).includes(String(s.behind)) && s.behind !== 'none' ? String(s.behind) : undefined;
    const align = s.align === 'left' || s.align === 'right' ? s.align : undefined;
    const sizeOf = share(s.size, 0.3, 3);
    const gap = share(s.letterGap, -0.05, 0.5);
    return [{
      en: wEn, af: text(s.af, 300) || wEn, face, x, y, ink: colour,
      ...(sizeOf !== null && sizeOf !== 1 ? { size: sizeOf } : {}),
      ...(glow ? { glow } : {}), ...(behind ? { behind } : {}), ...(align ? { align } : {}),
      ...(gap ? { letterGap: gap } : {}),
    }];
  });
  const marks = (Array.isArray(d.marks) ? d.marks : []).slice(0, 20).flatMap((one): DesignMark[] => {
    const s = one as Record<string, unknown>;
    const kind = (MARK_KINDS as readonly string[]).includes(String(s.kind)) ? s.kind as MarkKind : null;
    const [x, y, sz] = [share(s.x), share(s.y), share(s.size, 0.02, 2)];
    const colour = ink(s.ink);
    if (!kind || x === null || y === null || sz === null || !colour) return [];
    const glow = GLOWS.some((g) => g.id === s.glow) ? String(s.glow) : undefined;
    const opacity = share(s.opacity, 0.1, 1);
    const stretch = share(s.stretch, 0.1, 60);
    return [{ kind, x, y, size: sz, ink: colour, ...(glow ? { glow } : {}), ...(opacity !== null && opacity < 1 ? { opacity } : {}), ...(stretch !== null && stretch !== 1 ? { stretch } : {}) }];
  });
  const back = d.back === null ? null : ink(d.back) ?? '#111113';
  return { en, af, category, size, back, slots, words, marks };
}

/* ── The preview ─────────────────────────────────────────────────────────── */

/** Paint a design small: the colour, our own drawn photos in the frames, the shapes, the words. */
export function drawDesign(
  ctx: CanvasRenderingContext2D,
  design: Design,
  width: number,
  height: number,
  lang: string,
  photo: (ctx: CanvasRenderingContext2D, w: number, h: number, at: number) => void,
  faceCss: (id: string) => { readonly css: string; readonly weight: number },
  mark: (ctx: CanvasRenderingContext2D, one: DesignMark, w: number, h: number) => void,
): void {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  if (design.back) {
    ctx.fillStyle = design.back;
    ctx.fillRect(0, 0, width, height);
  } else {
    /* See-through, shown as the checks every editor uses for it. */
    const cell = Math.max(4, Math.round(width / 16));
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        ctx.fillStyle = ((x + y) / cell) % 2 ? '#3f3f46' : '#27272a';
        ctx.fillRect(x, y, cell, cell);
      }
    }
  }
  design.slots.forEach((slot, at) => {
    const fx = slot.x * width;
    const fy = slot.y * height;
    const fw = slot.w * width;
    const fh = slot.h * height;
    ctx.save();
    ctx.translate(fx + fw / 2, fy + fh / 2);
    if (slot.turn) ctx.rotate((slot.turn * Math.PI) / 180);
    let inner = { x: -fw / 2, y: -fh / 2, w: fw, h: fh };
    if (slot.look === 'polaroid') {
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(-fw / 2, -fh / 2, fw, fh);
      const edge = Math.min(fw, fh) * 0.06;
      inner = { x: -fw / 2 + edge, y: -fh / 2 + edge, w: fw - edge * 2, h: fh - edge * 4 };
    }
    ctx.beginPath();
    if (slot.look === 'round') {
      const r = Math.min(inner.w, inner.h) * 0.08;
      ctx.roundRect(inner.x, inner.y, inner.w, inner.h, r);
    } else {
      ctx.rect(inner.x, inner.y, inner.w, inner.h);
    }
    ctx.clip();
    ctx.translate(inner.x, inner.y);
    photo(ctx, inner.w, inner.h, at);
    ctx.restore();
  });
  for (const one of design.marks) mark(ctx, one, width, height);
  for (const one of design.words) {
    const said = lang === 'af' ? one.af : one.en;
    const face = faceCss(one.face);
    const most = height * 0.2 * (one.size ?? 1);
    const box = width * 0.84 * (one.size ?? 1);
    let px = Math.max(4, Math.round(most));
    ctx.font = `${face.weight} ${px}px ${face.css}`;
    while (px > 4 && ctx.measureText(said).width > box) {
      px -= 1;
      ctx.font = `${face.weight} ${px}px ${face.css}`;
    }
    ctx.fillStyle = one.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (one.glow) {
      ctx.shadowColor = one.ink;
      ctx.shadowBlur = px * 0.5;
    }
    ctx.fillText(said, one.x * width, one.y * height);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}
