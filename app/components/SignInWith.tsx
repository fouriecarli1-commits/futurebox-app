'use client';

/**
 * The row of "continue with" buttons, drawn from what is actually switched on.
 *
 * ── Why it asks first ────────────────────────────────────────────────────
 *
 * Every provider here needs its own developer account, its own client id and
 * secret, and this app's address on somebody else's redirect list. None of
 * that is something the app can arrange for itself, and a button for a
 * provider nobody has configured does not fail politely — it sends somebody
 * out to a consent screen that refuses them and drops them back holding an
 * error they cannot act on.
 *
 * So `cloud.providersOn()` asks the project which ones are on, and this draws
 * those. Switching Facebook on becomes a change in a console rather than a
 * change in this file, and switching it off takes the button away by itself.
 *
 * ── The marks are theirs, and drawn to their rules ───────────────────────
 *
 * Google's button is white with their own four-colour mark, Apple's is black
 * with the apple, Facebook's is their blue. Each of those three companies
 * publishes rules about how their button may look, and a button that ignores
 * them is a review rejection later. They are literal colours rather than theme
 * tokens for the same reason the Google one already was: a white button that
 * turns near-black on a light theme is no longer Google's button.
 */

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { providersOn, signInWith, type Provider } from '../lib/cloud';

function Mark({ provider }: { readonly provider: Provider }): React.ReactElement {
  if (provider === 'google') {
    return (
      <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.2-3.8 6.6-9.5 6.6-16.2z" />
        <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.4s.3-3 .8-4.4l-7.8-6.1C1 17 0 20.4 0 24s1 7 2.6 10.1l7.8-5.4z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.5 2.1-8.8 2.1-6.4 0-11.7-3.7-13.6-9.1l-7.8 5.4C6.5 42.6 14.6 48 24 48z" />
      </svg>
    );
  }
  if (provider === 'apple') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true" fill="currentColor">
        <path d="M17.05 12.54c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.71-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.18-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.61 2.25 2.76 2.21 1.11-.04 1.53-.72 2.87-.72 1.34 0 1.71.72 2.88.7 1.19-.02 1.94-1.08 2.67-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.34-3.54zM14.86 5.6c.61-.74 1.02-1.77.91-2.8-.88.04-1.94.59-2.57 1.32-.56.66-1.05 1.71-.92 2.72.98.08 1.98-.5 2.58-1.24z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true" fill="currentColor">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

/** Each company's own button, as each company requires it to look. */
const SKIN: Record<Provider, string> = {
  google: 'bg-[#ffffff] text-[#1f1f1f] hover:opacity-90',
  apple: 'bg-[#000000] text-[#ffffff] hover:opacity-90',
  facebook: 'bg-[#1877f2] text-[#ffffff] hover:opacity-90',
};

const NAME: Record<Provider, string> = {
  google: 'Google',
  apple: 'Apple',
  facebook: 'Facebook',
};

export default function SignInWith({
  onProblem,
}: {
  /** Said in the modal that owns this, beside whatever the form said. */
  readonly onProblem: (message: string) => void;
}): React.ReactElement | null {
  const { t } = useLang();
  const [on, setOn] = useState<Provider[] | null>(null);
  const [going, setGoing] = useState<Provider | null>(null);

  useEffect(() => {
    let live = true;
    void providersOn().then((got) => {
      if (live) setOn(got);
    });
    return () => {
      live = false;
    };
  }, []);

  /* Nothing until the answer lands, and nothing at all where none is on.

     The "or" between these and the email form belongs here rather than in the
     screen above, and this is why: with no provider switched on it stayed
     behind, leaving a dangling OR with an empty gap above it where the buttons
     would have been. A divider is a statement that there are two things, and
     it has to be drawn by whichever of them can disappear. */
  if (!on?.length) return null;

  return (
    <div className="space-y-2">
      {on.map((provider) => (
        <button
          key={provider}
          type="button"
          disabled={going !== null}
          onClick={() => {
            setGoing(provider);
            void signInWith(provider).then((result) => {
              // A success leaves the page, so there is nothing to undo here.
              if (!result.ok) {
                setGoing(null);
                onProblem(result.message);
              }
            });
          }}
          className={`w-full min-h-[44px] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 disabled:opacity-60 ${SKIN[provider]}`}
        >
          {going === provider ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mark provider={provider} />}
          {t('auth.continueWith', 'Continue with')} {NAME[provider]}
        </button>
      ))}
      <div className="flex items-center gap-3 pt-1">
        <span className="h-px flex-1 bg-zinc-800" />
        <span className="text-xs text-zinc-600 uppercase tracking-wider">
          {t('auth.or', 'or')}
        </span>
        <span className="h-px flex-1 bg-zinc-800" />
      </div>
    </div>
  );
}
