/**
 * Clothes shown on a model, from a photo of the clothes.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 16 October 2026, on her phone: *"Show clothes on models — easily
 * create on-model images with AI."* Planned on the 17th: a photo of the
 * garment, and either a model described here or a photo of a real person
 * who is her or has agreed, worn in a setting and a pose — by the same
 * engine and route as the magic touch.
 *
 * ── What must not change ─────────────────────────────────────────────────
 *
 * The garment, for the same reason as the product in `productshots.ts`: a
 * boutique posting a nicer dress than the one it sells is advertising
 * something it does not have. And when a real person's photo goes up, the
 * person: their face, build and skin tone, not a prettier stranger with
 * their hair.
 *
 * ── Who can be a model ───────────────────────────────────────────────────
 *
 * Adults only. The described models are all grown-ups, and every sentence
 * says the person is an adult — a children's clothing shop is a real need,
 * and it is the one this tool will not serve, because a picture of a child
 * made from a stranger's upload is not something to make on request.
 *
 * Pure strings — `check:tryon` reads every sentence this sends.
 */

export interface ModelLook {
  readonly id: string;
  readonly en: string;
  readonly af: string;
  /** The person, as the engine is asked for them. Always an adult. */
  readonly who: string;
}

export const MODELS: readonly ModelLook[] = [
  { id: 'w25', en: 'Woman, 20s', af: 'Vrou, 20’s', who: 'a woman in her mid-twenties with a natural, friendly look' },
  { id: 'w35curvy', en: 'Woman, curvy', af: 'Vrou, volronde', who: 'a curvy plus-size woman in her thirties, confident and warm' },
  { id: 'w50', en: 'Woman, 50s', af: 'Vrou, 50’s', who: 'an elegant woman in her fifties with silver-streaked hair' },
  { id: 'w30petite', en: 'Woman, petite', af: 'Vrou, klein gebou', who: 'a petite woman in her early thirties with a sporty, upbeat look' },
  { id: 'm25', en: 'Man, 20s', af: 'Man, 20’s', who: 'a man in his mid-twenties with a relaxed, approachable look' },
  { id: 'm35', en: 'Man, 30s', af: 'Man, 30’s', who: 'a man in his late thirties with a trimmed beard and an easy smile' },
  { id: 'mbig', en: 'Man, big & tall', af: 'Man, groot & lank', who: 'a big and tall man in his forties, broad-shouldered and friendly' },
  { id: 'm60', en: 'Man, 60s', af: 'Man, 60’s', who: 'a distinguished man in his sixties with grey hair' },
];

export interface Setting {
  readonly id: string;
  readonly en: string;
  readonly af: string;
  readonly where: string;
}

export const SETTINGS: readonly Setting[] = [
  { id: 'studio', en: 'Bright studio', af: 'Helder ateljee', where: 'in a bright, airy photo studio with a soft neutral backdrop and even, flattering light' },
  { id: 'street', en: 'City street', af: 'Stadstraat', where: 'on a sunny city street with softly blurred shopfronts behind' },
  { id: 'cafe', en: 'Café', af: 'Kafee', where: 'in a cosy café with warm window light' },
  { id: 'garden', en: 'Garden', af: 'Tuin', where: 'in a green garden in soft golden-hour light' },
  { id: 'beach', en: 'Beach', af: 'Strand', where: 'on a beach in warm late-afternoon light with the sea behind' },
  { id: 'runway', en: 'Runway', af: 'Loopplank', where: 'on a fashion runway with spotlights and a softly blurred audience' },
];

export const POSES = [
  { id: 'standing', en: 'Standing', af: 'Staan', how: 'standing naturally, full body in view from head to shoes' },
  { id: 'walking', en: 'Walking', af: 'Stap', how: 'walking towards the camera mid-stride, full body in view' },
  { id: 'half', en: 'Waist up', af: 'Middel op', how: 'from the waist up, turned slightly to the side' },
] as const;
export type PoseId = (typeof POSES)[number]['id'];

export const TRYON_SIZES = [
  { id: 'portrait', aspect: '3:4', en: 'Tall post', af: 'Hoë plasing' },
  { id: 'story', aspect: '9:16', en: 'Story 9:16', af: 'Storie 9:16' },
  { id: 'square', aspect: '1:1', en: 'Square', af: 'Vierkant' },
] as const;
export type TryOnSize = (typeof TRYON_SIZES)[number]['id'];

export interface TryOnAsk {
  readonly model: string;
  readonly setting: string;
  readonly pose: PoseId;
  /** A photo of a real person goes up second, instead of a described model. */
  readonly person?: boolean;
}

const GARMENT = 'The first attached picture shows a piece of clothing. Reproduce that exact garment — the same cut, length, fit, colour, fabric, pattern, print, buttons, logo and every detail. Do not redesign, recolour or simplify it.';
const PERSON = 'The second attached picture is the person to dress: an adult. Keep them exactly themselves — the same face, hair, skin tone, build and age. Do not beautify, slim or change them.';
const CLEAN = 'Style the rest of the outfit simply so the garment is the focus. A realistic, professional fashion photograph: natural fabric folds, true colours, sharp focus on the garment. No text, logos or watermarks besides what is on the garment itself.';

/** The sentence sent to the picture route. */
export function tryOnAsk(ask: TryOnAsk): string {
  const model = MODELS.find((one) => one.id === ask.model) ?? MODELS[0];
  const setting = SETTINGS.find((one) => one.id === ask.setting) ?? SETTINGS[0];
  const pose = POSES.find((one) => one.id === ask.pose) ?? POSES[0];
  return [
    GARMENT,
    ask.person ? PERSON : `Show it worn by ${model.who} — an adult.`,
    `${ask.person ? 'They are' : 'The model is'} ${pose.how}, ${setting.where}.`,
    CLEAN,
    'Keep the garment itself unchanged.',
  ].join(' ');
}
