'use client';

/**
 * My playlists: a child picks a sticker, taps songs into it, and plays it.
 *
 * The owner, 19 October 2026: *"Mens moet in kids room ook playlists kan
 * create."* The rules — names from a sticker list, kept on the device,
 * songs that have left the shelf passed over — are in `lib/kidsplaylists.ts`.
 * This is the screen: big buttons, a moving equaliser while it plays, and
 * shuffle and repeat a child can see the state of.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '../lib/i18n';
import { allSongs, type KeptSong } from '../lib/songkeep';
import {
  MOST_IN_LIST, MOST_LISTS, NAMES, listName, loadLists, moved, newList, order, playable, pruned, saveLists, toggled,
  type Playlist,
} from '../lib/kidsplaylists';

export default function KidsPlaylists({
  again = 0,
  onSpark,
}: {
  /** Bumped by the room when a song is kept, so the shelf is read again. */
  readonly again?: number;
  readonly onSpark?: (n: number) => void;
}): React.ReactElement {
  const { lang, t } = useLang();
  const tongue: 'en' | 'af' = lang === 'af' ? 'af' : 'en';
  const [songs, setSongs] = useState<KeptSong[]>([]);
  const [lists, setLists] = useState<Playlist[]>([]);
  const [naming, setNaming] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [sure, setSure] = useState(false);
  const [playing, setPlaying] = useState<{ list: string; queue: KeptSong[]; at: number } | null>(null);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(true);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef('');

  useEffect(() => { setLists(loadLists()); }, []);
  useEffect(() => {
    void allSongs().then((shelf) => {
      setSongs(shelf);
      /* Songs that have left the shelf leave the lists too. */
      const ids = shelf.map((one) => one.id);
      setLists((was) => {
        const next = was.map((one) => pruned(one, ids));
        if (next.some((one, i) => one !== was[i])) saveLists(next);
        return next;
      });
    }).catch(() => setSongs([]));
  }, [again]);

  const change = (next: Playlist[]): void => { setLists(next); saveLists(next); };

  const stop = useCallback((): void => {
    audio.current?.pause();
    audio.current = null;
    if (url.current) { URL.revokeObjectURL(url.current); url.current = ''; }
    setPlaying(null);
  }, []);
  /* Leaving the page stops the music. */
  useEffect(() => () => {
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
  }, []);

  const playAt = useCallback((listId: string, queue: KeptSong[], at: number, loop: boolean): void => {
    if (at >= queue.length) {
      if (!loop || !queue.length) { stop(); return; }
      at = 0;
    }
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = URL.createObjectURL(queue[at].audio);
    const sound = new Audio(url.current);
    audio.current = sound;
    sound.onended = () => playAt(listId, queue, at + 1, loop);
    sound.onerror = () => playAt(listId, queue, at + 1, loop);
    void sound.play().catch(() => undefined);
    setPlaying({ list: listId, queue, at });
  }, [stop]);

  const play = (list: Playlist): void => {
    const inOrder = playable(list, songs);
    if (!inOrder.length) return;
    const queue = order(inOrder.length, shuffle).map((i) => inOrder[i]);
    playAt(list.id, queue, 0, repeat);
    onSpark?.(3);
  };

  const make = (name: string): void => {
    const made = newList(lists, name, Date.now());
    if (!made) return;
    change([made, ...lists]);
    setNaming(false);
    setEditing(made.id);
    onSpark?.(2);
  };

  const open = editing ? lists.find((one) => one.id === editing) ?? null : null;
  const now = playing ? playing.queue[playing.at] : null;

  const button = 'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black';

  return (
    <div className="space-y-4 rounded-3xl border-2 border-fuchsia-400/50 bg-surface-50/85 p-4 shadow-lg backdrop-blur-xs sm:p-5" data-kidsplaylists>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="fb-kids-bubble flex items-center gap-2 text-xl font-bold text-surface-900 sm:text-2xl">
            <span aria-hidden>🎶</span> {t('kids.lists', 'My playlists')}
          </h2>
          <p className="text-xs text-surface-700">
            {t('kids.listsWhy', 'Put your songs in a list and play them one after another.')}
          </p>
        </div>
        {!naming && !open && lists.length < MOST_LISTS && songs.length > 0 && (
          <button type="button" data-kidslistnew onClick={() => setNaming(true)} className={`${button} bg-fuchsia-500 text-white shadow-md`}>
            ➕ {t('kids.listNew', 'Make a playlist')}
          </button>
        )}
      </div>

      {songs.length === 0 && (
        <p className="rounded-2xl bg-surface-100 px-4 py-3 text-sm font-semibold text-surface-800">
          {t('kids.listsEmpty', 'Make a song first, then you can put it in a playlist.')}
        </p>
      )}

      {/* ── Pick a sticker for the new list ─────────────────────────── */}
      {naming && (
        <div className="space-y-2" data-kidslistnaming>
          <p className="text-sm font-black text-surface-900">{t('kids.listPick', 'Pick a name for your playlist')}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {NAMES.map((one) => (
              <button
                key={one.id}
                type="button"
                data-kidslistname={one.id}
                onClick={() => make(one.id)}
                className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-surface-200 bg-surface-100 px-2 text-xs font-black text-surface-900 transition-transform hover:scale-105 active:scale-95"
              >
                <span className="text-2xl" aria-hidden>{one.emoji}</span>
                {tongue === 'af' ? one.af : one.en}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setNaming(false)} className={`${button} border-2 border-surface-300 bg-surface-50 text-surface-800`}>
            {t('kids.listCancel', 'Not now')}
          </button>
        </div>
      )}

      {/* ── One list open: tap songs in and out, move them up and down ─ */}
      {open && (
        <div className="space-y-3" data-kidslistedit={open.id}>
          <p className="fb-kids-bubble text-lg text-surface-950">{listName(open, tongue)}</p>
          <p className="text-xs font-semibold text-surface-700">
            {t('kids.listTap', 'Tap a song to put it in. Tap it again to take it out.')}
          </p>
          <div className="flex flex-wrap gap-2">
            {songs.map((song) => {
              const inIt = open.songs.includes(song.id);
              return (
                <button
                  key={song.id}
                  type="button"
                  data-kidslistsong={song.id}
                  aria-pressed={inIt}
                  disabled={!inIt && open.songs.length >= MOST_IN_LIST}
                  onClick={() => change(lists.map((one) => (one.id === open.id ? toggled(one, song.id) : one)))}
                  className={`min-h-[44px] max-w-full truncate rounded-2xl border-2 px-3 text-sm font-bold transition-colors ${
                    inIt ? 'border-fuchsia-400 bg-fuchsia-500 text-white' : 'border-surface-200 bg-surface-100 text-surface-900'
                  }`}
                >
                  {inIt ? '✓ ' : '🎵 '}{song.title}
                </button>
              );
            })}
          </div>
          {open.songs.length > 1 && (
            <ol className="space-y-1.5" data-kidslistorder>
              {playable(open, songs).map((song, at, all) => (
                <li key={song.id} className="flex items-center gap-2 rounded-xl bg-surface-100 px-3 py-1.5">
                  <span className="w-6 text-center text-sm font-black text-fuchsia-300">{at + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-surface-900">{song.title}</span>
                  <button type="button" aria-label={t('kids.listUp', 'Earlier')} disabled={at === 0}
                    onClick={() => change(lists.map((one) => (one.id === open.id ? moved(one, song.id, -1) : one)))}
                    className="h-10 w-10 rounded-xl bg-surface-200 text-lg disabled:opacity-30">⬆️</button>
                  <button type="button" aria-label={t('kids.listDown', 'Later')} disabled={at === all.length - 1}
                    onClick={() => change(lists.map((one) => (one.id === open.id ? moved(one, song.id, 1) : one)))}
                    className="h-10 w-10 rounded-xl bg-surface-200 text-lg disabled:opacity-30">⬇️</button>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" data-kidslistdone onClick={() => { setEditing(null); setSure(false); }} className={`${button} bg-emerald-500 text-onAccent`}>
              ✅ {t('kids.listDone', 'Done')}
            </button>
            {sure ? (
              <button type="button" data-kidslistdelete
                onClick={() => { if (playing?.list === open.id) stop(); change(lists.filter((one) => one.id !== open.id)); setEditing(null); setSure(false); }}
                className={`${button} bg-rose-500 text-white`}>
                🗑️ {t('kids.listDeleteSure', 'Yes, throw this list away')}
              </button>
            ) : (
              <button type="button" onClick={() => setSure(true)} className={`${button} border-2 border-surface-300 bg-surface-50 text-surface-800`}>
                🗑️ {t('kids.listDelete', 'Throw this list away')}
              </button>
            )}
          </div>
          <p className="text-[11px] text-surface-600">{t('kids.listSongsStay', 'Throwing a list away keeps the songs on your shelf.')}</p>
        </div>
      )}

      {/* ── The lists ──────────────────────────────────────────────── */}
      {!open && !naming && lists.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {lists.map((list) => {
            const count = playable(list, songs).length;
            const on = playing?.list === list.id;
            return (
              <div key={list.id} data-kidslist={list.id}
                className={`rounded-2xl border-2 p-3 transition-colors ${on ? 'border-fuchsia-400 bg-fuchsia-500/15' : 'border-surface-200 bg-surface-100'}`}>
                <p className="truncate text-base font-black text-surface-950">{listName(list, tongue)}</p>
                <p className="text-xs font-semibold text-surface-700">
                  {count === 1 ? t('kids.listOne', '1 song') : t('kids.listMany', '{n} songs').replace('{n}', String(count))}
                </p>
                <div className="mt-2 flex gap-2">
                  <button type="button" data-kidslistplay disabled={count === 0}
                    onClick={() => (on ? stop() : play(list))}
                    className={`${button} flex-1 ${on ? 'bg-rose-500 text-white' : 'bg-fuchsia-500 text-white'} disabled:opacity-40`}>
                    {on ? `⏹ ${t('kids.listStop', 'Stop')}` : `▶ ${t('kids.listPlay', 'Play')}`}
                  </button>
                  <button type="button" data-kidslistchange onClick={() => setEditing(list.id)}
                    className={`${button} border-2 border-surface-300 bg-surface-50 text-surface-800`}>
                    ✏️ {t('kids.listChange', 'Change')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Shuffle and repeat, set before or while playing ────────── */}
      {!open && !naming && lists.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button type="button" data-kidslistshuffle aria-pressed={shuffle} onClick={() => setShuffle((was) => !was)}
            className={`${button} ${shuffle ? 'bg-amber-400 text-onAccent' : 'border-2 border-surface-300 bg-surface-50 text-surface-800'}`}>
            🔀 {t('kids.listShuffle', 'Mix them up')}
          </button>
          <button type="button" data-kidslistrepeat aria-pressed={repeat} onClick={() => setRepeat((was) => !was)}
            className={`${button} ${repeat ? 'bg-amber-400 text-onAccent' : 'border-2 border-surface-300 bg-surface-50 text-surface-800'}`}>
            🔁 {t('kids.listRepeat', 'Play again at the end')}
          </button>
        </div>
      )}

      {/* ── Now playing ────────────────────────────────────────────── */}
      {playing && now && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-fuchsia-400 bg-surface-100 p-3" data-kidslistnow>
          <span className="flex h-10 items-end gap-1" aria-hidden>
            {[0, 1, 2, 3].map((bar) => (
              <span key={bar} data-kidseq className="h-full w-1.5 rounded-full bg-fuchsia-400"
                style={{ animationDelay: `${bar * 0.15}s` }} />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-black uppercase tracking-wider text-fuchsia-300">
              {t('kids.listNow', 'Now playing')} · {playing.at + 1}/{playing.queue.length}
            </span>
            <span className="block truncate text-sm font-black text-surface-950">{now.title}</span>
          </span>
          <button type="button" aria-label={t('kids.listBack', 'Song before')}
            onClick={() => playAt(playing.list, playing.queue, Math.max(0, playing.at - 1), repeat)}
            className="h-12 w-12 rounded-2xl bg-surface-200 text-xl">⏮</button>
          <button type="button" data-kidslistnext aria-label={t('kids.listNext', 'Next song')}
            onClick={() => playAt(playing.list, playing.queue, playing.at + 1, true)}
            className="h-12 w-12 rounded-2xl bg-surface-200 text-xl">⏭</button>
        </div>
      )}
    </div>
  );
}
