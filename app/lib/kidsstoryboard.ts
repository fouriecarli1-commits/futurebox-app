/**
 * Interactive Storyboard logic and data for the child's story studio.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner, 12 October 2026: *"Ek sien ook nie 'n story generation plek waar 'n
 * storie gegenereer kan word nie, die storie moet ook visuals kan genereer.
 * Kinders moet ook met stem kan prompt vir stories of musiek. Maar daar moet
 * ook maklike buttons wees wat 'n storie of liedjie bou. Ek dink met 'n
 * story board moet daar na prompting 'n page op kom wat dan storielyn
 * suggestions op gooi, dan het elke seksie 4 keuses, en dan bou hulle self
 * die storie lyn. Dieselfde direk daarna wanneer die visuals vir die storie
 * gekies moet word, dan moet daar ook visual suggestions op kom. Dit moet
 * interactive wees, en ek dink daai spin, en spelletjies wat dit fun en
 * interactive en spellerig maak gaan hulle engaged hou."*
 *
 * ── The four storyline sections, with 4 choices each ─────────────────────
 *
 * 1. Hero / Character (Wie is ons held?)
 * 2. Adventure / Setting (Waarheen gaan die reis?)
 * 3. Twist / Secret Challenge (Wat is die groot verrassing?)
 * 4. Happy Ending (Hoe loop dit gelukkig af?)
 *
 * Directly followed by 4 visual style choices to generate illustrations.
 */

import type { KeptPage, KeptStory } from './storykeep';

export interface StoryChoice {
  readonly id: string;
  readonly emoji: string;
  readonly title: readonly [string, string];
  readonly blurb: readonly [string, string];
  readonly paint: { readonly from: string; readonly to: string; readonly ink: string };
  readonly visualScene: string;
}

export interface StorySection {
  readonly id: string;
  readonly number: number;
  readonly title: readonly [string, string];
  readonly prompt: readonly [string, string];
  readonly choices: readonly StoryChoice[];
}

export interface VisualStyle {
  readonly id: string;
  readonly emoji: string;
  readonly name: readonly [string, string];
  readonly desc: readonly [string, string];
  readonly badge: readonly [string, string];
  readonly stylePrompt: string;
  readonly bgGradient: string;
}

