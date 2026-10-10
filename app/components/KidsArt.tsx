'use client';
/**
 * The bench where Google draws the pictures for the child's room.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Kan jy asb nie op jou eie engine staat maak om
 * kreatiewe idees uit te dink vir die kids room nie… Jy sal moet ons google
 * engines gebruik!"*
 *
 * The bubbles in that room carry line icons picked from a library, which is a
 * drawing made by choosing rather than by drawing. Twenty-three pictures from
 * her own engine, in one press, is the thing she is asking for.
 *
 * ── Why a page and not a message ─────────────────────────────────────────
 *
 * Because the Google key lives in Vercel and nowhere else, so nothing outside
 * the deployment can ask on her behalf. Asking her to paste a prompt into the
 * poster room and send the file back is three steps and a file transfer for
 * something that should be one button — and it was three steps that did not
 * happen. This is the button.
 *
 * ── What it does not do ──────────────────────────────────────────────────
 *
 * It does not send Google anything we have drawn. Her question was precisely
 * that, and the answer has to be enforced rather than said: the route passes
 * no reference picture, and `check:merklab` fails the build if one ever
 * appears. An image model handed a drawing reproduces it, and reproducing a
 * mark she has already turned down twice is the one outcome worse than not
 * asking.
 */

import React from 'react';
import { Download, Loader2, RefreshCw } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { DRAWINGS } from '../lib/kidsart';
import { useLang } from '../lib/i18n';

type Drawn = {
  readonly id: string;
  readonly of: 'topic' | 'sound';
  readonly said: readonly [string, string];
  readonly ok: boolean;
  readonly base64?: string;
  readonly mime?: string;
  readonly message?: string;
};

export default function KidsArt(): React.ReactElement {
  const { lang, t } = useLang();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [drawn, setDrawn] = React.useState<readonly Drawn[]>([]);
  const [said, setSaid] = React.useState('');

  const ask = React.useCallback(async (one?: { id: string; of: 'topic' | 'sound' }) => {
    setBusy(one ? `${one.of}:${one.id}` : 'all');
    setSaid('');
    try {
      const token = await accessToken();
      const answer = await fetch('/api/kids/art', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(one ?? {}),
      });
      const back = await answer.json().catch(() => null);
      if (!answer.ok) {
        setSaid(back?.message ?? t('kidsart.failed', 'That did not go through.'));
        return;
      }
      const made: readonly Drawn[] = back?.drawn ?? [];
      /* Asking for one again replaces that one and leaves the rest, so a
         sitting is built up rather than started over. */
      setDrawn((was) => {
        const kept = was.filter((old) => !made.some(
          (fresh) => fresh.id === old.id && fresh.of === old.of,
        ));
        const at = (one: Drawn) => DRAWINGS
          .findIndex((d) => d.id === one.id && d.of === one.of);
        return [...kept, ...made].sort((a, b) => at(a) - at(b));
      });
    } catch {
      setSaid(t('kidsart.offline', 'No answer. Check the connection and try again.'));
    } finally {
      setBusy(null);
    }
  }, [t]);

  return (
    <main data-kidsart className="min-h-screen bg-zinc-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold">
          {t('kidsart.title', 'The children’s pictures, drawn by Google')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          {t('kidsart.blurb',
            'Twenty-three pictures for the bubbles in the children’s room, one'
            + ' for every choice in it. Nothing we have drawn is sent — Google'
            + ' is given the words and nothing else. Save them and send them'
            + ' to me and they go into the room.')}
        </p>

        <button
          type="button"
          data-kidsartask
          onClick={() => void ask()}
          disabled={busy !== null}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-medium text-zinc-950 disabled:opacity-50"
        >
          {busy === 'all'
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />}
          {t('kidsart.ask', 'Ask Google for all 23')}
        </button>

        {said && <p data-kidsartsaid className="mt-4 text-sm text-amber-300">{said}</p>}

        <div data-kidsartgrid className="mt-8 grid gap-5 grid-cols-2 sm:grid-cols-4">
          {DRAWINGS.map((one) => {
            const made = drawn.find((d) => d.id === one.id && d.of === one.of);
            return (
              <figure key={`${one.of}-${one.id}`} data-kidsartone className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-zinc-950">
                  {made?.ok && made.base64
                    ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={one.says[lang === 'af' ? 1 : 0]}
                        src={`data:${made.mime ?? 'image/png'};base64,${made.base64}`}
                        className="h-full w-full object-contain"
                      />
                    )
                    : (
                      <span className="px-6 text-center text-xs text-zinc-600">
                        {made?.message ?? t('kidsart.empty', 'Not asked for yet.')}
                      </span>
                    )}
                </div>
                <figcaption className="mt-3 flex items-center justify-between gap-3">
                  <span className="truncate text-xs text-zinc-300">{one.says[lang === 'af' ? 1 : 0]}</span>
                  <span className="flex items-center gap-2">
                    {made?.ok && made.base64 && (
                      <a
                        data-kidsartsave
                        href={`data:${made.mime ?? 'image/png'};base64,${made.base64}`}
                        download={`kids-${one.of}-${one.id}.png`}
                        className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {t('kidsart.save', 'Save')}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => void ask({ id: one.id, of: one.of })}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-50"
                    >
                      {busy === `${one.of}:${one.id}`
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <RefreshCw className="h-3.5 w-3.5" />}
                      {t('kidsart.again', 'Again')}
                    </button>
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </main>
  );
}
