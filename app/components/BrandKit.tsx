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
import { Palette, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { EMPTY, hasBrandKit, loadBrandKit, saveBrandKit, type BrandKit as Kit } from '../lib/brandkit';
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
    // Open on a first visit, closed once there is something in it: an empty
    // panel nobody opens is the same as no panel.
    setOpen(!hasBrandKit(read));
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
      ...(kit.colour ? { colour: kit.colour } : {}),
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
            {t('kit.title', 'Who these adverts are for')}
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

          <div className="space-y-1.5">
            <p className="text-sm text-zinc-400">{t('kit.logo', 'The logo')}</p>
            <Pictures
              value={null}
              onChange={() => {
                // Pictures hands back the bytes; the kit keeps the reference,
                // so the file is stored once and not again in here.
                const newest = loadAssets()[0];
                if (newest) put({ logoAssetId: newest.id });
                setAssets(loadAssets());
              }}
              from="brandkit"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-zinc-400" htmlFor="kit-colour">
              {t('kit.colour', 'The colour')}
              <input
                id="kit-colour"
                type="color"
                value={kit.colour ?? '#10b981'}
                onChange={(event) => put({ colour: event.target.value })}
                className="w-10 h-8 rounded-lg border border-zinc-700 bg-zinc-900 cursor-pointer"
              />
            </label>

            <button
              type="button"
              onClick={keep}
              className="rounded-xl border border-emerald-500 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 inline-flex items-center gap-1.5"
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
