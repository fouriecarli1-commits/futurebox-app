/**
 * Style match: the photograph, or the part of it painted, made over in a style.
 *
 * The owner, 17 October 2026, with screenshots of another app's style picker — a
 * row of sample tiles, one subject made in each style, under tabs for
 * characters, digital media, physical media and craft: *"By magic moet daar
 * ook van hierdie filters wees … ons moet al daai presiese opsies en filters
 * en templates gee wat dan so oulik verander, google sal dit kan doen."* And
 * then: *"Ek wil net hê jy moet elke funksie wat daar is in sit. Moet net nie
 * 'n eend gebruik as template cover nie, gebruik dalk 'n meerkat se bolyf en
 * gesig."*
 *
 * Ours, in our own hand: every tile is a meerkat drawn here, in code, in that
 * style — nobody's picture is borrowed — and the change itself is the picture
 * engine's, through the magic touch's own paid route. Each style is a
 * sentence for the engine (`ask`) and a way to draw the meerkat, kept side by
 * side so a style cannot be offered without a picture of what it does.
 */

import { PREVIEWED, previewStyle } from './stylepreview';

export type StyleGroup = 'featured' | 'characters' | 'digital' | 'physical' | 'craft' | 'photo';

export const STYLE_GROUPS: readonly { readonly id: StyleGroup; readonly en: string; readonly af: string }[] = [
  { id: 'featured', en: 'Favourites', af: 'Gunstelinge' },
  { id: 'characters', en: 'Characters', af: 'Karakters' },
  { id: 'digital', en: 'Digital', af: 'Digitaal' },
  { id: 'physical', en: 'Paint and print', af: 'Verf en druk' },
  { id: 'craft', en: 'Craft and texture', af: 'Handwerk en tekstuur' },
  { id: 'photo', en: 'Photo looks', af: 'Foto-voorkoms' },
];

type Look =
  | 'moderncomic' | 'comic' | 'pop' | 'crayon' | 'doodle' | 'handdrawn' | 'cartoon' | 'cartoon3d' | 'anime'
  | 'lineart' | 'simpleline' | 'colourline' | 'flat' | 'pixel' | 'polygon' | 'voxel' | 'soft3d' | 'chrome' | 'iridescent' | 'neon'
  | 'etching' | 'pencil' | 'oil' | 'watercolour' | 'riso' | 'linocut' | 'dither' | 'glass' | 'mosaic'
  | 'scrapbook' | 'cutout' | 'origami' | 'clay' | 'crochet' | 'plush' | 'stitched' | 'glossy' | 'marble' | 'gold'
  | 'glittergold' | 'glitterorange' | 'glitterpink' | 'glittersilver' | 'glittergreen'
  | 'vintage' | 'noir' | 'sticker'
  | 'synthwave' | 'vaporwave' | 'cyberpunk' | 'hologram'
  | 'charcoal' | 'woodblock' | 'graffiti' | 'tattoo' | 'blueprint'
  | 'thermal' | 'xray' | 'polaroid' | 'duotone' | 'infrared';

export interface MagicStyle {
  readonly id: Look;
  readonly group: Exclude<StyleGroup, 'featured'>;
  readonly en: string;
  readonly af: string;
  /** What the engine is asked to make it look like. */
  readonly ask: string;
  /** Shown under Favourites as well. */
  readonly featured?: boolean;
}

const glitter = (en: string, af: string, colour: string): Pick<MagicStyle, 'en' | 'af' | 'ask'> => ({
  en, af, ask: `a figure covered all over in fine ${colour} glitter, sparkling, on a soft studio background`,
});

