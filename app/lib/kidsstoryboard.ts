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

/**
 * The four storyline steps, twenty cards each.
 *
 * The owner, 19 October 2026: *"Daar is heeltemal te min storielyne. Ons
 * moet seker 10 verskillendes van elke opsie hê, dan moet jy 'n nota maak
 * dat ons elke 30 dae nuwe storielyn opsies shuffle."* Four a step was too
 * few. Each step now holds twenty, and `cardsNow` shows ten of them, a
 * different ten every thirty days — see `ROTATE_DAYS` and
 * `docs/KIDS-STORY-CARDS.md` for the note on adding new ones.
 *
 * Every card stays valid for the story engine whether it is showing or not,
 * so a world or a kept choice from last month still writes a story.
 */
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
      {
        id: 'robot',
        emoji: '🤖',
        title: ['kids.card.robot', 'Bolt the Little Robot'],
        blurb: ['kids.card.robot.b', 'A tiny robot who beeps a happy tune'],
        paint: { from: '#64748b', to: '#334155', ink: '#ffffff' },
        visualScene: 'a small round friendly robot with glowing blue eyes and a little antenna',
      },
      {
        id: 'unicorn',
        emoji: '🦄',
        title: ['kids.card.unicorn', 'Sparkle the Unicorn'],
        blurb: ['kids.card.unicorn.b', 'Leaves a trail of rainbow glitter'],
        paint: { from: '#e879f9', to: '#a855f7', ink: '#ffffff' },
        visualScene: 'a gentle white unicorn with a pastel rainbow mane and a shiny horn',
      },
      {
        id: 'turtle',
        emoji: '🐢',
        title: ['kids.card.turtle', 'Shelly the Sea Turtle'],
        blurb: ['kids.card.turtle.b', 'Slow, wise and always kind'],
        paint: { from: '#2dd4bf', to: '#0f766e', ink: '#ffffff' },
        visualScene: 'a smiling green sea turtle with a patterned shell and a little backpack',
      },
      {
        id: 'lion',
        emoji: '🦁',
        title: ['kids.card.lion', 'Leo the Lion Cub'],
        blurb: ['kids.card.lion.b', 'Practising his very first roar'],
        paint: { from: '#f59e0b', to: '#b45309', ink: '#ffffff' },
        visualScene: 'a fluffy golden lion cub with a tiny mane and big curious eyes',
      },
      {
        id: 'bunny',
        emoji: '🐰',
        title: ['kids.card.bunny', 'Bella the Ballet Bunny'],
        blurb: ['kids.card.bunny.b', 'Twirls on her tippy toes'],
        paint: { from: '#f9a8d4', to: '#db2777', ink: '#ffffff' },
        visualScene: 'a white bunny in a pink tutu twirling on her toes',
      },
      {
        id: 'penguin',
        emoji: '🐧',
        title: ['kids.card.penguin', 'Pingo the Penguin'],
        blurb: ['kids.card.penguin.b', 'Slides everywhere on his tummy'],
        paint: { from: '#38bdf8', to: '#1e40af', ink: '#ffffff' },
        visualScene: 'a cheerful little penguin with a red scarf sliding on ice',
      },
      {
        id: 'monkey',
        emoji: '🐵',
        title: ['kids.card.monkey', 'Milo the Monkey'],
        blurb: ['kids.card.monkey.b', 'Swings, jokes and loves bananas'],
        paint: { from: '#d97706', to: '#92400e', ink: '#ffffff' },
        visualScene: 'a playful brown monkey hanging from a vine with a big grin',
      },
      {
        id: 'mermaid',
        emoji: '🧜',
        title: ['kids.card.mermaid', 'Marina the Mermaid'],
        blurb: ['kids.card.mermaid.b', 'Sings with the dolphins'],
        paint: { from: '#06b6d4', to: '#0e7490', ink: '#ffffff' },
        visualScene: 'a young mermaid with a turquoise tail and shells in her hair',
      },
      {
        id: 'knight',
        emoji: '🛡️',
        title: ['kids.card.knight', 'Sir Sam the Tiny Knight'],
        blurb: ['kids.card.knight.b', 'Brave, polite and a little bit small'],
        paint: { from: '#94a3b8', to: '#475569', ink: '#ffffff' },
        visualScene: 'a tiny brave knight in shiny cardboard armour with a wooden sword',
      },
      {
        id: 'elephant',
        emoji: '🐘',
        title: ['kids.card.elephant', 'Ellie the Elephant'],
        blurb: ['kids.card.elephant.b', 'Never forgets a friend'],
        paint: { from: '#a8a29e', to: '#57534e', ink: '#ffffff' },
        visualScene: 'a cuddly grey baby elephant with big floppy ears and a flower',
      },
      {
        id: 'fox',
        emoji: '🦊',
        title: ['kids.card.fox', 'Fynn the Fox'],
        blurb: ['kids.card.fox.b', 'Clever and full of ideas'],
        paint: { from: '#fb923c', to: '#c2410c', ink: '#ffffff' },
        visualScene: 'a clever little orange fox with a bushy tail and a satchel',
      },
      {
        id: 'ladybird',
        emoji: '🐞',
        title: ['kids.card.ladybird', 'Lulu the Ladybird'],
        blurb: ['kids.card.ladybird.b', 'Counts her spots for luck'],
        paint: { from: '#ef4444', to: '#b91c1c', ink: '#ffffff' },
        visualScene: 'a tiny red ladybird with black spots and big friendly eyes',
      },
      {
        id: 'meerkat',
        emoji: '🐾',
        title: ['kids.card.meerkat', 'Max the Meerkat'],
        blurb: ['kids.card.meerkat.b', 'Stands up tall to look out for friends'],
        paint: { from: '#d6a76c', to: '#8a5a2b', ink: '#ffffff' },
        visualScene: 'a little meerkat standing up tall on a sand dune, looking out',
      },
      {
        id: 'giraffe',
        emoji: '🦒',
        title: ['kids.card.giraffe', 'Gina the Giraffe'],
        blurb: ['kids.card.giraffe.b', 'Can see over every tree'],
        paint: { from: '#facc15', to: '#a16207', ink: '#ffffff' },
        visualScene: 'a tall spotty giraffe with a long neck and a sun hat',
      },
      {
        id: 'astronaut',
        emoji: '🧑‍🚀',
        title: ['kids.card.astronaut', 'Zara the Young Astronaut'],
        blurb: ['kids.card.astronaut.b', 'Dreams of visiting every planet'],
        paint: { from: '#818cf8', to: '#4338ca', ink: '#ffffff' },
        visualScene: 'a cheerful young astronaut child in a white space suit with a sparkly patch',
      },
      {
        id: 'owl',
        emoji: '🦉',
        title: ['kids.card.owl', 'Ollie the Night Owl'],
        blurb: ['kids.card.owl.b', 'Knows every star by name'],
        paint: { from: '#a78bfa', to: '#5b21b6', ink: '#ffffff' },
        visualScene: 'a round little owl with big glasses sitting on a branch at night',
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
      {
        id: 'savanna',
        emoji: '🌅',
        title: ['kids.card.savanna', 'The Golden Savanna'],
        blurb: ['kids.card.savanna.b', 'Acacia trees and a big orange sunset'],
        paint: { from: '#f59e0b', to: '#c2410c', ink: '#ffffff' },
        visualScene: 'on a warm African savanna with acacia trees, zebras and a big orange sunset',
      },
      {
        id: 'moon-base',
        emoji: '🌙',
        title: ['kids.card.moon-base', 'The Moon Base'],
        blurb: ['kids.card.moon-base.b', 'Bouncy craters and a view of Earth'],
        paint: { from: '#94a3b8', to: '#334155', ink: '#ffffff' },
        visualScene: 'on the moon with bouncy grey craters, a little dome base and the blue Earth in the sky',
      },
      {
        id: 'jungle',
        emoji: '🌴',
        title: ['kids.card.jungle', 'The Whispering Jungle'],
        blurb: ['kids.card.jungle.b', 'Giant leaves and singing parrots'],
        paint: { from: '#22c55e', to: '#15803d', ink: '#ffffff' },
        visualScene: 'in a lush green jungle with giant leaves, waterfalls and colourful parrots',
      },
      {
        id: 'snow-mountain',
        emoji: '🏔️',
        title: ['kids.card.snow-mountain', 'The Snowy Mountain'],
        blurb: ['kids.card.snow-mountain.b', 'Sledges, snowflakes and hot chocolate'],
        paint: { from: '#bae6fd', to: '#0369a1', ink: '#ffffff' },
        visualScene: 'on a snowy mountain with sparkling snowflakes, pine trees and a cosy cabin',
      },
      {
        id: 'toy-shop',
        emoji: '🧸',
        title: ['kids.card.toy-shop', 'The Midnight Toy Shop'],
        blurb: ['kids.card.toy-shop.b', 'Where the toys wake up at night'],
        paint: { from: '#f472b6', to: '#9d174d', ink: '#ffffff' },
        visualScene: 'inside a cosy toy shop at midnight where teddies and toy trains come alive',
      },
      {
        id: 'volcano-island',
        emoji: '🌋',
        title: ['kids.card.volcano-island', 'Volcano Island'],
        blurb: ['kids.card.volcano-island.b', 'A friendly volcano that puffs bubbles'],
        paint: { from: '#f97316', to: '#9a3412', ink: '#ffffff' },
        visualScene: 'on a tropical island with a friendly smiling volcano puffing rainbow bubbles',
      },
      {
        id: 'treehouse-city',
        emoji: '🌳',
        title: ['kids.card.treehouse-city', 'The Treehouse City'],
        blurb: ['kids.card.treehouse-city.b', 'Rope bridges between the treetops'],
        paint: { from: '#84cc16', to: '#3f6212', ink: '#ffffff' },
        visualScene: 'in a city of treehouses joined by rope bridges high in giant trees',
      },
      {
        id: 'desert-oasis',
        emoji: '🏜️',
        title: ['kids.card.desert-oasis', 'The Desert Oasis'],
        blurb: ['kids.card.desert-oasis.b', 'Palm trees around a shimmering pool'],
        paint: { from: '#fbbf24', to: '#b45309', ink: '#ffffff' },
        visualScene: 'at a peaceful desert oasis with palm trees, camels and a shimmering blue pool',
      },
      {
        id: 'dino-valley',
        emoji: '🦖',
        title: ['kids.card.dino-valley', 'Dinosaur Valley'],
        blurb: ['kids.card.dino-valley.b', 'Where gentle dinosaurs still roam'],
        paint: { from: '#4ade80', to: '#166534', ink: '#ffffff' },
        visualScene: 'in a green valley full of gentle dinosaurs, ferns and a misty waterfall',
      },
      {
        id: 'music-city',
        emoji: '🎺',
        title: ['kids.card.music-city', 'The City of Music'],
        blurb: ['kids.card.music-city.b', 'Houses shaped like instruments'],
        paint: { from: '#c084fc', to: '#7e22ce', ink: '#ffffff' },
        visualScene: 'in a bright city where the houses are shaped like guitars, drums and trumpets',
      },
      {
        id: 'pirate-ship',
        emoji: '🏴‍☠️',
        title: ['kids.card.pirate-ship', 'The Friendly Pirate Ship'],
        blurb: ['kids.card.pirate-ship.b', 'Sails, parrots and a treasure deck'],
        paint: { from: '#0ea5e9', to: '#075985', ink: '#ffffff' },
        visualScene: 'aboard a colourful friendly pirate ship sailing on sparkling waves',
      },
      {
        id: 'robot-factory',
        emoji: '🏭',
        title: ['kids.card.robot-factory', 'The Robot Workshop'],
        blurb: ['kids.card.robot-factory.b', 'Gears, buttons and blinking lights'],
        paint: { from: '#60a5fa', to: '#1d4ed8', ink: '#ffffff' },
        visualScene: 'inside a bright robot workshop full of gears, buttons and blinking lights',
      },
      {
        id: 'tiny-garden',
        emoji: '🌼',
        title: ['kids.card.tiny-garden', 'The Tiny Garden World'],
        blurb: ['kids.card.tiny-garden.b', 'Where a flower is as big as a house'],
        paint: { from: '#a3e635', to: '#4d7c0f', ink: '#ffffff' },
        visualScene: 'in a garden seen from very small, where flowers are as tall as houses',
      },
      {
        id: 'magic-library',
        emoji: '📚',
        title: ['kids.card.magic-library', 'The Magic Library'],
        blurb: ['kids.card.magic-library.b', 'Books that fly and whisper stories'],
        paint: { from: '#a78bfa', to: '#6d28d9', ink: '#ffffff' },
        visualScene: 'in a magical library where books fly around and glow softly',
      },
      {
        id: 'beach',
        emoji: '🏖️',
        title: ['kids.card.beach', 'The Sunny Beach'],
        blurb: ['kids.card.beach.b', 'Sandcastles, shells and big waves'],
        paint: { from: '#fde047', to: '#0891b2', ink: '#ffffff' },
        visualScene: 'on a sunny beach with sandcastles, shells and gentle blue waves',
      },
      {
        id: 'karoo-night',
        emoji: '✨',
        title: ['kids.card.karoo-night', 'The Karoo Under the Stars'],
        blurb: ['kids.card.karoo-night.b', 'A farm night with a million stars'],
        paint: { from: '#6366f1', to: '#1e1b4b', ink: '#ffffff' },
        visualScene: 'on a quiet Karoo farm at night with a windmill and a sky full of stars',
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
      {
        id: 'talking-tree',
        emoji: '🌳',
        title: ['kids.card.talking-tree', 'A Talking Tree'],
        blurb: ['kids.card.talking-tree.b', 'It tells jokes and knows a secret'],
        paint: { from: '#22c55e', to: '#166534', ink: '#ffffff' },
        visualScene: 'meeting a big friendly tree with a smiling face in its bark',
      },
      {
        id: 'treasure-map',
        emoji: '🗺️',
        title: ['kids.card.treasure-map', 'A Treasure Map'],
        blurb: ['kids.card.treasure-map.b', 'X marks a very surprising spot'],
        paint: { from: '#eab308', to: '#854d0e', ink: '#ffffff' },
        visualScene: 'finding an old treasure map with a glowing red X on it',
      },
      {
        id: 'shrink-potion',
        emoji: '🧪',
        title: ['kids.card.shrink-potion', 'A Shrinking Potion'],
        blurb: ['kids.card.shrink-potion.b', 'One sip and they are ant-sized'],
        paint: { from: '#a855f7', to: '#6b21a8', ink: '#ffffff' },
        visualScene: 'holding a bubbling purple potion bottle that makes things tiny',
      },
      {
        id: 'singing-rock',
        emoji: '🪨',
        title: ['kids.card.singing-rock', 'A Singing Rock'],
        blurb: ['kids.card.singing-rock.b', 'It hums a song nobody has heard'],
        paint: { from: '#a8a29e', to: '#44403c', ink: '#ffffff' },
        visualScene: 'finding a round smooth rock with musical notes floating out of it',
      },
      {
        id: 'fallen-star',
        emoji: '⭐',
        title: ['kids.card.fallen-star', 'A Fallen Star'],
        blurb: ['kids.card.fallen-star.b', 'It needs help to get back to the sky'],
        paint: { from: '#fde047', to: '#ca8a04', ink: '#ffffff' },
        visualScene: 'finding a small glowing star with a sleepy face that fell to the ground',
      },
      {
        id: 'time-door',
        emoji: '🚪',
        title: ['kids.card.time-door', 'A Door to Yesterday'],
        blurb: ['kids.card.time-door.b', 'It opens onto a different day'],
        paint: { from: '#38bdf8', to: '#0c4a6e', ink: '#ffffff' },
        visualScene: 'a glowing blue door standing all by itself in the middle of nowhere',
      },
      {
        id: 'giant-egg',
        emoji: '🥚',
        title: ['kids.card.giant-egg', 'A Giant Spotty Egg'],
        blurb: ['kids.card.giant-egg.b', 'Something inside is wiggling'],
        paint: { from: '#fcd34d', to: '#d97706', ink: '#ffffff' },
        visualScene: 'finding a giant spotty egg that is wiggling and cracking a little',
      },
      {
        id: 'magic-brush',
        emoji: '🖌️',
        title: ['kids.card.magic-brush', 'A Magic Paintbrush'],
        blurb: ['kids.card.magic-brush.b', 'Whatever it paints comes alive'],
        paint: { from: '#f472b6', to: '#be185d', ink: '#ffffff' },
        visualScene: 'holding a sparkly paintbrush whose paintings come to life',
      },
      {
        id: 'glow-ghost',
        emoji: '👻',
        title: ['kids.card.glow-ghost', 'A Shy Glowing Ghost'],
        blurb: ['kids.card.glow-ghost.b', 'It just wants a friend'],
        paint: { from: '#e0e7ff', to: '#6366f1', ink: '#ffffff' },
        visualScene: 'meeting a small shy smiling ghost that glows softly like a nightlight',
      },
      {
        id: 'rainbow-storm',
        emoji: '🌦️',
        title: ['kids.card.rainbow-storm', 'A Rainbow Rainstorm'],
        blurb: ['kids.card.rainbow-storm.b', 'The raindrops are every colour'],
        paint: { from: '#60a5fa', to: '#7c3aed', ink: '#ffffff' },
        visualScene: 'standing in a rainstorm where every raindrop is a different colour',
      },
      {
        id: 'secret-code',
        emoji: '🔢',
        title: ['kids.card.secret-code', 'A Secret Code'],
        blurb: ['kids.card.secret-code.b', 'Only a clever friend can crack it'],
        paint: { from: '#34d399', to: '#047857', ink: '#ffffff' },
        visualScene: 'finding a glowing panel with a secret code of shapes and colours',
      },
      {
        id: 'robot-puppy',
        emoji: '🐕‍🦺',
        title: ['kids.card.robot-puppy', 'A Robot Puppy'],
        blurb: ['kids.card.robot-puppy.b', 'It fetches, beeps and wags'],
        paint: { from: '#94a3b8', to: '#475569', ink: '#ffffff' },
        visualScene: 'meeting a shiny little robot puppy with a wagging metal tail',
      },
      {
        id: 'wishing-well',
        emoji: '🪣',
        title: ['kids.card.wishing-well', 'A Wishing Well'],
        blurb: ['kids.card.wishing-well.b', 'It grants one kind wish'],
        paint: { from: '#38bdf8', to: '#1e3a8a', ink: '#ffffff' },
        visualScene: 'finding an old stone wishing well that sparkles when you look in',
      },
      {
        id: 'upside-down',
        emoji: '🙃',
        title: ['kids.card.upside-down', 'Everything Goes Upside Down'],
        blurb: ['kids.card.upside-down.b', 'Now they walk on the ceiling'],
        paint: { from: '#fb7185', to: '#be123c', ink: '#ffffff' },
        visualScene: 'a world where everything has flipped upside down and things float',
      },
      {
        id: 'golden-feather',
        emoji: '🪶',
        title: ['kids.card.golden-feather', 'A Golden Feather'],
        blurb: ['kids.card.golden-feather.b', 'It lets you understand animals'],
        paint: { from: '#facc15', to: '#a16207', ink: '#ffffff' },
        visualScene: 'finding a shimmering golden feather that lets you talk to animals',
      },
      {
        id: 'music-box',
        emoji: '🎶',
        title: ['kids.card.music-box', 'A Music Box That Dances'],
        blurb: ['kids.card.music-box.b', 'Its tune makes everyone dance'],
        paint: { from: '#c084fc', to: '#7e22ce', ink: '#ffffff' },
        visualScene: 'opening a little music box whose tune makes everything dance',
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
      {
        id: 'new-friends',
        emoji: '🤝',
        title: ['kids.card.new-friends', 'Best Friends Forever'],
        blurb: ['kids.card.new-friends.b', 'A new friend for always'],
        paint: { from: '#f472b6', to: '#be185d', ink: '#ffffff' },
        visualScene: 'new best friends holding hands and smiling together',
      },
      {
        id: 'concert',
        emoji: '🎤',
        title: ['kids.card.concert', 'The Big Concert'],
        blurb: ['kids.card.concert.b', 'Everyone sings the song they made'],
        paint: { from: '#a855f7', to: '#6b21a8', ink: '#ffffff' },
        visualScene: 'a happy concert on a stage with lights where all the friends sing together',
      },
      {
        id: 'picnic',
        emoji: '🧺',
        title: ['kids.card.picnic', 'The Sunny Picnic'],
        blurb: ['kids.card.picnic.b', 'Sandwiches, juice and giggles'],
        paint: { from: '#84cc16', to: '#4d7c0f', ink: '#ffffff' },
        visualScene: 'a happy picnic on a blanket in the sun with all the friends',
      },
      {
        id: 'fireworks',
        emoji: '🎆',
        title: ['kids.card.fireworks', 'Fireworks in the Sky'],
        blurb: ['kids.card.fireworks.b', 'Colours that spell THANK YOU'],
        paint: { from: '#f43f5e', to: '#7c2d12', ink: '#ffffff' },
        visualScene: 'colourful fireworks bursting in the night sky above the happy friends',
      },
      {
        id: 'family-hug',
        emoji: '🤗',
        title: ['kids.card.family-hug', 'A Big Family Hug'],
        blurb: ['kids.card.family-hug.b', 'Home safe and warm'],
        paint: { from: '#fb923c', to: '#c2410c', ink: '#ffffff' },
        visualScene: 'a big warm family hug at the front door of a cosy home',
      },
      {
        id: 'garden-grows',
        emoji: '🌻',
        title: ['kids.card.garden-grows', 'A Garden That Grows'],
        blurb: ['kids.card.garden-grows.b', 'They plant seeds of the adventure'],
        paint: { from: '#facc15', to: '#65a30d', ink: '#ffffff' },
        visualScene: 'planting seeds together and sunflowers growing tall and happy',
      },
      {
        id: 'star-named',
        emoji: '🌟',
        title: ['kids.card.star-named', 'A Star Named After Them'],
        blurb: ['kids.card.star-named.b', 'Look up and you will see it'],
        paint: { from: '#fde047', to: '#4338ca', ink: '#ffffff' },
        visualScene: 'a new bright star in the night sky shaped like the hero',
      },
      {
        id: 'parade',
        emoji: '🎊',
        title: ['kids.card.parade', 'The Thank-You Parade'],
        blurb: ['kids.card.parade.b', 'Floats, balloons and music'],
        paint: { from: '#22d3ee', to: '#0e7490', ink: '#ffffff' },
        visualScene: 'a colourful parade with balloons and music down the main street',
      },
      {
        id: 'ice-cream',
        emoji: '🍦',
        title: ['kids.card.ice-cream', 'Ice Cream for Everyone'],
        blurb: ['kids.card.ice-cream.b', 'Every flavour, even rainbow'],
        paint: { from: '#f9a8d4', to: '#db2777', ink: '#ffffff' },
        visualScene: 'everyone sharing huge colourful ice creams in the sunshine',
      },
      {
        id: 'rocket-home',
        emoji: '🚀',
        title: ['kids.card.rocket-home', 'A Rocket Ride Home'],
        blurb: ['kids.card.rocket-home.b', 'Zoom past the stars to bed'],
        paint: { from: '#818cf8', to: '#3730a3', ink: '#ffffff' },
        visualScene: 'riding a little rocket home past the stars and the moon',
      },
      {
        id: 'share-treasure',
        emoji: '💎',
        title: ['kids.card.share-treasure', 'Sharing the Treasure'],
        blurb: ['kids.card.share-treasure.b', 'Everyone gets something special'],
        paint: { from: '#2dd4bf', to: '#0f766e', ink: '#ffffff' },
        visualScene: 'sharing a sparkling treasure chest with all the friends',
      },
      {
        id: 'dance-off',
        emoji: '💃',
        title: ['kids.card.dance-off', 'The Happy Dance-Off'],
        blurb: ['kids.card.dance-off.b', 'Nobody loses, everybody dances'],
        paint: { from: '#e879f9', to: '#a21caf', ink: '#ffffff' },
        visualScene: 'all the friends having a silly dance-off under disco lights',
      },
      {
        id: 'storybook',
        emoji: '📖',
        title: ['kids.card.storybook', 'Into a Storybook'],
        blurb: ['kids.card.storybook.b', 'Their adventure becomes a book'],
        paint: { from: '#a78bfa', to: '#5b21b6', ink: '#ffffff' },
        visualScene: 'the adventure being written into a glowing storybook',
      },
      {
        id: 'sunrise',
        emoji: '🌄',
        title: ['kids.card.sunrise', 'Watching the Sunrise'],
        blurb: ['kids.card.sunrise.b', 'A brand new day to play'],
        paint: { from: '#fb923c', to: '#be123c', ink: '#ffffff' },
        visualScene: 'watching a beautiful golden sunrise together from a hill',
      },
      {
        id: 'helping',
        emoji: '💖',
        title: ['kids.card.helping', 'Everyone Helps Everyone'],
        blurb: ['kids.card.helping.b', 'Kindness wins the day'],
        paint: { from: '#fb7185', to: '#be123c', ink: '#ffffff' },
        visualScene: 'all the friends helping each other and smiling',
      },
      {
        id: 'medal-dance',
        emoji: '🏅',
        title: ['kids.card.medal-dance', 'A Medal and a Song'],
        blurb: ['kids.card.medal-dance.b', 'A medal for being brave and kind'],
        paint: { from: '#fbbf24', to: '#92400e', ink: '#ffffff' },
        visualScene: 'receiving a shiny medal while everyone sings a happy song',
      },
    ],
  },
];

