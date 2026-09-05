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
  video: Video,
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
  video: 'rail.video',
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

  const QuickButton = ({ id }: { readonly id: SurfaceId }): React.ReactElement => {
    const Icon = ICONS[id];
    return (
      <button
        type="button"
        onClick={() => onGo(id)}
        className="min-h-[44px] rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3.5 text-left hover:border-emerald-500/60 hover:bg-zinc-900 flex items-center gap-3"
      >
        <Icon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-white leading-tight truncate">
            {roomName(id)}
          </span>
          <span className="block text-xs text-zinc-500 leading-snug truncate">
            {t(`${RAIL_KEY[id]}.hint`)}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 py-2">
      {/* ── Who they are, and where they are ─────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-emerald-500/10 via-zinc-900/70 to-zinc-950 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          {/* The mark, so the screen says which place this is before it says
              anything about the person. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" aria-hidden="true" className="w-8 h-8 rounded-lg" />
          <span className="text-base font-black tracking-tight text-white">FutureBox</span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Their own face if they put one on their channel, and the
              generated cover if not — never a grey silhouette, which reads as
              something failing to load. Same rule as the channel itself. */}
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-zinc-800">
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
        {said && (
          <div className="mt-6 space-y-2">
            <p className="text-base md:text-lg font-semibold text-emerald-300 leading-snug">{ask()}</p>
            <button
              type="button"
              onClick={() => onGo(said.room)}
              className="min-h-[44px] w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold inline-flex items-center justify-center gap-2"
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
          <div key={stage.id} className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              {lang === 'af' ? stage.af : stage.en}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
              {surfacesInStage(stage.id).map((id) => (
                <QuickButton key={id} id={id} />
              ))}
            </div>
          </div>
        ))}
        {standaloneSurfaces().length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
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
