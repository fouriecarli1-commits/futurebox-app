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
 *     Sipho: So what changed this year?
 *     Lerato: Everything, and none of it at once.
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
import { Loader2, MessagesSquare, Play, Sparkles, Users, Wand2, X } from 'lucide-react';
import { batches, readScript, spoken, type Speaker } from '../lib/dialogue';
import { readCost } from '../lib/credits';
import Cost from './Cost';
import { accessToken } from '../lib/cloud';
import { useLang } from '../lib/i18n';
import type { VoiceState } from './VoiceLab';
import Note from './Note';
import Card from './Card';
import IdeaChips from './IdeaChips';
import { HOSTS_IDEAS } from '../lib/promptideas';

const EXAMPLE = `Host 1: So what actually changed this year?
Host 2: Everything, and none of it at once.
  The tools got good enough that the hard part moved.
Host 1: Moved where?
Host 2: To knowing what is worth making.`;

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
  const { lang, t } = useLang();
  const all = useMemo(() => [...voices.mine, ...voices.stock], [voices]);

  const [script, setScript] = useState('');
  /* Named in the app's language; the member renames them to themselves. */
  const [cast, setCast] = useState<Speaker[]>(() => [
    { name: t('hosts.host1', 'Host 1'), voiceId: '' },
    { name: t('hosts.host2', 'Host 2'), voiceId: '' },
  ]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [made, setMade] = useState<string | null>(null);

  // The script writer
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState<'casual' | 'visionary' | 'debate'>('casual');
  const [aiLength, setAiLength] = useState<6 | 10 | 16>(10);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');

  const writeScript = async () => {
    if (!aiTopic.trim()) return;
    setAiBusy(true);
    setAiError('');
    try {
      const signed = await accessToken();
      const res = await fetch('/api/podcast/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(signed ? { Authorization: `Bearer ${signed}` } : {}) },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          language: lang,
          tone: aiTone,
          host1Name: cast[0]?.name || t('hosts.host1', 'Host 1'),
          host2Name: cast[1]?.name || t('hosts.host2', 'Host 2'),
          turns: aiLength,
          /* Written to fit what the plan reads in one go, so the script it
             hands back can be made without cutting. */
          ...(allowed > 0 ? { maxChars: allowed } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAiError(data?.message || t('hosts.writeFailed', 'The script could not be written. Try again.'));
        return;
      }
      if (data?.script) {
        setScript(data.script);
        setIsAiModalOpen(false);
        setAiTopic('');
      }
    } catch {
      setAiError(t('hosts.writeUnreachable', 'The script writer could not be reached. Try again.'));
    } finally {
      setAiBusy(false);
    }
  };

  const named = useMemo(() => {
    const list: Speaker[] = [];
    cast.forEach((one) => {
      if (one.voiceId) {
        if (one.name.trim()) list.push(one);
      }
    });
    return list;
  }, [cast]);
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
    <Card
      title={t('hosts.title', 'Two people talking')}
      icon={<MessagesSquare className="w-4 h-4" />}
    >
      <Note>{t('hosts.sub', 'Write it as a script and both voices are made in one pass, so they answer each other instead of reading in turn.')}</Note>

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
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden"
            />
            <select
              value={one.voiceId}
              onChange={(event) => setSpeaker(at, { voiceId: event.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="">{t('hosts.pickVoice', 'Pick a voice')}</option>
              {all.map((voice) => (
                <option key={voice.id} value={voice.id}>{voice.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* ── The script, and the writer that drafts one ──────────────────── */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          {t('hosts.scriptLabel', 'Dialogue Script')}
        </label>
        <button
          type="button"
          data-hostswrite
          onClick={() => setIsAiModalOpen(true)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/60 hover:bg-emerald-900/60 px-3 py-1 text-xs font-bold text-emerald-300 transition-all shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('hosts.writeForMe', 'Write it for me')}</span>
        </button>
      </div>

      {isAiModalOpen && (
        <div data-hostswriter className="rounded-xl border border-emerald-500/40 bg-zinc-950/95 p-4 space-y-3.5 shadow-xl duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-black text-white">{t('hosts.writerTitle', 'The script writer')}</h4>
            </div>
            <button
              type="button"
              onClick={() => setIsAiModalOpen(false)}
              className="p-1 rounded-lg text-zinc-500 hover:text-white"
              aria-label={t('share.close', 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400" htmlFor="hosts-topic">
              {t('hosts.topicLabel', 'What is the conversation about?')}
            </label>
            <input
              id="hosts-topic"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value.slice(0, 300))}
              placeholder={t('hosts.topicIdea', 'e.g. The story behind our new single, and the night we nearly gave up')}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden"
            />
            {/* Starting points for the people this app is for: musicians and creators. */}
            <div className="pt-1">
              <IdeaChips t={t} pool={HOSTS_IDEAS} count={3} onPick={setAiTopic} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">{t('hosts.toneLabel', 'Tone')}:</span>
            {([
              ['casual', 'hosts.toneCasual', 'Easy-going'],
              ['visionary', 'hosts.toneVisionary', 'Big ideas'],
              ['debate', 'hosts.toneDebate', 'A friendly argument'],
            ] as const).map(([mode, key, fallback]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={aiTone === mode}
                onClick={() => setAiTone(mode)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                  aiTone === mode
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {t(key, fallback)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">{t('hosts.lengthLabel', 'Length')}:</span>
            {([
              [6, 'hosts.lengthShort', 'Short'],
              [10, 'hosts.lengthMedium', 'Medium'],
              [16, 'hosts.lengthLong', 'Long'],
            ] as const).map(([turns, key, fallback]) => (
              <button
                key={turns}
                type="button"
                aria-pressed={aiLength === turns}
                onClick={() => setAiLength(turns)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                  aiLength === turns
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {t(key, fallback)}
              </button>
            ))}
          </div>
          {allowed > 0 && (
            <p data-keep className="text-[11px] text-zinc-500">
              {t('hosts.fitsPlan', 'Written to fit the {n} characters your plan reads at a time.').replace('{n}', String(allowed))}
            </p>
          )}

          {aiError && <p className="text-xs text-rose-400 font-medium">{aiError}</p>}

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={() => setIsAiModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
            >
              {t('hosts.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              data-hostswritego
              onClick={writeScript}
              disabled={aiBusy || !aiTopic.trim()}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold px-4 py-1.5 text-xs transition-colors"
            >
              {aiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              <span>
                {aiBusy ? t('hosts.writing', 'Writing…') : `${t('hosts.writeGo', 'Write the script')} · ${t('script.noCredits', 'no credits')}`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── The script ──────────────────────────────────────────────────── */}
      <textarea
        value={script}
        onChange={(event) => setScript(event.target.value)}
        rows={8}
        placeholder={EXAMPLE}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden resize-y leading-relaxed font-mono"
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
        className="min-h-[44px] w-full py-2.5 rounded-xl bg-emerald-500 text-onAccent text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
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
    </Card>
  );
}
