'use client';

/**
 * Floating canvas toolbar for FutureBox Photo & Video Studio.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"Daar is goed wat ek voel die video en photo
 * editor nog nodig het... hierdie goed is regdeur die bank by alle video en
 * photo editors... top toolbar: Edit, Replace, BG Remover, Eraser, Flip,
 * Animate, Position... floating context bar: Comment, Lock, Duplicate,
 * Delete."*
 */

import React, { useState } from 'react';
import {
  Wand2, Scissors, Eraser, FlipHorizontal, RotateCw, Video, QrCode, Type,
  Copy, Lock, Unlock, Trash2, Sliders, Palette, Check, Sparkles, Shapes, Clapperboard, Camera, Play,
  LayoutTemplate, Maximize2,
} from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function CanvasFloatingToolbar({
  onOpenTemplates,
  onOpenCanvasSize,
  onOpenMagicSuite,
  onOpenBarcode,
  onOpenFontCombos,
  onOpenElements,
  onOpenVideoApps,
  onOpenAnimateSidebar,
  onToggleViewfinder,
  isViewfinderActive = false,
  onRemoveBg,
  onToggleEraser,
  onFlip,
  onAddText,
  onOpenLivingPhoto,
  isEraserActive = false,
  selectedElementId = null,
  isLocked = false,
  onToggleLock,
  onDuplicateElement,
  onDeleteElement,
  onOpenSpacingPopover,
}: {
  readonly onOpenTemplates?: () => void;
  readonly onOpenCanvasSize?: () => void;
  readonly onOpenMagicSuite: () => void;
  readonly onOpenBarcode: () => void;
  readonly onOpenFontCombos?: () => void;
  readonly onOpenElements?: () => void;
  readonly onOpenVideoApps?: () => void;
  readonly onOpenAnimateSidebar?: () => void;
  readonly onToggleViewfinder?: () => void;
  readonly isViewfinderActive?: boolean;
  readonly onRemoveBg: () => void;
  readonly onToggleEraser: () => void;
  readonly onFlip: () => void;
  readonly onAddText: () => void;
  readonly onOpenLivingPhoto: () => void;
  readonly isEraserActive?: boolean;
  readonly selectedElementId?: string | null;
  readonly isLocked?: boolean;
  readonly onToggleLock?: () => void;
  readonly onDuplicateElement?: () => void;
  readonly onDeleteElement?: () => void;
  readonly onOpenSpacingPopover?: () => void;
}): React.ReactElement {
  const { t } = useLang();

  return (
    <div className="flex flex-col items-center gap-2 pointer-events-auto">
      {/* ── 1. Top floating action bar (like Screenshot 2) ──────────────── */}
      <div className="flex items-center gap-1 sm:gap-1.5 rounded-full border border-zinc-700/80 bg-zinc-950/85 px-2.5 py-1.5 shadow-2xl backdrop-blur-xl">
        {/* Templates Explorer Starter Pack */}
        {onOpenTemplates && (
          <button
            type="button"
            onClick={onOpenTemplates}
            title={t('toolbar.templates', 'Templates & Starter Pack')}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/40 px-2.5 py-1.5 text-xs font-bold text-purple-200 hover:brightness-110 active:scale-95 transition-all"
          >
            <LayoutTemplate className="h-4 w-4 text-purple-400" />
            <span className="hidden sm:inline">{t('toolbar.templatesShort', 'Templates')}</span>
          </button>
        )}

        {/* Canvas Size / Doekgrootte Resizer */}
        {onOpenCanvasSize && (
          <button
            type="button"
            onClick={onOpenCanvasSize}
            title={t('toolbar.canvasSize', 'Canvas Size & Standard Sizes')}
            className="flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-700/80 px-2.5 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-850 hover:text-white active:scale-95 transition-all"
          >
            <Maximize2 className="h-3.5 w-3.5 text-teal-400" />
            <span className="hidden sm:inline">{t('toolbar.canvasSizeShort', 'Size')}</span>
          </button>
        )}

        {(onOpenTemplates || onOpenCanvasSize) && (
          <div className="h-4 w-px bg-zinc-800" />
        )}

        {/* Magic Suite button */}
        <button
          type="button"
          onClick={onOpenMagicSuite}
          title={t('toolbar.magicSuite', 'Tower-Suite (All AI Tools)')}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-purple-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-black text-emerald-200 hover:brightness-110 active:scale-95 transition-all"
        >
          <Wand2 className="h-4 w-4 text-emerald-400" />
          <span className="hidden sm:inline">{t('toolbar.magicSuiteShort', 'Tower-Suite')}</span>
        </button>

        <div className="h-4 w-px bg-zinc-800" />

        {/* Quick BG Remover */}
        <button
          type="button"
          onClick={onRemoveBg}
          title={t('toolbar.bgRemover', 'Remove Background')}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-850 hover:text-white transition-all active:scale-95"
        >
          <Scissors className="h-4 w-4 text-cyan-400" />
          <span className="hidden md:inline">{t('toolbar.bgRemoverShort', 'BG Remover')}</span>
        </button>

        {/* Quick Eraser */}
        <button
          type="button"
          onClick={onToggleEraser}
          title={t('toolbar.eraser', 'Magic Eraser')}
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
            isEraserActive
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
              : 'text-zinc-300 hover:bg-zinc-850 hover:text-white'
          }`}
        >
          <Eraser className="h-4 w-4 text-rose-400" />
          <span className="hidden md:inline">{t('toolbar.eraserShort', 'Eraser')}</span>
        </button>

        {/* Flip */}
        <button
          type="button"
          onClick={onFlip}
          title={t('toolbar.flip', 'Flip Horizontal')}
          className="rounded-full p-2 text-zinc-300 hover:bg-zinc-850 hover:text-white transition-all active:scale-95"
        >
          <FlipHorizontal className="h-4 w-4 text-zinc-300" />
        </button>

        {/* Add Text */}
        <button
          type="button"
          onClick={onAddText}
          title={t('toolbar.addText', 'Add Words / Heading')}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-850 hover:text-white transition-all active:scale-95"
        >
          <Type className="h-4 w-4 text-amber-400" />
          <span className="hidden md:inline">{t('toolbar.addTextShort', 'Text')}</span>
        </button>

        {/* Font Combinations & Typography Effects (Carli, 11 Oct 2026) */}
        {onOpenFontCombos && (
          <button
            type="button"
            onClick={onOpenFontCombos}
            title={t('combo.toolbarButton', 'Font Combinations & Text Effects')}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-zinc-850 hover:text-amber-200 transition-all active:scale-95 border border-amber-400/30 bg-amber-400/10"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="hidden md:inline">{t('combo.toolbarButtonShort', 'Font Combinations')}</span>
          </button>
        )}

        {/* Elements Browser (shapes, graphics, 3D, frames, mockups) */}
        {onOpenElements && (
          <button
            type="button"
            onClick={onOpenElements}
            title={t('elem.toolbarButton', 'Elements & Shapes')}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold text-teal-300 hover:bg-zinc-850 hover:text-teal-200 transition-all active:scale-95 border border-teal-400/30 bg-teal-400/10"
          >
            <Shapes className="h-4 w-4 text-teal-400" />
            <span className="hidden md:inline">{t('elem.toolbarButtonShort', 'Elements')}</span>
          </button>
        )}

        {/* Living Photo / Veo */}
        <button
          type="button"
          onClick={onOpenLivingPhoto}
          title={t('toolbar.animate', 'Image to Video (Google Veo)')}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-850 hover:text-white transition-all active:scale-95"
        >
          <Video className="h-4 w-4 text-purple-400" />
          <span className="hidden md:inline">{t('toolbar.animateShort', 'Animate')}</span>
        </button>

        {/* Video Apps & Effects Suite */}
        {onOpenVideoApps && (
          <button
            type="button"
            onClick={onOpenVideoApps}
            title={t('videoapps.toolbarButton', 'Video Apps')}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold text-indigo-300 hover:bg-zinc-850 hover:text-indigo-200 transition-all active:scale-95 border border-indigo-500/30 bg-indigo-500/10"
          >
            <Clapperboard className="h-4 w-4 text-indigo-400" />
            <span className="hidden md:inline">{t('videoapps.toolbarButtonShort', 'Apps')}</span>
          </button>
        )}

        {/* Animate Panel (animation presets & add-on effects) */}
        {onOpenAnimateSidebar && (
          <button
            type="button"
            onClick={onOpenAnimateSidebar}
            title={t('animate.toolbarButton', 'Animate')}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold text-purple-300 hover:bg-zinc-850 hover:text-purple-200 transition-all active:scale-95 border border-purple-500/30 bg-purple-500/10"
          >
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="hidden md:inline">{t('animate.toolbarButtonShort', 'Motion')}</span>
          </button>
        )}

        {/* Viewfinder REC toggle (Screenshot 2) */}
        {onToggleViewfinder && (
          <button
            type="button"
            onClick={onToggleViewfinder}
            title={t('moises.viewfinder', 'Viewfinder REC')}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition-all active:scale-95 border ${
              isViewfinderActive
                ? 'border-red-500/50 bg-red-500/20 text-red-300'
                : 'border-zinc-700/80 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="hidden md:inline">REC</span>
          </button>
        )}

        <div className="h-4 w-px bg-zinc-800" />

        {/* Barcode & QR Generator */}
        <button
          type="button"
          onClick={onOpenBarcode}
          title={t('toolbar.barcode', 'Barcode & QR Generator')}
          className="flex items-center gap-1.5 rounded-full border border-zinc-700/80 bg-zinc-900 px-2.5 py-1.5 text-xs font-bold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all active:scale-95"
        >
          <QrCode className="h-4 w-4 text-emerald-400" />
          <span className="hidden sm:inline">{t('toolbar.barcodeShort', 'QR / Barcode')}</span>
        </button>
      </div>

      {/* ── 2. Floating Context Pill over selected element (Screenshot 2 & 5) ── */}
      {selectedElementId && (
        <div className="flex items-center gap-1 rounded-full border border-zinc-700/80 bg-zinc-900/95 px-3 py-1 shadow-xl backdrop-blur-md text-zinc-200 animate-in fade-in zoom-in-95 duration-100">
          {/* Lock / Unlock */}
          {onToggleLock && (
            <button
              type="button"
              onClick={onToggleLock}
              title={isLocked ? t('context.unlock', 'Unlock') : t('context.lock', 'Lock')}
              className={`rounded-full p-1.5 transition-colors ${
                isLocked ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </button>
          )}

          {/* Duplicate */}
          {onDuplicateElement && (
            <button
              type="button"
              onClick={onDuplicateElement}
              title={t('context.duplicate', 'Duplicate')}
              className="rounded-full p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Spacing Popover toggle */}
          {onOpenSpacingPopover && (
            <button
              type="button"
              onClick={onOpenSpacingPopover}
              title={t('context.spacing', 'Letter & Line Spacing')}
              className="rounded-full p-1.5 text-zinc-400 hover:text-emerald-300 transition-colors"
            >
              <Sliders className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Delete */}
          {onDeleteElement && (
            <button
              type="button"
              onClick={onDeleteElement}
              title={t('context.delete', 'Delete')}
              className="rounded-full p-1.5 text-zinc-400 hover:text-rose-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
