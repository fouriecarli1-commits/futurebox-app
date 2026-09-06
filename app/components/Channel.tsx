'use client';

/**
 * The channel — where somebody's music actually lives.
 *
 * The studio is where songs are made; this is where they are kept, looked at
 * and put in an order. Those are different jobs and they want different
 * screens: making wants every control in reach, and listening wants the
 * controls out of the way.
 *
 * Every song shows artwork generated from its own title, so a grid of tracks
 * is something you can scan rather than a list of identical rows. It is the
 * same drawing used on the classes and the radar, for the same reason: nothing
 * here is a stock photograph pretending to depict a song.
 *
 * A playlist plays straight through, which is the whole point of one — a list
 * you have to click along is a list, not a playlist.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check, Copy, Download, Headphones, Image as ImageIcon, ListMusic, Loader2, MessageSquareQuote, Pause, Play, Plus, Share2, SkipForward, SlidersHorizontal, Trash2, Video, X,
} from 'lucide-react';
import { CREDITS, perMinute } from '../lib/credits';
import { accessToken } from '../lib/cloud';
import { downloadBlob, loadTracks, safeFilename, type Track } from '../lib/library';
import { readAudio } from '../lib/trackaudio';
import { addUpload, loadUploads, removeUpload } from '../lib/uploads';
import { levelOf, loadOwned, NOTHING, type Owned } from '../lib/purchases';
import {
  loadPlaylists, moved, newPlaylist, savePlaylists, withTrack, withoutTrack, type Playlist,
} from '../lib/playlists';
import { fetchCreator, type Creator } from '../lib/radar';
import Cover from './Cover';
import Subscription from './Subscription';
import ProfilePhoto from './ProfilePhoto';
import { publicUrl as avatarUrl } from '../lib/avatar';
import { saveCreator } from '../lib/radar';
import { useLang } from '../lib/i18n';
import { useCopilotOps, matchByTitle } from '../lib/copilotactions';
import ShareRow from './ShareRow';
import PostToLive from './PostToLive';
import Hint from './Hint';
import RecordingName from './RecordingName';
import FollowWords from './FollowWords';
import SongScreen, { wordsFor } from './SongScreen';
import Sleeve from './Sleeve';
import { heardHere, markHeard } from '../lib/heard';
import { signal } from '../lib/signal';
import { heardFor, timeFor } from '../lib/lyrictime';
import Note from './Note';
import Card from './Card';
import { timelineOf, type Part, type TimedLine } from '../lib/timeline';

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export default function Channel({
  reloadKey,
  onUpgrade,
  email,
  onEdit,
}: {
  reloadKey: number;
  onUpgrade: () => void;
  /** Empty when nobody is signed in, which is when there is nothing to delete. */
  email?: string;
  /**
   * Open this song on the timeline next door.
   *
   * This page offered exactly one thing to do with a finished song — put a
   * video to it — and nothing at all to do to the song itself. Changing a
   * verse meant leaving, finding the studio, and finding the song again in a
   * list, which is three steps away from where somebody is already looking at
   * the thing they want to change.
   */
  onEdit?: (trackId: string) => void;
}): React.ReactElement {
  const { t } = useLang();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [lists, setLists] = useState<Playlist[]>([]);
  const [openList, setOpenList] = useState<string | null>(null);

  /* Open a playlist they named. Matched on its name the same way songs are
     matched on their titles, and left alone when nothing is close. */
  useCopilotOps('channels', {
    open_playlist: (value) => {
      const found = matchByTitle(lists.map((one) => ({ ...one, title: one.name })), value);
      if (found) setOpenList(found.id);
    },
  });
  const [adding, setAdding] = useState<string | null>(null);
  /**
   * Which song is being fetched to be kept, and what went wrong if it was.
   *
   * The file is not always on this device — a song made on a phone has a row
   * on the account and nothing local until it is asked for. So keeping one is
   * a fetch, and a button that does nothing for four seconds reads as broken.
   */
  const [keeping, setKeeping] = useState<string | null>(null);
  const [keepFailed, setKeepFailed] = useState<string | null>(null);
  /** Which song has been asked for a real cover, if any. */
  const [sleeveFor, setSleeveFor] = useState<string | null>(null);
  /** A file being taken in, and what was wrong with it if it was refused. */
  const [taking, setTaking] = useState(false);
  const [tookBadly, setTookBadly] = useState<string | null>(null);
  /**
   * What has been listened to on this device, and how the grid is narrowed.
   *
   * Thirty songs all look the same, and the one you have not heard is the one
   * you are looking for. Read after mount rather than during render: storage
   * during render disagrees with the HTML the server sent.
   */
  const [heard, setHeard] = useState<string[]>([]);
  const [looking, setLooking] = useState('');
  const [unheardOnly, setUnheardOnly] = useState(false);
  useEffect(() => setHeard(heardHere()), []);
  const hasHeard = (id: string) => heard.indexOf(id) !== -1;

  /* What each song has done out there, keyed by song id.

     Named `counts` and not `heard`, because `heard` above is this device's
     "you have not played this one yet" dot and the two mean nearly opposite
     things — one is about the person looking at the screen, the other about
     everybody else. The first draft of this called both of them `heard`. */
  const [counts, setCounts] = useState<Record<string, { listens: number; listeners: number }>>({});

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const token = await accessToken();
        if (!token) return;
        const answer = await fetch('/api/listens', { headers: { Authorization: `Bearer ${token}` } });
        if (!answer.ok) return;
        const said = (await answer.json()) as {
          songs?: ReadonlyArray<{ ref?: string; listens?: number; listeners?: number }>;
        };
        if (!live) return;
        const next: Record<string, { listens: number; listeners: number }> = {};
        for (const one of said.songs ?? []) {
          if (one.ref) {
            next[one.ref] = { listens: Number(one.listens) || 0, listeners: Number(one.listeners) || 0 };
          }
        }
        setCounts(next);
      } catch {
        /* Signed out, offline, or the counting is not switched on. The songs
           are the point of this screen and they are already there; a number
           that could not be fetched is a number that is not shown. */
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  const nowHeard = (id: string) => setHeard(markHeard(id));

  /* What the grid actually draws. Both narrowings at once, because a person
     who has typed three letters and then pressed "not heard yet" means both
     of those things. */
  const shown = tracks.filter((one) => {
    if (unheardOnly && hasHeard(one.id)) return false;
    const needle = looking.trim().toLowerCase();
    if (!needle) return true;
    return (
      one.title.toLowerCase().includes(needle) ||
      one.genre.toLowerCase().includes(needle) ||
      (one.lyrics ?? '').toLowerCase().includes(needle)
    );
  });
  const [creator, setCreator] = useState<Creator | null>(null);
  const [owned, setOwned] = useState<Owned>(NOTHING);

  const [playing, setPlaying] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  /** The queue as the 'ended' handler will see it, which state alone would not. */
  const queueRef = useRef<string[]>([]);

  /**
   * The channel, and beside it the songs somebody brought in from a file.
   *
   * "Dit sal baie cool wees as iemand ook hulle eie liedjies kon oplaai om
   *  daai presies funksie te vervul."
   *
   * The function she means is the selfie camera behind the words button: the
   * phone films you, the song plays out loud, the lines scroll over the
   * viewfinder and never reach the file. It lives on a card in this room and
   * this room read `loadTracks()` and nothing else — so for the one case she
   * named, a recording you already have, there was no card and therefore no
   * camera. The booth already stands them side by side for the same reason.
   *
   * They are still not *in* the channel. The channel is what you made here;
   * it syncs, it is what gets posted, and a file off a phone belongs in
   * neither. What the card offers is narrowed to match, below.
   */
  const reload = useCallback(() => {
    setTracks([...loadTracks(), ...loadUploads()]);
  }, []);

  useEffect(() => {
    reload();
    setLists(loadPlaylists());
  }, [reloadKey, reload]);

  /* Take a file in from here.
     Decoded before it is kept, so a file this browser cannot play is refused
     with a sentence now rather than with a camera that films in silence. */
  const bringIn = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setTaking(true);
      setTookBadly(null);
      try {
        await addUpload(file);
        reload();
      } catch (error) {
        const why = error instanceof Error ? error.message : '';
        setTookBadly(
          why === 'too-big'
            ? t('chan.songTooBig', 'That file is over 60 MB. Trim it or export it smaller.')
            : t('chan.songUnreadable', 'This browser could not read that audio. MP3, WAV or M4A work.'),
        );
      } finally {
        setTaking(false);
      }
    },
    [reload, t],
  );

  const dropUpload = useCallback(
    async (id: string) => {
      await removeUpload(id);
      reload();
    },
    [reload],
  );

  useEffect(() => {
    loadOwned().then(setOwned);
    fetchCreator().then(setCreator);
  }, []);

  /**
   * Keep a copy of the song.
   *
   * Somebody who has made a song needs the file: to put it on a phone, to
   * hand it to somebody, to upload it somewhere this app does not reach. Every
   * other room that produces a file offers this and the channel — the room
   * that is *for* the finished songs — did not, which made the finished ones
   * the only work locked inside the app.
   *
   * The extension is read off the blob rather than assumed. ElevenLabs returns
   * MPEG audio today; a file called `.mp3` that is a WAV is a file a phone
   * refuses to open, and the person is then told nothing about why.
   */
  const keep = useCallback(
    async (track: Track) => {
      setKeepFailed(null);
      setKeeping(track.id);
      try {
        const blob = await readAudio(track.id);
        if (!blob) {
          setKeepFailed(track.id);
          return;
        }
        const kind = (blob.type || '').toLowerCase();
        const ext = kind.includes('wav') ? 'wav' : kind.includes('ogg') ? 'ogg' : kind.includes('mp4') || kind.includes('m4a') ? 'm4a' : 'mp3';
        downloadBlob(blob, safeFilename(track.title, ext));
      } catch {
        setKeepFailed(track.id);
      } finally {
        setKeeping(null);
      }
    },
    [],
  );

  const play = useCallback(
    async (id: string, rest: string[] = []) => {
      const track = tracks.find((one) => one.id === id);
      const element = audioRef.current;
      if (!track || !element) return;

      setLoading(true);
      const blob = await readAudio(track.id);
      setLoading(false);
      if (!blob) return;

      // An unbought track plays with its mark, exactly as it does everywhere
      // else. A channel that quietly hands over the clean file would be a hole
      // in the gate rather than a nicer page.
      // As it was made — see the note in `MakeMusic`. Nothing is marked.
      const playable = blob;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(playable);
      element.src = urlRef.current;
      await element.play();
      setPlaying(id);
      /* Heard means started, not finished. Somebody who plays four seconds of
         a song has heard enough to know they have met it, and a mark that only
         lands on the last second would still be showing "unheard" on
         everything they skipped through. */
      setHeard(markHeard(id));
      /* And counted, once per person per song per day, for the chart on
         Spotlight. The same moment as the unheard mark for the same reason:
         somebody who plays four seconds has met the song. */
      signal('play', { ref: track.id });
      queueRef.current = rest;
      setQueue(rest);
    },
    [owned, tracks],
  );

  useEffect(() => {
    const element = new Audio();
    element.addEventListener('ended', () => {
      const next = queueRef.current;
      if (!next.length) {
        setPlaying(null);
        return;
      }
      // Straight into the next one. Read from the ref because this listener is
      // attached once and would otherwise see the queue as it was then.
      void play(next[0], next.slice(1));
    });
    audioRef.current = element;
    return () => {
      element.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
    // `play` is stable enough for this: re-attaching on its identity would
    // drop the handler mid-track every time a song was added to a list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(null);
    queueRef.current = [];
    setQueue([]);
  }, []);

  const update = useCallback((next: Playlist[]) => {
    setLists(next);
    savePlaylists(next);
  }, []);

  const list = lists.find((one) => one.id === openList) ?? null;
  // Ids that no longer resolve are dropped rather than shown as dead rows: a
  // song deleted from the channel is gone from every list it was in.
  const listTracks = list
    ? list.trackIds.map((id) => tracks.find((one) => one.id === id)).filter(Boolean as unknown as (t: Track | undefined) => t is Track)
    : [];

  const handle = creator?.handle ? `@${creator.handle}` : '';
  const photo = creator?.avatar_path ? avatarUrl(creator.avatar_path) : '';

  /* Save the picture against the profile, and hold what was saved.

     The row is written here rather than in `ProfilePhoto` so that a photo and
     a name are one kind of thing to this screen: `saveCreator` is the only
     writer, and the component that picked the file does not need to know the
     row exists. The local state is updated first because the round trip is
     over a mobile connection and the picture is already on screen. */
  /* The words, full screen, following the song.

     A song with a composition plan knows when each section starts, so its
     lines can be laid on the clock. A song without one — anything brought in
     from a file — has nothing to follow, and the button is not offered rather
     than opening a screen that sits still while the music plays. */
  /**
   * The song whose words are on screen, with the timing that was measured for
   * it rather than guessed.
   *
   * It used to be the track alone, and the lines came from the even spread —
   * which is why the words ran too fast on some songs and fine on others.
   * `timeFor` listens to the file once and remembers what it found.
   */
  const [lyricsFor, setLyricsFor] = useState<{ track: Track; lines: readonly TimedLine[] } | null>(null);
  /** Which song is open full screen, by id, or null for the grid. */
  const [fullFor, setFullFor] = useState<string | null>(null);
  /* The words of a song, on the clock.

     This used to answer "nothing" for any song without a stored plan, so a
     song brought in from a file — or written before the plan was kept — had
     no Lyrics button at all, and Carli's "elke liedjie moet ook daai button
     hê" was true of about half of them. `wordsFor` falls back to spreading
     the sheet evenly over the length, and the screen showing it says which
     of the two it is doing. */
  const timedFor = useCallback((track: Track): readonly TimedLine[] => wordsFor(track).lines, []);

  const keepPhoto = useCallback(
    async (next: string | null) => {
      const was = creator ?? { name: '', handle: '', about: '', links: {} };
      const updated = { ...was, avatar_path: next };
      setCreator(updated);
      const failed = await saveCreator(updated);
      // Put it back the way it was rather than leaving the screen claiming
      // something the row does not say.
      if (failed) setCreator(creator);
    },
    [creator],
  );

  return (
    <div className="space-y-5">
      {/* ── Who this is ──────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-emerald-500/10 via-zinc-900/70 to-zinc-950 p-5 md:p-7">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Their own face if they put one there, and the generated cover
              if not — never a grey silhouette, which reads as broken. */}
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border border-zinc-800">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt={creator?.name ? `${creator.name}` : t('photo.alt', 'Your profile picture')}
                className="w-full h-full object-cover"
              />
            ) : (
              <Cover seed={handle || 'futurebox'} label={creator?.name ?? 'Channel'} className="w-full h-full" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-black text-white leading-tight truncate">
              {creator?.name || t('chan.yours', 'Your channel')}
            </p>
            <p className="text-sm text-emerald-400">{handle}</p>
            <p className="text-sm text-zinc-500">
              {tracks.length} {tracks.length === 1 ? t('make.song', 'song') : t('make.songs', 'songs')}
              {lists.length > 0 && ` · ${lists.length} ${t('chan.lists', 'playlists')}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(
                `${window.location.origin}/${handle || ''}`.replace(/\/$/, ''),
              );
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-300 text-sm flex items-center gap-1.5 flex-shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? t('make.copied', 'Copied') : t('chan.share', 'Share')}
          </button>
        </div>
      </div>

      {/* ── The name that goes on a release ──────────────────────────────

          The header showed a name and there was nowhere to set one, so it
          read "Your channel" for everybody and the live room introduced each
          song by its owner's @handle. An address is not a name.

          The field itself lives in `RecordingName` now, because the account
          panel behind **You** needs the identical thing and two copies of one
          form is two places for it to drift. */}
      <RecordingName creator={creator} onSaved={setCreator} />

      {/* ── The picture ──────────────────────────────────────────────────
          Only with an account behind it: a photo kept on one device is not a
          profile picture, it is a file, and offering it would be a promise
          this app could not keep. */}
      {email && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <ProfilePhoto
            name={creator?.name || handle || t('chan.yours', 'Your channel')}
            path={creator?.avatar_path ?? null}
            onChanged={keepPhoto}
          />
        </div>
      )}

      {/* ── Playlists ────────────────────────────────────────────────────── */}
      <Card
        title={t('chan.playlists', 'Playlists')}
        icon={<ListMusic className="w-4 h-4" />}
        aside={
          <button
            type="button"
            onClick={() => {
              const made = newPlaylist(t('chan.newName', 'New playlist'));
              update(lists.concat(made));
              setOpenList(made.id);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('chan.new', 'New')}
          </button>
        }
      >

        {lists.length === 0 ? (
          <Note>{t('chan.noLists', 'None yet. A playlist plays straight through, which is what makes it worth building.')}</Note>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {lists.map((one) => (
              <button
                key={one.id}
                type="button"
                onClick={() => setOpenList(openList === one.id ? null : one.id)}
                className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                  openList === one.id
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {one.name} <span className="text-zinc-600">· {one.trackIds.length}</span>
              </button>
            ))}
          </div>
        )}

        {list && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <input
                value={list.name}
                onChange={(event) =>
                  update(lists.map((one) => (one.id === list.id ? { ...one, name: event.target.value } : one)))
                }
                className="flex-1 min-w-0 bg-transparent text-sm font-bold text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void play(list.trackIds[0], list.trackIds.slice(1))}
                disabled={!listTracks.length}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-onAccent text-sm font-bold flex items-center gap-1.5 disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5" />
                {t('chan.playAll', 'Play it through')}
              </button>
              <button
                type="button"
                onClick={() => {
                  update(lists.filter((one) => one.id !== list.id));
                  setOpenList(null);
                }}
                className="text-zinc-500 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {listTracks.length === 0 ? (
              <p className="text-sm text-zinc-500">{t('chan.empty', 'Nothing in it yet — add songs from below.')}</p>
            ) : (
              <div className="space-y-1">
                {listTracks.map((track, index) => (
                  <div key={track.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-zinc-600 tabular-nums flex-shrink-0">{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => void play(track.id, list.trackIds.slice(index + 1))}
                      className="min-w-0 flex-1 text-left text-zinc-200 truncate hover:text-emerald-300"
                    >
                      {track.title}
                    </button>
                    <span className="text-zinc-600 tabular-nums flex-shrink-0">{clock(track.seconds)}</span>
                    <button type="button" onClick={() => update(lists.map((one) => (one.id === list.id ? moved(one, track.id, -1) : one)))} className="text-zinc-600 hover:text-white px-1">↑</button>
                    <button type="button" onClick={() => update(lists.map((one) => (one.id === list.id ? moved(one, track.id, 1) : one)))} className="text-zinc-600 hover:text-white px-1">↓</button>
                    <button type="button" onClick={() => update(lists.map((one) => (one.id === list.id ? withoutTrack(one, track.id) : one)))} className="text-zinc-600 hover:text-red-400 px-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── The music ────────────────────────────────────────────────────── */}

      {/* Bring one in.

          Here, and not only in the video rooms, because this is the room the
          songs are in and the thing she asked to do with a brought-in song —
          film yourself singing it with the words up — is a button on a card
          in this grid. A song you cannot get into the grid is a song that
          cannot reach it.

          It stays on the device and never syncs. Said out loud on the label,
          because a file uploaded into an app is normally gone somewhere. */}
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 ${
            taking ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {taking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {taking
            ? t('chan.bringingIn', 'Reading it\u2026')
            : t('chan.bringIn', 'Bring in a song of your own')}
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(event) => {
              void bringIn(event.target.files?.[0] ?? null);
              event.target.value = '';
            }}
          />
        </label>
        <p className="text-sm text-zinc-500">
          {t('chan.bringInWhy', 'It stays on this device. Sing over it with the words on screen.')}
        </p>
      </div>
      {tookBadly && <p className="text-sm leading-snug text-amber-300">{tookBadly}</p>}

      {/* Narrowing it, once there is enough of it to need narrowing.

          Under five songs a filter is furniture: you can see all of them. It
          appears at six, which is roughly where a grid stops being a list you
          read and starts being one you scan. */}
      {tracks.length >= 6 && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={looking}
            onChange={(event) => setLooking(event.target.value)}
            placeholder={t('chan.find', 'Find a song')}
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-zinc-800 bg-black/60 px-3.5 text-base text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setUnheardOnly((was) => !was)}
            aria-pressed={unheardOnly}
            className={`min-h-[44px] rounded-xl border px-3.5 text-sm font-semibold ${
              unheardOnly
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            {t('chan.unheardOnly', 'Not heard yet')}
          </button>
        </div>
      )}

      {tracks.length > 0 && shown.length === 0 && (
        <p className="rounded-2xl border border-dashed border-zinc-800 py-8 text-center text-base text-zinc-500">
          {unheardOnly
            ? t('chan.allHeard', 'You have heard all of them.')
            : t('chan.noneFound', 'Nothing here matches that.')}
        </p>
      )}

      {tracks.length === 0 ? (
        <p className="text-base text-zinc-500 py-10 text-center border border-dashed border-zinc-800 rounded-2xl">
          {t('chan.noSongs', 'Nothing here yet. Make a song and it lands in your channel \u2014 or bring one in from a file and sing over that.')}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shown.map((track) => (
            <article key={track.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
              <div className="relative">
                {/* The real cover if somebody asked for one, and the drawn
                    placeholder until they do.

                    Not mounted on every card: each sleeve asks the server
                    whether a cover exists already, and twenty songs on a
                    screen should not be twenty questions nobody asked. The
                    button below is the asking. */}
                {sleeveFor === track.id ? (
                  <Sleeve
                    trackId={track.id}
                    title={track.title}
                    genre={track.genre}
                    style={track.style ?? ''}
                  />
                ) : (
                  <Cover seed={track.id} label={track.title} className="aspect-video" />
                )}
                {/* Tapping the picture opens the song full screen, the way a
                    phone expects. The play button beside it still just plays
                    it in place, for anybody on a desk who wants the grid. */}
                <button
                  type="button"
                  onClick={() => {
                    nowHeard(track.id);
                    setFullFor(track.id);
                  }}
                  aria-label={`${t('song.open', 'Open')} ${track.title}`}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-100"
                >
                  <span className="w-12 h-12 rounded-full bg-emerald-500 text-onAccent flex items-center justify-center">
                    {loading && playing === track.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : playing === track.id ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </span>
                </button>
                {/* Not heard yet, on this device.

                    A dot rather than a word: it has to be legible at a glance
                    across a grid, and it is the only thing on the card that is
                    about you rather than about the song. */}
                {!hasHeard(track.id) && (
                  <span
                    aria-label={t('chan.unheard', 'Not heard yet')}
                    title={t('chan.unheard', 'Not heard yet')}
                    className="absolute right-2 top-2 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-zinc-950"
                  />
                )}
                {/* Brought in, not made here.

                    Said on the card rather than left to be inferred, because
                    every other card in this grid is something this app wrote
                    and a grid that mixes the two without saying so is a grid
                    that quietly takes credit for somebody's own recording. */}
                {track.source === 'upload' && (
                  <span className="absolute left-2 top-2 px-2 py-0.5 rounded-full bg-zinc-950/80 text-zinc-300 text-[10px] font-bold ring-1 ring-zinc-700">
                    {t('chan.broughtIn', 'Brought in')}
                  </span>
                )}
                {playing === track.id && (
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500 text-onAccent text-[10px] font-bold">
                    {queue.length > 0 ? `${t('chan.playingNow', 'Playing')} · ${queue.length} ${t('chan.toGo', 'to go')}` : t('chan.playingNow', 'Playing')}
                  </span>
                )}
              </div>

              <div className="p-3 space-y-1.5">
                <p className="text-sm font-bold text-white leading-snug truncate">{track.title}</p>
                <p className="text-sm text-zinc-500">
                  {track.genre} · {clock(track.seconds)}
                </p>

                {/* What it has actually done out there.

                    "As ons top liedjies uitwys uit ons eie engine, track dit
                     dan die hoeveelheid listens per liedjie?"

                    Both numbers, never one. How many *times* on its own would
                    make a song one person played forty times look like a song
                    forty people heard — which is the exact lie the chart's
                    once-per-person-per-day index exists to prevent, and it
                    would be reintroduced here if this line said "40 listens"
                    and stopped.

                    Nothing at all until it has been heard once. A row of
                    zeroes under every song is a wall of nothing happened,
                    printed on the screen somebody visits to feel good about
                    what they made. */}
                {counts[track.id] && counts[track.id].listens > 0 && (
                  <p className="flex items-center gap-1.5 text-sm text-emerald-300/90">
                    <Headphones className="h-3.5 w-3.5 flex-shrink-0" />
                    {t('chan.listens', '{listens} listens, {listeners} people')
                      .replace('{listens}', String(counts[track.id].listens))
                      .replace('{listeners}', String(counts[track.id].listeners))}
                  </p>
                )}

                {/* Always, not only when the app wrote words for this one.

                    "Ek sien dit nie daar nie."

                    She was looking for the selfie camera, which lives behind
                    this button — and the button only drew when the song had
                    timed lines. So an instrumental, a song made without lyrics
                    and every song brought in from a file had no path to the
                    camera at all, though the camera has nothing to do with
                    words: it films you, the song plays out loud, and the lines
                    are an overlay that never reaches the file.

                    A screen gated on something it does not need is a feature
                    nobody can find. It opens either way now, and says which of
                    the two it is on the button itself rather than letting
                    somebody press "Lyrics" and meet a blank. */}
                {(
                  <button
                    type="button"
                    onClick={() => {
                      /* Start it if it is not already going. Opening the words
                         over a silent song is a screen that never moves. */
                      if (playing !== track.id) void play(track.id);
                      /* Opened with the even spread and corrected the moment
                         the song has been heard: waiting for a decode before
                         anything appears is a button that does nothing for a
                         second, which reads as broken. */
                      setLyricsFor({ track, lines: timedFor(track) });
                      void readAudio(track.id)
                        .then((blob) => timeFor(track, blob))
                        .then((found) => {
                          setLyricsFor((was) =>
                            was && was.track.id === track.id ? { track, lines: found.lines } : was,
                          );
                        });
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 min-h-[40px] rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm font-semibold hover:border-emerald-500 hover:text-emerald-300 transition-colors"
                  >
                    {timedFor(track).length > 0 ? (
                      <MessageSquareQuote className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <Video className="w-4 h-4 flex-shrink-0" />
                    )}
                    {timedFor(track).length > 0
                      ? t('chan.lyrics', 'Lyrics')
                      : t('chan.filmIt', 'Film yourself to it')}
                  </button>
                )}

                <ShareRow
                  title={track.title}
                  what={t('chan.shareWhat', 'A song I made on FutureBox.')}
                  hashtags={['newmusic', track.genre.replace(/[^A-Za-z0-9]/g, '').toLowerCase()].filter(Boolean)}
                  track={track}
                />

                {adding === track.id ? (
                  <div className="space-y-1 pt-1">
                    {lists.length === 0 && (
                      <p className="text-sm text-zinc-500">{t('chan.makeListFirst', 'Make a playlist first.')}</p>
                    )}
                    {lists.map((one) => (
                      <button
                        key={one.id}
                        type="button"
                        onClick={() => {
                          update(lists.map((each) => (each.id === one.id ? withTrack(each, track.id) : each)));
                          setAdding(null);
                        }}
                        className="w-full text-left text-sm text-zinc-300 hover:text-emerald-300 truncate"
                      >
                        + {one.name}
                      </button>
                    ))}
                    <button type="button" onClick={() => setAdding(null)} className="text-sm text-zinc-600">
                      {t('common.cancel', 'Cancel')}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <button
                      type="button"
                      onClick={() => setAdding(track.id)}
                      className="text-sm text-zinc-400 hover:text-emerald-300 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t('chan.addTo', 'Add to a playlist')}
                    </button>
                    {/* Three of these are about a song this app made, and
                        none of them is true of a file somebody brought in.

                        Cover art bills a generation and files the result on
                        the account as artwork for this song. Post to Live puts
                        it in the public room under her handle, which is a
                        claim of authorship over a recording that may be
                        anyone's. The studio regenerates from a plan that a
                        brought-in song has never had.

                        What is left is what she asked for — play it, open it
                        full screen, and sing over it with the words up — plus
                        the playlist, which is only a list of ids. */}
                    {track.source !== 'upload' && (
                      <button
                        type="button"
                        onClick={() => setSleeveFor((open) => (open === track.id ? null : track.id))}
                        aria-expanded={sleeveFor === track.id}
                        className="text-sm text-zinc-400 hover:text-emerald-300 flex items-center gap-1.5"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        {t('make.cover', 'Cover art')}
                      </button>
                    )}
                    {/* The file itself.

                        Beside the other two rather than hidden behind the
                        full-screen player: this is the room the finished
                        songs live in, and the finished ones were the only
                        work in the app you could not take out of it. */}
                    <button
                      type="button"
                      onClick={() => void keep(track)}
                      disabled={keeping === track.id}
                      className="text-sm text-zinc-400 hover:text-emerald-300 flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {keeping === track.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      {keeping === track.id
                        ? t('chan.keeping', 'Fetching the file\u2026')
                        : t('chan.keep', 'Download')}
                    </button>
                    {/* And into the live room, from the room the finished
                        songs are in. It used to be reachable only from a list
                        inside Live that showed the first six. */}
                    {track.source !== 'upload' && <PostToLive track={track} />}
                    {track.source === 'upload' && (
                      <button
                        type="button"
                        onClick={() => void dropUpload(track.id)}
                        className="text-sm text-zinc-500 hover:text-red-400 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('chan.dropBrought', 'Take it out again')}
                      </button>
                    )}
                    {onEdit && track.source !== 'upload' && (
                      <button
                        type="button"
                        onClick={() => onEdit(track.id)}
                        className="text-sm text-zinc-400 hover:text-emerald-300 flex items-center gap-1.5"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        {t('chan.edit', 'Open it in the studio')}
                      </button>
                    )}
                  </div>
                )}

                {keepFailed === track.id && (
                  <p className="text-sm text-amber-300 leading-snug">
                    {t(
                      'chan.keepFailed',
                      'The file for this song could not be found. It was made on another device and has not been uploaded.',
                    )}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {playing && queue.length > 0 && (
        <button
          type="button"
          onClick={() => void play(queue[0], queue.slice(1))}
          className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-2 shadow-2xl"
        >
          <SkipForward className="w-4 h-4" />
          {t('chan.next', 'Next')}
        </button>
      )}

      {/* Last, because leaving is not the first thing to offer somebody
          looking at their own channel — but present, because an app that
          makes leaving hard is telling you what it thinks of you. */}
      {/* Stopping the payment sits above deleting the account, because they
          are different decisions and the milder one should be reachable
          without reading past the other. */}
      <Subscription />

      {/* Before the way out, the way to ask.

          Somebody on this page is looking at what they pay and whether to
          keep it, which is exactly the moment a question turns into a
          cancellation if there is nowhere to put it. The footer carries the
          same link, but the studio covers the footer — so it is here too, in
          the one room where the decision is being made. */}
      <p className="text-sm text-zinc-500 leading-relaxed">
        {t('chan.helpBefore', 'A question about any of this?')}{' '}
        <a
          href="/help"
          className="text-emerald-400 underline underline-offset-4 hover:text-emerald-300 inline-flex items-center min-h-[32px]"
        >
          {t('chan.helpLink', 'Ask, or write to a person')}
        </a>
        .
      </p>

      {/* Deleting the account is not here any more. It sat between a help
          link and the copilot, in the room somebody works in, where it was one
          mis-tap from destroying everything they had made. It is on the
          account screen behind **You**, at the bottom, where a person goes to
          deal with their account rather than to make something. */}

      {/* The words, over everything, following the song that is playing. */}
      {/* One song, the whole screen, and the next one a swipe away. */}
      {fullFor && (
        <SongScreen tracks={tracks} startAt={fullFor} onClose={() => setFullFor(null)} />
      )}

      {lyricsFor && (
        <FollowWords
          lines={lyricsFor.lines}
          audio={audioRef.current}
          title={lyricsFor.track.title}
          onClose={() => setLyricsFor(null)}
          wordCost={perMinute(lyricsFor.track.seconds, CREDITS.transcribe)}
          /* For mixing a clean copy of the song onto the take, when she
             says she is on headphones. Read here rather than passed as a
             blob: the words screen opens the instant the button is
             pressed, and a read from the database before anything drew
             would be a button that does nothing for a second. */
          songFile={() => readAudio(lyricsFor.track.id)}
          askWords={async () => {
            /* Read off this device rather than passed in: the words screen is
               opened from a card that may have been drawn before the audio
               finished syncing, and the file is what the route needs. */
            const blob = await readAudio(lyricsFor.track.id);
            if (!blob) {
              return t(
                'play.noFile',
                'The file for this song is not on this device, so there is nothing to listen to.',
              );
            }
            const heard = await heardFor(lyricsFor.track, blob);
            if (!heard.lines.length) {
              return heard.why ?? t('play.nothingHeard', 'Nothing could be made out in it.');
            }
            setLyricsFor((was) =>
              was && was.track.id === lyricsFor.track.id ? { ...was, lines: heard.lines } : was,
            );
            return null;
          }}
        />
      )}
    </div>
  );
}
