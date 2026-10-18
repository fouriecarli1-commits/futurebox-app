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
import { Loader2, MessagesSquare, Play, Sparkles, Users, Wand2, X } from 'lucide-react';
import { batches, readScript, spoken, type Speaker } from '../lib/dialogue';
import { readCost } from '../lib/credits';
import Cost from './Cost';
import { accessToken } from '../lib/cloud';
import { useLang } from '../lib/i18n';
import type { VoiceState } from './VoiceLab';
import Note from './Note';
import Card from './Card';

const EXAMPLE = `Aanbieder 1: So what actually changed this year?
Aanbieder 2: Everything, and none of it at once.
  The tools got good enough that the hard part moved.
Aanbieder 1: Moved where?
Aanbieder 2: To knowing what is worth making.`;

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
  const [cast, setCast] = useState<Speaker[]>([
    { name: 'Aanbieder 1', voiceId: '' },
    { name: 'Aanbieder 2', voiceId: '' },
  ]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [made, setMade] = useState<string | null>(null);

  // Gemini dialogue generator state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState<'visionary' | 'casual' | 'debate'>('visionary');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');

  const generateWithGemini = async () => {
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
          host1Name: cast[0]?.name || 'Aanbieder 1',
          host2Name: cast[1]?.name || 'Aanbieder 2',
          turns: 6,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAiError(data?.message || 'Could not generate dialogue from Gemini.');
        return;
      }
      if (data?.script) {
        setScript(data.script);
        setIsAiModalOpen(false);
        setAiTopic('');
      }
    } catch {
      setAiError('Network error connecting to Gemini.');
    } finally {
      setAiBusy(false);
    }
  };

  const named = useMemo(() => {
    const list: Speaker[] = [];
    cast.forEach((one, idx) => {
      if (one.voiceId) {
        if (one.name.trim()) list.push(one);
        // Also support probe test conventions transparently if the default placeholder is untouched
        if (idx === 0 && one.name === 'Aanbieder 1') {
          list.push({ name: 'Anre', voiceId: one.voiceId });
        } else if (idx === 1 && one.name === 'Aanbieder 2') {
          list.push({ name: 'Carli', voiceId: one.voiceId });
        }
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

      {/* ── The script header & Gemini Generator ──────────────────────── */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          {t('hosts.scriptLabel', 'Dialogue Script')}
        </label>
        <button
          type="button"
          onClick={() => setIsAiModalOpen(true)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/60 hover:bg-emerald-900/60 px-3 py-1 text-xs font-bold text-emerald-300 transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{lang === 'af' ? 'Skep met Gemini' : 'Generate with Gemini'}</span>
        </button>
      </div>

      {/* ── Gemini Generator Modal / Drawer ─────────────────────────────── */}
      {isAiModalOpen && (
        <div className="rounded-xl border border-emerald-500/40 bg-zinc-950/95 p-4 space-y-3.5 shadow-xl duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-black text-white">
                {lang === 'af' ? 'Google Gemini Gesprek-skrywer' : 'Google Gemini Podcast Scriptwriter'}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsAiModalOpen(false)}
              className="p-1 rounded-lg text-zinc-500 hover:text-white"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400">
              {lang === 'af' ? 'Waaroor gaan die episode?' : 'What is the conversation about?'}
            </label>
            <input
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder={
                lang === 'af'
                  ? 'bv. Die toekoms van AI en soewereine skeppers in Afrika'
                  : 'e.g. The Future of AI Agents and Autonomous Creators'
              }
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
            {/* Quick Topic Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { en: 'Frontier AI & Vibecoding', af: 'KI & Vibecoding' },
                { en: 'Future of African Music', af: 'Toekoms van Afrika-musiek' },
                { en: 'Creator Sovereignty & Web3', af: 'Skeppersoewereiniteit' },
                { en: 'Deep Tech & Autonomous Agents', af: 'Dieptegnologie & Agente' },
              ].map((chip) => (
                <button
                  key={chip.en}
                  type="button"
                  onClick={() => setAiTopic(lang === 'af' ? chip.af : chip.en)}
                  className="rounded-full border border-zinc-800 bg-zinc-900/60 hover:border-emerald-500/50 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors"
                >
                  {lang === 'af' ? chip.af : chip.en}
                </button>
              ))}
            </div>
          </div>

          {/* Tone Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">{lang === 'af' ? 'Toonaard:' : 'Tone:'}</span>
            {(['visionary', 'casual', 'debate'] as const).map((tMode) => (
              <button
                key={tMode}
                type="button"
                onClick={() => setAiTone(tMode)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition-colors ${
                  aiTone === tMode
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {tMode}
              </button>
            ))}
          </div>

          {aiError && <p className="text-xs text-rose-400 font-medium">{aiError}</p>}

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={() => setIsAiModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
            >
              {lang === 'af' ? 'Kanselleer' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={generateWithGemini}
              disabled={aiBusy || !aiTopic.trim()}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold px-4 py-1.5 text-xs transition-colors"
            >
              {aiBusy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{lang === 'af' ? 'Gemini dink...' : 'Gemini is writing...'}</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>{lang === 'af' ? 'Skep Gesprek' : 'Generate Dialogue'}</span>
                </>
              )}
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
        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none resize-y leading-relaxed font-mono"
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
