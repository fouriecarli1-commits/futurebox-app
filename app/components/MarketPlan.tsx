'use client';

/**
 * The market read, and the week that comes out of it.
 *
 * ── What this is, next to the ad writer above it ─────────────────────────
 *
 * The writer makes the advert. This works out whether it is pointed at
 * anything — what the product actually is in trade terms, who buys it, what
 * they are deciding between, which angles the category is already tired of,
 * and then a week somebody can keep up.
 *
 * ── Why every slot carries a reason ──────────────────────────────────────
 *
 * Nobody knows the best time to post *your* thing. Everything published on the
 * subject is an average over other people's accounts in other people's
 * categories. So each slot says what its guess rests on, in a line, and the
 * screen says out loud whether the week came from the category or from this
 * account's own imported report. A schedule presented as fact is a schedule
 * nobody can argue with, and the person reading it knows their own customers
 * better than any model does.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Loader2, Download, Target, Users, Compass, Radar, Gauge } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { refusalText } from '../lib/apierror';
import { accessToken } from '../lib/cloud';
import {
  DAY_IDS, icsOf, loadPerDay, sortedWeek, type DayId, type Plan,
} from '../lib/marketplan';
import { loadReport } from '../lib/adreport';
import { byWeekday, standoutDays } from '../lib/adweek';
import Note from './Note';

const KEY = 'futurebox.marketplan.v1';

/** The last plan, so it survives a reload. One plan is a month of work. */
function loadPlan(): Plan | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const said = JSON.parse(raw) as Plan;
    return Array.isArray(said?.week) ? said : null;
  } catch {
    return null;
  }
}

function savePlan(plan: Plan | null): void {
  try {
    if (plan) window.localStorage.setItem(KEY, JSON.stringify(plan));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked. It is on the screen for this session.
  }
}

/**
 * The weekdays this account's own report says did better and worse.
 *
 * Read here rather than passed in, because the report already lives in this
 * browser and the alternative is threading it through two components that do
 * not otherwise care. `null` where there is not enough of a file to say — the
 * common answer for somebody who has just started, and the honest one.
 */
function ownNumbers(): { better: string[]; worse: string[]; measure: 'cpr' | 'ctr' } | null {
  const report = loadReport();
  if (!report?.rows?.length) return null;
  const standout = standoutDays(byWeekday(report.rows));
  if (!standout) return null;
  /* `byWeekday` counts from Sunday, as `Date.getDay()` does. `DAY_IDS` starts
     on Monday, because a posting week does. Getting this wrong shifts every
     day by one and nothing on the screen would look wrong. */
  const nameOf = (index: number) => DAY_IDS[(index + 6) % 7];
  return {
    better: standout.better.map(nameOf),
    worse: standout.worse.map(nameOf),
    measure: standout.measure,
  };
}

const EFFORT_TONE: Record<'low' | 'medium' | 'high', string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-rose-400',
};

export interface Brief {
  readonly what: string;
  readonly who?: string;
  readonly offer?: string;
  readonly tone?: string;
  readonly market?: string;
  readonly place?: string;
}

