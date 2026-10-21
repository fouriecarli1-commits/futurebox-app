/**
 * Which of the rows a music engine sends back is the lyrics.
 *
 * ── Why there is a question at all ───────────────────────────────────────
 *
 * Google's music model answers with a list of outputs, and the text ones are
 * not labelled. A song can come back with the words it sang, a description
 * of what it made, a refusal, or several of those. `lib/server/lyria.ts`
 * reads them all out and hands them to the browser as rows, deliberately
 * unnamed, with the note: *"the FIRST REAL SONG says which is which."*
 *
 * That was the right call for an afternoon and the wrong plan. Asking the owner
 * to look at a row and tell me which one it is puts a debugging task on the
 * person the app is for — and she said what that feels like on 9 October,
 * about a different question of mine: *"ek weet eintlik glad nie wat jy soek
 * nie."* The app should be able to look at the text.
 *
 * ── What the cost of being wrong is ──────────────────────────────────────
 *
 * `lyria.ts` names it exactly: a release that published the description
 * where the lyrics should be, or a lyric video that scrolls *"A warm
 * mid-tempo ballad with brushed drums"* across the screen on the beat.
 *
 * So this says **no** rather than guessing. A row that does not look like a
 * lyric sheet is not one, and no lyrics at all is a song with no words shown
 * — which is what happens today and is merely unhelpful, not wrong.
 *
 * ── What a lyric sheet actually looks like ───────────────────────────────
 *
 * Not a topic, a vocabulary or a language — all of which vary, and the app
 * has to work in Afrikaans. The SHAPE is what is stable:
 *
 *   · many lines, and short ones. A sung line is a breath.
 *   · few full stops. Lyrics are not sentences.
 *   · often a section marker — [Verse], [Chorus], [Refrein].
 *
 * A description is the opposite on every count: one or two long lines, each
 * a sentence, with no markers. So the test is the shape, scored, and a row
 * has to clear a bar rather than merely beat the other rows — because a song
 * that sent only a description must come back as "no lyrics", not as "this
 * description is the lyrics, it was the best one there".
 */

