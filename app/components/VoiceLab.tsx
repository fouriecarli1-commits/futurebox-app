'use client';

/**
 * Voices: cloning one, and reading a script in it.
 *
 * The consent gate is the important part of this file and it is deliberately
 * not a checkbox buried under a button. A voice is not a style — it identifies
 * a person — and a clone made without them is impersonation whatever it was
 * meant for. So: you record here, live, now; you confirm in words that the
 * voice is your own; and the confirmation is stored with the clone. The server
 * refuses without it, so this screen cannot be the only thing standing there.
 *
 * What ElevenLabs is used for here, and what it is not: their cloning is for
 * speech, so this reads scripts — intros, narration, an episode from notes. It
 * does not sing, and nothing here pretends otherwise.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, Mic, Play, Square, Trash2, Wand2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { accessToken } from '../lib/cloud';

export interface Voice {
  readonly id: string;
  readonly name: string;
}

export interface VoiceState {
  readonly configured: boolean;
  readonly signedIn?: boolean;
  readonly tier?: string;
  readonly caps?: { voices: number; speakChars: number; speakPerDay: number; clean: boolean; publish: boolean };
  readonly mine: readonly Voice[];
  readonly stock: readonly Voice[];
}

/** Long enough for an instant clone to have something to learn from. */
const SAMPLE_SECONDS = 60;

/**
 * What to read while recording a sample.
 *
 * Varied sounds on purpose — a sample of one flat sentence produces a clone
 * that can only say that sentence convincingly.
 */
const READ_THIS =
  'This is my own voice, and I am recording it for FutureBox. ' +
  'I want to talk about the things I actually care about, in the way I would say them out loud. ' +
  'Some sentences are short. Others run on a little longer, because that is how people really speak when they are thinking. ' +
  'Numbers: one, seven, twenty-four, nineteen ninety-eight. ' +
  'A question, to hear how I lift at the end — does that sound like me?';

