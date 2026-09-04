/**
 * Help — one page that answers a question or reaches a person.
 *
 * A server component around a client one, for the same reason /terms is a
 * server component: somebody arriving here from a search, or from a link in
 * an email while signed out, gets the page and the address without running
 * anything. The two halves that need to talk to a route are the client part.
 *
 * No address appears on it. There is one mailbox behind this app and it
 * belongs to one person; printed on a public page it would be scraped within
 * days, and a support inbox full of spam misses the message that mattered.
 * The form carries the whole job instead — the message lands in that inbox
 * with the sender's own address as reply-to.
 */

import React from 'react';
import Link from 'next/link';
import HelpDesk from '../components/HelpDesk';

export const metadata = {
  title: 'Help — FutureBox',
  description:
    'Ask about how FutureBox works, what it costs, and what the terms say — or write to the person who runs it.',
};

export default function Help(): React.ReactElement {
  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <header className="space-y-3">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-sm text-emerald-400 hover:text-emerald-300"
          >
            ← FutureBox
          </Link>
          <h1 className="text-4xl font-black text-white tracking-tight">Help</h1>
          <p className="text-base text-zinc-400 leading-relaxed">
            How the studio works, what a thing costs, what the terms actually say — and, when it
            needs a person, the way to one.
          </p>
        </header>

        <HelpDesk />

        {/* Standing on their own rather than inside a sentence, so they are
            sized as things a thumb hits: 44px is the floor everywhere else in
            this app and a link is not exempt from it. */}
        <nav className="flex flex-wrap gap-x-5 border-t border-zinc-800 pt-4 text-sm">
          <Link
            href="/terms"
            className="inline-flex min-h-[44px] items-center px-1.5 text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="inline-flex min-h-[44px] items-center px-1.5 text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
          >
            Privacy
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-zinc-400 hover:text-zinc-200"
          >
            ← Back to FutureBox
          </Link>
        </nav>
      </div>
    </main>
  );
}
