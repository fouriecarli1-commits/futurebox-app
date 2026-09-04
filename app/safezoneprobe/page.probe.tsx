'use client';

/**
 * `SafeZones` on its own, for `audit/safezones.mjs`.
 *
 * A `.probe.tsx` rather than a `page.tsx`, so it is not a route this app
 * serves: the run copies it into place, builds, measures, and puts it back.
 * See `audit/README.md`.
 *
 * The frame is a fixed box of known size rather than a video, because the
 * assertion is geometry — where the shading falls against the frame — and a
 * box whose dimensions the test chose is the only way to check that without
 * first arguing with a video element about how tall it decided to be.
 */

import React from 'react';
import SafeZones from '../components/SafeZones';

export default function SafeZoneProbe(): React.ReactElement {
  return (
    <main className="min-h-screen bg-zinc-950 p-8">
      <div data-probe="tall" style={{ width: 270 }}>
        <SafeZones>
          <div data-frame="1" style={{ width: 270, height: 480, background: '#2a9d8f' }} />
        </SafeZones>
      </div>

      {/* The same component on a wide clip, which is the case that used not to
          be drawn at all. 480 × 270 is 16:9, so a tall post keeps a centre
          column 270 × 270 × (9/16) wide — the run measures that column and the
          safe box inside it. */}
      <div data-probe="wide" style={{ width: 480, marginTop: 48 }}>
        <SafeZones aspect="16:9">
          <div data-wide="1" style={{ width: 480, height: 270, background: '#e76f51' }} />
        </SafeZones>
      </div>
    </main>
  );
}