/** 4 Storyline Sections with 4 curated choices each. */
export const STORY_SECTIONS: readonly StorySection[] = [
  {
    id: 'hero',
    number: 1,
    title: ['kids.storySec1Title', 'Step 1: Choose Your Hero'],
    prompt: ['kids.storySec1Prompt', 'Who is the hero of our adventure?'],
    choices: [
      {
        id: 'cat',
        emoji: '🐱',
        title: ['kids.heroCatTitle', 'Cosmo the Space Cat'],
        blurb: ['kids.heroCatBlurb', 'A brave kitten with a glowing helmet'],
        paint: { from: '#f59e0b', to: '#d97706', ink: '#ffffff' },
        visualScene: 'A cute brave ginger kitten wearing a shiny astronaut helmet and tiny boots',
      },
      {
        id: 'dino',
        emoji: '🦕',
        title: ['kids.heroDinoTitle', 'Barnaby the Friendly Dino'],
        blurb: ['kids.heroDinoBlurb', 'A cheerful baby brontosaurus who loves music'],
        paint: { from: '#10b981', to: '#059669', ink: '#ffffff' },
        visualScene: 'A gentle green baby cartoon dinosaur wearing a flower garland and smiling happily',
      },
      {
        id: 'fairy',
        emoji: '🧚',
        title: ['kids.heroFairyTitle', 'Lola the Magic Fairy'],
        blurb: ['kids.heroFairyBlurb', 'Spreads sparkling star dust everywhere'],
        paint: { from: '#ec4899', to: '#be185d', ink: '#ffffff' },
        visualScene: 'A sparkling little fairy with glowing wings carrying a golden magical star wand',
      },
      {
        id: 'pup',
        emoji: '🐶',
        title: ['kids.heroPupTitle', 'Pip the Detective Puppy'],
        blurb: ['kids.heroPupBlurb', 'Sniffs out secret treasure and lost toys'],
        paint: { from: '#3b82f6', to: '#1d4ed8', ink: '#ffffff' },
        visualScene: 'A joyful floppy-eared puppy detective with a magnifying glass and a little cape',
      },
    ],
  },
  {
    id: 'setting',
    number: 2,
    title: ['kids.storySec2Title', 'Step 2: The Adventure Setting'],
    prompt: ['kids.storySec2Prompt', 'Where does the magical journey begin?'],
    choices: [
      {
        id: 'rainbow-planet',
        emoji: '🪐',
        title: ['kids.settingRainbowTitle', 'The Rainbow Planet'],
        blurb: ['kids.settingRainbowBlurb', 'Floating islands surrounded by pastel rings and stars'],
        paint: { from: '#8b5cf6', to: '#6d28d9', ink: '#ffffff' },
        visualScene: 'in a magical rainbow galaxy with pastel coloured floating clouds and smiling planets',
      },
      {
        id: 'cloud-castle',
        emoji: '🏰',
        title: ['kids.settingCastleTitle', 'The Cloud Castle'],
        blurb: ['kids.settingCastleBlurb', 'Fluffy marshmallow towers high in the warm sky'],
        paint: { from: '#06b6d4', to: '#0891b2', ink: '#ffffff' },
        visualScene: 'outside a whimsical golden castle sitting on soft puffy clouds with flying butterflies',
      },
      {
        id: 'crystal-ocean',
        emoji: '🌊',
        title: ['kids.settingOceanTitle', 'The Crystal Coral Ocean'],
        blurb: ['kids.settingOceanBlurb', 'Friendly singing dolphins and glowing sea shells'],
        paint: { from: '#14b8a6', to: '#0f766e', ink: '#ffffff' },
        visualScene: 'under a sunlit turquoise sea with colourful corals, sea turtles, and bubble trails',
      },
      {
        id: 'candy-forest',
        emoji: '🍭',
        title: ['kids.settingForestTitle', 'The Whispering Candy Forest'],
        blurb: ['kids.settingForestBlurb', 'Lollipop trees and sparkling honey rivers'],
        paint: { from: '#f43f5e', to: '#e11d48', ink: '#ffffff' },
        visualScene: 'in an enchanted forest made of giant candy canes, jellybean stepping stones, and glow mushrooms',
      },
    ],
  },
  {
    id: 'twist',
    number: 3,
    title: ['kids.storySec3Title', 'Step 3: The Big Discovery'],
    prompt: ['kids.storySec3Prompt', 'What surprising secret do they discover?'],
    choices: [
      {
        id: 'magic-key',
        emoji: '🗝️',
        title: ['kids.twistKeyTitle', 'A Golden Magic Key'],
        blurb: ['kids.twistKeyBlurb', 'Unlocks a giant glowing chest full of musical instruments'],
        paint: { from: '#eab308', to: '#ca8a04', ink: '#ffffff' },
        visualScene: 'discovering a floating golden key that shines bright sparkles and unlocks a musical chest',
      },
      {
        id: 'baby-dragon',
        emoji: '🐲',
        title: ['kids.twistDragonTitle', 'A Lost Baby Dragon'],
        blurb: ['kids.twistDragonBlurb', 'Sneezes tiny pink smoke rings and needs a cuddly friend'],
        paint: { from: '#f97316', to: '#c2410c', ink: '#ffffff' },
        visualScene: 'hugging a sweet little baby dragon that puffs harmless heart-shaped pink smoke rings',
      },
      {
        id: 'flying-cake',
        emoji: '🎂',
        title: ['kids.twistCakeTitle', 'A Giant Flying Birthday Cake'],
        blurb: ['kids.twistCakeBlurb', 'Spins to cheerful party tunes and drops sweet treats'],
        paint: { from: '#d946ef', to: '#a21caf', ink: '#ffffff' },
        visualScene: 'riding aboard a massive three-tier flying cake with sparkler candles and strawberry balloons',
      },
      {
        id: 'alien-ship',
        emoji: '🛸',
        title: ['kids.twistShipTitle', 'The Friendly Glitter Saucer'],
        blurb: ['kids.twistShipBlurb', 'Plays happy electronic beats and invites everyone to dance'],
        paint: { from: '#6366f1', to: '#4338ca', ink: '#ffffff' },
        visualScene: 'dancing with friendly little star aliens around a glowing spaceship that plays music',
      },
    ],
  },
  {
    id: 'ending',
    number: 4,
    title: ['kids.storySec4Title', 'Step 4: The Happy Ending'],
    prompt: ['kids.storySec4Prompt', 'How does the adventure celebrate?'],
    choices: [
      {
        id: 'great-party',
        emoji: '🎉',
        title: ['kids.endingPartyTitle', 'The Grand Celebration'],
        blurb: ['kids.endingPartyBlurb', 'All the forest and star creatures dance until sunset'],
        paint: { from: '#10b981', to: '#047857', ink: '#ffffff' },
        visualScene: 'a joyous victory festival where all the animal friends dance with party hats and confetti',
      },
      {
        id: 'rainbow-bridge',
        emoji: '🌈',
        title: ['kids.endingRainbowTitle', 'The Rainbow Slide Home'],
        blurb: ['kids.endingRainbowBlurb', 'A glowing rainbow slides them safely right back to their bed'],
        paint: { from: '#0ea5e9', to: '#0284c7', ink: '#ffffff' },
        visualScene: 'sliding happily down a warm rainbow slide back towards a cozy home under the orange sunset',
      },
      {
        id: 'hero-medals',
        emoji: '🥇',
        title: ['kids.endingMedalsTitle', 'Golden Star Medals'],
        blurb: ['kids.endingMedalsBlurb', 'Awarded the Kindest Explorer award by the Star King'],
        paint: { from: '#eab308', to: '#a16207', ink: '#ffffff' },
        visualScene: 'standing proudly on a podium receiving shiny gold star medals while crowd cheers joyfully',
      },
      {
        id: 'cozy-sleep',
        emoji: '🌙',
        title: ['kids.endingSleepTitle', 'Sweet Dreams Under Stars'],
        blurb: ['kids.endingSleepBlurb', 'Tucked warmly under a blanket with their favourite plushie'],
        paint: { from: '#6366f1', to: '#3730a3', ink: '#ffffff' },
        visualScene: 'fast asleep in a warm cozy bed holding a stuffed toy while gentle stars glow through the window',
      },
    ],
  },
];

