'use client';
/**
 * Training a sound of your own, for `.probe/sound.mjs` and
 * `.probe/finetune-cost.mjs`.
 *
 * PROBE=1 only. Two checks share this mount: one drives the whole flow, the
 * other only wants to read what training is about to cost before anybody
 * agrees to it. Neither could run, because this page was never committed.
 */
import React from 'react';
import SoundTrainer from '../components/SoundTrainer';

export default function P(): React.ReactElement {
  const [upgrades, setUpgrades] = React.useState(0);
  return (
    <div className="p-6" data-upgrades={String(upgrades)}>
      <SoundTrainer reloadKey={0} onUpgrade={() => setUpgrades((n) => n + 1)} />
    </div>
  );
}
