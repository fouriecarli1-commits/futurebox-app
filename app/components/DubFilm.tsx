'use client';

/**
 * The same film, speaking another language.
 *
 * ── Why this is the language button ──────────────────────────────────────
 *
 * The desk had no way to choose a language and it looked like an oversight.
 * It is not quite: nothing else on this desk takes a language. The engines
 * are English-first and do not take a language code at all, so a picker wired
 * to a generation would be a control that changed nothing — and the words on
 * screen are typed, so they are already in whatever language they were typed
 * in.
 *
 * The one place a language is a real parameter is a dub, and a dub of a film
 * is the thing somebody actually wants: the same shots, the same timing, the
 * voice on it re-performed in another language. That is this panel.
 *
 * ── What it will not offer ───────────────────────────────────────────────
 *
 * Itself, on a film with nothing spoken on it. Dubbing re-performs speech; a
 * silent clip has none, and a music video has a song, which is not speech and
 * would come back mangled. Both would be paid for. So the button appears where
 * there is a voice and the room says why when there is not, rather than taking
 * the money and returning something wrong.
 *
 * ── The job outlives this panel ──────────────────────────────────────────
 *
 * A dub is charged the moment it is accepted and takes minutes, so the id is
 * written down before anything else can happen. Closing the room does not stop
 * it and coming back picks the poll up. All of that is in `lib/dubjob.ts`, the
 * same wire the podcast room uses.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Download, Languages, Loader2, X } from 'lucide-react';
import { dubCost } from '../lib/credits';
import { DUB_LANGUAGES } from '../data/dublanguages';
import { EVERY, askDub, collectDub, forget, recall, remember, startDub, type Progress } from '../lib/dubjob';
import { downloadBlob } from '../lib/library';
import { refusalText } from '../lib/apierror';
import { useLang } from '../lib/i18n';
import Cost from './Cost';
import Note from './Note';

export default function DubFilm({
  film,
  filmId,
  title,
  seconds,
  onClose,
}: {
  /** The finished film, as it is on this device. */
  readonly film: Blob;
  /** A stable name for this film, so a reload rejoins its own job. */
  readonly filmId: string;
  readonly title: string;
  readonly seconds: number;
  readonly onClose: () => void;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [to, setTo] = useState('en');
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<string | null>(null);
  const [expected, setExpected] = useState(0);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState<{ file: Blob; url: string; language: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cost = dubCost(seconds);

  /** Pick a job back up after a reload. It never stopped. */
  useEffect(() => {
    const found = recall(filmId);
    if (found) setJob(found);
  }, [filmId]);

  useEffect(() => () => { if (done) URL.revokeObjectURL(done.url); }, [done]);

  const collect = useCallback(async (id: string, language: string) => {
    const got = await collectDub(id);
    if (!got.ok) {
      setProblem(refusalText(got.said, lang, t('dub.noCollect', 'The dub finished but could not be fetched.')));
      return;
    }
    forget(filmId);
    setDone({ file: got.file, url: URL.createObjectURL(got.file), language });
  }, [filmId, lang, t]);

  useEffect(() => {
    if (!job || done) return;
    let live = true;

    const ask = async () => {
      try {
        const asked = await askDub(job);
        if (!live) return;
        if (!asked.ok) {
          setProblem(refusalText(asked.said, lang, t('dub.lost', 'That dub could not be found any more.')));
          return;
        }
        setProgress(asked.progress);
        if (asked.progress.failed) {
          forget(filmId);
          return;
        }
        if (asked.progress.done) {
          await collect(job, asked.progress.language ?? to);
          return;
        }
        timer.current = setTimeout(() => void ask(), EVERY);
      } catch {
        if (live) setProblem(t('dub.offline', 'Could not reach the app’s server. The dub is still running.'));
      }
    };

    void ask();
    return () => {
      live = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [job, done, collect, filmId, lang, t, to]);

  const start = async () => {
    setProblem('');
    setBusy(true);
    try {
      /* Sent under its real extension. The dub comes back in the shape it went
         in as, and a film posted as an mp3 would be refused before it started. */
      const ext = film.type.includes('mp4') ? 'mp4' : 'webm';
      const began = await startDub(film, `film.${ext}`, to, seconds, title);
      if (!began.ok) {
        setProblem(refusalText(began.said, lang, t('dub.failed', 'The dub could not be started.')));
        return;
      }
      setExpected(began.expected);
      remember(filmId, began.id);
      setJob(began.id);
    } catch {
      setProblem(t('dub.offline', 'Could not reach the app’s server. The dub is still running.'));
    } finally {
      setBusy(false);
    }
  };

  const running = job !== null && !progress?.failed && !done;
  const named = DUB_LANGUAGES.find((one) => one.code === (done?.language ?? to));

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-white flex items-center gap-1.5 min-w-0">
          <Languages className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="truncate">{t('dubfilm.title', 'Put this film in another language')}</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('dubfilm.close', 'Close the language panel')}
          className="text-zinc-500 hover:text-white flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!running && !done && (
        <>
          <Note>
            {t(
              'dubfilm.note',
              'The picture stays exactly as it is. Whoever speaks on it is re-performed in the language you pick, in a voice like theirs. A film with no speaking on it has nothing to dub.',
            )}
          </Note>

          {/* The bar scrolls in its own box rather than growing the panel, so
              thirty names cannot push the button off a phone screen. The app's
              own two sit at the front, so the common case is never a scroll. */}
          <div
            role="radiogroup"
            aria-label={t('dub.into', 'Into which language')}
            className="max-h-32 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-2"
          >
            <div className="flex flex-wrap gap-1.5">
              {DUB_LANGUAGES.map((one) => {
                const chosen = to === one.code;
                return (
                  <button
                    key={one.code}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    onClick={() => setTo(one.code)}
                    className={`px-2.5 py-1.5 rounded-xl text-sm font-semibold border text-left leading-tight ${
                      chosen
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    {t(`dub.lang.${one.code}`, one.name)}
                    {one.own !== one.name && (
                      <span className="block text-xs font-normal text-zinc-500">{one.own}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void start()}
              disabled={busy}
              className="min-h-[44px] rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-onAccent flex items-center gap-2 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
              {t('dub.start', 'Dub it')}
            </button>
            <Cost credits={cost} waitMinutes={Math.max(2, Math.round(seconds / 20))} />
          </div>
          <Note className="text-xs text-zinc-500">{t('dub.ifRefused')}</Note>
        </>
      )}

      {running && (
        <div className="space-y-1.5">
          <p className="text-sm text-zinc-300 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            {t('dub.working', 'Dubbing it…')}
            {named ? ` — ${t(`dub.lang.${named.code}`, named.name)}` : ''}
          </p>
          {expected > 0 && (
            <p className="text-xs text-zinc-500">
              {t('dub.expect', 'They expect about')} {Math.max(1, Math.round(expected / 60))}{' '}
              {t('dub.minutes', 'minutes')}
            </p>
          )}
          <Note className="text-xs text-zinc-500">{t('dub.leave')}</Note>
        </div>
      )}

      {progress?.failed && (
        <p className="text-sm text-amber-400 leading-snug">
          {t('dub.itFailed', 'The dub failed.')} {t('dub.refunded', 'The credits for it have been put back.')}
          {progress.error ? ` ${progress.error}` : ''}
        </p>
      )}

      {done && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            {t('dubfilm.done', 'Done')}
            {named ? ` — ${t(`dub.lang.${named.code}`, named.name)}` : ''}
          </p>
          {/* Whatever came back, played as what it is. A dub of a film is a
              film; the blob's own type is the only honest thing to read that
              off, because the route passes the upstream's through. */}
          {done.file.type.startsWith('video/') ? (
            <video src={done.url} controls playsInline className="w-full rounded-xl border border-zinc-800" />
          ) : (
            <audio src={done.url} controls className="w-full" />
          )}
          <button
            type="button"
            onClick={() =>
              downloadBlob(
                done.file,
                `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'film'}-${done.language}.${
                  done.file.type.includes('mp4') ? 'mp4' : done.file.type.startsWith('video/') ? 'webm' : 'mp3'
                }`,
              )
            }
            className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t('dubfilm.save', 'Save it')}
          </button>
        </div>
      )}

      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
    </div>
  );
}
