/**
 * Make a picture: the first room of the "Make anything" studio.
 *
 * The owner, 29 October 2026: *"Ons wil die beste produk op die mark lewer en
 * kreatief dink oor hoe om al hierdie produkte op elke moontlike manier te
 * intergreer, maar ook prakties en eenvoudig en goeie opsies/templates of
 * copilot voorstelle daar stel."* And from the plan (`docs/FAL-MODELLE.md`,
 * "The design"): the member never chooses a model; they choose what they are
 * making, pick a look and a mood from pictures, say the idea, read back what
 * will be made, see a cheap draft, and pay for the final only once a draft
 * is right.
 *
 * ── The two engines, both fal.ai's own (not a partner) ───────────────────
 *
 *   draft  `fal-ai/flux/schnell`  $0.003 a megapixel: four choices, about
 *          a megapixel each, $0.012 (R0.22) for the four.
 *   final  `fal-ai/flux-2/edit`   $0.012 a processed megapixel: the chosen
 *          draft made finished and detailed at about two megapixels, about
 *          $0.036 (R0.67).
 *
 * Both read `enterprise_status: ready` and `is_partner_api: false` on their
 * pages (29 October 2026); the fields are in `docs/FAL-SKEMAS.md`.
 *
 * Read on the phone (the cards, the read-back, the prices) and on the server
 * (`app/api/picturemake`), so only ids cross from the phone and every phrase
 * the engine reads is ours, except the member's own idea.
 */
import { CREDITS } from './credits';

export const DRAFT_MODEL = 'fal-ai/flux/schnell';
export const FINAL_MODEL = 'fal-ai/flux-2/edit';
export const DRAFTS = 4;

/** What is being made: the card, its shape, and what the engine is told. */
export const KINDS = [
  { id: 'cover', name: ['make.kindCover', 'Album cover'], w: 1024, h: 1024, says: 'an album cover, square, striking at thumbnail size, no text' },
  { id: 'poster', name: ['make.kindPoster', 'Poster'], w: 832, h: 1216, says: 'an event poster, tall, bold composition with clear space at the top for a title' },
  { id: 'post', name: ['make.kindPost', 'Social post'], w: 1024, h: 1024, says: 'a social media post, square, eye-catching' },
  { id: 'story', name: ['make.kindStory', 'Story'], w: 768, h: 1344, says: 'a phone story, tall, the subject in the middle third' },
  { id: 'banner', name: ['make.kindBanner', 'Banner'], w: 1344, h: 768, says: 'a wide channel banner with room on the left and right' },
  { id: 'wallpaper', name: ['make.kindWallpaper', 'Phone wallpaper'], w: 768, h: 1344, says: 'a phone wallpaper, calm at the top where the clock sits' },
] as const;

/** The look, picked from pictures rather than typed. Named styles, never a studio or a living artist. */
export const LOOKS = [
  { id: 'photo', name: ['make.lookPhoto', 'Photo'], says: 'a realistic photograph, natural light, shallow depth of field' },
  { id: 'paint', name: ['make.lookPaint', 'Painting'], says: 'a rich oil painting with visible brush strokes' },
  { id: 'watercolour', name: ['make.lookWatercolour', 'Watercolour'], says: 'a soft watercolour with paper texture' },
  { id: 'comic', name: ['make.lookComic', 'Comic'], says: 'a bold comic-book illustration with clean ink lines and flat colour' },
  { id: '3d', name: ['make.look3d', '3D'], says: 'a glossy 3D render with soft studio lighting' },
  { id: 'neon', name: ['make.lookNeon', 'Neon'], says: 'neon lights glowing in the dark, cyberpunk colours' },
  { id: 'film', name: ['make.lookFilm', 'Old film'], says: 'a grainy vintage film photograph with warm faded colours' },
  { id: 'minimal', name: ['make.lookMinimal', 'Minimal'], says: 'a minimal flat design with a few shapes and lots of space' },
] as const;

