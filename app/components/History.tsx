'use client';

/**
 * What you made here before.
 *
 * One component, dropped into the foot of every room that produces something,
 * for the same reason `Cost` is one component: a history phrased four ways on
 * four screens reads as four different systems.
 *
 * ── What it is for ───────────────────────────────────────────────────────
 *
 * Three things, in the order people need them. Getting back to something you
 * did not download. Comparing this attempt against the last one, which is the
 * only way to tell whether a change helped. And seeing that the previous three
 * worked, which is the cheapest reassurance a paid button can offer.
 *
 * ── The star ─────────────────────────────────────────────────────────────
 *
 * It means "keep this", not "I liked this". The list is capped so it cannot
 * fill a browser's storage, and a favourite is what eviction never takes. The
 * label says so, because a star that quietly does something load-bearing is
 * worse than no star.
 *
 * ── Closed by default ────────────────────────────────────────────────────
 *
 * The room is for the thing being made now. Yesterday's work at full size, at
 * the bottom of every screen, is a page that gets longer every time you use it
 * — so it is a line that says how many, and opens when asked.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Star, ChevronDown, Download, Pause, Play, Trash2, RotateCcw, Clock } from 'lucide-react';
import { downloadBlob, safeFilename } from '../lib/library';
import { favouriteMake, forgetMake, loadMakes, makeBlob, type Make } from '../lib/makes';
import type { SurfaceId } from '../lib/surfaces';
import { useLang } from '../lib/i18n';
import Note from './Note';
import ShareRow from './ShareRow';

export default function History({
  surface,
  /** Bumped by the room when it makes something, so the list refreshes. */
  reloadKey = 0,
  /** Put a previous one back on the desk. Rooms that can, offer it. */
  onUseAgain,
  only,
  title,
  startOpen = false,
  whenEmpty,
}: {
  /**
   * Which room's work to show. Left out, it is every room's.
   *
   * The channel needs that: a video made at the desk is kept under `canvas`,
   * one cut from a song under `make`, and somebody looking for "my video" is
   * not thinking about which room it came out of. "Ek het nou net 'n video
   * gegenerate ... en nou kry ek dit nie in my channel nie."
   */
  surface?: SurfaceId;
  reloadKey?: number;
  onUseAgain?: (make: Make) => void;
  /**
   * Only these kinds of thing.
   *
   * A list rather than one, because "a video" is not one kind here: the video
   * desk keeps `video` and the hooks desk keeps `clip`, and both of them are a
   * video to the person who made them. A single-kind filter would have shown
   * her half of what she was looking for and looked like it worked.
   */
  only?: readonly Make['kind'][];
  /** A heading of its own, where "Made here before" would be wrong. */
  title?: string;
  /** Open on arrival, for a list that is the point of the card rather than
   *  yesterday's work at the bottom of a room. */
  startOpen?: boolean;
  /**
   * What to say when there is nothing yet.
   *
   * Left out, an empty list draws nothing — right at the foot of a room.
   * Given, it is a sentence, which is what a card whose whole subject is the
   * list needs instead of a heading over a gap.
   */
  whenEmpty?: string;
}): React.ReactElement | null {
  const { t } = useLang();
  const [makes, setMakes] = useState<Make[]>([]);
  const [open, setOpen] = useState(startOpen);
  const [onlyKept, setOnlyKept] = useState(false);
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null);

  /* One filter, used by the first load and by starring, because two copies of
     it drift: the star used to re-filter by `surface` on its own, which with
     no surface given would have emptied the list on the first press. */
  const mine = useCallback(
    (all: Make[]) =>
      all.filter(
        (one) =>
          (surface === undefined || one.surface === surface) &&
          (only === undefined || only.includes(one.kind)),
      ),
    [surface, only],
  );
  const refresh = useCallback(
    () => setMakes(mine(surface === undefined ? loadMakes() : loadMakes(surface))),
    [mine, surface],
  );
  useEffect(refresh, [refresh, reloadKey]);

  // An object URL held open is a file the browser cannot release. One at a
  // time, and revoked when it is replaced or the room closes.
  useEffect(() => () => {
    if (playing) URL.revokeObjectURL(playing.url);
  }, [playing]);

  if (makes.length === 0) {
    /* Nothing at all, said rather than drawn as a blank.
 
       At the foot of a room this returned null, which is right: yesterday's
       work has no business taking up space before there is any. On the
       channel it is the point of the card, and a card with a heading and
       nothing under it reads as a thing that is broken — "ek het weer die
       video probeer skuif na my channel toe maar dit het nie geskuif nie". */
    return whenEmpty ? <p className="text-sm text-zinc-500 leading-snug">{whenEmpty}</p> : null;
  }

  const shown = onlyKept ? makes.filter((one) => one.favourite) : makes;
  const kept = makes.filter((one) => one.favourite).length;

  const play = async (make: Make) => {
    if (playing?.id === make.id) {
      URL.revokeObjectURL(playing.url);
      setPlaying(null);
      return;
    }
    const blob = await makeBlob(make.id);
    if (!blob) return;
    if (playing) URL.revokeObjectURL(playing.url);
    setPlaying({ id: make.id, url: URL.createObjectURL(blob) });
  };

  const save = async (make: Make) => {
    const blob = await makeBlob(make.id);
    if (blob) downloadBlob(blob, safeFilename(make.title, make.ext ?? 'bin'));
  };

  return (
    <section className="border-t border-zinc-800 pt-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* A button that looks like one.

            "Die button, made here before is amper onsienbaar want dit lyk nie
             soos 'n button." It was a row of text with an icon in front of
            it — the same weight as the paragraph above it and the same colour
            as the label beside it, so the one thing on the screen that opens
            her past work read as a caption. Every button in this app gets a
            box; this one did not, and it is the one that hides everything she
            has made.

            The chevron turns, so open and shut are visible before it is
            pressed rather than only after. */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:border-emerald-500 hover:text-white"
        >
          <Clock className="w-4 h-4 text-emerald-400" />
          {title ?? t('history.title', 'Made here before')}
          <span className="font-normal text-zinc-400">({makes.length})</span>
          <ChevronDown
            className={`h-4 w-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open && kept > 0 && (
          <button
            type="button"
            onClick={() => setOnlyKept(!onlyKept)}
            aria-pressed={onlyKept}
            className={`text-xs font-semibold rounded-lg px-2.5 py-1 border transition-colors ${
              onlyKept
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {t('history.onlyKept', 'Only the kept ones')} ({kept})
          </button>
        )}
      </div>

      {open && (
        <>
          <Note className="text-xs text-zinc-500 leading-relaxed">{t(
              'history.note',
              'Kept on this device, and the newest two dozen per room. A star means keep it — starred ones are never the ones dropped to make space.',
            )}</Note>

          <ul className="space-y-2">
            {shown.map((make) => (
              <li key={make.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-200 truncate">{make.title}</p>
                    {make.note && (
                      <p className="text-xs text-zinc-500 leading-snug line-clamp-2">{make.note}</p>
                    )}
                    <p className="text-xs text-zinc-500 pt-0.5">
                      {new Date(make.createdAt).toLocaleString()}
                      {typeof make.seconds === 'number' && ` · ${make.seconds}s`}
                      {typeof make.credits === 'number' &&
                        ` · ${make.credits} ${t('video.credits', 'credits')}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setMakes(mine(favouriteMake(make.id, !make.favourite)))}
                      aria-pressed={Boolean(make.favourite)}
                      aria-label={
                        make.favourite
                          ? t('history.unkeep', 'Stop keeping this')
                          : t('history.keep', 'Keep this one')
                      }
                      className={make.favourite ? 'text-emerald-400 p-1' : 'text-zinc-500 hover:text-white p-1'}
                    >
                      <Star className="w-4 h-4" fill={make.favourite ? 'currentColor' : 'none'} />
                    </button>
                    {onUseAgain && (
                      <button
                        type="button"
                        onClick={() => onUseAgain(make)}
                        aria-label={t('history.useAgain', 'Put it back on the desk')}
                        className="text-zinc-500 hover:text-white p-1"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    {make.kind !== 'text' && (
                      <button
                        type="button"
                        onClick={() => void save(make)}
                        aria-label={t('history.save', 'Download')}
                        className="text-zinc-500 hover:text-white p-1"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void forgetMake(make.id).then(refresh)}
                      aria-label={t('history.forget', 'Delete')}
                      className="text-zinc-500 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {make.kind === 'text' && make.text && (
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{make.text}</p>
                )}

                {make.kind !== 'text' && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void play(make)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-white"
                      >
                        {playing?.id === make.id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        {playing?.id === make.id
                          ? t('history.close', 'Close it')
                          : t('history.open', 'Open it')}
                      </button>

                      {/* ── Somewhere to post it ─────────────────────────────

                          "dit het glad nie meer 'n share button daarop om dit
                           moontlik na social media toe te skuif nie."

                          A clip could be downloaded and nothing else. The
                          share sheet has existed for songs since the channel
                          did, and a video is the thing most likely to be
                          posted — so it is on every one of these now. It
                          takes no track, which means no "Post to Live" and no
                          "Save the song": the caption, and the composers. */}
                      <ShareRow
                        title={make.title}
                        what={make.note || t('history.madeHere', 'Made on FutureBox.')}
                      />
                    </div>
                    {playing?.id === make.id &&
                      (make.kind === 'audio' ? (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <audio src={playing.url} controls className="w-full" />
                      ) : (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <video src={playing.url} controls playsInline className="w-full rounded-lg" />
                      ))}
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
