'use client';

/**
 * "Pick for me" — the button that sits next to a field and fills it.
 *
 * One component, used beside every consequential choice in the app, for the
 * same reason `Cost` is one component: a thing phrased three ways on three
 * screens reads as three different systems.
 *
 * ── Where it goes ────────────────────────────────────────────────────────
 *
 * Beside the field it decides. Not in the copilot panel — the copilot is
 * excellent at "what should I do next" and wrong for "which of these six",
 * because using it means describing to it something already on the screen.
 *
 * ── What it shows afterwards ─────────────────────────────────────────────
 *
 * The reason, and it stays. A recommendation without a reason is a lottery
 * ticket: you take it on faith or ignore it, and neither teaches you anything
 * about your own work. Leaving the sentence on screen is also what lets
 * somebody disagree with it, which is the point — it is a suggestion, and the
 * field is still theirs.
 *
 * It clears when the person changes the field themselves, because at that
 * moment the sentence is about a choice that is no longer being made.
 */

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useLang } from '../lib/i18n';

export interface RecommendOption {
  id: string;
  label: string;
  /** One line on what this option is, for the model to choose on. */
  note?: string;
}

export default function Recommend({
  what,
  context,
  options,
  onPick,
  className = '',
}: {
  /** What is being chosen, in words: "a voice to read this". */
  what: string;
  /** The material the choice is about — the script, the brief, the song. */
  context?: string;
  options: RecommendOption[];
  /** Called with the chosen id. The field is set by the caller, not by this. */
  onPick: (id: string) => void;
  className?: string;
}): React.ReactElement | null {
  const { t, lang } = useLang();
  const [busy, setBusy] = useState(false);
  const [why, setWhy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // Nothing to choose between is not a failure, it is a field that does not
  // need this. It renders nothing rather than a button that cannot help.
  if (options.length < 2) return null;

  const ask = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ what, context, options, lang }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        id?: string;
        why?: string;
        message?: string;
      };
      if (!response.ok || !data.id) {
        setProblem(data.message ?? t('pick.failed', 'Could not pick one just now.'));
        return;
      }
      onPick(data.id);
      setWhy(data.why ?? null);
    } catch {
      setProblem(t('pick.failed', 'Could not pick one just now.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        onClick={() => void ask()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300 hover:text-emerald-200 disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {t('pick.forMe', 'Pick for me')}
      </button>
      {why && <span className="text-xs text-zinc-400 leading-relaxed max-w-md">{why}</span>}
      {problem && <span className="text-xs text-rose-300 leading-relaxed max-w-md">{problem}</span>}
    </span>
  );
}
