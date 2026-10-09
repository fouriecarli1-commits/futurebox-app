/**
 * A story, as pages: what is on each one, what it costs, and when it plays.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Ek dink ook 'n story mode om geleesde stories met
 * 'n video sal baie oulik wees."* A story read aloud, with a video. Then:
 * *"Gaan aan met story mode."*
 *
 * ── The two questions it waited on, and the answers taken ────────────────
 *
 * They were written into `docs/OPEN-QUESTIONS.md` with a recommendation, and
 * "gaan aan" is the instruction to take it, so both are taken here and said
 * plainly rather than left implied.
 *
 * **Whose words.** Hers — typed or pasted. Not the app's. A story generated
 * about nothing in particular is a thing nobody reads twice, and the version
 * worth building first is the one where somebody has a story to tell. The
 * app writing them is a separate feature that can sit on top of this one.
 *
 * **A still or a clip per page.** A still. The difference is about R4 a page
 * against R22 for every five seconds of film, and a read-along storybook is
 * a form that has worked with still pictures for four hundred years. The
 * cheap version proves the idea before video money goes into it, and every
 * part of it is already built and charged elsewhere today.
 *
 * ── Why pages are found rather than asked for ────────────────────────────
 *
 * Because asking somebody to mark their own page breaks is asking them to do
 * the layout of a book they have not seen yet. A blank line is already how
 * people separate paragraphs when they type, so that is a page; and a
 * paragraph too long to be one page is split at a sentence end rather than
 * mid-breath, because the voice has to stop somewhere and a picture changing
 * halfway through a clause is a page turn in the wrong place.
 */

import { CREDITS, readCost } from './credits';

/**
 * The most pages one story can have.
 *
 * Not a technical limit. Twelve pages at about four credits each is most of
 * a kids-room allowance, and a story long enough to need more than twelve is
 * one somebody should be charged for in two halves on purpose rather than by
 * surprise.
 */
export const STORY_MAX_PAGES = 12;

/**
 * Longer than this and a paragraph becomes two pages.
 *
 * Four hundred characters is roughly twenty-five seconds read aloud, which
 * is about as long as a single picture holds anybody's attention — and it is
 * the number `kidsallowance.ts` prices a page at, so the parent's estimate
 * and the actual split agree about what a page is.
 */
export const PAGE_CHARS = 400;

/** Shorter than this is a fragment, and it joins the page before it. */
export const PAGE_MIN_CHARS = 25;

export interface Page {
  readonly id: string;
  readonly text: string;
}

let counted = 0;
const pageId = (): string => {
  counted += 1;
  return `page-${counted}-${Math.random().toString(36).slice(2, 8)}`;
};

/**
 * Split a long paragraph into pages, at the last sentence end that fits.
 *
 * A tail too short to be a page joins the piece before it — and this is the
 * ONLY place that joining happens, which is the correction `check:storie`
 * forced. The tail here is an artefact of where the cut landed, so gluing it
 * back is repairing this function's own work. A short paragraph somebody
 * TYPED is not an artefact: they put a blank line around it on purpose, and
 * that is a page break.
 *
 * The first version joined both, and it ruined the case this feature is most
 * for. A children's story written as short lines — "The dog ran." / "The cat
 * sat." — has no paragraph over twenty-five characters, so every one of them
 * joined the one before and the whole book came out as a single page of six
 * hundred characters with one picture over it. Which is not a storybook; it
 * is a paragraph.
 */
function broken(text: string): string[] {
  if (text.length <= PAGE_CHARS) return [text];
  const out: string[] = [];
  let rest = text;
  while (rest.length > PAGE_CHARS) {
    const window = rest.slice(0, PAGE_CHARS);
    /* The last sentence end in the window. `lastIndexOf` over three marks
       rather than a regex with a lookbehind, which Safari refused until
       recently and this app still supports. */
    const end = Math.max(
      window.lastIndexOf('. '),
      window.lastIndexOf('! '),
      window.lastIndexOf('? '),
    );
    /* No sentence end in four hundred characters: break at the last space
       instead. A hard cut mid-word is the one outcome that looks broken. */
    const at = end > PAGE_MIN_CHARS ? end + 1 : window.lastIndexOf(' ');
    const cut = at > PAGE_MIN_CHARS ? at : PAGE_CHARS;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) {
    const last = out[out.length - 1];
    if (rest.length < PAGE_MIN_CHARS && last !== undefined) {
      out[out.length - 1] = `${last} ${rest}`.trim();
    } else {
      out.push(rest);
    }
  }
  return out;
}

