'use client';

/**
 * The Arena, with actual competitions in it.
 *
 * The rules were right and applied to nothing: there was no way to open a
 * competition, enter one, or find out who won. This is the part that makes
 * those rules load-bearing rather than decorative.
 *
 * Three things it refuses to fudge.
 *
 * **A rubric is required to open one.** Judged on published criteria, this is
 * an ordinary promotional competition; judged on nothing, a paid entry is a
 * draw, and a paid draw is a lottery in most markets this reaches. The server
 * refuses without one, so this screen cannot be the only thing standing there.
 *
 * **The free route is never hidden.** It sits next to the paid one, the same
 * size, on every competition — that is what South Africa's Consumer Protection
 * Act s36 asks for and it is also the only version worth running.
 *
 * **The dates are published before anyone enters.** "When do I find out" is the
 * first question, and a competition that cannot answer it is not entered twice.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar, Check, Clock, Coins, Loader2, RefreshCw, Trophy, Users,
} from 'lucide-react';
import { generateCompetition } from '../lib/matching';
import type { CompetitionCategory } from '../data/studio';
import { loadTracks, type Track } from '../lib/library';
import { accessToken } from '../lib/cloud';
import { startCheckout } from '../lib/purchases';
import { useLang } from '../lib/i18n';

interface Competition {
  id: string;
  title: string;
  category: CompetitionCategory;
  brief: string;
  constraint_note: string;
  rubric: Array<{ name: string; weight: number; what: string }>;
  entry_rand: number;
  prize_rand: number;
  closes_at: string;
  announce_at: string;
  status: string;
  entries: number;
}

interface Entry {
  id: string;
  competition_id: string;
  route: 'free' | 'paid';
}

interface Winner {
  competition_id: string;
  place: number;
  owner: string;
  prize_rand: number;
  claimed_at: string | null;
  paid_at: string | null;
}

/**
 * What every competition is judged on unless the operator writes their own.
 *
 * Present so that opening one is never blocked on inventing criteria, and
 * deliberately about the work rather than about popularity: a vote count is a
 * measure of an entrant's audience, not of what they made.
 */
const DEFAULT_RUBRIC = [
  { name: 'The constraint', weight: 30, what: 'Whether the one hard constraint was actually met.' },
  { name: 'The idea', weight: 30, what: 'Whether there is a thought in it somebody else would not have had.' },
  { name: 'The finish', weight: 25, what: 'Whether it is done — mixed, cut, shipped — rather than sketched.' },
  { name: 'Honesty', weight: 15, what: 'Whether what made it is declared, as everything here is.' },
];

const CATEGORIES: CompetitionCategory[] = ['music', 'video', 'app', 'idea'];

