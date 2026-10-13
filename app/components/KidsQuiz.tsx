'use client';

/**
 * Mega Quizzes: would-you-rather for a giggle, and four skills for an ear
 * and an eye. Everything asked is in `lib/kidsquiz.ts`; the two-note
 * questions play the browser's own oscillator and nothing is sent anywhere.
 */
import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { soundContext } from '../lib/kidsbeat';
import { RATHER_PAINT, SKILLS, TEACH, WOULD_YOU_RATHER, type Skill, type Both } from '../lib/kidsquiz';
import { confetti } from '../lib/kidsconfetti';

type Mode = 'rather' | Skill;

/** Two notes in a row, a third of a second each, on a soft triangle. */
function playNotes(notes: readonly [number, number]): void {
  const room = soundContext();
  if (!room) return;
  notes.forEach((hz, index) => {
    const osc = room.createOscillator();
    const gain = room.createGain();
    osc.type = 'triangle';
    osc.frequency.value = hz;
    const at = room.currentTime + index * 0.45;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
    osc.connect(gain).connect(room.destination);
    osc.start(at);
    osc.stop(at + 0.4);
  });
}

export default function KidsQuiz({ onSpark }: { readonly onSpark: (n: number) => void }): React.ReactElement {
  const { lang, t } = useLang();
  const say = (both: Both): string => (lang === 'af' ? both[1] : both[0]);
  const [mode, setMode] = useState<Mode>('rather');
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answered, setAnswered] = useState(0);
  const [right, setRight] = useState(0);

  const questions = mode === 'rather' ? [] : TEACH.filter((one) => one.skill === mode);
  const rather = WOULD_YOU_RATHER[at % WOULD_YOU_RATHER.length];
  const teach = questions.length ? questions[at % questions.length] : null;

  const choose = (which: number): void => {
    if (picked !== null) return;
    setPicked(which);
    setAnswered((n) => n + 1);
    if (mode === 'rather') { onSpark(2); return; }
    if (teach && which === teach.right) { setRight((n) => n + 1); onSpark(5); confetti(40); } else { onSpark(1); }
  };

  const next = (): void => { setAt((n) => n + 1); setPicked(null); };
  const go = (next: Mode): void => { setMode(next); setAt(0); setPicked(null); };

  return (
    <div className="space-y-4 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/85 p-4 shadow-lg backdrop-blur-sm sm:p-5" data-kidsquiz>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="fb-kids-bubble flex items-center gap-2 text-xl font-bold text-surface-900 sm:text-2xl">
          <span aria-hidden>🧠</span> {t('kids.quizTitle', 'Mega Quizzes')}
        </h2>
        <span className="text-xs font-bold text-surface-700" data-kidsquizscore={`${right}/${answered}`}>
          {mode === 'rather'
            ? `${answered} ${t('kids.quizAnswered', 'answered')}`
            : `${right} / ${answered} ${t('kids.quizRight', 'right')}`}
        </span>
      </div>

      <div className="flex flex-wrap gap-2" data-kidsquizmodes>
        <button type="button" aria-pressed={mode === 'rather'} onClick={() => go('rather')} data-kidsquizmode="rather"
          className={`flex min-h-[44px] items-center gap-2 rounded-2xl px-4 text-sm font-black ${mode === 'rather' ? 'bg-cyan-400 text-onAccent shadow-md' : 'bg-surface-200/80 text-surface-800'}`}>
          <span aria-hidden>🤔</span> {t('kids.quizRather', 'Would you rather?')}
        </button>
        {SKILLS.map((one) => (
          <button key={one.id} type="button" aria-pressed={mode === one.id} onClick={() => go(one.id)} data-kidsquizmode={one.id}
            className={`flex min-h-[44px] items-center gap-2 rounded-2xl px-4 text-sm font-black ${mode === one.id ? 'bg-cyan-400 text-onAccent shadow-md' : 'bg-surface-200/80 text-surface-800'}`}>
            <span aria-hidden>{one.icon}</span> {say(one.says)}
          </button>
        ))}
      </div>

      {mode === 'rather' ? (
        <div className="space-y-3" data-kidsrather>
          <p className="fb-kids-bubble text-center text-xl text-surface-900">{t('kids.quizRather', 'Would you rather?')}</p>
          {/* Google's page: two tall cards, one green and one cyan, a big
              picture on each and the words under it. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[rather.a, rather.b].map((side, which) => (
              <button key={which} type="button" onClick={() => choose(which)} data-kidsratherpick={which}
                style={{ background: picked === which ? undefined : RATHER_PAINT[which] }}
                className={`fb-kids-bouncy flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-3xl border-4 border-white/80 px-4 py-5 text-base font-black leading-snug text-onAccent shadow-[0_6px_20px_rgba(0,0,0,0.6)] ${
                  picked === which ? 'bg-amber-300 ring-4 ring-amber-200' : ''
                }`}>
                <span className="text-6xl drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" aria-hidden>{rather.icons[which]}</span>
                <span className="text-center">{say(side)}</span>
              </button>
            ))}
          </div>
          {picked !== null && (
            <button type="button" onClick={next} data-kidsquiznext
              className="fb-kids-bouncy mx-auto flex min-h-[48px] items-center justify-center rounded-2xl bg-cyan-400 px-6 text-sm font-black text-onAccent">
              {t('kids.quizNext', 'Next one!')}
            </button>
          )}
        </div>
      ) : teach && (
        <div className="space-y-3" data-kidsteach={teach.skill}>
          <p className="fb-kids-bubble text-center text-xl text-surface-900">{say(teach.ask)}</p>
          {teach.notes && (
            <button type="button" onClick={() => playNotes(teach.notes!)} data-kidsquizplay
              className="fb-kids-bouncy mx-auto flex min-h-[48px] items-center gap-2 rounded-2xl bg-amber-300 px-5 text-sm font-black text-onAccent">
              <Volume2 className="h-4 w-4" /> {t('kids.quizListen', 'Play the two notes')}
            </button>
          )}
          <div className="grid grid-cols-1 gap-3">
            {teach.choices.map((side, which) => {
              const shown = picked !== null;
              const tone = !shown
                ? 'border-cyan-400/60 bg-surface-100 text-surface-900'
                : which === teach.right
                  ? 'border-cyan-300 bg-cyan-300 text-onAccent'
                  : picked === which
                    ? 'border-rose-300 bg-rose-300/80 text-onAccent'
                    : 'border-surface-200 bg-surface-100/60 text-surface-700';
              return (
                <button key={which} type="button" onClick={() => choose(which)} data-kidsteachpick={which}
                  className={`fb-kids-bouncy flex min-h-[72px] items-center gap-3 rounded-3xl border-4 px-4 py-3 text-left text-base font-black leading-snug ${tone}`}>
                  {teach.icons?.[which] && <span className="text-3xl" aria-hidden>{teach.icons[which]}</span>}
                  <span>{say(side)}</span>
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <>
              <p className="rounded-2xl border-2 border-surface-200 bg-surface-100/80 px-4 py-3 text-sm font-semibold text-surface-900" data-kidsquizwhy>
                {picked === teach.right ? '✅ ' : '💡 '}{say(teach.why)}
              </p>
              <button type="button" onClick={next} data-kidsquiznext
                className="fb-kids-bouncy mx-auto flex min-h-[48px] items-center justify-center rounded-2xl bg-cyan-400 px-6 text-sm font-black text-onAccent">
                {t('kids.quizNext', 'Next one!')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
