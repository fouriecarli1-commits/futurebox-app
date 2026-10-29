/**
 * A song's cover, moving: a short loop that starts and ends on the cover.
 *
 * Step 1 of the fal.ai plan (`docs/FAL-MODELLE.md`): *"Moving cover (a still
 * cover as a short loop). Small, and every release in the Music room wants
 * one."* The owner, 29 October 2026: *"Gaan aan met die moving cover."*
 *
 * The engine is the one Wake it up already uses, `fal-ai/ltx-2.3/
 * image-to-video/fast` (Enterprise Ready; its fields are in
 * `docs/FAL-SKEMAS.md`): the cover goes up as the first frame AND the last
 * (`end_image_url`), so the clip comes back to where it started and plays
 * round and round without a jump. Six seconds, 1080p, no sound of its own:
 * it plays under the song, which has one.
 *
 * Kept beside the cover as `<owner>/<track>.cover.mp4`: derived, never
 * stored, the same rule as the cover's own path.
 */

export const LOOP_MODEL = 'fal-ai/ltx-2.3/image-to-video/fast';
export const LOOP_SECONDS = 6;

/** Where a song's moving cover lives in the `tracks` bucket. */
export const loopPath = (owner: string, track: string): string => `${owner}/${track}.cover.mp4`;

/**
 * The words that keep a cover a cover: it moves a little and nothing about
 * it changes. No new things in it, no words, the camera nearly still.
 */
export const LOOP_PROMPT = 'A gentle, seamless loop of this album cover. Subtle living motion only: light shifting, a slow drift, '
  + 'fabric, hair, smoke or water moving softly. The camera stays almost still. Keep the composition, the colours and '
  + 'every shape exactly as they are. No new objects, no text, no faces changing.';

/** What the engine is asked, for a cover at a link it can read. */
export function loopInput(cover: string): Record<string, unknown> {
  return {
    image_url: cover,
    end_image_url: cover,
    prompt: LOOP_PROMPT,
    duration: LOOP_SECONDS,
    resolution: '1080p',
    aspect_ratio: 'auto',
    generate_audio: false,
  };
}
