'use client';
/**
 * Mounts the two-host script screen, for .probe/twohosts.mjs.
 *
 * PROBE=1 only. What is worth seeing in a real browser rather than grepped is
 * everything the screen claims *before* the button is pressed: the turn and
 * character counts, how many upstream passes a script will take, and — the one
 * that matters — that a speaker nobody was cast for is named on screen instead
 * of being handed quietly to the first voice.
 */
import React, { useState } from 'react';
import TwoHosts from '@/app/components/TwoHosts';
import type { VoiceState } from '@/app/components/VoiceLab';

const VOICES: VoiceState = {
  configured: true,
  signedIn: true,
  tier: 'studio',
  caps: { voices: 3, speakChars: 6000, speakPerDay: 60, clean: true, publish: true },
  mine: [{ id: 'v-anre', name: 'Anre (mine)' }],
  stock: [{ id: 'v-carli', name: 'Carli (stock)' }],
};

export default function HostsCheck() {
  const [got, setGot] = useState(0);
  const [upgrades, setUpgrades] = useState(0);
  return (
    <div id="mounted" data-ready="yes" data-got={String(got)} data-upgrades={String(upgrades)}>
      <TwoHosts
        voices={VOICES}
        onAudio={(audio) => setGot(audio.size)}
        onUpgrade={() => setUpgrades((n) => n + 1)}
      />
    </div>
  );
}
