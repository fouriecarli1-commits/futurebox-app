'use client';

/**
 * The Pro Booth on its own, so it can be pressed.
 *
 * Reaching it through the app means signing in, opening the studio, opening
 * the booth, and having a song with real audio in the browser's own storage —
 * four things that can each fail for reasons that have nothing to do with the
 * room being tested. What is wanted here is the room, on a backing track of a
 * known length, with every control in reach.
 *
 * A `.probe.tsx` is not served. `audit/probooth.mjs` copies it to `page.tsx`,
 * builds, presses things, and removes it again.
 *
 * ── Why the tab bar is here ──────────────────────────────────────────────
 *
 * It was not, and that is how the room's own "Mix it down" button came to be
 * unreachable on a phone without a single assertion noticing. The room is
 * `z-[70]`; `TabBar` is `fixed bottom-0 z-[95]`, so in the real app the bar is
 * painted **over** the bottom of the room. Rendering the room alone tests a
 * screen nobody has.
 *
 * Carli, 9 September 2026, from a phone: "hoe export mens of bring alles by
 * mekaar? Iets soos 'n mix together knoppie?" The button was there. The bar
 * was on top of it.
 *
 * So the bar is rendered here exactly as the app renders it, and the probe
 * asks what is painted at each control rather than where it would be.
 */

import React, { useEffect, useState } from 'react';
import ProBooth from '../components/ProBooth';
import { useOwnedScreen } from '../lib/fullroom';
import TabBar from '../components/TabBar';

const RATE = 48_000;
const SECONDS = 8;

export default function ProBoothProbe(): React.ReactElement {
  const [backing, setBacking] = useState<AudioBuffer | null>(null);
  const [kept, setKept] = useState(0);

  useEffect(() => {
    const Ctx =
      window.OfflineAudioContext ??
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    if (!Ctx) return;
    const offline = new Ctx(1, SECONDS * RATE, RATE);
    const buffer = offline.createBuffer(1, SECONDS * RATE, RATE);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.sin((2 * Math.PI * 220 * i) / RATE) * 0.4;
    }
    setBacking(buffer);
  }, []);

  const ownsScreen = useOwnedScreen();

  return (
    <main>
      <p data-probe="kept">{kept}</p>
      {backing && (
        <ProBooth
          title="A test song"
          backing={backing}
          onKeep={() => setKept((was) => was + 1)}
          onClose={() => undefined}
        />
      )}
      {/* ── The bar, on the same terms the app gives it ────────────────

          It used to be drawn unconditionally, with the note "Over the room,
          as it is in the app" — true when it was written, and the whole
          point: a probe that renders the room alone cannot find the button
          the bar is covering, which is how "Mix it down" came to sit
          underneath it on a phone.

          Since 14 September the booth claims the screen and `app/page.tsx`
          stops drawing the bar while it is open. So this honours the claim
          too. A probe that keeps painting a bar the app has taken away is
          measuring a screen nobody sees — the same fault as before, pointed
          the other way. */}
      {!ownsScreen && <TabBar active="make" onGo={() => undefined} />}
    </main>
  );
}