/**
 * The story, as pages.
 *
 * A blank line is a page break, because that is already how somebody typing
 * separates paragraphs — and it is a break whether what follows is three
 * words or three hundred. A paragraph longer than a page is split by
 * `broken` above, which is also the only thing that glues a short piece onto
 * its neighbour.
 */
export function pagesFrom(story: string): Page[] {
  const blocks = story.includes('\n\n')
    ? story.split(/\n\s*\n/)
    : story.split('\n');

  const texts: string[] = [];
  for (const block of blocks) {
    const clean = block.replace(/\s*\n\s*/g, ' ').trim();
    if (!clean) continue;
    for (const piece of broken(clean)) {
      if (piece) texts.push(piece);
    }
  }

  return texts.slice(0, STORY_MAX_PAGES).map((text) => ({ id: pageId(), text }));
}

export interface Bill {
  /** Credits for the voice reading all of it. */
  readonly read: number;
  /** Credits for one picture a page. */
  readonly pictures: number;
  readonly total: number;
  readonly pages: number;
}

/**
 * What this story costs, from the same table the routes charge from.
 *
 * Per page and not for the whole text, because that is how it is actually
 * charged: each page is one reading, so each page pays `readCost`'s own
 * minimum of two. Summing the pages is the true number and summing the
 * characters is a smaller, wrong one — and the smaller wrong one is the
 * direction that gets somebody a bill they did not agree to.
 */
export function billFor(pages: readonly Page[]): Bill {
  const read = pages.reduce((sum, one) => sum + readCost(one.text.length), 0);
  const pictures = pages.length * CREDITS.repaint;
  return { read, pictures, total: read + pictures, pages: pages.length };
}

export interface Shown {
  readonly page: number;
  /** When this page comes up, in seconds from the start. */
  readonly at: number;
  /** How long it stays. */
  readonly seconds: number;
}

/**
 * When each page is on screen, given how long its reading turned out to be.
 *
 * Driven by the audio rather than by a guess: a page of forty words and a
 * page of four are not on screen for the same time, and a slideshow on a
 * fixed interval drifts away from the voice within three pages. The lengths
 * come from the audio that was actually made.
 *
 * A page with no audio yet gets `fallback`, so the room can show a timeline
 * before anything has been read.
 */
export function timelineOf(
  pages: readonly Page[],
  lengths: readonly (number | undefined)[],
  fallback = 4,
): Shown[] {
  let at = 0;
  return pages.map((_page, index) => {
    /* A breath between pages. Without it a page turn lands on the last
       syllable of the page before, which reads as the picture changing too
       early rather than as a turn. */
    const heard = lengths[index];
    const seconds = Math.max(1, (heard && heard > 0 ? heard : fallback) + 0.4);
    const shown = { page: index, at, seconds };
    at += seconds;
    return shown;
  });
}

/** How long the whole story runs. */
export function runsFor(shown: readonly Shown[]): number {
  const last = shown[shown.length - 1];
  return last ? last.at + last.seconds : 0;
}

/**
 * What to draw a page's picture from.
 *
 * The page's own words, with the look of the book around them so twelve
 * pictures are one book rather than twelve unrelated pictures — the single
 * most noticeable thing about a generated storybook, and the cheapest to get
 * right. Nothing about a named person or a style: `guard` sees this text
 * like any other prompt, and a story mentioning somebody real is refused
 * there rather than here.
 */
export function pictureWords(page: Page, look: string): string {
  const style = look.trim()
    || 'a warm, friendly children\'s storybook illustration, soft colours, hand-painted look';
  return `${style}. A single illustration for this moment in the story, with no `
    + `words or lettering anywhere in the picture: ${page.text}`;
}
