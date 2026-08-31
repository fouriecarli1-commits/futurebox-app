'use client';

/**
 * The track while it is playing: its shape, where you are in it, and the words.
 *
 * Two things this had to earn rather than decorate.
 *
 * The waveform is measured from the file — every column is the loudest sample
 * in that slice of the real audio. A drawn squiggle would have been a tenth of
 * the code and a picture of nothing; you could not use it to find the chorus,
 * which is the only reason to draw one. Clicking it seeks, because a waveform
 * you cannot click is a diagram, not a control.
 *
 * The words follow the music because the app wrote the composition plan itself
 * and knows the verse was asked for at 72 seconds and the chorus at 36. The
 * section highlight is therefore accurate. Inside a section the lines are
 * spread evenly, which nobody sings, so a line can be a second or two out — and
 * the note under the panel says exactly that instead of implying karaoke-grade
 * sync it cannot deliver.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import FollowWords from './FollowWords';
import { peaksOf, type Peaks } from '../lib/peaks';
import { lineAt, timelineOf, type Part } from '../lib/timeline';
import { useLang } from '../lib/i18n';
import type { Track } from '../lib/library';

/** Below this much of the plan, the audio is the short preview, not the song. */
const PREVIEW_RATIO = 0.6;

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export default function NowPlaying({
  track,
  audio,
  blob,
}: {
  track: Track;
  /** The one audio element the screen plays through. */
  audio: HTMLAudioElement | null;
  /** Exactly what is playing — the marked copy, if that is what is playing. */
  blob: Blob | null;
}): React.ReactElement | null {
  const { t } = useLang();
  const [peaks, setPeaks] = useState<Peaks | null>(null);
  const [at, setAt] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Decoding a three-minute track is thirty million samples, so it happens once
  // per track rather than once per render.
  useEffect(() => {
    if (!blob) return;
    let live = true;
    setPeaks(null);
    peaksOf(blob).then((result) => {
      if (live) setPeaks(result);
    });
    return () => {
      live = false;
    };
  }, [blob]);

  // The position, read every frame while it is moving. `timeupdate` fires about
  // four times a second, which is visible as a playhead that hops.
  useEffect(() => {
    if (!audio) return;
    let frame = 0;
    const step = () => {
      setAt(audio.currentTime);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [audio]);

  const duration = peaks?.duration || audio?.duration || track.seconds || 0;

  const timed = useMemo(() => {
    const parts = (track.parts ?? []) as readonly Part[];
    if (!parts.length || !duration) return [];
    // A free preview is fifteen seconds of a song that was planned as three
    // minutes. Stretching the whole lyric sheet over it would put the last
    // chorus in the first few seconds, so it is not followed at all.
    const planned = track.plannedSeconds ?? 0;
    if (planned && duration < planned * PREVIEW_RATIO) return [];
    return timelineOf(parts, duration);
  }, [duration, track.parts, track.plannedSeconds]);

  const current = timed.length ? lineAt(timed, at) : -1;
  /**
   * The big view, for singing along and for filming yourself doing it.
   *
   * The small panel below is right for a desk — the whole sheet, every line
   * clickable to seek. It is wrong for a phone propped against something, and
   * that is the moment people actually asked for.
   */
  const [following, setFollowing] = useState(false);

  // Keep the line being sung in the middle of the panel. Set directly rather
  // than with scrollIntoView, which scrolls the whole page when the panel is
  // near the bottom of it.
  useEffect(() => {
    const list = listRef.current;
    if (!list || current < 0) return;
    const line = list.children[current] as HTMLElement | undefined;
    if (!line) return;
    const wanted = line.offsetTop - list.clientHeight / 2 + line.clientHeight / 2;
    list.scrollTo({ top: Math.max(0, wanted), behavior: 'smooth' });
  }, [current]);

  // Drawn at the device's own resolution, or the bars are soft on a phone.
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
  }, [peaks, at, duration]);

  const seek = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audio || !duration) return;
    const box = event.currentTarget.getBoundingClientRect();
    const share = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    audio.currentTime = share * duration;
    setAt(audio.currentTime);
  };

  if (!audio) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-3">
      <div className="space-y-1.5">
        <canvas
          ref={canvasRef}
          onClick={seek}
          className="w-full h-16 cursor-pointer rounded-lg"
          // Something to look at while the file is being decoded, rather than a
          // panel that jumps into existence a second after playback starts.
          style={{ background: peaks ? 'transparent' : 'rgba(39,39,42,0.4)' }}
        />
        <div className="flex items-center justify-between text-sm text-zinc-500 tabular-nums">
          <span>{clock(at)}</span>
          <span>{clock(duration)}</span>
        </div>
      </div>

      {timed.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-zinc-400">{t('play.words', 'The words')}</span>
            <button
              type="button"
              onClick={() => setFollowing(true)}
              className="text-sm text-emerald-300 hover:underline flex items-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              {t('play.follow', 'Follow along')}
            </button>
          </div>
          <div
            ref={listRef}
            className="max-h-52 overflow-y-auto pr-1 space-y-0.5 scroll-smooth"
          >
            {timed.map((line, index) => (
              <div key={`${index}-${line.start}`}>
                {line.opensSection && (
                  <p className="text-[11px] uppercase tracking-widest text-zinc-600 pt-2 pb-0.5">
                    {line.section}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    audio.currentTime = line.start;
                    setAt(line.start);
                  }}
                  className={`block w-full text-left px-2 py-1 rounded-lg transition-colors ${
                    index === current
                      ? 'bg-emerald-500/15 text-emerald-200 font-semibold'
                      : index < current
                        ? 'text-zinc-600 hover:text-zinc-400'
                        : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {line.text}
                </button>
              </div>
            ))}
          </div>
          <p className="text-sm text-zinc-600 leading-snug">{t('play.followNote')}</p>
        </div>
      )}

      {following && (
        <FollowWords
          lines={timed}
          audio={audio}
          title={track.title}
          onClose={() => setFollowing(false)}
        />
      )}
    </div>
  );
}
