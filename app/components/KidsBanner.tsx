'use client';

/**
 * The kids room, sold to the grown-up holding the phone.
 *
 * Carli, 13 October 2026: *"Ek dink ook die kids studio moet baie duidelik en
 * gefeature wees ook op die landing page. Dit moet ouers gerus stel, 'n
 * veilige ruimte vir kinders om kreatief te wees. Ek sal 'n foto stuur wat jy
 * kan gebruik as bemarking op daai page met buttons op en saam met die
 * bemarking."* And with the picture: *"'n ekstra foto vir gebruik van die
 * openingsblad waar almal inlog waarop jy buttons kan sit om ouers te kry om
 * op te teken vir hierdie gedeelte van die app."*
 *
 * The picture is hers, one per language, under `public/kids/`. What is
 * written under it is only what the room really does, each line held by a
 * check: the allowance and the clock (`check:skermtyd`, `check:toelaag`),
 * no way out and one typed line (`check:kinderkamer`), the free shelf
 * (`check:kinderliedjie`). A reassurance that is not measured is a claim,
 * and a claim on a page for parents is the one place this app cannot
 * afford one.
 *
 * An `<a>` to `/kids` and not a router push, for the reason `page.tsx`
 * gives on the same door: the room is a page of its own, off the rail.
 */
import React from 'react';
import { Baby, Clock, DoorClosed, ListChecks, Wallet } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function KidsBanner({
  onPlans,
  compact = false,
}: {
  /** Where "what it costs" goes; left out, the line is not drawn. */
  readonly onPlans?: () => void;
  /** On the sign-in door: the picture and the one button, the rest folded. */
  readonly compact?: boolean;
}): React.ReactElement {
  const { lang, t } = useLang();
  const picture = lang === 'af' ? '/kids/banner-af.jpg' : '/kids/banner-en.jpg';
  const why: readonly [React.ReactNode, string, string][] = [
    [<Clock key="clock" className="h-4 w-4" />, 'kidsbanner.clock',
      'You set the allowance and the clock. When the time is up, the room closes itself.'],
    [<DoorClosed key="door" className="h-4 w-4" />, 'kidsbanner.door',
      'One room with no way out of it: no shop, no chat, no strangers, nothing shared.'],
    [<ListChecks key="list" className="h-4 w-4" />, 'kidsbanner.list',
      'Every choice is a button from a list we wrote. One line can be typed, for a song, and it goes through the same safety gate every grown-up’s words do.'],
    [<Wallet key="wallet" className="h-4 w-4" />, 'kidsbanner.wallet',
      'Songs, videos and pictures cost credits off your account, never past the allowance. Playing them again uses no credits.'],
  ];

  return (
    <section
      data-kidsbanner
      className="overflow-hidden rounded-3xl border border-emerald-500/40 bg-zinc-950/80 shadow-[0_0_40px_rgba(52,211,153,0.15)]"
    >
      <img
        src={picture}
        alt={t('kidsbanner.alt', 'FutureBox Kids Dream Studio')}
        className="block aspect-[2000/600] w-full object-cover"
        loading="lazy"
      />
      <div className={`space-y-4 ${compact ? 'p-4' : 'p-5 sm:p-7'}`}>
        <div className="space-y-1">
          <h3 className={`font-black tracking-tight text-white ${compact ? 'text-lg' : 'text-2xl sm:text-3xl'}`}>
            {t('kidsbanner.title', 'A safe room for your child to make things')}
          </h3>
          <p className="text-sm leading-relaxed text-zinc-300">
            {t('kidsbanner.sub', 'Real songs, videos, stories, drawings and games, in a room built for small hands — and for the grown-up who hands the phone over.')}
          </p>
        </div>
        {!compact && (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" data-kidsbannerwhy>
            {why.map(([icon, key, en]) => (
              <li key={key} className="flex items-start gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-3.5 py-3 text-xs leading-relaxed text-zinc-200">
                <span className="mt-0.5 flex-shrink-0 text-emerald-400">{icon}</span>
                <span>{t(key, en)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <a
            href="/kids"
            data-authkids
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 text-sm font-black text-onAccent shadow-lg shadow-emerald-950 transition-transform hover:scale-[1.02]"
          >
            <Baby className="h-4 w-4" />
            {t('kidsbanner.setUp', 'Set up the kids room')}
          </a>
          {onPlans && (
            <button
              type="button"
              onClick={onPlans}
              data-kidsbannerplans
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/70 px-6 text-sm font-bold text-zinc-200 transition-colors hover:border-emerald-500/60 hover:text-white"
            >
              {t('kidsbanner.plans', 'See what it costs')}
            </button>
          )}
        </div>
        {!compact && (
        <p className="text-xs leading-relaxed text-zinc-500">
          {t('kidsbanner.how', 'A grown-up signs in once and sets the allowance and the time. After that the child presses, and that is all.')}
        </p>
        )}
      </div>
    </section>
  );
}
