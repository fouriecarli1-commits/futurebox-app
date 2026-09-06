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
  /**
   * The same line in another language, for a film that has to travel.
   *
   * Optional, and absent everywhere except a music video that was asked for
   * it. Drawn under the line rather than instead of it: the song is in the
   * language it is in, and this is a subtitle rather than a replacement.
   */
  readonly also?: string;
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
  if (!parts.some((part) => part.lines.length > 0) || !(duration > 0)) return [];

  /* Every part counts towards the clock, including the ones nobody sings on.
 
     They used to be filtered out before the scaling, so an intro, a break and
     an outro simply did not exist: the words were stretched over the whole
     file and the first line started at zero, on top of eight seconds of
     instrumental. That is half of "die woorde hardloop te vinnig" — they were
     not too fast, they were shifted early and then stretched to make up the
     difference.
 
     Counting them is what turns a plan into a clock: an intro is a gap the
     words do not start in. */
  const planned = parts.reduce((total, part) => total + Math.max(1, part.seconds), 0);
  const scale = duration / planned;

  const timed: TimedLine[] = [];
  let at = 0;
  parts.forEach((part) => {
    const span = Math.max(1, part.seconds) * scale;
    if (part.lines.length === 0) {
      at += span;
      return;
    }
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

export interface TimedWord {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/**
 * Every word with a moment of its own.
 *
 * A line's words are spread across the line by how long each one takes to say
 * — a share proportional to its length, not an equal slice, because "the" and
 * "tomorrow" are not the same amount of singing. It is still an estimate, and
 * a smaller one than the line timing it sits inside: the line is real, the
 * word is a sensible division of it. The screen says so rather than implying
 * that each word is pinned to the beat it lands on.
 */
export function wordsOf(lines: readonly TimedLine[]): TimedWord[] {
  const out: TimedWord[] = [];
  lines.forEach((line) => {
    const words = line.text.split(/\s+/).filter(Boolean);
    if (!words.length) return;
    let total = 0;
    // A floor, so a one-letter word still gets a moment rather than a sliver.
    const weights = words.map((word) => {
      const weight = Math.max(2, word.length);
      total += weight;
      return weight;
    });
    const span = Math.max(0.001, line.end - line.start);
    let at = line.start;
    words.forEach((word, index) => {
      const length = (weights[index] / total) * span;
      out.push({ text: word, start: at, end: at + length });
      at += length;
    });
  });
  return out;
}

/**
 * The same lines, moved onto the phrases somebody actually sang.
 *
 * `timelineOf` divides a section evenly because, without the voice on its own,
 * even is the only defensible guess. It is also usually wrong, and wrong in a
 * way that is obvious to sing against: a song that opens with two bars of
 * music has every word early by two bars, for the whole song.
 *
 * Given the measured phrases, the words go where the singing is. Two cases,
 * and the first is the one that matters most:
 *
 *   · **As many phrases as lines** — one line per phrase, exactly. This is
 *     what a verse normally looks like, and here the result is not an
 *     estimate at all.
 *   · **Any other count** — the lines are spread across the singing rather
 *     than across the section, by how long each line is to sing. Gaps between
 *     phrases belong to no line, so the words hold still while the music
 *     plays and move when somebody sings.
 *
 * Phrases outside every section are ignored rather than forced onto a line:
 * an "ooh" over the outro is singing, but it is not one of the words.
 */
export function alignTo(lines: readonly TimedLine[], phrases: readonly { from: number; to: number }[]): TimedLine[] {
  if (!lines.length || !phrases.length) return lines.slice();

  // As many phrases in the song as there are lines: one line per phrase, and
  // no need to trust the plan's section boundaries at all. This is the strong
  // case and it is worth taking before anything else, because those boundaries
  // came from the same guess the words did — a song that starts two bars late
  // has every section boundary two bars early as well.
  if (phrases.length === lines.length) {
    return lines.map((line, index) => ({ ...line, start: phrases[index].from, end: phrases[index].to }));
  }

  // Sections, in order, each with its own lines.
  const sections: { lines: TimedLine[]; from: number; to: number; phrases: { from: number; to: number }[] }[] = [];
  lines.forEach((line) => {
    const last = sections[sections.length - 1];
    if (!last || line.opensSection) sections.push({ lines: [line], from: line.start, to: line.end, phrases: [] });
    else {
      last.lines.push(line);
      last.to = line.end;
    }
  });

  // Each phrase belongs to one section: the one it shares most time with.
  // Overlap alone would let a phrase that straddles a boundary be sung twice,
  // once in each — which put two different lines on the same three seconds.
  phrases.forEach((phrase) => {
    let best = -1;
    let most = 0;
    sections.forEach((section, index) => {
      const shared = Math.min(section.to, phrase.to) - Math.max(section.from, phrase.from);
      if (shared > most) {
        most = shared;
        best = index;
      }
    });
    if (best >= 0) sections[best].phrases.push(phrase);
  });

  const out: TimedLine[] = [];
  sections.forEach((section) => {
    const mine = section.phrases;
    if (!mine.length) {
      // Nothing was sung in this section's window, so there is nothing better
      // to say than what was already said.
      out.push(...section.lines);
      return;
    }

    if (mine.length === section.lines.length) {
      section.lines.forEach((line, index) => {
        out.push({ ...line, start: mine[index].from, end: mine[index].to });
      });
      return;
    }

    // Spread across the singing itself: the gaps between phrases are skipped,
    // so a line's share is a share of time somebody is actually singing.
    const spans = mine.map((phrase) => phrase.to - phrase.from);
    const singing = spans.reduce((total, span) => total + span, 0);
    let total = 0;
    const weights = section.lines.map((line) => {
      const weight = Math.max(4, line.text.length);
      total += weight;
      return weight;
    });

    /** A moment `into` seconds along the singing, put back on the song's clock. */
    const clockOf = (into: number): number => {
      let left = into;
      for (let i = 0; i < mine.length; i += 1) {
        if (left <= spans[i] || i === mine.length - 1) return mine[i].from + Math.min(left, spans[i]);
        left -= spans[i];
      }
      return mine[mine.length - 1].to;
    };

    let along = 0;
    section.lines.forEach((line, index) => {
      const share = (weights[index] / total) * singing;
      out.push({ ...line, start: clockOf(along), end: clockOf(along + share) });
      along += share;
    });
  });

  return out;
}

/**
 * The same lines squeezed into the part of the song somebody actually sings.
 *
 * `timelineOf` lays the plan across the whole file, first word at zero and
 * last word at the end, because the plan says nothing about the bars of music
 * in front of the singing or the ones after it. Nearly every produced song has
 * both, and the result is words that run ahead of the singer for the whole
 * song.
 *
 * Given a window — measured off the separated voice, estimated off the mix, or
 * moved by hand — the same proportions are mapped into it. Nothing about which
 * line is longer than which changes; the whole thing simply starts when the
 * singing starts.
 */
export function fitInto(lines: readonly TimedLine[], from: number, to: number): TimedLine[] {
  if (!lines.length || !(to > from)) return lines.slice();
  const first = lines[0].start;
  const last = lines[lines.length - 1].end;
  const span = last - first;
  if (!(span > 0)) return lines.slice();
  const scale = (to - from) / span;
  return lines.map((line) => ({
    ...line,
    start: from + (line.start - first) * scale,
    end: from + (line.end - first) * scale,
  }));
}
