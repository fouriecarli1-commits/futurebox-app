'use client';

/**
 * Suggestions under a prompt, and the small round button that deals new
 * ones (`lib/promptideas.ts`). Tapping an idea puts it in the prompt to be
 * changed; the round button turns once and the next handful comes in, none
 * repeated until the whole pool has been seen. No credits, nothing sent.
 */
import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { ideaSaid, ideasAt, type PromptIdea } from '../lib/promptideas';

export default function IdeaChips({
  pool,
  count = 3,
  onPick,
  glow = '#34D399',
  t,
}: {
  readonly pool: readonly PromptIdea[];
  /** How many are shown at a time. */
  readonly count?: number;
  readonly onPick: (words: string) => void;
  /** The room's own light, for the edge and the button. */
  readonly glow?: string;
  readonly t: (key: string, fallback: string) => string;
}): React.ReactElement {
  const { lang } = useLang();
  const [round, setRound] = useState(0);
  const [turns, setTurns] = useState(0);
  const shown = ideasAt(pool, count, round);
  const more = pool.length > count;

  return (
    <div data-ideachips className="flex items-start gap-2">
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
        {shown.map((idea) => {
          const words = ideaSaid(idea, lang);
          return (
            <button
              key={idea[0]}
              type="button"
              data-ideachip
              onClick={() => onPick(words)}
              className="min-h-[40px] max-w-full rounded-2xl px-3 py-1.5 text-left text-[12px] font-semibold leading-snug transition-transform active:scale-95"
              style={{
                color: '#ECFEFF',
                background: `linear-gradient(135deg, ${glow}26, rgba(10,12,16,0.5))`,
                border: `1px solid ${glow}80`,
                boxShadow: `0 0 12px ${glow}33`,
                textShadow: `0 0 8px ${glow}66`,
              }}
            >
              {words}
            </button>
          );
        })}
      </div>
      {more && (
        <button
          type="button"
          data-idearefresh
          onClick={() => { setRound((at) => at + 1); setTurns((at) => at + 1); }}
          aria-label={t('ideas.more', 'New ideas')}
          title={t('ideas.more', 'New ideas')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${glow}55, rgba(10,12,16,0.85) 70%)`,
            border: `1.5px solid ${glow}`,
            boxShadow: `0 0 14px ${glow}88, inset 0 0 8px ${glow}55`,
          }}
        >
          <RefreshCw
            className="h-5 w-5"
            style={{
              color: glow,
              filter: `drop-shadow(0 0 5px ${glow})`,
              transform: `rotate(${turns * 360}deg)`,
              transition: 'transform 0.55s cubic-bezier(0.3, 1.4, 0.5, 1)',
            }}
          />
        </button>
      )}
    </div>
  );
}
