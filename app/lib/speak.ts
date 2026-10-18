/**
 * Talking instead of typing, into any box an AI reads.
 *
 * The owner, 14 October 2026: *"ek sal verkies dat al ons ai's ook 'n listening
 * tool het, sodat mense ook dit met praat in invoer."*
 *
 * The browser's own recogniser does the listening — the same one the kids
 * room has used since its first day. Chrome and Android have it under the old
 * `webkit` name, Safari on an iPhone since iOS 14.5, and Firefox has none, so
 * the button is drawn only where pressing it can work. Nothing is recorded by
 * this app and nothing is charged: the browser listens and hands back words,
 * and the words land in the box exactly as if they had been typed, so
 * everything after that — the screen, the price, the confirm — is unchanged.
 *
 * The paid transcriber (`/api/transcribe`) is deliberately not the fallback.
 * It is for a recording's words with their times; a prompt is a sentence, and
 * a sentence should not cost credits to say.
 */

interface Result {
  readonly isFinal?: boolean;
  readonly 0?: { readonly transcript: string };
  readonly length: number;
}

export interface Ear {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((got: { resultIndex?: number; results: ArrayLike<Result> }) => void) | null;
  onerror: ((why?: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type EarMaker = new () => Ear;

/** The browser's recogniser, or nothing. */
export function earMaker(): EarMaker | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: EarMaker; webkitSpeechRecognition?: EarMaker };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** The recogniser's language for the app's. South African English either way. */
export function earLang(lang: string): string {
  return lang === 'af' ? 'af-ZA' : 'en-ZA';
}

/**
 * What was in the box with what was just said put after it.
 *
 * A space between them unless the box ended in one or a line break, and the
 * first letter of a new sentence made a capital, because a recogniser hands
 * back "make it evening" and a box that reads "Sunset.make it evening" looks
 * broken.
 */
export function withSaid(was: string, said: string): string {
  const words = said.trim();
  if (!words) return was;
  if (!was.trim()) return words.charAt(0).toUpperCase() + words.slice(1);
  const ends = /[.!?]\s*$/.test(was);
  const next = ends ? words.charAt(0).toUpperCase() + words.slice(1) : words;
  return /\s$/.test(was) ? `${was}${next}` : `${was} ${next}`;
}

/** The finished words in one answer, from `resultIndex` on. */
export function finalWords(got: { resultIndex?: number; results: ArrayLike<Result> }): string {
  const out: string[] = [];
  for (let i = got.resultIndex ?? 0; i < got.results.length; i += 1) {
    const one = got.results[i];
    /* A recogniser without `isFinal` (the kids room's test double, older
       Safari) only ever hands back finished words. */
    if (one && one.isFinal !== false) out.push(one[0]?.transcript ?? '');
  }
  return out.join(' ').trim();
}
