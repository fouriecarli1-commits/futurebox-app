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
} from 'lucide-react';
import { renderSketch, encodeWav, familyFor, sketchDurationSeconds } from '../lib/audio';
import {
  loadTracks, saveTracks, putAudio, getAudio, deleteAudio, downloadBlob, safeFilename,
  type Track,
} from '../lib/library';
import { engines } from '../lib/engines';
import { STYLE_PRESETS } from '../data/studio';
import { check, record, ENTITLEMENTS, type Plan } from '../lib/entitlements';
import { useLang } from '../lib/i18n';

const LENGTHS = [
  { bars: 16, label: 'Short' },
  { bars: 32, label: 'Normal' },
  { bars: 48, label: 'Long' },
];

export default function MakeMusic({
  userPlan,
  onUpgrade,
  incoming,
}: {
  userPlan: Plan;
  onUpgrade: () => void;
  /** Carried over from the Songwriter, when you came from there. */
  incoming?: { title: string; lyrics: string; style: string } | null;
}) {
  const [title, setTitle] = useState(incoming?.title ?? '');
  const { t } = useLang();
  const [preset, setPreset] = useState(STYLE_PRESETS[5]);
  const [bpm, setBpm] = useState(STYLE_PRESETS[5].bpm);
  const [songKey, setSongKey] = useState(STYLE_PRESETS[5].key);
  const [bars, setBars] = useState(32);
  const [lyrics, setLyrics] = useState(incoming?.lyrics ?? '');

  const [tracks, setTracks] = useState<Track[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [shared, setShared] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => setTracks(loadTracks()), []);
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
            style: preset.tags.join(', '),
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
          style: preset.tags.join(', '),
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
      } catch {
        setStatus(t('make.failed'));
      } finally {
        setBusy(false);
      }
    },
    [bars, bpm, lyrics, preset, songKey, t, title, tracks, userPlan],
  );

  const toggle = async (track: Track) => {
    const element = audioRef.current;
    if (!element) return;
    if (playing === track.id) {
      element.pause();
      setPlaying(null);
      return;
    }
    const blob = await getAudio(track.id);
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
    const blob = await getAudio(track.id);
    if (blob) downloadBlob(blob, safeFilename(track.title, 'wav'));
  };

  const share = async (track: Track) => {
    const line = `${track.title} — ${track.genre}, ${track.bpm} BPM. Made on FutureBox.`;
    const blob = await getAudio(track.id);
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
            {userPlan === 'pro'
              ? t('make.unlimited')
              : `${left ?? 0} / ${ENTITLEMENTS['publish.release'].free} ${t('make.leftToday')}`}
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

        {tracks.length > 0 && (
          <p className="text-sm text-zinc-500">
            {t('make.kept')}
          </p>
        )}
      </div>
    </div>
  );
}
