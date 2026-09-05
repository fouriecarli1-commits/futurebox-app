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
  Check, Copy, Image as ImageIcon, ListMusic, Loader2, MessageSquareQuote, Pause, Play, Plus, Share2, SkipForward, SlidersHorizontal, Trash2, X,
} from 'lucide-react';
import { loadTracks, type Track } from '../lib/library';
import { readAudio } from '../lib/trackaudio';
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
import Hint from './Hint';
import RecordingName from './RecordingName';
import FollowWords from './FollowWords';
import SongScreen, { wordsFor } from './SongScreen';
import Sleeve from './Sleeve';
import { timeFor } from '../lib/lyrictime';
import Note from './Note';
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
  /** Which song has been asked for a real cover, if any. */
  const [sleeveFor, setSleeveFor] = useState<string | null>(null);
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

  useEffect(() => {
    setTracks(loadTracks());
    setLists(loadPlaylists());
  }, [reloadKey]);

  useEffect(() => {
    loadOwned().then(setOwned);
    fetchCreator().then(setCreator);
  }, []);

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
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-bold text-white flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-emerald-400" />
            {t('chan.playlists', 'Playlists')}
          </p>
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
        </div>

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
      </div>

      {/* ── The music ────────────────────────────────────────────────────── */}
      {tracks.length === 0 ? (
        <p className="text-base text-zinc-500 py-10 text-center border border-dashed border-zinc-800 rounded-2xl">
          {t('chan.noSongs', 'Nothing here yet. Make a song and it lands in your channel.')}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tracks.map((track) => (
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
                  onClick={() => setFullFor(track.id)}
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

                {timedFor(track).length > 0 && (
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
                    <MessageSquareQuote className="w-4 h-4 flex-shrink-0" />
                    {t('chan.lyrics', 'Lyrics')}
                  </button>
                )}

                <ShareRow
                  title={track.title}
                  what={t('chan.shareWhat', 'A song I made on FutureBox.')}
                  hashtags={['newmusic', track.genre.replace(/[^A-Za-z0-9]/g, '').toLowerCase()].filter(Boolean)}
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
                    <button
                      type="button"
                      onClick={() => setSleeveFor((open) => (open === track.id ? null : track.id))}
                      aria-expanded={sleeveFor === track.id}
                      className="text-sm text-zinc-400 hover:text-emerald-300 flex items-center gap-1.5"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      {t('make.cover', 'Cover art')}
                    </button>
                    {onEdit && (
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
        />
      )}
    </div>
  );
}