/** A section marker, in the languages this app writes in. */
const MARKER = /^\s*[[(]\s*(verse|chorus|bridge|intro|outro|hook|pre-?chorus|refrain|refrein|vers|brug|koor)\b/i;

export interface Reading {
  /** How much this row looks like a lyric sheet, 0–1. */
  readonly score: number;
  readonly lines: number;
  readonly markers: number;
}

/**
 * How much a row looks like a lyric sheet.
 *
 * Exported so a check can drive the reading itself rather than only its
 * verdict — a classifier whose score is invisible is one nobody can tune.
 */
export function readingOf(text: string): Reading {
  const lines = text.split('\n').map((one) => one.trim()).filter(Boolean);
  if (!lines.length) return { score: 0, lines: 0, markers: 0 };

  const markers = lines.filter((one) => MARKER.test(one)).length;
  const sung = lines.filter((one) => !MARKER.test(one));
  if (!sung.length) return { score: 0, lines: lines.length, markers };

  /* Many lines. One or two is a sentence however it is punctuated. */
  const many = Math.min(1, sung.length / 8);

  /* Short lines. A sung line is a breath — call it sixty characters. The
     average is used rather than the longest, because one long line in a
     lyric sheet is a long line and not a description. */
  const average = sung.reduce((sum, one) => sum + one.length, 0) / sung.length;
  const short = Math.max(0, Math.min(1, (90 - average) / 60));

  /* Few sentences. Counted as lines ENDING in a full stop: prose ends every
     sentence, lyrics almost never do. */
  const stops = sung.filter((one) => /[.!?]$/.test(one)).length;
  const unstopped = 1 - stops / sung.length;

  /* A marker is strong evidence and rare, so it lifts rather than carries. */
  const marked = markers > 0 ? 1 : 0;

  const score = (many * 0.3) + (short * 0.3) + (unstopped * 0.25) + (marked * 0.15);
  return { score: Math.max(0, Math.min(1, score)), lines: lines.length, markers };
}

/**
 * The bar a row has to clear to be called the lyrics.
 *
 * Set so that a description cannot clear it on its own: three long,
 * full-stopped lines score about 0.2. A four-line verse with no marker
 * scores about 0.6. The gap is wide, which is what makes a fixed bar safe
 * rather than a tuned number.
 */
export const ENOUGH = 0.45;

/**
 * The lyrics among the rows, or null.
 *
 * `null` is a real answer and the safe one: no words shown is unhelpful,
 * and the wrong words shown is a release with a description printed on it.
 */
export function sungWordsIn(rows: readonly string[]): string | null {
  const row = sungRow(rows);
  return row === null ? null : lyriaSheet(row).sheet;
}

/** The row that is the lyric sheet, as it came, or null. */
function sungRow(rows: readonly string[]): string | null {
  let best: { row: string; score: number } | null = null;
  for (const row of rows) {
    if (DESCRIBES.test(row)) continue;
    const reading = readingOf(lyriaSheet(row).sheet);
    if (reading.score < ENOUGH) continue;
    if (!best || reading.score > best.score) best = { row, score: reading.score };
  }
  return best?.row ?? null;
}

/** A line the engine said it starts singing at a given second. */
export interface Anchor {
  readonly line: string;
  readonly at: number;
}

/**
 * The seconds the engine said its sections start at, for the lines that
 * carry one — `[12.0:]` on the first line of each section in Lyria's sheet.
 * Empty for any engine that does not say.
 */
export function sungAnchorsIn(rows: readonly string[]): Anchor[] {
  const row = sungRow(rows);
  if (row === null) return [];
  return lyriaSheet(row).timed
    .filter((one): one is TimedLine & { at: number } => one.at !== null && Number.isFinite(one.at))
    .map((one) => ({ line: one.line, at: one.at }));
}

/**
 * The row that describes the music rather than singing it.
 *
 * Measured on the owner's first real Lyria song, 21 October 2026: the second
 * row opens with the model's own numbers — `mosic: 4.5`, `bpm: 100.0`,
 * `duration_secs: 62.4`, `good_crop: 1.0` — and then prose about the
 * guitar. No lyric sheet starts with a `bpm:` line, so a row that does is
 * not one, whatever its shape scores.
 */
const DESCRIBES = /^\s*(mosic|bpm|duration_secs|good_crop)\s*:/im;

/** A line Lyria wrote, and when in the song it starts — when it said. */
export interface TimedLine {
  readonly line: string;
  /** Seconds from the start, or null for a line that runs on from the last. */
  readonly at: number | null;
}

/**
 * Lyria's words, with its own marks read rather than printed.
 *
 * The first real song (21 October 2026) came back like this:
 *
 *     [[A0]]
 *     [[B1]]
 *     [12.0:] Die son sak laag oor die vlakte,
 *     [:] Oranje strepe in die lug,
 *     [[B2]]
 *     [36.0:] Huis toe, huis toe, die pad is lank,
 *
 * `[[B1]]` is a section, `[12.0:]` is the second a line starts, and `[:]`
 * is a line that follows on. Shown as they came, a release would carry
 * `[[A0]]` as its first line and a lyric video would scroll `[12.0:]`. So
 * the sheet is the words with a blank line between sections, and the
 * timings are kept beside it for the lyric video — where Lyria said when a
 * section starts, that is a measurement the video does not have to guess.
 *
 * Words with none of these marks — every other engine's — come back as
 * they were.
 */
export function lyriaSheet(text: string): { sheet: string; timed: TimedLine[] } {
  const timed: TimedLine[] = [];
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (/^\[\[[A-Z]\d+\]\]$/.test(line)) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }
    const mark = /^\[(\d+(?:\.\d+)?)?:\]\s*(.*)$/.exec(line);
    if (mark) {
      const words = mark[2].trim();
      if (!words) continue;
      out.push(words);
      timed.push({ line: words, at: mark[1] !== undefined ? Number(mark[1]) : null });
      continue;
    }
    out.push(line);
  }
  while (out.length && out[out.length - 1] === '') out.pop();
  while (out.length && out[0] === '') out.shift();
  return { sheet: out.join('\n'), timed };
}

/**
 * The rows out of a response's headers.
 *
 * Base64, because a header may hold neither a newline nor a non-Latin-1
 * byte and lyrics are full of both — see `saidHeader` in
 * `lib/server/lyria.ts`, which is the other half of this.
 */
export function rowsFrom(headers: Headers): string[] {
  const packed = headers.get('X-Song-Words');
  if (!packed) return [];
  try {
    const text = typeof atob === 'function'
      ? decodeURIComponent(escape(atob(packed)))
      : Buffer.from(packed, 'base64').toString('utf8');
    /* A JSON array, not a separated string. `saidHeader` joined the rows
       with `\n\n` until `check:gesing` found that a lyric sheet is itself
       `\n\n`-separated — a verse and a chorus came back as two rows, and
       the reader kept one and lost the other. There is no character that
       cannot appear in lyrics, so there is no separator. */
    const said: unknown = JSON.parse(text);
    if (!Array.isArray(said)) return [];
    return said
      .map((one) => (typeof one === 'string' ? one.trim() : ''))
      .filter(Boolean);
  } catch {
    /* A header that will not decode is a header from a version that packed
       it differently. Nothing to show and nothing worth saying. */
    return [];
  }
}
