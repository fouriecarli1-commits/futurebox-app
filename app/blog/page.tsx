/**
 * The blog: how each thing in this app works.
 *
 * Carli, 10 October 2026: *"Ek besef ook in spotlight gaan ons 'n Blog ook
 * moet hê, daarin sal ek artikels moet deel oor hoe die verskillende funksies
 * in die app werk."*
 *
 * A server component, like `/help` and `/terms`, and for the same reason: most
 * of the people these are written for arrive from a search while signed out,
 * and a page that needs the app to boot before it says anything is a page
 * Google reads as empty.
 *
 * The articles are in `lib/blog.ts` — see that file for why they are in the
 * repository rather than in a database, and what `check:blog` holds them to.
 */

import React from 'react';
import Link from 'next/link';
import { inOrder } from '../lib/blog';
import { SiteFooter } from '../components/SiteFooter';
import BlogList from '../components/BlogList';

export const metadata = {
  title: 'How it works — FutureBox',
  description:
    'Articles about how each part of FutureBox works: making a song, the Pro Booth, '
    + 'the video editor, and what each room does and does not do.',
};

export default function Blog(): React.ReactElement {
  const pieces = inOrder();
  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-3xl space-y-10 px-6 py-16">
        <header className="space-y-3">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-sm text-emerald-400 hover:text-emerald-300"
          >
            ← FutureBox
          </Link>
          <h1 className="text-4xl font-black tracking-tight text-white">How it works</h1>
          <p className="text-base leading-relaxed text-zinc-400">
            One article per thing. What a room is for, what it does, and what it deliberately
            does not do — because the second half is the part nobody writes down.
          </p>
        </header>

        <BlogList pieces={pieces} />
      </div>
      <SiteFooter />
    </main>
  );
}
