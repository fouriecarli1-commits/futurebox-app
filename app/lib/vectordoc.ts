/**
 * The vector studio's drawing: what is in it, and how it becomes an SVG.
 *
 * Carli, 17 October 2026, with another app's vector illustration on screen:
 * *"Ek hou van daai vector illustration."* A vector picture is shapes, not
 * pixels — it stays sharp at any size, every part can be moved and
 * recoloured, and it is small. This file is the drawing as data: items with
 * a place, a turn and a size, paths smoothed from a finger, and the one way
 * an SVG from outside (the AI's, or one traced from a photo) is let in — a
 * tree of allowed tags and attributes, nothing that runs, nothing that
 * fetches.
 *
 * Pure, so it is checked without a browser (`check:vector`).
 */

/* ── The drawing ────────────────────────────────────────────────────────── */

/** A colour as #rrggbb, or null for none. */
export type Paint = string | null;

export interface Base {
  readonly id: string;
  /** Centre of the item on the artboard. */
  readonly x: number;
  readonly y: number;
  /** Degrees, clockwise. */
  readonly rotate: number;
  readonly sx: number;
  readonly sy: number;
  readonly fill: Paint;
  readonly stroke: Paint;
  readonly width: number;
  readonly opacity: number;
  readonly hidden?: boolean;
  /** Holes cut by overlapping outlines, for traced shapes. */
  readonly evenodd?: boolean;
}

/** An SVG element as data: a tag, its attributes, its children, or text. */
export interface SvgNode {
  readonly tag: string;
  readonly attrs: Readonly<Record<string, string>>;
  readonly children: readonly SvgNode[];
  readonly text?: string;
}

export type Item =
  | (Base & { readonly kind: 'rect'; readonly w: number; readonly h: number; readonly r: number })
  | (Base & { readonly kind: 'ellipse'; readonly rx: number; readonly ry: number })
  | (Base & { readonly kind: 'polygon'; readonly sides: number; readonly radius: number })
  | (Base & { readonly kind: 'star'; readonly points: number; readonly radius: number; readonly inner: number })
  | (Base & { readonly kind: 'line'; readonly dx: number; readonly dy: number })
  | (Base & { readonly kind: 'path'; readonly d: string; readonly w: number; readonly h: number })
  | (Base & { readonly kind: 'text'; readonly text: string; readonly size: number; readonly font: 'sans' | 'serif' | 'display' | 'hand'; readonly bold: boolean })
  | (Base & { readonly kind: 'art'; readonly tree: SvgNode; readonly w: number; readonly h: number });

export type ItemKind = Item['kind'];

export interface VectorDoc {
  readonly w: number;
  readonly h: number;
  readonly background: Paint;
  readonly items: readonly Item[];
}

export const ARTBOARDS: readonly { readonly id: string; readonly en: string; readonly af: string; readonly w: number; readonly h: number }[] = [
  { id: 'square', en: 'Square', af: 'Vierkant', w: 1080, h: 1080 },
  { id: 'portrait', en: 'Portrait', af: 'Portret', w: 1080, h: 1350 },
  { id: 'story', en: 'Story', af: 'Storie', w: 1080, h: 1920 },
  { id: 'wide', en: 'Wide', af: 'Breed', w: 1920, h: 1080 },
  { id: 'a4', en: 'A4', af: 'A4', w: 1240, h: 1754 },
];

export const newDoc = (w = 1080, h = 1080): VectorDoc => ({ w, h, background: '#ffffff', items: [] });

export const FONTS: Record<Extract<Item, { kind: 'text' }>['font'], string> = {
  sans: 'Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  display: 'Impact, "Arial Black", sans-serif',
  hand: '"Segoe Script", "Brush Script MT", cursive',
};

/* ── Shapes as paths ────────────────────────────────────────────────────── */

const n = (v: number): string => (Math.round(v * 100) / 100).toString();

