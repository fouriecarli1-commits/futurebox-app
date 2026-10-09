'use client';

/**
 * The opening page of the kids room.
 *
 * Carli, 9 October 2026: *"Let the parent give an allowance on an opening
 * page."*
 *
 * ── Why a page of its own and not a room on the rail ─────────────────────
 *
 * Because the rail is the thing a child should not be looking at. The rooms
 * beside it are a shop, a conversation with strangers, and every paid door
 * in the app — `check:kidsafe` measured that in October and the measurement
 * is why the kids room was never going to be "hide some tabs". An address
 * the grown-up opens, hands over, and takes back is the shape that matches
 * what she described.
 *
 * ── What is behind it ────────────────────────────────────────────────────
 *
 * `KidsRoom.tsx`, which shows the grown-up's page until an allowance is set
 * and the child's room after it. Two presses in there and nothing else: make
 * a song, and make a video of it.
 *
 * The cap is not enforced by that room. It is applied in `charge()` — see
 * `lib/server/kidsmode.ts` — so it holds across the whole account wherever
 * the child ends up, which is the only version of it that means anything on
 * a phone a child is holding.
 *
 * Not behind a secret. It reports and sets a number about the signed-in
 * account's own credits, the route takes the account off the token, and a
 * page that needs a key typed on a phone is a page nobody opens.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import KidsRoom from '../components/KidsRoom';
import { useLang } from '../lib/i18n';

export default function KidsPage(): React.ReactElement {
  const { t } = useLang();
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-3xl px-5 pt-8">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('kids.back', 'Back to the studio')}
        </Link>
      </div>
      <KidsRoom />
    </main>
  );
}
