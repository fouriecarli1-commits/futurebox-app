'use client';

/**
 * Font combinations & typography effects gallery modal.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"Ons het defnitief meer teks voorstelle en
 * amazing teks templates nodig... font combinations soos BOLD moves, ROCK,
 * static, BOO!, CUSTOM PAINT, SPOOKY, SCARY story, TALK TO US... en apps
 * soos TypeExtrude, TypeCutOut, TypeLettering, TypeGradient, Signature."*
 */

import React, { useState } from 'react';
import {
  Sparkles, Type, Wand2, X, Check, Layers, Sliders, Palette,
  PenTool, Box, Scissors, Sticker, ChevronRight, Crown,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import {
  FONT_COMBINATIONS, type ComboCategory, type FontComboPreset,
} from '../lib/fontcombinations';
import { faceOf } from '../lib/postfaces';

export type TextEffectType =
  | 'extrude'
  | 'cutout'
  | 'lettering'
  | 'gradient'
  | 'typestudio'
  | 'typecraft'
  | 'motiontext'
  | 'signature';

export interface TextEffectConfig {
  readonly type: TextEffectType;
  readonly name: string;
  readonly extrudeDepth?: number;
  readonly extrudeColor?: string;
  readonly strokeWidth?: number;
  readonly strokeColor?: string;
  readonly gradientFrom?: string;
  readonly gradientTo?: string;
  readonly signatureName?: string;
  readonly studioLayers?: readonly { readonly color: string; readonly depth: number }[];
  readonly craftCurve?: number;
  readonly craftStyle?: 'arch' | 'wave' | 'bulge' | 'pinch';
  readonly motionPreset?: 'pop' | 'typewriter' | 'slide' | 'wave' | 'bounce';
}

export default function FontCombinationsModal({
  onApplyCombo,
  onApplyEffect,
  onClose,
}: {
  readonly onApplyCombo: (combo: FontComboPreset) => void;
  readonly onApplyEffect: (effect: TextEffectConfig) => void;
  readonly onClose: () => void;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [activeTab, setActiveTab] = useState<'combos' | 'effects'>('combos');
  const [category, setCategory] = useState<ComboCategory>('all');
  const [selectedEffect, setSelectedEffect] = useState<TextEffectType>('extrude');

  // Effect customization states
  const [extrudeDepth, setExtrudeDepth] = useState(4);
  const [extrudeColor, setExtrudeColor] = useState('#0284c7');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState('#09090b');
  const [gradientFrom, setGradientFrom] = useState('#f97316');
  const [gradientTo, setGradientTo] = useState('#ec4899');
  const [signatureName, setSignatureName] = useState('FutureBox Creator');
  const [craftCurve, setCraftCurve] = useState(25);
  const [craftStyle, setCraftStyle] = useState<'arch' | 'wave' | 'bulge' | 'pinch'>('arch');
  const [motionPreset, setMotionPreset] = useState<'pop' | 'typewriter' | 'slide' | 'wave' | 'bounce'>('pop');
  const [studioColor1, setStudioColor1] = useState('#f97316');
  const [studioColor2, setStudioColor2] = useState('#0284c7');
  const [studioColor3, setStudioColor3] = useState('#09090b');

  const filteredCombos = FONT_COMBINATIONS.filter(
    (c) => category === 'all' || c.category === category,
  );

  const categories: readonly { id: ComboCategory; labelKey: string; fallback: string }[] = [
    { id: 'all', labelKey: 'combo.catAll', fallback: 'Alles' },
    { id: 'bold_rock', labelKey: 'combo.catBoldRock', fallback: 'Gewaagd & Rock' },
    { id: 'creative', labelKey: 'combo.catCreative', fallback: 'Kreatief & Speels' },
    { id: 'minimal', labelKey: 'combo.catMinimal', fallback: 'Minimaal & Besigheid' },
    { id: 'retro', labelKey: 'combo.catRetro', fallback: 'Retro & Kuns' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('combo.modalTitle', 'Text combinations and effects')}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-scrim/80 backdrop-blur-md"
    >
      <div className="flex h-full max-h-[92dvh] w-full max-w-4xl flex-col rounded-3xl border border-zinc-700/80 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-zinc-800/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-black shadow-lg">
              <Type className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-100">
                {t('combo.modalTitle', 'Text combinations and effects')}
              </h2>
              <p className="text-xs text-zinc-400">
                {t('combo.modalSub', 'Kies professionele font-kombinasies of 3D, knipmasker en handtekening-effekte.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('combo.close', 'Maak toe')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50 px-5 py-2.5 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('combos')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'combos'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t('combo.tabCombos', 'Font-Kombinasies (Templates)')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('effects')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === 'effects'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Wand2 className="h-3.5 w-3.5" />
            {t('combo.tabEffects', 'Teks-Effekte (Extrude, CutOut, Gradient)')}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {activeTab === 'combos' ? (
            <div className="space-y-5">
              {/* Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                      category === cat.id
                        ? 'border border-amber-400 bg-amber-400/20 text-amber-200'
                        : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t(cat.labelKey, cat.fallback)}
                  </button>
                ))}
              </div>

              {/* Grid of Preset Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
                {filteredCombos.map((combo) => {
                  const headWord = combo.words[0];
                  const subWord = combo.words[1];
                  const headFace = headWord ? faceOf(headWord.face) : null;
                  const subFace = subWord ? faceOf(subWord.face) : null;

                  return (
                    <div
                      key={combo.id}
                      className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-4 hover:border-amber-400/50 hover:bg-zinc-900 transition-all duration-200 shadow-lg"
                    >
                      {/* Badge */}
                      <div className="flex items-center justify-between pb-3">
                        <span className="rounded-md border border-zinc-700/60 bg-zinc-950 px-2 py-0.5 text-[10px] font-bold text-zinc-300">
                          {combo.badge}
                        </span>
                        <span className="text-[11px] font-semibold text-zinc-400">
                          {lang === 'af' ? combo.nameAf : combo.nameEn}
                        </span>
                      </div>

                      {/* Visual Preview Box */}
                      <div className="my-2 flex min-h-[110px] flex-col items-center justify-center rounded-xl bg-zinc-950/80 p-3 text-center border border-zinc-800/50">
                        {headWord && (
                          <div
                            style={{
                              fontFamily: headFace?.css,
                              fontWeight: headFace?.weight,
                              color: headWord.ink,
                              letterSpacing: `${(headWord.letterGap ?? 0) * 16}px`,
                              textShadow: headWord.extrude
                                ? `2px 2px 0 ${headWord.extrude.color}, 3px 3px 0 ${headWord.extrude.color}`
                                : headWord.stroke
                                  ? `0 0 2px ${headWord.stroke.color}`
                                  : 'none',
                            }}
                            className="text-lg sm:text-xl font-bold leading-tight uppercase line-clamp-1"
                          >
                            {lang === 'af' ? headWord.defaultAf : headWord.defaultEn}
                          </div>
                        )}
                        {subWord && (
                          <div
                            style={{
                              fontFamily: subFace?.css,
                              fontWeight: subFace?.weight,
                              color: subWord.ink,
                              letterSpacing: `${(subWord.letterGap ?? 0) * 14}px`,
                            }}
                            className="mt-1 text-xs text-zinc-300 line-clamp-1"
                          >
                            {lang === 'af' ? subWord.defaultAf : subWord.defaultEn}
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-[11px] leading-relaxed text-zinc-400 pb-3">
                        {lang === 'af' ? combo.descriptionAf : combo.descriptionEn}
                      </p>

                      {/* Add Button */}
                      <button
                        type="button"
                        onClick={() => {
                          onApplyCombo(combo);
                          onClose();
                        }}
                        className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 text-xs font-bold text-amber-200 hover:bg-amber-400 hover:text-black transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {t('combo.addToCanvas', 'Voeg by doek')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Effects & Apps Tab (Screenshots 1, 2, 4) ──────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Selector: Effects List */}
              <div className="md:col-span-5 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                  {t('combo.effectApps', 'Tipografiese Effekte (Toepassings)')}
                </span>

                {([
                  {
                    id: 'typestudio' as const,
                    icon: <Layers className="h-4 w-4 text-orange-400" />,
                    titleKey: 'combo.fxTypeStudio',
                    title: 'TypeStudio (Lae 3D)',
                    sub: 'Gestreepte veelkleurige 3D ekstrusie-blokke.',
                    pro: true,
                  },
                  {
                    id: 'typecraft' as const,
                    icon: <Wand2 className="h-4 w-4 text-yellow-400" />,
                    titleKey: 'combo.fxTypeCraft',
                    title: 'TypeCraft (Kurwe & Buig)',
                    sub: 'Geboë en vervormde strokiesprent borrel-teks.',
                    pro: true,
                  },
                  {
                    id: 'motiontext' as const,
                    icon: <Sparkles className="h-4 w-4 text-amber-300" />,
                    titleKey: 'combo.fxMotionText',
                    title: 'MotionText (Kinetiese Beweging)',
                    sub: 'Dinamiese perspektief met bewegings-strepe.',
                    pro: true,
                  },
                  {
                    id: 'extrude' as const,
                    icon: <Box className="h-4 w-4" />,
                    titleKey: 'combo.fxExtrude',
                    title: 'TypeExtrude (3D Ekstrusie)',
                    sub: '3D perspektief-skaduwee met rigting en diepte.',
                    pro: false,
                  },
                  {
                    id: 'lettering' as const,
                    icon: <Sticker className="h-4 w-4" />,
                    titleKey: 'combo.fxLettering',
                    title: 'TypeLettering (Plakker 3D)',
                    sub: 'Dik retro strokiesprent buitelyn met 3D pop.',
                    pro: false,
                  },
                  {
                    id: 'gradient' as const,
                    icon: <Palette className="h-4 w-4" />,
                    titleKey: 'combo.fxGradient',
                    title: 'TypeGradient (Kleurverloop)',
                    sub: 'Lewendige tweekleurige verloop oor die letters.',
                    pro: false,
                  },
                  {
                    id: 'cutout' as const,
                    icon: <Scissors className="h-4 w-4" />,
                    titleKey: 'combo.fxCutOut',
                    title: 'TypeCutOut (Knipmasker)',
                    sub: 'Letters sny ’n venster waardeur die foto wys.',
                    pro: false,
                  },
                  {
                    id: 'signature' as const,
                    icon: <PenTool className="h-4 w-4" />,
                    titleKey: 'combo.fxSignature',
                    title: 'Signature (Handtekening)',
                    sub: 'Outentieke kunstenaar en skepper-stempel.',
                    pro: false,
                  },
                ] as const).map((fx) => (
                  <button
                    key={fx.id}
                    type="button"
                    onClick={() => setSelectedEffect(fx.id)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                      selectedEffect === fx.id
                        ? 'border-amber-400 bg-amber-400/15 shadow-md'
                        : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                        selectedEffect === fx.id
                          ? 'bg-amber-400 text-black'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {fx.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-zinc-100 truncate">
                          {t(fx.titleKey, fx.title)}
                        </span>
                        {fx.pro && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300 border border-amber-400/30">
                            <Crown className="h-2.5 w-2.5 text-amber-400" />
                            PRO
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                        {fx.sub}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Right Panel: Live Preview & Customizer */}
              <div className="md:col-span-7 flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                    {t('combo.effectCustomize', 'Effek-Verstellings')}
                  </span>

                  {/* Visual Preview Box */}
                  <div className="my-3 flex min-h-[150px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-center overflow-hidden">
                    {selectedEffect === 'typestudio' && (
                      <div className="flex flex-col items-center justify-center py-2">
                        <div
                          style={{
                            color: studioColor1,
                            textShadow: `
                              2px 2px 0 ${studioColor1},
                              4px 4px 0 ${studioColor2},
                              6px 6px 0 ${studioColor2},
                              8px 8px 0 ${studioColor3},
                              10px 10px 0 ${studioColor3},
                              12px 14px 18px rgba(0,0,0,0.85)
                            `,
                          }}
                          className="text-3xl sm:text-4xl font-black uppercase tracking-wider font-mono select-none"
                        >
                          TYPESTUDIO
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-bold text-orange-300">
                          <Crown className="h-3 w-3 text-amber-400" />
                          {t('combo.studioLayers', '3D Lae-Palet')}
                        </div>
                      </div>
                    )}

                    {selectedEffect === 'typecraft' && (
                      <div className="flex flex-col items-center justify-center py-2">
                        <div
                          style={{
                            color: '#facc15',
                            textShadow: '0 3px 0 #ca8a04, 0 6px 0 #854d0e, 0 10px 20px rgba(0,0,0,0.7)',
                            transform: `scaleY(${craftStyle === 'bulge' ? 1.25 : craftStyle === 'pinch' ? 0.85 : 1}) rotate(${craftStyle === 'wave' ? 4 : 0}deg)`,
                          }}
                          className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-center select-none"
                        >
                          TYPE CRAFT
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[11px] font-bold text-purple-300">
                          <Crown className="h-3 w-3 text-amber-400" />
                          {craftStyle.toUpperCase()} · {craftCurve > 0 ? `+${craftCurve}` : craftCurve}°
                        </div>
                      </div>
                    )}

                    {selectedEffect === 'motiontext' && (
                      <div className="flex flex-col items-center justify-center py-2">
                        <div
                          style={{
                            color: '#ffffff',
                            textShadow: `
                              -2px 1px 0 #fbbf24,
                              -4px 2px 0 #f59e0b,
                              -6px 3px 0 #d97706,
                              -8px 4px 0 #b45309,
                              -12px 6px 14px rgba(0,0,0,0.8)
                            `,
                            transform: 'skewX(-12deg)',
                          }}
                          className="text-3xl sm:text-4xl font-black uppercase tracking-widest italic select-none"
                        >
                          MOTION
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-300">
                          <Crown className="h-3 w-3 text-amber-400" />
                          {motionPreset.toUpperCase()} · KINETIC TRAIL
                        </div>
                      </div>
                    )}

                    {selectedEffect === 'extrude' && (
                      <div
                        style={{
                          textShadow: Array.from({ length: extrudeDepth }, (_, i) => `${i + 1}px ${i + 1}px 0 ${extrudeColor}`).join(', '),
                        }}
                        className="text-3xl sm:text-4xl font-black text-amber-300 uppercase tracking-wide"
                      >
                        EXTRUDE 3D
                      </div>
                    )}
                    {selectedEffect === 'lettering' && (
                      <div
                        style={{
                          textShadow: `0 0 ${strokeWidth}px ${strokeColor}, 0 4px 8px rgba(0,0,0,0.8)`,
                        }}
                        className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider"
                      >
                        LETTERING
                      </div>
                    )}
                    {selectedEffect === 'gradient' && (
                      <div
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                        className="text-3xl sm:text-4xl font-black uppercase tracking-wide"
                      >
                        GRADIENT ART
                      </div>
                    )}
                    {selectedEffect === 'cutout' && (
                      <div className="relative rounded-xl border border-dashed border-zinc-700 bg-zinc-900 px-6 py-4">
                        <span className="text-2xl sm:text-3xl font-black text-zinc-400 line-through tracking-widest uppercase">
                          CUTOUT MASK
                        </span>
                        <div className="text-[11px] text-amber-300/80 mt-1">
                          {t('combo.cutoutHint', 'Die agtergrondfoto wys deur die letters.')}
                        </div>
                      </div>
                    )}
                    {selectedEffect === 'signature' && (
                      <div className="font-serif italic text-3xl sm:text-4xl text-purple-300">
                        {signatureName}
                      </div>
                    )}
                  </div>

                  {/* Form Controls */}
                  <div className="space-y-3 pt-2">
                    {selectedEffect === 'typestudio' && (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <label className="flex flex-col text-xs text-zinc-300 border border-zinc-800 rounded-xl p-2 bg-zinc-950">
                            <span className="text-[10px] text-zinc-400">Laag 1 (Bo)</span>
                            <input
                              type="color"
                              value={studioColor1}
                              onChange={(e) => setStudioColor1(e.target.value)}
                              className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-700 bg-transparent p-0.5"
                            />
                          </label>
                          <label className="flex flex-col text-xs text-zinc-300 border border-zinc-800 rounded-xl p-2 bg-zinc-950">
                            <span className="text-[10px] text-zinc-400">Laag 2 (Middel)</span>
                            <input
                              type="color"
                              value={studioColor2}
                              onChange={(e) => setStudioColor2(e.target.value)}
                              className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-700 bg-transparent p-0.5"
                            />
                          </label>
                          <label className="flex flex-col text-xs text-zinc-300 border border-zinc-800 rounded-xl p-2 bg-zinc-950">
                            <span className="text-[10px] text-zinc-400">Laag 3 (Basis)</span>
                            <input
                              type="color"
                              value={studioColor3}
                              onChange={(e) => setStudioColor3(e.target.value)}
                              className="mt-1 h-7 w-full cursor-pointer rounded border border-zinc-700 bg-transparent p-0.5"
                            />
                          </label>
                        </div>
                        <label className="block text-xs text-zinc-300">
                          <span className="flex justify-between font-semibold">
                            {t('combo.extrudeDepth', '3D Diepte')}
                            <span className="text-amber-400 font-mono">{extrudeDepth}px</span>
                          </span>
                          <input
                            type="range"
                            min={2}
                            max={16}
                            value={extrudeDepth}
                            onChange={(e) => setExtrudeDepth(Number(e.target.value))}
                            className="w-full mt-1.5"
                          />
                        </label>
                      </>
                    )}

                    {selectedEffect === 'typecraft' && (
                      <>
                        <label className="block text-xs text-zinc-300">
                          <span className="flex justify-between font-semibold">
                            {t('combo.craftCurvature', 'Kromming')}
                            <span className="text-amber-400 font-mono">{craftCurve}°</span>
                          </span>
                          <input
                            type="range"
                            min={-40}
                            max={40}
                            value={craftCurve}
                            onChange={(e) => setCraftCurve(Number(e.target.value))}
                            className="w-full mt-1.5"
                          />
                        </label>
                        <div>
                          <span className="block text-xs font-semibold text-zinc-300 pb-1.5">
                            {t('combo.craftStyle', 'Vervorm-Styl')}
                          </span>
                          <div className="grid grid-cols-4 gap-2">
                            {(['arch', 'wave', 'bulge', 'pinch'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setCraftStyle(st)}
                                className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold uppercase transition-all ${
                                  craftStyle === st
                                    ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {selectedEffect === 'motiontext' && (
                      <div>
                        <span className="block text-xs font-semibold text-zinc-300 pb-1.5">
                          {t('combo.motionPreset', 'Animasie-Styl')}
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {(['pop', 'typewriter', 'slide', 'wave', 'bounce'] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setMotionPreset(m)}
                              className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold uppercase transition-all ${
                                motionPreset === m
                                  ? 'border-amber-400 bg-amber-400/20 text-amber-200'
                                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedEffect === 'extrude' && (
                      <>
                        <label className="block text-xs text-zinc-300">
                          <span className="flex justify-between font-semibold">
                            {t('combo.extrudeDepth', '3D Diepte')}
                            <span className="text-amber-400 font-mono">{extrudeDepth}px</span>
                          </span>
                          <input
                            type="range"
                            min={1}
                            max={12}
                            value={extrudeDepth}
                            onChange={(e) => setExtrudeDepth(Number(e.target.value))}
                            className="w-full mt-1.5"
                          />
                        </label>
                        <label className="flex items-center justify-between text-xs text-zinc-300">
                          <span className="font-semibold">{t('combo.shadowColor', 'Skaduwee-Kleur')}</span>
                          <input
                            type="color"
                            value={extrudeColor}
                            onChange={(e) => setExtrudeColor(e.target.value)}
                            className="h-8 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent p-0.5"
                          />
                        </label>
                      </>
                    )}

                    {selectedEffect === 'lettering' && (
                      <>
                        <label className="block text-xs text-zinc-300">
                          <span className="flex justify-between font-semibold">
                            {t('combo.strokeWidth', 'Randdikte')}
                            <span className="text-amber-400 font-mono">{strokeWidth}px</span>
                          </span>
                          <input
                            type="range"
                            min={1}
                            max={8}
                            value={strokeWidth}
                            onChange={(e) => setStrokeWidth(Number(e.target.value))}
                            className="w-full mt-1.5"
                          />
                        </label>
                        <label className="flex items-center justify-between text-xs text-zinc-300">
                          <span className="font-semibold">{t('combo.strokeColor', 'Randkleur')}</span>
                          <input
                            type="color"
                            value={strokeColor}
                            onChange={(e) => setStrokeColor(e.target.value)}
                            className="h-8 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent p-0.5"
                          />
                        </label>
                      </>
                    )}

                    {selectedEffect === 'gradient' && (
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center justify-between text-xs text-zinc-300 border border-zinc-800 rounded-xl p-2.5 bg-zinc-950">
                          <span className="font-semibold">{t('combo.gradStart', 'Begin-Kleur')}</span>
                          <input
                            type="color"
                            value={gradientFrom}
                            onChange={(e) => setGradientFrom(e.target.value)}
                            className="h-8 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent p-0.5"
                          />
                        </label>
                        <label className="flex items-center justify-between text-xs text-zinc-300 border border-zinc-800 rounded-xl p-2.5 bg-zinc-950">
                          <span className="font-semibold">{t('combo.gradEnd', 'Eind-Kleur')}</span>
                          <input
                            type="color"
                            value={gradientTo}
                            onChange={(e) => setGradientTo(e.target.value)}
                            className="h-8 w-10 cursor-pointer rounded border border-zinc-700 bg-transparent p-0.5"
                          />
                        </label>
                      </div>
                    )}

                    {selectedEffect === 'signature' && (
                      <label className="block text-xs text-zinc-300">
                        <span className="font-semibold">{t('combo.signName', 'Kunstenaar / Skepper se Naam')}</span>
                        <input
                          type="text"
                          value={signatureName}
                          onChange={(e) => setSignatureName(e.target.value)}
                          placeholder="FutureBox Creator"
                          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  type="button"
                  onClick={() => {
                    onApplyEffect({
                      type: selectedEffect,
                      name: selectedEffect,
                      extrudeDepth,
                      extrudeColor,
                      strokeWidth,
                      strokeColor,
                      gradientFrom,
                      gradientTo,
                      signatureName,
                      studioLayers: [
                        { color: studioColor1, depth: Math.max(1, Math.round(extrudeDepth * 0.4)) },
                        { color: studioColor2, depth: Math.max(1, Math.round(extrudeDepth * 0.4)) },
                        { color: studioColor3, depth: Math.max(1, Math.round(extrudeDepth * 0.4)) },
                      ],
                      craftCurve,
                      craftStyle,
                      motionPreset,
                    });
                    onClose();
                  }}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-black hover:bg-amber-300 transition-colors shadow-lg"
                >
                  <Check className="h-4 w-4" />
                  {t('combo.applyEffectToText', 'Pas Effek Toe op Teks')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
