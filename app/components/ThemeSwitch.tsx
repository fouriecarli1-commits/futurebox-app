'use client';

/**
 * Dark or light, from the home page.
 *
 * The owner, 13 October 2026: *"Ek dink homepage moet 'n swipe hê vir dark of
 * light … mense moet op die home page reeds net kan swipe tussen dark en
 * light."*
 *
 * One switch between the default and its daylight twin. It writes the
 * choice where the theme studio writes it, applies it at once, and tells
 * the studio's own copy through a window event, so the appearance panel
 * never argues with the switch about what is on.
 */
import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, DEFAULT_THEME, LIGHT_THEME, loadTheme, modeOf, saveTheme, THEME_EVENT } from '../lib/theme';
import { useLang } from '../lib/i18n';

export default function ThemeSwitch({ className = '' }: { readonly className?: string }): React.ReactElement {
  const { t } = useLang();
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(modeOf(loadTheme()) === 'light');
    const follow = (event: Event): void => {
      const next = (event as CustomEvent<{ surface?: string }>).detail;
      if (next?.surface) setLight(modeOf({ ...DEFAULT_THEME, surface: next.surface }) === 'light');
    };
    window.addEventListener(THEME_EVENT, follow);
    return () => window.removeEventListener(THEME_EVENT, follow);
  }, []);

  const flip = (): void => {
    const next = light ? DEFAULT_THEME : LIGHT_THEME;
    applyTheme(next);
    saveTheme(next);
    setLight(!light);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }));
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      aria-label={light ? t('theme.toDark', 'Switch to dark') : t('theme.toLight', 'Switch to light')}
      title={light ? t('theme.toDark', 'Switch to dark') : t('theme.toLight', 'Switch to light')}
      data-themeswitch={light ? 'light' : 'dark'}
      onClick={flip}
      className={`relative inline-flex h-9 w-[4.25rem] shrink-0 items-center rounded-full border border-emerald-500/40 bg-zinc-950/70 px-1 transition ${className}`}
    >
      <span className="absolute left-2 text-emerald-300"><Moon className="h-3.5 w-3.5" /></span>
      <span className="absolute right-2 text-amber-300"><Sun className="h-3.5 w-3.5" /></span>
      <span
        className={`relative z-10 h-7 w-7 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(52,211,153,0.6)] transition-transform ${light ? 'translate-x-[2.1rem]' : 'translate-x-0'}`}
        aria-hidden
      />
    </button>
  );
}
