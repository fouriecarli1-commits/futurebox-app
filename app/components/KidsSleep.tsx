'use client';

/**
 * The sleep playlist: every kept song in a row, a timer, and a dark screen.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 13 October 2026: *"Die kamer moet ook 'n playlist funksie hê sodat
 * kinders letterlik aan die slaap kan raak op hulle playlist."*
 *
 * ── What it is ───────────────────────────────────────────────────────────
 *
 * The songs are the ones already on the child's shelf (`lib/songkeep.ts`):
 * made for credits, kept for nothing, and played here for nothing — nothing
 * in this file asks a server for anything. One `Audio` element plays them
 * one after the other and starts again at the top, so a playlist of three
 * songs is a night's worth.
 *
 * The timer is the part that makes it a SLEEP playlist. Pick how long, and
 * the music fades out over its last minute and stops; a song cut off mid-word
 * is a child sitting up. "Dim the screen" covers the room in near-black with
 * a moon on it, because a lit phone beside a pillow is a lit room — a tap
 * brings the room back without stopping the music.
 *
 * Nothing here is typed, nothing leaves the device, and the only buttons
 * are the ones on this page.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Moon, Pause, Play, SkipForward } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { allSongs, type KeptSong } from '../lib/songkeep';
import { asClock } from '../lib/kidsallowance';

/** The timers on offer, in minutes. Nought is "until I stop it". */
export const SLEEP_MINUTES: readonly number[] = [0, 10, 20, 30, 45];

/** The fade at the end, in seconds. A minute: long enough not to notice. */
export const FADE_SECONDS = 60;

