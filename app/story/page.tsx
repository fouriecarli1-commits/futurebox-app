'use client';

/**
 * Story mode, at an address.
 *
 * Carli, 9 October 2026: *"Gaan aan met story mode."*
 *
 * ── Why a page and not a room on the rail ────────────────────────────────
 *
 * The same reason `/kids` is one. The rail is thirteen rooms about making a
 * record, and a storybook is not a step in that; filing it under one of the
 * four stages would be saying something untrue about when somebody does it.
 * An address is also what makes it reachable from the kids room later
 * without that room growing a rail of its own.
 *
 * ── Why it is not in the kids room yet, and that is deliberate ───────────
 *
 * `check:kinderkamer` holds that nothing in the child's room can be typed
 * into, and a story is typed. The grown-up writes it; the child hears it. So
 * the shelf of finished stories in the kids room is the next piece, and
 * `KID_PRICES` keeps `story.ready: false` until there is one — the price is
 * shown to a parent so they can plan for it, and the row says plainly that
 * the room cannot do it yet.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import StoryRoom from '../components/StoryRoom';
import { useLang } from '../lib/i18n';

export default function StoryPage(): React.ReactElement {
  const { t } = useLang();
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-3xl px-5 pt-8">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('story.back', 'Back to the studio')}
        </Link>
      </div>
      <StoryRoom />
    </main>
  );
}
