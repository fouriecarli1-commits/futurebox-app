/**
 * The two Make a song sliders, as words.
 *
 * The owner, 14 October 2026: *"Ek wil ook hê daar moet sliders wees by everything
 * in make a song. Light heavy, en weirdness level. Sal die ai musiek masjien
 * dit kan optel?"* It can — as words. Neither engine takes a number for
 * either: ElevenLabs composes from a list of styles and Lyria from a prompt,
 * and both follow production words closely. So each slider adds the words a
 * producer would use for that much of it, stronger the further it moves, and
 * nothing at all near the middle, where she has not asked for anything.
 */

/**
 * Light to heavy, as words the engines read (0 light, 50 neither, 100 heavy).
 *
 * Neither music engine has a dial for this: ElevenLabs composes from a style
 * list and Lyria from a prompt, and both follow production words well.
 */
export function weightWords(weight: number): string[] {
  if (weight <= 20) return ['very light', 'airy', 'sparse arrangement', 'soft dynamics', 'gentle drums'];
  if (weight <= 40) return ['light', 'open arrangement', 'soft dynamics'];
  if (weight < 60) return [];
  if (weight < 80) return ['heavy', 'full arrangement', 'punchy drums', 'strong low end'];
  return ['very heavy', 'dense wall of sound', 'distorted guitars', 'hard-hitting drums', 'massive low end'];
}

/** Weirdness, as words: nothing near the default, stronger as it rises. */
export function weirdWords(weirdness: number): string[] {
  if (weirdness < 30) return [];
  if (weirdness < 50) return ['creative harmonies', 'a few unexpected sounds'];
  if (weirdness < 75) return ['eclectic instrumentation', 'unusual chord changes', 'creative sound design'];
  return ['avant-garde textures', 'experimental production', 'unconventional rhythm', 'surprising structure'];
}
