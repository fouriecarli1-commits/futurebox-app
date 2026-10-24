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
 * ── A screen of its own ──────────────────────────────────────────────────
 *
 * The owner, the same evening: *"Daar is geen recording knoppie of enige
 * praktiese vorm van dit om dalk 'n recording screen oop te maak wat die
 * lyrics wys terwyl mens record. En dan seker 'n submit button. Dan met make
 * a song, submit Afrikaans and make a song."* So the record button opens a
 * full screen with the words large enough to read from, the recording and its
 * clock, a listen-back, Submit, and — once the reading is in — Make the song.
 *
 * One component, in the song form, so every way into that form has it:
 * Make a song, a Studio remake, and a collab's shared song — where the map
 * rides in the draft to whoever presses Make.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Info, Loader2, Mic, Pause, RotateCcw, Send, Sparkles, Square, Trash2, Volume2, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { accessToken } from '../lib/cloud';
import { splitSections } from '../lib/engines';
import { useBackLayer } from '../lib/backstack';

interface Props {
  readonly lyrics: string;
  readonly sayAs: Readonly<Record<string, string>> | undefined;
  readonly onSayAs: (next: Record<string, string> | undefined) => void;
  /** False while it is the other person's turn in a collab. */
  readonly canWrite: boolean;
  /** One button until it is wanted: the words do not read as Afrikaans yet. */
  readonly folded?: boolean;
  /** Make the song, from the recording screen once the reading is in. */
  readonly onMake?: () => void;
  /** What Make the song costs, said on the button. */
  readonly makeCost?: string;
}

/** The lines that get sung, once each, in order. */
export const sungLinesOf = (lyrics: string): string[] =>
  [...new Set(splitSections(lyrics).flatMap((part) => part.lines.map((line) => line.trim())).filter(Boolean))].slice(0, 80);

const MIMES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

/** Where the recording screen is. */
type Stage = 'ready' | 'recording' | 'recorded' | 'sending' | 'done';

const clock = (ms: number): string => {
  const all = Math.floor(ms / 1000);
  return `${Math.floor(all / 60)}:${String(all % 60).padStart(2, '0')}`;
};

