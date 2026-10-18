'use client';

/**
 * The Collab Radar desk — Google's page, over the room that was here.
 *
 * Carli, 13 October 2026: *"Kyk hoe mooi lyk collab, kom ons probeer dit so
 * te hou."* The page: a bar with two modes (the radar, the live room), an
 * invite-by-handle box, a filter column, the 360° sweep in the middle, and
 * the requests and lobby beside it; the room view is the thread with the
 * work in it.
 *
 * What is real is everything that was already real: the people on the
 * radar, the asks, the accepted rooms and their threads, the songs handed
 * back and forth, and the paired rooms where two people work one turn at a
 * time (the pen in `lib/pairs.ts` is the turn). What the page drew that is
 * not here: a turn timer and a queue inside the thread (the turn lives in
 * the paired room, where it is real), solo and mute on stems nobody can
 * hear yet, a podcast mic deck with live levels, and skill and DAW filters
 * over data nobody has entered. Said on screen where it matters.
 *
 * Built by composition: `CollabFinder` draws its profile and its radar
 * parts, `CollabRoom` its lobby and its room, and `CollabRadar` (the
 * podcast and posts desk) stays under the radar where it always was, so
 * the probe that types a show into it still finds the box on arrival.
 */
import React, { useState } from 'react';
import { Handshake, Radar, Send } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { AskToCollab } from './CollabRoom';

export default function CollabDesk({
  room,
  finder,
  radar,
}: {
  /** `<CollabRoom …/>` with its hand-offs wired by the studio. */
  readonly room: React.ReactElement<{ view?: 'all' | 'lobby' | 'room'; openId?: string | null; onEnter?: (id: string) => void }>;
  /** `<CollabFinder …/>`. */
  readonly finder: React.ReactElement<{ part?: 'all' | 'profile' | 'radar' }>;
  /** `<CollabRadar …/>`, the podcast and posts desk. */
  readonly radar: React.ReactElement;
}): React.ReactElement {
  const { t } = useLang();
  const [mode, setMode] = useState<'radar' | 'room'>('radar');
  const [open, setOpen] = useState<string | null>(null);
  const [handle, setHandle] = useState('');
  const enter = (id: string): void => {
    setOpen(id);
    setMode('room');
  };
  const typed = handle.trim().replace(/^@/, '');

  const PILL = (on: boolean): string =>
    `min-h-[44px] rounded-full border px-4 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
      on ? 'border-emerald-400 bg-emerald-500 text-onAccent font-extrabold' : 'border-zinc-700 text-zinc-400 hover:text-white'
    }`;

  return (
    <div className="space-y-4" data-collabdesk>
      {/* ── The bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-linear-to-r from-emerald-950/30 via-zinc-900 to-zinc-900 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Radar className="w-4 h-4 text-onAccent" />
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-extrabold text-white tracking-tight leading-tight">
              {t('collab.deskTitle', 'Collab Radar')}{' '}
              <span className="text-zinc-400 font-mono text-xs uppercase tracking-wider">{t('collab.deskSub', '& live room')}</span>
            </h4>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-zinc-950 p-1 rounded-full border border-white/10 flex items-center" data-collabmodes>
            <button type="button" data-collabmode="radar" onClick={() => setMode('radar')} className={PILL(mode === 'radar')}>
              <Radar className="w-3.5 h-3.5" />
              {t('collab.modeRadar', 'Collab Radar')}
            </button>
            <button type="button" data-collabmode="room" onClick={() => setMode('room')} className={PILL(mode === 'room')}>
              <Handshake className="w-3.5 h-3.5" />
              {t('collab.modeRoom', 'Live session room')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Invite by handle, the real ask ──────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-3 flex flex-col gap-2 sm:flex-row sm:items-center" data-collabinvite>
        <label className="text-xs font-bold text-zinc-300 sm:w-56 shrink-0" htmlFor="collab-handle">
          {t('collab.inviteByHandle', 'Invite somebody by handle')}
        </label>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-emerald-300 font-bold">@</span>
          <input
            id="collab-handle"
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder={t('collab.handlePlaceholder', 'beatmaker99')}
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden"
          />
          {typed ? (
            <AskToCollab
              handle={typed}
              because={t('collab.inviteBecause', 'I found your handle on FutureBox and would like to make something together.')}
              onAsked={() => setHandle('')}
            />
          ) : (
            <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-800/40 px-3 text-sm text-zinc-500">
              <Send className="w-3.5 h-3.5" />
              {t('collab.invite', 'Invite')}
            </span>
          )}
        </div>
      </div>

      {mode === 'radar' ? (
        /* Two columns, not Google's three: the studio's working pane sits
            between the rail and the copilot, and three columns in it left
            the sweep 160 pixels wide. The requests and the lobby come first
            down the side, because an unanswered request matters more than
            the profile under it. */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="space-y-4 min-w-0" data-collabside>
            <div data-collabrequests>
              {React.cloneElement(room, { view: 'lobby', openId: open, onEnter: enter })}
            </div>
            {React.cloneElement(finder, { part: 'profile' })}
          </aside>
          <main className="space-y-4 min-w-0">
            {React.cloneElement(finder, { part: 'radar' })}
          </main>
        </div>
      ) : (
        <div className="space-y-4" data-collabroomview>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-extrabold text-white">{t('collab.roomTitle', 'Live session room')}</p>
              <p className="text-xs text-zinc-400">
                {t('collab.roomSub', 'The thread you share, the songs handed across, and the paired rooms where you work one turn at a time.')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMode('radar')}
              className="min-h-[40px] rounded-xl border border-white/10 bg-zinc-800/40 px-3 text-xs font-bold text-zinc-300 hover:text-white"
            >
              {t('collab.backToRadar', 'Back to the radar')}
            </button>
          </div>
          {React.cloneElement(room, { view: 'room', openId: open, onEnter: enter })}
          <p className="text-[11px] text-zinc-500">
            {t('collab.roomHonest', 'Turns, solo and mute live in the paired rooms above, where two people really work on one thing. There is no turn timer in this thread, and no live microphones yet.')}
          </p>
        </div>
      )}

      {mode === 'radar' && radar}
    </div>
  );
}
