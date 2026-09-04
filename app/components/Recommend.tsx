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
 * ── What it says before it is pressed ────────────────────────────────────
 *
 * What it is about to choose, and that it will say why.
 *
 * "Pick for me" on its own is two words above a grid of six cards, and there
 * is nothing in it that says which of the things on screen it means, whether
 * it costs anything, or whether pressing it is reversible. Somebody who does
 * not already know is being asked to press a button to find out what it does,
 * which is the one thing an interface should never ask.
 *
 * It costs nothing and changes one field. Both are worth a short sentence,
 * because "the app will do something for me" is exactly where people expect
 * to be charged.
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
  hint,
  className = '',
}: {
  /** What is being chosen, in words: "a voice to read this". */
  what: string;
  /** The material the choice is about — the script, the brief, the song. */
  context?: string;
  options: RecommendOption[];
  /** Called with the chosen id. The field is set by the caller, not by this. */
  onPick: (id: string) => void;
  /**
   * Overrides the sentence under the button.
   *
   * The default is built from `what` and is right nearly everywhere. A field
   * where the consequence is not obvious from its name can say its own.
   */
  hint?: string;
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
        /* A box, because it is a button.

           It was green text with a sparkle beside it, which reads as a link —
           and a link is a thing that takes you somewhere, not a thing that
           fills in the field you are looking at. It sits beside a field rather
           than in a row of actions, so the box is quiet: a border and no fill,
           at the same size as the chips it sits above. */
        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-2.5 py-1.5 text-sm font-semibold text-emerald-300 hover:text-emerald-200 hover:border-emerald-500/70 disabled:opacity-50 transition-colors"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {t('pick.forMe', 'Pick for me')}
      </button>
      {/* Before: what it will do. After: what it did and why.

          The two never show at once — once there is a reason on screen the
          explanation has been demonstrated, and leaving both would be the app
          talking about itself twice. */}
      {!why && !problem && (
        <span className="text-xs text-zinc-500 leading-relaxed max-w-md">
          {hint ??
            `${t('pick.hintA', 'Reads what you have written and chooses')} ${what}, ${t(
              'pick.hintB',
              'then says why. It costs nothing and you can change it after.',
            )}`}
        </span>
      )}
      {why && <span className="text-xs text-zinc-400 leading-relaxed max-w-md">{why}</span>}
      {problem && <span className="text-xs text-rose-300 leading-relaxed max-w-md">{problem}</span>}
    </span>
  );
}
