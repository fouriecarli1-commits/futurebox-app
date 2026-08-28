'use client';

/**
 * Make — press a button, get a song you can hear.
 *
 * The complaint that produced this screen was the right one: someone went
 * looking for a way to make a song and there was nothing to press. Everything
 * here is built around that one moment working — you press Make, a few seconds
 * later there is real audio in your channel, and you can play it, keep it,
 * share it or make another take.
 *
 * The words are kept ordinary on purpose. No "render", no "pipeline", no
 * "generation" — make a song, listen, save it, try again.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Music, Play, Pause, Download, Share2, Repeat, Trash2, Sparkles, Wand2, Loader2,
  Video as VideoIcon, X,
} from 'lucide-react';
import { renderSketch, encodeWav, familyFor, sketchDurationSeconds } from '../lib/audio';
import {
  loadTracks, saveTracks, putAudio, getAudio, deleteAudio, downloadBlob, safeFilename,
  type Track,
} from '../lib/library';
import { readAudio } from '../lib/trackaudio';
import { engines } from '../lib/engines';
import VideoPanel from './VideoPanel';
import { AI_MODELS, ROLE_LABELS, ROLE_ACCENTS } from '../data/studio';
import { STARTERS, VOICES, LENGTH_CHOICES, POLISH } from '../data/sound';
import { check, record, ENTITLEMENTS, type Plan } from '../lib/entitlements';
import { useLang } from '../lib/i18n';
import { ONE_OFF } from '../lib/plans';
import * as cloud from '../lib/cloud';
import { loadOwned, levelOf, startCheckout, downloadLink, NOTHING, type Owned } from '../lib/purchases';
import { markBlob } from '../lib/watermark';

export interface Canvas {
  title: string;
  lyrics: string;
  /** Free text, so the copilot can set a sound no preset covers. */
  style: string;
}

