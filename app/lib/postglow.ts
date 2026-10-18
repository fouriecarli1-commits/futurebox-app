/**
 * The light a line of words can give off, and the ready-made neon words.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 13 October 2026, with the "Photo Editor" page Google drew: *"Hierdie
 * photo editor is 'n huge selling point … ons kort amazing futuristic text,
 * foto, en shape templates. Neon, futuristic, phantasm, etc."*
 *
 * ── How a glow is drawn, so that it exports ──────────────────────────────
 *
 * A canvas has one shadow per fill. A neon tube is not one shadow: it is a
 * tight bright core, a wider wash of the same colour, and a faint far halo
 * in a second colour. So a glowing line is written three times over — far
 * halo, near halo, core — each pass with its own colour and blur, and then
 * once more with no shadow for the crisp letter on top. `PostStudio.tsx`
 * draws the preview and the exported file through the same function, so
 * what glows on the glass glows in the file.
 *
 * The passes scale with the type size: a halo measured in pixels at 1080
 * wide would be a smudge at 320 and a hairline at 4K.
 */

import type { FaceId } from './postfaces';

export interface Glow {
  readonly id: string;
  /** The i18n key and the English, as `t` takes them. */
  readonly name: readonly [string, string];
  /** Far halo, near halo, core — outermost first. Empty is no glow. */
  readonly halo: readonly string[];
}

export const GLOWS = [
  { id: 'none', name: ['post.glow.none', 'No glow'], halo: [] },
  { id: 'neon', name: ['post.glow.neon', 'Neon'], halo: ['#06b6d4', '#0f9d6e', '#34d399'] },
  { id: 'synth', name: ['post.glow.synth', 'Synthwave'], halo: ['#3b82f6', '#a855f7', '#ec4899'] },
  { id: 'holo', name: ['post.glow.holo', 'Hologram'], halo: ['#22d3ee', '#67e8f9', '#ffffff'] },
  { id: 'gold', name: ['post.glow.gold', 'Gold'], halo: ['#ea580c', '#f59e0b', '#fde68a'] },
  { id: 'ice', name: ['post.glow.ice', 'Ice'], halo: ['#1d4ed8', '#38bdf8', '#e0f2fe'] },
  { id: 'fire', name: ['post.glow.fire', 'Fire'], halo: ['#dc2626', '#f97316', '#fde047'] },
  /* Five more, 15 October 2026, with the eight new faces: "meer text
     possibilities". Each a colour family none of the seven covers. */
  { id: 'pink', name: ['post.glow.pink', 'Hot pink'], halo: ['#be185d', '#ec4899', '#fbcfe8'] },
  { id: 'toxic', name: ['post.glow.toxic', 'Toxic'], halo: ['#3f6212', '#84cc16', '#ecfccb'] },
  { id: 'sunset', name: ['post.glow.sunset', 'Sunset'], halo: ['#7c3aed', '#f43f5e', '#fdba74'] },
  { id: 'ultra', name: ['post.glow.ultra', 'Ultraviolet'], halo: ['#4c1d95', '#8b5cf6', '#ddd6fe'] },
  { id: 'chrome', name: ['post.glow.chrome', 'Chrome'], halo: ['#334155', '#94a3b8', '#f8fafc'] },
] as const satisfies readonly Glow[];

export type GlowId = (typeof GLOWS)[number]['id'];

export const glowOf = (id: string | undefined): Glow =>
  GLOWS.find((one) => one.id === id) ?? GLOWS[0];

/** The shadow passes for one glow at one type size, outermost first. */
export function haloPasses(glow: Glow, px: number): readonly { colour: string; blur: number }[] {
  if (!glow.halo.length) return [];
  const [far, near, core] = glow.halo;
  return [
    { colour: far, blur: px * 1.1 },
    { colour: near, blur: px * 0.55 },
    { colour: core, blur: px * 0.22 },
  ];
}

/**
 * The ready-made neon words: one press puts a styled line on the picture.
 *
 * Each is a face, a glow, an ink and a tracking that go together — the
 * three Google's page drew (STATIC, BOLD MOVES, PHANTASM) and three more in
 * the same family. The words are a starting point and every part of a line
 * can be changed afterwards, like everything else in this room.
 */
export interface NeonWord {
  readonly id: string;
  readonly says: readonly [string, string];
  readonly face: FaceId;
  readonly glow: GlowId;
  readonly ink: string;
  readonly letterGap: number;
}

export const NEON_WORDS: readonly NeonWord[] = [
  { id: 'static', says: ['post.neon.static', 'STATIC'], face: 'type', glow: 'neon', ink: '#34d399', letterGap: 0.3 },
  { id: 'bold', says: ['post.neon.bold', 'BOLD MOVES'], face: 'poster', glow: 'synth', ink: '#f472b6', letterGap: 0.12 },
  { id: 'phantasm', says: ['post.neon.phantasm', 'PHANTASM'], face: 'book', glow: 'holo', ink: '#67e8f9', letterGap: 0.34 },
  { id: 'future', says: ['post.neon.future', 'FUTURE PRO'], face: 'future', glow: 'neon', ink: '#ecfdf5', letterGap: 0.2 },
  { id: 'gold', says: ['post.neon.gold', 'GOLDEN HOUR'], face: 'book', glow: 'gold', ink: '#fde68a', letterGap: 0.16 },
  { id: 'glitch', says: ['post.neon.glitch', 'STATIC WAVE'], face: 'future', glow: 'ice', ink: '#e0f2fe', letterGap: 0.26 },
  { id: 'love', says: ['post.neon.love', 'Love Song'], face: 'script', glow: 'pink', ink: '#fdf2f8', letterGap: 0.02 },
  { id: 'hype', says: ['post.neon.hype', 'HYPE'], face: 'spray', glow: 'fire', ink: '#fef08a', letterGap: 0.08 },
  { id: 'boom', says: ['post.neon.boom', 'BOOM!'], face: 'comic', glow: 'sunset', ink: '#fff7ed', letterGap: 0.06 },
  { id: 'play', says: ['post.neon.play', 'PRESS PLAY'], face: 'pixel', glow: 'toxic', ink: '#ecfccb', letterGap: 0.1 },
  { id: 'glory', says: ['post.neon.glory', 'GLORY'], face: 'classic', glow: 'gold', ink: '#fef3c7', letterGap: 0.3 },
  { id: 'open', says: ['post.neon.open', 'OPEN LATE'], face: 'block', glow: 'pink', ink: '#fdf2f8', letterGap: 0.06 },
  { id: 'disco', says: ['post.neon.disco', 'Disco Fever'], face: 'retro', glow: 'ultra', ink: '#f5f3ff', letterGap: 0.08 },
  { id: 'chrome', says: ['post.neon.chrome', 'CHROME HEART'], face: 'fashion', glow: 'chrome', ink: '#ffffff', letterGap: 0.12 },
];
