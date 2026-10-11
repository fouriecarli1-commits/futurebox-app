/**
 * A child's own story, laid out to be printed as a little book.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"templates vir die kinders om op te druk"*, and
 * when asked which kind: *"Ja, die kinders se eie storie as 'n boekie."*
 *
 * ── Why their own story and not a worksheet ──────────────────────────────
 *
 * A printable from an app is usually a colouring-in sheet somebody else drew.
 * This child already has pages — a picture, the words, and a reading of them
 * — made in this room, on this account, and nowhere else. Printing THAT costs
 * nothing, calls no engine, works with the aeroplane mode on, and what comes
 * out of the machine is a thing they made rather than a thing they were
 * given.
 *
 * ── The one real constraint, which is ink ────────────────────────────────
 *
 * This is printed at home, on a parent's printer, probably on a cartridge
 * that costs more than the paper. So: the pictures print, because the
 * pictures are the story; everything else is black on white. No coloured
 * panels behind the words, no tinted page, no border. A browser will not
 * print a background colour unless it is told to, and this is not going to
 * tell it to.
 *
 * `check:boekie` holds that: a sheet that paints its ground is a sheet that
 * quietly costs somebody four times as much to print.
 *
 * ── Why a cover, and why it is not a page of its own by accident ─────────
 *
 * A folded stack of sheets with no cover is a pile of paper. One cover with
 * the title on it makes it a book, and a child who has a book shows it to
 * somebody. It is counted separately here so the page numbers on the inside
 * read 1, 2, 3 rather than 2, 3, 4.
 */

import type { KeptStory } from './storykeep';

/** One sheet that comes out of the printer. */
export type Sheet =
  | { readonly kind: 'cover'; readonly title: string; readonly pages: number }
  | {
    readonly kind: 'page';
    /** What a reader sees printed in the corner: 1 for the first story page. */
    readonly number: number;
    readonly text: string;
    readonly picture: Blob;
  };

/**
 * How long a title may be before it stops being a title.
 *
 * `titleOf` already takes the first six words, but a six-word sentence from a
 * child can still be ninety characters of "and then and then". Past this it
 * is cut on a word so the cover does not set it in four lines of six-point
 * type.
 */
export const TITLE_MOST = 48;

export function coverTitle(said: string): string {
  const one = said.trim();
  if (one.length <= TITLE_MOST) return one;
  const cut = one.slice(0, TITLE_MOST);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 12 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * The sheets, in the order they come out.
 *
 * A story with no pages gives a cover and nothing else rather than an empty
 * array: pressing print and getting a silent nothing is the worst answer a
 * button can give, and a cover that says the story has no pages in it is at
 * least true.
 */
export function sheetsOf(story: KeptStory): readonly Sheet[] {
  const cover: Sheet = {
    kind: 'cover',
    title: coverTitle(story.title),
    pages: story.pages.length,
  };
  return [
    cover,
    ...story.pages.map((one, at): Sheet => ({
      kind: 'page',
      number: at + 1,
      text: one.text,
      picture: one.picture,
    })),
  ];
}

/** How many sheets of paper this will use, which a grown-up may want first. */
export const sheetCount = (story: KeptStory): number => sheetsOf(story).length;
