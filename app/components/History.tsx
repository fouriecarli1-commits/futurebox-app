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
import { Star, Download, Trash2, RotateCcw, Clock } from 'lucide-react';
import { downloadBlob, safeFilename } from '../lib/library';
import { favouriteMake, forgetMake, loadMakes, makeBlob, type Make } from '../lib/makes';
import type { SurfaceId } from '../lib/surfaces';
import { useLang } from '../lib/i18n';
import Note from './Note';

export default function History({
  surface,
  /** Bumped by the room when it makes something, so the list refreshes. */
  reloadKey = 0,
  /** Put a previous one back on the desk. Rooms that can, offer it. */
  onUseAgain,
}: {
  surface: SurfaceId;
  reloadKey?: number;
  onUseAgain?: (make: Make) => void;
}): React.ReactElement | null {
  const { t } = useLang();
  const [makes, setMakes] = useState<Make[]>([]);
  const [open, setOpen] = useState(false);
  const [onlyKept, setOnlyKept] = useState(false);
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null);

  const refresh = useCallback(() => setMakes(loadMakes(surface)), [surface]);
  useEffect(refresh, [refresh, reloadKey]);

  // An object URL held open is a file the browser cannot release. One at a
  // time, and revoked when it is replaced or the room closes.
  useEffect(() => () => {
    if (playing) URL.revokeObjectURL(playing.url);
  }, [playing]);

  if (makes.length === 0) return null;

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
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white"
        >
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          {t('history.title', 'Made here before')}
          <span className="text-zinc-500 font-normal">({makes.length})</span>
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
                      onClick={() => setMakes(favouriteMake(make.id, !make.favourite).filter((one) => one.surface === surface))}
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
                    <button
                      type="button"
                      onClick={() => void play(make)}
                      className="text-sm font-semibold text-zinc-300 hover:text-white"
                    >
                      {playing?.id === make.id
                        ? t('history.close', 'Close it')
                        : t('history.open', 'Open it')}
                    </button>
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
