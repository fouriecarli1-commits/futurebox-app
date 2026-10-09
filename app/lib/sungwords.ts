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
 * That was the right call for an afternoon and the wrong plan. Asking Carli
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
  let best: { text: string; score: number } | null = null;
  for (const row of rows) {
    const reading = readingOf(row);
    if (reading.score < ENOUGH) continue;
    if (!best || reading.score > best.score) best = { text: row.trim(), score: reading.score };
  }
  return best?.text ?? null;
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
