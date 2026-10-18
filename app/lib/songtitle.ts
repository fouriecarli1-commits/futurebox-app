/**
 * A song is never untitled.
 *
 * The owner, 12 October 2026: *"By make a song moet jy altyd seker maak in simple
 * wanneer mens met copilot prompt dat 'n liedjie nooit untitled is nie,
 * copilot moet altyd 'n titel uit dink vir 'n song."*
 *
 * Three layers, because a model is not a contract:
 *
 *   1. The copilot is TOLD to think of a title whenever it writes lyrics or
 *      a style for a canvas that has none (`app/api/copilot/route.ts`).
 *   2. The route checks the reply with `ensureTitled` below: a reply that
 *      writes lyrics and forgets the title gets one read off the first line
 *      of those lyrics, and a title that is only a placeholder is thrown
 *      away so it cannot be "set" to Untitled.
 *   3. The song room itself never writes "Untitled" into a track: the
 *      moment of making reads a name off the words on the canvas with
 *      `titleFromWords`, and only with nothing at all to go on falls back to
 *      a sentence in the reader's language.
 *
 * `check:titled` runs the two functions over the cases that matter and reads
 * the route and the room for the rule and the fallback.
 */

import type { PlannedAction } from './copilotplan';

/**
 * The names that are not names. Both languages, because the copilot answers
 * in the language it was written to — and a model asked for a title it has
 * not thought of reaches for exactly these.
 */
const PLACEHOLDER = /^(untitled|new song|my song|song|track|a song|the song|naamloos|sonder titel|nuwe liedjie|my liedjie|liedjie|geen titel)$/i;

/** A title that is not one: empty, or one of the placeholders. */
export function isPlaceholderTitle(title: string | null | undefined): boolean {
  const said = (title ?? '').trim().replace(/[.!?…]+$/, '').replace(/^["“”']|["“”']$/g, '').trim();
  return said.length === 0 || PLACEHOLDER.test(said);
}

/** `[Verse 1]`, `(Chorus)`, `Verse:` — a sheet's scaffolding, not a line. */
const SCAFFOLD = /^\s*(\[[^\]]*\]|\([^)]*\)|(verse|chorus|bridge|intro|outro|hook|pre-chorus|refrein|koor|vers|brug)\b[^a-z]*)\s*$/i;

/** The most words a title read off a line carries. */
export const TITLE_WORDS = 5;

/**
 * A title read off the words.
 *
 * The first real line of the lyrics, cut to five words — which is how most
 * songs got their names before anybody was asked to type one. With no
 * lyrics, the first style word: "A kwaito song" is a name a shelf can hold.
 * With neither, nothing: the caller decides what to say, in which language.
 */
export function titleFromWords(lyrics: string | null | undefined, style: string | null | undefined = ''): string {
  const lines = (lyrics ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !SCAFFOLD.test(line));
  const first = lines[0] ?? '';
  const words = first
    .replace(/["“”]/g, '')
    .replace(/[,;:.!?…\-–—]+$/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length > 0) {
    const read = words.slice(0, TITLE_WORDS).join(' ');
    return read.charAt(0).toUpperCase() + read.slice(1);
  }
  const genre = (style ?? '').split(',')[0].trim();
  if (genre) {
    const said = `${genre.charAt(0).toUpperCase()}${genre.slice(1)} song`;
    return said;
  }
  return '';
}

/** The kinds of action after which a canvas must carry a title. */
const NEEDS_A_TITLE = new Set(['set_lyrics', 'set_style', 'generate']);

/**
 * A reply's actions, with a title where one is owed.
 *
 * Placeholder titles the model sent are dropped first, so "set_title:
 * Untitled" does not count as naming it. Then, when the canvas has no title
 * and this reply writes lyrics, sets a style or starts a song, a title is
 * read off what the reply wrote and put in FRONT — `generate` has to stay
 * last, and a title set after the song is made is a title the song does
 * not carry.
 *
 * A reply that writes nothing a title could be read off is left alone; the
 * room's own fallback (`titleFromWords` at the moment of making) still
 * stands behind it.
 */
export function ensureTitled(actions: readonly PlannedAction[], canvasTitle: string | null | undefined): PlannedAction[] {
  const kept = actions.filter((one) => !(one.kind === 'set_title' && isPlaceholderTitle(one.value)));
  const names = kept.some((one) => one.kind === 'set_title');
  if (names || !isPlaceholderTitle(canvasTitle)) return kept;
  if (!kept.some((one) => NEEDS_A_TITLE.has(one.kind))) return kept;
  const lyrics = kept.find((one) => one.kind === 'set_lyrics')?.value ?? '';
  const style = kept.find((one) => one.kind === 'set_style')?.value ?? '';
  const title = titleFromWords(lyrics, style);
  if (!title) return kept;
  return [{ kind: 'set_title', op: '', value: title, room: '' }, ...kept];
}
