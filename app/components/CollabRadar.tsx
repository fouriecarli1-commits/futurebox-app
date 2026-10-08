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
import Note from './Note';
import { useLang } from '../lib/i18n';
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
import { MOST, loadOwn, ownTarget, saveOwn, topicsFrom } from '../lib/radartargets';
import {
  matchPodcasts, buildPitch, buildLiveBrief, buildPosts,
  type CreatorProfile,
} from '../lib/matching';

type RadarTab = 'podcasts' | 'live' | 'posts';

function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
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
      className="min-h-[44px] px-2.5 py-1 rounded-lg text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 transition-all flex items-center space-x-1.5"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      <span>{copied ? done : label}</span>
    </button>
  );
}

/**
 * How well a show fits, or a dash where that cannot honestly be answered.
 *
 * `null` rather than nought, and the difference matters on the screen: a
 * nought-per-cent bar says "measured, and it is a bad fit", which is a
 * verdict on a show nothing has been measured about. A dash says nobody has
 * said what the show is about yet — see `lib/radartargets.ts` for the
 * percentage this used to draw from topics the panel invented.
 */
function ScoreBar({ score, none }: { score: number | null; none: string }) {
  if (score === null) {
    return (
      <div className="flex items-center justify-end min-w-[92px]">
        <span className="text-[13px] text-zinc-600" title={none}>—</span>
      </div>
    );
  }
  const pct = Math.round(score * 100);
  const tone = pct >= 70 ? 'bg-emerald-400' : pct >= 45 ? 'bg-cyan-400' : 'bg-zinc-600';
  return (
    <div className="flex items-center space-x-2 min-w-[92px]">
      <div className="h-1.5 flex-1 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full ${tone} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[13px] text-zinc-400 w-8 text-right">{pct}%</span>
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
  /* The room had no dictionary at all, which is why every word in it was
     English on an Afrikaans screen — and why `check:afrikaans` could not see
     it: that gate reads what `t()` is asked for, and nothing here asked. */
  const { t, lang } = useLang();
  const canPost = check('collab.post', userPlan).allowed;
  const canBoost = check('collab.boost', userPlan).allowed;
  const [tab, setTab] = useState<RadarTab>('podcasts');

  // Podcast outreach
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastTarget | null>(null);
  const [pitchFormat, setPitchFormat] = useState<'email' | 'dm'>('email');
  const [pitchBody, setPitchBody] = useState('');
  const [ownTargetName, setOwnTargetName] = useState('');
  const [ownTargetTopics, setOwnTargetTopics] = useState('');
  /* ── Kept between visits, which it was not ───────────────────────

     Carli's list, 7 October 2026: *"Kyk nog mooi na colab radar."* This was
     a plain `useState([])`, so every show she found, looked up and typed in
     was gone the next time the page loaded — and the panel's own note two
     hundred lines down says the best targets are shows nobody has pitched
     yet and that FutureBox does not scrape directories. Which makes this
     typed list the most valuable thing on the screen, and it was the one
     thing not saved. */
  const [ownTargets, setOwnTargets] = useState<readonly PodcastTarget[]>([]);

  // TikTok live planner
  const [checked, setChecked] = useState<string[]>([]);
  const [coHost, setCoHost] = useState('');
  const [liveTopic, setLiveTopic] = useState('');
  const [liveSlot, setLiveSlot] = useState('');

  /* Viral posts.
     The starting song is one of the maker's own where there is one. This
     used to be shared with the flavour matcher, which is gone; the post lab
     is a different thing and keeps its own. */
  const myTracks = TRACK_FLAVOURS.filter((t) => t.handle === profile.handle);
  const [postTrackId, setPostTrackId] = useState((myTracks[0] ?? TRACK_FLAVOURS[0]).id);
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
    setOwnTargets(loadOwn());
  }, []);

  const allTargets = useMemo(() => [...PODCAST_TARGETS, ...ownTargets], [ownTargets]);
  /* The verdict sentences are written in `lib/matching.ts`, which has no
     hook to reach the dictionary with, so the language goes in as an
     argument. Without it three English sentences sat on an otherwise
     Afrikaans screen — the ones a person actually reads to decide whether to
     write to a show. */
  const podcastMatches = useMemo(
    () => matchPodcasts(profile, allTargets, lang),
    [profile, allTargets, lang],
  );
  const postTrack = TRACK_FLAVOURS.find((t) => t.id === postTrackId) as TrackFlavour;
  const platform = platformById(platformId);
  const posts = useMemo(() => buildPosts(postTrack, platform), [postTrack, platform]);

  const openPitch = (podcast: PodcastTarget, format: 'email' | 'dm') => {
    setSelectedPodcast(podcast);
    setPitchFormat(format);
    setPitchBody(buildPitch(profile, podcast, format).body);
  };

  const addOwnTarget = () => {
    const made = ownTarget({
      name: ownTargetName,
      topics: topicsFrom(ownTargetTopics),
      audience: t('radar.unknown', 'Unknown'),
    });
    if (!made) return;
    setOwnTargets((prev) => {
      const next = [...prev, made].slice(-MOST);
      saveOwn(next);
      return next;
    });
    setOwnTargetName('');
    setOwnTargetTopics('');
  };

  /* Taken off the list, and off the device with it. A remove that leaves the
     row in storage comes back on the next load, which reads as the panel
     refusing to let go of a show she decided against. */
  const dropOwnTarget = (id: string) => {
    setOwnTargets((prev) => {
      const next = prev.filter((one) => one.id !== id);
      saveOwn(next);
      return next;
    });
    setSelectedPodcast((now) => (now?.id === id ? null : now));
  };

  const tabs: Array<{ id: RadarTab; label: string; icon: typeof Mic }> = [
    { id: 'podcasts', label: t('radar.tab.podcasts', 'Podcast Match'), icon: Mic },
    { id: 'live', label: t('radar.tab.live', 'TikTok Live Room'), icon: Radio },
    { id: 'posts', label: t('radar.tab.posts', 'Viral Post Lab'), icon: Flame },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* `min-w-0`, because the clipped line inside `Note` only clips when
            its ancestors let it. A flex item defaults to `min-width: auto`,
            which is the width of its longest unbreakable content — so the
            truncation did nothing and the header pushed the room 840 pixels
            wide. Found by `check:wide` in the same commit that added it. */}
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-extrabold text-white flex items-center space-x-2">
            <Handshake className="w-4 h-4 text-cyan-400" />
            <span>{t('radar.heading', "Collab Radar")}</span>
          </h4>
          {/* How the room works, on the same terms as every other explanation
              in this app: one clipped line and a mark on a phone. It was four
              lines of grey above the first match, in the room whose whole job
              is the matches. */}
          <Note className="text-sm text-zinc-400 max-w-2xl leading-relaxed pt-1">
            {t('radar.how', 'Matches are worked out from what you have released — {genres} — and scored on tempo, key and shared subjects. Nothing here contacts anybody: every pitch is a draft you read, edit and send yourself.')
              .replace('{genres}', profile.genres.join(', ') || t('radar.noReleases', 'nothing released yet'))}
          </Note>
        </div>
        <div className="text-[13px] text-zinc-500 bg-zinc-900/80 border border-zinc-800 rounded-lg px-2.5 py-1.5">
          {/* One follower is not "1 followers". The count decides the word,
              which is the sort of thing that reads as a machine wrote the
              page — and in Afrikaans the two words differ as well. */}
          {profile.handle} · {profile.followers.toLocaleString()}{' '}
          {profile.followers === 1
            ? t('radar.follower', 'follower')
            : t('radar.followers', 'followers')}
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
              /* Says which one is on, to a screen reader and to anything else
                 reading the page — including the width probe, which uses it to
                 tell a tab from a button that spends money. */
              aria-pressed={isActive}
              onClick={() => setTab(t.id)}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-sm font-bold flex items-center space-x-1.5 border transition-all ${
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
        <div className="grid lg:grid-cols-2 gap-4 [&>*]:min-w-0">
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
                    {/* A real show keeps its own name in both languages —
                        translating "Huberman Lab" would invent a thing that
                        does not exist. Nothing here is ours to translate any
                        more: the three `[Your target]` rows that were came
                        out on 8 October, and a show she typed in is in
                        whatever language she typed it. */}
                    <p className="text-xs font-bold text-white truncate">
                      {podcast.name}
                    </p>
                    {/* Joined with the middle dot only where there is
                        something either side of it. A show she typed in has
                        a name and nothing else yet, and `· · Unknown` under
                        it reads as a row that failed to load. */}
                    <p className="text-[13px] text-zinc-500">
                      {[podcast.host, podcast.format, podcast.audience]
                        .map((one) => one.trim())
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <ScoreBar
                    score={score}
                    none={t('radar.noScore', 'Nothing has been said about this show yet, so there is nothing to measure.')}
                  />
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
                    {t(`radar.reach.${podcast.reach}`, REACH_LABELS[podcast.reach])}
                  </span>
                  {shared.slice(0, 4).map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-md text-xs text-zinc-400 border border-zinc-800 bg-zinc-950">
                      {s}
                    </span>
                  ))}
                  {/* Her own rows say so, and can be taken off again. Mine
                      is a show she looked up and typed in; the five above
                      are ours and are not hers to delete. */}
                  {podcast.id.startsWith('own-') && (
                    <>
                      <span className="px-2 py-0.5 rounded-md text-xs text-cyan-300 border border-cyan-500/30 bg-cyan-500/10">
                        {t('radar.yours', 'yours')}
                      </span>
                      <button
                        type="button"
                        data-radardrop={podcast.id}
                        onClick={() => dropOwnTarget(podcast.id)}
                        className="px-2 py-0.5 rounded-md text-xs text-zinc-500 border border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:text-zinc-300"
                      >
                        {t('radar.dropShow', 'Take it off')}
                      </button>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => openPitch(podcast, 'email')}
                    className="px-3 py-2.5 min-h-[40px] rounded-lg text-sm font-bold bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25 transition-all flex items-center space-x-1.5"
                  >
                    <Send className="w-3 h-3" />
                    <span>{t('radar.draftEmail', "Draft email")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPitch(podcast, 'dm')}
                    className="px-3 py-2.5 min-h-[40px] rounded-lg text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 transition-all"
                  >
                    {t('radar.draftDm', 'Draft DM')}
                  </button>
                  {podcast.url && (
                    <a
                      href={podcast.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 min-h-[40px] rounded-lg text-sm text-zinc-400 hover:text-cyan-300 flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{t('radar.findContact', "Find their contact page")}</span>
                    </a>
                  )}
                </div>
              </div>
            ))}

            <div className="p-3.5 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-2">
              <p className="text-sm font-bold text-zinc-300 flex items-center space-x-1.5">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('radar.addShow', "Add a show you found yourself")}</span>
              </p>
              <Note className="text-[13px] text-zinc-500 leading-relaxed">
                {t(
                  'radar.addShowWhy',
                  'The best targets are shows your size that nobody has pitched yet. FutureBox does not scrape podcast directories — add the ones you find and they join the ranking.',
                )}
              </Note>
              <input
                value={ownTargetName}
                data-radarname
                onChange={(e) => setOwnTargetName(e.target.value)}
                placeholder={t('radar.showName', 'Podcast name')}
                className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              {/* ── What it is about, which used to be invented ───────────

                  A show added here arrived with `['ai music', 'ai',
                  'creators']` written into the panel, whatever the show was
                  about, and the matcher then scored it against those three
                  and drew a percentage beside it. An Afrikaans theatre
                  podcast is not a weak match on "ai music" — it is not a
                  match at all, and the screen said 34%.

                  Typed, and empty means no score rather than a made-up
                  one. `lib/radartargets.ts` says why. */}
              <input
                value={ownTargetTopics}
                data-radartopics
                onChange={(e) => setOwnTargetTopics(e.target.value)}
                placeholder={t('radar.showTopics', 'What it is about — theatre, Afrikaans music, comedy')}
                className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                data-radaradd
                onClick={addOwnTarget}
                className="min-h-[44px] w-full px-3 py-2 rounded-lg text-sm font-bold bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center justify-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>{t('radar.add', 'Add it to the list')}</span>
              </button>
              <p className="text-[13px] text-zinc-500 leading-relaxed">
                {t(
                  'radar.addShowKept',
                  'Your list is kept on this device, so it is here the next time you open the Radar. Separate your topics with commas.',
                )}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {selectedPodcast ? (
              <div className="p-4 rounded-2xl bg-black/40 border border-zinc-800 space-y-3 sticky top-24">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-white">
                    {pitchFormat === 'email'
                      ? t('radar.headEmail', 'Email draft')
                      : t('radar.headDm', 'DM draft')} → {selectedPodcast.name}
                  </p>
                  <CopyButton
                    text={pitchBody}
                    label={t('radar.copyDraft', 'Copy draft')}
                    done={t('radar.copied', 'Copied')}
                  />
                </div>
                {pitchFormat === 'email' && (
                  <div className="text-[13px] text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                    {t('radar.subject', 'Subject')}: {buildPitch(profile, selectedPodcast, 'email').subject}
                  </div>
                )}
                <textarea
                  value={pitchBody}
                  onChange={(e) => setPitchBody(e.target.value)}
                  className="w-full h-72 bg-black/60 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-200 leading-relaxed focus:outline-none focus:border-emerald-500"
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
                <p className="text-xs text-zinc-500 pt-2">{t('radar.pickShow', "Pick a show to draft a pitch.")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TikTok Live                                                       */}
      {/* ---------------------------------------------------------------- */}
      {tab === 'live' && (
        <div className="grid lg:grid-cols-2 gap-4 [&>*]:min-w-0">
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
              <span>{t('radar.liveBrief', "Live collab brief")}</span>
            </p>
            <div className="grid grid-cols-1 gap-2 [&>*]:min-w-0">
              <input
                value={coHost}
                onChange={(e) => setCoHost(e.target.value)}
                placeholder={t("radar.coHost", "Co-host handle (e.g. @someone)")}
                className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                value={liveTopic}
                onChange={(e) => setLiveTopic(e.target.value)}
                placeholder={t("radar.topic", "Topic (e.g. Build a track from a comment prompt)")}
                className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                value={liveSlot}
                onChange={(e) => setLiveSlot(e.target.value)}
                placeholder={t("radar.slot", "Slot (e.g. Thu 19:00 SAST / 17:00 UTC)")}
                className="bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-zinc-500">{t('radar.sendBrief', "Send this to your co-host before the room opens.")}</p>
              <CopyButton
                text={buildLiveBrief(profile, coHost, liveTopic, liveSlot)}
                label={t('radar.copyBrief', 'Copy brief')}
                done={t('radar.copied', 'Copied')}
              />
            </div>
            <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
              {buildLiveBrief(profile, coHost, liveTopic, liveSlot)}
            </pre>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Music flavour matching                                            */}
      {/* ---------------------------------------------------------------- */}
      {/* Music flavour matching: gone, 24 September 2026                   */}
      {/* ---------------------------------------------------------------- */}
      {/*
          It matched a fixed list of demo songs in `app/data/studio.ts`
          against the same fixed list. Names, scores, reasons and a suggested
          collaboration format — drawn exactly like a real result, and not
          one of them anybody with an account.

          The real one is `CollabFinder`, above this on the same screen. It
          reads songs members have chosen to share — tempo, key, the style
          words — through `/api/radar`, opt-in per song and reversible.

          So this was not a lesser version of that. It was a screen full of
          people who do not exist, beside a screen of people who do, with
          nothing on either to tell them apart. Asked what to do with it, she
          said take it out. The podcast pitching, the live brief and the post
          lab are untouched: those never pretended to be a roomful of
          strangers.
      */}

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
                {t('radar.yourChannels', 'Your channels')}
              </p>
              <button
                type="button"
                onClick={() => setShowConnectNote((v) => !v)}
                className="text-sm text-zinc-400 hover:text-white"
              >
                {showConnectNote
                  ? t('radar.hide', 'Hide')
                  : t('radar.whatPosting', 'What would real posting take?')}
              </button>
            </div>

            {showConnectNote && (
              <div className="text-sm text-zinc-400 leading-relaxed bg-black/40 border border-zinc-800 rounded-xl p-3 space-y-1.5">
                <p>
                  Every platform makes an app apply, and be approved, before it may post on your behalf — so nothing
                  posts anywhere without you. Here is what each one asks for:
                </p>
                <ul className="space-y-0.5">
                  {SOCIAL_PLATFORMS.map((pf) => (
                    <li key={pf.id}>
                      <strong className="text-zinc-200">{pf.name}:</strong> {pf.connectRequires}
                    </li>
                  ))}
                </ul>
                <p>
                  In the meantime your handles become working links, and each post opens that platform with the caption
                  ready to paste.
                </p>
              </div>
            )}

            {/* The fields themselves are on the profile now, which is where
                somebody looks for their own names. One set, in one place: two
                editors over one storage key is how the two quietly disagree
                about what was saved last. What stays here is what this room
                needs — which of them are filled in, and a way to get to the
                rest. */}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
              {SOCIAL_PLATFORMS.map((pf) => {
                const url = profileUrlFor(pf, handles[pf.id] ?? '');
                return (
                  <div
                    key={pf.id}
                    className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-400">{pf.name}</span>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-shrink-0 items-center gap-1 text-sm text-emerald-400 hover:underline"
                      >
                        {handles[pf.id]}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="flex-shrink-0 text-sm text-zinc-600">
                        {t('radar.notSet', 'not set')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-zinc-500 leading-snug">
              {t('radar.handlesOnProfile', 'These are set on your profile, under “Where else you are”.')}
            </p>
            <p className="text-sm text-zinc-500">{t('radar.onDevice', "Saved on this device.")}</p>
          </div>

          {/* FutureBox's own channels */}
          <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 space-y-2">
            <p className="text-sm font-bold text-white">{t('radar.channels', "FutureBox channels")}</p>
            <div className="grid sm:grid-cols-2 gap-2 [&>*]:min-w-0">
              {FUTUREBOX_CHANNELS.map((ch) => {
                const pf = platformById(ch.platformId);
                const url = profileUrlFor(pf, ch.handle);
                return (
                  <div key={ch.platformId} className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <p className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                      {pf.name} · @{ch.handle}
                      <span className={ch.live ? 'text-emerald-400' : 'text-amber-400'}>
                        {ch.live ? t('radar.chLive', 'live') : t('radar.chSoon', 'not created yet')}
                      </span>
                    </p>
                    <p className="text-sm text-zinc-500">{ch.role}</p>
                    {ch.live && url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-400 hover:underline">
                        {t('radar.open', 'Open')}
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
          <div className="grid sm:grid-cols-3 gap-3 [&>*]:min-w-0">
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400">{t('radar.track', "Track")}</label>
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
              <label className="text-sm text-zinc-400">{t('radar.postTo', "Post to")}</label>
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
              <label className="text-sm text-zinc-400">{t('radar.collaborator', "Collaborator (optional)")}</label>
              <input
                value={collaborator}
                onChange={(e) => setCollaborator(e.target.value)}
                placeholder={t("radar.theirHandle", "@their-handle")}
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

          <div className="grid md:grid-cols-2 gap-3 [&>*]:min-w-0">
            {posts.map((post, i) => {
              const caption = buildCaption(post.caption, post.hashtags, {
                creditFuturebox,
                collaborator,
              });
              return (
                <div key={i} className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/40 transition-all space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-emerald-300 leading-snug">{post.hook}</p>
                    <CopyButton
                      text={caption}
                      label={t('radar.copy', 'Copy')}
                      done={t('radar.copied', 'Copied')}
                    />
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
                        {platform.shareIntent
                          ? t('radar.postOn', 'Post on {where}').replace('{where}', platform.name)
                          : t('radar.openComposer', 'Open the {where} composer').replace('{where}', platform.name)}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={onUpgrade}
                        className="min-h-[44px] px-2.5 py-1 rounded-lg text-sm font-semibold bg-amber-500/15 border border-amber-500/50 text-amber-300 hover:bg-amber-500/25 flex items-center gap-1.5"
                      >
                        <Lock className="w-3 h-3" />
                        {t('radar.postingPro', 'Posting is Pro')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => (canBoost ? setBoostFor(caption) : onUpgrade())}
                      className="min-h-[44px] px-2.5 py-1 rounded-lg text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1.5"
                    >
                      {!canBoost && <Lock className="w-3 h-3 text-amber-400" />}
                      {t('radar.askBoost', 'Ask FutureBox to boost')}
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
              <p className="text-sm font-bold text-cyan-300">{t('radar.boostRequest', "Boost request")}</p>
              <input
                value={boostUrl}
                onChange={(e) => setBoostUrl(e.target.value)}
                placeholder={t("radar.boostUrl", "Paste the link to your post once it is live")}
                className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!boostUrl.trim()}
                  /* Off until there is a link, because a boost request with
                     nothing to boost is not a request. Said rather than left
                     grey — the third greyed-out control found by pressing
                     everything, and all three read as broken. */
                  title={!boostUrl.trim() ? t('radar.needsLink', 'Paste the link to your post first.') : undefined}
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
                  className="min-h-[44px] px-3 py-1.5 rounded-lg text-sm font-semibold bg-cyan-500/20 border border-cyan-500 text-cyan-200 disabled:opacity-40"
                >
                  {t('radar.queueIt', "Queue it")}
                </button>
                <button type="button" onClick={() => setBoostFor(null)} className="text-sm text-zinc-400 hover:text-white">
                  {t('radar.cancel', "Cancel")}
                </button>
              </div>
              <p className="text-[13px] text-zinc-400 leading-relaxed">
                {t('radar.byHand', "We look at boost requests by hand, so this is a request rather than an automatic repost.")}
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
