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
 * 2. **The account answers when this browser has not been told.** Somebody who
 *    chose Afrikaans on their phone should not have to choose again on a
 *    laptop. Being asked twice is the app forgetting.
 *
 * 3. **The browser's own locale is a guess, not a choice.** It decides the
 *    first paint, so an Afrikaans speaker does not have to find a menu — and
 *    it is not written down, because a guess must not outrank somebody who
 *    told us once somewhere else.
 *
 * ── And the part that was missing ────────────────────────────────────────
 *
 * Rule 2 is right and was not the bug. The bug was that it happened silently:
 * the page had been showing English, she had been reading it, and signing in
 * swapped it with no word about why. So the answer carries `switched` — what
 * was on screen when the account overruled it — and it is set only when the
 * two actually differ. A page already in the account's language changed
 * nothing and has nothing to announce.
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

  const said = asLang(account);
  if (!said) return { lang: showing, keepOnAccount: null, store: null, switched: null };

  /* Rule 2, and the announcement. Stored as well as applied: without it the
     next page load starts from the guess again and asks the account all over
     again — which on a slow connection is a visible flip on every load. */
  return {
    lang: said,
    keepOnAccount: null,
    store: said,
    switched: said === showing ? null : showing,
  };
}
