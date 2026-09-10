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
 * So for a while it did not: signing in either confirmed a choice made in
 * this browser and wrote it up, or did nothing at all.
 *
 * ── And that was over-correcting, which took another three reports ───────
 *
 * The claim above — "rule 2 already fires on arrival, so applying it again
 * at sign-in cannot reach anybody the first application missed" — is wrong,
 * and it is wrong in a way that is easy to miss and easy to check.
 *
 * The arrival effect asks the account **at mount**. At mount nobody has
 * signed in yet, so `accountLanguage()` answers nothing and the rule falls
 * through to the device's locale. For somebody arriving already signed in,
 * that is fine. For somebody arriving signed *out* — which is everybody who
 * has just been handed a fresh browsing context — the account never got a
 * say at all, and sign-in was the first moment it could have had one.
 *
 * Carli's `/taal` screenshot on 10 September 2026 is that state exactly:
 * nothing carried in the address, nothing in storage, nothing in the cookie,
 * the account **not asked**, and an `en-ZA` phone deciding. She had chosen
 * Afrikaans; the only place that remembers across contexts is the account,
 * and it was never consulted.
 *
 * Her own case — the one that caused the removal — was a *stored* choice
 * being overruled, and rule 1 handles that and always did: `onSignIn`
 * returns on its first branch and never reaches the account. Removing the
 * whole mechanism to fix a case the first branch already covered left
 * exactly the person it was for.
 *
 * ── So the rule now, in full ─────────────────────────────────────────────
 *
 * A choice stored in this browser wins and is written up to the account.
 * With nothing stored, the account answers — and it can only ever be
 * replacing the device's own guess, because "nothing stored" is what makes
 * the screen a guess. Rule 3 has said from the first version of this file
 * that a guess must not outrank somebody who told us once somewhere else.
 *
 * It is announced. `switched` carries what was replaced, `LanguageSwitched`
 * turns it into a sentence and a way back, and taking that way back is a
 * choice like any other — stored, written up, and never asked again here.
 *
 * ── The race, and why it no longer decides anything ──────────────────────
 *
 * The old worry: `showing` could be a stale reading of the screen, and a
 * stale reading that happened to match the account silenced the notice.
 *
 * With nothing stored, `showing` is a pure function of the device's locale —
 * the caller recomputes it from the same two inputs `onArrival` uses, at the
 * moment it decides. The locale does not change between two readings, so a
 * stale one and a fresh one cannot differ. And the language chosen does not
 * depend on it at all: only the sentence naming what was replaced does.
 *
 * The other half of the old worry — writing whatever is on screen up to the
 * account and destroying the choice it holds — is still avoided, and
 * deliberately: this branch never sets `keepOnAccount`. Only a real choice
 * is written up.
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

  /* ── Nothing stored, and the screen is showing a guess ────────────────

     The comment that used to stand here said the account is not consulted at
     sign-in any more, because "the arrival effect has already had its say
     with the account before anybody was reading".

     **It had not.** The arrival effect asks the account at mount, and at
     mount nobody is signed in — so `accountLanguage()` answers nothing and
     the rule falls through to the device's locale. Signing in is the *first*
     moment the account can answer at all, and this line refused to ask.

     Carli's screenshot of `/taal`, 10 September 2026, is that exactly:

         1. Carried through the sign-in   empty
         2. Stored in this browser        empty
         3. The cookie                    empty
         4. The account                   not asked yet
         The phone's own setting          en-ZA
         What decided it                  the phone's own language setting

     Four empties and a guess. She had chosen Afrikaans — somewhere else, in
     a browsing context this one cannot see — and the one place that
     remembers across contexts is the account, which was never asked.

     ── Why removing this was over-correcting ────────────────────────────

     It was taken out because signing in kept swapping the language under
     her. But her case was a *stored choice* being overruled, and rule 1
     above already covers that and always did — it returns before reaching
     here. Taking out the whole mechanism to fix a case the first branch
     handles left the one person it was for: somebody with nothing on this
     device at all.

     ── The guard, which is the whole of the difference ──────────────────

     `showing` is what the device would work out on its own from the same two
     inputs `onArrival` uses. With nothing stored, that is by definition a
     *guess* — the phone's locale. So this can only ever replace a guess, and
     rule 3 has said from the beginning that a guess must not outrank
     somebody who told us once somewhere else.

     It is announced rather than done quietly (`switched`), because a page
     that changes language under a reader with no explanation is the fault
     that was reported in the first place. `LanguageSwitched` turns it into a
     sentence and a way back, and taking that way back is a choice, so it is
     stored and never asked again on this device. */
  const said = asLang(account);
  if (!said || said === showing) {
    /* No answer, or the same answer. Nothing to do either way, and nothing
       to announce: a page already in the account's language did not change. */
    return { lang: showing, keepOnAccount: null, store: null, switched: null };
  }
  return { lang: said, keepOnAccount: null, store: said, switched: showing };
}