export default function MakeMusic({
  userPlan,
  onUpgrade,
  incoming,
  selectedTools,
  toggleTool,
  canvas,
  setCanvas,
  makeSignal,
  onMade,
  engineReady,
}: {
  userPlan: Plan;
  onUpgrade: () => void;
  /** Carried over from the Songwriter, when you came from there. */
  incoming?: { title: string; lyrics: string; style: string } | null;
  selectedTools: string[];
  toggleTool: (tool: string) => void;
  /** Held by the studio, because the copilot writes to it too. */
  canvas: Canvas;
  setCanvas: (next: Canvas) => void;
  /** Bumped by the copilot to press the button from over there. */
  makeSignal: number;
  /** Fires when a track lands, so the studio can offer a video. */
  onMade: (track: Track) => void;
  engineReady: boolean;
}) {
  const { t } = useLang();
  const title = canvas.title;
  const lyrics = canvas.lyrics;
  const setTitle = (value: string) => setCanvas({ ...canvas, title: value });
  const setLyrics = (value: string) => setCanvas({ ...canvas, lyrics: value });
  const [bpm, setBpm] = useState(112);
  const [songKey, setSongKey] = useState('A Minor');
  const [seconds, setSeconds] = useState(60);
  const [voice, setVoice] = useState(VOICES[1]);
  /** Which starter was last added, only so the chip can look pressed. */
  const [lastStarter, setLastStarter] = useState<string | null>(null);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [busy, setBusy] = useState(false);
  /**
   * Seconds since the button was pressed.
   *
   * A real generation takes thirty to sixty seconds, which is long enough that
   * a static line reads as a frozen screen. A number that keeps moving is the
   * difference between waiting and wondering whether to reload.
   */
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [busy]);
  const [status, setStatus] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [shared, setShared] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  // Making a video is the same job here as on its own tab, so it is the same
  // component. This screen only decides which track it is pointed at.
  const [videoFor, setVideoFor] = useState<Track | null>(null);
  /** What has been paid for. Refreshed after a payment returns. */
  const [owned, setOwned] = useState<Owned>(NOTHING);
  const [buying, setBuying] = useState<string | null>(null);
  useEffect(() => {
    loadOwned().then(setOwned);
  }, []);

  /** What the music engine is told. Free text from the copilot wins over the
   *  preset chips, because it is the more specific thing the person asked for. */
  /**
   * What the engine is actually told.
   *
   * The written field leads, because it is the specific thing this person
   * asked for. The voice direction follows, then generic production words to
   * reach the six or seven styles the model works best with. Order matters:
   * the model weights early styles more heavily.
   */
  const styleText = (() => {
    const written = canvas.style.trim();
    const parts = written ? written.split(',').map((p) => p.trim()).filter(Boolean) : [];
    if (voice.words) voice.words.split(',').forEach((w) => parts.push(w.trim()));
    POLISH.forEach((extra) => {
      if (parts.length < 8 && parts.indexOf(extra) === -1) parts.push(extra);
    });
    return parts.join(', ');
  })();

  useEffect(() => {
    const local = loadTracks();
    setTracks(local);
    if (!cloud.configured()) return;
    let live = true;
    // Songs made on another device belong in this channel too. The device's own
    // list shows first so nothing waits on the network to appear.
    cloud.syncChannel(local, getAudio).then((merged) => {
      if (!live) return;
      setTracks(merged);
      saveTracks(merged);
    });
    return () => {
      live = false;
    };
  }, []);

  // A bump means the copilot asked for the song, and the person said yes.
  const madeFor = useRef(0);
  useEffect(() => {
    if (makeSignal > madeFor.current) {
      madeFor.current = makeSignal;
      void make();
    }
    // `make` is stable enough for this: re-running on its identity would fire
    // the generation again every time a field changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makeSignal]);

  useEffect(() => {
    // A style handed over from the Songwriter is text, and the field is text.
    // It used to be matched against a fixed list and thrown away when nothing
    // matched, which quietly lost whatever the writer had actually asked for.
    const starter = STARTERS.find((entry) =>
      (incoming?.style ?? '').toLowerCase().includes(entry.name.toLowerCase()),
    );
    if (starter) setBpm(starter.bpm);
  }, [incoming?.style]);

  // One audio element for the whole screen, so pressing play on a second track
  // stops the first instead of talking over it.
  useEffect(() => {
    const element = new Audio();
    element.addEventListener('ended', () => setPlaying(null));
    audioRef.current = element;
    return () => {
      element.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const make = useCallback(
    async (remixOf?: Track) => {
      const gate = check('publish.release', userPlan);
      if (!gate.allowed) {
        setStatus(gate.reason);
        return;
      }
      const name = (remixOf ? `${remixOf.title} ${t('make.takeSuffix')}` : title).trim() || 'Untitled';
      setBusy(true);
      setStatus(t('make.goingNote'));

      // Yields once so the button visibly changes before the work starts.
      await new Promise((resolve) => setTimeout(resolve, 60));

      try {
        const spec = {
          bpm: remixOf?.bpm ?? bpm,
          key: remixOf?.key ?? songKey,
          family: familyFor(remixOf?.genre ?? canvas.style, canvas.style.split(',')),
          // The sketch engine counts bars; the person chose seconds. Four beats
          // to a bar at the chosen tempo is the conversion.
          bars: Math.max(8, Math.round((seconds * bpm) / 240)),
          seed: Math.floor(Math.random() * 1_000_000),
        };

        // A connected engine takes over here; until then we render the sketch.
        let blob: Blob;
        let source: Track['source'] = 'sketch';
        let models: string[] = ['FutureBox sketch'];
        if (engines.available('audio')) {
          const result = await engines.generateAudio({
            title: name,
            style: styleText,
            lyrics,
            bpm: spec.bpm,
            key: spec.key,
            // The chosen length, not the sketch's own — the engine is being
            // asked for a song, and the sketch is only a fallback.
            seconds,
          });
          blob = result.blob;
          source = 'engine';
          models = [result.model];
        } else {
          blob = encodeWav(renderSketch(spec));
        }


        const id = `t-${Date.now()}`;
        await putAudio(id, blob);

        const track: Track = {
          id,
          title: name,
          genre: remixOf?.genre ?? (canvas.style.split(',')[0] || 'Untitled style').trim(),
          bpm: spec.bpm,
          key: spec.key,
          lyrics,
          style: styleText,
          models,
          source,
          seconds: Math.round(sketchDurationSeconds(spec)),
          createdAt: new Date().toISOString(),
          seed: spec.seed,
          ...(remixOf ? { remixOf: remixOf.id } : {}),
        };

        const next = [track, ...tracks];
        setTracks(next);
        saveTracks(next);
        record('publish.release');
        setStatus(remixOf ? t('make.doneTake') : t('make.done'));

        // The song is already playable. Copying it to the account happens after,
        // so a slow upload never holds up the thing you just made.
        cloud.pushTrack(track, blob).then((result) => {
          if (result.saved) {
            setStatus(t('auth.savedToAccount'));
          } else if (result.reason !== 'off') {
            // The song is safe on the device either way, but if it did not reach
            // the account you have to be told — otherwise you find out by
            // opening your phone and seeing an empty channel.
            setStatus(result.message);
          }
        });
        onMade(track);
      } catch (error) {
        // The reason travels all the way here and used to be dropped on the
        // floor: `catch {}` without binding it, then a generic line. The music
        // route answers with something specific — out of credits, key rejected,
        // request too long — and that is the only thing that tells anyone what
        // to do next.
        const reason = error instanceof Error ? error.message.trim() : '';
        setStatus(reason || t('make.failed'));
      } finally {
        setBusy(false);
      }
    },
    [bpm, canvas.style, lyrics, onMade, seconds, songKey, styleText, t, title, tracks, userPlan],
  );

  const toggle = async (track: Track) => {
    const element = audioRef.current;
    if (!element) return;
    if (playing === track.id) {
      element.pause();
      setPlaying(null);
      return;
    }
    const blob = await readAudio(track.id);
    if (!blob) {
      setStatus(t('make.missing'));
      return;
    }
    // A track nobody has bought plays with the mark on it. The clean file is
    // what the download gate hands over, and only once it is paid for.
    const playable = levelOf(owned, track.id) === 'owned' ? blob : await markBlob(blob);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(playable);
    element.src = urlRef.current;
    await element.play();
    setPlaying(track.id);
  };

  const save = async (track: Track) => {
    const answer = await downloadLink(track.id);
    if ('url' in answer) {
      // A signed URL from the private bucket — the clean file, never the marked
      // one, because reaching this line means it has been paid for.
      window.location.href = answer.url;
      return;
    }
    if (!answer.message) {
      // No accounts configured, so there is nothing to check and nothing
      // stored: the device's own copy is the download, as it always was.
      const blob = await readAudio(track.id);
      if (blob) downloadBlob(blob, safeFilename(track.title, 'wav'));
      return;
    }
    setStatus(answer.message);
  };

  const buy = async (track: Track, kind: 'open' | 'keep') => {
    setBuying(track.id);
    const problem = await startCheckout({ kind, trackId: track.id });
    setBuying(null);
    if (problem) setStatus(problem);
  };

  const share = async (track: Track) => {
    const line = `${track.title} — ${track.genre}, ${track.bpm} BPM. Made on FutureBox.`;
    const blob = await readAudio(track.id);
    const canShareFile =
      typeof navigator !== 'undefined' && 'share' in navigator && blob && 'canShare' in navigator;
    try {
      if (canShareFile) {
        const file = new File([blob!], safeFilename(track.title, 'wav'), { type: 'audio/wav' });
        if ((navigator as Navigator & { canShare(d: unknown): boolean }).canShare({ files: [file] })) {
          await navigator.share({ title: track.title, text: line, files: [file] });
          return;
        }
        await navigator.share({ title: track.title, text: line });
        return;
      }
      await navigator.clipboard.writeText(line);
      setShared(track.id);
      setTimeout(() => setShared(null), 2000);
    } catch {
      // Someone closed the share sheet. Nothing to report.
    }
  };

  const remove = async (track: Track) => {
    if (playing === track.id) {
      audioRef.current?.pause();
      setPlaying(null);
    }
    await deleteAudio(track.id);
    const next = tracks.filter((t) => t.id !== track.id);
    setTracks(next);
    saveTracks(next);
    // Otherwise it would come back on the next sync.
    await cloud.removeTrack(track.id);
  };

  const left = check('publish.release', userPlan).remaining;

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Music className="w-6 h-6 text-emerald-400" />
          {t('make.title')}
        </h4>
        <p className="text-base text-zinc-400 pt-1 max-w-2xl">
          {t('make.sub')}
        </p>
      </div>

      {/* Set it up */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
        <div>
          <label className="text-sm text-zinc-400">{t('make.name')}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('make.namePlaceholder')}
            className="w-full mt-1 bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 text-base text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* The words, on the same page as the button that sings them. With a
            real engine these are what gets sung; without one they still travel
            with the track, so nothing typed here is lost. */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label className="text-sm text-zinc-400">{t('make.words')}</label>
            {canvas.style && <span className="text-sm text-emerald-400 truncate max-w-[60%]">{canvas.style}</span>}
          </div>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder={t('make.wordsPlaceholder')}
            rows={8}
            className="w-full mt-1 bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 text-base text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 leading-relaxed resize-y"
          />
          <p className="text-sm text-zinc-500 pt-1">
            {engineReady ? t('make.wordsReal') : t('make.wordsSketch')}
          </p>
        </div>

        {/* The style field is the whole instrument: ElevenLabs Music has no
            genre setting and no voice picker, only a list of plain-English
            directions. So this is open text, and the chips below add to it
            rather than replacing it — twelve fixed buttons was a smaller
            instrument than the model can play. */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label className="text-sm text-zinc-400">{t('make.sound')}</label>
            {canvas.style && (
              <button
                type="button"
                onClick={() => {
                  setCanvas({ ...canvas, style: '' });
                  setLastStarter(null);
                }}
                className="text-sm text-zinc-500 hover:text-white"
              >
                {t('make.clear')}
              </button>
            )}
          </div>
          <textarea
            value={canvas.style}
            onChange={(e) => setCanvas({ ...canvas, style: e.target.value })}
            placeholder={t('make.soundPlaceholder')}
            rows={3}
            className="w-full mt-1 bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 text-base text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 leading-relaxed resize-y"
          />
          <p className="text-sm text-zinc-500 pt-1">{t('make.soundNote')}</p>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {STARTERS.map((starter) => (
              <button
                key={starter.id}
                type="button"
                title={starter.sounds}
                onClick={() => {
                  const current = canvas.style.trim();
                  setCanvas({
                    ...canvas,
                    style: current ? `${current}, ${starter.words}` : starter.words,
                  });
                  setBpm(starter.bpm);
                  setLastStarter(starter.id);
                }}
                className={`px-3 py-2 rounded-xl text-sm border transition-all ${
                  lastStarter === starter.id
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                + {starter.name}
              </button>
            ))}
          </div>
          {lastStarter && (
            <p className="text-sm text-zinc-400 pt-2 leading-relaxed">
              {STARTERS.find((entry) => entry.id === lastStarter)?.sounds}
            </p>
          )}
        </div>

        {/* A voice is described, not chosen — there is no voice parameter in the
            Music API. These words lean on breath, room and imperfection, because
            the usual complaint about generated singing is that it is too clean,
            and asking for the flaw works better than asking for "realistic". */}
        <div>
          <label className="text-sm text-zinc-400">{t('make.voice')}</label>
          <div className="grid sm:grid-cols-3 gap-2 mt-1.5">
            {VOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => setVoice(choice)}
                className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                  voice.id === choice.id
                    ? 'bg-emerald-500/15 border-emerald-500'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <span className={`block text-sm font-semibold ${voice.id === choice.id ? 'text-emerald-300' : 'text-zinc-200'}`}>
                  {choice.name}
                </span>
                <span className="block text-sm text-zinc-500 leading-snug pt-0.5">{choice.sounds}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-zinc-400">{t('make.speed')} — {bpm} {t('make.bpm')}</label>
            <input
              type="range"
              min={60}
              max={180}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-full mt-2 accent-emerald-500"
            />
            <p className="text-sm text-zinc-600">{bpm < 95 ? t('make.slow') : bpm < 125 ? t('make.steady') : t('make.fast')}</p>
          </div>
          <div>
            <label className="text-sm text-zinc-400">{t('make.mood')}</label>
            <select
              value={songKey}
              onChange={(e) => setSongKey(e.target.value)}
              className="w-full mt-1 bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="C Major">{t('make.mood.bright')}</option>
              <option value="G Major">{t('make.mood.warm')}</option>
              <option value="A Minor">{t('make.mood.thoughtful')}</option>
              <option value="D Minor">{t('make.mood.dark')}</option>
              <option value="F Minor">{t('make.mood.heavy')}</option>
            </select>
          </div>
        </div>

        {/* Lengths in seconds. Bars only mean something once you know the tempo,
            so "32 bars" answered a question nobody asked. */}
        <div>
          <label className="text-sm text-zinc-400">{t('make.length')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
            {LENGTH_CHOICES.map((choice) => (
              <button
                key={choice.seconds}
                type="button"
                onClick={() => setSeconds(choice.seconds)}
                className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                  seconds === choice.seconds
                    ? 'bg-emerald-500/15 border-emerald-500'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <span className={`block text-sm font-semibold ${seconds === choice.seconds ? 'text-emerald-300' : 'text-zinc-200'}`}>
                  {choice.label}
                </span>
                <span className="block text-sm text-zinc-500 leading-snug">{choice.note}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-1 border-t border-zinc-800">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="text-sm text-zinc-400">{t('make.credit')}</label>
            <span className="text-sm text-zinc-600">{selectedTools.length}</span>
          </div>
          {(['music', 'video', 'voice', 'image'] as const).map((role) => (
            <div key={role} className="space-y-1.5">
              <p className="text-xs uppercase tracking-wider text-zinc-600">{ROLE_LABELS[role]}</p>
              <div className="flex flex-wrap gap-1.5">
                {AI_MODELS.filter((m) => m.role === role).map((model) => {
                  const on = selectedTools.includes(model.name);
                  return (
                    <button
                      type="button"
                      key={model.name}
                      onClick={() => toggleTool(model.name)}
                      title={`${model.name} — ${model.provider}`}
                      className={`px-2.5 py-1 rounded-lg text-sm transition-all border ${
                        on ? ROLE_ACCENTS[role] + ' font-semibold' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {on ? `✓ ${model.name}` : `+ ${model.name}`}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => make()}
          disabled={busy}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-extrabold text-base flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {busy ? `${t('make.going')} ${elapsed}s` : t('make.go')}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-500">
            {userPlan !== 'free'
              ? t('make.unlimited')
              : `${left ?? 0} / ${ENTITLEMENTS['publish.release'].caps.free} ${t('make.leftToday')}`}
          </p>
          {userPlan === 'free' && (left ?? 0) === 0 && (
            <button type="button" onClick={onUpgrade} className="text-sm text-amber-400 hover:underline">
              {t('make.getMore')}
            </button>
          )}
        </div>

        {status && <p className="text-sm text-emerald-300">{status}</p>}

        {!engines.available('audio') && (
          <p className="text-sm text-zinc-500 leading-relaxed border-t border-zinc-800 pt-3">
            <Wand2 className="w-3.5 h-3.5 inline mr-1.5 text-zinc-600" />
            {t('make.sketch')}
          </p>
        )}
      </div>

      {/* Your channel */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h5 className="text-lg font-bold text-white">{t('make.channel')}</h5>
          <span className="text-sm text-zinc-500">{tracks.length} {tracks.length === 1 ? t('make.song') : t('make.songs')}</span>
        </div>

        {tracks.length === 0 ? (
          <p className="text-base text-zinc-500 py-8 text-center border border-dashed border-zinc-800 rounded-2xl">
            {t('make.empty')}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {tracks.map((track) => (
              <div key={track.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(track)}
                    aria-label={playing === track.id ? 'Pause' : 'Play'}
                    className="w-12 h-12 rounded-full bg-white text-onAccent flex items-center justify-center flex-shrink-0 hover:bg-zinc-200"
                  >
                    {playing === track.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-white leading-snug truncate">{track.title}</p>
                    <p className="text-sm text-zinc-500">
                      {track.genre} · {track.bpm} BPM · {Math.floor(track.seconds / 60)}:
                      {String(track.seconds % 60).padStart(2, '0')}
                      {track.remixOf && ' · another take'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* The ladder, one rung at a time. Somebody who has bought
                      nothing is offered the smaller step; somebody who opened
                      it is offered the one that makes it theirs; somebody who
                      owns it just gets the file. */}
                  {levelOf(owned, track.id) === 'none' && (
                    <button
                      type="button"
                      disabled={buying === track.id}
                      onClick={() => buy(track, 'open')}
                      className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {buying === track.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      {t('buy.open')} R{ONE_OFF.open.rand}
                    </button>
                  )}
                  {levelOf(owned, track.id) === 'opened' && (
                    <button
                      type="button"
                      disabled={buying === track.id}
                      onClick={() => buy(track, 'keep')}
                      className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-400 to-amber-500 text-onAccent flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {buying === track.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      {t('buy.keep')} R{ONE_OFF.keep.rand}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => save(track)}
                    title={levelOf(owned, track.id) === 'owned' ? undefined : t('buy.needsOwning')}
                    className="px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t('make.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => share(track)}
                    className="px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    {shared === track.id ? t('make.copied') : t('make.share')}
                  </button>
                  <button
                    type="button"
                    onClick={() => make(track)}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-violet-500 hover:text-violet-300 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    {t('make.again')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoFor(track)}
                    className="px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-amber-500 hover:text-amber-300 flex items-center gap-1.5"
                  >
                    <VideoIcon className="w-3.5 h-3.5" />
                    {t('video.make')}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(track)}
                    aria-label="Delete"
                    className="ml-auto text-zinc-600 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {videoFor && <VideoPanel track={videoFor} onClose={() => setVideoFor(null)} />}

        {tracks.length > 0 && (
          <p className="text-sm text-zinc-500">
            {t('make.kept')}
          </p>
        )}
      </div>
    </div>
  );
}
