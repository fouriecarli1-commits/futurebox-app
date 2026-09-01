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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Pause, Play, Sparkles, Wand2 } from 'lucide-react';
import { GENRE_CATEGORIES, GENRE_SAMPLES, type GenreSample } from '../data/genres';
import { useLang } from '../lib/i18n';
import { sketch, supported, SKETCH_SECONDS, type Sketch } from '../lib/preview';

interface Idea {
  readonly label: string;
  readonly text: string;
  readonly why: string;
}

/** The number out of "124 BPM", for the sketch engine that stands in offline. */
function bpmOf(label: string): number {
  const found = label.match(/\d+/);
  const value = found ? Number(found[0]) : 0;
  return value >= 40 && value <= 220 ? value : 112;
}

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
   * a whole answer; a genre off the shelf appends, so two can be combined —
   * which was the point of making the field text in the first place.
   */
  onStyle: (next: string, how: 'replace' | 'append') => void;
  /** A genre carries a tempo, and the sketch fallback needs to know it. */
  onBpm: (bpm: number) => void;
}): React.ReactElement {
  const { t } = useLang();

  const [want, setWant] = useState('');
  const [asking, setAsking] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>('All');
  /** Searching by name, because sixty-four is more than anybody scans. */
  const [hunt, setHunt] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const [noSound, setNoSound] = useState<string | null>(null);

  // One sketch at a time, so pressing play on a second genre stops the first
  // rather than layering two pieces of music.
  const sketchRef = useRef<Sketch | null>(null);

  useEffect(() => () => sketchRef.current?.stop(), []);

  const shelf = useMemo(
    () => {
      const inFamily =
        category === 'All' ? GENRE_SAMPLES : GENRE_SAMPLES.filter((one) => one.category === category);
      const looking = hunt.trim().toLowerCase();
      if (!looking) return inFamily;
      // Name, family and the words it would write: somebody hunting "log drum"
      // is looking for amapiano without knowing what it is called.
      return inFamily.filter(
        (one) =>
          one.name.toLowerCase().includes(looking) ||
          one.subgenre.toLowerCase().includes(looking) ||
          one.category.toLowerCase().includes(looking) ||
          one.promptSnippet.toLowerCase().includes(looking),
      );
    },
    [category, hunt],
  );

  const hear = useCallback(
    (sample: GenreSample) => {
      sketchRef.current?.stop();
      sketchRef.current = null;

      if (playing === sample.name) {
        setPlaying(null);
        return;
      }
      // Said rather than left as a silence. The old version swallowed every
      // failure into `.catch(() => setPlaying(null))`, so a button that could
      // not make a sound looked exactly like a button that had made one — and
      // that is the bug this whole file was rewritten for.
      if (!supported()) {
        setPlaying(null);
        setNoSound(t('style.noAudio', 'This browser cannot play a sketch. The words below still work.'));
        return;
      }
      setNoSound(null);
      sketchRef.current = sketch(sample);
      setPlaying(sample.name);
      window.setTimeout(() => {
        setPlaying((was) => (was === sample.name ? null : was));
      }, (SKETCH_SECONDS + 0.6) * 1000);
    },
    [playing, t],
  );

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
          <div className="px-3.5 pb-3.5 space-y-2.5">
            <p className="text-sm text-zinc-500 leading-snug">{t('style.examples')}</p>
            {/* Four oscillators, and the screen says so. Claiming a recording
                of the genre would be the easy copy and a false one. */}
            <p className="text-sm text-zinc-600 leading-snug">
              {t(
                'style.sketchNote',
                'Play draws a sketch in your browser — the tempo, the key and the shape of the groove. It is a direction, not a recording of the genre.',
              )}
            </p>
            {noSound && <p className="text-sm text-amber-300 leading-snug">{noSound}</p>}

            {/* This was ten categories as pills, which fitted. It is
                twenty-two now, and twenty-two pills is a wall rather than a
                choice — so the family is a dropdown and the name is a search.
                Searching matters more than it looks with sixty-four styles on
                the shelf: somebody who half-remembers "maskandi" should not
                have to know it lives under Traditional & World. */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as typeof category)}
                aria-label={t('style.family', 'Family')}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none min-w-0"
              >
                {GENRE_CATEGORIES.map((one) => (
                  <option key={one} value={one}>
                    {one === 'All' ? t('style.allFamilies', 'Every style') : one}
                  </option>
                ))}
              </select>
              <input
                value={hunt}
                onChange={(event) => setHunt(event.target.value)}
                placeholder={t('style.search', 'Search by name')}
                className="flex-1 min-w-[8rem] bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-sm text-zinc-500 tabular-nums flex-shrink-0">
                {shelf.length}
              </span>
            </div>

            {shelf.length === 0 && (
              <p className="text-sm text-zinc-500 leading-snug">
                {t('style.noneFound', 'Nothing by that name. The style field takes your own words too — it is free text.')}
              </p>
            )}

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {shelf.map((sample) => (
                <div
                  key={sample.name}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 flex items-start gap-2.5"
                >
                  <button
                    type="button"
                    onClick={() => hear(sample)}
                    aria-label={sample.name}
                    className="w-9 h-9 rounded-full bg-zinc-950 border border-zinc-700 text-emerald-400 flex items-center justify-center flex-shrink-0 hover:border-emerald-500"
                  >
                    {playing === sample.name ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 translate-x-0.5" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-zinc-200">
                      {sample.name}{' '}
                      <span className="text-zinc-600">· {sample.bpm} · {sample.key}</span>
                    </span>
                    <span className="block text-sm text-zinc-400 leading-snug">{sample.subgenre}</span>
                    <span className="block text-sm text-zinc-500 leading-snug">{sample.description}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // The snippet is the whole reason the list exists: the
                      // sound and the words that produce it, together.
                      onStyle(sample.promptSnippet, 'append');
                      onBpm(bpmOf(sample.bpm));
                    }}
                    className="text-sm font-semibold text-emerald-300 hover:underline flex-shrink-0 pt-1"
                  >
                    {t('style.use')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
