'use client';

/**
 * The Arena — paid-entry, skill-judged competitions for the channel.
 *
 * Two things are load-bearing in here and neither is decoration:
 *
 * 1. Judging is on skill against a published rubric, never on chance. A paid
 *    entry into a draw is a lottery in most of the markets this channel reaches
 *    (South Africa's Lotteries Act among them) and needs a licence nobody here
 *    has. Judged on merit, the same competition is an ordinary promotional
 *    competition.
 * 2. There is a free entry route on every competition, and it is not hidden.
 *    South Africa's Consumer Protection Act s36 requires that entry does not
 *    depend on paying more than the cost of transmitting the entry, and
 *    requires the rules to be available before anyone enters.
 *
 * Neither of these is legal advice, and the operator still has to have the real
 * rules reviewed before money changes hands. What the UI can do is refuse to
 * offer a shape that is obviously unlawful, and it does.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Trophy, Crown, Clock, Users, Shield, Sparkles, Check, AlertCircle,
  Music, Video, Code2, Lightbulb, Gift, Scale, RefreshCw, Globe,
} from 'lucide-react';
import {
  COMPETITIONS, CATEGORY_LABELS, type Competition, type CompetitionCategory,
} from '../data/studio';
import { generateCompetition } from '../lib/matching';
import { REGIONS, guessRegion, priceFor, regionByCode, type Region } from '../lib/pricing';

const CATEGORY_ICONS: Record<CompetitionCategory, typeof Music> = {
  music: Music,
  video: Video,
  app: Code2,
  idea: Lightbulb,
};

function daysLeft(closesOn: string): number {
  const diff = new Date(closesOn).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export default function Arena({ userPlan }: { userPlan: 'free' | 'pro' }) {
  // Region is resolved after mount, never during render: guessing on the server
  // would bake one country's prices into the static HTML for everybody.
  const [region, setRegion] = useState<Region>(REGIONS[0]);
  const [basis, setBasis] = useState('Working it out…');
  useEffect(() => {
    const guess = guessRegion();
    setRegion(guess.region);
    setBasis(guess.basis);
  }, []);
  const fee = (c: Competition) => priceFor(c.entryUsd, region);

  const [selected, setSelected] = useState<Competition | null>(null);
  const [entryRoute, setEntryRoute] = useState<'paid' | 'free'>('paid');
  const [agreedRules, setAgreedRules] = useState(false);
  const [confirmedOwn, setConfirmedOwn] = useState(false);
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [entryLink, setEntryLink] = useState('');
  const [entryStatus, setEntryStatus] = useState<string | null>(null);

  const [genCategory, setGenCategory] = useState<CompetitionCategory>('music');
  const [genSeed, setGenSeed] = useState(0);
  const generated = useMemo(() => generateCompetition(genCategory, genSeed), [genCategory, genSeed]);

  const openEntry = (competition: Competition) => {
    setSelected(competition);
    setEntryRoute('paid');
    setAgreedRules(false);
    setConfirmedOwn(false);
    setConfirmedAge(false);
    setEntryLink('');
    setEntryStatus(null);
  };

  const submitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedRules || !confirmedOwn || !confirmedAge) {
      setEntryStatus('incomplete');
      return;
    }
    if (!entryLink.trim()) {
      setEntryStatus('no_link');
      return;
    }
    setEntryStatus(entryRoute === 'paid' ? 'paid_pending' : 'free_pending');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>The Arena — channel competitions</span>
          </h4>
          <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed pt-1">
            Small entry fee, real prize, judged on the work. Every competition is scored against a published rubric by
            a panel — never drawn at random — and every one has a free entry route that wins exactly the same prize.
          </p>
        </div>
        <div className="text-[13px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
          Prize pool: 12 months Pro ×4
        </div>
      </div>

      {/* Where the buyer is, and what that means for the number they see */}
      <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">Prices shown for</span>
        </div>
        <select
          value={region.code}
          onChange={(e) => {
            setRegion(regionByCode(e.target.value));
            setBasis('You picked this one');
          }}
          className="bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
        >
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name} ({r.currency})
            </option>
          ))}
        </select>
        <span className="text-[13px] text-zinc-500">{basis}</span>
        <span className="text-[13px] text-zinc-400 basis-full leading-relaxed">
          Entry fees are set once in dollars and converted by local purchasing power, so the cost is roughly the same
          effort wherever you enter from. What you are actually charged is decided at checkout by the country of your
          payment method — not by this menu, and not by your IP address.
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {COMPETITIONS.map((c) => {
          const Icon = CATEGORY_ICONS[c.category];
          const left = daysLeft(c.closesOn);
          return (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{c.title}</p>
                      <p className="text-[13px] text-zinc-500">{CATEGORY_LABELS[c.category]}</p>
                    </div>
                  </div>
                  <span className="text-[13px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2 py-1 flex-shrink-0">
                    {fee(c).display}
                  </span>
                </div>

                <p className="text-sm text-zinc-400 leading-relaxed">{c.brief}</p>

                <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 space-y-1">
                  <p className="text-[13px] text-amber-300 font-bold flex items-center space-x-1.5">
                    <Crown className="w-3 h-3" />
                    <span>{c.prize}</span>
                  </p>
                  <p className="text-[13px] text-zinc-500">Runner-up: {c.runnerUp}</p>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-zinc-500">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{left} days left</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{c.entries} entries</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Scale className="w-3 h-3" />
                    <span>skill-judged</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openEntry(c)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 text-onAccent font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-all"
              >
                Enter — {fee(c).display} or free route
              </button>
            </div>
          );
        })}
      </div>

      {/* Competition designer */}
      <div className="p-4 rounded-2xl bg-black/40 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Design next month&apos;s competition</span>
          </p>
          <button
            type="button"
            onClick={() => setGenSeed((s) => s + 1)}
            className="px-2.5 py-1 rounded-lg text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Roll another</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_LABELS) as CompetitionCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setGenCategory(cat)}
              className={`px-2.5 py-1.5 rounded-xl text-sm font-bold border transition-all ${
                genCategory === cat
                  ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
          <p className="text-xs font-bold text-cyan-300">{generated.title}</p>
          <p className="text-sm text-zinc-400 leading-relaxed">{generated.brief}</p>
          <p className="text-[13px] text-zinc-500">
            theme: {generated.theme} · constraint: {generated.constraint}
          </p>
        </div>
        <p className="text-[13px] text-zinc-500">
          A constraint plus a theme is the whole recipe: the constraint stops everyone submitting the same safe track,
          and the theme gives the judges something to compare against.
        </p>
      </div>

      {/* Entry drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 my-8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-white">{selected.title}</p>
                <p className="text-[13px] text-zinc-500">
                  Closes {selected.closesOn} · {daysLeft(selected.closesOn)} days left
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-zinc-500 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            {/* The rules, before the money — not behind a link */}
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <p className="text-sm font-bold text-white flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Rules — read before you enter</span>
              </p>
              <ul className="space-y-1 text-[13px] text-zinc-400 leading-relaxed">
                <li>· <strong className="text-zinc-200">Judging:</strong> {selected.judging}</li>
                <li>· <strong className="text-zinc-200">Prize:</strong> {selected.prize}. No cash alternative.</li>
                <li>· <strong className="text-zinc-200">Free entry:</strong> the free route below wins the same prize, judged identically. You never have to pay to win.</li>
                <li>· <strong className="text-zinc-200">Eligibility:</strong> 18+. One entry per person per competition.</li>
                <li>· <strong className="text-zinc-200">Your work stays yours.</strong> Entering grants FutureBox a licence to show it on the channel with credit — nothing more.</li>
                <li>· <strong className="text-zinc-200">AI disclosure:</strong> the full model stack must be submitted with the entry. An undisclosed stack is disqualified.</li>
                <li>· <strong className="text-zinc-200">Results:</strong> published with the judges&apos; scores within 14 days of closing.</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEntryRoute('paid')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  entryRoute === 'paid' ? 'bg-amber-950/30 border-amber-500 text-white' : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                }`}
              >
                <p className="text-sm font-bold">Paid entry — {fee(selected).display}</p>
                <p className="text-[13px] text-zinc-500">Covers judging and hosting. Nothing else.</p>
              </button>
              <button
                type="button"
                onClick={() => setEntryRoute('free')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  entryRoute === 'free' ? 'bg-emerald-950/30 border-emerald-500 text-white' : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
                }`}
              >
                <p className="text-sm font-bold flex items-center space-x-1"><Gift className="w-3 h-3" /><span>Free entry</span></p>
                <p className="text-[13px] text-zinc-500">Same prize, same judging, no payment.</p>
              </button>
            </div>

            <form onSubmit={submitEntry} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm text-zinc-400">Link to your entry</label>
                <input
                  value={entryLink}
                  onChange={(e) => setEntryLink(e.target.value)}
                  placeholder={
                    selected.category === 'app'
                      ? 'https://github.com/you/your-app'
                      : selected.category === 'idea'
                        ? 'Paste your idea, or a link to it'
                        : 'https://youtube.com/watch?v=...'
                  }
                  className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                {[
                  { state: agreedRules, set: setAgreedRules, label: 'I have read the rules above and accept them.' },
                  { state: confirmedOwn, set: setConfirmedOwn, label: 'This is my own work, I hold the rights to it, and the full AI model stack is listed in the entry.' },
                  { state: confirmedAge, set: setConfirmedAge, label: 'I am 18 or older.' },
                ].map((row) => (
                  <label key={row.label} className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.state}
                      onChange={(e) => row.set(e.target.checked)}
                      className="mt-0.5 rounded border-zinc-700 text-amber-500 focus:ring-0"
                    />
                    <span className="text-[13px] text-zinc-300 leading-relaxed">{row.label}</span>
                  </label>
                ))}
              </div>

              {entryStatus === 'incomplete' && (
                <p className="text-[13px] text-amber-300 flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Tick all three before entering.</span>
                </p>
              )}
              {entryStatus === 'no_link' && (
                <p className="text-[13px] text-amber-300 flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Add the link to your entry.</span>
                </p>
              )}
              {entryStatus === 'paid_pending' && (
                <p className="text-[13px] text-cyan-300 bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-2.5 leading-relaxed">
                  Entry held. Payments are not connected yet — FutureBox has no backend, so nothing has been charged and
                  nothing has been stored. Wire a payment provider before opening this to the public.
                </p>
              )}
              {entryStatus === 'free_pending' && (
                <p className="text-[13px] text-emerald-300 bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5 leading-relaxed flex items-start space-x-2">
                  <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    Free entry recorded in this browser session only. Same prize, same rubric — it is not a lesser
                    entry. A backend is needed before it survives a refresh.
                  </span>
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 text-onAccent font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-all"
              >
                {entryRoute === 'paid' ? `Pay ${fee(selected).display} and enter` : 'Enter free'}
              </button>

              {userPlan === 'free' && (
                <p className="text-[13px] text-zinc-500 text-center">
                  Winning this gets you Pro for 12 months — the thing you would otherwise pay for.
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
