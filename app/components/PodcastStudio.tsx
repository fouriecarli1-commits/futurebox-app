'use client';

/**
 * A show, not a demo of one.
 *
 * The thing that makes a podcast a podcast is a feed that Apple, Spotify and
 * every other app can subscribe to — they integrate with nothing, they read an
 * RSS file on a schedule for years. So this screen exists to produce one
 * correct feed: a channel with a name and artwork, episodes with real audio,
 * and links out to wherever the audience already is.
 *
 * Two things are said plainly rather than hidden in a tooltip. Publishing is
 * public — the audio goes to an address anybody can fetch, and podcast apps
 * will keep fetching it. And an episode read by a cloned voice says so, on the
 * episode and in the feed, because a listener in a podcast app never sees this
 * site and must not have to work out unaided that a voice was synthesised.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check, Copy, Globe, Languages, Link2, Loader2, Mic, Radio, Rss, Sparkles, Square, Trash2, Upload,
} from 'lucide-react';
import VoiceLab, { type VoiceState } from './VoiceLab';
import TwoHosts from './TwoHosts';
import DubEpisode from './DubEpisode';
import Cost from './Cost';
import { episodeAudioUrl } from '../lib/episodeaudio';
import { accessToken } from '../lib/cloud';
import { durationOf } from '../lib/trackaudio';
import { CREDITS } from '../lib/credits';
import { useLang } from '../lib/i18n';
import { useCopilotOps, matchByTitle } from '../lib/copilotactions';

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

export default function PodcastStudio({ onUpgrade }: { onUpgrade: () => void }): React.ReactElement {
  const { t } = useLang();

  const [voices, setVoices] = useState<VoiceState>({ configured: false, mine: [], stock: [] });
  const [show, setShow] = useState<Show | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [caps, setCaps] = useState<VoiceState['caps'] | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  /** Whether there is an account service at all — a different thing from being signed in. */
  const [configured, setConfigured] = useState(true);

  const [draft, setDraft] = useState<{ audio: Blob; how: Episode['made'] } | null>(null);
  /** Which episode's dubbing panel is open, if any. */
  const [dubbing, setDubbing] = useState<string | null>(null);
  /** How long the draft is, measured when it lands so the price can be shown
   *  before the button is pressed rather than worked out as it is sent. */
  const [draftSeconds, setDraftSeconds] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  /* The episode's title and its notes. Both are text they were going to type
     and can retype, and neither costs anything or publishes anything. */
  useCopilotOps('podcast', {
    set_title: (value) => setTitle(value),
    set_notes: (value) => setNotes(value),
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
    setDraft({ audio: await finished, how: 'recorded' });
  }, []);

  const cleanUp = useCallback(async () => {
    if (!draft) return;
    setBusy('clean');
    setProblem(null);
    const token = await accessToken();
    const form = new FormData();
    form.append('audio', draft.audio, 'take.webm');
    // Taking the room out is charged by the minute now, so the length has to
    // go with it. Without it the server bills at its ceiling, which for a
    // ninety-second episode would be a bill for thirty minutes.
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
    setDraft({ audio: await response.blob(), how: 'cleaned' });
  }, [draft, onUpgrade]);

  const publish = useCallback(async () => {
    if (!draft || !title.trim()) return;
    setBusy('publish');
    setProblem(null);
    const token = await accessToken();
    const form = new FormData();
    form.append('audio', draft.audio, 'episode.mp3');
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
    /* Two different reasons, said differently.

       This said "sign in to make a show" whenever there was no caller, which
       includes an app with no Supabase project behind it — where there is
       nothing to sign in to and no button to look for. Sending somebody to
       hunt for a control that does not exist is worse than saying plainly that
       the feature is waiting on a service. The live room already made this
       distinction; this room did not. */
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
      {/* ── The channel ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold text-white">{t('pod.channel', 'Your channel')}</p>
            <p className="text-sm text-zinc-500 leading-snug">
              {t('pod.channelNote', 'The name, the picture and the description a podcast app will show.')}
            </p>
          </div>
          {!caps?.publish && (
            <button
              type="button"
              onClick={onUpgrade}
              className="text-sm font-semibold text-amber-300 flex-shrink-0"
            >
              {t('pod.needsPlan', 'Paid plan')}
            </button>
          )}
        </div>

        <input
          value={show?.title ?? ''}
          onChange={(event) => setShow({ ...(show ?? blankShow()), title: event.target.value })}
          placeholder={t('pod.title', 'What the show is called')}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
        <textarea
          value={show?.about ?? ''}
          onChange={(event) => setShow({ ...(show ?? blankShow()), about: event.target.value })}
          rows={3}
          placeholder={t('pod.about', 'What it is about')}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none resize-y"
        />
        <div className="grid sm:grid-cols-3 gap-2">
          <input
            value={show?.author ?? ''}
            onChange={(event) => setShow({ ...(show ?? blankShow()), author: event.target.value })}
            placeholder={t('pod.author', 'Who presents it')}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
          <input
            value={show?.language ?? 'en'}
            onChange={(event) => setShow({ ...(show ?? blankShow()), language: event.target.value })}
            placeholder="en / af"
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
          <input
            value={show?.image_url ?? ''}
            onChange={(event) => setShow({ ...(show ?? blankShow()), image_url: event.target.value })}
            placeholder={t('pod.image', 'Cover picture URL')}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Where the audience already is. */}
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
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => void saveShow({})}
          disabled={busy === 'show' || !show?.title?.trim()}
          className="w-full py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy === 'show' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {t('pod.save', 'Save the channel')}
        </button>

        {show?.id && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
            <p className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
              <Rss className="w-3.5 h-3.5 text-amber-400" />
              {t('pod.feed', 'Your feed')}
            </p>
            <p className="text-sm text-zinc-500 leading-snug">
              {t('pod.feedNote', 'Give this address to Apple Podcasts, Spotify or any other app. They read it themselves, from then on.')}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate text-sm text-emerald-300 bg-black/50 rounded-lg px-2.5 py-1.5">{feedUrl}</code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(feedUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-300 text-sm flex items-center gap-1.5 flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? t('make.copied', 'Copied') : t('pod.copy', 'Copy')}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {(['x', 'whatsapp', 'facebook', 'linkedin'] as const).map((where) => (
                <button
                  key={where}
                  type="button"
                  onClick={() => share(where)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-300 text-sm hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1.5"
                >
                  <Link2 className="w-3 h-3" />
                  {where}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Voices ──────────────────────────────────────────────────────── */}
      <VoiceLab
        state={voices}
        onChanged={load}
        onAudio={(audio) => setDraft({ audio, how: 'spoken' })}
        onUpgrade={onUpgrade}
      />

      {/* ── Two people talking ──────────────────────────────────────────── */}
      {/* Filed as 'spoken' rather than a kind of its own: the disclosure a
          listener needs is that a voice was synthesised, and that is what
          'spoken' already prints on the episode and in the feed. A conversation
          is spoken by voices, so the promise the feed makes stays true and no
          migration is needed to keep it. */}
      <TwoHosts
        voices={voices}
        onAudio={(audio) => setDraft({ audio, how: 'spoken' })}
        onUpgrade={onUpgrade}
      />

      {/* ── An episode ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div>
          <p className="text-base font-bold text-white">{t('pod.episode', 'An episode')}</p>
          <p className="text-sm text-zinc-500 leading-snug">
            {t('pod.episodeNote', 'Record it here, or use something a voice read. Publishing puts the audio at a public address that podcast apps keep fetching.')}
          </p>
        </div>

        {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

        <div className="flex flex-wrap gap-2">
          {recording ? (
            <button
              type="button"
              onClick={() => void stopRecording()}
              className="px-3.5 py-2.5 rounded-xl bg-red-500/20 border border-red-500 text-red-300 text-sm font-semibold flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              {t('take.stop', 'Stop')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void startRecording()}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5"
            >
              <Mic className="w-3.5 h-3.5" />
              {t('pod.record', 'Record')}
            </button>
          )}
          {draft && draft.how !== 'spoken' && (
            <button
              type="button"
              onClick={() => void cleanUp()}
              disabled={busy === 'clean'}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {busy === 'clean' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {t('pod.clean', 'Take the room out')}
            </button>
          )}
        </div>

        {draft && draft.how !== 'spoken' && (
          <Cost rate={CREDITS.clean} seconds={draftSeconds} className="block" />
        )}

        {draft && (
          <div className="space-y-2.5 rounded-xl border border-emerald-500/30 bg-zinc-900/60 p-3">
            <p className="text-sm text-emerald-300 font-semibold">{MADE_LABEL[draft.how]}</p>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('pod.epTitle', 'Episode title')}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder={t('pod.epNotes', 'What is in it')}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none resize-y"
            />
            <p className="text-sm text-amber-400/90 leading-snug flex items-start gap-1.5">
              <Globe className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {t('pod.publicWarning', 'Publishing is public. The audio goes to an address anybody can open, and podcast apps will keep fetching it.')}
            </p>
            <button
              type="button"
              onClick={() => void publish()}
              disabled={busy === 'publish' || !title.trim() || !show?.id}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy === 'publish' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {t('pod.publish', 'Publish it')}
            </button>
          </div>
        )}

        {episodes.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {episodes.map((episode) => (
              <div key={episode.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{episode.title}</p>
                    <p className="text-sm text-zinc-500">{MADE_LABEL[episode.made]}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Only on a published episode: a dub is made from the
                        audio at its public address, and a draft has none.

                        Named rather than drawn. This was a bare glyph between
                        the play and the bin — sixteen grey pixels, no label,
                        no border — for the single most valuable thing this
                        room does: the same show, in the host's own voice, in a
                        language they do not speak. Nobody found it, and an
                        icon nobody recognises is not a smaller button, it is
                        an absent one. It is wide enough to read now, and it
                        keeps its place in the row rather than moving. */}
                    <button
                      type="button"
                      onClick={() => setDubbing(dubbing === episode.id ? null : episode.id)}
                      aria-expanded={dubbing === episode.id}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        dubbing === episode.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-600'
                      }`}
                    >
                      <Languages className="w-3.5 h-3.5" />
                      {t('dub.button', 'Another language')}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const token = await accessToken();
                        await fetch(`/api/episode?id=${encodeURIComponent(episode.id)}`, {
                          method: 'DELETE',
                          headers: token ? { Authorization: `Bearer ${token}` } : {},
                        }).catch(() => {});
                        void load();
                      }}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {dubbing === episode.id && (
                  <DubEpisode
                    episodeId={episode.id}
                    title={episode.title}
                    seconds={episode.seconds}
                    audioUrl={episodeAudioUrl(episode.audio_path)}
                    onDubbed={(audio, language) => {
                      // Straight into the draft, so the episode that already
                      // knows how to be published publishes it. The title says
                      // which language it is in, because two episodes with the
                      // same name in one feed is a feed nobody can navigate.
                      setDraft({ audio, how: 'spoken' });
                      setTitle(`${episode.title} (${language})`);
                      setNotes(episode.notes);
                      setDubbing(null);
                    }}
                    onClose={() => setDubbing(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function blankShow(): Show {
  return { id: '', title: '', about: '', author: '', image_url: null, language: 'en', links: {} };
}
