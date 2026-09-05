'use client';

/**
 * Live — one room, everybody in it.
 *
 * People put a song in, other people listen to each other's, and you can see
 * who is in there with you. One room rather than a room each, on purpose: a
 * channel with four people in it is a place, and forty rooms with one person
 * in each is nobody.
 *
 * ## The two kinds of live, and why they are the same screen
 *
 * The first is here: a song posted to the room and played by whoever is in it.
 *
 * The second is somewhere else. This app has no media server — it cannot carry
 * a microphone or a camera to an audience — and a "Go live" button that
 * quietly did nothing would be the worst thing on the site. So going live is
 * announced rather than broadcast: a time, a platform and a link, and the room
 * counts down to it and follows you there.
 *
 * They are one screen because they are one act: telling the people who are
 * here that there is something to listen to now.
 *
 * ## What is said plainly
 *
 * Posting is public, and the button says so before it is pressed. A song in
 * the room is playable by anybody in the room — that is what a room is for,
 * and it is not the same as the song being published, so the link the server
 * hands out is short-lived and taking the post down takes it away.
 *
 * Listening needs no account. Posting does. Somebody reading the room without
 * signing in is counted, welcome, and told which of the two they are.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Eye, Loader2, Music, Play, Radio, Send, Sparkles, Trash2, Upload, Users,
} from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { loadTracks, type Track } from '../lib/library';
import { visitorId } from '../lib/signal';
import { useLang } from '../lib/i18n';
import { refusalText } from '../lib/apierror';
import RoomScreen from './RoomScreen';
import { useCopilotOps, matchByTitle } from '../lib/copilotactions';
import Note from './Note';

/** Often enough that the room never blinks out, rare enough to be polite. */
const HELLO_EVERY = 30_000;
/** How often the room is re-read. A channel that updates once a minute is not live. */
const REFRESH_EVERY = 8_000;

interface Post {
  id: string;
  kind: 'track' | 'episode' | 'elsewhere';
  title: string;
  note: string;
  seconds: number;
  platform: string;
  link: string;
  startsAt: string | null;
  at: string;
  by: string;
  mine: boolean;
  audio: string | null;
}

interface Said {
  id: string;
  body: string;
  at: string;
  by: string;
  mine: boolean;
}

interface Room {
  ready: boolean;
  signedIn?: boolean;
  /* The code beside the sentence, which is what makes the sentence
     translatable — see `lib/apierror.ts`. */
  error?: string;
  message?: string;
  here: number;
  posts: Post[];
  says: Said[];
}

const EMPTY: Room = { ready: true, here: 0, posts: [], says: [] };

function clock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** "in 2 hours", "started" — a countdown somebody can act on. */
function until(when: string, t: (key: string, fallback?: string) => string): string {
  const away = new Date(when).getTime() - Date.now();
  if (Number.isNaN(away)) return '';
  if (away <= 0) return t('live.onNow', 'on now');
  const minutes = Math.round(away / 60000);
  if (minutes < 60) return `${t('live.in', 'in')} ${minutes} ${t('live.min', 'min')}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${t('live.in', 'in')} ${hours} ${t('live.hours', 'hours')}`;
  return `${t('live.in', 'in')} ${Math.round(hours / 24)} ${t('live.days', 'days')}`;
}

