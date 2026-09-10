'use client';

/**
 * One music question, at the bottom of the creative page.
 *
 * ── What she asked for, 10 September 2026 ────────────────────────────────
 *
 * "ek wil hê jy moet heel onder aan die creative page 'n music quiz op sit
 *  wat music knowledge leer. dit moet abcd tick boxes hê en dan kom die
 *  antwoord aan die einde uit."
 *
 * So: A B C D, tick one, and the answer comes out at the end. A new question
 * every time somebody comes back, which is the "everytime someone logs in"
 * half of the first version of the ask.
 *
 * ── Three decisions worth writing down ───────────────────────────────────
 *
 * **The explanation is the feature, not the mark.** A quiz that answers
 * "right" or "wrong" teaches nobody anything: somebody who guessed correctly
 * has learnt exactly as much as somebody who guessed wrong. So the reveal
 * leads with what the answer MEANS and what to do with it on a screen in this
 * app. The tick is only there to make somebody commit before they read, which
 * is the single reason a quiz beats a list of facts.
 *
 * **You must tick before you can see.** The reveal button is dead until an
 * answer is chosen. Not to be strict — because reading the answer without
 * having guessed is the version that teaches nothing, and a button that is
 * available is a button that gets pressed.
 *
 * **Nothing is scored and nothing is sent anywhere.** No streak, no total, no
 * row in a database. This is at the bottom of a page somebody came to in
 * order to make music; a score would turn a thirty-second aside into a thing
 * they are failing at. Which question they have seen lives in this browser
 * and nowhere else.
 *
 * ── Why the question does not change on every render ─────────────────────
 *
 * It is chosen once, in an effect, after mount — never during render. Picking
 * during render would give a different question on the server and in the
 * browser, which React reports as a hydration mismatch, and it would also
 * change the question every time the parent re-rendered for any unrelated
 * reason. Somebody halfway through reading an answer would lose it.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { GraduationCap, Check, X } from 'lucide-react';
import { QUIZ, type QuizQuestion } from '../data/musicquiz';
import { useLang } from '../lib/i18n';

/** Which questions this browser has already been shown. */
const SEEN_KEY = 'futurebox.quiz.seen.v1';
const LETTERS = ['A', 'B', 'C', 'D'] as const;

function readSeen(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const said = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(said) ? said.filter((one): one is string => typeof one === 'string') : [];
  } catch {
    /* A private window, cleared data, or storage refused outright. An empty
       list is the right answer to all three: it means every question is new,
       which is exactly true for a browser that remembers nothing. */
    return [];
  }
}

/**
 * A question they have not had yet.
 *
 * When they have seen all thirty the list starts over rather than the card
 * disappearing — somebody who has worked through the whole bank is the last
 * person to take it away from.
 */
function pick(): { question: QuizQuestion; seen: string[] } {
  const seen = readSeen();
  const fresh = QUIZ.filter((one) => !seen.includes(one.id));
  const from = fresh.length > 0 ? fresh : QUIZ;
  const question = from[Math.floor(Math.random() * from.length)];
  return { question, seen: fresh.length > 0 ? seen : [] };
}

export default function MusicQuiz(): React.ReactElement | null {
  const { lang, t } = useLang();
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [ticked, setTicked] = useState<number | null>(null);
  const [shown, setShown] = useState(false);

  const next = useCallback((): void => {
    const { question: one, seen } = pick();
    try {
      window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, one.id]));
    } catch {
      /* Storage refused. The question still shows; it may simply come round
         again sooner, which is a worse day than intended and not a broken one. */
    }
    setQuestion(one);
    setTicked(null);
    setShown(false);
  }, []);

  useEffect(() => {
    next();
  }, [next]);

  /* Nothing at all until the question is chosen. Rendering a skeleton here
     would push the page down and then move it, at the very bottom, which is
     the one place a layout shift is pure annoyance. */
  if (!question) return null;

  const say = (pair: { en: string; af: string }): string => (lang === 'af' ? pair.af : pair.en);
  const right = question.answer;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5 space-y-4">
      <div className="flex items-start gap-3">
        <GraduationCap className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-base font-extrabold tracking-tight text-white">
            {t('quiz.title', 'One thing about music')}
          </h3>
          <p className="text-sm text-zinc-500 leading-snug">
            {t('quiz.sub', 'A new question every time you come back. Nothing is scored.')}
          </p>
        </div>
      </div>

      <p className="text-sm sm:text-base text-zinc-100 font-semibold leading-snug">{say(question.ask)}</p>

      {/* A radiogroup, because the children say `role="radio"` and a radio
          outside one is a radio a screen reader cannot count — "selected"
          with no "of four". The label is the question itself. */}
      <div className="space-y-2" role="radiogroup" aria-label={say(question.ask)}>
        {question.options.map((option, index) => {
          const chosen = ticked === index;
          const isRight = index === right;
          /* Colour only after the reveal. Before it, a chosen box is simply
             chosen: tinting it green or red on the tick would answer the
             question with the tick and there would be nothing left to reveal. */
          const after = shown
            ? isRight
              ? 'border-emerald-500 bg-emerald-500/10'
              : chosen
                ? 'border-red-500/60 bg-red-500/10'
                : 'border-zinc-800 bg-zinc-950/60 opacity-60'
            : chosen
              ? 'border-cyan-500 bg-cyan-500/10'
              : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-600';
          return (
            <button
              key={option.en}
              type="button"
              /* One answer, so these behave as radios rather than checkboxes
                 whatever they look like — and the reading software is told so,
                 because a control that says "checkbox" and clears the last one
                 is a control that lies to somebody who cannot see it. */
              role="radio"
              aria-checked={chosen}
              disabled={shown}
              onClick={() => setTicked(index)}
              className={`w-full min-h-11 text-left px-3 py-2.5 rounded-xl border transition-all flex items-start gap-3 ${after}`}
            >
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-md border grid place-items-center text-xs font-bold ${
                  shown && isRight
                    ? 'border-emerald-400 text-emerald-300'
                    : chosen
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-zinc-700 text-zinc-500'
                }`}
              >
                {shown && isRight ? (
                  <Check className="w-3.5 h-3.5" />
                ) : shown && chosen ? (
                  <X className="w-3.5 h-3.5" />
                ) : (
                  LETTERS[index]
                )}
              </span>
              <span className="text-sm text-zinc-200 leading-snug pt-0.5">{say(option)}</span>
            </button>
          );
        })}
      </div>

      {!shown ? (
        <button
          type="button"
          disabled={ticked === null}
          onClick={() => setShown(true)}
          className="w-full min-h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-500/25 transition-colors px-4"
        >
          {ticked === null
            ? t('quiz.tickFirst', 'Tick an answer first')
            : t('quiz.reveal', 'Show me the answer')}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-3.5 py-3 space-y-1.5">
            <p className="text-sm font-bold text-emerald-300">
              {ticked === right ? t('quiz.got', 'That is it.') : t('quiz.missed', 'Not that one.')}
              {' '}
              {LETTERS[right]}. {say(question.options[right])}
            </p>
            {/* The reason this card exists. A mark teaches nobody anything. */}
            <p className="text-sm text-zinc-300 leading-snug">{say(question.why)}</p>
          </div>
          <button
            type="button"
            onClick={next}
            className="w-full min-h-11 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 font-semibold text-sm hover:border-zinc-500 transition-colors px-4"
          >
            {t('quiz.another', 'Another question')}
          </button>
        </div>
      )}
    </section>
  );
}
