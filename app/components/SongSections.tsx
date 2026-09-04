'use client';

/**
 * Studio — your song, laid out in its own sections.
 *
 * The old version of this screen worked on demo tracks with invented
 * arrangements, which made it a diagram of a song rather than a view of one.
 * It works on what you actually made now, and that only became possible once
 * songs started carrying the composition plan they were built from: the app
 * told the music service the verse was 72 seconds and the chorus 36, so it
 * knows where every section starts without analysing anything.
 *
 * What it can and cannot do, said plainly because the difference matters. It
 * can show the real audio, put the playhead on it, and let you jump to a
 * section. It cannot patch a section in place — the music service generates a
 * whole song from a whole plan, and there is no endpoint that replaces bar 33
 * to 48. So editing a section here changes the plan and makes a **new take**,
 * which is a different thing from an edit and is labelled as one. Miming an
 * in-place edit and quietly returning a fresh song would be worse than
 * refusing.
 *
 * ## Arranging
 *
 * Renaming a section and rewriting its words was all this could do, and the
 * report was fair: that is proofreading, not editing. Most of what anybody
 * does to a song is *arrangement* — move the bridge before the last chorus,
 * cut the second verse, say the chorus twice, put a bridge in that was never
 * written. All four are here now.
 *
 * They are honest through the round trip, which is why these four and not
 * others. The plan travels back to the make screen as a lyric sheet, so the
 * order of the sections is the order of the tags, deleting one removes a
 * block, and adding one inserts a block. Nothing is inferred and nothing is
 * lost.
 *
 * A section's **length** is deliberately not editable, and the screen says so
 * rather than drawing a slider that does nothing. Lengths are not carried in
 * the sheet: `splitSections` recomputes them from how many lines each section
 * has against the song's total. A number you could drag that was thrown away
 * on the way out is worse than no number, so the screen explains what actually
 * decides a section's length — more lines, and the total you choose when you
 * make it.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Loader2, Music4, Pause, Play, Plus, SlidersHorizontal, Sparkles, Trash2 } from 'lucide-react';
import { loadTracks } from '../lib/library';
import { splitSections } from '../lib/engines';
import { readAudio } from '../lib/trackaudio';
import { peaksOf, type Peaks } from '../lib/peaks';
import { markBlob } from '../lib/watermark';
import { levelOf, loadOwned, NOTHING, type Owned } from '../lib/purchases';
import { useLang } from '../lib/i18n';
import { useCopilotOps, matchByTitle } from '../lib/copilotactions';
import type { Track } from '../lib/library';
import Lanes from './Lanes';

interface Part {
  name: string;
  lines: string[];
  seconds: number;
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** Section colours, cycled, so two next to each other never match. */
const SHADES = [
  'bg-emerald-500/25 border-emerald-500/60',
  'bg-cyan-500/25 border-cyan-500/60',
  'bg-violet-500/25 border-violet-500/60',
  'bg-amber-500/25 border-amber-500/60',
  'bg-rose-500/25 border-rose-500/60',
];

/**
 * The sections of a song, however it came by them.
 *
 * A song made here carries the plan it was built from — the app told the music
 * service the verse was 72 seconds and the chorus 36 — and those are the real
 * boundaries, to the second.
 *
 * A song that has words but no plan is the interesting case, and it used to be
 * turned away. That is every song made before plans were carried, every one
 * from a path that does not build one, and every one somebody wrote the words
 * for by hand. The room answered all of them with "No song to lay out yet",
 * which reads as a room that does nothing rather than as a song that is
 * missing something.
 *
 * The words alone are enough to lay out. `splitSections` reads the [Section]
 * tags and weights each part by how many lines it carries — the same function
 * the make screen uses to build a plan in the first place, so what is shown
 * here is what would be sent. The lengths are then estimates rather than
 * measurements, which is a real difference and is said on screen rather than
 * quietly presented as the same thing.
 */
function sectionsOf(track: Track): Part[] {
  const carried = (track.parts ?? []) as Part[];
  if (carried.length) return carried.map((part) => ({ ...part, lines: [...part.lines] }));
  return splitSections(track.lyrics ?? '', track.seconds).map((part) => ({
    ...part,
    lines: [...part.lines],
  }));
}

/** True where the boundaries were worked out from the words, not carried. */
function estimated(track: Track): boolean {
  return !((track.parts ?? []).length > 0);
}

