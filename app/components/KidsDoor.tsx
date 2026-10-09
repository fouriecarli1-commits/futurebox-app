'use client';

/**
 * The grown-up's page, which is the first thing the kids room shows.
 *
 * ── What she asked, in two messages ──────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Let the parent give an allowance on an opening
 * page."* Then: *"Gee dan net vir die ouer 'n raamwerk van wat krediete kan
 * doen per liedjie, per video, per story mode."*
 *
 * So the page answers the grown-up's question before it asks them anything.
 * "Twenty credits" means nothing to a parent. "Twenty credits is one song"
 * means everything, and it is the difference between a parent who sets an
 * allowance and a parent who closes the app.
 *
 * ── Why the numbers are not written here ─────────────────────────────────
 *
 * Every price comes from `lib/kidsallowance.ts`, which derives them from the
 * same table the routes charge from. A page about money quoting a number the
 * app does not honour is the one mistake here that cannot be argued away,
 * and `check:toelaag` drives each row against that table.
 *
 * ── Why story mode is shown and cannot be chosen ─────────────────────────
 *
 * She asked for it in the framework, and the room cannot do it yet. Showing
 * the price with the truth next to it is honest; showing it as an option
 * would be a promise. The check reads the filesystem for a story room, so
 * the day one lands this row stops saying so on its own rather than waiting
 * for somebody to remember.
 *
 * ── What this page is not ────────────────────────────────────────────────
 *
 * A lock. Whoever can set an allowance can clear it, and so can anybody
 * holding the unlocked phone. It is a budget, and what it is for is a
 * six-year-old pressing a button forty times — for that it is exact, because
 * the limit is applied in `charge()` and nowhere near this file.
 */

import React, { useEffect, useState } from 'react';
import { Check, Loader2, Lock, Unlock } from 'lucide-react';
import { useLang } from '../lib/i18n';
import {
  ALLOWANCE_STEPS, KID_PRICES, howMany, type KidThing,
} from '../lib/kidsallowance';
import { endKids, giveAllowance, kidsNow, type KidsState } from '../lib/kidsdoor';
import StoryShelf from './StoryShelf';
import SongShelf from './SongShelf';

/** What one of each thing is called in a sentence about how many. */
const MANY: Record<KidThing, readonly [string, string, string]> = {
  song: ['kids.manySong', 'song', 'songs'],
  video: ['kids.manyVideo', 'video', 'videos'],
  story: ['kids.manyStory', 'story', 'stories'],
};

export default function KidsDoor({
  onIn,
}: {
  /** Taken once an allowance is set, so the child can go in. */
  readonly onIn?: (state: KidsState) => void;
}): React.ReactElement {
  const { t } = useLang();
  const [state, setState] = useState<KidsState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void kidsNow().then(setState);
  }, []);

  const give = async (allowance: number): Promise<void> => {
    setBusy(true);
    const next = await giveAllowance(allowance);
    setBusy(false);
    if (!next) return;
    setState(next);
    onIn?.(next);
  };

  const end = async (): Promise<void> => {
    setBusy(true);
    const next = await endKids();
    setBusy(false);
    if (next) setState(next);
  };

  const songPrice = KID_PRICES.find((one) => one.id === 'song')?.credits ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-5" data-kidsdoor>
      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          {t('kids.title', 'Before you hand the phone over')}
        </h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          {t(
            'kids.what',
            'Set how many of your credits this child may spend. When it runs out the room says so and asks for you. Nothing here can spend past the number you pick.',
          )}
        </p>
      </div>

      {/* ── The framework ────────────────────────────────────────────────
          Her second message, and the part that makes the number mean
          something. One row a thing, the price from the credit table, and
          plainly whether the room can do it yet. */}
      <div className="space-y-2" data-kidsframe>
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          {t('kids.frame', 'What credits buy in here')}
        </h3>
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800">
          {KID_PRICES.map((one) => (
            <li
              key={one.id}
              data-kidsprice={one.id}
              className="flex items-baseline justify-between gap-4 bg-zinc-900/50 px-4 py-3"
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-200">
                  {t(one.says[0], one.says[1])}
                </span>
                {!one.ready && (
                  <span className="block text-xs text-amber-400/90">
                    {t('kids.notYet', 'Not built yet — the price is here so you can plan for it.')}
                  </span>
                )}
              </span>
              <span className="flex-shrink-0 text-sm font-black text-emerald-400">
                {one.credits}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── The choice ───────────────────────────────────────────────────
          In songs rather than in credits, because that is the unit a parent
          can price. The credits are said as well, since it is their balance
          the number comes out of. */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          {t('kids.howMuch', 'How much may they spend?')}
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {ALLOWANCE_STEPS.map((step) => {
            const chosen = state?.open && state.allowance === step;
            return (
              <button
                key={step}
                type="button"
                disabled={busy}
                onClick={() => void give(step)}
                aria-pressed={Boolean(chosen)}
                data-kidsstep={step}
                className={`flex min-h-[56px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left disabled:opacity-50 ${
                  chosen
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-zinc-800 bg-zinc-900/50'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-zinc-100">
                    {/* Said in things, which is the whole point of the
                        framework above. A `0` is informative rather than
                        embarrassing: it is how a parent learns that a video
                        is worth more than two songs. */}
                    {[
                      ...KID_PRICES.filter((one) => one.ready).map((one) => {
                        const many = howMany(step, one.id);
                        const words = MANY[one.id];
                        return `${many} ${t(`${words[0]}${many === 1 ? '' : 's'}`, many === 1 ? words[1] : words[2])}`;
                      }),
                    ].join(t('kids.or', ' or '))}
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {step} {t('kids.credits', 'credits')}
                  </span>
                </span>
                {chosen ? (
                  <Check className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="text-xs leading-relaxed text-zinc-600">
          {t(
            'kids.steps',
            'The steps are whole songs, so nothing is left over that buys nothing.',
          )}{' '}
          {t('kids.songIs', 'One song is')} {songPrice} {t('kids.credits', 'credits')}.
        </p>
      </div>

      {/* ── The shelf, where a grown-up can take one off ─────────────────
          The same shelf the child sees, with the one control they do not
          get: taking a story off it cannot be undone. */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          {t('kids.shelfTitle', 'Stories on this device')}
        </h3>
        <StoryShelf grownUp />
      </div>

      {/* And the child's own songs, with the same one control they do not
          get: taking one off cannot be undone, and losing a song they made
          is worse than losing one somebody made for them. */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          {t('kids.songsKept', 'Songs this child has kept')}
        </h3>
        <SongShelf grownUp />
      </div>

      {/* ── Where it stands ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4" data-kidsstanding>
        {state === null ? (
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('kids.asking', 'Asking where the allowance stands…')}
          </p>
        ) : state.open ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <Lock className="h-4 w-4" />
              {t('kids.on', 'The room is open for a child.')}
            </p>
            <p className="text-sm text-zinc-300">
              {t('kids.leftOf', 'Left:')} <span className="font-black">{state.left}</span>{' '}
              {t('kids.of', 'of')} {state.allowance} {t('kids.credits', 'credits')}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void end()}
              data-kidsend
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 disabled:opacity-50"
            >
              <Unlock className="h-4 w-4" />
              {t('kids.end', 'I have the phone back')}
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">
            {t('kids.off', 'No allowance is set, so nothing is capped. Pick one above.')}
          </p>
        )}
      </div>
    </div>
  );
}
