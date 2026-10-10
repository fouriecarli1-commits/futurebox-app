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
 * A name, a line about the voice, a folder of pictures, and a few colours.
 * Nothing else.
 *
 * A brand kit that asks for twelve fields is a form nobody finishes, and the
 * eight fields after the fourth do not change what the writer produces. These
 * do: the name is what the copy says, the voice line is the difference between
 * "artisanal" and "we open at six", the pictures are what goes in the corner
 * of a clip or onto a poster, and the colours are what a title card is set on.
 *
 * ── Why it became a folder ───────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Ek dink ook daar moet 'n brand pack wees. Iemand
 * moet 'n folder kan hê met hulle brand goed op."*
 *
 * It held ONE logo. A business has a logo and a wordmark and a white version
 * of the logo for a dark poster and a photograph of the shop front, and
 * "whichever one of those you last chose" is not a brand pack. So the pictures
 * are a list, and one of them is marked as the logo — which is the one that
 * goes in the corner of a clip.
 *
 * Colours the same way: a palette, with the first one the main one. One colour
 * cannot set a title card AND the text on it.
 *
 * ── The thing a folder has to do that a field does not ───────────────────
 *
 * **It has to still be there tomorrow.** The pictures are references into
 * `assets.ts`, which keeps twenty and drops the oldest when a twenty-first
 * arrives — so a logo chosen in September was being thrown away by ordinary
 * use of the photo rooms in October, silently, leaving the advert desk and the
 * video desk with a brand kit pointing at nothing. `heldIds` is what
 * `rememberAsset` reads so that it never drops anything the pack is holding.
 * That bug is the reason this file exports that function and the reason
 * `check:merkpak` exists.
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
  /**
   * Which of the folder's pictures is the logo.
   *
   * An id in the picture library, kept as a reference so the file is stored
   * once. It is expected to be one of `pictureIds`, and `heldIds` holds it
   * either way: a kit saved before the folder existed has a logo and no
   * folder, and losing that logo to make the shapes tidy would be this
   * change taking something away.
   */
  readonly logoAssetId?: string;
  /**
   * The folder: every picture that belongs to this brand.
   *
   * The logo, the wordmark, the white version for a dark poster, the shop
   * front. Newest first, which is the order `assets.ts` keeps.
   */
  readonly pictureIds?: readonly string[];
  /** The main colour. The first of `colours`, kept for every kit saved before there were several. */
  readonly colour?: string;
  /**
   * The palette, main one first.
   *
   * One colour cannot set a title card AND the text on it, which is what a
   * single `colour` was being asked to do.
   */
  readonly colours?: readonly string[];
  readonly updatedAt: string;
}

/** How many pictures a brand pack may hold, and how many colours. */
export const MOST_PICTURES = 8;
export const MOST_COLOURS = 5;

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
  const next: BrandKit = {
    ...kit,
    /* Capped here rather than in the room, because the room is not the only
       thing that can write this and a pack of two hundred references is a
       pack that cannot be drawn. */
    ...(kit.pictureIds ? { pictureIds: kit.pictureIds.slice(0, MOST_PICTURES) } : {}),
    ...(kit.colours ? { colours: kit.colours.slice(0, MOST_COLOURS) } : {}),
    updatedAt: new Date().toISOString(),
  };
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
 * Every picture id the pack is holding on to.
 *
 * Read by `rememberAsset` before it evicts anything. The library keeps twenty
 * pictures and drops the oldest when a twenty-first arrives, and nothing used
 * to stop it dropping a brand logo chosen a month ago — so the pack pointed
 * at a file that had been deleted and every room reading it drew nothing,
 * with no sign that anything had gone.
 *
 * The logo is in here as well as the folder, and both are deliberate: a kit
 * saved before the folder existed has a logo and no folder.
 */
export function heldIds(kit: BrandKit): readonly string[] {
  const all = [
    ...(kit.logoAssetId ? [kit.logoAssetId] : []),
    ...(kit.pictureIds ?? []),
  ];
  return [...new Set(all)];
}

/** The palette, main colour first, for a kit of either shape. */
export function paletteOf(kit: BrandKit): readonly string[] {
  const all = [
    ...(kit.colour ? [kit.colour] : []),
    ...(kit.colours ?? []),
  ];
  return [...new Set(all)].slice(0, MOST_COLOURS);
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
