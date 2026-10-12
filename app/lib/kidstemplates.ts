/**
 * Pre-made adventure and song templates for the children's room.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"Die kids room het ook baie templates nodig vir
 * 'n kind om net van te kies."*
 *
 * ── Why templates for a child ────────────────────────────────────────────
 *
 * A six-year-old browsing twenty-three bubbles one by one can feel like
 * filling in a form. A template is an entire adventure ready to go with one
 * press — the topic, the sound, the rhythm, and the mascot's cheer already
 * picked out.
 *
 * Every template maps directly to a validated choice in `KID_TOPICS` and
 * `KID_SOUNDS`, ensuring zero desync with `kidsart.ts`, `kidslook.ts`, and
 * the Google Veo animation engine.
 */

export interface KidTemplate {
  readonly id: string;
  readonly topic: string;
  readonly sound: string;
  readonly category: 'adventures' | 'animals' | 'party' | 'calm';
  readonly title: readonly [string, string];
  readonly sub: readonly [string, string];
  readonly badge: readonly [string, string];
  readonly icon: string;
  readonly from: string;
  readonly to: string;
  readonly ink: string;
  readonly veoPrompt: string;
}

export const KID_TEMPLATES: readonly KidTemplate[] = [
  {
    id: 'kid-space-hero',
    topic: 'space',
    sound: 'rock',
    category: 'adventures',
    title: ['kids.tplSpaceTitle', 'Rocket to the Stars'],
    sub: ['kids.tplSpaceSub', 'Zoom past planets with rock guitars'],
    badge: ['kids.tplSpaceBadge', 'Galactic Rock'],
    icon: '🚀',
    from: '#7b61ff',
    to: '#4b2fd6',
    ink: '#fffaf2',
    veoPrompt: 'A colourful cartoon rocket ship zooming through starry nebulae and ringed planets.',
  },
  {
    id: 'kid-puppy-love',
    topic: 'dog',
    sound: 'happy',
    category: 'animals',
    title: ['kids.tplDogTitle', 'Happy Wagging Puppy'],
    sub: ['kids.tplDogSub', 'Catch balls and dance with your best dog friend'],
    badge: ['kids.tplDogBadge', 'Sunny Pop'],
    icon: '🐶',
    from: '#ffb020',
    to: '#ff7a18',
    ink: '#1a1206',
    veoPrompt: 'A playful golden puppy wagging its tail and jumping joyfully in a sunny backyard.',
  },
  {
    id: 'kid-dino-party',
    topic: 'dinos',
    sound: 'dance',
    category: 'animals',
    title: ['kids.tplDinoTitle', 'Dino Stomp & Dance'],
    sub: ['kids.tplDinoSub', 'Stomp big heavy feet to high energy dance beats'],
    badge: ['kids.tplDinoBadge', 'Dino Dance'],
    icon: '🦕',
    from: '#53d86a',
    to: '#1f9e46',
    ink: '#1a1206',
    veoPrompt: 'A friendly smiling baby dinosaur doing funny dance moves with party balloons.',
  },
  {
    id: 'kid-birthday-bash',
    topic: 'birthday',
    sound: 'dance',
    category: 'party',
    title: ['kids.tplBirthdayTitle', 'Big Birthday Party'],
    sub: ['kids.tplBirthdaySub', 'Blow out candles with confetti and singing'],
    badge: ['kids.tplBirthdayBadge', 'Party Time'],
    icon: '🎂',
    from: '#ff5fd2',
    to: '#c42bb0',
    ink: '#fffaf2',
    veoPrompt: 'A glowing birthday cake with sparkling candles, colourful confetti and party hats.',
  },
  {
    id: 'kid-ocean-wave',
    topic: 'sea',
    sound: 'happy',
    category: 'adventures',
    title: ['kids.tplSeaTitle', 'Ocean Splash & Dolphins'],
    sub: ['kids.tplSeaSub', 'Dive under turquoise waves with funny little fish'],
    badge: ['kids.tplSeaBadge', 'Ocean Waves'],
    icon: '🐬',
    from: '#2fd0e0',
    to: '#0e9bb8',
    ink: '#1a1206',
    veoPrompt: 'Two friendly dolphins leaping over sunny ocean waves with sparkling splashes.',
  },
  {
    id: 'kid-sleepy-moon',
    topic: 'bedtime',
    sound: 'quiet',
    category: 'calm',
    title: ['kids.tplBedtimeTitle', 'Sleepy Teddy & Moon'],
    sub: ['kids.tplBedtimeSub', 'Soft warm lullaby for cozy peaceful dreams'],
    badge: ['kids.tplBedtimeBadge', 'Sweet Dreams'],
    icon: '🌙',
    from: '#5a63b8',
    to: '#2f3578',
    ink: '#fffaf2',
    veoPrompt: 'A cozy crescent moon gently rocking a sleeping teddy bear among stars.',
  },
  {
    id: 'kid-farm-friends',
    topic: 'farm',
    sound: 'country',
    category: 'animals',
    title: ['kids.tplFarmTitle', 'Farm Animal Sing-Along'],
    sub: ['kids.tplFarmSub', 'Cows and chickens singing on the red barn porch'],
    badge: ['kids.tplFarmBadge', 'Farm Country'],
    icon: '🚜',
    from: '#d6b24a',
    to: '#a67c1f',
    ink: '#1a1206',
    veoPrompt: 'A sunny farm yard with a red tractor and friendly barnyard animals swaying to music.',
  },
  {
    id: 'kid-brave-hero',
    topic: 'brave',
    sound: 'rock',
    category: 'adventures',
    title: ['kids.tplBraveTitle', 'Brave Superhero Cape'],
    sub: ['kids.tplBraveSub', 'Stand tall and strong with your superhero cape on'],
    badge: ['kids.tplBraveBadge', 'Hero Anthem'],
    icon: '🦸',
    from: '#ff8a3d',
    to: '#e2521a',
    ink: '#fffaf2',
    veoPrompt: 'A cheerful little superhero flying with a cape over cartoon clouds in blue skies.',
  },
  {
    id: 'kid-rain-puddle',
    topic: 'rain',
    sound: 'funny',
    category: 'calm',
    title: ['kids.tplRainTitle', 'Puddle Jumper Splash'],
    sub: ['kids.tplRainSub', 'Jump in muddy puddles with squeaky yellow boots'],
    badge: ['kids.tplRainBadge', 'Silly Splash'],
    icon: '☔',
    from: '#58a6ff',
    to: '#2b6fe0',
    ink: '#fffaf2',
    veoPrompt: 'Bright yellow rainboots splashing cheerfully in puddles under a colourful umbrella.',
  },
  {
    id: 'kid-rainbow-magic',
    topic: 'colours',
    sound: 'dance',
    category: 'party',
    title: ['kids.tplColoursTitle', 'Rainbow Magic Paint'],
    sub: ['kids.tplColoursSub', 'Splash every bright colour in a cheerful dance party'],
    badge: ['kids.tplColoursBadge', 'Vivid Dance'],
    icon: '🌈',
    from: '#ff4d6d',
    to: '#d61f45',
    ink: '#fffaf2',
    veoPrompt: 'An explosion of rainbow paint droplets dancing playfully to rhythm across the screen.',
  },
  {
    id: 'kid-marching-band',
    topic: 'counting',
    sound: 'march',
    category: 'party',
    title: ['kids.tplCountTitle', '1-2-3 Parade Drum'],
    sub: ['kids.tplCountSub', 'March in step from one to ten with steady snare drums'],
    badge: ['kids.tplCountBadge', 'Parade March'],
    icon: '🥁',
    from: '#43c6ac',
    to: '#1a8f85',
    ink: '#1a1206',
    veoPrompt: 'A marching parade of wooden number blocks holding little flags and playing drums.',
  },
  {
    id: 'kid-kitten-play',
    topic: 'cat',
    sound: 'funny',
    category: 'animals',
    title: ['kids.tplCatTitle', 'Playful Kitty Mischief'],
    sub: ['kids.tplCatSub', 'Sneak around and pounce on a yarn ball all night'],
    badge: ['kids.tplCatBadge', 'Playful Pop'],
    icon: '🐱',
    from: '#ff6fa5',
    to: '#ff3d7f',
    ink: '#fffaf2',
    veoPrompt: 'A cute fluffy cartoon kitten batting a rolling yarn ball and doing silly pounces.',
  },
  {
    id: 'kid-circus-friends',
    topic: 'friends',
    sound: 'funny',
    category: 'party',
    title: ['kids.tplFriendsTitle', 'Circus Giggles & Friends'],
    sub: ['kids.tplFriendsSub', 'Silly sound effects and tuba toons with best friends'],
    badge: ['kids.tplFriendsBadge', 'Silly Giggle'],
    icon: '🎪',
    from: '#ff9e7d',
    to: '#e85d3a',
    ink: '#1a1206',
    veoPrompt: 'Two cheerful cartoon friends wearing clown hats balancing balls and laughing.',
  },
  {
    id: 'kid-school-bell',
    topic: 'school',
    sound: 'happy',
    category: 'adventures',
    title: ['kids.tplSchoolTitle', 'First Day of School'],
    sub: ['kids.tplSchoolSub', 'Grab your satchel and pencil and make brand new friends'],
    badge: ['kids.tplSchoolBadge', 'School Cheer'],
    icon: '🎒',
    from: '#45b7ff',
    to: '#1178cc',
    ink: '#fffaf2',
    veoPrompt: 'A bright cartoon classroom with an open backpack smiling and welcoming new pupils.',
  },
] as const;
