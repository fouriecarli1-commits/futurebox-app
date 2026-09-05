'use client';

/**
 * One box that reaches everything.
 *
 * There was no search of any kind. That is survivable at twelve rooms and a
 * handful of songs, and it stops being survivable at fifty songs — and every
 * room added makes it worse rather than better, because the rail grows and the
 * work spreads out.
 *
 * ── What it searches, and why that is all of it ──────────────────────────
 *
 * Three things, and there are only three things: the rooms, the songs, and
 * everything the rooms have made. All three already live on the device, so this
 * asks no server and works with the network off.
 *
 * ── Why it navigates rather than showing results in place ────────────────
 *
 * A result page is a fourth place to be. Picking a song here opens it in the
 * room that can do something with it, using the same hand-off the advert desk
 * uses to put a shot on the video desk — so search is a way of getting
 * somewhere, not a destination.
 *
 * ── The shortcut ────────────────────────────────────────────────────────
 *
 * Command-K, and Control-K for everybody else, because that is what every tool
 * with a search box has trained people to press. Escape closes it. The button
 * that opens it shows the shortcut rather than hiding it, since a shortcut
 * nobody is told about is a shortcut nobody uses.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search as SearchIcon, X, Music, Clock, DoorOpen } from 'lucide-react';
import { loadTracks, type Track } from '../lib/library';
import { loadMakes, type Make } from '../lib/makes';
import { SURFACES, SURFACE_IDS, type SurfaceId } from '../lib/surfaces';
import { useLang } from '../lib/i18n';

interface Hit {
  kind: 'room' | 'song' | 'make';
  id: string;
  title: string;
  note: string;
  surface: SurfaceId;
  /** For a song, the title to hand to the room so it opens on it. */
  open?: string;
}

/** Loose enough for a half-remembered title, strict enough not to match everything. */
function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle);
}

export default function Search({
  open,
  onClose,
  onGo,
}: {
  open: boolean;
  onClose: () => void;
  /** Take me there, and open this if it is given. */
  onGo: (surface: SurfaceId, openTitle?: string) => void;
}): React.ReactElement | null {
  const { t, lang } = useLang();
  const [term, setTerm] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [makes, setMakes] = useState<Make[]>([]);
  const [at, setAt] = useState(0);
  const box = useRef<HTMLInputElement | null>(null);

  // Read once per opening rather than once per keystroke: both stores are
  // synchronous reads of localStorage, and doing that on every letter is a
  // parse of the whole library between one character and the next.
  useEffect(() => {
    if (!open) return;
    setTracks(loadTracks());
    setMakes(loadMakes());
    setTerm('');
    setAt(0);
    box.current?.focus();
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return [];
    const af = lang === 'af';
    const out: Hit[] = [];

    for (const id of SURFACE_IDS) {
      const room = SURFACES[id];
      if (matches(`${id} ${room.purpose} ${room.can.join(' ')}`, needle)) {
        out.push({ kind: 'room', id, title: id, note: room.purpose, surface: id });
      }
    }
    for (const track of tracks) {
      if (matches(`${track.title} ${track.genre} ${track.style}`, needle)) {
        out.push({
          kind: 'song',
          id: track.id,
          title: track.title,
          note: `${track.genre} · ${track.bpm} BPM`,
          surface: 'studio',
          open: track.title,
        });
      }
    }
    for (const make of makes) {
      if (matches(`${make.title} ${make.note ?? ''} ${make.text ?? ''}`, needle)) {
        out.push({
          kind: 'make',
          id: make.id,
          title: make.title,
          note: make.note ?? new Date(make.createdAt).toLocaleDateString(),
          surface: make.surface,
        });
      }
    }
    return out.slice(0, 20);
  }, [term, tracks, makes, lang]);

  const choose = useCallback(
    (hit: Hit) => {
      onGo(hit.surface, hit.open);
      onClose();
    },
    [onGo, onClose],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setAt((n) => Math.min(n + 1, Math.max(hits.length - 1, 0)));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setAt((n) => Math.max(n - 1, 0));
      }
      if (event.key === 'Enter' && hits[at]) choose(hits[at]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, hits, at, choose, onClose]);

  if (!open) return null;

  const icon = { room: DoorOpen, song: Music, make: Clock };

  return (
    <div
      className="fixed inset-0 z-[90] bg-scrim/80 backdrop-blur-sm flex items-start justify-center p-4 pt-[12vh] pb-24"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('search.title', 'Search everything')}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <SearchIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <input
            ref={box}
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setAt(0);
            }}
            placeholder={t('search.hint', 'A song, a room, something you made')}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t('search.close', 'Close')}
            className="text-zinc-500 hover:text-white flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {term.trim() && hits.length === 0 && (
            <p className="px-4 py-6 text-sm text-zinc-500 text-center">
              {t('search.nothing', 'Nothing by that name.')}
            </p>
          )}
          {hits.map((hit, index) => {
            const Icon = icon[hit.kind];
            return (
              <button
                key={`${hit.kind}:${hit.id}`}
                type="button"
                onMouseEnter={() => setAt(index)}
                onClick={() => choose(hit)}
                className={`w-full text-left px-4 py-2.5 flex items-start gap-3 ${
                  index === at ? 'bg-emerald-500/10' : 'hover:bg-zinc-800/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    index === at ? 'text-emerald-400' : 'text-zinc-500'
                  }`}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zinc-200 truncate">
                    {hit.kind === 'room'
                      ? (lang === 'af' ? SURFACES[hit.surface].purpose : hit.title)
                      : hit.title}
                  </span>
                  <span className="block text-xs text-zinc-500 truncate">{hit.note}</span>
                </span>
              </button>
            );
          })}
        </div>

        {!term.trim() && (
          <p className="px-4 py-3 text-xs text-zinc-500 border-t border-zinc-800">
            {t('search.reach', 'Reaches the rooms, your songs, and everything you have made here.')}
          </p>
        )}
      </div>
    </div>
  );
}
