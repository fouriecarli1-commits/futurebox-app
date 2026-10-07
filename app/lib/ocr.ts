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

export type Read =
  | { readonly ok: true; readonly text: string; readonly sure: number }
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
    const { data } = await worker.recognize(from);
    await worker.terminate();
    return { ok: true, text: (data.text ?? '').trim(), sure: Math.round(data.confidence ?? 0) };
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
export const tidy = (text: string): string =>
  text
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