export default function VoiceLab({
  state,
  onChanged,
  onAudio,
  onUpgrade,
}: {
  state: VoiceState;
  onChanged: () => void;
  /** A finished reading, handed up so it can become an episode. */
  onAudio: (audio: Blob, how: 'spoken') => void;
  onUpgrade: () => void;
}): React.ReactElement {
  const { t } = useLang();

  const [recording, setRecording] = useState(false);
  const [left, setLeft] = useState(SAMPLE_SECONDS);
  const [consent, setConsent] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const [script, setScript] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [model, setModel] = useState<'steady' | 'wide'>('steady');
  const [spoken, setSpoken] = useState<Blob | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((one) => one.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const caps = state.caps;
  const mayClone = Boolean(caps && caps.voices > 0);
  const atLimit = Boolean(caps && state.mine.length >= caps.voices);

  const recordSample = useCallback(async () => {
    setProblem(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
    } catch {
      setProblem(t('take.denied', 'The microphone was not allowed. Turn it on for this site and try again.'));
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setLeft(SAMPLE_SECONDS);

    const tick = setInterval(() => {
      setLeft((was) => {
        if (was <= 1) {
          clearInterval(tick);
          void finishSample();
          return 0;
        }
        return was - 1;
      });
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const finishSample = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    const finished = new Promise<Blob>((resolve) => {
      recorder.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
    });
    recorder.stop();
    streamRef.current?.getTracks().forEach((one) => one.stop());
    streamRef.current = null;
    setRecording(false);

    const sample = await finished;
    setBusy('clone');
    try {
      const form = new FormData();
      form.append('sample', sample, 'sample.webm');
      form.append('name', name.trim());
      // The server refuses without this, and refuses to take the browser's word
      // for anything else about it either.
      form.append('consent', 'own-voice');

      const token = await accessToken();
      const response = await fetch('/api/voice/clone', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setProblem(data.message ?? 'That did not work.');
        return;
      }
      setConsent(false);
      onChanged();
    } finally {
      setBusy(null);
    }
  }, [name, onChanged]);

  const forget = useCallback(
    async (id: string) => {
      setBusy(id);
      const token = await accessToken();
      await fetch(`/api/voice/clone?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => {});
      setBusy(null);
      onChanged();
    },
    [onChanged],
  );

  const read = useCallback(async () => {
    setProblem(null);
    setBusy('speak');
    setSpoken(null);
    try {
      const token = await accessToken();
      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ voiceId, text: script, model }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { message?: string; needsPlan?: boolean };
        setProblem(data.message ?? 'That did not work.');
        if (data.needsPlan) onUpgrade();
        return;
      }
      const audio = await response.blob();
      setSpoken(audio);
      const player = playerRef.current;
      if (player) {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(audio);
        player.src = urlRef.current;
        void player.play();
      }
    } finally {
      setBusy(null);
    }
  }, [model, onUpgrade, script, voiceId]);

  const over = Boolean(caps && script.length > caps.speakChars);

  return (
    <div className="space-y-4">
      {/* ── Your voice ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div>
          <p className="text-base font-bold text-white">{t('voice.yours', 'Your own voice')}</p>
          <p className="text-sm text-zinc-500 leading-snug">
            {t('voice.yoursNote', 'Record about a minute and this can read scripts in your voice. It reads — it does not sing.')}
          </p>
        </div>

        {state.mine.length > 0 && (
          <div className="space-y-1.5">
            {state.mine.map((voice) => (
              <div key={voice.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
                <span className="text-sm text-zinc-200 font-semibold truncate">{voice.name}</span>
                <button
                  type="button"
                  onClick={() => void forget(voice.id)}
                  disabled={busy === voice.id}
                  title={t('voice.forget', 'Delete this voice')}
                  className="text-zinc-500 hover:text-red-400 flex-shrink-0"
                >
                  {busy === voice.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}

        {!mayClone ? (
          <button
            type="button"
            onClick={onUpgrade}
            className="w-full py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/50 text-amber-300 text-sm font-semibold"
          >
            {t('voice.needsPlan', 'Cloning your voice needs a paid plan')}
          </button>
        ) : atLimit ? (
          <p className="text-sm text-zinc-500">
            {t('voice.atLimit', 'Your plan keeps')} {caps?.voices}.{' '}
            {t('voice.removeFirst', 'Remove one to make another.')}
          </p>
        ) : recording ? (
          <div className="space-y-2">
            <p className="text-sm text-zinc-300 leading-relaxed">{READ_THIS}</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-2xl font-black text-emerald-400 tabular-nums">{left}s</span>
              <button
                type="button"
                onClick={() => void finishSample()}
                className="px-3 py-2 rounded-xl bg-red-500/20 border border-red-500 text-red-300 text-sm font-semibold flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                {t('take.stop', 'Stop')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('voice.name', 'What to call this voice')}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
            {/* Not buried, and not pre-ticked. */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
              />
              <span className="text-sm text-zinc-400 leading-snug">
                {t('voice.consent', 'This is my own voice. I am not cloning anybody else, and I understand a copy of it will be kept until I delete it.')}
              </span>
            </label>
            <button
              type="button"
              onClick={() => void recordSample()}
              disabled={!consent || busy === 'clone'}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy === 'clone' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              {busy === 'clone'
                ? t('voice.making', 'Making the voice…')
                : `${t('voice.record', 'Record')} ${SAMPLE_SECONDS}s`}
            </button>
          </div>
        )}
      </div>

      {/* ── Read a script ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div>
          <p className="text-base font-bold text-white">{t('voice.readIt', 'Read a script aloud')}</p>
          <p className="text-sm text-zinc-500 leading-snug">
            {t('voice.readNote', 'Write it, pick a voice, and hear it. An episode made this way says so on the episode.')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <select
            value={voiceId}
            onChange={(event) => setVoiceId(event.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">{t('voice.stock', 'A stock voice')}</option>
            {state.mine.map((voice) => (
              <option key={voice.id} value={voice.id}>{voice.name} — {t('voice.mine', 'yours')}</option>
            ))}
            {state.stock.map((voice) => (
              <option key={voice.id} value={voice.id}>{voice.name}</option>
            ))}
          </select>
          <select
            value={model}
            onChange={(event) => setModel(event.target.value as 'steady' | 'wide')}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="steady">{t('voice.steady', 'Steady — best for a long read')}</option>
            <option value="wide">{t('voice.wide', 'Wide — more languages, Afrikaans included')}</option>
          </select>
        </div>

        <textarea
          value={script}
          onChange={(event) => setScript(event.target.value)}
          rows={5}
          placeholder={t('voice.scriptPlaceholder', 'Write what should be said…')}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none resize-y"
        />
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className={over ? 'text-amber-400' : 'text-zinc-600'}>
            {script.length} / {caps?.speakChars ?? 0}
          </span>
          <span className="text-zinc-600">
            {caps?.speakPerDay} {t('voice.perDay', 'a day on your plan')}
          </span>
        </div>

        {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void read()}
            disabled={!script.trim() || over || busy === 'speak'}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy === 'speak' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {busy === 'speak' ? t('voice.reading', 'Reading…') : t('voice.readAloud', 'Read it aloud')}
          </button>
          {spoken && (
            <button
              type="button"
              onClick={() => onAudio(spoken, 'spoken')}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-emerald-500/50 text-emerald-300 text-sm font-semibold flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {t('voice.useIt', 'Use as an episode')}
            </button>
          )}
        </div>

        <audio ref={playerRef} controls className={spoken ? 'w-full' : 'hidden'} />
      </div>
    </div>
  );
}
