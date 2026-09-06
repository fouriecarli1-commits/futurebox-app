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
 *
 * ── Why it opens as a sheet and not underneath the button ────────────────
 *
 *   "in library wanneer mens kliek post it, dan is die drop down menu van
 *    opsies alles op mekaar gesquash."
 *
 * It used to open in place. In the channel that place is a cell of a grid
 * that is three columns wide on a laptop — about two hundred and eighty
 * pixels — and a caption, eight platform buttons and two paragraphs do not
 * go in two hundred and eighty pixels. They stacked and overlapped, which is
 * exactly what she saw.
 *
 * A width that depends on which room the row happens to be in is not a thing
 * to tune; it is a thing to stop depending on. So the panel is a sheet over
 * the whole screen, through a portal on `document.body` — because `fixed` is
 * only viewport-relative when no ancestor has a transform, a filter or a
 * containing block, and half the cards in this app have one.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Download, ExternalLink, Loader2, Share2, X } from 'lucide-react';
import { PLATFORMS, FUTUREBOX_TAG } from '../data/social';
import { buildCaption, loadHandles, shareUrlFor, type Handles } from '../lib/social';
import { useLang } from '../lib/i18n';
import Note from './Note';
import PostToLive from './PostToLive';
import { downloadBlob, getAudio, safeFilename, type Track } from '../lib/library';

export default function ShareRow({
  title,
  what,
  hashtags = [],
  track,
}: {
  title: string;
  /** A line about the thing, which becomes the first line of the caption. */
  what: string;
  hashtags?: readonly string[];
  /**
   * The song this row belongs to, where there is one.
   *
   * Only a song can go in the live room, and only the caller knows whether
   * this row is on a song or on an advert. Where it is given, posting to the
   * room is the first thing offered — it is the one place on this sheet that
   * actually posts rather than opening somebody else's composer.
   */
  track?: Track;
}): React.ReactElement {
  const { t } = useLang();
  const [handles, setHandles] = useState<Handles>({});
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  /* Portals need a document, and this component is rendered on the server
     first. Without the guard the first paint disagrees with the second. */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setHandles(loadHandles());
    setMounted(true);
  }, []);

  const caption = buildCaption(`${title}\n${what}`.trim(), hashtags, { creditFuturebox: true });

  /* The file, which is the one step here that needs the app.

     This sheet has told people to "save the file" since the day it was
     written and never gave them a way to do it — the caption had a button,
     the composers had buttons, and the thing they were actually going to post
     had to be found somewhere else first. That is what made a portal read as
     a list of links.

     `null` while nothing has been pressed, `'busy'` while the audio is coming
     out of storage, `'gone'` when it is not on this device. Said rather than
     failing quietly: a song made on a phone and opened on a laptop is a real
     case, and "nothing happened" is the worst answer to it. */
  const [file, setFile] = useState<null | 'busy' | 'gone'>(null);

  const save = async (): Promise<void> => {
    if (!track) return;
    setFile('busy');
    try {
      const audio = await getAudio(track.id);
      if (!audio) {
        setFile('gone');
        return;
      }
      downloadBlob(audio, safeFilename(track.title, 'wav'));
      setFile(null);
    } catch {
      setFile('gone');
    }
  };

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

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[92] flex flex-col justify-end bg-black/60 backdrop-blur-sm">
          {/* The ground, pressable, because a sheet with no way out except a
              small button is a sheet somebody gets stuck in. */}
          <button
            type="button"
            aria-label={t('share.close', 'Close')}
            onClick={() => setOpen(false)}
            className="flex-1"
          />
          <div className="max-h-[85vh] space-y-2.5 overflow-y-auto rounded-t-2xl border-t border-zinc-800 bg-zinc-950 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-200">
                {t('share.post', 'Post it')} — {title}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('share.close', 'Close')}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* The one thing here that really posts. */}
            {track && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <PostToLive track={track} />
                <span className="min-w-0 flex-1 text-sm text-zinc-500">
                  {t('share.liveIsReal', 'This one posts. Everything under it opens somebody else’s composer.')}
                </span>
              </div>
            )}

          <Note className="text-xs text-zinc-500 leading-snug">{t(
              'share.how',
              'Save the song, copy the caption, then open the composer and drop it in. Nothing here uploads for you — posting on your behalf needs each platform to approve an app, which is a queue rather than a button.',
            )}</Note>

          <pre className="text-xs text-zinc-300 whitespace-pre-wrap bg-zinc-900 rounded-lg p-2.5 leading-relaxed">
            {caption}
          </pre>

          <div className="flex flex-wrap gap-1.5">
            {/* First, because it is first in the sentence above it: save the
                file, copy the caption, open the composer. A row whose order
                does not match its own instructions is a row that gets read
                twice. */}
            {track && (
              <button
                type="button"
                onClick={() => void save()}
                disabled={file === 'busy'}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-emerald-500 flex items-center gap-1.5 disabled:opacity-50"
              >
                {file === 'busy' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                {t('share.save', 'Save the song')}
              </button>
            )}

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

          {file === 'gone' && (
            <p className="text-xs text-amber-400 leading-snug">
              {t(
                'share.notHere',
                'That song is not on this device — it may only be on the one that made it. Open it in your library first and it comes down with you.',
              )}
            </p>
          )}

            <p className="text-xs text-zinc-600 leading-snug">
              {t('share.tagNote', 'The caption credits')} {FUTUREBOX_TAG}{' '}
              {t(
                'share.tagWhy',
                '— an untagged post is invisible to the channel that would share it on.',
              )}
            </p>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
