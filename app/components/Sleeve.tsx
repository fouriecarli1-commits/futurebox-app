'use client';

/**
 * The sleeve for a song — a real generated cover, not a drawn placeholder.
 *
 * Deliberately not `Cover.tsx`, which already exists and does a different job:
 * that one draws a deterministic pattern from a seed so a wall of cards is not
 * a wall of text, and it costs nothing and needs no engine. This is the other
 * thing — an actual image, made once, kept, and worth putting on a store page.
 *
 * A song with no picture is a row in a list. A song with one is a record, and
 * the difference matters most in the two places a track actually goes: a
 * channel page, and wherever somebody posts it.
 *
 * ── What it will not do ──────────────────────────────────────────────────
 *
 * It does not draw the lyrics. A cover made from a lyric sheet becomes an
 * illustration of the words — a literal broken heart — which is what an
 * amateur sleeve looks like and what a real one never does. The prompt is
 * built from mood, genre and light in `app/lib/server/cover.ts`, and asks for
 * no text at all, because every image model writes letters that are almost
 * words and a sleeve with almost-words on it is unusable.
 *
 * ── What it says while it works ──────────────────────────────────────────
 *
 * Seconds rather than minutes, but not instant. Nothing here pretends to know
 * how far along it is: the engine does not report that, and a bar creeping to
 * ninety would be an invention.
 *
 * ── There is no "keep" button, and that was the fault ────────────────────
 *
 * Carli, 14 September 2026: *"daar is nerens 'n keep knoppie nie wat jou help
 * om te sê dat jy die image kies en save as cover art, die anther button gaan
 * lê ook agter daai cover art image… en dalk 'n remove button."*
 *
 * Three things, and the first one is not the one it looks like. A cover IS
 * kept the moment it is drawn — the route writes it to storage under the
 * song, and the next page that opens finds it. Nothing was ever unsaved. What
 * was missing is any sentence saying so, and a screen that saves silently
 * looks exactly like a screen that did nothing. The button she went looking
 * for is really a line of text, and that is what this now has.
 *
 * The second is plain: "Another" was laid on top of the artwork, which is the
 * one part of this screen worth looking at. The controls sit under it now.
 *
 * The third had no answer at all. A cover could be made and replaced, never
 * taken off — and the place that hurts is a song about to be posted. `DELETE
 * /api/cover` is new for it.
 *
 * And "Another" says what it costs and that it replaces what is there. It
 * always did both and said neither: the price was only on the first press,
 * and nothing warned that the picture on screen would be gone.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Image as ImageIcon, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { CREDITS } from '../lib/credits';
import { useLang } from '../lib/i18n';
import Note from './Note';

export default function Sleeve({
  trackId,
  title,
  genre,
  style,
  onShort,
}: {
  trackId: string;
  title: string;
  genre: string;
  style: string;
  /**
   * Handed the refusal body so the top-up panel can open where it belongs.
   *
   * Optional, and the studio does not pass it yet — nothing on that screen
   * does, including generating a song itself, which shows the route's message
   * inline. Being inconsistent with the screen around it would be worse than
   * being consistent and plainer, so this waits until the whole screen is
   * wired rather than being the one button that behaves differently.
   */
  onShort?: (payload: unknown) => void;
}): React.ReactElement {
  const { t } = useLang();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const headers = useCallback(async (): Promise<Record<string, string>> => {
    const token = await accessToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  }, []);

  // Is there one already? Asked once, and it generates nothing.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const response = await fetch(`/api/cover?track=${encodeURIComponent(trackId)}`, {
          headers: await headers(),
        });
        const data = (await response.json()) as { state?: string; url?: string };
        if (alive && data.state === 'done' && data.url) setUrl(data.url);
      } catch {
        // No cover yet is the ordinary case and needs no announcement.
      }
    })();
    return () => {
      alive = false;
    };
  }, [trackId, headers]);

  const takeOff = async (): Promise<void> => {
    setBusy(true);
    setProblem(null);
    try {
      const gone = await fetch(`/api/cover?track=${encodeURIComponent(trackId)}`, {
        method: 'DELETE',
        headers: await headers(),
      });
      if (!gone.ok) {
        setProblem(t('cover.notOff', 'That could not be taken off. Try again in a moment.'));
        return;
      }
      setUrl(null);
    } catch {
      setProblem(t('cover.notOff', 'That could not be taken off. Try again in a moment.'));
    } finally {
      setBusy(false);
    }
  };

  const make = async (): Promise<void> => {
    setBusy(true);
    setProblem(null);
    try {
      const started = await fetch('/api/cover', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await headers()) },
        body: JSON.stringify({ trackId, title, genre, style }),
      });
      const opened = (await started.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        needsCredits?: boolean;
      };
      if (!started.ok || !opened.id) {
        if (opened.needsCredits) onShort?.(opened);
        setProblem(opened.message ?? t('cover.failed', 'The cover could not be made.'));
        return;
      }

      // Two seconds between asks, for two minutes. An image is quick, and
      // asking every half second is rude to a service being generous.
      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        await new Promise((wake) => setTimeout(wake, 2000));
        const asked = await fetch(
          `/api/cover?id=${encodeURIComponent(opened.id)}&track=${encodeURIComponent(trackId)}`,
          { headers: await headers() },
        );
        const progress = (await asked.json().catch(() => ({}))) as {
          state?: string;
          url?: string;
          message?: string;
        };
        if (progress.state === 'failed') {
          setProblem(progress.message ?? t('cover.failed', 'The cover could not be made.'));
          return;
        }
        if (progress.state === 'done' && progress.url) {
          setUrl(progress.url);
          return;
        }
      }
      setProblem(t('cover.slow', 'That is taking longer than usual. Try again in a moment.'));
    } catch {
      setProblem(t('cover.failed', 'The cover could not be made.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {url ? (
        <>
          {/* Nothing over the artwork. It is the one thing on this panel
              worth looking at, and a button parked in the corner of it
              covers whatever the picture put there. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={t('cover.alt', 'Cover art for this song')}
            className="w-full aspect-square object-cover rounded-xl border border-zinc-800 bg-zinc-950"
          />

          {/* The sentence that replaces the button she went looking for.
              It was always saved; nothing ever said so. */}
          <p className="flex items-start gap-1.5 text-sm leading-snug text-emerald-300/90">
            <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            {t('cover.kept', 'This is the song\u2019s cover now. It is saved and it goes wherever the song goes.')}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void make()}
              disabled={busy}
              className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {`${t('cover.again', 'Another')} \u2014 ${CREDITS.cover} ${t('video.credits', 'credits')}`}
            </button>
            {/* `bg-rose` both says what it does and keeps the green rule in
                globals.css off it — see check:sideborder. */}
            <button
              type="button"
              onClick={() => void takeOff()}
              disabled={busy}
              className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-rose-500/[0.06] border border-rose-500/25 text-zinc-400 hover:border-rose-500/50 hover:text-rose-300 flex items-center gap-1.5 disabled:opacity-60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('cover.takeOff', 'Take it off')}
            </button>
          </div>
          {/* Said before the press, not discovered after it. There is one
              cover per song and a new one overwrites it — there is no way
              back to the picture on screen once another is drawn. */}
          <Note>{t('cover.againWarns', 'Another draws a new one and replaces this. There is no way back to this picture.')}</Note>
        </>
      ) : (
        <button
          type="button"
          onClick={() => void make()}
          disabled={busy}
          className="min-h-[44px] w-full py-2.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
          {busy
            ? t('cover.making', 'Drawing the sleeve')
            : `${t('cover.make')} — ${CREDITS.cover} ${t('video.credits', 'credits')}`}
        </button>
      )}
      {problem && <p className="text-xs text-rose-400 leading-snug">{problem}</p>}
    </div>
  );
}
