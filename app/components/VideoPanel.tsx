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
 * **Made by the engine.** An engine renders footage from a sentence. It costs
 * credits, it takes minutes, and it has nothing to do with the audio: it is
 * footage to cut against the track. It is offered only once the server has
 * confirmed an engine is switched on, because a button for a thing that is
 * not connected is worse than no button.
 *
 * Which engine is deliberately not named here, and this line used to say
 * "Kling" — which was true the day it was written and stopped being true the
 * day the owner decided not to use Kling. `server/video/index.ts` picks from
 * whatever is configured and falls through the rest; a comment naming one of
 * them is a comment that goes quietly wrong when the account changes.
 *
 * Nothing here publishes anywhere. The video appears on this page when it is
 * done, and then you decide: save it, or share it wherever you like.
 */

import React, { useEffect, useState } from 'react';
import { Video as VideoIcon, X, Loader2, Download, Quote, AlertTriangle } from 'lucide-react';
import { renderVideo, styleFor, videoSupported, extensionFor, type Aspect } from '../lib/video';
import { engines, probeVideoEngine, type VideoGrades } from '../lib/engines';
import { spokenLines, looksUnquoted, MUSIC_LOOKS, LENGTHS } from '../lib/videoscenes';
import { CREDITS, videoCost } from '../lib/credits';
import Cost from './Cost';
import Recommend from './Recommend';
import History from './History';
import Note from './Note';
import { makeId, rememberMake } from '../lib/makes';
import { signal } from '../lib/signal';
import { partsOf, type TimedLine } from '../lib/timeline';
import { timeFor, type Timing } from '../lib/lyrictime';
import { downloadBlob, safeFilename, type Track } from '../lib/library';
import { readAudio } from '../lib/trackaudio';
import { useLang } from '../lib/i18n';
import { refusalText } from '../lib/apierror';
import { useCopilotOps } from '../lib/copilotactions';

