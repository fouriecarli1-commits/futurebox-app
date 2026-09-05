'use client';

/**
 * Two people talking, from a script somebody typed.
 *
 * ElevenLabs' text-to-dialogue is the one thing they make that is shaped like a
 * podcast rather than like a narrator: the speakers hear each other, so the
 * answer lands where an answer goes instead of being a second monologue butted
 * against the first. Reading two scripts separately and joining the files does
 * not sound the same and never will, because the second reader never heard the
 * first one's question.
 *
 * The script is written the way people write scripts —
 *
 *     Anre: So what changed this year?
 *     Carli: Everything, and none of it at once.
 *       And that is the part nobody expected.
 *
 * — because a form with a row per line is unusable for anything as long as an
 * episode. A line with no name in front of it belongs to whoever spoke last.
 *
 * Everything this screen shows before the button is pressed is the truth about
 * what will happen: how many turns, how many characters, whether that is inside
 * the plan, and — the one nobody would guess — how many separate requests it
 * takes, because their limit is 2,000 characters and a join is the one place
 * the conversation cannot hear itself.
 *
 * A name nobody has been cast for is named on screen rather than quietly given
 * to the first voice. That failure produces an episode in which two people are
 * one person, and it does it silently.
 */

import React, { useMemo, useState } from 'react';
import { Loader2, MessagesSquare, Play, Users } from 'lucide-react';
import { batches, readScript, spoken, type Speaker } from '../lib/dialogue';
import { readCost } from '../lib/credits';
import Cost from './Cost';
import { accessToken } from '../lib/cloud';
import { useLang } from '../lib/i18n';
import type { VoiceState } from './VoiceLab';

const EXAMPLE = `Anre: So what actually changed this year?
Carli: Everything, and none of it at once.
  The tools got good enough that the hard part moved.
Anre: Moved where?
Carli: To knowing what is worth making.`;

export default function TwoHosts({
  voices,
  onAudio,
  onUpgrade,
}: {
  voices: VoiceState;
  /** Hands the finished conversation to the episode draft. */
  onAudio: (audio: Blob) => void;
  onUpgrade: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const all = useMemo(() => [...voices.mine, ...voices.stock], [voices]);

  const [script, setScript] = useState('');
  const [cast, setCast] = useState<Speaker[]>([
    { name: 'Anre', voiceId: '' },
    { name: 'Carli', voiceId: '' },
  ]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [made, setMade] = useState<string | null>(null);

  const named = cast.filter((one) => one.name.trim() && one.voiceId);
  const read = useMemo(() => readScript(script, named), [script, named]);
  const characters = spoken(read.turns);
  const requests = read.turns.length ? batches(read.turns).length : 0;
  const allowed = voices.caps?.speakChars ?? 0;
  const overPlan = allowed > 0 && characters > allowed;

  const setSpeaker = (at: number, next: Partial<Speaker>) =>
    setCast(cast.map((one, i) => (i === at ? { ...one, ...next } : one)));

  const make = async () => {
    setProblem('');
    setBusy(true);
    try {
      const token = await accessToken();
      const response = await fetch('/api/dialogue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ turns: read.turns }),
      });
      if (!response.ok) {
        // Their sentence, not ours: it is the only one that says what to change.
        const said = (await response.json().catch(() => null)) as { message?: string } | null;
        setProblem(said?.message ?? t('hosts.failed', 'The conversation could not be made.'));
        if (response.status === 402) onUpgrade();
        return;
      }
      const audio = await response.blob();
      if (made) URL.revokeObjectURL(made);
      setMade(URL.createObjectURL(audio));
      onAudio(audio);
    } catch {
      setProblem(t('hosts.offline', 'Could not reach the app’s server. Check your connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
      <div>
        <p className="text-base font-bold text-white flex items-center gap-2">
          <MessagesSquare className="w-4 h-4 text-emerald-400" />
          {t('hosts.title', 'Two people talking')}
        </p>
        <p className="text-sm text-zinc-500 leading-snug">
          {t('hosts.sub', 'Write it as a script and both voices are made in one pass, so they answer each other instead of reading in turn.')}
        </p>
      </div>

      {/* ── Who is speaking ─────────────────────────────────────────────── */}
      <div className="grid gap-2 sm:grid-cols-2">
        {cast.map((one, at) => (
          <div key={at} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
              <Users className="w-3.5 h-3.5" />
              {at === 0 ? t('hosts.first', 'First speaker') : t('hosts.second', 'Second speaker')}
            </div>
            <input
              value={one.name}
              onChange={(event) => setSpeaker(at, { name: event.target.value })}
              placeholder={t('hosts.name', 'What they are called in the script')}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
            <select
              value={one.voiceId}
              onChange={(event) => setSpeaker(at, { voiceId: event.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">{t('hosts.pickVoice', 'Pick a voice')}</option>
              {all.map((voice) => (
                <option key={voice.id} value={voice.id}>{voice.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* ── The script ──────────────────────────────────────────────────── */}
      <textarea
        value={script}
        onChange={(event) => setScript(event.target.value)}
        rows={8}
        placeholder={EXAMPLE}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none resize-y leading-relaxed"
      />

      {/* ── What will actually happen, before it happens ────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
        <span>{t('hosts.turns', 'Turns')}: {read.turns.length}</span>
        <span className={overPlan ? 'text-amber-400' : undefined}>
          {t('hosts.chars', 'Characters')}: {characters}
          {allowed > 0 ? ` / ${allowed}` : ''}
        </span>
        {/* The price, beside the counts it is worked out from. Reading is
            charged by the character, so it moves as the script is typed —
            which is the point: nobody should have to press to find out. */}
        {characters > 0 && <Cost credits={readCost(characters)} />}
        {requests > 1 && (
          <span title={t('hosts.requestsWhy')}>
            {t('hosts.requests', 'Passes')}: {requests}
          </span>
        )}
      </div>

      {read.uncast.length > 0 && (
        <p className="text-sm text-amber-400 leading-snug">
          {t('hosts.uncast', 'Nobody is cast as')} {read.uncast.map((name) => `“${name}”`).join(', ')}.{' '}
          {t('hosts.uncastNote', 'Those lines are left out rather than given to somebody else’s voice.')}
        </p>
      )}

      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

      <button
        type="button"
        onClick={() => void make()}
        disabled={busy || read.turns.length === 0 || overPlan}
        className="w-full py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessagesSquare className="w-4 h-4" />}
        {busy ? t('hosts.making', 'Making the conversation…') : t('hosts.make', 'Make the conversation')}
      </button>

      {made && (
        <div className="space-y-1.5">
          <p className="text-sm text-emerald-300 font-semibold flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5" />
            {t('hosts.ready', 'It is below, and it is the episode draft.')}
          </p>
          <audio src={made} controls className="w-full" />
        </div>
      )}
    </div>
  );
}
