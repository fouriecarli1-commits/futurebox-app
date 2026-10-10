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
import { Check, Clock, Loader2, Lock, Unlock } from 'lucide-react';
import { useLang } from '../lib/i18n';
import {
  ALLOWANCE_STEPS, KID_PRICES, MINUTE_STEPS, asClock, howMany, type KidThing,
} from '../lib/kidsallowance';
import {
  endKids, endSitting, giveAllowance, kidsNow, sitAgain, type KidsState,
} from '../lib/kidsdoor';
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
  /**
   * The clock the parent has picked but not yet handed over.
   *
   * Held here rather than written on every tap, because handing the phone
   * over IS the start of the sitting — so the clock and the allowance go in
   * one press, and that press is the moment the twenty minutes begin.
   * Writing the clock when it was tapped would start a sitting while the
   * parent was still reading the prices.
   *
   * Starts at whatever the room already has, so a parent coming back to give
   * another allowance does not have to set the clock again.
   */
  const [wantMinutes, setWantMinutes] = useState<number | null>(null);

  useEffect(() => {
    void kidsNow().then((now) => {
      setState(now);
      if (now.open && now.minutes) setWantMinutes(now.minutes);
    });
  }, []);

  const give = async (allowance: number): Promise<void> => {
    setBusy(true);
    const next = await giveAllowance(allowance, wantMinutes);
    setBusy(false);
    if (!next) return;
    setState(next);
    onIn?.(next);
  };

  /** Another sitting, or this one ended early. Neither touches the money. */
  const clockIt = async (sitting: boolean): Promise<void> => {
    setBusy(true);
    const next = sitting ? await sitAgain() : await endSitting();
    setBusy(false);
    if (next) setState(next);
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

      {/* ── How long ───────────────────────────────────────

          Carli, 10 October 2026: *"Dan moet die ouers die budget en screen
          time kan stel. Wanneer screen time op is moet dit die kind
          uitskop."*

          Above the money, because it is the question a parent answers first
          when they hand a phone to a child — and because the allowance press
          below is what starts the clock, so the clock has to be chosen by
          then.

          "No clock" is a real option and it is first. A budget with no timer
          is a reasonable thing to want, it is what every room opened before
          today has, and making it the absence of a choice rather than a
          choice would leave a parent wondering whether they had forgotten
          something. */}
      <div className="space-y-3" data-kidsclock>
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
          <Clock className="h-3.5 w-3.5" />
          {t('kids.howLong', 'How long may they have it?')}
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-kidsminutes="none"
            aria-pressed={wantMinutes === null}
            onClick={() => setWantMinutes(null)}
            className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold ${
              wantMinutes === null
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                : 'border-zinc-800 bg-zinc-900/50 text-zinc-300'
            }`}
          >
            {t('kids.noClock', 'No clock')}
          </button>
          {MINUTE_STEPS.map((step) => (
            <button
              key={step}
              type="button"
              data-kidsminutes={step}
              aria-pressed={wantMinutes === step}
              onClick={() => setWantMinutes(step)}
              className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold ${
                wantMinutes === step
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-300'
              }`}
            >
              {step < 60
                ? `${step} ${t('kids.min', 'min')}`
                : `${step / 60} ${step === 60 ? t('kids.hour', 'hour') : t('kids.hours', 'hours')}`}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-zinc-600">
          {wantMinutes === null
            ? t('kids.noClockWhy', 'They can stay as long as they like. The allowance still stops at the number you pick below.')
            : t('kids.clockWhy', 'The clock starts the moment you hand it over below. When it runs out the room closes itself and asks for a grown-up — and nothing can be made past that point even if the page is left open or reloaded.')}
        </p>
      </div>

      {/* ── This sitting, where there is one ─────────────────────

          Only once a room is open with a clock on it. The two presses a
          parent actually makes mid-afternoon: another twenty minutes, or
          "right, that is enough". Neither touches the allowance — more time
          is not more money, and a parent who meant both presses both. */}
      {state?.open && state.minutes ? (
        <div
          className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
          data-kidssitting
        >
          <p className="text-sm text-zinc-300">
            {state.secondsLeft && state.secondsLeft > 0
              ? `${t('kids.leftNow', 'Left in this sitting')}: ${asClock(state.secondsLeft)}`
              : t('kids.sittingOver', 'This sitting is over. They are out until you let them back in.')}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-kidsagain
              disabled={busy}
              onClick={() => void clockIt(true)}
              className="min-h-[44px] rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-300 disabled:opacity-50"
            >
              {t('kids.another', 'Another {n} minutes').replace('{n}', String(state.minutes))}
            </button>
            {(state.secondsLeft ?? 0) > 0 && (
              <button
                type="button"
                data-kidsstop
                disabled={busy}
                onClick={() => void clockIt(false)}
                className="min-h-[44px] rounded-xl border border-zinc-700 px-3.5 py-2 text-sm font-semibold text-zinc-300 disabled:opacity-50"
              >
                {t('kids.stopNow', 'That is enough for now')}
              </button>
            )}
          </div>
        </div>
      ) : null}
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