export default function SayItFirst({ lyrics, sayAs, onSayAs, canWrite, folded = false, onMake, makeCost }: Props): React.ReactElement | null {
  const { t } = useLang();
  const [opened, setOpened] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [stage, setStage] = useState<Stage>('ready');
  const [tips, setTips] = useState(false);
  const [problem, setProblem] = useState('');
  const [take, setTake] = useState<{ blob: Blob; url: string } | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  /* A pause in the reading: the recorder holds, the clock holds, and the
     take is one file when it ends. Asked for by name on 24 October 2026. */
  const [paused, setPaused] = useState(false);
  const pausedFor = useRef(0);
  const pausedAt = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => () => recorder.current?.stream.getTracks().forEach((track) => track.stop()), []);
  useEffect(() => () => { if (take) URL.revokeObjectURL(take.url); }, [take]);
  /* The clock on the recording, once a quarter second. */
  useEffect(() => {
    if (stage !== 'recording' || paused) return undefined;
    const every = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(every);
  }, [stage]);
  /* The page behind does not scroll under the screen. */
  useEffect(() => {
    if (!sheet) return undefined;
    const was = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = was; };
  }, [sheet]);

  const closeSheet = (): void => {
    if (recorder.current) {
      recorder.current.onstop = null;
      recorder.current.stream.getTracks().forEach((track) => track.stop());
      recorder.current.stop();
      recorder.current = null;
    }
    setSheet(false);
    setStage('ready');
  };
  /* Back closes the recording screen, as its own X does. */
  useBackLayer(sheet, closeSheet);

  const lines = sungLinesOf(lyrics);
  const covered = lines.filter((line) => sayAs?.[line]);

  const openSheet = (): void => {
    setProblem('');
    setStage(covered.length === lines.length && covered.length ? 'done' : 'ready');
    setSheet(true);
  };

  if (!lines.length && !(folded && !opened)) {
    return (
      <p data-sayas data-sayasempty className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 text-sm text-zinc-300">
        <Volume2 className="h-4 w-4 shrink-0 text-emerald-300" />
        {t('sayas.empty', 'Write your words in the box above, then read them aloud here so they are sung the way you say them.')}
      </p>
    );
  }

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
        if (!blob.size) { setStage('ready'); return; }
        setTake({ blob, url: URL.createObjectURL(blob) });
        setStage('recorded');
      };
      recorder.current = made;
      made.start();
      pausedFor.current = 0;
      setPaused(false);
      setStartedAt(Date.now());
      setNow(Date.now());
      setStage('recording');
    } catch {
      setProblem(t('sayas.denied', 'The microphone was not allowed. Allow it in your browser and press again.'));
    }
  };
  const stop = (): void => {
    if (paused) { pausedFor.current += Date.now() - pausedAt.current; setPaused(false); }
    recorder.current?.stop();
    recorder.current = null;
  };
  const holdOrGo = (): void => {
    const made = recorder.current;
    if (!made) return;
    if (made.state === 'recording') {
      made.pause();
      pausedAt.current = Date.now();
      setPaused(true);
    } else if (made.state === 'paused') {
      made.resume();
      pausedFor.current += Date.now() - pausedAt.current;
      setPaused(false);
    }
  };

  const submit = async (): Promise<void> => {
    if (!take) return;
    setStage('sending');
    setProblem('');
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(take.blob);
      });
      const token = await accessToken();
      const answer = await fetch('/api/sayas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ audio: data, mime: take.blob.type, lines }),
      });
      const said = (await answer.json().catch(() => null)) as { lines?: string[]; message?: string } | null;
      if (!answer.ok || !said?.lines || said.lines.length !== lines.length) {
        setProblem(said?.message ?? t('sayas.failed', 'That did not come back. Try reading it again.'));
        setStage('recorded');
        return;
      }
      const next: Record<string, string> = {};
      lines.forEach((line, i) => { next[line] = said.lines?.[i] ?? line; });
      onSayAs(next);
      setStage('done');
    } catch {
      setProblem(t('sayas.offline', 'Could not reach the app’s server.'));
      setStage('recorded');
    }
  };

  const BIG = 'inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-base font-extrabold';

  const screen = sheet && typeof document !== 'undefined' ? createPortal(
    <div role="dialog" aria-modal="true" aria-label={t('sayas.sheetTitle', 'Read your words aloud')} data-sayassheet className="fixed inset-0 z-[300] flex flex-col bg-zinc-950/95 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <p className="flex items-center gap-2 text-base font-black text-zinc-50">
          <Mic className="h-5 w-5 text-emerald-300" /> {t('sayas.sheetTitle', 'Read your words aloud')}
        </p>
        <div className="flex items-center gap-1.5">
          <button type="button" data-sayastipsopen aria-expanded={tips} onClick={() => setTips((was) => !was)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 px-3 text-xs font-semibold text-zinc-300">
            <Info className="h-4 w-4" /> {t('sayas.tipsOpen', 'How to record')}
          </button>
          <button type="button" data-sayasclose onClick={closeSheet} aria-label={t('sayas.tipsClose', 'Close')} className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* The owner, 22 October 2026: *"'n pop out information wat verduidelik
          hoe dit opgeneem moet word, mense moet normaal praat en dit normaal
          uitspreek"*. A reading that is sung, slowed down or spelled out is
          written down that way too, and then sung that way. */}
      {tips && (
        <div data-sayastips className="mx-4 mt-3 rounded-xl border border-emerald-400/40 bg-zinc-900 p-3.5">
          <p className="mb-2 text-sm font-bold text-emerald-200">{t('sayas.tipsTitle', 'How to read it so it comes out right')}</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-zinc-300">
            <li>{t('sayas.tipNormal', 'Speak normally, the way you would say it to a friend. Do not sing it and do not slow down.')}</li>
            <li>{t('sayas.tipPronounce', 'Pronounce every word normally, the way it is said in your language. Do not stretch it out or spell it letter by letter.')}</li>
            <li>{t('sayas.tipOrder', 'Read every line once, from top to bottom. Do not skip a line or repeat one.')}</li>
            <li>{t('sayas.tipQuiet', 'Find a quiet spot and hold the phone about a hand’s width from your mouth.')}</li>
            <li>{t('sayas.tipStop', 'A short pause between lines is fine. Press stop when you have read the last line.')}</li>
          </ul>
        </div>
      )}

      {/* The words, large enough to read from at arm's length. */}
      <ol data-sayassheetlines className="mx-auto w-full max-w-2xl flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {lines.map((line, i) => (
          <li key={line} className="flex gap-3">
            <span className="mt-1 w-6 shrink-0 text-right text-xs font-bold tabular-nums text-zinc-500">{i + 1}</span>
            <span className={`text-xl font-semibold leading-snug sm:text-2xl ${stage === 'recording' ? 'text-zinc-50' : 'text-zinc-300'}`}>{line}</span>
          </li>
        ))}
      </ol>

      <div className="mx-auto w-full max-w-2xl space-y-3 border-t border-white/10 px-4 pb-6 pt-4">
        {problem && <p role="alert" className="text-sm font-semibold text-rose-300">{problem}</p>}

        {stage === 'ready' && (
          <>
            <p className="text-center text-sm text-zinc-300">{t('sayas.readSpeed', 'Read the words at your normal talking speed, the way you say them. Each line is written down as you said it and that is what the singer sings. Press Stop after the last line.')}</p>
            <button type="button" data-sayasrecord disabled={!canWrite} onClick={() => { void start(); }} className={`${BIG} w-full bg-rose-500 text-white disabled:opacity-50`}>
              <Mic className="h-5 w-5" /> {t('sayas.record', 'Start recording')}
            </button>
          </>
        )}

        {stage === 'recording' && (
          <>
            <p className="flex items-center justify-center gap-2 text-sm font-bold text-rose-300" data-sayasclock>
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" aria-hidden />
              {paused ? t('sayas.pausedNow', 'Paused') : t('sayas.recordingNow', 'Recording')} · {clock(Math.max(0, (paused ? pausedAt.current : now) - startedAt - pausedFor.current))}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" data-sayaspause aria-pressed={paused} onClick={holdOrGo} className={`${BIG} border border-zinc-600 bg-zinc-900 text-zinc-100`}>
                {paused ? <Mic className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                {paused ? t('sayas.resume', 'Carry on') : t('sayas.pause', 'Pause')}
              </button>
              <button type="button" data-sayasstop onClick={stop} className={`${BIG} border border-rose-400 bg-zinc-900 text-rose-100`}>
                <Square className="h-5 w-5" fill="currentColor" /> {t('sayas.stop', 'Stop — I have read it all')}
              </button>
            </div>
          </>
        )}

        {(stage === 'recorded' || stage === 'sending') && take && (
          <>
            <p className="text-center text-sm text-zinc-400">{t('sayas.listenBack', 'Listen back. Happy with it? Submit it. If not, record it again.')}</p>
            <audio controls src={take.url} className="w-full" data-sayastake />
            <div className="flex flex-wrap gap-2">
              <button type="button" data-sayasredo disabled={stage === 'sending'} onClick={() => { setTake(null); setStage('ready'); }} className={`${BIG} border border-zinc-700 text-zinc-200 disabled:opacity-50`}>
                <RotateCcw className="h-5 w-5" /> {t('sayas.again', 'Record again')}
              </button>
              <button type="button" data-sayassubmit disabled={stage === 'sending'} onClick={() => { void submit(); }} className={`${BIG} bg-emerald-500 text-onAccent disabled:opacity-60`}>
                {stage === 'sending' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                {stage === 'sending' ? t('sayas.listening', 'Listening…') : t('sayas.submit', 'Submit')}
              </button>
            </div>
          </>
        )}

        {stage === 'done' && (
          <>
            <p className="flex items-center justify-center gap-2 text-center text-sm font-bold text-emerald-300" data-sayasdone>
              <Check className="h-5 w-5" /> {t('sayas.allDone', 'Done. Every line will be sung the way you read it.')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { setTake(null); setStage('ready'); }} className={`${BIG} border border-zinc-700 text-zinc-200`}>
                <RotateCcw className="h-5 w-5" /> {t('sayas.again', 'Record again')}
              </button>
              {onMake && canWrite ? (
                <button type="button" data-sayasmake onClick={() => { closeSheet(); onMake(); }} className={`${BIG} bg-emerald-500 text-onAccent`}>
                  <Sparkles className="h-5 w-5" /> {t('sayas.makeNow', 'Make the song')}{makeCost ? ` · ${makeCost}` : ''}
                </button>
              ) : (
                <button type="button" onClick={closeSheet} className={`${BIG} bg-emerald-500 text-onAccent`}>
                  <Check className="h-5 w-5" /> {t('sayas.backToSong', 'Back to the song')}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  ) : null;

  /* One button that says what it does. The owner, 24 October 2026: *"I still
     cannot see a place where to record lyrics in afrikaans ... Its must say
     something like: Record Afrikaans lyrics."* The folded line used to be a
     sentence that unfolded into a card with the button on it — two presses
     and a riddle. Now the first press is the recording screen. */
  if (folded && !opened && !covered.length) {
    return (
      <>
        <button
          type="button"
          data-sayasopen
          data-sayasbegin={lines.length ? '' : undefined}
          onClick={() => { setOpened(true); if (lines.length) openSheet(); }}
          className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 text-sm font-extrabold text-white"
        >
          <Mic className="h-5 w-5 shrink-0" />
          {t('sayas.recordAf', 'Record Afrikaans lyrics')}
        </button>
        {sheet ? screen : null}
      </>
    );
  }
  return (
    <div data-sayas className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
      <p className="flex items-center gap-2 text-sm font-bold text-zinc-100">
        <Volume2 className="h-4 w-4 shrink-0 text-emerald-300" />
        {t('sayas.title', 'Read your words to me, so they are sung the way you say them')}
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        {t('sayas.how', 'Press record and read every line once, in order, the way it must sound. Each line is then written out the way you said it, and that is what the singer reads. Your words stay exactly as you wrote them.')}
      </p>
      {canWrite ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" data-sayasbegin onClick={openSheet} className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-rose-500 px-4 text-sm font-bold text-white">
            <Mic className="h-4 w-4" />
            {covered.length ? t('sayas.againOpen', 'Read it again') : t('sayas.recordAf', 'Record Afrikaans lyrics')}
          </button>
          {covered.length > 0 && (
            <button type="button" data-sayasclear onClick={() => onSayAs(undefined)} className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 px-3 text-sm font-semibold text-zinc-300">
              <Trash2 className="h-4 w-4" /> {t('sayas.clear', 'Clear my reading')}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-400">{t('make.pairWatching', 'Their turn — ask for the pen at the top to write.')}</p>
      )}
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
                className="mt-0.5 min-h-[44px] w-full rounded-lg border border-zinc-700 bg-black/40 px-3 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-hidden"
              />
            </label>
          ))}
        </div>
      )}
      {screen}
    </div>
  );
}
