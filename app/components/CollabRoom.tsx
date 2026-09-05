'use client';

/**
 * Requests waiting on you, requests waiting on them, and the room afterwards.
 *
 * The room is not a chat with a file attachment bolted on. Two people who have
 * agreed to work together are going to swap songs, so a song is a first-class
 * thing you can put in it — dropped from your own channel, by name, so the
 * other person can hear what you mean rather than read a description of it.
 *
 * What travels is the song's id, never the file. Whether a collaborator can
 * actually play it is still governed by whether its owner shared it on the
 * radar, which is a switch they control and can turn off again. Putting audio
 * in a chat window would quietly settle a licence question nobody asked.
 *
 * Nothing here can be reached before both people agreed. Not because this
 * screen is careful, but because the row-level policy on the messages table
 * tests for an accepted thread — a message written before then is invisible
 * even to the person who wrote it.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Handshake, Loader2, Mic, Music, Send, X } from 'lucide-react';
import { answer, ask, loadSaid, loadThreads, say, type Said, type Thread } from '../lib/collab';
import { loadTracks, type Track } from '../lib/library';
import { keepGiven } from '../lib/uploads';
import { accessToken } from '../lib/cloud';
import { useLang } from '../lib/i18n';
import { useCopilotOps, matchByTitle } from '../lib/copilotactions';
import Note from './Note';

/** Long enough that a conversation feels live, gentle enough to leave open. */
const ASK_AGAIN_MS = 15_000;

