/**
 * Languages offered on the dubbing bar.
 *
 * ── Why there is a list here at all ──────────────────────────────────────
 *
 * There deliberately was not one. The dub screen offered two buttons — the two
 * this app itself speaks — and a box for a three-letter code, on the argument
 * that a dropdown of thirty names, some of which quietly fail, is worse than a
 * box.
 *
 * That argument was right about the failure and wrong about the box. Almost
 * nobody knows that Dutch is `nl` and Danish is `da`, or that Chinese is `zh`
 * and not `cn`. A field that only works if you already know the answer is not
 * a modest interface, it is a closed one — and it made a working feature look
 * like it only did English and Afrikaans.
 *
 * ── What this list is, exactly ───────────────────────────────────────────
 *
 * A reading of the languages ElevenLabs publish for dubbing, written down the
 * way this repository writes down every other number it reads off somebody
 * else's page: as a reading, not as a fact this code can verify. Their list is
 * theirs and it moves.
 *
 * That is only safe to ship because the failure path is real and tested: a
 * language they refuse fails the job, and a failed job refunds — claimed once,
 * in a single statement in the database, in `app/api/dub/route.ts`. Being
 * wrong here costs somebody a wait, not their credits.
 *
 * The free-text code stays alongside, so a language missing from this list is
 * still reachable by anybody who does know the code.
 */

export interface DubLanguage {
  /** ISO 639-1, which is what the dubbing API takes. */
  readonly code: string;
  /** In English, because the rest of this interface is. */
  readonly name: string;
  /** In the language itself, so a speaker recognises it at a glance. */
  readonly own: string;
}

/**
 * The app's own two first, then alphabetical.
 *
 * Not by "popularity", which would put English and Chinese at the front and
 * bury Afrikaans — this app is built by and for people who speak it, and a
 * list that treats it as an afterthought is the wrong list for this product
 * whatever the global numbers say.
 */
export const DUB_LANGUAGES: readonly DubLanguage[] = [
  { code: 'af', name: 'Afrikaans', own: 'Afrikaans' },
  { code: 'en', name: 'English', own: 'English' },
  { code: 'ar', name: 'Arabic', own: 'العربية' },
  { code: 'bg', name: 'Bulgarian', own: 'Български' },
  { code: 'zh', name: 'Chinese', own: '中文' },
  { code: 'hr', name: 'Croatian', own: 'Hrvatski' },
  { code: 'cs', name: 'Czech', own: 'Čeština' },
  { code: 'da', name: 'Danish', own: 'Dansk' },
  { code: 'nl', name: 'Dutch', own: 'Nederlands' },
  { code: 'fil', name: 'Filipino', own: 'Filipino' },
  { code: 'fi', name: 'Finnish', own: 'Suomi' },
  { code: 'fr', name: 'French', own: 'Français' },
  { code: 'de', name: 'German', own: 'Deutsch' },
  { code: 'el', name: 'Greek', own: 'Ελληνικά' },
  { code: 'hi', name: 'Hindi', own: 'हिन्दी' },
  { code: 'id', name: 'Indonesian', own: 'Bahasa Indonesia' },
  { code: 'it', name: 'Italian', own: 'Italiano' },
  { code: 'ja', name: 'Japanese', own: '日本語' },
  { code: 'ko', name: 'Korean', own: '한국어' },
  { code: 'ms', name: 'Malay', own: 'Bahasa Melayu' },
  { code: 'pl', name: 'Polish', own: 'Polski' },
  { code: 'pt', name: 'Portuguese', own: 'Português' },
  { code: 'ro', name: 'Romanian', own: 'Română' },
  { code: 'ru', name: 'Russian', own: 'Русский' },
  { code: 'sk', name: 'Slovak', own: 'Slovenčina' },
  { code: 'es', name: 'Spanish', own: 'Español' },
  { code: 'sv', name: 'Swedish', own: 'Svenska' },
  { code: 'ta', name: 'Tamil', own: 'தமிழ்' },
  { code: 'tr', name: 'Turkish', own: 'Türkçe' },
  { code: 'uk', name: 'Ukrainian', own: 'Українська' },
];

/** The name for a code, where this list knows one. */
export function dubLanguageName(code: string): string | null {
  const found = DUB_LANGUAGES.find((one) => one.code === code.trim().toLowerCase());
  return found ? found.name : null;
}
