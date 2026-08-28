/**
 * Which words are being sung right now.
 *
 * This is possible at all because the app writes the composition plan itself:
 * it told the music service that the verse is 72 seconds and the chorus 36, so
 * it knows where each section starts without asking anybody. That is real
 * timing, not a guess.
 *
 * Inside a section it *is* a guess, and an even one: four lines across 72
 * seconds get 18 seconds each. Nobody sings evenly, so a line can be a second
 * or two out. The screen says so rather than implying word-perfect sync, and
 * the section highlight — which is the part that is accurate — is what carries
 * the weight.
 *
 * The plan is scaled to the file's real length before any of this, because a
 * plan asking for 180 seconds and a file lasting 174 would otherwise drift
 * further apart with every section.
 */

export interface Part {
  readonly name: string;
  readonly lines: readonly string[];
  readonly seconds: number;
}

export interface TimedLine {
  readonly text: string;
  readonly section: string;
  /** True on the first line of a section, so the screen can print the heading. */
  readonly opensSection: boolean;
  readonly start: number;
  readonly end: number;
}

/** Splits a lyric sheet on its [Section] tags. No timing, just the shape. */
export function partsOf(lyrics: string): Part[] {
  const out: { name: string; lines: string[] }[] = [];
  let current: { name: string; lines: string[] } | null = null;
  lyrics.split('\n').forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    const tag = line.match(/^\[(.+)\]$/);
    if (tag) {
      if (current && current.lines.length) out.push(current);
      current = { name: tag[1], lines: [] };
      return;
    }
    if (!current) current = { name: 'Verse', lines: [] };
    current.lines.push(line);
  });
  if (current && (current as { lines: string[] }).lines.length) out.push(current);
  return out.map((part) => ({ ...part, seconds: Math.max(1, part.lines.length * 4) }));
}

/**
 * Every line with a start and an end, fitted to how long the track really is.
 *
 * Returns an empty list when there is nothing to follow, which the screen reads
 * as "do not offer this" rather than drawing an empty panel.
 */
export function timelineOf(parts: readonly Part[], duration: number): TimedLine[] {
  const usable = parts.filter((part) => part.lines.length > 0);
  if (!usable.length || !(duration > 0)) return [];

  const planned = usable.reduce((total, part) => total + Math.max(1, part.seconds), 0);
  const scale = duration / planned;

  const timed: TimedLine[] = [];
  let at = 0;
  usable.forEach((part) => {
    const span = Math.max(1, part.seconds) * scale;
    const each = span / part.lines.length;
    part.lines.forEach((text, index) => {
      timed.push({
        text,
        section: part.name,
        opensSection: index === 0,
        start: at + index * each,
        end: at + (index + 1) * each,
      });
    });
    at += span;
  });
  return timed;
}

/** The line being sung at this moment, or -1 before the first one. */
export function lineAt(timed: readonly TimedLine[], at: number): number {
  for (let i = 0; i < timed.length; i += 1) {
    if (at >= timed[i].start && at < timed[i].end) return i;
  }
  // Past the last line — a track often has an instrumental tail — the last line
  // stays lit rather than the screen going blank.
  return timed.length && at >= timed[timed.length - 1].end ? timed.length - 1 : -1;
}
