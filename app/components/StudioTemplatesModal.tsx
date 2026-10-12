'use client';

/**
 * Studio Templates Explorer & Starter Pack Modal.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli: *"Dan weet ek nie of google 'n template pack het waarvan 'n video of
 * foto kan begin nie? Dit is wat meeste editing programme amazing maak is
 * hulle templates. En foto's en video's moet 'n plek hê waar jy die standaard
 * sizes kan kies, asook custom sizes. Met export moet mens die kwaliteit van
 * export kies, en daardie verstellings moet alles krediete kos. Ek werk so
 * standaard op 5 krediete."*
 *
 * Screenshots 3, 4, 5:
 *   - "Explore templates": Presentation, Poster, Resume, Invitation, Logo,
 *     Flyer, Brochure, Menu, Doc, Website, Sheet, Instagram Post, Instagram Story,
 *     Landscape Video, Mobile Video, Facebook Post, Business Card, Collage.
 *   - "Search templates" with mic icon.
 *   - "Recently viewed" & "Inspired by your designs" carousels.
 *   - One-click start with any template for photo or video.
 */

import React, { useState, useMemo } from 'react';
import {
  Search, Mic, X, Sparkles, Layout, Monitor, Smartphone, Film,
  Image as ImageIcon, Check, ChevronRight, ArrowLeft, Video,
  FileText, Globe, Table, Share2, CreditCard,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import {
  STARTER_TEMPLATES, TEMPLATE_CATEGORIES,
  type StudioTemplateItem, type TemplateCategoryMeta,
} from '../lib/studiotemplates';

export default function StudioTemplatesModal({
  onSelectTemplate,
  onClose,
}: {
  readonly onSelectTemplate: (template: StudioTemplateItem) => void;
  readonly onClose: () => void;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    let list = STARTER_TEMPLATES;
    if (selectedCategory) {
      list = list.filter((tpl) => tpl.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (tpl) =>
          tpl.nameEn.toLowerCase().includes(q)
          || tpl.nameAf.toLowerCase().includes(q)
          || tpl.subEn.toLowerCase().includes(q)
          || tpl.subAf.toLowerCase().includes(q)
          || tpl.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [selectedCategory, searchQuery]);

  const recentTemplates = useMemo(() => [
    STARTER_TEMPLATES.find((t) => t.id === 'tpl_pitch_deck')!,
    STARTER_TEMPLATES.find((t) => t.id === 'tpl_village_video')!,
    STARTER_TEMPLATES.find((t) => t.id === 'tpl_digital_poster')!,
    STARTER_TEMPLATES.find((t) => t.id === 'tpl_nature_video')!,
  ].filter(Boolean), []);

  const inspiredTemplates = useMemo(() => [
    STARTER_TEMPLATES.find((t) => t.id === 'tpl_startup')!,
    STARTER_TEMPLATES.find((t) => t.id === 'tpl_places_reel')!,
    STARTER_TEMPLATES.find((t) => t.id === 'tpl_nomade')!,
    STARTER_TEMPLATES.find((t) => t.id === 'tpl_lessons_story')!,
  ].filter(Boolean), []);

  const renderCategoryIcon = (iconType: string) => {
    const cls = 'h-4 w-4 text-zinc-200';
    switch (iconType) {
      case 'monitor':
        return <Monitor className={cls} />;
      case 'smartphone':
        return <Smartphone className={cls} />;
      case 'film':
        return <Film className={cls} />;
      case 'video':
        return <Video className={cls} />;
      case 'image':
        return <ImageIcon className={cls} />;
      case 'globe':
        return <Globe className={cls} />;
      case 'table':
        return <Table className={cls} />;
      case 'share':
        return <Share2 className={cls} />;
      case 'credit-card':
        return <CreditCard className={cls} />;
      default:
        return <Layout className={cls} />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('stpl.modalTitle', 'Verken Templates')}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md"
    >
      <div className="flex h-full max-h-[92dvh] w-full max-w-4xl flex-col rounded-3xl border border-zinc-700/80 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden">
        {/* Top Header & Search Bar (Screenshots 3 & 4) */}
        <div className="flex flex-shrink-0 flex-col border-b border-zinc-800/80 p-4 sm:p-5 gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-100">
                  {selectedCategory
                    ? t(
                      TEMPLATE_CATEGORIES.find((c) => c.id === selectedCategory)?.nameKey ?? '',
                      TEMPLATE_CATEGORIES.find((c) => c.id === selectedCategory)?.nameAf ?? 'Templates',
                    )
                    : t('stpl.modalTitle', 'Verken Templates')}
                </h2>
                <p className="text-xs text-zinc-400">
                  {t('stpl.modalSub', 'Kies ’n professionele template om jou foto of video van te begin.')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('stpl.close', 'Maak toe')}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search bar matching Screenshot 4 */}
          <div className="relative flex items-center">
            <div className="pointer-events-none absolute left-3.5 flex items-center text-zinc-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('stpl.searchPlaceholder', 'Soek templates (bv. Pitch Deck, Video, Poster)...')}
              className="w-full rounded-2xl border border-zinc-700/80 bg-zinc-900/90 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 shadow-inner focus:border-amber-400 focus:outline-none"
            />
            <div className="absolute right-3.5 flex items-center text-zinc-400 hover:text-zinc-200 cursor-pointer">
              <Mic className="h-4 w-4" />
            </div>
          </div>

          {/* Horizontal Category Badges Bar (Screenshot 3) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedCategory === null
                  ? 'border border-amber-400 bg-amber-500/20 text-amber-200 shadow-sm'
                  : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <Layout className="h-3.5 w-3.5" />
              {t('stpl.allCategories', 'Alles')}
            </button>
            {TEMPLATE_CATEGORIES.map((cat: TemplateCategoryMeta) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    isSelected
                      ? 'border border-amber-400 bg-amber-500/20 text-amber-200 shadow-sm'
                      : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {renderCategoryIcon(cat.iconType)}
                  {lang === 'af' ? cat.nameAf : cat.nameEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Templates Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* If actively searching or category picked: show matching templates grid */}
          {(searchQuery.trim() || selectedCategory) ? (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      onSelectTemplate(tpl);
                      onClose();
                    }}
                    className="flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden hover:border-amber-400/60 hover:bg-zinc-900 transition-all text-left group shadow-lg"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-zinc-950 p-2 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tpl.previewSvg}
                        alt={lang === 'af' ? tpl.nameAf : tpl.nameEn}
                        className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute top-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-mono font-bold text-zinc-300 backdrop-blur-sm">
                        {tpl.ratioLabel}
                      </span>
                    </div>
                    <div className="p-3.5 space-y-1">
                      <h4 className="text-sm font-black text-zinc-100 group-hover:text-amber-300 transition-colors">
                        {lang === 'af' ? tpl.nameAf : tpl.nameEn}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        {lang === 'af' ? tpl.subAf : tpl.subEn}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              {filteredTemplates.length === 0 && (
                <div className="py-12 text-center text-xs text-zinc-500">
                  {t('stpl.noResults', 'Geen templates gevind vir jou soektog nie.')}
                </div>
              )}
            </div>
          ) : (
            /* Browse sections matching Screenshot 5 (Recently viewed, Inspired by designs, All) */
            <div className="space-y-6">
              {/* Recently viewed carousel */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block pb-2.5">
                  {t('stpl.recentlyViewed', 'Onlangs bekyk')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {recentTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        onSelectTemplate(tpl);
                        onClose();
                      }}
                      className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-amber-400/60 hover:bg-zinc-900 transition-all text-left group shadow-md"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-zinc-950 p-1.5 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={tpl.previewSvg}
                          alt={lang === 'af' ? tpl.nameAf : tpl.nameEn}
                          className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-2.5">
                        <h4 className="text-xs font-bold text-zinc-100 line-clamp-1 group-hover:text-amber-300">
                          {lang === 'af' ? tpl.nameAf : tpl.nameEn}
                        </h4>
                        <span className="text-[10px] text-zinc-500 font-mono">{tpl.ratioLabel}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Inspired by your designs carousel */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block pb-2.5">
                  {t('stpl.inspired', 'Geïnspireer deur jou ontwerpe')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {inspiredTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        onSelectTemplate(tpl);
                        onClose();
                      }}
                      className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-amber-400/60 hover:bg-zinc-900 transition-all text-left group shadow-md"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-zinc-950 p-1.5 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={tpl.previewSvg}
                          alt={lang === 'af' ? tpl.nameAf : tpl.nameEn}
                          className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-2.5">
                        <h4 className="text-xs font-bold text-zinc-100 line-clamp-1 group-hover:text-amber-300">
                          {lang === 'af' ? tpl.nameAf : tpl.nameEn}
                        </h4>
                        <span className="text-[10px] text-zinc-500 font-mono">{tpl.ratioLabel}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pitch Decks & Proposals matching Screenshot 4 */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block pb-2.5">
                  {t('stpl.pitchDecks', 'Aanbiedings & Pitch Decks')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {STARTER_TEMPLATES.filter((t) => t.category === 'presentation').map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        onSelectTemplate(tpl);
                        onClose();
                      }}
                      className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-amber-400/60 hover:bg-zinc-900 transition-all text-left group shadow-md"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-zinc-950 p-2 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={tpl.previewSvg}
                          alt={lang === 'af' ? tpl.nameAf : tpl.nameEn}
                          className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-3">
                        <h4 className="text-xs font-bold text-zinc-100 group-hover:text-amber-300">
                          {lang === 'af' ? tpl.nameAf : tpl.nameEn}
                        </h4>
                        <p className="text-[11px] text-zinc-400">
                          {lang === 'af' ? tpl.subAf : tpl.subEn}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