/** A shape's outline in its own coordinates, centred on nought. */
export function outline(item: Item): string {
  switch (item.kind) {
    case 'rect': {
      const { w, h } = item;
      const r = Math.max(0, Math.min(item.r, w / 2, h / 2));
      const x = -w / 2;
      const y = -h / 2;
      if (!r) return `M${n(x)} ${n(y)}H${n(x + w)}V${n(y + h)}H${n(x)}Z`;
      return `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`;
    }
    case 'ellipse':
      return `M${n(-item.rx)} 0A${n(item.rx)} ${n(item.ry)} 0 1 0 ${n(item.rx)} 0A${n(item.rx)} ${n(item.ry)} 0 1 0 ${n(-item.rx)} 0Z`;
    case 'polygon': {
      const sides = Math.max(3, Math.min(24, Math.round(item.sides)));
      const pts = Array.from({ length: sides }, (_, k) => {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / sides;
        return `${n(Math.cos(a) * item.radius)} ${n(Math.sin(a) * item.radius)}`;
      });
      return `M${pts.join('L')}Z`;
    }
    case 'star': {
      const points = Math.max(3, Math.min(24, Math.round(item.points)));
      const pts = Array.from({ length: points * 2 }, (_, k) => {
        const a = -Math.PI / 2 + (k * Math.PI) / points;
        const r = k % 2 ? item.radius * Math.max(0.1, Math.min(0.95, item.inner)) : item.radius;
        return `${n(Math.cos(a) * r)} ${n(Math.sin(a) * r)}`;
      });
      return `M${pts.join('L')}Z`;
    }
    case 'line':
      return `M${n(-item.dx / 2)} ${n(-item.dy / 2)}L${n(item.dx / 2)} ${n(item.dy / 2)}`;
    case 'path':
      return item.d;
    default:
      return '';
  }
}

/** The item's own half-size before its scale and turn — for its handles and for hitting it. */
export function halfSize(item: Item): { readonly hw: number; readonly hh: number } {
  switch (item.kind) {
    case 'rect': return { hw: item.w / 2, hh: item.h / 2 };
    case 'ellipse': return { hw: item.rx, hh: item.ry };
    case 'polygon':
    case 'star': return { hw: item.radius, hh: item.radius };
    case 'line': return { hw: Math.max(4, Math.abs(item.dx) / 2), hh: Math.max(4, Math.abs(item.dy) / 2) };
    case 'path':
    case 'art': return { hw: item.w / 2, hh: item.h / 2 };
    case 'text': {
      const lines = item.text.split('\n');
      return { hw: Math.max(...lines.map((l) => l.length), 1) * item.size * 0.3, hh: lines.length * item.size * 0.6 };
    }
    default: return { hw: 10, hh: 10 };
  }
}

export const transformOf = (item: Base): string =>
  `translate(${n(item.x)} ${n(item.y)}) rotate(${n(item.rotate)}) scale(${n(item.sx)} ${n(item.sy)})`;

/** A point on the artboard in an item's own coordinates — to ask whether a tap landed on it. */
export function toLocal(item: Base, px: number, py: number): { readonly x: number; readonly y: number } {
  const dx = px - item.x;
  const dy = py - item.y;
  const a = (-item.rotate * Math.PI) / 180;
  const rx = dx * Math.cos(a) - dy * Math.sin(a);
  const ry = dx * Math.sin(a) + dy * Math.cos(a);
  return { x: rx / (item.sx || 1), y: ry / (item.sy || 1) };
}

/** Whether a tap lands on an item: inside its box, with a little room for a thumb. */
export function hits(item: Item, px: number, py: number, slack = 12): boolean {
  const p = toLocal(item, px, py);
  const { hw, hh } = halfSize(item);
  const sx = Math.abs(item.sx) || 1;
  const sy = Math.abs(item.sy) || 1;
  return Math.abs(p.x) <= hw + slack / sx && Math.abs(p.y) <= hh + slack / sy;
}

/* ── A finger's line, made smooth ───────────────────────────────────────── */

export type Pt = readonly [number, number];

/** Fewer points along the same line: every point that bends it more than `tolerance` is kept. */
export function simplify(points: readonly Pt[], tolerance: number): Pt[] {
  if (points.length < 3) return [...points];
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop() as [number, number];
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let far = -1;
    let at = -1;
    for (let k = a + 1; k < b; k += 1) {
      const [px, py] = points[k];
      const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > far) { far = d; at = k; }
    }
    if (far > tolerance && at > 0) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return points.filter((_, k) => keep[k]);
}

/** A curve through every point (Catmull-Rom as cubic Béziers). */
export function smoothPath(points: readonly Pt[], closed = false): string {
  if (!points.length) return '';
  if (points.length < 3) return `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}${closed ? 'Z' : ''}`;
  const p = (k: number): Pt => (closed ? points[(k + points.length) % points.length] : points[Math.max(0, Math.min(points.length - 1, k))]);
  let d = `M${n(points[0][0])} ${n(points[0][1])}`;
  const last = closed ? points.length : points.length - 1;
  for (let k = 0; k < last; k += 1) {
    const [x0, y0] = p(k - 1);
    const [x1, y1] = p(k);
    const [x2, y2] = p(k + 1);
    const [x3, y3] = p(k + 2);
    d += `C${n(x1 + (x2 - x0) / 6)} ${n(y1 + (y2 - y0) / 6)} ${n(x2 - (x3 - x1) / 6)} ${n(y2 - (y3 - y1) / 6)} ${n(x2)} ${n(y2)}`;
  }
  return closed ? `${d}Z` : d;
}

