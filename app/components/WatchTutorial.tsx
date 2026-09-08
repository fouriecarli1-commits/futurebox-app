'use client';

/**
 * The tutorial link, in the places where somebody is about to clone a voice.
 *
 * Cloning is the one step in this app that happens partly somewhere else:
 * a singing model is trained at kits.ai, and the room here can only sing in
 * one that already exists. "Once you have made one at kits.ai" is a true
 * sentence and a dead end for anybody who has never made one — so the room
 * says where to learn how, rather than leaving them to search for it.
 *
 * Carli sent the video on 8 September 2026 and asked for it to sit in the
 * voice-cloning section.
 *
 * ── Why a plain link and not a player ────────────────────────────────────
 *
 * An embedded YouTube frame loads their scripts into this page and starts
 * measuring whoever opens the room, whether or not they press play. This is a
 * link somebody chooses to follow, in their own tab. It is also one element
 * rather than a sixteen-by-nine block in the middle of a form.
 *
 * `noopener` with `noreferrer`: a tab opened with `target="_blank"` can
 * otherwise reach back at this one through `window.opener`.
 */

import React from 'react';
import { GraduationCap } from 'lucide-react';
import { useLang } from '../lib/i18n';

/** The tutorial itself. One video, named here so every room shows the same. */
export const TUTORIAL = 'https://www.youtube.com/watch?v=TV-NVRKtHVo&t=1s';

export default function WatchTutorial({
  className = '',
}: {
  readonly className?: string;
}): React.ReactElement {
  const { t } = useLang();
  return (
    <a
      href={TUTORIAL}
      target="_blank"
      rel="noopener noreferrer"
      /* A box, like every other button in the app, and forty-four pixels tall
         so it is a target on a phone rather than a line of underlined text
         between two fields. */
      className={`min-h-[44px] w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 ${className}`}
    >
      <GraduationCap className="h-4 w-4 flex-shrink-0" />
      {t('voice.tutorial', 'Watch how voice cloning works')}
    </a>
  );
}
