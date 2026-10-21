'use client';

/**
 * Verse-by-Verse Guided Songwriter Component
 *
 * Guides songwriters step-by-step through Verse 1, Chorus, Verse 2, Bridge, and Outro
 * with contextual pedagogical prompts and section-specific drafting assistance.
 *
 * ── A copilot for each part ──────────────────────────────────────────────
 *
 * The owner, 21 October 2026: *"By make a song se extensive gedeelte is daar
 * nie 'n copilot om die verse by verse te skryf nie."* There was a "Suggest
 * lines" button, and it pasted the same fixed four lines into every song,
 * with the song's topic dropped into the middle — which reads as help and is
 * not. Each part now has its own copilot (`/api/songwriter`, 'continue' with
 * the section): say what this part should do, and four options come back
 * written for THIS song — the words around it, what it is about, what the
 * part is for. Tap one to put it in, or to add it under what is there.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Lightbulb, Loader2, Plus, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { refusalText } from '../lib/apierror';
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

/** One option the copilot wrote for a part. */
interface Option {
  readonly label: string;
  readonly text: string;
  readonly why: string;
}

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
  /** Whether a model is behind the copilot on this deployment; null until asked. */
  const [copilotReady, setCopilotReady] = useState<boolean | null>(null);
  /** What the writer asked of each part, in their own words. */
  const [asks, setAsks] = useState<Record<string, string>>({});
  /** The four options that came back for each part. */
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  /** Every option already shown per part, so "More ideas" brings new ones. */
  const [seen, setSeen] = useState<Record<string, string[]>>({});
  const [problem, setProblem] = useState<Record<string, string>>({});

  useEffect(() => {
    let live = true;
    void fetch('/api/songwriter')
      .then((response) => (response.ok ? response.json() : null))
      .then((said) => { if (live) setCopilotReady(Boolean(said?.available)); })
      .catch(() => { if (live) setCopilotReady(false); });
    return () => { live = false; };
  }, []);

  /* The sheet as this writer last compiled it. Words that arrive from
     anywhere else — the other person in a shared room, the copilot in Easy —
     are read back into the parts; this writer's own typing is not re-read,
     which would move the cursor under the person typing. */
  const compiledRef = useRef('');

  // Parse existing lyrics into sections if present
  useEffect(() => {
    if (lyrics === compiledRef.current) return;
    compiledRef.current = lyrics;
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
      /* A heading is a line that is ONLY a heading — "[Chorus]", "Vers 2:" —
         never a sung line that happens to hold the word: "Koor van
         Pretoor" is a lyric, and reading it as a tag dropped it. */
      const heading = /^\[[^\]]+\]$/.test(line) || /^(verse|vers|chorus|koor|refrein|bridge|brug|outro|slot)\s*\d*\s*:?$/i.test(line);
      const lower = heading ? line.toLowerCase() : '';
      if (!heading && line) {
        parsedMap[currentTag]?.push(rawLine);
      } else if (lower.includes('verse 1') || lower.includes('vers 1')) {
        currentTag = 'verse1';
      } else if (lower.includes('chorus') || lower.includes('koor') || lower.includes('refrein')) {
        currentTag = 'chorus';
      } else if (lower.includes('verse 2') || lower.includes('vers 2')) {
        currentTag = 'verse2';
      } else if (lower.includes('bridge') || lower.includes('brug')) {
        currentTag = 'bridge';
      } else if (lower.includes('outro') || lower.includes('slot')) {
        currentTag = 'outro';
      } else if (lower.includes('vers')) {
        /* "[Verse]" with no number: the first one is verse 1, the next is 2. */
        currentTag = parsedMap.verse1.length ? 'verse2' : 'verse1';
      }
      /* Any other heading — [Intro], [Pre-Chorus] — starts no part here and
         is not a line to sing either, so it is left out. */
    }

    setSections((prev) =>
      prev.map((sec) => ({ ...sec, text: parsedMap[sec.id]?.join('\n') || '' })),
    );
  }, [lyrics]);

  // Sync sections to the full lyric sheet
  const updateSectionText = (id: string, text: string) => {
    const nextSections = sections.map((sec) => (sec.id === id ? { ...sec, text } : sec));
    setSections(nextSections);

    // Compile into markdown lyrics sheet
    const compiled = nextSections
      .filter((sec) => sec.text.trim())
      .map((sec) => `${isAf ? sec.tag : sec.tagEn}\n${sec.text.trim()}`)
      .join('\n\n');

    compiledRef.current = compiled;
    onLyricsChange(compiled);
  };

  /** Ask the copilot for four options for this part of the song. */
  const suggestForSection = async (section: SongSection, again = false): Promise<void> => {
    setSuggestingFor(section.id);
    setProblem((was) => ({ ...was, [section.id]: '' }));
    const shownBefore = again ? seen[section.id] ?? [] : [];
    try {
      const response = await fetch('/api/songwriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'continue',
          section: isAf ? section.titleAf : section.titleEn,
          purpose: isAf ? section.guideAf : section.guideEn,
          title: songTitle,
          style,
          about,
          ask: asks[section.id] ?? '',
          lyrics,
          seen: shownBefore.slice(-12),
        }),
      });
      const answer = (await response.json().catch(() => null)) as
        | { suggestions?: Option[]; error?: string; detail?: string; message?: string }
        | null;
      const came = (answer?.suggestions ?? []).filter((one) => typeof one?.text === 'string' && one.text.trim());
      if (!response.ok || !came.length) {
        setProblem((was) => ({
          ...was,
          [section.id]: refusalText(answer, lang, t('versewriter.failed', 'The copilot did not answer. Try again in a moment.')),
        }));
        return;
      }
      setOptions((was) => ({ ...was, [section.id]: came }));
      setSeen((was) => ({ ...was, [section.id]: [...shownBefore, ...came.map((one) => one.label || one.text.slice(0, 60))] }));
    } catch {
      setProblem((was) => ({ ...was, [section.id]: t('wand.offline', 'Could not reach the app’s server.') }));
    } finally {
      setSuggestingFor(null);
    }
  };

  /** Put an option in: in place of what is there, or under it. */
  const putOption = (section: SongSection, text: string, how: 'replace' | 'add'): void => {
    const lines = text.replace(/^\s*\[[^\]]*\]\s*\n?/, '').trim();
    const now = section.text.trim();
    updateSectionText(section.id, how === 'add' && now ? `${now}\n${lines}` : lines);
  };

  return (
    <div className="space-y-3.5" data-versewriter>
      {/* Header Info */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0" />
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
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold shrink-0">
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

                <div className="flex items-center gap-2 shrink-0">
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
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
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
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-hidden focus:border-emerald-500 leading-relaxed resize-y font-sans pr-11"
                    />
                    <SpeakButton onHeard={(said) => updateSectionText(sec.id, withSaid(sec.text, said))} className="absolute bottom-2 right-2" />
                  </span>

                  {/* ── The copilot for this part ─────────────────── */}
                  <div data-versecopilot={sec.id} className="space-y-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t('versewriter.copilot', 'Copilot for this part')}
                    </p>
                    {copilotReady === false ? (
                      <p className="text-xs text-zinc-400">
                        {t('versewriter.copilotOff', 'The copilot is not switched on here yet. Write the part yourself, or use Easy.')}
                      </p>
                    ) : (
                      <>
                        <span className="relative block">
                          <textarea
                            rows={2}
                            data-verseask={sec.id}
                            value={asks[sec.id] ?? ''}
                            onChange={(event) => setAsks((was) => ({ ...was, [sec.id]: event.target.value.slice(0, 500) }))}
                            placeholder={t('versewriter.askPlaceholder', 'What should this part say? (optional — e.g. "the moment she leaves the farm")')}
                            className="w-full resize-y rounded-xl border border-zinc-800 bg-black/50 px-3 py-2 pr-11 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-hidden"
                          />
                          <SpeakButton
                            onHeard={(said) => setAsks((was) => ({ ...was, [sec.id]: withSaid(was[sec.id] ?? '', said) }))}
                            className="absolute bottom-2 right-2"
                          />
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            data-verseaskgo={sec.id}
                            onClick={() => void suggestForSection(sec)}
                            disabled={suggestingFor !== null}
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-500/25 disabled:opacity-50"
                          >
                            {suggestingFor === sec.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                            {suggestingFor === sec.id
                              ? t('versewriter.suggesting', 'Writing…')
                              : t('versewriter.write', 'Write this part with the copilot')}
                          </button>
                          {(options[sec.id]?.length ?? 0) > 0 && (
                            <button
                              type="button"
                              data-versemore={sec.id}
                              onClick={() => void suggestForSection(sec, true)}
                              disabled={suggestingFor !== null}
                              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 px-3 text-xs font-semibold text-zinc-300 hover:text-white disabled:opacity-50"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              {t('versewriter.more', 'More ideas')}
                            </button>
                          )}
                          {hasContent && (
                            <button
                              type="button"
                              onClick={() => updateSectionText(sec.id, '')}
                              className="ml-auto min-h-[44px] px-2 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                            >
                              {t('versewriter.clear', 'Clear')}
                            </button>
                          )}
                        </div>
                        {problem[sec.id] && <p className="text-xs text-amber-300">{problem[sec.id]}</p>}
                        {(options[sec.id] ?? []).map((one, i) => (
                          <div key={`${sec.id}-${i}`} data-verseoption className="space-y-1.5 rounded-xl border border-zinc-800 bg-zinc-950/70 p-2.5">
                            {one.label && <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/90">{one.label}</p>}
                            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-100">{one.text.trim()}</p>
                            {one.why && <p className="text-xs text-zinc-500">{one.why}</p>}
                            <div className="flex flex-wrap gap-2 pt-0.5">
                              <button
                                type="button"
                                data-verseuse="replace"
                                onClick={() => putOption(sec, one.text, 'replace')}
                                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-bold text-onAccent"
                              >
                                <Check className="h-3.5 w-3.5" />
                                {hasContent ? t('versewriter.useReplace', 'Use this instead') : t('versewriter.use', 'Use this')}
                              </button>
                              {hasContent && (
                                <button
                                  type="button"
                                  data-verseuse="add"
                                  onClick={() => putOption(sec, one.text, 'add')}
                                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-xs font-semibold text-zinc-200"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  {t('versewriter.useAdd', 'Add under mine')}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
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