function when(at: string): string {
  const date = new Date(at);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CollabRoom({
  reloadKey,
  onOpenInBooth,
}: {
  reloadKey: number;
  /** Take them to the booth with this song open, once it is on the device. */
  onOpenInBooth?: (title: string) => void;
}): React.ReactElement {
  const { t } = useLang();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [said, setSaid] = useState<Said[]>([]);
  const [draft, setDraft] = useState('');

  /* Draft the message. Not send it — the same rule as the live room: a message
     to another person goes out under their name, so it waits for them. */
  useCopilotOps('collab', {
    set_message: (value) => setDraft(value),
  });
  const [tracks, setTracks] = useState<Track[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  /** Null until asked; false when the tables are missing rather than empty. */
  const [ready, setReady] = useState<boolean | null>(null);
  const [why, setWhy] = useState<string | null>(null);

  const bottom = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(() => {
    void loadThreads().then((next) => {
      setThreads(next.threads);
      setReady(next.ready);
      setWhy(next.message ?? null);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    setTracks(loadTracks());
    refresh();
  }, [refresh, reloadKey]);

  // The open room, asked for again while it is open. Held in a ref so the
  // interval below does not restart every time a message arrives.
  const openRef = useRef<string | null>(null);
  openRef.current = open;
  useEffect(() => {
    if (!open) return;
    let live = true;
    const pull = (): void => {
      const id = openRef.current;
      if (!id) return;
      loadSaid(id).then((next) => {
        if (live) setSaid(next);
      });
    };
    pull();
    const timer = window.setInterval(pull, ASK_AGAIN_MS);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [open]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [said.length]);

  const reply = useCallback(
    async (id: string, yes: boolean) => {
      setProblem(null);
      setBusy(id);
      const failed = await answer(id, yes);
      setBusy(null);
      if (failed) {
        setProblem(failed);
        return;
      }
      refresh();
      if (yes) setOpen(id);
    },
    [refresh],
  );

  const send = useCallback(
    async (trackId?: string) => {
      if (!open) return;
      const body = draft.trim();
      if (!body && !trackId) return;

      setProblem(null);
      setBusy('say');
      const done = await say(open, body, trackId);
      setBusy(null);
      if (!done.ok) {
        setProblem(done.message);
        return;
      }
      // Shown at once rather than waiting for the next poll: a message that
      // takes fifteen seconds to appear reads as one that did not send.
      setSaid((was) => was.concat(done.said));
      setDraft('');
    },
    [draft, open],
  );

  /**
   * Their song, in your booth.
   *
   * Not two people in one timeline — that is a different app. This is the
   * thing collaborators actually do: you hear what they sent, you sing over
   * it, you send a version back.
   *
   * The file only travels because they put that song in this room. The route
   * checks exactly that — see `api/collab/track` — and the song is kept beside
   * your channel rather than in it, with their name on it, so a song that
   * arrived on your device does not quietly become yours.
   */
  const [taking, setTaking] = useState<string | null>(null);
  const [gone, setGone] = useState('');

  const intoMyBooth = useCallback(
    async (trackId: string, from: string) => {
      setTaking(trackId);
      setGone('');
      try {
        const token = await accessToken();
        const response = await fetch('/api/collab/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ trackId }),
        });
        const said = (await response.json().catch(() => null)) as
          | { url?: string; track?: Record<string, unknown>; message?: string }
          | null;
        if (!response.ok || !said?.url || !said.track) {
          setGone(said?.message ?? t('collab.noFile', 'That song could not be opened.'));
          return;
        }
        const audio = await fetch(said.url);
        if (!audio.ok) {
          setGone(t('collab.noFile', 'That song could not be opened.'));
          return;
        }
        const kept = await keepGiven(said.track as never, await audio.blob(), from);
        onOpenInBooth?.(kept.title);
      } catch {
        setGone(t('collab.noFile', 'That song could not be opened.'));
      } finally {
        setTaking(null);
      }
    },
    [onOpenInBooth, t],
  );

  /* Every hook above the early returns below. This block sat under them, so
     the first render — before the threads had loaded — ran three fewer hooks
     than the second, and React tore the room down with "Rendered more hooks
     than during the previous render". It looked like a crash on opening
     Collab Radar and it was a line of code in the wrong place. */

  const waiting = threads.filter((one) => one.state === 'asked' && !one.mine);
  const sent = threads.filter((one) => one.state === 'asked' && one.mine);
  const rooms = threads.filter((one) => one.state === 'accepted');
  const room = rooms.find((one) => one.id === open) ?? null;

  if (!loaded) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t('collab.loading', 'Looking…')}
      </div>
    );
  }

  // The tables are not there. Said outright, because the alternative — which
  // is what this drew before — is "no collaborations yet", and nobody can tell
  // that from a feature that has simply never been switched on.
  if (ready === false) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-2">
        <p className="text-sm font-semibold text-amber-300 flex items-center gap-2">
          <Handshake className="w-4 h-4 flex-shrink-0" />
          {t('collab.off', 'Collaboration is not switched on yet')}
        </p>
        <p className="text-sm text-zinc-400 leading-snug">
          {why ??
            t('collab.offNote', 'Its tables are missing. Everything else on this screen still works.')}
        </p>
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {/* ── What this is for ─────────────────────────────────────────────
          Asked for, and worth the space: a Handshake icon and an empty list
          do not tell anybody what collaborating here actually means, and
          somebody who does not know will not press anything. */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-1.5">
        <p className="text-base font-bold text-white">
          {t('collab.whatTitle', 'Making something with somebody else')}
        </p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          {t(
            'collab.what',
            'Ask another maker, and if they say yes the two of you get a room: a private thread nobody else can read, and a way to hand songs back and forth. Take their verse into your track, put your voice on theirs, cut a video against a song neither of you would have made alone.',
          )}
        </p>
        <Note className="text-sm text-zinc-500 leading-relaxed">{t(
            'collab.whatPrivate',
            'Nothing is shared until you send it, and neither of you can read a word of the thread until you have both agreed — that is enforced in the database, not by a screen.',
          )}</Note>
      </div>

      {/* ── Waiting on you ───────────────────────────────────────────── */}
      {waiting.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.06] p-4 space-y-3">
          <p className="text-base font-bold text-white flex items-center gap-2">
            <Handshake className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            {waiting.length === 1
              ? t('collab.oneAsked', 'Somebody wants to work with you')
              : `${waiting.length} ${t('collab.manyAsked', 'people want to work with you')}`}
          </p>
          {waiting.map((one) => (
            <div key={one.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
              <p className="text-sm font-semibold text-zinc-100">
                {one.name} <span className="text-zinc-500 font-normal">{one.handle}</span>
              </p>
              {one.because && <p className="text-sm text-zinc-400 leading-snug">{one.because}</p>}
              {gone && <p className="text-sm text-amber-400 leading-snug">{gone}</p>}

            <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void reply(one.id, true)}
                  disabled={busy === one.id}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {busy === one.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {t('collab.accept', 'Accept')}
                </button>
                <button
                  type="button"
                  onClick={() => void reply(one.id, false)}
                  disabled={busy === one.id}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 text-sm font-semibold disabled:opacity-50"
                >
                  {t('collab.decline', 'No thanks')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── The rooms ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        <div>
          <p className="text-base font-bold text-white">{t('collab.rooms', 'Working together')}</p>
          <Note>{t(
              'collab.roomsNote',
              'A room opens when you both agree. Drop a song into it and the other person can hear what you mean — the song travels, not the file.',
            )}</Note>
        </div>

        {rooms.length === 0 ? (
          <Note>{t('collab.noRooms', 'None yet. Find somebody whose sound is near yours below, and ask.')}</Note>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {rooms.map((one) => (
              <button
                key={one.id}
                type="button"
                onClick={() => setOpen(open === one.id ? null : one.id)}
                className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                  open === one.id
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {one.name} <span className="text-zinc-600">{one.handle}</span>
              </button>
            ))}
          </div>
        )}

        {room && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-3">
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {said.length === 0 ? (
                <p className="text-sm text-zinc-500 leading-snug py-4 text-center">
                  {t('collab.saySomething', 'Nothing here yet. Say hello, or drop a song in.')}
                </p>
              ) : (
                said.map((one) => (
                  <div key={one.id} className={`flex ${one.mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                        one.mine ? 'bg-emerald-500/15 border border-emerald-500/40' : 'bg-zinc-950 border border-zinc-800'
                      }`}
                    >
                      {one.trackId && (
                        <p className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5 pb-0.5">
                          <Music className="w-3.5 h-3.5 flex-shrink-0" />
                          {tracks.find((track) => track.id === one.trackId)?.title ??
                            t('collab.aSong', 'a song')}
                        </p>
                      )}
                      {one.body && <p className="text-sm text-zinc-200 leading-snug">{one.body}</p>}

                      {/* Only on a song they sent. Yours is already in your
                          booth, and offering to fetch it would be this room
                          pretending to do something. */}
                      {one.trackId && !one.mine && (
                        <button
                          type="button"
                          onClick={() => void intoMyBooth(one.trackId as string, room?.name ?? t('collab.them', 'them'))}
                          disabled={taking !== null}
                          className="mt-1.5 w-full min-h-[40px] rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {taking === one.trackId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Mic className="w-3.5 h-3.5" />
                          )}
                          {t('collab.sing', 'Sing on it in my booth')}
                        </button>
                      )}
                      <p className="text-[11px] text-zinc-600 pt-0.5">{when(one.at)}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottom} />
            </div>

            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder={t('collab.write', 'Write something…')}
                className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!draft.trim() || busy === 'say'}
                className="px-3 py-2 rounded-xl bg-emerald-500 text-onAccent disabled:opacity-50"
                aria-label={t('collab.send', 'Send')}
              >
                {busy === 'say' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>

            {/* The remix half: a song from your channel, by name. */}
            {tracks.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs uppercase tracking-wider text-zinc-600">
                  {t('collab.dropIn', 'Drop a song in')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tracks.slice(0, 8).map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => void send(track.id)}
                      disabled={busy === 'say'}
                      className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-400 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Music className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[10rem]">{track.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Waiting on them ──────────────────────────────────────────── */}
      {sent.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2">
          <p className="text-sm font-bold text-white">{t('collab.sent', 'Asked, waiting')}</p>
          {sent.map((one) => (
            <p key={one.id} className="text-sm text-zinc-500">
              {one.name} <span className="text-zinc-600">{one.handle}</span>
            </p>
          ))}
        </div>
      )}

      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
    </div>
  );
}

/** The button the radar puts on a match. Exported so it lives beside the room. */
export function AskToCollab({
  handle,
  because,
  onAsked,
}: {
  handle: string;
  because: string;
  onAsked: () => void;
}): React.ReactElement | null {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // Somebody with no handle cannot be reached: there is nothing to address the
  // request to, and inventing one would send it to nobody.
  if (!handle) return null;

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={busy || note !== null}
        onClick={async () => {
          setBusy(true);
          const done = await ask(handle, because);
          setBusy(false);
          setNote(
            done.ok
              ? done.existing
                ? t('collab.already', 'Already asked')
                : t('collab.asked', 'Asked')
              : done.message,
          );
          if (done.ok) onAsked();
        }}
        className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm font-semibold text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5 disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Handshake className="w-3.5 h-3.5" />}
        {t('collab.askThem', 'Ask to work together')}
      </button>
      {note && <span className="text-sm text-zinc-500">{note}</span>}
    </span>
  );
}
