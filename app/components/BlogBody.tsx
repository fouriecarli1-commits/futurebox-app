'use client';

/**
 * An article, in the language being read.
 *
 * ── Why the body is a client component on a server page ──────────────────
 *
 * The page around it is a server component so that somebody arriving from a
 * search gets the words and the metadata without running anything — which is
 * the whole point of writing these.
 *
 * But the language somebody reads in is their own choice, kept in their
 * browser, and a server has no way of knowing it. An article written in two
 * languages and only ever drawn in one is the fault this app keeps finding in
 * itself: something built, working, and unreachable. So the words are drawn
 * here, by the one piece of this page that can ask.
 *
 * What a crawler sees is the server render of this, which is the default
 * language. That is the right trade: the crawler gets a complete English
 * article, and an Afrikaans reader gets the Afrikaans on the first paint
 * after the language is read.
 */

import React from 'react';
import { headingOf, isHeading, saidIn, type Piece } from '../lib/blog';
import { useLang } from '../lib/i18n';

export default function BlogBody({ piece }: { piece: Piece }): React.ReactElement {
  const { lang } = useLang();
  return (
    <>
      <header className="space-y-3">
        <h1 data-blogtitle className="text-3xl font-black leading-tight tracking-tight text-white">
          {saidIn(piece.title, lang)}
        </h1>
        <p className="text-base leading-relaxed text-zinc-400">{saidIn(piece.blurb, lang)}</p>
        <p className="text-xs text-zinc-600">{piece.on}</p>
      </header>

      <div className="space-y-4" data-blogbody>
        {piece.body.map((said) => (
          isHeading(said) ? (
            <h2 key={said[0]} className="pt-2 text-xl font-bold text-white">
              {headingOf(said, lang)}
            </h2>
          ) : (
            <p key={said[0]} className="text-base leading-relaxed text-zinc-300">
              {saidIn(said, lang)}
            </p>
          )
        ))}
      </div>
    </>
  );
}
