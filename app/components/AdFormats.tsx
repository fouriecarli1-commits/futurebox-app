'use client';

/**
 * What should this even be?
 *
 * ── The question that came before the one the desk was asking ────────────
 *
 * The advert desk writes adverts, and writes them well. It has never asked
 * whether an advert is the right thing to make. For a lot of the people it is
 * for, it is not: a one-person leather workshop is better served by forty
 * seconds of her own voice over three photographs than by a generated clip of
 * a bag, a church group wants a song, a consultancy wants an episode, a
 * bakery wants fifteen vertical seconds and nothing else.
 *
 * Carli, 11 September 2026: "dalk is 'n podcast styl soms die voordeel, ander
 * kere weer kort videos, dalk 'n explainer video, dalk net 'n liedjie met 'n
 * foto... Die advert funksie dink ek gaan baie mense attract as dit diepte
 * het en die moeite werd is."
 *
 * ── Two or three, and one of them named as wrong ─────────────────────────
 *
 * A list of eight things this studio can make is a menu, and a menu hands the
 * choosing back to the person who came here to have it done. So: two or three,
 * ranked, each said in terms of THEIR product, with the first thing to make
 * written out concretely enough to start today.
 *
 * And one named as the wrong answer. That line is the most useful thing on
 * this screen — the obvious format is often wrong and nobody else is going to
 * say so, least of all a tool that is paid when you make things.
 *
 * ── Every card opens the room that makes it ──────────────────────────────
 *
 * Which is the whole reason this is worth building here rather than reading
 * somewhere. Advice you cannot act on costs the reader the time to find that
 * out. `app/lib/adformats.ts` is the catalogue and every entry names a room
 * that exists, so a recommendation is always one press from the thing itself.
 */

import React, { useState } from 'react';
import { Compass, Loader2, ArrowRight, TriangleAlert, Clock } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { refusalText } from '../lib/apierror';
import { AD_FORMATS, formatById } from '../lib/adformats';
import type { SurfaceId } from '../lib/surfaces';
import Card from './Card';
import Note from './Note';

interface Pick {
  readonly id: string;
  readonly why: string;
  readonly first: string;
  readonly watchOut: string;
}

export interface FormatBrief {
  readonly what: string;
  readonly who?: string;
  readonly offer?: string;
  readonly tone?: string;
  readonly market?: string;
  readonly place?: string;
}

const EFFORT_TONE: Record<'low' | 'medium' | 'high', string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-rose-400',
};

