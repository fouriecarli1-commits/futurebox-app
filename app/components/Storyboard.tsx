'use client';

/**
 * A film built out of shots, and one file at the end of it.
 *
 * ── Why this room exists ─────────────────────────────────────────────────
 *
 * The desk above makes one clip out of one sentence, and every engine caps
 * that at somewhere between four and thirty seconds. A music video is three
 * minutes. Twelve generations were always possible and left somebody with
 * twelve files, in a history, in the order they happened to press the button.
 *
 * What was missing was the thing that makes them a film: an order, a running
 * total, and an export. All three are here, and the export is `lib/stitch.ts`,
 * which was measured before any of this was drawn.
 *
 * ── The order it asks in ─────────────────────────────────────────────────
 *
 * Write the shots first, generate them second. That is deliberate and it is
 * about money: a list of twelve sentences is free to write, free to reorder
 * and free to throw away, and seeing all twelve next to each other is when
 * somebody notices that shots four and nine are the same idea. Generating as
 * you go would have them paying for that discovery.
 *
 * So a shot is a sentence and a length until somebody presses the button on
 * that row, and the button says what it costs.
 *
 * ── What it borrows from the desk ────────────────────────────────────────
 *
 * The grade, the shape and the start frame. Not copies of those controls —
 * a second set would drift from the first, and the cast picture in particular
 * is the whole reason twelve shots can have one person in them. One decision,
 * made once, above.
 *
 * ── The export, and its honest cost ──────────────────────────────────────
 *
 * It runs in real time. A three-minute film takes three minutes with the tab
 * open, because recording a canvas captures frames as they are painted. That
 * is said on the button before it is pressed rather than discovered while
 * watching a bar, and it is measured in `audit/stitch.mjs` rather than
 * described.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, Clapperboard, Check, Download, Film, Loader2, Play, Plus, Scissors, Sparkles, Trash2,
} from 'lucide-react';
import { engines, type EngineAspect } from '../lib/engines';
import { videoCost, type VideoGrade } from '../lib/credits';
import { downloadBlob, loadTracks, safeFilename, type Track } from '../lib/library';
import { makeId, rememberMake } from '../lib/makes';
import { readAudio } from '../lib/trackaudio';
import { canStitch, lengthOf, stitch } from '../lib/stitch';
import { makeBlob } from '../lib/makes';
import {
  EMPTY, MOST_SHOTS, changed, clipsFor, loadStoryboard, missing, moved, playsFor,
  runtime, saveStoryboard, shotId, withShot, withoutShot, type Shot, type Storyboard as Board,
} from '../lib/storyboard';
import { useLang } from '../lib/i18n';
import Note from './Note';

function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export default function Storyboard({
  aspect,
  grade,
  lengths,
  frame,
  onUpgrade,
}: {
  readonly aspect: EngineAspect;
  readonly grade: VideoGrade;
  /** What this grade will actually make, from the desk above. */
  readonly lengths: readonly { seconds: number; label: string }[];
  /** The cast member the desk has chosen, so every shot is the same person. */
  readonly frame: string | null;
  readonly onUpgrade?: () => void;
}): React.ReactElement {
  const { t } = useLang();

  const [board, setBoard] = useState<Board>(EMPTY);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [making, setMaking] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [cutting, setCutting] = useState<{ at: number; of: number } | null>(null);
  const [film, setFilm] = useState<{ blob: Blob; url: string; seconds: number; ext: string } | null>(null);
  /**
   * What each clip actually turned out to be, so the trim handles span the
   * real thing rather than what was asked for.
   *
   * The engine rounds a request to a length it makes, and a clip that came
   * back at ten when six was asked for would give a slider that stops at six
   * and four seconds nobody could reach. Read off the file, once, per clip.
   */
  const [clipLengths, setClipLengths] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setBoard(loadStoryboard());
    setTracks(loadTracks());
    setReady(true);
  }, []);

  /* Saved on every change, not on a button. Somebody arranging shots is not
     thinking about saving, and there is nothing here worth losing to a reload.

     Guarded by a state flag rather than a ref — see the note in `AdRuns`. A
     ref flipped inside the load effect is already true when the save effect
     runs in the same commit, and the save then writes the empty initial state
     over what was just read. */
  useEffect(() => {
    if (ready) saveStoryboard(board);
  }, [ready, board]);

  useEffect(() => () => { if (film) URL.revokeObjectURL(film.url); }, [film]);

  // Measured when a clip appears, and only once each.
  useEffect(() => {
    let alive = true;
    void (async () => {
      for (const shot of board.shots) {
        if (!shot.makeId || clipLengths[shot.makeId] !== undefined) continue;
        const blob = await makeBlob(shot.makeId);
        if (!alive) return;
        const seconds = blob ? await lengthOf(blob) : 0;
        if (!alive) return;
        setClipLengths((was) => ({ ...was, [shot.makeId as string]: seconds }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [board.shots, clipLengths]);

  const shortest = lengths[0]?.seconds ?? 5;
  const total = runtime(board, clipLengths);
  const short = missing(board);
  const song = tracks.find((one) => one.id === board.songId) ?? null;

  const price = useMemo(
    () => board.shots.reduce((sum, one) => (one.makeId ? sum : sum + videoCost(grade, one.seconds)), 0),
    [board.shots, grade],
  );

  const add = useCallback(() => {
    setBoard((was) => withShot(was, { id: shotId(), prompt: '', seconds: shortest }));
  }, [shortest]);

  const shoot = useCallback(
    async (id: string) => {
      const shot = board.shots.find((one) => one.id === id);
      if (!shot || making) return;
      if (shot.prompt.trim().length < 12) {
        setProblem(t('board.tooShort', 'Say a bit more in that shot — what is in it, and what the camera does.'));
        return;
      }
      setMaking(id);
      setProblem(null);
      try {
        const result = await engines.generateVideo({
          title: t('board.shot', 'Shot'),
          treatment: shot.prompt.trim(),
          aspect,
          seconds: shot.seconds,
          grade,
          ...(frame ? { image: frame } : {}),
        });
        const id_ = makeId('canvas');
        /* Marked as a favourite, which is the flag `makes.ts` honours when it
           evicts. A film's shot must not be thrown out to make room for a clip
           somebody generated afterwards and did not keep. */
        await rememberMake(
          {
            id: id_,
            surface: 'canvas',
            kind: 'video',
            title: t('board.shot', 'Shot'),
            note: shot.prompt.trim(),
            createdAt: new Date().toISOString(),
            seconds: shot.seconds,
            ext: 'mp4',
            credits: videoCost(grade, shot.seconds),
            favourite: true,
          },
          result.blob,
        );
        setBoard((was) => changed(was, id, { makeId: id_ }));
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : t('make.failed');
        setProblem(message);
        if (/plan|Maker/i.test(message)) onUpgrade?.();
      } finally {
        setMaking(null);
      }
    },
    [board.shots, making, aspect, grade, frame, onUpgrade, t],
  );

  const cut = useCallback(async () => {
    if (cutting || !board.shots.length) return;
    setProblem(null);
    setFilm(null);
    setCutting({ at: 0, of: board.shots.length });
    try {
      const clips = await clipsFor(board);
      const lost = clips.some((one, index) => board.shots[index].makeId && !one);
      if (lost) {
        setProblem(t('board.lost', 'A shot’s clip is no longer on this device. Make that one again before cutting.'));
        return;
      }
      /* Each scene carries its own window, so the cut plays the trimmed part
         and nothing else. `stitch` clamps whatever arrives, which is what
         keeps a slider dragged somewhere odd from losing a scene. */
      const scenes = clips
        .map((clip, index) => ({
          clip,
          name: `${index + 1}`,
          ...(board.shots[index].from !== undefined ? { from: board.shots[index].from } : {}),
          ...(board.shots[index].to !== undefined ? { to: board.shots[index].to } : {}),
        }))
        .filter((one): one is { clip: Blob; name: string; from?: number; to?: number } =>
          Boolean(one.clip),
        );
      if (!scenes.length) {
        setProblem(t('board.nothing', 'Nothing to cut yet — make at least one shot.'));
        return;
      }

      const audio = song ? await readAudio(song.id) : null;
      // Tall films are cut tall. The shape is the desk's, so a mixed board
      // still comes out as one film with the odd shot letterboxed.
      const wide = aspect === '9:16' ? { width: 720, height: 1280 } : aspect === '1:1'
        ? { width: 1080, height: 1080 }
        : { width: 1280, height: 720 };

      const made = await stitch({
        scenes,
        audio,
        ...wide,
        background: board.background ?? 'black',
        onScene: (at, of) => setCutting({ at: at + 1, of }),
      });
      if (!made.ok) {
        setProblem(
          made.why === 'unsupported'
            ? t('board.unsupported', 'This browser cannot cut a film together. Chrome or Safari can.')
            : t('board.cutFailed', 'The film could not be cut. Nothing was charged for this step.'),
        );
        return;
      }
      setFilm({ blob: made.blob, url: URL.createObjectURL(made.blob), seconds: made.seconds, ext: made.ext });
    } finally {
      setCutting(null);
    }
  }, [board, cutting, song, aspect, t]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-4">
      <div className="flex items-start gap-2.5">
        <Clapperboard className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-base font-black text-white tracking-tight">
            {t('board.title', 'Build a long one')}
          </h3>
          <Note className="text-sm text-zinc-500 leading-relaxed">{t(
              'board.what',
              'No engine makes more than half a minute in one go, so a long video is short ones cut together. Write the shots, make them one at a time, and cut them into one file with a song under it.',
            )}</Note>
        </div>
      </div>

      {/* Written before anything is generated, on purpose — see the note at
          the top of this file. */}
      <Note className="text-xs text-zinc-500 leading-relaxed">{t(
          'board.writeFirst',
          'Write them all first. A list of sentences is free to reorder and free to throw away, and seeing them together is when you notice two shots are the same idea.',
        )}</Note>

      <div className="space-y-2">
        {board.shots.map((shot, index) => {
          const busy = making === shot.id;
          return (
            <div
              key={shot.id}
              className="rounded-xl border border-zinc-800 bg-black/30 p-2.5 space-y-2"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-zinc-500 tabular-nums w-6">{index + 1}</span>
                {shot.makeId ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                    <Check className="w-3 h-3" />
                    {t('board.ready', 'Made')}
                  </span>
                ) : (
                  <span className="rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-500">
                    {t('board.notYet', 'Not made yet')}
                  </span>
                )}
                <span className="text-xs text-zinc-500 tabular-nums">
                  {(() => {
                    const plays = playsFor(shot, shot.makeId ? clipLengths[shot.makeId] : undefined);
                    // A whole second reads as "5s"; anything the clip or the
                    // trim decided reads with its decimal, because that is
                    // where the difference from the request lives.
                    return plays === shot.seconds ? `${shot.seconds}s` : `${plays.toFixed(1)}s`;
                  })()}
                </span>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => setBoard((was) => moved(was, shot.id, -1))}
                  disabled={index === 0}
                  aria-label={t('board.up', 'Move this shot earlier')}
                  className="w-11 h-11 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white disabled:opacity-30 flex items-center justify-center"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setBoard((was) => moved(was, shot.id, 1))}
                  disabled={index === board.shots.length - 1}
                  aria-label={t('board.down', 'Move this shot later')}
                  className="w-11 h-11 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white disabled:opacity-30 flex items-center justify-center"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setBoard((was) => withoutShot(was, shot.id))}
                  aria-label={`${t('board.remove', 'Take this shot out')} ${index + 1}`}
                  className="w-11 h-11 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-rose-300 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <label className="sr-only" htmlFor={`shot-${shot.id}`}>
                {t('board.shotWords', 'What is in this shot')}
              </label>
              <textarea
                id={`shot-${shot.id}`}
                value={shot.prompt}
                onChange={(event) =>
                  setBoard((was) => changed(was, shot.id, { prompt: event.target.value }))
                }
                rows={2}
                placeholder={t('board.hint', 'What is in the shot, what it does, what the camera does.')}
                className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none leading-relaxed"
              />

              <div className="flex items-center gap-1.5 flex-wrap">
                {lengths.map((one) => (
                  <button
                    key={one.seconds}
                    type="button"
                    onClick={() => setBoard((was) => changed(was, shot.id, { seconds: one.seconds }))}
                    aria-pressed={shot.seconds === one.seconds}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-sm border ${
                      shot.seconds === one.seconds
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {one.label}
                  </button>
                ))}
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => void shoot(shot.id)}
                  disabled={busy || making !== null}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {shot.makeId ? t('board.again', 'Make it again') : t('board.make', 'Make this shot')}
                  {' — '}
                  {videoCost(grade, shot.seconds)}
                </button>
              </div>

              {/* ── The trim ──────────────────────────────────────────────
                  Only once there is a clip, because before that there is
                  nothing to trim against and a slider over a number the engine
                  has not answered yet would be a control for a guess.

                  The cheapest edit on this desk: the first half-second is the
                  model finding the shot and the last is often it drifting off,
                  and both are paid for whatever happens. */}
              {shot.makeId && (clipLengths[shot.makeId] ?? 0) > 0 && (
                <Trim
                  shot={shot}
                  length={clipLengths[shot.makeId]}
                  onChange={(fields) => setBoard((was) => changed(was, shot.id, fields))}
                />
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={add}
        disabled={board.shots.length >= MOST_SHOTS}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-600 disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        {t('board.add', 'Add a shot')}
      </button>

      {board.shots.length > 0 && (
        <div className="space-y-3 border-t border-zinc-800 pt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor="board-song" className="text-sm text-zinc-400">
              {t('board.song', 'The song under it')}
            </label>
            <select
              id="board-song"
              value={board.songId ?? ''}
              onChange={(event) =>
                setBoard((was) => ({ ...was, songId: event.target.value || undefined }))
              }
              className="min-h-[44px] rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">{t('board.noSong', 'No song — silent')}</option>
              {tracks.map((one) => (
                <option key={one.id} value={one.id}>{one.title}</option>
              ))}
            </select>
          </div>

          {/* ── What goes around a shot that is the wrong shape ──────────

              A board is almost never all one shape. The film is cut to the
              desk's shape, so a wide shot in a tall film is drawn small with
              two black bands above and below it, and the honest bars read as
              a mistake even though nothing is wrong: the clip is whole and
              uncropped, which is exactly what was wanted.

              Filling those bands with an enlarged, blurred copy of the same
              frame is what everybody else does with this problem, and it
              works because the eye reads one picture instead of a small
              picture inside a black box. Nothing is cropped either way —
              this changes the background and only the background — so it is
              a preference and it is offered as one, with black kept as the
              default because that is what every film cut before today came
              out as. */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-zinc-400">
              {t('board.around', 'Around a shot that does not fill the frame')}
            </span>
            {(['black', 'blur'] as const).map((one) => (
              <button
                key={one}
                type="button"
                onClick={() => setBoard((was) => ({ ...was, background: one }))}
                aria-pressed={(board.background ?? 'black') === one}
                className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold ${
                  (board.background ?? 'black') === one
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {one === 'black'
                  ? t('board.bars', 'Black bars')
                  : t('board.blur', 'Blur the sides')}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {board.background === 'blur'
              ? t(
                  'board.blurNote',
                  'The space around a shot is filled with a blurred, enlarged copy of that shot. Nothing is cropped — the clip itself is drawn whole, on top.',
                )
              : t(
                  'board.barsNote',
                  'A shot that is not the film’s shape gets black bars. Nothing is cropped, and a shot already the right shape has no bars either way.',
                )}
          </p>

          <p className="text-sm text-zinc-400 tabular-nums">
            {board.shots.length} {t('board.shots', 'shots')} · {clock(total)}
            {song ? ` · ${t('board.songIs', 'the song is')} ${clock(song.seconds)}` : ''}
            {short > 0 ? ` · ${short} ${t('board.stillToMake', 'still to make')}` : ''}
          </p>

          {price > 0 && (
            <p className="text-xs text-zinc-500">
              {t('board.left', 'What is left to make costs')} {price} {t('video.credits', 'credits')}.
            </p>
          )}

          {/* Said before the press, because it is the surprising part. */}
          <Note className="text-xs text-zinc-500 leading-relaxed">{t(
              'board.realTime',
              'Cutting happens on this device and runs in real time: a film takes as long to cut as it is long. Keep this tab open while it does.',
            )}</Note>

          <button
            type="button"
            onClick={() => void cut()}
            disabled={Boolean(cutting) || short > 0 || !canStitch()}
            className="w-full min-h-[44px] py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {cutting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
            {cutting
              ? `${t('board.cutting', 'Cutting')} ${cutting.at}/${cutting.of}`
              : `${t('board.cut', 'Cut it into one film')} — ${clock(total)}`}
          </button>

          {short > 0 && (
            <p className="text-xs text-zinc-500">
              {t('board.makeAllFirst', 'Every shot needs a clip before it can be cut.')}
            </p>
          )}

          {film && (
            <div className="space-y-2">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={film.url} controls className="w-full rounded-xl border border-zinc-800 bg-black" />
              <button
                type="button"
                onClick={() => downloadBlob(film.blob, safeFilename(song?.title ?? 'film', film.ext))}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-600"
              >
                <Download className="w-4 h-4" />
                {t('board.save', 'Save the film')} · {clock(film.seconds)}
              </button>
            </div>
          )}
        </div>
      )}

      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
    </section>
  );
}

/**
 * Where a shot starts and stops inside its clip.
 *
 * ── Two numbers, not a filmstrip ─────────────────────────────────────────
 *
 * A proper trimmer draws the clip's frames along a bar and lets somebody drag
 * a handle onto the exact one. That is genuinely better and it is a great deal
 * of code — frame extraction, a scrub preview, a bar that redraws — for an
 * edit whose whole job here is taking a second off each end.
 *
 * Two sliders and a preview do that job. The preview is the part that makes
 * them usable: it plays exactly the window that will end up in the film, so
 * the handles are checked by watching rather than by arithmetic.
 *
 * ── Why the handles span the clip and not the request ────────────────────
 *
 * The engine rounds a request to a length it makes. A clip asked for at six
 * seconds and returned at ten, trimmed against six, would leave four seconds
 * nobody could reach and a film shorter than the one on screen. The length is
 * read off the file.
 */
function Trim({
  shot,
  length,
  onChange,
}: {
  readonly shot: Shot;
  readonly length: number;
  readonly onChange: (fields: Partial<Shot>) => void;
}): React.ReactElement {
  const { t } = useLang();
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement | null>(null);
  const url = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  const from = Math.min(shot.from ?? 0, length);
  const to = Math.min(shot.to ?? length, length);
  const trimmed = to > from ? to - from : length;

  useEffect(() => {
    let alive = true;
    if (!shot.makeId) return undefined;
    void makeBlob(shot.makeId).then((blob) => {
      if (!alive || !blob) return;
      url.current = URL.createObjectURL(blob);
      if (video.current) video.current.src = url.current;
      setReady(true);
    });
    return () => {
      alive = false;
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = null;
    };
  }, [shot.makeId]);

  /** Play exactly the window that will be in the film, and stop where it does. */
  const preview = useCallback(() => {
    const element = video.current;
    if (!element) return;
    element.currentTime = from;
    void element.play();
    setPlaying(true);
    const watch = () => {
      if (!video.current) return;
      if (video.current.currentTime >= to) {
        video.current.pause();
        setPlaying(false);
        return;
      }
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  }, [from, to]);

  const step = Math.max(0.1, Math.round((length / 100) * 10) / 10);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-zinc-400 inline-flex items-center gap-1.5">
          <Scissors className="w-3.5 h-3.5 text-emerald-400" />
          {t('trim.title', 'Trim it')}
        </span>
        <span className="text-xs text-zinc-500 tabular-nums">
          {trimmed.toFixed(1)}s {t('trim.of', 'of')} {length.toFixed(1)}s
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={preview}
          disabled={!ready}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5" />
          {playing ? t('trim.playing', 'Playing') : t('trim.preview', 'Play just this bit')}
        </button>
        {(shot.from !== undefined || shot.to !== undefined) && (
          <button
            type="button"
            onClick={() => onChange({ from: undefined, to: undefined })}
            className="min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-500 hover:text-white"
          >
            {t('trim.whole', 'Use all of it')}
          </button>
        )}
      </div>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={video} muted playsInline className="w-full max-h-40 rounded border border-zinc-800 bg-black" />

      <div className="space-y-1.5">
        <label className="block text-xs text-zinc-500" htmlFor={`from-${shot.id}`}>
          {t('trim.from', 'Starts at')} {from.toFixed(1)}s
        </label>
        <input
          id={`from-${shot.id}`}
          type="range"
          min={0}
          max={length}
          step={step}
          value={from}
          onChange={(event) => {
            const next = Number(event.target.value);
            // The handles cannot cross. Pushing the start past the end drags
            // the end with it rather than producing a window of nothing.
            onChange({ from: next, to: Math.max(next + step, to) });
          }}
          className="w-full accent-emerald-500"
        />
        <label className="block text-xs text-zinc-500" htmlFor={`to-${shot.id}`}>
          {t('trim.to', 'Ends at')} {to.toFixed(1)}s
        </label>
        <input
          id={`to-${shot.id}`}
          type="range"
          min={0}
          max={length}
          step={step}
          value={to}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange({ to: next, from: Math.min(next - step, from) });
          }}
          className="w-full accent-emerald-500"
        />
      </div>
    </div>
  );
}
