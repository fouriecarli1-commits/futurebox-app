/**
 * A picture looked at before strangers see it, or before an engine is paid
 * to work on it.
 *
 * Step 0 of the fal.ai plan (`docs/FAL-MODELLE.md`, "What to build, in
 * order"): *"Before launch: the picture screen."* fal.ai's own
 * `fal-ai/imageutils/nsfw` (Falconsai's open detector) answers how likely a
 * picture is to be sexual content, from 0 to 1, for $0.001 a picture
 * (`docs/FAL-SKEMAS.md`). It costs the member nothing.
 *
 * ── Where it runs ────────────────────────────────────────────────────────
 *
 * Where a member's own picture reaches other people: a work hung on the art
 * wall, and the profile picture beside every post in the Live room. And
 * where a member's photo goes to an engine (`/api/become`), before a credit
 * is spent, because what comes back can be posted.
 *
 * ── The line ─────────────────────────────────────────────────────────────
 *
 * `SCREEN_LINE` is the owner's to set; 0.7 is where it starts. Below it the
 * picture goes on as before. At or above it the picture is refused with a
 * sentence that says so and says how to ask a person, because a detector is
 * sometimes wrong (a statue, a painting, a beach).
 *
 * ── When it cannot answer ────────────────────────────────────────────────
 *
 * Without a fal.ai key, or when fal.ai does not answer, the picture goes on
 * and the miss is written to the log. Refusing every upload while a supplier
 * is down would close the art wall for an afternoon over a question that is
 * a backstop: the art wall is for approved artists only, and every engine
 * the photos go to has its own check.
 */
import { falNow, falReady } from './fal';

export const SCREEN_MODEL = 'fal-ai/imageutils/nsfw';
/** At or above this, the picture is refused. The owner's to move. */
export const SCREEN_LINE = 0.7;

export type Screened =
  | { readonly state: 'clear'; readonly probability: number }
  | { readonly state: 'refused'; readonly probability: number }
  | { readonly state: 'unread'; readonly why: string };

/** What the detector answered, as a number, or null when it is not one. */
export function probabilityOf(result: unknown): number | null {
  const value = (result as { nsfw_probability?: unknown } | null)?.nsfw_probability;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

/** The answer read against the line. */
export function judged(probability: number): Screened {
  return probability >= SCREEN_LINE ? { state: 'refused', probability } : { state: 'clear', probability };
}

/**
 * Looks at one picture: an https address (a signed storage link) or a data
 * URI. Never throws.
 */
export async function screenPicture(image: string, where: string): Promise<Screened> {
  if (!falReady()) return { state: 'unread', why: 'no fal.ai key' };
  const ran = await falNow(SCREEN_MODEL, { image_url: image });
  if (!ran.ok) {
    console.error(`picture screen (${where}): ${ran.why}`);
    return { state: 'unread', why: ran.why };
  }
  const probability = probabilityOf(ran.data);
  if (probability === null) {
    console.error(`picture screen (${where}): no probability in the answer`);
    return { state: 'unread', why: 'no probability in the answer' };
  }
  return judged(probability);
}

/** What the member is told when a picture is refused. */
export const SCREEN_REFUSED = 'This picture looks like it may not be suitable for the rooms other people see, so it was not used and nothing was charged. If that is wrong, write to us from Help and a person will look at it.';
