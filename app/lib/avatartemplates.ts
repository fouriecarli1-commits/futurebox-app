/**
 * Avatar templates for Podcasts and Presenter desks.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"By podcasts, ook templates van avatars...
 * AS mens kyk na nano banana, en veo ens. is daar templates wat help om keuses
 * te maak. Ek wil dit in die app integrate op 'n moderne stylish manier vir
 * kliente om van te kies."*
 */

export interface AvatarTemplate {
  readonly id: string;
  readonly name: readonly [string, string];
  readonly persona: readonly [string, string];
  readonly style: readonly [string, string];
  readonly badge: readonly [string, string];
  readonly what: readonly [string, string];
  readonly aiPrompt: readonly [string, string];
  readonly accentColor: string;
  readonly lighting: string;
}

export const AVATAR_TEMPLATES: readonly AvatarTemplate[] = [
  {
    id: 'avatar-anchor',
    name: ['avatar.anchorName', 'The Studio Anchor'],
    persona: ['avatar.anchorPersona', 'News & Current Affairs Host'],
    style: ['avatar.anchorStyle', 'Broadcast HD Studio'],
    badge: ['avatar.anchorBadge', 'Studio Anchor'],
    what: ['avatar.anchorWhat', 'Tailored formal attire, soft key-light studio illumination, broadcast microphone.'],
    aiPrompt: [
      'avatar.anchorPrompt',
      'Professional broadcast television news host in high-definition studio, tailored sharp blazer, warm soft key light, professional Shure microphone on boom arm, clean modern blur background, photorealistic 8k.',
    ],
    accentColor: '#3b82f6',
    lighting: 'Softbox Key + Rim Light',
  },
  {
    id: 'avatar-tech',
    name: ['avatar.techName', 'The Tech Futurist'],
    persona: ['avatar.techPersona', 'AI & Technology Analyst'],
    style: ['avatar.techStyle', 'Cyber Studio'],
    badge: ['avatar.techBadge', 'Tech Futurist'],
    what: ['avatar.techWhat', 'Minimal dark studio, subtle cyan and purple neon backlight, sleek wireless headset.'],
    aiPrompt: [
      'avatar.techPrompt',
      'Futuristic technology podcast host, dark minimalist soundstage with subtle cyan neon accents, sleek modern wireless headset, smart casual black turtleneck, cinematic shallow depth of field.',
    ],
    accentColor: '#06b6d4',
    lighting: 'Cyber Cyan Rim + Ambient Dark',
  },
  {
    id: 'avatar-storyteller',
    name: ['avatar.storyName', 'The Acoustic Storyteller'],
    persona: ['avatar.storyPersona', 'Culture & Conversation Podcaster'],
    style: ['avatar.storyStyle', 'Warm Timber Lounge'],
    badge: ['avatar.storyBadge', 'Storyteller'],
    what: ['avatar.storyWhat', 'Rich wooden acoustic slat panels, warm amber incandescent lighting, vintage broadcast mic.'],
    aiPrompt: [
      'avatar.storyPrompt',
      'Warm conversational podcast host seated in cozy studio with vertical wood slat acoustic panels, soft amber tungsten lighting, classic large-diaphragm podcast microphone, relaxed and inviting atmosphere.',
    ],
    accentColor: '#f59e0b',
    lighting: 'Warm Tungsten Glow',
  },
  {
    id: 'avatar-creator',
    name: ['avatar.creatorName', 'The Urban Creator'],
    persona: ['avatar.creatorPersona', 'Music & Youth Culture Host'],
    style: ['avatar.creatorStyle', 'Creative Loft'],
    badge: ['avatar.creatorBadge', 'Urban Creator'],
    what: ['avatar.creatorWhat', 'Industrial loft studio, audio monitors, streetwear hoodie and premium studio headphones.'],
    aiPrompt: [
      'avatar.creatorPrompt',
      'Energetic urban music podcast creator in industrial loft studio, premium DJ headphones draped around neck, audio monitors and colorful sound foam in background, authentic expressive lighting.',
    ],
    accentColor: '#10b981',
    lighting: 'Daylight Loft + Color Fill',
  },
  {
    id: 'avatar-latenight',
    name: ['avatar.latenightName', 'The Late-Night Host'],
    persona: ['avatar.latenightPersona', 'Deep Dive & Mystery Broadcaster'],
    style: ['avatar.latenightStyle', 'Midnight Velvet'],
    badge: ['avatar.latenightBadge', 'Late Night'],
    what: ['avatar.latenightWhat', 'Moody dark velvet backdrop, dramatic directional spotlight, classic vintage chrome mic.'],
    aiPrompt: [
      'avatar.latenightPrompt',
      'Late-night deep dive radio host, dramatic chiaroscuro spotlighting, dark moody velvet backdrop, vintage 1950s chrome microphone, contemplative and charismatic presence.',
    ],
    accentColor: '#a855f7',
    lighting: 'Chiaroscuro Spotlight',
  },
  {
    id: 'avatar-afrofuturist',
    name: ['avatar.afroName', 'The Afrofuturistic Visionary'],
    persona: ['avatar.afroPersona', 'Pan-African Innovation Host'],
    style: ['avatar.afroStyle', 'Neo-African Elegance'],
    badge: ['avatar.afroBadge', 'Afrofuturist'],
    what: ['avatar.afroWhat', 'Vibrant gold and bronze aesthetic, illuminated geometric patterns, regal high-fashion styling.'],
    aiPrompt: [
      'avatar.afroPrompt',
      'Stunning Afrofuturistic podcast host, regal gold and geometric patterned high-fashion attire, warm luminous golden backlighting, modern sound studio with glowing architectural elements, visionary confidence.',
    ],
    accentColor: '#eab308',
    lighting: 'Golden Hour Radiance',
  },
];

export const avatarById = (id: string): AvatarTemplate | undefined =>
  AVATAR_TEMPLATES.find((one) => one.id === id);
