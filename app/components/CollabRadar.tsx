'use client';

/**
 * Collab Radar — the outward-facing half of the Creator Studio.
 *
 * Four jobs, one panel: find podcasts worth pitching, draft the pitch, plan a
 * TikTok Live room, and find creators whose music actually fits yours. Every
 * score shown here is computed in `app/lib/matching.ts` and every match shows
 * its reasons, because the output of this panel is a message to a real person
 * and the creator has to be able to disagree with it before they send.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Mic, Radio, Music, Send, Copy, Check, ExternalLink, Users, Sparkles,
  AlertCircle, Video, Flame, ListChecks, Handshake, Search, Plus,
  Link as LinkIcon, Lock,
} from 'lucide-react';
import {
  PODCAST_TARGETS, TRACK_FLAVOURS, TIKTOK_LAUNCH_STEPS,
  REACH_LABELS, type PodcastTarget, type TrackFlavour,
} from '../data/studio';
import { PLATFORMS as SOCIAL_PLATFORMS, FUTUREBOX_CHANNELS, FUTUREBOX_TAG } from '../data/social';
import {
  buildCaption, loadHandles, saveHandles, profileUrlFor, shareUrlFor, platformById,
  loadBoosts, saveBoosts, type Handles, type BoostRequest,
} from '../lib/social';
import { check, ENTITLEMENTS, type Plan } from '../lib/entitlements';
import {
  matchPodcasts, matchTracks, buildPitch, buildLiveBrief, buildPosts,
  type CreatorProfile,
} from '../lib/matching';

type RadarTab = 'podcasts' | 'live' | 'flavour' | 'posts';

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          },
          () => setCopied(false),
        );
      }}
      className="px-2.5 py-1 rounded-lg text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 transition-all flex items-center space-x-1.5"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const tone = pct >= 70 ? 'bg-emerald-400' : pct >= 45 ? 'bg-cyan-400' : 'bg-zinc-600';
  return (
    <div className="flex items-center space-x-2 min-w-[92px]">
      <div className="h-1.5 flex-1 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full ${tone} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[13px] font-mono text-zinc-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function CollabRadar({
  profile,
  userPlan,
  onUpgrade,
}: {
  profile: CreatorProfile;
  userPlan: Plan;
  onUpgrade: () => void;
}) {
  const canPost = check('collab.post', userPlan).allowed;
  const canBoost = check('collab.boost', userPlan).allowed;
  const [tab, setTab] = useState<RadarTab>('podcasts');

  // Podcast outreach
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastTarget | null>(null);
  const [pitchFormat, setPitchFormat] = useState<'email' | 'dm'>('email');
  const [pitchBody, setPitchBody] = useState('');
  const [ownTargetName, setOwnTargetName] = useState('');
  const [ownTargets, setOwnTargets] = useState<PodcastTarget[]>([]);

  // TikTok live planner
  const [checked, setChecked] = useState<string[]>([]);
  const [coHost, setCoHost] = useState('');
  const [liveTopic, setLiveTopic] = useState('');
  const [liveSlot, setLiveSlot] = useState('');

  // Flavour matching
  const myTracks = TRACK_FLAVOURS.filter((t) => t.handle === profile.handle);
  const [sourceId, setSourceId] = useState((myTracks[0] ?? TRACK_FLAVOURS[0]).id);
  const source = TRACK_FLAVOURS.find((t) => t.id === sourceId) as TrackFlavour;

  // Viral posts
  const [postTrackId, setPostTrackId] = useState(sourceId);
  const [platformId, setPlatformId] = useState(SOCIAL_PLATFORMS[0].id);
  const [handles, setHandles] = useState<Handles>({});
  const [boosts, setBoosts] = useState<BoostRequest[]>([]);
  const [collaborator, setCollaborator] = useState('');
  const [creditFuturebox, setCreditFuturebox] = useState(true);
  const [showConnectNote, setShowConnectNote] = useState(false);
  const [boostFor, setBoostFor] = useState<string | null>(null);
  const [boostUrl, setBoostUrl] = useState('');

  // Read after mount: localStorage during render would disagree with the
  // server-rendered HTML.
  useEffect(() => {
    setHandles(loadHandles());
    setBoosts(loadBoosts());
  }, []);

  const allTargets = useMemo(() => [...PODCAST_TARGETS, ...ownTargets], [ownTargets]);
  const podcastMatches = useMemo(() => matchPodcasts(profile, allTargets), [profile, allTargets]);
  const trackMatches = useMemo(() => matchTracks(source), [source]);
  const postTrack = TRACK_FLAVOURS.find((t) => t.id === postTrackId) as TrackFlavour;
  const platform = platformById(platformId);
  const posts = useMemo(() => buildPosts(postTrack, platform), [postTrack, platform]);

  const openPitch = (podcast: PodcastTarget, format: 'email' | 'dm') => {
    setSelectedPodcast(podcast);
    setPitchFormat(format);
    setPitchBody(buildPitch(profile, podcast, format).body);
  };

  const addOwnTarget = () => {
    const name = ownTargetName.trim();
    if (!name) return;
    setOwnTargets((prev) => [
      ...prev,
      {
        id: `own-${prev.length}-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        host: 'Add the host name',
        topics: ['ai music', 'ai', 'creators'],
        format: 'Add the format',
        audience: 'Unknown',
        reach: 'reachable',
        url: '',
        angle: 'Add the angle you would pitch.',
      },
    ]);
    setOwnTargetName('');
  };

  const tabs: Array<{ id: RadarTab; label: string; icon: typeof Mic }> = [
    { id: 'podcasts', label: 'Podcast Match', icon: Mic },
    { id: 'live', label: 'TikTok Live Room', icon: Radio },
    { id: 'flavour', label: 'Music Flavour Match', icon: Music },
    { id: 'posts', label: 'Viral Post Lab', icon: Flame },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
            <Handshake className="w-4 h-4 text-cyan-400" />
            <span>Collab Radar</span>
          </h4>
          <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed pt-1">
            Matches are computed from your released tracks — {profile.genres.join(', ') || 'no releases yet'} — and
            scored on tempo, key and shared topics. Nothing here contacts anyone: every pitch is a draft you read,
            edit and send yourself.
          </p>
        </div>
        <div className="text-[13px] font-mono text-zinc-500 bg-zinc-900/80 border border-zinc-800 rounded-lg px-2.5 py-1.5">
          {profile.handle} · {profile.followers.toLocaleString()} followers
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center space-x-1.5 border transition-all ${
                isActive
                  ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Podcast matching + outreach drafting                              */}
      {/* ---------------------------------------------------------------- */}
      {tab === 'podcasts' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            {podcastMatches.map(({ podcast, score, shared, verdict }) => (
              <div
                key={podcast.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  selectedPodcast?.id === podcast.id
                    ? 'bg-cyan-950/30 border-cyan-500/60'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{podcast.name}</p>
                    <p className="text-[13px] text-zinc-500">
                      {podcast.host} · {podcast.format} · {podcast.audience}
                    </p>
                  </div>
                  <ScoreBar score={score} />
                </div>

                <p className="text-[13px] text-zinc-400 pt-2 leading-relaxed">{verdict}</p>

                <div className="flex flex-wrap gap-1 pt-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs border ${
                      podcast.reach === 'aspirational'
                        ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                        : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                    }`}
                  >
                    {REACH_LABELS[podcast.reach]}
                  </span>
                  {shared.slice(0, 4).map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-md text-xs text-zinc-400 border border-zinc-800 bg-zinc-950">
                      {s}
                    </span>
                  ))}
                  {podcast.isDemo && (
                    <span className="px-2 py-0.5 rounded-md text-xs text-zinc-500 border border-zinc-800 bg-zinc-950">
                      placeholder — replace with a real show
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => openPitch(podcast, 'email')}
                    className="px-2.5 py-1 rounded-lg text-sm font-bold bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25 transition-all flex items-center space-x-1.5"
                  >
                    <Send className="w-3 h-3" />
                    <span>Draft email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPitch(podcast, 'dm')}
                    className="px-2.5 py-1 rounded-lg text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 transition-all"
                  >
                    Draft DM
                  </button>
                  {podcast.url && (
                    <a
                      href={podcast.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg text-sm text-zinc-400 hover:text-cyan-300 flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Find their contact page</span>
                    </a>
                  )}
                </div>
              </div>
            ))}

            <div className="p-3.5 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-2">
              <p className="text-sm font-bold text-zinc-300 flex items-center space-x-1.5">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>Add a show you found yourself</span>
              </p>
              <p className="text-[13px] text-zinc-500 leading-relaxed">
                The best targets are shows your size that nobody has pitched yet. FutureBox does not scrape podcast
                directories — add the ones you find and they join the ranking.
              </p>
              <div className="flex gap-2">
                <input
                  value={ownTargetName}
                  onChange={(e) => setOwnTargetName(e.target.value)}
                  placeholder="Podcast name"
                  className="flex-1 bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={addOwnTarget}
                  className="px-3 py-2 rounded-lg text-sm font-bold bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {selectedPodcast ? (
              <div className="p-4 rounded-2xl bg-black/40 border border-zinc-800 space-y-3 sticky top-24">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-white">
                    {pitchFormat === 'email' ? 'Email draft' : 'DM draft'} → {selectedPodcast.name}
                  </p>
                  <CopyButton text={pitchBody} label="Copy draft" />
                </div>
                {pitchFormat === 'email' && (
                  <div className="text-[13px] font-mono text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                    Subject: {buildPitch(profile, selectedPodcast, 'email').subject}
                  </div>
                )}
                <textarea
                  value={pitchBody}
                  onChange={(e) => setPitchBody(e.target.value)}
                  className="w-full h-72 bg-black/60 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-200 font-mono leading-relaxed focus:outline-none focus:border-emerald-500"
                />
                <div className="flex items-start space-x-2 text-[13px] text-amber-300/90 bg-amber-950/20 border border-amber-500/30 rounded-xl p-2.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    Send this from your own account. FutureBox stores no addresses and mails nobody on your behalf —
                    an unsolicited pitch sent by a tool reads like spam and gets the channel blocked, not booked.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 text-center">
                <Mic className="w-7 h-7 text-zinc-700 mx-auto" />
                <p className="text-xs text-zinc-500 pt-2">Pick a show to draft a pitch.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TikTok Live                                                       */}
      {/* ---------------------------------------------------------------- */}
      {tab === 'live' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="flex items-center space-x-2">
              <Video className="w-4 h-4 text-rose-400" />
              <p className="text-xs font-bold text-white">@futurebox on TikTok — not created yet</p>
            </div>
            <p className="text-[13px] text-zinc-400 leading-relaxed">
              A live collab cannot be booked before the room exists, and TikTok gates LIVE behind follower and age
              minimums that change. Work the list, then invite a co-host.
            </p>
            <div className="space-y-1.5">
              {TIKTOK_LAUNCH_STEPS.map((step) => {
                const isDone = checked.includes(step.id);
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() =>
                      setChecked((prev) => (isDone ? prev.filter((c) => c !== step.id) : [...prev, step.id]))
                    }
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start space-x-2.5 ${
                      isDone ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isDone ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700'
                      }`}
                    >
                      {isDone && <Check className="w-3 h-3 text-onAccent" />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isDone ? 'text-emerald-300 line-through' : 'text-zinc-200'}`}>
                        {step.label}
                      </p>
                      <p className="text-[13px] text-zinc-500 leading-relaxed">{step.detail}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[13px] text-zinc-500 pt-1">
              {checked.length}/{TIKTOK_LAUNCH_STEPS.length} done
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-zinc-800 space-y-3">
            <p className="text-xs font-bold text-white flex items-center space-x-2">
              <ListChecks className="w-4 h-4 text-cyan-400" />
              <span>Live collab brief</span>
            </p>
            <div className="grid grid-cols-1 gap-2">
              <input
                value={coHost}
                onChange={(e) => setCoHost(e.target.value)}
                placeholder="Co-host handle (e.g. @someone)"
                className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                value={liveTopic}
                onChange={(e) => setLiveTopic(e.target.value)}
                placeholder="Topic (e.g. Build a track from a comment prompt)"
                className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                value={liveSlot}
                onChange={(e) => setLiveSlot(e.target.value)}
                placeholder="Slot (e.g. Thu 19:00 SAST / 17:00 UTC)"
                className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-zinc-500">Send this to your co-host before the room opens.</p>
              <CopyButton text={buildLiveBrief(profile, coHost, liveTopic, liveSlot)} label="Copy brief" />
            </div>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[13px] text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
              {buildLiveBrief(profile, coHost, liveTopic, liveSlot)}
            </pre>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Music flavour matching                                            */}
      {/* ---------------------------------------------------------------- */}
      {tab === 'flavour' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-400">Match against:</span>
            {TRACK_FLAVOURS.filter((t) => t.onChannel).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSourceId(t.id)}
                className={`px-2.5 py-1.5 rounded-xl text-sm font-bold border transition-all ${
                  sourceId === t.id
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-zinc-400">
            <span className="text-white font-bold">{source.title}</span>
            <span>{source.genre}</span>
            <span>{source.bpm} BPM</span>
            <span>{source.key}</span>
            <span className="text-cyan-300">{source.models.join(' + ')}</span>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {trackMatches.map(({ track, score, reasons, collabFormat, collabWhy }) => (
              <div key={track.id} className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-cyan-500/40 transition-all space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{track.title}</p>
                    <p className="text-[13px] text-zinc-500">
                      {track.handle} · {track.genre} · {track.bpm} BPM · {track.key}
                    </p>
                  </div>
                  <ScoreBar score={score} />
                </div>

                <ul className="space-y-0.5">
                  {reasons.map((r) => (
                    <li key={r} className="text-[13px] text-zinc-400 flex items-start space-x-1.5">
                      <span className="text-zinc-600 mt-0.5">·</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>

                <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/25">
                  <p className="text-sm font-bold text-cyan-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3 h-3" />
                    <span>{collabFormat}</span>
                  </p>
                  <p className="text-[13px] text-zinc-400 pt-0.5 leading-relaxed">{collabWhy}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">
                    {track.isDemo ? 'demo entry' : 'on channel'} · {track.models.join(', ')}
                  </span>
                  <CopyButton
                    text={`Collab idea: "${source.title}" × "${track.title}" — ${collabFormat}. ${collabWhy}`}
                    label="Copy idea"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Viral post lab                                                    */}
      {/* ---------------------------------------------------------------- */}
      {tab === 'posts' && (
        <div className="space-y-4">
          {/* Your accounts. Handles live in this browser and reach no server —
              there is none — so the panel says that rather than implying a
              connected account. */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-cyan-400" />
                Your channels
              </p>
              <button
                type="button"
                onClick={() => setShowConnectNote((v) => !v)}
                className="text-sm text-zinc-400 hover:text-white"
              >
                {showConnectNote ? 'Hide' : 'What would real posting take?'}
              </button>
            </div>

            {showConnectNote && (
              <div className="text-sm text-zinc-400 leading-relaxed bg-black/40 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                <p>
                  Posting to your account on your behalf is not a link — it is OAuth against each platform&apos;s API,
                  and every one of them gates that behind an approved developer app. That needs a backend FutureBox
                  does not have yet, plus a review queue measured in weeks. Per platform:
                </p>
                <ul className="space-y-0.5">
                  {SOCIAL_PLATFORMS.map((pf) => (
                    <li key={pf.id}>
                      <strong className="text-zinc-200">{pf.name}:</strong> {pf.connectRequires}
                    </li>
                  ))}
                </ul>
                <p>
                  Until then this does the part that is real: your handles become working links, and each post opens
                  that platform&apos;s own composer with the caption ready to paste.
                </p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SOCIAL_PLATFORMS.map((pf) => {
                const url = profileUrlFor(pf, handles[pf.id] ?? '');
                return (
                  <div key={pf.id} className="space-y-1">
                    <label className="text-sm text-zinc-400">{pf.name}</label>
                    <input
                      value={handles[pf.id] ?? ''}
                      onChange={(e) => {
                        const next = { ...handles, [pf.id]: e.target.value };
                        setHandles(next);
                        saveHandles(next);
                      }}
                      placeholder="handle or paste your profile URL"
                      className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                    />
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-cyan-400 hover:underline flex items-center gap-1 truncate"
                      >
                        {url.replace(/^https:\/\//, '')}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-zinc-500">Saved in this browser only. Clearing site data clears them.</p>
          </div>

          {/* FutureBox's own channels */}
          <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 space-y-2">
            <p className="text-sm font-bold text-white">FutureBox channels</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {FUTUREBOX_CHANNELS.map((ch) => {
                const pf = platformById(ch.platformId);
                const url = profileUrlFor(pf, ch.handle);
                return (
                  <div key={ch.platformId} className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <p className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      {pf.name} · @{ch.handle}
                      <span className={ch.live ? 'text-emerald-400' : 'text-amber-400'}>
                        {ch.live ? 'live' : 'not created yet'}
                      </span>
                    </p>
                    <p className="text-sm text-zinc-500">{ch.role}</p>
                    {ch.live && url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline">
                        Open
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Tag FutureBox in a post and the collab becomes findable — an untagged one is invisible to the channel
              that would boost it. A boost is a request to a person, not an automatic repost.
            </p>
          </div>

          {/* Compose */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400">Track</label>
              <select
                value={postTrackId}
                onChange={(e) => setPostTrackId(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {TRACK_FLAVOURS.filter((t) => t.onChannel).map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400">Post to</label>
              <select
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {SOCIAL_PLATFORMS.map((pf) => (
                  <option key={pf.id} value={pf.id}>{pf.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400">Collaborator (optional)</label>
              <input
                value={collaborator}
                onChange={(e) => setCollaborator(e.target.value)}
                placeholder="@their-handle"
                className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {!canPost && (
            <p className="text-sm text-amber-300/90 flex items-start gap-2 bg-amber-950/20 border border-amber-500/30 rounded-xl p-2.5">
              <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {ENTITLEMENTS['collab.post'].freeNote} Writing the caption, the hooks and the hashtags stays free —
                copy them and post yourself, or upgrade to do it from here and to ask the channel for a boost.
              </span>
            </p>
          )}

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={creditFuturebox}
              onChange={(e) => setCreditFuturebox(e.target.checked)}
              className="rounded border-zinc-700 text-emerald-500 focus:ring-0"
            />
            <span className="text-sm text-zinc-300">Credit {FUTUREBOX_TAG} in the caption</span>
          </label>

          <div className="grid md:grid-cols-2 gap-3">
            {posts.map((post, i) => {
              const caption = buildCaption(post.caption, post.hashtags, {
                creditFuturebox,
                collaborator,
              });
              return (
                <div key={i} className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/40 transition-all space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-emerald-300 leading-snug">{post.hook}</p>
                    <CopyButton text={caption} />
                  </div>
                  <pre className="text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{caption}</pre>
                  <p className="text-[13px] text-zinc-500 flex items-start gap-1.5 pt-1 border-t border-zinc-800/80">
                    <Users className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>{post.shotNote}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {canPost ? (
                      <a
                        href={shareUrlFor(platform, caption)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg text-sm font-semibold bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25 flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        {platform.shareIntent ? `Post on ${platform.name}` : `Open ${platform.name} composer`}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={onUpgrade}
                        className="px-2.5 py-1 rounded-lg text-sm font-semibold bg-amber-500/15 border border-amber-500/50 text-amber-300 hover:bg-amber-500/25 flex items-center gap-1.5"
                      >
                        <Lock className="w-3 h-3" />
                        Posting is Pro
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => (canBoost ? setBoostFor(caption) : onUpgrade())}
                      className="px-2.5 py-1 rounded-lg text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1.5"
                    >
                      {!canBoost && <Lock className="w-3 h-3 text-amber-400" />}
                      Ask FutureBox to boost
                    </button>
                  </div>
                  {!platform.shareIntent && (
                    <p className="text-[13px] text-zinc-600">
                      Copy the caption first — no public URL can attach your video for you.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {boostFor !== null && (
            <div className="rounded-2xl border border-cyan-500/40 bg-cyan-950/20 p-4 space-y-2.5">
              <p className="text-sm font-bold text-cyan-300">Boost request</p>
              <input
                value={boostUrl}
                onChange={(e) => setBoostUrl(e.target.value)}
                placeholder="Paste the link to your post once it is live"
                className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!boostUrl.trim()}
                  onClick={() => {
                    const next = [
                      ...boosts,
                      {
                        id: `${platform.id}-${boosts.length}`,
                        platformId: platform.id,
                        postUrl: boostUrl.trim(),
                        note: boostFor.slice(0, 120),
                        createdAt: new Date().toISOString(),
                      },
                    ];
                    setBoosts(next);
                    saveBoosts(next);
                    setBoostFor(null);
                    setBoostUrl('');
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-cyan-500/20 border border-cyan-500 text-cyan-200 disabled:opacity-40"
                >
                  Queue it
                </button>
                <button type="button" onClick={() => setBoostFor(null)} className="text-sm text-zinc-400 hover:text-white">
                  Cancel
                </button>
              </div>
              <p className="text-[13px] text-zinc-400 leading-relaxed">
                This queues locally. There is no backend to deliver it yet, and a boost is a person at the FutureBox end
                deciding to repost — so the queue is a to-do list, not a promise.
              </p>
            </div>
          )}

          {boosts.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 space-y-1.5">
              <p className="text-sm font-bold text-white">Queued for a boost · {boosts.length}</p>
              {boosts.map((b) => (
                <p key={b.id} className="text-sm text-zinc-400 truncate">
                  {platformById(b.platformId).name} — {b.postUrl}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
