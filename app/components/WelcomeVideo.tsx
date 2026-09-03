'use client';

/**
 * The welcome video, and the three decisions in it.
 *
 * **It does not autoplay.** A landing page that starts a 12MB download before
 * anybody has decided to stay spends a stranger's mobile data to show them
 * something they did not ask for, and browsers block the sound anyway — so an
 * autoplaying advert is a silent one, which is the one thing this video must
 * not be. It has a spoken message. Somebody presses play, and then they have
 * chosen to listen.
 *
 * `preload="metadata"` and `#t=0.1` on the source are what put a real frame
 * behind the play button without a poster file: the browser fetches the header,
 * seeks a tenth of a second in, and paints that. A first frame of pure black —
 * which is what a plain `preload="none"` gives — reads as a broken player.
 *
 * **Each language gets its own recording, or none.** This used to be English
 * only, on the reasoning that putting an English video on the Afrikaans page
 * tells an Afrikaans speaker — in the first thing they see — that the Afrikaans
 * is the translation and the English is the product. That reasoning still
 * holds; what changed is that there is an Afrikaans recording now. So each
 * language plays its own, and a language with no recording set still shows
 * nothing rather than somebody else's.
 *
 * **The files are replaceable without a deploy.** Each variable takes a URL —
 * Supabase, a CDN, anywhere — and overrides the copy in `public/`. They carry
 * the NEXT_PUBLIC_ prefix on purpose and are the only things in this app that
 * should: they are public addresses for public files, and the browser is what
 * needs to know them.
 *
 * Both are written out in full below rather than looked up by a computed key.
 * Next inlines `process.env.NEXT_PUBLIC_*` at build time only where it can see
 * the whole name in the source — `process.env[whatever]` is not replaced and
 * arrives at the browser as undefined, which would be a blank player with no
 * error to explain it.
 */

import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { useLang } from '../lib/i18n';

const AFRIKAANS = process.env.NEXT_PUBLIC_WELCOME_VIDEO_AFRIKAANS ?? '';
/** The older name is still honoured, so an existing setup keeps working. */
const ENGLISH =
  process.env.NEXT_PUBLIC_WELCOME_VIDEO_ENGLISH ??
  process.env.NEXT_PUBLIC_WELCOME_VIDEO ??
  '/welcome.mp4';

export default function WelcomeVideo() {
  const { t, lang } = useLang();
  const [playing, setPlaying] = useState(false);

  const source = lang === 'af' ? AFRIKAANS : ENGLISH;
  // No recording in this language: nothing, rather than the other one.
  if (!source) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black">
      {/* 16:9, held by the box rather than by the file, so a replacement of a
          different shape cannot make the page jump while it loads. */}
      <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
        <video
          // eslint-disable-next-line jsx-a11y/media-has-caption
          src={`${source}#t=0.1`}
          controls={playing}
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
          onPlay={() => setPlaying(true)}
        />

        {!playing && (
          <button
            type="button"
            onClick={(event) => {
              const video = event.currentTarget.parentElement?.querySelector('video');
              void video?.play();
            }}
            aria-label={t('welcome.play', 'Play the introduction')}
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/20 to-black/40 group"
          >
            <span className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center transition-transform group-hover:scale-105">
              <Play className="w-6 h-6 text-zinc-900 translate-x-0.5" fill="currentColor" />
            </span>
          </button>
        )}
      </div>

      {!playing && (
        <p className="absolute bottom-3 left-4 right-4 text-xs text-zinc-300/90 pointer-events-none">
          {t('welcome.videoNote', 'Ten seconds on what this is. Sound on.')}
        </p>
      )}
    </div>
  );
}
