'use client';

/**
 * What a sponsor is actually buying, drawn rather than described.
 *
 * A rate card that says "prime feature placement" is asking someone to spend
 * five figures on a phrase. Every rung here renders the real surface with the
 * enquirer's own name already in it, in the type it would really be set in —
 * so the answer to "what do I get" is something they can look at before they
 * send the form.
 *
 * These are mock-ups, and they say so. Drawing a fake screenshot that reads as
 * a live one would be the same lie as a fake counter.
 */

import React from 'react';
import { GraduationCap, Headphones, Star, Trophy } from 'lucide-react';
import type { Sponsorship } from '../lib/plans';
import { useLang } from '../lib/i18n';

/** A line set the way a sponsor credit is really set: quiet, same type, no box. */
function Credit({ who }: { who: string }): React.ReactElement {
  const { t } = useLang();
  return (
    <span className="text-[11px] text-zinc-400">
      {t('spon.presentedBy', 'Presented by')}{' '}
      <span className="text-zinc-200 font-semibold">{who}</span>
    </span>
  );
}

export default function Placement({
  rung,
  who,
}: {
  rung: Sponsorship;
  /** What they typed in the name field, or a stand-in until they do. */
  who: string;
}): React.ReactElement {
  const { t } = useLang();
  const name = who.trim() || t('place.yourCompany', 'Your company');

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-3.5 space-y-2.5">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500">
        {t('place.mock', 'What {what} looks like — a mock-up, not a live page')
          .replace('{what}', t(`spon.${rung.id}.name`, rung.name).toLowerCase())}
      </p>

      {rung.id === 'class' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 space-y-1.5">
          <GraduationCap className="w-4 h-4 text-emerald-400" />
          <p className="text-xs font-bold text-white leading-snug">
            {t('place.classTitle', 'Building a release-ready track with AI')}
          </p>
          <p className="text-[11px] text-zinc-500">45 min · Masterclass</p>
          <Credit who={name} />
        </div>
      )}

      {rung.id === 'season' && (
        <div className="space-y-1.5">
          {['Making the first track', 'Writing words that sing', 'Getting it heard'].map((title) => (
            <div key={title} className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 flex items-center gap-2.5">
              <Headphones className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{title}</p>
                <Credit who={name} />
              </div>
            </div>
          ))}
        </div>
      )}

      {rung.id === 'headline' && (
        <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 to-transparent p-3 space-y-1">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-400">
            <Star className="w-3 h-3 fill-current" />
            {t('spon.thisMonth', 'This month on FutureBox')}
          </span>
          <p className="text-sm font-bold text-white leading-snug">
            {t('spon.with', 'with')} {name}
          </p>
          <p className="text-[11px] text-zinc-500">{t('spon.onePartner', 'One partner a month. Named here, and nowhere else.')}</p>
        </div>
      )}

      <p className="text-[11px] text-zinc-500 leading-snug">{t(`spon.${rung.id}.gets`, rung.gets)}</p>
    </div>
  );
}