export const MAGIC_STYLES: readonly MagicStyle[] = [
  /* Characters and illustration */
  { id: 'moderncomic', group: 'characters', en: 'Modern comic', af: 'Moderne strokiesprent', ask: 'a modern comic illustration: clean bold outlines, bright flat colour, crisp cel shading', featured: true },
  { id: 'comic', group: 'characters', en: 'Comic book', af: 'Strokiesboek', ask: 'a vintage comic-book illustration: ink outlines, flat colours and halftone dots' },
  { id: 'pop', group: 'characters', en: 'Pop art', af: 'Popkuns', ask: 'pop art: bold flat colour blocks and halftone dots, strong outlines', featured: true },
  { id: 'crayon', group: 'characters', en: 'Crayon', af: 'Kryt', ask: 'a crayon drawing: waxy strokes, paper texture, a child-like hand' },
  { id: 'doodle', group: 'characters', en: 'Colourful doodle', af: 'Kleurvolle krabbel', ask: 'a playful colourful doodle: loose marker lines and bright fills' },
  { id: 'handdrawn', group: 'characters', en: 'Coloured hand-drawn', af: 'Ingekleurde handtekening', ask: 'a coloured hand-drawn illustration: soft pencil lines and gentle colour' },
  { id: 'cartoon', group: 'characters', en: 'Cartoon', af: 'Spotprent', ask: 'a cartoon: simple shapes, thick black outlines, cheerful flat colours' },
  { id: 'cartoon3d', group: 'characters', en: '3D cartoon', af: '3D-spotprent', ask: 'a 3D animated-film cartoon character: soft rounded forms and studio lighting', featured: true },
  { id: 'anime', group: 'characters', en: 'Anime', af: 'Anime', ask: 'anime illustration: clean line art, cel shading, bright expressive eyes' },
  /* Digital */
  { id: 'lineart', group: 'digital', en: 'Line art', af: 'Lynkuns', ask: 'clean black line art on white, no colour, fine detail lines' },
  { id: 'simpleline', group: 'digital', en: 'Simple lines', af: 'Eenvoudige lyne', ask: 'simple thick black outlines on white, minimal detail, no colour' },
  { id: 'colourline', group: 'digital', en: 'Coloured lines', af: 'Gekleurde lyne', ask: 'a bold outlined illustration with flat bright colour fills' },
  { id: 'flat', group: 'digital', en: 'Flat design', af: 'Plat ontwerp', ask: 'flat design vector illustration: no outlines, simple flat shapes, soft shadows' },
  { id: 'pixel', group: 'digital', en: 'Pixel art', af: 'Pixelkuns', ask: 'pixel art: crisp square pixels, a small limited palette, retro video-game look' },
  { id: 'polygon', group: 'digital', en: 'Low poly', af: 'Lae poli', ask: 'low-poly 3D: flat-shaded triangular facets, clean geometric planes' },
  { id: 'voxel', group: 'digital', en: 'Blocks', af: 'Blokkies', ask: 'voxel art: built from small 3D cubes, like a block-building game' },
  { id: 'soft3d', group: 'digital', en: '3D art', af: '3D-kuns', ask: 'a smooth 3D render: soft studio light, rounded forms, gentle shadows' },
  { id: 'chrome', group: 'digital', en: 'Chrome', af: 'Chroom', ask: 'polished liquid chrome: mirror-like silver metal with bright reflections', featured: true },
  { id: 'iridescent', group: 'digital', en: 'Iridescent', af: 'Reënboogglans', ask: 'iridescent holographic: shifting pink, violet, blue and orange sheen' },
  { id: 'neon', group: 'digital', en: 'Neon', af: 'Neon', ask: 'glowing neon light lines on a dark background, vivid electric colour' },
  { id: 'synthwave', group: 'digital', en: 'Synthwave', af: 'Synthwave', ask: 'synthwave: a glowing magenta and violet sunset, a neon grid floor, retro-future light', featured: true },
  { id: 'vaporwave', group: 'digital', en: 'Vaporwave', af: 'Vaporwave', ask: 'vaporwave: soft pastel pink and cyan, dreamy retro-digital haze' },
  { id: 'cyberpunk', group: 'digital', en: 'Cyberpunk', af: 'Kuberpunk', ask: 'a cyberpunk night scene: neon cyan and magenta light, rain-wet reflections, high-tech glow', featured: true },
  { id: 'hologram', group: 'digital', en: 'Hologram', af: 'Hologram', ask: 'a glowing blue hologram projection: translucent light, fine scan lines' },
  /* Paint and print */
  { id: 'etching', group: 'physical', en: 'Etching', af: 'Ets', ask: 'a fine black-ink etching: engraved cross-hatching on cream paper' },
  { id: 'pencil', group: 'physical', en: 'Pencil sketch', af: 'Potloodskets', ask: 'a graphite pencil sketch: fine hatching and loose construction lines on paper' },
  { id: 'oil', group: 'physical', en: 'Painterly', af: 'Skilderagtig', ask: 'a classic oil painting: thick visible brush strokes, rich colour' },
  { id: 'watercolour', group: 'physical', en: 'Watercolour', af: 'Waterverf', ask: 'a watercolour painting: soft washes, blooms and paper texture', featured: true },
  { id: 'riso', group: 'physical', en: 'Risograph', af: 'Risograaf', ask: 'a risograph print: two bright ink layers slightly out of register, grainy texture' },
  { id: 'linocut', group: 'physical', en: 'Linocut', af: 'Linosnee', ask: 'a black-and-white linocut print: bold carved lines and gouge marks' },
  { id: 'dither', group: 'physical', en: 'Dither', af: 'Stippel', ask: 'a black-and-white dithered halftone: shading made only of dots' },
  { id: 'glass', group: 'physical', en: 'Stained glass', af: 'Loodglas', ask: 'a stained glass window: bright glass pieces with dark lead lines, light shining through' },
  { id: 'charcoal', group: 'physical', en: 'Charcoal', af: 'Houtskool', ask: 'a charcoal drawing: deep smudged blacks and rough strokes on paper' },
  { id: 'woodblock', group: 'physical', en: 'Woodblock', af: 'Houtblok', ask: 'a woodblock print: indigo ink on cream paper, carved flowing lines' },
  { id: 'graffiti', group: 'physical', en: 'Graffiti', af: 'Graffiti', ask: 'street-art graffiti on a wall: spray-paint colour, bold outlines, drips' },
  { id: 'tattoo', group: 'physical', en: 'Tattoo flash', af: 'Tatoeëerkuns', ask: 'tattoo flash art on paper: bold black outlines, red and green fills, classic sheet look' },
  { id: 'blueprint', group: 'physical', en: 'Blueprint', af: 'Bloudruk', ask: 'a technical blueprint: fine white lines on deep blue, a faint grid' },
  { id: 'mosaic', group: 'physical', en: 'Mosaic', af: 'Mosaïek', ask: 'a tile mosaic: small square stone and glass tiles with grout between' },
  /* Craft and texture */
  { id: 'scrapbook', group: 'craft', en: 'Scrapbook', af: 'Plakboek', ask: 'a scrapbook collage: cut felt and paper pieces with visible texture and edges' },
  { id: 'cutout', group: 'craft', en: 'Paper cutout', af: 'Papieruitknip', ask: 'layered paper cutout art: flat paper shapes stacked with soft drop shadows' },
  { id: 'origami', group: 'craft', en: 'Paper folds', af: 'Papiervou', ask: 'folded paper origami: crisp creases and flat paper planes' },
  { id: 'clay', group: 'craft', en: 'Clay', af: 'Klei', ask: 'handmade clay figures: soft matte plasticine with fingerprints and rounded forms', featured: true },
  { id: 'crochet', group: 'craft', en: 'Crochet', af: 'Hekelwerk', ask: 'a crocheted amigurumi doll made of yarn: visible stitches and wool texture', featured: true },
  { id: 'plush', group: 'craft', en: 'Plush', af: 'Pluche', ask: 'a soft fluffy plush toy: fuzzy fur and stitched seams' },
  { id: 'stitched', group: 'craft', en: 'Embroidery', af: 'Borduurwerk', ask: 'embroidery on fabric: satin stitches and thread texture' },
  { id: 'glossy', group: 'craft', en: 'Glossy', af: 'Blink', ask: 'shiny glossy plastic toy: smooth surfaces and bright specular highlights' },
  { id: 'marble', group: 'craft', en: 'Marble', af: 'Marmer', ask: 'a carved white marble statue with grey veins, museum lighting' },
  { id: 'gold', group: 'craft', en: 'Gold', af: 'Goud', ask: 'solid polished gold, warm metallic highlights' },
  { id: 'glittergold', group: 'craft', ...glitter('Gold glitter', 'Goue glitter', 'gold') },
  { id: 'glitterorange', group: 'craft', ...glitter('Orange glitter', 'Oranje glitter', 'orange') },
  { id: 'glitterpink', group: 'craft', ...glitter('Pink glitter', 'Pienk glitter', 'pink') },
  { id: 'glittersilver', group: 'craft', ...glitter('Silver glitter', 'Silwer glitter', 'silver') },
  { id: 'glittergreen', group: 'craft', ...glitter('Green glitter', 'Groen glitter', 'green') },
  /* Photo looks */
  { id: 'vintage', group: 'photo', en: 'Old photo', af: 'Ou foto', ask: 'an old sepia photograph: faded, soft grain, worn edges' },
  { id: 'noir', group: 'photo', en: 'Film noir', af: 'Film noir', ask: 'black-and-white film noir: hard shadows and dramatic contrast' },
  { id: 'polaroid', group: 'photo', en: 'Instant photo', af: 'Kitsfoto', ask: 'an instant photo: warm faded colour, soft light and a white frame' },
  { id: 'duotone', group: 'photo', en: 'Duotone', af: 'Tweetoon', ask: 'a duotone print: only deep violet shadows and bright gold light' },
  { id: 'thermal', group: 'photo', en: 'Heat camera', af: 'Hittekamera', ask: 'a thermal camera image: blue cold areas, red, orange and yellow warm areas' },
  { id: 'infrared', group: 'photo', en: 'Infrared', af: 'Infrarooi', ask: 'infrared film: pink and white foliage, deep skies, dreamy glow' },
  { id: 'xray', group: 'photo', en: 'X-ray glow', af: 'X-straalgloed', ask: 'an x-ray film look: inverted glowing blue-white tones on black, the outer shape only' },
  { id: 'sticker', group: 'photo', en: 'Sticker', af: 'Plakker', ask: 'a die-cut sticker: thick white border, glossy, slight drop shadow' },
];

