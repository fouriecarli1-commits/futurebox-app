'use client';

/**
 * The song in two lanes: the voice, and everything else.
 *
 * ── What this is and is not ──────────────────────────────────────────────
 *
 * It is two audio tracks with their own levels, played together, from one
 * playhead. That is enough to do the thing people actually want from a song
 * they already have: bring the voice up because it is buried, take it down
 * because it is shouting, or pull it out altogether and keep the backing.
 *
 * It is not a mixer. There is no EQ, no compression, no fades, no moving
 * anything in time — and drawing controls for those would be drawing controls
 * that do nothing, which is worse than not having them. Two lanes and two
 * faders is the honest extent of what two stems allow.
 *
 * ── Two stems, not six ───────────────────────────────────────────────────
 *
 * That is `/api/stems`'s decision and it is the right one: vocal-and-the-rest
 * answers the question, and six stems cost twice as much to answer nothing
 * extra. See that route's own note.
 *
 * ── Why it is its own player ─────────────────────────────────────────────
 *
 * The timeline above plays the finished mix through an `<audio>` element. Two
 * transports running at once is how a screen ends up playing a song twice,
 * slightly apart, so opening the lanes stops that one and says so. Playing
 * here goes through Web Audio, because two files that must stay together
 * cannot be two `<audio>` elements: they are started on separate clocks and
 * drift audibly within a minute. Both are scheduled against one
 * `AudioContext.currentTime`, which is what keeps them locked.
 *
 * ── The separation is paid for once ──────────────────────────────────────
 *
 * It costs real money upstream, so it happens once per song and is kept on the
 * device beside the song — `lib/stems.ts` handles that, and the Booth has been
 * using the same two files since it was built. Opening the lanes on a song the
 * booth has already separated costs nothing at all, and the screen says which
 * of the two situations it is in before anybody presses anything.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, Music4, Pause, Play, Scissors, Volume2, VolumeX } from 'lucide-react';
import { CREDITS, perMinute } from '../lib/credits';
import { downloadBlob, safeFilename } from '../lib/library';
import { failed, loadStems, separate, type Stems } from '../lib/stems';
import { encodeWav } from '../lib/wav';
import { useLang } from '../lib/i18n';
import Cost from './Cost';

interface Lane {
  readonly id: 'vocals' | 'music';
  readonly buffer: AudioBuffer;
}

/** Peaks for one lane, at whatever width the strip is drawn at. */
function peaksFor(buffer: AudioBuffer, columns: number): number[] {
  const data = buffer.getChannelData(0);
  const per = Math.max(1, Math.floor(data.length / columns));
  const out: number[] = [];
  for (let column = 0; column < columns; column += 1) {
    let peak = 0;
    const from = column * per;
    for (let at = from; at < from + per && at < data.length; at += 1) {
      const value = Math.abs(data[at]);
      if (value > peak) peak = value;
    }
    out.push(peak);
  }
  return out;
}

