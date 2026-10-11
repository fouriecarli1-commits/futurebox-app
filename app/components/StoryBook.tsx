'use client';

/**
 * A child's own story, on paper.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"templates vir die kinders om op te druk"*, and
 * when asked which kind: *"Ja, die kinders se eie storie as 'n boekie."*
 *
 * `lib/storybook.ts` carries why it is their own story and not a worksheet,
 * and why ink is the constraint that shapes all of it. `globals.css` carries
 * the paper. This file is the two things code has to get right.
 *
 * ── One: the pictures must be decoded before the dialog opens ────────────
 *
 * A kept picture is a Blob. It becomes an `<img>` through an object URL, and
 * an object URL loads asynchronously like any other. `window.print()` does
 * not wait: a browser handed a page whose images are still decoding prints
 * the boxes empty, and what comes out is a stack of sheets with the words on
 * them and a child's drawing missing from every one.
 *
 * So the press is not offered until every `decode()` has settled. That is
 * also why there is a press at all rather than printing the moment this
 * opens — a print dialog that appears by itself, over a preview nobody has
 * read, with the pictures maybe in it, is three bad things at once.
 *
 * ── Two: it is put at the top of the body, not in the shelf ──────────────
 *
 * The print rule in `globals.css` is `body > *:not([data-storybook])`, which
 * is only that simple because this is a direct child of `<body>`. Left where
 * it was written — inside a shelf, inside a room, inside a layout — hiding
 * "everything else" means a `visibility: hidden` sweep over the whole app,
 * and those leave the app's own fixed bars, scrims and safe-area padding
 * behind on the first sheet. Measured the slow way once already on the song
 * screen; a portal is the short way.
 *
 * ── What it does not do ──────────────────────────────────────────────────
 *
 * Reach anything. No engine, no credits, no network: the pages were paid for
 * when the book was made, and printing one is a parent's paper and nothing
 * of ours. It works with the aeroplane mode on.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Printer, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { sheetsOf } from '../lib/storybook';
import type { KeptStory } from '../lib/storykeep';

export default function StoryBook({
  story,
  onDone,
}: {
  readonly story: KeptStory;
  readonly onDone: () => void;
}): React.ReactElement | null {
  const { t } = useLang();
  const sheets = useMemo(() => sheetsOf(story), [story]);
  const paper = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  /* One object URL per picture, made once and revoked when this closes. A
     twelve-page book is a few dozen megabytes held open; a URL left behind
     holds it for as long as the tab lives. */
  const pictures = useMemo(
    () => sheets.map((one) => (one.kind === 'page' ? URL.createObjectURL(one.picture) : '')),
    [sheets],
  );
  useEffect(() => () => {
    pictures.forEach((one) => { if (one) URL.revokeObjectURL(one); });
  }, [pictures]);

  /* Every picture decoded, or the printer gets empty boxes. `decode()` is
     allowed to reject — a Blob that is not an image, a picture the browser
     gives up on — and a rejection must still open the press: refusing to
     print at all because one drawing is broken is worse than printing the
     rest of the book. */
  useEffect(() => {
    let gone = false;
    const imgs = Array.from(paper.current?.querySelectorAll('img') ?? []);
    void Promise.all(imgs.map((one) => (
      typeof one.decode === 'function'
        ? one.decode().catch(() => undefined)
        : Promise.resolve(undefined)
    ))).then(() => { if (!gone) setReady(true); });
    return () => { gone = true; };
  }, [sheets]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div data-storybook ref={paper}>
      <div data-storybookbar>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!ready}
          data-storybookprint
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-onAccent disabled:opacity-60"
        >
          {ready
            ? <Printer className="h-4 w-4" />
            : <Loader2 className="h-4 w-4 animate-spin" />}
          {ready
            ? t('book.print', 'Print {n} sheets').replace('{n}', String(sheets.length))
            : t('book.getting', 'Getting the pictures ready…')}
        </button>
        <button
          type="button"
          onClick={onDone}
          data-storybookshut
          aria-label={t('book.shut', 'Close')}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-zinc-700 text-zinc-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {sheets.map((one, at) => (one.kind === 'cover' ? (
        <div data-sheet="cover" key="cover">
          <div data-sheettitle>{one.title}</div>
          <div data-sheetcount>
            {one.pages === 1
              ? t('book.onePage', '1 page')
              : t('book.pages', '{n} pages').replace('{n}', String(one.pages))}
          </div>
        </div>
      ) : (
        <div data-sheet="page" key={one.number}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img data-sheetpicture src={pictures[at]} alt="" />
          <p data-sheetwords>{one.text}</p>
          <div data-sheetnumber>{one.number}</div>
        </div>
      )))}
    </div>,
    document.body,
  );
}
