/**
 * The whole lyric, as a sheet somebody can read while they sing.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Ek dink ook die liedjie se woord moet ook op 'n
 * button beskikbaar wees, waar die hele liedjie se woorde kan op pop vir
 * iemand wat so wil record en die woorde in die geheel wil sien."*
 *
 * The booth shows the words the way a teleprompter does — the line that is
 * due now, in time with the music. That is the right thing while you are
 * singing and it is the wrong thing in the minute before you start, when
 * what you want is the shape of the whole song in front of you: how many
 * verses, where the chorus lands, whether the bridge is four lines or eight.
 *
 * ── Why this is a library and not twenty lines in the booth ──────────────
 *
 * Because it has to work on two different things and neither is reliable.
 *
 * A song made since the plan was stored carries `track.parts` — named
 * sections with their lines. Anything older, and anything typed straight
 * into the words box, has only `track.lyrics`: a string with blank lines in
 * it and maybe `[Chorus]` markers and maybe not.
 *
 * `partsOf` already turns the second into the first, and the booth already
 * falls back through it. What nothing had was the step after: making that
 * readable as a page, with the sections named and counted, and saying
 * plainly when there is nothing to show rather than drawing an empty sheet.
 *
 * ── The counting is the part people actually use ─────────────────────────
 *
 * "Verse" three times in a row is a song with three verses, and somebody
 * recording needs to know WHICH one they are on. So repeated names are
 * numbered — Verse 1, Verse 2 — and a name that appears once is left alone,
 * because "Chorus 1" on a song with one chorus is a number that means
 * nothing.
 */

import { partsOf, type Part } from './timeline';

/**
 * A lyric string as blocks, for a sheet.
 *
 * ── Why not just `partsOf` ───────────────────────────────────────────────
 *
 * `partsOf` splits on `[Section]` tags and nothing else, which is right for
 * what it does: it feeds the teleprompter's timing, and a block with no name
 * has no place in a plan.
 *
 * For a SHEET it is wrong, and wrong in the common case. Most lyrics typed
 * by hand carry no tags at all — they carry BLANK LINES, which is how
 * everybody has written out a song since before any of this existed. Through
 * `partsOf` the whole lyric comes back as one block called "Verse", and the
 * sheet shows a wall of text with the shape taken out of it. That shape is
 * the entire reason somebody opens the sheet.
 *
 * `check:heleblad` caught it on the assertion written for exactly this case.
 *
 * ── And an unnamed block is left unnamed ─────────────────────────────────
 *
 * `partsOf` calls an untagged block "Verse" because a plan needs a name.
 * This does not: a blank line is the shape, and a heading invented over a
 * block says something about the song that nobody wrote. Where there ARE
 * tags they are used, because then somebody did.
 */
export function blocksOf(lyrics: string): Part[] {
  const text = lyrics ?? '';
  /* Tagged, so somebody has already said what the sections are. */
  if (/^\s*\[.+\]\s*$/m.test(text)) return partsOf(text);

  const out: Part[] = [];
  for (const block of text.split(/\n\s*\n/)) {
    const lines = block.split('\n').map((one) => one.trim()).filter(Boolean);
    if (!lines.length) continue;
    out.push({ name: '', lines, seconds: Math.max(1, lines.length * 4) });
  }
  return out;
}

export interface Sheet {
  readonly name: string;
  readonly lines: readonly string[];
}

/**
 * The sections, named and numbered, from whichever source there is.
 *
 * `parts` wins where it exists because it was written by the thing that made
 * the song. The lyric string is the fallback, and an empty answer is an
 * honest one: a song with no words stored has none to show.
 */
export function sheetOf(
  parts: readonly Part[] | null | undefined,
  lyrics: string | null | undefined,
): Sheet[] {
  const from = parts && parts.length ? parts : blocksOf(lyrics ?? '');
  const rows = from
    .map((one) => ({
      name: String(one.name ?? '').trim(),
      lines: (one.lines ?? []).map((line) => String(line)).filter((line) => line.trim()),
    }))
    .filter((one) => one.lines.length > 0);

  /* How many times each name appears, so only the repeated ones are
     numbered. A song with one chorus does not want it called "Chorus 1". */
  const many = new Map<string, number>();
  for (const one of rows) many.set(one.name, (many.get(one.name) ?? 0) + 1);

  const seen = new Map<string, number>();
  return rows.map((one) => {
    if ((many.get(one.name) ?? 0) < 2 || !one.name) return one;
    const at = (seen.get(one.name) ?? 0) + 1;
    seen.set(one.name, at);
    return { name: `${one.name} ${at}`, lines: one.lines };
  });
}

/** How many lines there are altogether, for the line under the title. */
export function linesIn(sheet: readonly Sheet[]): number {
  return sheet.reduce((all, one) => all + one.lines.length, 0);
}

/**
 * Roughly how long it takes to sing, in seconds.
 *
 * Only ever shown as an aside, and only where the song's own length is not
 * known — which is the case before a backing track exists. Three seconds a
 * line is the figure a songwriter would use for a mid-tempo song, and it is
 * deliberately coarse: a number to the second would be a promise this
 * cannot keep, and somebody would plan around it.
 */
export const SECONDS_A_LINE = 3;

export function roughly(sheet: readonly Sheet[]): number {
  return linesIn(sheet) * SECONDS_A_LINE;
}
