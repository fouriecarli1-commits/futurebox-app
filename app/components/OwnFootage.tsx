'use client';

/**
 * Her own filming, on the same board as the generated shots.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 23 September 2026: *"Sou ons ook 'n funksie vir video generation
 * kon bou vir mense wat 'n bemarking wil bou met hulle eie video en images?
 * Ek het byvoorbeeld nou 'n bemarking wat ek moet bou vir 'n funksie, ek wil
 * sniplets uit my videos gebruik vir bemarking."*
 *
 * A real brief, from the person who has to do the work this week: hours of
 * footage of a function, and an advert that has to come out of it.
 *
 * ── Why this is thirty lines of wiring and not a new engine ──────────────
 *
 * Everything under the board was already indifferent to where a clip came
 * from. A shot points at bytes with `makeId`; `makeBlob` fetches them;
 * `lib/stitch.ts` takes any `Blob`; the trim handles read the file's real
 * length; the per-piece download reads the same blob. Nothing in any of it
 * asks who made the video.
 *
 * So the only thing missing was a way to put her own bytes where a
 * generation's bytes go. That is this.
 *
 * ── One upload, many pieces ──────────────────────────────────────────────
 *
 * The file is stored ONCE and every piece points at it with its own `from`
 * and `to`. Cutting each piece into its own file would mean re-encoding in
 * real time — a two-minute piece takes two minutes — and doing it six times
 * to get six shots out of one recording, before she has even seen whether
 * the cut works. The trim is a seek; the encode happens once, when the film
 * is cut, which is the one place it cannot be avoided.
 *
 * ── How the pieces are found ─────────────────────────────────────────────
 *
 * By the recording's own sound, with `findHooks` — the same finder the hooks
 * room already uses on a song and on a video. In a room full of people that
 * is a good proxy for where something happened: the applause, the laugh, the
 * speech starting. It is an opinion and it says so; the whole recording is
 * always one press away, and the handles move.
 *
 * A recording whose sound this browser cannot decode still works. The
 * moments cannot be guessed without audio, so it offers the whole thing and
 * says why, rather than refusing a file that is perfectly usable.
 *
 * ── On this device ───────────────────────────────────────────────────────
 *
 * Said on the strip, for the same reason `Pictures.tsx` says it: there is no
 * account behind this, and finding it out on a second phone is the wrong way
 * to learn it.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clapperboard, Loader2, Plus, Trash2 } from 'lucide-react';
import { findHooks, formatMoment, type Hook } from '../lib/hooks';
import { soundOf } from '../lib/videoclip';
import { forgetMake, loadMakes, makeBlob, makeId, rememberMake, type Make } from '../lib/makes';
import { shotId, type Shot } from '../lib/storyboard';
import { useLang } from '../lib/i18n';
import Note from './Note';

/**
 * How many pieces are offered from one recording.
 *
 * Six rather than three: a function is long, and the point of this is to not
 * have to scrub through an hour by hand. More than six is a list nobody
 * reads, and the handles are there for anything the finder missed.
 */
const OFFERED = 6;

/** Past this something has gone wrong with the upload, not with the film. */
const MAX_BYTES = 500 * 1024 * 1024;

/** What a browser will reliably decode and play back onto a canvas. */
const TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];

/** Her own recordings, told apart from the clips the engine made. */
const MINE = 'own footage';

export function ownFootage(): Make[] {
  return loadMakes('canvas').filter((one) => one.kind === 'clip' && one.note === MINE);
}

