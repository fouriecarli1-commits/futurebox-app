'use client';

/**
 * The index of articles, in the language being read.
 *
 * A client component for the same reason `BlogBody` is: the language is the
 * reader's own choice and the server cannot know it. See that file.
 */

import React from 'react';
import Link from 'next/link';
import { saidIn, type Piece } from '../lib/blog';
import { useLang } from '../lib/i18n';

export default function BlogList({ pieces }: { pieces: readonly Piece[] }): React.ReactElement {
  const { lang } = useLang();
  return (
    <ul className="space-y-3" data-bloglist>
      {pieces.map((piece) => (
        <li key={piece.id}>
          <Link
            href={`/blog/${piece.id}`}
            data-blogpiece={piece.id}
            className="block rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 hover:border-emerald-500/60"
          >
            <h2 className="text-lg font-bold leading-tight text-white">
              {saidIn(piece.title, lang)}
            </h2>
            <p className="pt-1.5 text-sm leading-relaxed text-zinc-400">
              {saidIn(piece.blurb, lang)}
            </p>
            <p className="pt-2 text-xs text-zinc-600">{piece.on}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