export default function MarketPlan({ brief }: { readonly brief: Brief }): React.ReactElement {
  const { t, lang } = useLang();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [fromOwn, setFromOwn] = useState(false);

  useEffect(() => {
    setPlan(loadPlan());
  }, []);

  const dayName = useCallback(
    (day: DayId) => t(`plan.day.${day}`, day[0].toUpperCase() + day.slice(1)),
    [t],
  );

  const work = async () => {
    setProblem(null);
    if (!brief.what.trim()) {
      setProblem(t('plan.needWhat', 'Say what you are selling in the brief above first.'));
      return;
    }
    setBusy(true);
    const own = ownNumbers();
    try {
      const token = await accessToken();
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...brief,
          betterDays: own?.better ?? [],
          worseDays: own?.worse ?? [],
          measure: own?.measure,
        }),
      });
      const said = (await response.json().catch(() => ({}))) as { plan?: Plan; message?: string; error?: string };
      if (!response.ok || !said.plan) {
        setProblem(refusalText(said, lang, t('plan.failed', 'That could not be worked out just now.')));
        return;
      }
      setPlan(said.plan);
      savePlan(said.plan);
      setFromOwn(Boolean(own));
    } catch {
      setProblem(t('plan.failed', 'That could not be worked out just now.'));
    } finally {
      setBusy(false);
    }
  };

  /* The week as a calendar file. A plan somebody has to remember to look at is
     a plan they stop looking at; one that arrives in their diary is a plan. */
  const toCalendar = () => {
    if (!plan) return;
    const text = icsOf(plan.week, { label: 'FutureBox' });
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'futurebox-week.ics';
    link.click();
    URL.revokeObjectURL(url);
  };

  const week = plan ? sortedWeek(plan.week) : [];
  const perDay = plan ? loadPerDay(plan.week) : [];
  const busiest = perDay.length ? Math.max(...perDay) : 0;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-4">
      <div className="flex items-start gap-2.5">
        <Target className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-base font-black text-white tracking-tight">
            {t('plan.title', 'The market, and the week')}
          </h3>
          <Note className="text-sm text-zinc-500 leading-relaxed">{t(
              'plan.what',
              'What you are actually selling, who buys it, what they are deciding between — and a week of posting with days, times and platforms.',
            )}</Note>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void work()}
          disabled={busy}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {plan ? t('plan.again', 'Work it out again') : t('plan.go', 'Work out the plan')}
        </button>
        {plan && (
          <button
            type="button"
            onClick={toCalendar}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm font-semibold text-zinc-300 hover:text-white inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t('plan.calendar', 'Put the week in my calendar')}
          </button>
        )}
      </div>
      {busy && (
        <p className="text-xs text-zinc-500">
          {t('plan.slow', 'This one thinks for a while — up to a minute or two. It is a document, not a sentence.')}
        </p>
      )}
      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

      {plan && (
        <div className="space-y-4 border-t border-zinc-800 pt-4">
          {/* ── What this is, in trade terms ──────────────────────────── */}
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-600 font-bold">
              {t('plan.category', 'The category')}
            </p>
            <p className="text-sm text-zinc-200 font-semibold">{plan.category}</p>
            <p className="text-sm text-zinc-400 leading-relaxed pt-1">{plan.demand}</p>
          </div>

          {/* ── Who buys it ───────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-zinc-600 font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {t('plan.buyers', 'Who buys it')}
            </p>
            {plan.buyers.map((one, at) => (
              <div key={at} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
                <p className="text-sm font-semibold text-zinc-200">{one.who}</p>
                <p className="text-sm text-zinc-400 leading-snug">{one.wants}</p>
                <p className="text-sm text-amber-400/90 leading-snug pt-1">
                  {t('plan.doubt', 'What stops them')}: {one.doubt}
                </p>
              </div>
            ))}
          </div>

          {/* ── What the category is tired of ─────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-zinc-600 font-bold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              {t('plan.angles', 'Angles, and what they are up against')}
            </p>
            {plan.angles.map((one, at) => (
              <div key={at} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
                <p className="text-sm font-semibold text-zinc-200">{one.angle}</p>
                <p className="text-sm text-zinc-400 leading-snug">{one.why}</p>
                <p className="text-xs text-zinc-500 leading-snug pt-1">{one.against}</p>
              </div>
            ))}
          </div>

          {/* ── Where ─────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-zinc-600 font-bold">
              {t('plan.platforms', 'Where, best first')}
            </p>
            {plan.platforms.map((one, at) => (
              <div key={at} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-200">{one.platform}</p>
                  <span className={`text-xs font-bold ${EFFORT_TONE[one.effort]}`}>
                    {t(`plan.effort.${one.effort}`, one.effort)}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 leading-snug">{one.why}</p>
                <p className="text-xs text-zinc-500 leading-snug pt-1">{one.format}</p>
              </div>
            ))}
          </div>

          {/* ── The week ──────────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-zinc-600 font-bold flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              {t('plan.week', 'The week')} · {plan.week.length}
            </p>

            {/* The shape of it, before the detail. Somebody deciding whether
                they can keep this up is looking at the tallest bar. */}
            <div className="flex items-end gap-1 h-10" aria-hidden="true">
              {perDay.map((count, at) => (
                <div key={at} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div
                    className="w-full rounded-t bg-emerald-500/40"
                    style={{ height: `${busiest ? (count / busiest) * 28 : 0}px` }}
                  />
                  <span className="text-[10px] text-zinc-600">{dayName(DAY_IDS[at]).slice(0, 2)}</span>
                </div>
              ))}
            </div>

            {week.map((slot, at) => (
              <div key={at} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
                <p className="text-sm text-zinc-200 tabular-nums">
                  <span className="font-semibold">{dayName(slot.day)}</span> {slot.at} ·{' '}
                  <span className="text-emerald-400">{slot.platform}</span>
                </p>
                <p className="text-sm text-zinc-300 leading-snug">{slot.what}</p>
                <p className="text-xs text-zinc-500 leading-snug pt-1">{slot.why}</p>
              </div>
            ))}

            {/* Where the times came from. The difference between a plan built
                on this account's own report and one built on how the category
                generally behaves is the whole difference in how much to trust
                it, so it is said rather than left to be assumed. */}
            <p className="text-xs text-zinc-500 leading-relaxed">
              {fromOwn
                ? t('plan.fromOwn', 'The days are built around your own imported report, not around what the category generally does.')
                : t('plan.fromCategory', 'You have no report imported yet, so these days and times are a starting guess for this category. Import an export above and work it out again to build it on your own numbers instead.')}
            </p>
          </div>

          {/* ── Not a feed ────────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-zinc-600 font-bold flex items-center gap-1.5">
              <Radar className="w-3.5 h-3.5" />
              {t('plan.beyond', 'Where the buyers are that is not a feed')}
            </p>
            {plan.beyondSocial.map((one, at) => (
              <div key={at} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-200">{one.what}</p>
                  <span className={`text-xs font-bold ${EFFORT_TONE[one.effort]}`}>
                    {t(`plan.effort.${one.effort}`, one.effort)}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 leading-snug">{one.why}</p>
              </div>
            ))}
          </div>

          {/* ── What to watch ─────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-zinc-600 font-bold flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              {t('plan.watch', 'The numbers worth watching')}
            </p>
            {plan.watch.map((one, at) => (
              <div key={at} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5">
                <p className="text-sm font-semibold text-zinc-200">{one.number}</p>
                <p className="text-sm text-zinc-400 leading-snug">{one.why}</p>
                <p className="text-xs text-zinc-500 leading-snug pt-1">{one.healthy}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-600 leading-relaxed border-t border-zinc-800 pt-3">
            {t(
              'plan.argue',
              'Every line here is a starting point, not a finding. You know your customers; where this disagrees with what you have seen, you are right and it is wrong.',
            )}
          </p>
        </div>
      )}
    </section>
  );
}
