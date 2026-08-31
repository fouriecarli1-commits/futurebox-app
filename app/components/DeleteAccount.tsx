'use client';

/**
 * The end of an account, said plainly before it happens.
 *
 * Two things this deliberately does not do. It does not hide behind three
 * screens of settings — somebody who wants to leave should be able to, and an
 * app that makes leaving hard is telling you what it thinks of you. And it
 * does not soften what happens: there is no thirty-day grace period, because
 * holding a person's voice recordings for a month after they asked you to stop
 * is the opposite of what they asked for.
 *
 * What it does do is make it hard to do by accident. The list is specific
 * rather than "all your data", and confirming means typing your own address —
 * a thing you cannot do by clicking twice quickly.
 */

import React, { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { accessToken, signOut } from '../lib/cloud';
import { useLang } from '../lib/i18n';

export default function DeleteAccount({ email }: { email: string }): React.ReactElement {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const matches = typed.trim().toLowerCase() === email.trim().toLowerCase();

  const go = async (): Promise<void> => {
    setProblem(null);
    setBusy(true);
    const token = await accessToken();
    const response = await fetch('/api/account', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ confirm: typed.trim() }),
    }).catch(() => null);

    if (!response) {
      setBusy(false);
      setProblem(t('gone.unreachable', 'Could not reach the app. Nothing was deleted.'));
      return;
    }
    const data = (await response.json().catch(() => ({}))) as { message?: string; left?: string[] };
    if (!response.ok) {
      setBusy(false);
      setProblem(data.message ?? t('gone.failed', 'That did not work, and nothing was deleted.'));
      return;
    }

    // The session belongs to an account that no longer exists. Signing out
    // rather than leaving a dead token in the browser to fail on the next
    // request in a way nobody could explain.
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-4 space-y-3">
      <div>
        <p className="text-base font-bold text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          {t('gone.title', 'Delete your account')}
        </p>
        <p className="text-sm text-zinc-400 leading-snug pt-1">
          {t('gone.note', 'Everything goes, and none of it comes back.')}
        </p>
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-red-500/40 text-red-300 text-sm font-semibold hover:bg-red-500/10"
        >
          {t('gone.start', 'Delete my account')}
        </button>
      ) : (
        <div className="space-y-3">
          {/* Named, not summarised. "All your data" is a phrase; this is a list
              of the things somebody would actually miss. */}
          <ul className="space-y-1 text-sm text-zinc-300">
            {[
              t('gone.songs', 'Your songs, and the audio itself'),
              t('gone.voices', 'Any cloned voice — removed from the voice service too, not just from here'),
              t('gone.sounds', 'Any trained sound of your own'),
              t('gone.credits', 'Your credits, whether they were given or bought'),
              t('gone.collab', 'Your collaborations and everything said in them'),
              t('gone.profile', 'Your profile and your channel'),
            ].map((line) => (
              <li key={line} className="flex gap-2 leading-snug">
                <Trash2 className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                {line}
              </li>
            ))}
          </ul>

          <p className="text-sm text-amber-300 leading-snug">
            {t(
              'gone.sub',
              'If you are on a plan it is cancelled first. If that cancellation fails, nothing is deleted — being charged for an account you no longer have is the one thing that cannot be put right by asking.',
            )}
          </p>

          <label className="block space-y-1.5">
            <span className="text-sm text-zinc-400">
              {t('gone.type', 'Type')} <span className="text-zinc-200 font-semibold">{email}</span>{' '}
              {t('gone.toConfirm', 'to confirm')}
            </span>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
            />
          </label>

          {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void go()}
              disabled={!matches || busy}
              className="px-3.5 py-2 rounded-xl bg-red-500 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {busy ? t('gone.going', 'Deleting…') : t('gone.confirm', 'Delete it all')}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped('');
                setProblem(null);
              }}
              disabled={busy}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm font-semibold text-zinc-400 disabled:opacity-50"
            >
              {t('gone.keep', 'Keep my account')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
