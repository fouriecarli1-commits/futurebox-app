'use client';

/**
 * Easy Editing: pick drawings off the wall, say the story over them, put a
 * song underneath, and the browser makes the film. `lib/kidsfilm.ts` has
 * the why and the how; this is the screen.
 *
 * Nothing here is typed. The frames are presses on the wall, the voice is
 * one red button, the song is one row of the shelf, and the film lands on
 * the wall beside the drawings it was made of.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Film, Loader2, Pause, Play, Sparkles, Square, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { allPieces, keepPiece, type KeptPiece } from '../lib/kidsgallery';
import { allSongs, type KeptSong } from '../lib/songkeep';
import { FRAMES_MOST, FRAME_SECONDS, PIECE_PAINT, VOICE_MOST_SECONDS, canFilm, makeFilm, type Frame } from '../lib/kidsfilm';
import { asClock } from '../lib/kidsallowance';

export default function KidsEditor({
  onSpark,
  onKept,
  again = 0,
  alive,
}: {
  readonly onSpark: (n: number) => void;
  /** The wall should look again. */
  readonly onKept?: () => void;
  /** Bumped by the room when the wall changed. */
  readonly again?: number;
  /** The room's paid press for one frame, drawn with its price on it. */
  readonly alive?: (piece: KeptPiece) => React.ReactNode;
}): React.ReactElement {
  const { t } = useLang();
  const [wall, setWall] = useState<KeptPiece[] | null>(null);
  const [songs, setSongs] = useState<KeptSong[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [frames, setFrames] = useState<string[]>([]);
  const [song, setSong] = useState<string>('');
  const [voice, setVoice] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState('');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [making, setMaking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [film, setFilm] = useState('');
  const [says, setSays] = useState('');
  const [able, setAble] = useState(true);
  /* The cinema box: which frame is on the screen, and the preview stepping through them. */
  const [onScreen, setOnScreen] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const previewTimer = useRef<number | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const held = useRef<string[]>([]);
  const filmUrl = useRef('');

  useEffect(() => { setAble(canFilm()); }, []);

  useEffect(() => {
    let live = true;
    void Promise.all([allPieces().catch(() => []), allSongs().catch(() => [])]).then(([pieces, kept]) => {
      if (!live) return;
      const stills = pieces.filter((one) => one.kind !== 'film');
      held.current.forEach((one) => URL.revokeObjectURL(one));
      const next: Record<string, string> = {};
      for (const piece of stills) next[piece.id] = URL.createObjectURL(piece.blob);
      held.current = Object.values(next);
      setUrls(next);
      setWall(stills);
      setSongs(kept);
    });
    return () => { live = false; };
  }, [again]);

  useEffect(() => () => {
    held.current.forEach((one) => URL.revokeObjectURL(one));
    if (filmUrl.current) URL.revokeObjectURL(filmUrl.current);
    recorder.current?.stop();
  }, []);

  const toggle = (id: string): void => {
    setFilm('');
    setFrames((was) => (was.includes(id) ? was.filter((one) => one !== id) : was.length < FRAMES_MOST ? [...was, id] : was));
    setOnScreen(id);
  };
  const drop = (id: string): void => {
    setFilm('');
    setFrames((was) => was.filter((one) => one !== id));
    setOnScreen((was) => (was === id ? null : was));
  };

  /* The preview: the real frames, each for its real seconds, on the screen
     above. A rehearsal of the film, not the film. */
  const stopPreview = useCallback((): void => {
    if (previewTimer.current !== null) window.clearInterval(previewTimer.current);
    previewTimer.current = null;
    setPreviewing(false);
  }, []);
  const preview = (): void => {
    if (!frames.length) return;
    stopPreview();
    let at = 0;
    setOnScreen(frames[0]);
    setPreviewing(true);
    previewTimer.current = window.setInterval(() => {
      at += 1;
      if (at >= frames.length) { stopPreview(); return; }
      setOnScreen(frames[at]);
    }, FRAME_SECONDS * 1000);
  };
  useEffect(() => () => { if (previewTimer.current !== null) window.clearInterval(previewTimer.current); }, []);

  /* The voice: the microphone, on the device, up to a minute. */
  const startVoice = useCallback(async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const take = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      take.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      take.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setVoice(blob);
        setVoiceUrl((was) => { if (was) URL.revokeObjectURL(was); return URL.createObjectURL(blob); });
        setRecording(false);
        setSays(t('kids.filmVoiceDone', 'Got your story! Now press Make my film.'));
      };
      recorder.current = take;
      take.start(250);
      setRecording(true);
      setSeconds(0);
      setSays(t('kids.filmVoiceRecording', 'Recording — tell the story, then press stop.'));
    } catch {
      setSays(t('kids.filmNoMic', 'The microphone could not be opened. Ask a grown-up to allow it.'));
    }
  }, [t]);
  const stopVoice = (): void => { recorder.current?.stop(); };
  useEffect(() => {
    if (!recording) return undefined;
    const beat = window.setInterval(() => setSeconds((was) => {
      if (was + 1 >= VOICE_MOST_SECONDS) recorder.current?.stop();
      return was + 1;
    }), 1000);
    return () => window.clearInterval(beat);
  }, [recording]);

  const make = async (): Promise<void> => {
    if (!wall) return;
    const picked: Frame[] = frames
      .map((id) => wall.find((one) => one.id === id))
      .filter((one): one is KeptPiece => Boolean(one))
      .map((one) => ({ id: one.id, blob: one.blob, title: one.title }));
    const under = songs.find((one) => one.id === song)?.audio ?? null;
    setMaking(true);
    setProgress(0);
    setSays(t('kids.filmMakingNow', 'Making your film…'));
    const answer = await makeFilm(picked, voice, under, setProgress);
    setMaking(false);
    if ('says' in answer) { setSays(answer.says); return; }
    if (filmUrl.current) URL.revokeObjectURL(filmUrl.current);
    filmUrl.current = URL.createObjectURL(answer.film);
    setFilm(filmUrl.current);
    const put = await keepPiece({
      id: `film-${Date.now()}`,
      made: Date.now(),
      kind: 'film',
      title: t('kids.filmTitle', 'My film'),
      blob: answer.film,
    });
    setSays(put === 'kept'
      ? t('kids.filmKept', 'Your film is ready, and it is on your gallery wall!')
      : t('kids.filmReadyNoWall', 'Your film is ready! The wall is full, so it stays here until you leave.'));
    onSpark(30);
    onKept?.();
  };

  const length = Math.max(frames.length * FRAME_SECONDS, voice ? seconds : 0);

  const shown = wall?.find((one) => one.id === (onScreen ?? frames[0]));

  return (
    <div className="space-y-4 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/85 p-4 shadow-lg backdrop-blur-sm sm:p-5" data-kidseditor>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="fb-kids-bubble flex items-center gap-2 text-xl font-bold text-surface-900 sm:text-2xl">
          <span aria-hidden>✂️</span> {t('kids.editTitle', 'Easy Editing')}
        </h2>
        <p className="text-xs font-semibold text-surface-700">
          {t('kids.editWhy', 'Press your drawings in order, tell the story, and the film is made here on the phone. It uses no credits.')}
        </p>
      </div>

      {!able && (
        <p className="rounded-2xl border-2 border-amber-300/60 bg-surface-100/80 px-4 py-3 text-sm font-semibold text-surface-900" data-kidseditorunable>
          {t('kids.filmUnable', 'This browser cannot make a film. Try Chrome.')}
        </p>
      )}

      {/* 1. The cinema box from Google's page: the frame on screen, or the film once it is made. */}
      <div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-3xl border-2 border-cyan-400 bg-surface-50 shadow-[0_0_25px_rgba(52,211,153,0.25)] sm:min-h-[260px]" data-kidscinema>
        {film ? (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <video src={film} controls playsInline className="max-h-[360px] w-full bg-black" data-kidsfilmout />
        ) : shown ? (
          <img src={urls[shown.id]} alt={shown.title} className="max-h-[360px] w-full object-contain" data-kidscinemaframe={shown.id} />
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <span className="text-6xl drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]" aria-hidden>🎬</span>
            <span className="rounded-full border border-cyan-400 bg-black/60 px-4 py-1.5 text-sm font-black text-surface-950">
              {t('kids.editCinemaEmpty', 'Add drawings to start!')}
            </span>
          </div>
        )}
        {shown && !film && (
          <span className="absolute bottom-3 rounded-full border border-cyan-400 bg-black/60 px-4 py-1 text-sm font-black text-surface-950">
            {shown.title}
          </span>
        )}
      </div>

      {/* 2. The puzzle timeline: the chosen frames in order, as pieces. */}
      <div className="space-y-3 rounded-3xl border-2 border-cyan-300 bg-surface-50 p-4 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]" data-kidstimeline>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black text-cyan-300">🧩 {t('kids.editTimeline', 'Video timeline (tap a piece to see it, ✕ to take it out)')}</h3>
          <span className="text-xs font-bold text-surface-700">{t('kids.editLength', 'Total length')}: {asClock(length)}</span>
        </div>
        <div className="flex min-h-[96px] flex-wrap items-center gap-2 rounded-2xl border border-dashed border-cyan-400/40 bg-surface-100/60 p-2.5">
          {frames.length === 0 ? (
            <p className="w-full text-center text-xs font-semibold text-surface-700">{t('kids.editTimelineEmpty', 'Press drawings on the shelf below and they snap in here.')}</p>
          ) : frames.map((id, index) => {
            const piece = wall?.find((one) => one.id === id);
            if (!piece) return null;
            return (
              <div key={id} data-kidspuzzle={id} style={{ background: PIECE_PAINT[index % PIECE_PAINT.length] }}
                className={`flex h-20 min-w-[120px] items-center gap-2 rounded-2xl px-2.5 text-onAccent shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${onScreen === id ? 'ring-4 ring-white' : ''}`}>
                <button type="button" onClick={() => setOnScreen(id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-label={piece.title}>
                  <img src={urls[id]} alt="" className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />
                  <span className="text-xs font-black leading-tight">{index + 1}. {piece.title}</span>
                </button>
                <button type="button" onClick={() => drop(id)} disabled={making} aria-label={t('kids.editDrop', 'Take it out')} data-kidspuzzledrop={id}
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-black/30 text-[11px] font-black text-white">✕</button>
              </div>
            );
          })}
        </div>
        {/* The audio strip: what is really on it. */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-500/40 bg-surface-100/60 px-3.5 py-2 text-xs font-black text-cyan-300" data-kidsaudiostrip>
          <span>🎙️ {voice ? `${t('kids.editVoiceOn', 'Your voice')} · ${asClock(seconds)}` : t('kids.editVoiceOff', 'No voice yet')}</span>
          <span className="h-3 flex-1 rounded bg-[repeating-linear-gradient(90deg,rgba(52,211,153,0.9)_0,rgba(52,211,153,0.9)_4px,transparent_4px,transparent_8px)] opacity-80" aria-hidden />
          <span>🎵 {song ? songs.find((one) => one.id === song)?.title ?? '' : t('kids.editNoSong', 'No song')}</span>
        </div>
      </div>

      {/* 3. The shelf: every drawing and picture on the wall, pressed to snap in. */}
      <div className="space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-surface-700">
          + {t('kids.editPick', 'Add drawings, in order')} ({frames.length}/{FRAMES_MOST})
        </p>
        {wall === null ? (
          <p className="flex items-center gap-2 text-sm text-surface-700"><Loader2 className="h-4 w-4 animate-spin" /> {t('songshelf.looking', 'Looking…')}</p>
        ) : wall.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-surface-300 px-4 py-4 text-center text-sm font-semibold text-surface-700" data-kidseditorempty>
            {t('kids.editNone', 'Nothing on the wall yet. Draw something first, or make a magic picture.')}
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2" data-kidseditorwall>
            {wall.map((piece) => {
              const at = frames.indexOf(piece.id);
              return (
                <li key={piece.id} className="w-[calc(33.333%-0.4rem)] space-y-1 sm:w-28">
                  <button
                    type="button"
                    onClick={() => toggle(piece.id)}
                    disabled={making}
                    aria-pressed={at >= 0}
                    data-kidseditorframe={piece.id}
                    className={`relative block w-full overflow-hidden rounded-2xl border-2 ${at >= 0 ? 'border-amber-300 shadow-[0_0_14px_rgba(253,224,71,0.5)]' : 'border-cyan-400'}`}
                  >
                    <img src={urls[piece.id]} alt={piece.title} className="aspect-square w-full object-cover" />
                    {at >= 0 && (
                      <span className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 text-sm font-black text-onAccent">{at + 1}</span>
                    )}
                  </button>
                  {alive && piece.kind === 'drawing' && alive(piece)}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 4. A song under it. */}
      {songs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" data-kidseditorsongs>
          <span className="text-xs font-black uppercase tracking-wider text-surface-700">🎵 {t('kids.editSong', 'A song underneath')}</span>
          <button type="button" aria-pressed={song === ''} onClick={() => setSong('')} disabled={making}
            className={`min-h-[40px] rounded-xl px-3.5 text-xs font-black ${song === '' ? 'bg-cyan-400 text-onAccent' : 'bg-surface-200 text-surface-800'}`}>
            {t('kids.editNoSong', 'No song')}
          </button>
          {songs.map((one) => (
            <button key={one.id} type="button" aria-pressed={song === one.id} onClick={() => setSong(one.id)} disabled={making} data-kidseditorsong={one.id}
              className={`min-h-[40px] max-w-[220px] truncate rounded-xl px-3.5 text-xs font-black ${song === one.id ? 'bg-cyan-400 text-onAccent' : 'bg-surface-200 text-surface-800'}`}>
              {one.title}
            </button>
          ))}
        </div>
      )}

      {/* 5. The buttons along the foot of Google's page, each doing a real thing. */}
      <div className="flex flex-wrap items-center justify-center gap-3" data-kidseditoractions>
        <button type="button" onClick={previewing ? stopPreview : preview} disabled={!frames.length || making} data-kidspreview
          className="flex min-h-[52px] items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-cyan-300 px-6 text-sm font-black text-onAccent disabled:opacity-40">
          {previewing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
          {previewing ? t('kids.editPreviewStop', 'Pause') : t('kids.editPreview', 'Play it through')}
        </button>
        {recording ? (
          <button type="button" onClick={stopVoice} data-kidsvoicestop
            className="flex min-h-[52px] items-center gap-2 rounded-2xl bg-rose-500 px-6 text-sm font-black text-white">
            <Square className="h-4 w-4" fill="currentColor" /> {t('kids.pianoStop', 'Stop')} · {asClock(seconds)}
          </button>
        ) : (
          <button type="button" onClick={() => void startVoice()} disabled={making || !able} data-kidsvoicerecord
            className="flex min-h-[52px] items-center gap-2 rounded-2xl bg-primary-500 px-6 text-sm font-black text-white disabled:opacity-40">
            <Circle className="h-4 w-4 fill-white text-white" /> {voice ? t('kids.editVoiceAgain', 'Say it again') : t('kids.editVoiceStart', 'Record my story')}
          </button>
        )}
        {voiceUrl && !recording && (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={voiceUrl} controls className="h-10 max-w-[200px]" data-kidsvoiceout />
            <button type="button" onClick={() => { setVoice(null); setVoiceUrl((was) => { if (was) URL.revokeObjectURL(was); return ''; }); setSeconds(0); }} aria-label={t('kids.editVoiceDrop', 'Take the voice off')}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface-300 bg-surface-200 text-surface-900">
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => void make()}
        disabled={!frames.length || making || recording || !able}
        data-kidsmakefilm
        className="fb-kids-bouncy flex min-h-[64px] w-full items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 text-base font-black text-onAccent disabled:opacity-40"
      >
        {making ? <Loader2 className="h-5 w-5 animate-spin" /> : <Film className="h-5 w-5" />}
        {making
          ? `${t('kids.filmMakingNow', 'Making your film…')} ${Math.round(progress * 100)}%`
          : `${t('kids.editMake', 'Make my film')} · ${asClock(length)}`}
      </button>

      {says && (
        <p className="rounded-2xl border-2 border-surface-200 bg-surface-100/80 px-4 py-3 text-sm font-semibold text-surface-900" data-kidseditorsays>
          {says}
        </p>
      )}

      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-surface-700">
        <Sparkles className="h-3.5 w-3.5" /> {t('kids.editAliveHint', 'A drawing can be brought to life first — the lit picture then joins the wall and can be a frame too.')}
      </p>
    </div>
  );
}
