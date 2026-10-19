'use client';

/**
 * Report something offensive, and — when it is a member's — block them.
 *
 * Opened by the small flag (`ReportFlag`) on what other members posted and in
 * every room where the AI makes something. A reason is a press, the note is
 * optional, and the sheet says plainly what happens next. Nobody leaves what
 * they were doing to do it, which is what Google Play asks for and what a
 * person who has just seen something nasty actually needs. `lib/reports.ts`
 * has the why.
 */

import React, { useState } from 'react';
import { Ban, Check, Flag, Loader2, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';
import { accessToken } from '../lib/cloud';
import { NOTE_MOST, REPORT_REASONS, type ReportKind, type ReportReason } from '../lib/reports';
import { blockOnAccount, hide } from '../lib/blocked';

export interface ReportTarget {
  readonly kind: ReportKind;
  /** What it is: a track or post id, or the room the AI made it in. */
  readonly ref: string;
  /** Whose it is, when it is a member's: their `who` key, never an account id. */
  readonly about?: string | null;
  /** The live post or link it is, so a block can find the member. */
  readonly post?: string;
  readonly said?: string;
  /** Their name, for "Block Thandi". */
  readonly name?: string;
  /** Where in the app it was seen. */
  readonly where: string;
}

export default function ReportSheet({
  target,
  onClose,
  onBlocked,
}: {
  readonly target: ReportTarget;
  readonly onClose: () => void;
  /** Told when the member was blocked, so the list hides them at once. */
  readonly onBlocked?: (owner: string) => void;
}): React.ReactElement {
  const { t } = useLang();
  useBackLayer(true, () => close());
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState('');
  const [blocked, setBlocked] = useState(false);

  const send = async (): Promise<void> => {
    if (!reason || sending) return;
    setSending(true);
    setProblem('');
    try {
      const token = await accessToken();
      const answer = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ ...target, reason, note }),
      });
      if (!answer.ok) {
        const said = (await answer.json().catch(() => ({}))) as { message?: string };
        setProblem(said.message ?? t('flag.failed', 'That could not be sent. Try again in a moment.'));
        return;
      }
      setSent(true);
    } catch {
      setProblem(t('flag.failed', 'That could not be sent. Try again in a moment.'));
    } finally {
      setSending(false);
    }
  };

  const blockThem = async (): Promise<void> => {
    if (!target.about || blocked) return;
    setBlocked(true);
    await blockOnAccount({ who: target.about, post: target.post, said: target.said });
  };

  /* Their work leaves the screen when the sheet closes, not while it is
     open: the sheet sits on their post, and taking the post away would take
     the "Blocked" with it before anybody had read it. */
  const close = (): void => {
    if (blocked && target.about) {
      hide(target.about);
      onBlocked?.(target.about);
    }
    onClose();
  };

  return (
    <div
      data-reportsheet
      role="dialog"
      aria-modal="true"
      aria-label={t('flag.title', 'Report this')}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-zinc-950/70 backdrop-blur-sm sm:items-center"
      onClick={(event) => {
        /* Not on to whatever is underneath: in the full-screen room the
           panel behind is the pause control. */
        event.stopPropagation();
        close();
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 px-4 pt-4 text-zinc-100 sm:rounded-3xl"
        style={{ paddingBottom: barClearance(16) }}
      >
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-rose-400" />
          <p className="flex-1 text-base font-extrabold">
            {target.kind === 'ai' ? t('flag.titleAi', 'Report what the AI made') : t('flag.title', 'Report this')}
          </p>
          <button type="button" data-reportclose onClick={close} aria-label={t('flag.close', 'Close')}
            className="grid h-11 w-11 place-items-center rounded-full border border-zinc-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <div className="space-y-3 py-4" data-reportsent>
            <p className="flex items-center gap-2 text-base font-bold text-emerald-300">
              <Check className="h-5 w-5" /> {t('flag.thanks', 'Thank you. It has been sent.')}
            </p>
            <p className="text-sm leading-relaxed text-zinc-400">
              {t('flag.next', 'A person at FutureBox reads every report. Anything that breaks the rules is taken down, and an account that keeps breaking them is closed.')}
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-3">
            <p className="text-sm text-zinc-400">{t('flag.why', 'What is wrong with it?')}</p>
            <div className="grid grid-cols-1 gap-2">
              {REPORT_REASONS.map((one) => (
                <button
                  key={one.id}
                  type="button"
                  data-reportreason={one.id}
                  aria-pressed={reason === one.id}
                  onClick={() => setReason(one.id)}
                  className={`min-h-[48px] rounded-xl border px-3 text-left text-sm font-bold ${
                    reason === one.id ? 'border-rose-400 bg-rose-500/15 text-rose-100' : 'border-zinc-800 bg-zinc-900 text-zinc-200'
                  }`}
                >
                  {t(one.says[0], one.says[1])}
                </button>
              ))}
            </div>
            <label className="block text-sm text-zinc-400">
              {t('flag.note', 'Anything to add? (optional)')}
              <textarea
                data-reportnote
                value={note}
                maxLength={NOTE_MOST}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100"
              />
            </label>
            {problem && <p className="text-sm font-semibold text-rose-300" role="alert">{problem}</p>}
            <button
              type="button"
              data-reportsend
              disabled={!reason || sending}
              onClick={() => void send()}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 text-base font-black text-white disabled:opacity-40"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Flag className="h-5 w-5" />}
              {t('flag.send', 'Send the report')}
            </button>
          </div>
        )}

        {target.about && (
          <button
            type="button"
            data-reportblock
            aria-pressed={blocked}
            disabled={blocked}
            onClick={() => void blockThem()}
            className="mb-2 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 px-4 text-sm font-bold text-zinc-200 disabled:opacity-60"
          >
            <Ban className="h-4 w-4" />
            {blocked
              ? t('flag.blocked', 'Blocked. You will not see their work again.')
              : target.name
                ? t('flag.blockName', 'Block {name}').replace('{name}', target.name)
                : t('flag.blockThem', 'Block this member')}
          </button>
        )}
      </div>
    </div>
  );
}