function when(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysLeft(value: string): number {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

export default function ArenaLive({ reloadKey }: { reloadKey: number }): React.ReactElement {
  const { t } = useLang();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [mine, setMine] = useState<Entry[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [mineWon, setMineWon] = useState<Winner[]>([]);
  const [banks, setBanks] = useState<Array<{ name: string; code: string }>>([]);
  const [claim, setClaim] = useState({ name: '', bankCode: '', accountNumber: '' });
  const [isOwner, setIsOwner] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000));
  const [draft, setDraft] = useState<{ title: string; category: CompetitionCategory; brief: string; constraint: string } | null>(null);
  const [closes, setCloses] = useState('');
  const [announce, setAnnounce] = useState('');
  const [entryRand, setEntryRand] = useState(0);
  const [prizeRand, setPrizeRand] = useState(0);

  const load = useCallback(async () => {
    try {
      const token = await accessToken();
      const response = await fetch('/api/arena', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        competitions?: Competition[]; mine?: Entry[]; winners?: Winner[];
        mineWon?: Winner[]; isOwner?: boolean; signedIn?: boolean;
      };
      setCompetitions(data.competitions ?? []);
      setMine(data.mine ?? []);
      setWinners(data.winners ?? []);
      setMineWon(data.mineWon ?? []);
      setIsOwner(Boolean(data.isOwner));
      setSignedIn(Boolean(data.signedIn));
    } catch {
      // Left as it was: a competition list that fails to refresh is a stale
      // list, which is better than an empty one that reads as "none running".
    }
  }, []);

  useEffect(() => {
    void load();
    setTracks(loadTracks());
  }, [load, reloadKey]);

  // The bank list comes from Paystack, not from a table written down here: a
  // code copied out of documentation works until they change it, and then a
  // real person's prize fails with a number that means nothing to them.
  useEffect(() => {
    if (!mineWon.some((one) => !one.claimed_at)) return;
    fetch('/api/arena/claim')
      .then((response) => (response.ok ? response.json() : { banks: [] }))
      .then((data: { banks?: Array<{ name: string; code: string }> }) => setBanks(data.banks ?? []))
      .catch(() => setBanks([]));
  }, [mineWon]);

  const sendClaim = useCallback(
    async (competitionId: string) => {
      setBusy('claim');
      setProblem(null);
      const token = await accessToken();
      const response = await fetch('/api/arena/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ competitionId, ...claim }),
      });
      setBusy(null);
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { message?: string };
        setProblem(data.message ?? 'That did not work.');
        return;
      }
      setClaim({ name: '', bankCode: '', accountNumber: '' });
      void load();
    },
    [claim, load],
  );

  /** Three ideas, reshuffled on demand. This is the "constantly proposes" part. */
  const ideas = useMemo(
    () => CATEGORIES.slice(0, 3).map((category, i) => generateCompetition(category, seed + i * 7)),
    [seed],
  );

  const enteredIn = useCallback(
    (id: string) => mine.find((one) => one.competition_id === id) ?? null,
    [mine],
  );

  const enterFree = useCallback(
    async (competition: Competition, trackId: string) => {
      setBusy(competition.id);
      setProblem(null);
      const token = await accessToken();
      const response = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          action: 'enter',
          competitionId: competition.id,
          trackId: trackId || null,
          title: tracks.find((one) => one.id === trackId)?.title ?? '',
        }),
      });
      setBusy(null);
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { message?: string };
        setProblem(data.message ?? 'That did not work.');
        return;
      }
      void load();
    },
    [load, tracks],
  );

  const enterPaid = useCallback(async (competition: Competition) => {
    setBusy(competition.id);
    setProblem(null);
    // Null means it worked and the browser is already on its way to Paystack.
    const failed = await startCheckout({ kind: 'entry', competitionId: competition.id });
    setBusy(null);
    if (failed) setProblem(failed);
  }, []);

  const open = useCallback(async () => {
    if (!draft) return;
    setBusy('open');
    setProblem(null);
    const token = await accessToken();
    const response = await fetch('/api/arena', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        action: 'open',
        title: draft.title,
        category: draft.category,
        brief: draft.brief,
        constraint: draft.constraint,
        rubric: DEFAULT_RUBRIC,
        entryRand,
        prizeRand,
        closesAt: closes,
        announceAt: announce,
      }),
    });
    setBusy(null);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      setProblem(data.message ?? 'That did not work.');
      return;
    }
    setDraft(null);
    void load();
  }, [announce, closes, draft, entryRand, load, prizeRand]);

  return (
    <div className="space-y-4">
      {/* ── What is open ─────────────────────────────────────────────────── */}
      {competitions.filter((one) => one.status === 'open').length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 text-center space-y-1.5">
          <Trophy className="w-6 h-6 text-amber-400 mx-auto" />
          <p className="text-base font-bold text-white">{t('arena.none', 'Nothing running right now')}</p>
          <p className="text-sm text-zinc-500 leading-snug">
            {t('arena.noneNote', 'When one opens it appears here, with its rules, its closing date and the day the winner is announced.')}
          </p>
        </div>
      ) : (
        competitions
          .filter((one) => one.status === 'open')
          .map((competition) => {
            const entry = enteredIn(competition.id);
            const left = daysLeft(competition.closes_at);
            return (
              <div key={competition.id} className="rounded-2xl border border-amber-500/30 bg-zinc-950/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-white leading-snug">{competition.title}</p>
                    <p className="text-sm text-zinc-500">
                      {competition.category} · {competition.entries}{' '}
                      {competition.entries === 1 ? t('arena.entry', 'entry') : t('arena.entries', 'entries')}
                    </p>
                  </div>
                  {competition.prize_rand > 0 && (
                    <span className="text-sm font-bold text-amber-300 flex-shrink-0">
                      R{competition.prize_rand.toLocaleString('en-ZA').replace(/,/g, ' ')}
                    </span>
                  )}
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed">{competition.brief}</p>
                {competition.constraint_note && (
                  <p className="text-sm text-amber-300/90 leading-snug">
                    {t('arena.constraint', 'The constraint')}: {competition.constraint_note}
                  </p>
                )}

                <div className="grid sm:grid-cols-2 gap-2 text-sm text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    {t('arena.closes', 'Closes')} {when(competition.closes_at)}
                    {left >= 0 && <span className="text-zinc-600"> · {left}d</span>}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    {t('arena.announced', 'Winner announced')} {when(competition.announce_at)}
                  </span>
                </div>

                {/* Judged on this, published before anybody enters. */}
                {competition.rubric?.length > 0 && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 space-y-1">
                    <p className="text-sm font-semibold text-zinc-300">{t('arena.judged', 'Judged on')}</p>
                    {competition.rubric.map((row) => (
                      <p key={row.name} className="text-sm text-zinc-500 leading-snug">
                        {row.weight}% — <span className="text-zinc-400">{row.name}</span>: {row.what}
                      </p>
                    ))}
                  </div>
                )}

                {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

                {entry ? (
                  <p className="text-sm text-emerald-300 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    {t('arena.in', 'You are in')} · {entry.route === 'paid' ? t('arena.paidRoute', 'paid entry') : t('arena.freeRoute', 'free entry')}
                  </p>
                ) : !signedIn ? (
                  <p className="text-sm text-zinc-500">{t('arena.signIn', 'Sign in to enter.')}</p>
                ) : (
                  <div className="space-y-2">
                    <select
                      id={`pick-${competition.id}`}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                      defaultValue=""
                    >
                      <option value="">{t('arena.pick', 'Which of your songs?')}</option>
                      {tracks.map((one) => (
                        <option key={one.id} value={one.id}>{one.title}</option>
                      ))}
                    </select>
                    {/* The free route sits beside the paid one, the same size. */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={busy === competition.id}
                        onClick={() => {
                          const pick = document.getElementById(`pick-${competition.id}`) as HTMLSelectElement | null;
                          void enterFree(competition, pick?.value ?? '');
                        }}
                        className="py-2.5 rounded-xl bg-zinc-900 border border-emerald-500/50 text-emerald-300 text-sm font-bold disabled:opacity-60"
                      >
                        {t('arena.enterFree', 'Enter free')}
                      </button>
                      <button
                        type="button"
                        disabled={busy === competition.id || competition.entry_rand <= 0}
                        onClick={() => void enterPaid(competition)}
                        className="py-2.5 rounded-xl bg-amber-500 text-onAccent text-sm font-bold disabled:opacity-40"
                      >
                        {competition.entry_rand > 0
                          ? `${t('arena.enterPaid', 'Support it')} · R${competition.entry_rand}`
                          : t('arena.freeOnly', 'Free only')}
                      </button>
                    </div>
                    <p className="text-sm text-zinc-600 leading-snug">
                      {t('arena.sameOdds', 'Both routes are judged identically. Paying supports the prize; it buys nothing in the judging.')}
                    </p>
                  </div>
                )}
              </div>
            );
          })
      )}

      {/* ── Your prize ──────────────────────────────────────────────────── */}
      {mineWon.filter((one) => !one.claimed_at && one.prize_rand > 0).map((win) => (
        <div key={`claim-${win.competition_id}`} className="rounded-2xl border border-amber-500/50 bg-zinc-950/70 p-4 space-y-2.5">
          <p className="text-base font-bold text-amber-300 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            {t('arena.youWon', 'You won')} — R{win.prize_rand}
          </p>
          <p className="text-sm text-zinc-400 leading-snug">
            {t('arena.claimNote', 'Your account details go straight to the payment service and are not stored here. What this app keeps is their reference, so nobody who reads this database can reach your account.')}
          </p>
          <input
            value={claim.name}
            onChange={(event) => setClaim({ ...claim, name: event.target.value })}
            placeholder={t('arena.accountName', 'Name on the account')}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
          <div className="grid sm:grid-cols-2 gap-2">
            <select
              value={claim.bankCode}
              onChange={(event) => setClaim({ ...claim, bankCode: event.target.value })}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">{t('arena.bank', 'Your bank')}</option>
              {banks.map((bank) => (
                <option key={bank.code} value={bank.code}>{bank.name}</option>
              ))}
            </select>
            <input
              value={claim.accountNumber}
              onChange={(event) => setClaim({ ...claim, accountNumber: event.target.value })}
              inputMode="numeric"
              placeholder={t('arena.accountNumber', 'Account number')}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void sendClaim(win.competition_id)}
            disabled={busy === 'claim' || !claim.name || !claim.bankCode || !claim.accountNumber}
            className="w-full py-2.5 rounded-xl bg-amber-500 text-onAccent text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy === 'claim' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
            {t('arena.claimIt', 'Claim it')}
          </button>
        </div>
      ))}

      {/* ── Who won ──────────────────────────────────────────────────────── */}
      {winners.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
          <p className="text-base font-bold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            {t('arena.winners', 'Winners')}
          </p>
          {winners.map((winner) => {
            const competition = competitions.find((one) => one.id === winner.competition_id);
            return (
              <div
                key={`${winner.competition_id}-${winner.place}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 flex items-center justify-between gap-3"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white truncate">
                    #{winner.place} — {competition?.title ?? winner.competition_id}
                  </span>
                  <span className="block text-sm text-zinc-500">
                    R{winner.prize_rand} ·{' '}
                    {winner.paid_at
                      ? t('arena.paid', 'paid')
                      : winner.claimed_at
                        ? t('arena.claimed', 'claimed, payment on its way')
                        : t('arena.unclaimed', 'not claimed yet')}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Ideas, and opening one ───────────────────────────────────────── */}
      {isOwner && (
        <div className="rounded-2xl border border-cyan-500/30 bg-zinc-950/60 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-bold text-white">{t('arena.ideas', 'Ideas for the next one')}</p>
            <button
              type="button"
              onClick={() => setSeed((n) => n + 3)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 text-sm flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t('arena.more', 'Different ones')}
            </button>
          </div>

          <div className="space-y-1.5">
            {ideas.map((idea) => (
              <button
                key={idea.title}
                type="button"
                onClick={() => {
                  setDraft({
                    title: idea.title, category: idea.category,
                    brief: idea.brief, constraint: idea.constraint,
                  });
                  // Sensible defaults: two weeks to enter, a week to judge.
                  const close = new Date(Date.now() + 14 * 86_400_000);
                  const say = new Date(Date.now() + 21 * 86_400_000);
                  setCloses(close.toISOString().slice(0, 10));
                  setAnnounce(say.toISOString().slice(0, 10));
                }}
                className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 hover:border-cyan-500/50"
              >
                <span className="block text-sm font-semibold text-cyan-300">{idea.title}</span>
                <span className="block text-sm text-zinc-500 leading-snug">{idea.brief}</span>
              </button>
            ))}
          </div>

          {draft && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2.5">
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-sm text-zinc-500">{t('arena.closes', 'Closes')}</span>
                  <input
                    type="date" value={closes} onChange={(event) => setCloses(event.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-zinc-500">{t('arena.announced', 'Winner announced')}</span>
                  <input
                    type="date" value={announce} onChange={(event) => setAnnounce(event.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-sm text-zinc-500">{t('arena.fee', 'Entry, in rand')}</span>
                  <input
                    type="number" min={0} value={entryRand}
                    onChange={(event) => setEntryRand(Math.max(0, Number(event.target.value) || 0))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm text-zinc-500">{t('arena.prize', 'Prize, in rand')}</span>
                  <input
                    type="number" min={0} value={prizeRand}
                    onChange={(event) => setPrizeRand(Math.max(0, Number(event.target.value) || 0))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                  />
                </label>
              </div>
              <p className="text-sm text-zinc-600 leading-snug flex items-start gap-1.5">
                <Coins className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                {t('arena.rubricNote', 'It opens with the standard rubric, which is published on the competition. Entry is free whatever the fee says — the fee is a way to support the prize.')}
              </p>
              <button
                type="button"
                onClick={() => void open()}
                disabled={busy === 'open'}
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy === 'open' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                {t('arena.open', 'Open it')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
