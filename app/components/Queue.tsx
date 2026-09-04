'use client';

/**
 * What goes out, and when.
 *
 * ── What this actually does, said on the screen ──────────────────────────
 *
 * It does not post for you. Every platform needs its own developer account,
 * its own client id and secret, and this app's address on somebody else's
 * redirect list — Google, Meta and TikTok each take days to weeks to approve
 * one, and TikTok's direct posting needs an audit that can be refused.
 *
 * What it does is the half that needs nobody's permission: it remembers what
 * you planned and tells you at the moment you chose, with the words in front
 * of you. That is not a consolation prize. A posting plan on a screen is read
 * once; the same plan arriving at six on Tuesday is the difference between a
 * plan and a document about a plan.
 *
 * The room says that plainly rather than letting somebody discover it when the
 * first slot comes round and nothing has been posted. A button that looks like
 * it publishes and does not is the one thing this must not be.
 *
 * ── The time is theirs ───────────────────────────────────────────────────
 *
 * Typed as a local date and a local time, stored as an instant, shown back in
 * whatever zone the reader's device is in. `lib/queue.ts` does the conversion
 * and `check:queue` pins it under four timezones, because appending a `Z` is
 * the mistake and it is invisible on the screen that makes it.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Loader2, X, Check, AlertTriangle } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { PLATFORMS } from '../data/social';
import {
  cancel, instantOf, loadQueue, schedule, today, NO_QUEUE, type Queue as Waiting,
} from '../lib/queue';

/** The platform's own name. The row held the id, and `tiktok` next to a date
 *  reads like a field out of a database rather than a plan. */
function named(id: string): string {
  return PLATFORMS.find((one) => one.id === id)?.name ?? id;
}