/** 4 Visual Style Suggestions. */
export const VISUAL_STYLES: readonly VisualStyle[] = [
  {
    id: '3d-toon',
    emoji: '🎨',
    name: ['kids.visual3dName', '3D Animation Style'],
    desc: ['kids.visual3dDesc', 'Bright Pixar-like 3D characters with vibrant colors and warmth'],
    badge: ['kids.visual3dBadge', '3D Pixar Pop'],
    stylePrompt: '3D Pixar and Disney animation render, vibrant playful lighting, rich smooth textures, family friendly, bright cheerful colors, high detail CGI',
    bgGradient: 'from-amber-400 via-orange-500 to-rose-500',
  },
  {
    id: 'watercolor',
    emoji: '🏰',
    name: ['kids.visualWaterName', 'Fairy Tale Watercolor'],
    desc: ['kids.visualWaterDesc', 'Soft dreaming pastels, gentle brush strokes and fairy dust'],
    badge: ['kids.visualWaterBadge', 'Storybook Glow'],
    stylePrompt: 'gentle children fairy tale watercolor illustration, soft glowing edges, magical sparkles, warm pastel wash, Beatrix Potter storybook art style',
    bgGradient: 'from-teal-300 via-sky-400 to-indigo-500',
  },
  {
    id: 'neon-glow',
    emoji: '🚀',
    name: ['kids.visualNeonName', 'Cosmic Neon Glow'],
    desc: ['kids.visualNeonDesc', 'Electric star dust, glowing neon lines and cosmic sparkle'],
    badge: ['kids.visualNeonBadge', 'Galaxy Glow'],
    stylePrompt: 'luminous cosmic neon digital art for kids, radiant magical glow, vivid violet and cyan sparkles, cute friendly anime storybook feel',
    bgGradient: 'from-fuchsia-500 via-purple-600 to-cyan-500',
  },
  {
    id: 'crayon',
    emoji: '🖍️',
    name: ['kids.visualCrayonName', 'Warm Crayon & Chalk'],
    desc: ['kids.visualCrayonDesc', 'Hand-drawn picture-book charm, warm textures, cozy lines'],
    badge: ['kids.visualCrayonBadge', 'Handmade Cozy'],
    stylePrompt: 'hand-drawn colorful children picture book illustration, soft wax crayon and colored pencil texture, charming naive storybook art, bright cheerful',
    bgGradient: 'from-emerald-400 via-yellow-400 to-orange-400',
  },
];

