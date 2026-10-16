'use client';

/**
 * "Your cloud space is full" — said once, plainly, wherever the upload was.
 *
 * Carli asked for the space per plan to say clearly when somebody is full
 * instead of failing silently. The limit is a storage policy, and a refused
 * file comes back from it as a row-level-security error that no room can
 * turn into a sentence. So the rooms do not try: each upload that fails asks
 * `refusedForSpace` (in `lib/space.ts`), and when the answer is "full" this
 * card says how much is kept, of how much, and what to do.
 *
 * Mounted once, in the root layout. Not in the kids room: a child cannot
 * delete a grown-up's files or change a plan, and the kids shelf says its own
 * sentence — "ask a grown-up to make room".
 */
import React, { useEffect, useState } from 'react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { TIER_SPECS } from '../lib/plans';
import { SEE_PLANS_EVENT, SPACE_FULL_EVENT, sizeOf, type Space } from '../lib/space';

export default function SpaceFull(): React.ReactElement | null {
  const { t } = useLang();
  const [space, setSpace] = useState<Space | null>(null);
  const close = (): void => setSpace(null);
  useBackLayer(space !== null, close);

  useEffect(() => {
    const heard = (event: Event): void => {
      if (window.location.pathname.startsWith('/kids')) return;
      const said = (event as CustomEvent<Space>).detail;
      if (said) setSpace(said);
    };
    window.addEventListener(SPACE_FULL_EVENT, heard);
    return () => window.removeEventListener(SPACE_FULL_EVENT, heard);
  }, []);

  if (!space) return null;
  const tier = space.tier ?? 'free';
  const biggest = tier === 'label';
  const plan = TIER_SPECS[tier].name;

  return (
    <div
      data-spacefull
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="space-full-title"
      className="fixed inset-x-0 bottom-0 z-[100] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="w-full max-w-md space-y-3 rounded-3xl border-2 border-amber-300/70 bg-surface-50 p-4 shadow-2xl">
        <p id="space-full-title" className="text-base font-black text-surface-950">
          {t('space.fullTitle', 'Your cloud space is full')}
        </p>
        <p className="text-sm leading-relaxed text-surface-800" data-spacefullsays>
          {t('space.fullSays', 'You keep {used} of the {cap} on {plan}, so this was not saved to the cloud.')
            .replace('{used}', sizeOf(space.used ?? 0))
            .replace('{cap}', sizeOf(space.cap ?? 0))
            .replace('{plan}', plan)}
          {' '}
          {biggest
            ? t('space.fullLabel', 'Delete something you no longer keep to make room.')
            : t('space.fullMore', 'Delete something you no longer keep, or move to a bigger plan for more room.')}
        </p>
        <div className="flex flex-wrap gap-2">
          {!biggest && (
            <button
              type="button"
              data-spacefullplans
              onClick={() => { close(); window.dispatchEvent(new CustomEvent(SEE_PLANS_EVENT)); }}
              className="min-h-[44px] flex-1 rounded-2xl bg-amber-300 px-4 text-sm font-black text-onAccent"
            >
              {t('space.fullPlans', 'See the plans')}
            </button>
          )}
          <button
            type="button"
            data-spacefullclose
            onClick={close}
            className="min-h-[44px] flex-1 rounded-2xl border border-surface-300 px-4 text-sm font-bold text-surface-800"
          >
            {t('space.fullClose', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
