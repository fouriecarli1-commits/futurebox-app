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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { drawTemplateFrame } from '../lib/templatevideo';
import {
  Search, Mic, X, Sparkles, Layout, Monitor, Smartphone, Film,
  Image as ImageIcon, Check, ChevronRight, ArrowLeft, Video,
  FileText, Globe, Table, Share2, CreditCard, Mail, BookOpen, Coffee,
  Grid, Circle, Square,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { barClearance } from './TabBar';
import {
  STARTER_TEMPLATES, TEMPLATE_CATEGORIES,
  type StudioTemplateItem, type TemplateCategoryMeta,
} from '../lib/studiotemplates';

/** A template that moves — the ones that become a clip on the video clock. */
const moves = (tpl: StudioTemplateItem): boolean =>
  Boolean(tpl.isVideo) || tpl.category === 'landscape_video' || tpl.category === 'mobile_video';

/**
 * The simulator: a motion template playing on a loop before it is chosen.
 *
 * Carli, 14 October 2026: *"Die motion templates moet 'n simulator hê
 * wanneer mens op dit kliek."* Drawn by `drawTemplateFrame`, the function
 * that records the clip, so this is the clip.
 */
function MotionTemplatePreview({ tpl }: { readonly tpl: StudioTemplateItem }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const wide = tpl.width > tpl.height;
  /* The recorder's own size, shrunk by CSS: the frame is drawn in fixed
     pixels for a 1280-wide clip, and drawn at half that the label and the
     headline landed on top of each other. */
  const width = wide ? 1280 : 720;
  const height = wide ? 720 : 1280;
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return undefined;
    const started = performance.now();
    let frame = 0;
    const go = (): void => {
      /* Three seconds, as the clip is, and round again. */
      const progress = (((performance.now() - started) / 1000) % 3) / 3;
      drawTemplateFrame(ctx, tpl, width, height, progress);
      frame = requestAnimationFrame(go);
    };
    frame = requestAnimationFrame(go);
    return () => cancelAnimationFrame(frame);
  }, [tpl, width, height]);
  return (
    <canvas
      ref={canvas}
      data-templatesimulator={tpl.id}
      width={width}
      height={height}
      className={`mx-auto rounded-xl border border-zinc-700 ${wide ? 'w-full max-w-md' : 'h-[50dvh] w-auto'}`}
    />
  );
}

