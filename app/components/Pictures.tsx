'use client';

/**
 * The pictures you keep, and the one you are about to use.
 *
 * ── What it replaces ─────────────────────────────────────────────────────
 *
 * A file input, and nothing else. Attaching a start frame worked, and then the
 * picture was read, sent and forgotten — so the second clip meant to cut
 * against the first sent you back to the file manager to find the same file
 * again. That is the difference between a tool that makes shots and one that
 * makes a set of shots that belong together, which is the only kind anybody
 * actually posts.
 *
 * ── Why it is a strip and not a room ─────────────────────────────────────
 *
 * A library big enough to need its own room is a library nobody visits. This
 * lives where the pictures are used: the row of what you have is directly
 * above the button that adds one, in the room that needs it. Choosing is one
 * press, and so is changing your mind.
 *
 * The cap is twenty, and a kept picture is the one eviction never takes. The
 * strip says both, because a shelf that quietly drops things is worse than a
 * shelf that says how big it is.
 *
 * ── On this device ───────────────────────────────────────────────────────
 *
 * Said out loud, in the strip, because it is true and because finding it out
 * on a second phone is the wrong way to learn it.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Star, Trash2, X, Check } from 'lucide-react';
import {
  KEEP, assetDataUrl, assetId, favouriteAsset,
  forgetAsset, loadAssets, rememberAsset, renameAsset, thumbnailOf, type Asset,
} from '../lib/assets';
import { ACCEPTS, MAX_BYTES, fit } from '../lib/imagefile';
import { noteDoing } from '../lib/lasterror';

/**
 * The longest edge a kept picture is stored at.
 *
 * The same 2048 the cast uses. It is a reference frame for a shot, not a
 * print: what leaves for the engine is smaller again, and the difference
 * between this and the camera's own size is entirely memory a phone does not
 * have.
 */
const BIGGEST = 2048;
import { useLang } from '../lib/i18n';