export default function OwnFootage({
  seconds,
  onAdd,
}: {
  /** The length a piece is offered at, from the board's own length control. */
  readonly seconds: number;
  /** One piece, as a shot for the board. */
  readonly onAdd: (shot: Shot) => void;
}): React.ReactElement {
  const { t } = useLang();
  const [mine, setMine] = useState<Make[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  /** The recording being looked through, and what the finder offered in it. */
  const [open, setOpen] = useState<{ make: Make; url: string; moments: Hook[]; silent: boolean } | null>(null);
  const file = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMine(ownFootage());
  }, []);

  /* The preview's object URL is revoked when the recording is closed or
     swapped. A room that makes one of these per press and never lets go is
     how a long session ends up holding a browser's worth of video. */
  useEffect(() => () => {
    if (open) URL.revokeObjectURL(open.url);
  }, [open]);

  const look = useCallback(async (make: Make): Promise<void> => {
    setProblem('');
    setBusy(true);
    try {
      const blob = await makeBlob(make.id);
      if (!blob) {
        setProblem(t('own.gone', 'That recording is not on this device any more.'));
        return;
      }
      const sound = await soundOf(blob);
      /* The finder needs a window it can fit. A ten-second recording with
         the board set to fifteen has no window at all, and answering that
         with an empty list would be a room that did nothing and said
         nothing — the same silence `Hooks.tsx` had to be fixed for. */
      const whole = make.seconds ?? 0;
      const room = Math.max(1, Math.floor(whole) - 1);
      const fits = Math.min(seconds, room);
      const found = sound ? findHooks(sound, fits, OFFERED) : [];
      setOpen({
        make,
        url: URL.createObjectURL(blob),
        moments: found,
        silent: !sound,
      });
    } finally {
      setBusy(false);
    }
  }, [seconds, t]);

  const bring = useCallback(async (picked: File | null): Promise<void> => {
    if (!picked) return;
    setProblem('');
    if (picked.size > MAX_BYTES) {
      setProblem(t('own.tooBig', 'That recording is over 500 MB. Trim it on your phone first, or bring a shorter export in.'));
      return;
    }
    if (picked.type && TYPES.indexOf(picked.type) === -1) {
      setProblem(t('own.wrongType', 'Bring in an MP4 or a WebM. That is what a browser can play back and cut.'));
      return;
    }
    setBusy(true);
    try {
      /* Its real length, read off the file rather than assumed. Everything
         downstream — the handles, the runtime, whether a window fits — is
         measured against this, and a guess here is a wrong number in four
         places. */
      const whole = await new Promise<number>((say) => {
        const probe = document.createElement('video');
        probe.preload = 'metadata';
        probe.onloadedmetadata = () => {
          const length = Number.isFinite(probe.duration) ? probe.duration : 0;
          URL.revokeObjectURL(probe.src);
          say(length);
        };
        probe.onerror = () => {
          URL.revokeObjectURL(probe.src);
          say(0);
        };
        probe.src = URL.createObjectURL(picked);
      });
      if (whole <= 0) {
        setProblem(t('own.unreadable', 'This browser could not read that recording. An MP4 usually works.'));
        return;
      }
      const id = makeId('canvas');
      const make: Make = {
        id,
        surface: 'canvas',
        kind: 'clip',
        title: picked.name.replace(/\.[a-z0-9]+$/i, ''),
        note: MINE,
        createdAt: new Date().toISOString(),
        seconds: whole,
        ext: /\.([a-z0-9]+)$/i.exec(picked.name)?.[1] ?? 'mp4',
        /* Kept, so the history's eviction cannot take a recording she still
           has shots pointing at. A shot whose bytes were quietly evicted is
           a board that looks whole and cuts to nothing. */
        favourite: true,
      };
      await rememberMake(make, picked);
      setMine(ownFootage());
      await look(make);
    } catch {
      setProblem(t('own.notKept', 'That recording could not be kept on this device. There may be no room left.'));
    } finally {
      setBusy(false);
    }
  }, [look, t]);

  /** One piece of a recording, as a shot the board can hold. */
  const put = (make: Make, from: number, length: number): void => {
    const to = Math.min(from + length, make.seconds ?? from + length);
    onAdd({
      id: shotId(),
      /* A label rather than an instruction. Nothing is generated from this,
         and the board says so beside it — but it is still the line she reads
         to know which shot is which, so it names the recording and the
         moment rather than saying "my clip" six times. */
      prompt: `${make.title} — ${formatMoment(from)}`,
      seconds: Math.max(1, Math.round(to - from)),
      makeId: make.id,
      mine: true,
      /* Her own recording has people in it. `Scene.sound` is off by default
         because a generated clip holds nothing but room tone; this is the
         opposite case, and it is the whole reason she is using her own
         footage. She can still put a song under the film. */
      spoke: true,
      from,
      to,
    });
  };

  const drop = async (make: Make): Promise<void> => {
    await forgetMake(make.id);
    setMine(ownFootage());
    if (open?.make.id === make.id) setOpen(null);
  };

  return (
    <div className="space-y-2" data-ownfootage>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => file.current?.click()}
          disabled={busy}
          data-bringfootage
          className="min-h-[44px] px-3 py-2 rounded-xl text-sm border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-emerald-500 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clapperboard className="w-3.5 h-3.5" />}
          {t('own.bring', 'Bring your own video in')}
        </button>
        <input
          ref={file}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => {
            void bring(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
        />
      </div>

      {/* Said before anything is pressed, because both halves change what
          somebody does next: it is free, and it is on this device. */}
      <Note>{t('own.what')}</Note>

      {mine.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mine.map((one) => (
            <div key={one.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void look(one)}
                disabled={busy}
                aria-pressed={open?.make.id === one.id}
                className={`min-h-[44px] px-3 py-1.5 rounded-xl text-sm border transition-all disabled:opacity-50 ${
                  open?.make.id === one.id
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                    : 'border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-600 hover:text-white'
                }`}
              >
                {one.title}
              </button>
              <button
                type="button"
                onClick={() => void drop(one)}
                aria-label={t('own.forget', 'Take this recording off this device')}
                className="min-h-[44px] px-2 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] text-zinc-500 hover:text-rose-300 hover:border-rose-500/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="rounded-xl border border-zinc-800 bg-black/30 p-3 space-y-2.5">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={open.url}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-64 rounded-lg bg-black"
          />

          {open.silent && (
            <Note>{t('own.noSound')}</Note>
          )}

          <div className="space-y-1.5">
            {open.moments.map((moment) => (
              <div
                key={`${moment.startSeconds}-${moment.seconds}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2"
              >
                <p className="text-sm text-zinc-300 tabular-nums">
                  {formatMoment(moment.startSeconds)}
                  <span className="text-zinc-600"> · </span>
                  {Math.round(moment.seconds)}s
                </p>
                <button
                  type="button"
                  data-usepiece
                  onClick={() => put(open.make, moment.startSeconds, moment.seconds)}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm font-semibold border border-emerald-500/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('own.use', 'Put it on the board')}
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            data-usewhole
            onClick={() => put(open.make, 0, open.make.seconds ?? seconds)}
            className="min-h-[44px] w-full py-2 rounded-xl text-sm border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-emerald-500"
          >
            {t('own.whole', 'Put the whole recording on the board')}
          </button>
          <Note>{t('own.handles')}</Note>
        </div>
      )}

      {problem && <p className="text-sm text-rose-400 leading-snug">{problem}</p>}
    </div>
  );
}
