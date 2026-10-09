'use client';

/**
 * The room a child plays in.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Ek dink die child funksie is net om met liedjie
 * maak te speel - en dalk om die liedjie 'n video te maak."* Then: *"Let the
 * parent give an allowance on an opening page."* Then: *"Gaan aan met die
 * kids kamer."*
 *
 * ── Why this room has no way out of itself ───────────────────────────────
 *
 * `check:kidsafe` measured in October which rooms a child could be left
 * alone in, and the finding that shaped all of this is that the FREE rooms
 * are not the SAFE rooms: the collab room costs nothing and puts a child in
 * a conversation with strangers, the art market costs nothing and is a shop.
 * So a child-friendly version was never going to be "hide some tabs on the
 * rail" — it is one room with nothing else reachable from it.
 *
 * There is therefore no rail in here, no library, no share sheet and no
 * download. The only link out is the grown-up's own page, and
 * `check:kinderkamer` holds that: it reads this file for anything that
 * navigates and fails on a second one.
 *
 * ── Why every choice is a button and nothing is typed ───────────────────
 *
 * A text box is a child typing anything into a prompt that reaches a music
 * model and a video model. The moderation gate would catch the worst of it,
 * and "the gate caught it" is not a thing to design a child's room around.
 * Six things to sing about and four kinds of music means every possible
 * press is one somebody chose on purpose — and it is simply better for a
 * six-year-old, because a blank box is a room with nothing in it.
 *
 * ── Why the allowance is re-asked after every press ─────────────────────
 *
 * Because the number on screen is the one thing a child will believe. The
 * limit itself is applied in `charge()` and is true whatever this page
 * thinks — see `lib/server/kidsmode.ts` — but a room still showing four
 * songs left after three have been made is a room that is about to
 * disappoint somebody. So the room asks the server again rather than
 * subtracting its own guess.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Cake, CloudRain, Dog, Film, Guitar, Heart, Loader2, Moon, Music, Rocket, ShieldCheck,
  Smile, Sparkles, Waves,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import KidsDoor from './KidsDoor';
import StoryShelf from './StoryShelf';
import SongShelf from './SongShelf';
import { kidsNow, type KidsState } from '../lib/kidsdoor';
import { MOST_SONGS, keepSong } from '../lib/songkeep';
import { howMany, priceOf } from '../lib/kidsallowance';
import {
  KID_SOUNDS, KID_TOPICS, askKidVideo, makeKidSong, startKidVideo,
} from '../lib/kidsong';

/** A picture a child can tell apart at a glance, per choice. */
const FACES: Record<string, React.ReactNode> = {
  dog: <Dog className="h-8 w-8" />,
  space: <Rocket className="h-8 w-8" />,
  birthday: <Cake className="h-8 w-8" />,
  sea: <Waves className="h-8 w-8" />,
  rain: <CloudRain className="h-8 w-8" />,
  brave: <ShieldCheck className="h-8 w-8" />,
  happy: <Smile className="h-7 w-7" />,
  quiet: <Moon className="h-7 w-7" />,
  rock: <Guitar className="h-7 w-7" />,
  dance: <Music className="h-7 w-7" />,
};

function Big({
  on,
  face,
  label,
  onPick,
  off = false,
}: {
  readonly on: boolean;
  readonly face: React.ReactNode;
  readonly label: string;
  readonly onPick: () => void;
  readonly off?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={off}
      aria-pressed={on}
      /* 76 rather than the app's 44. These are pressed by a small hand that
         is not aiming carefully, and the room has nothing else in it to make
         space for. */
      className={`flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 disabled:opacity-40 ${
        on
          ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
          : 'border-zinc-700 bg-zinc-900/60 text-zinc-300'
      }`}
    >
      {face}
      <span className="w-full truncate text-center text-xs font-bold">{label}</span>
    </button>
  );
}

