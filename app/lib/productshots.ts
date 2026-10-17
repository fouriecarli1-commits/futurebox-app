/**
 * A product photographed in a scene it was never in.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 16 October 2026, on her phone: *"Generate product photos in
 * seconds."* Planned on the 17th: her own product — off the post, or brought
 * in — set on marble, on a beach, on a podium, in a kitchen, and lit as if it
 * had been there, by the same engine and route as the magic touch.
 *
 * ── The one thing that must not change ───────────────────────────────────
 *
 * The product. A picture model asked to "show this candle on a beach" will
 * happily draw a nicer candle, and a nicer candle is not hers: a shop that
 * posts it is advertising something it does not sell. So the sentence says
 * it more than once and in the plainest words available — the same shape,
 * colours, label and lettering, not redrawn — and says it before the scene,
 * because the scene is the part that is allowed to be invented.
 *
 * Pure strings — `check:productshots` reads every sentence this sends.
 */

export interface ProductScene {
  readonly id: string;
  readonly en: string;
  readonly af: string;
  /** The setting, as the engine is asked for it. */
  readonly scene: string;
  /** Two colours for its tile. */
  readonly tile: readonly [string, string];
}

export const PRODUCT_SCENES: readonly ProductScene[] = [
  { id: 'white', en: 'Clean white', af: 'Skoon wit', tile: ['#ffffff', '#e5e7eb'],
    scene: 'a seamless pure white studio backdrop, soft even light, a gentle shadow under the product — a clean shop listing' },
  { id: 'colour', en: 'Colour studio', af: 'Kleurateljee', tile: ['#f472b6', '#fb923c'],
    scene: 'a seamless studio backdrop in a bold colour that complements the product, crisp studio light, a soft shadow' },
  { id: 'podium', en: 'Pastel podium', af: 'Pastel-podium', tile: ['#c4b5fd', '#fbcfe8'],
    scene: 'standing on a round pastel podium with simple geometric shapes around it, soft studio light, a modern showcase' },
  { id: 'marble', en: 'Marble', af: 'Marmer', tile: ['#f8fafc', '#94a3b8'],
    scene: 'on a polished white marble surface with soft window light and a subtle reflection, elegant and premium' },
  { id: 'wood', en: 'Wooden table', af: 'Houttafel', tile: ['#a16207', '#fde68a'],
    scene: 'on a warm natural wooden table with soft morning light from a window, a few out-of-focus homely details behind' },
  { id: 'kitchen', en: 'Kitchen', af: 'Kombuis', tile: ['#fef3c7', '#65a30d'],
    scene: 'on a bright modern kitchen counter with fresh ingredients softly blurred around it, natural daylight' },
  { id: 'bathroom', en: 'Bathroom shelf', af: 'Badkamerrak', tile: ['#e0f2fe', '#f5f5f4'],
    scene: 'on a clean spa-like bathroom shelf with towels and a plant softly blurred, calm daylight' },
  { id: 'beach', en: 'Beach', af: 'Strand', tile: ['#38bdf8', '#fde68a'],
    scene: 'on smooth sand at the beach with the sea softly blurred behind, warm late-afternoon sun and a long natural shadow' },
  { id: 'nature', en: 'Nature', af: 'Natuur', tile: ['#15803d', '#bbf7d0'],
    scene: 'on a mossy rock among ferns and leaves in a forest, dappled sunlight, fresh and natural' },
  { id: 'flowers', en: 'Flowers', af: 'Blomme', tile: ['#f9a8d4', '#fef9c3'],
    scene: 'surrounded by fresh flowers and petals, soft romantic light, gentle pastel colours' },
  { id: 'water', en: 'Water splash', af: 'Waterspat', tile: ['#0ea5e9', '#e0f2fe'],
    scene: 'with a fresh splash of clear water around it frozen in mid-air, droplets catching bright crisp light, a cool backdrop' },
  { id: 'luxury', en: 'Luxury', af: 'Luukse', tile: ['#111827', '#d4af37'],
    scene: 'on dark velvet with gold accents, dramatic low-key light, rich and luxurious' },
  { id: 'urban', en: 'Urban', af: 'Stad', tile: ['#525252', '#f97316'],
    scene: 'on a raw concrete ledge in a city setting with soft street light and blurred buildings behind, modern and edgy' },
  { id: 'festive', en: 'Festive', af: 'Feestelik', tile: ['#dc2626', '#16a34a'],
    scene: 'in a festive holiday setting with warm fairy lights glowing softly behind, ribbons and a cosy mood' },
  { id: 'hands', en: 'In a hand', af: 'In ’n hand', tile: ['#fcd34d', '#fb7185'],
    scene: 'held naturally in a person’s hand at a comfortable angle, only the hand and wrist in view, a soft lifestyle background' },
];

export function sceneById(id: string): ProductScene | undefined {
  return PRODUCT_SCENES.find((one) => one.id === id);
}

export const PRODUCT_SIZES = [
  { id: 'square', aspect: '1:1', en: 'Square', af: 'Vierkant' },
  { id: 'portrait', aspect: '3:4', en: 'Tall post', af: 'Hoë plasing' },
  { id: 'story', aspect: '9:16', en: 'Story 9:16', af: 'Storie 9:16' },
] as const;
export type ProductSize = (typeof PRODUCT_SIZES)[number]['id'];

export const MOST_EXTRA = 200;

const KEEP = 'The attached picture shows the product. Reproduce the product exactly as it is — the same shape, proportions, colours, materials, label, lettering and logo on it. Do not redraw, restyle, recolour, reletter or improve it; it must be recognisably the same item.';
const LIGHT = 'Light the product to match the setting, with a natural contact shadow and reflections where the surface would give them, so it sits in the scene rather than on top of it. The product is the clear hero: sharp, in focus, filling a good part of the frame.';
const CLEAN = 'Add no text, logos, price tags or watermarks besides what is on the product itself. A professional product photograph, photographic and realistic.';

/** The sentence sent to the picture route. */
export function productAsk(sceneId: string, extra = ''): string {
  const scene = sceneById(sceneId) ?? PRODUCT_SCENES[0];
  const more = extra.replace(/\s+/g, ' ').trim().slice(0, MOST_EXTRA);
  return [
    KEEP,
    `Place it ${scene.scene}.`,
    more ? `Also: ${more}.` : '',
    LIGHT,
    CLEAN,
    /* Said again last: the end of a long instruction is what a model
       weighs, and this is the one part of it that may not be traded away. */
    'Keep the product itself unchanged.',
  ].filter(Boolean).join(' ');
}
