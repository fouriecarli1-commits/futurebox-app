'use client';

/**
 * Help with the words, next to the words.
 *
 * "Write the words" used to be its own screen. Writing the words *is* making a
 * song, so a second screen for it meant the same job behind a second button —
 * and worse, the lyrics you were helped with lived somewhere other than the
 * box you were going to generate from, so getting them across was a handoff
 * that could go wrong.
 *
 * What that screen could do and this keeps: write the next section, and point
 * at a line that is not working and say what to do about it. The style advice
 * it also had lives in `StyleFinder`, beside the style field, for the same
 * reason.
 */

import React, { useCallback, useState } from 'react';
import { Loader2, PenLine, Sparkles } from 'lucide-react';
import { useLang } from '../lib/i18n';

interface Idea {
  readonly label: string;
  readonly text: string;
  readonly why: string;
}

export default function LyricHelp({
  title,
  style,
  lyrics,
  onLyrics,
}: {
  title: string;
  style: string;
  lyrics: string;
  /** Replaces the lyric sheet. The caller decides what to do with the text. */
  onLyrics: (next: string) => void;
}): React.ReactElement {
  const { t } = useLang();
  const [mode, setMode] = useState<'continue' | 'polish' | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  const ask = useCallback(
    async (which: 'continue' | 'polish') => {
      setMode(which);
      setProblem(null);
      setIdeas([]);
      try {
        const response = await fetch('/api/songwriter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: which, title, style, lyrics }),
        });
        const data = (await response.json()) as { suggestions?: Idea[]; detail?: string; error?: string };
        if (response.ok && Array.isArray(data.suggestions)) {
          setIdeas(data.suggestions);
          return;
        }
        // Their reason, not a bucket. It is the only sentence that says what to
        // do next — no key configured, rate limited, the request was declined.
        setProblem(data.detail ?? data.error ?? 'That did not work.');
      } catch {
        setProblem('Could not reach the writing help.');
      } finally {
        setMode(null);
      }
    },
    [lyrics, style, title],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void ask('continue')}
          disabled={mode !== null}
          className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5 disabled:opacity-60"
        >
          {mode === 'continue' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
          {t('write.next', 'Write the next bit')}
        </button>
        <button
          type="button"
          onClick={() => void ask('polish')}
          disabled={mode !== null || !lyrics.trim()}
          className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1.5 disabled:opacity-60"
        >
          {mode === 'polish' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {t('write.fix', 'What is not working')}
        </button>
      </div>

      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

      {ideas.length > 0 && (
        <div className="space-y-2">
          {ideas.map((idea) => (
            <button
              type="button"
              key={idea.label}
              onClick={() => {
                // Added to the sheet rather than replacing it: a suggestion is
                // the next verse, not a rewrite of everything above it.
                const current = lyrics.trimEnd();
                onLyrics(current ? `${current}\n\n${idea.text}` : idea.text);
                setIdeas([]);
              }}
              className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 hover:border-emerald-500/50 transition-all"
            >
              <span className="block text-sm font-semibold text-emerald-300">{idea.label}</span>
              <span className="block text-sm text-zinc-300 leading-snug whitespace-pre-line">{idea.text}</span>
              <span className="block text-sm text-zinc-500 leading-snug pt-0.5">{idea.why}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
