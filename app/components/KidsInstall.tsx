'use client';

/**
 * Put FutureBox Kids on this device.
 *
 * The owner, 19 October 2026: *"Dit sal soms vir ouers makliker wees as dit op
 * 'n kind se foon of tablet is en die kind kan net aan gaan om te speel."*
 * On the grown-up's page only, because installing is a grown-up's job: on the
 * child's phone or tablet, signed in once, the allowance set, and from then
 * on the child opens the icon and plays.
 *
 * Where the browser offers to install a web app itself (Chrome and Edge on
 * Android and on a computer), the button is that offer. Where it does not —
 * Safari on an iPhone or iPad, Samsung Internet — the steps are written out,
 * because "Add to Home Screen" is three taps in a menu nobody opens.
 * Already opened from its icon, it says so and offers nothing.
 */
import React, { useEffect, useState } from 'react';
import { Check, Download, Smartphone } from 'lucide-react';
import { useLang } from '../lib/i18n';

/** The install offer Chrome hands a page that can be installed. */
interface InstallOffer extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Where = 'apple' | 'samsung' | 'other';

export default function KidsInstall(): React.ReactElement | null {
  const { t } = useLang();
  const [offer, setOffer] = useState<InstallOffer | null>(null);
  const [installed, setInstalled] = useState(false);
  const [where, setWhere] = useState<Where>('other');

  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(Boolean(standalone));
    const ua = navigator.userAgent;
    setWhere(/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
      ? 'apple'
      : /SamsungBrowser/.test(ua) ? 'samsung' : 'other');
    const offered = (event: Event): void => {
      event.preventDefault();
      setOffer(event as InstallOffer);
    };
    const done = (): void => {
      setInstalled(true);
      setOffer(null);
    };
    window.addEventListener('beforeinstallprompt', offered);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('beforeinstallprompt', offered);
      window.removeEventListener('appinstalled', done);
    };
  }, []);

  if (installed) {
    return (
      <p className="mx-auto mt-3 flex w-full max-w-3xl items-center gap-2 px-5 text-sm font-bold text-white" data-kidsinstalled>
        <Check className="h-4 w-4" />
        {t('kids.app.on', 'FutureBox Kids is on this device. Your child opens it from its own icon.')}
      </p>
    );
  }

  const steps: readonly string[] = where === 'apple'
    ? [
      t('kids.app.apple1', 'Open this page in Safari.'),
      t('kids.app.apple2', 'Tap the Share button (the square with the arrow).'),
      t('kids.app.apple3', 'Choose “Add to Home Screen”, then “Add”.'),
    ]
    : where === 'samsung'
      ? [
        t('kids.app.samsung1', 'Tap the menu (three lines) at the bottom.'),
        t('kids.app.samsung2', 'Choose “Add page to”, then “Home screen”.'),
      ]
      : [
        t('kids.app.other1', 'Open the browser’s menu (the three dots).'),
        t('kids.app.other2', 'Choose “Install app” or “Add to Home screen”.'),
      ];

  return (
    <section
      data-kidsinstall
      className="mx-auto mt-4 w-full max-w-3xl px-5"
    >
      <div className="rounded-3xl border-2 border-white/25 bg-black/20 p-4 backdrop-blur-xs">
        <div className="flex items-start gap-3">
          <img src="/kids-icon-192.png" alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-white">
              {t('kids.app.title', 'Put FutureBox Kids on your child’s phone or tablet')}
            </h2>
            <p className="mt-1 text-sm leading-snug text-white/90">
              {t('kids.app.why', 'Its own icon that opens straight into the kids’ studio. Do this on the child’s device: sign in once, set the allowance, and from then on your child just taps the icon and plays. Your lock code is still the only way out.')}
            </p>
          </div>
        </div>
        {offer ? (
          <button
            type="button"
            data-kidsinstallgo
            onClick={() => {
              void offer.prompt();
              void offer.userChoice.then((choice) => {
                if (choice.outcome === 'accepted') setInstalled(true);
                setOffer(null);
              });
            }}
            className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black shadow-md"
            /* A literal white, not `bg-white`: Tailwind's white is the theme's
               ink here, and this button is white on any theme. */
            style={{ background: '#ffffff', color: '#9a3412' }}
          >
            <Download className="h-4 w-4" />
            {t('kids.app.install', 'Put it on this device')}
          </button>
        ) : (
          <ol className="mt-3 space-y-1.5" data-kidsinstallsteps={where}>
            {steps.map((one, at) => (
              <li key={one} className="flex items-start gap-2 text-sm text-white">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black" style={{ background: '#ffffff', color: '#9a3412' }}>{at + 1}</span>
                <span className="pt-0.5">{one}</span>
              </li>
            ))}
            <li className="flex items-start gap-2 pt-1 text-xs text-white/80">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
              {t('kids.app.icon', 'A green FutureBox Kids icon, with a paintbrush, appears on the home screen.')}
            </li>
          </ol>
        )}
      </div>
    </section>
  );
}
