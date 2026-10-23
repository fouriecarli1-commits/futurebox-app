'use client';

/**
 * The gallery wall: the drawings, pictures and films a child kept.
 *
 * Drawn from `lib/kidsgallery.ts` and nothing else. Object URLs are handed
 * out for the pieces on screen and taken back when the wall is left — a
 * child's thirty drawings are thirty blobs, and a leak here is a leak a
 * six-year-old cannot report.
 *
 * Tap a piece and it opens big, with two things to do with it. The owner,
 * 23 October 2026: *"Wanneer mens op 'n foto kliek moet hy 'n opsie uit pop
 * om te kan download. Ook 'n delete knoppie. Die delete moet nie dadelik
 * delete nie, dit moet ask 'n grown up hê met die kode. Die delete opsie moet
 * ook 'n cancel hê."* So: save to the device straight away; taking it off
 * the wall asks the grown-up's code first, then asks once more with a way
 * to keep it. The grown-up's own page passes `grownUp` and skips the code —
 * it is already behind it — but still gets the second question.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Trash2, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { allPieces, forgetPiece, type KeptPiece } from '../lib/kidsgallery';
import { PAPER } from '../lib/kidsdraw';
import { useBackLayer } from '../lib/backstack';
import { CodePad } from './KidsLock';

/** The file name a piece is saved under: its words, and the kind of file it is. */
function fileNameFor(piece: KeptPiece): string {
  const ext = piece.blob.type.includes('webm') ? 'webm'
    : piece.blob.type.includes('mp4') ? 'mp4'
      : piece.blob.type.includes('jpeg') ? 'jpg'
        : 'png';
  const words = piece.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'futurebox-kids';
  return `${words}.${ext}`;
}

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
  /** The piece open big, and how far along taking it off the wall is. */
  const [open, setOpen] = useState<KeptPiece | null>(null);
  const [bin, setBin] = useState<'no' | 'code' | 'sure'>('no');

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

  const close = (): void => { setOpen(null); setBin('no'); };
  /* The phone's Back closes the sheet, as it closes every layer over the app.
     The code pad above it has a back layer of its own. */
  useBackLayer(open !== null && bin !== 'code', close);

  const takeOff = async (id: string): Promise<void> => {
    await forgetPiece(id);
    setWall((was) => (was ?? []).filter((one) => one.id !== id));
    close();
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
  const button = 'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-extrabold';

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-kidsgallery>
        {wall.map((piece) => (
          <li key={piece.id} className="overflow-hidden rounded-2xl border-2 border-cyan-500/30 bg-surface-100/80 shadow-md" data-kidspiece={piece.kind}>
            <button
              type="button"
              onClick={() => { setOpen(piece); setBin('no'); }}
              aria-label={`${t('kids.pieceOpen', 'Open')} · ${piece.title}`}
              data-kidspieceopen={piece.id}
              className="block w-full text-left"
            >
              {piece.kind === 'film' ? (
                <video src={urls[piece.id]} muted playsInline preload="metadata" className="pointer-events-none aspect-square w-full bg-black object-contain" />
              ) : (
                <img src={urls[piece.id]} alt={piece.title} className="aspect-square w-full object-cover" style={{ background: PAPER }} />
              )}
              <span className="flex items-center gap-2 px-2.5 py-2">
                <span aria-hidden className="text-base">{KIND[piece.kind]}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-surface-900">{piece.title}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div
          role="dialog"
          aria-label={open.title}
          data-kidspiecesheet={open.id}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-scrim/80 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md space-y-3 rounded-3xl border-2 border-cyan-500/40 bg-surface-50 p-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-xl">{KIND[open.kind]}</span>
              <span className="min-w-0 flex-1 truncate text-base font-extrabold text-surface-900">{open.title}</span>
              <button
                type="button"
                onClick={close}
                aria-label={t('common.close', 'Close')}
                data-kidspiececlose
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-surface-300 text-surface-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {open.kind === 'film' ? (
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              <video src={urls[open.id]} controls playsInline className="max-h-[50vh] w-full rounded-2xl bg-black object-contain" />
            ) : (
              <img src={urls[open.id]} alt={open.title} className="max-h-[50vh] w-full rounded-2xl object-contain" style={{ background: PAPER }} />
            )}

            {bin === 'sure' ? (
              /* The second question, with the way out first on the left where
                 a thumb lands — a child who got this far by accident should
                 find "keep it" before "take it off". */
              <div className="space-y-2 rounded-2xl border-2 border-amber-400/60 bg-amber-50 p-3" data-kidsbinsure>
                <p className="text-sm font-extrabold text-surface-900">
                  {t('kids.binSure', 'Take it off the wall for good? It cannot come back.')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setBin('no')} data-kidsbinkeep className={`${button} border-2 border-surface-300 bg-surface-50 text-surface-900`}>
                    {t('kids.binKeep', 'No, keep it')}
                  </button>
                  <button type="button" onClick={() => void takeOff(open.id)} data-kidsbinyes className={`${button} bg-rose-500 text-white`}>
                    <Trash2 className="h-4 w-4" />
                    {t('kids.binYes', 'Yes, take it off')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={urls[open.id]}
                  download={fileNameFor(open)}
                  data-kidspiecesave
                  className={`${button} bg-cyan-500 text-white`}
                >
                  <Download className="h-4 w-4" />
                  {t('kids.pieceSave', 'Save it')}
                </a>
                <button
                  type="button"
                  onClick={() => setBin(grownUp ? 'sure' : 'code')}
                  data-kidspiecebin={open.id}
                  className={`${button} border-2 border-surface-300 bg-surface-50 text-surface-900`}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('kids.galleryBin', 'Take it off the wall')}
                </button>
              </div>
            )}
            {bin === 'no' && !grownUp && (
              <p className="text-center text-xs font-semibold text-surface-700">
                {t('kids.binGrownUp', 'Taking it off the wall asks a grown-up for their code first.')}
              </p>
            )}
          </div>
        </div>
      )}

      {open && bin === 'code' && (
        <CodePad onPass={() => setBin('sure')} onClose={() => setBin('no')} />
      )}
    </>
  );
}
