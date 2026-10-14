'use client';

/**
 * Signing a grown-up in, at the kids room's own door.
 *
 * Carli, 14 October 2026: *"Die kids room het 'n flaw, ek kry nie daar in
 * gelog nie. Dit voel of dit sy eie log in moet hê."*
 *
 * The kids room is reached from the welcome page — the page somebody sees
 * BEFORE they are signed in — and it said "go back to the studio, sign in,
 * and come back". Back to the studio was back to that same welcome page,
 * with no sign-in on it that led here again: a circle. So the parents' door
 * signs in itself, with the same account and the same two ways the studio
 * offers — a password, or Google / Apple / Facebook, which come back to this
 * page rather than to the studio.
 *
 * Signing in only. Making a new account asks for the terms to be agreed and
 * belongs on the welcome page, which is one link away.
 */

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { answerAuthenticator, authenticatorWanted, signIn } from '../lib/cloud';
import SignInWith from './SignInWith';

const FIELD = 'w-full min-h-[48px] rounded-2xl border-2 border-amber-300/70 bg-surface-50 px-3.5 text-sm text-surface-900 placeholder:text-surface-500';

export default function KidsSignIn({ onIn }: { readonly onIn: () => void }): React.ReactElement {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const go = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem('');
    try {
      if (needsCode) {
        const answered = await answerAuthenticator(code.trim());
        if (!answered.ok) { setProblem(answered.message); return; }
        onIn();
        return;
      }
      const done = await signIn(email.trim(), password);
      if (!done.ok) { setProblem(done.message); return; }
      /* An account with an authenticator has a session that still owes a
         code — the same step the studio's own sign-in asks for. */
      if (await authenticatorWanted()) { setNeedsCode(true); return; }
      onIn();
    } catch {
      setProblem(t('kids.signInFailed', 'That did not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3" data-kidssigninform>
      <form onSubmit={(event) => void go(event)} className="space-y-2">
        {needsCode ? (
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={t('kids.signInCode', 'The six numbers from your authenticator')}
            aria-label={t('kids.signInCode', 'The six numbers from your authenticator')}
            data-kidssignincode
            className={FIELD}
          />
        ) : (
          <>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('kids.signInEmail', 'Your email')}
              aria-label={t('kids.signInEmail', 'Your email')}
              data-kidssigninemail
              className={FIELD}
            />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('kids.signInPassword', 'Your password')}
              aria-label={t('kids.signInPassword', 'Your password')}
              data-kidssigninpassword
              className={FIELD}
            />
          </>
        )}
        <button
          type="submit"
          disabled={busy || (needsCode ? code.trim().length < 6 : !email.trim() || !password)}
          data-kidssigningo
          className="fb-kids-bouncy inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-amber-300 bg-amber-400 px-5 text-sm font-black text-onAccent disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('kids.signInGo', 'Sign in')}
        </button>
      </form>
      {!needsCode && <SignInWith onProblem={setProblem} />}
      {problem && <p className="text-sm text-rose-700" role="alert" data-kidssigninproblem>{problem}</p>}
      <p className="text-xs text-surface-700">
        {t('kids.signInNew', 'No account yet?')}{' '}
        <a href="/" className="font-bold underline underline-offset-2">{t('kids.signInMake', 'Make one on the welcome page')}</a>
      </p>
    </div>
  );
}
