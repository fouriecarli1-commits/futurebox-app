/**
 * Which language the app is in, as a decision rather than an effect.
 *
 * ── Why this is its own file ─────────────────────────────────────────────
 *
 * Carli: "Wanneer ek inlog in engels, spring die blad afrikaans toe."
 *
 * She was right, and the code was doing what it was told. The rule underneath
 * it is the subtlest thing in this app — a stored choice, a browser's guess and
 * an account can all have an opinion, and they do not carry equal weight —
 * and it lived inside two React effects where it could not be run, let alone
 * checked. The fix went in without a test because there was nowhere to put one.
 *
 * So the rule is a function now. It takes what is known and answers what to
 * show; the effects call it and do the storing. `check:language` runs it
 * against every combination that can actually occur, including the one she
 * hit.
 *
 * ── The rule, in order of weight ─────────────────────────────────────────
 *
 * 1. **A choice made in this browser wins, always.** Somebody who picked
 *    English here is not overruled by anything, and the account is brought
 *    into step with them rather than the other way round.
 *
 * 2. **The account answers when this browser has not been told** — and it
 *    answers *on arrival*, before anybody has read anything, not under
 *    somebody mid-sentence. Somebody who chose Afrikaans on their phone
 *    should not have to choose again on a laptop; being asked twice is the
 *    app forgetting. `LanguageProvider`'s mount effect does that, and it is
 *    the right place for it: nothing is on screen yet, so nothing is being
 *    taken away.
 *
 * 3. **The browser's own locale is a guess, not a choice.** It decides the
 *    first paint, so an Afrikaans speaker does not have to find a menu — and
 *    it is not written down, because a guess must not outrank somebody who
 *    told us once somewhere else.
 *
 * ── Why signing in no longer changes the language at all ─────────────────
 *
 * Carli, three times over one day, the last of them after two separate fixes:
 * "wanneer ek op my mobile app van afrikaans af inlog, spring hy nogsteeds
 * engels toe."
 *
 * The first fix made the swap announce itself instead of happening in silence.
 * The second put that announcement somewhere she could actually reach it —
 * it had been rendering behind the welcome panel. Both were real faults and
 * both are fixed. Neither stopped the swap, because the swap was the rule
 * working as designed.
 *
 * Three reports is the rule being wrong, not the person.
 *
 * And once that is admitted, the mechanism is redundant as well as unwelcome.
 * Rule 2 already fires **on arrival**, in `LanguageProvider`'s mount effect,
 * which asks the account whenever this browser has nothing stored. The laptop
 * case — chose Afrikaans on a phone, opens a laptop — is served there,
 * before a word is on the screen. Applying the same rule a second time at
 * sign-in cannot reach anybody the first application missed. All it can do is
 * change the language of a page somebody is already looking at.
 *
 * So it does not. Signing in now either confirms a choice made in this
 * browser and writes it up, or does nothing at all. The account never
 * overrules what is on the screen, because by then it is somebody's screen.
 *
 * ── The race this also removes ───────────────────────────────────────────
 *
 * The tempting alternative — write whatever is on screen up to the account —
 * looks better and is worse. On a phone whose locale is English, arrival
 * shows English, asks the account, and applies the Afrikaans it finds. If
 * sign-in fires before that answer lands it would write English up and
 * destroy the choice it was meant to protect. Doing nothing has no such
 * ordering to get right.
 *
 * `switched` stays in the answer and is now always null. It is the notice
 * `LanguageSwitched` draws, and there is nothing left to announce — kept
 * rather than deleted so the shape does not change under callers, and so a
 * future rule that does swap has somewhere to say so.
 */

export type Lang = 'en' | 'af';

/** Anything at all, narrowed to a language. Storage and APIs both lie. */
export function asLang(value: unknown): Lang | null {
  return value === 'en' || value === 'af' ? value : null;
}

/**
 * What the first paint shows, before anybody has signed in.
 *
 * @param stored  what this browser wrote down, if anything
 * @param locale  `navigator.language`, or whatever stands for it
 */
export function onArrival(
  stored: unknown,
  locale: string | null | undefined,
): { lang: Lang; fromChoice: boolean } {
  const chosen = asLang(stored);
  if (chosen) return { lang: chosen, fromChoice: true };
  const guessed = (locale ?? '').toLowerCase().startsWith('af') ? 'af' : 'en';
  return { lang: guessed, fromChoice: false };
}

/**
 * What happens when somebody signs in.
 *
 * @param stored   what this browser wrote down, if anything
 * @param account  what the account says, if it answered
 * @param showing  what is on the screen at this moment
 *
 * `keepOnAccount` means: write the browser's choice up to the account. It is
 * returned rather than done here so this stays a decision and not an effect —
 * the whole reason it can be checked.
 */
export function onSignIn(
  stored: unknown,
  account: unknown,
  showing: Lang,
): {
  /** What to show. Never null: doing nothing is showing what is already there. */
  readonly lang: Lang;
  /** Write this to the account, if set. */
  readonly keepOnAccount: Lang | null;
  /** Write this to the browser, if set. */
  readonly store: Lang | null;
  /** What was on screen when the account overruled it, if it did. */
  readonly switched: Lang | null;
} {
  const chosen = asLang(stored);
  if (chosen) {
    /* Rule 1. Written up every sign-in rather than only when it differs:
       reading the account first to compare costs a round trip to save a write
       that is idempotent, and the read is the half that can fail. */
    return { lang: chosen, keepOnAccount: chosen, store: null, switched: null };
  }

  /* Nothing stored, so nothing to confirm — and nothing to overrule.

     The account is not consulted here at all any more; see the note above.
     Whatever is on the screen stays on the screen, and the arrival effect has
     already had its say with the account before anybody was reading. */
  return { lang: showing, keepOnAccount: null, store: null, switched: null };
}
