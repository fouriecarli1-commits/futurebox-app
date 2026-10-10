'use client';

/**
 * The four things about a business that do not change between briefs.
 *
 * Folded shut by default, and that is the design rather than shyness: the
 * advert desk's job is to get somebody from an empty box to three adverts, and
 * a four-field form standing between them and that is how a room gets
 * abandoned. It opens when asked, it fills itself in from what is saved, and
 * once it is filled it stays a single line saying whose adverts these are.
 *
 * The logo comes out of the picture library rather than its own uploader, so
 * the same file is one file: chosen here, and available as a start frame on
 * the video desk without being stored twice.
 */

import React, { useEffect, useState } from 'react';
import { Palette, ChevronDown, ChevronRight, Check, Star, Trash2, Plus } from 'lucide-react';
import {
  EMPTY, MOST_COLOURS, MOST_PICTURES, hasBrandKit, loadBrandKit, paletteOf, saveBrandKit,
  type BrandKit as Kit,
} from '../lib/brandkit';
import { loadAssets, type Asset } from '../lib/assets';
import Pictures from './Pictures';
import Note from './Note';
import { useLang } from '../lib/i18n';

export default function BrandKit({
  onChange,
}: {
  /** Handed up so the room can send it with the brief. */
  onChange: (kit: Kit) => void;
}): React.ReactElement {
  const { t } = useLang();
  const [kit, setKit] = useState<Kit>(EMPTY);
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const read = loadBrandKit();
    setKit(read);
    setAssets(loadAssets());
    onChange(read);
    /* Shut, like every other fold in every room.
 
       This opened itself on a first visit — "an empty panel nobody opens is
       the same as no panel" — and that was a fair argument when it was the
       only panel behaving that way. Carli, 12 September 2026: "Make sure
       every rooms drop down menu is closed from the beginning and the user
       can open it." One panel that decides for itself is the exception that
       makes the rule unreadable, and a room where one thing is open and
       nine are shut looks like a mistake rather than a choice. */
  }, [onChange]);

  const put = (patch: Partial<Kit>) => {
    const next = { ...kit, ...patch };
    setKit(next);
    setSaved(false);
  };

  const keep = () => {
    const next = saveBrandKit({
      name: kit.name,
      voice: kit.voice,
      ...(kit.logoAssetId ? { logoAssetId: kit.logoAssetId } : {}),
      ...(kit.pictureIds?.length ? { pictureIds: kit.pictureIds } : {}),
      ...(kit.colour ? { colour: kit.colour } : {}),
      ...(kit.colours?.length ? { colours: kit.colours } : {}),
    });
    setKit(next);
    setAssets(loadAssets());
    onChange(next);
    setSaved(true);
  };

  const logo = assets.find((one) => one.id === kit.logoAssetId);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        )}
        <Palette className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zinc-200">
            {t('kit.title', 'Your brand pack')}
          </span>
          <span className="block text-xs text-zinc-500 truncate">
            {hasBrandKit(kit)
              ? [kit.name, kit.voice].filter(Boolean).join(' — ')
              : t('kit.empty', 'Set it once and every advert after this uses it.')}
          </span>
        </span>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo.thumb}
            alt={t('kit.logoAlt', 'Your logo')}
            className="w-8 h-8 rounded-lg border border-zinc-700 object-cover ml-auto flex-shrink-0"
          />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800 pt-3">
          <Note className="text-xs text-zinc-500 leading-relaxed">{t(
              'kit.why',
              'The brief is what is different about today. This is what is the same every time — so the adverts you write on Thursday sound like the ones from Monday. Kept on this device.',
            )}</Note>

          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400" htmlFor="kit-name">
              {t('kit.name', 'What is it called?')}
            </label>
            <input
              id="kit-name"
              value={kit.name}
              onChange={(event) => put({ name: event.target.value.slice(0, 80) })}
              placeholder={t('kit.namePlaceholder', 'Bellville Bakery')}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400" htmlFor="kit-voice">
              {t('kit.voice', 'How does it sound?')}
            </label>
            <textarea
              id="kit-voice"
              value={kit.voice}
              onChange={(event) => put({ voice: event.target.value.slice(0, 400) })}
              rows={2}
              placeholder={t(
                'kit.voicePlaceholder',
                'We are not fancy, we open at six, and we know everybody by name.',
              )}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none leading-relaxed resize-y"
            />
            <Note className="text-xs text-zinc-500 leading-relaxed">{t(
                'kit.voiceNote',
                'Say it the way you would say it out loud. One honest line beats three adjectives — it is the difference between “artisanal” and “we open at six”.',
              )}</Note>
          </div>

          {/* ── The folder ───────────────────────────────────

              Carli, 10 October 2026: *"Ek dink ook daar moet 'n brand pack
              wees. Iemand moet 'n folder kan hê met hulle brand goed op."*

              It held ONE picture. A business has a logo, a wordmark, a white
              version of the logo for a dark poster and a photograph of the
              shop front, and "whichever of those you last chose" is not a
              brand pack.

              So: a list, with one of them starred as the logo — the one that
              goes in the corner of a clip. References into the picture
              library, so a file is stored once and the same picture is a
              start frame on the video desk without a second copy.

              And nothing in here can be evicted any more. The library keeps
              twenty and drops the oldest when a twenty-first arrives, and
              nothing used to stop it dropping a logo chosen a month ago — so
              the pack pointed at a deleted file and every room reading it
              drew nothing, with no sign that anything had gone. See
              `heldIds` in `lib/brandkit.ts`. */}
          <div className="space-y-1.5" data-kitfolder>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm text-zinc-400">{t('kit.folder', 'The brand folder')}</p>
              <span className="text-xs text-zinc-600">
                {(kit.pictureIds ?? []).length}/{MOST_PICTURES}
              </span>
            </div>

            {(kit.pictureIds ?? []).length > 0 && (
              <ul className="grid grid-cols-4 gap-2">
                {(kit.pictureIds ?? []).map((id) => {
                  const asset = assets.find((one) => one.id === id);
                  const isLogo = kit.logoAssetId === id;
                  return (
                    <li key={id} className="space-y-1">
                      <div
                        className={`relative overflow-hidden rounded-lg border ${
                          isLogo ? 'border-emerald-500' : 'border-zinc-700'
                        }`}
                      >
                        {asset ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={asset.thumb} alt={asset.name} className="block aspect-square w-full object-cover" />
                        ) : (
                          /* A reference whose file has gone. It should not
                             happen any more, and saying so is better than an
                             empty square: a pack made before the eviction was
                             fixed may still be carrying one. */
                          <p data-kitgone className="aspect-square p-1 text-[10px] leading-tight text-amber-400">
                            {t('kit.gone', 'This picture is not on this device any more.')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-0.5">
                        <button
                          type="button"
                          data-kitlogo={id}
                          aria-pressed={isLogo}
                          onClick={() => put({ logoAssetId: id })}
                          title={t('kit.makeLogo', 'Use this one as the logo')}
                          className={`min-h-[44px] flex-1 ${isLogo ? 'text-emerald-400' : 'text-zinc-600 hover:text-zinc-300'}`}
                        >
                          <Star className="mx-auto h-3.5 w-3.5" fill={isLogo ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          type="button"
                          data-kitdrop={id}
                          onClick={() => put({
                            pictureIds: (kit.pictureIds ?? []).filter((one) => one !== id),
                            /* The star goes with it, or the pack keeps a logo
                               it no longer holds — which is the dangling
                               reference this folder exists to stop. */
                            ...(isLogo ? { logoAssetId: undefined } : {}),
                          })}
                          title={t('kit.take', 'Take it out of the folder')}
                          className="min-h-[44px] flex-1 text-zinc-600 hover:text-red-400"
                        >
                          <Trash2 className="mx-auto h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {(kit.pictureIds ?? []).length < MOST_PICTURES && (
              <Pictures
                value={null}
                onChange={() => {
                  /* Pictures hands back the bytes; the kit keeps the
                     reference, so the file is stored once and not again in
                     here. The newest is the one that just arrived. */
                  const newest = loadAssets()[0];
                  if (newest) {
                    const had = kit.pictureIds ?? [];
                    put({
                      pictureIds: had.includes(newest.id) ? had : [newest.id, ...had],
                      /* The first one in is the logo, because a pack with one
                         picture and no star is a pack whose logo is nothing. */
                      ...(kit.logoAssetId ? {} : { logoAssetId: newest.id }),
                    });
                  }
                  setAssets(loadAssets());
                }}
                from="brandkit"
              />
            )}
            <Note className="text-xs leading-relaxed text-zinc-500">
              {t(
                'kit.folderNote',
                'The logo, the wordmark, a white version for a dark poster, the shop front. The starred one is what goes in the corner of a clip. Nothing in this folder is ever thrown away to make room for a new picture.',
              )}
            </Note>
          </div>

          {/* ── The colours ───────────────────────────────

              A palette, main one first. One colour cannot set a title card AND
              the text on it, which is what one colour was being asked to do. */}
          <div className="space-y-1.5" data-kitcolours>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm text-zinc-400">{t('kit.colours', 'The colours')}</p>
              <span className="text-xs text-zinc-600">
                {paletteOf(kit).length}/{MOST_COLOURS}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {paletteOf(kit).map((hex, index) => (
                <span key={`${hex}-${index}`} className="inline-flex items-center gap-1">
                  <input
                    type="color"
                    data-kitcolour={index}
                    value={hex}
                    onChange={(event) => {
                      const next = [...paletteOf(kit)];
                      next[index] = event.target.value;
                      put({ colour: next[0], colours: next });
                    }}
                    className="h-8 w-10 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900"
                    aria-label={index === 0
                      ? t('kit.colourMain', 'The main colour')
                      : t('kit.colourMore', 'Another brand colour')}
                  />
                  {index > 0 && (
                    <button
                      type="button"
                      data-kitcolourdrop={index}
                      onClick={() => {
                        const next = paletteOf(kit).filter((_, at) => at !== index);
                        put({ colour: next[0], colours: next });
                      }}
                      className="min-h-[44px] px-1 text-zinc-600 hover:text-red-400"
                      aria-label={t('kit.colourTake', 'Take this colour out')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              ))}
              {paletteOf(kit).length < MOST_COLOURS && (
                <button
                  type="button"
                  data-kitcolouradd
                  onClick={() => {
                    const next = [...paletteOf(kit), '#10b981'];
                    put({ colour: next[0], colours: next });
                  }}
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 text-sm font-semibold text-zinc-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('kit.colourAdd', 'Add a colour')}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">

            <button
              type="button"
              onClick={keep}
              className="min-h-[44px] rounded-xl border border-emerald-500 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 inline-flex items-center gap-1.5"
            >
              {saved ? <Check className="w-4 h-4" /> : null}
              {saved ? t('kit.saved', 'Saved') : t('kit.save', 'Keep this')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
