'use client';

/**
 * Ask the copilot what to change about the mix, and see it before it happens.
 *
 * The owner, 14 September 2026: *"AI icon (Copilot pop op en vra dat persoon 'n
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
import { withSaid } from '../lib/speak';
import SpeakButton from './SpeakButton';
import { sayMove, type LaneNow, type Move } from '../lib/mixplan';
import IdeaChips from './IdeaChips';
import { MIX_IDEAS } from '../lib/promptideas';

const INK = '#eef2ff';
const INK_DIM = 'rgba(238,242,255,0.5)';
const LIT = '#38bdf8';

/**
 * A model id, as a person would say it: `gemini-2.5-flash` is "Google
 * Gemini 2.5 Flash", anything from Anthropic is "Claude". Names, so not
 * translated. An id this does not recognise is shown as it came.
 */
function engineName(id: string): string {
  if (/^gemini/i.test(id)) {
    return `Google ${id.split('-').map((one) => one.charAt(0).toUpperCase() + one.slice(1)).join(' ')}`;
  }
  if (/^claude/i.test(id)) return 'Claude';
  return id;
}

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
  /** The model that answered the last question, as the route named it. */
  const [engine, setEngine] = useState('');

  const ask = async (): Promise<void> => {
    setAsking(true);
    setProblem('');
    setReply('');
    setEngine('');
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
        | { reply?: string; moves?: Move[]; message?: string; engine?: string }
        | null;
      if (!response.ok) {
        setProblem(said?.message ?? t('ask.failed', 'That did not go through.'));
        return;
      }
      setReply(said?.reply ?? '');
      setMoves(said?.moves ?? []);
      setEngine(typeof said?.engine === 'string' ? said.engine : '');
    } catch {
      setProblem(t('ask.offline', 'Could not reach the app’s server.'));
    } finally {
      setAsking(false);
    }
  };

  const keeping = moves.filter((one) => !dropped.has(one.laneId));

  return (
    <div className="space-y-3 px-4 pb-4">
      {/* ── Who answered, and only once somebody has ────────────────

          This said "Google Gemini 2.5 Flash" whatever happened. The route
          tries Gemini first and falls back to Claude, and walks on to a
          later Flash once 2.5 is switched off, so the badge was a claim
          about a model that often had not been asked. Found on 15 October
          2026 going through every function in the booth. Now the route says
          which one answered, and before any answer the badge names the job
          rather than a supplier. */}
      <div className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-950/30 px-3 py-2 text-xs font-semibold text-sky-300">
        <span className="inline-block h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
        <span className="truncate">
          {engine
            ? `${t('ask.answeredBy', 'Answered by')} ${engineName(engine)}`
            : t('ask.badge', 'Mixing copilot')}
        </span>
      </div>

      {/* What it can see, before it is asked anything. */}
      <p className="pt-1 text-[11px] leading-snug" style={{ color: INK_DIM }}>
        {t(
          'ask.cannotHear',
          'It reads the desk — every lane’s level, where it sits, and which effects are on — and it does what you tell it is wrong. It cannot hear the audio, so describe the problem rather than asking it to listen.',
        )}
      </p>

      {/* Quick AI Suggestions Chips */}
      <div className="space-y-1.5 pt-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-sky-400/80">
          {t('ask.proTips', 'Ask it like an engineer')}
        </p>
        <div>
          {/* The owner, 14 October 2026: "Copilot in daardie booth moet dan ook
              goeie suggestions hê vir professionals om te vra." Each one is
              something this desk can actually do — a fader, a pan, or an
              effect on a lane switched on or off — said the way an engineer
              would ask for it. Nothing here asks it to listen, because it
              cannot. */}
          <IdeaChips t={t} pool={MIX_IDEAS} count={4} onPick={setQuestion} glow="#38BDF8" />
        </div>
      </div>

      <span className="relative block">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          placeholder={t('ask.placeholder', 'The voice is buried under the drums and the guitar is all on one side.')}
          aria-label={t('ask.label', 'What do you want changed about the mix?')}
          className="w-full rounded-xl p-3 text-sm focus:border-sky-500 focus:outline-hidden pr-11"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: INK }}
        />
        <SpeakButton onHeard={(said) => setQuestion((was) => withSaid(was, said))} className="absolute bottom-2 right-2" />
      </span>

      <button
        type="button"
        onClick={() => void ask()}
        disabled={asking || !question.trim()}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 fb-fx-go rounded-xl px-5 text-sm font-bold disabled:opacity-40 transition-all"
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