export default function AdFormats({
  brief,
  onGoTo,
  onSetUp,
}: {
  readonly brief: FormatBrief;
  readonly onGoTo: (surface: SurfaceId) => void;
  /**
   * Put the first thing to make into the room that makes it, on the way in.
   *
   * Not every format has somewhere to put it — a song has no single box that
   * takes a sentence — so this is allowed to do nothing, and the card still
   * opens the room. Arriving in the right room is most of the value; arriving
   * with the first line already in it is the rest.
   */
  readonly onSetUp: (room: SurfaceId, op: string, value: string) => void;
}): React.ReactElement {
  const { t, lang } = useLang();
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [instead, setInstead] = useState('');
  const [moves, setMoves] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const ask = async () => {
    setProblem(null);
    if (!brief.what.trim()) {
      setProblem(t('shape.needWhat', 'Say what you are selling in the brief above first.'));
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/adformats', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...brief, lang }),
      });
      const said = (await response.json().catch(() => ({}))) as {
        picks?: Pick[];
        instead?: string;
        moves?: string;
        message?: string;
        error?: string;
      };
      if (!response.ok || !said.picks?.length) {
        setProblem(refusalText(said, lang, t('shape.failed', 'That could not be worked out just now.')));
        return;
      }
      setPicks(said.picks);
      setInstead(said.instead ?? '');
      setMoves(said.moves ?? '');
    } catch {
      setProblem(t('shape.failed', 'That could not be worked out just now.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={t('shape.title', 'What should this even be?')}>
      <Note className="text-sm text-zinc-500 leading-relaxed">
        {t(
          'shape.what',
          'Before anybody writes an advert: an advert may not be the thing to make. This looks at what you sell and says which two or three of the things this studio makes would actually work for it — and names one that would not.',
        )}
      </Note>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void ask()}
          disabled={busy}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
          {picks ? t('shape.again', 'Think again') : t('shape.go', 'Work out what to make')}
        </button>
        <span className="text-xs text-zinc-500">{t('shape.free', 'This costs nothing.')}</span>
      </div>
      {busy && (
        <p className="text-xs text-zinc-500">
          {t('shape.slow', 'It thinks properly about this one — it is the decision the rest of the month rests on.')}
        </p>
      )}
      {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

      {picks && (
        <div className="space-y-3 border-t border-zinc-800 pt-4">
          {picks.map((pick, at) => {
            const format = formatById(pick.id);
            if (!format) return null;
            return (
              <div
                key={pick.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3.5 py-3 space-y-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-white">
                    {/* Ranked, and the ranking said out loud. A list whose
                        order carries meaning and does not show it is a list
                        somebody reads in the wrong order. */}
                    {at === 0 && (
                      <span className="text-emerald-400">{t('shape.first', 'Start here')} · </span>
                    )}
                    {lang === 'af' ? format.af : format.en}
                  </p>
                  <span className={`text-xs font-bold whitespace-nowrap ${EFFORT_TONE[format.effort]}`}>
                    <Clock className="inline w-3 h-3 mr-1" />
                    {t(`shape.effort.${format.effort}`, format.effort)}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 leading-snug">
                  {lang === 'af' ? format.whatAf : format.whatEn}
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed">{pick.why}</p>
                <p className="text-sm text-emerald-300/90 leading-relaxed">
                  <span className="font-semibold">{t('shape.firstThing', 'First thing to make')}:</span>{' '}
                  {pick.first}
                </p>
                <p className="text-xs text-amber-400/90 leading-snug">
                  <TriangleAlert className="inline w-3 h-3 mr-1" />
                  {pick.watchOut}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    /* Set up first, then move. The hand-off waits for a room
                       that has not mounted and fires when it does; doing it
                       the other way round puts the value into the room being
                       left. See lib/copilotactions.ts. */
                    if (format.op) onSetUp(format.room, format.op, pick.first);
                    onGoTo(format.room);
                  }}
                  className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
                >
                  {t('shape.open', 'Open the room and start it')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {/* The line nobody else will write. */}
          {instead && (
            <div className="rounded-xl border border-zinc-800 bg-black/30 px-3.5 py-3">
              <p className="text-xs uppercase tracking-wider text-zinc-600 font-bold">
                {t('shape.notThis', 'What not to spend a month on')}
              </p>
              <p className="text-sm text-zinc-400 leading-relaxed pt-1">{instead}</p>
            </div>
          )}

          {/* What it cannot see.

              She asked for suggestions that had looked at what is working in
              marketing videos now. Nothing here reads the internet, and a
              recommendation claiming to know this week would be a claim
              nobody checked. So the model says which of its own lines rest on
              something that moves, and this prints that rather than hiding
              it. A reader who knows which line to distrust can go and check
              it; one who does not, cannot. */}
          <p className="text-xs text-zinc-500 leading-relaxed border-t border-zinc-800 pt-3">
            {moves
              ? `${t('shape.moves', 'What may have moved since this was trained')}: ${moves}`
              : t(
                  'shape.noMoves',
                  'This reasons from craft rather than from this week — it cannot see the internet. Where it disagrees with what you have actually seen your customers do, you are right.',
                )}
          </p>
        </div>
      )}

      {!picks && (
        <p className="text-xs text-zinc-600 leading-relaxed">
          {t('shape.catalogue', 'It chooses from what this studio can actually make')} — {AD_FORMATS.length}{' '}
          {t('shape.catalogueTail', 'things, each in a room that already exists.')}
        </p>
      )}
    </Card>
  );
}
