'use client';

/**
 * Singing it yourself.
 *
 * The question was whether ElevenLabs could put your own voice on a song. It
 * cannot: their cloning is for speech, and the Music API takes no voice at all.
 * So this does it the way it has always been done — the engine makes the
 * backing, you sing over it, and the two are mixed. The vocal on the finished
 * track is a recording of a person, which is a stronger claim than any clone.
 *
 * Three things this screen has to get right:
 *
 *   · The microphone is opened with echo cancellation, noise suppression and
 *     automatic gain **off**. Those three are tuned for a voice call and they
 *     wreck singing — the compressor pumps on held notes and the suppressor
 *     treats a quiet phrase as background.
 *
 *   · The recorder starts before the music and the gap is measured, so the
 *     round-trip latency is a known number rather than something to guess at.
 *
 *   · Whatever is left over is a slider you can hear. No arithmetic beats a
 *     person listening to it line up, so the preview plays both together and
 *     the nudge takes effect immediately.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Play, Square, X } from 'lucide-react';
import { decode, knownLatency, mixdown } from '../lib/mixdown';
import { useLang } from '../lib/i18n';
import type { Track } from '../lib/library';

type Phase = 'idle' | 'arming' | 'recording' | 'review' | 'keeping';

export default function VoiceTake({
  track,
  music,
  onKeep,
  onClose,
}: {
  track: Track;
  /** The backing to sing over. */
  music: Blob;
  onKeep: (mixed: Blob) => void | Promise<void>;
  onClose: () => void;
}): React.ReactElement {
  const { t } = useLang();

  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(3);
  const [problem, setProblem] = useState<string | null>(null);

  /** Seconds. Negative pulls the voice earlier, which is the usual direction. */
  const [offset, setOffset] = useState(0);
  const [musicGain, setMusicGain] = useState(0.8);
  const [takeGain, setTakeGain] = useState(1);

  const [musicBuffer, setMusicBuffer] = useState<AudioBuffer | null>(null);
  const [takeBuffer, setTakeBuffer] = useState<AudioBuffer | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const previewRef = useRef<AudioContext | null>(null);

  // Everything opened here is closed here, including the microphone. A tab that
  // keeps the mic light on after you have left the screen is not acceptable.
  const stopPreview = useCallback(() => {
    if (previewRef.current) {
      void previewRef.current.close();
      previewRef.current = null;
    }
    setPreviewing(false);
  }, []);

  const release = useCallback(() => {
    stopPreview();
    recorderRef.current?.state === 'recording' && recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((one) => one.stop());
    streamRef.current = null;
    audioRef.current?.pause();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, [stopPreview]);

  useEffect(() => release, [release]);

  // The backing is decoded up front, because the review step needs it and
  // decoding a three-minute file mid-take would stall the recording.
  useEffect(() => {
    let live = true;
    decode(music).then((buffer) => {
      if (live) setMusicBuffer(buffer);
    });
    return () => {
      live = false;
    };
  }, [music]);

  const start = useCallback(async () => {
    setProblem(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // Voice-call processing, all of it off. See the note at the top.
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });
    } catch (error) {
      setProblem(
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? t('take.denied', 'The microphone was not allowed. Turn it on for this site and try again.')
          : t('take.noMic', 'No microphone could be opened.'),
      );
      return;
    }
    streamRef.current = stream;

    // Three, two, one — nobody can start singing on a button press.
    setPhase('arming');
    for (let n = 3; n > 0; n -= 1) {
      setCount(n);
      await new Promise((resolve) => setTimeout(resolve, 900));
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorderRef.current = recorder;

    const element = audioRef.current;
    if (!element) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(music);
    element.src = urlRef.current;
    element.currentTime = 0;

    // The order matters: the recorder first, then the music, and the gap
    // between them is measured rather than assumed. That gap is silence at the
    // front of the recording and is most of the alignment problem.
    recorder.start();
    const recorderStarted = performance.now();
    await element.play();
    const musicStarted = performance.now();
    const gap = (musicStarted - recorderStarted) / 1000;

    // Negative: the voice is pulled earlier by the silence plus whatever the
    // browser admits its own output latency is.
    setOffset(-(gap + knownLatency()));
    setPhase('recording');

    element.onended = () => void stop();
  }, [music, t]);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    audioRef.current?.pause();
    if (!recorder || recorder.state !== 'recording') return;

    const finished = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
    });
    recorder.stop();
    streamRef.current?.getTracks().forEach((one) => one.stop());
    streamRef.current = null;

    const taken = await finished;
    const buffer = await decode(taken);
    if (!buffer) {
      setProblem(t('take.unreadable', 'That recording could not be read back.'));
      setPhase('idle');
      return;
    }
    setTakeBuffer(buffer);
    setPhase('review');
  }, [t]);

  /** Plays both together from a point, so the nudge can be heard. */
  const preview = useCallback(
    (from: number) => {
      stopPreview();
      if (!musicBuffer || !takeBuffer) return;
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;

      const ctx = new Ctx();
      previewRef.current = ctx;
      const now = ctx.currentTime + 0.08;

      const music = ctx.createBufferSource();
      music.buffer = musicBuffer;
      const musicLevel = ctx.createGain();
      musicLevel.gain.value = musicGain;
      music.connect(musicLevel).connect(ctx.destination);
      music.start(now, from);

      const take = ctx.createBufferSource();
      take.buffer = takeBuffer;
      const takeLevel = ctx.createGain();
      takeLevel.gain.value = takeGain;
      take.connect(takeLevel).connect(ctx.destination);
      // Where the take is at this point in the music. Before its own start, it
      // is delayed instead of being asked to play from a negative position.
      const takeAt = from - offset;
      if (takeAt >= 0) take.start(now, Math.min(takeAt, takeBuffer.duration));
      else take.start(now - takeAt, 0);

      music.onended = () => setPreviewing(false);
      setPreviewing(true);
    },
    [musicBuffer, musicGain, offset, stopPreview, takeBuffer, takeGain],
  );

  const keep = useCallback(async () => {
    if (!musicBuffer || !takeBuffer) return;
    stopPreview();
    setPhase('keeping');
    const mixed = await mixdown({ music: musicBuffer, take: takeBuffer, offset, musicGain, takeGain });
    if (!mixed) {
      setProblem(t('take.mixFailed', 'The mix could not be made.'));
      setPhase('review');
      return;
    }
    await onKeep(mixed);
  }, [musicBuffer, musicGain, offset, onKeep, stopPreview, t, takeBuffer, takeGain]);

  return (
    <div className="rounded-2xl border border-emerald-500/40 bg-zinc-950/80 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-white">{t('take.title', 'Sing it yourself')}</p>
          <p className="text-sm text-zinc-500 leading-snug">
            {t('take.note', 'The backing plays, you sing over it, and the two are mixed. Headphones, or the microphone will pick the music up as well.')}
          </p>
        </div>
        <button type="button" onClick={() => { release(); onClose(); }} className="text-zinc-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

      {phase === 'idle' && (
        <button
          type="button"
          onClick={() => void start()}
          disabled={!musicBuffer}
          className="w-full py-3 rounded-xl bg-emerald-500 text-onAccent font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {musicBuffer ? <Mic className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
          {musicBuffer ? t('take.start', 'Record a take') : t('take.loading', 'Reading the backing…')}
        </button>
      )}

      {phase === 'arming' && (
        <div className="py-6 text-center">
          <span className="text-5xl font-black text-emerald-400 tabular-nums">{count}</span>
        </div>
      )}

      {phase === 'recording' && (
        <button
          type="button"
          onClick={() => void stop()}
          className="w-full py-3 rounded-xl bg-red-500/20 border border-red-500 text-red-300 font-bold flex items-center justify-center gap-2"
        >
          <Square className="w-4 h-4 fill-current" />
          {t('take.stop', 'Stop')}
        </button>
      )}

      {(phase === 'review' || phase === 'keeping') && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">{t('take.nudge', 'Nudge the voice')}</span>
              <span className="text-zinc-300 tabular-nums">{Math.round(offset * 1000)} ms</span>
            </div>
            <input
              type="range"
              min={-600}
              max={600}
              step={5}
              value={Math.round(offset * 1000)}
              onChange={(event) => setOffset(Number(event.target.value) / 1000)}
              className="w-full accent-emerald-500"
            />
            <p className="text-sm text-zinc-600 leading-snug">
              {t('take.nudgeNote', 'Left pulls the voice earlier. Measured from the recording, then set by ear.')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-sm text-zinc-400">{t('take.musicLevel', 'Backing')}</span>
              <input
                type="range" min={0} max={1} step={0.05} value={musicGain}
                onChange={(event) => setMusicGain(Number(event.target.value))}
                className="w-full accent-emerald-500"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-zinc-400">{t('take.voiceLevel', 'Your voice')}</span>
              <input
                type="range" min={0} max={2} step={0.05} value={takeGain}
                onChange={(event) => setTakeGain(Number(event.target.value))}
                className="w-full accent-emerald-500"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => (previewing ? stopPreview() : preview(0))}
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              {previewing ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {previewing ? t('take.stopPreview', 'Stop') : t('take.listen', 'Listen to both')}
            </button>
            <button
              type="button"
              onClick={() => void start()}
              className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 text-sm"
            >
              {t('take.again', 'Again')}
            </button>
            <button
              type="button"
              onClick={() => void keep()}
              disabled={phase === 'keeping'}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {phase === 'keeping' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t('take.keep', 'Keep this take')}
            </button>
          </div>
        </div>
      )}

      {/* The backing, played out loud during a take. Never shown. */}
      <audio ref={audioRef} className="hidden" />
      <p className="text-sm text-zinc-600 leading-snug">
        {t('take.credit', 'The voice on this is yours — recorded, not generated. It is credited that way.')} · {track.title}
      </p>
    </div>
  );
}
