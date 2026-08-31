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
 * **It is English only.** The recording is in English. Putting it on the
 * Afrikaans page would be telling an Afrikaans speaker, in the first thing they
 * see, that the Afrikaans is the translation and the English is the product.
 * Better nothing there than that.
 *
 * **The file is replaceable without a deploy.** NEXT_PUBLIC_WELCOME_VIDEO takes
 * a URL — Supabase, a CDN, anywhere — and overrides the copy in `public/`. It
 * carries the NEXT_PUBLIC_ prefix on purpose and is the only thing in this app
 * that should: it is a public address for a public file, and the browser is
 * what needs to know it.
 */

import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { useLang } from '../lib/i18n';

const SOURCE = process.env.NEXT_PUBLIC_WELCOME_VIDEO || '/welcome.mp4';

export default function WelcomeVideo() {
  const { t, lang } = useLang();
  const [playing, setPlaying] = useState(false);

  if (lang !== 'en') return null;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black">
      {/* 16:9, held by the box rather than by the file, so a replacement of a
          different shape cannot make the page jump while it loads. */}
      <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
        <video
          // eslint-disable-next-line jsx-a11y/media-has-caption
          src={`${SOURCE}#t=0.1`}
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