/** The styles under one tab; Favourites gathers the starred ones from every tab. */
export const stylesIn = (group: StyleGroup): readonly MagicStyle[] =>
  MAGIC_STYLES.filter((one) => (group === 'featured' ? one.featured : one.group === group));

export const styleById = (id: string): MagicStyle | undefined => MAGIC_STYLES.find((one) => one.id === id);

export const styleLabel = (one: { readonly en: string; readonly af: string }, lang: string): string =>
  (lang === 'af' ? one.af : one.en);

/** The sentence the engine is sent, for a part or for the whole photograph. */
export function styleAsk(style: MagicStyle, whole: boolean): string {
  return whole
    ? `Restyle this whole photograph as ${style.ask}. Keep every person, their face, pose and expression, and the composition exactly as they are.`
    : `Restyle the main thing in this part of the photograph as ${style.ask}. Keep its shape, size, position and angle so it fits back into the photograph. Keep the edges of the picture as they are.`;
}

/* ── The hot-air balloon on every tile ───────────────────────────────

   It was a meerkat, then for a morning a rocket. The owner, 20 October 2026:
   *"Hierdie meerkat prent lyk nie goed nie."* and then *"'n rocket gaan ook
   nie werk vir 'n voorbeeld nie"* — a rocket on its own reads as the wrong
   shape. A striped hot-air balloon is round, cheerful and unmistakable, a
   handful of clean shapes that read at 68 pixels, and every style below has
   something definite to redraw: the envelope, its stripes, the band and
   ropes, and the basket. The parts keep the roles the animal's had — the
   envelope is what the styles once called fur, the stripes the belly, the
   band the mask and the basket the nose — so every style draws the balloon
   the way it drew the animal. */

export interface Part {
  readonly path: Path2D;
  readonly ink: string;
  /** Part of the outline, not a mark inside it. */
  readonly shape: boolean;
}

const ENVELOPE = '#ffc93c';
const STRIPE = '#ef4b3c';
const BAND = '#3a2a4a';
const BASKET = '#6b4423';
const GLINT = '#fff7e0';

