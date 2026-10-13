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
import { Check, Clock, Loader2, Lock, Sparkles, Unlock } from 'lucide-react';
import { useLang } from '../lib/i18n';
import {
  ALLOWANCE_STEPS, KID_PRICES, MINUTE_STEPS, asClock, howMany, type KidThing,
} from '../lib/kidsallowance';
import {
  endKids, endSitting, failed, giveAllowance, kidsNow, sitAgain, type KidsFail, type KidsState,
} from '../lib/kidsdoor';
import {
  DOOR_CHOSEN_RING, DOOR_GLASS_RING, DOOR_GOLD_RING, DOOR_TEXT_GLOW,
} from '../lib/kidsdoorlook';
import StoryShelf from './StoryShelf';
import SongShelf from './SongShelf';

/** What one of each thing is called in a sentence about how many. */
const MANY: Record<KidThing, readonly [string, string, string]> = {
  song: ['kids.manySong', 'song', 'songs'],
  video: ['kids.manyVideo', 'video', 'videos'],
  story: ['kids.manyStory', 'story', 'stories'],
  picture: ['kids.manyPicture', 'picture', 'pictures'],
};

/** The picture beside each price, so a parent reads the row before the number. */
const FACE: Record<KidThing, string> = { song: '🎵', video: '🎬', story: '📖', picture: '🖼️' };

/**
 * The six doors the child will find inside, as the room names them.
 *
 * The same keys and the same words as `KidsRoom.tsx`'s DOORS, so the
 * grown-up reads on this page exactly what the child reads on the next —
 * `check:eensin` holds the fallbacks identical.
 */
const SIX: readonly { readonly icon: string; readonly says: readonly [string, string] }[] = [
  { icon: '🎵', says: ['kids.doorMusic', 'Create Music!'] },
  { icon: '🎬', says: ['kids.doorVideo', 'Music Videos & Stories!'] },
  { icon: '🎨', says: ['kids.doorDraw', 'Magic Drawing Board!'] },
  { icon: '🎹', says: ['kids.doorGames', 'Studio Games & Beats!'] },
  { icon: '✂️', says: ['kids.doorEdit', 'Easy Editing!'] },
  { icon: '🧠', says: ['kids.doorQuiz', 'Mega Quizzes & Skills!'] },
];

