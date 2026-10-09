/**
 * Which welcome recording a language gets, and whether it has one at all.
 *
 * ── Why this left the player ─────────────────────────────────────────────
 *
 * `WelcomeVideo.tsx` decided this itself, with three consts at the top of the
 * file and `if (!source) return null` at the bottom. That was right while the
 * player was the only thing that needed the answer.
 *
 * On 9 October the landing page needed it too. Carli: *"Gaan aan met die
 * website se home page"*, and the shape a home page wants at a desk is the
 * words on the left with the thing to look at on the right. But the thing to
 * look at is this player, and this player renders NOTHING when the visitor's
 * language has no recording — Afrikaans has one only if an environment
 * variable is set. A hero with a fixed second column would therefore be
 * correct in English and half empty in hers.
 *
 * So the page has to be able to ask before it chooses a layout, and the
 * answer it gets has to be the same one the player acts on. A condition
 * copied into two files is two conditions the first time one of them moves,
 * and `check:voordeur` drives both against each other for exactly that
 * reason.
 *
 * ── Why the names are written out, and read inside the functions ─────────
 *
 * Next replaces `process.env.NEXT_PUBLIC_*` at build time only where it can
 * see the whole name in the source: `process.env[whatever]` is not replaced
 * and arrives at the browser as undefined, which would be a blank player with
 * nothing anywhere saying why. `WelcomeVideo.tsx` carries the longer note on
 * that, and on why these are the only `NEXT_PUBLIC_` variables in the app —
 * they are public addresses for public files, and the browser is what needs
 * to know them.
 *
 * Read inside the function rather than into a module-level const, which is
 * the one change from how the player had it. A const is captured once when
 * the module loads, and a check that sets the variable and then asks the
 * question would be told whatever was true before it ran — a test that
 * cannot fail. Inside the body the literal name is still there for Next to
 * replace, so nothing about the build changes.
 */

/** The languages `useLang` can be in, as far as this file is concerned. */
export type WelcomeLang = string;

/** Is this the Afrikaans page? One place, so the two readers cannot disagree. */
const afrikaans = (lang: WelcomeLang): boolean => lang === 'af';

/**
 * The recording for this language, or `''` for none.
 *
 * English falls back to `/welcome.mp4`, which ships in `public/`, so English
 * is the one language that cannot be unset. The older variable name is still
 * honoured so an existing Vercel setup keeps working.
 *
 * Afrikaans has NO fallback on purpose. Putting the English recording on the
 * Afrikaans page tells an Afrikaans speaker, in the first thing they see,
 * that the Afrikaans is the translation and the English is the product.
 */
export function sourceFor(lang: WelcomeLang): string {
  if (afrikaans(lang)) return process.env.NEXT_PUBLIC_WELCOME_VIDEO_AFRIKAANS ?? '';
  return (
    process.env.NEXT_PUBLIC_WELCOME_VIDEO_ENGLISH
    ?? process.env.NEXT_PUBLIC_WELCOME_VIDEO
    ?? '/welcome.mp4'
  );
}

/**
 * The cover frame for this language's recording, or `''` for none.
 *
 * The cover follows the recording it belongs to. A cover set for the other
 * language is not a fallback: it would put an Afrikaans title card over an
 * English recording, which is worse than no card at all.
 */
export function coverFor(lang: WelcomeLang): string {
  if (afrikaans(lang)) return process.env.NEXT_PUBLIC_WELCOME_VIDEO_COVERA ?? '';
  return process.env.NEXT_PUBLIC_WELCOME_VIDEO_COVERE ?? '';
}

/**
 * Is there anything to draw for this language?
 *
 * The question the landing page asks before it decides whether to open a
 * column beside the words. It is `sourceFor` and not a second reading of the
 * environment, so a `null` from the player and a closed column on the page
 * are the same fact rather than two that happen to agree.
 */
export function hasWelcomeVideo(lang: WelcomeLang): boolean {
  return sourceFor(lang) !== '';
}
