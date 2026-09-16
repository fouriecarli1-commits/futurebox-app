'use client';

/**
 * Keep a finished clip on your account, so the live room can find it.
 *
 * ── The fault this closes ────────────────────────────────────────────────
 *
 * Carli, 16 September 2026: *"die music video werk nie in die live nie."*
 *
 * It was never a playback fault, and that is why looking at the player found
 * nothing. A music video is not one file that arrives from an engine: the
 * engine hands back a SILENT clip, `lib/stitch.ts` lays the chosen part of
 * the song under it in the browser, and what comes out is a new blob that
 * only ever existed on the phone. The live room's composer lists the `videos`
 * table. Nothing had uploaded this, so no row existed, so the room had
 * nothing to offer — the room was correct and the video did not exist as far
 * as the server knew.
 *
 * A filmed take already had this path, built on 15 September. This is the
 * same two steps — the bytes straight into the bucket with the browser's own
 * session because the platform refuses a request body over about four and a
 * half megabytes, then the row written server-side — pointed at a clip the
 * desk made rather than one a camera did.
 *
 * ── The button says what happened, on itself ─────────────────────────────
 *
 * Carli, the same day: *"met elke relevante button waar dit sal sin maak,
 * moet dit darem 'n vinnige status update gee. Soos in live room. As mens dit
 * post, dan moet die button sê posted."*
 *
 * So the label carries the state: keep it, keeping, kept. On a phone the
 * button is where the eye already is, and a message somewhere else on the
 * screen is a message under a thumb.
 */

import React, { useState } from 'react';
import { Check, Loader2, Library } from 'lucide-react';
import { keepFilmed } from '../lib/filmed';
import { useLang } from '../lib/i18n';

export default function KeepVideo({
  blob,
  title,
  seconds,
  aspect,
}: {
  readonly blob: Blob;
  readonly title: string;
  readonly seconds: number;
  readonly aspect: '9:16' | '16:9' | '1:1';
}): React.ReactElement {
  const { t } = useLang();
  const [state, setState] = useState<'ready' | 'busy' | 'kept'>('ready');
  const [problem, setProblem] = useState<string | null>(null);

  /* Kept stays kept. Uploading the same blob twice makes a second row and a
     second copy in the bucket, and the room then offers the same video
     under the same name twice — which reads as a bug in the room. */
  const keep = async () => {
    if (state !== 'ready') return;
    setState('busy');
    setProblem(null);
    const done = await keepFilmed(blob, title, seconds, 'made', aspect);
    if (!done.ok) {
      setState('ready');
      setProblem(done.message);
      return;
    }
    setState('kept');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void keep()}
        disabled={state !== 'ready'}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-white disabled:opacity-60 disabled:hover:border-zinc-700"
      >
        {state === 'busy' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : state === 'kept' ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Library className="w-4 h-4" />
        )}
        {state === 'busy'
          ? t('keepvid.busy', 'Keeping it…')
          : state === 'kept'
            ? t('keepvid.kept', 'Kept — it is in the live room now')
            : t('keepvid.do', 'Keep it on my account')}
      </button>
      {problem && <p className="w-full text-sm text-rose-400 leading-relaxed">{problem}</p>}
    </>
  );
}
