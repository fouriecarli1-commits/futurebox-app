'use client';

/**
 * Post this, wherever you post things.
 *
 * The pieces existed — handles, captions, real composer URLs — and lived in
 * one panel, Collab Radar, which is not where anybody finishes a song. This is
 * the same machinery in the two places a finished thing actually is: a hook,
 * and your channel.
 *
 * ── What "post" honestly means here ──────────────────────────────────────
 *
 * Nothing on this row uploads anything. Posting on somebody's behalf is OAuth
 * against each platform's API — an approved developer app, a review, and in
 * several cases a registered company — which is a backend and a queue of
 * applications, not a button. `app/data/social.ts` says so in its own words
 * and this respects it.
 *
 * What it does instead is the whole of what is real: copies the caption, saves
 * the file, and opens the platform's own composer. Two of those three are the
 * work; the third is a link. X is the only one with a public URL that can
 * carry text for you, and it is the only one told to.
 *
 * The alternative — a button labelled "Post to TikTok" that opens a tab and
 * does nothing else — is the kind of lie that costs a person a real minute
 * before they work it out.
 */

import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Share2 } from 'lucide-react';
import { PLATFORMS, FUTUREBOX_TAG } from '../data/social';
import { buildCaption, loadHandles, shareUrlFor, type Handles } from '../lib/social';
import { useLang } from '../lib/i18n';
import Note from './Note';

export default function ShareRow({
  title,
  what,
  hashtags = [],
}: {
  title: string;
  /** A line about the thing, which becomes the first line of the caption. */
  what: string;
  hashtags?: readonly string[];
}): React.ReactElement {
  const { t } = useLang();
  const [handles, setHandles] = useState<Handles>({});
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setHandles(loadHandles()), []);

  const caption = buildCaption(`${title}\n${what}`.trim(), hashtags, { creditFuturebox: true });

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // A refused clipboard is not worth a panel. The caption is on screen and
      // can be selected by hand.
      setOpen(true);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        className="text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"
      >
        <Share2 className="w-3.5 h-3.5" />
        {t('share.post', 'Post it')}
      </button>

      {open && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-2.5">
          <Note className="text-xs text-zinc-500 leading-snug">{t(
              'share.how',
              'Copy the caption, save the file, then open the composer and drop it in. Nothing here uploads for you — posting on your behalf needs each platform to approve an app, which is a queue rather than a button.',
            )}</Note>

          <pre className="text-xs text-zinc-300 whitespace-pre-wrap bg-zinc-900 rounded-lg p-2.5 leading-relaxed">
            {caption}
          </pre>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => void copy()}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-emerald-500 flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? t('share.copied', 'Copied') : t('share.copy', 'Copy the caption')}
            </button>

            {PLATFORMS.map((platform) => {
              const mine = handles[platform.id]?.trim();
              return (
                <a
                  key={platform.id}
                  href={shareUrlFor(platform, caption)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={
                    platform.shareIntent
                      ? t('share.carries', 'Opens with the caption already in it')
                      : t('share.composer', 'Opens the composer — paste the caption there')
                  }
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
                >
                  {platform.name}
                  {/* Only X can carry the text. Marked, so nobody expects the
                      others to have done it for them. */}
                  {platform.shareIntent && <span className="text-emerald-400">·</span>}
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  {mine && <span className="sr-only">{mine}</span>}
                </a>
              );
            })}
          </div>

          <p className="text-xs text-zinc-600 leading-snug">
            {t('share.tagNote', 'The caption credits')} {FUTUREBOX_TAG}{' '}
            {t(
              'share.tagWhy',
              '— an untagged post is invisible to the channel that would share it on.',
            )}
          </p>
        </div>
      )}
    </div>
  );
}
