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
  ArrowDown, ArrowUp, Clapperboard, Check, Download, Film, Loader2, Plus, Sparkles, Trash2,
} from 'lucide-react';
import { engines, type EngineAspect } from '../lib/engines';
import { videoCost, type VideoGrade } from '../lib/credits';
import { downloadBlob, loadTracks, safeFilename, type Track } from '../lib/library';
import { makeId, rememberMake } from '../lib/makes';
import { readAudio } from '../lib/trackaudio';
import { canStitch, stitch } from '../lib/stitch';
import {
  EMPTY, MOST_SHOTS, changed, clipsFor, loadStoryboard, missing, moved, runtime,
  saveStoryboard, shotId, withShot, withoutShot, type Storyboard as Board,
} from '../lib/storyboard';
import { useLang } from '../lib/i18n';

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
  const loaded = useRef(false);

  useEffect(() => {
    setBoard(loadStoryboard());
    setTracks(loadTracks());
    loaded.current = true;
  }, []);

  // Saved on every change, not on a button. Somebody arranging shots is not
  // thinking about saving, and there is nothing here worth losing to a reload.
  useEffect(() => {
    if (loaded.current) saveStoryboard(board);
  }, [board]);

  useEffect(() => () => { if (film) URL.revokeObjectURL(film.url); }, [film]);

  const shortest = lengths[0]?.seconds ?? 5;
  const total = runtime(board);
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
      const scenes = clips
        .map((clip, index) => ({ clip, name: `${index + 1}` }))
        .filter((one): one is { clip: Blob; name: string } => Boolean(one.clip));
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
          <p className="text-sm text-zinc-500 leading-relaxed">
            {t(
              'board.what',
              'No engine makes more than half a minute in one go, so a long video is short ones cut together. Write the shots, make them one at a time, and cut them into one file with a song under it.',
            )}
          </p>
        </div>
      </div>

      {/* Written before anything is generated, on purpose — see the note at
          the top of this file. */}
      <p className="text-xs text-zinc-500 leading-relaxed">
        {t(
          'board.writeFirst',
          'Write them all first. A list of sentences is free to reorder and free to throw away, and seeing them together is when you notice two shots are the same idea.',
        )}
      </p>

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
                <span className="text-xs text-zinc-500 tabular-nums">{shot.seconds}s</span>
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
          <p className="text-xs text-zinc-500 leading-relaxed">
            {t(
              'board.realTime',
              'Cutting happens on this device and runs in real time: a film takes as long to cut as it is long. Keep this tab open while it does.',
            )}
          </p>

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
