'use client';

/**
 * Hooks — cutting the bit people will actually watch.
 *
 * This tab used to be demo cards of other people's clips, which taught nobody
 * anything. Now it works on your own songs: it listens to the track, finds the
 * moments where something arrives, and cuts a vertical clip from whichever you
 * pick.
 *
 * Why not just take the opening? Because the opening is the intro, and the
 * intro is the part designed to be skipped.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Smartphone, Loader2, Download, Scissors, Music } from 'lucide-react';
import { loadTracks, downloadBlob, safeFilename, type Track } from '../lib/library';
import { readAudio } from '../lib/trackaudio';
import { findHooks, sectionHooks, decodeTrack, formatMoment, type Hook } from '../lib/hooks';
import { renderVideo, styleFor, videoSupported, extensionFor } from '../lib/video';
import { useLang } from '../lib/i18n';
import Cost from './Cost';
import { useCopilotOps, matchByTitle } from '../lib/copilotactions';
import ShareRow from './ShareRow';

const LENGTHS = [15, 30];

export default function Hooks() {
  const { t } = useLang();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selected, setSelected] = useState<Track | null>(null);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [seconds, setSeconds] = useState(15);
  const [finding, setFinding] = useState(false);
  const [cutting, setCutting] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [clip, setClip] = useState<{ url: string; blob: Blob; ext: string } | null>(null);

  /* Pick the song to cut from, and how long the clip runs. Both go through the
     same `look` the buttons use, so the hooks are re-found rather than left
     showing the previous song's. */
  useCopilotOps('hooks_feed', {
    pick_song: (value) => {
      const track = matchByTitle(tracks, value);
      if (track) void look(track, seconds);
    },
    set_seconds: (value) => {
      const wanted = Number.parseInt(value.trim(), 10);
      if (!LENGTHS.includes(wanted)) return;
      setSeconds(wanted);
      if (selected) void look(selected, wanted);
    },
  });

  useEffect(() => setTracks(loadTracks()), []);

  const look = useCallback(
    async (track: Track, clipSeconds: number) => {
      setSelected(track);
      setFinding(true);
      setHooks([]);
      if (clip) URL.revokeObjectURL(clip.url);
      setClip(null);
      try {
        const audio = await readAudio(track.id);
        if (!audio) return;
        const buffer = await decodeTrack(audio);
        // The plan first, where there is one: the app knows where the chorus
        // is, and a known boundary beats a loudness peak. Analysis fills in
        // behind it, and a duplicate start is dropped rather than offered
        // twice under two names.
        const named = sectionHooks(track.parts ?? [], buffer.duration, clipSeconds);
        const found = findHooks(buffer, clipSeconds, 3).filter(
          (one) => !named.some((part) => Math.abs(part.startSeconds - one.startSeconds) < 2),
        );
        setHooks(named.concat(found).slice(0, 5));
      } finally {
        setFinding(false);
      }
    },
    [clip],
  );

  const cut = async (hook: Hook, index: number) => {
    if (!selected) return;
    const audio = await readAudio(selected.id);
    if (!audio) return;
    setCutting(index);
    setProgress(0);
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
    try {
      const result = await renderVideo({
        audio,
        aspect: '9:16',
        seconds: hook.seconds,
        startSeconds: hook.startSeconds,
        style: styleFor(selected.title, selected.genre, selected.bpm),
        onProgress: setProgress,
      });
      setClip({ url: URL.createObjectURL(result.blob), blob: result.blob, ext: extensionFor(result.mimeType) });
    } finally {
      setCutting(null);
    }
  };

  /**
   * Why a moment was picked. Switched on a value, not on the first word of an
   * English sentence — matching prose is how the section reasons were quietly
   * turning into "safe pick".
   */
  const reasonFor = (hook: Hook): string => {
    if (hook.kind === 'section') return `${hook.label} — ${t('hooks.fromPlan')}`;
    if (hook.kind === 'arrival') return t('hooks.arrives');
    if (hook.kind === 'fullest') return t('hooks.fullest');
    return t('hooks.safe');
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-emerald-400" />
          {t('hooks.title')}
        </h4>
        <p className="text-base text-zinc-400 pt-1 max-w-2xl leading-relaxed">{t('hooks.sub')}</p>
        {/* Finding and cutting both happen in the browser, so nothing here
            spends. Said rather than left blank: a room that hands you a
            finished clip and says nothing about money is read as hiding one. */}
        <Cost credits={0} className="pt-1.5" />
      </div>

      {tracks.length === 0 ? (
        <p className="text-base text-zinc-500 py-10 text-center border border-dashed border-zinc-800 rounded-2xl">
          {t('hooks.none')}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">{t('hooks.pick')}</p>
            <div className="flex flex-wrap gap-2">
              {tracks.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => look(track, seconds)}
                  className={`px-3 py-2 rounded-xl text-sm border transition-all flex items-center gap-2 ${
                    selected?.id === track.id
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  {track.title}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">{t('hooks.clipLength')}</span>
            {LENGTHS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setSeconds(option);
                  if (selected) look(selected, option);
                }}
                className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                  seconds === option
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {option}s
              </button>
            ))}
          </div>

          {finding && <p className="text-sm text-zinc-500">{t('hooks.looking')}</p>}

          {hooks.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-sm font-semibold text-zinc-300">{t('hooks.found')}</p>
              <div className="grid md:grid-cols-3 gap-3">
                {hooks.map((hook, index) => (
                  <div key={hook.startSeconds} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-lg font-bold text-white">
                        {t('hooks.at')} {formatMoment(hook.startSeconds)}
                      </p>
                      {hook.score >= 0.99 && (
                        <span className="text-sm text-emerald-400 font-semibold">{t('hooks.strongest')}</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400">{reasonFor(hook)}</p>
                    <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${Math.round(hook.score * 100)}%` }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => cut(hook, index)}
                      disabled={cutting !== null || !videoSupported()}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold bg-zinc-950 border border-zinc-700 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {cutting === index ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                      {cutting === index ? t('hooks.cutting') : t('hooks.cut')}
                    </button>
                    {cutting === index && (
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-emerald-400 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!videoSupported() && hooks.length > 0 && (
            <p className="text-sm text-amber-300">{t('video.unsupported')}</p>
          )}

          {clip && selected && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3">
              <p className="text-sm text-emerald-300">{t('hooks.ready')}</p>
              <video src={clip.url} controls className="rounded-xl border border-zinc-800 bg-black max-h-96 mx-auto" />
              <button
                type="button"
                onClick={() => downloadBlob(clip.blob, safeFilename(`${selected.title}-hook`, clip.ext))}
                className="px-3 py-2 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {t('video.save')}
              </button>

              {/* A hook exists to be posted. Offering that here, where the file
                  is, saves somebody working out the caption twice. */}
              <ShareRow
                title={selected.title}
                what={t('hooks.shareWhat', 'A hook from a song I made on FutureBox.')}
                hashtags={['newmusic', selected.genre.replace(/[^A-Za-z0-9]/g, '').toLowerCase()].filter(Boolean)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
