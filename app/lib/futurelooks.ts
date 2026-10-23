/**
 * The looks a character is drawn in, and the worlds a scene is restyled into.
 *
 * ── What the owner asked for ─────────────────────────────────────────────
 *
 * The owner, 22 October 2026 (translated): *"What do you call the AI 3D/4D
 * models — those lifelike little figures used in games? Can we put a studio
 * like that in the video editor, so animated characters can be made in the
 * video studio and eventually used in the video? I also think scenes could be
 * prompted to undergo an AI change, to get the whole futuristic effect into
 * videos. Remember our whole app's theme is the future."*
 *
 * ── What this is, and what it honestly is not ────────────────────────────
 *
 * A rigged 3D model — a mesh with a skeleton somebody can pose — is not what
 * any engine this app rents makes. What it can do, and do well, is DRAW a
 * character in a 3D look as one clear picture, and then hand that picture to
 * the video engine as the frame a shot starts from. The engine animates it.
 * So the copy in the room says "AI-drawn 3D-style characters", never "3D
 * models", because a member who goes looking for a skeleton to pose would
 * find there is none and would be right to feel misled.
 *
 * The same honesty about scenes: restyling a scene redraws ONE frame of her
 * footage in a new world and makes a new shot from it. It does not repaint
 * every frame of what she filmed, and nothing here may say it does.
 *
 * ── Why the words live here and not in the component ─────────────────────
 *
 * The sentence sent to the engine is the product. Kept beside the list it
 * belongs to, it can be read in one place, and `check:videocharacters` can
 * read the same sentence the room sends rather than a copy of it.
 *
 * Every name is a `[key, English]` pair so `check:afrikaans` sees it — the
 * hole that check grew a second pattern for on 10 October.
 */

export interface CharacterLook {
  readonly id: string;
  readonly label: readonly [string, string];
  /** What the engine is told the character is drawn as. English, because the engines are. */
  readonly ask: string;
  /** A dark backdrop where the look only reads on one; light grey otherwise. */
  readonly dark?: boolean;
}

/**
 * Ten looks, the first the one most people mean by "a 3D character".
 *
 * Every one of them is a look a games or animation studio would recognise,
 * and the last six lean into the future on purpose — the owner: *"it must be
 * visible everywhere that we are the pioneers and forward thinkers."*
 */
export const CHARACTER_LOOKS: readonly CharacterLook[] = [
  {
    id: 'film3d',
    label: ['future.look.film3d', '3D animated film'],
    ask: 'a 3D animated feature-film character: appealing stylised proportions, an expressive face, soft subsurface skin, detailed hair and clothing, warm cinematic studio lighting',
  },
  {
    id: 'game',
    label: ['future.look.game', 'Realistic game hero'],
    ask: 'a realistic next-generation video-game character render: lifelike skin, fabric and armour detail, physically based materials, a crisp rim light',
  },
  {
    id: 'clay',
    label: ['future.look.clay', 'Claymation'],
    ask: 'a stop-motion claymation figure: matte plasticine with fingerprints and tool marks, slightly uneven handmade forms, soft studio light',
  },
  {
    id: 'anime',
    label: ['future.look.anime', 'Anime hero'],
    ask: 'a modern anime character: clean line art, cel shading in two tones, large expressive eyes, crisp bright colour',
  },
  {
    id: 'android',
    label: ['future.look.android', 'Cyber android'],
    ask: 'a futuristic android: sleek white and graphite armour panels, visible joints, glowing cyan seams and a soft light in the eyes, the face still expressive',
  },
  {
    id: 'hologram',
    label: ['future.look.hologram', 'Chrome hologram'],
    ask: 'a holographic projection of a chrome figure: translucent cyan and violet light over polished chrome, faint scan lines and glowing edges',
    dark: true,
  },
  {
    id: 'wireframe',
    label: ['future.look.wireframe', 'Neon wireframe'],
    ask: 'a neon wireframe figure: the body built from glowing magenta and cyan polygon edges, a clean digital mesh with light along every line',
    dark: true,
  },
  {
    id: 'lowpoly',
    label: ['future.look.lowpoly', 'Low poly'],
    ask: 'a low-poly game character: flat-shaded triangular facets, clean geometric planes, a bright simple palette',
  },
  {
    id: 'toy',
    label: ['future.look.toy', 'Collectible toy'],
    ask: 'a glossy collectible vinyl toy figure: smooth plastic with bright highlights, a slightly larger head, pastel colours',
  },
  {
    id: 'voxel',
    label: ['future.look.voxel', 'Voxel blocks'],
    ask: 'a voxel character built from small 3D cubes, like a block-building game, with clean lighting on every cube face',
  },
];

export const characterLook = (id: string): CharacterLook =>
  CHARACTER_LOOKS.find((one) => one.id === id) ?? CHARACTER_LOOKS[0];

/**
 * The sentence that draws a character sheet.
 *
 * ── Why a "sheet" and not a scene ────────────────────────────────────────
 *
 * Because the picture has two jobs after it is drawn, and a scene is bad at
 * both. Kept in the cast, it is a REFERENCE: Gemini is told "this is the
 * person" and copies the face and the clothes into a new frame, and a
 * figure half-hidden behind a table in a busy room gives it half a person to
 * copy. Put in a shot, it is the FIRST FRAME: the video engine animates what
 * it is given, and a whole figure on a plain ground is a figure it can make
 * walk, turn and wave without inventing a leg it never saw.
 *
 * So: one character, the whole body, facing the camera, nothing else in the
 * picture. This is what an animation studio calls a model sheet, and it is
 * the cheapest way to get the same character twice.
 *
 * `withPhoto` adds the sentence that only goes when a photograph does — the
 * same rule `drawFrame` keeps in the editor: a model told to keep "the
 * person in the photo" with no photo attached invents one.
 */
