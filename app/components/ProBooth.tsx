'use client';

/**
 * The booth for people who do this for a living.
 *
 * The ordinary booth is built around one voice over one song, and that is the
 * right shape for somebody singing along to something they generated. It is
 * the wrong shape for a musician. They want lanes — a lead, a double, a
 * harmony, a guitar recorded on a phone, a sound they generated and dropped in
 * — each with a level, a place in time, a mute and a solo, and a mix at the end
 * that is theirs rather than the app's.
 *
 * What it deliberately is not: a digital audio workstation. There is no
 * automation, no plugin chain, no bus routing, and pretending otherwise by
 * drawing knobs that do nothing would be worse than leaving them out. What is
 * here is real — every fader, every mute, every offset is in the file that
 * comes out the other end, and `app/lib/session.ts` decides that once so the
 * mixer and the mixdown can never disagree about what you are listening to.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Circle, Loader2, Plus, Square, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { audible, mixSession, readInto, span, type Lane } from '../lib/session';
import { decodeAt, shapeOf } from '../lib/takes';
import { encodeWav } from '../lib/wav';
import { knownLatency } from '../lib/mixdown';
import { useLang } from '../lib/i18n';

/** A lane is drawn this tall. Enough to read a waveform, small enough to stack. */
const LANE_H = 56;

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export default function ProBooth({
  title,
  backing,
  onKeep,
  onClose,
}: {
  title: string;
  /** The song, as the first lane. Everything else is placed against it. */
  backing: AudioBuffer | null;
  onKeep: (mixed: Blob) => void | Promise<void>;
  onClose: () => void;
}): React.ReactElement {
  const { t } = useLang();

  const [lanes, setLanes] = useState<Lane[]>([]);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const playingRef = useRef<AudioBufferSourceNode[]>([]);
  const startedRef = useRef({ at: 0, from: 0 });
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordFromRef = useRef(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const rate = backing?.sampleRate ?? 48_000;
  const total = Math.max(span(lanes), 1);

  // The song is the first lane, and it arrives once.
  useEffect(() => {
    if (!backing) return;
    setLanes((was) =>
      was.some((lane) => lane.backing)
        ? was
        : [
            {
              id: 'backing',
              name: title,
              audio: backing,
              at: 0,
              gain: 0.85,
              muted: false,
              soloed: false,
              backing: true,
            },
            ...was,
          ],
    );
  }, [backing, title]);

  const context = useCallback((): AudioContext | null => {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!ctxRef.current) ctxRef.current = new Ctx();
    return ctxRef.current;
  }, []);

  const hush = useCallback(() => {
    playingRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Already finished.
      }
    });
    playingRef.current = [];
  }, []);

  const play = useCallback(
    (from: number) => {
      const ctx = context();
      if (!ctx) return;
      hush();
      void ctx.resume();
      const begins = ctx.currentTime + 0.06;
      audible(lanes).forEach((lane) => {
        const source = ctx.createBufferSource();
        source.buffer = lane.audio;
        const level = ctx.createGain();
        level.gain.value = lane.gain;
        source.connect(level).connect(ctx.destination);
        // A lane that starts before the moment being played from is joined
        // part-way through rather than from its beginning.
        const into = from - lane.at;
        if (into >= 0) {
          if (into < lane.audio.duration) source.start(begins, into);
        } else {
          source.start(begins - into);
        }
        playingRef.current.push(source);
      });
      startedRef.current = { at: begins, from };
      setPlaying(true);
    },
    [context, hush, lanes],
  );

  const stopPlaying = useCallback(() => {
    hush();
    setPlaying(false);
  }, [hush]);

  // The clock, while anything is running.
  useEffect(() => {
    if (!playing && !recording) return;
    let frame = 0;
    const step = (): void => {
      const ctx = ctxRef.current;
      if (ctx) {
        const now = startedRef.current.from + (ctx.currentTime - startedRef.current.at);
        setAt(Math.max(0, Math.min(total, now)));
        if (now >= total && !recording) {
          stopPlaying();
          return;
        }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, recording, stopPlaying, total]);

  useEffect(
    () => () => {
      hush();
      streamRef.current?.getTracks().forEach((one) => one.stop());
      void ctxRef.current?.close();
    },
    [hush],
  );

  // ── recording into a lane of its own ──────────────────────────────────────
  const record = useCallback(async () => {
    setProblem(null);
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          // Off, for the same reason as the ordinary booth: all three are built
          // for speech and all three chew a held note.
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
        });
      }
    } catch {
      setProblem(t('pro.noMic', 'No microphone could be opened.'));
      return;
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorderRef.current = recorder;
    recordFromRef.current = at;
    // A chunk a second, so a recording that ends badly is still a recording.
    recorder.start(1000);
    play(at);
    setRecording(true);
  }, [at, play, t]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    setRecording(false);
    stopPlaying();
    if (!recorder || recorder.state !== 'recording') return;

    const gather = (): Blob => new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
    const finished = new Promise<Blob>((resolve) => {
      const done = (): void => resolve(gather());
      recorder.onstop = done;
      recorder.onerror = done;
      window.setTimeout(done, 3000);
    });
    try {
      recorder.stop();
    } catch {
      // Already down.
    }

    setBusy(true);
    try {
      const raw = await finished;
      const piece = raw.size > 0 ? await decodeAt(raw, rate) : null;
      if (!piece) {
        setProblem(t('pro.unreadable', 'That recording could not be read back.'));
        return;
      }
      setLanes((was) => [
        ...was,
        {
          id: `lane-${Date.now()}`,
          name: `${t('pro.take', 'Take')} ${was.filter((lane) => !lane.backing).length + 1}`,
          audio: piece,
          // Where it was sung, less the round trip the browser measured.
          at: Math.max(0, recordFromRef.current - knownLatency()),
          gain: 1,
          muted: false,
          soloed: false,
        },
      ]);
    } catch {
      setProblem(t('pro.unreadable', 'That recording could not be read back.'));
    } finally {
      setBusy(false);
    }
  }, [rate, stopPlaying, t]);

  // ── bringing audio in from outside ────────────────────────────────────────
  const bringIn = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setProblem(null);
      setBusy(true);
      try {
        for (const file of Array.from(files)) {
          const audio = await readInto(file, rate);
          if (!audio) {
            setProblem(t('pro.badFile', 'That file could not be read as audio.'));
            continue;
          }
          setLanes((was) => [
            ...was,
            {
              id: `lane-${Date.now()}-${file.name}`,
              name: file.name.replace(/\.[^.]+$/, '').slice(0, 40),
              audio,
              at,
              gain: 1,
              muted: false,
              soloed: false,
            },
          ]);
        }
      } finally {
        setBusy(false);
      }
    },
    [at, rate, t],
  );

  const change = (id: string, how: Partial<Lane>): void =>
    setLanes((was) => was.map((lane) => (lane.id === id ? { ...lane, ...how } : lane)));

  const keep = useCallback(async () => {
    setBusy(true);
    setProblem(null);
    try {
      const mixed = await mixSession(lanes, rate);
      if (!mixed) {
        setProblem(t('pro.mixFailed', 'The mix could not be made.'));
        return;
      }
      await onKeep(encodeWav(mixed));
    } catch {
      setProblem(t('pro.mixFailed', 'The mix could not be made.'));
    } finally {
      setBusy(false);
    }
  }, [lanes, onKeep, rate, t]);

  const heard = useMemo(() => audible(lanes), [lanes]);

  return (
    <div className="fixed inset-0 z-[70] bg-zinc-950 flex flex-col">
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-zinc-800 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-base font-bold text-white truncate">{t('pro.title', 'The booth — pro')}</p>
          <p className="text-sm text-zinc-500 truncate">
            {title} · {lanes.length} {lanes.length === 1 ? t('pro.lane', 'lane') : t('pro.lanes', 'lanes')} ·{' '}
            {clock(total)}
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white flex-shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── The lanes ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2">
        {lanes.map((lane) => (
          <LaneRow
            key={lane.id}
            lane={lane}
            lanes={lanes}
            total={total}
            at={at}
            onChange={(how) => change(lane.id, how)}
            onRemove={() => setLanes((was) => was.filter((one) => one.id !== lane.id))}
          />
        ))}

        {lanes.length <= 1 && (
          <p className="text-sm text-zinc-600 leading-snug px-1 pt-2">
            {t('pro.empty', 'Record a take or bring a file in, and it lands here as a lane of its own. Every lane keeps its own level, its own place in time and its own mute — and what you hear is what gets mixed.')}
          </p>
        )}
      </div>

      {problem && <p className="text-sm text-amber-400 leading-snug px-5 pb-2">{problem}</p>}

      {/* ── The transport ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pt-2 pb-3 border-t border-zinc-800 flex flex-wrap items-center gap-2">
        {recording ? (
          <button
            type="button"
            onClick={() => void stopRecording()}
            className="px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500 text-red-300 text-sm font-bold flex items-center gap-2"
          >
            <Square className="w-4 h-4 fill-current" />
            {t('pro.stop', 'Stop')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void record()}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <Circle className="w-4 h-4 fill-current" />
            {t('pro.record', 'Record a lane')}
          </button>
        )}

        <button
          type="button"
          onClick={() => (playing ? stopPlaying() : play(at))}
          disabled={busy || recording || !heard.length}
          className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          {playing ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          {playing ? t('pro.stopPlaying', 'Stop') : t('pro.play', 'Play')}
        </button>

        <button
          type="button"
          onClick={() => {
            stopPlaying();
            setAt(0);
          }}
          disabled={recording}
          className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold disabled:opacity-50"
        >
          {t('pro.toStart', 'Back to the start')}
        </button>

        <span className="text-sm text-zinc-500 tabular-nums px-1">
          {clock(at)} / {clock(total)}
        </span>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || recording}
          className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {t('pro.bringIn', 'Bring audio in')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(event) => {
            void bringIn(event.target.files);
            event.target.value = '';
          }}
        />

        <span className="flex-1" />

        <button
          type="button"
          onClick={() => void keep()}
          disabled={busy || recording || !heard.length}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center gap-2 disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {t('pro.keep', 'Mix it down')}
        </button>
      </div>
    </div>
  );
}

/** One lane: what it is, what it sounds like, and where it sits. */
function LaneRow({
  lane,
  lanes,
  total,
  at,
  onChange,
  onRemove,
}: {
  lane: Lane;
  lanes: readonly Lane[];
  total: number;
  at: number;
  onChange: (how: Partial<Lane>) => void;
  onRemove: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const quiet = audible(lanes).indexOf(lane) < 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    // Where this lane sits on the session's clock, not on its own.
    const left = (lane.at / total) * width;
    const wide = (lane.audio.duration / total) * width;
    const columns = Math.max(8, Math.floor(wide / 2));
    const shape = shapeOf(lane.audio, columns);
    context.fillStyle = quiet
      ? 'rgba(113,113,122,0.35)'
      : lane.backing
        ? 'rgba(148,163,184,0.55)'
        : 'rgba(16,185,129,0.75)';
    for (let i = 0; i < columns; i += 1) {
      const x = left + (i / columns) * wide;
      const size = Math.max(1, shape[i] * (height - 6));
      context.fillRect(x, height / 2 - size / 2, Math.max(1, wide / columns - 0.5), size);
    }

    const head = (at / total) * width;
    context.fillStyle = '#fff';
    context.fillRect(head - 1, 0, 2, height);
  }, [at, lane, quiet, total]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2 flex items-center gap-3">
      <div className="w-40 flex-shrink-0 space-y-1">
        <input
          value={lane.name}
          onChange={(event) => onChange({ name: event.target.value.slice(0, 40) })}
          className="w-full bg-transparent text-sm font-semibold text-zinc-200 outline-none focus:text-white"
          aria-label={t('pro.laneName', 'Lane name')}
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange({ muted: !lane.muted })}
            className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
              lane.muted ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-zinc-950 border-zinc-700 text-zinc-500'
            }`}
          >
            {lane.muted ? <VolumeX className="w-3 h-3" /> : t('pro.mute', 'M')}
          </button>
          <button
            type="button"
            onClick={() => onChange({ soloed: !lane.soloed })}
            className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${
              lane.soloed
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-zinc-950 border-zinc-700 text-zinc-500'
            }`}
          >
            {t('pro.solo', 'S')}
          </button>
          <input
            type="range"
            min={0}
            max={150}
            value={Math.round(lane.gain * 100)}
            onChange={(event) => onChange({ gain: Number(event.target.value) / 100 })}
            className="flex-1 accent-emerald-500"
            aria-label={t('pro.level', 'Level')}
          />
          <span className="text-[11px] text-zinc-500 tabular-nums w-8 text-right">
            {Math.round(lane.gain * 100)}
          </span>
        </div>
      </div>

      <canvas ref={canvasRef} className="flex-1 rounded-lg bg-zinc-950/70" style={{ height: LANE_H }} />

      <div className="w-28 flex-shrink-0 flex items-center gap-1">
        <input
          type="number"
          step={0.05}
          value={Number(lane.at.toFixed(2))}
          onChange={(event) => onChange({ at: Number(event.target.value) })}
          disabled={lane.backing}
          className="w-16 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-sm text-zinc-300 tabular-nums disabled:opacity-40"
          aria-label={t('pro.startsAt', 'Starts at')}
        />
        <span className="text-[11px] text-zinc-600">s</span>
        {!lane.backing && (
          <button type="button" onClick={onRemove} className="text-zinc-600 hover:text-red-400 ml-auto">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
