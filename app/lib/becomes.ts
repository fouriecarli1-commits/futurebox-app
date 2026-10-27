/**
 * What else it can become: one press turns something a member made into
 * something new.
 *
 * `docs/STUDIO-IDEES.md` is the plan, and this table is the part of it that
 * is built. The owner, 27 October 2026: *"ons masjien moet ook slim
 * integreer, ons moet die heel heel beste en naaste model gebruik vir wat die
 * klient soek en nodig het."* So the member never chooses a model: they
 * choose what the thing should become, and this table says which of fal.ai's
 * models does it, how it is asked, what it costs and what it can become next.
 *
 * Read on the phone (the buttons, the prices, the suggestions) and on the
 * server (`app/api/become`), so it holds nothing secret: the key is in
 * `server/fal.ts` and nowhere else. Every model is one fal.ai runs itself
 * (`fal-ai/`), so nothing goes on to another company (`docs/FAL-TERME.md`),
 * and every field sent is copied from the model's own page
 * (`docs/FAL-SKEMAS.md`).
 */
import { CREDITS } from './credits';

export type BecomeId = 'sticker' | 'alive' | 'model3d';

/** What comes back: a cut-out mask, a moving clip, or a 3D model. */
export type BecomeGives = 'mask' | 'video' | 'model';

export interface BecomeSpec {
  readonly id: BecomeId;
  /** fal.ai's model id, from `docs/FAL-SKEMAS.md`. */
  readonly model: string;
  /** Answered in the one call (seconds), or queued (a minute or more). */
  readonly now: boolean;
  readonly credits: number;
  readonly gives: BecomeGives;
  /** What the result can become next, in the order it is offered. */
  readonly next: readonly BecomeId[];
  /** The button's words. */
  readonly name: readonly [string, string];
  /** The suggestion that pops up to offer it. */
  readonly ask: readonly [string, string];
  /** How long it takes, said before the press. */
  readonly wait: readonly [string, string];
}

export const BECOMES: Readonly<Record<BecomeId, BecomeSpec>> = {
  sticker: {
    id: 'sticker',
    model: 'fal-ai/sam-3/image',
    now: true,
    credits: CREDITS.sticker,
    gives: 'mask',
    next: ['model3d', 'alive'],
    name: ['become.sticker', 'Pull it out'],
    ask: ['become.stickerAsk', 'Peel something off as a sticker'],
    wait: ['become.stickerWait', 'A few seconds'],
  },
  alive: {
    id: 'alive',
    model: 'fal-ai/ltx-2.3/image-to-video/fast',
    now: false,
    credits: CREDITS.alive,
    gives: 'video',
    next: [],
    name: ['become.alive', 'Wake it up'],
    ask: ['become.aliveAsk', 'Make it come alive'],
    wait: ['become.aliveWait', 'About a minute'],
  },
  model3d: {
    id: 'model3d',
    model: 'fal-ai/trellis-2',
    now: false,
    credits: CREDITS.model3d,
    gives: 'model',
    next: [],
    name: ['become.model3d', 'Make it 3D'],
    ask: ['become.model3dAsk', 'Make the sticker 3D'],
    wait: ['become.model3dWait', 'About two minutes'],
  },
};

export const BECOME_IDS = Object.keys(BECOMES) as BecomeId[];

/** The longest side of a picture sent, in pixels. */
export const BECOME_SIDE = 1280;

/** Where on the picture a member tapped, in the sent picture's pixels. */
export interface Tap {
  readonly x: number;
  readonly y: number;
}

/** What moves, when the member says nothing. */
const ALIVE_PROMPT = 'The photo comes gently alive: natural movement in the scene, hair and clothes and leaves stirring, light shifting, a slow cinematic camera move, with ambient sound that fits the place.';

/**
 * What each model is sent. The fields are copied from its own page
 * (`docs/FAL-SKEMAS.md`); this is the one place they live, so a field fal.ai
 * renames is a one-line change.
 */
export function becomeInput(id: BecomeId, picture: string, opts: { readonly tap?: Tap; readonly words?: string } = {}): Record<string, unknown> {
  const said = (opts.words ?? '').trim();
  if (id === 'sticker') {
    return {
      image_url: picture,
      /* Its text prompt defaults to "wheel", so it is always sent: the
         member's words for the thing if they gave any, otherwise none. */
      prompt: said,
      point_prompts: opts.tap ? [{ x: Math.round(opts.tap.x), y: Math.round(opts.tap.y), label: 1 }] : [],
      apply_mask: false,
      sync_mode: true,
      output_format: 'png',
    };
  }
  if (id === 'alive') {
    return {
      image_url: picture,
      prompt: said ? `${said}. ${ALIVE_PROMPT}` : ALIVE_PROMPT,
      duration: 6,
      resolution: '1080p',
      aspect_ratio: 'auto',
      generate_audio: true,
    };
  }
  return {
    image_url: picture,
    /* The cheapest size, with a mesh and a texture small enough to open
       quickly on a phone (fal.ai's own advice: 20k to 50k for mobile). */
    resolution: 512,
    decimation_target: 40_000,
    texture_size: 1024,
  };
}
