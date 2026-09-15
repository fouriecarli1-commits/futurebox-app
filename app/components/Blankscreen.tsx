'use client';

/**
 * When the app draws nothing at all, say so — and give her a way out.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * Carli, 15 September 2026: *"Onthou om ook vanaand die wit skerm te fix daar
 * waar die foto opgelaai moet word. Dit bly 'n regte probleem."*
 *
 * `Watchdog` records everything a white screen can be — a throw, a rejected
 * promise, a render error, a frozen tab, a discarded one — and `/oops` reads
 * the record back. That machinery is complete and it has one hole in it: all
 * of it is silent. A white screen writes its reason to the device and then
 * shows a white screen, so the only person who can act on the record is
 * somebody who already knows the record exists.
 *
 * She has hit this more than once. Every explanation so far has been a guess,
 * and the reason they stayed guesses is that a blank page cannot be asked
 * anything.
 *
 * ── What this does ───────────────────────────────────────────────────────
 *
 * Two things, and both are the same panel:
 *
 *   1. On the load that follows Android throwing the tab away —
 *      `document.wasDiscarded`, which is the commonest reason a page comes
 *      back blank after the gallery or the camera has been in front of it.
 *      Nothing is broken in this app when that happens; a reload fixes it
 *      completely, and the only reason it does not get pressed is that
 *      nothing asks for it.
 *
 *   2. When the page has drawn nothing after six seconds. Not "a room is
 *      empty" — no text anywhere, which is what a white screen is and what
 *      no working state of this app looks like.
 *
 * ── Why it is plain ──────────────────────────────────────────────────────
 *
 * Inline styles, both languages on every line, no translator and no theme —
 * the same posture as `/oops` and `app/error.tsx`, and for the same reason: a
 * thing that draws when the app cannot must not need the app.
 */

import React, { useEffect, useState } from 'react';

/** How long a page has to stay empty before it counts as a blank one. */
const PATIENCE = 6000;

/** How often to look. See the note on watching rather than checking once. */
const EVERY = 1500;

const PANEL = 'rgb(9 9 11)';
const INK = 'rgb(228 228 231)';
const DIM = 'rgb(161 161 170)';
const EDGE = 'rgb(39 39 42)';
const GO = 'rgb(16 185 129)';

/** Is there anything on this page a person could read? */
function drewSomething(): boolean {
  const body = document.body;
  if (!body) return false;
  /* Text, not elements. A page can hold a thousand empty divs and still be
     blank, which is exactly what a half-mounted React tree looks like. */
  const words = (body.innerText || '').trim();
  if (words.length > 0) return true;
  /* And a page that is all picture is not blank either — the full-screen
     song scroller is a video and a couple of icons.

     Big pictures only. Every screen in this app carries a bottom bar of
     five icons, and an `svg` anywhere used to be enough to call the page
     drawn — so a room that rendered nothing under a tab bar read as fine.
     Sixty-four pixels is larger than any icon here and smaller than any
     photograph, a cover or a video. */
  for (const one of Array.from(body.querySelectorAll('img, video, canvas'))) {
    const box = one.getBoundingClientRect();
    if (box.width >= 64 && box.height >= 64) return true;
  }
  return false;
}

export default function Blankscreen(): React.ReactElement | null {
  const [show, setShow] = useState<'discarded' | 'blank' | null>(null);

  useEffect(() => {
    /* Never on `/oops` itself: it is the page somebody lands on to read what
       went wrong, and covering it with a panel about something going wrong
       would be its own small joke. */
    if (window.location.pathname.startsWith('/oops')) return undefined;

    if ((document as Document & { wasDiscarded?: boolean }).wasDiscarded) {
      setShow('discarded');
      return undefined;
    }

    /* ── Watched, not checked once ──────────────────────────────────────

       Carli, 15 September 2026: *"Ek sien die wit blad met die avatar oplaai
       werk nie. Dit is nogsteeds net wit."*

       The first build looked once, six seconds after the page loaded, and
       that is the wrong moment for the fault she keeps hitting. Her white
       screen arrives *after* the gallery has been in front of the app — the
       page loaded fine, drew fine, was checked and passed, and went blank
       ten seconds later when the tab came back from having its memory taken.
       One look at six seconds cannot see that, so the panel written to
       explain a white screen was silent through the white screen.

       So it watches for the life of the page: blank for six continuous
       seconds, whenever those six seconds happen. And it looks again the
       moment the tab is shown, because coming back from the camera or the
       gallery is when this happens and waiting out the interval there is
       another second and a half of somebody staring at nothing. */
    let blankSince = 0;
    const look = (): void => {
      if (drewSomething()) {
        blankSince = 0;
        return;
      }
      const now = Date.now();
      if (!blankSince) {
        blankSince = now;
        return;
      }
      if (now - blankSince >= PATIENCE) setShow('blank');
    };

    const ticking = window.setInterval(look, EVERY);
    const onShown = (): void => {
      if (document.visibilityState === 'visible') look();
    };
    document.addEventListener('visibilitychange', onShown);
    return () => {
      window.clearInterval(ticking);
      document.removeEventListener('visibilitychange', onShown);
    };
  }, []);

  if (!show) return null;

  const title =
    show === 'discarded'
      ? 'Die foon het hierdie bladsy weggegooi. · Your phone threw this page away.'
      : 'Hierdie bladsy het niks geteken nie. · This page drew nothing.';
  const why =
    show === 'discarded'
      ? 'Dit gebeur wanneer die kamera of die galery die geheue nodig het. Niks is verloor nie — laai net weer. · It happens when the camera or the gallery needs the memory. Nothing is lost — just load it again.'
      : 'Laai weer. As dit weer gebeur, maak /oops oop en stuur my die boonste reël. · Load it again. If it happens again, open /oops and send me the top line.';

  return (
    <div
      role="alertdialog"
      aria-label="Blank screen"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        background: PANEL,
        color: INK,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        font: '16px/1.5 system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 420, width: '100%' }}>
        <p style={{ margin: 0, fontWeight: 800 }}>{title}</p>
        <p style={{ margin: '10px 0 0', color: DIM, fontSize: 14 }}>{why}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 18,
            width: '100%',
            minHeight: 48,
            borderRadius: 12,
            border: 'none',
            background: GO,
            color: '#04110c',
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          Laai weer · Load again
        </button>
        <a
          href="/oops"
          style={{
            display: 'block',
            marginTop: 10,
            padding: '14px 12px',
            borderRadius: 12,
            border: `1px solid ${EDGE}`,
            color: DIM,
            textAlign: 'center',
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          Wat het gebeur · What happened
        </a>
      </div>
    </div>
  );
}