export default function Pictures({
  /** The data URL in use right now, so the strip can show which one it is. */
  value,
  onChange,
  /** Which room asked, recorded against a new picture. */
  from,
  disabled = false,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  from?: string;
  disabled?: boolean;
}): React.ReactElement {
  const { t } = useLang();
  const input = useRef<HTMLInputElement | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  useEffect(() => setAssets(loadAssets()), []);

  // A picture taken off the desk elsewhere leaves nothing selected here.
  useEffect(() => {
    if (!value) setChosen(null);
  }, [value]);

  /**
   * A picture off the device, through the same guard the cast uses.
   *
   * ── Why this was rewritten, 16 September 2026 ─────────────────────────
   *
   * Carli, twice: *"die laai jou eie foto op in shot werk steeds nie. Bladsy
   * is wit."* The second report is the one that matters — the first was
   * answered by defending the image path, and the page still went white.
   *
   * It was a `FileReader` straight to a data URL and then `new Image()`, with
   * a four-megabyte guard on **bytes**. `app/lib/imagefile.ts` was written on
   * 14 September because that exact guard does not work, and its header says
   * why in her words: a 200-megapixel photo off a modern phone is ten or
   * twelve megabytes on disk, sails through any byte ceiling, and then asks
   * the browser for 800MB in one allocation. The tab is not thrown from — it
   * is killed, which is a white screen with nothing in the console, because
   * the thing that would have logged died with it.
   *
   * That fix was applied to the avatar and to the cast. This strip was never
   * moved onto it, which is the whole of "steeds nie": two reports, two
   * different code paths, one of them fixed.
   *
   * `fit` reads the dimensions out of the file's own header BEFORE any
   * decoder is asked for anything, refuses by pixels, and hands back a WebP
   * with its longest edge at `BIGGEST`. So what reaches storage is a picture
   * a phone can hold, and the original is never decoded at full size.
   *
   * ── And the thumbnail no longer falls back to the whole picture ────────
   *
   * `thumbnailOf` resolves to its INPUT when the image will not decode. Fed a
   * 4MB data URL that was a 5.4MB base64 string in `asset.thumb`, straight
   * into localStorage, whose quota is about five megabytes for the entire
   * origin. `write()` catches the refusal and says nothing, so the picture
   * vanished silently. Feeding it the already-shrunk preview makes the
   * fallback harmless: the worst case is a thumbnail the size of a 2048px
   * WebP rather than the size of the camera roll.
   */
  const take = useCallback(
    (file: File | undefined) => {
      setProblem(null);
      if (!file) return;
      /* Written down before anything is attempted, because the step is the
         only thing that survives a tab the phone throws away. `BlankGuard`
         prints it on the empty page and `/oops` keeps it — three reports of
         a white screen here have had nothing to read, and this is the line
         that makes the fourth one legible. */
      noteDoing(`a picture into the shot (${Math.round(file.size / 1024)}KB, ${file.type || 'no type'})`);
      if (file.size > MAX_BYTES) {
        setProblem(t('pics.big', 'That picture is very large. Try one under 12MB.'));
        return;
      }
      void (async () => {
        const made = await fit(file, BIGGEST);
        if (!made.ok) {
          setProblem(
            made.why === 'too_many_pixels'
              ? t(
                  'pics.tooManyPixels',
                  'That photo is too big for a phone browser to open — it is one of the very high-megapixel camera modes. Take one on the normal setting, or use a screenshot of it.',
                )
              : made.why === 'not_an_image'
                ? t('pics.type', 'That has to be a PNG, a JPEG or a WebP.')
                : t('pics.read', 'That file could not be read.'),
          );
          return;
        }
        const asset: Asset = {
          id: assetId(),
          kind: 'picture',
          name: file.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Picture',
          mime: made.blob.type || 'image/webp',
          bytes: made.blob.size,
          createdAt: new Date().toISOString(),
          thumb: await thumbnailOf(made.preview),
          ...(from ? { from } : {}),
        };
        /* Storing must not be what loses the picture. `rememberAsset` writes
           to IndexedDB and can reject on a full device; the picture is still
           perfectly usable in this room, so the failure is said rather than
           thrown and the shot keeps the frame either way. */
        try {
          await rememberAsset(asset, made.preview);
          setAssets(loadAssets());
          setChosen(asset.id);
        } catch {
          setProblem(t('pics.noRoom', 'That picture is in the shot, but there was no room to keep it on this device.'));
        }
        onChange(made.preview);
      })();
    },
    [from, onChange, t],
  );

  const use = async (asset: Asset) => {
    if (chosen === asset.id) {
      // Pressing the one already in use takes it off, so the same square is
      // both the way in and the way out.
      setChosen(null);
      onChange(null);
      return;
    }
    const full = await assetDataUrl(asset.id);
    if (!full) {
      setProblem(t('pics.gone', 'That picture is no longer on this device.'));
      return;
    }
    setChosen(asset.id);
    onChange(full);
  };

  const kept = assets.filter((one) => one.favourite).length;

  return (
    <div className="space-y-2">
      <input
        ref={input}
        type="file"
        accept={ACCEPTS}
        /* ── Named, because what it accepts no longer tells it apart ──────
 
           `audit/bigphoto.mjs` found this one by `accept*="image/png"`, with
           a note saying that is "the only thing that actually distinguishes
           them". It was true when it was written and is not any more: the
           cast's presenter-face input accepts the same five types, sits in
           the same overlay, and comes first in the DOM. So the tool built to
           reproduce Carli's white page had been filling the cast's input and
           reporting that nothing was stored — a true sentence about a
           control that was never going to store a picture here.
 
           Three reports of the same fault went unreproduced behind that, so
           the handle is a name now rather than a guess from a shape. */
        data-take="shotpicture"
        /* Which room's copy this is. The handle above is one name for
           every instance, and there are several on one screen now — the
           video desk has a logo upload of its own beside the cast's face
           picker. A probe that wants a particular one should not have to
           count them. */
        data-from={from ?? ''}
        className="hidden"
        onChange={(event) => {
          take(event.target.files?.[0]);
          // Cleared so choosing the same file twice still fires a change.
          event.target.value = '';
        }}
      />

      {assets.length > 0 && (
        <>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <p className="text-sm font-semibold text-zinc-300">
              {t('pics.yours', 'Your pictures')}
              <span className="text-zinc-500 font-normal"> ({assets.length}/{KEEP})</span>
            </p>
            <p className="text-xs text-zinc-500">
              {t('pics.device', 'Kept on this device only.')}
            </p>
          </div>

          <ul className="flex gap-2 overflow-x-auto pb-1">
            {assets.map((one) => {
              const on = chosen === one.id;
              return (
                <li key={one.id} className="flex-shrink-0 w-24 space-y-1">
                  <button
                    type="button"
                    onClick={() => void use(one)}
                    disabled={disabled}
                    aria-pressed={on}
                    className={`block w-24 h-24 rounded-xl border overflow-hidden relative transition-colors disabled:opacity-50 ${
                      on ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-zinc-700 hover:border-zinc-500'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={one.thumb} alt={one.name} className="w-full h-full object-cover" />
                    {on && (
                      <span className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-6 h-6 text-white drop-shadow" />
                      </span>
                    )}
                  </button>

                  {renaming === one.id ? (
                    <input
                      autoFocus
                      defaultValue={one.name}
                      onBlur={(event) => {
                        setAssets(renameAsset(one.id, event.target.value));
                        setRenaming(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
                        if (event.key === 'Escape') setRenaming(null);
                      }}
                      className="w-24 bg-zinc-950 border border-zinc-700 rounded-lg px-1.5 py-0.5 text-[11px] text-zinc-100 focus:border-emerald-500 focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRenaming(one.id)}
                      title={t('pics.rename', 'Rename')}
                      className="block w-24 text-[11px] text-zinc-400 hover:text-white truncate text-left"
                    >
                      {one.name}
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAssets(favouriteAsset(one.id, !one.favourite))}
                      aria-pressed={Boolean(one.favourite)}
                      aria-label={
                        one.favourite ? t('pics.unkeep', 'Stop keeping this') : t('pics.keep', 'Keep this one')
                      }
                      className={one.favourite ? 'text-emerald-400 p-1' : 'text-zinc-600 hover:text-white p-1'}
                    >
                      <Star className="w-3.5 h-3.5" fill={one.favourite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void forgetAsset(one.id).then(() => setAssets(loadAssets()));
                        if (chosen === one.id) { setChosen(null); onChange(null); }
                      }}
                      aria-label={t('pics.forget', 'Delete')}
                      className="text-zinc-600 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-zinc-500 leading-relaxed">
            {t(
              'pics.cap',
              'The newest twenty are kept. A star means keep it — starred ones are never the ones dropped to make room.',
            )}
            {kept > 0 && ` (${kept} ${t('pics.starred', 'starred')})`}
          </p>
        </>
      )}

      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={disabled}
        className="w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 px-4 py-3 text-left hover:border-emerald-500/60 hover:bg-zinc-900 transition-colors disabled:opacity-50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <ImagePlus className="w-4 h-4 text-emerald-400" />
          {assets.length > 0
            ? t('pics.addMore', 'Add another picture')
            : t('pics.add', 'Add a picture')}
        </span>
        <span className="block text-xs text-zinc-500 pt-1 leading-relaxed">
          {t(
            'pics.why',
            'PNG, JPEG or WebP, up to 4 MB. It is kept here so the next clip can use the same one — which is the only way two clips share a face, a room or a product.',
          )}
        </span>
      </button>

      {problem && (
        <p className="text-xs text-rose-300 flex items-center gap-1.5">
          <X className="w-3.5 h-3.5 flex-shrink-0" />
          {problem}
        </p>
      )}
    </div>
  );
}
