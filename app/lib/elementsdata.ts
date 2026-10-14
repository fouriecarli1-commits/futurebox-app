/**
 * Curated elements library for FutureBox Studio (the elements panel).
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli: *"Die Photo editor moet ook 'n QR Code generator hê, en verskillende
 * templates om dit in te sit. En allerhande searchable graphics, animations, audio.
 * O ja, alles wat jy doen, moet jy in beide doen, in die enegelse blad, en
 * afrikaans vir die afrikaanse blad."*
 *
 * Screenshots:
 *   - Shapes: Lines, Basic shapes, Polygons, Stars, Arrows, Flowchart shapes.
 *   - Graphics: Magic recommendations, Featured (Springbok, toast, WhatsApp),
 *     Gradients, Animations, Social Media.
 *   - Animations: Arrow animations, Word animations, Food animations,
 *     Shape animations, Emoji animations.
 *   - Audio: Voiceovers (AI voice), Recently used, Magic recommendations,
 *     Upbeat music tracks with live audio previews.
 */

export type ElementCategory =
  | 'shapes'
  | 'graphics'
  | 'threed'
  | 'animations'
  | 'photos'
  | 'frames'
  | 'grids'
  | 'videos'
  | 'audio'
  | 'forms'
  | 'mockups'
  | 'charts'
  | 'sheets'
  | 'tables';

export interface ElementCategoryMeta {
  readonly id: ElementCategory;
  readonly nameKey: string;
  readonly nameEn: string;
  readonly nameAf: string;
  readonly colorGradient: string;
  readonly iconType: string;
}

export const ELEMENT_CATEGORIES: readonly ElementCategoryMeta[] = [
  {
    id: 'shapes',
    nameKey: 'elem.catShapes',
    nameEn: 'Shapes',
    nameAf: 'Vorme',
    colorGradient: 'from-teal-400 to-emerald-500',
    iconType: 'shapes',
  },
  {
    id: 'graphics',
    nameKey: 'elem.catGraphics',
    nameEn: 'Graphics',
    nameAf: 'Grafika',
    colorGradient: 'from-amber-400 to-orange-500',
    iconType: 'flower',
  },
  {
    id: 'animations',
    nameKey: 'elem.catAnimations',
    nameEn: 'Animations',
    nameAf: 'Animasies',
    colorGradient: 'from-lime-400 to-emerald-500',
    iconType: 'smile',
  },
  {
    id: 'audio',
    nameKey: 'elem.catAudio',
    nameEn: 'Audio',
    nameAf: 'Klank',
    colorGradient: 'from-red-400 to-rose-600',
    iconType: 'music',
  },
  {
    id: 'threed',
    nameKey: 'elem.cat3D',
    nameEn: '3D Models',
    nameAf: '3D-Modelle',
    colorGradient: 'from-fuchsia-500 to-pink-500',
    iconType: 'box3d',
  },
  {
    id: 'photos',
    nameKey: 'elem.catPhotos',
    nameEn: 'Photos',
    nameAf: 'Foto’s',
    colorGradient: 'from-sky-400 to-blue-500',
    iconType: 'photo',
  },
  {
    id: 'frames',
    nameKey: 'elem.catFrames',
    nameEn: 'Frames',
    nameAf: 'Rame',
    colorGradient: 'from-emerald-400 to-teal-500',
    iconType: 'frame',
  },
  {
    id: 'grids',
    nameKey: 'elem.catGrids',
    nameEn: 'Grids',
    nameAf: 'Roosters',
    colorGradient: 'from-purple-400 to-indigo-500',
    iconType: 'grid',
  },
  {
    id: 'videos',
    nameKey: 'elem.catVideos',
    nameEn: 'Videos',
    nameAf: 'Video’s',
    colorGradient: 'from-pink-500 to-rose-500',
    iconType: 'video',
  },
  {
    id: 'forms',
    nameKey: 'elem.catForms',
    nameEn: 'Forms',
    nameAf: 'Vorms',
    colorGradient: 'from-emerald-500 to-green-600',
    iconType: 'toggle',
  },
  {
    id: 'mockups',
    nameKey: 'elem.catMockups',
    nameEn: 'Mockups',
    nameAf: 'Mockups',
    colorGradient: 'from-cyan-400 to-teal-500',
    iconType: 'shirt',
  },
  {
    id: 'charts',
    nameKey: 'elem.catCharts',
    nameEn: 'Charts',
    nameAf: 'Grafieke',
    colorGradient: 'from-violet-400 to-purple-600',
    iconType: 'chart',
  },
  {
    id: 'sheets',
    nameKey: 'elem.catSheets',
    nameEn: 'Sheets',
    nameAf: 'Sigblaaie',
    colorGradient: 'from-blue-400 to-indigo-600',
    iconType: 'sheet',
  },
  {
    id: 'tables',
    nameKey: 'elem.catTables',
    nameEn: 'Tables',
    nameAf: 'Tabelle',
    colorGradient: 'from-orange-400 to-amber-600',
    iconType: 'table',
  },
];

export interface StudioElementItem {
  readonly id: string;
  readonly nameKey: string;
  readonly nameEn: string;
  readonly nameAf: string;
  readonly category: ElementCategory;
  readonly subcategory?: string;
  readonly keywords: readonly string[];
  readonly previewSvg: string;
  readonly aspectRatio?: number;
  readonly isFrame?: boolean;
  readonly hasCrown?: boolean;
  readonly artist?: string;
  readonly duration?: string;
  readonly audioType?: 'pop' | 'piano' | 'ambient' | 'upbeat';
}

