'use client';

/**
 * When the advert goes out, where, and whether it did.
 *
 * ── Why the room needed this ─────────────────────────────────────────────
 *
 * The desk above ends at "here is your advert, here is the composer". That is
 * a creative tool. An advertising *service* — the thing
 * `docs/ADS_AS_A_SERVICE.md` is about — needs two more things after the
 * creative: **when it goes out**, and **what it did**. The second needs
 * numbers read back from Meta and Google and cannot be built yet. The first
 * needs nobody's permission and is this.
 *
 * ── One object, three of the four buildable things ───────────────────────
 *
 * A run is a schedule entry, a posting checklist and a set of tagged links at
 * once, because they are the same fact seen three ways: this advert, going to
 * these places, on this day, with a link per place.
 *
 * ── The tags are the important half ──────────────────────────────────────
 *
 * Four platforms sharing one bare URL is one line in the analytics that says
 * "direct", and nothing built later recovers it — the clicks have happened.
 * Tagged, the same four are four rows, today, with no API and nobody's
 * approval. It is the cheapest thing in that document and the only one the
 * later stages cannot be built without.
 *
 * ── What the dates do not do ─────────────────────────────────────────────
 *
 * Nothing is sent. There is no reminder and the panel says so, because a
 * calendar that quietly fails to notify is worse than a list somebody knows to
 * check. A real reminder wants a member's address and a scheduled job — the
 * shape `/api/watch` already has — and that is a different piece of work
 * rather than a line to fake here.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Check, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { PLATFORMS } from '../data/social';
import {
  MOST_RUNS, loadRuns, progress, runId, saveRuns, sorted, standingOf, tagged,
  type Run, type Standing,
} from '../lib/adrun';
import { useLang } from '../lib/i18n';

const TONE: Record<Standing, string> = {
  overdue: 'border-rose-500/50 bg-rose-500/5',
  today: 'border-emerald-500/50 bg-emerald-500/5',
  soon: 'border-zinc-800 bg-zinc-950/60',
  unscheduled: 'border-zinc-800 bg-zinc-950/60',
  done: 'border-zinc-800 bg-zinc-950/40',
};

export default function AdRuns({
  /** The headline of the advert on screen, so a new run starts named. */
  headline,
}: {
  readonly headline?: string;
}): React.ReactElement {
  const { t } = useLang();
  const [runs, setRuns] = useState<Run[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  /* Loaded, then saved — and never the other way round.

     This was a `useRef` set to true inside the load effect, which reads as
     "do not save until we have loaded" and is not what it does. Effects run
     in order after a commit: the load effect *schedules* a state update and
     flips the ref, and the save effect then runs in the same commit with the
     state still empty and the ref already true. It writes an empty list over
     what was just read.

     It heals a render later, so nothing on this screen ever looked wrong.
     What it broke was anything reading the same key in between — which is
     exactly what the report panel does, and how it came to show no matches
     for a run that was sitting in storage the whole time.

     A state flag rather than a ref: `setReady` and the load land in one
     batch, so by the time the save effect sees `ready` it also sees the
     loaded value. */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRuns(loadRuns());
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) saveRuns(runs);
  }, [ready, runs]);

  const add = useCallback(() => {
    setRuns((was) => [
      {
        id: runId(),
        campaign: headline?.slice(0, 60) ?? '',
        headline: headline ?? '',
        link: '',
        when: '',
        createdAt: new Date().toISOString(),
        // Every platform, unticked. Somebody takes out what they do not use,
        // which is one press; remembering to add each is four.
        steps: PLATFORMS.map((one) => ({ platform: one.id, done: false })),
      },
      ...was,
    ].slice(0, MOST_RUNS));
  }, [headline]);

  const change = (id: string, fields: Partial<Run>) =>
    setRuns((was) => was.map((one) => (one.id === id ? { ...one, ...fields } : one)));

  const tick = (id: string, platform: string) =>
    setRuns((was) =>
      was.map((run) =>
        run.id === id
          ? {
              ...run,
              steps: run.steps.map((step) =>
                step.platform === platform
                  ? step.done
                    ? { platform: step.platform, done: false }
                    : { platform: step.platform, done: true, doneAt: new Date().toISOString() }
                  : step,
              ),
            }
          : run,
      ),
    );

  const copy = async (key: string, text: string) => {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(key);
    setTimeout(() => setCopied((was) => (was === key ? null : was)), 1500);
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <CalendarClock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-base font-black text-white tracking-tight">
            {t('run.title', 'When it goes out, and where')}
          </h3>
          <p className="text-sm text-zinc-500 leading-relaxed">
            {t(
              'run.what',
              'A day, a list of platforms, and a link per platform that says which one the click came from. Tick each off as you post it.',
            )}
          </p>
        </div>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed">
        {t(
          'run.whyTags',
          'Four platforms sharing one plain link is one line in your analytics that says “direct”. A tagged link makes them four rows — free, today, with nobody’s permission, and nothing you build later can recover a click that already happened untagged.',
        )}
      </p>

      {runs.map((run) => {
        const standing = standingOf(run);
        const { done, of } = progress(run);
        return (
          <div key={run.id} className={`rounded-xl border p-3 space-y-2.5 ${TONE[standing]}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="sr-only" htmlFor={`run-name-${run.id}`}>
                {t('run.campaign', 'What this push is called')}
              </label>
              <input
                id={`run-name-${run.id}`}
                value={run.campaign}
                onChange={(event) => change(run.id, { campaign: event.target.value })}
                placeholder={t('run.campaignHint', 'Winter sale')}
                className="min-h-[44px] flex-1 min-w-[10rem] rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
              />
              <label className="sr-only" htmlFor={`run-when-${run.id}`}>
                {t('run.when', 'The day it goes out')}
              </label>
              <input
                id={`run-when-${run.id}`}
                type="date"
                value={run.when}
                onChange={(event) => change(run.id, { when: event.target.value })}
                className="min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-xs font-semibold tabular-nums text-zinc-400">
                {done}/{of}
              </span>
              <button
                type="button"
                onClick={() => setRuns((was) => was.filter((one) => one.id !== run.id))}
                aria-label={`${t('run.remove', 'Take this run out')} ${run.campaign || ''}`}
                className="w-11 h-11 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-rose-300 flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <label className="sr-only" htmlFor={`run-link-${run.id}`}>
                {t('run.link', 'Where the click goes')}
              </label>
              <input
                id={`run-link-${run.id}`}
                value={run.link}
                onChange={(event) => change(run.id, { link: event.target.value })}
                placeholder="https://…"
                className="min-h-[44px] flex-1 min-w-[12rem] rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <p className="text-xs text-zinc-500">
              {standing === 'overdue'
                ? t('run.overdue', 'This day has passed and it is not all out yet.')
                : standing === 'today'
                  ? t('run.today', 'Today.')
                  : standing === 'done'
                    ? t('run.done', 'All out.')
                    : standing === 'unscheduled'
                      ? t('run.noDay', 'No day set.')
                      : t('run.soon', 'Coming up.')}
            </p>

            <ul className="space-y-1.5">
              {run.steps.map((step) => {
                const platform = PLATFORMS.find((one) => one.id === step.platform);
                if (!platform) return null;
                const link = run.link
                  ? tagged(run.link, {
                      source: platform.id,
                      medium: 'social',
                      campaign: run.campaign || run.headline || 'campaign',
                    })
                  : '';
                const key = `${run.id}:${step.platform}`;
                return (
                  <li key={step.platform} className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => tick(run.id, step.platform)}
                      aria-pressed={step.done}
                      className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold ${
                        step.done
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {step.done ? <Check className="w-4 h-4" /> : <span className="w-4 h-4" />}
                      {platform.name}
                    </button>

                    {link && (
                      <>
                        <code className="flex-1 min-w-[8rem] truncate rounded-lg border border-zinc-800 bg-black/40 px-2 py-1.5 text-xs text-zinc-400">
                          {link}
                        </code>
                        <button
                          type="button"
                          onClick={() => void copy(key, link)}
                          aria-label={`${t('run.copy', 'Copy the tagged link for')} ${platform.name}`}
                          className="w-11 h-11 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white flex items-center justify-center"
                        >
                          {copied === key ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </>
                    )}

                    <a
                      href={platform.composerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${t('run.open', 'Open')} ${platform.name}`}
                      className="w-11 h-11 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white flex items-center justify-center"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        disabled={runs.length >= MOST_RUNS}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-600 disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        {t('run.add', 'Plan a run')}
      </button>

      {/* Said plainly, because a calendar that quietly fails to notify is
          worse than a list somebody knows to check. */}
      <p className="text-xs text-zinc-600 leading-relaxed">
        {t(
          'run.noReminder',
          'Nothing is sent from here — this is a list you check, not a reminder. It is kept on this device.',
        )}
      </p>
    </section>
  );
}