export default function Lanes({
  trackId,
  title,
  audio,
  seconds,
  onOpen,
}: {
  readonly trackId: string;
  readonly title: string;
  /** The finished song, already read by the timeline above. */
  readonly audio: Blob | null;
  readonly seconds: number;
  /** Called when the lanes take over playback, so the timeline stops. */
  readonly onOpen?: () => void;
}): React.ReactElement {
  const { t } = useLang();

  const [stems, setStems] = useState<Stems | null>(null);
  const [lanes, setLanes] = useState<Lane[] | null>(null);
  const [busy, setBusy] = useState<'looking' | 'splitting' | 'keeping' | null>('looking');
  const [problem, setProblem] = useState<string | null>(null);

  const [level, setLevel] = useState<{ vocals: number; music: number }>({ vocals: 1, music: 1 });
  const [muted, setMuted] = useState<{ vocals: boolean; music: boolean }>({ vocals: false, music: false });
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const gainsRef = useRef<Record<string, GainNode>>({});
  const startedAt = useRef(0);
  const fromRef = useRef(0);
  const frame = useRef<number | null>(null);

  // What is already on the device. The booth may have paid for this song
  // months ago, and asking somebody to pay again for a file we have would be
  // indefensible.
  useEffect(() => {
    let alive = true;
    setStems(null);
    setLanes(null);
    setBusy('looking');
    void loadStems(trackId).then((found) => {
      if (!alive) return;
      setStems(found);
      setBusy(null);
    });
    return () => {
      alive = false;
    };
  }, [trackId]);

  const stop = useCallback(() => {
    sourcesRef.current.forEach((one) => {
      try {
        one.stop();
      } catch {
        // Already stopped. Nothing to do and nothing worth saying.
      }
    });
    sourcesRef.current = [];
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  // Decoded once, when there is something to decode.
  useEffect(() => {
    if (!stems) return;
    let alive = true;
    void (async () => {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        setProblem(t('lanes.noAudio', 'This browser cannot lay a song out in tracks.'));
        return;
      }
      const context = ctxRef.current ?? new Ctx();
      ctxRef.current = context;
      try {
        const [vocals, music] = await Promise.all([
          context.decodeAudioData(await stems.vocals.arrayBuffer()),
          context.decodeAudioData(await stems.music.arrayBuffer()),
        ]);
        if (!alive) return;
        setLanes([
          { id: 'vocals', buffer: vocals },
          { id: 'music', buffer: music },
        ]);
      } catch {
        if (alive) setProblem(t('lanes.unreadable', 'The two tracks could not be read back.'));
      }
    })();
    return () => {
      alive = false;
    };
  }, [stems, t]);

  const split = useCallback(async () => {
    if (!audio || busy) return;
    setBusy('splitting');
    setProblem(null);
    try {
      const made = await separate(trackId, audio, seconds);
      if (failed(made)) {
        setProblem(made.message);
        return;
      }
      setStems(made);
    } finally {
      setBusy(null);
    }
  }, [audio, busy, trackId, seconds]);

  /** Both lanes, scheduled against one clock, from `from` seconds in. */
  const play = useCallback(
    (from: number) => {
      const context = ctxRef.current;
      if (!context || !lanes) return;
      stop();
      void context.resume();

      const begin = context.currentTime + 0.05;
      gainsRef.current = {};
      for (const lane of lanes) {
        const source = context.createBufferSource();
        source.buffer = lane.buffer;
        const gain = context.createGain();
        gain.gain.value = muted[lane.id] ? 0 : level[lane.id];
        source.connect(gain).connect(context.destination);
        source.start(begin, Math.min(from, lane.buffer.duration));
        sourcesRef.current.push(source);
        gainsRef.current[lane.id] = gain;
      }
      startedAt.current = begin;
      fromRef.current = from;
      setPlaying(true);

      const tick = () => {
        const now = (ctxRef.current?.currentTime ?? 0) - startedAt.current + fromRef.current;
        const longest = lanes.reduce((most, one) => Math.max(most, one.buffer.duration), 0);
        if (now >= longest) {
          stop();
          setAt(0);
          return;
        }
        setAt(Math.max(0, now));
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
    [lanes, level, muted, stop],
  );

  // Moving a fader while it is playing has to be heard now, not on the next
  // press. The gain nodes are live, so this is the whole of it.
  useEffect(() => {
    if (!lanes) return;
    for (const lane of lanes) {
      const gain = gainsRef.current[lane.id];
      if (gain) gain.gain.value = muted[lane.id] ? 0 : level[lane.id];
    }
  }, [level, muted, lanes]);

  const toggle = useCallback(() => {
    if (playing) {
      stop();
      return;
    }
    onOpen?.();
    play(at);
  }, [playing, stop, onOpen, play, at]);

  /**
   * The balance, rendered to a file.
   *
   * Offline, so a three-minute song takes about a second and comes out the
   * same every time — a real-time capture would print whatever else the
   * machine was doing. Downloaded rather than saved over the song: the
   * original is what every other screen and every playlist points at, and
   * quietly replacing it because somebody moved a fader would be the app
   * editing their library on their behalf.
   */
  const keep = useCallback(async () => {
    if (!lanes || busy) return;
    setBusy('keeping');
    setProblem(null);
    try {
      const Offline = (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext })
        .OfflineAudioContext;
      if (!Offline) {
        setProblem(t('lanes.noAudio', 'This browser cannot lay a song out in tracks.'));
        return;
      }
      const rate = lanes[0].buffer.sampleRate;
      const longest = lanes.reduce((most, one) => Math.max(most, one.buffer.duration), 0);
      const offline = new Offline(2, Math.ceil(longest * rate), rate);
      for (const lane of lanes) {
        const source = offline.createBufferSource();
        source.buffer = lane.buffer;
        const gain = offline.createGain();
        gain.gain.value = muted[lane.id] ? 0 : level[lane.id];
        source.connect(gain).connect(offline.destination);
        source.start(0);
      }
      const rendered = await offline.startRendering();
      downloadBlob(encodeWav(rendered), safeFilename(`${title} (mix)`, 'wav'));
    } catch {
      setProblem(t('lanes.keepFailed', 'That balance could not be rendered.'));
    } finally {
      setBusy(null);
    }
  }, [lanes, busy, muted, level, title, t]);

  const price = perMinute(seconds, CREDITS.stems);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <Music4 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-200">{t('lanes.title', 'The song in tracks')}</p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {t(
              'lanes.what',
              'The voice on one track and everything else on the other, with a level each. Enough to bring a buried vocal up, push a loud one down, or drop it out and keep the backing. Not a mixer — two stems is what two faders are honest about.',
            )}
          </p>
        </div>
      </div>

      {!stems && busy !== 'looking' && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 leading-relaxed">
            {t(
              'lanes.first',
              'Separating happens once and is then kept on this device beside the song, so opening these lanes again costs nothing. The booth uses the same two files.',
            )}
          </p>
          <Cost credits={price} />
          <button
            type="button"
            onClick={() => void split()}
            disabled={!audio || busy !== null}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-600 disabled:opacity-50"
          >
            {busy === 'splitting' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Scissors className="w-4 h-4" />
            )}
            {t('lanes.split', 'Split it into tracks')}
          </button>
        </div>
      )}

      {lanes && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? t('common.pause', 'Pause') : t('common.play', 'Play')}
              className="w-11 h-11 rounded-full bg-white text-onAccent flex items-center justify-center flex-shrink-0"
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <span className="text-sm text-zinc-500 tabular-nums">
              {Math.floor(at / 60)}:{String(Math.floor(at % 60)).padStart(2, '0')}
            </span>
            <span className="text-xs text-zinc-600">
              {t('lanes.together', 'Both tracks play together, from one playhead.')}
            </span>
          </div>

          {lanes.map((lane) => {
            const name =
              lane.id === 'vocals' ? t('lanes.voice', 'The voice') : t('lanes.backing', 'Everything else');
            const off = muted[lane.id];
            return (
              <div key={lane.id} className="rounded-xl border border-zinc-800 bg-black/30 p-2.5 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setMuted((was) => ({ ...was, [lane.id]: !was[lane.id] }))}
                    aria-pressed={off}
                    className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold ${
                      off
                        ? 'border-zinc-700 bg-zinc-900 text-zinc-500'
                        : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    }`}
                  >
                    {off ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    {name}
                  </button>
                  <label className="sr-only" htmlFor={`lane-${lane.id}`}>
                    {name}
                  </label>
                  <input
                    id={`lane-${lane.id}`}
                    type="range"
                    min={0}
                    max={150}
                    value={Math.round(level[lane.id] * 100)}
                    onChange={(event) =>
                      setLevel((was) => ({ ...was, [lane.id]: Number(event.target.value) / 100 }))
                    }
                    className="flex-1 min-w-[8rem] accent-emerald-500"
                  />
                  <span className="text-xs text-zinc-500 tabular-nums w-12 text-right">
                    {Math.round(level[lane.id] * 100)}%
                  </span>
                </div>
                <Wave buffer={lane.buffer} at={at} dim={off} />
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => void keep()}
            disabled={busy !== null}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-600 disabled:opacity-50"
          >
            {busy === 'keeping' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {t('lanes.keep', 'Keep this balance as a file')}
          </button>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {t(
              'lanes.keepNote',
              'Downloaded, not saved over the song. The original is what your playlists and every other screen point at.',
            )}
          </p>
        </div>
      )}

      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
    </div>
  );
}

/** One lane's shape, with the playhead on it. */
function Wave({ buffer, at, dim }: { buffer: AudioBuffer; at: number; dim: boolean }): React.ReactElement {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const width = canvas.clientWidth || 320;
    const height = 44;
    canvas.width = width * 2;
    canvas.height = height * 2;
    context.scale(2, 2);
    context.clearRect(0, 0, width, height);

    const peaks = peaksFor(buffer, Math.floor(width / 2));
    context.fillStyle = dim ? 'rgba(113,113,122,0.35)' : 'rgba(16,185,129,0.6)';
    peaks.forEach((peak, index) => {
      const tall = Math.max(1, peak * height);
      context.fillRect(index * 2, (height - tall) / 2, 1.2, tall);
    });

    if (buffer.duration > 0) {
      const x = Math.min(width, (at / buffer.duration) * width);
      context.fillStyle = 'rgba(255,255,255,0.8)';
      context.fillRect(x, 0, 1, height);
    }
  }, [buffer, at, dim]);

  return <canvas ref={ref} className="w-full h-11 rounded" />;
}
