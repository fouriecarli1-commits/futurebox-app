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
  Check, Copy, ListMusic, Loader2, Pause, Play, Plus, Share2, SkipForward, Trash2, X,
} from 'lucide-react';
import { loadTracks, type Track } from '../lib/library';
import { readAudio } from '../lib/trackaudio';
import { markBlob } from '../lib/watermark';
import { levelOf, loadOwned, NOTHING, type Owned } from '../lib/purchases';
import {
  loadPlaylists, moved, newPlaylist, savePlaylists, withTrack, withoutTrack, type Playlist,
} from '../lib/playlists';
import { fetchCreator, type Creator } from '../lib/radar';
import Cover from './Cover';
import { useLang } from '../lib/i18n';

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export default function Channel({ reloadKey }: { reloadKey: number }): React.ReactElement {
  const { t } = useLang();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [lists, setLists] = useState<Playlist[]>([]);
  const [openList, setOpenList] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
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
      const playable = levelOf(owned, track.id) === 'owned' ? blob : await markBlob(blob);
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

  return (
    <div className="space-y-5">
      {/* ── Who this is ──────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-br from-emerald-500/10 via-zinc-900/70 to-zinc-950 p-5 md:p-7">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border border-zinc-800">
            <Cover seed={handle || 'futurebox'} label={creator?.name ?? 'Channel'} className="w-full h-full" />
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
          <p className="text-sm text-zinc-500 leading-snug">
            {t('chan.noLists', 'None yet. A playlist plays straight through, which is what makes it worth building.')}
          </p>
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
                <Cover seed={track.id} label={track.title} className="aspect-video" />
                <button
                  type="button"
                  onClick={() => (playing === track.id ? stop() : void play(track.id))}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <span className="w-12 h-12 rounded-full bg-white text-onAccent flex items-center justify-center">
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
                  <button
                    type="button"
                    onClick={() => setAdding(track.id)}
                    className="text-sm text-zinc-400 hover:text-emerald-300 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('chan.addTo', 'Add to a playlist')}
                  </button>
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
    </div>
  );
}