/**
 * Points drawn on the artboard as a path item: simplified, smoothed, and
 * centred on its own middle so it turns and scales about itself.
 */
export function pathFromPoints(id: string, points: readonly Pt[], closed: boolean, style: Pick<Base, 'fill' | 'stroke' | 'width' | 'opacity'>, tolerance = 1.5): Extract<Item, { kind: 'path' }> | null {
  const kept = simplify(points, tolerance);
  if (kept.length < 2) return null;
  const xs = kept.map((q) => q[0]);
  const ys = kept.map((q) => q[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const local: Pt[] = kept.map(([x, y]) => [x - cx, y - cy]);
  return {
    id, kind: 'path', x: cx, y: cy, rotate: 0, sx: 1, sy: 1, ...style,
    d: smoothPath(local, closed),
    w: Math.max(1, Math.max(...xs) - Math.min(...xs)),
    h: Math.max(1, Math.max(...ys) - Math.min(...ys)),
  };
}

/* ── SVG from outside, let in safely ────────────────────────────────────── */

const TAGS = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath']);
const ATTRS = new Set([
  'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'width', 'height', 'points', 'viewBox',
  'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'stroke-dasharray', 'fill-opacity',
  'opacity', 'transform', 'offset', 'stop-color', 'stop-opacity', 'id', 'gradientUnits', 'gradientTransform', 'fill-rule',
  'clip-rule', 'clip-path', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline', 'letter-spacing',
]);
/** Style properties a generated SVG often carries inline, turned into the attributes above. */
const STYLE_KEYS = new Set(['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'fill-opacity', 'opacity', 'stop-color', 'stop-opacity', 'fill-rule', 'font-size', 'font-family', 'font-weight', 'text-anchor']);

/** A value is safe when it cannot reach outside the drawing: no url() but to an id inside it, no script, no expression. */
function safeValue(key: string, value: string): string | null {
  const v = value.trim();
  if (v.length > 20000) return null;
  if (/javascript:|data:|expression\(|@import|<|>/i.test(v)) return null;
  const urls = [...v.matchAll(/url\(\s*['"]?([^'")]*)['"]?\s*\)/gi)];
  if (urls.some((m) => !/^#[\w-]+$/.test(m[1]))) return null;
  if (key === 'id' && !/^[\w-]{1,60}$/.test(v)) return null;
  return v;
}

/**
 * An SVG tree with everything not on the list taken out: scripts, images,
 * links, foreign objects, animations, event handlers, external references.
 * Unknown tags go with their children; inline styles become attributes.
 */
export function cleanTree(node: SvgNode, depth = 0): SvgNode | null {
  if (depth > 40) return null;
  if (node.tag === '#text') return node.text !== undefined ? { tag: '#text', attrs: {}, children: [], text: node.text.slice(0, 500) } : null;
  if (!TAGS.has(node.tag)) return null;
  const attrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(node.attrs)) {
    if (key === 'style') {
      for (const part of value.split(';')) {
        const [k, ...rest] = part.split(':');
        const name = (k ?? '').trim().toLowerCase();
        const v = safeValue(name, rest.join(':'));
        if (STYLE_KEYS.has(name) && v !== null && !(name in attrs)) attrs[name] = v;
      }
      continue;
    }
    if (!ATTRS.has(key)) continue;
    const v = safeValue(key, value);
    if (v !== null) attrs[key] = v;
  }
  const children = node.children.map((child) => cleanTree(child, depth + 1)).filter((one): one is SvgNode => one !== null);
  return { tag: node.tag, attrs, children: (node.tag === 'text' || node.tag === 'tspan') ? children : children.filter((one) => one.tag !== '#text') };
}

/** Every id inside a tree given a prefix, and every url(#id) that points at one, so two drawings never share a gradient. */
export function prefixIds(node: SvgNode, prefix: string): SvgNode {
  const attrs: Record<string, string> = {};
  for (const [key, value] of Object.entries(node.attrs)) {
    if (key === 'id') attrs[key] = `${prefix}-${value}`;
    else attrs[key] = value.replace(/url\(\s*#([\w-]+)\s*\)/g, (_, id: string) => `url(#${prefix}-${id})`);
  }
  return { ...node, attrs, children: node.children.map((child) => prefixIds(child, prefix)) };
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = (text: string): string => text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole, code: string) => {
  if (code[0] === '#') {
    const value = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
    return Number.isFinite(value) && value > 0 && value < 0x110000 ? String.fromCodePoint(value) : '';
  }
  return ENTITIES[code] ?? whole;
});

/**
 * An SVG's text as a tree — a small reader, not a browser's: tags,
 * attributes, text, comments and declarations skipped. What it cannot read
 * is null. Everything it reads still goes through `cleanTree`.
 */
export function parseSvg(source: string): SvgNode | null {
  const text = source.slice(0, 400_000);
  const start = text.search(/<svg[\s>]/i);
  if (start < 0) return null;
  const root: { tag: string; attrs: Record<string, string>; children: SvgNode[] } = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  const token = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<[!?][^>]*>|<\/\s*([\w:-]+)\s*>|<([\w:-]+)((?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>/]+))?)*)\s*(\/?)>|([^<]+)/g;
  token.lastIndex = start;
  let m: RegExpExecArray | null;
  while ((m = token.exec(text))) {
    const top = stack[stack.length - 1];
    if (m[1]) {
      const name = m[1].replace(/^svg:/, '');
      if (stack.length > 1 && top.tag === name) stack.pop();
      if (name === 'svg' && stack.length === 1) break;
    } else if (m[2]) {
      const tag = m[2].replace(/^svg:/, '');
      const attrs: Record<string, string> = {};
      for (const a of m[3].matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g)) {
        attrs[a[1]] = decode(a[2] ?? a[3] ?? a[4] ?? '');
      }
      const node = { tag, attrs, children: [] as SvgNode[] };
      top.children.push(node);
      if (!m[4]) stack.push(node);
    } else if (m[5] && m[5].trim()) {
      top.children.push({ tag: '#text', attrs: {}, children: [], text: decode(m[5]) });
    }
  }
  const svg = root.children.find((one) => one.tag === 'svg');
  return svg ?? null;
}

/** The drawing's own box from an svg element's viewBox, or its width and height. */
export function viewBoxOf(svg: SvgNode): { readonly x: number; readonly y: number; readonly w: number; readonly h: number } {
  const vb = (svg.attrs.viewBox ?? '').split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) return { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
  const w = parseFloat(svg.attrs.width ?? '');
  const h = parseFloat(svg.attrs.height ?? '');
  return { x: 0, y: 0, w: w > 0 ? w : 100, h: h > 0 ? h : 100 };
}

/**
 * An SVG from outside as one item on the artboard: cleaned, its ids made its
 * own, sized to `fit` of the artboard's shorter side and centred.
 */
export function artFrom(source: string, id: string, doc: Pick<VectorDoc, 'w' | 'h'>, fit = 0.8): Extract<Item, { kind: 'art' }> | null {
  const parsed = parseSvg(source);
  return parsed ? artFromTree(parsed, id, doc, fit) : null;
}

/** A drawing already read as a tree (a traced photograph) as one item, cleaned the same way. */
export function artFromTree(tree: SvgNode, id: string, doc: Pick<VectorDoc, 'w' | 'h'>, fit = 0.8): Extract<Item, { kind: 'art' }> | null {
  const clean = cleanTree(tree);
  if (!clean || !clean.children.length) return null;
  const box = viewBoxOf(clean);
  const scale = (Math.min(doc.w, doc.h) * fit) / Math.max(box.w, box.h);
  return {
    id, kind: 'art', x: doc.w / 2, y: doc.h / 2, rotate: 0, sx: scale, sy: scale,
    fill: null, stroke: null, width: 0, opacity: 1,
    tree: prefixIds({ ...clean, attrs: { viewBox: `${box.x} ${box.y} ${box.w} ${box.h}` } }, id),
    w: box.w, h: box.h,
  };
}

/** A drawing's parts as drawings of their own, each where it was — "Break it apart". */
export function breakApart(item: Extract<Item, { kind: 'art' }>, nextId: () => string): Item[] {
  const parts = item.tree.children.filter((one) => !['defs', 'linearGradient', 'radialGradient', 'clipPath'].includes(one.tag));
  const defs = item.tree.children.filter((one) => ['defs', 'linearGradient', 'radialGradient', 'clipPath'].includes(one.tag));
  if (parts.length < 2) return [item];
  return parts.map((part) => ({ ...item, id: nextId(), tree: { ...item.tree, children: [...defs, part] } }));
}

/** Every fill in a drawing turned to one colour — recolouring a piece of AI art. */
export function recolour(node: SvgNode, colour: string): SvgNode {
  const attrs = { ...node.attrs };
  if (attrs.fill && attrs.fill !== 'none' && !attrs.fill.startsWith('url(')) attrs.fill = colour;
  if (node.tag === 'stop' && attrs['stop-color']) attrs['stop-color'] = colour;
  return { ...node, attrs, children: node.children.map((child) => recolour(child, colour)) };
}

/* ── Out as SVG ─────────────────────────────────────────────────────────── */

const esc = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function nodeToSvg(node: SvgNode): string {
  if (node.tag === '#text') return esc(node.text ?? '');
  const attrs = Object.entries(node.attrs).map(([k, v]) => ` ${k}="${esc(v)}"`).join('');
  const inner = node.children.map(nodeToSvg).join('');
  return inner ? `<${node.tag}${attrs}>${inner}</${node.tag}>` : `<${node.tag}${attrs}/>`;
}

/** An item's paint and line as SVG attributes. */
export function paintAttrs(item: Base): Record<string, string> {
  return {
    fill: item.fill ?? 'none',
    stroke: item.stroke ?? 'none',
    ...(item.stroke ? { 'stroke-width': n(item.width), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } : {}),
    ...(item.opacity < 1 ? { opacity: n(item.opacity) } : {}),
    ...(item.evenodd ? { 'fill-rule': 'evenodd' } : {}),
  };
}

/** One item as the SVG elements that draw it, as data — the screen and the file draw the same thing. */
export function itemNode(item: Item): SvgNode {
  const wrap = (children: SvgNode[]): SvgNode => ({ tag: 'g', attrs: { transform: transformOf(item) }, children });
  if (item.kind === 'text') {
    const lines = item.text.split('\n');
    const lead = item.size * 1.15;
    return wrap([{
      tag: 'text',
      attrs: {
        ...paintAttrs(item), 'font-family': FONTS[item.font], 'font-size': n(item.size), 'font-weight': item.bold ? '700' : '400',
        'text-anchor': 'middle', 'dominant-baseline': 'central',
      },
      children: lines.map((line, k) => ({ tag: 'tspan', attrs: { x: '0', y: n((k - (lines.length - 1) / 2) * lead) }, children: [{ tag: '#text', attrs: {}, children: [], text: line || ' ' }] })),
    }]);
  }
  if (item.kind === 'art') {
    const box = viewBoxOf(item.tree);
    const fit = `translate(${n(-item.w / 2)} ${n(-item.h / 2)}) translate(${n(-box.x)} ${n(-box.y)})`;
    const inner: SvgNode = { tag: 'g', attrs: { transform: fit, ...(item.opacity < 1 ? { opacity: n(item.opacity) } : {}) }, children: item.tree.children };
    return wrap([inner]);
  }
  return wrap([{ tag: 'path', attrs: { d: outline(item), ...paintAttrs(item) }, children: [] }]);
}

/** The whole drawing as an SVG file. */
export function toSvg(doc: VectorDoc): string {
  const body = doc.items.filter((one) => !one.hidden).map((one) => nodeToSvg(itemNode(one))).join('');
  const back = doc.background ? `<rect width="${doc.w}" height="${doc.h}" fill="${esc(doc.background)}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${doc.w} ${doc.h}" width="${doc.w}" height="${doc.h}">${back}${body}</svg>`;
}

/* ── The AI's question ──────────────────────────────────────────────────── */

/** What the AI is asked: one self-contained SVG, flat vector illustration, nothing that runs or fetches. */
export function vectorAsk(words: string): string {
  return [
    'Draw this as a clean, flat vector illustration and answer with ONE complete SVG document only — no prose, no markdown fences.',
    'Rules: viewBox="0 0 512 512"; only <svg>, <g>, <path>, <rect>, <circle>, <ellipse>, <line>, <polyline>, <polygon>, <defs>, <linearGradient>, <radialGradient>, <stop>; no <text>, no <image>, no <script>, no <style>, no external references, no animation; solid fills and simple gradients; separate shapes for separate parts so they can be recoloured; well-balanced composition centred in the view; at most 120 elements.',
    'What to draw:',
    words.slice(0, 1500),
  ].join('\n');
}