const encodeSvg = (svg: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;

export const STUDIO_ELEMENTS: readonly StudioElementItem[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. SHAPES (Screenshot 1)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ── Lines ──
  {
    id: 'shape_line_solid',
    nameKey: 'elem.lineSolid',
    nameEn: 'Solid Line',
    nameAf: 'Soliede Lyn',
    category: 'shapes',
    subcategory: 'lines',
    keywords: ['line', 'solid', 'lyn', 'reguit'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <line x1="5" y1="50" x2="95" y2="50" stroke="#000000" stroke-width="6" stroke-linecap="round" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_line_dashed',
    nameKey: 'elem.lineDashed',
    nameEn: 'Dashed Line',
    nameAf: 'Gestreepte Lyn',
    category: 'shapes',
    subcategory: 'lines',
    keywords: ['dashed', 'line', 'strepies', 'stippellyn'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <line x1="5" y1="50" x2="95" y2="50" stroke="#000000" stroke-width="6" stroke-dasharray="14 10" stroke-linecap="round" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_line_dotted',
    nameKey: 'elem.lineDotted',
    nameEn: 'Dotted Line',
    nameAf: 'Stippellyn',
    category: 'shapes',
    subcategory: 'lines',
    keywords: ['dotted', 'line', 'kolletjies', 'punte'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <line x1="5" y1="50" x2="95" y2="50" stroke="#000000" stroke-width="6" stroke-dasharray="2 12" stroke-linecap="round" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_line_arrow',
    nameKey: 'elem.lineArrow',
    nameEn: 'Arrow Line',
    nameAf: 'Pyl-lyn',
    category: 'shapes',
    subcategory: 'lines',
    keywords: ['arrow', 'line', 'pyl', 'lyn'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <line x1="5" y1="50" x2="80" y2="50" stroke="#000000" stroke-width="5" />
        <polygon points="76,38 95,50 76,62" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_line_double_arrow',
    nameKey: 'elem.lineDoubleArrow',
    nameEn: 'Double Arrow Line',
    nameAf: 'Dubbelpunt Pyl-lyn',
    category: 'shapes',
    subcategory: 'lines',
    keywords: ['double', 'arrow', 'line', 'dubbelpyl'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <line x1="15" y1="50" x2="85" y2="50" stroke="#000000" stroke-width="4" />
        <polyline points="20,40 6,50 20,60" fill="none" stroke="#000000" stroke-width="4" stroke-linecap="round" />
        <polyline points="80,40 94,50 80,60" fill="none" stroke="#000000" stroke-width="4" stroke-linecap="round" />
      </svg>
    `),
    aspectRatio: 1,
  },

  // ── Basic shapes ──
  {
    id: 'shape_rect_square',
    nameKey: 'elem.shapeSquare',
    nameEn: 'Black Square',
    nameAf: 'Swart Vierkant',
    category: 'shapes',
    subcategory: 'basic',
    keywords: ['square', 'vierkant', 'blok'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="8" y="8" width="84" height="84" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_arch',
    nameKey: 'elem.shapeArch',
    nameEn: 'Arch',
    nameAf: 'Boog',
    category: 'shapes',
    subcategory: 'basic',
    keywords: ['arch', 'boog', 'venster', 'rond'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M10 90 L10 50 A 40 40 0 0 1 90 50 L90 90 Z" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_rect_rounded',
    nameKey: 'elem.shapeRounded',
    nameEn: 'Rounded Square',
    nameAf: 'Afgeronde Vierkant',
    category: 'shapes',
    subcategory: 'basic',
    keywords: ['square', 'rounded', 'vierkant', 'blok'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="8" y="8" width="84" height="84" rx="20" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_squircle_flower',
    nameKey: 'elem.shapeFlowerSquircle',
    nameEn: 'Flower Squircle',
    nameAf: 'Blom-vorm',
    category: 'shapes',
    subcategory: 'basic',
    keywords: ['flower', 'squircle', 'blom', 'klaver'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M50 10 C35 10 35 35 10 35 C10 65 35 65 35 90 C65 90 65 65 90 65 C90 35 65 35 65 10 Z" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_circle',
    nameKey: 'elem.shapeCircle',
    nameEn: 'Circle',
    nameAf: 'Sirkel',
    category: 'shapes',
    subcategory: 'basic',
    keywords: ['circle', 'round', 'sirkel', 'rond'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_triangle',
    nameKey: 'elem.shapeTriangle',
    nameEn: 'Triangle',
    nameAf: 'Driehoek',
    category: 'shapes',
    subcategory: 'basic',
    keywords: ['triangle', 'driehoek'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="50,10 92,90 8,90" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_triangle_inverted',
    nameKey: 'elem.shapeInvertedTriangle',
    nameEn: 'Inverted Triangle',
    nameAf: 'Omgekeerde Driehoek',
    category: 'shapes',
    subcategory: 'basic',
    keywords: ['triangle', 'inverted', 'omgekeerd'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="8,10 92,10 50,90" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },

  // ── Polygons ──
  {
    id: 'shape_poly_pentagon',
    nameKey: 'elem.polyPentagon',
    nameEn: 'Pentagon',
    nameAf: 'Vyfhoek',
    category: 'shapes',
    subcategory: 'polygons',
    keywords: ['pentagon', 'vyfhoek', 'poly'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="50,8 94,39 77,90 23,90 6,39" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_poly_hexagon',
    nameKey: 'elem.polyHexagon',
    nameEn: 'Hexagon',
    nameAf: 'Seshoek',
    category: 'shapes',
    subcategory: 'polygons',
    keywords: ['hexagon', 'seshoek'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="50,6 92,28 92,72 50,94 8,72 8,28" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_poly_octagon',
    nameKey: 'elem.polyOctagon',
    nameEn: 'Octagon',
    nameAf: 'Agthoek',
    category: 'shapes',
    subcategory: 'polygons',
    keywords: ['octagon', 'agthoek', 'stop'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="30,8 70,8 92,30 92,70 70,92 30,92 8,70 8,30" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },

  // ── Stars ──
  {
    id: 'shape_star_4',
    nameKey: 'elem.star4',
    nameEn: 'Sparkle Star (4-Point)',
    nameAf: 'Fonkelster (4-Punt)',
    category: 'shapes',
    subcategory: 'stars',
    keywords: ['star', 'sparkle', 'fonkel', 'ster'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M50 5 Q50 50 95 50 Q50 50 50 95 Q50 50 5 50 Q50 50 50 5 Z" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_star_5',
    nameKey: 'elem.star5',
    nameEn: 'Classic Star (5-Point)',
    nameAf: 'Klassieke Ster (5-Punt)',
    category: 'shapes',
    subcategory: 'stars',
    keywords: ['star', 'ster', 'vyfpunt'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_star_8',
    nameKey: 'elem.star8',
    nameEn: 'Burst Star (8-Point)',
    nameAf: 'Sonkragster (8-Punt)',
    category: 'shapes',
    subcategory: 'stars',
    keywords: ['star', 'burst', 'sonster'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="50,4 62,34 94,22 76,50 94,78 62,66 50,96 38,66 6,78 24,50 6,22 38,34" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },

  // ── Arrows ──
  {
    id: 'shape_arrow_right',
    nameKey: 'elem.arrowRight',
    nameEn: 'Thick Right Arrow',
    nameAf: 'Dik Regspyl',
    category: 'shapes',
    subcategory: 'arrows',
    keywords: ['arrow', 'right', 'pyl', 'regs'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="8,35 55,35 55,15 94,50 55,85 55,65 8,65" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_arrow_left',
    nameKey: 'elem.arrowLeft',
    nameEn: 'Thick Left Arrow',
    nameAf: 'Dik Linkspyl',
    category: 'shapes',
    subcategory: 'arrows',
    keywords: ['arrow', 'left', 'pyl', 'links'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="92,35 45,35 45,15 6,50 45,85 45,65 92,65" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_arrow_up',
    nameKey: 'elem.arrowUp',
    nameEn: 'Thick Up Arrow',
    nameAf: 'Dik Boontoe-pyl',
    category: 'shapes',
    subcategory: 'arrows',
    keywords: ['arrow', 'up', 'boontoe', 'op'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="35,92 35,45 15,45 50,6 85,45 65,45 65,92" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_arrow_down',
    nameKey: 'elem.arrowDown',
    nameEn: 'Thick Down Arrow',
    nameAf: 'Dik Ondertoe-pyl',
    category: 'shapes',
    subcategory: 'arrows',
    keywords: ['arrow', 'down', 'ondertoe', 'af'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="35,8 35,55 15,55 50,94 85,55 65,55 65,8" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_arrow_double_horiz',
    nameKey: 'elem.arrowDoubleHoriz',
    nameEn: 'Double Arrow',
    nameAf: 'Dubbelrigting Pyl',
    category: 'shapes',
    subcategory: 'arrows',
    keywords: ['arrow', 'double', 'tweerigting'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="6,50 35,20 35,38 65,38 65,20 94,50 65,80 65,62 35,62 35,80" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },

  // ── Flowchart ──
  {
    id: 'shape_flow_hex',
    nameKey: 'elem.flowHex',
    nameEn: 'Flowchart Preparation',
    nameAf: 'Vloeidiagram Voorbereiding',
    category: 'shapes',
    subcategory: 'flowchart',
    keywords: ['flowchart', 'vloeidiagram', 'heksagoon'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="20,20 80,20 95,50 80,80 20,80 5,50" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_flow_pill',
    nameKey: 'elem.flowPill',
    nameEn: 'Flowchart Terminator',
    nameAf: 'Vloeidiagram Begin/Einde',
    category: 'shapes',
    subcategory: 'flowchart',
    keywords: ['flowchart', 'pill', 'kapsule', 'einde'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="8" y="24" width="84" height="52" rx="26" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_flow_diamond',
    nameKey: 'elem.flowDiamond',
    nameEn: 'Flowchart Decision',
    nameAf: 'Vloeidiagram Besluit',
    category: 'shapes',
    subcategory: 'flowchart',
    keywords: ['flowchart', 'decision', 'diamant', 'besluit'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="50,10 92,50 50,90 8,50" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },

  // ── Speech bubbles (Screenshot 2) ──
  {
    id: 'shape_bubble_rect',
    nameKey: 'elem.bubbleRect',
    nameEn: 'Square Speech Bubble',
    nameAf: 'Vierkant Praatborrel',
    category: 'shapes',
    subcategory: 'speech',
    keywords: ['speech', 'bubble', 'chat', 'praatborrel'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M10 15 L90 15 L90 70 L35 70 L15 88 L22 70 L10 70 Z" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_bubble_oval',
    nameKey: 'elem.bubbleOval',
    nameEn: 'Oval Speech Bubble',
    nameAf: 'Ovaal Praatborrel',
    category: 'shapes',
    subcategory: 'speech',
    keywords: ['speech', 'oval', 'praat', 'gesels'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <ellipse cx="50" cy="45" rx="42" ry="32" fill="#000000" />
        <polygon points="30,70 18,88 44,74" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_bubble_cloud',
    nameKey: 'elem.bubbleCloud',
    nameEn: 'Thought Cloud Bubble',
    nameAf: 'Gedagte-wolkborrel',
    category: 'shapes',
    subcategory: 'speech',
    keywords: ['thought', 'cloud', 'dink', 'gedagte'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M30 65 A 18 18 0 0 1 18 42 A 18 18 0 0 1 35 24 A 22 22 0 0 1 70 24 A 18 18 0 0 1 85 45 A 18 18 0 0 1 74 65 Z" fill="#000000" />
        <circle cx="24" cy="76" r="5" fill="#000000" />
        <circle cx="16" cy="86" r="3.5" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },

  // ── Clouds (Screenshot 2) ──
  {
    id: 'shape_cloud_puffy',
    nameKey: 'elem.cloudPuffy',
    nameEn: 'Puffy Cloud',
    nameAf: 'Pofwolk',
    category: 'shapes',
    subcategory: 'clouds',
    keywords: ['cloud', 'wolk', 'weer'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M25 65 A 15 15 0 0 1 18 45 A 18 18 0 0 1 38 28 A 22 22 0 0 1 72 32 A 16 16 0 0 1 85 52 A 15 15 0 0 1 75 65 Z" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_cloud_flat',
    nameKey: 'elem.cloudFlat',
    nameEn: 'Flat Base Cloud',
    nameAf: 'Platbasis Wolk',
    category: 'shapes',
    subcategory: 'clouds',
    keywords: ['cloud', 'flat', 'wolk'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M15 70 L 85 70 A 14 14 0 0 0 85 45 A 18 18 0 0 0 55 35 A 16 16 0 0 0 25 45 A 14 14 0 0 0 15 70 Z" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },

  // ── Hearts (Screenshot 2) ──
  {
    id: 'shape_heart_classic',
    nameKey: 'elem.heartClassic',
    nameEn: 'Classic Heart',
    nameAf: 'Klassieke Hart',
    category: 'shapes',
    subcategory: 'hearts',
    keywords: ['heart', 'hart', 'liefde'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M50 88 C20 60 5 45 5 28 C5 14 16 5 28 5 C38 5 46 12 50 20 C54 12 62 5 72 5 C84 5 95 14 95 28 C95 45 80 60 50 88 Z" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_heart_rounded',
    nameKey: 'elem.heartRounded',
    nameEn: 'Rounded Heart',
    nameAf: 'Ronde Sagte Hart',
    category: 'shapes',
    subcategory: 'hearts',
    keywords: ['heart', 'rounded', 'sag', 'hart'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M50 84 C25 62 10 48 10 32 C10 18 20 8 32 8 C40 8 46 14 50 20 C54 14 60 8 68 8 C80 8 90 18 90 32 C90 48 75 62 50 84 Z" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },

  // ── Banners (Screenshot 2) ──
  {
    id: 'shape_banner_ribbon',
    nameKey: 'elem.bannerRibbon',
    nameEn: 'Ribbon Banner',
    nameAf: 'Lint-banier',
    category: 'shapes',
    subcategory: 'banners',
    keywords: ['banner', 'ribbon', 'lint', 'banier'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="10,32 90,32 80,52 90,72 10,72 20,52" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'shape_banner_pennant',
    nameKey: 'elem.bannerPennant',
    nameEn: 'Pennant Flag',
    nameAf: 'Wimpel Vlag',
    category: 'shapes',
    subcategory: 'banners',
    keywords: ['banner', 'flag', 'wimpel', 'vlag'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="18,15 82,15 82,85 50,70 18,85" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },

  // ── Teardrops (Screenshot 2) ──
  {
    id: 'shape_teardrop_sharp',
    nameKey: 'elem.teardropSharp',
    nameEn: 'Sharp Teardrop',
    nameAf: 'Skerp Waterdruppel',
    category: 'shapes',
    subcategory: 'teardrops',
    keywords: ['teardrop', 'water', 'druppel', 'traan'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M50 10 C50 10 20 50 20 68 A 30 30 0 0 0 80 68 C80 50 50 10 50 10 Z" fill="#000000" />
      </svg>
    `),
    aspectRatio: 1,
  },

  // ── Cogs & Gears (Screenshot 2) ──
  {
    id: 'shape_cog_8',
    nameKey: 'elem.cog8',
    nameEn: 'Gear Cog (8-Tooth)',
    nameAf: 'Ratwiel (8-Tand)',
    category: 'shapes',
    subcategory: 'cogs',
    keywords: ['gear', 'cog', 'ratwiel', 'enjin'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="32" fill="#000000" />
        <rect x="44" y="8" width="12" height="84" rx="3" fill="#000000" />
        <rect x="8" y="44" width="84" height="12" rx="3" fill="#000000" />
        <rect x="44" y="8" width="12" height="84" rx="3" fill="#000000" transform="rotate(45 50 50)" />
        <rect x="44" y="8" width="12" height="84" rx="3" fill="#000000" transform="rotate(-45 50 50)" />
        <circle cx="50" cy="50" r="16" fill="#ffffff" />
      </svg>
    `),
    aspectRatio: 1,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. GRAPHICS (Screenshot 4)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'graphic_skirt_pink',
    nameKey: 'elem.graphicSkirtPink',
    nameEn: 'Pink Pleated Skirt',
    nameAf: 'Pienk Plooirok',
    category: 'graphics',
    subcategory: 'recent',
    keywords: ['skirt', 'pink', 'rok', 'plooirok', 'klere'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M30 18 L70 18 L88 84 L12 84 Z" fill="#ec4899" />
        <line x1="40" y1="18" x2="32" y2="84" stroke="#db2777" stroke-width="3" />
        <line x1="50" y1="18" x2="50" y2="84" stroke="#db2777" stroke-width="3" />
        <line x1="60" y1="18" x2="68" y2="84" stroke="#db2777" stroke-width="3" />
        <rect x="28" y="14" width="44" height="8" rx="2" fill="#be185d" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'graphic_brush_stroke',
    nameKey: 'elem.graphicBrushStroke',
    nameEn: 'Watercolor Brush Stroke',
    nameAf: 'Waterverf Kwasstreep',
    category: 'graphics',
    subcategory: 'recent',
    hasCrown: true,
    keywords: ['brush', 'watercolor', 'verf', 'kwasstreep'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M10 40 Q 30 32, 50 38 T 90 35 Q 96 48, 88 60 T 45 56 Q 20 62, 10 52 Z" fill="#f87171" opacity="0.85" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'graphic_arrow_sketch',
    nameKey: 'elem.graphicArrowSketch',
    nameEn: 'Hand-drawn Doodle Arrow',
    nameAf: 'Handgetekende Skets-pyl',
    category: 'graphics',
    subcategory: 'recent',
    hasCrown: true,
    keywords: ['doodle', 'arrow', 'skets', 'handtekening'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M85 30 Q 50 25, 20 48" fill="none" stroke="#000000" stroke-width="5" stroke-linecap="round" />
        <polyline points="32,32 18,48 36,58" fill="none" stroke="#000000" stroke-width="5" stroke-linecap="round" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'graphic_shirt_blue',
    nameKey: 'elem.graphicShirtBlue',
    nameEn: 'Collared Blue Shirt',
    nameAf: 'Blou Kraaghemp',
    category: 'graphics',
    subcategory: 'magic',
    keywords: ['shirt', 'blue', 'hemp', 'klere'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M30 18 L10 36 L24 48 L32 38 L32 90 L68 90 L68 38 L76 48 L90 36 L70 18 Z" fill="#38bdf8" />
        <polygon points="50,26 34,16 46,12" fill="#0284c7" />
        <polygon points="50,26 66,16 54,12" fill="#0284c7" />
        <line x1="50" y1="26" x2="50" y2="90" stroke="#0284c7" stroke-width="2" />
        <circle cx="50" cy="38" r="2" fill="#facc15" />
        <circle cx="50" cy="52" r="2" fill="#facc15" />
        <circle cx="50" cy="66" r="2" fill="#facc15" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'graphic_skirt_teal',
    nameKey: 'elem.graphicSkirtTeal',
    nameEn: 'Teal Pleated Skirt',
    nameAf: 'Groenblou Plooirok',
    category: 'graphics',
    subcategory: 'magic',
    keywords: ['skirt', 'teal', 'rokgroen', 'plooi'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M32 20 L68 20 L86 82 L14 82 Z" fill="#0d9488" />
        <rect x="14" y="80" width="72" height="6" fill="#facc15" />
        <line x1="42" y1="20" x2="36" y2="80" stroke="#0f766e" stroke-width="3" />
        <line x1="58" y1="20" x2="64" y2="80" stroke="#0f766e" stroke-width="3" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'graphic_sock_blue',
    nameKey: 'elem.graphicSockBlue',
    nameEn: 'Striped Cozy Sock',
    nameAf: 'Gestreepte Kous',
    category: 'graphics',
    subcategory: 'magic',
    keywords: ['sock', 'striped', 'kous', 'klere'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M40 10 L68 10 L68 55 Q 68 75, 88 80 L80 92 Q 45 92, 38 65 L40 10 Z" fill="#7dd3fc" stroke="#0284c7" stroke-width="2" />
        <line x1="40" y1="20" x2="68" y2="20" stroke="#ffffff" stroke-width="3" />
        <line x1="40" y1="30" x2="68" y2="30" stroke="#ffffff" stroke-width="3" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'graphic_springbok',
    nameKey: 'elem.graphicSpringbok',
    nameEn: 'Jumping Springbok',
    nameAf: 'Springende Springbok',
    category: 'graphics',
    subcategory: 'featured',
    keywords: ['springbok', 'gazelle', 'bok', 'suid-afrika', 'sport'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <!-- Stylized jumping Springbok antelope -->
        <path d="M80 18 Q 74 12, 70 20 L 64 26 Q 52 32, 40 38 L 22 36 L 8 46 L 16 52 L 32 44 Q 44 42, 54 48 L 62 60 L 68 56 L 62 44 Q 72 38, 80 30 L 86 32 L 88 24 Z" fill="#d97706" />
        <path d="M38 42 Q 50 42, 60 48 L 56 62 L 50 60 L 52 48 Z" fill="#ffffff" />
        <path d="M72 14 L 78 4" stroke="#451a03" stroke-width="2.5" stroke-linecap="round" />
        <path d="M76 16 L 84 8" stroke="#451a03" stroke-width="2.5" stroke-linecap="round" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'graphic_toast_cheese',
    nameKey: 'elem.graphicToastCheese',
    nameEn: 'Grilled Cheese Toast',
    nameAf: 'Geroosterde Kaastoebroodjie',
    category: 'graphics',
    subcategory: 'featured',
    keywords: ['toast', 'cheese', 'toebroodjie', 'brood', 'kos'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M20 32 Q 50 18, 80 30 L 88 68 Q 50 88, 14 74 Z" fill="#b45309" stroke="#78350f" stroke-width="3" />
        <path d="M24 38 Q 50 26, 76 36 L 82 66 Q 50 82, 20 70 Z" fill="#f59e0b" />
        <!-- Melted cheese drip -->
        <path d="M30 68 Q 40 82, 50 72 Q 62 84, 70 70" fill="#facc15" stroke="#eab308" stroke-width="3" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'graphic_whatsapp',
    nameKey: 'elem.graphicWhatsApp',
    nameEn: 'WhatsApp Bubble',
    nameAf: 'WhatsApp Kletsborrel',
    category: 'graphics',
    subcategory: 'featured',
    keywords: ['whatsapp', 'chat', 'boodskap', 'groen'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="48" r="42" fill="#22c55e" />
        <path d="M22 72 L 28 58 Q 20 44, 28 32 Q 40 18, 60 20 Q 80 24, 82 46 Q 82 68, 62 76 Q 44 80, 36 76 Z" fill="#22c55e" />
        <!-- Phone receiver in bubble -->
        <path d="M36 34 Q 38 32, 42 34 L 46 40 Q 48 44, 44 46 L 42 48 Q 44 54, 50 60 L 52 58 Q 54 54, 58 56 L 64 60 Q 66 64, 64 66 L 60 70 Q 54 72, 42 62 Q 32 50, 34 40 Z" fill="#ffffff" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'gradient_linear_dark',
    nameKey: 'elem.gradNoir',
    nameEn: 'Noir Gradient',
    nameAf: 'Donker Gradiënt',
    category: 'graphics',
    subcategory: 'gradient',
    keywords: ['gradient', 'noir', 'swart', 'vervaag'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="gNoir" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#09090b" />
            <stop offset="100%" stop-color="#a1a1aa" />
          </linearGradient>
        </defs>
        <rect x="5" y="5" width="90" height="90" rx="8" fill="url(#gNoir)" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'gradient_cyan_sky',
    nameKey: 'elem.gradCyan',
    nameEn: 'Cyan Horizon Gradient',
    nameAf: 'Siaan Horison-gradiënt',
    category: 'graphics',
    subcategory: 'gradient',
    keywords: ['gradient', 'cyan', 'blou', 'horison'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="gCyan" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="60%" stop-color="#ffffff" />
            <stop offset="100%" stop-color="#06b6d4" />
          </linearGradient>
        </defs>
        <rect x="5" y="5" width="90" height="90" rx="8" fill="url(#gCyan)" stroke="#e4e4e7" stroke-width="1" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'graphic_social_telegram',
    nameKey: 'elem.socialTelegram',
    nameEn: 'Telegram Plane',
    nameAf: 'Telegram Papiervliegtuig',
    category: 'graphics',
    subcategory: 'social',
    keywords: ['telegram', 'social', 'vliegtuig', 'boodskap'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="#0284c7" />
        <path d="M22 50 L 78 26 L 64 74 L 48 58 L 44 68 L 40 56 Z" fill="#ffffff" />
        <polygon points="48,58 64,40 40,56" fill="#cbd5e1" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'graphic_social_medium',
    nameKey: 'elem.socialMedium',
    nameEn: 'Medium Monogram',
    nameAf: 'Medium Monogram',
    category: 'graphics',
    subcategory: 'social',
    keywords: ['medium', 'blog', 'artikels'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill="#000000" />
        <text x="50" y="65" font-family="serif" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle">M</text>
      </svg>
    `),
    aspectRatio: 1,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. ANIMATIONS (Screenshot 5)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'anim_morph_blob',
    nameKey: 'elem.animBlob',
    nameEn: 'Pastel Fluid Blob',
    nameAf: 'Vloeibare Pastel-blob',
    category: 'animations',
    subcategory: 'magic',
    keywords: ['blob', 'fluid', 'pastel', 'vorm'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M25 45 Q 15 20, 48 24 T 84 45 Q 88 80, 52 78 T 20 65 Z" fill="#fdba74" opacity="0.9" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'anim_love_bubbles',
    nameKey: 'elem.animLoveBubbles',
    nameEn: 'Floating Hearts',
    nameAf: 'Drywende Harte',
    category: 'animations',
    subcategory: 'magic',
    keywords: ['hearts', 'love', 'harte', 'liefde'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="85" r="4" fill="#f43f5e" />
        <circle cx="48" cy="65" r="6" fill="#f43f5e" />
        <path d="M50 45 C45 38 35 40 35 48 C35 55 50 62 50 62 C50 62 65 55 65 48 C65 40 55 38 50 45 Z" fill="#fb7185" />
        <circle cx="52" cy="22" r="8" fill="#f43f5e" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'anim_arrow_slide_orange',
    nameKey: 'elem.animArrowOrange',
    nameEn: 'Sliding Orange Arrow',
    nameAf: 'Glyende Oranje Pyl',
    category: 'animations',
    subcategory: 'arrows',
    keywords: ['arrow', 'slide', 'oranje', 'pyl'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="5" y="5" width="90" height="90" rx="18" fill="#e2e8f0" />
        <line x1="20" y1="50" x2="70" y2="50" stroke="#f97316" stroke-width="7" stroke-linecap="round" />
        <polyline points="56,36 74,50 56,64" fill="none" stroke="#f97316" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'anim_arrow_triple_down',
    nameKey: 'elem.animArrowTriple',
    nameEn: 'Triple Downward Arrows',
    nameAf: 'Drievoudige Afwaartse Pyle',
    category: 'animations',
    subcategory: 'arrows',
    keywords: ['arrows', 'down', 'afwaarts', 'drie'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="5" y="5" width="90" height="90" rx="18" fill="#e2e8f0" />
        <line x1="30" y1="28" x2="35" y2="70" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" />
        <polyline points="28,62 35,72 42,64" fill="none" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" />
        <line x1="50" y1="26" x2="50" y2="74" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" />
        <polyline points="43,66 50,76 57,66" fill="none" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" />
        <line x1="70" y1="28" x2="65" y2="70" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" />
        <polyline points="58,64 65,72 72,62" fill="none" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'anim_word_thank',
    nameKey: 'elem.animWordThank',
    nameEn: 'Red "THANK" Script',
    nameAf: 'Rooi "THANK" Skrif',
    category: 'animations',
    subcategory: 'words',
    keywords: ['thank', 'dankie', 'word', 'teks'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="5" y="5" width="90" height="90" rx="18" fill="#e2e8f0" />
        <text x="50" y="58" font-family="cursive, sans-serif" font-weight="900" font-size="22" fill="#ef4444" text-anchor="middle">THANK</text>
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'anim_word_welcome',
    nameKey: 'elem.animWordWelcome',
    nameEn: 'Orange "WELCOME" Script',
    nameAf: 'Oranje "WELCOME" Skrif',
    category: 'animations',
    subcategory: 'words',
    keywords: ['welcome', 'welkom', 'teks'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="5" y="5" width="90" height="90" rx="18" fill="#e2e8f0" />
        <text x="50" y="58" font-family="cursive, sans-serif" font-weight="900" font-size="18" fill="#ea580c" text-anchor="middle">WELCO</text>
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'anim_word_thank_you',
    nameKey: 'elem.animWordThankYou',
    nameEn: 'Bold "THANK YOU" Sticker',
    nameAf: 'Vetgedrukte "THANK YOU" Plakker',
    category: 'animations',
    subcategory: 'words',
    keywords: ['thank you', 'dankie', 'sticker', 'plakker'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="5" y="5" width="90" height="90" rx="18" fill="#e2e8f0" />
        <rect x="12" y="30" width="76" height="40" rx="10" fill="#ffffff" stroke="#000000" stroke-width="3" />
        <text x="50" y="54" font-family="sans-serif" font-weight="900" font-size="14" fill="#000000" text-anchor="middle">THANK YOU</text>
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'anim_food_burger',
    nameKey: 'elem.animFoodBurger',
    nameEn: 'Bouncing Burger',
    nameAf: 'Wipende Burger',
    category: 'animations',
    subcategory: 'food',
    keywords: ['burger', 'food', 'kos', 'hamburger'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <!-- Top bun -->
        <path d="M18 42 Q 50 16, 82 42 Z" fill="#f59e0b" stroke="#000000" stroke-width="3" />
        <!-- Lettuce -->
        <path d="M14 46 Q 30 52, 50 46 Q 70 52, 86 46" fill="none" stroke="#22c55e" stroke-width="5" stroke-linecap="round" />
        <!-- Patty -->
        <rect x="18" y="52" width="64" height="12" rx="6" fill="#78350f" stroke="#000000" stroke-width="3" />
        <!-- Cheese -->
        <polygon points="26,64 50,72 74,64" fill="#facc15" />
        <!-- Bottom bun -->
        <path d="M20 68 L 80 68 Q 80 84, 50 84 Q 20 84, 20 68 Z" fill="#f59e0b" stroke="#000000" stroke-width="3" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'anim_food_boba',
    nameKey: 'elem.animFoodBoba',
    nameEn: 'Boba Bubble Tea',
    nameAf: 'Boba Borreltee',
    category: 'animations',
    subcategory: 'food',
    keywords: ['boba', 'tea', 'borreltee', 'drankie'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <!-- Cup -->
        <path d="M28 28 L 35 84 Q 50 90, 65 84 L 72 28 Z" fill="#fdba74" stroke="#000000" stroke-width="3" />
        <!-- Lid -->
        <path d="M24 28 Q 50 22, 76 28 Z" fill="#e2e8f0" stroke="#000000" stroke-width="3" />
        <!-- Straw -->
        <line x1="50" y1="6" x2="48" y2="45" stroke="#ef4444" stroke-width="6" stroke-linecap="round" />
        <!-- Boba pearls -->
        <circle cx="42" cy="74" r="4" fill="#0f172a" />
        <circle cx="56" cy="76" r="4" fill="#0f172a" />
        <circle cx="48" cy="66" r="4" fill="#0f172a" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'anim_food_ramen',
    nameKey: 'elem.animFoodRamen',
    nameEn: 'Steaming Ramen Bowl',
    nameAf: 'Stoomende Ramen-bak',
    category: 'animations',
    subcategory: 'food',
    keywords: ['ramen', 'soup', 'noedels', 'sop'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <!-- Bowl -->
        <path d="M18 52 Q 50 92, 82 52 Z" fill="#1e293b" stroke="#000000" stroke-width="3" />
        <!-- Noodles -->
        <ellipse cx="50" cy="52" rx="30" ry="8" fill="#facc15" />
        <!-- Egg -->
        <ellipse cx="40" cy="52" rx="8" ry="5" fill="#ffffff" />
        <circle cx="40" cy="52" r="3" fill="#ea580c" />
        <!-- Steam swirls -->
        <path d="M35 38 Q 30 26, 40 18" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
        <path d="M50 36 Q 55 24, 48 16" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
        <path d="M65 38 Q 60 26, 70 18" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'anim_emoji_reactions',
    nameKey: 'elem.animEmojiReactions',
    nameEn: 'Social Reactions Burst',
    nameAf: 'Sosiale Reaksieborrels',
    category: 'animations',
    subcategory: 'emojis',
    keywords: ['reactions', 'like', 'heart', 'reaksies'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="14" fill="#3b82f6" />
        <path d="M46 52 L 50 44 L 54 44 L 54 54 L 46 54 Z" fill="#ffffff" />
        <circle cx="62" cy="40" r="10" fill="#ef4444" />
        <circle cx="38" cy="62" r="8" fill="#f59e0b" />
        <circle cx="60" cy="68" r="6" fill="#ec4899" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'anim_emoji_blush',
    nameKey: 'elem.animEmojiBlush',
    nameEn: 'Blushing Cute Smiley',
    nameAf: 'Blosende Oulike Glimlag',
    category: 'animations',
    subcategory: 'emojis',
    keywords: ['smiley', 'blush', 'glimlag', 'emoji'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="#fde047" />
        <!-- Happy closed eyes -->
        <path d="M30 42 Q 36 34, 42 42" fill="none" stroke="#000000" stroke-width="4" stroke-linecap="round" />
        <path d="M58 42 Q 64 34, 70 42" fill="none" stroke="#000000" stroke-width="4" stroke-linecap="round" />
        <!-- Smile -->
        <path d="M40 58 Q 50 68, 60 58" fill="none" stroke="#000000" stroke-width="4" stroke-linecap="round" />
        <!-- Pink cheeks -->
        <circle cx="28" cy="54" r="6" fill="#f87171" opacity="0.8" />
        <circle cx="72" cy="54" r="6" fill="#f87171" opacity="0.8" />
      </svg>
    `),
    aspectRatio: 1,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. AUDIO (Screenshot 3)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'audio_pop_party',
    nameKey: 'elem.audioPopParty',
    nameEn: 'Pop Party',
    nameAf: 'Pop Partytjie',
    category: 'audio',
    subcategory: 'recent',
    artist: 'Alex MakeMusic',
    duration: '2:11',
    audioType: 'pop',
    keywords: ['audio', 'pop', 'party', 'musiek', 'dans'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 100">
        <rect x="2" y="2" width="276" height="96" rx="20" fill="#09090b" stroke="#27272a" stroke-width="2" />
        <!-- Vinyl Record / Art -->
        <circle cx="48" cy="50" r="34" fill="#0284c7" />
        <circle cx="48" cy="50" r="16" fill="#0369a1" />
        <circle cx="48" cy="50" r="5" fill="#facc15" />
        <!-- Play badge -->
        <polygon points="44,42 56,50 44,58" fill="#ffffff" />
        <!-- Text -->
        <text x="96" y="44" font-family="sans-serif" font-weight="900" font-size="16" fill="#f4f4f5">Pop Party</text>
        <text x="96" y="66" font-family="sans-serif" font-weight="600" font-size="12" fill="#a1a1aa">Alex MakeMusic • 2:11</text>
        <!-- Waveform lines -->
        <rect x="220" y="36" width="3" height="28" rx="1.5" fill="#38bdf8" />
        <rect x="226" y="24" width="3" height="52" rx="1.5" fill="#38bdf8" />
        <rect x="232" y="42" width="3" height="16" rx="1.5" fill="#38bdf8" />
        <rect x="238" y="30" width="3" height="40" rx="1.5" fill="#38bdf8" />
        <rect x="244" y="46" width="3" height="8" rx="1.5" fill="#38bdf8" />
      </svg>
    `),
    aspectRatio: 2.8,
  },
  {
    id: 'audio_that_time',
    nameKey: 'elem.audioThatTime',
    nameEn: 'That Time of the Year',
    nameAf: 'Daardie Tyd van die Jaar',
    category: 'audio',
    subcategory: 'recent',
    hasCrown: true,
    artist: 'Roots and Recognition',
    duration: '3:38',
    audioType: 'ambient',
    keywords: ['audio', 'roots', 'ambient', 'jaareinde', 'musiek'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 100">
        <rect x="2" y="2" width="276" height="96" rx="20" fill="#09090b" stroke="#27272a" stroke-width="2" />
        <circle cx="48" cy="50" r="34" fill="#1e293b" />
        <polygon points="44,42 56,50 44,58" fill="#ffffff" />
        <text x="96" y="44" font-family="sans-serif" font-weight="900" font-size="15" fill="#f4f4f5">That Time of the Year</text>
        <text x="96" y="66" font-family="sans-serif" font-weight="600" font-size="12" fill="#a1a1aa">Roots and Recognition • 3:38</text>
        <!-- Gold crown badge -->
        <rect x="248" y="12" width="20" height="20" rx="6" fill="#f59e0b" />
        <polygon points="252,26 254,18 258,22 262,18 264,26" fill="#ffffff" />
      </svg>
    `),
    aspectRatio: 2.8,
  },
  {
    id: 'audio_piano_reflections',
    nameKey: 'elem.audioPianoReflections',
    nameEn: 'Piano Reflections',
    nameAf: 'Klavier Oordenking',
    category: 'audio',
    subcategory: 'magic',
    artist: 'PineAppleMusic',
    duration: '1:48',
    audioType: 'piano',
    keywords: ['piano', 'reflections', 'klavier', 'kalm'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 100">
        <rect x="2" y="2" width="276" height="96" rx="20" fill="#09090b" stroke="#27272a" stroke-width="2" />
        <circle cx="48" cy="50" r="34" fill="#78350f" />
        <polygon points="44,42 56,50 44,58" fill="#ffffff" />
        <text x="96" y="44" font-family="sans-serif" font-weight="900" font-size="16" fill="#f4f4f5">Piano Reflections</text>
        <text x="96" y="66" font-family="sans-serif" font-weight="600" font-size="12" fill="#a1a1aa">PineAppleMusic • 1:48</text>
        <rect x="220" y="38" width="3" height="24" rx="1.5" fill="#f59e0b" />
        <rect x="226" y="28" width="3" height="44" rx="1.5" fill="#f59e0b" />
        <rect x="232" y="34" width="3" height="32" rx="1.5" fill="#f59e0b" />
        <rect x="238" y="44" width="3" height="12" rx="1.5" fill="#f59e0b" />
      </svg>
    `),
    aspectRatio: 2.8,
  },
  {
    id: 'audio_soft_piano',
    nameKey: 'elem.audioSoftPiano',
    nameEn: 'Soft Piano Music',
    nameAf: 'Sagte Klaviermusiek',
    category: 'audio',
    subcategory: 'magic',
    artist: 'SamuelFrancisJohnson',
    duration: '0:32',
    audioType: 'piano',
    keywords: ['piano', 'soft', 'sag', 'klavier'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 100">
        <rect x="2" y="2" width="276" height="96" rx="20" fill="#09090b" stroke="#27272a" stroke-width="2" />
        <circle cx="48" cy="50" r="34" fill="#a855f7" />
        <polygon points="44,42 56,50 44,58" fill="#ffffff" />
        <text x="96" y="44" font-family="sans-serif" font-weight="900" font-size="16" fill="#f4f4f5">Soft Piano Music</text>
        <text x="96" y="66" font-family="sans-serif" font-weight="600" font-size="12" fill="#a1a1aa">SamuelFrancisJohnson • 0:32</text>
      </svg>
    `),
    aspectRatio: 2.8,
  },
  {
    id: 'audio_way_you_make',
    nameKey: 'elem.audioWayYouMake',
    nameEn: 'Way You Make Me Feel',
    nameAf: 'Soos Jy My Laat Voel',
    category: 'audio',
    subcategory: 'upbeat',
    hasCrown: true,
    artist: 'Adelyn Paik • Ooyy',
    duration: '2:43',
    audioType: 'upbeat',
    keywords: ['upbeat', 'dance', 'vrolik', 'opgewek'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 100">
        <rect x="2" y="2" width="276" height="96" rx="20" fill="#09090b" stroke="#27272a" stroke-width="2" />
        <circle cx="48" cy="50" r="34" fill="#10b981" />
        <polygon points="44,42 56,50 44,58" fill="#ffffff" />
        <text x="96" y="44" font-family="sans-serif" font-weight="900" font-size="15" fill="#f4f4f5">Way You Make Me Feel</text>
        <text x="96" y="66" font-family="sans-serif" font-weight="600" font-size="12" fill="#a1a1aa">Adelyn Paik • Ooyy • 2:43</text>
        <rect x="248" y="12" width="20" height="20" rx="6" fill="#f59e0b" />
        <polygon points="252,26 254,18 258,22 262,18 264,26" fill="#ffffff" />
      </svg>
    `),
    aspectRatio: 2.8,
  },
  {
    id: 'audio_golden',
    nameKey: 'elem.audioGolden',
    nameEn: 'I’m Golden (Instrumental)',
    nameAf: 'Ek is Goud (Instrumenteel)',
    category: 'audio',
    subcategory: 'upbeat',
    hasCrown: true,
    artist: 'Gamma Skies',
    duration: '2:33',
    audioType: 'upbeat',
    keywords: ['golden', 'instrumental', 'goud', 'opgewek'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 100">
        <rect x="2" y="2" width="276" height="96" rx="20" fill="#09090b" stroke="#27272a" stroke-width="2" />
        <circle cx="48" cy="50" r="34" fill="#f43f5e" />
        <polygon points="44,42 56,50 44,58" fill="#ffffff" />
        <text x="96" y="44" font-family="sans-serif" font-weight="900" font-size="15" fill="#f4f4f5">I’m Golden</text>
        <text x="96" y="66" font-family="sans-serif" font-weight="600" font-size="12" fill="#a1a1aa">Gamma Skies • 2:33</text>
        <rect x="248" y="12" width="20" height="20" rx="6" fill="#f59e0b" />
        <polygon points="252,26 254,18 258,22 262,18 264,26" fill="#ffffff" />
      </svg>
    `),
    aspectRatio: 2.8,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. 3D Elements, Frames, Mockups, Charts, Forms, Tables
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'threed_cube',
    nameKey: 'elem.threedCube',
    nameEn: 'Isometric 3D Cube',
    nameAf: 'Isometriese 3D Kubus',
    category: 'threed',
    keywords: ['3d', 'cube', 'kubus', 'isometries', 'blok'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <polygon points="10,65 50,85 90,65 50,45" fill="none" stroke="#d946ef" stroke-width="2" />
        <polygon points="50,20 80,35 50,50 20,35" fill="#c084fc" />
        <polygon points="20,35 50,50 50,85 20,70" fill="#9333ea" />
        <polygon points="50,50 80,35 80,70 50,85" fill="#7e22ce" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'frame_square_cloud',
    nameKey: 'elem.frameSquareCloud',
    nameEn: 'Meadow Square Frame',
    nameAf: 'Landskap Vierkant-Raam',
    category: 'frames',
    keywords: ['frame', 'square', 'raam', 'landskap', 'wolk'],
    isFrame: true,
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="5" y="5" width="90" height="90" rx="14" fill="#38bdf8" />
        <ellipse cx="65" cy="30" rx="16" ry="10" fill="#ffffff" opacity="0.9" />
        <ellipse cx="75" cy="34" rx="12" ry="8" fill="#ffffff" opacity="0.9" />
        <path d="M5 65 Q 40 45, 95 60 L 95 95 L 5 95 Z" fill="#84cc16" />
        <path d="M5 75 Q 60 55, 95 80 L 95 95 L 5 95 Z" fill="#65a30d" />
        <rect x="5" y="5" width="90" height="90" rx="14" fill="none" stroke="#d97706" stroke-width="3" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'frame_circle_cloud',
    nameKey: 'elem.frameCircleCloud',
    nameEn: 'Meadow Circle Frame',
    nameAf: 'Landskap Sirkel-Raam',
    category: 'frames',
    keywords: ['frame', 'circle', 'sirkelraam', 'landskap', 'wolk'],
    isFrame: true,
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <clipPath id="circleClip">
            <circle cx="50" cy="50" r="45" />
          </clipPath>
        </defs>
        <g clip-path="url(#circleClip)">
          <rect x="0" y="0" width="100" height="100" fill="#38bdf8" />
          <ellipse cx="65" cy="30" rx="16" ry="10" fill="#ffffff" opacity="0.9" />
          <path d="M0 65 Q 40 45, 100 60 L 100 100 L 0 100 Z" fill="#84cc16" />
          <path d="M0 75 Q 60 55, 100 80 L 100 100 L 0 100 Z" fill="#65a30d" />
        </g>
        <circle cx="50" cy="50" r="45" fill="none" stroke="#d97706" stroke-width="3" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'mockup_tshirt',
    nameKey: 'elem.mockupTshirt',
    nameEn: 'T-Shirt Apparel Mockup',
    nameAf: 'T-Hemp Klere-Mockup',
    category: 'mockups',
    keywords: ['mockup', 'tshirt', 'shirt', 'hemp', 'klere', 'apparel'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <path d="M30 15 L10 32 L22 42 L30 35 L30 85 L70 85 L70 35 L78 42 L90 32 L70 15 Q 50 25, 30 15 Z" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2" />
        <rect x="38" y="36" width="24" height="28" rx="2" fill="#38bdf8" opacity="0.8" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'chart_analytics',
    nameKey: 'elem.chartAnalytics',
    nameEn: 'Area Chart Overlay',
    nameAf: 'Vlakgrafiek Oorlegsel',
    category: 'charts',
    keywords: ['chart', 'graph', 'grafiek', 'data', 'statistiek'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="10" y="10" width="80" height="80" rx="8" fill="#1e1b4b" stroke="#4338ca" stroke-width="2" />
        <path d="M15 80 L35 55 L55 65 L85 30 L85 85 L15 85 Z" fill="#818cf8" opacity="0.4" />
        <polyline points="15,80 35,55 55,65 85,30" fill="none" stroke="#a78bfa" stroke-width="4" stroke-linecap="round" />
        <circle cx="85" cy="30" r="4" fill="#f43f5e" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'form_toggle_switch',
    nameKey: 'elem.formToggle',
    nameEn: 'Active Toggle Switch',
    nameAf: 'Aktiewe Skakelaar',
    category: 'forms',
    keywords: ['toggle', 'switch', 'skakelaar', 'vorm', 'vorms'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="15" y="32" width="70" height="36" rx="18" fill="#10b981" />
        <circle cx="68" cy="50" r="14" fill="#ffffff" />
        <polyline points="63,50 67,54 73,46" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" />
      </svg>
    `),
    aspectRatio: 1,
  },
  {
    id: 'table_matrix',
    nameKey: 'elem.tableMatrix',
    nameEn: 'Data Matrix Table',
    nameAf: 'Datamatriks Tabel',
    category: 'tables',
    keywords: ['table', 'matrix', 'tabel', 'rooster', 'rye'],
    previewSvg: encodeSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect x="10" y="15" width="80" height="70" rx="8" fill="#ffffff" stroke="#f97316" stroke-width="4" />
        <rect x="10" y="15" width="80" height="22" rx="4" fill="#ea580c" />
        <line x1="10" y1="55" x2="90" y2="55" stroke="#fed7aa" stroke-width="2" />
        <line x1="50" y1="15" x2="50" y2="85" stroke="#fed7aa" stroke-width="2" />
      </svg>
    `),
    aspectRatio: 1,
  },
] as const;

export const elementOf = (id: string): StudioElementItem | null =>
  STUDIO_ELEMENTS.find((one) => one.id === id) ?? null;
