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
import { Ear, Check, Loader2, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { accessToken } from '../lib/cloud';

export default function SayItWrong({
  surface,
  spoken = true,
  said = '',
  alwaysShow = false,
  variant = 'inline',
  buttonLabel,
}: {
  /** Which room, so a pattern is visible in the list. */
  readonly surface: string;
  /** Heard, or read on a screen. Filled in here, never asked of the member. */
  readonly spoken?: boolean;
  /** The line it was in, so the word can be seen in context. */
  readonly said?: string;
  /**
   * If true, shows in both English and Afrikaans mode.
   * Carli, 12 October 2026: Afrikaans speakers often prefer the English UI
   * but prompt Afrikaans songs, and need to be able to report pronunciation.
   */
  readonly alwaysShow?: boolean;
  /**
   * 'inline' keeps the quiet inline expander for voice/podcast rooms.
   * 'button' renders a studio action button that opens a feedback modal.
   */
  readonly variant?: 'inline' | 'button';
  /** Custom trigger button label override if desired. */
  readonly buttonLabel?: string;
}): React.ReactElement | null {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  /* The form paints over the whole app, so Back closes it first. */
  useBackLayer(open, () => setOpen(false));
  const [word, setWord] = useState('');
  const [heard, setHeard] = useState('');
  const [should, setShould] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState('');

  /* Carli, 12 October 2026: "want onthou afrikaans-sprekendes verkies ook
     somtyds die engelse blad maar prompt nogsteeds afrikaanse liedjies".
     If alwaysShow is true, we allow English readers to report Afrikaans
     pronunciation errors without forcing them to change the whole app language. */
  if (lang !== 'af' && !alwaysShow) return null;

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
        body: JSON.stringify({
          word: asked,
          heard: heard.trim(),
          should: should.trim(),
          surface,
          spoken,
          said,
        }),
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
      setHeard('');
      setShould('');
    } catch {
      setProblem(t('sayit.failed', 'Dit kon nie gestuur word nie.'));
    } finally {
      setBusy(false);
    }
  };

  /* ── Modal Variant (used in Music Studio action bar) ────────────── */
  if (variant === 'button') {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setProblem('');
            setOpen(true);
          }}
          title={t('sayit.improveAfrikaansTitle', 'Help us improve Afrikaans pronunciation')}
          className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
        >
          <Ear className="w-3.5 h-3.5 text-emerald-400" />
          {buttonLabel ?? t('sayit.improveAfrikaans', 'Verbeter Afrikaans')}
        </button>

        {open && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sayit-dialog-title"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in"
          >
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Ear className="w-5 h-5 flex-shrink-0" />
                  <h3 id="sayit-dialog-title" className="text-base font-bold text-white">
                    {t('sayit.improveTitle', 'Improve Afrikaans pronunciation')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setSent(false);
                  }}
                  aria-label={t('sayit.improveClose', 'Close')}
                  className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {sent ? (
                <div className="space-y-4 py-2">
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <Check className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">
                        {t('sayit.thanksTitle', 'Thank you for helping')}
                      </p>
                      <p className="text-xs text-emerald-200 leading-relaxed">
                        {t('sayit.thanks', 'Dankie — ons kyk daarna. Dit verander nie dadelik nie; iemand lees dit eers.')}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSent(false);
                        setOpen(false);
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
                    >
                      {t('sayit.improveClose', 'Close')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <p className="text-sm text-zinc-200 leading-relaxed font-medium">
                      {t(
                        'sayit.improvePrompt',
                        'We need help to improve Afrikaans pronunciation. Does something sound off or unnatural? Let us know!',
                      )}
                    </p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {t(
                        'sayit.improveSub',
                        'Tell us which word came out wrong, how it sounded, and — if you can — how it should sound.',
                      )}
                    </p>
                  </div>

                  {said && (
                    <div className="rounded-lg bg-zinc-950/80 border border-zinc-800 px-3 py-2 text-xs text-zinc-400">
                      <span className="text-zinc-500">{t('sayit.context', 'Song / Context')}: </span>
                      <span className="text-zinc-200 font-medium">{said}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="sayit-word" className="block text-xs font-medium text-zinc-300">
                        {t('sayit.word', 'The word')}
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
                      <label htmlFor="sayit-heard" className="block text-xs font-medium text-zinc-300">
                        {t('sayit.heard', 'How it sounded')}
                      </label>
                      <input
                        id="sayit-heard"
                        value={heard}
                        onChange={(event) => setHeard(event.target.value)}
                        placeholder={t('sayit.heardHint', 'foeltsjie')}
                        className="w-full min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="sayit-should" className="block text-xs font-medium text-zinc-300">
                        {t('sayit.should', 'How it should sound, spelled as it is said')}
                      </label>
                      <input
                        id="sayit-should"
                        value={should}
                        onChange={(event) => setShould(event.target.value)}
                        placeholder={t('sayit.shouldHint', 'voëlkie — leave it empty if you are not sure')}
                        className="w-full min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {problem && <p className="text-xs text-amber-400 leading-snug">{problem}</p>}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void send()}
                        disabled={busy}
                        className="min-h-[44px] px-4 py-2 rounded-xl border border-emerald-500/60 bg-emerald-500/20 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-60 inline-flex items-center gap-2"
                      >
                        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {t('sayit.send', 'Send')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="min-h-[44px] px-3 text-sm text-zinc-400 hover:text-zinc-200"
                      >
                        {t('sayit.never', 'Leave it')}
                      </button>
                    </div>

                    <a
                      href="/uitspraak"
                      className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
                    >
                      <Ear className="h-3.5 w-3.5" />
                      {t('sayit.booth', 'Or say the word yourself in the pronunciation booth')}
                    </a>
                  </div>

                  <p className="text-xs text-zinc-500 leading-relaxed pt-1 border-t border-zinc-800/80">
                    {t(
                      'sayit.honest',
                      'This goes to a list somebody reads. Nothing changes how the voice speaks on its own — that is deliberate.',
                    )}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  /* ── Inline Expander Variant (used in Voice Studio / Podcast) ─────── */
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
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="sayit-word" className="block text-xs text-zinc-500">
            {t('sayit.word', 'The word')}
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
          <label htmlFor="sayit-heard" className="block text-xs text-zinc-500">
            {t('sayit.heard', 'How it sounded')}
          </label>
          <input
            id="sayit-heard"
            value={heard}
            onChange={(event) => setHeard(event.target.value)}
            placeholder={t('sayit.heardHint', 'foeltsjie')}
            className="w-full min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="sayit-should" className="block text-xs text-zinc-500">
            {t('sayit.should', 'How it should sound, spelled as it is said')}
          </label>
          <input
            id="sayit-should"
            value={should}
            onChange={(event) => setShould(event.target.value)}
            placeholder={t('sayit.shouldHint', 'voëlkie — leave it empty if you are not sure')}
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
          {t('sayit.send', 'Send')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[44px] px-3 text-sm text-zinc-500 hover:text-zinc-300"
        >
          {t('sayit.never', 'Leave it')}
        </button>
      </div>
      <p className="text-xs text-zinc-600 leading-relaxed">
        {t(
          'sayit.honest',
          'This goes to a list somebody reads. Nothing changes how the voice speaks on its own — that is deliberate.',
        )}
      </p>

      <a
        href="/uitspraak"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
      >
        <Ear className="h-3.5 w-3.5" />
        {t('sayit.booth', 'Or say the word yourself in the pronunciation booth')}
      </a>
    </div>
  );
}
