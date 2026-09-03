'use client';

/**
 * What this is about to cost, said before it is pressed.
 *
 * The complaint that produced this was not about any one screen. It was that
 * nothing in these apps is explained and everything has to be guessed — you
 * press a button, money leaves, and the first honest number you see is the one
 * telling you that you are short.
 *
 * So there is one component and every button that spends uses it, because a
 * price that is phrased three different ways on three screens reads as three
 * different systems. It says one of four things:
 *
 *   12 credits                          a fixed price
 *   4 credits a minute                  a price that depends on length, not yet known
 *   4 a minute — about 16 for this one  the same, once there is a file to measure
 *   30 credits · takes a few minutes    a price and a warning about the wait
 *   Costs nothing                       a price of zero, said rather than left out
 *
 * ## Why zero is worth saying
 *
 * Seven rooms show no counter because nothing in them spends: the Booth, the
 * lanes, the hook cutter, the channel, the live room, the collab room and the
 * theme studio. Silence is the right answer in four of them — nobody wonders
 * what a playlist costs. It is the wrong answer in the three that hand you a
 * finished thing, because a room that produces something and says nothing about
 * money is ambiguous in the worst direction: somebody records four takes
 * wondering whether each one cost them, and stops at four.
 *
 * So a price of zero renders as words rather than as "0 credits", which reads
 * like a bug, and rather than as nothing at all, which reads like a secret.
 *
 * ## The wait matters as much as the price
 *
 * A song comes back in seconds. A video takes minutes, a dub takes minutes, a
 * trained sound takes ten. Somebody who is not told that presses the button
 * again — and the second press is not free. Saying it costs nothing and saves
 * the double charge.
 *
 * ## About means about
 *
 * A per-minute price is rounded up to the minute, so "about 16" is a ceiling
 * rather than a guess, and the real charge can only be that or less. The word
 * "about" is there because the length of a recording is measured in the
 * browser and can be a fraction out — not because the number is soft.
 */

import React from 'react';
import { Clock } from 'lucide-react';
import { perMinute } from '../lib/credits';
import { useLang } from '../lib/i18n';

export default function Cost({
  credits,
  rate,
  seconds,
  waitMinutes,
  className = '',
}: {
  /** A fixed price. Leave out when it depends on length. */
  credits?: number;
  /** Credits per minute, for the jobs billed by the minute. */
  rate?: number;
  /** How long the file is, once there is one. */
  seconds?: number | null;
  /** Roughly how long the wait is, when it is long enough to matter. */
  waitMinutes?: number;
  className?: string;
}): React.ReactElement | null {
  const { t } = useLang();

  let price: string | null = null;
  if (typeof rate === 'number') {
    const each = `${rate} ${t('cost.perMinute', 'credits a minute')}`;
    price =
      typeof seconds === 'number' && seconds > 0
        ? `${each} — ${t('cost.about', 'about')} ${perMinute(seconds, rate)} ${t('cost.forThis', 'for this one')}`
        : each;
  } else if (credits === 0) {
    price = t('cost.free', 'Costs nothing');
  } else if (typeof credits === 'number') {
    price = `${credits} ${t('credits.credits', 'credits')}`;
  }

  if (!price && !waitMinutes) return null;

  return (
    <span className={`text-sm text-zinc-500 inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {price}
      {waitMinutes ? (
        <>
          {price ? <span aria-hidden="true">·</span> : null}
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3 flex-shrink-0" />
            {waitMinutes >= 5
              ? t('cost.waitLong', 'takes several minutes')
              : t('cost.wait', 'takes a few minutes')}
          </span>
        </>
      ) : null}
    </span>
  );
}
