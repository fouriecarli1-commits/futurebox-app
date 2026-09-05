'use client';

/**
 * The name your work goes out under, and the handle people write to.
 *
 * ── Why this is not just a text field ────────────────────────────────────
 *
 * There are two names in this app and until now they were not connected.
 *
 * The **account name** is a fragment of the sign-up email — `toAccount` in
 * `lib/cloud.ts` does `email.split('@')[0]`, because at sign-up that is the
 * only thing there is. It is what the header, the greeting and the account
 * panel have always shown.
 *
 * The **recording name** is the one somebody chose, on the `creators` row,
 * and it is what the live room and the collab radar already put beside a
 * song. So the app has been calling the same person two different things
 * depending on which screen they were looking at — `anrefourie` in the
 * corner, and their real name on their own release.
 *
 * This is the one place that name is set, and it is mounted in both places
 * somebody would look: their channel, and the account panel behind **You**.
 * Everything else reads it and falls back to the account name only when it
 * has never been set.
 *
 * ── The handle is here too ───────────────────────────────────────────────
 *
 * It is the other half of the same answer. The name goes on a release; the
 * handle is the address somebody writes to on the radar, and a person who has
 * changed one and not the other is half renamed. It is stored as typed and
 * shown with the `@` on, because the `@` is not part of what you type.
 *
 * ── Kept while it is being typed ─────────────────────────────────────────
 *
 * Seeded from the row once rather than kept in sync with it: an input whose
 * value is overwritten every time the profile reloads takes the cursor with
 * it, and somebody typing a name on a phone loses the last two letters.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { fetchCreator, saveCreator, type Creator } from '../lib/radar';
import { useLang } from '../lib/i18n';
import Hint from './Hint';
import Note from './Note';

const EMPTY: Creator = { name: '', handle: '', about: '', links: {} };

export default function RecordingName({
  creator,
  onSaved,
  compact = false,
}: {
  /**
   * The row, when the screen mounting this already has it.
   *
   * Left out, this fetches it itself — which is what the account panel wants,
   * because it has no other reason to know about a creator row.
   */
  readonly creator?: Creator | null;
  /** The saved row, so whatever is showing the name can redraw with it. */
  readonly onSaved?: (creator: Creator) => void;
  /** Drop the explanations, for a panel that is already dense. */
  readonly compact?: boolean;
}): React.ReactElement {
  const { t } = useLang();
  const [row, setRow] = useState<Creator | null>(creator ?? null);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [kept, setKept] = useState(0);
  const [problem, setProblem] = useState('');
  const seeded = useRef(false);

  useEffect(() => {
    if (creator !== undefined) setRow(creator);
  }, [creator]);

  /* Its own fetch, only when nobody handed it a row. */
  useEffect(() => {
    if (creator !== undefined) return;
    let live = true;
    void fetchCreator().then((found) => {
      if (live) setRow(found);
    });
    return () => {
      live = false;
    };
  }, [creator]);

  useEffect(() => {
    if (seeded.current || !row) return;
    seeded.current = true;
    setName(row.name ?? '');
    setHandle(row.handle ?? '');
  }, [row]);

  const was = row ?? EMPTY;
  const wantedName = name.trim().slice(0, 60);
  /* The same shape the server enforces, applied while it is being typed so
     nobody saves "Anré Fourie!" and gets back "anrfourie" with no explanation. */
  const wantedHandle = handle.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 24);
  const changed = wantedName !== (was.name ?? '') || wantedHandle !== (was.handle ?? '');

  const keep = useCallback(async () => {
    if (!changed || busy) return;
    setBusy(true);
    setProblem('');
    const updated: Creator = { ...was, name: wantedName, handle: wantedHandle };
    const failed = await saveCreator(updated);
    setBusy(false);
    if (failed) {
      setProblem(failed);
      return;
    }
    setRow(updated);
    setKept(Date.now());
    onSaved?.(updated);
  }, [busy, changed, onSaved, was, wantedHandle, wantedName]);

  return (
    /* Saved when focus leaves the *block*, not when it leaves a field.
       Per-field blur looks the same and is not: moving from the name to the
       handle fires a save, the save re-renders while the second field is
       being typed into, and React puts the old value back — so the handle
       somebody just typed silently disappears. Found by a probe filling both
       fields in a row, which is what a person with a keyboard does. */
    <div
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) void keep();
      }}
      className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2.5"
    >
      <label htmlFor="recording-name" className="flex items-center gap-1 text-sm font-semibold text-zinc-300">
        {t('chan.recName', 'Your recording name')}
        <Hint>
          {t(
            'chan.recNameWhy',
            'The name your work goes out under. It is shown beside every song and video you post, in the live room and on the collab radar, in place of your handle.',
          )}
        </Hint>
      </label>
      <div className="flex gap-2">
        <input
          id="recording-name"
          value={name}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void keep();
            }
          }}
          placeholder={t('chan.recNamePlaceholder', 'What you release under')}
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <label htmlFor="recording-handle" className="flex items-center gap-1 text-sm font-semibold text-zinc-300">
        {t('chan.recHandle', 'Your handle')}
        <Hint>
          {t(
            'chan.recHandleWhy',
            'The address somebody writes to on the collab radar. Letters, numbers, dots and underscores, and it has to be one nobody else has taken.',
          )}
        </Hint>
      </label>
      <div className="flex gap-2">
        <span className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 text-sm text-zinc-500">
          @
        </span>
        <input
          id="recording-handle"
          value={handle}
          maxLength={24}
          onChange={(event) => setHandle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void keep();
            }
          }}
          placeholder={t('chan.recHandlePlaceholder', 'what people write to')}
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void keep()}
          /* Disabled only while a save is in flight, not when nothing has
             changed. Leaving a field blurs it, blurring saves, and a button
             that disables itself on the way down means the press that
             triggered the save looks like it did nothing. `keep` is a no-op
             when there is nothing to keep, which is the right place for that
             decision. */
          disabled={busy}
          className="px-3.5 py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center gap-1.5 flex-shrink-0 disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {t('chan.recNameSave', 'Save')}
        </button>
      </div>

      {kept > 0 && !problem && (
        <p className="text-xs text-emerald-400">
          {t('chan.recNameKept', 'Saved. New posts go out under this name.')}
        </p>
      )}
      {problem && <p className="text-xs text-amber-400 leading-snug">{problem}</p>}
      {!compact && (
        <Note className="text-xs text-zinc-500">
          {t(
            'chan.recNameNote',
            'Work you have already posted keeps the name it went out under. This changes what the next one carries.',
          )}
        </Note>
      )}
    </div>
  );
}
