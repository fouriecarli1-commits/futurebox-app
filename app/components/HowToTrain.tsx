'use client';

/**
 * What makes a voice model good, written here rather than linked elsewhere.
 *
 * ── What this replaced, and why ──────────────────────────────────────────
 *
 * A link to Kits' own tutorial video sat in the three places where somebody is
 * about to clone a voice. Carli, 9 September 2026: "Ek dink vir nou moet ons
 * die kits video uithaal wat verduidelik hoe 'n stem geleer word. ek dink ons
 * moet eerder die verduideliking skryf."
 *
 * She is right, and for more reasons than the obvious one.
 *
 * A video is two years old, in English, on a service whose interface has moved
 * since — and it is nine minutes to learn four things. It also sends somebody
 * out of this app at the exact moment they were about to do something in it,
 * which is where people stop.
 *
 * The four things fit on a card. So they are on one, in both languages, beside
 * the step they are about.
 *
 * ── Why it does not promise the app will do it ───────────────────────────
 *
 * Training happens at kits.ai. This app can sing in a model that exists; it
 * cannot yet make one — `canCreateVoices` in `lib/server/kits.ts` is a question
 * still waiting on an answer from their API. So this is advice for the
 * recordings somebody takes *before* they go there, and it says where they go.
 *
 * Writing "tick these and we will clean it up" would be the easy version and
 * would be a lie until the cleaning is wired to the takes. When it is, the
 * boxes belong here.
 */

import React from 'react';
import { CheckCircle2, GraduationCap } from 'lucide-react';
import { useLang } from '../lib/i18n';

/** Kits' own page, for the step this app cannot do yet. */
export const KITS = 'https://www.kits.ai/';

export default function HowToTrain({
  className = '',
}: {
  readonly className?: string;
}): React.ReactElement {
  const { t } = useLang();

  const points = [
    t('train.clean', 'Record somewhere quiet. No music behind you, no traffic, no fan — a model learns whatever is in the file, and a hiss it learned is a hiss in every song you make with it afterwards.'),
    t('train.mic', 'Use the best microphone you can reach. A cheap one held close beats a good one across the room, and a phone held a hand’s width away, indoors, is already decent.'),
    t('train.many', 'Give it four to six takes, not one long one. Different lines, different feelings — loud and soft, high and low, fast and slow.'),
    t('train.words', 'Say the sounds you actually sing. If you sing in Afrikaans, record Afrikaans: a model trained only on English has never heard a rolled r or a "g", and it will guess at them.'),
  ];

  return (
    <div className={`rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.06] p-4 ${className}`}>
      <p className="flex items-center gap-2 text-sm font-bold text-emerald-300">
        <GraduationCap className="h-4 w-4 flex-shrink-0" />
        {t('train.title', 'What makes a good voice')}
      </p>
      <ul className="mt-2.5 space-y-2">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
            <span className="text-xs leading-relaxed text-zinc-300">{point}</span>
          </li>
        ))}
      </ul>
      {/* Where the training itself happens, said plainly rather than left for
          somebody to discover after they have recorded six takes. */}
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
        {t('train.where', 'The training itself happens at kits.ai — this app sings in a voice that already exists. Take your recordings there, then bring the model’s number back here.')}{' '}
        <a
          href={KITS}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-emerald-400 underline decoration-emerald-500/40 underline-offset-2 hover:text-emerald-300"
        >
          kits.ai
        </a>
      </p>
    </div>
  );
}
