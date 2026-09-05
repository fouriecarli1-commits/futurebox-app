'use client';

/**
 * The same episode, in another language, in the same voice.
 *
 * Not a translation feature. A dub keeps the host's own voice and re-performs
 * what they said, so an Afrikaans episode reaches an English audience sounding
 * like the person who made it — and the other way round, which for this app is
 * the point. There is no version of doing that by hand.
 *
 * ## Three things this screen is careful about
 *
 * **It takes minutes, and it says so.** ElevenLabs answer with their own
 * estimate for the job, and it is shown. A spinner with no end in sight on a
 * job that genuinely takes five minutes is how somebody decides it is broken
 * and starts it again, twice, at full price each time.
 *
 * **It survives a reload.** The job runs on their side, so closing this screen
 * does not stop it — but forgetting the id would strand it, paid for and
 * uncollectable. The id is kept on the device against the episode, so coming
 * back picks the poll up where it left off.
 *
 * **It names the languages, and does not pretend to be sure of them.** This
 * used to be two buttons and a box wanting a three-letter code, on the
 * argument that a list some of whose entries quietly fail is worse than no
 * list. The argument was right about the failure and wrong about the box:
 * nearly nobody knows that Dutch is `nl` or that Chinese is `zh`, so a screen
 * that only works if you already know the answer looked like a screen that
 * only did English and Afrikaans.
 *
 * So the bar names them — see `app/data/dublanguages.ts`, which says what that
 * list is and is not — the code box stays for anything missing from it, and
 * the screen still says what happens when one is refused: the dub fails and
 * the credits come back, because that path is real and tested.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Globe, Loader2, Languages, X } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { dubCost } from '../lib/credits';
import { DUB_LANGUAGES } from '../data/dublanguages';
import Cost from './Cost';
import Note from './Note';
import { useLang } from '../lib/i18n';
import { refusalText } from '../lib/apierror';

/** How often to ask. A dub is minutes, so a second would be rude to both ends. */
const EVERY = 6000;
/** Where an in-flight job is remembered, so a reload does not strand it. */
const remembered = (episodeId: string) => `futurebox.dub.${episodeId}`;

interface Progress {
  status: string;
  done: boolean;
  failed: boolean;
  error: string | null;
  language: string | null;
}

