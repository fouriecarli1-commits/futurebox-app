/**
 * Make my photo good: an old or damaged photo repaired, its faces brought
 * back, or a black-and-white one coloured.
 *
 * Step 3 of the fal.ai plan (`docs/FAL-MODELLE.md`): *"Make my photo good /
 * fix an old photo in the Photo Editor."* Three of fal.ai's own models, one
 * press each, priced off the pages the owner read on 29 October 2026:
 *
 *   faces    `fal-ai/codeformer`                      $0.0021 a megapixel
 *   repair   `fal-ai/image-editing/photo-restoration` $0.04 a photo
 *   colour   `fal-ai/ddcolor`                         $0.001 a megapixel
 *
 * A photo goes up at most 1280 pixels on its longest side (about 1.6
 * megapixels; CodeFormer doubles it), so the dearest press costs us R0.74.
 *
 * ── Switched off until the owner says so ─────────────────────────────────
 *
 * The fields are the models' own API pages as the owner sent them the same
 * day (`docs/FAL-SKEMAS.md`).
 *
 * `docs/FAL-TERME.md`: never a model fal.ai marks "Pending Enterprise
 * Ready", because the DPA does not cover it and fal.ai may train on what is
 * sent. That label had not been read for these three when this was built,
 * so `RESTORE_CLEARED` holds the room shut — no button is drawn and the
 * route refuses — until she has looked.
 */
import { CREDITS } from './credits';

/* Cleared 29 October 2026: all three pages read `enterprise_status: ready`
   (and the caption model known to be pending reads `pending` the same way,
   so the reading is the label). */
export const RESTORE_CLEARED = true;

export type RestoreId = 'faces' | 'repair' | 'colour';

export interface RestoreSpec {
  readonly id: RestoreId;
  readonly model: string;
  readonly credits: number;
  readonly name: readonly [string, string];
  readonly what: readonly [string, string];
}

export const RESTORES: Readonly<Record<RestoreId, RestoreSpec>> = {
  repair: {
    id: 'repair',
    model: 'fal-ai/image-editing/photo-restoration',
    credits: CREDITS.photoRepair,
    name: ['restore.repair', 'Repair it'],
    what: ['restore.repairWhat', 'Scratches, tears, stains and fading taken out of an old photo.'],
  },
  faces: {
    id: 'faces',
    model: 'fal-ai/codeformer',
    credits: CREDITS.photoFaces,
    name: ['restore.faces', 'Bring the faces back'],
    what: ['restore.facesWhat', 'Blurred or worn faces made clear again, and the photo made twice as sharp.'],
  },
  colour: {
    id: 'colour',
    model: 'fal-ai/ddcolor',
    credits: CREDITS.photoColour,
    name: ['restore.colour', 'Colour it in'],
    what: ['restore.colourWhat', 'A black-and-white photo in natural colour.'],
  },
};

export const RESTORE_IDS = Object.keys(RESTORES) as RestoreId[];

/** What each model is sent: the photo, and for faces the settings its page names. */
export function restoreInput(id: RestoreId, picture: string): Record<string, unknown> {
  if (id === 'faces') {
    /* Fidelity 0.7: closer to the person in the photo than to a made-up
       clean face. Every face, not only the middle one: old photos are
       family groups. */
    return { image_url: picture, fidelity: 0.7, upscale_factor: 2, face_upscale: true, only_center_face: false };
  }
  if (id === 'repair') {
    /* Returned in the answer itself (`sync_mode`), so nothing waits on
       fal.ai's storage; PNG so a repaired photo is not squeezed twice. */
    return { image_url: picture, sync_mode: true, output_format: 'png', safety_tolerance: '2' };
  }
  return { image_url: picture };
}
