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
 *
 * ── The question it asks before it posts ─────────────────────────────────
 *
 *   "Wanneer iemand 'n live post dan kry hulle 'n pop up wat vra of ander dit
 *    mag gebruik as hooks."
 *
 * Posting is one press and stays one press for anybody who does not care. But
 * putting a song in a room where other people can build on it is a decision
 * about somebody's own music, and a decision made silently on their behalf is
 * not a decision. So the press opens the question, and the question has two
 * answers and no default.
 *
 * ── Saying exactly what is being permitted ───────────────────────────────
 *
 * The panel says the two things it allows and the one it does not, because
 * the honest version is narrower than "use it as a hook" sounds:
 *
 *   allowed      somebody cuts a vertical clip from this song — real audio,
 *                and the half the permission is genuinely for
 *   allowed      somebody starts a new song from this one's style and title,
 *                with the maker's name attached
 *   NOT possible the audio going into a model. ElevenLabs' music call takes
 *                text — style words, sections, a prompt — and no reference
 *                audio at all. A new song begins at the WORDS.
 *
 * Writing that on the panel rather than in a policy page is the difference
 * between asking somebody and telling them afterwards.
 */

import React, { useState } from 'react';
import { barClearance } from './TabBar';
import { Check, Loader2, Radio } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { refusalText } from '../lib/apierror';
import { useBackLayer } from '../lib/backstack';
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
  /** The question is open. Nothing has been posted and nothing is decided. */
  const [asking, setAsking] = useState(false);

  /* The question paints over the whole app, so the phone's Back button has to
     close it rather than leave the room behind it. Without this the press
     unwinds past an overlay the member can still see, which reads as the app
     jumping somewhere on its own. `check:backlayers` holds the rule for every
     full-screen overlay; this one was the last that had not registered. */
  useBackLayer(asking, () => setAsking(false));

  const post = async (buildOn: boolean) => {
    setAsking(false);
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
          buildOn,
          /* Sent whichever answer was given, because the room stores it
             either way — see the note on the insert. What gates its use is
             the permission, not whether the string was ever sent. */
          style: track.style,
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
        onClick={() => setAsking(true)}
        disabled={busy}
        className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5 disabled:opacity-50"
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

      {asking && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-scrim/80 p-4 sm:items-center"
          style={{ paddingBottom: barClearance(16) }}
          role="dialog"
          aria-modal="true"
          aria-label={t('buildon.title', 'May others build on this?')}
          onClick={() => setAsking(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-black leading-tight text-white">
              {t('buildon.title', 'May others build on this?')}
            </h2>
            <p className="mt-2 text-sm leading-snug text-zinc-400">
              {t(
                'buildon.what',
                'Somebody can cut a short clip from this song, and start a new one from its style — with your name on it.',
              )}
            </p>
            <p className="mt-2 text-sm leading-snug text-zinc-500">
              {t(
                'buildon.not',
                'Your audio file stays yours. It is never copied and never goes into a model — a new song begins from the words, not from your recording.',
              )}
            </p>

            {/* Two answers, neither of them the default one. The second is not
                a cancel: both post the song, and the only difference is the
                permission. Cancelling is the backdrop or the escape. */}
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => void post(true)}
                className="min-h-[44px] flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-3 font-bold text-onAccent"
              >
                {t('buildon.yes', 'Yes, others may')}
              </button>
              <button
                type="button"
                onClick={() => void post(false)}
                className="min-h-[44px] flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 font-semibold text-zinc-300 hover:border-zinc-500"
              >
                {t('buildon.no', 'No, just me')}
              </button>
            </div>
            <p className="mt-3 text-xs leading-snug text-zinc-600">
              {t('buildon.later', 'Either way the song goes in the room. You can take it out again at any time.')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
