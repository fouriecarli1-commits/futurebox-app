'use client';

/**
 * Read your song aloud, and it is sung the way you said it.
 *
 * The owner, 22 October 2026: *"Is daar nie 'n manier dat iemand hulle
 * liedjie se woorde vooraf kan rekord, dit submit en dan word die
 * phoeneties van die liedjie saam na die musiek engine gestuur, om die
 * uitspraak reg te kry nie?"* The engine takes text only, so the reading
 * decides the text: every line comes back spelled the way it was said, for
 * a singer who reads English (`lib/server/sayas.ts`). The words on the
 * screen, in the channel and on the release stay as written.
 *
 * One component, in the song form, so every way into that form has it:
 * Make a song, a Studio remake, and a collab's shared song — where the map
 * rides in the draft to whoever presses Make.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square, Trash2, Volume2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { accessToken } from '../lib/cloud';
import { splitSections } from '../lib/engines';

interface Props {
  readonly lyrics: string;
  readonly sayAs: Readonly<Record<string, string>> | undefined;
  readonly onSayAs: (next: Record<string, string> | undefined) => void;
  /** False while it is the other person's turn in a collab. */
  readonly canWrite: boolean;
}

/** The lines that get sung, once each, in order. */
export const sungLinesOf = (lyrics: string): string[] =>
  [...new Set(splitSections(lyrics).flatMap((part) => part.lines.map((line) => line.trim())).filter(Boolean))].slice(0, 80);

const MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

export default function SayItFirst({ lyrics, sayAs, onSayAs, canWrite }: Props): React.ReactElement | null {
  const { t } = useLang();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => () => recorder.current?.stream.getTracks().forEach((track) => track.stop()), []);

  const lines = sungLinesOf(lyrics);
  if (!lines.length) return null;
  const covered = lines.filter((line) => sayAs?.[line]);

  const send = async (blob: Blob): Promise<void> => {
    setBusy(true);
    setProblem('');
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      const token = await accessToken();
      const answer = await fetch('/api/sayas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ audio: data, mime: blob.type, lines }),
      });
      const said = (await answer.json().catch(() => null)) as { lines?: string[]; message?: string } | null;
      if (!answer.ok || !said?.lines || said.lines.length !== lines.length) {
        setProblem(said?.message ?? t('sayas.failed', 'That did not come back. Try reading it again.'));
        return;
      }
      const next: Record<string, string> = {};
      lines.forEach((line, i) => { next[line] = said.lines?.[i] ?? line; });
      onSayAs(next);
    } catch {
      setProblem(t('sayas.offline', 'Could not reach the app’s server.'));
    } finally {
      setBusy(false);
    }
  };

  const start = async (): Promise<void> => {
    setProblem('');
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setProblem(t('sayas.noMic', 'This browser cannot record. Try Chrome or Safari on your phone.'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MIMES.find((one) => MediaRecorder.isTypeSupported(one));
      const made = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      made.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      made.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: (made.mimeType || 'audio/webm').split(';')[0] });
        if (blob.size) void send(blob);
      };
      recorder.current = made;
      made.start();
      setRecording(true);
    } catch {
      setProblem(t('sayas.denied', 'The microphone was not allowed. Allow it in your browser and press again.'));
    }
  };
  const stop = (): void => {
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
  };

  return (
    <div data-sayas className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
      <p className="flex items-center gap-2 text-sm font-bold text-zinc-100">
        <Volume2 className="h-4 w-4 text-emerald-300" />
        {t('sayas.title', 'Read your words to me, so they are sung the way you say them')}
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        {t('sayas.how', 'Press record and read every line once, in order, the way it must sound. Each line is then written out the way you said it, and that is what the singer reads. Your words stay exactly as you wrote them.')}
      </p>
      {canWrite ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {recording ? (
            <button type="button" data-sayasstop onClick={stop} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-rose-500 px-4 text-sm font-bold text-white">
              <Square className="h-4 w-4" /> {t('sayas.stop', 'Stop — I have read it all')}
            </button>
          ) : (
            <button type="button" data-sayasrecord onClick={() => { void start(); }} disabled={busy} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-400 px-4 text-sm font-bold text-emerald-200 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              {busy ? t('sayas.listening', 'Listening…') : covered.length ? t('sayas.again', 'Read it again') : t('sayas.record', 'Record me reading the words')}
            </button>
          )}
          {covered.length > 0 && !recording && (
            <button type="button" data-sayasclear onClick={() => onSayAs(undefined)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 px-3 text-sm font-semibold text-zinc-300">
              <Trash2 className="h-4 w-4" /> {t('sayas.clear', 'Clear my reading')}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-400">{t('make.pairWatching', 'Their turn — ask for the pen at the top to write.')}</p>
      )}
      {problem && <p role="alert" className="mt-2 text-sm text-rose-300">{problem}</p>}
      {covered.length > 0 && (
        <div className="mt-3 space-y-2" data-sayaslines>
          <p className="text-xs font-semibold text-zinc-400">
            {covered.length === lines.length
              ? t('sayas.all', 'Every line will be sung as you read it. Change a spelling if one word still sounds wrong:')
              : t('sayas.some', 'Some lines changed since you read them — read it again so they are covered too.')}
          </p>
          {lines.filter((line) => sayAs?.[line]).map((line) => (
            <label key={line} className="block">
              <span className="block text-xs text-zinc-500">{line}</span>
              <input
                value={sayAs?.[line] ?? ''}
                disabled={!canWrite}
                onChange={(event) => onSayAs({ ...(sayAs ?? {}), [line]: event.target.value })}
                className="mt-0.5 h-10 w-full rounded-lg border border-zinc-700 bg-black/40 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-hidden"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