export function characterAsk(look: CharacterLook, who: string, withPhoto: boolean): string {
  const ground = look.dark
    ? 'a plain, seamless near-black background'
    : 'a plain, seamless light-grey studio background';
  const subject = who.trim() || 'a friendly character from the near future';
  return [
    `A character sheet of ${subject}, drawn as ${look.ask}.`,
    'One character only, the whole body from head to feet in frame with space around it,',
    'standing in a relaxed neutral pose facing the camera, arms a little away from the body.',
    `${ground[0].toUpperCase()}${ground.slice(1)}, soft even light, no other objects, no text, no logos.`,
    'Clean and sharp, so it can be used as the reference for animating this same character in video.',
    withPhoto
      ? 'The attached photo shows the person to turn into this character. Keep them recognisable —'
        + ' the face shape, eyes, skin tone and hair — while drawing them fully in this look.'
      : '',
  ].filter(Boolean).join(' ');
}

export interface SceneStyle {
  readonly id: string;
  readonly label: readonly [string, string];
  readonly ask: string;
}

/**
 * Ten futures a scene can be redrawn into.
 *
 * The owner asked for "the whole futuristic effect"; these are what that means
 * on a screen, each one a world with its own light rather than a colour
 * filter — the filters bench already does colour, in the browser, for no
 * credits, and a paid button that did the same would be selling her
 * something she has.
 */
export const SCENE_STYLES: readonly SceneStyle[] = [
  { id: 'neoncity', label: ['future.scene.neoncity', 'Neon city'], ask: 'a neon-lit city of the future at night: glowing magenta and cyan signs, holographic adverts, wet reflective streets' },
  { id: 'chrome', label: ['future.scene.chrome', 'Chrome future'], ask: 'a gleaming chrome future: polished silver architecture, clean white light, mirror reflections and sleek curved forms' },
  { id: 'hologram', label: ['future.scene.hologram', 'Hologram'], ask: 'a hologram world: everything rendered as translucent cyan and violet holographic light with faint scan lines and glowing edges, on deep darkness' },
  { id: 'rain', label: ['future.scene.rain', 'Cyberpunk rain'], ask: 'cyberpunk rain: a dark rain-soaked city at night, heavy rain, neon reflections in puddles, steam and haze' },
  { id: 'synthwave', label: ['future.scene.synthwave', 'Synthwave'], ask: 'synthwave: a huge striped sunset sun, a magenta and violet sky, a glowing grid floor and retro-future chrome' },
  { id: 'space', label: ['future.scene.space', 'Space station'], ask: 'a space station: a sleek orbital interior with soft white panels, blue light and large windows onto the Earth and the stars' },
  { id: 'biolum', label: ['future.scene.biolum', 'Bioluminescent'], ask: 'a bioluminescent world: glowing plants, particles and creatures in cyan, green and violet under a deep blue night' },
  { id: 'animefuture', label: ['future.scene.animefuture', 'Anime future'], ask: 'a futuristic anime film: a hand-painted sky, clean cel shading and a gleaming city of the future in the background' },
  { id: 'animated3d', label: ['future.scene.animated3d', '3D animated'], ask: 'a 3D animated feature film: stylised rounded forms, soft global illumination and rich colour, as a feature animation studio would render it' },
  { id: 'solar', label: ['future.scene.solar', 'Solar future'], ask: 'a bright solar-powered future: white towers covered in gardens, solar glass, warm sunlight and clean air' },
];

export const sceneStyle = (id: string): SceneStyle =>
  SCENE_STYLES.find((one) => one.id === id) ?? SCENE_STYLES[0];

/**
 * The sentence that redraws one frame of her footage in a new world.
 *
 * Everything that makes the frame HERS is named as staying: the framing, the
 * people, where they stand and what they are doing. A restyle that moved the
 * camera would be a new shot that no longer cuts against the one beside it on
 * the clock, which is the whole reason it lands there.
 *
 * `closing` is the same sentence with one more clause, for the clip's last
 * frame: the two are drawn separately, and two pictures told only "neon
 * city" come back as two different neon cities. Told it is the END of the
 * same shot, the engine keeps the world it drew for the start.
 */
export function restyleAsk(style: SceneStyle, closing: boolean): string {
  return [
    `Redraw this exact frame as ${style.ask}.`,
    'Keep the same composition, camera angle and framing, the same people and objects in the same places,',
    'their poses, faces and the action exactly as they are; change only the world, the light and the materials.',
    closing
      ? 'This is the last frame of the same shot, so keep the world, palette and light consistent with its first frame.'
      : '',
  ].filter(Boolean).join(' ');
}

/**
 * The nearest length the video engine makes, for a clip of `seconds`.
 *
 * Four, six or eight — the only lengths `/api/video` takes. A restyled shot
 * that comes back half as long as the one it replaces is a gap in her film,
 * so the room starts from the nearest and she can change it.
 */
export function nearestLength(seconds: number): 4 | 6 | 8 {
  if (!Number.isFinite(seconds) || seconds <= 5) return 4;
  return seconds <= 7 ? 6 : 8;
}
