'use client';

/**
 * Magic pictures: press what, press how, and a picture is made for credits.
 *
 * The lists are `lib/kidsalive.ts`; the price, the allowance and the call
 * belong to the room, which passes them in — the way the song's and the
 * video's do — so this file draws and the room spends.
 */
import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { KID_STYLES, KID_SUBJECTS } from '../lib/kidsalive';
import { PAINTS, paintOf } from '../lib/kidslook';
import { StyleTile } from './MeerkatTile';

/** Which drawn meerkat shows each picture style. */
const KID_STYLE_TILE: Readonly<Record<string, string>> = {
  cartoon: 'cartoon', crayon: 'crayon', clay: 'clay', watercolour: 'watercolour', watercolor: 'watercolour', plush: 'plush', pixel: 'pixel',
};

export default function KidsPictureMaker({
  price,
  canMake,
  busy,
  onMake,
  picture,
  says,
}: {
  /** Credits, said on the button. */
  readonly price: number;
  readonly canMake: boolean;
  readonly busy: boolean;
  readonly onMake: (subject: string, style: string) => void;
  /** The last picture that came back, as an object URL. */
  readonly picture: string;
  readonly says: string;
}): React.ReactElement {
  const { t } = useLang();
  const [subject, setSubject] = useState('');
  const [style, setStyle] = useState('');
  const what = KID_SUBJECTS.find((one) => one.id === subject);
  const how = KID_STYLES.find((one) => one.id === style);

  return (
    <div className="space-y-4 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/85 p-4 shadow-lg backdrop-blur-sm sm:p-5" data-kidspicturemaker>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="fb-kids-bubble flex items-center gap-2 text-xl font-bold text-surface-900 sm:text-2xl">
          <span aria-hidden>✨</span> {t('kids.picTitle', 'Magic pictures')}
        </h2>
        <p className="text-xs font-semibold text-surface-700">
          {t('kids.picWhy', 'Press what, press how, and a real picture is made for you.')}
        </p>
      </div>

      <p data-kidspicsentence className="fb-kids-bubble text-center text-lg leading-snug text-surface-900 sm:text-xl">
        {t('kids.picAbout', 'A picture of')}{' '}
        <span className="inline-block rounded-2xl bg-cyan-400/30 px-3 py-0.5 align-middle">
          {what ? t(what.says[0], what.says[1]) : t('kids.something', 'something')}
        </span>{' '}
        {t('kids.picDrawnAs', 'drawn as')}{' '}
        <span className="inline-block rounded-2xl bg-amber-300/30 px-3 py-0.5 align-middle">
          {how ? t(how.says[0], how.says[1]) : t('kids.anyway', 'any way')}
        </span>
      </p>

      <div className="flex flex-wrap justify-center gap-2" data-kidspicsubjects>
        {KID_SUBJECTS.map((one) => {
          const paint = paintOf(PAINTS, one.id);
          const on = subject === one.id;
          return (
            <button
              key={one.id}
              type="button"
              aria-pressed={on}
              disabled={busy}
              data-kidspicsubject={one.id}
              onClick={() => setSubject(one.id)}
              style={{ background: `linear-gradient(145deg, ${paint.from}, ${paint.to})`, color: paint.ink, transform: on ? 'scale(1.08)' : undefined }}
              className={`min-h-[48px] rounded-full px-4 text-sm font-black shadow-md transition-transform disabled:opacity-40 ${on ? 'ring-4 ring-white' : ''}`}
            >
              {t(one.says[0], one.says[1])}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-2" data-kidspicstyles>
        {KID_STYLES.map((one) => {
          const on = style === one.id;
          return (
            <button
              key={one.id}
              type="button"
              aria-pressed={on}
              disabled={busy}
              data-kidspicstyle={one.id}
              onClick={() => setStyle(one.id)}
              className={`flex min-h-[44px] flex-col items-center gap-1 rounded-2xl p-1.5 text-sm font-black disabled:opacity-40 ${on ? 'bg-amber-300 text-onAccent shadow-md' : 'bg-surface-200/80 text-surface-800'}`}
            >
              {/* The meerkat drawn in that style, so a child chooses by looking. */}
              <StyleTile id={KID_STYLE_TILE[one.id] ?? one.id} size={64} />
              {t(one.says[0], one.says[1])}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onMake(subject, style)}
        disabled={!what || !how || !canMake || busy}
        data-kidsmakepicture
        className="mx-auto flex min-h-[64px] w-full max-w-md items-center justify-center gap-2 rounded-full bg-primary-500 px-6 text-base font-black text-white shadow-lg disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
        {busy ? t('kids.picMaking', 'Making your picture…') : t('kids.picMake', 'Make my picture')}
        {!busy && (
          <span className="rounded-lg bg-black/25 px-2 py-0.5 text-xs" data-kidspicprice={price}>
            {price} {t('kids.credits', 'credits')}
          </span>
        )}
      </button>

      {says && (
        <p className="rounded-2xl border-2 border-surface-200 bg-surface-100/80 px-4 py-3 text-sm font-semibold text-surface-900" data-kidspicsays>
          {says}
        </p>
      )}

      {picture && (
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border-4 border-amber-300 shadow-2xl" data-kidspicout>
          <img src={picture} alt={t('kids.picYour', 'Your picture')} className="block aspect-square w-full object-cover" />
        </div>
      )}
    </div>
  );
}
