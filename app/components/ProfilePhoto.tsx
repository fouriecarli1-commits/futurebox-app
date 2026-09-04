'use client';

/**
 * The picture at the top of somebody's channel.
 *
 * ── Why it is here and not on the collab profile form ────────────────────
 *
 * The collab form is where a name, a handle and links out are set, and a photo
 * would fit there too. It is also a form somebody opens once, when they go
 * looking for collaborators — which most people never do. The channel is the
 * page you land on to look at your own work, and a blank circle with your
 * initials in it on the page about you is the thing that actually makes
 * somebody want to fix it. So the photo is set where it is seen.
 *
 * ── Initials, not a stock silhouette ─────────────────────────────────────
 *
 * With no photo it draws the first letters of the name on the brand green.
 * A grey outline of a head says "broken or empty"; two letters say "this is
 * you, and you have not put a picture here yet", which is true and is also
 * legible in a list of forty channels.
 *
 * ── What it promises about the file ──────────────────────────────────────
 *
 * That it is public, said plainly under the button rather than buried in the
 * terms. The bucket is readable by anybody with the link, because a profile
 * picture shown to people who are not signed in cannot be otherwise, and
 * somebody deciding whether to upload a photo of their face deserves to know
 * that at the moment they decide.
 *
 * What it does not have to say, because `lib/avatar.ts` makes it untrue, is
 * that the file carries where the photo was taken. It is redrawn in the
 * browser before it goes, which leaves the pixels and drops the EXIF.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { ACCEPTS, publicUrl, remove as removeFile, squared, upload } from '../lib/avatar';
import { useLang } from '../lib/i18n';

export default function ProfilePhoto({
  name,
  path,
  onChanged,
}: {
  /** For the initials, and for the alt text. */
  readonly name: string;
  /** What is stored on the row now, or null. */
  readonly path: string | null;
  /** Called with the new path — null when it was taken down. The channel saves it. */
  readonly onChanged: (path: string | null) => Promise<void>;
}): React.ReactElement {
  const { t } = useLang();
  const picker = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // Shown the instant it is squared, before the upload finishes. Waiting for a
  // round trip to see your own photo makes a fast thing feel slow.
  const [preview, setPreview] = useState<string | null>(null);

  const showing = preview || (path ? publicUrl(path) : '');

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || '?';

  const choose = useCallback(
    async (file: File | undefined) => {
      if (!file || busy) return;
      setBusy(true);
      setProblem(null);
      try {
        const made = await squared(file);
        if (!made.ok) {
          setProblem(
            made.why === 'too_big'
              ? t('photo.tooBig', 'That picture is very large. Try one under 12MB.')
              : made.why === 'not_an_image'
                ? t('photo.notImage', 'That is not a picture.')
                : t('photo.unreadable', 'That picture could not be read. A JPEG or a PNG will work.'),
          );
          return;
        }
        setPreview(made.preview);
        const put = await upload(made.blob, path);
        if (!put.ok) {
          setPreview(null);
          setProblem(
            put.why === 'signed_out'
              ? t('photo.signedOut', 'Sign in first, so it is saved to your account.')
              : t('photo.failed', 'That did not upload. Try again in a moment.'),
          );
          return;
        }
        await onChanged(put.path);
      } finally {
        setBusy(false);
        // So choosing the same file twice in a row still fires a change.
        if (picker.current) picker.current.value = '';
      }
    },
    [busy, path, onChanged, t],
  );

  const take = useCallback(async () => {
    if (!path || busy) return;
    setBusy(true);
    setProblem(null);
    try {
      // The row is cleared whether or not the file went, because a row
      // pointing at a file that is gone shows a broken image, and that is
      // worse than an orphan nobody can find.
      await removeFile(path);
      setPreview(null);
      await onChanged(null);
    } finally {
      setBusy(false);
    }
  }, [path, busy, onChanged]);

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0">
        {showing ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={showing}
            alt={t('photo.alt', 'Your profile picture')}
            width={88}
            height={88}
            className="w-[88px] h-[88px] rounded-full object-cover border border-zinc-700 bg-zinc-900"
          />
        ) : (
          <div
            aria-hidden="true"
            className="w-[88px] h-[88px] rounded-full border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center text-2xl font-black text-emerald-300"
          >
            {initials}
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={picker}
            type="file"
            accept={ACCEPTS}
            className="sr-only"
            id="profile-photo-file"
            onChange={(event) => void choose(event.target.files?.[0])}
          />
          <label
            htmlFor="profile-photo-file"
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-600"
          >
            <Camera className="w-4 h-4" />
            {path ? t('photo.change', 'Change picture') : t('photo.add', 'Add a picture')}
          </label>

          {path && (
            <button
              type="button"
              onClick={() => void take()}
              disabled={busy}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm font-semibold text-zinc-400 hover:text-white disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {t('photo.remove', 'Take it down')}
            </button>
          )}
        </div>

        <p className="text-sm text-zinc-500 leading-relaxed">
          {t(
            'photo.note',
            'Anybody looking at your channel can see it, signed in or not. It is squared and shrunk here in your browser before it goes, which also strips where the photo was taken.',
          )}
        </p>

        {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}
      </div>
    </div>
  );
}
