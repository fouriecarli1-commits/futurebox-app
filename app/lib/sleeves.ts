/**
 * The sleeves for a screenful of songs, asked once.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * `Sleeve.tsx` is the thing that MAKES a cover: it asks, shows a spinner,
 * spends credits, offers a remake. That belongs on the one card somebody is
 * working on, and `Channel.tsx` mounts exactly one of it for exactly that
 * reason — twenty songs on a screen should not be twenty generate buttons.
 *
 * The cost of that was found by Carli testing on 11 September: a sleeve
 * showed only on the card whose button had been pressed, in that session,
 * and was gone on the next load. Two credits for a picture visible until you
 * close the tab. The grid never knew a cover existed because asking per card
 * was the only way to ask.
 *
 * So this asks for all of them in one request and hands back a map. It
 * generates nothing and it spends nothing.
 *
 * ── Signed links, and why that shapes the hook ───────────────────────────
 *
 * The addresses last an hour. That is fine for looking at a page and wrong
 * for a tab left open over lunch, so `Cover` falls back to its drawing when
 * one will not load rather than showing a broken image. This hook does not
 * try to refresh them on a timer: a room somebody has come back to is a room
 * they are about to reload anyway, and a background poll on every open tab
 * would cost more than the picture is worth.
 */
import { useEffect, useState } from 'react';
import { accessToken } from './cloud';

export type Sleeves = Readonly<Record<string, string>>;

/**
 * @param ids the songs on screen. Order does not matter; duplicates and
 *            blanks are dropped by the route.
 */
export function useSleeves(ids: readonly string[]): Sleeves {
  const [found, setFound] = useState<Sleeves>({});
  /* Joined into one string so the effect compares by VALUE.
 
     An array prop is a new array on every render, so a dependency on `ids`
     itself re-runs this on every keystroke in the filter box above the grid
     — twenty requests to type a word, all with the same answer. */
  const key = [...new Set(ids)].filter(Boolean).sort().join(',');

  useEffect(() => {
    if (!key) {
      setFound({});
      return undefined;
    }
    let alive = true;
    void (async () => {
      try {
        const token = await accessToken();
        const response = await fetch(`/api/cover?tracks=${encodeURIComponent(key)}`, {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) return;
        const said = (await response.json()) as {
          covers?: Record<string, string>;
          asked?: boolean;
        };
        /* `asked: false` is storage not answering, which is a different
           thing from nobody having a sleeve. Clearing the map on it would
           make a made cover disappear on a refresh — the exact fault this
           whole change is fixing, reintroduced one layer up. */
        if (alive && said.asked !== false && said.covers) setFound(said.covers);
      } catch {
        /* No sleeves is the ordinary answer and the drawing is a real
           picture, not a placeholder for a missing one. Nothing to say. */
      }
    })();
    return () => {
      alive = false;
    };
  }, [key]);

  return found;
}
