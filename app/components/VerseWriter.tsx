'use client';

/**
 * Verse-by-Verse Guided Songwriter Component
 *
 * Guides songwriters step-by-step through Verse 1, Chorus, Verse 2, Bridge, and Outro
 * with contextual pedagogical prompts and section-specific drafting assistance.
 */

import React, { useEffect, useState } from 'react';
import { AlignLeft, Check, ChevronDown, ChevronUp, FileText, Lightbulb, Sparkles, Wand2 } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { withSaid } from '../lib/speak';
import SpeakButton from './SpeakButton';

export interface SongSection {
  readonly id: string;
  readonly tag: string;
  readonly tagEn: string;
  readonly titleAf: string;
  readonly titleEn: string;
  readonly guideAf: string;
  readonly guideEn: string;
  text: string;
}

const DEFAULT_SECTIONS: readonly Omit<SongSection, 'text'>[] = [
  {
    id: 'verse1',
    tag: '[Vers 1]',
    tagEn: '[Verse 1]',
    titleAf: 'Vers 1: Die Storie Begin',
    titleEn: 'Verse 1: Setting the Scene',
    guideAf: 'Stel die karakters, plek en atmosfeer bekend. Gee die luisteraar ’n rede om om te gee.',
    guideEn: 'Introduce the characters, setting and feeling. Draw the listener into the world.',
  },
  {
    id: 'chorus',
    tag: '[Koor]',
    tagEn: '[Chorus]',
    titleAf: 'Koor: Die Emosionele Hoogtepunt',
    titleEn: 'Chorus: The Emotional Core',
    guideAf: 'Die mees aansteeklike, herhalende melodie. Dit sê die hoof-boodskap van die hele liedjie.',
    guideEn: 'The catchy, repeatable anthem. Sums up the core message and emotional thesis.',
  },
  {
    id: 'verse2',
    tag: '[Vers 2]',
    tagEn: '[Verse 2]',
    titleAf: 'Vers 2: Die Storie Verdiep',
    titleEn: 'Verse 2: Deepening the Narrative',
    guideAf: 'Bou voort op vers 1. Bring nuwe besonderhede, emosie of spanning na vore voor die koor terugkeer.',
    guideEn: 'Build on verse 1. Bring new details, conflict or emotional depth before the chorus returns.',
  },
  {
    id: 'bridge',
    tag: '[Brug]',
    tagEn: '[Bridge]',
    titleAf: 'Brug: ’n Vars Perspektief',
    titleEn: 'Bridge: Fresh Perspective & Lift',
    guideAf: '’n Nuwe melodie, ander tempo of verrassende wending wat spanning bou voor die laaste klimaks.',
    guideEn: 'A musical lift or unexpected lyric shift building tension before the final explosive chorus.',
  },
  {
    id: 'outro',
    tag: '[Slot]',
    tagEn: '[Outro]',
    titleAf: 'Slot: Finale Weerklank',
    titleEn: 'Outro: Final Refrain & Fade',
    guideAf: 'Laaste herhalende reël of sagte uit-vervaag wat in die luisteraar se kop bly draai.',
    guideEn: 'Final echoing refrain, fading thought or strong resolution that stays in the head.',
  },
] as const;

interface VerseWriterProps {
  readonly lyrics: string;
  readonly onLyricsChange: (updated: string) => void;
  readonly songTitle: string;
  readonly about: string;
  readonly style: string;
}

