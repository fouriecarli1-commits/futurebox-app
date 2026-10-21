'use client';

/**
 * Who is in this room with you, whose turn it is, and one way to reach them.
 *
 * ── Why a strip and not a room of its own ────────────────────────────────
 *
 * The owner asked for every create-room to be duplicated for two people. Put to
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
import { Check, Copy, Handshake, Link2, Loader2, PenLine, Send } from 'lucide-react';
import { approve, pen as movePen, shareLink, type Pair } from '../lib/pairs';
import type { SongDraft } from '../lib/pairdraft';
import { HANDLE_PLATFORMS, CARRIES_A_NUMBER } from '../lib/sociallink';
import { useLang } from '../lib/i18n';

export default function PairStrip({
  pair,
  unread = false,
  song = null,
  onChanged,
}: {
  /** The song so far, handed over with the turn (Make a song only). */
  readonly song?: SongDraft | null;
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
  /** The note bar: a line for the other person, sent with the turn. */
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const songRoom = pair.surface === 'make';

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
        <Handshake className="h-4 w-4 shrink-0 text-emerald-400" />
        <p className="text-sm text-zinc-300 min-w-0">
          {t('pair.with', 'In here with you:')}{' '}
          <span className="font-semibold text-white">{pair.withName}</span>
          {/* Their handle, so two people called the same name are not the
              same person — the owner asked to see it in the room. */}
          {pair.withHandle && (
            <span data-pairhandle className="ml-1 text-sky-300">@{pair.withHandle.replace(/^@/, '')}</span>
          )}
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

      {/* What happens to the words. Said, because the first test of this
          room was somebody writing a song, handing it over, and the other
          side seeing an empty page with nothing saying why. */}
      {pair.surface === 'make' && (
        <p data-pairdraftnote className="text-xs text-zinc-400">
          {pair.drafts === false
            ? t('pair.draftsOff', 'The words stay on the screen they were written on for now — sending them with the turn is being switched on.')
            : pair.mine
              ? t('pair.draftsMine', 'What you write is kept for them as you go, and goes with the turn.')
              : t('pair.draftsTheirs', 'What they write shows up here as they go.')}
        </p>
      )}

      {/* Their note, at the top where the turn is shown. */}
      {songRoom && pair.note && !pair.noteMine && (
        <div data-pairnotein className="rounded-xl border border-sky-500/30 bg-sky-500/[0.07] px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
            {t('pair.noteFrom', 'Note from')} {pair.withName}
          </p>
          <p className="whitespace-pre-line pt-0.5 text-sm text-zinc-100">{pair.note}</p>
        </div>
      )}

      {/* ── Submit my part ───────────────────────────────────────────────
          Up here, where the turn is. It sat beside the Make button, three
          screens down, and the owner tested the room and did not find it
          (21 October 2026: "Die submit lyrics and handover sien ek nog
          nie"). In a song room handing over IS submitting: the words and
          the note go with the turn. */}
      {songRoom && pair.mine && (
        <label className="block">
          <span className="sr-only">{t('pair.noteLabel', 'A note for them')}</span>
          <textarea
            data-pairnote
            rows={2}
            maxLength={300}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('pair.notePlaceholder', 'A note for them (optional) — e.g. "I wrote verse 2, see if the chorus still fits"')}
            className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-sky-400 focus:outline-hidden"
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {pair.mine ? (
          <button
            type="button"
            data-pairgive
            {...(songRoom ? { 'data-pairsubmit': '' } : {})}
            disabled={busy}
            onClick={() => void act(async () => {
              const said = await movePen(pair.id, 'give', song, songRoom ? note : '');
              if (!said) setNote('');
              return said;
            })}
            className={songRoom
              ? 'inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-sky-400/50 bg-sky-500/15 px-4 py-2 text-sm font-bold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50'
              : 'inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-white disabled:opacity-50'}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : songRoom ? <Send className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
            {songRoom
              ? t('pair.submit', 'Submit my part — their turn')
              : pair.wanted
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

      {/* ── Keep your own copy ────────────────────────────────────────
          The owner, 21 October 2026: "collab moet ook 'n tip gee, copy and
          keep lyrics that you like somewhere else to keep the lyrics safe,
          collaborations can change lyrics." Two people take turns at one
          sheet, so a line one of them loved can be gone on the next turn.
          The copy is one press, of exactly what is on the sheet now. */}
      {songRoom && (
        <div data-pairkeeptip className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2">
          <p className="min-w-0 flex-1 basis-56 text-xs leading-snug text-amber-100/90">
            {t('pair.keepTip', 'Tip: the two of you can change the words on every turn. Copy the lines you love and keep them somewhere safe.')}
          </p>
          <button
            type="button"
            data-paircopy
            disabled={!song?.lyrics?.trim()}
            onClick={() => {
              const words = [song?.title, song?.lyrics].filter(Boolean).join('\n\n');
              void navigator.clipboard?.writeText(words).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2500);
              }).catch(() => setProblem(t('pair.copyFailed', 'This browser would not copy. Select the words and copy them by hand.')));
            }}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-amber-400/40 px-3 text-xs font-bold text-amber-100 disabled:opacity-40"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t('pair.copied', 'Copied') : t('pair.copyWords', 'Copy the words')}
          </button>
        </div>
      )}

      {/* ── Both say yes before the song is made ───────────────────────
          The owner, 21 October 2026: "Beide moet kan goedkeuring gee om
          uiteindelik die liedjie te generate." Two ticks, each person's own,
          and one button for yours. Handing over the turn or making the song
          clears both — see `/api/pairs` and `pairgate.ts`. */}
      {pair.surface === 'make' && pair.approvals && (
        <div data-pairapprove className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-2">
          {([
            [t('pair.okYou', 'You'), pair.okMine],
            [pair.withName, pair.okTheirs],
          ] as const).map(([who, yes], i) => (
            <span
              key={i}
              data-pairtick={yes ? 'yes' : 'no'}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                yes ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              <Check className={`h-3.5 w-3.5 ${yes ? '' : 'opacity-30'}`} />
              {who} · {yes ? t('pair.okYes', 'approved') : t('pair.okNo', 'not yet')}
            </span>
          ))}
          <button
            type="button"
            data-pairapprovebutton
            disabled={busy}
            onClick={() => void act(() => approve(pair.id, !pair.okMine))}
            className={`ml-auto inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
              pair.okMine
                ? 'border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white'
                : 'bg-emerald-500 text-onAccent hover:opacity-90'
            }`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {pair.okMine ? t('pair.unapprove', 'Take back my yes') : t('pair.approve', 'Approve this song')}
          </button>
        </div>
      )}

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
              className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden"
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
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl bg-emerald-500 px-3 py-2 text-onAccent disabled:opacity-50"
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
              className="min-h-[44px] rounded-xl border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-hidden"
            >
              {HANDLE_PLATFORMS.map((one) => (
                <option key={one} value={one}>{one}</option>
              ))}
            </select>
            <input
              value={handle}
              onChange={(event) => { setHandle(event.target.value); setDraft(''); }}
              placeholder="@you"
              className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden"
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
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl bg-emerald-500 px-3 py-2 text-onAccent disabled:opacity-50"
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
