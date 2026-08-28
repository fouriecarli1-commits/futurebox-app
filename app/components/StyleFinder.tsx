'use client';

/**
 * Deciding what the song should sound like.
 *
 * Two complaints produced this, and they are the same complaint: the chips were
 * a fixed list of twelve, and reading "Amapiano" tells you nothing if you have
 * never heard amapiano. A tick-box list can only ever offer what somebody
 * thought of in advance, which is the opposite of what a generator is for.
 *
 * So there are two ways in, and neither is a list of twelve:
 *
 *   · Say it in your own words — "sad piano song for a funeral" — and Claude
 *     writes the style line for you. The field it writes into is free text, so
 *     the answer is a starting point you can edit, not a preset you must accept.
 *
 *   · Or open the shelf and listen. Every starter plays something, so a name
 *     you do not recognise stops being a guess.
 *
 * About what you hear: it is made in your browser by the sketch engine in
 * `app/lib/audio.ts` — the same one that stands in when no music engine is
 * connected. It is a groove at the right tempo with the right instruments, and
 * it is not what the real generator will produce. Every preview says so, in
 * writing, next to the button. Playing a real ten-second example of each style
 * would mean spending music credits every time somebody browsed, and hiding
 * that the sample was synthetic would be the kind of small dishonesty that
 * makes everything else on the page suspect.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, Pause, Play, Sparkles, Wand2 } from 'lucide-react';
import { STARTERS, type Starter } from '../data/sound';
import { encodeWav, familyFor, renderSketch } from '../lib/audio';
import { useLang } from '../lib/i18n';

interface Idea {
  readonly label: string;
  readonly text: string;
  readonly why: string;
}

/** Four bars is long enough to hear the groove and short enough to render now. */
const PREVIEW_BARS = 4;

export default function StyleFinder({
  style,
  title,
  lyrics,
  onStyle,
  onBpm,
}: {
  /** What is currently in the style field, so a written style can be built on. */
  style: string;
  title: string;
  lyrics: string;
  /**
   * Sets the style field. A written style replaces what is there, because it is
   * a whole answer; a starter off the shelf appends, so two grooves can be
   * combined — which was the point of making the field text in the first place.
   */
  onStyle: (next: string, how: 'replace' | 'append') => void;
  /** A starter carries a tempo, and the sketch fallback needs to know it. */
  onBpm: (bpm: number) => void;
}): React.ReactElement {
  const { t } = useLang();

  const [want, setWant] = useState('');
  const [asking, setAsking] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);

  // One element and one cache for the whole shelf, so pressing play on a second
  // starter stops the first rather than layering two grooves.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const madeRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const element = new Audio();
    element.addEventListener('ended', () => setPlaying(null));
    audioRef.current = element;
    return () => {
      element.pause();
      Object.keys(madeRef.current).forEach((id) => URL.revokeObjectURL(madeRef.current[id]));
    };
  }, []);

  const preview = useCallback((starter: Starter) => {
    const element = audioRef.current;
    if (!element) return;

    if (playing === starter.id) {
      element.pause();
      setPlaying(null);
      return;
    }

    let url = madeRef.current[starter.id];
    if (!url) {
      const samples = renderSketch({
        bpm: starter.bpm,
        key: 'A Minor',
        family: familyFor(starter.name, starter.words.split(',')),
        bars: PREVIEW_BARS,
        // Fixed, so the same starter sounds the same every time you come back
        // to compare it against another one.
        seed: 1,
      });
      url = URL.createObjectURL(encodeWav(samples));
      madeRef.current[starter.id] = url;
    }

    element.src = url;
    void element.play();
    setPlaying(starter.id);
  }, [playing]);

  const write = useCallback(async () => {
    setAsking(true);
    setProblem(null);
    setIdeas([]);
    try {
      const response = await fetch('/api/songwriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'style',
          title,
          // What they typed in plain words leads; whatever is already in the
          // style field is context, not the instruction.
          style: want.trim() || style,
          lyrics,
        }),
      });
      const data = (await response.json()) as { suggestions?: Idea[]; detail?: string; error?: string };
      if (response.ok && Array.isArray(data.suggestions)) {
        setIdeas(data.suggestions);
        return;
      }
      // The reason the route gives is the only thing that says what to do next.
      setProblem(data.detail ?? data.error ?? 'That did not work.');
    } catch {
      setProblem('Could not reach the writing help.');
    } finally {
      setAsking(false);
    }
  }, [lyrics, style, title, want]);

  return (
    <div className="space-y-3">
      {/* Say it in your own words. */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-2.5">
        <div>
          <p className="text-sm font-semibold text-zinc-200">{t('style.ask')}</p>
          <p className="text-sm text-zinc-500 leading-snug">{t('style.askHint')}</p>
        </div>
        <div className="flex gap-2">
          <input
            value={want}
            onChange={(event) => setWant(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !asking) void write();
            }}
            placeholder={t('style.askHint')}
            className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void write()}
            disabled={asking}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 text-sm font-semibold flex items-center gap-1.5 hover:bg-emerald-500/25 disabled:opacity-60 flex-shrink-0"
          >
            {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {asking ? t('style.writing') : t('style.write')}
          </button>
        </div>

        {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

        {ideas.length > 0 && (
          <div className="space-y-2 pt-0.5">
            {ideas.map((idea) => (
              <button
                type="button"
                key={idea.label}
                onClick={() => onStyle(idea.text, 'replace')}
                className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 hover:border-emerald-500/50 transition-all"
              >
                <span className="block text-sm font-semibold text-emerald-300">{idea.label}</span>
                <span className="block text-sm text-zinc-300 leading-snug">{idea.text}</span>
                <span className="block text-sm text-zinc-500 leading-snug">{idea.why}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Or listen to one. */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60">
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left"
        >
          <span className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            {t('style.listen')}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="px-3.5 pb-3.5 space-y-2">
            <p className="text-sm text-zinc-500 leading-snug">{t('style.sketch')}</p>
            {STARTERS.map((starter) => (
              <div
                key={starter.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 flex items-start gap-2.5"
              >
                <button
                  type="button"
                  onClick={() => preview(starter)}
                  aria-label={starter.name}
                  className="w-9 h-9 rounded-full bg-zinc-950 border border-zinc-700 text-emerald-400 flex items-center justify-center flex-shrink-0 hover:border-emerald-500"
                >
                  {playing === starter.id ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 translate-x-0.5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-zinc-200">
                    {starter.name} <span className="text-zinc-600">· {starter.bpm} BPM</span>
                  </span>
                  <span className="block text-sm text-zinc-500 leading-snug">{starter.sounds}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onStyle(starter.words, 'append');
                    onBpm(starter.bpm);
                  }}
                  className="text-sm font-semibold text-emerald-300 hover:underline flex-shrink-0 pt-1"
                >
                  {t('style.use')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
