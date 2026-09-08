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
  Handshake, Radio, Mic2, AudioWaveform, Megaphone, ArrowRight,
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
  hooks_feed: Smartphone,
  channels: ListMusic,
  collab: Handshake,
  live: Radio,
  voice_studio: Mic2,
  podcast: Radio,
  sound: AudioWaveform,
  campaign: Megaphone,
};

const RAIL_KEY: Record<SurfaceId, string> = {
  make: 'rail.make',
  studio: 'rail.studio',
  booth: 'rail.booth',
  canvas: 'rail.canvas',
  hooks_feed: 'rail.hooks',
  channels: 'rail.channel',
  collab: 'rail.collab',
  live: 'rail.live',
  voice_studio: 'rail.voice',
  podcast: 'rail.podcast',
  sound: 'rail.sound',
  campaign: 'rail.campaign',
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
        className="group min-h-[44px] w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3.5 text-left transition-colors hover:border-emerald-500/60 hover:bg-zinc-900 focus-visible:border-emerald-500 flex items-start gap-3"
      >
        <span className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 transition-colors group-hover:border-emerald-500/50 group-hover:bg-emerald-500/15">
          <Icon className="h-[18px] w-[18px] text-emerald-400" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold leading-tight text-white">
            {roomName(id)}
          </span>
          <span className="mt-0.5 block min-h-[2rem] text-xs leading-snug text-zinc-500">
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
      {/* Tighter than it was, and laid out as one row on a wide screen.

          It held a mark, a name, a line and a button in a box with 2rem of
          padding, and on a desktop it came out as a large panel that was
          mostly empty — the first thing anybody sees, saying very little with
          a great deal of room. The parts have not changed; the space around
          them has, and the call to action now sits beside the name rather than
          under a gap. */}
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-emerald-500/10 via-zinc-900/70 to-zinc-950 p-5 md:p-6">
        <div className="mb-5 flex items-center gap-3">
          {/* The mark, so the screen says which place this is before it says
              anything about the person. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" aria-hidden="true" className="w-8 h-8 rounded-lg" />
          <span className="text-base font-black tracking-tight text-white">FutureBox</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-4 md:flex-nowrap">
          {/* Their own face if they put one on their channel, and the
              generated cover if not — never a grey silhouette, which reads as
              something failing to load. Same rule as the channel itself. */}
          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border border-zinc-800 md:h-16 md:w-16">
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
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight truncate">
              {habit
                ? habit.name
                  ? fill(t('hello.hi', 'Hello, {name}!'), { name: habit.name })
                  : t('hello.hiNoName', 'Hello!')
                : ' '}
            </h2>
            <p className="text-sm md:text-base text-zinc-400 leading-snug">{welcome()}</p>
          </div>
        </div>

        {/* ── The one thing worth doing next ─────────────────────────────── */}
        {/* On a wide screen the prompt and its button sit on one line, the
            sentence to the left and the button hard right. Stacked, they left
            a band of empty card to the right of a short sentence, which is the
            largest piece of nothing on the first screen anybody sees. */}
        {said && (
          <div className="mt-5 flex flex-col gap-3 border-t border-zinc-800/80 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base font-semibold leading-snug text-emerald-300 md:text-lg">{ask()}</p>
            <button
              type="button"
              onClick={() => onGo(said.room)}
              className="min-h-[44px] w-full flex-shrink-0 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold inline-flex items-center justify-center gap-2 sm:w-auto"
            >
              {/* The room's own name, not "Open <name>".

                  Every room here is already named with a verb — "Make a song",
                  "Maak ’n liedjie" — so a verb in front of it read "Open Make a
                  song" in English and "Maak Maak ’n liedjie oop" in Afrikaans.
                  The name and an arrow say the same thing and cannot collide
                  with a name whatever it turns out to be. */}
              {roomName(said.room)}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Or straight to a room ────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-zinc-300">
          {t('hello.rooms', 'Or go straight to')}
        </p>
        {STAGES.map((stage) => (
          <div key={stage.id} className="space-y-2.5">
            {/* The label with a rule running out from it. The stages are a
                real sequence — make it, show it, put it out, sell it — and a
                line of grey capitals on its own did not read as a section
                heading at all; it read as a caption on the row below. */}
            <div className="flex items-center gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                {lang === 'af' ? stage.af : stage.en}
              </p>
              <span className="h-px flex-1 bg-zinc-800" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
              {surfacesInStage(stage.id).map((id) => (
                <QuickButton key={id} id={id} />
              ))}
            </div>
          </div>
        ))}
        {standaloneSurfaces().length > 0 && (
          <div className="grid grid-cols-2 gap-2.5 pt-1 md:grid-cols-3 lg:grid-cols-4">
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
          className="min-h-[44px] w-full sm:w-auto rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-sm font-semibold text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
        >
          {t('hello.skip', 'Not now — take me to the feed')}
        </button>
      )}


      {/* ── How it knew ──────────────────────────────────────────────────── */}
      {habit?.returning && (
        <p className="text-xs text-zinc-600 leading-relaxed">
          {habit.source === 'account'
            ? t(
                'hello.basisAccount',
                'This is read off what you have made here — how often, and what kind, kept against your account so it follows you to another device. Not a record of when you work: a count per kind, and nothing else. You can clear it on your account screen.',
              )
            : t(
                'hello.basis',
                'What is suggested here is read off the songs in your own library and what you have made before, both of which are already on this device. Nothing extra is recorded and nothing about it is sent anywhere.',
              )}
        </p>
      )}
    </div>
  );
}
