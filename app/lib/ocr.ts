/**
 * Reading the words out of a photograph, on the phone, for nothing.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 7 October 2026, listing a modern editor's tools: *"grab text"*, and
 * *"Dit is alles code wat ons oor tyd kan develop."*
 *
 * This is the first of the free half of that list. Tesseract is a real OCR
 * engine compiled to WebAssembly: it runs inside the browser, calls nobody,
 * needs no key, and costs us nothing however many times a member presses the
 * button. The only cost is size, and the whole design below is about who
 * pays it and when.
 *
 * ── Everything is served from this app, and that is not a preference ─────
 *
 * The app's Content-Security-Policy is `connect-src 'self'` plus Supabase,
 * and `default-src 'self'` with no `blob:`. Tesseract's defaults break on
 * both: it fetches its core and language files from a CDN, and it wraps its
 * worker in a blob URL. Either would be refused by the browser with a
 * console line nobody sees and a feature that simply never answers.
 *
 * So every file lives in `public/ocr/` and `workerBlobURL` is off. That also
 * means there is no CDN to be down, no third party watching which of her
 * members read which sign, and no new line in a policy that `api/analyse`
 * already warns about: *"a connect-src that grows a line for every supplier
 * is a policy that stops"* being a policy.
 *
 * ── Nothing is downloaded until the button is pressed ────────────────────
 *
 * 6.6 MB sits in `public/ocr/`, and a member who never grabs any text
 * downloads none of it. `import('tesseract.js')` is inside the function, so
 * the library is its own chunk; the core and the language file are fetched
 * by the worker on first use and cached by the browser after that. A member
 * who only ever reads English never fetches the Afrikaans data, and the
 * other way round.
 *
 * ── SIMD, asked before it is needed ──────────────────────────────────────
 *
 * Only the SIMD build of the core is shipped, because shipping the plain one
 * beside it is another 2.9 MB for devices that have been rare since 2023.
 * The cost of that choice is that an old browser would fetch a core it
 * cannot instantiate and fail somewhere deep inside a worker. `canRead`
 * asks the question up front — a seven-byte module the browser either
 * validates or does not — so the screen can say what is wrong in a sentence
 * instead of spinning.
 */

/** Which languages are shipped. Each is fetched only if it is chosen. */
export const READABLE = ['eng', 'afr'] as const;
export type Readable = (typeof READABLE)[number];

/** Where the self-hosted engine lives. One place, used by every path below. */
const HERE = '/ocr';

/**
 * Whether this browser can run the core that is shipped.
 *
 * The bytes are a minimal WebAssembly module whose body uses one SIMD
 * instruction (`v128.const`). A browser without SIMD refuses to validate it
 * and `validate` answers false rather than throwing, which is exactly the
 * question being asked.
 */
export function canRead(): boolean {
  if (typeof WebAssembly === 'undefined') return false;
  try {
    return WebAssembly.validate(new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0,
      1, 5, 1, 96, 0, 1, 123,
      3, 2, 1, 0,
      10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
    ]));
  } catch {
    return false;
  }
}

/**
 * One line of words the engine found, and where it found it.
 *
 * ── Why these were being thrown away ───────────────────────────
 *
 * Carli, 8 October 2026: *"dat dit AI integrated is en die masjien
 * identifiseer self objekte en text wat dan highlight en dan kan die klient
 * op die objekte of text click wat hulle graag wil grab, rondskuif, of
 * delete."*
 *
 * This file took `data.text` and dropped everything else. The engine also
 * returns `blocks → paragraphs → lines → words`, and every one of them
 * carries a `bbox`. The boxes were already being computed, in the same pass
 * that makes the text — so a tappable word costs nothing that was not
 * already being paid.
 *
 * Lines rather than words, because a line is what somebody means when they
 * point at writing in a photograph. A word is available underneath if that
 * ever turns out to be wrong, and it is one field away.
 *
 * In PIXELS of the picture that was read, which is the engine's own frame of
 * reference. Turning them into shares of the frame is `textpick.ts`'s job
 * and is kept out of here: this file knows what Tesseract said, and nothing
 * about how the room draws.
 */