export default function VideoPanel({ track, onClose }: { track: Track; onClose: () => void }) {
  const { t, lang } = useLang();
  const [aspect, setAspect] = useState<Aspect>('9:16');
  const [clipSeconds, setClipSeconds] = useState(15);
  const [startAt, setStartAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ blob: Blob; ext: string } | null>(null);
  const [kept, setKept] = useState(0);
  /**
   * Put the words on screen.
   *
   * On by default where the song has a plan, because a lyric video is the
   * format a new song actually gets posted as, and this one can be made
   * honestly: the app wrote the plan, so it knows where each line lands.
   */
  const [withWords, setWithWords] = useState(true);
  /** How the last film's lines were timed, so the room can say which it was. */
  const [timedHow, setTimedHow] = useState<Timing | null>(null);
  /**
   * A second line, under the words, in another language.
   *
   * `null` means the song travels in its own language only, which is the
   * default and is right for most of them. Offered only where this app has a
   * model behind it — a chooser that cannot do anything is worse than none. */
  const [alsoIn, setAlsoIn] = useState<'en' | 'af' | null>(null);
  const [canTranslate, setCanTranslate] = useState(false);
  const [translateProblem, setTranslateProblem] = useState('');
  /* Whether there is anything to put on screen: a plan, or a lyric sheet the
     ladder can read parts out of. */
  /* Whether this app has a model behind it, asked rather than assumed. */
  useEffect(() => {
    let live = true;
    void fetch('/api/translate')
      .then((response) => (response.ok ? response.json() : null))
      .then((answer) => {
        if (live && answer && typeof answer.available === 'boolean') setCanTranslate(answer.available);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const hasWords =
    (track.parts ?? []).length > 0 || partsOf(track.lyrics ?? '').length > 0;
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

  /* Somewhere to start.
     The desk has had scene templates since it was built; this room had a bare
     box and a placeholder, which is the hardest screen in the app to be new on
     — you are being asked to art-direct a video for a song you have just
     written. `MUSIC_LOOKS` is five approaches rather than five shots, because
     that is the decision this room is actually making, and each carries the
     shape and length its way of working wants.

     Tapping the same look again walks to its next scaffold rather than
     re-writing the first. Two per look, so the second tap is a different idea
     and not a reset. */
  const [look, setLook] = useState<string | null>(null);
  const [variant, setVariant] = useState(0);

  const applyLook = (id: string) => {
    const chosen = MUSIC_LOOKS.find((one) => one.id === id);
    if (!chosen) return;
    const next = look === id ? (variant + 1) % chosen.scaffolds.length : 0;
    setLook(id);
    setVariant(next);
    setTreatment(chosen.scaffolds[next]);
    setAspect(chosen.aspect);
    setClipSeconds(chosen.seconds);
  };

  /* What the copilot may do in this panel. It registers alongside the song
     list's own `pick_song` rather than replacing it — the bus merges them. */
  useCopilotOps('video', {
    set_shot: (value) => setTreatment(value),
    set_look: (value) => {
      const wanted = value.trim().toLowerCase();
      const found =
        MUSIC_LOOKS.find((one) => one.id === wanted) ??
        MUSIC_LOOKS.find((one) => one.label.toLowerCase() === wanted);
      if (found) applyLook(found.id);
    },
    set_shape: (value) => {
      const wanted = value.trim();
      if (wanted === '9:16' || wanted === '16:9') setAspect(wanted);
    },
  });
  const [engineSeconds, setEngineSeconds] = useState(5);
  /* What the engine says it can make, rather than a pair written here.
     This room offered five and ten because that is what one engine makes;
     another declares 5, 10, 15, 20 and 30, and this room could not ask for any
     of them. The desk has read the engine's own list since it was built — this
     is the same read, so the two screens cannot disagree about what exists. */
  const [caps, setCaps] = useState<VideoGrades | null>(null);
  const engineLengths = React.useMemo(() => {
    const able = caps?.can?.standard?.seconds;
    return LENGTHS.filter((one) => (able ?? [5, 10]).indexOf(one.seconds) !== -1);
  }, [caps]);
  // A length the engine dropped support for should not stay selected and
  // silently become something else at the far end.
  useEffect(() => {
    if (!engineLengths.length) return;
    if (engineLengths.some((one) => one.seconds === engineSeconds)) return;
    const nearest = engineLengths.reduce((best, one) =>
      Math.abs(one.seconds - engineSeconds) < Math.abs(best.seconds - engineSeconds) ? one : best,
    );
    setEngineSeconds(nearest.seconds);
  }, [engineLengths, engineSeconds]);

  useEffect(() => {
    let alive = true;
    void probeVideoEngine().then((state) => {
      if (!alive) return;
      setCaps(state);
      setEngineReady(state.available);
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
      // Kept, so a video paid for is not lost to a reload. See `lib/makes.ts`.
      void rememberMake(
        {
          id: makeId('video'),
          surface: 'video',
          kind: 'video',
          title: track.title,
          note: treatment,
          createdAt: new Date().toISOString(),
          seconds: engineSeconds,
          ext: 'mp4',
          credits: videoCost('standard', engineSeconds),
        },
        result.blob,
      ).then(() => setKept((n) => n + 1));
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
      /* Where the words fall, worked out the same way the player works it
         out — by listening to the file rather than by trusting the plan.

         It used to be `timelineOf(parts, seconds)`: the plan, spread evenly
         over the length. That is the roughest rung of the ladder in
         `lib/lyrictime.ts`, and it is the one that put a chorus a bar early on
         a release. The song player was taught to listen weeks ago; the video
         was still using the spread, so the same song had its words in two
         different places depending on which screen you were on.

         This also opens it to songs with no plan at all — one brought in from
         a file, or made before plans were kept — because the ladder can read
         the parts out of a lyric sheet and then time them against the audio. */
      const timed = withWords ? await timeFor(track, audio) : { lines: [], how: 'none' as const };
      setTimedHow(timed.how);
      let lyrics: readonly TimedLine[] = timed.lines;

      /* And the second line, if one was asked for.

         Fetched once for the whole song rather than per line, because the
         ordering is the contract: the route answers one for one and refuses
         when it cannot, and a per-line call would have no way to notice a
         line that came back missing. A failure here loses the subtitle and
         not the film. */
      setTranslateProblem('');
      if (alsoIn && lyrics.length) {
        try {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lines: lyrics.map((one) => one.text), to: alsoIn }),
          });
          const answer = (await response.json().catch(() => null)) as
            | { lines?: string[]; error?: string; message?: string }
            | null;
          if (response.ok && answer?.lines?.length === lyrics.length) {
            lyrics = lyrics.map((one, i) => ({ ...one, also: answer.lines?.[i] ?? '' }));
          } else {
            setTranslateProblem(
              refusalText(answer, lang, t('video.noTranslate', 'The second line could not be written; the film was made without it.')),
            );
          }
        } catch {
          setTranslateProblem(t('video.noTranslate', 'The second line could not be written; the film was made without it.'));
        }
      }

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
    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-white flex items-center gap-2">
            <VideoIcon className="w-4 h-4 text-emerald-400" />
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
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                  : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {option === 'browser'
                ? t('video.here', 'Drawn here — free')
                : `${t('video.byEngine', 'The engine')} — ${videoCost('standard', engineSeconds)} ${t('video.credits', 'credits')}`}
            </button>
          ))}
        </div>
      )}

      {engineReady && mode === 'engine' && (
        <div className="space-y-1.5">
          <Note>{t(
              'video.engineNote',
              'The engine makes footage from your sentence. It has nothing to do with the song — it is a clip to cut against it. A few minutes, and the credits are given back if it fails.',
            )}</Note>
          {/* Video is the slowest thing here and the one people give up on
              first. The figure and the wait stand together, above the button,
              in the same shape as everywhere else that spends. */}
          <Cost credits={videoCost('standard', engineSeconds)} waitMinutes={4} />
        </div>
      )}

      {!videoSupported() && mode === 'browser' ? (
        <p className="text-sm text-amber-300">{t('video.unsupported')}</p>
      ) : (
        <>
          {mode === 'engine' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <p className="text-sm text-zinc-400">{t('video.look', 'Where to start')}</p>
                  {/* The song is what the look is for, so the song is what it
                      is given: the title, the style and the words, which is
                      everything this room knows about it. */}
                  <Recommend
                    what={t('video.pickWhat', 'a look for this music video')}
                    context={[track.title, track.style, track.lyrics].filter(Boolean).join('\n')}
                    options={MUSIC_LOOKS.map((one) => ({ id: one.id, label: one.label, note: one.note }))}
                    onPick={applyLook}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {MUSIC_LOOKS.map((one) => (
                    <button
                      key={one.id}
                      type="button"
                      onClick={() => applyLook(one.id)}
                      title={one.note}
                      className={`text-left rounded-xl border px-3 py-2 transition-all ${
                        look === one.id
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <span className="block text-sm font-semibold leading-tight">{one.label}</span>
                      <span className="block text-xs opacity-80 leading-tight pt-0.5">{one.note}</span>
                    </button>
                  ))}
                </div>
                {look && (
                  <p className="text-xs text-zinc-500">
                    {t('video.lookAgain', 'Tap it again for a different idea. Edit anything you like.')}
                  </p>
                )}
              </div>

              <label className="text-sm text-zinc-400" htmlFor="video-treatment">
                {t('video.shot', 'What is on screen')}
              </label>
              <textarea
                id="video-treatment"
                value={treatment}
                onChange={(event) => setTreatment(event.target.value)}
                rows={4}
                placeholder={t(
                  'video.shotHint',
                  'A lonely tar road at dusk, wide shot, slow push in, dust in the headlights',
                )}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none leading-relaxed resize-y"
              />

              {/* The same rule the video desk teaches, in the same words. Two
                  screens that generate through one engine must not disagree
                  about how to talk to it. */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
                <p className="text-xs text-zinc-400 leading-relaxed flex gap-2">
                  <Quote className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{t('canvas.quotes')}</span>
                </p>
                {spokenLines(treatment).length > 0 && (
                  <div className="space-y-1 pl-5">
                    <p className="text-xs text-emerald-400">{t('canvas.willSay')}</p>
                    {spokenLines(treatment).map((line, index) => (
                      <p key={index} className="text-xs text-zinc-300 italic">
                        &ldquo;{line}&rdquo;
                      </p>
                    ))}
                  </div>
                )}
                {looksUnquoted(treatment) && (
                  <p className="text-xs text-amber-300 leading-relaxed flex gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{t('canvas.unquoted')}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm text-zinc-400">{t('video.length')}</label>
                <div className="flex gap-1.5 mt-1.5">
                  {engineLengths.map((option) => (
                    <button
                      key={option.seconds}
                      type="button"
                      onClick={() => setEngineSeconds(option.seconds)}
                      title={option.note}
                      className={`flex-1 px-2 py-2 rounded-xl text-sm border transition-all ${
                        engineSeconds === option.seconds
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {option.label}
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
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
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
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
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
                className="w-full mt-3 accent-emerald-500"
              />
            </div>
          </div>

          {/* Offered wherever there are words at all.

              It used to need a plan, because a plan was the only way to know
              where a line lands. `lib/lyrictime.ts` listens to the file now —
              it finds the phrases in the audio and hangs the lines on them,
              and falls back to the plan and then to an even spread when it
              cannot. So a song brought in from a file can carry its words too,
              and the line under the button says which of the three it used
              rather than letting all three look alike. */}
          {hasWords && (
            <label className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={withWords}
                onChange={(event) => setWithWords(event.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-200">{t('video.words')}</span>
                <span className="block text-sm text-zinc-500 leading-snug">{t('video.wordsNote')}</span>
                {/* Which rung of the ladder the last film used. Shown after
                    the fact rather than promised before it: it depends on what
                    could be heard in the file, and only the render knows. */}
                {/* Which language the second line is in.

                    Under the words rather than beside them, because it is a
                    property of the words. Three choices and no more: the song
                    on its own, or the song with English or Afrikaans under
                    it — those are the two languages this app is written in and
                    a longer list would be a list nobody has asked for. */}
                {canTranslate && withWords && (
                  <span className="flex flex-wrap items-center gap-1.5 pt-2">
                    {([null, 'en', 'af'] as const).map((one) => (
                      <button
                        key={String(one)}
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          setAlsoIn(one);
                        }}
                        className={`rounded-lg border px-2.5 py-1.5 text-sm ${
                          alsoIn === one
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        {one === null
                          ? t('video.onlySong', 'Its own language')
                          : one === 'en'
                            ? t('video.alsoEn', 'and English under it')
                            : t('video.alsoAf', 'and Afrikaans under it')}
                      </button>
                    ))}
                  </span>
                )}
                {translateProblem && (
                  <span className="block pt-1 text-sm text-amber-300 leading-snug">{translateProblem}</span>
                )}
                {timedHow && timedHow !== 'none' && (
                  <span className="block pt-1 text-sm text-emerald-400/90 leading-snug">
                    {timedHow === 'heard' || timedHow === 'sung' || timedHow === 'phrases'
                      ? t('video.wordsHeard', 'Last time, the lines were placed by listening to the song.')
                      : t('video.wordsSpread', 'Last time, the lines were spread evenly — nothing clear enough to listen to.')}
                  </span>
                )}
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
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
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
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold flex items-center justify-center gap-2 disabled:opacity-60"
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
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
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
                  className="px-3 py-2 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300"
                >
                  {t('video.again')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <History
        surface="video"
        reloadKey={kept}
        onUseAgain={(make) => {
          if (make.note) setTreatment(make.note);
          if (typeof make.seconds === 'number') setEngineSeconds(make.seconds);
        }}
      />

    </div>
  );
}
