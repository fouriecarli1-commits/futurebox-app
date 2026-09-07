'use client';

/**
 * Which song, and which five seconds of it.
 *
 * ── What was wrong ───────────────────────────────────────────────────────
 *
 * "Die video desk het nie 'n opsie om liedjies te kies vir 'n musiek video
 *  nie." It had one, and that is the more useful version of the complaint:
 * the song picker lived at the bottom of the storyboard, behind a condition
 * that only opened once at least one shot had been written. Somebody choosing
 * Music video and looking for their song found a prompt box. A control that
 * exists but cannot be found is a control that does not exist.
 *
 * So it is here, under the Music tile, the moment that tile is pressed.
 *
 * ── And the window ───────────────────────────────────────────────────────
 *
 * A five-second video laid against the first five seconds of a track is laid
 * against the intro, which on most records is the part with nothing in it.
 * Her ask was exact: the song in a bar, two lines that drag, capped to the
 * length the video is going to be, dragged onto the part of the song the video
 * should use.
 *
 * The cap is why the two lines are not independent. The film is five or ten
 * seconds because that is what the engine was asked for, so the window is
 * exactly that long and either line moves the whole of it. Letting them be
 * dragged apart would offer a three-second window for a five-second video and
 * then have to explain the two seconds of silence.
 *
 * ── What is drawn on the bar ─────────────────────────────────────────────
 *
 * The waveform is measured from the file (`lib/peaks.ts`), because a
 * decorative squiggle is a picture of nothing and you cannot find the chorus
 * in it — finding the chorus is the entire job here.
 *
 * A song this app wrote also carries its composition plan, so the sections are
 * marked along the top: dragging to "Chorus" beats dragging to 0:47. A song
 * brought in from a file has no plan and gets the waveform alone.
 *
 * A song this app wrote carries its tempo too, and the window's start is
 * snapped to the nearest beat when that tempo is believable. A cut that lands
 * a sixteenth late reads as a mistake at any length, and at five seconds there
 * is nothing after it to recover.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Music, Pause, Play, Trash2, Upload } from 'lucide-react';
import { loadTracks, type Track } from '../lib/library';
import { addUpload, loadUploads, removeUpload } from '../lib/uploads';
import { readAudio } from '../lib/trackaudio';
import { peaksOf, type Peaks } from '../lib/peaks';
import { beatOf, sane } from '../lib/onbeat';
import { useLang } from '../lib/i18n';
import Note from './Note';

/** The piece of a song a video is cut against. */
export interface SongCut {
  readonly songId: string;
  /** Seconds into the song where the video starts. */
  readonly from: number;
  /** Where it stops. Always `from` plus the video's length, clamped to the song. */
  readonly to: number;
}

interface Props {
  /** The video's length. The window is capped to it, and resizes when it changes. */
  readonly seconds: number;
  readonly value: SongCut | null;
  readonly onChange: (cut: SongCut | null) => void;
}

