'use client';

import { barClearance } from './TabBar';
import React, { useState } from 'react';
import {
  X, CalendarClock, Copy, Check, ExternalLink, Download,
  Layers, Megaphone, Sparkles, CheckCircle2
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { slug, tagged, scheduleRun, defaultMedium } from '../lib/adrun';
import { instantOf, schedule, today } from '../lib/queue';
import { useBackLayer } from '../lib/backstack';

export interface AdPayload {
  readonly headline: string;
  readonly body: string;
  readonly cta: string;
  readonly angle?: string;
  readonly spoken?: string;
  readonly shot?: string;
  readonly caption?: string;
  readonly hashtags?: readonly string[];
}

/** Slice text to max length cleanly without chopping words when possible. */
function trimChars(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

/** Build Google Ads headlines (max 30 chars each). */
function buildGoogleHeadlines(ad: AdPayload): string[] {
  const list: string[] = [];
  const addUnique = (str: string) => {
    const trimmed = trimChars(str, 30);
    if (trimmed && !list.includes(trimmed)) list.push(trimmed);
  };

  addUnique(ad.headline);
  if (ad.angle) addUnique(ad.angle);
  if (ad.cta) addUnique(ad.cta);
  if (ad.spoken) addUnique(ad.spoken);
  addUnique('Limited Offer');
  addUnique('Shop The Collection');

  return list.slice(0, 5);
}

/** Build Google Ads descriptions (max 90 chars each). */
function buildGoogleDescriptions(ad: AdPayload): string[] {
  const list: string[] = [];
  const addUnique = (str: string) => {
    const trimmed = trimChars(str, 90);
    if (trimmed && !list.includes(trimmed)) list.push(trimmed);
  };

  addUnique(ad.body);
  if (ad.spoken) addUnique(`${ad.spoken}. ${ad.cta}`);
  else if (ad.cta) addUnique(`${ad.headline}. ${ad.cta}`);

  return list.slice(0, 3);
}

export default function AdScheduleModal({
  ad,
  campaignName,
  initialLink = '',
  onClose,
  onScheduled,
}: {
  readonly ad: AdPayload;
  readonly campaignName: string;
  readonly initialLink?: string;
  readonly onClose: () => void;
  readonly onScheduled?: () => void;
}): React.ReactElement {
  const { t, lang } = useLang();
  /* Back closes it, as every overlay that covers the app does (`check:backlayers`). */
  useBackLayer(true, onClose);
  const [activeTab, setActiveTab] = useState<'google' | 'meta' | 'schedule'>('google');
  const [link, setLink] = useState(initialLink || 'https://');
  const [scheduledDate, setScheduledDate] = useState(today());
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'google_ads',
    'meta_ads',
    'tiktok',
    'instagram',
  ]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [scheduledSuccess, setScheduledSuccess] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const campaignSlug = slug(campaignName || ad.headline || 'campaign');

  const googleHeadlines = buildGoogleHeadlines(ad);
  const googleDescriptions = buildGoogleDescriptions(ad);

  const googleFinalUrl = link.trim() && link !== 'https://'
    ? tagged(link, { source: 'google_ads', medium: 'cpc', campaign: campaignSlug })
    : '';

  const metaFinalUrl = link.trim() && link !== 'https://'
    ? tagged(link, { source: 'meta_ads', medium: 'paid_social', campaign: campaignSlug })
    : '';

  const metaPrimaryText = trimChars(`${ad.body}\n\n${ad.cta}`, 280);
  const metaHeadline = trimChars(ad.headline, 40);

  const copy = async (key: string, text: string) => {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 1800);
  };

  const copyGoogleBundle = () => {
    const text = [
      `=== GOOGLE ADS CAMPAIGN ASSET PACK ===`,
      `Campaign: ${campaignName || ad.headline}`,
      `Final URL: ${googleFinalUrl || link}`,
      ``,
      `--- HEADLINES (Max 30 chars each) ---`,
      ...googleHeadlines.map((h, i) => `${i + 1}. [${h.length}/30] ${h}`),
      ``,
      `--- DESCRIPTIONS (Max 90 chars each) ---`,
      ...googleDescriptions.map((d, i) => `${i + 1}. [${d.length}/90] ${d}`),
      ``,
      `Call To Action: ${ad.cta}`,
    ].join('\n');
    void copy('google_bundle', text);
  };

  const copyMetaBundle = () => {
    const text = [
      `=== META ADS (FACEBOOK & INSTAGRAM) ASSET PACK ===`,
      `Campaign: ${campaignName || ad.headline}`,
      `Website URL: ${metaFinalUrl || link}`,
      `Headline (Max 40 chars): ${metaHeadline}`,
      `Call to Action: ${ad.cta}`,
      ``,
      `--- PRIMARY TEXT ---`,
      metaPrimaryText,
      ``,
      `Hashtags: ${(ad.hashtags ?? []).map((h) => `#${h}`).join(' ')}`,
    ].join('\n');
    void copy('meta_bundle', text);
  };

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((was) =>
      was.includes(p) ? was.filter((x) => x !== p) : [...was, p],
    );
  };

  const handleConfirmSchedule = async () => {
    setScheduling(true);
    try {
      // 1. Add to local AdRuns tracker
      scheduleRun({
        campaign: campaignName || ad.headline,
        headline: ad.headline,
        link: link.trim() && link !== 'https://' ? link : '',
        when: scheduledDate,
        platforms: selectedPlatforms,
      });

      // 2. Queue in server-side schedule if applicable
      const dueAt = instantOf(scheduledDate, scheduledTime);
      if (dueAt) {
        for (const plat of selectedPlatforms.slice(0, 4)) {
          const caption = plat === 'google_ads'
            ? `${ad.headline} | ${ad.cta}`
            : (ad.caption || ad.body);
          await schedule({ platform: plat, caption, dueAt }).catch(() => undefined);
        }
      }

      setScheduledSuccess(true);
      onScheduled?.();
      setTimeout(() => {
        onClose();
      }, 1600);
    } finally {
      setScheduling(false);
    }
  };

  const downloadCsv = () => {
    const rows = [
      ['Platform', 'Campaign Name', 'Headline', 'Description / Primary Text', 'Final URL', 'Call To Action', 'Scheduled Date'],
      [
        'Google Ads',
        `"${campaignName || ad.headline}"`,
        `"${googleHeadlines[0] || ''}"`,
        `"${googleDescriptions[0] || ''}"`,
        `"${googleFinalUrl || link}"`,
        `"${ad.cta}"`,
        scheduledDate,
      ],
      [
        'Meta Ads',
        `"${campaignName || ad.headline}"`,
        `"${metaHeadline}"`,
        `"${metaPrimaryText.replace(/\n/g, ' ')}"`,
        `"${metaFinalUrl || link}"`,
        `"${ad.cta}"`,
        scheduledDate,
      ],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodedUri);
    downloadAnchor.setAttribute('download', `futurebox-ads-${campaignSlug}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-scrim/80 backdrop-blur-xs animate-fadeIn" style={{ paddingBottom: barClearance(12) }}
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <h2 id="schedule-modal-title" className="text-base font-semibold text-zinc-100">
                {lang === 'af' ? 'Skeduleer advertensie' : 'Schedule Advert'}
              </h2>
              <p className="text-xs text-zinc-400">
                {lang === 'af'
                  ? 'Google Ads, Meta Ads Manager & Sosiale kanale'
                  : 'Google Ads, Meta Ads Manager & Social channels'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
            className="w-8 h-8 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Destination link bar */}
        <div className="px-5 py-2.5 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center gap-2">
          <label htmlFor="ad-dest-url" className="text-xs font-semibold text-zinc-400 whitespace-nowrap">
            {lang === 'af' ? 'Doel-URL:' : 'Landing Page:'}
          </label>
          <input
            id="ad-dest-url"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://yourstore.co.za/summer"
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-zinc-800 px-5 bg-zinc-900/20">
          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'google'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Google Ads
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('meta')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'meta'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            Meta Ads (FB & IG)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'schedule'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5 text-emerald-400" />
            {lang === 'af' ? 'Skedule & Tou' : 'Schedule & Queue'}
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300 space-y-1">
                  <p className="font-semibold text-blue-300">
                    {lang === 'af' ? 'Google Responsive Search & YouTube-advertensies' : 'Google Responsive Search & YouTube Video Ads'}
                  </p>
                  <p className="text-zinc-400 leading-relaxed">
                    {lang === 'af'
                      ? 'Geskik vir Google Search en YouTube. Opskrifte is gekort tot 30 karakters en beskrywings tot 90 karakters met outomatiese UTM-monitering.'
                      : 'Formatted for Google Search & YouTube campaigns. Headlines fit within 30 chars and descriptions within 90 chars with automatic UTM tracking.'}
                  </p>
                </div>
              </div>

              {/* Headlines list */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {lang === 'af' ? 'Opskrifte (maks 30 karakters)' : 'Headlines (max 30 characters)'}
                  </span>
                  <span className="text-[11px] text-zinc-500">{googleHeadlines.length} variants</span>
                </div>
                <div className="space-y-1.5">
                  {googleHeadlines.map((h, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5">
                      <span className="text-xs text-zinc-200 font-medium truncate flex-1">{h}</span>
                      <span className={`text-[10px] tabular-nums font-mono px-1.5 py-0.5 rounded ${h.length > 30 ? 'text-rose-400 bg-rose-950/40' : 'text-zinc-400 bg-zinc-800'}`}>
                        {h.length}/30
                      </span>
                      <button
                        type="button"
                        onClick={() => void copy(`gh-${i}`, h)}
                        aria-label="Copy headline"
                        className="text-zinc-400 hover:text-white p-1"
                      >
                        {copiedKey === `gh-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Descriptions list */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {lang === 'af' ? 'Beskrywings (maks 90 karakters)' : 'Descriptions (max 90 characters)'}
                  </span>
                  <span className="text-[11px] text-zinc-500">{googleDescriptions.length} variants</span>
                </div>
                <div className="space-y-1.5">
                  {googleDescriptions.map((d, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                      <p className="text-xs text-zinc-200 leading-snug flex-1">{d}</p>
                      <span className={`text-[10px] tabular-nums font-mono px-1.5 py-0.5 rounded shrink-0 ${d.length > 90 ? 'text-rose-400 bg-rose-950/40' : 'text-zinc-400 bg-zinc-800'}`}>
                        {d.length}/90
                      </span>
                      <button
                        type="button"
                        onClick={() => void copy(`gd-${i}`, d)}
                        aria-label="Copy description"
                        className="text-zinc-400 hover:text-white p-1 shrink-0"
                      >
                        {copiedKey === `gd-${i}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tagged final URL */}
              {googleFinalUrl && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-zinc-400">
                    {lang === 'af' ? 'Finale bestemmingskakel (met UTM-etikette):' : 'Final Tagged URL:'}
                  </span>
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-black/60 px-2.5 py-1.5">
                    <code className="text-xs text-blue-300 font-mono truncate flex-1">{googleFinalUrl}</code>
                    <button
                      type="button"
                      onClick={() => void copy('g_url', googleFinalUrl)}
                      aria-label="Copy tagged URL"
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      {copiedKey === 'g_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={copyGoogleBundle}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white hover:border-zinc-700 flex items-center gap-1.5"
                >
                  {copiedKey === 'google_bundle' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {lang === 'af' ? 'Kopieer Google Ads-pakket' : 'Copy Google Ads Asset Pack'}
                </button>
                <a
                  href="https://ads.google.com/aw/campaigns/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {lang === 'af' ? 'Maak Google Ads oop' : 'Launch Google Ads'}
                </a>
              </div>
            </div>
          )}

          {activeTab === 'meta' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 flex items-start gap-3">
                <Layers className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300 space-y-1">
                  <p className="font-semibold text-indigo-300">
                    {lang === 'af' ? 'Meta Ads Manager (Facebook & Instagram)' : 'Meta Ads Manager (Facebook & Instagram Ads)'}
                  </p>
                  <p className="text-zinc-400 leading-relaxed">
                    {lang === 'af'
                      ? 'Geformateer vir Instagram Reels, Stories en Facebook Feed met 9:16 en 1:1 plasing, primêre teks en aksieknoppie.'
                      : 'Formatted for Instagram Reels, Stories & Facebook Feed placements with primary copy, punchy headline, and UTM tracking.'}
                  </p>
                </div>
              </div>

              {/* Primary text */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {lang === 'af' ? 'Primêre teks' : 'Primary Text'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copy('m_primary', metaPrimaryText)}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedKey === 'm_primary' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy
                  </button>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-200 leading-relaxed whitespace-pre-line">
                  {metaPrimaryText}
                </div>
              </div>

              {/* Headline */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    {lang === 'af' ? 'Opskrif' : 'Headline'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">{metaHeadline.length}/40</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                  <span className="text-xs text-zinc-200 font-medium">{metaHeadline}</span>
                  <button
                    type="button"
                    onClick={() => void copy('m_headline', metaHeadline)}
                    className="text-zinc-400 hover:text-white p-1"
                  >
                    {copiedKey === 'm_headline' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Meta Final URL */}
              {metaFinalUrl && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-zinc-400">
                    {lang === 'af' ? 'Bestemmingskakel (Meta UTM):' : 'Destination URL (Meta UTM):'}
                  </span>
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-black/60 px-2.5 py-1.5">
                    <code className="text-xs text-indigo-300 font-mono truncate flex-1">{metaFinalUrl}</code>
                    <button
                      type="button"
                      onClick={() => void copy('m_url', metaFinalUrl)}
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      {copiedKey === 'm_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={copyMetaBundle}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white hover:border-zinc-700 flex items-center gap-1.5"
                >
                  {copiedKey === 'meta_bundle' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {lang === 'af' ? 'Kopieer Meta Ads-pakket' : 'Copy Meta Ads Pack'}
                </button>
                <a
                  href="https://adsmanager.facebook.com/adsmanager/manage/campaigns"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {lang === 'af' ? 'Maak Meta Ads Manager oop' : 'Launch Meta Ads Manager'}
                </a>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  {lang === 'af' ? 'Kies vrystellingsdatum & tyd' : 'Choose Launch Date & Time'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={scheduledDate}
                    min={today()}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-200 focus:outline-hidden focus:border-emerald-500"
                  />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-200 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Destination choices */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-zinc-300">
                  {lang === 'af' ? 'Bestemmings vir hierdie veldtog:' : 'Destinations for this campaign:'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'google_ads', name: 'Google Ads', paid: true },
                    { id: 'meta_ads', name: 'Meta Ads Manager', paid: true },
                    { id: 'tiktok', name: 'TikTok', paid: false },
                    { id: 'instagram', name: 'Instagram', paid: false },
                    { id: 'youtube', name: 'YouTube', paid: false },
                    { id: 'facebook', name: 'Facebook', paid: false },
                    { id: 'x', name: 'X', paid: false },
                    { id: 'web', name: 'Website', paid: false },
                  ].map((plat) => {
                    const active = selectedPlatforms.includes(plat.id);
                    return (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={() => togglePlatform(plat.id)}
                        className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs text-left font-medium transition-colors flex items-center justify-between ${
                          active
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <span className="truncate">{plat.name}</span>
                        {plat.paid && (
                          <span className="text-[9px] uppercase px-1 rounded bg-zinc-800 text-zinc-400">
                            Ad
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {scheduledSuccess && (
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {lang === 'af'
                      ? 'Suksesvol geskeduleer! Bygevoeg by Ad Runs en die tou.'
                      : 'Successfully scheduled! Added to Ad Runs and queue.'}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={scheduling || selectedPlatforms.length === 0}
                  onClick={() => void handleConfirmSchedule()}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-onAccent text-xs font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  <CalendarClock className="w-4 h-4" />
                  {lang === 'af' ? 'Voeg by Skedule & Ad Runs' : 'Confirm & Add to Ad Runs'}
                </button>
                <button
                  type="button"
                  onClick={downloadCsv}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  {lang === 'af' ? 'Laai veldtog-CSV af' : 'Download Campaign CSV'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