/** Pre-set quick adventure seeds for fast 1-tap starts. */
export const QUICK_STORY_SEEDS = [
  { id: 'space-cat', emoji: '🚀', label: ['kids.quickSeedSpace', 'Space Cat Adventure'], hero: 'cat', setting: 'rainbow-planet', twist: 'alien-ship', ending: 'great-party', visual: '3d-toon' },
  { id: 'dino-key', emoji: '🦕', label: ['kids.quickSeedDino', 'Dino & the Magic Key'], hero: 'dino', setting: 'candy-forest', twist: 'magic-key', ending: 'rainbow-bridge', visual: 'crayon' },
  { id: 'fairy-dragon', emoji: '🧚', label: ['kids.quickSeedFairy', 'Fairy & Baby Dragon'], hero: 'fairy', setting: 'cloud-castle', twist: 'baby-dragon', ending: 'cozy-sleep', visual: 'watercolor' },
  { id: 'pup-cake', emoji: '🐶', label: ['kids.quickSeedPup', 'Detective Pup & Flying Cake'], hero: 'pup', setting: 'crystal-ocean', twist: 'flying-cake', ending: 'hero-medals', visual: '3d-toon' },
] as const;

/** Creates a vector SVG scene illustration for an illustrated page. */
export function createSceneSvg(
  heroEmoji: string,
  settingEmoji: string,
  twistEmoji: string,
  styleId: string,
  pageIndex: number,
  title: string,
): string {
  const gradients: Record<string, [string, string, string]> = {
    '3d-toon': ['#fbbf24', '#f97316', '#ec4899'],
    watercolor: ['#a7f3d0', '#67e8f9', '#818cf8'],
    'neon-glow': ['#c084fc', '#38bdf8', '#06b6d4'],
    crayon: ['#fde047', '#fb923c', '#4ade80'],
  };
  const [c1, c2, c3] = gradients[styleId] ?? ['#38bdf8', '#818cf8', '#c084fc'];
  const emojis = [heroEmoji, settingEmoji, twistEmoji, '🌟'];
  const centerEmoji = emojis[pageIndex % emojis.length] ?? heroEmoji;
  const companionEmoji = emojis[(pageIndex + 1) % emojis.length] ?? settingEmoji;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}" />
      <stop offset="50%" stop-color="${c2}" />
      <stop offset="100%" stop-color="${c3}" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="800" height="600" rx="40" fill="url(#bgGrad)" />
  <circle cx="150" cy="120" r="80" fill="#ffffff" fill-opacity="0.18" />
  <circle cx="680" cy="140" r="110" fill="#ffffff" fill-opacity="0.15" />
  <circle cx="700" cy="480" r="90" fill="#ffffff" fill-opacity="0.12" />
  <circle cx="100" cy="460" r="60" fill="#ffffff" fill-opacity="0.18" />
  <path d="M 0 520 Q 200 460 400 500 T 800 510 L 800 600 L 0 600 Z" fill="#ffffff" fill-opacity="0.25" />
  <g filter="url(#shadow)">
    <circle cx="400" cy="270" r="140" fill="#ffffff" fill-opacity="0.92" />
    <text x="400" y="325" font-size="120" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">${centerEmoji}</text>
  </g>
  <g filter="url(#shadow)">
    <circle cx="560" cy="380" r="65" fill="#ffffff" fill-opacity="0.9" />
    <text x="560" y="410" font-size="58" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, sans-serif">${companionEmoji}</text>
  </g>
  <g filter="url(#shadow)">
    <circle cx="240" cy="380" r="45" fill="#ffffff" fill-opacity="0.88" />
    <text x="240" y="400" font-size="40" text-anchor="middle">✨</text>
  </g>
  <g>
    <rect x="100" y="490" width="600" height="70" rx="24" fill="#ffffff" fill-opacity="0.92" />
    <text x="400" y="535" font-size="24" font-weight="900" fill="#0f172a" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif">${title}</text>
  </g>