/** The instant, in the reader's own zone, in words. */
function shown(iso: string, lang: 'en' | 'af'): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return at.toLocaleString(lang === 'af' ? 'af-ZA' : 'en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Queue({
  /** Pre-filled from whatever the room just made, where there is something. */
  caption: given = '',
}: {
  readonly caption?: string;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [queue, setQueue] = useState<Waiting>(NO_QUEUE);
  const [asked, setAsked] = useState(false);

  const [platform, setPlatform] = useState(PLATFORMS[0]?.id ?? 'tiktok');
  const [caption, setCaption] = useState(given);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState('18:00');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(async () => {
    const got = await loadQueue();
    setQueue(got);
    setAsked(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    setProblem(null);
    const dueAt = instantOf(date, time);
    if (!dueAt) {
      setProblem(t('queue.badTime', 'Choose a date and a time.'));
      return;
    }
    setBusy(true);
    const done = await schedule({ platform, caption: caption.trim(), dueAt });
    setBusy(false);
    if (!done.ok) {
      setProblem(done.message);
      return;
    }
    setCaption('');
    void load();
  };

  const waiting = queue.posts.filter((one) => one.state === 'due' || one.state === 'sending');
  const gone = queue.posts.filter((one) => one.state === 'sent' || one.state === 'failed');

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-4">
      <div className="flex items-start gap-2.5">
        <CalendarClock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-base font-black text-white tracking-tight">
            {t('queue.title', 'When it goes out')}
          </h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {t(
              'queue.what',
              'Plan a post and this reminds you at the moment you chose, with the words in front of you. It does not post for you — see below for what that would take.',
            )}
          </p>
        </div>
      </div>

      {/* ── When the reminding cannot happen ───────────────────────────
          The only handler is `remind` and reminding is email. With no mail
          provider configured every row queued here is failed on its first
          attempt, so this has to be said before somebody plans a week around
          it — not discovered afterwards in the note on a failed row. */}
      {asked && queue.ready && !queue.sends && (
        <p className="text-sm text-amber-400 leading-snug rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          {t(
            'queue.noEmail',
            'Reminders cannot be sent yet — no mail service is set up for this app. Anything queued here will be kept, but nothing will reach you until that is done.',
          )}
        </p>
      )}

      {/* ── Adding one ─────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="grid sm:grid-cols-3 gap-2">
          <label className="sr-only" htmlFor="queue-platform">
            {t('queue.platform', 'Where it goes')}
          </label>
          <select
            id="queue-platform"
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            className="min-h-[44px] bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          >
            {PLATFORMS.map((one) => (
              <option key={one.id} value={one.id}>
                {one.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="queue-date">
            {t('queue.date', 'Which day')}
          </label>
          <input
            id="queue-date"
            type="date"
            value={date}
            min={today()}
            onChange={(event) => setDate(event.target.value)}
            className="min-h-[44px] bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
          <label className="sr-only" htmlFor="queue-time">
            {t('queue.time', 'What time')}
          </label>
          <input
            id="queue-time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="min-h-[44px] bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <textarea
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          rows={2}
          placeholder={t('queue.caption', 'The words that go with it')}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none resize-y"
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={busy}
          className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('queue.add', 'Put it in the queue')}
        </button>
        {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
      </div>

      {/* ── What is waiting ────────────────────────────────────────────── */}
      {!asked ? null : !queue.ready ? (
        <p className="text-sm text-zinc-500 leading-snug border-t border-zinc-800 pt-3">
          {t(
            'queue.off',
            'The queue is not switched on for this app yet. Nothing here is broken — it is waiting on a service rather than on you.',
          )}
        </p>
      ) : (
        <div className="border-t border-zinc-800 pt-3 space-y-2">
          <p className="text-sm font-semibold text-zinc-300">
            {t('queue.waiting', 'Waiting')} · {waiting.length}
          </p>
          {waiting.length === 0 ? (
            <p className="text-sm text-zinc-500">{t('queue.none', 'Nothing queued yet.')}</p>
          ) : (
            waiting.map((one) => (
              <div
                key={one.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200 tabular-nums">
                    {shown(one.due_at, lang)} · <span className="text-emerald-400">{named(one.platform)}</span>
                  </p>
                  {one.caption && (
                    <p className="text-xs text-zinc-500 leading-snug line-clamp-2">{one.caption}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void cancel(one.id).then(() => load())}
                  aria-label={t('queue.cancel', 'Take it out of the queue')}
                  className="min-h-[44px] min-w-[44px] rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-white hover:border-zinc-600 flex items-center justify-center flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}

          {/* Sent and failed, because a queue that hides what happened is a
              queue nobody trusts the next time. */}
          {gone.length > 0 && (
            <details className="pt-1">
              <summary className="text-sm text-zinc-500 cursor-pointer">
                {t('queue.past', 'Already gone')} · {gone.length}
              </summary>
              <div className="space-y-1.5 pt-2">
                {gone.slice(0, 20).map((one) => (
                  <p key={one.id} className="text-xs text-zinc-500 flex items-start gap-1.5">
                    {one.state === 'sent' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="min-w-0">
                      {shown(one.due_at, lang)} · {named(one.platform)}
                      {one.state === 'failed' && one.note ? ` — ${one.note}` : ''}
                    </span>
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* ── What it would take to actually post ────────────────────────── */}
      <details className="border-t border-zinc-800 pt-3">
        <summary className="text-xs text-zinc-500 leading-relaxed cursor-pointer">
          {t('queue.whyNot', 'Why this reminds you instead of posting for you')}
        </summary>
        <p className="text-xs text-zinc-500 leading-relaxed pt-2">
          {t(
            'queue.whyNotLong',
            'Posting on your behalf needs a developer account with each platform, a review that takes weeks, and in TikTok’s case an audit that can be refused outright. None of that is something this app can arrange for itself. The queue was built first so that the day a platform is connected, everything you have planned already goes out on its own — nothing here changes.',
          )}
        </p>
      </details>
    </section>
  );
}
