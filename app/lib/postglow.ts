/**
 * The light a line of words can give off, and the ready-made neon words.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 13 October 2026, with the "Photo Editor" page Google drew: *"Hierdie
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
] as const satisfies readonly Glow[];

export type GlowId = (typeof GLOWS)[number]['id'];

export const GLOW_IDS: readonly GlowId[] = GLOWS.map((one) => one.id);

export const isGlow = (value: unknown): value is GlowId =>
  typeof value === 'string' && (GLOW_IDS as readonly string[]).includes(value);

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
];
