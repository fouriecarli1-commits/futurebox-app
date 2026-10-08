'use client';

/**
 * What Google's project actually has, behind her own sign-in.
 *
 * ── Why this page exists ─────────────────────────────────────────────────
 *
 * Carli, 8 October 2026: *"maar dan gaan ek nou weer 'n password weggee wat
 * ek weer gaan moet verander."*
 *
 * She was right. An hour earlier her Google API key had to be rotated
 * because it had been typed into a query string, and the next instruction
 * was to type a DIFFERENT secret into a query string. A secret in a URL is a
 * secret in the browser history, in the access log and in any screenshot of
 * the address bar. Asking her to do it again was asking her to burn a second
 * one.
 *
 * So: no secret. She is already signed in, the app already knows she runs
 * the place, and the token goes in a header where nothing logs it. One
 * button.
 *
 * The secret still works on the route for anything that is not a person — a
 * terminal, a script. This is the door for the person.
 *
 * ── Why it is a page rather than a bench in a room ───────────────────────
 *
 * Nobody but her will ever open it, and it exists to answer one question
 * once: which of the eight candidate model ids actually respond on this
 * project. A screen that belongs in the app is a screen that has to be
 * designed, placed and explained to members who will never need it.
 */

import React, { useCallback, useState } from 'react';
import { accessToken } from '../lib/cloud';

export default function GoogleSetup(): React.ReactElement {
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = useCallback(async () => {
    setBusy(true);
    setSaid('');
    try {
      const token = await accessToken();
      if (!token) {
        setSaid('Not signed in. Sign in on the main site first, then come back.');
        return;
      }
      const answer = await fetch('/api/google/setup', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await answer.text();
      /* The raw text when it is not JSON, because a 404 of "no" is itself the
         answer — it means this account is not an owner, and a page that
         swallowed it would leave her pressing a button that does nothing. */
      try {
        setSaid(JSON.stringify(JSON.parse(body), null, 2));
      } catch {
        setSaid(`${answer.status}: ${body}`);
      }
    } catch (why) {
      setSaid(`Could not ask: ${String(why)}`);
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-xl font-bold">Google: what is actually there</h1>
      <p className="text-sm leading-relaxed text-zinc-400">
        Asks each candidate model whether it answers, with an empty request it
        has to refuse. Nothing is generated and nothing is billed. Sign in on
        the main site first — this uses that, not a password.
      </p>
      <button
        type="button"
        data-googleask
        onClick={() => void ask()}
        disabled={busy}
        className="min-h-[48px] rounded-xl bg-emerald-500 px-4 font-bold text-black disabled:opacity-50"
      >
        {busy ? 'Asking Google…' : 'Ask'}
      </button>
      {said && (
        <pre
          data-googlesaid
          className="whitespace-pre-wrap break-all rounded-xl bg-zinc-900 p-4 text-xs text-zinc-200"
        >
          {said}
        </pre>
      )}
    </main>
  );
}
