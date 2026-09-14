'use client';

/**
 * Ask the copilot what to change about the mix, and see it before it happens.
 *
 * Carli, 14 September 2026: *"AI icon (Copilot pop op en vra dat persoon 'n
 * mixing voorstel en copilot kan die mixing verander volgens die vraag en
 * voorstel)"*
 *
 * ── The shape of it ─────────────────────────────────────────────────────
 *
 * A box to say what is wrong, an answer, and the changes it proposes as a
 * list with an Apply button. Nothing moves until that button is pressed, and
 * each change can be dropped from the list first.
 *
 * That is not caution for its own sake. A mix is somebody's taste, and an
 * assistant that quietly moved eight faders while they were listening would
 * be indistinguishable from a bug — they would hear something change, not
 * know what, and have no way back. She asked for a copilot that *can* change
 * the mix; being able to and doing it unasked are different things, and the
 * first is what makes the second safe to offer.
 *
 * ── What it can and cannot do, said on the screen ───────────────────────
 *
 * It does not hear the audio. It reads the desk — the names, the faders, the
 * positions, which effects are on, and the measured peak and average if the
 * room has measured them — and acts on what it is told is wrong. Sending the
 * mix to a model to listen to is a different and much more expensive
 * product, and advice that sounds specific but is invented is worse than
 * none. So the panel says so, above the box, rather than letting somebody
 * find out by getting a confident answer about a cymbal.
 */

import React, { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { useLang } from '../lib/i18n';
import { sayMove, type LaneNow, type Move } from '../lib/mixplan';

const INK = '#eef2ff';
const INK_DIM = 'rgba(238,242,255,0.5)';
const LIT = '#38bdf8';

export default function BoothAsk({
  lanes,
  reading,
  onApply,
}: {
  readonly lanes: readonly LaneNow[];
  /** The master's measured peak and average, where the room has measured. */
  readonly reading?: string;
  readonly onApply: (moves: readonly Move[]) => void;
}): React.ReactElement {
  const { t } = useLang();
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [reply, setReply] = useState('');
  const [moves, setMoves] = useState<Move[]>([]);
  const [dropped, setDropped] = useState<Set<string>>(new Set());
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState(false);

  const ask = async (): Promise<void> => {
    setAsking(true);
    setProblem('');
    setReply('');
    setMoves([]);
    setDropped(new Set());
    setDone(false);
    try {
      const token = await accessToken();
      const response = await fetch('/api/mixdesk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question, lanes, reading }),
      });
      const said = (await response.json().catch(() => null)) as
        | { reply?: string; moves?: Move[]; message?: string }
        | null;
      if (!response.ok) {
        setProblem(said?.message ?? t('ask.failed', 'That did not go through.'));
        return;
      }
      setReply(said?.reply ?? '');
      setMoves(said?.moves ?? []);
    } catch {
      setProblem(t('ask.offline', 'Could not reach the app’s server.'));
    } finally {
      setAsking(false);
    }
  };

  const keeping = moves.filter((one) => !dropped.has(one.laneId));

  return (
    <div className="space-y-3 px-4 pb-4">
      {/* What it can see, before it is asked anything. */}
      <p className="pt-1 text-[11px] leading-snug" style={{ color: INK_DIM }}>
        {t(
          'ask.cannotHear',
          'It reads the desk — every lane’s level, where it sits, and which effects are on — and it does what you tell it is wrong. It cannot hear the audio, so describe the problem rather than asking it to listen.',
        )}
      </p>

      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        rows={3}
        placeholder={t('ask.placeholder', 'The voice is buried under the drums and the guitar is all on one side.')}
        aria-label={t('ask.label', 'What do you want changed about the mix?')}
        className="w-full rounded-xl p-3 text-sm"
        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: INK }}
      />

      <button
        type="button"
        onClick={() => void ask()}
        disabled={asking || !question.trim()}
        className="flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-40"
        style={{ background: LIT, color: '#05060a' }}
      >
        {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        {asking ? t('ask.asking', 'Reading the desk…') : t('ask.go', 'Ask')}
      </button>

      {problem && <p className="text-sm" style={{ color: '#fca5a5' }}>{problem}</p>}

      {reply && (
        <p className="text-sm leading-snug" style={{ color: INK }}>
          {reply}
        </p>
      )}

      {moves.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: LIT }}>
            {t('ask.proposes', 'What it would change')}
          </p>
          {moves.map((move) => {
            const off = dropped.has(move.laneId);
            return (
              <label
                key={move.laneId}
                className="flex items-start gap-2 rounded-lg p-2"
                style={{ background: 'rgba(255,255,255,0.04)', opacity: off ? 0.45 : 1 }}
              >
                <input
                  type="checkbox"
                  checked={!off}
                  onChange={() =>
                    setDropped((was) => {
                      const next = new Set(was);
                      if (next.has(move.laneId)) next.delete(move.laneId);
                      else next.add(move.laneId);
                      return next;
                    })
                  }
                  className="mt-0.5"
                  style={{ accentColor: LIT }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold" style={{ color: INK }}>
                    {sayMove(move, lanes)}
                  </span>
                  <span className="block text-[11px] leading-snug" style={{ color: INK_DIM }}>
                    {move.why}
                  </span>
                </span>
              </label>
            );
          })}

          {/* The one press that moves anything. */}
          <button
            type="button"
            onClick={() => {
              onApply(keeping);
              setDone(true);
              setMoves([]);
            }}
            disabled={keeping.length === 0}
            className="min-h-[44px] w-full rounded-xl px-4 text-sm font-black disabled:opacity-40"
            style={{ background: '#10b981', color: '#05060a' }}
          >
            {t('ask.apply', 'Change the mix')} · {keeping.length}
          </button>
          <p className="text-[11px] leading-snug" style={{ color: INK_DIM }}>
            {t('ask.undo', 'Nothing has moved yet. Every one of these is a fader you can drag back afterwards — none of it touches the recordings.')}
          </p>
        </div>
      )}

      {done && (
        <p className="text-sm font-bold" style={{ color: '#34d399' }}>
          {t('ask.applied', 'Done. Play it and see what you think.')}
        </p>
      )}
    </div>
  );
}
