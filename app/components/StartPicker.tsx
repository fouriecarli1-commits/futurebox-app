'use client';

/**
 * The plus in the song box: somewhere to start, as one neat list.
 *
 * The owner, 15 October 2026, pointing at ElevenLabs' finetune list: *"Daar kan
 * 'n plus wees wat uit pop en keuses gee in woorde soos daai finetunes een
 * wat ook sommer die style uitwys, dat ons so selfde netjiese lys het vir
 * keuses van gevoel ens om van te begin, en by daardie plus kan daar ook 'n
 * opsie wees om 'n liedjie op te laai om vanaf dit te begin."*
 *
 * So the three ways in that used to be three panels in a folded card — fifty
 * written starting points, the style repertoire, and bringing a song or a
 * photo in — are one list with a search box and a row of chips: a feeling
 * narrows it to songs to start from, a style family narrows it to sounds.
 * Bringing your own song in is the last row, because it is the one that
 * needs a file.
 *
 * Nothing here costs anything. A starting point fills the name, the words
 * and the sound; a sound is added to what is already in the sound line,
 * never put over it.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, PenLine, Play, Search, Upload, X } from 'lucide-react';
import { SONG_STARTS, MOODS, type Mood, type SongStart } from '../data/songstarts';
import { GENRE_CATEGORIES, GENRE_SAMPLES, type GenreSample } from '../data/genres';
import { sketch, supported, type Sketch } from '../lib/preview';
import { useLang } from '../lib/i18n';
import { MeerkatThumb } from './MeerkatTile';
import { SHELF_PICTURES } from '../lib/meerkatphoto';

type Shelf = 'all' | Mood | string;

/** A colour of its own for each row, so a long list is easy to keep your place in. */
function swatch(name: string): React.CSSProperties {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return { background: `linear-gradient(135deg, hsl(${hash} 70% 45%), hsl(${(hash + 60) % 360} 60% 25%))` };
}

const MOOD_IDS = new Set<string>(MOODS.map((one) => one.id));

