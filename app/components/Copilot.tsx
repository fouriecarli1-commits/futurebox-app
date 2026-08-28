'use client';

/**
 * The copilot panel.
 *
 * You talk to it, it answers, and — the part that matters — it can act on the
 * canvas beside it: name the song, set the style, write the words, make the
 * track, move you somewhere else.
 *
 * Two rules it enforces regardless of what the model replies:
 *   1. Nothing that costs money happens without you pressing yes. The approval
 *      card below is the only path to a paid generation.
 *   2. It never claims to have done something the studio did not do. Applying an
 *      action is what produces the "done" line, not the model saying so.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Loader2, Check, X } from 'lucide-react';
import { useLang } from '../lib/i18n';

export type CopilotAction =
  | { kind: 'none'; value: string }
  | { kind: 'set_title'; value: string }
  | { kind: 'set_style'; value: string }
  | { kind: 'set_lyrics'; value: string }
  | { kind: 'generate'; value: string }
  | { kind: 'go'; value: string };

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  /** Held back until you approve it. */
  pending?: CopilotAction;
}

export interface CopilotContext {
  title: string;
  style: string;
  lyrics: string;
  trackCount: number;
  engineReady: boolean;
}

/** What each action costs the person, in words rather than in credits. */
function costOf(action: CopilotAction, engineReady: boolean): string | null {
  if (action.kind !== 'generate') return null;
  return engineReady ? 'paid' : 'free';
}

export default function Copilot({
  context,
  onAction,
}: {
  context: CopilotContext;
  onAction: (action: CopilotAction) => void | Promise<void>;
}) {
  const { t } = useLang();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [turns, busy]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setDraft('');
    const asked: Turn[] = [...turns, { role: 'user', text: question }];
    setTurns(asked);
    setBusy(true);

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          ...context,
          history: turns.map((turn) => ({ role: turn.role, text: turn.text })),
        }),
      });

      if (response.status === 503) {
        setOffline(true);
        setTurns([...asked, { role: 'assistant', text: t('copilot.off') }]);
        return;
      }
      if (!response.ok) {
        // A gateway timeout answers with an HTML page, not JSON, so parsing it
        // gives nothing and the reason disappears. Falling back to the status
        // keeps "it took too long" distinguishable from "it was refused".
        const detail = (await response.json().catch(() => ({}))) as { message?: string };
        const because =
          response.status === 504 || response.status === 408
            ? t('copilot.slow')
            : (detail.message ?? `${t('copilot.failed')} (${response.status})`);
        setTurns([...asked, { role: 'assistant', text: because }]);
        return;
      }

      const data = (await response.json()) as { reply: string; action: CopilotAction };
      const action = data.action ?? { kind: 'none', value: '' };

      // A paid generation waits for a yes. Everything else is reversible, so it
      // happens straight away and the canvas shows the result.
      if (costOf(action, context.engineReady) === 'paid') {
        setTurns([...asked, { role: 'assistant', text: data.reply, pending: action }]);
        return;
      }

      setTurns([...asked, { role: 'assistant', text: data.reply }]);
      if (action.kind !== 'none') await onAction(action);
    } catch {
      setTurns([...asked, { role: 'assistant', text: t('copilot.failed') }]);
    } finally {
      setBusy(false);
    }
  };

  const approve = async (index: number) => {
    const turn = turns[index];
    if (!turn?.pending) return;
    const action = turn.pending;
    setTurns(turns.map((item, i) => (i === index ? { ...item, pending: undefined } : item)));
    await onAction(action);
  };

  const decline = (index: number) => {
    setTurns(turns.map((item, i) => (i === index ? { ...item, pending: undefined } : item)));
  };

  return (
    <div className="flex flex-col h-full min-h-0 rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <p className="text-sm font-bold text-white">{t('copilot.title')}</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {turns.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400 leading-relaxed">{t('copilot.intro')}</p>
            <div className="flex flex-col gap-1.5">
              {[t('copilot.eg1'), t('copilot.eg2'), t('copilot.eg3')].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => send(example)}
                  className="text-left text-sm text-zinc-300 bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2 hover:border-emerald-500/60 hover:text-white transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, index) => (
          <div key={index} className="space-y-2">
            <div
              className={`text-sm leading-relaxed rounded-xl px-3 py-2 ${
                turn.role === 'user'
                  ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-100 ml-6'
                  : 'bg-zinc-950/60 border border-zinc-800 text-zinc-200 mr-6'
              }`}
            >
              {turn.text}
            </div>

            {turn.pending && (
              <div className="mr-6 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 space-y-2">
                <p className="text-sm text-amber-200 leading-relaxed">{t('copilot.costs')}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => approve(index)}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-500 text-onAccent flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t('copilot.yes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => decline(index)}
                    className="px-3 py-1.5 rounded-lg text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t('copilot.no')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-zinc-500 mr-6">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t('copilot.thinking')}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex-shrink-0 p-3 border-t border-zinc-800 flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={offline ? t('copilot.offPlaceholder') : t('copilot.placeholder')}
          disabled={offline}
          className="flex-1 min-w-0 bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || offline || !draft.trim()}
          aria-label={t('copilot.send')}
          className="px-3 rounded-xl bg-emerald-500 text-onAccent disabled:opacity-40 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