export default function SongSections({
  reloadKey,
  onRemake,
  open,
}: {
  /** Bumped when a song is made, so the list here picks it up. */
  reloadKey: number;
  /** Hands an edited plan back to the Make screen and starts a new take. */
  onRemake: (next: { title: string; lyrics: string; style: string }) => void;
  /**
   * A song to open on arrival, sent by whoever opened this room.
   *
   * The channel has an edit button per song now, and it would be a strange
   * button that dropped you at the top of somebody's list. Read once per
   * value, so choosing a different song here is not undone on the next render.
   */
  open?: string | null;
}): React.ReactElement {
  const { t } = useLang();

  // Read from the same place the Make screen keeps them rather than threading
  // the list down through the page: one source, and no chance of two lists
  // disagreeing about what exists.
  const [tracks, setTracks] = useState<Track[]>([]);
  useEffect(() => {
    setTracks(loadTracks());
  }, [reloadKey]);

  /* Anything with words. A sketch with no lyrics at all still cannot be laid
     out — there is nothing to lay out — but that is now the only exclusion,
     rather than "was made by the one path that records a plan". */
  const usable = useMemo(
    () => tracks.filter((track) => sectionsOf(track).length > 0),
    [tracks],
  );

  /* Choose which song is on the timeline. Only the ones the timeline can
     actually open are offered to the match, so naming a sketch that has no
     audio behind it leaves the picker where it was rather than selecting a
     song that then fails to load. */
  useCopilotOps('studio', {
    pick_song: (value) => {
      const found = matchByTitle(usable, value);
      if (found) setChosen(found.id);
    },
  });

  const [chosen, setChosen] = useState<string>('');
  const track = usable.find((one) => one.id === chosen) ?? usable[0] ?? null;

  // Opened from somewhere else, and only for as long as that request is new.
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!open || opened.current === open) return;
    if (!usable.some((one) => one.id === open)) return;
    opened.current = open;
    setChosen(open);
  }, [open, usable]);

  const [parts, setParts] = useState<Part[]>([]);
  const [peaks, setPeaks] = useState<Peaks | null>(null);
  /* The song as it is allowed to be heard, held for the lanes.

     Deliberately the marked copy on a free song rather than the clean one.
     Splitting a song into two tracks and rendering a balance out of it is
     another way to a file, and this one does not pass through
     `downloadLink` — which is where every other download is checked against
     what was paid for. Marking before separating means the mark is in both
     stems and in anything mixed from them, so the lanes cannot become the
     back door to a clean master. */
  const [playable, setPlayable] = useState<Blob | null>(null);
  const [lanesOpen, setLanesOpen] = useState(false);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [owned, setOwned] = useState<Owned>(NOTHING);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    loadOwned().then(setOwned);
  }, []);

  useEffect(() => {
    const element = new Audio();
    element.addEventListener('ended', () => setPlaying(false));
    audioRef.current = element;
    return () => {
      element.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  // A fresh track resets everything: its own sections, its own audio, its own
  // waveform. Carrying any of it across would be showing one song's shape over
  // another song's sound.
  useEffect(() => {
    if (!track) return;
    setParts(sectionsOf(track));
    setPeaks(null);
    setPlayable(null);
    setLanesOpen(false);
    setAt(0);
    setPlaying(false);
    audioRef.current?.pause();

    let live = true;
    setLoading(true);
    readAudio(track.id).then(async (blob) => {
      if (!live || !blob) {
        setLoading(false);
        return;
      }
      const heard = levelOf(owned, track.id) === 'owned' ? blob : await markBlob(blob);
      if (!live) return;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(heard);
      if (audioRef.current) audioRef.current.src = urlRef.current;
      setPlayable(heard);
      setPeaks(await peaksOf(heard));
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [owned, track]);

  useEffect(() => {
    const element = audioRef.current;
    if (!element || !playing) return;
    let frame = 0;
    const step = () => {
      setAt(element.currentTime);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const duration = peaks?.duration || track?.seconds || 0;

  /** Where each section starts, scaled to how long the file really is. */
  const marks = useMemo(() => {
    const planned = parts.reduce((total, part) => total + Math.max(1, part.seconds), 0);
    if (!planned || !duration) return [];
    const scale = duration / planned;
    let running = 0;
    return parts.map((part) => {
      const start = running;
      running += Math.max(1, part.seconds) * scale;
      return { start, end: running };
    });
  }, [duration, parts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const columns = peaks.values.length;
    const step = width / columns;
    const played = duration > 0 ? (at / duration) * width : 0;
    const middle = height / 2;
    for (let i = 0; i < columns; i += 1) {
      const size = Math.max(1, peaks.values[i] * (height - 2));
      const x = i * step;
      context.fillStyle = x <= played ? 'rgb(16, 185, 129)' : 'rgb(63, 63, 70)';
      context.fillRect(x, middle - size / 2, Math.max(1, step - 0.5), size);
    }
    // Where one section ends and the next begins, over the audio it describes.
    context.strokeStyle = 'rgba(255,255,255,0.35)';
    context.lineWidth = 1;
    marks.forEach((mark) => {
      const x = duration > 0 ? (mark.start / duration) * width : 0;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    });
  }, [at, duration, marks, peaks]);

  const toggle = useCallback(() => {
    const element = audioRef.current;
    if (!element || !element.src) return;
    if (playing) {
      element.pause();
      setPlaying(false);
      return;
    }
    void element.play();
    setPlaying(true);
  }, [playing]);

  const seek = useCallback((seconds: number) => {
    const element = audioRef.current;
    if (!element) return;
    element.currentTime = seconds;
    setAt(seconds);
  }, []);

  /**
   * Arrangement.
   *
   * Each of these is a change to the order or the presence of a section, and
   * every one survives the trip back through the lyric sheet unchanged — which
   * is the reason these four exist and a length slider does not.
   */
  const move = useCallback((from: number, to: number) => {
    setParts((current) => {
      if (to < 0 || to >= current.length) return current;
      const next = current.slice();
      const [taken] = next.splice(from, 1);
      next.splice(to, 0, taken);
      return next;
    });
  }, []);

  const drop = useCallback((at_: number) => {
    setParts((current) => current.filter((_, index) => index !== at_));
  }, []);

  /**
   * Say it again.
   *
   * A chorus that comes round twice is the commonest arrangement change there
   * is, and typing it out a second time is how somebody ends up with two
   * choruses that are almost the same.
   */
  const again = useCallback((at_: number) => {
    setParts((current) => {
      const next = current.slice();
      next.splice(at_ + 1, 0, { ...current[at_], lines: [...current[at_].lines] });
      return next;
    });
  }, []);

  const add = useCallback(() => {
    setParts((current) => [...current, { name: 'Bridge', lines: [''], seconds: 0 }]);
  }, []);

  const remake = useCallback(() => {
    if (!track) return;
    // Back into a lyric sheet, which is the shape the Make screen and the plan
    // both speak. Nothing is lost in the round trip: the section names are the
    // tags, and the lines are the lines.
    const sheet = parts
      .filter((part) => part.lines.some((line) => line.trim()))
      .map((part) => `[${part.name}]\n${part.lines.filter((line) => line.trim()).join('\n')}`)
      .join('\n\n');
    onRemake({ title: track.title, lyrics: sheet, style: track.style });
  }, [onRemake, parts, track]);

  if (!usable.length) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-center space-y-2">
        <Music4 className="w-6 h-6 text-emerald-400 mx-auto" />
        <p className="text-base font-bold text-white">{t('sec.none', 'No song to lay out yet')}</p>
        <p className="text-sm text-zinc-500 leading-snug">
          {t('sec.noneNote', 'Make a song with words in it and it appears here, in its own sections.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <select
            value={track?.id ?? ''}
            onChange={(event) => setChosen(event.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none min-w-0 flex-1"
          >
            {usable.map((one) => (
              <option key={one.id} value={one.id}>{one.title}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggle}
            disabled={loading}
            className="w-11 h-11 rounded-full bg-emerald-500 text-onAccent flex items-center justify-center flex-shrink-0 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : playing ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>
        </div>

        <canvas
          ref={canvasRef}
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            seek(Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)) * duration);
          }}
          className="w-full h-20 cursor-pointer rounded-lg"
          style={{ background: peaks ? 'transparent' : 'rgba(39,39,42,0.4)' }}
        />
        <div className="flex items-center justify-between text-sm text-zinc-500 tabular-nums">
          <span>{clock(at)}</span>
          <span>{clock(duration)}</span>
        </div>

        {/* Where the boundaries came from. A measured plan and a guess off the
            words look identical on a waveform, and only one of them is worth
            trusting to the second. */}
        {track && estimated(track) && (
          <p className="text-xs text-zinc-500 leading-relaxed">
            {t(
              'sec.estimated',
              'These sections are worked out from the words — this song did not carry a plan, so the times are close rather than exact. Everything you change here still travels through in full.',
            )}
          </p>
        )}
      </div>

      {/* ── The song in tracks ──────────────────────────────────────────
          Under the transport and above the sections, which is the order the
          work goes in: hear it, take it apart, then change what is said. Shut
          by default — it is a second player and a paid separation, and neither
          should start because somebody opened a room. */}
      {track && (
        lanesOpen ? (
          <Lanes
            trackId={track.id}
            title={track.title}
            audio={playable}
            seconds={peaks?.duration || track.seconds || 0}
            onOpen={() => {
              // One transport at a time. Two players on one song is how a
              // screen ends up playing it twice, slightly apart.
              audioRef.current?.pause();
              setPlaying(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setLanesOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-600"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t('sec.lanes', 'Lay it out in tracks')}
          </button>
        )
      )}

      {/* The sections themselves: what is sung, and when. */}
      <div className="space-y-2">
        {parts.map((part, index) => {
          const mark = marks[index];
          const here = mark && at >= mark.start && at < mark.end;
          return (
            <div
              key={index}
              className={`rounded-2xl border p-3 space-y-2 transition-all ${
                here ? SHADES[index % SHADES.length] : 'border-zinc-800 bg-zinc-950/60'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <input
                  value={part.name}
                  onChange={(event) => {
                    const next = parts.slice();
                    next[index] = { ...part, name: event.target.value };
                    setParts(next);
                  }}
                  className="bg-transparent text-sm font-bold text-white focus:outline-none min-w-0 flex-1"
                />
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => mark && seek(mark.start)}
                    className="text-sm text-zinc-400 hover:text-emerald-300 tabular-nums px-1.5"
                  >
                    {mark ? clock(mark.start) : '—'}
                  </button>
                  {/* Arrangement. Disabled at the ends rather than hidden, so
                      the row does not change shape as things move. */}
                  <button
                    type="button"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    title={t('sec.up', 'Move it earlier')}
                    aria-label={t('sec.up', 'Move it earlier')}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-300 hover:bg-zinc-800 disabled:opacity-25 disabled:hover:bg-transparent"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, index + 1)}
                    disabled={index === parts.length - 1}
                    title={t('sec.down', 'Move it later')}
                    aria-label={t('sec.down', 'Move it later')}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-300 hover:bg-zinc-800 disabled:opacity-25 disabled:hover:bg-transparent"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => again(index)}
                    title={t('sec.again', 'Say it again')}
                    aria-label={t('sec.again', 'Say it again')}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-300 hover:bg-zinc-800"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => drop(index)}
                    disabled={parts.length <= 1}
                    title={t('sec.drop', 'Take it out')}
                    aria-label={t('sec.drop', 'Take it out')}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 disabled:opacity-25 disabled:hover:bg-transparent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <textarea
                value={part.lines.join('\n')}
                onChange={(event) => {
                  const next = parts.slice();
                  next[index] = { ...part, lines: event.target.value.split('\n') };
                  setParts(next);
                }}
                rows={Math.min(8, Math.max(2, part.lines.length))}
                className="w-full bg-black/40 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none leading-relaxed resize-y"
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={add}
        className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 text-sm font-semibold text-zinc-400 hover:border-emerald-500/60 hover:text-emerald-300 flex items-center justify-center gap-1.5"
      >
        <Plus className="w-4 h-4" />
        {t('sec.add', 'Put another section in')}
      </button>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2.5">
        {/* Said here rather than as a slider that does nothing: lengths are not
            carried in the lyric sheet, so a draggable number would be thrown
            away on the way out. */}
        <p className="text-sm text-zinc-500 leading-snug">{t('sec.lengthNote')}</p>
        <p className="text-sm text-zinc-400 leading-snug">{t('sec.remakeNote')}</p>
        <button
          type="button"
          onClick={remake}
          className="w-full py-3 rounded-xl bg-emerald-500 text-onAccent font-bold flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {t('sec.remake', 'Make a new take with these changes')}
        </button>
      </div>
    </div>
  );
}
