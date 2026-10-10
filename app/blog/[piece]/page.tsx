/**
 * One article.
 *
 * `generateStaticParams` so every piece is a real file at build time: these are
 * written to be found, and a page rendered on demand answers a crawler slowly
 * and costs money to answer at all.
 *
 * `notFound` for an id that is not there rather than an empty article, because
 * a published url is a promise — see the note on `id` in `lib/blog.ts`.
 *
 * The words themselves are drawn by `BlogBody`, which is a client component,
 * because the language somebody reads in is their own choice and a server has
 * no way of knowing it. See that file.
 */

import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PIECES, pieceById } from '../../lib/blog';
import { SiteFooter } from '../../components/SiteFooter';
import BlogBody from '../../components/BlogBody';

export function generateStaticParams(): { piece: string }[] {
  return PIECES.map((one) => ({ piece: one.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ piece: string }> },
): Promise<{ title: string; description: string }> {
  const { piece } = await params;
  const found = pieceById(piece);
  if (!found) return { title: 'How it works — FutureBox', description: '' };
  return { title: `${found.title[1]} — FutureBox`, description: found.blurb[1] };
}

export default async function Piece(
  { params }: { params: Promise<{ piece: string }> },
): Promise<React.ReactElement> {
  const { piece } = await params;
  const found = pieceById(piece);
  if (!found) notFound();

  return (
    <main className="min-h-screen bg-zinc-950">
      <article className="mx-auto max-w-2xl space-y-6 px-6 py-16">
        <Link
          href="/blog"
          className="inline-flex min-h-[44px] items-center text-sm text-emerald-400 hover:text-emerald-300"
        >
          ← How it works
        </Link>
        <BlogBody piece={found} />
      </article>
      <SiteFooter />
    </main>
  );
}
