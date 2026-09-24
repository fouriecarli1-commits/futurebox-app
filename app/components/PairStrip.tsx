'use client';

/**
 * Who is in this room with you, whose turn it is, and one way to reach them.
 *
 * ── Why a strip and not a room of its own ────────────────────────────────
 *
 * Carli asked for every create-room to be duplicated for two people. Put to
 * her, she chose the version that keeps one room each and opens it in a pair
 * mode. This is that mode, drawn: the booth is still the booth, with a line
 * at the top saying you are not alone in it.
 *
 * ── The pen, and why it is drawn this loudly ─────────────────────────────
 *
 * She chose turn-taking. The whole value of that choice is that you can SEE
 * you do not have the turn — the alternative, both free and last one wins,
 * loses somebody's work with nothing on either screen to say so. So when the
 * pen is not yours this says so in a sentence, not with a greyed-out icon,
 * and the button to ask for it is right there rather than behind a menu.
 *
 * ── And no chat, on purpose ──────────────────────────────────────────────
 *
 * *"Ek dink nie ek wil 'n chat plek in sit nie. Dalk net die opsie om 'n
 * social link te kan share."* One address each. The talking happens on a
 * platform that already has moderation, blocking and a way to leave, none of
 * which this app has or should be building.
 */

import React, { useCallback, useState } from 'react';
import { Handshake, Link2, Loader2, PenLine, Send } from 'lucide-react';
import { pen as movePen, shareLink, type Pair } from '../lib/pairs';
import { HANDLE_PLATFORMS, CARRIES_A_NUMBER } from '../lib/sociallink';
import { useLang } from '../lib/i18n';

export default function PairStrip({
  pair,
  unread = false,
  onChanged,
}: {
  readonly pair: Pair;
  /** The names and links could not be read, so the strip says so. */
  readonly unread?: boolean;
  /** Re-read the room after anything that moves the pen or leaves a link. */
  readonly onChanged: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [platform, setPlatform] = useState(HANDLE_PLATFORMS[0]);
  const [handle, setHandle] = useState('');

  const act = useCallback(async (run: () => Promise<string | null>) => {
    setBusy(true);
    setProblem('');
    const said = await run();
    setBusy(false);
    if (said) setProblem(said);
    else onChanged();
  }, [onChanged]);

  return (
    <div data-pairstrip className="rounded-2xl border border-emerald-800/60 bg-emerald-950/20 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Handshake className="h-4 w-4 flex-shrink-0 text-emerald-400" />
        <p className="text-sm text-zinc-300 min-w-0">
          {t('pair.with', 'In here with you:')}{' '}
          <span className="font-semibold text-white">{pair.withName}</span>
        </p>

        {/* Whose turn, in a sentence. The greyed-out version of this was the
            thing to avoid: somebody pressing a control that does nothing and
            having to work out why for themselves. */}
        <span
          data-pairpen
          className={`ml-auto rounded-xl px-2.5 py-1 text-xs font-semibold ${
            pair.mine ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {pair.mine
            ? t('pair.yours', 'Your turn — you can work')
            : t('pair.theirs', 'Their turn — watch, or ask for it')}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {pair.mine ? (
          <button
            type="button"
            data-pairgive
            disabled={busy}
            onClick={() => void act(() => movePen(pair.id, 'give'))}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            {pair.wanted
              ? t('pair.giveAsked', 'Hand it over — they asked')
              : t('pair.give', 'Hand over the turn')}
          </button>
        ) : (
          <button
            type="button"
            data-pairask
            disabled={busy}
            onClick={() => void act(() => movePen(pair.id, 'ask'))}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
            {t('pair.ask', 'Ask for the turn')}
          </button>
        )}

        <button
          type="button"
          data-pairlink
          onClick={() => setOpen((was) => !was)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-white"
        >
          <Link2 className="h-4 w-4" />
          {pair.myLink ? t('pair.changeLink', 'Change where they reach you') : t('pair.addLink', 'Where they can reach you')}
        </button>
      </div>

      {/* Theirs, if they left one. Printed as what it is — a handle stays a
          handle, with nothing to press, because that is the whole point of
          somebody choosing to give one instead of an address. */}
      {/* And when we could not find out, that is said rather than drawn as
          nothing. "They left no link" and "we could not read it" look the
          same on a screen and are not the same thing to do about. */}
      {unread && !pair.theirLink && (
        <p data-pairunread className="text-sm text-amber-300">
          {t('pair.detailUnread', 'Could not read what they left. Try again in a moment.')}
        </p>
      )}
      {pair.theirLink && (
        <p data-pairtheirs className="text-sm text-zinc-400">
          {t('pair.reachThem', 'Reach them on')}{' '}
          <span className="font-semibold text-zinc-300">{pair.theirLink.platform}</span>:{' '}
          {pair.theirLink.url ? (
            <a
              href={pair.theirLink.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-emerald-300 underline break-all"
            >
              {pair.theirLink.shown}
            </a>
          ) : (
            <span className="text-zinc-300">{pair.theirLink.shown}</span>
          )}
        </p>
      )}

      {open && (
        <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <p className="text-xs leading-snug text-zinc-500">
            {t(
              'pair.noChat',
              'There is no chat in here on purpose. Leave one address or one handle and carry on talking where you already talk.',
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={draft}
              onChange={(event) => { setDraft(event.target.value); setHandle(''); }}
              placeholder={t('pair.linkHint', 'Paste a link — Instagram, TikTok, WhatsApp, YouTube…')}
              className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              data-pairsendlink
              disabled={busy || !draft.trim()}
              onClick={() => void act(async () => {
                const said = await shareLink(pair.id, { link: draft.trim() });
                if (!said) { setDraft(''); setOpen(false); }
                return said;
              })}
              className="flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 px-3 py-2 text-onAccent disabled:opacity-50"
              aria-label={t('pair.leaveIt', 'Leave it')}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>

          {/* A number is a heavier thing to hand a stranger than a profile
              name, so it is said here rather than in a policy page. */}
          <p className="text-xs text-amber-300/80">
            {t(
              'pair.numberWarning',
              'A WhatsApp link carries your phone number. A handle or another platform does not.',
            ).replace('WhatsApp', CARRIES_A_NUMBER)}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500">{t('pair.orHandle', 'Or just a handle, with nothing to press:')}</span>
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className="min-h-[44px] rounded-xl border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
            >
              {HANDLE_PLATFORMS.map((one) => (
                <option key={one} value={one}>{one}</option>
              ))}
            </select>
            <input
              value={handle}
              onChange={(event) => { setHandle(event.target.value); setDraft(''); }}
              placeholder="@you"
              className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              data-pairsendhandle
              disabled={busy || !handle.trim()}
              onClick={() => void act(async () => {
                const said = await shareLink(pair.id, { platform, handle: handle.trim() });
                if (!said) { setHandle(''); setOpen(false); }
                return said;
              })}
              className="flex min-h-[44px] min-w-[44px] flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 px-3 py-2 text-onAccent disabled:opacity-50"
              aria-label={t('pair.leaveIt', 'Leave it')}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {problem && <p className="text-sm text-amber-300">{problem}</p>}
    </div>
  );
}
