/**
 * Who the work is for, said once instead of on every brief.
 *
 * ── The problem it solves ────────────────────────────────────────────────
 *
 * The advert desk asks what you are selling, who for, the offer and the tone,
 * and it asks again every time. Somebody running adverts for one bakery types
 * "Bellville bakery, sourdough, family-run, warm and unfussy" on Monday and
 * again on Thursday, and the two sets of adverts do not sound like the same
 * business — not because the writer is inconsistent, but because it was told
 * two slightly different things.
 *
 * The whole value of a brand kit is that being consistent stops being work.
 * `docs/FUNCTION_INVENTORY.md` lists it as one of three gaps on the advert
 * desk, and it was blocked behind having nowhere to keep a logo. There is
 * somewhere now — `assets.ts` — so this is the rest of it.
 *
 * ── What is in it, and why so little ─────────────────────────────────────
 *
 * A name, a line about the voice, a logo, and one colour. Nothing else.
 *
 * A brand kit that asks for twelve fields is a form nobody finishes, and the
 * eight fields after the fourth do not change what the writer produces. These
 * four do: the name is what the copy says, the voice line is the difference
 * between "artisanal" and "we open at six", the logo is what goes in the
 * corner of a clip, and the colour is what a title card is set on.
 *
 * ── On this device ───────────────────────────────────────────────────────
 *
 * Like everything else here. Said in the room rather than discovered later.
 */

export interface BrandKit {
  /** What the business is called, as it should appear in copy. */
  readonly name: string;
  /**
   * How it sounds, in the owner's words.
   *
   * Deliberately one free line rather than a set of adjectives to tick. "We
   * are not fancy, we open at six, and we know everybody's name" tells a
   * writer more than any three checkboxes, and it is what somebody actually
   * says when asked.
   */
  readonly voice: string;
  /** An id in the picture library. Kept as a reference so it is not stored twice. */
  readonly logoAssetId?: string;
  /** One hex colour. Used where a title card or a card border needs the brand. */
  readonly colour?: string;
  readonly updatedAt: string;
}

const KEY = 'futurebox.brandkit.v1';

export const EMPTY: BrandKit = { name: '', voice: '', updatedAt: '' };

export function loadBrandKit(): BrandKit {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const read = JSON.parse(raw) as Partial<BrandKit>;
    return {
      name: String(read.name ?? '').slice(0, 80),
      voice: String(read.voice ?? '').slice(0, 400),
      ...(read.logoAssetId ? { logoAssetId: String(read.logoAssetId) } : {}),
      ...(read.colour && /^#[0-9a-f]{6}$/i.test(read.colour) ? { colour: read.colour } : {}),
      updatedAt: String(read.updatedAt ?? ''),
    };
  } catch {
    return EMPTY;
  }
}

export function saveBrandKit(kit: Omit<BrandKit, 'updatedAt'>): BrandKit {
  const next: BrandKit = { ...kit, updatedAt: new Date().toISOString() };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Refused or full. The room keeps working for this visit.
    }
  }
  return next;
}

/** Whether there is anything in it worth sending anywhere. */
export function hasBrandKit(kit: BrandKit): boolean {
  return kit.name.trim().length > 0 || kit.voice.trim().length > 0;
}

/**
 * The kit as one line for a writing prompt.
 *
 * Sent rather than pasted into the brief boxes: the brief is what is different
 * about today's adverts, and the kit is what is the same every time. Merging
 * them into one field would make it impossible to change one without retyping
 * the other, which is the thing this exists to stop.
 */
export function brandLine(kit: BrandKit): string {
  const parts: string[] = [];
  if (kit.name.trim()) parts.push(`The business is called ${kit.name.trim()}.`);
  if (kit.voice.trim()) parts.push(`It sounds like this: ${kit.voice.trim()}`);
  return parts.join(' ');
}
