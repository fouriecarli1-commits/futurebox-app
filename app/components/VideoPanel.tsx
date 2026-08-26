'use client';

/**
 * Making a music video from a song you already have.
 *
 * Nothing here publishes anywhere. The video is drawn in this browser from the
 * track's own audio, it appears on this page when it is done, and then you
 * decide: save it, or share it wherever you like. That is the whole flow.
 */

import React, { useEffect, useState } from 'react';
import { Video as VideoIcon, X, Loader2, Download } from 'lucide-react';
import { renderVideo, styleFor, videoSupported, extensionFor, type Aspect } from '../lib/video';
import { downloadBlob, safeFilename, type Track } from '../lib/library';
import { readAudio } from '../lib/trackaudio';
import { useLang } from '../lib/i18n';

export default function VideoPanel({ track, onClose }: { track: Track; onClose: () => void }) {
  const { t } = useLang();
  const [aspect, setAspect] = useState<Aspect>('9:16');
  const [clipSeconds, setClipSeconds] = useState(15);
  const [startAt, setStartAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ blob: Blob; ext: string } | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  // Switching to a different song should not leave the last video on screen.
  useEffect(() => {
    setMade(null);
    setProgress(0);
    setError(null);
    setStartAt(0);
  }, [track.id]);

  // The object URL is the only thing here the browser will not clean up itself.
  useEffect(() => {
    if (!made) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(made.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [made]);

  const make = async () => {
    const audio = await readAudio(track.id);
    if (!audio) {
      setError(t('make.missing'));
      return;
    }
    setBusy(true);
    setProgress(0);
    setError(null);
    setMade(null);
    try {
      const result = await renderVideo({
        audio,
        aspect,
        seconds: clipSeconds === 0 ? track.seconds : clipSeconds,
        startSeconds: startAt,
        style: styleFor(track.title, track.genre, track.bpm),
        onProgress: setProgress,
      });
      setMade({ blob: result.blob, ext: extensionFor(result.mimeType) });
    } catch {
      setError(t('make.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-white flex items-center gap-2">
            <VideoIcon className="w-4 h-4 text-amber-400" />
            {t('video.title')} — {track.title}
          </p>
          <p className="text-sm text-zinc-400 pt-1 max-w-xl">{t('video.what')}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t('video.close')} className="text-zinc-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {!videoSupported() ? (
        <p className="text-sm text-amber-300">{t('video.unsupported')}</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-zinc-400">{t('video.shape')}</label>
              <div className="flex gap-1.5 mt-1.5">
                {(['9:16', '16:9'] as Aspect[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAspect(option)}
                    className={`flex-1 px-2 py-2 rounded-xl text-sm border transition-all ${
                      aspect === option
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {option === '9:16' ? t('video.tall') : t('video.wide')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400">{t('video.length')}</label>
              <div className="flex gap-1.5 mt-1.5">
                {[15, 30, 0].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setClipSeconds(option)}
                    className={`flex-1 px-2 py-2 rounded-xl text-sm border transition-all ${
                      clipSeconds === option
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {option === 15 ? '15s' : option === 30 ? '30s' : t('video.whole')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400">
                {t('video.from')} {Math.floor(startAt / 60)}:{String(Math.floor(startAt % 60)).padStart(2, '0')}
              </label>
              <input
                type="range"
                min={0}
                max={Math.max(0, track.seconds - 5)}
                value={startAt}
                onChange={(e) => setStartAt(Number(e.target.value))}
                className="w-full mt-3 accent-amber-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={make}
            disabled={busy}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 text-onAccent font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <VideoIcon className="w-4 h-4" />}
            {busy ? t('video.making') : t('video.go')}
          </button>

          {busy && (
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}

          {error && <p className="text-sm text-rose-400">{error}</p>}

          {url && made && (
            <div className="space-y-3">
              <p className="text-sm text-emerald-300">{t('video.done')}</p>
              <video
                src={url}
                controls
                className={`rounded-xl border border-zinc-800 bg-black ${aspect === '9:16' ? 'max-h-96 mx-auto' : 'w-full'}`}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadBlob(made.blob, safeFilename(track.title, made.ext))}
                  className="px-3 py-2 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('video.save')}
                </button>
                <button
                  type="button"
                  onClick={make}
                  className="px-3 py-2 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-amber-500 hover:text-amber-300"
                >
                  {t('video.again')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
