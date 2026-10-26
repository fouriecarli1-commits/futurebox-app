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
import { Download, ExternalLink, Smartphone } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { SITE_HOST, KIDS_ADDRESS as KIDS_FROM_BRAND } from '../lib/brand';

/** The install offer Chrome hands a page that can be installed. */
interface InstallOffer extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Where = 'apple' | 'samsung' | 'other';

/**
 * Where the kids' app lives as an address of its own. Opened from inside the
 * grown-up app, a link to it leaves that app for the browser — the one place
 * a phone will install another app from.
 */
const KIDS_ADDRESS = KIDS_FROM_BRAND;

/** Remembered for this window: it was opened from the kids' own icon. */
const FROM_ICON = 'fb-kids-app';

export default function KidsInstall(): React.ReactElement | null {
  const { t } = useLang();
  const [offer, setOffer] = useState<InstallOffer | null>(null);
  /* ── Which window this is ───────────────────────────────────────────────
     The owner, 19 October 2026, with a screenshot of this page saying the
     kids' app was already on her phone: *"The app download isn't where you
     say it is at."* It was not. "Opened without a browser bar" was being read
     as "opened from the kids' icon", and the grown-up FutureBox app opens
     without a browser bar too — so inside it the offer was never made. The
     kids' icon opens `/kids?app=kids` (its manifest's `start_url`); that,
     and only that, is the kids' app. */
  const [window_, setWindow] = useState<'browser' | 'kids' | 'studio'>('browser');
  const [where, setWhere] = useState<Where>('other');

  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let fromIcon = new URLSearchParams(window.location.search).get('app') === 'kids';
    try {
      if (fromIcon) sessionStorage.setItem(FROM_ICON, '1');
      else fromIcon = sessionStorage.getItem(FROM_ICON) === '1';
    } catch { /* private window: the address alone decides */ }
    setWindow(!standalone ? 'browser' : fromIcon ? 'kids' : 'studio');
    const ua = navigator.userAgent;
    setWhere(/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
      ? 'apple'
      : /SamsungBrowser/.test(ua) ? 'samsung' : 'other');
    const offered = (event: Event): void => {
      event.preventDefault();
      setOffer(event as InstallOffer);
    };
    const done = (): void => {
      setWindow('kids');
      setOffer(null);
    };
    window.addEventListener('beforeinstallprompt', offered);
    window.addEventListener('appinstalled', done);
    /* Sent here from the "Get the FutureBox Kids app" button on the banners:
       drawn after the page, so the browser's own jump to it has nothing to
       land on. */
    const jump = window.location.hash === '#kids-app'
      ? window.setTimeout(() => document.getElementById('kids-app')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
      : null;
    return () => {
      if (jump !== null) window.clearTimeout(jump);
      window.removeEventListener('beforeinstallprompt', offered);
      window.removeEventListener('appinstalled', done);
    };
  }, []);

  const steps: readonly string[] = window_ === 'studio'
    ? [
      t('kids.app.studio1', 'You are inside the FutureBox app, and a phone only adds an app from its browser. Press the button below — it opens the kids’ address in the browser.'),
      where === 'apple'
        ? t('kids.app.studio2apple', 'In Safari, tap Share (the square with the arrow), then “Add to Home Screen”, then “Add”.')
        : t('kids.app.studio2', 'In the browser, open the menu (the three dots) and choose “Install app” or “Add to Home screen”.'),
    ]
    : where === 'apple'
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

  /* A literal white, not `bg-white`: Tailwind's white is the theme's ink
     here, and these are white on any theme. */
  const white = { background: '#ffffff', color: '#065f46' } as const;

  /* ── Big, and first ─────────────────────────────────────────────────────
     The owner, the same day: *"It has to be very visible for every
     parent."* So it is the first thing on the grown-up's page, the icon the
     child will see is large on it, and the button is the width of the card. */
  return (
    <section
      id="kids-app"
      data-kidsinstall={window_}
      className="mx-auto mt-4 w-full max-w-3xl scroll-mt-4 px-5"
    >
      {/* Literal greens: the kids' palette repaints the theme's named
          colours, and this card is the icon's own green wherever it sits. */}
      <div
        className="rounded-3xl border-2 p-5 backdrop-blur-md"
        style={{ background: 'rgba(2, 44, 34, 0.9)', borderColor: 'rgba(110, 231, 183, 0.8)', boxShadow: '0 0 32px rgba(52, 211, 153, 0.35)' }}
      >
        <div className="flex items-center gap-4">
          <img src="/kids-icon-192.png" alt="" width={192} height={192} className="h-20 w-20 shrink-0 rounded-3xl shadow-lg sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-300">
              {t('kids.app.kicker', 'The FutureBox Kids app')}
            </p>
            <h2 className="mt-0.5 text-lg font-black leading-tight text-white sm:text-2xl">
              {window_ === 'kids'
                ? t('kids.app.onTitle', 'FutureBox Kids is on this device')
                : t('kids.app.title', 'Put FutureBox Kids on your child’s phone or tablet')}
            </h2>
          </div>
        </div>
        {window_ === 'kids' ? (
          <p className="mt-3 text-sm leading-relaxed text-white" data-kidsinstalled>
            {t('kids.app.onElsewhere', 'Your child opens it from this icon. To put it on another phone or tablet, open {address} there and add it to the home screen.').replace('{address}', KIDS_ADDRESS)}
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-white">
              {t('kids.app.why', 'Its own icon that opens straight into the kids’ studio. Do this on the child’s device: sign in once, set the allowance, and from then on your child just taps the icon and plays. Your lock code is still the only way out.')}
            </p>
            {offer && window_ === 'browser' ? (
              <button
                type="button"
                data-kidsinstallgo
                onClick={() => {
                  void offer.prompt();
                  void offer.userChoice.then((choice) => {
                    if (choice.outcome === 'accepted') setWindow('kids');
                    setOffer(null);
                  });
                }}
                className="mt-4 inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-base font-black shadow-md"
                style={white}
              >
                <Download className="h-5 w-5" />
                {t('kids.app.install', 'Put it on this device')}
              </button>
            ) : (
              <>
                {window_ === 'studio' && (
                  <a
                    href={`https://${KIDS_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-kidsinstallopen
                    className="mt-4 inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-base font-black shadow-md"
                    style={white}
                  >
                    <ExternalLink className="h-5 w-5" />
                    {t('kids.app.openBrowser', 'Open the kids’ app in the browser')}
                  </a>
                )}
                <ol className="mt-4 space-y-2" data-kidsinstallsteps={window_ === 'studio' ? 'studio' : where}>
                  {steps.map((one, at) => (
                    <li key={one} className="flex items-start gap-2.5 text-sm text-white">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black" style={white}>{at + 1}</span>
                      <span className="pt-1">{one}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <p className="mt-3 flex items-start gap-2 text-xs text-white/85">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
              {t('kids.app.icon', 'A green FutureBox Kids icon, with a paintbrush, appears on the home screen.')}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