export default function VerseWriter({
  lyrics,
  onLyricsChange,
  songTitle,
  about,
  style,
}: VerseWriterProps): React.ReactElement {
  const { t, lang } = useLang();
  const isAf = lang === 'af';

  // State holding sections
  const [sections, setSections] = useState<SongSection[]>(() => {
    return DEFAULT_SECTIONS.map((sec) => ({
      ...sec,
      text: '',
    }));
  });

  const [activeId, setActiveId] = useState<string>('verse1');
  const [suggestingFor, setSuggestingFor] = useState<string | null>(null);

  // Parse existing lyrics into sections if present
  useEffect(() => {
    if (!lyrics.trim()) return;
    // Simple parser checking for tags
    const lines = lyrics.split('\n');
    let currentTag = 'verse1';
    const parsedMap: Record<string, string[]> = {
      verse1: [],
      chorus: [],
      verse2: [],
      bridge: [],
      outro: [],
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const lower = line.toLowerCase();
      if (lower.includes('verse 1') || lower.includes('vers 1')) {
        currentTag = 'verse1';
      } else if (lower.includes('chorus') || lower.includes('koor')) {
        currentTag = 'chorus';
      } else if (lower.includes('verse 2') || lower.includes('vers 2')) {
        currentTag = 'verse2';
      } else if (lower.includes('bridge') || lower.includes('brug')) {
        currentTag = 'bridge';
      } else if (lower.includes('outro') || lower.includes('slot')) {
        currentTag = 'outro';
      } else if (line) {
        parsedMap[currentTag]?.push(rawLine);
      }
    }

    setSections((prev) =>
      prev.map((sec) => {
        const found = parsedMap[sec.id]?.join('\n') || '';
        return found ? { ...sec, text: found } : sec;
      }),
    );
  }, []);

  // Sync sections to the full lyric sheet
  const updateSectionText = (id: string, text: string) => {
    const nextSections = sections.map((sec) => (sec.id === id ? { ...sec, text } : sec));
    setSections(nextSections);

    // Compile into markdown lyrics sheet
    const compiled = nextSections
      .filter((sec) => sec.text.trim())
      .map((sec) => `${isAf ? sec.tag : sec.tagEn}\n${sec.text.trim()}`)
      .join('\n\n');

    onLyricsChange(compiled);
  };

  const suggestForSection = (section: SongSection) => {
    setSuggestingFor(section.id);
    const theme = (about || songTitle || (isAf ? 'lewe en liefde' : 'life and rhythm')).trim();

    // Section-specific templates that feel authentic
    let generated = '';
    if (section.id === 'verse1') {
      generated = isAf
        ? `Die son sak stadig oor die horison\nEk loop weer met my gedagtes oor ${theme}\nElke tree vat my nader aan die waarheid\nEn die stilte praat harder as voorheen`
        : `Shadows stretching down this empty street\nThinking back on ${theme} and what it means\nEvery step falls right on the groove\nNothing left for me to prove`;
    } else if (section.id === 'chorus') {
      generated = isAf
        ? `En dit voel soos die heel eerste keer!\nJa, ons sing dit uit tot die sterre breek\nGeen twyfel meer in my hart vanaand\nOns hou styf vas aan ${theme}`
        : `And it feels like the sparks taking flight!\nYeah we’re singing it loud in the neon light\nNothing can tear down this feeling now\nWe’re holding onto ${theme}`;
    } else if (section.id === 'verse2') {
      generated = isAf
        ? `Die nag tel die spore wat ons agterlaat\nNiks sal ooit weer dieselfde wees nie\nOns het geleer om deur die storm te kyk\nEn die vrees het vlerke gekry`
        : `The night carries echoes of where we have been\nA brand new chapter starting right within\nWe learned to run straight through the rain\nAnd wash away the yesterday pain`;
    } else if (section.id === 'bridge') {
      generated = isAf
        ? `En as die musiek vir ’n oomblik stop\nKlop die ritme steeds diep in my bors\nOns kyk mekaar in die oë en weet\nDis ons tyd, ons oomblik`
        : `And when the music suddenly drops down low\nThere’s only one direction left to go\nLook in my eyes, can you hear the sound?\nWe’re never touching back down`;
    } else {
      generated = isAf
        ? `Ja, hou vas aan vanaand…\nTot die son weer opkom\nNet jy en ek en die melodie.`
        : `Yeah hold on till the morning light…\nJust the music and you and I\nFading out into the sky.`;
    }

    setTimeout(() => {
      const merged = section.text.trim()
        ? `${section.text.trim()}\n${generated}`
        : generated;
      updateSectionText(section.id, merged);
      setSuggestingFor(null);
    }, 300);
  };

  return (
    <div className="space-y-3.5" data-versewriter>
      {/* Header Info */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-zinc-300">
            {t(
              'versewriter.guideIntro',
              'Guided songwriting: Write your song section-by-section with tailored guidance for each verse.',
            )}
          </p>
        </div>
      </div>

      {/* Sections Accordion */}
      <div className="space-y-2.5">
        {sections.map((sec) => {
          const isOpen = activeId === sec.id;
          const hasContent = sec.text.trim().length > 0;
          const lineCount = sec.text.trim().split('\n').filter(Boolean).length;

          return (
            <div
              key={sec.id}
              className={`rounded-2xl border transition-all ${
                isOpen
                  ? 'bg-zinc-950 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              {/* Accordion Trigger */}
              <button
                type="button"
                onClick={() => setActiveId(isOpen ? '' : sec.id)}
                className="w-full flex items-center justify-between p-3.5 text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex-shrink-0">
                    {isAf ? sec.tag : sec.tagEn}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {isAf ? sec.titleAf : sec.titleEn}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {isAf ? sec.guideAf : sec.guideEn}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasContent && (
                    <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md font-mono">
                      {lineCount} {lineCount === 1 ? t('versewriter.line', 'line') : t('versewriter.lines', 'lines')}
                    </span>
                  )}
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              </button>

              {/* Accordion Content */}
              {isOpen && (
                <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-zinc-800/60">
                  {/* Guide banner */}
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-start gap-2 text-xs text-zinc-300 leading-relaxed">
                    <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">
                        {t('versewriter.purpose', 'Purpose of this part:')}{' '}
                      </span>
                      <span>{isAf ? sec.guideAf : sec.guideEn}</span>
                    </div>
                  </div>

                  {/* Input area */}
                  <span className="relative block">
                    <textarea
                      rows={4}
                      value={sec.text}
                      onChange={(e) => updateSectionText(sec.id, e.target.value)}
                      placeholder={
                        isAf
                          ? `Skryf ${sec.tag} hier... (bv. 2 tot 4 reëls)`
                          : `Write ${sec.tagEn} here... (e.g. 2 to 4 lines)`
                      }
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 leading-relaxed resize-y font-sans pr-11"
                    />
                    <SpeakButton onHeard={(said) => updateSectionText(sec.id, withSaid(sec.text, said))} className="absolute bottom-2 right-2" />
                  </span>

                  {/* Quick actions for this section */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => suggestForSection(sec)}
                      disabled={suggestingFor === sec.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>
                        {suggestingFor === sec.id
                          ? t('versewriter.suggesting', 'Crafting lines…')
                          : t('versewriter.suggestBtn', 'Suggest lines for this section')}
                      </span>
                    </button>

                    {hasContent && (
                      <button
                        type="button"
                        onClick={() => updateSectionText(sec.id, '')}
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {t('versewriter.clear', 'Clear')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
