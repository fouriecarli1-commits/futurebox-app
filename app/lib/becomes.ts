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

/**
 * What can move when a photo wakes up, chosen with a tap. The owner, 28
 * October 2026: *"maak die wake it up met kies funksies, of sou mens dalk
 * kon prompt met 'n klein copilot window"*: both, the choices first and the
 * member's own words beside them. Each choice is a phrase the engine reads
 * well; only these ids cross from the phone, so the phrases are ours.
 */
export const WAKE_MOVES = [
  { id: 'breeze', name: ['become.moveBreeze', 'Breeze'], says: 'a soft breeze moves hair, clothes and leaves' },
  { id: 'smile', name: ['become.moveSmile', 'Smile'], says: 'the people smile and blink naturally' },
  { id: 'wave', name: ['become.moveWave', 'Wave hello'], says: 'the person waves at the camera' },
  { id: 'dance', name: ['become.moveDance', 'Dance'], says: 'the people start to dance' },
  { id: 'water', name: ['become.moveWater', 'Water flows'], says: 'water flows and ripples' },
  { id: 'clouds', name: ['become.moveClouds', 'Clouds drift'], says: 'clouds drift across the sky' },
  { id: 'light', name: ['become.moveLight', 'Light plays'], says: 'sunlight shifts and flickers through the scene' },
  { id: 'fire', name: ['become.moveFire', 'Flames'], says: 'flames and candlelight flicker' },
  { id: 'snow', name: ['become.moveSnow', 'Snow'], says: 'snow falls gently' },
  { id: 'rain', name: ['become.moveRain', 'Rain'], says: 'rain falls softly' },
  { id: 'pushin', name: ['become.movePushIn', 'Camera in'], says: 'the camera slowly pushes in' },
  { id: 'circle', name: ['become.moveCircle', 'Camera around'], says: 'the camera slowly circles around the subject' },
] as const;
export type WakeMove = (typeof WAKE_MOVES)[number]['id'];
/** As many as can be asked for at once and still all be seen in six seconds. */
export const WAKE_MOST = 3;

/** The choices as they arrive from a phone: known ids only, each once, at most three. */
export function wakeMoves(raw: unknown): WakeMove[] {
  if (!Array.isArray(raw)) return [];
  const known = new Set<string>(WAKE_MOVES.map((one) => one.id));
  return [...new Set(raw.filter((one): one is WakeMove => typeof one === 'string' && known.has(one)))].slice(0, WAKE_MOST);
}

/** What moves, when the member says nothing. */
const ALIVE_PROMPT = 'The photo comes gently alive: natural movement in the scene, hair and clothes and leaves stirring, light shifting, a slow cinematic camera move, with ambient sound that fits the place.';

/** The wake-up prompt: the chosen moves and the member's words lead, or the gentle default. */
function aliveAsked(said: string, moves: readonly WakeMove[]): string {
  const chosen = moves.map((id) => WAKE_MOVES.find((one) => one.id === id)?.says).filter(Boolean);
  const asked = [...chosen, said].filter(Boolean).join('; ');
  if (!asked) return ALIVE_PROMPT;
  return `${asked.charAt(0).toUpperCase()}${asked.slice(1)}. Natural, smooth movement, with ambient sound that fits the place.`;
}

/**
 * What each model is sent. The fields are copied from its own page
 * (`docs/FAL-SKEMAS.md`); this is the one place they live, so a field fal.ai
 * renames is a one-line change.
 */
/**
 * Points over the whole picture, each its own object: how one call finds
 * everything in a photo that could be peeled. The owner, 28 October 2026:
 * *"die sticker opsie moes alles search wat los kon maak en alles op een slag
 * los maak, en dan kies mens net dit wat 'n mens wil peel."* SAM 3 groups
 * points by `object_id` (fal.ai, 27 October 2026), so a grid with one id per
 * point answers with a mask per thing, at the price of one call.
 */
export const FIND_ALL_GRID = 4;
export function everyThing(size: { readonly w: number; readonly h: number }): { x: number; y: number; label: 1; object_id: number }[] {
  const out: { x: number; y: number; label: 1; object_id: number }[] = [];
  for (let row = 0; row < FIND_ALL_GRID; row += 1) {
    for (let col = 0; col < FIND_ALL_GRID; col += 1) {
      out.push({
        x: Math.round(((col + 0.5) / FIND_ALL_GRID) * size.w),
        y: Math.round(((row + 0.5) / FIND_ALL_GRID) * size.h),
        label: 1,
        object_id: row * FIND_ALL_GRID + col + 1,
      });
    }
  }
  return out;
}

export function becomeInput(id: BecomeId, picture: string, opts: { readonly tap?: Tap; readonly words?: string; readonly moves?: readonly WakeMove[]; readonly all?: { readonly w: number; readonly h: number } } = {}): Record<string, unknown> {
  const said = (opts.words ?? '').trim();
  if (id === 'sticker' && opts.all) {
    return {
      image_url: picture,
      /* No words: "everything" is the points, and an absent prompt means "wheel". */
      prompt: '',
      point_prompts: everyThing(opts.all),
      apply_mask: false,
      sync_mode: true,
      output_format: 'png',
      include_boxes: true,
      include_scores: true,
      max_masks: FIND_ALL_GRID * FIND_ALL_GRID,
    };
  }
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
      prompt: aliveAsked(said, opts.moves ?? []),
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
