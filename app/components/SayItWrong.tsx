'use client';

/**
 * "That word did not come out right."
 *
 * ── Why this is worth a control of its own ───────────────────────────────
 *
 * `sayit.ts` states the problem it cannot solve alone: what belongs in a
 * pronunciation dictionary has to come from LISTENING, and a list invented at
 * a desk is a list of words a model probably says fine. One person's ear
 * found `-tjie`. Every member's ear finds the rest.
 *
 * Carli, 11 September 2026: "Kan ons dalk vir Afrikaanse generators vra om
 * vir ons terugvoer te gee as afrikaanse woorde nie reg uit kom nie? Iets
 * soos: Help ons om suiwer Afrikaans te genereer."
 *
 * ── Shut, and one line when it opens ─────────────────────────────────────
 *
 * A form under every generation is a form nobody fills in — and worse, it
 * reads as the app expecting to be wrong. So it is a single quiet line, and
 * opening it asks two things: the word, and how it should sound. The second
 * is optional, because "this sounded wrong" from somebody who cannot spell
 * the fix is still the most useful thing we could have been told.
 *
 * ── It does not promise a fix ────────────────────────────────────────────
 *
 * Because there is not one yet. A report is a candidate; the rules live in
 * source and enter through a commit somebody read. Saying "fixed" here would
 * be the third time this app told somebody it had done something it had not,
 * and this one would be discovered by them hearing the same mistake again
 * tomorrow.
 */

import React, { useState } from 'react';
import { Ear, Check, Loader2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { accessToken } from '../lib/cloud';

export default function SayItWrong({
  surface,
  spoken = true,
  said = '',
}: {
  /** Which room, so a pattern is visible in the list. */
  readonly surface: string;
  /** Heard, or read on a screen. Filled in here, never asked of the member. */
  readonly spoken?: boolean;
  /** The line it was in, so the word can be seen in context. */
  readonly said?: string;
}): React.ReactElement | null {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [should, setShould] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState('');

  /* Afrikaans only, and that is not a limitation to apologise for.

     The dictionary this feeds is the Afrikaans one, and asking an English
     reader to report Afrikaans pronunciation would collect noise. Somebody
     working in English who hears a bad Afrikaans word is, by definition,
     working in Afrikaans at that moment and can switch. */
  if (lang !== 'af') return null;

  const send = async () => {
    const asked = word.trim();
    if (!asked) {
      setProblem(t('sayit.needWord', 'Watter woord?'));
      return;
    }
    setProblem('');
    setBusy(true);
    try {
      const token = await accessToken();
      const response = await fetch('/api/afrikaans', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ word: asked, should: should.trim(), surface, spoken, said }),
      });
      const answer = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || !answer.ok) {
        setProblem(answer.message ?? t('sayit.failed', 'Dit kon nie gestuur word nie.'));
        return;
      }
      /* Thanked the same whether it was new or a repeat. From where she is
         standing she has told us either way, and "you already said that" is
         a scolding for helping. */
      setSent(true);
      setWord('');
      setShould('');
    } catch {
      setProblem(t('sayit.failed', 'Dit kon nie gestuur word nie.'));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <p className="flex items-start gap-2 text-xs text-emerald-400 leading-relaxed pt-1">
        <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        {t('sayit.thanks', 'Dankie — ons kyk daarna. Dit verander nie dadelik nie; iemand lees dit eers.')}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 min-h-[44px]"
      >
        <Ear className="w-3.5 h-3.5" />
        {t('sayit.open', 'Het ’n woord verkeerd uitgekom?')}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2">
      <p className="text-xs text-zinc-400 leading-relaxed">
        {t(
          'sayit.what',
          'Help ons om suiwer Afrikaans te maak. Sê watter woord verkeerd uitgekom het, en — as jy kan — hoe dit behoort te klink.',
        )}
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <label htmlFor="sayit-word" className="block text-xs text-zinc-500">
            {t('sayit.word', 'Die woord')}
          </label>
          <input
            id="sayit-word"
            value={word}
            onChange={(event) => setWord(event.target.value)}
            placeholder={t('sayit.wordHint', 'voëltjie')}
            className="w-full min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="sayit-should" className="block text-xs text-zinc-500">
            {t('sayit.should', 'Hoe dit moet klink')}
          </label>
          <input
            id="sayit-should"
            value={should}
            onChange={(event) => setShould(event.target.value)}
            placeholder={t('sayit.shouldHint', 'voëlkie — los dit leeg as jy nie seker is nie')}
            className="w-full min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>
      {problem && <p className="text-xs text-amber-400 leading-snug">{problem}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy}
          className="min-h-[44px] px-3.5 py-2 rounded-xl border border-emerald-500/60 bg-emerald-500/10 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60 inline-flex items-center gap-2"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {t('sayit.send', 'Stuur')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[44px] px-3 text-sm text-zinc-500 hover:text-zinc-300"
        >
          {t('sayit.never', 'Los maar')}
        </button>
      </div>
      <p className="text-xs text-zinc-600 leading-relaxed">
        {t(
          'sayit.honest',
          'Dit gaan na ’n lys wat iemand lees. Niks verander vanself aan hoe die stem praat nie — dit is met opset so.',
        )}
      </p>
    </div>
  );
}