/** The small flag that opens the sheet. */
export function ReportFlag({
  target,
  onBlocked,
  className = '',
  style,
  compact = false,
  label = false,
}: {
  readonly target: ReportTarget;
  readonly onBlocked?: (owner: string) => void;
  readonly className?: string;
  /** For a flag on a picture, drawn on the same dark glass as its neighbours. */
  readonly style?: React.CSSProperties;
  /** For a bar that is already full on a small phone: the size of its other chips. */
  readonly compact?: boolean;
  /** Words beside the flag, where there is room for them. */
  readonly label?: boolean;
}): React.ReactElement {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const says = target.kind === 'ai' ? t('flag.titleAi', 'Report what the AI made') : t('flag.title', 'Report this');
  if (label) {
    return (
      <>
        <button
          type="button"
          data-reportflag={target.kind}
          onClick={(event) => { event.stopPropagation(); setOpen(true); }}
          className={`inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-rose-300 ${className}`}
          style={style}
        >
          <Flag className="h-4 w-4" /> {says}
        </button>
        {open && <ReportSheet target={target} onClose={() => setOpen(false)} onBlocked={onBlocked} />}
      </>
    );
  }
  return (
    <>
      <button
        type="button"
        data-reportflag={target.kind}
        onClick={(event) => { event.stopPropagation(); setOpen(true); }}
        aria-label={target.kind === 'ai' ? t('flag.titleAi', 'Report what the AI made') : t('flag.title', 'Report this')}
        title={target.kind === 'ai' ? t('flag.titleAi', 'Report what the AI made') : t('flag.title', 'Report this')}
        className={`inline-flex ${compact ? 'h-9 w-8' : 'h-11 w-11'} shrink-0 items-center justify-center rounded-full text-zinc-400 hover:text-rose-300 ${className}`}
        style={style}
      >
        <Flag className="h-4 w-4" />
      </button>
      {open && <ReportSheet target={target} onClose={() => setOpen(false)} onBlocked={onBlocked} />}
    </>
  );
}
