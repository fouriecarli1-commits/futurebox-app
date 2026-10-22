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
import { GraduationCap, Headphones, Star } from 'lucide-react';
import type { Sponsorship } from '../lib/plans';
import { useLang } from '../lib/i18n';

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

      {/* Both Cubed³ rungs put the sponsor's logo on the class video, beside
          FutureBox's. Only the season rung adds the presenter's own word. */}
      {(rung.id === 'class' || rung.id === 'season') && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 space-y-2">
          <div className="relative aspect-video rounded-lg bg-linear-to-br from-zinc-800 to-zinc-950 border border-zinc-800">
            <GraduationCap className="absolute inset-0 m-auto w-6 h-6 text-zinc-600" />
            <span className="absolute top-2 right-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[10px] font-bold text-white">
              FutureBox <span className="text-zinc-500">·</span> <span className="text-emerald-300 truncate max-w-[8rem]">{name}</span>
            </span>
          </div>
          <p className="text-xs font-bold text-white leading-snug">
            {t('place.classTitle', 'Building a release-ready track with AI')}
          </p>
          <p className="text-[11px] text-zinc-500">{t('place.classMeta', '3 sessions · Cubed³ masterclass')}</p>
          {rung.id === 'season' && (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-1.5 text-[11px] text-zinc-300">
              <Headphones className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                <span className="font-semibold text-emerald-300">{t('place.sponsored', 'Sponsored')}</span>{' '}
                {t('place.presenterWord', '— the presenter on {who}').replace('{who}', name)}
              </span>
            </p>
          )}
        </div>
      )}

      {rung.id === 'headline' && (
        <div className="rounded-xl border border-emerald-500/25 bg-linear-to-r from-emerald-500/10 to-transparent p-3 space-y-1">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-400">
            <Star className="w-3 h-3 fill-current" />
            {t('spon.thisMonth', 'This month on FutureBox')}
          </span>
          <p className="text-sm font-bold text-white leading-snug">
            {t('spon.with', 'with')} {name}
          </p>
          <p className="text-[11px] text-zinc-500">{t('spon.onePartner', 'Only one headline partner at a time. No other company is named here.')}</p>
        </div>
      )}

      <p className="text-[11px] text-zinc-500 leading-snug">{t(`spon.${rung.id}.gets`, rung.gets)}</p>
    </div>
  );
}