export default function KidsSleep({
  again = 0,
  onSpark,
}: {
  /** Bumped by the room when a song is kept, so the list looks again. */
  readonly again?: number;
  readonly onSpark?: (n: number) => void;
}): React.ReactElement {
  const { t } = useLang();
  const [songs, setSongs] = useState<KeptSong[] | null>(null);
  const [at, setAt] = useState<number | null>(null);
  const [minutes, setMinutes] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [dim, setDim] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string>('');

  useEffect(() => {
    void allSongs().then(setSongs).catch(() => setSongs([]));
  }, [again]);

  const stop = useCallback((): void => {
    audio.current?.pause();
    audio.current = null;
    if (url.current) { URL.revokeObjectURL(url.current); url.current = ''; }
    setAt(null);
    setEndsAt(null);
    setLeft(null);
    setDim(false);
  }, []);

  /* Leaving the page stops the music: a playlist running under a room a
     child has left is a phone playing in a bag. */
  useEffect(() => () => {
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
  }, []);

  const playIndex = useCallback((index: number, list: KeptSong[]): void => {
    if (!list.length) return;
    const which = ((index % list.length) + list.length) % list.length;
    audio.current?.pause();
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = URL.createObjectURL(list[which].audio);
    const sound = new Audio(url.current);
    audio.current = sound;
    /* Round again at the end of the list: the point of a sleep playlist is
       that it does not run out before the child does. */
    sound.onended = () => playIndex(which + 1, list);
    sound.onerror = () => playIndex(which + 1, list);
    void sound.play().catch(() => undefined);
    setAt(which);
  }, []);

  const start = (): void => {
    if (!songs?.length) return;
    playIndex(0, songs);
    setEndsAt(minutes > 0 ? Date.now() + minutes * 60_000 : null);
    onSpark?.(5);
  };

  /* The clock: once a second, how long is left; in the last minute the
     volume comes down with it; at nought, everything stops. */
  useEffect(() => {
    if (endsAt === null) { setLeft(null); return undefined; }
    const tick = (): void => {
      const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setLeft(remaining);
      if (audio.current) {
        audio.current.volume = remaining < FADE_SECONDS ? Math.max(0, remaining / FADE_SECONDS) : 1;
      }
      if (remaining <= 0) stop();
    };
    tick();
    const beat = window.setInterval(tick, 1000);
    return () => window.clearInterval(beat);
  }, [endsAt, stop]);

  const playing = at !== null;

  return (
    <div className="space-y-4 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/85 p-4 shadow-lg backdrop-blur-sm sm:p-5" data-kidssleep>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="fb-kids-bubble flex items-center gap-2 text-xl font-bold text-surface-900 sm:text-2xl">
            <span aria-hidden>🌙</span> {t('kids.sleepTitle', 'Sleep playlist')}
          </h2>
          <p className="text-xs text-surface-700">
            {t('kids.sleepWhy', 'All your kept songs, one after the other, until you fall asleep. It uses no credits.')}
          </p>
        </div>
        {left !== null && (
          <span data-kidssleepleft={left} className="rounded-2xl border-2 border-amber-300/60 bg-surface-100 px-3 py-1.5 text-sm font-black tabular-nums text-amber-300">
            {asClock(left)}
          </span>
        )}
      </div>

      {songs === null ? (
        <p className="flex items-center gap-2 text-sm text-surface-700">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('songshelf.looking', 'Looking…')}
        </p>
      ) : songs.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-surface-300 px-4 py-4 text-center text-sm font-semibold text-surface-700" data-kidssleepempty>
          {t('kids.sleepNone', 'Keep a song first, then it can play you to sleep here.')}
        </p>
      ) : (
        <>
          {/* How long. Nought is until somebody stops it. */}
          <div className="flex flex-wrap items-center gap-2" data-kidssleeptimer>
            <span className="text-xs font-bold uppercase tracking-wider text-surface-700">
              {t('kids.sleepFor', 'Stop after')}
            </span>
            {SLEEP_MINUTES.map((step) => (
              <button
                key={step}
                type="button"
                aria-pressed={minutes === step}
                disabled={playing}
                onClick={() => setMinutes(step)}
                data-kidssleepmin={step}
                className={`min-h-[44px] rounded-2xl px-4 text-sm font-black disabled:opacity-50 ${
                  minutes === step ? 'bg-cyan-400 text-onAccent shadow-md' : 'bg-surface-200/80 text-surface-800'
                }`}
              >
                {step === 0 ? t('kids.sleepNever', 'Never') : `${step} ${t('kids.sleepMin', 'min')}`}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
            {playing ? (
              <button
                type="button"
                onClick={stop}
                data-kidssleepstop
                className="fb-kids-bouncy flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-surface-200 text-base font-black text-surface-900"
              >
                <Pause className="h-5 w-5" /> {t('kids.sleepStop', 'Stop the music')}
              </button>
            ) : (
              <button
                type="button"
                onClick={start}
                data-kidssleepplay
                className="fb-kids-bouncy flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-cyan-400 text-base font-black text-onAccent"
              >
                <Play className="h-5 w-5" fill="currentColor" /> {t('kids.sleepPlay', 'Play all my songs')}
              </button>
            )}
            <button
              type="button"
              disabled={!playing}
              onClick={() => playIndex((at ?? 0) + 1, songs)}
              data-kidssleepnext
              className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-surface-200/80 px-4 text-sm font-black text-surface-900 disabled:opacity-40"
            >
              <SkipForward className="h-5 w-5" /> {t('kids.sleepNext', 'Next')}
            </button>
            <button
              type="button"
              disabled={!playing}
              onClick={() => setDim(true)}
              data-kidssleepdim
              className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-surface-200/80 px-4 text-sm font-black text-surface-900 disabled:opacity-40"
            >
              <Moon className="h-5 w-5" /> {t('kids.sleepDim', 'Dim the screen')}
            </button>
          </div>

          <ol className="space-y-1.5" data-kidssleeplist>
            {songs.map((song, index) => (
              <li key={song.id}>
                <button
                  type="button"
                  onClick={() => { playIndex(index, songs); if (!playing) setEndsAt(minutes > 0 ? Date.now() + minutes * 60_000 : null); }}
                  data-kidssleepsong={song.id}
                  aria-pressed={at === index}
                  className={`flex min-h-[48px] w-full items-center gap-3 rounded-2xl border-2 px-3 text-left text-sm font-bold ${
                    at === index ? 'border-cyan-400 bg-cyan-400/20 text-surface-900' : 'border-surface-200 bg-surface-100/70 text-surface-800'
                  }`}
                >
                  <span className="w-5 text-center text-xs font-black text-surface-600">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{song.title}</span>
                  {at === index && <span aria-hidden className="text-base">🎶</span>}
                </button>
              </li>
            ))}
          </ol>
        </>
      )}

      {/* The dark screen. A tap brings the room back; the music carries on. */}
      {dim && (
        <button
          type="button"
          data-kidsdim
          onClick={() => setDim(false)}
          aria-label={t('kids.sleepWake', 'Tap to see the room again')}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black/95 text-center"
        >
          <span className="fb-kids-float text-7xl" aria-hidden>🌙</span>
          <span className="text-sm font-bold text-zinc-500">
            {left !== null ? asClock(left) : t('kids.sleepPlaying', 'Playing…')}
          </span>
          <span className="text-xs text-zinc-700">{t('kids.sleepWake', 'Tap to see the room again')}</span>
        </button>
      )}
    </div>
  );
}
