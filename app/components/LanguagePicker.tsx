'use client';

/**
 * The language switch.
 *
 * Sits on the welcome page where someone lands, not buried in a settings menu:
 * an Afrikaans speaker should not have to read English to find the Afrikaans.
 * It shows both names in their own language, which is the one convention every
 * language picker gets right.
 */

import React from 'react';
import { Languages } from 'lucide-react';
import { LANGUAGES, useLang } from '../lib/i18n';

export default function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLang();

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setLang(lang === 'en' ? 'af' : 'en')}
        title={t('lang.choose')}
        className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600 text-xs font-bold rounded-xl transition-all"
      >
        <Languages className="w-4 h-4" />
        <span>{lang === 'en' ? 'EN' : 'AF'}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Languages className="w-4 h-4 text-zinc-500" />
      <span className="text-sm text-zinc-500">{t('lang.choose')}</span>
      <div className="flex gap-1">
        {LANGUAGES.map((entry) => (
          <button
            key={entry.code}
            type="button"
            onClick={() => setLang(entry.code)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
              lang === entry.code
                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
            }`}
          >
            {entry.native}
          </button>
        ))}
      </div>
    </div>
  );
}
