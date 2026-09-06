'use client';

/**
 * "Your account is in Afrikaans, so this is too. Keep English?"
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli: "Wanneer ek inlog in engels, spring die blad afrikaans toe."
 *
 * She is right, and the code was doing what it was told. The rule is that a
 * language chosen in this browser is never overruled, and the account answers
 * only when this browser has nothing stored. Following the browser's own
 * locale is a guess rather than a choice, so it stores nothing — which is
 * correct, because a guess should not beat a person who told us once on
 * another device.
 *
 * The hole is the moment in between. The page had been showing English, she
 * had been reading it, and signing in swapped it with no word about why. From
 * where she sat the app lost its place; from where the code sat it remembered
 * hers. Both are true, and the fix is not to pick one.
 *
 * So the account still wins, and the change stops being silent. One sentence,
 * one press to go back, and pressing it stores the choice — so it wins from
 * then on and this never appears on this device again.
 *
 * ── Why it is not a toast ────────────────────────────────────────────────
 *
 * A toast is for something that has finished and needs no answer. This has an
 * answer in it, and the answer is worth as long as it takes to read a sentence
 * in a language you were not expecting. It sits in the flow, at the top, and
 * leaves when it is dealt with rather than on a timer.
 */

import React from 'react';
import { Languages, X } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function LanguageSwitched(): React.ReactElement | null {
  const { t, switched, undoSwitch } = useLang();
  if (!switched) return null;

  /* Named in the language it would go back to, not in the one now on screen.
     The whole point is to be legible to somebody who did not expect this
     page — a button offering "Engels" to a person looking for "English" is
     the same problem one layer down. */
  const back = switched === 'en' ? 'English' : 'Afrikaans';

  return (
    <div className="mx-auto mb-3 flex max-w-3xl items-start gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3">
      <Languages className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
      <p className="min-w-0 flex-1 text-sm leading-snug text-zinc-300">
        {t(
          'lang.switched',
          'Your account is set to this language, so the app followed it. It only does this when nothing was chosen on this device.',
        )}
      </p>
      <button
        type="button"
        onClick={undoSwitch}
        className="min-h-[36px] flex-shrink-0 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-emerald-300"
      >
        {t('lang.keep', 'Keep {language}').replace('{language}', back)}
      </button>
    </div>
  );
}