export default function LiveChannel({ onGoToMake }: { onGoToMake: () => void }): React.ReactElement {
  const { t, lang } = useLang();
  const [room, setRoom] = useState<Room>(EMPTY);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [draft, setDraft] = useState('');

  /* Write what you are about to say. Deliberately only the box: sending puts
     words in front of everybody in the room under your name, and the copilot
     does not get to do that on its own. They press send. */
  useCopilotOps('live', {
    set_message: (value) => setDraft(value),
  });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  /**
   * Which post the full-screen room opened on, or nothing.
   *
   * The list stays: it is how somebody scans what is there, deletes their own
   * and reads a note. What it is not is how anybody listens to a roomful of
   * other people's work — that is one at a time, full screen, thumb up for the
   * next one, and it is why Live is on a tab at all.
   */
  const [openAt, setOpenAt] = useState<string | null>(null);
  const [showElsewhere, setShowElsewhere] = useState(false);
  const [where, setWhere] = useState({ platform: 'tiktok', title: '', link: '', startsAt: '' });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ask = useCallback(async (): Promise<void> => {
    try {
      const token = await accessToken();
      const response = await fetch('/api/live', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      const next = (await response.json()) as Room;
      // A missing table is not an empty room. The same mistake collaboration
      // made for weeks: the client turned a failure into "nothing here yet",
      // which is exactly what somebody with an empty room sees.
      setRoom(next);
    } catch {
      setRoom((current) => ({ ...current, ready: current.ready }));
    }
  }, []);

  /** Being in the room, and being counted in it. */
  useEffect(() => {
    let live = true;
    const hello = async () => {
      try {
        const token = await accessToken();
        await fetch('/api/live', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ what: 'hello', visitor: visitorId() }),
        });
      } catch {
        // The room carries on without the count. Nothing to say about it.
      }
    };
    void hello();
    const beat = setInterval(() => { if (live) void hello(); }, HELLO_EVERY);
    return () => {
      live = false;
      clearInterval(beat);
    };
  }, []);

  useEffect(() => {
    setTracks(loadTracks());
    void ask();
    const beat = setInterval(() => void ask(), REFRESH_EVERY);
    return () => clearInterval(beat);
  }, [ask]);

  const send = async (payload: Record<string, unknown>): Promise<boolean> => {
    setProblem('');
    setBusy(true);
    try {
      const token = await accessToken();
      const response = await fetch('/api/live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const said = (await response.json().catch(() => null)) as { message?: string } | null;
        setProblem(refusalText(said, lang, t('live.failed', 'That did not go through.')));
        return false;
      }
      await ask();
      return true;
    } catch {
      setProblem(t('live.offline', 'Could not reach the app’s server.'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const play = (post: Post) => {
    if (!post.audio) return;
    if (playing === post.id) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = post.audio;
    void audioRef.current.play();
    audioRef.current.onended = () => setPlaying(null);
    setPlaying(post.id);
  };

  // ── A room that is not switched on says so ─────────────────────────────
  if (!room.ready) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5 space-y-2">
        <p className="text-base font-bold text-white flex items-center gap-2">
          <Radio className="w-5 h-5 text-amber-400" />
          {t('live.notReady', 'The live channel is not switched on yet')}
        </p>
        {/* Through the same translator every other refusal goes through.
            It was printing the server's own English, in a room that is
            otherwise entirely Afrikaans, on the one screen somebody reads
            carefully because nothing is working. */}
        <p className="text-sm text-zinc-400 leading-snug">
          {refusalText(room, lang, t('live.notReadyWhy', 'It has not been set up on this app yet.'))}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Radio className="w-6 h-6 text-emerald-400" />
          {t('live.title', 'Live')}
        </h4>
        <p className="text-base text-zinc-400 pt-1 max-w-2xl">{t('live.sub')}</p>
      </div>

      {/* Who is here. A real number or nothing — never a comforting one. */}
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Users className="w-4 h-4 text-emerald-400" />
        {room.here === 1
          ? t('live.hereOne', 'You are the only one in the room right now.')
          : `${room.here} ${t('live.hereMany', 'people in the room right now.')}`}
        {!room.signedIn && (
          <span className="text-zinc-500">— {t('live.listenFree', 'listening needs no account; posting does.')}</span>
        )}
      </div>

      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

      {/* ── Put something in ──────────────────────────────────────────── */}
      {room.signedIn && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <p className="text-base font-bold text-white">{t('live.putIn', 'Put something in the room')}</p>
          <Note>{t('live.public')}</Note>

          {tracks.length === 0 ? (
            <button
              type="button"
              onClick={onGoToMake}
              className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 text-sm font-semibold text-zinc-400 hover:border-emerald-500/60 hover:text-emerald-300 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              {t('live.noSongs', 'Make a song first — then it can go in the room')}
            </button>
          ) : (
            <div className="space-y-1.5">
              {tracks.slice(0, 6).map((track) => (
                <div key={track.id} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                  <Music className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                  <span className="text-sm text-zinc-300 truncate flex-1 min-w-0">{track.title}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void send({
                        what: 'post',
                        kind: 'track',
                        sourceId: track.id,
                        title: track.title,
                        seconds: track.seconds,
                      })
                    }
                    className="px-2.5 py-1 rounded-lg text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {t('live.post', 'Post it')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Or say you are going live somewhere this app cannot reach ── */}
          <button
            type="button"
            onClick={() => setShowElsewhere(!showElsewhere)}
            className="text-sm text-zinc-400 hover:text-emerald-300 flex items-center gap-1.5"
          >
            <Radio className="w-3.5 h-3.5" />
            {t('live.elsewhere', 'Or tell the room you are going live somewhere')}
          </button>

          {showElsewhere && (
            <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <Note>{t('live.elsewhereNote')}</Note>
              <div className="flex flex-wrap gap-1.5">
                {(['tiktok', 'youtube', 'instagram'] as const).map((one) => (
                  <button
                    key={one}
                    type="button"
                    onClick={() => setWhere({ ...where, platform: one })}
                    className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${
                      where.platform === one
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    {one}
                  </button>
                ))}
              </div>
              <input
                value={where.title}
                onChange={(event) => setWhere({ ...where, title: event.target.value })}
                placeholder={t('live.whatOn', 'What is it')}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
              />
              <input
                value={where.link}
                onChange={(event) => setWhere({ ...where, link: event.target.value })}
                placeholder="https://…"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="datetime-local"
                value={where.startsAt}
                onChange={(event) => setWhere({ ...where, startsAt: event.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={busy || !where.title.trim()}
                onClick={async () => {
                  const done = await send({
                    what: 'elsewhere',
                    title: where.title,
                    platform: where.platform,
                    link: where.link,
                    startsAt: where.startsAt ? new Date(where.startsAt).toISOString() : '',
                  });
                  if (done) {
                    setWhere({ platform: where.platform, title: '', link: '', startsAt: '' });
                    setShowElsewhere(false);
                  }
                }}
                className="w-full py-2 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold disabled:opacity-50"
              >
                {t('live.tellThem', 'Tell the room')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── The room ──────────────────────────────────────────────────── */}
      {/* Play the room, rather than play one thing out of it. */}
      {room.posts.some((one) => one.audio) && (
        <button
          type="button"
          onClick={() => {
            const first = room.posts.find((one) => one.audio);
            if (first) setOpenAt(first.id);
          }}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold"
        >
          <Play className="h-4 w-4" />
          {t('live.playRoom', 'Play the room')}
        </button>
      )}

      {openAt && (
        <RoomScreen
          posts={room.posts.map((one) => ({
            id: one.id,
            title: one.title,
            by: one.by,
            note: one.note,
            seconds: one.seconds,
            audio: one.audio,
          }))}
          startAt={openAt}
          onClose={() => setOpenAt(null)}
        />
      )}

      <div className="space-y-2">
        {room.posts.length === 0 && (
          <Note>{t('live.quiet', 'Nothing in the room yet. Put a song in and it is the first thing anybody hears.')}</Note>
        )}
        {room.posts.map((post) => (
          <div key={post.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 flex items-start gap-3">
            {/* Tapping the row opens the room on that one, the same way
                tapping a song in the channel opens it full screen. The
                buttons on the right keep doing their own jobs. */}
            <button
              type="button"
              onClick={() => post.audio && setOpenAt(post.id)}
              disabled={!post.audio}
              className="min-w-0 flex-1 text-left disabled:cursor-default"
            >
              <p className="text-sm font-semibold text-white truncate">{post.title}</p>
              <p className="text-xs text-zinc-500">
                {post.by}
                {post.kind === 'elsewhere'
                  ? ` · ${post.platform || t('live.somewhere', 'somewhere')}${post.startsAt ? ` · ${until(post.startsAt, t)}` : ''}`
                  : post.seconds
                    ? ` · ${clock(post.seconds)}`
                    : ''}
              </p>
              {post.note && <p className="text-sm text-zinc-400 leading-snug pt-1">{post.note}</p>}
            </button>

            <div className="flex items-center gap-1 flex-shrink-0">
              {post.kind === 'elsewhere' && post.link && (
                <a
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {t('live.watch', 'Watch')}
                </a>
              )}
              {post.kind !== 'elsewhere' && (
                <button
                  type="button"
                  onClick={() => play(post)}
                  disabled={!post.audio}
                  title={post.audio ? undefined : t('live.gone', 'That file is not there any more.')}
                  className="px-2.5 py-1.5 rounded-lg text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Music className="w-3.5 h-3.5" />
                  {playing === post.id ? t('live.stop', 'Stop') : t('live.listen', 'Listen')}
                </button>
              )}
              {post.mine && (
                <button
                  type="button"
                  onClick={async () => {
                    const token = await accessToken();
                    await fetch(`/api/live?id=${encodeURIComponent(post.id)}`, {
                      method: 'DELETE',
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                    }).catch(() => {});
                    void ask();
                  }}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400"
                  aria-label={t('live.take', 'Take it out')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Talking ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {room.says.length === 0 && (
            <p className="text-sm text-zinc-600">{t('live.noSays', 'Nobody has said anything yet.')}</p>
          )}
          {room.says.map((said) => (
            <p key={said.id} className="text-sm leading-snug">
              <span className={said.mine ? 'text-emerald-300 font-semibold' : 'text-zinc-400 font-semibold'}>
                {said.by}
              </span>
              <span className="text-zinc-300"> {said.body}</span>
            </p>
          ))}
        </div>

        {room.signedIn ? (
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && draft.trim()) {
                  void send({ what: 'say', note: draft }).then((done) => { if (done) setDraft(''); });
                }
              }}
              placeholder={t('live.say', 'Say something to the room')}
              className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={busy || !draft.trim()}
              onClick={() => void send({ what: 'say', note: draft }).then((done) => { if (done) setDraft(''); })}
              className="px-3 py-2 rounded-xl bg-emerald-500 text-onAccent flex-shrink-0 disabled:opacity-50"
              aria-label={t('live.send', 'Send')}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">{t('live.signInToSay', 'Sign in to say something. Listening needs no account.')}</p>
        )}
      </div>
    </div>
  );
}