</svg>`;
}

/** Generates synthetic audio blob containing spoken or cheerful musical tones. */
export async function createKidAudioBlob(seconds = 6): Promise<Blob> {
  const sampleRate = 22050;
  const numSamples = sampleRate * seconds;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  /* Write WAV Header */
  const writeString = (offset: number, string: string): void => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  /* Cheerful child harp music chimes */
  const melody = [261.63, 329.63, 392.00, 523.25, 440.00, 392.00, 329.63, 261.63];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const note = melody[Math.floor((t * 2) % melody.length)] ?? 261.63;
    const env = Math.exp(-((t % 0.5) * 5));
    const sample = Math.sin(2 * Math.PI * note * t) * 0.4 * env;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(44 + i * 2, intSample, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/** Generates a complete illustrated 4-page KeptStory. */
export async function buildStoryboardStory({
  heroId,
  settingId,
  twistId,
  endingId,
  visualStyleId,
  lang,
  say,
}: {
  readonly heroId: string;
  readonly settingId: string;
  readonly twistId: string;
  readonly endingId: string;
  readonly visualStyleId: string;
  readonly lang: 'af' | 'en';
  /**
   * Turns a choice's `[key, English]` into words in the language chosen.
   * The pages read `title[0]` as English and `title[1]` as Afrikaans, and a
   * title is `[key, English]` — so English stories printed
   * "kids.heroDinoTitle" (The owner's screenshot, 15 October 2026) and Afrikaans
   * ones printed English. Both pages now take the name from here.
   */
  readonly say: (pair: readonly [string, string]) => string;
}): Promise<KeptStory> {
  const name = (choice: { readonly title: readonly [string, string] }): readonly [string, string] => {
    const words = say(choice.title);
    return [words, words];
  };
  const hero = STORY_SECTIONS[0].choices.find((c) => c.id === heroId) ?? STORY_SECTIONS[0].choices[0];
  const setting = STORY_SECTIONS[1].choices.find((c) => c.id === settingId) ?? STORY_SECTIONS[1].choices[0];
  const twist = STORY_SECTIONS[2].choices.find((c) => c.id === twistId) ?? STORY_SECTIONS[2].choices[0];
  const ending = STORY_SECTIONS[3].choices.find((c) => c.id === endingId) ?? STORY_SECTIONS[3].choices[0];
  const visual = VISUAL_STYLES.find((v) => v.id === visualStyleId) ?? VISUAL_STYLES[0];

  const title = lang === 'af'
    ? `${name(hero)[1]} en die Avontuur by ${name(setting)[1]}`
    : `${name(hero)[0]} and the Adventure at ${name(setting)[0]}`;

  /* The 4 story pages */
  const pageTexts: readonly [string, string][] = [
    [
      `Once upon a time, ${name(hero)[0]} was getting ready for a brand new day! With a joyful bounce, our brave hero stepped out into the world, excited to discover something wonderful.`,
      `Eendag lank gelede het ${name(hero)[1]} reggemaak vir 'n splinternuwe dag! Met 'n vrolike sprong het ons heldjie die wye w\u00eareld ingestap, gereed om iets wonderliks te ontdek.`,
    ],
    [
      `The journey led all the way to ${name(setting)[0]}! Everywhere you looked, magical sparkles filled the air, and gentle breeze sang a cheerful song through the clouds.`,
      `Die avontuur het al die pad na ${name(setting)[1]} gelei! Oral waar jy kyk het magiese glinsters geskitter, en 'n sagte briesie het 'n vrolike liedjie gesing.`,
    ],
    [
      `Suddenly, right in the middle of the path, what a surprise: ${name(twist)[0]}! "Look at that!" cheered ${name(hero)[0]}. It was the most magical discovery in the whole kingdom.`,
      `Skielik, reg in die middel van die pad, was daar 'n reuse verrassing: ${name(twist)[1]}! "Kyk net daar!" het ${name(hero)[1]} uitgeroep. Dit was die wonderlikste geheim in die hele land.`,
    ],
    [
      `Everyone gathered together for ${name(ending)[0]}! They laughed, danced, and knew that true friendship and brave curiosity are the greatest magic of all. The End!`,
      `Almal het vrolik bymekaargekom vir ${name(ending)[1]}! Hulle het gelag, gedans en geweet dat ware vriendskap en dapperheid die heel grootste magie is. Fluit-fluit, die storie is uit!`,
    ],
  ];

  const pages: KeptPage[] = [];
  const audioBlob = await createKidAudioBlob(6);

  for (let i = 0; i < pageTexts.length; i++) {
    const textPair = pageTexts[i];
    const pageText = lang === 'af' ? textPair[1] : textPair[0];
    const pageShortTitle = `${hero.emoji} ${name(hero)[0]} · ${i + 1}/4`;
    const svgCode = createSceneSvg(hero.emoji, setting.emoji, twist.emoji, visual.id, i, pageShortTitle);
    const picBlob = new Blob([svgCode], { type: 'image/svg+xml' });

    pages.push({
      text: pageText,
      picture: picBlob,
      audio: audioBlob,
      seconds: 6,
    });
  }

  return {
    id: `kidstory-${Date.now()}`,
    title,
    made: Date.now(),
    pages,
  };
}