/** The balloon on an `s`-pixel square, back to front: ropes, envelope, stripes, band, basket. */
export function balloon(s: number): Part[] {
  const at = (x: number, y: number): [number, number] => [s * x, s * y];
  const shape = (points: readonly (readonly [number, number])[]): Path2D => {
    const p = new Path2D();
    points.forEach(([x, y], i) => (i ? p.lineTo(...at(x, y)) : p.moveTo(...at(x, y))));
    p.closePath();
    return p;
  };
  const envelope = new Path2D();
  envelope.moveTo(...at(0.5, 0.08));
  envelope.bezierCurveTo(...at(0.7, 0.08), ...at(0.84, 0.22), ...at(0.84, 0.38));
  envelope.bezierCurveTo(...at(0.84, 0.53), ...at(0.68, 0.6), ...at(0.6, 0.68));
  envelope.lineTo(...at(0.4, 0.68));
  envelope.bezierCurveTo(...at(0.32, 0.6), ...at(0.16, 0.53), ...at(0.16, 0.38));
  envelope.bezierCurveTo(...at(0.16, 0.22), ...at(0.3, 0.08), ...at(0.5, 0.08));
  envelope.closePath();
  /* A stripe is the gore between two curves from the crown to the band. */
  const gore = (out: number, inner: number, foot: number, footIn: number): Path2D => {
    const p = new Path2D();
    p.moveTo(...at(0.5, 0.08));
    p.bezierCurveTo(...at(0.5 + (out - 0.5) * 0.55, 0.09), ...at(out, 0.3), ...at(foot, 0.68));
    p.lineTo(...at(footIn, 0.68));
    p.bezierCurveTo(...at(inner, 0.3), ...at(0.5 + (inner - 0.5) * 0.55, 0.09), ...at(0.5, 0.08));
    p.closePath();
    return p;
  };
  const glint = new Path2D();
  glint.ellipse(...at(0.31, 0.27), s * 0.035, s * 0.07, 0.5, 0, Math.PI * 2);
  return [
    { path: shape([[0.415, 0.71], [0.428, 0.71], [0.452, 0.8], [0.44, 0.8]]), ink: BAND, shape: true },
    { path: shape([[0.572, 0.71], [0.585, 0.71], [0.56, 0.8], [0.548, 0.8]]), ink: BAND, shape: true },
    { path: envelope, ink: ENVELOPE, shape: true },
    { path: gore(0.6, 0.4, 0.535, 0.465), ink: STRIPE, shape: false },
    { path: gore(0.24, 0.31, 0.405, 0.43), ink: STRIPE, shape: false },
    { path: gore(0.76, 0.69, 0.595, 0.57), ink: STRIPE, shape: false },
    { path: glint, ink: GLINT, shape: false },
    { path: shape([[0.395, 0.665], [0.605, 0.665], [0.59, 0.715], [0.41, 0.715]]), ink: BAND, shape: true },
    { path: shape([[0.42, 0.795], [0.58, 0.795], [0.57, 0.9], [0.43, 0.9]]), ink: BASKET, shape: true },
    { path: shape([[0.42, 0.795], [0.58, 0.795], [0.578, 0.815], [0.422, 0.815]]), ink: BAND, shape: false },
  ];
}

/** The basket, which a few styles draw on their own. */
const noseOf = (s: number): Path2D => balloon(s).find((one) => one.ink === BASKET)?.path ?? new Path2D();

/** The whole balloon as one outline, for styles that fill it as one thing. */
function outline(s: number): Path2D {
  const all = new Path2D();
  for (const part of balloon(s)) if (part.shape) all.addPath(part.path);
  return all;
}

const flat = (ctx: CanvasRenderingContext2D, s: number, recolour?: (ink: string) => string): void => {
  for (const part of balloon(s)) {
    ctx.fillStyle = recolour ? recolour(part.ink) : part.ink;
    ctx.fill(part.path);
  }
};

/** A clean outer outline: every part stroked twice as wide, the balloon filled over it. */
const inked = (ctx: CanvasRenderingContext2D, s: number, ink: string, width: number): void => {
  ctx.strokeStyle = ink;
  ctx.lineWidth = width * 2;
  ctx.lineJoin = 'round';
  for (const part of balloon(s)) if (part.shape) ctx.stroke(part.path);
};

/** Only the lines: an outer outline, and the face marks drawn as lines. */
const linesOnly = (ctx: CanvasRenderingContext2D, s: number, width: number, inner = true): void => {
  ctx.fillStyle = '#ffffff';
  ctx.fill(outline(s));
  inked(ctx, s, '#111', width);
  ctx.fillStyle = '#ffffff';
  for (const part of balloon(s)) if (part.shape) ctx.fill(part.path);
  ctx.strokeStyle = '#111';
  ctx.lineWidth = width * 0.7;
  if (inner) for (const part of balloon(s)) if (!part.shape && part.ink !== GLINT) ctx.stroke(part.path);
  ctx.fillStyle = '#111';
  ctx.fill(noseOf(s));
};

/** The balloon drawn small, as pixels to build blocky and printed styles from. */
function sampled(n: number): Uint8ClampedArray | null {
  const tiny = document.createElement('canvas');
  tiny.width = n;
  tiny.height = n;
  const c = tiny.getContext('2d', { willReadFrequently: true });
  if (!c) return null;
  flat(c, n);
  return c.getImageData(0, 0, n, n).data;
}

