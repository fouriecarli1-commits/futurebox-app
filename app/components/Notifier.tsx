'use client';

/**
 * The pop-ups: `notify(...)` from anywhere in the app lands here.
 *
 * At the top of the screen, over everything including the studio, because a
 * collaboration request is the kind of thing that was being missed — the
 * owner and a friend invited each other on 20 October 2026 and neither saw
 * a thing. A request stays until it is answered or closed; a finished video
 * goes by itself after a while. A notice about the room somebody is already
 * looking at is not shown over it: they can see it arrive.
 *
 * The switches for each kind are on the account screen (`NoticeSettings`).
 */

import React, { useEffect, useState } from 'react';
import { Film, Handshake, Loader2, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { onNotice, type Notice } from '../lib/notify';

const GOES_AFTER_MS = 12_000;
const MOST = 3;

export default function Notifier({
  here,
  onOpen,
}: {
  readonly here?: string | null;
  /** Into the room a notice is about, for a notice with no buttons of its own. */
  readonly onOpen?: (room: string) => void;
}): React.ReactElement | null {
  const { t } = useLang();
  const [shown, setShown] = useState<Notice[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(
    () =>
      onNotice((notice) => {
        if (notice.room && notice.room === here && document.visibilityState === 'visible') return;
        setShown((was) => [notice, ...was.filter((one) => one.id !== notice.id)].slice(0, MOST));
        if (!notice.stay) {
          window.setTimeout(() => setShown((was) => was.filter((one) => one.id !== notice.id)), GOES_AFTER_MS);
        }
      }),
    [here],
  );

  if (!shown.length) return null;
  const close = (id: string): void => setShown((was) => was.filter((one) => one.id !== id));

  return (
    <div
      data-notifier
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex flex-col items-center gap-2 px-3"
      style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      aria-live="polite"
    >
      {shown.map((notice) => {
        const Icon = notice.kind === 'collab' ? Handshake : Film;
        const actions = notice.actions?.length
          ? notice.actions
          : notice.room && onOpen
            ? [{ label: t('notice.open', 'Open it'), main: true, run: () => onOpen(notice.room as string) }]
            : [];
        return (
          <div
            key={notice.id}
            role="alertdialog"
            aria-label={notice.title}
            data-notice={notice.kind}
            className="fb-fx-panel pointer-events-auto w-full max-w-md rounded-2xl p-3.5"
          >
            <div className="flex items-start gap-3">
              <span className="fb-fx-lens inline-flex h-9 w-9 shrink-0 items-center justify-center border">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug text-white">{notice.titleKey ? t(notice.titleKey, notice.title) : notice.title}</p>
                {notice.body ? <p className="mt-0.5 text-sm leading-snug text-zinc-300">{notice.body}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => close(notice.id)}
                aria-label={t('notice.close', 'Close')}
                className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {actions.length ? (
              <div className={`mt-3 grid gap-2 ${actions.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    data-noticeaction={action.label}
                    disabled={busy === notice.id}
                    onClick={() => {
                      setBusy(notice.id);
                      void Promise.resolve(action.run())
                        .catch(() => undefined)
                        .finally(() => {
                          setBusy(null);
                          close(notice.id);
                        });
                    }}
                    className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold disabled:opacity-50 ${
                      action.main
                        ? 'bg-emerald-500 text-onAccent'
                        : 'border border-zinc-700 bg-zinc-900 text-zinc-200'
                    }`}
                  >
                    {busy === notice.id && action.main ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