export default function StartPicker({
  onStart,
  onStyle,
  currentStyle,
  onClose,
  upload,
  finder,
  openAt,
}: {
  readonly onStart: (start: { title: string; words: string; style: string; bpm: number }) => void;
  /** Adds the sound's words to the sound line. */
  readonly onStyle: (snippet: string) => void;
  readonly currentStyle: string;
  readonly onClose: () => void;
  /** Bringing a song or a photo in, drawn by the room so its handlers stay the room's. */
  readonly upload: React.ReactNode;
  /** Describing a sound in plain words, drawn by the room for the same reason. */
  readonly finder: React.ReactNode;
  /** A feeling to open on — the one the copilot heard, or a photo pointed at. */
  readonly openAt?: Mood | null;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [search, setSearch] = useState('');
  const [shelf, setShelf] = useState<Shelf>(openAt ?? 'all');
  /** Which of the two rows at the foot is open, if either. */
  const [foot, setFoot] = useState<'bring' | 'find' | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const live = useRef<Sketch | null>(null);
  const canHear = useMemo(() => supported(), []);

  useEffect(() => () => { live.current?.stop(); live.current = null; }, []);

  const stop = (): void => {
    live.current?.stop();
    live.current = null;
    setPlaying(null);
  };
  const listen = (sample: GenreSample): void => {
    if (playing === sample.name) { stop(); return; }
    stop();
    if (!canHear) return;
    try {
      const made = sketch(sample);
      if (made) { live.current = made; setPlaying(sample.name); }
    } catch {
      stop();
    }
  };

  const q = search.trim().toLowerCase();
  const starts = useMemo(() => {
    if (shelf !== 'all' && !MOOD_IDS.has(shelf)) return [];
    return SONG_STARTS.filter((one) => {
      if (shelf !== 'all' && one.mood !== shelf) return false;
      if (!q) return true;
      const said = lang === 'af' ? one.af : one.en;
      return `${said.title} ${said.first} ${one.style}`.toLowerCase().includes(q);
    });
  }, [shelf, q, lang]);
  const sounds = useMemo(() => {
    if (MOOD_IDS.has(shelf)) return [];
    return GENRE_SAMPLES.filter((one) => {
      if (shelf !== 'all' && one.category !== shelf) return false;
      if (!q) return true;
      return `${one.name} ${one.subgenre} ${one.description} ${one.promptSnippet}`.toLowerCase().includes(q);
    });
  }, [shelf, q]);

  const wordsOf = (one: SongStart): string => `[Verse]\n${(lang === 'af' ? one.af : one.en).first}`;
  const chip = (id: Shelf, label: string, data: Record<string, string>) => (
    <button
      key={id}
      type="button"
      {...data}
      aria-pressed={shelf === id}
      onClick={() => setShelf(id)}
      className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border py-1 pl-1 pr-3 text-xs font-semibold ${
        shelf === id
          ? 'border-emerald-400 bg-emerald-500 text-onAccent'
          : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
      }`}
    >
      {/* The meerkat in the feeling's light — every choice a picture. */}
      {SHELF_PICTURES[id] ? (
        <MeerkatThumb className="h-7 w-7 shrink-0 !rounded-full" mood={SHELF_PICTURES[id].mood} filter={SHELF_PICTURES[id].filter} />
      ) : null}
      {label}
    </button>
  );

  return (
    <div
      data-makepicker
      role="dialog"
      aria-label={t('pick.title', 'Somewhere to start')}
      className="flex max-h-[min(70vh,560px)] flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl"
    >
      <div className="flex shrink-0 items-center gap-2 p-3 pb-2">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            data-pickersearch
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('pick.search', 'Search feelings, styles, songs…')}
            aria-label={t('pick.search', 'Search feelings, styles, songs…')}
            className="w-full rounded-full border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-hidden"
          />
        </label>
        <button
          type="button"
          onClick={() => { stop(); onClose(); }}
          aria-label={t('common.close', 'Close')}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* sideways on purpose: thirty chips wrapped would be five rows of
          buttons above a list on a phone, and the list is the point. One row,
          like theirs — the feelings first, because that is how most songs
          start, then the families of sound. */}
      <div className="flex shrink-0 gap-1.5 overflow-x-auto px-3 pb-2" data-pickershelves>
        {chip('all', t('pick.all', 'All'), {})}
        {MOODS.map((one) => chip(one.id, lang === 'af' ? one.af : one.en, { 'data-shelf': one.id }))}
        {GENRE_CATEGORIES.filter((one) => one !== 'All').map((one) => chip(one, one, { 'data-family': one }))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-zinc-800" data-starts="">
        {starts.length > 0 && (
          <>
            <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              {t('pick.starts', 'Songs to start from')}
              <span className="ml-1.5 font-normal normal-case tracking-normal">
                {t('pick.startsNote', '— written by us, not by a model. No credits.')}
              </span>
            </p>
            <ul>
              {starts.map((one) => {
                const said = lang === 'af' ? one.af : one.en;
                return (
                  <li key={one.id}>
                    <button
                      type="button"
                      data-start={one.id}
                      onClick={() => {
                        stop();
                        onStart({ title: said.title, words: wordsOf(one), style: one.style, bpm: one.bpm });
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-900"
                    >
                      <span className="h-9 w-9 shrink-0 rounded-full" style={swatch(said.title)} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{said.title}</span>
                        <span className="block truncate text-xs text-zinc-500">{said.first.split('\n')[0]}</span>
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">{one.bpm} BPM</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {sounds.length > 0 && (
          <>
            <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              {t('pick.sounds', 'Sounds')}
              <span className="ml-1.5 font-normal normal-case tracking-normal">
                {t('pick.soundsNote', '— added to your sound, never over it.')}
              </span>
            </p>
            <ul>
              {sounds.map((one) => {
                const chosen = currentStyle.toLowerCase().includes(one.promptSnippet.toLowerCase().slice(0, 24));
                return (
                  <li key={one.name} className="flex items-center gap-1 pr-2 hover:bg-zinc-900">
                    <button
                      type="button"
                      data-sound={one.name}
                      onClick={() => { stop(); onStyle(one.promptSnippet); }}
                      className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
                    >
                      <span className="h-9 w-9 shrink-0 rounded-full" style={swatch(one.name)} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-semibold ${chosen ? 'text-emerald-300' : 'text-white'}`}>
                          {one.name}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">{one.subgenre} · {one.bpm}</span>
                      </span>
                    </button>
                    {canHear && (
                      <button
                        type="button"
                        onClick={() => listen(one)}
                        aria-label={playing === one.name ? t('repertoire.stopAudio', 'Stop sound') : t('repertoire.audition', 'Listen')}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          playing === one.name ? 'bg-emerald-500 text-onAccent' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        {playing === one.name ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {starts.length === 0 && sounds.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-zinc-500">{t('repertoire.empty', 'No styles match your search.')}</p>
        )}
      </div>

      {/* Start from a song of your own or a photograph, or say the sound in
          your own words. One open at a time: either is taller than the list. */}
      <div className="shrink-0 border-t border-zinc-800 p-2">
        <button
          type="button"
          data-pickerbring
          aria-expanded={foot === 'bring'}
          onClick={() => setFoot((was) => (was === 'bring' ? null : 'bring'))}
          className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold text-zinc-200 hover:bg-zinc-900"
        >
          <Upload className="h-4 w-4 text-emerald-400" />
          {t('pick.bring', 'Upload a song or a photo to start from')}
        </button>
        {foot === 'bring' && <div className="max-h-[40vh] space-y-3 overflow-y-auto p-2">{upload}</div>}
        <button
          type="button"
          data-pickerbring
          data-pickerfind
          aria-expanded={foot === 'find'}
          onClick={() => setFoot((was) => (was === 'find' ? null : 'find'))}
          className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-semibold text-zinc-200 hover:bg-zinc-900"
        >
          <PenLine className="h-4 w-4 text-emerald-400" />
          {t('pick.find', 'Say the sound in your own words')}
        </button>
        {foot === 'find' && <div className="max-h-[40vh] overflow-y-auto p-2">{finder}</div>}
      </div>
    </div>
  );
}
