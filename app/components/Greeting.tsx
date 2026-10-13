'use client';

/**
 * The door into the studio.
 *
 * ── Why there is a screen before the work ────────────────────────────────
 *
 * The studio used to open straight onto Make a song with a rail of thirteen
 * rooms down the side. For somebody who signed in yesterday that is fine. For
 * somebody who signed in for the first time it is a wall of choices with
 * nothing addressed to them, and the most common thing that happens next is
 * that they read the rail, learn nothing, and close the tab.
 *
 * This is one screen with their name on it, their own face if they put one on
 * their channel, one thing worth doing next, and a handful of large buttons
 * into the rooms. It costs one press for somebody who knows where they are
 * going, and it is the difference between arriving and being dropped for
 * somebody who does not.
 *
 * It is shown on a page load rather than on every tab switch, because a
 * greeting you have to dismiss twenty times a day stops being a greeting.
 *
 * ── What it knows, and where that came from ──────────────────────────────
 *
 * "Another dubstep song today?" needs to know they make dubstep. Nothing here
 * tracks anybody to find that out — `lib/habits.ts` reads it off the songs in
 * their own library and the things already recorded in their own history, both
 * of which are on this device for other reasons. Nothing new is stored,
 * nothing is sent anywhere, and the screen says so in one line rather than
 * leaving somebody to wonder how it knew.
 *
 * The thresholds live in `habits.ts` and matter more than they look: a
 * greeting that claims a preference off a single song is worse than one that
 * claims nothing. Where there is no habit, this says something true and
 * general instead — see `check:habits`.
 */

import React, { useEffect, useState } from 'react';
import {
  Sparkles, Sliders, Mic, Video, Clapperboard, Smartphone, ListMusic,
  Handshake, Radio, Mic2, AudioWaveform, Megaphone, Palette, ArrowRight, Scissors,
  Image as ImageIcon, Baby,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { habitOf, suggest, partOfDay, type Habit } from '../lib/habits';
import { loadTracks } from '../lib/library';
import { loadMakes } from '../lib/makes';
import { fetchCreator } from '../lib/radar';
import { loadTaste } from '../lib/taste';
import { publicUrl } from '../lib/avatar';
import { STAGES, standaloneSurfaces, surfacesInStage, type SurfaceId } from '../lib/surfaces';
import Cover from './Cover';
import ThemeSwitch from './ThemeSwitch';

/** `{name}` and friends, filled in. `t()` returns whole sentences per language. */
function fill(text: string, into: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => into[key] ?? whole);
}

/* The same rooms the rail carries, under the same `rail.*` names, so a room
   cannot be called one thing here and another six pixels to the left. */
const ICONS: Record<SurfaceId, typeof Sparkles> = {
  make: Sparkles,
  studio: Sliders,
  booth: Mic,
  canvas: Clapperboard,
  videoedit: Scissors,
  photo: ImageIcon,
  hooks_feed: Smartphone,
  channels: ListMusic,
  collab: Handshake,
  live: Radio,
  voice_studio: Mic2,
  podcast: Radio,
  sound: AudioWaveform,
  campaign: Megaphone,
  albumart: Palette,
};

const RAIL_KEY: Record<SurfaceId, string> = {
  make: 'rail.make',
  studio: 'rail.studio',
  booth: 'rail.booth',
  canvas: 'rail.canvas',
  videoedit: 'rail.videoedit',
  photo: 'rail.photo',
  hooks_feed: 'rail.hooks',
  channels: 'rail.channel',
  collab: 'rail.collab',
  live: 'rail.live',
  voice_studio: 'rail.voice',
  podcast: 'rail.podcast',
  sound: 'rail.sound',
  campaign: 'rail.campaign',
  albumart: 'rail.albumart',
};

/**
 * The short way in.
 *
 * Six, not thirteen. The rail beside this already lists all of them; repeating
 * the rail here would make this a second rail rather than a door. These are one
 * per stage of the work — write it, shape it, sing it, film it, release it,
 * sell it — so the row is also a sentence about what this place is for.
 */
/* Every room, not six of them.

   This screen offered a handful and then said "every other room is inside the
   studio, in the list down the side" — which is true on a desk and false on a
   phone, where there is no side and no list. So somebody arriving here could
   reach six of thirteen and had to be told where the rest were rather than
   shown.

   Grouped under the same stage headings the rail uses, in the same order, from
   the same registry: a room cannot be called one thing here and another six
   pixels to the left. */