export const MOODS = [
  { id: 'warm', name: ['make.moodWarm', 'Warm'], says: 'warm golden tones' },
  { id: 'dark', name: ['make.moodDark', 'Dark'], says: 'dark and moody, deep shadows' },
  { id: 'bright', name: ['make.moodBright', 'Bright'], says: 'bright, joyful, saturated colour' },
  { id: 'calm', name: ['make.moodCalm', 'Calm'], says: 'calm and soft, pastel colours' },
  { id: 'dreamy', name: ['make.moodDreamy', 'Dreamy'], says: 'dreamy and hazy, glowing light' },
] as const;

export type KindId = (typeof KINDS)[number]['id'];
export type LookId = (typeof LOOKS)[number]['id'];
export type MoodId = (typeof MOODS)[number]['id'];

export interface Choice {
  readonly kind: KindId;
  readonly look: LookId;
  readonly mood: MoodId;
  /** The member's own idea, in their words. */
  readonly idea: string;
}

/** The prices, said on the buttons. */
export const DRAFT_CREDITS = CREDITS.pictureDraft;
export const FINAL_CREDITS = CREDITS.pictureFinal;

const pick = <T extends { readonly id: string }>(list: readonly T[], id: unknown): T | undefined =>
  list.find((one) => one.id === id);

/** A choice as it arrives from a phone: known ids only, and the idea trimmed. */
export function choiceOf(raw: unknown): Choice | null {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const kind = pick(KINDS, row.kind);
  const look = pick(LOOKS, row.look);
  const mood = pick(MOODS, row.mood);
  const idea = typeof row.idea === 'string' ? row.idea.trim().slice(0, 400) : '';
  if (!kind || !look || !mood || !idea) return null;
  return { kind: kind.id, look: look.id, mood: mood.id, idea };
}

/** What the engine reads: the idea first, then ours. */
export function promptOf(choice: Choice): string {
  const kind = pick(KINDS, choice.kind);
  const look = pick(LOOKS, choice.look);
  const mood = pick(MOODS, choice.mood);
  return `${choice.idea}. ${kind?.says ?? ''}. ${look?.says ?? ''}. ${mood?.says ?? ''}.`;
}

/**
 * The read-back: what will be made, in the member's language, before a
 * credit is spent. Built from the same choices the engine reads, so the
 * sentence and the picture cannot disagree.
 */
export function readBack(choice: Choice, say: (key: string, fallback: string) => string): string {
  const kind = pick(KINDS, choice.kind);
  const look = pick(LOOKS, choice.look);
  const mood = pick(MOODS, choice.mood);
  if (!kind || !look || !mood) return '';
  return `${say(kind.name[0], kind.name[1])} · ${say(look.name[0], look.name[1])} · ${say(mood.name[0], mood.name[1])}: “${choice.idea}”`;
}

/** The four drafts: the chosen shape at about a megapixel, answered in the call. */
export function draftInput(choice: Choice): Record<string, unknown> {
  const kind = pick(KINDS, choice.kind) ?? KINDS[0];
  return {
    prompt: promptOf(choice),
    image_size: { width: kind.w, height: kind.h },
    num_images: DRAFTS,
    num_inference_steps: 4,
    enable_safety_checker: true,
    output_format: 'jpeg',
    sync_mode: true,
  };
}

/** The final: the chosen draft, finished, at about twice the pixels. */
export function finalInput(choice: Choice, draft: string): Record<string, unknown> {
  const kind = pick(KINDS, choice.kind) ?? KINDS[0];
  const grow = Math.SQRT2;
  const side = (n: number): number => Math.min(2048, Math.round((n * grow) / 16) * 16);
  return {
    prompt: `Make this exact picture finished and highly detailed, keeping its composition, subject and colours: ${promptOf(choice)}`,
    image_urls: [draft],
    image_size: { width: side(kind.w), height: side(kind.h) },
    enable_safety_checker: true,
    output_format: 'png',
    sync_mode: true,
  };
}
