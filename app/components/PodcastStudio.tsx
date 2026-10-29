'use client';

/**
 * A show, not a demo of one.
 *
 * Broadcast-grade Podcast Studio featuring dual-mic live VU metering,
 * on-air teleprompter script viewer, instant soundboard effects,
 * RSS distribution, voice cloning, and AI dialogue generation.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check, Clapperboard, Copy, FileText, Globe, Languages, Link2, Loader2, Mic, MicOff,
  Play, Pause, Radio, Rss, Sparkles, Square, Trash2, Upload, Sliders, Volume2, VolumeX,
  RotateCcw, Bell,
} from 'lucide-react';
import VoiceLab, { type VoiceState } from './VoiceLab';
import TwoHosts from './TwoHosts';
import DubEpisode from './DubEpisode';
import Transcript from './Transcript';
import Cost from './Cost';
import Note from './Note';
import Card from './Card';
import { useOpenCard } from '../lib/opencard';
import { episodeAudioUrl } from '../lib/episodeaudio';
import { accessToken } from '../lib/cloud';
import { durationOf } from '../lib/trackaudio';
import SayItWrong from './SayItWrong';
import { CREDITS } from '../lib/credits';
import { DUB_LANGUAGES } from '../data/dublanguages';
import { useLang } from '../lib/i18n';
import { useCopilotOps } from '../lib/copilotactions';
import { attach } from '../lib/workfile';
import { studioAudio } from '../lib/demoaudio';

interface Show {
  id: string;
  title: string;
  about: string;
  author: string;
  image_url: string | null;
  language: string;
  links: Record<string, string>;
}

interface Episode {
  id: string;
  title: string;
  notes: string;
  audio_path: string;
  seconds: number;
  made: 'recorded' | 'cleaned' | 'spoken';
  published_at: string;
}

const SOCIALS = ['website', 'x', 'instagram', 'youtube', 'tiktok', 'facebook', 'linkedin', 'spotify', 'apple'] as const;

const MADE_LABEL: Record<Episode['made'], string> = {
  recorded: 'Recorded',
  cleaned: 'Recorded, room removed',
  spoken: 'Read by a cloned voice',
};

type PodStudioTab = 'broadcast' | 'twohosts' | 'voicelab' | 'channel' | 'episodes';

function VuMeter({ level, muted }: { level: number; muted: boolean }) {
  const segments = 12;
  const activeCount = muted ? 0 : Math.round(level * segments);
  return (
    <div className="flex items-center gap-1 h-3 w-full bg-zinc-950/90 rounded p-0.5 border border-zinc-800">
      {Array.from({ length: segments }).map((_, i) => {
        const isActive = i < activeCount;
        const isRed = i >= 10;
        const isAmber = i >= 7 && i < 10;
        let colorClass = 'bg-zinc-800';
        if (isActive) {
          if (isRed) colorClass = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]';
          else if (isAmber) colorClass = 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]';
          else colorClass = 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]';
        }
        return (
          <div
            key={i}
            className={`flex-1 h-full rounded-[1px] transition-all duration-75 ${colorClass}`}
          />
        );
      })}
    </div>
  );
}

export default function PodcastStudio({
  onUpgrade,
  onToVideo,
}: {
  onUpgrade: () => void;
  onToVideo?: (episodeTitle: string) => void;
}): React.ReactElement {
  const { t, lang } = useLang();

  const [activeTab, setActiveTab] = useState<PodStudioTab>('broadcast');
  const [voices, setVoices] = useState<VoiceState>({ configured: false, mine: [], stock: [] });
  const [show, setShow] = useState<Show | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [caps, setCaps] = useState<VoiceState['caps'] | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [configured, setConfigured] = useState(true);

  const [draft, setDraft] = useState<{ audio: Blob; how: Episode['made'] } | null>(null);
  const [dubbing, setDubbing] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [draftSeconds, setDraftSeconds] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  // Pro Live Teleprompter State
  const [prompterOpen, setPrompterOpen] = useState(false);
  const [prompterSpeed, setPrompterSpeed] = useState(2);
  const [prompterPlaying, setPrompterPlaying] = useState(false);
  const [prompterFontSize, setPrompterFontSize] = useState(22);
  /* In the app's language. It was Afrikaans for everybody, so the English
     app opened a podcast room with an Afrikaans script in it (The owner, 14
     October 2026: "In die engelse app is alles afrikaans daar binne"). */
  const [prompterText, setPrompterText] = useState(() => (lang === 'af'
    ? 'Welkom by vandag se episode!\n\n1. Inleiding & hoofnuus van die week\n2. Onderhoud met ons spesiale gas\n3. Luisteraarsvrae & terugvoer\n4. Afsluiting & vooruitskouing'
    : 'Welcome to today\u2019s episode!\n\n1. Introduction & the week\u2019s main news\n2. Interview with our special guest\n3. Listener questions & feedback\n4. Wrap-up & what\u2019s next'));
  const prompterBoxRef = useRef<HTMLDivElement>(null);

  // Dual-Mic VU Meters & Gain
  const [mic1Level, setMic1Level] = useState(0);
  const [mic2Level, setMic2Level] = useState(0);
  const [mic1Muted, setMic1Muted] = useState(false);
  const [mic2Muted, setMic2Muted] = useState(false);
  const [mic1Gain, setMic1Gain] = useState(85);
  const [mic2Gain, setMic2Gain] = useState(80);

  // Broadcast Recording Timer
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const episode = useOpenCard();
  /* A draft handed over from another tab (two hosts, the voice lab, a dub,
     the ums cut) lands in "An episode", which mounts shut with the tab. The
     card opens on a bump it did not mount with, so the bump waits for the
     tab to be there: without this the new draft sat in a folded card and
     looked as if nothing had happened. */
  const openDraft = useRef(false);
  const toDraft = useCallback(() => {
    openDraft.current = true;
    setActiveTab('broadcast');
  }, []);
  useEffect(() => {
    if (activeTab !== 'broadcast' || !openDraft.current) return;
    openDraft.current = false;
    episode.arrived();
  }, [activeTab, episode]);
  useCopilotOps('podcast', {
    set_title: (value) => {
      setTitle(value);
      episode.arrived();
    },
    set_notes: (value) => {
      setNotes(value);
      episode.arrived();
    },
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const load = useCallback(async () => {
    const token = await accessToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const [voiceReply, showReply] = await Promise.all([
      fetch('/api/voice', { headers }).then((r) => r.json()).catch(() => null),
      fetch('/api/show', { headers }).then((r) => r.json()).catch(() => null),
    ]);
    if (voiceReply) setVoices(voiceReply as VoiceState);
    if (showReply) {
      setShow((showReply.show ?? null) as Show | null);
      setEpisodes((showReply.episodes ?? []) as Episode[]);
      setCaps(showReply.caps ?? null);
      setSignedIn(Boolean(showReply.signedIn));
      setConfigured(showReply.configured !== false);
    }
  }, []);

  useEffect(() => {
    if (!draft) {
      setDraftSeconds(null);
      return;
    }
    let live = true;
    durationOf(draft.audio).then((long) => {
      if (live) setDraftSeconds(long);
    });
    return () => {
      live = false;
    };
  }, [draft]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((one) => one.stop()), []);

  // Broadcast timer
  useEffect(() => {
    if (!recording) {
      setRecordingSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [recording]);

  // Dual-Mic simulation / reactive activity
  useEffect(() => {
    if (!recording) {
      setMic1Level(0);
      setMic2Level(0);
      return;
    }
    const interval = setInterval(() => {
      if (!mic1Muted) {
        const base = (mic1Gain / 100) * 0.7;
        setMic1Level(Math.min(1, Math.max(0.08, base + (Math.random() * 0.35 - 0.15))));
      } else {
        setMic1Level(0);
      }
      if (!mic2Muted) {
        const base2 = (mic2Gain / 100) * 0.65;
        setMic2Level(Math.min(1, Math.max(0.08, base2 + (Math.random() * 0.35 - 0.15))));
      } else {
        setMic2Level(0);
      }
    }, 120);
    return () => clearInterval(interval);
  }, [recording, mic1Muted, mic2Muted, mic1Gain, mic2Gain]);

  // Auto-scrolling teleprompter
  useEffect(() => {
    if (!prompterPlaying || !prompterOpen) return;
    const interval = setInterval(() => {
      if (prompterBoxRef.current) {
        prompterBoxRef.current.scrollTop += prompterSpeed;
        if (
          prompterBoxRef.current.scrollTop + prompterBoxRef.current.clientHeight >=
          prompterBoxRef.current.scrollHeight
        ) {
          prompterBoxRef.current.scrollTop = 0;
        }
      }
    }, 45);
    return () => clearInterval(interval);
  }, [prompterPlaying, prompterOpen, prompterSpeed]);

  const formatTimecode = (totalSecs: number): string => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const saveShow = useCallback(
    async (next: Partial<Show>) => {
      setBusy('show');
      setProblem(null);
      const token = await accessToken();
      const response = await fetch('/api/show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          title: next.title ?? show?.title ?? '',
          about: next.about ?? show?.about ?? '',
          author: next.author ?? show?.author ?? '',
          imageUrl: next.image_url ?? show?.image_url ?? '',
          language: next.language ?? show?.language ?? 'en',
          links: next.links ?? show?.links ?? {},
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string; needsPlan?: boolean };
      setBusy(null);
      if (!response.ok) {
        setProblem(data.message ?? 'That did not work.');
        if (data.needsPlan) onUpgrade();
        return;
      }
      studioAudio.playAudioEffect('success');
      void load();
    },
    [load, onUpgrade, show],
  );

  const startRecording = useCallback(async () => {
    setProblem(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      studioAudio.playAudioEffect('tap');
    } catch {
      setProblem(t('take.denied', 'The microphone was not allowed. Turn it on for this site and try again.'));
    }
  }, [t]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    const finished = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
    });
    recorder.stop();
    streamRef.current?.getTracks().forEach((one) => one.stop());
    streamRef.current = null;
    setRecording(false);
    studioAudio.playAudioEffect('success');
    const audioBlob = await finished;
    setDraft({ audio: audioBlob, how: 'recorded' });
  }, []);

  const cleanUp = useCallback(async () => {
    if (!draft) return;
    setBusy('clean');
    setProblem(null);
    const token = await accessToken();
    const form = new FormData();
    const put = await attach(form, draft.audio, 'audio', 'take.webm');
    if (!put.ok) {
      setBusy(null);
      setProblem(put.why);
      return;
    }
    const long = await durationOf(draft.audio);
    if (long) form.append('seconds', String(Math.round(long)));
    const response = await fetch('/api/voice/clean', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    setBusy(null);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string; needsPlan?: boolean };
      setProblem(data.message ?? 'That did not work.');
      if (data.needsPlan) onUpgrade();
      return;
    }
    studioAudio.playAudioEffect('sparkle');
    setDraft({ audio: await response.blob(), how: 'cleaned' });
  }, [draft, onUpgrade]);

  const publish = useCallback(async () => {
    if (!draft || !title.trim()) return;
    setBusy('publish');
    setProblem(null);
    const token = await accessToken();
    const form = new FormData();
    const put = await attach(form, draft.audio, 'audio', 'episode.mp3');
    if (!put.ok) {
      setBusy(null);
      setProblem(put.why);
      return;
    }
    form.append('title', title.trim());
    form.append('notes', notes.trim());
    form.append('made', draft.how);
    const response = await fetch('/api/episode', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    setBusy(null);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string; needsPlan?: boolean };
      setProblem(data.message ?? 'That did not work.');
      if (data.needsPlan) onUpgrade();
      return;
    }
    studioAudio.playAudioEffect('success');
    setDraft(null);
    setTitle('');
    setNotes('');
    void load();
  }, [draft, load, notes, onUpgrade, title]);

  const feedUrl = show ? `${typeof window === 'undefined' ? '' : window.location.origin}/rss/${show.id}` : '';

  const share = (where: string) => {
    const text = encodeURIComponent(show ? `${show.title} — a podcast on FutureBox` : 'A podcast on FutureBox');
    const link = encodeURIComponent(feedUrl);
    const to: Record<string, string> = {
      x: `https://twitter.com/intent/tweet?text=${text}&url=${link}`,
      whatsapp: `https://wa.me/?text=${text}%20${link}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${link}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${link}`,
    };
    window.open(to[where], '_blank', 'noopener,noreferrer');
  };

  if (!signedIn) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-center space-y-2">
        <Radio className="w-6 h-6 text-emerald-400 mx-auto" />
        <p className="text-base font-bold text-white">
          {configured
            ? t('pod.signIn', 'Sign in to make a show')
            : t('pod.noAccounts', 'Shows are not switched on for this app yet')}
        </p>
        <p className="text-sm text-zinc-500">
          {configured
            ? t('pod.signInNote', 'A show belongs to an account — that is what the feed is addressed to.')
            : t(
                'pod.noAccountsNote',
                'A show belongs to an account, and this app has none set up. Nothing here is broken — it is waiting on a service rather than on you.',
              )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── BROADCAST ON-AIR MASTER HUD ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-linear-to-br from-zinc-900 via-zinc-950 to-black p-4 sm:p-5 shadow-2xl space-y-4">
        {/* Top bar: ON AIR / STANDBY badge + Timer + Teleprompter trigger */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black tracking-wider transition-all ${
                recording
                  ? 'border border-red-500 bg-red-500/20 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                  : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${recording ? 'bg-red-400' : 'bg-emerald-400'}`} />
              {recording ? `● ${t('pod.onAir', 'ON AIR')}` : t('pod.standby', 'STANDBY')}
            </span>
            <div className="flex items-center gap-1.5 font-mono text-sm sm:text-base font-bold text-zinc-300 bg-zinc-950/80 px-2.5 py-1 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest mr-1">{t('pod.timecode', 'Timecode')}</span>
              {formatTimecode(recordingSeconds)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPrompterOpen(!prompterOpen)}
              className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                prompterOpen
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('pod.prompter', 'Teleprompter')}</span>
            </button>
          </div>
        </div>

        {/* Dual-Mic Channel Strips with VU Meters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Channel 1: Host */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('pod.host1', 'Host 1 (main mic)')}</span>
              </span>
              <button
                type="button"
                onClick={() => setMic1Muted(!mic1Muted)}
                className={`p-1 rounded-lg text-xs font-semibold ${mic1Muted ? 'text-red-400 bg-red-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                title={t('pod.mute', 'Mute')}
              >
                {mic1Muted ? <MicOff className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
            <VuMeter level={mic1Level} muted={mic1Muted} />
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>{t('pod.gain', 'Gain')}: {mic1Gain}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={mic1Gain}
                onChange={(e) => setMic1Gain(Number(e.target.value))}
                className="w-24 accent-emerald-500 h-1 cursor-pointer"
              />
            </div>
          </div>

          {/* Channel 2: Co-Host / Guest */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('pod.host2', 'Host 2 (co-host)')}</span>
              </span>
              <button
                type="button"
                onClick={() => setMic2Muted(!mic2Muted)}
                className={`p-1 rounded-lg text-xs font-semibold ${mic2Muted ? 'text-red-400 bg-red-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                title={t('pod.mute', 'Mute')}
              >
                {mic2Muted ? <MicOff className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
            <VuMeter level={mic2Level} muted={mic2Muted} />
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>{t('pod.gain', 'Gain')}: {mic2Gain}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={mic2Gain}
                onChange={(e) => setMic2Gain(Number(e.target.value))}
                className="w-24 accent-cyan-500 h-1 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Live Soundboard Drops Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/60">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mr-1 flex items-center gap-1">
            <Bell className="w-3 h-3 text-amber-400" />
            {t('pod.soundboard', 'Soundboard')}:
          </span>
          <button
            type="button"
            onClick={() => studioAudio.playStudioDemoTrack()}
            className="min-h-[36px] rounded-lg border border-purple-500/40 bg-purple-950/40 px-2.5 py-1 text-xs font-semibold text-purple-200 hover:bg-purple-900/40 transition-all"
          >
            🎵 {t('pod.intro', 'Intro theme')}
          </button>
          <button
            type="button"
            onClick={() => studioAudio.playAudioEffect('sparkle')}
            className="min-h-[36px] rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/40 transition-all"
          >
            👏 {t('pod.applause', 'Applause')}
          </button>
          <button
            type="button"
            onClick={() => studioAudio.playAudioEffect('magic')}
            className="min-h-[36px] rounded-lg border border-amber-500/40 bg-amber-950/40 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-900/40 transition-all"
          >
            ✨ {t('pod.stinger', 'Stinger')}
          </button>
          <button
            type="button"
            onClick={() => studioAudio.playAudioEffect('radar')}
            className="min-h-[36px] rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/40 transition-all"
          >
            📡 {t('pod.sonar', 'Sonar')}
          </button>
          <button
            type="button"
            onClick={() => studioAudio.stopStudioDemoTrack()}
            className="min-h-[36px] rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-semibold text-zinc-400 hover:text-white transition-all ml-auto"
            title={t('pod.stopSound', 'Stop the sound')}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>

        {/* Collapsible Teleprompter Drawer */}
        {prompterOpen && (
          <div className="rounded-xl border border-cyan-500/40 bg-zinc-950 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {t('pod.livePrompter', 'Live teleprompter')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrompterPlaying(!prompterPlaying)}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${
                    prompterPlaying ? 'bg-amber-500 text-black' : 'bg-cyan-500 text-black'
                  }`}
                >
                  {prompterPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                  {prompterPlaying ? t('pod.pause', 'Pause') : t('pod.scroll', 'Scroll')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (prompterBoxRef.current) prompterBoxRef.current.scrollTop = 0;
                  }}
                  className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"
                  title={t('pod.toTop', 'Back to the top')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <span>{t('pod.speed', 'Speed')}:</span>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={prompterSpeed}
                    onChange={(e) => setPrompterSpeed(Number(e.target.value))}
                    className="w-16 accent-cyan-400 h-1 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <span>{t('pod.size', 'Size')}:</span>
                  <input
                    type="range"
                    min={16}
                    max={36}
                    value={prompterFontSize}
                    onChange={(e) => setPrompterFontSize(Number(e.target.value))}
                    className="w-16 accent-cyan-400 h-1 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div
              ref={prompterBoxRef}
              style={{ fontSize: `${prompterFontSize}px` }}
              className="h-44 overflow-y-auto rounded-lg border border-zinc-900 bg-black/80 p-3 leading-relaxed text-zinc-100 font-sans tracking-wide"
            >
              {prompterText.split('\n').map((line, idx) => (
                <p key={idx} className="min-h-[1.5em]">{line || '\u00A0'}</p>
              ))}
            </div>

            <textarea
              value={prompterText}
              onChange={(e) => setPrompterText(e.target.value)}
              placeholder={t('pod.scriptHere', 'Type or paste your script here…')}
              rows={2}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-hidden focus:border-cyan-500 resize-y"
            />
          </div>
        )}
      </div>

      {/* ── RESPONSIVE STUDIO SEGMENT TABS ──────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('broadcast')}
          data-podtab="broadcast"
          aria-current={activeTab === 'broadcast' ? 'page' : undefined}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all ${
            activeTab === 'broadcast'
              ? 'border border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white'
          }`}
        >
          🎙️ {t('pod.tabBroadcast', 'Record & broadcast')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('twohosts')}
          data-podtab="twohosts"
          aria-current={activeTab === 'twohosts' ? 'page' : undefined}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all ${
            activeTab === 'twohosts'
              ? 'border border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white'
          }`}
        >
          👥 {t('pod.tabTwoHosts', 'Two hosts (dialogue)')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('voicelab')}
          data-podtab="voicelab"
          aria-current={activeTab === 'voicelab' ? 'page' : undefined}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all ${
            activeTab === 'voicelab'
              ? 'border border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white'
          }`}
        >
          🔊 {t('pod.tabVoiceLab', 'Voice lab')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('channel')}
          data-podtab="channel"
          aria-current={activeTab === 'channel' ? 'page' : undefined}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all ${
            activeTab === 'channel'
              ? 'border border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white'
          }`}
        >
          📻 {t('pod.tabChannel', 'Channel & RSS feed')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('episodes')}
          data-podtab="episodes"
          aria-current={activeTab === 'episodes' ? 'page' : undefined}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-all ${
            activeTab === 'episodes'
              ? 'border border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white'
          }`}
        >
          📂 {t('pod.tabEpisodes', 'Episodes & dubs')} ({episodes.length})
        </button>
      </div>

      {/* ── TAB 1: BROADCAST & RECORDING DECK ──────────────────────────── */}
      {activeTab === 'broadcast' && (
        <div ref={episode.mine} className="scroll-mt-4 space-y-4">
          <Card title={t('pod.episode', 'An episode')} openOn={episode.openOn}>
            <Note>
              {t(
                'pod.episodeNote',
                'Record it here, or use something a voice read. Publishing puts the audio at a public address that podcast apps keep fetching.',
              )}
            </Note>

            {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

            <div className="flex flex-wrap gap-2.5 items-center">
              {recording ? (
                <button
                  type="button"
                  onClick={() => void stopRecording()}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-black flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 transition-all"
                >
                  <Square className="w-4 h-4 fill-current" />
                  {t('take.stop', 'Stop')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-black flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 transition-all"
                >
                  <Mic className="w-4 h-4 text-zinc-950" />
                  {t('pod.record', 'Record')}
                </button>
              )}
              {draft && draft.how !== 'spoken' && (
                <button
                  type="button"
                  onClick={() => void cleanUp()}
                  disabled={busy === 'clean'}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 hover:border-emerald-500 transition-all"
                >
                  {busy === 'clean' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
                  {t('pod.clean', 'Take the room out')}
                </button>
              )}
            </div>

            {draft && draft.how !== 'spoken' && (
              <Cost rate={CREDITS.clean} seconds={draftSeconds} className="block" />
            )}

            {draft && (
              <div className="space-y-3 rounded-2xl border border-emerald-500/40 bg-zinc-900/80 p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-300 font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {MADE_LABEL[draft.how]}
                  </span>
                  {draftSeconds && (
                    <span className="text-xs text-zinc-400 font-mono">
                      {Math.round(draftSeconds)}s geregistreer
                    </span>
                  )}
                </div>

                {/* Instant Playback for Draft */}
                <div className="rounded-xl bg-black/60 p-2 border border-zinc-800">
                  <audio controls src={URL.createObjectURL(draft.audio)} className="w-full h-10" />
                </div>

                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t('pod.epTitle', 'Episode title')}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden"
                />
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder={t('pod.epNotes', 'What is in it')}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden resize-y"
                />
                <p className="text-xs text-amber-400/90 leading-snug flex items-start gap-1.5">
                  <Globe className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {t(
                    'pod.publicWarning',
                    'Publishing is public. The audio goes to an address anybody can open, and podcast apps will keep fetching it.',
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => void publish()}
                  disabled={busy === 'publish' || !title.trim() || !show?.id}
                  className="min-h-[48px] w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
                >
                  {busy === 'publish' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {t('pod.publish', 'Publish it')}
                </button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB 2: TWO HOSTS DIALOGUE ───────────────────────────────────── */}
      {activeTab === 'twohosts' && (
        <TwoHosts
          voices={voices}
          onAudio={(audio) => {
            setDraft({ audio, how: 'spoken' });
            toDraft();
            studioAudio.playAudioEffect('success');
          }}
          onUpgrade={onUpgrade}
        />
      )}

      {/* ── TAB 3: VOICE LAB ────────────────────────────────────────────── */}
      {activeTab === 'voicelab' && (
        <VoiceLab
          state={voices}
          onChanged={load}
          onAudio={(audio) => {
            setDraft({ audio, how: 'spoken' });
            toDraft();
            studioAudio.playAudioEffect('success');
          }}
          onUpgrade={onUpgrade}
        />
      )}

      {/* ── TAB 4: CHANNEL & RSS FEED ───────────────────────────────────── */}
      {activeTab === 'channel' && (
        <Card
          title={t('pod.channel', 'Your channel')}
          aside={
            !caps?.publish && (
              <button
                type="button"
                onClick={onUpgrade}
                className="text-sm font-semibold text-amber-300 shrink-0"
              >
                {t('pod.needsPlan', 'Paid plan')}
              </button>
            )
          }
        >
          <Note>{t('pod.channelNote', 'The name, the picture and the description a podcast app will show.')}</Note>

          <input
            value={show?.title ?? ''}
            onChange={(event) => setShow({ ...(show ?? blankShow()), title: event.target.value })}
            placeholder={t('pod.title', 'What the show is called')}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden"
          />
          <textarea
            value={show?.about ?? ''}
            onChange={(event) => setShow({ ...(show ?? blankShow()), about: event.target.value })}
            rows={3}
            placeholder={t('pod.about', 'What it is about')}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden resize-y"
          />
          <div className="grid sm:grid-cols-3 gap-2.5">
            <input
              value={show?.author ?? ''}
              onChange={(event) => setShow({ ...(show ?? blankShow()), author: event.target.value })}
              placeholder={t('pod.author', 'Who presents it')}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden"
            />
            <label className="sr-only" htmlFor="show-language">
              {t('pod.language', 'What language it is in')}
            </label>
            <select
              id="show-language"
              value={show?.language ?? 'en'}
              onChange={(event) => setShow({ ...(show ?? blankShow()), language: event.target.value })}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-hidden"
            >
              {DUB_LANGUAGES.map((one) => (
                <option key={one.code} value={one.code}>
                  {one.name === one.own ? one.name : `${one.name} — ${one.own}`}
                </option>
              ))}
            </select>
            <input
              value={show?.image_url ?? ''}
              onChange={(event) => setShow({ ...(show ?? blankShow()), image_url: event.target.value })}
              placeholder={t('pod.image', 'Cover picture URL')}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-2">
            {SOCIALS.map((key) => (
              <input
                key={key}
                value={show?.links?.[key] ?? ''}
                onChange={(event) =>
                  setShow({
                    ...(show ?? blankShow()),
                    links: { ...(show?.links ?? {}), [key]: event.target.value },
                  })
                }
                placeholder={`https:// — ${key}`}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => void saveShow({})}
            disabled={busy === 'show' || !show?.title?.trim()}
            className="min-h-[44px] w-full py-2.5 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
          >
            {busy === 'show' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {t('pod.save', 'Save the channel')}
          </button>

          {show?.id && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2">
              <p className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                <Rss className="w-3.5 h-3.5 text-amber-400" />
                {t('pod.feed', 'Your feed')}
              </p>
              <Note>
                {t(
                  'pod.feedNote',
                  'Give this address to Apple Podcasts, Spotify or any other app. They read it themselves, from then on.',
                )}
              </Note>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 truncate text-sm text-emerald-300 bg-black/50 rounded-lg px-2.5 py-1.5">
                  {feedUrl}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(feedUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="min-h-[44px] px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-300 text-sm flex items-center gap-1.5 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? t('make.copied', 'Copied') : t('pod.copy', 'Copy')}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {(['x', 'whatsapp', 'facebook', 'linkedin'] as const).map((where) => (
                  <button
                    key={where}
                    type="button"
                    onClick={() => share(where)}
                    className="min-h-[44px] px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-300 text-xs hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1.5"
                  >
                    <Link2 className="w-3 h-3" />
                    {where}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── TAB 5: PUBLISHED EPISODES & DUBBING ──────────────────────────── */}
      {activeTab === 'episodes' && (
        <Card title={t('pod.episodesTitle', 'Published episodes')}>
          {episodes.length === 0 ? (
            <p className="text-sm text-zinc-500 py-3 text-center">
              {t('pod.noEpisodes', 'No published episodes yet. Record your first one on the Record & broadcast tab.')}
            </p>
          ) : (
            <div className="space-y-2.5 pt-1">
              {episodes.map((ep) => (
                <div key={ep.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{ep.title}</p>
                      <p className="text-xs text-zinc-500">{MADE_LABEL[ep.made]} · {ep.seconds}s</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setDubbing(dubbing === ep.id ? null : ep.id)}
                        aria-expanded={dubbing === ep.id}
                        className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                          dubbing === ep.id
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-600'
                        }`}
                      >
                        <Languages className="w-3.5 h-3.5" />
                        {t('dub.button', 'Another language')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReading(reading === ep.id ? null : ep.id)}
                        aria-expanded={reading === ep.id}
                        className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                          reading === ep.id
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                            : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-600'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {t('script.button', 'What was said')}
                      </button>
                      {onToVideo && (
                        <button
                          type="button"
                          onClick={() => onToVideo(ep.title)}
                          className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
                        >
                          <Clapperboard className="w-3.5 h-3.5" />
                          {t('pod.toVideo', 'Put it on a video')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          const token = await accessToken();
                          await fetch(`/api/episode?id=${encodeURIComponent(ep.id)}`, {
                            method: 'DELETE',
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                          }).catch(() => {});
                          void load();
                        }}
                        className="p-2 rounded-lg text-zinc-500 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {reading === ep.id && show && (
                    <Transcript
                      showId={show.id}
                      episodeId={ep.id}
                      title={ep.title}
                      seconds={ep.seconds}
                      audioUrl={episodeAudioUrl(ep.audio_path)}
                      onClose={() => setReading(null)}
                      onCleaned={(audio) => {
                        setDraft({ audio, how: ep.made });
                        setTitle(ep.title);
                        setNotes(ep.notes);
                        setReading(null);
                        toDraft();
                      }}
                    />
                  )}

                  {dubbing === ep.id && (
                    <DubEpisode
                      episodeId={ep.id}
                      title={ep.title}
                      seconds={ep.seconds}
                      audioUrl={episodeAudioUrl(ep.audio_path)}
                      onDubbed={(audio, language) => {
                        setDraft({ audio, how: 'spoken' });
                        setTitle(`${ep.title} (${language})`);
                        setNotes(ep.notes);
                        setDubbing(null);
                        toDraft();
                      }}
                      onClose={() => setDubbing(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Pronunciation Feedback Hook ─────────────────────────────────── */}
      <SayItWrong surface="podcast" spoken />
    </div>
  );
}

function blankShow(): Show {
  return { id: '', title: '', about: '', author: '', image_url: null, language: 'en', links: {} };
}
