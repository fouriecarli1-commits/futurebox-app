/**
 * Who painted the cover, travelling with the song.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 20 September 2026: *"Binne live moet die liedjie naam, artist naam,
 * style en dan die kunstenaar se naam en art naam appear."*
 *
 * The first three were already on the card. This is the fourth and fifth:
 * the piece's title and the person who made it.
 *
 * ── Why it is copied onto the post rather than looked up ─────────────────
 *
 * A live post is read by strangers. They cannot see the buyer's library, so
 * a join from a post to a work to an artist is a join across three tables
 * on every card in a scrolling room — and it returns nothing at all the day
 * an artist deletes their account, which is the day the credit matters most.
 *
 * So the two strings are written onto the post when it is made, the way the
 * genre already is. A credit is part of what was published, not a lookup.
 *
 * ── One formatter, used by every screen that shows it ────────────────────
 *
 * Live, the channel and the full-screen player all show this, and three
 * hand-written versions of "title — artist" is three chances to print
 * "undefined — " on somebody's work. This app has twice had two meanings
 * for one word; a credit line is a worse thing to get two of, because the
 * person it names is the one who notices.
 */

export interface ArtCredit {
  /** What the piece is called. */
  readonly title: string;
  /** The artist who made it. */
  readonly by: string;
}

/**
 * The credit as one line, or nothing at all.
 *
 * Null rather than an empty string, so a caller has to decide what to draw
 * when there is no credit instead of rendering a blank row. Most songs have
 * no bought art on them and never will — a generated cover is nobody's
 * work to sign.
 *
 * Both halves are required. A title with no artist is a credit that names
 * nobody, and an artist with no title is a name with nothing attached; each
 * of those is a half-written row that reads as a bug, and neither is worth
 * printing over somebody's song.
 */
export function creditLine(credit: ArtCredit | null | undefined): string | null {
  const title = (credit?.title ?? '').trim();
  const by = (credit?.by ?? '').trim();
  if (!title || !by) return null;
  return `${title} — ${by}`;
}

/** What came back from the server, read safely into a credit. */
export function creditFrom(row: { art_title?: unknown; art_by?: unknown } | null | undefined): ArtCredit | null {
  const title = typeof row?.art_title === 'string' ? row.art_title.trim() : '';
  const by = typeof row?.art_by === 'string' ? row.art_by.trim() : '';
  if (!title || !by) return null;
  return { title, by };
}