export default function KidsRoom(): React.ReactElement {
  const { t } = useLang();
  const [state, setState] = useState<KidsState | null>(null);
  /* The grown-up's page, reached on purpose rather than by going back. */
  const [atDoor, setAtDoor] = useState(false);

  const [topic, setTopic] = useState('');
  const [sound, setSound] = useState('');
  const [busy, setBusy] = useState<'' | 'song' | 'video'>('');
  const [says, setSays] = useState('');
  const [song, setSong] = useState('');
  /* The song itself, not only its address. An object URL cannot be stored —
     it is a handle into this tab — so keeping one would save a row that
     opens to nothing tomorrow. The story shelf shipped with exactly that
     bug and it was caught by driving what the room puts in. */
  const [songBlob, setSongBlob] = useState<Blob | null>(null);
  const [kept, setKept] = useState(false);
  const [shelfAgain, setShelfAgain] = useState(0);
  const [job, setJob] = useState<string | null>(null);
  const [film, setFilm] = useState('');

  /* The last object URL handed out, revoked when another replaces it. Without
     this every attempt at a song leaks a minute of audio for as long as the
     room is open, and a child makes a lot of attempts. */
  const held = useRef<string>('');

  useEffect(() => { void kidsNow().then(setState); }, []);
  useEffect(() => () => { if (held.current) URL.revokeObjectURL(held.current); }, []);

  /* Asking how the video is going. Only ever asks — nothing here spends, so a
     reload mid-wait costs nothing and loses only the waiting. */
  useEffect(() => {
    if (!job) return undefined;
    let stopped = false;
    const ask = async (): Promise<void> => {
      const answer = await askKidVideo(job);
      if (stopped || !answer) return;
      if ('url' in answer) {
        setFilm(answer.url);
        setJob(null);
        setSays(t('kids.filmDone', 'Your video is ready!'));
      } else {
        setJob(null);
        setSays(answer.says);
      }
      void kidsNow().then(setState);
    };
    void ask();
    const every = window.setInterval(() => { void ask(); }, 5_000);
    return () => { stopped = true; window.clearInterval(every); };
  }, [job, t]);

  if (state === null) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('kids.asking', 'Asking where the allowance stands…')}
      </p>
    );
  }

  /* No allowance set, or a grown-up asked for the door: the door. It is the
     same component the opening page uses, so there is one place an allowance
     is given and one place it is ended. */
  if (!state.open || atDoor) {
    return (
      <div className="space-y-4">
        <KidsDoor onIn={(next) => { setState(next); setAtDoor(false); }} />
        {state.open && (
          <div className="mx-auto w-full max-w-3xl px-5 pb-8">
            <button
              type="button"
              onClick={() => setAtDoor(false)}
              className="min-h-[44px] rounded-xl border border-zinc-700 px-4 text-sm font-bold text-zinc-200"
            >
              {t('kids.backIn', 'Back to the music')}
            </button>
          </div>
        )}
      </div>
    );
  }

  const left = state.left ?? 0;
  const songPrice = priceOf('song');
  const videoPrice = priceOf('video');
  const songsLeft = howMany(left, 'song');
  const canSong = Boolean(topic) && Boolean(sound) && left >= songPrice && !busy && !job;
  const canFilm = Boolean(song) && left >= videoPrice && !busy && !job;

  const make = async (): Promise<void> => {
    setBusy('song');
    setSays('');
    setFilm('');
    const answer = await makeKidSong(topic, sound);
    setBusy('');
    void kidsNow().then(setState);
    if ('says' in answer) { setSays(answer.says); return; }
    if (held.current) URL.revokeObjectURL(held.current);
    held.current = URL.createObjectURL(answer.audio);
    setSong(held.current);
    setSongBlob(answer.audio);
    setKept(false);
    setSays(t('kids.songDone', 'Here is your song!'));
  };

  const film2 = async (): Promise<void> => {
    setBusy('video');
    setSays('');
    const answer = await startKidVideo(topic);
    setBusy('');
    void kidsNow().then(setState);
    if ('says' in answer) { setSays(answer.says); return; }
    setJob(answer.job);
    setSays(t('kids.filmMaking', 'Making your video. It takes a minute.'));
  };

  /* ── Keeping it ────────────────────────────────────────────────────────
 
     Carli, 9 October 2026: *"Gaan aan met die kind se liedjies wat keepbaar
     is."* A song played in the room and was gone when the page closed — work
     that stops existing, and worse here than anywhere else, because it cost
     real credits out of an allowance a parent set and the person it happens
     to is six and will think the app ate it.
 
     Costs nothing and spends no allowance: it is already paid for. */
  const keepIt = async (): Promise<void> => {
    if (!songBlob || kept) return;
    const what = KID_TOPICS.find((one) => one.id === topic);
    const how = KID_SOUNDS.find((one) => one.id === sound);
    const put = await keepSong({
      id: `kidsong-${Date.now()}`,
      title: `${t(what?.says[0] ?? 'kids.song', what?.says[1] ?? 'A song')}`
        + ` · ${t(how?.says[0] ?? '', how?.says[1] ?? '')}`,
      made: Date.now(),
      audio: songBlob,
      topic,
      sound,
    });
    if (put === 'kept') {
      setKept(true);
      setShelfAgain((was) => was + 1);
      setSays(t('kids.kept', 'Kept! You can play it again any time, and it costs nothing.'));
    } else if (put === 'shelfFull') {
      setSays(t('kids.shelfFull', 'Your shelf is full — it holds {n} songs. Ask a grown-up to take one off.')
        .replace('{n}', String(MOST_SONGS)));
    } else if (put === 'full') {
      setSays(t('kids.deviceFull', 'There is no room left on this device.'));
    } else {
      setSays(t('kids.noKeep', 'This browser will not keep anything.'));
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-7 p-5" data-kidsroom>
      {/* ── What is left, in songs ──────────────────────────────────────
          In songs and not in credits, because a number of credits is a thing
          a child has to be taught and a number of songs is a thing they
          already understand. */}
      <div
        className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
        data-kidsleft
      >
        <span className="text-sm font-bold text-emerald-300">
          {songsLeft > 0
            ? `${songsLeft} ${songsLeft === 1 ? t('kids.songLeft', 'song left') : t('kids.songsLeft', 'songs left')}`
            : t('kids.noneLeft', 'All used up — ask a grown-up')}
        </span>
        <button
          type="button"
          onClick={() => setAtDoor(true)}
          data-kidsgrownup
          className="min-h-[44px] flex-shrink-0 rounded-xl border border-emerald-500/40 px-3 text-xs font-bold text-emerald-200"
        >
          {t('kids.grownUp', 'Grown-up')}
        </button>
      </div>

      {/* ── The stories a grown-up has made ───────────────────────────────
 
          Carli, 9 October 2026: *"Gaan aan met die shelf van stories in die
          kids kamer."*
 
          Above the song, because a story is the thing to reach for when
          somebody has already made one and the song is what to do when they
          have not. Nothing in here spends: the pictures and the readings
          were paid for when the book was made, so a child can hear the same
          story all afternoon and the allowance is untouched.
 
          The bin is not drawn for a child — `grownUp` is false here. Losing
          a story somebody made them is the one press in this room that
          cannot be undone, and the grown-up's own page has the same shelf
          with it. */}
      <div className="space-y-3">
        <h2 className="text-lg font-extrabold text-white">
          {t('kids.stories', 'Stories')}
        </h2>
        <StoryShelf />
      </div>

      {/* ── The songs this child has kept ────────────────────────────────
          Under the stories and above the making, because a child who has
          made songs before comes back for those first. */}
      <div className="space-y-3">
        <h2 className="text-lg font-extrabold text-white">
          {t('kids.mySongs', 'My songs')}
        </h2>
        <SongShelf again={shelfAgain} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-extrabold text-white">
          {t('kids.pickTopic', 'What should the song be about?')}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {KID_TOPICS.map((one) => (
            <Big
              key={one.id}
              on={topic === one.id}
              face={FACES[one.id]}
              label={t(one.says[0], one.says[1])}
              onPick={() => setTopic(one.id)}
              off={Boolean(busy) || Boolean(job)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-extrabold text-white">
          {t('kids.pickSound', 'How should it sound?')}
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {KID_SOUNDS.map((one) => (
            <Big
              key={one.id}
              on={sound === one.id}
              face={FACES[one.id]}
              label={t(one.says[0], one.says[1])}
              onPick={() => setSound(one.id)}
              off={Boolean(busy) || Boolean(job)}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void make()}
        disabled={!canSong}
        data-kidsmake
        className="flex min-h-[64px] w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 text-lg font-black text-onAccent disabled:opacity-40"
      >
        {busy === 'song' ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            {t('kids.making', 'Making your song…')}
          </>
        ) : (
          <>
            <Sparkles className="h-6 w-6" />
            {t('kids.make', 'Make my song')}
          </>
        )}
      </button>

      {says && (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-200" data-kidssays>
          {says}
        </p>
      )}

      {song && (
        <div className="space-y-3">
          {/* The browser's own player. A child knows what it is, and a custom
              one here would be a transport to build and maintain for a room
              whose whole point is that it has two buttons in it. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={song} controls className="w-full" data-kidsplayer />
          <button
            type="button"
            onClick={() => void keepIt()}
            disabled={!songBlob || kept}
            data-kidskeep
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/50 bg-amber-500/10 text-base font-black text-amber-300 disabled:opacity-40"
          >
            <Heart className="h-5 w-5" fill={kept ? 'currentColor' : 'none'} />
            {kept ? t('kids.keptIt', 'Kept') : t('kids.keep', 'Keep it')}
          </button>
          <button
            type="button"
            onClick={() => void film2()}
            disabled={!canFilm}
            data-kidsfilm
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/50 bg-emerald-500/10 text-base font-black text-emerald-300 disabled:opacity-40"
          >
            {busy === 'video' || job ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('kids.filming', 'Making your video…')}
              </>
            ) : (
              <>
                <Film className="h-5 w-5" />
                {left >= videoPrice
                  ? t('kids.film', 'Make a video of it')
                  : t('kids.filmNotEnough', 'A video needs more than is left')}
              </>
            )}
          </button>
        </div>
      )}

      {film && (
        /* eslint-disable-next-line jsx-a11y/media-has-caption */
        <video src={film} controls className="w-full rounded-2xl" data-kidsfilmout />
      )}
    </div>
  );
}
