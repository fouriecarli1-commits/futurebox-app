/**
 * A post's words, with the second each line is sung.
 *
 * ── Why a post carries times now ─────────────────────────────────────────
 *
 * The owner, 21 October 2026: *"Wanneer iemand 'n liedjie na die live channel
 * post, moet dit betaald standaard die liedjie eers luister, om die lyrics
 * presies op die image te kry wat gaan hardloop op die image."*
 *
 * A post used to carry its words as sections and their lengths (`planOf`),
 * and the room spread each section's lines evenly over it. Nobody sings like
 * that, so in front of everybody the words ran early or late. The song is
 * now listened to before it is posted (`listenedFor` in `lyrictime.ts`), and
 * the post carries what was measured: per section, the second each line
 * starts (`at`) and ends (`end`).
 *
 * ── In the same column, beside what was there ────────────────────────────
 *
 * `live_posts.words` is `jsonb` and every reader takes `name`, `lines` and
 * `seconds` off each section. The times ride beside them as two more arrays,
 * so a reader that does not know about them reads the post exactly as before,
 * and no SQL has to be run for the room to start carrying them.
 */
import type { Part, TimedLine } from './timeline';

/** A section with the seconds its lines start and end at, one per line. */
export interface TimedPart extends Part {
  readonly at?: readonly number[];
  readonly end?: readonly number[];
}

/** The longest a song in the room can be, which is the ceiling on any time in it. */
export const LONGEST_POST = 1800;

const second = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= LONGEST_POST ? Math.round(n * 100) / 100 : null;
};

/**
 * Measured lines, grouped back into the sections the room reads.
 *
 * A new section starts wherever a line opens one or its section name changes.
 * `seconds` is the section's own span, so a reader that only knows sections
 * still places it where it was sung.
 */
export function timedParts(lines: readonly TimedLine[]): TimedPart[] {
  const parts: { name: string; lines: string[]; at: number[]; end: number[] }[] = [];
  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;
    const last = parts[parts.length - 1];
    if (!last || line.opensSection || last.name !== (line.section || last.name)) {
      parts.push({ name: line.section || '', lines: [], at: [], end: [] });
    }
    const into = parts[parts.length - 1];
    into.lines.push(text);
    into.at.push(Math.round(line.start * 100) / 100);
    into.end.push(Math.round(Math.max(line.start, line.end) * 100) / 100);
  }
  return parts.map((part) => ({
    name: part.name,
    lines: part.lines,
    seconds: Math.max(0, Math.round(part.end[part.end.length - 1] - part.at[0])),
    at: part.at,
    end: part.end,
  }));
}

/**
 * The times a section was sent with, cleaned for the room — or none.
 *
 * Kept only when there is one start and one end per line, every one of them
 * a second inside a song, and never running backwards. Anything else is not
 * a measurement, and the room falls back to spreading the words rather than
 * placing them on numbers it cannot trust.
 */
export function cleanTimes(raw: { at?: unknown; end?: unknown }, count: number): { at: number[]; end: number[] } | null {
  if (!Array.isArray(raw.at) || !Array.isArray(raw.end) || raw.at.length !== count || raw.end.length !== count) return null;
  const at = raw.at.map(second);
  const end = raw.end.map(second);
  if (at.some((one) => one === null) || end.some((one) => one === null)) return null;
  for (let i = 0; i < count; i += 1) {
    if ((end[i] as number) < (at[i] as number)) return null;
    if (i > 0 && (at[i] as number) < (at[i - 1] as number)) return null;
  }
  return { at: at as number[], end: end as number[] };
}

/**
 * The lines with the times they were sung, when every section carries them.
 *
 * Null when any section has none: half a song on measured times and half
 * spread evenly would jump at the seam, and the even spread over the whole
 * song is at least consistent.
 */
export function linesFromParts(parts: readonly TimedPart[] | null | undefined): TimedLine[] | null {
  if (!parts?.length) return null;
  const out: TimedLine[] = [];
  for (const part of parts) {
    const times = cleanTimes(part, part.lines.length);
    if (!times) return null;
    part.lines.forEach((text, i) => {
      out.push({ text, section: part.name, opensSection: i === 0, start: times.at[i], end: times.end[i] });
    });
  }
  return out;
}
