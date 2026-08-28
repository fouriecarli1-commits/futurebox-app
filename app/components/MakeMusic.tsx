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
import { STYLE_PRESETS, AI_MODELS, ROLE_LABELS, ROLE_ACCENTS } from '../data/studio';
import { check, record, ENTITLEMENTS, type Plan } from '../lib/entitlements';
import { useLang } from '../lib/i18n';
import * as cloud from '../lib/cloud';

const LENGTHS = [
  { bars: 16, label: 'Short' },
  { bars: 32, label: 'Normal' },
  { bars: 48, label: 'Long' },
];

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
  const [preset, setPreset] = useState(STYLE_PRESETS[5]);
  const [bpm, setBpm] = useState(STYLE_PRESETS[5].bpm);
  const [songKey, setSongKey] = useState(STYLE_PRESETS[5].key);
  const [bars, setBars] = useState(32);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [shared, setShared] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  // Making a video is the same job here as on its own tab, so it is the same
  // component. This screen only decides which track it is pointed at.
  const [videoFor, setVideoFor] = useState<Track | null>(null);

  /** What the music engine is told. Free text from the copilot wins over the
   *  preset chips, because it is the more specific thing the person asked for. */
  const styleText = canvas.style || preset.tags.join(', ');

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
    if (incoming?.style) {
      const match = STYLE_PRESETS.find((p) => incoming.style.toLowerCase().includes(p.name.toLowerCase()));
      if (match) {
        setPreset(match);
        setBpm(match.bpm);
        setSongKey(match.key);
      }
    }
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
      setStatus(t('make.going'));

      // Yields once so the button visibly changes before the work starts.
      await new Promise((resolve) => setTimeout(resolve, 60));

      try {
        const spec = {
          bpm: remixOf?.bpm ?? bpm,
          key: remixOf?.key ?? songKey,
          family: familyFor(remixOf?.genre ?? preset.name, preset.tags),
          bars,
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
            seconds: sketchDurationSeconds(spec),
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
          genre: remixOf?.genre ?? preset.name,
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
      } catch {
        setStatus(t('make.failed'));
      } finally {
        setBusy(false);
      }
    },
    [bars, bpm, lyrics, onMade, preset, songKey, styleText, t, title, tracks, userPlan],
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
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(blob);
    element.src = urlRef.current;
    await element.play();
    setPlaying(track.id);
  };

  const save = async (track: Track) => {
    const blob = await readAudio(track.id);
    if (blob) downloadBlob(blob, safeFilename(track.title, 'wav'));
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

        <div>
          <label className="text-sm text-zinc-400">{t('make.sound')}</label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {STYLE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPreset(p);
                  setBpm(p.bpm);
                  setSongKey(p.key);
                }}
                className={`px-3 py-2 rounded-xl text-sm border transition-all ${
                  preset.id === p.id
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
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
              <option value={preset.key}>{t('make.mood.likeStyle')} ({preset.key})</option>
              <option value="C Major">{t('make.mood.bright')}</option>
              <option value="G Major">{t('make.mood.warm')}</option>
              <option value="A Minor">{t('make.mood.thoughtful')}</option>
              <option value="D Minor">{t('make.mood.dark')}</option>
              <option value="F Minor">{t('make.mood.heavy')}</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-zinc-400">{t('make.length')}</label>
            <div className="flex gap-1.5 mt-1.5">
              {LENGTHS.map((l) => (
                <button
                  key={l.bars}
                  type="button"
                  onClick={() => setBars(l.bars)}
                  className={`flex-1 px-2 py-2.5 rounded-xl text-sm border transition-all ${
                    bars === l.bars
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {t(`make.${l.label.toLowerCase()}`)}
                </button>
              ))}
            </div>
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
          {busy ? t('make.going') : t('make.go')}
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
                  <button
                    type="button"
                    onClick={() => save(track)}
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
