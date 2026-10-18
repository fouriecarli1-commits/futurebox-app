'use client';

/**
 * The gallery wall: the drawings, pictures and films a child kept.
 *
 * Drawn from `lib/kidsgallery.ts` and nothing else. Object URLs are handed
 * out for the pieces on screen and taken back when the wall is left — a
 * child's thirty drawings are thirty blobs, and a leak here is a leak a
 * six-year-old cannot report.
 *
 * No bin for the child. The grown-up's page passes `grownUp`, and that is
 * the only hand that takes a piece off the wall.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { allPieces, forgetPiece, type KeptPiece } from '../lib/kidsgallery';
import { PAPER } from '../lib/kidsdraw';

export default function KidsGallery({
  again = 0,
  grownUp = false,
}: {
  readonly again?: number;
  readonly grownUp?: boolean;
}): React.ReactElement {
  const { t } = useLang();
  const [wall, setWall] = useState<KeptPiece[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const held = useRef<string[]>([]);

  useEffect(() => {
    let live = true;
    void allPieces().then((pieces) => {
      if (!live) return;
      held.current.forEach((one) => URL.revokeObjectURL(one));
      const next: Record<string, string> = {};
      for (const piece of pieces) next[piece.id] = URL.createObjectURL(piece.blob);
      held.current = Object.values(next);
      setUrls(next);
      setWall(pieces);
    }).catch(() => { if (live) setWall([]); });
    return () => { live = false; };
  }, [again]);

  useEffect(() => () => { held.current.forEach((one) => URL.revokeObjectURL(one)); }, []);

  const bin = async (id: string): Promise<void> => {
    await forgetPiece(id);
    setWall((was) => (was ?? []).filter((one) => one.id !== id));
  };

  if (wall === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-surface-700">
        <Loader2 className="h-4 w-4 animate-spin" /> {t('songshelf.looking', 'Looking…')}
      </p>
    );
  }
  if (!wall.length) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-surface-300 px-4 py-5 text-center text-sm font-semibold text-surface-700" data-kidsgalleryempty>
        {t('kids.galleryNone', 'Nothing on the wall yet. Draw something on the Magic Drawing Board and press Keep it.')}
      </p>
    );
  }

  const KIND: Record<KeptPiece['kind'], string> = { drawing: '🖍️', picture: '🖼️', film: '🎬' };

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-kidsgallery>
      {wall.map((piece) => (
        <li key={piece.id} className="overflow-hidden rounded-2xl border-2 border-cyan-500/30 bg-surface-100/80 shadow-md" data-kidspiece={piece.kind}>
          {piece.kind === 'film' ? (
            /* eslint-disable-next-line jsx-a11y/media-has-caption */
            <video src={urls[piece.id]} controls playsInline className="aspect-square w-full bg-black object-contain" />
          ) : (
            <img src={urls[piece.id]} alt={piece.title} className="aspect-square w-full object-cover" style={{ background: PAPER }} />
          )}
          <div className="flex items-center gap-2 px-2.5 py-2">
            <span aria-hidden className="text-base">{KIND[piece.kind]}</span>
            <span className="min-w-0 flex-1 truncate text-xs font-bold text-surface-900">{piece.title}</span>
            {grownUp && (
              <button
                type="button"
                onClick={() => void bin(piece.id)}
                aria-label={t('kids.galleryBin', 'Take it off the wall')}
                data-kidspiecebin={piece.id}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-300 text-surface-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