/** One glass panel on the photograph. */
const GLASS = 'rounded-3xl border-2 border-cyan-400/60 bg-surface-50/80 backdrop-blur-md';
/** The small lit heading on a panel. */
const HEAD = 'fb-kids-bubble flex items-center gap-2 text-base text-cyan-300';

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
  const chosenStep = state?.open ? state.allowance : null;

  /* ── The look ──────────────────────────────────────────────────────────
     Carli, 13 October 2026: *"Hierdie op die parents room moet meer die
     futuristic tema bevat … super helder en neon … dit moet skree van
     dieselfde tema as by die kids room … redesign daai hele parents page."*

     It was six grey-green cards in the app's own house style, on top of her
     photograph, which is the "short cut" she had already forbidden for the
     room itself. Now it is the room's own glass: the same panels, the same
     rounded face, the same mint ring the child's doors have — and the one
     press that hands the phone over is the room's hot pink, because it is
     the one press on this page that spends.

     Nothing about the money moved. Every price is still `KID_PRICES`, every
     hook the probe and `check:skermtyd` read is where it was. */
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6" data-kidsdoor>
      {/* ── Her banner, and the headline over it ─────────────────────── */}
      <div className={`${GLASS} overflow-hidden`} style={{ boxShadow: DOOR_GLASS_RING }}>
        <img
          src={lang === 'af' ? '/kids/banner-af.jpg' : '/kids/banner-en.jpg'}
          alt={t('kids.bannerAlt', 'The FutureBox kids room: a safe studio where a child can be creative')}
          className="block w-full object-cover"
          style={{ aspectRatio: '16 / 7' }}
        />
        <div className="space-y-2 p-4 sm:p-6">
          <p className="fb-kids-bubble text-xs uppercase tracking-[0.3em] text-amber-300" style={{ textShadow: DOOR_TEXT_GLOW.gold }}>
            {t('kids.grownUps', 'For the grown-up')}
          </p>
          <h2 className="fb-kids-bubble text-3xl leading-tight text-surface-950 sm:text-4xl" style={{ textShadow: DOOR_TEXT_GLOW.mint }}>
            {t('kids.title', 'Before you hand the phone over')}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-surface-800 sm:text-base">
            {t(
              'kids.what',
              'Set how many of your credits this child may spend. When it runs out the room says so and asks for you. Nothing here can spend past the number you pick.',
            )}
          </p>
          <p className="text-sm font-bold text-cyan-300" style={{ textShadow: DOOR_TEXT_GLOW.mint }}>
            {t('kids.safeLine', 'No chat and no strangers. The room closes on your clock and stops at your number.')}
          </p>
        </div>
      </div>

      {/* ── Nobody signed in ─────────────────────────────────────────────
          The sign-in screen links here, so a grown-up can arrive with no
          account behind them. Then the allowance buttons are a lie: every
          press goes nowhere. One step instead, saying what to do. */}
      {state?.signedIn === false && (
        <div
          data-kidssignin
          role="alert"
          className="space-y-3 rounded-3xl border-2 border-amber-300/70 bg-surface-50/85 p-4 backdrop-blur-md"
          style={{ boxShadow: DOOR_GOLD_RING }}
        >
          <p className="text-sm leading-relaxed text-surface-900">
            {t('kids.signedOut', 'Sign in first — the allowance belongs to your account. Go back to the studio, sign in, and come back here.')}
          </p>
          <a
            href="/"
            className="fb-kids-bouncy inline-flex min-h-[48px] items-center gap-2 rounded-2xl border-2 border-amber-300 bg-amber-400 px-5 text-sm font-black text-onAccent"
          >
            {t('kids.signIn', 'Go and sign in')}
          </a>
        </div>
      )}

      {/* ── The six doors the child will find ────────────────────────── */}
      <div className={`${GLASS} space-y-3 p-4 sm:p-5`} style={{ boxShadow: DOOR_GLASS_RING }}>
        <h3 className={HEAD} style={{ textShadow: DOOR_TEXT_GLOW.mint }}>
          <Sparkles className="h-4 w-4" />
          {t('kids.doorsTitle', 'Six doors, all inside')}
        </h3>
        <div className="flex flex-wrap gap-2.5">
          {SIX.map((door) => (
            <div
              key={door.says[0]}
              className="flex w-[calc(50%-0.3125rem)] items-center gap-2.5 rounded-2xl border border-cyan-400/40 bg-surface-100/70 px-3 py-2.5 sm:w-[calc(33.333%-0.45rem)]"
            >
              <span className="text-2xl" aria-hidden>{door.icon}</span>
              <span className="fb-kids-bubble text-sm leading-tight text-surface-950">{t(door.says[0], door.says[1])}</span>
            </div>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-surface-700">
          {t('kids.doorsWhy', 'Everything a child presses in there is on this page. Most of it has no price; the priced things below come out of the allowance you set.')}
        </p>
      </div>

      {/* ── The framework ────────────────────────────────────────────────
          Her second message, and the part that makes the number mean
          something. One card a thing, the price from the credit table, and
          plainly whether the room can do it yet. */}
      <div className={`${GLASS} space-y-3 p-4 sm:p-5`} data-kidsframe style={{ boxShadow: DOOR_GLASS_RING }}>
        <h3 className={HEAD} style={{ textShadow: DOOR_TEXT_GLOW.mint }}>
          <span aria-hidden>🪙</span>
          {t('kids.frame', 'What credits buy in here')}
        </h3>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {KID_PRICES.map((one) => (
            <li
              key={one.id}
              data-kidsprice={one.id}
              className="flex flex-col items-center gap-1 rounded-2xl border-2 border-amber-300/60 bg-surface-100/75 px-3 py-4 text-center"
              style={{ boxShadow: DOOR_GOLD_RING }}
            >
              <span className="text-3xl" aria-hidden>{FACE[one.id]}</span>
              <span className="text-sm font-bold text-surface-950">
                {t(one.says[0], one.says[1])}
              </span>
              <span className="fb-kids-bubble text-3xl text-amber-300" style={{ textShadow: DOOR_TEXT_GLOW.gold }}>
                {one.credits}
              </span>
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-200">
                {t('kids.credits', 'credits')}
              </span>
              {!one.ready && (
                <span className="text-xs font-medium leading-snug text-surface-700">
                  {t('kids.notYet', 'Not built yet — the price is here so you can plan for it.')}
                </span>
              )}
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
      <div className={`${GLASS} space-y-3 p-4 sm:p-5`} data-kidsclock style={{ boxShadow: DOOR_GLASS_RING }}>
        <h3 className={HEAD} style={{ textShadow: DOOR_TEXT_GLOW.mint }}>
          <Clock className="h-4 w-4" />
          {t('kids.howLong', 'How long may they have it?')}
        </h3>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            data-kidsminutes="none"
            aria-pressed={wantMinutes === null}
            onClick={() => setWantMinutes(null)}
            className={`fb-kids-bouncy min-h-[52px] rounded-2xl border-2 px-5 text-base font-black transition-all ${
              wantMinutes === null
                ? 'border-emerald-300 bg-emerald-500 text-onAccent'
                : 'border-cyan-400/60 bg-surface-100/80 text-surface-950 hover:border-cyan-300'
            }`}
            style={wantMinutes === null ? { boxShadow: DOOR_CHOSEN_RING } : undefined}
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
              className={`fb-kids-bouncy min-h-[52px] rounded-2xl border-2 px-5 text-base font-black transition-all ${
                wantMinutes === step
                  ? 'border-emerald-300 bg-emerald-500 text-onAccent'
                  : 'border-cyan-400/60 bg-surface-100/80 text-surface-950 hover:border-cyan-300'
              }`}
              style={wantMinutes === step ? { boxShadow: DOOR_CHOSEN_RING } : undefined}
            >
              {step < 60
                ? `${step} ${t('kids.min', 'min')}`
                : `${step / 60} ${step === 60 ? t('kids.hour', 'hour') : t('kids.hours', 'hours')}`}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-surface-700">
          {wantMinutes === null
            ? t('kids.noClockWhy', 'They can stay as long as they like. The allowance still stops at the number you pick below.')
            : t('kids.clockWhy', 'The clock starts the moment you hand it over below. When it runs out the room closes itself and asks for a grown-up — and nothing can be made past that point even if credits are left.')}
        </p>
      </div>

      {/* ── This sitting, where there is one ─────────────────────
          Only once a room is open with a clock on it. */}
      {state?.open && state.minutes ? (
        <div className={`${GLASS} space-y-3 p-4 sm:p-5`} data-kidssitting style={{ boxShadow: DOOR_GLASS_RING }}>
          <p className="fb-kids-bubble text-lg text-surface-950" style={{ textShadow: DOOR_TEXT_GLOW.mint }}>
            {state.secondsLeft && state.secondsLeft > 0
              ? `${t('kids.leftNow', 'Left in this sitting')}: ${asClock(state.secondsLeft)}`
              : t('kids.sittingOver', 'This sitting is over. They are out until you let them back in.')}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              data-kidsagain
              disabled={busy}
              onClick={() => void clockIt(true)}
              className="fb-kids-bouncy min-h-[52px] rounded-2xl border-2 border-emerald-300 bg-emerald-500 px-5 text-base font-black text-onAccent disabled:opacity-50"
              style={{ boxShadow: DOOR_CHOSEN_RING }}
            >
              {t('kids.another', 'Another {n} minutes').replace('{n}', String(state.minutes))}
            </button>
            {(state.secondsLeft ?? 0) > 0 && (
              <button
                type="button"
                data-kidsstop
                disabled={busy}
                onClick={() => void clockIt(false)}
                className="fb-kids-bouncy min-h-[52px] rounded-2xl border-2 border-cyan-400/60 bg-surface-100/80 px-5 text-base font-black text-surface-950 disabled:opacity-50"
              >
                {t('kids.stopNow', 'That is enough for now')}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* ── The choice, which is the hand-over ───────────────────────────
          In songs rather than in credits, because that is the unit a parent
          can price. The press is the hand-over: it sets the allowance, starts
          the clock chosen above, and opens the room. */}
      <div className={`${GLASS} space-y-3 p-4 sm:p-5`} style={{ boxShadow: DOOR_GLASS_RING }}>
        <h3 className={HEAD} style={{ textShadow: DOOR_TEXT_GLOW.mint }}>
          <span aria-hidden>🚀</span>
          {t('kids.howMuch', 'How much may they spend?')}
        </h3>
        {fail && (
          <p
            data-kidsfail
            role="alert"
            className="rounded-2xl border-2 border-rose-400/70 bg-rose-500/15 px-4 py-3 text-sm leading-relaxed text-surface-950"
          >
            {fail}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {ALLOWANCE_STEPS.map((step) => {
            const chosen = chosenStep === step;
            return (
              <button
                key={step}
                disabled={busy || state?.signedIn === false}
                onClick={() => void give(step)}
                aria-pressed={Boolean(chosen)}
                data-kidsstep={step}
                className={`fb-kids-bouncy flex min-h-[76px] items-center justify-between gap-3 rounded-3xl border-2 px-4 py-3 text-left transition-all disabled:opacity-50 ${
                  chosen
                    ? 'border-emerald-300 bg-emerald-500 text-onAccent'
                    : 'border-emerald-400/70 bg-surface-100/80 text-surface-950 hover:border-emerald-300'
                }`}
                style={{ boxShadow: chosen ? DOOR_CHOSEN_RING : DOOR_GLASS_RING }}
              >
                <span className="min-w-0">
                  <span className={`fb-kids-bubble block text-2xl leading-none ${chosen ? 'text-onAccent' : 'text-emerald-300'}`} style={chosen ? undefined : { textShadow: DOOR_TEXT_GLOW.pink }}>
                    {step} {t('kids.credits', 'credits')}
                  </span>
                  <span className={`mt-1.5 block text-sm font-bold ${chosen ? 'text-onAccent' : 'text-surface-900'}`}>
                    {[
                      ...KID_PRICES.filter((one) => one.ready).map((one) => {
                        const many = howMany(step, one.id);
                        const words = MANY[one.id];
                        return `${many} ${t(`${words[0]}${many === 1 ? '' : 's'}`, many === 1 ? words[1] : words[2])}`;
                      }),
                    ].join(t('kids.or', ' or '))}
                  </span>
                  <span className={`mt-1 block text-xs font-black uppercase tracking-widest ${chosen ? 'text-onAccent' : 'text-emerald-200'}`}>
                    {chosen ? t('kids.handedOver', 'Handed over') : t('kids.handOver', 'Hand it over')}
                  </span>
                </span>
                {chosen ? (
                  <Check className="h-7 w-7 flex-shrink-0" />
                ) : (
                  <span className="text-3xl" aria-hidden>🔓</span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs leading-relaxed text-surface-700">
          {t(
            'kids.steps',
            'The steps are whole songs, so nothing is left over that buys nothing.',
          )}{' '}
          {t('kids.songIs', 'One song is')} {songPrice} {t('kids.credits', 'credits')}.
        </p>
      </div>

      {/* ── The shelves, where a grown-up can take one off ─────────────── */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className={`${GLASS} space-y-2 p-4 sm:p-5`} style={{ boxShadow: DOOR_GLASS_RING }}>
          <h3 className={HEAD} style={{ textShadow: DOOR_TEXT_GLOW.mint }}>
            <span aria-hidden>📖</span>
            {t('kids.shelfTitle', 'Stories on this device')}
          </h3>
          <StoryShelf grownUp />
        </div>
        <div className={`${GLASS} space-y-2 p-4 sm:p-5`} style={{ boxShadow: DOOR_GLASS_RING }}>
          <h3 className={HEAD} style={{ textShadow: DOOR_TEXT_GLOW.mint }}>
            <span aria-hidden>🎵</span>
            {t('kids.songsKept', 'Songs this child has kept')}
          </h3>
          <SongShelf grownUp />
        </div>
      </div>

      {/* ── Where it stands ──────────────────────────────────────────── */}
      <div className={`${GLASS} p-4 sm:p-5`} data-kidsstanding style={{ boxShadow: DOOR_GLASS_RING }}>
        {state === null ? (
          <p className="flex items-center gap-2 text-sm text-surface-800">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
            {t('kids.asking', 'Asking where the allowance stands…')}
          </p>
        ) : state.open ? (
          <div className="space-y-3">
            <p className="fb-kids-bubble flex items-center gap-2 text-lg text-cyan-300" style={{ textShadow: DOOR_TEXT_GLOW.mint }}>
              <Lock className="h-5 w-5" />
              {t('kids.on', 'The room is open for a child.')}
            </p>
            <p className="text-base text-surface-900">
              {t('kids.leftOf', 'Left:')}{' '}
              <span className="fb-kids-bubble text-2xl text-amber-300" style={{ textShadow: DOOR_TEXT_GLOW.gold }}>{state.left}</span>{' '}
              {t('kids.of', 'of')} {state.allowance} {t('kids.credits', 'credits')}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void end()}
              data-kidsend
              className="fb-kids-bouncy flex min-h-[52px] items-center gap-2 rounded-2xl border-2 border-cyan-400/60 bg-surface-100/80 px-5 text-base font-black text-surface-950 disabled:opacity-50"
            >
              <Unlock className="h-5 w-5" />
              {t('kids.end', 'I have the phone back')}
            </button>
          </div>
        ) : (
          <p className="text-sm font-medium text-surface-800">
            {t('kids.off', 'No allowance is set, so nothing is capped. Pick one above.')}
          </p>
        )}
      </div>
    </div>
  );
}
