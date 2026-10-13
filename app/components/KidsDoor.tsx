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
  endKids, endSitting, failed, giveAllowance, kidsNow, sitAgain, type KidsFail, type KidsState,
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
  const { t, lang } = useLang();
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
  /**
   * Why the last press did not take, in a sentence, or nothing.
   *
   * Carli, 12 October 2026: *"Wel die kids room gaan nie verder as die
   * parental page nie."* It did not, because every failure came back as
   * `null` and `null` drew nothing. A door that does nothing when pressed is
   * indistinguishable from a door that is broken, so every way a press can
   * fail now ends in a sentence under the buttons.
   */
  const [fail, setFail] = useState('');
  const say = (why: KidsFail): string => {
    if (why.fail === 'signedOut') {
      return t('kids.signedOut', 'Sign in first — the allowance belongs to your account. Go back to the studio, sign in, and come back here.');
    }
    if (why.fail === 'network') {
      return t('kids.noNet', 'That did not reach the server. Check the connection and try again.');
    }
    return why.fail;
  };

  useEffect(() => {
    void kidsNow().then((now) => {
      setState(now);
      if (now.open && now.minutes) setWantMinutes(now.minutes);
    });
  }, []);

  const give = async (allowance: number): Promise<void> => {
    setBusy(true);
    setFail('');
    const next = await giveAllowance(allowance, wantMinutes);
    setBusy(false);
    if (failed(next)) { setFail(say(next)); return; }
    /* Saved and then read back as shut: the row went in but the room could
       not be read, which is a database half set up. Silence here was the
       second way the door "did not go further". */
    if (!next.open) {
      setFail(t('kids.notOpened', 'The allowance was saved but the room did not open. Try again; if it keeps happening, tell us on the help page.'));
      return;
    }
    setState(next);
    onIn?.(next);
  };

  /** Another sitting, or this one ended early. Neither touches the money. */
  const clockIt = async (sitting: boolean): Promise<void> => {
    setBusy(true);
    setFail('');
    const next = sitting ? await sitAgain() : await endSitting();
    setBusy(false);
    if (failed(next)) { setFail(say(next)); return; }
    setState(next);
  };

  const end = async (): Promise<void> => {
    setBusy(true);
    setFail('');
    const next = await endKids();
    setBusy(false);
    if (failed(next)) { setFail(say(next)); return; }
    setState(next);
  };

  const songPrice = KID_PRICES.find((one) => one.id === 'song')?.credits ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-5" data-kidsdoor>
      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <span className="text-3xl">✨</span>
          <span>{t('kids.title', 'Before you hand the phone over')}</span>
        </h2>
        <p className="text-sm leading-relaxed text-zinc-300">
          {t(
            'kids.what',
            'Set how many of your credits this child may spend. When it runs out the room says so and asks for you. Nothing here can spend past the number you pick.',
          )}
        </p>
      </div>

      {/* ── Nobody signed in ─────────────────────────────────────────────
          The sign-in screen links here, so a grown-up can arrive with no
          account behind them. Then the allowance buttons are a lie: every
          press goes nowhere. One step instead, saying what to do. */}
      {state?.signedIn === false && (
        <div
          data-kidssignin
          role="alert"
          className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 backdrop-blur-sm"
        >
          <p className="text-sm leading-relaxed text-zinc-100">
            {t('kids.signedOut', 'Sign in first — the allowance belongs to your account. Go back to the studio, sign in, and come back here.')}
          </p>
          <a
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-500/60 bg-amber-500/15 px-4 text-sm font-bold text-amber-200 hover:bg-amber-500/25"
          >
            {t('kids.signIn', 'Go and sign in')}
          </a>
        </div>
      )}

      {/* ── The framework ────────────────────────────────────────────────
          Her second message, and the part that makes the number mean
          something. One row a thing, the price from the credit table, and
          plainly whether the room can do it yet. */}
      <div className="space-y-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 sm:p-5 shadow-lg backdrop-blur-sm" data-kidsframe>
        <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <span>✨</span>
          {t('kids.frame', 'What credits buy in here')}
        </h3>
        <ul className="divide-y divide-emerald-900/40 overflow-hidden rounded-xl border border-emerald-500/20 bg-zinc-900/70">
          {KID_PRICES.map((one) => (
            <li
              key={one.id}
              data-kidsprice={one.id}
              className="flex items-baseline justify-between gap-4 px-4 py-3 hover:bg-emerald-950/20 transition-colors"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold text-zinc-100">
                  {t(one.says[0], one.says[1])}
                </span>
                {!one.ready && (
                  <span className="block text-xs text-amber-400/90 font-medium">
                    {t('kids.notYet', 'Not built yet — the price is here so you can plan for it.')}
                  </span>
                )}
              </span>
              <span className="flex-shrink-0 text-sm font-black text-emerald-400">
                {one.credits} {t('kids.credits', 'credits')}
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
          then. */}
      <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 sm:p-5 shadow-lg backdrop-blur-sm" data-kidsclock>
        <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
          <Clock className="h-3.5 w-3.5" />
          {t('kids.howLong', 'How long may they have it?')}
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-kidsminutes="none"
            aria-pressed={wantMinutes === null}
            onClick={() => setWantMinutes(null)}
            className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-bold transition-all ${
              wantMinutes === null
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'border-emerald-900/40 bg-zinc-900/70 text-zinc-300 hover:border-emerald-500/40'
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
              className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-bold transition-all ${
                wantMinutes === step
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'border-emerald-900/40 bg-zinc-900/70 text-zinc-300 hover:border-emerald-500/40'
              }`}
            >
              {step < 60
                ? `${step} ${t('kids.min', 'min')}`
                : `${step / 60} ${step === 60 ? t('kids.hour', 'hour') : t('kids.hours', 'hours')}`}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-zinc-400">
          {wantMinutes === null
            ? t('kids.noClockWhy', 'They can stay as long as they like. The allowance still stops at the number you pick below.')
            : t('kids.clockWhy', 'The clock starts the moment you hand it over below. When it runs out the room closes itself and asks for a grown-up — and nothing can be made past that point even if the page is left open or reloaded.')}
        </p>
      </div>

      {/* ── This sitting, where there is one ─────────────────────
          Only once a room is open with a clock on it. */}
      {state?.open && state.minutes ? (
        <div
          className="space-y-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 shadow-lg backdrop-blur-sm"
          data-kidssitting
        >
          <p className="text-sm font-bold text-zinc-200">
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
              className="min-h-[44px] rounded-xl border border-emerald-500/60 bg-emerald-500/20 px-3.5 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50 transition-all"
            >
              {t('kids.another', 'Another {n} minutes').replace('{n}', String(state.minutes))}
            </button>
            {(state.secondsLeft ?? 0) > 0 && (
              <button
                type="button"
                data-kidsstop
                disabled={busy}
                onClick={() => void clockIt(false)}
                className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900/60 px-3.5 py-2 text-sm font-bold text-zinc-300 hover:border-zinc-500 disabled:opacity-50 transition-all"
              >
                {t('kids.stopNow', 'That is enough for now')}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* ── The choice ───────────────────────────────────────────────────
          In songs rather than in credits, because that is the unit a parent can price. */}
      <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 sm:p-5 shadow-lg backdrop-blur-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <span>🪙</span>
          {t('kids.howMuch', 'How much may they spend?')}
        </h3>
        {fail && (
          <p
            data-kidsfail
            role="alert"
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm leading-relaxed text-rose-100"
          >
            {fail}
          </p>
        )}
        <div className="grid gap-2.5 sm:grid-cols-2">
          {ALLOWANCE_STEPS.map((step) => {
            const chosen = state?.open && state.allowance === step;
            return (
              <button
                key={step}
                disabled={busy || state?.signedIn === false}
                onClick={() => void give(step)}
                aria-pressed={Boolean(chosen)}
                data-kidsstep={step}
                className={`flex min-h-[58px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all disabled:opacity-50 ${
                  chosen
                    ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_18px_rgba(16,185,129,0.25)]'
                    : 'border-emerald-900/40 bg-zinc-900/70 hover:border-emerald-500/40 hover:bg-zinc-900/90'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-zinc-100">
                    {[
                      ...KID_PRICES.filter((one) => one.ready).map((one) => {
                        const many = howMany(step, one.id);
                        const words = MANY[one.id];
                        return `${many} ${t(`${words[0]}${many === 1 ? '' : 's'}`, many === 1 ? words[1] : words[2])}`;
                      }),
                    ].join(t('kids.or', ' or '))}
                  </span>
                  <span className="block text-xs font-semibold text-emerald-400/90">
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
        <p className="text-xs leading-relaxed text-zinc-400">
          {t(
            'kids.steps',
            'The steps are whole songs, so nothing is left over that buys nothing.',
          )}{' '}
          {t('kids.songIs', 'One song is')} {songPrice} {t('kids.credits', 'credits')}.
        </p>
      </div>

      {/* ── The shelf, where a grown-up can take one off ───────────────── */}
      <div className="space-y-2 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 backdrop-blur-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <span>📖</span>
          {t('kids.shelfTitle', 'Stories on this device')}
        </h3>
        <StoryShelf grownUp />
      </div>

      {/* And the child's own songs ─────────────────────────────────────── */}
      <div className="space-y-2 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 backdrop-blur-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <span>🎵</span>
          {t('kids.songsKept', 'Songs this child has kept')}
        </h3>
        <SongShelf grownUp />
      </div>

      {/* ── Where it stands ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-5 shadow-lg backdrop-blur-sm" data-kidsstanding>
        {state === null ? (
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            {t('kids.asking', 'Asking where the allowance stands…')}
          </p>
        ) : state.open ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-400">
              <Lock className="h-4 w-4" />
              {t('kids.on', 'The room is open for a child.')}
            </p>
            <p className="text-sm text-zinc-200">
              {t('kids.leftOf', 'Left:')} <span className="font-black text-emerald-300">{state.left}</span>{' '}
              {t('kids.of', 'of')} {state.allowance} {t('kids.credits', 'credits')}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void end()}
              data-kidsend
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-bold text-zinc-200 hover:border-zinc-500 disabled:opacity-50 transition-all"
            >
              <Unlock className="h-4 w-4" />
              {t('kids.end', 'I have the phone back')}
            </button>
          </div>
        ) : (
          <p className="text-sm font-medium text-zinc-300">
            {t('kids.off', 'No allowance is set, so nothing is capped. Pick one above.')}
          </p>
        )}
      </div>
    </div>
  );
}