function clock(at: number): string {
  const whole = Math.max(0, Math.floor(at));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * Where each named section of a song starts and ends.
 *
 * The plan is a list of lengths, so the boundaries are the running total. It
 * is what the app asked the engine for rather than what came back, which makes
 * it a good guide and a bad clock — near enough to find the chorus by, not
 * near enough to cut by, and it is only ever drawn as a label.
 */
function sectionsOf(track: Track | null, duration: number): { name: string; from: number; to: number }[] {
  if (!track?.parts?.length || !Number.isFinite(duration) || duration <= 0) return [];
  const asked = track.parts.reduce((sum, one) => sum + Math.max(0, one.seconds), 0);
  if (asked <= 0) return [];
  // Scaled to the file's real length: the plan's seconds and the engine's
  // rarely agree, and a section drawn past the end of the bar is worse than no
  // sections at all.
  const scale = duration / asked;
  let at = 0;
  return track.parts.map((one) => {
    const from = at;
    at += Math.max(0, one.seconds) * scale;
    return { name: one.name, from, to: Math.min(duration, at) };
  });
}

export default function SongWindow({ seconds, value, onChange }: Props) {
  const { t } = useLang();
  const [tracks, setTracks] = useState<readonly Track[]>([]);
  const [brought, setBrought] = useState<readonly Track[]>([]);
  const [peaks, setPeaks] = useState<Peaks | null>(null);
  const [reading, setReading] = useState(false);
  const [taking, setTaking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const heldRef = useRef<string | null>(null);

  useEffect(() => {
    setTracks(loadTracks());
    setBrought(loadUploads());
  }, []);

  const all = useMemo(() => [...tracks, ...brought], [tracks, brought]);
  const song = all.find((one) => one.id === value?.songId) ?? null;

  /* The file, once per song rather than once per drag.

     Decoding is the expensive part — a three-minute track is about thirty
     million samples — and the window moves continuously. */
  useEffect(() => {
    let alive = true;
    if (!value?.songId) {
      setPeaks(null);
      return () => { alive = false; };
    }
    setReading(true);
    setPeaks(null);
    void (async () => {
      const blob = await readAudio(value.songId);
      if (!alive) return;
      if (!blob) {
        setProblem(t('songwin.gone', 'That song’s file is not on this device. Open it in your library once and it will be.'));
        setReading(false);
        return;
      }
      if (heldRef.current) URL.revokeObjectURL(heldRef.current);
      const url = URL.createObjectURL(blob);
      heldRef.current = url;
      if (soundRef.current) soundRef.current.src = url;
      const read = await peaksOf(blob);
      if (!alive) return;
      setPeaks(read);
      setReading(false);
    })();
    return () => { alive = false; };
  }, [value?.songId, t]);

  useEffect(() => () => {
    if (heldRef.current) URL.revokeObjectURL(heldRef.current);
  }, []);

  const duration = peaks?.duration ?? song?.seconds ?? 0;
  const span = Math.min(seconds, duration || seconds);
  const sections = useMemo(() => sectionsOf(song, duration), [song, duration]);

  /* Snapped to a beat, when the tempo is worth trusting.

     `sane()` is the guard rather than a truthy check on bpm: a song row
     carrying 0, or 6000 because something parsed a field wrong, would drag the
     window to a grid that is not the song's. */
  const toBeat = useCallback(
    (at: number) => {
      const bpm = song?.bpm ?? 0;
      if (!sane(bpm)) return at;
      const beat = beatOf(bpm);
      return Math.round(at / beat) * beat;
    },
    [song?.bpm],
  );

  const place = useCallback(
    (from: number) => {
      if (!value) return;
      const most = Math.max(0, duration - span);
      const start = Math.min(Math.max(0, toBeat(from)), most);
      onChange({ songId: value.songId, from: start, to: Math.min(duration, start + span) });
    },
    [value, duration, span, toBeat, onChange],
  );

  /* The window follows the video's length rather than the other way round.

     Choosing ten seconds after dragging a five-second window used to leave a
     five-second window and a ten-second video. The start is kept and the end
     follows, which is the half somebody actually chose. */
  useEffect(() => {
    if (!value || !duration) return;
    const want = Math.min(seconds, duration);
    if (Math.abs(value.to - value.from - want) < 0.01) return;
    const most = Math.max(0, duration - want);
    const from = Math.min(value.from, most);
    onChange({ songId: value.songId, from, to: Math.min(duration, from + want) });
  }, [seconds, duration, value, onChange]);

  const pick = useCallback(
    (id: string) => {
      if (value?.songId === id) {
        onChange(null);
        return;
      }
      onChange({ songId: id, from: 0, to: seconds });
    },
    [value?.songId, seconds, onChange],
  );

  const bringIn = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setTaking(true);
      setProblem(null);
      try {
        const added = await addUpload(file);
        setBrought(loadUploads());
        onChange({ songId: added.id, from: 0, to: seconds });
      } catch (error) {
        const why = error instanceof Error ? error.message : '';
        setProblem(
          why === 'too-big'
            ? t('songwin.tooBig', 'That file is over 60 MB. Trim it or export it smaller.')
            : t('songwin.unreadable', 'This browser could not read that audio. MP3, WAV or M4A work.'),
        );
      } finally {
        setTaking(false);
      }
    },
    [seconds, onChange, t],
  );

  const drop = useCallback(
    async (id: string) => {
      await removeUpload(id);
      setBrought(loadUploads());
      if (value?.songId === id) onChange(null);
    },
    [value?.songId, onChange],
  );

  /* Dragging.

     Pointer events rather than mouse events, and the pointer is captured, so a
     thumb that slides off the bar keeps dragging instead of dropping the
     handle where it left. `touch-none` on the bar stops the page scrolling
     underneath the drag, which is the difference between adjusting a window
     and scrolling past it. */
  const dragging = useRef<'from' | 'to' | 'body' | null>(null);
  const grabbed = useRef(0);

  const atEvent = useCallback((clientX: number): number => {
    const bar = barRef.current;
    if (!bar || !duration) return 0;
    const box = bar.getBoundingClientRect();
    if (box.width <= 0) return 0;
    return ((clientX - box.left) / box.width) * duration;
  }, [duration]);

  const onDown = (which: 'from' | 'to' | 'body') => (event: React.PointerEvent) => {
    if (!value || !duration) return;
    event.preventDefault();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    dragging.current = which;
    grabbed.current = atEvent(event.clientX) - value.from;
  };

  const onMove = (event: React.PointerEvent) => {
    if (!dragging.current || !value) return;
    const at = atEvent(event.clientX);
    if (dragging.current === 'from') place(at);
    else if (dragging.current === 'to') place(at - span);
    else place(at - grabbed.current);
  };

  const onUp = () => { dragging.current = null; };

  /* Arrow keys as well as a thumb.

     Both handles are sliders, so a keyboard reaches them, and the step is one
     beat where the tempo is known — the same grid the drag snaps to, which
     means the two ways of moving the window agree. */
  const onKey = (event: React.KeyboardEvent) => {
    if (!value) return;
    const bpm = song?.bpm ?? 0;
    const step = sane(bpm) ? beatOf(bpm) : 0.5;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      place(value.from - step);
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      place(value.from + step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      place(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      place(duration);
    }
  };

  /* Hearing the window, which is the only way to know it is the right one. */
  const listen = useCallback(() => {
    const sound = soundRef.current;
    if (!sound || !value) return;
    if (playing) {
      sound.pause();
      setPlaying(false);
      return;
    }
    sound.currentTime = value.from;
    void sound.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [playing, value]);

  useEffect(() => {
    const sound = soundRef.current;
    if (!sound || !value) return undefined;
    const stop = () => {
      if (sound.currentTime >= value.to) {
        sound.pause();
        setPlaying(false);
      }
    };
    sound.addEventListener('timeupdate', stop);
    return () => sound.removeEventListener('timeupdate', stop);
  }, [value]);

  const left = duration ? ((value?.from ?? 0) / duration) * 100 : 0;
  const width = duration ? (span / duration) * 100 : 0;

  return (
    <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex items-start gap-2.5">
        <Music className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-zinc-100">
            {t('songwin.title', 'Which song, and which part of it')}
          </h3>
          <Note className="text-xs text-zinc-500">
            {t(
              'songwin.why',
              'Pick one and drag the window onto the part you want. It is exactly as long as the video, so what you hear here is what goes under it.',
            )}
          </Note>
        </div>
      </div>

      {/* ── The songs, as buttons ──────────────────────────────────────────
          Not a list behind a dropdown. Everything else in this app was taken
          off dropdowns for the reason that applies here too: a choice you have
          to open is a choice you do not know you have. */}
      <div className="flex flex-wrap gap-2">
        {all.map((one) => {
          const on = value?.songId === one.id;
          return (
            <button
              key={one.id}
              type="button"
              onClick={() => pick(one.id)}
              aria-pressed={on}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
                on
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:text-white'
              }`}
            >
              <span className="truncate max-w-[12rem]">{one.title}</span>
              <span className="text-xs font-normal text-zinc-500">{clock(one.seconds)}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={taking}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white disabled:opacity-50"
        >
          {taking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {t('songwin.bring', 'Bring one in')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(event) => {
            void bringIn(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
        />
      </div>

      {all.length === 0 && (
        <Note className="text-xs text-zinc-500">
          {t('songwin.none', 'No songs on this device yet. Make one, or bring a file in with the button.')}
        </Note>
      )}

      {problem && (
        <p role="alert" className="text-xs text-rose-300">{problem}</p>
      )}

      {value && (
        <div className="space-y-2">
          {reading && (
            <p className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t('songwin.reading', 'Reading the song…')}
            </p>
          )}

          {/* The sections, where the song has a plan to draw them from. */}
          {sections.length > 0 && duration > 0 && (
            <div className="relative h-4 select-none" aria-hidden="true">
              {sections.map((one, index) => (
                <span
                  key={`${one.name}-${index}`}
                  className="absolute top-0 truncate text-[10px] uppercase tracking-wide text-zinc-500"
                  style={{
                    left: `${(one.from / duration) * 100}%`,
                    width: `${Math.max(0, ((one.to - one.from) / duration) * 100)}%`,
                  }}
                >
                  {one.name}
                </span>
              ))}
            </div>
          )}

          {/* ── The bar ────────────────────────────────────────────────────
              Literal colours rather than the theme's: this is a picture, and
              the palette here remaps white and black onto theme variables, so
              a waveform drawn in `text-white` would be drawn in near-black. */}
          <div
            ref={barRef}
            data-song-bar
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className="relative h-20 w-full touch-none overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
          >
            <div className="absolute inset-0 flex items-center gap-px px-px">
              {(peaks ? Array.from(peaks.values) : new Array(120).fill(0)).map((level, index, list) => {
                const at = duration * ((index + 0.5) / list.length);
                const inside = value && at >= value.from && at <= value.to;
                return (
                  <span
                    key={index}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${Math.max(3, level * 100)}%`,
                      background: inside ? 'rgb(52 211 153)' : 'rgb(82 82 91)',
                    }}
                  />
                );
              })}
            </div>

            {/* Everything outside the window, dimmed, so the window is what
                the eye lands on rather than something to be found. */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0"
              style={{ width: `${left}%`, background: 'rgba(9, 9, 11, 0.66)' }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0"
              style={{ width: `${Math.max(0, 100 - left - width)}%`, background: 'rgba(9, 9, 11, 0.66)' }}
            />

            {/* The window itself, grabbable in the middle. */}
            <div
              data-song-window
              onPointerDown={onDown('body')}
              className="absolute inset-y-0 cursor-grab active:cursor-grabbing"
              style={{ left: `${left}%`, width: `${width}%`, border: '1px solid rgb(52 211 153)', borderRadius: '0.5rem' }}
            />

            {/* The two lines. Wide enough to catch a thumb — 44px of target on
                a bar that is only a few pixels of line. */}
            {(['from', 'to'] as const).map((which) => (
              <div
                key={which}
                data-song-handle={which}
                role="slider"
                tabIndex={0}
                aria-label={
                  which === 'from'
                    ? t('songwin.startAt', 'Where the video starts in the song')
                    : t('songwin.endAt', 'Where the video ends in the song')
                }
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(which === 'from' ? value.from : value.to)}
                aria-valuetext={clock(which === 'from' ? value.from : value.to)}
                onPointerDown={onDown(which)}
                onKeyDown={onKey}
                className="absolute inset-y-0 w-11 cursor-ew-resize touch-none focus:outline-none"
                style={{
                  left: `calc(${which === 'from' ? left : left + width}% - 22px)`,
                }}
              >
                <span
                  className="pointer-events-none absolute inset-y-1 left-1/2 w-1 -translate-x-1/2 rounded-full"
                  style={{ background: 'rgb(52 211 153)' }}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={listen}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {playing ? t('songwin.stop', 'Stop') : t('songwin.hear', 'Hear this bit')}
            </button>

            <p className="text-xs text-zinc-400">
              {clock(value.from)} – {clock(value.to)}
              <span className="text-zinc-600"> · </span>
              {Math.round(span)}s
              {sane(song?.bpm ?? 0) && (
                <>
                  <span className="text-zinc-600"> · </span>
                  {t('songwin.onBeat', 'on the beat at')} {Math.round(song?.bpm ?? 0)} BPM
                </>
              )}
            </p>

            {song?.source === 'upload' && (
              <button
                type="button"
                onClick={() => void drop(song.id)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
              >
                <Trash2 className="w-4 h-4" />
                {t('songwin.take', 'Take it back out')}
              </button>
            )}
          </div>

          <Note className="text-xs text-zinc-500">
            {t(
              'songwin.cost',
              'The song is laid under the clip after the engine answers, in this browser. That takes about as long as the video is — five seconds of video, five seconds of waiting — and costs no credits.',
            )}
          </Note>

          {/* Not rendered with controls: it is the ear on the window, not a
              second player competing with the one in the library. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio ref={soundRef} preload="metadata" className="hidden" />
        </div>
      )}
    </section>
  );
}