/* ── Ten at a time, a new ten every thirty days ────────────────────────── */

/** How many cards a step shows. */
export const CARDS_SHOWN = 10;
/** How often the cards on show change. */
export const ROTATE_DAYS = 30;

/** Which thirty-day window a moment is in. */
export const windowOf = (now: number): number => Math.floor(now / (ROTATE_DAYS * 86_400_000));

/**
 * The cards a step shows right now: ten of its twenty, shuffled by the
 * window and the step, so a month always looks the same all month and the
 * next month looks different. Pure — the same moment gives the same ten.
 */
export function cardsNow(section: StorySection, now: number = Date.now()): StoryChoice[] {
  let seed = (windowOf(now) + 1) * 2654435761 + section.number * 97;
  const next = (): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const pool = [...section.choices];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, CARDS_SHOWN);
}


/** Ten looks for the pictures. */
export const VISUAL_STYLES: readonly VisualStyle[] = [
  {
    id: '3d-toon',
    emoji: '🎨',
    name: ['kids.visual3dName', '3D Animation Style'],
    desc: ['kids.visual3dDesc', 'Bright 3D cartoon characters with vibrant colors and warmth'],
    badge: ['kids.visual3dBadge', '3D Pop'],
    stylePrompt: 'polished 3D animated-film render, vibrant playful lighting, rich smooth textures, family friendly, bright cheerful colors, high detail CGI',
    bgGradient: 'from-amber-400 via-orange-500 to-rose-500',
  },
  {
    id: 'watercolor',
    emoji: '🏰',
    name: ['kids.visualWaterName', 'Fairy Tale Watercolor'],
    desc: ['kids.visualWaterDesc', 'Soft dreaming pastels, gentle brush strokes and fairy dust'],
    badge: ['kids.visualWaterBadge', 'Storybook Glow'],
    stylePrompt: 'gentle children fairy tale watercolor illustration, soft glowing edges, magical sparkles, warm pastel wash, classic English storybook art style',
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
  {
    id: 'clay',
    emoji: '🧸',
    name: ['kids.style.clay', "Clay Friends"],
    desc: ['kids.style.clay.d', "Squishy clay characters, like a stop-motion film"],
    badge: ['kids.style.clay.b', "Plasticine"],
    stylePrompt: "cute claymation stop-motion characters made of soft colourful clay, handmade textures, warm studio light",
    bgGradient: 'from-orange-400 via-amber-300 to-rose-400',
  },
  {
    id: 'paper',
    emoji: '✂️',
    name: ['kids.style.paper', "Paper Cut-Out"],
    desc: ['kids.style.paper.d', "Layers of bright paper, cut and stacked"],
    badge: ['kids.style.paper.b', "Papercraft"],
    stylePrompt: "layered paper cut-out collage illustration, bright coloured craft paper, soft shadows between layers",
    bgGradient: 'from-lime-300 via-emerald-400 to-teal-500',
  },
  {
    id: 'comic',
    emoji: '💥',
    name: ['kids.style.comic', "Comic Book"],
    desc: ['kids.style.comic.d', "Bold lines, big colours, POW!"],
    badge: ['kids.style.comic.b', "Comic Pop"],
    stylePrompt: "bright friendly comic book illustration for children, bold outlines, halftone dots, vivid colours",
    bgGradient: 'from-yellow-300 via-red-400 to-sky-500',
  },
  {
    id: 'pixel',
    emoji: '👾',
    name: ['kids.style.pixel', "Pixel Game"],
    desc: ['kids.style.pixel.d', "Like a happy video game world"],
    badge: ['kids.style.pixel.b', "8-bit"],
    stylePrompt: "cheerful pixel art video game scene for kids, crisp pixels, bright retro palette",
    bgGradient: 'from-fuchsia-400 via-violet-500 to-cyan-400',
  },
  {
    id: 'plush',
    emoji: '🧶',
    name: ['kids.style.plush', "Soft Toy World"],
    desc: ['kids.style.plush.d', "Everything is cuddly felt and wool"],
    badge: ['kids.style.plush.b', "Plushie"],
    stylePrompt: "everything made of soft plush felt and knitted wool like cuddly toys, cosy stitched details",
    bgGradient: 'from-pink-300 via-rose-300 to-amber-200',
  },
  {
    id: 'glass',
    emoji: '🔮',
    name: ['kids.style.glass', "Glowing Glass"],
    desc: ['kids.style.glass.d', "Shiny, see-through and full of light"],
    badge: ['kids.style.glass.b', "Crystal"],
    stylePrompt: "shiny glowing glass and crystal figures for children, colourful light shining through, magical sparkle",
    bgGradient: 'from-cyan-300 via-sky-400 to-indigo-500',
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

/**
 * A tenth of a second of nothing, as a WAV.
 *
 * The shelf keeps a sound with every page, and a page the phone reads has
 * none of its own. This used to be six seconds of harp chimes, which is what
 * "Read to me" played instead of reading (15 October 2026). Silence, with the
 * page marked `phone`, is honest: the player reads it aloud itself.
 */
export function silentWav(): Blob {
  const rate = 8000;
  const samples = rate / 10;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const write = (at: number, text: string): void => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(at + i, text.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples * 2, true);
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * The Story Maker's own four-page book, for when the story engine is not
 * there to write one. Read by the phone, drawn by the browser.
 */
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
  const audioBlob = silentWav();

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
      seconds: Math.ceil(pageText.length / 13),
      phone: true,
    });
  }

  return {
    id: `kidstory-${Date.now()}`,
    title,
    made: Date.now(),
    pages,
  };
}
