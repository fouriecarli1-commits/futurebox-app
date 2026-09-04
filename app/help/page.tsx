/**
 * Help — one page that answers a question or reaches a person.
 *
 * A server component around a client one, for the same reason /terms is a
 * server component: somebody arriving here from a search, or from a link in
 * an email while signed out, gets the page and the address without running
 * anything. The two halves that need to talk to a route are the client part.
 *
 * The enquiries address is read here rather than in the browser. It is server
 * configuration — `MAIL_REPLY_TO`, defaulting to the studio's own mailbox —
 * and baking it into the client bundle through a NEXT_PUBLIC_ variable would
 * mean changing it required a rebuild.
 */

import React from 'react';
import Link from 'next/link';
import HelpDesk from '../components/HelpDesk';
import { ENQUIRIES } from '../lib/server/email';

/* Rendered per request, not baked at build.

   The whole point of reading `MAIL_REPLY_TO` on the server is that the address
   can change without a rebuild — which is not hypothetical: it is a gmail
   mailbox today and becomes a real support address on the studio's own domain
   the moment that domain is settled. A prerendered page would have frozen the
   old one into the HTML, and the page that tells people how to reach you is
   the worst one to have out of date. A support page costs nothing to render. */
export const dynamic = 'force-dynamic';

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

        <HelpDesk enquiries={ENQUIRIES} />

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
