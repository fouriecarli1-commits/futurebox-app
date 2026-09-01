'use client';
/**
 * Make a song, for `.probe/ownsound.mjs`.
 *
 * PROBE=1 only. What is being checked is the one control that changes what
 * the engine is asked for rather than what it is told in words: the tick that
 * says make this next song in a sound of my own.
 *
 * It has four states and only one of them used to be on screen. The other
 * three are where somebody gets stuck — the plan does not include it, none
 * trained yet, one still training — and each has to say which it is and what
 * to do about it. So the check drives all four, and `/api/finetunes` is
 * intercepted to put the screen in each.
 */
import React, { useState } from 'react';
import MakeMusic, { type Canvas } from '@/app/components/MakeMusic';

export default function OwnSoundCheck() {
  const [canvas, setCanvas] = useState<Canvas>({ title: '', lyrics: '', style: '' });
  const [went, setWent] = useState(false);
  const [upgrades, setUpgrades] = useState(0);
  return (
    <div id="mounted" data-ready="yes" data-channel={went ? 'yes' : 'no'} data-upgrades={String(upgrades)}>
      <MakeMusic
        userPlan="studio"
        onUpgrade={() => setUpgrades((n) => n + 1)}
        canvas={canvas}
        setCanvas={setCanvas}
        makeSignal={0}
        onMade={() => {}}
        onGoToChannel={() => setWent(true)}
        engineReady
      />
    </div>
  );
}
