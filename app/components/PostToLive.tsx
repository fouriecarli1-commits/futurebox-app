'use client';

/**
 * Put this song in the live room, from wherever the song is.
 *
 * ── Why this exists as its own thing ─────────────────────────────────────
 *
 *   "Nie by die liedjies in make a song of in library is die opsie om dit na
 *    die live feed te post nie."
 *
 * Posting to the room lived in one place: a list inside the Live room itself,
 * showing the first six songs. So the way to put a song in front of people was
 * to finish it in one room, leave, open another, and hope it was in the six.
 * Anything older than six songs could not be posted at all — not hidden behind
 * a scroll, actually unreachable.
 *
 * A song is finished in Make a song and lives in the Channel. This is the same
 * one request, `POST /api/live`, put on the song in both of those places.
 *
 * ── What it does not do ──────────────────────────────────────────────────
 *
 * It does not upload the audio. The room hands out a short-lived address for
 * the file already on the account, which is why taking a post down takes the
 * sound away with it — see the note at the top of `LiveChannel`. This button
 * is the row in the room, not a copy of the song.
 */

import React, { useState } from 'react';
import { Check, Loader2, Radio } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { refusalText } from '../lib/apierror';
import { useLang } from '../lib/i18n';
import type { Track } from '../lib/library';

export default function PostToLive({
  track,
  onPosted,
}: {
  readonly track: Track;
  /** So a screen that shows the room can refresh itself after a post. */
  readonly onPosted?: () => void;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [problem, setProblem] = useState('');

  const post = async () => {
    setProblem('');
    setBusy(true);
    try {
      const token = await accessToken();
      const response = await fetch('/api/live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          what: 'post',
          kind: 'track',
          sourceId: track.id,
          title: track.title,
          seconds: track.seconds,
        }),
      });
      if (!response.ok) {
        const said = (await response.json().catch(() => null)) as { message?: string } | null;
        setProblem(refusalText(said, lang, t('live.failed', 'That did not go through.')));
        return;
      }
      setDone(true);
      onPosted?.();
      /* It goes back to being pressable, because a song can be posted again
         after it has been taken down and a button stuck on "Done" reads as
         one that has stopped working. */
      window.setTimeout(() => setDone(false), 4000);
    } catch {
      setProblem(t('live.offline', 'Could not reach the app’s server.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void post()}
        disabled={busy}
        className="px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : done ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Radio className="w-3.5 h-3.5" />
        )}
        {done ? t('live.posted', 'In the room') : t('live.toRoom', 'Post to Live')}
      </button>
      {problem && <p className="w-full text-sm text-amber-300 leading-snug">{problem}</p>}
    </>
  );
}
