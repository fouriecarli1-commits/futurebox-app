/**
 * Era-based templates for photo editing and Google AI generation (Nano Banana / Gemini).
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"en by photo editor, templates van verskillende eras,
 * en voorstelle waarin mense hulle eie foto's in edit, of in sit deur google se
 * AI engine. AS mens kyk na nano banana, en veo ens. is daar templates wat help
 * om keuses te maak. Ek wil dit in die app integrate op 'n moderne stylish
 * manier vir kliente om van te kies."*
 */

import type { Look } from './postlook';

export interface EraTemplate {
  readonly id: string;
  readonly era: string;
  readonly name: readonly [string, string];
  readonly what: readonly [string, string];
  readonly badge: readonly [string, string];
  readonly size: 'square' | 'portrait' | 'story' | 'wide';
  readonly look: Partial<Look>;
  readonly aiPrompt: readonly [string, string];
  readonly palette: readonly string[];
}

export const ERA_TEMPLATES: readonly EraTemplate[] = [
  {
    id: 'era-70s',
    era: '1970s',
    name: ['era.70sTitle', '70s Vinyl & Warm Soul'],
    what: ['era.70sWhat', 'Warm analogue saturation, gentle vinyl dust, and rich terracotta and gold tones.'],
    badge: ['era.70sBadge', 'Analog Vinyl'],
    size: 'square',
    look: { warmth: 0.35, contrast: 1.15, bright: 0.92, colour: 1.1 },
    aiPrompt: [
      'era.70sPrompt',
      'Vintage 1970s vinyl album cover portrait, warm Kodachrome 35mm film tones, analog soul record aesthetic, rich amber lighting, natural grain texture.',
    ],
    palette: ['#b45309', '#d97706', '#78350f', '#fef3c7'],
  },
  {
    id: 'era-80s',
    era: '1980s',
    name: ['era.80sTitle', '80s Synthwave & Neon'],
    what: ['era.80sWhat', 'Electrifying magenta and cyan glow, retro grid aesthetic, and chrome reflections.'],
    badge: ['era.80sBadge', 'Synth Neon'],
    size: 'portrait',
    look: { warmth: -0.15, contrast: 1.25, colour: 1.35, bright: 0.95 },
    aiPrompt: [
      'era.80sPrompt',
      '1980s retro synthwave neon aesthetic, dual-tone magenta and cyan rim light, moody dark studio background, VHS nostalgia lighting, cinematic pop poster.',
    ],
    palette: ['#ec4899', '#06b6d4', '#4f46e5', '#fdf2f8'],
  },
  {
    id: 'era-90s',
    era: '1990s',
    name: ['era.90sTitle', '90s Boom-Bap & Street Tape'],
    what: ['era.90sWhat', 'Gritty high-contrast monochrome and raw tape saturation with urban edge.'],
    badge: ['era.90sBadge', 'Street Tape'],
    size: 'square',
    look: { contrast: 1.3, colour: 0.75, bright: 0.88 },
    aiPrompt: [
      'era.90sPrompt',
      '1990s hip-hop cassette mixtape cover, high-contrast monochrome film grain, raw street photography portrait, golden era boom-bap typography aesthetic.',
    ],
    palette: ['#27272a', '#71717a', '#a1a1aa', '#fafafa'],
  },
  {
    id: 'era-2000s',
    era: '2000s',
    name: ['era.2000sTitle', '2000s Y2K Gloss & Chrome'],
    what: ['era.2000sWhat', 'Futuristic liquid silver sheen, cyber glossy cyan reflections, and CD booklet sheen.'],
    badge: ['era.2000sBadge', 'Y2K Glans'],
    size: 'square',
    look: { warmth: -0.2, contrast: 1.2, bright: 1.05, colour: 1.15 },
    aiPrompt: [
      'era.2000sPrompt',
      'Y2K millennium futuristic pop CD booklet portrait, liquid chrome metallic reflections, glossy cyber finish, high-key cyan and silver studio lighting.',
    ],
    palette: ['#0284c7', '#38bdf8', '#94a3b8', '#e0f2fe'],
  },
  {
    id: 'era-modern',
    era: '2026',
    name: ['era.modernTitle', 'Modern Studio Editorial'],
    what: ['era.modernWhat', 'Razor-sharp commercial lighting, deep architectural blacks, and refined emerald accents.'],
    badge: ['era.modernBadge', 'Modern Studio'],
    size: 'portrait',
    look: { contrast: 1.12, colour: 1.05, bright: 0.98 },
    aiPrompt: [
      'era.modernPrompt',
      'High-end modern editorial studio portrait, commercial lighting, clean dark background, 8k commercial magazine cover style, subtle emerald and gold rim light.',
    ],
    palette: ['#10b981', '#059669', '#18181b', '#f4f4f5'],
  },
  {
    id: 'era-afro',
    era: '2030',
    name: ['era.afroTitle', 'Afrofuturism 2030'],
    what: ['era.afroWhat', 'Radiant solar gold, geometric pattern accents, and majestic African high-fashion futurism.'],
    badge: ['era.afroBadge', 'Afrofuturisme'],
    size: 'story',
    look: { warmth: 0.28, contrast: 1.2, colour: 1.25, bright: 0.94 },
    aiPrompt: [
      'era.afroPrompt',
      'Afrofuturistic royal portrait at golden hour, intricate glowing geometric patterns, majestic African high-fashion attire, cinematic golden lighting, futuristic city.',
    ],
    palette: ['#f59e0b', '#b45309', '#10b981', '#fef3c7'],
  },
];

export const eraById = (id: string): EraTemplate | undefined =>
  ERA_TEMPLATES.find((one) => one.id === id);