export default function DubEpisode({
  episodeId,
  title,
  seconds,
  audioUrl,
  onDubbed,
  onClose,
}: {
  episodeId: string;
  title: string;
  seconds: number;
  /** The published episode, which is public — this is how it is fetched back. */
  audioUrl: string;
  /** The finished dub, handed up so it can be published as its own episode. */
  onDubbed: (audio: Blob, language: string) => void;
  onClose: () => void;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [to, setTo] = useState('en');
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<string | null>(null);
  const [expected, setExpected] = useState(0);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [problem, setProblem] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cost = dubCost(seconds);

  /** Pick the job back up after a reload. The job never stopped. */
  useEffect(() => {
    try {
      const found = window.localStorage.getItem(remembered(episodeId));
      if (found) setJob(found);
    } catch {
      // A browser with storage switched off. The dub still runs; this screen
      // just cannot rejoin it, which is worth nothing said rather than a crash.
    }
  }, [episodeId]);

  const collect = useCallback(async (id: string, language: string) => {
    const token = await accessToken();
    const response = await fetch(`/api/dub?id=${encodeURIComponent(id)}&collect=1`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const said = (await response.json().catch(() => null)) as { message?: string } | null;
      setProblem(refusalText(said, lang, t('dub.noCollect', 'The dub finished but could not be fetched.')));
      return;
    }
    try {
      window.localStorage.removeItem(remembered(episodeId));
    } catch {
      // Nothing to clean up if it was never written.
    }
    onDubbed(await response.blob(), language);
  }, [episodeId, onDubbed, t]);

  /** Ask where it has got to, and keep asking until it is somewhere final. */
  useEffect(() => {
    if (!job) return;
    let live = true;

    const ask = async () => {
      try {
        const token = await accessToken();
        const response = await fetch(`/api/dub?id=${encodeURIComponent(job)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!live) return;
        if (!response.ok) {
          const said = (await response.json().catch(() => null)) as { message?: string } | null;
          setProblem(refusalText(said, lang, t('dub.lost', 'That dub could not be found any more.')));
          return;
        }
        const next = (await response.json()) as Progress;
        setProgress(next);
        if (next.failed) {
          // The route gives the credits back when a poll first sees this, so
          // it is safe to say so — and saying so is the difference between a
          // failure somebody accepts and one they write in about.
          try {
            window.localStorage.removeItem(remembered(episodeId));
          } catch {
            // Nothing to clean up.
          }
          return;
        }
        if (next.done) {
          await collect(job, next.language ?? to);
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
  }, [job, collect, episodeId, t, to]);

  const start = async () => {
    setProblem('');
    setBusy(true);
    try {
      const source = await fetch(audioUrl);
      if (!source.ok) {
        setProblem(t('dub.noAudio', 'The episode’s audio could not be read back.'));
        return;
      }
      const body = new FormData();
      body.append('file', await source.blob(), 'episode.mp3');
      body.append('to', to.trim().toLowerCase());
      body.append('seconds', String(seconds));
      body.append('title', title);
      // Zero is their own convention for "work out how many people are talking".
      body.append('speakers', '0');

      const token = await accessToken();
      const response = await fetch('/api/dub', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const said = (await response.json().catch(() => null)) as
        | { id?: string; expected?: number; message?: string }
        | null;
      if (!response.ok || !said?.id) {
        setProblem(refusalText(said, lang, t('dub.failed', 'The dub could not be started.')));
        return;
      }
      setExpected(Number(said.expected) || 0);
      try {
        window.localStorage.setItem(remembered(episodeId), said.id);
      } catch {
        // Storage off: the poll below still works for as long as this stays open.
      }
      setJob(said.id);
    } catch {
      setProblem(t('dub.offline', 'Could not reach the app’s server. The dub is still running.'));
    } finally {
      setBusy(false);
    }
  };

  const running = job !== null && !progress?.failed;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-white flex items-center gap-1.5 min-w-0">
          <Languages className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="truncate">{t('dub.title', 'Say it in another language')}</span>
        </p>
        <button type="button" onClick={onClose} className="text-zinc-500 hover:text-white flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!running && (
        <>
          <Note>{t('dub.note')}</Note>

          {/* The bar.

              Scrolls in its own box rather than growing the panel: thirty
              names stacked would push the price and the button off the screen
              on a phone, and the button is the thing somebody came here to
              press. The app's own two sit at the front, so the common case is
              never a scroll. */}
          <div
            role="radiogroup"
            aria-label={t('dub.into', 'Into which language')}
            className="max-h-32 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-2"
          >
            <div className="flex flex-wrap gap-1.5">
              {DUB_LANGUAGES.map((one) => {
                const chosen = to.trim().toLowerCase() === one.code;
                return (
                  <button
                    key={one.code}
                    type="button"
                    role="radio"
                    aria-checked={chosen}
                    onClick={() => setTo(one.code)}
                    // The name in its own language underneath, because a
                    // speaker of it recognises that faster than the English.
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

          {/* And anything the list has missed, by its code, because the list
              is a reading of theirs rather than a copy of it. */}
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            {t('dub.other', 'Not listed? Its two-letter code:')}
            <input
              value={to}
              onChange={(event) => setTo(event.target.value.slice(0, 3))}
              aria-label={t('dub.code', 'Language code')}
              className="w-20 bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </label>

          <Note>{t('dub.ifRefused')}</Note>

          {/* The wait was only said once the job was running, which is the one
              moment it does not help: by then the credits are spent. */}
          <Cost waitMinutes={5} />

          <button
            type="button"
            onClick={() => void start()}
            disabled={busy || !/^[a-z]{2,3}$/.test(to.trim().toLowerCase())}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {t('dub.start', 'Dub it')} — {cost} {t('credits.credits', 'credits')}
          </button>
        </>
      )}

      {running && (
        <div className="space-y-1.5">
          <p className="text-sm text-emerald-300 font-semibold flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t('dub.working', 'Dubbing it…')}
          </p>
          <p className="text-sm text-zinc-500 leading-snug">
            {expected > 0
              ? `${t('dub.expect', 'They expect about')} ${Math.max(1, Math.round(expected / 60))} ${t('dub.minutes', 'minutes')}. `
              : ''}
            {t('dub.leave', 'You can close this and come back — it keeps going on their side.')}
          </p>
        </div>
      )}

      {progress?.failed && (
        <p className="text-sm text-amber-400 leading-snug">
          {progress.error || t('dub.itFailed', 'The dub failed.')}{' '}
          {t('dub.refunded', 'The credits for it have been put back.')}
        </p>
      )}

      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
    </div>
  );
}
