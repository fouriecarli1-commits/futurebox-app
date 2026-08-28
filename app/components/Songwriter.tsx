'use client';

/**
 * Songwriter — where the song is actually written.
 *
 * The Director tab publishes a track that already exists. Nothing in the studio
 * let you write one, which left the most basic act in a music app happening
 * somewhere else entirely.
 *
 * A generator takes two things: a style line and a lyric block. Most attempts
 * are lost in the style line — "make it country" asks for the average of every
 * country song, while a tempo, a key and three named instruments ask for a
 * specific one. So this screen builds both fields properly and shows exactly
 * what will be sent, rather than hiding it behind a Generate button that
 * FutureBox has no model to answer.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  Music, Copy, Check, Plus, Sparkles, ArrowRight, Clock, Type, Mic2, Info,
  RefreshCw, AlertCircle, Wand2, CornerDownLeft,
} from 'lucide-react';
import {
  STYLE_PRESETS, SONG_SECTIONS, VOCAL_CHOICES, MOOD_TAGS, type StylePreset,
} from '../data/studio';
import { offlineIdeas, type Idea } from '../lib/songideas';
import { check, record, ENTITLEMENTS, type Plan } from '../lib/entitlements';

type HelpMode = 'continue' | 'style' | 'polish';

const HELP_LABELS: Record<HelpMode, { button: string; heading: string }> = {
  continue: { button: 'Help me write', heading: 'Lines to try next' },
  style: { button: 'Suggest a style', heading: 'Style lines for what you have written' },
  polish: { button: 'Polish what I have', heading: 'Specific things to fix' },
};

const KEYS = [
  'C Major', 'G Major', 'D Major', 'A Major', 'E Major', 'F Major', 'B♭ Major',
  'A Minor', 'E Minor', 'B Minor', 'F# Minor', 'D Minor', 'G Minor', 'C Minor', 'B♭ Minor',
];

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard?.writeText(text).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          },
          () => setCopied(false),
        )
      }
      className="px-3 py-1.5 rounded-lg text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 transition-all flex items-center gap-1.5"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

export default function Songwriter({
  onSendToMake,
  userPlan,
  onUpgrade,
}: {
  onSendToMake: (payload: { title: string; lyrics: string; style: string }) => void;
  userPlan: Plan;
  onUpgrade: () => void;
}) {
  const [title, setTitle] = useState('');
  const [preset, setPreset] = useState<StylePreset>(STYLE_PRESETS[5]);
  const [bpm, setBpm] = useState(STYLE_PRESETS[5].bpm);
  const [songKey, setSongKey] = useState(STYLE_PRESETS[5].key);
  const [vocal, setVocal] = useState<string>(VOCAL_CHOICES[0].label);
  const [moods, setMoods] = useState<string[]>(['warm']);
  const [extraTags, setExtraTags] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [sent, setSent] = useState(false);
  const lyricRef = useRef<HTMLTextAreaElement>(null);

  // Writing help. `roll` drives the re-roll button, and `seen` is sent back so
  // the model is told what it already offered rather than circling the same
  // four ideas — which is what makes pressing the button repeatedly worthwhile.
  const [helpMode, setHelpMode] = useState<HelpMode | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpNotice, setHelpNotice] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [roll, setRoll] = useState(0);
  const seen = useRef<string[]>([]);

  const choosePreset = (p: StylePreset) => {
    setPreset(p);
    setBpm(p.bpm);
    setSongKey(p.key);
  };

  /** Inserts a section tag at the cursor rather than at the end. */
  const insertSection = (tag: string) => {
    const el = lyricRef.current;
    const block = `[${tag}]\n`;
    if (!el) {
      setLyrics((prev) => (prev ? `${prev}\n\n${block}` : block));
      return;
    }
    const start = el.selectionStart;
    const before = lyrics.slice(0, start);
    const after = lyrics.slice(el.selectionEnd);
    const lead = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const next = `${before}${lead}${block}${after}`;
    setLyrics(next);
    const caret = before.length + lead.length + block.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  const askForHelp = async (mode: HelpMode, again = false) => {
    const nextRoll = again ? roll + 1 : 0;
    if (!again) seen.current = [];
    // The cap is on the model calls only. Running out drops you to the offline
    // prompts rather than to a wall — the screen still helps, it just stops
    // spending on your behalf.
    const gate = check('songwriter.help', userPlan);
    if (!gate.allowed) {
      setHelpMode(mode);
      setRoll(nextRoll);
      setIdeas(offlineIdeas(mode, nextRoll));
      setOffline(true);
      setHelpNotice(`${gate.reason} These are writing prompts in the meantime.`);
      return;
    }

    setHelpMode(mode);
    setRoll(nextRoll);
    setHelpLoading(true);
    setHelpNotice(null);

    try {
      const res = await fetch('/api/songwriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          title,
          style: styleLine,
          lyrics,
          seen: seen.current.slice(-12),
        }),
      });
      const data = await res.json();

      if (res.ok && Array.isArray(data.suggestions)) {
        // Counted only once the model actually answered.
        record('songwriter.help');
        setIdeas(data.suggestions);
        setOffline(false);
        seen.current.push(...data.suggestions.map((i: Idea) => i.label));
        return;
      }

      // Every failure lands the same way: usable offline ideas plus a plain
      // sentence about why the model did not answer.
      setIdeas(offlineIdeas(mode, nextRoll));
      setOffline(true);
      setHelpNotice(
        data?.error === 'no_key'
          ? 'The writing help is switched off at the moment, so here are prompts to work from instead.'
          : data?.detail ?? 'The writing help could not be reached, so here are prompts instead.',
      );
    } catch {
      setIdeas(offlineIdeas(mode, nextRoll));
      setOffline(true);
      setHelpNotice('Could not reach the writing help, so here are prompts instead.');
    } finally {
      setHelpLoading(false);
    }
  };

  const applyIdea = (idea: Idea) => {
    if (helpMode === 'style') {
      setExtraTags((prev) => (prev ? `${prev}, ${idea.text}` : idea.text));
      return;
    }
    setLyrics((prev) => (prev.trimEnd() ? `${prev.trimEnd()}\n\n${idea.text}` : idea.text));
  };

  const styleLine = useMemo(() => {
    const parts = [
      preset.name.toLowerCase(),
      `${bpm} BPM`,
      songKey.toLowerCase(),
      ...(vocal === 'Instrumental — no vocal' ? ['instrumental, no vocal'] : [vocal.toLowerCase()]),
      ...moods,
      ...preset.tags,
      ...extraTags.split(',').map((t) => t.trim()).filter(Boolean),
    ];
    return parts.join(', ');
  }, [preset, bpm, songKey, vocal, moods, extraTags]);

  // Rough, and honest about it: four bars a line at this tempo, which is close
  // enough to catch a lyric that is twice as long as the song it is meant for.
  const stats = useMemo(() => {
    const lines = lyrics.split('\n').filter((l) => l.trim() && !l.trim().startsWith('['));
    const sections = (lyrics.match(/\[[^\]]+\]/g) ?? []).length;
    const words = lines.join(' ').split(/\s+/).filter(Boolean).length;
    const seconds = lines.length * ((60 / bpm) * 4) * 0.5;
    return { lines: lines.length, sections, words, seconds: Math.round(seconds) };
  }, [lyrics, bpm]);

  const hasChorus = /\[chorus/i.test(lyrics);
  const titleInChorus = title.trim().length > 2 && lyrics.toLowerCase().includes(title.trim().toLowerCase());

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-base font-extrabold text-white flex items-center gap-2">
          <Music className="w-4 h-4 text-emerald-400" />
          Songwriter
        </h4>
        <p className="text-sm text-zinc-400 pt-1 max-w-3xl leading-relaxed">
          Write the lyrics, build the style line, then take both to whatever makes your audio. These are the two
          things every music generator asks for, built properly and visible before you send them.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Lyrics */}
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Song title"
            className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 text-base font-semibold text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
          />

          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-zinc-300">Add a section</p>
            <div className="flex flex-wrap gap-1.5">
              {SONG_SECTIONS.map((s) => (
                <button
                  key={s.tag}
                  type="button"
                  title={s.hint}
                  onClick={() => insertSection(s.tag)}
                  className="px-2.5 py-1.5 rounded-lg text-sm bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {s.tag}
                </button>
              ))}
            </div>
          </div>

          <textarea
            ref={lyricRef}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder={'[Verse 1]\nDriving down this empty gravel road\n\n[Chorus]\nUnderneath the summer skyline'}
            className="w-full h-80 bg-black/60 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-100 leading-relaxed focus:outline-none focus:border-emerald-500"
          />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" />
              {stats.lines} lines · {stats.words} words
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              roughly {Math.floor(stats.seconds / 60)}:{String(stats.seconds % 60).padStart(2, '0')} sung
            </span>
            <span>{stats.sections} sections</span>
          </div>

          {lyrics.trim() !== '' && (
            <ul className="space-y-1">
              {!hasChorus && (
                <li className="text-sm text-amber-300/90">
                  No [Chorus] yet. Without one a generator has nothing to return to.
                </li>
              )}
              {hasChorus && title.trim().length > 2 && !titleInChorus && (
                <li className="text-sm text-zinc-500">
                  The title does not appear in the lyrics. Songs are usually named after the line people remember.
                </li>
              )}
              {stats.seconds > 260 && (
                <li className="text-sm text-amber-300/90">
                  That is long for one generation. Most models hold structure better under about four minutes.
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Style */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-zinc-300">Style</p>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => choosePreset(p)}
                  className={`px-2.5 py-1.5 rounded-lg text-sm border transition-all ${
                    preset.id === p.id
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400">Tempo — {bpm} BPM</label>
              <input
                type="range"
                min={60}
                max={180}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400">Key</label>
              <select
                value={songKey}
                onChange={(e) => setSongKey(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400 flex items-center gap-1.5">
              <Mic2 className="w-3.5 h-3.5" /> Vocal
            </label>
            <select
              value={vocal}
              onChange={(e) => setVocal(e.target.value)}
              className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {VOCAL_CHOICES.map((v) => (
                <option key={v.id} value={v.label}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm text-zinc-400">Mood</p>
            <div className="flex flex-wrap gap-1.5">
              {MOOD_TAGS.map((m) => {
                const on = moods.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMoods((prev) => (on ? prev.filter((x) => x !== m) : [...prev, m]))}
                    className={`px-2.5 py-1 rounded-lg text-sm border transition-all ${
                      on ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300' : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Anything else, comma separated</label>
            <input
              value={extraTags}
              onChange={(e) => setExtraTags(e.target.value)}
              placeholder="slide guitar, no cymbals, double-time outro"
              className="w-full bg-black/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Writing help */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-cyan-400" />
            Stuck?
          </span>
          {(Object.keys(HELP_LABELS) as HelpMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => askForHelp(mode)}
              disabled={helpLoading}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${
                helpMode === mode
                  ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300'
              }`}
            >
              {HELP_LABELS[mode].button}
            </button>
          ))}
          <span className="text-sm text-zinc-500">
            {userPlan !== 'free'
              ? 'Unlimited on Pro'
              : `${check('songwriter.help', userPlan).remaining ?? 0} of ${ENTITLEMENTS['songwriter.help'].caps.free} rolls left today`}
          </span>
          {userPlan === 'free' && (check('songwriter.help', userPlan).remaining ?? 0) === 0 && (
            <button type="button" onClick={onUpgrade} className="text-sm text-amber-400 hover:underline">
              Remove the cap
            </button>
          )}
          {helpMode && (
            <button
              type="button"
              onClick={() => askForHelp(helpMode, true)}
              disabled={helpLoading}
              className="ml-auto px-3 py-1.5 rounded-xl text-sm font-semibold bg-zinc-950/60 border border-zinc-800 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${helpLoading ? 'animate-spin' : ''}`} />
              Roll again
            </button>
          )}
        </div>

        {helpLoading && <p className="text-sm text-zinc-500">Thinking…</p>}

        {helpNotice && (
          <p className="text-sm text-amber-300/90 flex items-start gap-2 bg-amber-950/20 border border-amber-500/30 rounded-xl p-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{helpNotice}</span>
          </p>
        )}

        {!helpLoading && helpMode && ideas.length > 0 && (
          <>
            <p className="text-sm font-semibold text-zinc-300">
              {HELP_LABELS[helpMode].heading}
              {offline && <span className="font-normal text-zinc-500"> · written prompts, not AI</span>}
            </p>
            <div className="grid md:grid-cols-2 gap-2.5">
              {ideas.map((idea, i) => (
                <div key={`${idea.label}-${i}`} className="p-3 rounded-xl bg-black/40 border border-zinc-800 space-y-1.5">
                  <p className="text-sm font-bold text-cyan-300">{idea.label}</p>
                  <pre className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{idea.text}</pre>
                  <p className="text-sm text-zinc-500">{idea.why}</p>
                  {!offline && (
                    <button
                      type="button"
                      onClick={() => applyIdea(idea)}
                      className="text-sm text-emerald-400 hover:underline flex items-center gap-1.5"
                    >
                      <CornerDownLeft className="w-3.5 h-3.5" />
                      {helpMode === 'style' ? 'Add to the style line' : 'Add to the lyrics'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* The two fields a generator asks for */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h5 className="text-sm font-bold text-white">Style of music</h5>
            <CopyButton text={styleLine} />
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950 border border-zinc-800 rounded-xl p-3">
            {styleLine}
          </p>
          <p className="text-sm text-zinc-500">
            Paste this into the style field. It is deliberately specific — tempo, key and named instruments narrow the
            result far more than the genre name does.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h5 className="text-sm font-bold text-white">Lyrics</h5>
            <CopyButton text={lyrics} />
          </div>
          <pre className="text-sm text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-xl p-3 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
            {lyrics.trim() || 'Nothing written yet.'}
          </pre>
          <p className="text-sm text-zinc-500">
            Section tags in square brackets are instructions, not words to sing.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <CopyButton text={`Style: ${styleLine}\n\nLyrics:\n${lyrics}`} label="Copy both" />
        <button
          type="button"
          onClick={() => {
            onSendToMake({ title, lyrics, style: styleLine });
            setSent(true);
            setTimeout(() => setSent(false), 2500);
          }}
          disabled={!title.trim() && !lyrics.trim()}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent text-sm font-bold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send to Make
          <ArrowRight className="w-4 h-4" />
        </button>
        {sent && (
          <span className="text-sm text-emerald-400 flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Carried across — add the finished audio link there.
          </span>
        )}
        <span className="ml-auto text-sm text-zinc-500 flex items-center gap-1.5 max-w-md">
          <Info className="w-4 h-4 flex-shrink-0" />
          Take this to Make a song, and use the Studio timeline to ask for changes afterwards.
        </span>
      </div>
    </div>
  );
}
