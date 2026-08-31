'use client';

/**
 * Making a music video from a song you already have.
 *
 * Two ways, and the panel is honest about which one is running.
 *
 * **Drawn here.** The browser watches the track's own frequencies and draws to
 * them. It costs nothing, works offline, needs no engine, and every bar you
 * see moving is that moment of the audio. This is what a free account gets and
 * it is not a consolation prize — it is the only one of the two where the
 * picture is genuinely of the song.
 *
 * **Made by the engine.** Kling renders footage from a sentence. It costs
 * credits, it takes minutes, and it has nothing to do with the audio: it is
 * footage to cut against the track. It is offered only once the server has
 * confirmed the engine is switched on, because a button for a thing that is
 * not connected is worse than no button.
 *
 * Nothing here publishes anywhere. The video appears on this page when it is
 * done, and then you decide: save it, or share it wherever you like.
 */

import React, { useEffect, useState } from 'react';
import { Video as VideoIcon, X, Loader2, Download } from 'lucide-react';
import { renderVideo, styleFor, videoSupported, extensionFor, type Aspect } from '../lib/video';
import { engines, probeVideo } from '../lib/engines';
import { CREDITS } from '../lib/credits';
import { signal } from '../lib/signal';
import { timelineOf, type Part } from '../lib/timeline';
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
  /**
   * Put the words on screen.
   *
   * On by default where the song has a plan, because a lyric video is the
   * format a new song actually gets posted as, and this one can be made
   * honestly: the app wrote the plan, so it knows where each line lands.
   */
  const [withWords, setWithWords] = useState(true);
  const [url, setUrl] = useState<string | null>(null);

  /**
   * Which of the two is being used, and whether the other one is even there.
   *
   * `engine` starts null rather than false: only the server knows whether the
   * keys are set, so the panel renders the browser path first and grows the
   * choice when the answer lands. Nothing claims the engine before that.
   */
  const [engineReady, setEngineReady] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'browser' | 'engine'>('browser');
  const [treatment, setTreatment] = useState('');
  const [engineSeconds, setEngineSeconds] = useState<5 | 10>(5);

  useEffect(() => {
    let alive = true;
    void probeVideo().then((ready) => {
      if (alive) setEngineReady(ready);
    });
    return () => {
      alive = false;
    };
  }, []);

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

  /**
   * The engine path: a sentence in, minutes of waiting, a file out.
   *
   * There is no progress bar on this one because there is nothing to measure.
   * Kling reports 'processing' and then it reports a video; a bar that crept
   * to ninety and sat there would be an invention. What is shown instead is
   * the true statement that it is working and roughly how long that takes.
   */
  const makeWithEngine = async () => {
    const said = treatment.trim();
    if (said.length < 8) {
      setError(t('video.needShot', 'Describe the shot in a sentence first.'));
      return;
    }
    setBusy(true);
    setProgress(0);
    setError(null);
    setMade(null);
    try {
      const result = await engines.generateVideo({
        title: track.title,
        treatment: said,
        aspect,
        seconds: engineSeconds,
      });
      setMade({ blob: result.blob, ext: 'mp4' });
      signal('video', { category: track.genre, ref: track.id });
    } catch (problem) {
      // Whatever came back is written for the person — a refusal, a plan gate,
      // an allowance that is used up — and is shown as it was written.
      setError(problem instanceof Error ? problem.message : t('make.failed'));
    } finally {
      setBusy(false);
    }
  };

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
      // The plan, scaled to the file's real length. Empty when the song has
      // none — a sketch, or one made before plans were kept — and the
      // visualiser runs on its own.
      const parts = (track.parts ?? []) as readonly Part[];
      const lyrics =
        withWords && parts.length ? timelineOf(parts, track.seconds || 0) : [];

      const result = await renderVideo({
        audio,
        aspect,
        lyrics,
        seconds: clipSeconds === 0 ? track.seconds : clipSeconds,
        startSeconds: startAt,
        style: styleFor(track.title, track.genre, track.bpm),
        onProgress: setProgress,
      });
      setMade({ blob: result.blob, ext: extensionFor(result.mimeType) });
      // Counted here, where a file exists — not when the button was pressed.
      signal('video', { category: track.genre, ref: track.id });
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

      {/* The choice only appears once the server has said the engine is there.
          Until then there is one way to make a video and the panel says so by
          showing one way. */}
      {engineReady && (
        <div className="flex gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-1.5">
          {(['browser', 'engine'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setMode(option);
                setError(null);
              }}
              className={`flex-1 px-3 py-2 rounded-xl text-sm border transition-all ${
                mode === option
                  ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                  : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {option === 'browser'
                ? t('video.here', 'Drawn here — free')
                : `${t('video.byEngine', 'The engine')} — ${CREDITS.video} ${t('video.credits', 'credits')}`}
            </button>
          ))}
        </div>
      )}

      {engineReady && mode === 'engine' && (
        <p className="text-sm text-zinc-500 leading-snug">
          {t(
            'video.engineNote',
            'The engine makes footage from your sentence. It has nothing to do with the song — it is a clip to cut against it. A few minutes, and the credits are given back if it fails.',
          )}
        </p>
      )}

      {!videoSupported() && mode === 'browser' ? (
        <p className="text-sm text-amber-300">{t('video.unsupported')}</p>
      ) : (
        <>
          {mode === 'engine' && (
            <div className="space-y-3">
              <label className="text-sm text-zinc-400" htmlFor="video-treatment">
                {t('video.shot', 'What is on screen')}
              </label>
              <textarea
                id="video-treatment"
                value={treatment}
                onChange={(event) => setTreatment(event.target.value)}
                rows={3}
                placeholder={t(
                  'video.shotHint',
                  'A lonely tar road at dusk, wide shot, slow push in, dust in the headlights',
                )}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none"
              />
              <div>
                <label className="text-sm text-zinc-400">{t('video.length')}</label>
                <div className="flex gap-1.5 mt-1.5">
                  {([5, 10] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setEngineSeconds(option)}
                      className={`flex-1 px-2 py-2 rounded-xl text-sm border transition-all ${
                        engineSeconds === option
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {option}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className={`grid sm:grid-cols-3 gap-3 ${mode === 'engine' ? 'hidden' : ''}`}>
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

          {/* Only offered where it can be done properly. A song with no plan
              has no line timings, and guessing them would put the chorus in
              the wrong place on somebody's release. */}
          {(track.parts ?? []).length > 0 && (
            <label className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={withWords}
                onChange={(event) => setWithWords(event.target.checked)}
                className="mt-0.5 w-4 h-4 accent-amber-500 flex-shrink-0"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-200">{t('video.words')}</span>
                <span className="block text-sm text-zinc-500 leading-snug">{t('video.wordsNote')}</span>
              </span>
            </label>
          )}

          {mode === 'engine' && (
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
          )}

          <button
            type="button"
            onClick={mode === 'engine' ? makeWithEngine : make}
            disabled={busy}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 text-onAccent font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <VideoIcon className="w-4 h-4" />}
            {busy ? t('video.making') : t('video.go')}
          </button>

          {/* A bar for the browser, which knows exactly how far it has got,
              and a sentence for the engine, which does not report progress at
              all. A bar that crept to ninety and waited would be an invention
              rather than a measurement. */}
          {busy && mode === 'browser' && (
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          {busy && mode === 'engine' && (
            <p className="text-sm text-zinc-400">
              {t(
                'video.engineWaiting',
                'The engine is working. This usually takes two to four minutes, and it keeps going if you leave this page.',
              )}
            </p>
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
                  onClick={mode === 'engine' ? makeWithEngine : make}
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