export default function StudioTemplatesModal({
  onSelectTemplate,
  onClose,
  stillOnly = false,
}: {
  readonly onSelectTemplate: (template: StudioTemplateItem) => void;
  readonly onClose: () => void;
  /** The photo room: a moving template lands there as a still, and says so. */
  readonly stillOnly?: boolean;
}): React.ReactElement {
  const { t, lang } = useLang();
  /* A layer, so Back closes this and not the room under it. */
  useBackLayer(true, onClose);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<StudioTemplateItem | null>(null);
  /* A moving template plays first; anything else goes straight on. */
  const choose = (tpl: StudioTemplateItem): void => {
    if (moves(tpl)) { setPreviewing(tpl); return; }
    onSelectTemplate(tpl);
    onClose();
  };

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
    const cls = 'h-4 w-4 flex-shrink-0 text-zinc-200';
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
      case 'mail':
        return <Mail className={cls} />;
      case 'sparkles':
        return <Sparkles className={cls} />;
      case 'book':
        return <BookOpen className={cls} />;
      case 'coffee':
        return <Coffee className={cls} />;
      case 'grid':
        return <Grid className={cls} />;
      case 'circle':
        return <Circle className={cls} />;
      case 'square':
        return <Square className={cls} />;
      case 'file-text':
      case 'file':
        return <FileText className={cls} />;
      default:
        return <Layout className={cls} />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('stpl.modalTitle', 'Templates Explorer & Starter Packs')}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-scrim backdrop-blur-md"
      /* Below the tab bar, so the strip stays reachable — the rule every
         overlay under z-50 keeps; `check:belowtabs` holds it by name. */
      style={{ paddingBottom: barClearance(16) }}
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
                    : t('stpl.modalTitle', 'Templates Explorer & Starter Packs')}
                </h2>
                <p className="text-xs text-zinc-400">
                  {t('stpl.modalSub', 'Start straight away from a professional video or photo template.')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('stpl.close', 'Close template explorer')}
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
              placeholder={t('stpl.searchPlaceholder', 'Search templates (e.g. Pitch deck, Nature, Flyer)...')}
              className="w-full rounded-2xl border border-zinc-700/80 bg-zinc-900/90 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 shadow-inner focus:border-amber-400 focus:outline-none"
            />
            <div className="absolute right-3.5 flex items-center text-zinc-400 hover:text-zinc-200 cursor-pointer">
              <Mic className="h-4 w-4" />
            </div>
          </div>

          {/* ── The categories: one row, every bar the same size ─────────
              Carli, 15 October 2026: *"Dit lyk nogsteeds of hierdie
              templates nie templates het nie … Elke bar moet ewe groot
              wees, dit moet netjies wees."* Twenty-one buttons wrapping in
              their own widths filled the whole pop-out on a phone and left
              the templates no room under them — so it looked empty.
              sideways on purpose: one row that scrolls, each the same
              width and height, and the templates start right under it. */}
          <div data-sideways data-templatecats className="-mx-1 flex snap-x flex-nowrap items-stretch gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`flex min-h-[44px] w-36 flex-shrink-0 snap-start items-center justify-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedCategory === null
                  ? 'border border-amber-400 bg-amber-500/20 text-amber-200 shadow-sm'
                  : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <Layout className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{t('stpl.allCategories', 'All Categories')}</span>
            </button>
            {TEMPLATE_CATEGORIES.map((cat: TemplateCategoryMeta) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex min-h-[44px] w-36 flex-shrink-0 snap-start items-center justify-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-bold transition-all ${
                    isSelected
                      ? 'border border-amber-400 bg-amber-500/20 text-amber-200 shadow-sm'
                      : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {renderCategoryIcon(cat.iconType)}
                  <span className="truncate">{lang === 'af' ? cat.nameAf : cat.nameEn}</span>
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => choose(tpl)}
                    className="flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden hover:border-amber-400/60 hover:bg-zinc-900 transition-all text-left group shadow-lg"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-zinc-950 p-2 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI drawn on the device; next/image has nothing to fetch or optimise */}
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
                  {t('stpl.noResults', 'No templates match your search.')}
                </div>
              )}
            </div>
          ) : (
            /* Browse sections matching Screenshot 5 (Recently viewed, Inspired by designs, All) */
            <div className="space-y-6">
              {/* Recently viewed carousel */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block pb-2.5">
                  {t('stpl.recentlyViewed', 'Recently viewed')}
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {recentTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => choose(tpl)}
                      className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-amber-400/60 hover:bg-zinc-900 transition-all text-left group shadow-md"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-zinc-950 p-1.5 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI drawn on the device; next/image has nothing to fetch or optimise */}
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
                  {t('stpl.inspired', 'Inspired by your designs')}
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {inspiredTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => choose(tpl)}
                      className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-amber-400/60 hover:bg-zinc-900 transition-all text-left group shadow-md"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-zinc-950 p-1.5 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI drawn on the device; next/image has nothing to fetch or optimise */}
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
                  {t('stpl.pitchDecks', 'Pitch Decks & Presentations')}
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {STARTER_TEMPLATES.filter((t) => t.category === 'presentation').map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => choose(tpl)}
                      className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-amber-400/60 hover:bg-zinc-900 transition-all text-left group shadow-md"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-zinc-950 p-2 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI drawn on the device; next/image has nothing to fetch or optimise */}
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

              {/* Posters & Flyers */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block pb-2.5">
                  {t('stpl.postersFlyers', 'Posters & Flyers')}
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {STARTER_TEMPLATES.filter((t) => t.category === 'poster' || t.category === 'flyer').map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => choose(tpl)}
                      className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-amber-400/60 hover:bg-zinc-900 transition-all text-left group shadow-md"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-zinc-950 p-2 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI drawn on the device; next/image has nothing to fetch or optimise */}
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

              {/* Branding, Business Cards & Resumes */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block pb-2.5">
                  {t('stpl.brandingBusiness', 'Branding, Business Cards & Resumes')}
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {STARTER_TEMPLATES.filter((t) => t.category === 'logo' || t.category === 'business_card' || t.category === 'resume').map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => choose(tpl)}
                      className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-amber-400/60 hover:bg-zinc-900 transition-all text-left group shadow-md"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-zinc-950 p-2 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI drawn on the device; next/image has nothing to fetch or optimise */}
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

              {/* Social Media & Stories */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block pb-2.5">
                  {t('stpl.socialStories', 'Social Media Posts & Stories')}
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {STARTER_TEMPLATES.filter((t) => t.category === 'ig_post' || t.category === 'ig_story' || t.category === 'facebook_post').map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => choose(tpl)}
                      className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-amber-400/60 hover:bg-zinc-900 transition-all text-left group shadow-md"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-zinc-950 p-2 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI drawn on the device; next/image has nothing to fetch or optimise */}
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

              {/* Cinematic Video Creations */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block pb-2.5">
                  {t('stpl.videoCinematic', 'Cinematic Video Creations')}
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {STARTER_TEMPLATES.filter((t) => t.category === 'landscape_video' || t.category === 'mobile_video').map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => choose(tpl)}
                      className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-amber-400/60 hover:bg-zinc-900 transition-all text-left group shadow-md"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-zinc-950 p-2 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI drawn on the device; next/image has nothing to fetch or optimise */}
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

              {/* Web, Editorial, Menus & Sheets */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 block pb-2.5">
                  {t('stpl.publishingWeb', 'Web, Editorial, Menus & Sheets')}
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {STARTER_TEMPLATES.filter((t) => t.category === 'website' || t.category === 'menu' || t.category === 'sheet' || t.category === 'brochure' || t.category === 'doc' || t.category === 'email' || t.category === 'photo_collage' || t.category === 'invitation').map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => choose(tpl)}
                      className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-amber-400/60 hover:bg-zinc-900 transition-all text-left group shadow-md"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-zinc-950 p-2 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI drawn on the device; next/image has nothing to fetch or optimise */}
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
      {previewing && (
        <div
          data-templatepreview
          className="absolute inset-0 z-10 flex items-center justify-center bg-scrim/90 p-4 backdrop-blur-sm"
          style={{ paddingBottom: barClearance(16) }}
        >
          <div className="w-full max-w-lg space-y-3 rounded-2xl border border-zinc-700 bg-zinc-950 p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-zinc-100">{lang === 'af' ? previewing.nameAf : previewing.nameEn}</h4>
              <button
                type="button"
                onClick={() => setPreviewing(null)}
                aria-label={t('stpl.previewBack', 'Back to the templates')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <MotionTemplatePreview tpl={previewing} />
            {stillOnly && (
              <p className="text-xs text-zinc-300" data-templatestillnote>
                {t('stpl.stillNote', 'A photo cannot move, so here it goes on as a still. To keep the motion, pick it in the Video Editor.')}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewing(null)}
                className="min-h-[44px] flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold text-zinc-100"
              >
                {t('stpl.previewBack', 'Back to the templates')}
              </button>
              <button
                type="button"
                data-templateuse
                onClick={() => { onSelectTemplate(previewing); setPreviewing(null); onClose(); }}
                className="min-h-[44px] flex-1 rounded-xl border border-emerald-400 bg-emerald-500 px-3 text-sm font-bold text-onAccent"
              >
                {t('stpl.previewUse', 'Use this template')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
