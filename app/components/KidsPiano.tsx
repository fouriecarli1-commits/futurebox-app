'use client';

/**
 * The piano: thirteen keys, "copy me", and a tune kept as a song.
 *
 * Keys are pressed by pointer, so a finger, a stylus and a mouse are one
 * thing, and a finger sliding across the keys plays each one it crosses.
 * The sound is `strike()` on the browser's own context (`lib/kidspiano.ts`).
 *
 * "Copy me" is the guidance she asked for: the piano plays a phrase with the
 * keys lighting up, then listens; a right note lights green, a wrong one
 * shakes the key and plays the phrase again. Finishing earns stars.
 *
 * "Record a tune" keeps up to thirty seconds of presses, replays them, and
 * can put the tune on the song shelf — rendered offline to a WAV, the same
 * shelf the real songs sit on, so it plays at bedtime with the rest.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Heart, Play, Square } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { soundContext } from '../lib/kidsbeat';
import { EBONY, IVORY, KEYS, LIT_EBONY, LIT_INK, RECORD_MOST_MS, TUNES, keyOf, renderTune, strike, type Pressed } from '../lib/kidspiano';
import { keepSong } from '../lib/songkeep';
import { confetti } from '../lib/kidsconfetti';

type Mode = 'play' | 'copy';

/** The computer key under each piano key, printed small on it. */
const LETTERS: Record<string, string> = {
  c4: 'A', cs4: 'W', d4: 'S', ds4: 'E', e4: 'D', f4: 'F', fs4: 'T', g4: 'G', gs4: 'Y', a4: 'H', as4: 'U', b4: 'J', c5: 'K',
};