const rgb = (d: Uint8ClampedArray, i: number, by = 0): string =>
  `rgb(${Math.max(0, Math.min(255, d[i] + by))},${Math.max(0, Math.min(255, d[i + 1] + by))},${Math.max(0, Math.min(255, d[i + 2] + by))})`;

const lightOf = (d: Uint8ClampedArray, i: number): number => (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;

const grey = (ink: string): string => {
  const n = Number.parseInt(ink.slice(1), 16);
  const v = Math.round(((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11);
  return `rgb(${v},${v},${v})`;
};

/** A metal, glitter or stone: a gradient through the outline, then the face marks. */
function material(ctx: CanvasRenderingContext2D, s: number, stops: readonly string[], marks: string): void {
  const g = ctx.createLinearGradient(0, s * 0.15, s, s * 0.95);
  stops.forEach((one, k) => g.addColorStop(k / (stops.length - 1), one));
  ctx.fillStyle = g;
  ctx.fill(outline(s));
  ctx.fillStyle = marks;
  for (const part of balloon(s)) if (part.ink === BAND || part.ink === BASKET) ctx.fill(part.path);
}

/** Sparkles over the outline, for glitter. */
function sparkle(ctx: CanvasRenderingContext2D, s: number, ink: string): void {
  ctx.save();
  ctx.clip(outline(s));
  let seed = 7;
  for (let k = 0; k < 260; k += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const x = (seed % 1000) / 1000;
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const y = (seed % 1000) / 1000;
    ctx.fillStyle = k % 3 === 0 ? '#ffffff' : ink;
    ctx.fillRect(x * s, y * s, Math.max(1, s / 90), Math.max(1, s / 90));
  }
  ctx.restore();
}

/** Draw a style's sample on a square canvas. */
export function drawStyleTile(canvas: HTMLCanvasElement, id: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const s = canvas.width;
  ctx.save();
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, s, s);
  const line = Math.max(1.5, s / 34);

  switch (id) {
    case 'pixel':
    case 'voxel':
    case 'mosaic': {
      const n = id === 'pixel' ? 16 : id === 'voxel' ? 12 : 18;
      const d = sampled(n);
      if (!d) break;
      if (id === 'mosaic') { ctx.fillStyle = '#d8d2c4'; ctx.fillRect(0, 0, s, s); }
      const cell = s / (id === 'voxel' ? n + 1 : n);
      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          const i = (y * n + x) * 4;
          if (id === 'mosaic') {
            ctx.fillStyle = d[i + 3] < 128 ? ((x + y) % 3 === 0 ? '#8fb8c9' : '#a5c8d6') : rgb(d, i, ((x * 7 + y * 3) % 5) * 6 - 12);
            ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
            continue;
          }
          if (d[i + 3] < 128) continue;
          if (id === 'pixel') {
            ctx.fillStyle = rgb(d, i);
            ctx.fillRect(Math.floor(x * cell), Math.floor(y * cell), Math.ceil(cell), Math.ceil(cell));
            continue;
          }
          const px = x * cell + cell * 0.3;
          const py = y * cell + cell * 0.3;
          const lip = cell * 0.28;
          ctx.fillStyle = rgb(d, i, -55);
          ctx.fillRect(px + lip, py + lip, cell, cell);
          ctx.fillStyle = rgb(d, i, 25);
          ctx.fillRect(px, py, cell, cell);
          ctx.strokeStyle = 'rgba(0,0,0,0.22)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, cell, cell);
        }
      }
      break;
    }
    case 'polygon':
    case 'origami': {
      const n = id === 'polygon' ? 10 : 6;
      const d = sampled(n * 4);
      if (!d) break;
      const cell = s / n;
      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          for (let half = 0; half < 2; half += 1) {
            const cx = Math.min(n * 4 - 1, Math.round((x + (half ? 0.66 : 0.33)) * 4));
            const cy = Math.min(n * 4 - 1, Math.round((y + (half ? 0.66 : 0.33)) * 4));
            const i = (cy * n * 4 + cx) * 4;
            if (d[i + 3] < 128) continue;
            ctx.beginPath();
            if (half) {
              ctx.moveTo((x + 1) * cell, y * cell);
              ctx.lineTo((x + 1) * cell, (y + 1) * cell);
              ctx.lineTo(x * cell, (y + 1) * cell);
            } else {
              ctx.moveTo(x * cell, y * cell);
              ctx.lineTo((x + 1) * cell, y * cell);
              ctx.lineTo(x * cell, (y + 1) * cell);
            }
            ctx.closePath();
            ctx.fillStyle = rgb(d, i, half ? -26 : 18);
            ctx.fill();
            if (id === 'origami') { ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; ctx.stroke(); }
          }
        }
      }
      break;
    }
    case 'dither':
    case 'linocut':
    case 'etching': {
      const n = id === 'dither' ? 26 : 40;
      const d = sampled(n);
      if (!d) break;
      if (id !== 'dither') { ctx.fillStyle = id === 'etching' ? '#efe6d2' : '#ffffff'; ctx.fillRect(0, 0, s, s); }
      const cell = s / n;
      ctx.fillStyle = '#111';
      ctx.strokeStyle = '#111';
      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          const i = (y * n + x) * 4;
          if (d[i + 3] < 128) continue;
          const dark = 1 - lightOf(d, i);
          if (id === 'dither') {
            ctx.beginPath();
            ctx.arc((x + 0.5) * cell, (y + 0.5) * cell, cell * 0.55 * Math.sqrt(dark + 0.12), 0, Math.PI * 2);
            ctx.fill();
          } else if (id === 'linocut') {
            if (dark > 0.35 || (x + y) % 3 === 0) ctx.fillRect(x * cell, y * cell, cell, cell * (dark > 0.35 ? 1 : 0.35));
          } else {
            ctx.lineWidth = Math.max(0.6, cell * 0.25 * (dark + 0.2));
            ctx.beginPath();
            ctx.moveTo(x * cell, y * cell);
            ctx.lineTo((x + 1) * cell, (y + 1) * cell);
            if (dark > 0.4) { ctx.moveTo((x + 1) * cell, y * cell); ctx.lineTo(x * cell, (y + 1) * cell); }
            ctx.stroke();
          }
        }
      }
      if (id !== 'dither') { ctx.lineWidth = line * 0.6; for (const part of balloon(s)) if (part.shape) ctx.stroke(part.path); }
      break;
    }
    case 'soft3d':
    case 'clay':
    case 'cartoon3d':
    case 'glossy': {
      for (const part of balloon(s)) {
        const g = ctx.createRadialGradient(s * 0.42, s * 0.3, s * 0.02, s * 0.5, s * 0.55, s * 0.6);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(id === 'glossy' ? 0.12 : 0.28, part.ink);
        g.addColorStop(1, id === 'clay' ? '#7a4f22' : '#6e4a24');
        ctx.fillStyle = part.shape ? g : part.ink;
        if (part.shape) {
          ctx.shadowColor = 'rgba(0,0,0,0.25)';
          ctx.shadowBlur = s / 14;
          ctx.shadowOffsetY = s / 40;
        }
        ctx.fill(part.path);
        ctx.shadowColor = 'transparent';
      }
      if (id === 'cartoon3d') {
        ctx.fillStyle = '#ffffff';
        for (const x of [0.458, 0.548]) { ctx.beginPath(); ctx.arc(s * x, s * 0.338, s * 0.009, 0, Math.PI * 2); ctx.fill(); }
      }
      if (id === 'glossy') {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.ellipse(s * 0.44, s * 0.3, s * 0.05, s * 0.02, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(s * 0.38, s * 0.78, s * 0.06, s * 0.02, -0.6, 0, Math.PI * 2); ctx.fill();
      }
      if (id === 'clay') {
        ctx.fillStyle = 'rgba(90,55,20,0.18)';
        for (let k = 0; k < 9; k += 1) {
          ctx.beginPath();
          ctx.arc(s * (0.36 + (k % 3) * 0.12), s * (0.74 + Math.floor(k / 3) * 0.07), s * 0.016, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'chrome':
      material(ctx, s, ['#f8f8f8', '#8a8f98', '#ffffff', '#4b4f57', '#d7dbe0'], '#2b2f36');
      break;
    case 'gold':
      material(ctx, s, ['#fff4c2', '#c8901e', '#ffe58a', '#8a5a0c', '#f2c94c'], '#5a3a08');
      break;
    case 'marble': {
      material(ctx, s, ['#ffffff', '#e8e6e1', '#d4d1ca', '#f2f0eb', '#c9c5bc'], '#a29d94');
      ctx.save();
      ctx.clip(outline(s));
      ctx.strokeStyle = 'rgba(120,120,128,0.5)';
      ctx.lineWidth = line * 0.45;
      for (let k = 0; k < 4; k += 1) {
        ctx.beginPath();
        ctx.moveTo(s * (0.2 + k * 0.17), s * 0.2);
        ctx.bezierCurveTo(s * (0.3 + k * 0.1), s * 0.45, s * (0.12 + k * 0.2), s * 0.6, s * (0.35 + k * 0.14), s);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'glittergold':
    case 'glitterorange':
    case 'glitterpink':
    case 'glittersilver':
    case 'glittergreen': {
      const tone = {
        glittergold: ['#ffe58a', '#c8901e', '#f2c94c'],
        glitterorange: ['#ffc07a', '#e8701a', '#ff9a3c'],
        glitterpink: ['#ffd1ea', '#e85aa8', '#ff9ccf'],
        glittersilver: ['#ffffff', '#9aa0a8', '#d9dde2'],
        glittergreen: ['#a8f0a0', '#22a83a', '#5fd36a'],
      }[id];
      material(ctx, s, tone, 'rgba(0,0,0,0.45)');
      sparkle(ctx, s, tone[1]);
      break;
    }
    case 'iridescent': {
      material(ctx, s, ['#ff4fd8', '#8b5cf6', '#38bdf8', '#34d399', '#fbbf24', '#ff4fd8'], '#3a1450');
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.ellipse(s * 0.45, s * 0.32, s * 0.06, s * 0.025, -0.5, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'neon': {
      ctx.fillStyle = '#0b0614';
      ctx.fillRect(0, 0, s, s);
      ctx.lineWidth = line;
      ctx.shadowBlur = s / 10;
      balloon(s).forEach((part, k) => {
        const ink = part.shape ? (k < 2 ? '#ff3dc8' : '#22d3ee') : '#fde047';
        ctx.strokeStyle = ink;
        ctx.shadowColor = ink;
        ctx.stroke(part.path);
      });
      break;
    }
    case 'pencil':
    case 'noir': {
      if (id === 'noir') { ctx.fillStyle = '#d9d9d9'; ctx.fillRect(0, 0, s, s); flat(ctx, s, (ink) => (ink === BASKET || ink === BAND ? '#000' : grey(ink))); }
      ctx.save();
      ctx.clip(outline(s));
      ctx.strokeStyle = id === 'noir' ? 'rgba(0,0,0,0.8)' : 'rgba(60,60,60,0.5)';
      ctx.lineWidth = id === 'noir' ? line * 1.6 : Math.max(1, line * 0.35);
      for (let k = -s; k < s * 2; k += id === 'noir' ? s / 7 : s / 24) {
        ctx.beginPath();
        ctx.moveTo(k, s);
        ctx.lineTo(k + s * 0.6, 0);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = Math.max(1, line * 0.6);
      for (const part of balloon(s)) if (part.ink !== GLINT) ctx.stroke(part.path);
      break;
    }
    case 'watercolour':
    case 'crayon':
    case 'handdrawn': {
      if (id === 'watercolour') {
        ctx.filter = `blur(${Math.max(1, s / 45)}px)`;
        for (let k = 0; k < 3; k += 1) {
          ctx.globalAlpha = 0.45;
          ctx.save();
          ctx.translate((k - 1) * s * 0.012, (k - 1) * s * 0.01);
          flat(ctx, s);
          ctx.restore();
        }
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      } else {
        flat(ctx, s);
        ctx.save();
        ctx.clip(outline(s));
        ctx.strokeStyle = id === 'crayon' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.25)';
        ctx.lineWidth = Math.max(1, line * 0.5);
        for (let k = 0; k < 60; k += 1) {
          const y = (k / 60) * s;
          ctx.beginPath();
          ctx.moveTo(0, y + ((k * 13) % 7));
          ctx.lineTo(s, y - ((k * 7) % 9));
          ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = id === 'crayon' ? '#6a4520' : '#5a4030';
        ctx.lineWidth = id === 'crayon' ? line * 0.9 : line * 0.5;
        for (const part of balloon(s)) if (part.shape) ctx.stroke(part.path);
      }
      ctx.fillStyle = BASKET;
      ctx.fill(noseOf(s));
      break;
    }
    case 'oil': {
      flat(ctx, s);
      ctx.save();
      ctx.clip(outline(s));
      ctx.lineCap = 'round';
      for (let k = 0; k < 46; k += 1) {
        const x = s * (0.15 + ((k * 37) % 70) / 100);
        const y = s * (0.15 + ((k * 53) % 80) / 100);
        ctx.strokeStyle = k % 3 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(110,70,30,0.3)';
        ctx.lineWidth = line * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + s * 0.07, y - s * 0.03);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'riso': {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.translate(s * 0.012, s * 0.01);
      flat(ctx, s, (ink) => (ink === BASKET || ink === BAND ? '#ff4fa3' : '#ffd23f'));
      ctx.translate(-s * 0.024, -s * 0.02);
      ctx.strokeStyle = '#2e86de';
      ctx.lineWidth = line * 0.8;
      for (const part of balloon(s)) ctx.stroke(part.path);
      ctx.restore();
      break;
    }
    case 'comic':
    case 'moderncomic':
    case 'pop': {
      ctx.fillStyle = id === 'pop' ? '#ffde3b' : id === 'comic' ? '#9ee7ff' : '#ffe2f2';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = id === 'pop' ? 'rgba(255,61,200,0.35)' : 'rgba(0,90,140,0.22)';
      for (let y = 0; y < s; y += s / 12) for (let x = 0; x < s; x += s / 12) {
        ctx.beginPath();
        ctx.arc(x + s / 24, y + s / 24, s / 60, 0, Math.PI * 2);
        ctx.fill();
      }
      inked(ctx, s, '#111', line * (id === 'moderncomic' ? 1.1 : 1.4));
      flat(ctx, s, id === 'pop' ? (ink) => (ink === ENVELOPE ? '#ff7a1a' : ink === STRIPE ? '#ffd0a8' : ink) : undefined);
      if (id !== 'comic') {
        ctx.save();
        ctx.clip(outline(s));
        ctx.fillStyle = 'rgba(120,60,0,0.25)';
        ctx.fillRect(s * 0.5, 0, s, s);
        ctx.restore();
      }
      break;
    }
    case 'cartoon':
    case 'anime':
    case 'colourline':
    case 'flat': {
      if (id !== 'flat') inked(ctx, s, id === 'anime' ? '#5a3a1a' : '#111', id === 'anime' ? line * 0.6 : line * 1.2);
      flat(ctx, s);
      if (id === 'flat') {
        ctx.save();
        ctx.clip(outline(s));
        ctx.fillStyle = 'rgba(120,70,20,0.18)';
        ctx.fillRect(s * 0.5, 0, s, s);
        ctx.restore();
      }
      if (id === 'anime') {
        ctx.fillStyle = '#ffffff';
        for (const x of [0.458, 0.548]) { ctx.beginPath(); ctx.arc(s * x, s * 0.338, s * 0.009, 0, Math.PI * 2); ctx.fill(); }
      }
      break;
    }
    case 'lineart':
      linesOnly(ctx, s, line * 0.5);
      break;
    case 'simpleline':
      linesOnly(ctx, s, line * 1.2, false);
      break;
    case 'doodle': {
      inked(ctx, s, '#111', line * 0.8);
      flat(ctx, s, (ink) => (ink === ENVELOPE ? '#ffb347' : ink === STRIPE ? '#fff1c1' : ink));
      const colours = ['#ff3dc8', '#22d3ee', '#34d399', '#8b5cf6'];
      ctx.lineWidth = line * 0.7;
      colours.forEach((one, k) => {
        ctx.strokeStyle = one;
        ctx.beginPath();
        ctx.arc(s * (0.15 + k * 0.23), s * 0.12, s * 0.04, 0, Math.PI * 2);
        ctx.stroke();
      });
      break;
    }
    case 'glass': {
      ctx.fillStyle = '#1e3a5f';
      ctx.fillRect(0, 0, s, s);
      inked(ctx, s, '#111', line * 1.2);
      const shards = ['#e8b04a', '#c98a2c', '#f0cc7a', '#b8742a'];
      ctx.save();
      ctx.clip(outline(s));
      for (let k = 0; k < 8; k += 1) {
        ctx.fillStyle = shards[k % shards.length];
        ctx.beginPath();
        ctx.moveTo(s * (k / 7), 0);
        ctx.lineTo(s * ((k + 1.6) / 7), s * 0.5);
        ctx.lineTo(s * ((k - 0.4) / 7), s);
        ctx.lineTo(s * ((k - 1) / 7), s * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = '#111';
      ctx.lineWidth = line * 0.8;
      for (let k = 1; k < 8; k += 1) {
        ctx.beginPath();
        ctx.moveTo(s * (k / 7), 0);
        ctx.lineTo(s * ((k + 1.6) / 7), s * 0.5);
        ctx.lineTo(s * ((k - 0.4) / 7), s);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = '#111';
      for (const part of balloon(s)) if (part.ink === BAND || part.ink === BASKET) ctx.fill(part.path);
      break;
    }
    case 'crochet':
    case 'plush':
    case 'stitched':
    case 'scrapbook': {
      if (id === 'stitched' || id === 'scrapbook') { ctx.fillStyle = '#e9e1d0'; ctx.fillRect(0, 0, s, s); }
      for (const part of balloon(s)) {
        ctx.save();
        ctx.clip(part.path);
        ctx.fillStyle = part.ink;
        ctx.fillRect(0, 0, s, s);
        if (id === 'crochet') {
          ctx.strokeStyle = 'rgba(0,0,0,0.22)';
          ctx.lineWidth = Math.max(1, s / 120);
          const step = s / 22;
          for (let y = 0; y < s; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < s; x += step) {
            ctx.beginPath();
            ctx.ellipse(x, y, step * 0.42, step * 0.32, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (id === 'plush') {
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = 1;
          for (let k = 0; k < 400; k += 1) {
            const x = ((k * 97) % 1000) / 1000 * s;
            const y = ((k * 61) % 1000) / 1000 * s;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + s / 60, y - s / 50);
            ctx.stroke();
          }
        } else if (id === 'stitched') {
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = line * 0.5;
          ctx.setLineDash([line * 1.2, line * 0.6]);
          for (let k = -s; k < s * 2; k += line * 1.1) {
            ctx.beginPath();
            ctx.moveTo(k, 0);
            ctx.lineTo(k - s * 0.4, s);
            ctx.stroke();
          }
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          for (let k = 0; k < 120; k += 1) ctx.fillRect(((k * 37) % 100) / 100 * s, ((k * 71) % 100) / 100 * s, 2, 2);
        }
        ctx.restore();
      }
      if (id === 'scrapbook' || id === 'plush') {
        ctx.strokeStyle = id === 'plush' ? 'rgba(120,80,40,0.5)' : 'rgba(255,255,255,0.9)';
        ctx.lineWidth = line * 0.5;
        ctx.setLineDash([line, line * 0.7]);
        for (const part of balloon(s)) if (part.shape) ctx.stroke(part.path);
        ctx.setLineDash([]);
      }
      break;
    }
    case 'cutout': {
      ctx.fillStyle = '#cfe8f5';
      ctx.fillRect(0, 0, s, s);
      for (const part of balloon(s)) {
        ctx.shadowColor = 'rgba(0,0,0,0.28)';
        ctx.shadowBlur = s / 30;
        ctx.shadowOffsetY = s / 70;
        ctx.fillStyle = part.ink;
        ctx.fill(part.path);
      }
      ctx.shadowColor = 'transparent';
      break;
    }
    case 'vintage': {
      flat(ctx, s, (ink) => (ink === BASKET || ink === BAND ? '#3b2a1a' : '#b08a5a'));
      const v = ctx.createRadialGradient(s / 2, s / 2, s * 0.25, s / 2, s / 2, s * 0.72);
      v.addColorStop(0, 'rgba(112,66,20,0.05)');
      v.addColorStop(1, 'rgba(60,35,10,0.55)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, s, s);
      break;
    }
    case 'sticker': {
      ctx.fillStyle = '#c7e9f5';
      ctx.fillRect(0, 0, s, s);
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = s / 16;
      ctx.shadowOffsetY = s / 40;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = line * 3.2;
      ctx.lineJoin = 'round';
      ctx.stroke(outline(s));
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#ffffff';
      ctx.fill(outline(s));
      flat(ctx, s);
      break;
    }
    default:
      flat(ctx, s);
      /* The newer styles have no hand-drawn balloon of their own: the plain
         one, in the same likeness the photo gets (`stylepreview.ts`). */
      if ((PREVIEWED as readonly string[]).includes(id)) previewStyle(ctx, s, id);
  }
  ctx.restore();
}
