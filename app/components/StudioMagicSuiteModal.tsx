'use client';

/**
 * FutureBox 'Tower-Suite' (Studio Magic AI Panel).
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner, 11 October 2026: *"Daar is goed wat ek voel die video en photo
 * editor nog nodig het... hierdie goed is regdeur die bank by alle video en
 * photo editors, ons kan die produk net 'n ander naam gee, en gebruik maak
 * van google se engines om met van die goed te help."*
 *
 * ── Architecture ─────────────────────────────────────────────────────────
 *
 * Categorized suite matching modern photo & video editing standards:
 *   · Enhance (Verbeter): Adjust, Upscale, BG Remover, Magic Eraser, Blur/Bokeh, Face Retouch.
 *   · Reimagine (Herbedink): Magic Edit (Inpaint), Living Photo (Veo Motion), BG Generator, Magic Expand.
 *   · Select Elements (Slim Lae): Magic Layers, Magic Grab, Grab Text (OCR).
 *   · Style Match (Styl & Tydperke): Era Templates, Duotone, Pop, Mono, Etching.
 */

import { barClearance } from './TabBar';
import React, { useState } from 'react';
import {
  Sparkles, Wand2, SlidersHorizontal, Scissors, Eraser, Focus, UserCheck,
  Video, ImagePlus, Expand, Layers, Hand, ScanText, Palette, X, ChevronRight, Check,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';

export type MagicToolId =
  | 'adjust'
  | 'upscale'
  | 'bg_remover'
  | 'magic_eraser'
  | 'blur_focus'
  | 'face_retouch'
  | 'magic_edit'
  | 'image_to_video'
  | 'bg_generator'
  | 'magic_expand'
  | 'magic_layers'
  | 'magic_grab'
  | 'grab_text'
  | 'era_templates';

interface MagicToolItem {
  readonly id: MagicToolId;
  readonly title: readonly [string, string];
  readonly sub: readonly [string, string];
  readonly icon: React.ReactNode;
  readonly badge?: string;
  readonly isGoogleAi?: boolean;
}

export default function StudioMagicSuiteModal({
  onSelectTool,
  onClose,
}: {
  readonly onSelectTool: (id: MagicToolId) => void;
  readonly onClose: () => void;
}): React.ReactElement {
  const { t } = useLang();
  /* Back closes it, as every overlay that covers the app does (`check:backlayers`). */
  useBackLayer(true, onClose);
  const [activeTab, setActiveTab] = useState<'all' | 'enhance' | 'reimagine' | 'select' | 'style'>('all');

  const ENHANCE_TOOLS: readonly MagicToolItem[] = [
    {
      id: 'adjust',
      title: ['magic.adjust', 'Adjust & Sliders'],
      sub: ['magic.adjustSub', 'Brightness, contrast, warmth, and sharpness sliders'],
      icon: <SlidersHorizontal className="h-6 w-6 text-emerald-400" />,
    },
    {
      id: 'upscale',
      title: ['magic.upscale', 'AI Super-Resolution'],
      sub: ['magic.upscaleSub', 'Crisp 2x / 4x HD upscaler on your device'],
      icon: <Sparkles className="h-6 w-6 text-amber-400" />,
      badge: 'HD',
    },
    {
      id: 'bg_remover',
      title: ['magic.bgRemover', 'BG Remover'],
      sub: ['magic.bgRemoverSub', 'Instant one-tap clean subject cutout'],
      icon: <Scissors className="h-6 w-6 text-cyan-400" />,
      badge: 'Auto',
    },
    {
      id: 'magic_eraser',
      title: ['magic.magicEraser', 'Magic Eraser'],
      sub: ['magic.magicEraserSub', 'Brush over objects or blemishes to erase them'],
      icon: <Eraser className="h-6 w-6 text-rose-400" />,
    },
    {
      id: 'blur_focus',
      title: ['magic.blurFocus', 'Depth Blur & Focus'],
      sub: ['magic.blurFocusSub', 'Soft studio bokeh background depth of field'],
      icon: <Focus className="h-6 w-6 text-indigo-400" />,
    },
    {
      id: 'face_retouch',
      title: ['magic.faceRetouch', 'Face Retouch'],
      sub: ['magic.faceRetouchSub', 'Even skin tones, portrait lighting, and eye clarity'],
      icon: <UserCheck className="h-6 w-6 text-pink-400" />,
    },
  ];

  const REIMAGINE_TOOLS: readonly MagicToolItem[] = [
    {
      id: 'magic_edit',
      title: ['magic.magicEdit', 'Magic Edit (Inpaint)'],
      sub: ['magic.magicEditSub', 'Brush an area and replace it with Google Gemini prompt'],
      icon: <Wand2 className="h-6 w-6 text-purple-400" />,
      badge: 'Gemini',
      isGoogleAi: true,
    },
    {
      id: 'image_to_video',
      title: ['magic.imageToVideo', 'Image to Video (Veo)'],
      sub: ['magic.imageToVideoSub', 'Transform static images into 4K motion loops with Veo'],
      icon: <Video className="h-6 w-6 text-blue-400" />,
      badge: 'Veo',
      isGoogleAi: true,
    },
    {
      id: 'bg_generator',
      title: ['magic.bgGenerator', 'BG Generator'],
      sub: ['magic.bgGeneratorSub', 'Generate brand new custom studio backdrops with AI'],
      icon: <ImagePlus className="h-6 w-6 text-amber-300" />,
      badge: 'Nano Banana',
      isGoogleAi: true,
    },
    {
      id: 'magic_expand',
      title: ['magic.magicExpand', 'Magic Expand'],
      sub: ['magic.magicExpandSub', 'Extend canvas borders seamlessly with generative fill'],
      icon: <Expand className="h-6 w-6 text-emerald-300" />,
      badge: 'AI Outpaint',
    },
  ];

  const SELECT_TOOLS: readonly MagicToolItem[] = [
    {
      id: 'magic_layers',
      title: ['magic.magicLayers', 'Magic Layers'],
      sub: ['magic.magicLayersSub', 'Split foreground subject and backdrop into distinct layers'],
      icon: <Layers className="h-6 w-6 text-cyan-300" />,
    },
    {
      id: 'magic_grab',
      title: ['magic.magicGrab', 'Magic Grab'],
      sub: ['magic.magicGrabSub', 'Detect and isolate subjects to move or scale freely'],
      icon: <Hand className="h-6 w-6 text-amber-400" />,
    },
    {
      id: 'grab_text',
      title: ['magic.grabText', 'Grab Text (OCR)'],
      sub: ['magic.grabTextSub', 'Extract words inside the photo into editable text'],
      icon: <ScanText className="h-6 w-6 text-emerald-400" />,
      badge: 'OCR',
    },
  ];

  const STYLE_TOOLS: readonly MagicToolItem[] = [
    {
      id: 'era_templates',
      title: ['magic.eraTemplates', 'Era Templates & Filters'],
      sub: ['magic.eraTemplatesSub', '70s, 80s, 90s, Y2K, Afrofuturism, and art filters'],
      icon: <Palette className="h-6 w-6 text-fuchsia-400" />,
    },
  ];

  const handlePick = (id: MagicToolId) => {
    onSelectTool(id);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-scrim/85 backdrop-blur-md" style={{ paddingBottom: barClearance(12) }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-zinc-700 bg-zinc-900 shadow-2xl text-zinc-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-5 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
              <Wand2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-zinc-100">
                  {t('magic.suiteTitle', 'FutureBox Magic Suite')}
                </h3>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                  Google AI Ready
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {t('magic.suiteSub', 'All-in-one studio suite for intelligent photo and video enhancement.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 flex-wrap border-b border-zinc-800 px-5 py-2.5 bg-zinc-950/40">
          {(
            [
              ['all', t('magic.tabAll', 'All Tools')],
              ['enhance', t('magic.tabEnhance', 'Enhance')],
              ['reimagine', t('magic.tabReimagine', 'Reimagine')],
              ['select', t('magic.tabSelect', 'Smart layers')],
              ['style', t('magic.tabStyle', 'Style & eras')],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-full px-3.5 py-1 text-xs font-black whitespace-nowrap transition-all ${
                activeTab === key
                  ? 'bg-zinc-100 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Section: Enhance */}
          {(activeTab === 'all' || activeTab === 'enhance') && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                <span>🪄 {t('magic.sectionEnhance', 'Enhance')}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ENHANCE_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handlePick(tool.id)}
                    className="group flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 text-left transition-all hover:border-emerald-500/50 hover:bg-zinc-950 hover:shadow-lg active:scale-95"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 group-hover:scale-105 transition-transform">
                      {tool.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-sm font-bold text-zinc-200 group-hover:text-emerald-300 transition-colors truncate">
                          {t(tool.title[0], tool.title[1])}
                        </h5>
                        {tool.badge && (
                          <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[9px] font-black uppercase text-zinc-300">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-400 leading-snug line-clamp-2">
                        {t(tool.sub[0], tool.sub[1])}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-emerald-400 self-center shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Reimagine (Google AI) */}
          {(activeTab === 'all' || activeTab === 'reimagine') && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-2">
                <span>✨ {t('magic.sectionReimagine', 'Reimagine (Google AI)')}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {REIMAGINE_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handlePick(tool.id)}
                    className="group flex items-start gap-3 rounded-2xl border border-purple-900/40 bg-purple-950/20 p-3 text-left transition-all hover:border-purple-500/60 hover:bg-purple-950/40 hover:shadow-lg active:scale-95"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 border border-purple-800/50 group-hover:scale-105 transition-transform">
                      {tool.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-sm font-bold text-zinc-200 group-hover:text-purple-300 transition-colors truncate">
                          {t(tool.title[0], tool.title[1])}
                        </h5>
                        {tool.badge && (
                          <span className="rounded-md bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-purple-300 border border-purple-500/30">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-400 leading-snug line-clamp-2">
                        {t(tool.sub[0], tool.sub[1])}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-purple-400 group-hover:text-purple-300 self-center shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Select & Layers */}
          {(activeTab === 'all' || activeTab === 'select') && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                <span>🎯 {t('magic.sectionSelect', 'Smart layers & grab')}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SELECT_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handlePick(tool.id)}
                    className="group flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 text-left transition-all hover:border-cyan-500/50 hover:bg-zinc-950 hover:shadow-lg active:scale-95"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 group-hover:scale-105 transition-transform">
                      {tool.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-sm font-bold text-zinc-200 group-hover:text-cyan-300 transition-colors truncate">
                          {t(tool.title[0], tool.title[1])}
                        </h5>
                        {tool.badge && (
                          <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[9px] font-black uppercase text-zinc-300">
                            {tool.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-400 leading-snug line-clamp-2">
                        {t(tool.sub[0], tool.sub[1])}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-cyan-400 self-center shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Style Match */}
          {(activeTab === 'all' || activeTab === 'style') && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-fuchsia-400 mb-3 flex items-center gap-2">
                <span>🎨 {t('magic.sectionStyle', 'Style & eras')}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STYLE_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handlePick(tool.id)}
                    className="group flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 text-left transition-all hover:border-fuchsia-500/50 hover:bg-zinc-950 hover:shadow-lg active:scale-95"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 group-hover:scale-105 transition-transform">
                      {tool.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-sm font-bold text-zinc-200 group-hover:text-fuchsia-300 transition-colors truncate">
                        {t(tool.title[0], tool.title[1])}
                      </h5>
                      <p className="mt-0.5 text-xs text-zinc-400 leading-snug line-clamp-2">
                        {t(tool.sub[0], tool.sub[1])}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-fuchsia-400 self-center shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
