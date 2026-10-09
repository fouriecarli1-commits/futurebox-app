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
  /** The address a two-step page handed back, kept so it can be a button. */
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);

  /**
   * Ask one of the owner-only Google pages, with her token on the request.
   *
   * ── Why every one of them has to come through here ───────────────────
   *
   * Carli, 9 October 2026, sent a screenshot of
   * `www.futurebox.studio/api/google/wordtest` answering `no`. She had
   * typed the address, because that is what I told her to do.
   *
   * It cannot work and never could. `callerFrom` identifies a person by an
   * `Authorization: Bearer` header and nothing else — a browser opening a
   * URL sends no such header, so the owner check fails, no secret matches,
   * and the gate answers its deliberate 404 of "no". The instruction was
   * impossible, not the deploy broken.
   *
   * This page has carried her token since 8 October for exactly that
   * reason. So the rule is: a new owner-only route gets a button HERE, and
   * never an address to type.
   */
  const ask = useCallback(async (path: string) => {
    setBusy(true);
    setSaid('');
    try {
      const token = await accessToken();
      if (!token) {
        setSaid('Not signed in. Sign in on the main site first, then come back.');
        return;
      }
      const answer = await fetch(path, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await answer.text();
      /* The raw text when it is not JSON, because a 404 of "no" is itself the
         answer — it means this account is not an owner, and a page that
         swallowed it would leave her pressing a button that does nothing. */
      try {
        const said = JSON.parse(body) as { pressNext?: unknown };
        setSaid(JSON.stringify(said, null, 2));
        /* ── The follow-up, as a button rather than an address ────────

           `videotest` starts a clip and hands back `pressNext`, which is
           the same address with the job's name on it. Printing that for
           her to type is the fault this whole page exists to fix: she
           cannot type it, because typing an address sends no token.

           So it is kept and drawn as a button. Any owner-only route that
           answers with `pressNext` gets this for nothing. */
        const next = typeof said.pressNext === 'string' ? said.pressNext : '';
        setNext(next ? next.replace(/^https?:\/\/[^/]+/, '') : '');
      } catch {
        setSaid(`${answer.status}: ${body}`);
        setNext('');
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
      {/* ── Say what it does NOW ────────────────────────────────────────
 
          This read "asks each candidate model whether it answers, with an
          empty request it has to refuse", which is what the probe did until
          8 October 2026 and is exactly the method that turned out to be
          measuring the request rather than the project — see the long note
          in `lib/server/google.ts`. The probe was rewritten and the sentence
          describing it was not, which is its own small version of the same
          fault: a page that says one thing and does another. */}
      <p className="text-sm leading-relaxed text-zinc-400">
        Asks Google for its own list of the models this project can see, and
        reads each candidate model as a thing rather than poking it. No
        request body goes out, so nothing can be generated and nothing is
        billed. Sign in on the main site first — this uses that, not a
        password.
      </p>
      <button
        type="button"
        data-googleask
        onClick={() => void ask('/api/google/setup')}
        disabled={busy}
        className="min-h-[48px] rounded-xl bg-emerald-500 px-4 font-bold text-black disabled:opacity-50"
      >
        {busy ? 'Asking Google…' : 'Ask'}
      </button>

      {/* ── The two that spend, kept apart from the one that does not ──

          Everything above this line generates nothing and is billed nothing.
          Everything below makes one real thing on her own Google account, so
          each says what it costs on the button and each refuses to spend
          without `go=yes`, which these pass deliberately: she has already
          pressed a button that says the price, and making her then edit an
          address would be the network tab all over again. */}
      <h2 className="pt-4 text-sm font-bold uppercase tracking-[0.12em] text-zinc-400">
        These two spend money
      </h2>

      <p className="text-sm leading-relaxed text-zinc-400">
        <strong className="text-zinc-200">Which text is the lyrics.</strong>{' '}
        Lyria sends the words it wrote beside every song, and a description,
        and nothing says which is which — only their order does. This makes
        one short Afrikaans song and prints both, numbered. Tell me which row
        number holds the sung words and the automatic lyric video can be
        built. It also answers, in the same press, whether a song asked for
        in Afrikaans comes back in Afrikaans.
      </p>
      <button
        type="button"
        data-googlewords
        onClick={() => void ask('/api/google/wordtest?go=yes')}
        disabled={busy}
        className="min-h-[48px] rounded-xl border border-amber-500/60 px-4 font-bold text-amber-200 disabled:opacity-50"
      >
        {busy ? 'Making a song…' : 'Make one song · about R1.28'}
      </button>

      <p className="text-sm leading-relaxed text-zinc-400">
        <strong className="text-zinc-200">Does the premium rung need a bucket.</strong>{' '}
        Answered already for the cheap rung on 9 October 2026 — the bytes came
        back, no bucket needed. The top grade runs a different model and that
        one is still an inference rather than a measurement. Only press this
        if that is worth settling.
      </p>
      <button
        type="button"
        data-googlebucket
        onClick={() => void ask('/api/google/videotest?go=yes&rung=premium')}
        disabled={busy}
        className="min-h-[48px] rounded-xl border border-amber-500/60 px-4 font-bold text-amber-200 disabled:opacity-50"
      >
        {busy ? 'Making a clip…' : 'Make one clip · about R26'}
      </button>
      {next && (
        <button
          type="button"
          data-googlenext
          onClick={() => void ask(next)}
          disabled={busy}
          className="min-h-[48px] rounded-xl border border-emerald-500/60 px-4 font-bold text-emerald-200 disabled:opacity-50"
        >
          {busy ? 'Asking…' : 'Ask again · free'}
        </button>
      )}
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