export default function Greeting({
  onGo,
  onClose,
  name: fromAccount,
}: {
  readonly onGo: (id: SurfaceId) => void;
  readonly onClose?: () => void;
  /**
   * The name the account already knows, used when the channel has none.
   *
   * The greeting read only the channel's `name`, which is blank until somebody
   * fills their channel in — so the first thing a new account saw was "Hello!"
   * addressed to nobody, which is the one thing this screen exists not to do.
   */
  readonly name?: string;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [handle, setHandle] = useState('');

  useEffect(() => {
    let live = true;
    /* The songs and the history are on this device and answer at once; the
       name and the picture are a round trip. Both are set together so the
       greeting never renders as "Hello!" and then jumps to "Hello, Carli!" —
       a name that arrives late reads worse than one that arrives whole. */
    void (async () => {
      /* Both at once. The account's counts are what make this follow somebody
         to a second device; the device's own history is what answers for
         anybody signed out, or for an app with no accounts behind it. */
      const [creator, taste] = await Promise.all([
        fetchCreator().catch(() => null),
        loadTaste(),
      ]);
      if (!live) return;
      /* Their channel name first, because it is the one they chose. The
         account's name behind it, because a greeting with no name is worse
         than one using the name they signed up with. */
      setHabit(
        habitOf(loadTracks(), loadMakes(), creator?.name || fromAccount || '', taste.lines),
      );
      setHandle(creator?.handle ?? '');
      setPhoto(creator?.avatar_path ? publicUrl(creator.avatar_path) : null);
    })();
    return () => {
      live = false;
    };
  }, [fromAccount]);

  const said = habit ? suggest(habit) : null;
  const roomName = (id: SurfaceId) => t(RAIL_KEY[id]);

  const ask = (): string => {
    if (!said) return '';
    if (said.kind === 'first') return t('hello.ask.first', 'Let’s make your first song.');
    if (said.kind === 'genre') {
      return fill(t('hello.ask.genre', 'Another {genre} song today?'), { genre: said.genre });
    }
    if (said.kind === 'room') {
      return fill(t('hello.ask.room', 'Back to {room}?'), { room: roomName(said.room) });
    }
    return t('hello.ask.again', 'Another song today?');
  };

  const welcome = (): string => {
    if (!habit) return '';
    if (!habit.returning) return t('hello.first', 'Welcome to FutureBox.');
    const when = partOfDay(new Date());
    return t(
      `hello.back.${when}`,
      when === 'morning'
        ? 'Good morning — welcome back to FutureBox.'
        : when === 'afternoon'
          ? 'Good afternoon — welcome back to FutureBox.'
          : 'Good evening — welcome back to FutureBox.',
    );
  };

  /**
   * One room.
   *
   * ── Why every card is the same width ─────────────────────────────────
   *
   * One grid, four columns, for every stage — not a row the cards grow to
   * fill. Two versions of that were tried and both were worse:
   *
   *   grow, uncapped   five rooms came out as four across and then the Sound
   *                    trainer alone, stretched over the whole width, three
   *                    times the size of Make a song beside it
   *   grow, capped     less absurd, but a card in a row of two was still half
   *                    again the width of a card in a row of four
   *
   * Both made a card's SIZE read as its importance, when the size was only an
   * accident of how many rooms happen to sit in that stage. Every room here is
   * one press and one destination; none is grander than another, and they
   * should not look it.
   *
   * So the width is fixed and the right edge goes ragged where five or one do
   * not divide by four. A row that is not full reads as a row that is not
   * full. That is the honest shape and it is the calmer one.
   *
   * ── Why the icon sits in a tile ──────────────────────────────────────
   *
   * Thirteen line icons in one weight and one colour told nobody anything —
   * they read as decoration beside the name rather than as a mark for the
   * room. A tinted tile gives each one an edge and a footprint, which is what
   * makes a list of rooms scannable instead of readable.
   *
   * ── And why the hint is two lines ────────────────────────────────────
   *
   * It was `truncate`, and the Sound trainer's line came out as "Train your
   * sound and vibe, and …" — cut mid-sentence on the first screen anybody
   * sees. Two lines with a floor under the block, so every card in a row is
   * the same height whether its hint runs to one line or two.
   */
  const QuickButton = ({ id }: { readonly id: SurfaceId }): React.ReactElement => {
    const Icon = ICONS[id];
    return (
      <button
        type="button"
        onClick={() => onGo(id)}
        /* Light, transparent green, with a real edge on it. Carli, 13
           September 2026: "Die buttons daar soos make a song, booth ens. moet
           'n ligte transparent groen button he, maar weereens met definition,
           en classy so dat dit lyk soos 'n knoppie."

           A seventh of the accent, not a fill: on the dark theme it reads as
           tinted glass and on the light one as the faintest wash, and the
           words on top keep the contrast they were measured at. The edge does
           the work — a quarter-strength emerald line is visible on both pages
           where `zinc-800` disappeared into the light one entirely.

           The raised surface comes from `globals.css`, which gives it to every
           boxed button in the app rather than to this one. */
        className="group relative min-h-[44px] w-full rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3.5 text-left transition-all hover:border-emerald-400/60 hover:bg-emerald-500/[0.14] hover:shadow-[0_0_20px_rgba(16,185,129,0.18)] focus-visible:border-emerald-500 flex items-start gap-3 backdrop-blur-sm"
      >
        <span className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all group-hover:border-emerald-400/60 group-hover:bg-emerald-500/25 group-hover:scale-105">
          <Icon className="h-[18px] w-[18px] text-emerald-400" />
        </span>
        <span className="min-w-0 flex-1">
          {/* Wraps. It was `truncate`, and two rooms out of eleven had names
              longer than half a 390-pixel screen: Carli's photograph shows
              "Sound trai…" and "Make a so…" on a door whose whole job is to
              say what each room is.

              The line under it already wraps to four lines, so a name on two
              is no surprise to the card's shape. `check:notcut` did not see
              this because it walks the ROOMS and the door is not one — the
              same subset fault this repo keeps finding, and the check is
              wider now. */}
          {/* `break-words` on top of the wrapping.
 
              Wrapping happens between WORDS, and Afrikaans builds compounds:
              `Videolessenaar` is one fourteen-letter word with nowhere to
              break, so it did not wrap — it ran ten pixels out of the card,
              which is what Carli photographed. English never showed it
              because "Video desk" is two words.
 
              `break-words` breaks a word only when it has to, so nothing
              that already fits changes shape. Found by the fit measuring in
              `audit/afrikaans.mjs`, which walks both languages and compares
              the same box in each. */}
          <span className="block break-words text-sm font-black leading-tight text-white group-hover:text-emerald-300 transition-colors">
            {roomName(id)}
          </span>
          {/* The floor under the line is what keeps a row of cards the same
              height when one hint is a word and the next is a sentence. It
              is dropped on a card that has stretched across the row, where
              there is nothing beside it to line up with — see the grid. */}
          <span
            data-roomhint
            className="mt-0.5 block min-h-[2rem] text-xs leading-snug text-zinc-400"
          >
            {t(`${RAIL_KEY[id]}.hint`)}
          </span>
        </span>
      </button>
    );
  };

  return (
    /* Wider than the 48rem it was. This screen is a grid of rooms, not a
       column of prose, so the reading-width rule that governs an article does
       not apply — at 48rem the cards sat in a narrow strip with a third of the
       window empty on either side, which reads as a phone layout stretched
       onto a desktop. */
    <div className="mx-auto w-full max-w-5xl space-y-7 py-2">
      {/* ── Who they are, and where they are ─────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-zinc-900/90 to-zinc-950 p-6 md:p-8 shadow-[0_0_50px_rgba(16,185,129,0.12)]">
        {/* Glow orb */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-neon-192.png" alt="" aria-hidden="true" className="w-8 h-8 rounded-lg ring-1 ring-emerald-500/30" />
            <span className="text-base font-black tracking-tight text-white">FutureBox</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Pro Studio Edition
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-zinc-400">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-semibold text-zinc-300">DeepMind & Vertex AI</span>
            </div>
            {/* Dark or light, right here on the home page — her ask of 13
                October 2026, so nobody has to find the theme studio first. */}
            <ThemeSwitch />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-4 md:flex-nowrap">
          {/* Their own face if they put one on their channel, and the
              generated cover if not — never a grey silhouette, which reads as
              something failing to load. Same rule as the channel itself. */}
          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border border-emerald-500/40 ring-2 ring-emerald-500/20 md:h-16 md:w-16 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt={habit?.name ? habit.name : t('photo.alt', 'Your profile picture')}
                className="w-full h-full object-cover"
              />
            ) : (
              <Cover seed={handle || 'futurebox'} label={habit?.name || 'FutureBox'} className="w-full h-full" />
            )}
          </div>

          {/* Held at a fixed height while the name is fetched, so the row does
              not grow under the reader's eye a quarter-second in. */}
          <div className="min-w-0 flex-1 min-h-[68px] flex flex-col justify-center">
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight truncate tracking-tight">
              {habit
                ? habit.name
                  ? fill(t('hello.hi', 'Hello, {name}!'), { name: habit.name })
                  : t('hello.hiNoName', 'Hello!')
                : ' '}
            </h2>
            <p className="text-sm md:text-base text-zinc-300 leading-snug">{welcome()}</p>
          </div>
        </div>

        {/* ── The one thing worth doing next ─────────────────────────────── */}
        {said && (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base font-bold leading-snug text-emerald-300 md:text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>{ask()}</span>
            </p>
            <button
              type="button"
              onClick={() => onGo(said.room)}
              className="min-h-[44px] w-full flex-shrink-0 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-onAccent font-extrabold inline-flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:opacity-95 transition-all sm:w-auto hover:scale-[1.02]"
            >
              {roomName(said.room)}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>


      {/* ── The kids room, where it cannot be missed ───────────────────── */}
      <a
        href="/kids"
        data-kidsdoorhome
        className="group relative overflow-hidden flex min-h-[44px] flex-col items-stretch rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-950/20 to-zinc-950 px-5 py-4 transition-all hover:border-amber-400/80 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]"
      >
        {/* Her picture, 13 October 2026, one per language. */}
        <img
          src={lang === 'af' ? '/kids/banner-af.jpg' : '/kids/banner-en.jpg'}
          alt=""
          aria-hidden="true"
          className="block aspect-[2000/520] w-full object-cover"
          loading="lazy"
        />
        <span className="flex items-center gap-4 p-4">
        <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl border border-amber-500/50 bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-transform group-hover:scale-105">
          <Baby className="h-6 w-6 text-amber-300" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="block text-base font-black leading-tight text-white">
              {t('hello.kids', 'The kids room')}
            </span>
            <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
              Safe Studio
            </span>
          </span>
          <span className="block pt-0.5 text-xs leading-snug text-zinc-300">
            {t('hello.kidsHint', 'Set an allowance and a clock, then hand the phone over. Two presses in there: a song, and a video of it.')}
          </span>
        </span>
        <ArrowRight className="h-5 w-5 flex-shrink-0 text-amber-300 transition-transform group-hover:translate-x-1.5" />
        </span>
      </a>

      {/* ── Or straight to a room ────────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="text-sm font-bold text-zinc-300 tracking-wide">
          {t('hello.rooms', 'Or go straight to')}
        </p>
        {STAGES.map((stage) => (
          <div key={stage.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">
                {lang === 'af' ? stage.af : stage.en}
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 via-zinc-800 to-transparent" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4 [&>:last-child:nth-child(odd)]:col-span-2 [&>:last-child:nth-child(odd)]:py-2.5 [&>:last-child:nth-child(odd)_[data-roomhint]]:min-h-0 md:[&>:last-child:nth-child(odd)]:col-span-1 md:[&>:last-child:nth-child(odd)]:py-3.5 md:[&>:last-child:nth-child(odd)_[data-roomhint]]:min-h-[2rem]">
              {surfacesInStage(stage.id).map((id) => (
                <QuickButton key={id} id={id} />
              ))}
            </div>
          </div>
        ))}
        {standaloneSurfaces().length > 0 && (
          <div className="grid grid-cols-2 gap-2.5 pt-1 md:grid-cols-3 lg:grid-cols-4 [&>:last-child:nth-child(odd)]:col-span-2 [&>:last-child:nth-child(odd)]:py-2.5 [&>:last-child:nth-child(odd)_[data-roomhint]]:min-h-0 md:[&>:last-child:nth-child(odd)]:col-span-1 md:[&>:last-child:nth-child(odd)]:py-3.5 md:[&>:last-child:nth-child(odd)_[data-roomhint]]:min-h-[2rem]">
            {standaloneSurfaces().map((id) => (
              <QuickButton key={id} id={id} />
            ))}
          </div>
        )}
      </div>

      {/* A way past it that is not a room, for somebody who came to read the
          feed rather than to make something. */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] w-full sm:w-auto rounded-xl border border-emerald-500/25 bg-zinc-950/70 px-5 py-2.5 text-sm font-bold text-zinc-300 hover:border-emerald-400/60 hover:text-emerald-300 transition-all shadow-sm"
        >
          {t('hello.skip', 'Not now — take me to the feed')}
        </button>
      )}


      {/* ── What used to be printed here ──────────────────────────────────

          A paragraph explaining where the suggestion came from: what is
          counted, that it follows the account rather than the device, and
          that it can be cleared. All of it true, and none of it wanted on
          this screen.

          Carli, 14 September 2026, with a photograph of it: "Haal daai fyn
          skrif uit op die make a song room." It sat under the doors as six
          lines of grey type on the one screen that is supposed to be a set
          of choices, and it read as terms rather than as an answer.

          The disclosure itself is worth keeping — this was an argument
          about where it is printed, not about whether it is true — and the
          account screen is where the counting is also cleared, so that is
          where it went. It says what is counted in its own words there
          (`account.tasteNote`), next to the button that clears it: a notice
          you cannot act on is a notice, and one beside `Forget` is an
          answer.

          The two strings this screen used, `hello.basis` and
          `hello.basisAccount`, are gone from the dictionary with it. They
          sat there unused for three days, saying the same thing less well
          than the account screen does, and a dead string is an invitation
          to print it again somewhere. `check:finepr` holds both halves. */}
    </div>
  );
}