export interface Found {
  readonly text: string;
  /** Nought to a hundred, the engine's own. */
  readonly sure: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export type Read =
  | {
    readonly ok: true;
    readonly text: string;
    readonly sure: number;
    /**
     * Every line it found, with its box. Empty where the engine answered
     * without blocks — which is a thing it is allowed to do, and the reason
     * nothing downstream may assume there is one per line of `text`.
     */
    readonly lines: readonly Found[];
  }
  | { readonly ok: false; readonly why: 'unsupported' | 'failed' };

/**
 * Read a picture, and say how sure it is.
 *
 * `sure` is Tesseract's own confidence, nought to a hundred, averaged over
 * what it found. It is reported rather than used as a threshold here: a
 * number on the screen lets somebody judge a bad read for themselves, and a
 * threshold would silently throw away a half-right answer that was still
 * worth having.
 *
 * @param onStep called with 0..1 while the engine loads and reads. The first
 *   use fetches megabytes, so a screen with no progress on it looks broken.
 */
export async function readWords(
  from: HTMLCanvasElement | HTMLImageElement | Blob,
  lang: Readable,
  onStep?: (part: number) => void,
): Promise<Read> {
  if (!canRead()) return { ok: false, why: 'unsupported' };
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker(lang, 1, {
      workerPath: `${HERE}/worker.min.js`,
      corePath: `${HERE}/tesseract-core-simd-lstm.js`,
      langPath: HERE,
      /* Off, and this is the line without which nothing works at all.
         Tesseract wraps its worker in a blob: URL by default, and this app's
         `default-src 'self'` does not allow blob: workers. */
      workerBlobURL: false,
      /* The files in `public/ocr` are `.traineddata.gz`, which is what this
         flag means — and it is the default, written out because a future
         change to store them uncompressed would otherwise fail on a 404 for
         a name nobody searched for. */
      gzip: true,
      logger: onStep
        ? (m: { progress?: number }) => onStep(Math.max(0, Math.min(1, m.progress ?? 0)))
        : undefined,
    });
    /* `blocks: true` asked for by name. It is not the default in this
       version, and without it `data.blocks` comes back null and every box
       below is silently absent — which reads, on the screen, as a
       photograph with no writing in it. */
    const { data } = await worker.recognize(from, {}, { text: true, blocks: true });
    await worker.terminate();
    const lines: Found[] = [];
    for (const block of data.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        for (const line of para.lines ?? []) {
          const said = (line.text ?? '').trim();
          if (!said) continue;
          const box = line.bbox;
          lines.push({
            text: said,
            sure: Math.round(line.confidence ?? 0),
            left: box.x0,
            top: box.y0,
            width: box.x1 - box.x0,
            height: box.y1 - box.y0,
          });
        }
      }
    }
    return {
      ok: true,
      text: (data.text ?? '').trim(),
      sure: Math.round(data.confidence ?? 0),
      lines,
    };
  } catch {
    return { ok: false, why: 'failed' };
  }
}

/**
 * The read, tidied enough to put on a post.
 *
 * OCR returns the page as it saw it: a line per line of the photograph, with
 * the blank ones the layout left behind. Pasted straight onto a post that is
 * a column of gaps. Blank lines go, and runs of spaces inside a line become
 * one — a sign photographed at an angle gives Tesseract reason to think
 * there is a column there.
 *
 * Nothing else is touched. A spell-correct over somebody's sign would be
 * this app deciding what their photograph said.
 */
/**
 * Whether a reading is words at all, or the engine seeing faces in clouds.
 *
 * ── What she was shown ───────────────────────────────────────────────────
 *
 * Carli, 7 October 2026, having pressed Read English on a photograph of her
 * own face: *"Wat is daai words in the picture"*. It had answered:
 *
 *     SN
 *     GEE
 *     P BK aS SS
 *     = : = 1)
 *     RS ——~ a\.
 *     SS \
 *
 * There are no words in that photograph. Tesseract found letter-shaped
 * things in hair and skin and reported them, as it is built to — and it
 * reported them with a confidence of about thirty, which this code was
 * throwing away.
 *
 * A reader that invents text is worse than one that finds none. Nobody can
 * tell whether the nonsense is a bad read of a real sign or a photograph
 * with nothing to read, so the only safe thing to do with it is retype the
 * sign by hand — which is what the button was for.
 *
 * ── Two questions, because confidence alone is not enough ────────────────
 *
 * Tesseract is sometimes confident about rubbish and sometimes unsure about
 * a perfectly good sign photographed at an angle. So this asks both how sure
 * it was and whether the SHAPE of what came back looks like language: real
 * writing is mostly letters in runs, and noise is mostly punctuation and
 * stranded single characters.
 *
 * Deliberately generous. A half-right read of a real sign is worth having;
 * what is being caught is the case with nothing in it at all.
 */
export function wordsAtAll(text: string, sure: number): boolean {
  const lines = text.split('\n').map((one) => one.trim()).filter((one) => one.length > 0);
  if (lines.length === 0) return false;

  /* A word is a run of three or more letters. "SN" and "GEE" are not words;
     anything somebody photographed on purpose has at least one thing on it
     that is. */
  const WORD = /[A-Za-z\u00C0-\u024F]{3,}/;
  const saying = lines.filter((one) => WORD.test(one)).length;

  /* ── The share of LINES that say something, which is the real test ────
 
     Confidence was tried first and is not it. Her face read at about thirty
     and was refused; the same reading at ninety was not, because confidence
     says how sure the engine is of the shapes and nothing about whether the
     shapes are language.
 
     What separates her face from a sign is the SHAPE OF THE PAGE. Noise is
     scattered: six lines, one of which happens to hold three letters in a
     row. Writing is not: nearly every line of a sign has a word on it,
     whether it is one line or twenty. That holds for "OPEN" and for a whole
     notice board, which a test on the total number of letters does not. */
  if (saying / lines.length < 0.5) return false;

  const body = text.replace(/\s/g, '');
  const letters = (body.match(/[A-Za-z\u00C0-\u024F]/g) ?? []).length;
  /* And it has to be mostly letters rather than mostly punctuation. A page
     of brackets and dashes can come back from a photograph of a fence. */
  if (body.length === 0 || letters / body.length < 0.5) return false;

  /* Confidence last, and only as a floor. It is worth something — an engine
     that is sure of itself about something shaped like language usually has
     it right — but a sign photographed at an angle or in poor light reads
     low and is still worth having half-right. */
  return sure >= 25;
}

export const tidy = (text: string): string =>
  text
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
