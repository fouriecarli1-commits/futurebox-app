'use client';

/**
 * The cast strip: the same face, the same room, the same product, in one press.
 *
 * ── Why it sits above the pictures and not beside them ───────────────────
 *
 * `Pictures` is a scratch pad — twenty recent files, on this device. That is
 * the right thing for "the photo I am about to try". It is the wrong thing for
 * a presenter three adverts have been built around, which is why the cast
 * exists and why it goes first: the named, kept, on-every-device row comes
 * before the pile of recent uploads.
 *
 * Two strips could be confusing, so each says what it is in one line. "On your
 * account" against "on this device" is the whole distinction and it is the one
 * that decides which somebody should use.
 *
 * ── Why anybody would use it ─────────────────────────────────────────────
 *
 * Said on the strip, not left to be discovered. A video model draws a
 * different person every time you describe one — "a woman in her thirties in a
 * bright kitchen" is a description, not a person. Three clips meant to cut
 * together become three strangers. The only fix is to hand the engine the same
 * picture, and this is the shelf that makes that one press instead of a trip
 * to the file manager on whichever device you happen to be holding.
 *
 * ── The note, and why it is not applied ──────────────────────────────────
 *
 * A member can carry a line the picture cannot say — "always shot from his
 * left", "the label must face camera". It is shown when they are chosen and it
 * is never appended to the prompt automatically. A note that silently edits
 * what gets sent is a note nobody can debug when the clip comes back wrong; a
 * note in front of the person writing the shot is one they can use or ignore.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, Trash2, UserPlus, Users } from 'lucide-react';
import {
  ACCEPTS, CAST_LIMIT, addToCast, editCast, loadCast, pictureOf, removeFromCast, type Member,
} from '../lib/cast';
import { useLang } from '../lib/i18n';
import Note from './Note';

export default function Cast({
  /** The data URL in use right now, so the strip can show which member it is. */
  value,
  onChange,
  disabled = false,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}): React.ReactElement | null {
  const { t } = useLang();
  const picker = useRef<HTMLInputElement | null>(null);
  const [cast, setCast] = useState<Member[] | null>(null);
  const [faces, setFaces] = useState<Record<string, string>>({});
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [naming, setNaming] = useState<string | null>(null);

  useEffect(() => {
    void loadCast().then(setCast);
  }, []);

  // The pictures are in a private bucket, so each is downloaded once and held.
  useEffect(() => {
    if (!cast?.length) return;
    let alive = true;
    void Promise.all(
      cast.map(async (one) => [one.path, await pictureOf(one.path)] as const),
    ).then((pairs) => {
      if (!alive) return;
      const found: Record<string, string> = {};
      for (const [path, dataUrl] of pairs) if (dataUrl) found[path] = dataUrl;
      setFaces((was) => ({ ...was, ...found }));
    });
    return () => {
      alive = false;
    };
  }, [cast]);

  // A picture taken off the desk elsewhere leaves nobody selected here.
  useEffect(() => {
    if (!value) setChosen(null);
  }, [value]);

  const add = useCallback(
    async (file: File | undefined) => {
      if (!file || busy) return;
      setBusy(true);
      setProblem(null);
      try {
        // The filename, minus its extension, is a better first name than
        // "Untitled" and is one the person can change on the spot.
        const from = file.name.replace(/\.[^.]+$/, '').slice(0, 60);
        const made = await addToCast(file, from);
        if (!made.ok) {
          setProblem(
            made.why === 'full'
              ? `${t('cast.full', 'A cast holds')} ${CAST_LIMIT}. ${t('cast.fullTake', 'Take somebody out first.')}`
              : made.why === 'signed_out'
                ? t('cast.signedOut', 'Sign in first, so the cast is on your account rather than this device.')
                : made.why === 'too_big'
                  ? t('cast.tooBig', 'That picture is very large. Try one under 12MB.')
                  : made.why === 'not_an_image'
                    ? t('cast.notImage', 'That is not a picture.')
                    : t('cast.failed', 'That did not save. Try again in a moment.'),
          );
          return;
        }
        setCast((was) => [made.member, ...(was ?? [])]);
        // Straight into renaming: a member called "IMG_4821" is one nobody
        // recognises in a strip a week later, and now is the moment they know
        // who it is.
        setNaming(made.member.id);
      } finally {
        setBusy(false);
        if (picker.current) picker.current.value = '';
      }
    },
    [busy, t],
  );

  const use = useCallback(
    (member: Member) => {
      const face = faces[member.path];
      if (!face) return;
      const same = chosen === member.id;
      setChosen(same ? null : member.id);
      onChange(same ? null : face);
    },
    [faces, chosen, onChange],
  );

  const take = useCallback(
    async (member: Member) => {
      if (busy) return;
      setBusy(true);
      try {
        if (!(await removeFromCast(member))) return;
        setCast((was) => (was ?? []).filter((one) => one.id !== member.id));
        if (chosen === member.id) {
          setChosen(null);
          onChange(null);
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, chosen, onChange],
  );

  const rename = useCallback(async (member: Member, name: string) => {
    setCast((was) => (was ?? []).map((one) => (one.id === member.id ? { ...one, name } : one)));
    setNaming(null);
    await editCast(member.id, { name });
  }, []);

  // Nothing to show before the answer arrives, and nothing to show to somebody
  // with no account — the whole point of a cast is that it is not on a device.
  if (cast === null) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Users className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-300">{t('cast.title', 'Your cast')}</p>
          <Note className="text-xs text-zinc-500 leading-relaxed">{t(
              'cast.why',
              'Describe a person and the engine draws a different one every time — three clips meant to cut together become three strangers. Hand it the same picture instead. Kept on your account, so the same presenter is here on your phone too.',
            )}</Note>
        </div>
      </div>

      {cast.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cast.map((one) => {
            const face = faces[one.path];
            const active = chosen === one.id;
            return (
              <div key={one.id} className="flex-shrink-0 w-24 space-y-1">
                <button
                  type="button"
                  onClick={() => use(one)}
                  disabled={disabled || !face}
                  aria-pressed={active}
                  className={`relative block w-24 h-24 rounded-xl overflow-hidden border-2 transition-all disabled:opacity-50 ${
                    active ? 'border-emerald-500' : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {face ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={face} alt={one.name || t('cast.unnamed', 'Unnamed')} className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full bg-zinc-900">
                      <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
                    </span>
                  )}
                  {active && (
                    <span className="absolute top-1 right-1 rounded-full bg-emerald-500 p-0.5">
                      <Check className="w-3 h-3 text-black" />
                    </span>
                  )}
                </button>

                {naming === one.id ? (
                  <input
                    autoFocus
                    defaultValue={one.name}
                    aria-label={t('cast.name', 'Their name')}
                    onBlur={(event) => void rename(one, event.target.value.trim())}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
                      if (event.key === 'Escape') setNaming(null);
                    }}
                    className="w-24 rounded-lg border border-emerald-500 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-100 focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setNaming(one.id)}
                    className="block w-24 truncate rounded-lg border border-transparent px-1 py-1 text-left text-xs text-zinc-400 hover:text-white hover:border-zinc-700"
                  >
                    {one.name || t('cast.unnamed', 'Unnamed')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void take(one)}
                  disabled={disabled || busy}
                  aria-label={`${t('cast.remove', 'Take out of the cast')}: ${one.name || t('cast.unnamed', 'Unnamed')}`}
                  className="flex w-24 items-center justify-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 py-1 text-xs text-zinc-500 hover:text-rose-300 hover:border-rose-500/40 disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  {t('cast.out', 'Out')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {chosen && (() => {
        const member = cast.find((one) => one.id === chosen);
        return member?.note ? (
          <p className="text-xs text-zinc-400 leading-relaxed rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-2">
            {member.note}
          </p>
        ) : null;
      })()}

      <input
        ref={picker}
        type="file"
        accept={ACCEPTS}
        id="cast-file"
        className="sr-only"
        onChange={(event) => void add(event.target.files?.[0])}
      />
      <label
        htmlFor="cast-file"
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-600 ${
          disabled || busy || cast.length >= CAST_LIMIT ? 'pointer-events-none opacity-50' : 'cursor-pointer'
        }`}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        {t('cast.add', 'Add somebody to the cast')}
      </label>

      <p className="text-xs text-zinc-600">
        {cast.length}/{CAST_LIMIT} · {t('cast.account', 'on your account, on every device')}
      </p>

      {problem && <p className="text-xs text-amber-400 leading-snug">{problem}</p>}
    </div>
  );
}
