'use client';

/**
 * Barcode & QR Code Generator modal for FutureBox Studio.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli: *"Die Photo editor moet ook 'n QR Code generator hê, en verskillende
 * templates om dit in te sit. En allerhande searchable graphics, animations, audio.
 * O ja, alles wat jy doen, moet jy in beide doen, in die enegelse blad, en
 * afrikaans vir die afrikaanse blad."*
 *
 * ── Features ─────────────────────────────────────────────────────────────
 *
 *   · QR Code with 19 diverse templates & frames matching Screenshot 2:
 *     Scan Here card, Scan Me box, Doodle arrow, Camera finder, Hand holding
 *     phone, Smartphone frame, Neon cyberpunk, Circle badge, Security shield,
 *     Retro terminal bot, Hybrid barcode, etc.
 *   · Visual template gallery with gold crown badges.
 *   · 1D Barcodes (Code 128, EAN-13, UPC-A) for album/merch packaging.
 *   · Real-time interactive preview.
 *   · Custom foreground & transparent/coloured backgrounds.
 *   · One-click "Insert onto Canvas" or direct download.
 */

import React, { useMemo, useState } from 'react';
import {
  QrCode, Barcode, Check, Copy, Download, Plus, X, Sparkles, Crown,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import {
  generateBarcodeDataUrl,
  QR_TEMPLATES,
  type BarcodeType,
  type QrTemplateId,
  type QrTemplateMeta,
} from '../lib/barcode';

export default function BarcodeGeneratorModal({
  onInsert,
  onClose,
}: {
  readonly onInsert: (dataUrl: string, title: string) => void;
  readonly onClose: () => void;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [type, setType] = useState<BarcodeType>('qr');
  const [template, setTemplate] = useState<QrTemplateId>('plain');
  const [data, setData] = useState('https://futurebox.app');
  const [color, setColor] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [copied, setCopied] = useState(false);

  const previewUrl = useMemo(() => {
    return generateBarcodeDataUrl({
      type,
      data: data.trim() || '123456789',
      color,
      background: bg,
      includeText: true,
      template,
    });
  }, [type, data, color, bg, template]);

  // Generate thumbnail preview URLs for the template picker
  const templatePreviews = useMemo(() => {
    if (type !== 'qr') return {};
    const map: Record<string, string> = {};
    for (const tpl of QR_TEMPLATES) {
      map[tpl.id] = generateBarcodeDataUrl({
        type: 'qr',
        data: 'https://futurebox.app',
        color: '#000000',
        background: '#ffffff',
        template: tpl.id,
      });
    }
    return map;
  }, [type]);

  const copyImage = async (): Promise<void> => {
    if (!previewUrl) return;
    try {
      const res = await fetch(previewUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await navigator.clipboard.writeText(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInsert = (): void => {
    if (!previewUrl) return;
    const label = type === 'qr' ? 'QR-Code' : 'Barcode';
    onInsert(previewUrl, label);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('barcode.title', 'QR-kode & Strepieskode Skepper')}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md"
    >
      <div className="relative flex h-full max-h-[92dvh] w-full max-w-2xl flex-col rounded-3xl border border-zinc-700/80 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-zinc-800/80 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
              {type === 'qr' ? <QrCode className="h-5 w-5" /> : <Barcode className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-zinc-100">
                {t('barcode.title', 'QR-kode & Strepieskode Skepper')}
              </h3>
              <p className="text-xs text-zinc-400">
                {t('barcode.sub', 'Skep stylvolle QR-kodes met rame en templates vir jou ontwerp.')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('barcode.close', 'Maak toe')}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              {t('barcode.typeLabel', 'Tipe Kode')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setType('qr'); if (!data.startsWith('http')) setData('https://futurebox.app'); }}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition-all ${
                  type === 'qr'
                    ? 'border border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-sm'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <QrCode className="h-4 w-4" />
                {t('barcode.qrOption', 'QR-Kode (Skakels, Rame & Templates)')}
              </button>
              <button
                type="button"
                onClick={() => { setType('code128'); if (data.startsWith('http')) setData('123456789'); }}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition-all ${
                  type === 'code128'
                    ? 'border border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-sm'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Barcode className="h-4 w-4" />
                {t('barcode.code128Option', 'Strepieskode (Kode 128 / Goedere)')}
              </button>
            </div>
          </div>

          {/* Data input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              {t('barcode.dataLabel', 'Skakel of Inhoud')}
            </label>
            <input
              type="text"
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder={type === 'qr' ? 'https://open.spotify.com/artist/...' : '1234567890'}
              className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
            {/* Quick presets */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setData('https://open.spotify.com')}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200"
              >
                🎵 Spotify
              </button>
              <button
                type="button"
                onClick={() => setData('https://instagram.com')}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200"
              >
                📸 Instagram
              </button>
              <button
                type="button"
                onClick={() => setData('https://wa.me')}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200"
              >
                💬 WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setData('https://futurebox.app/tickets')}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200"
              >
                🎟️ {t('barcode.ticketsPreset', 'Kaartjies')}
              </button>
            </div>
          </div>

          {/* QR Code Templates Gallery (Matching Screenshot 2) */}
          {type === 'qr' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  {t('barcode.templatesLabel', 'Kies ’n QR-Raam / Template')}
                </label>
                <span className="text-[11px] font-semibold text-emerald-400">
                  {QR_TEMPLATES.length} {t('barcode.templatesAvailable', 'rame beskikbaar')}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1 rounded-2xl border border-zinc-800/80 bg-zinc-900/40">
                {QR_TEMPLATES.map((tpl: QrTemplateMeta) => {
                  const isSelected = template === tpl.id;
                  const thumb = templatePreviews[tpl.id];
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTemplate(tpl.id)}
                      className={`relative flex flex-col items-center justify-between rounded-xl border p-2 transition-all group ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-500/20 shadow-md ring-1 ring-emerald-400/50'
                          : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700 hover:bg-zinc-900'
                      }`}
                    >
                      {/* Crown badge */}
                      {tpl.hasCrown && (
                        <div className="absolute top-1.5 right-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-md bg-amber-500 text-zinc-950 shadow-sm">
                          <Crown className="h-2.5 w-2.5 stroke-[2.5]" />
                        </div>
                      )}
                      <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-zinc-950/60 p-1">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb}
                            alt={lang === 'af' ? tpl.nameAf : tpl.nameEn}
                            className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <QrCode className="h-8 w-8 text-zinc-600" />
                        )}
                      </div>
                      <span className="mt-1.5 text-[10px] font-bold text-zinc-300 text-center line-clamp-1">
                        {lang === 'af' ? tpl.nameAf : tpl.nameEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color controls */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                {t('barcode.fgColor', 'Voorgrondkleur')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-1"
                />
                <span className="text-xs font-mono text-zinc-300">{color}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                {t('barcode.bgColor', 'Agtergrond')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bg === 'transparent' ? '#ffffff' : bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 p-1"
                />
                <button
                  type="button"
                  onClick={() => setBg((cur) => (cur === 'transparent' ? '#ffffff' : 'transparent'))}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                    bg === 'transparent'
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t('barcode.clear', 'Deursigtig')}
                </button>
              </div>
            </div>
          </div>

          {/* Live Visual Preview */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 min-h-[180px]">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Barcode Preview"
                className="max-h-[220px] max-w-full rounded-xl object-contain shadow-xl"
              />
            ) : (
              <p className="text-xs text-zinc-500">{t('barcode.empty', 'Voer skakel of data in om te genereer.')}</p>
            )}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-950">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void copyImage()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? t('barcode.copied', 'Gekopieer!') : t('barcode.copy', 'Kopieer')}
            </button>
            <a
              href={previewUrl}
              download={`${type}-${Date.now()}.png`}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 text-xs font-bold text-zinc-300 hover:bg-zinc-800"
            >
              <Download className="h-4 w-4" />
              {t('barcode.download', 'Stoor PNG')}
            </a>
          </div>

          <button
            type="button"
            onClick={handleInsert}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-black text-black hover:bg-emerald-400 shadow-lg active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            {t('barcode.insert', 'Plaas op Doek')}
          </button>
        </div>
      </div>
    </div>
  );
}