export default function KidsPiano({
  onSpark,
  onKept,
}: {
  readonly onSpark: (n: number) => void;
  /** The song shelf should look again. */
  readonly onKept?: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const [mode, setMode] = useState<Mode>('play');
  const [lit, setLit] = useState<string | null>(null);
  const [tune, setTune] = useState(TUNES[0].id);
  const [showing, setShowing] = useState(false);
  const [atNote, setAtNote] = useState(0);
  const [copied, setCopied] = useState(0);
  const [says, setSays] = useState('');
  const [recording, setRecording] = useState(false);
  const [pressed, setPressed] = useState<Pressed[]>([]);
  const [replaying, setReplaying] = useState(false);
  const [kept, setKept] = useState(false);
  const startedAt = useRef(0);
  const down = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => { timers.current.forEach((one) => window.clearTimeout(one)); }, []);

  /* Google's page: the computer keyboard plays too — A to K on the white
     keys, W E T Y U on the black ones. Only while this door is open. */
  const pressRef = useRef<(id: string) => void>(() => undefined);
  useEffect(() => {
    const map: Record<string, string> = {
      KeyA: 'c4', KeyW: 'cs4', KeyS: 'd4', KeyE: 'ds4', KeyD: 'e4', KeyF: 'f4', KeyT: 'fs4',
      KeyG: 'g4', KeyY: 'gs4', KeyH: 'a4', KeyU: 'as4', KeyJ: 'b4', KeyK: 'c5',
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.repeat || !map[event.code]) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      pressRef.current(map[event.code]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const light = useCallback((id: string, ms = 220): void => {
    setLit(id);
    timers.current.push(window.setTimeout(() => setLit((was) => (was === id ? null : was)), ms));
  }, []);

  const play = useCallback((id: string): void => {
    const key = keyOf(id);
    const ctx = soundContext();
    if (!key || !ctx) return;
    strike(ctx, key.hz, ctx.currentTime, ctx.destination);
    light(id);
  }, [light]);

  const press = (id: string): void => {
    play(id);
    if (recording) {
      const at = startedAt.current ? Date.now() - startedAt.current : 0;
      if (!startedAt.current) startedAt.current = Date.now();
      if (at <= RECORD_MOST_MS) setPressed((was) => [...was, { id, at }]);
    }
    if (mode === 'copy' && !showing) {
      const want = TUNES.find((one) => one.id === tune)!;
      if (id === want.notes[atNote]) {
        const next = atNote + 1;
        if (next >= want.notes.length) {
          setAtNote(0);
          setCopied((n) => n + 1);
          setSays(t('kids.pianoRight', 'You played it! Again, or try another tune.'));
          onSpark(15);
          confetti(50);
        } else {
          setAtNote(next);
          setSays('');
        }
      } else {
        setSays(t('kids.pianoWrong', 'Not that one — listen again and copy the lights.'));
        setAtNote(0);
      }
    }
  };

  pressRef.current = press;

  /** Play the chosen phrase with the keys lighting, then hand over. */
  const show = (): void => {
    const want = TUNES.find((one) => one.id === tune)!;
    const ctx = soundContext();
    if (!ctx) return;
    setShowing(true);
    setAtNote(0);
    setSays(t('kids.pianoListen', 'Listen and watch the lights…'));
    want.notes.forEach((id, index) => {
      const key = keyOf(id)!;
      strike(ctx, key.hz, ctx.currentTime + index * 0.55, ctx.destination);
      timers.current.push(window.setTimeout(() => light(id, 400), index * 550));
    });
    timers.current.push(window.setTimeout(() => {
      setShowing(false);
      setSays(t('kids.pianoYourTurn', 'Your turn! Play the same keys.'));
    }, want.notes.length * 550 + 200));
  };

  const record = (): void => {
    setPressed([]);
    setKept(false);
    startedAt.current = 0;
    setRecording(true);
    setSays(t('kids.pianoRecording', 'Recording — play your tune, then press stop.'));
  };
  const stop = (): void => {
    setRecording(false);
    setSays(pressed.length ? t('kids.pianoRecorded', 'Got it! Play it back, or keep it as a song.') : '');
  };
  const replay = (): void => {
    const ctx = soundContext();
    if (!ctx || !pressed.length) return;
    setReplaying(true);
    for (const one of pressed) {
      const key = keyOf(one.id)!;
      strike(ctx, key.hz, ctx.currentTime + one.at / 1000, ctx.destination);
      timers.current.push(window.setTimeout(() => light(one.id), one.at));
    }
    const last = pressed[pressed.length - 1].at;
    timers.current.push(window.setTimeout(() => setReplaying(false), last + 600));
  };
  const keep = async (): Promise<void> => {
    const wav = await renderTune(pressed);
    if (!wav) return;
    const put = await keepSong({
      id: `tune-${Date.now()}`,
      title: t('kids.pianoTuneTitle', 'My piano tune'),
      made: Date.now(),
      audio: wav,
      topic: 'piano',
      sound: 'piano',
    });
    if (put === 'kept') {
      setKept(true);
      setSays(t('kids.pianoKept', 'Kept! It is on your song shelf, so it can play at bedtime too.'));
      onSpark(10);
      onKept?.();
    } else if (put === 'shelfFull') {
      setSays(t('kids.shelfFullShort', 'Your song shelf is full — ask a grown-up to take one off.'));
    } else {
      setSays(t('kids.noKeep', 'This browser will not keep anything.'));
    }
  };

  const whites = KEYS.filter((one) => !one.black);
  const want = TUNES.find((one) => one.id === tune)!;

  return (
    <div className="space-y-4 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/85 p-4 shadow-lg backdrop-blur-xs sm:p-5" data-kidspiano>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="fb-kids-bubble flex items-center gap-2 text-xl font-bold text-surface-900 sm:text-2xl">
          <span aria-hidden>🎹</span> {t('kids.pianoTitle', 'Piano')}
        </h2>
        <div className="flex flex-wrap gap-2" data-kidspianomode>
          <button type="button" aria-pressed={mode === 'play'} onClick={() => { setMode('play'); setSays(''); }}
            className={`min-h-[40px] rounded-xl px-3.5 text-xs font-black ${mode === 'play' ? 'bg-cyan-400 text-onAccent' : 'bg-surface-200 text-surface-800'}`}>
            🎵 {t('kids.pianoFree', 'Just play')}
          </button>
          <button type="button" aria-pressed={mode === 'copy'} onClick={() => { setMode('copy'); setAtNote(0); setSays(t('kids.pianoCopyHow', 'Press Show me, then copy the lights.')); }}
            data-kidspianocopy
            className={`min-h-[40px] rounded-xl px-3.5 text-xs font-black ${mode === 'copy' ? 'bg-cyan-400 text-onAccent' : 'bg-surface-200 text-surface-800'}`}>
            👂 {t('kids.pianoCopy', 'Copy me')}
          </button>
        </div>
      </div>

      {mode === 'copy' && (
        <div className="flex flex-wrap items-center gap-2" data-kidstunes>
          {TUNES.map((one) => (
            <button key={one.id} type="button" aria-pressed={tune === one.id} disabled={showing}
              onClick={() => { setTune(one.id); setAtNote(0); setSays(''); }} data-kidstune={one.id}
              className={`min-h-[40px] rounded-xl px-3.5 text-xs font-black disabled:opacity-50 ${tune === one.id ? 'bg-amber-300 text-onAccent' : 'bg-surface-200 text-surface-800'}`}>
              {t(one.says[0], one.says[1])}
            </button>
          ))}
          <button type="button" onClick={show} disabled={showing} data-kidsshowme
            className="fb-kids-bouncy flex min-h-[44px] items-center gap-2 rounded-2xl bg-primary-500 px-4 text-sm font-black text-white disabled:opacity-50">
            <Play className="h-4 w-4" fill="currentColor" /> {t('kids.pianoShow', 'Show me')}
          </button>
          <span className="text-xs font-bold text-surface-700" data-kidscopied={copied}>
            {atNote} / {want.notes.length} · {copied} {t('kids.pianoCopiedTimes', 'copied')}
          </span>
        </div>
      )}

      <p className="text-center text-xs font-black text-cyan-300">
        ✨ {t('kids.pianoBanner', 'Tap any key, or press A S D F G H J K on a keyboard!')}
      </p>
      {/* The keys. White ones in a row; black ones floated over the gaps. */}
      <div
        className="relative mx-auto h-44 w-full max-w-2xl select-none touch-none sm:h-52"
        data-kidskeys
        onPointerDown={() => { down.current = true; }}
        onPointerUp={() => { down.current = false; }}
        onPointerLeave={() => { down.current = false; }}
      >
        <div className="flex h-full gap-1">
          {whites.map((key) => (
            <button
              key={key.id}
              type="button"
              data-kidskey={key.id}
              aria-label={key.name}
              onPointerDown={(e) => { e.preventDefault(); press(key.id); }}
              onPointerEnter={() => { if (down.current) press(key.id); }}
              style={{ background: lit === key.id ? key.colour : IVORY, color: lit === key.id ? LIT_INK : key.colour, boxShadow: lit === key.id ? `0 0 15px ${key.colour}` : undefined }}
              className="flex flex-1 flex-col items-center justify-end rounded-b-lg border border-surface-300 pb-2 text-sm font-black transition-colors"
            >
              <span>{key.name}</span>
              <span className="text-[10px] font-bold opacity-60">{LETTERS[key.id] ?? ''}</span>
            </button>
          ))}
        </div>
        {KEYS.filter((one) => one.black).map((key) => {
          /* Sits over the gap after the white key before it. */
          const before = whites.findIndex((w) => w.hz > key.hz) - 1;
          const left = ((before + 1) / whites.length) * 100;
          return (
            <button
              key={key.id}
              type="button"
              data-kidskey={key.id}
              aria-label={key.name}
              onPointerDown={(e) => { e.preventDefault(); press(key.id); }}
              onPointerEnter={() => { if (down.current) press(key.id); }}
              style={{ left: `calc(${left}% - 5%)`, width: '10%', background: lit === key.id ? LIT_EBONY : EBONY, boxShadow: lit === key.id ? `0 0 15px ${LIT_EBONY}` : undefined }}
              className="absolute top-0 flex h-[58%] items-end justify-center rounded-b-lg border border-surface-400 pb-1.5 text-[10px] font-bold text-white shadow-lg transition-colors"
            >
              {LETTERS[key.id] ?? ''}
            </button>
          );
        })}
      </div>

      {/* Recording a tune, and keeping it. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-kidstunerecorder>
        {recording ? (
          <button type="button" onClick={stop} data-kidstunestop
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-rose-500 text-sm font-black text-white">
            <Square className="h-4 w-4" fill="currentColor" /> {t('kids.pianoStop', 'Stop')}
          </button>
        ) : (
          <button type="button" onClick={record} disabled={mode === 'copy' || replaying} data-kidstunerecord
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-surface-200/80 text-sm font-black text-surface-900 disabled:opacity-40">
            <Circle className="h-4 w-4 fill-rose-500 text-rose-500" /> {t('kids.pianoRecord', 'Record a tune')}
          </button>
        )}
        <button type="button" onClick={replay} disabled={!pressed.length || recording || replaying} data-kidstuneplay
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-surface-200/80 text-sm font-black text-surface-900 disabled:opacity-40">
          <Play className="h-4 w-4" fill="currentColor" /> {t('kids.pianoPlayBack', 'Play it back')}
        </button>
        <button type="button" onClick={() => void keep()} disabled={!pressed.length || recording || kept} data-kidstunekeep
          className="fb-kids-bouncy col-span-2 flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-cyan-400 text-sm font-black text-onAccent disabled:opacity-40">
          <Heart className="h-4 w-4" fill={kept ? 'currentColor' : 'none'} /> {kept ? t('kids.keptIt', 'Kept') : t('kids.pianoKeep', 'Keep it as a song')}
        </button>
      </div>

      {says && (
        <p className="rounded-2xl border-2 border-surface-200 bg-surface-100/80 px-4 py-3 text-sm font-semibold text-surface-900" data-kidspianosays>
          {says}
        </p>
      )}
    </div>
  );
}
