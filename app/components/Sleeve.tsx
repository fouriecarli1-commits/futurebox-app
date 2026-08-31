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
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import { accessToken } from '../lib/cloud';
import { CREDITS } from '../lib/credits';
import { useLang } from '../lib/i18n';

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
        <div className="relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={t('cover.alt', 'Cover art for this song')}
            className="w-full aspect-square object-cover rounded-xl border border-zinc-800 bg-zinc-950"
          />
          <button
            type="button"
            onClick={() => void make()}
            disabled={busy}
            className="absolute bottom-2 right-2 px-2.5 py-1.5 rounded-lg text-xs bg-black/80 border border-zinc-700 text-zinc-200 hover:border-emerald-500 flex items-center gap-1.5 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {t('cover.again', 'Another')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void make()}
          disabled={busy}
          className="w-full py-2.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
          {busy
            ? t('cover.making', 'Drawing the sleeve')
            : `${t('cover.make', 'Make a cover')} — ${CREDITS.cover} ${t('video.credits', 'credits')}`}
        </button>
      )}
      {problem && <p className="text-xs text-rose-400 leading-snug">{problem}</p>}
    </div>
  );
}
