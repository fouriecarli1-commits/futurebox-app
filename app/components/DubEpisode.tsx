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
 * **It does not claim a list of languages.** Which ones ElevenLabs will dub
 * into is not something this app can know without asking them, and a dropdown
 * of thirty names, some of which quietly fail, is worse than a box. So the two
 * this app itself speaks are offered as buttons, any ISO code can be typed,
 * and the screen says what happens if they refuse one — which is that the dub
 * fails and the credits come back, because that path is real and tested.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Globe, Loader2, Languages, X } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { dubCost } from '../lib/credits';
import Cost from './Cost';
import { useLang } from '../lib/i18n';

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
  const { t } = useLang();
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
      setProblem(said?.message ?? t('dub.noCollect', 'The dub finished but could not be fetched.'));
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
          setProblem(said?.message ?? t('dub.lost', 'That dub could not be found any more.'));
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
        setProblem(said?.message ?? t('dub.failed', 'The dub could not be started.'));
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
          <p className="text-sm text-zinc-500 leading-snug">{t('dub.note')}</p>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* The two this app itself speaks, as buttons. */}
            {(['en', 'af'] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setTo(code)}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${
                  to === code
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {code === 'en' ? t('dub.english', 'English') : t('dub.afrikaans', 'Afrikaans')}
              </button>
            ))}
            {/* And anything else, by its code, because the list is theirs. */}
            <input
              value={to}
              onChange={(event) => setTo(event.target.value.slice(0, 3))}
              aria-label={t('dub.code', 'Language code')}
              className="w-20 bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <p className="text-sm text-zinc-500 leading-snug">{t('dub.ifRefused')}</p>

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
