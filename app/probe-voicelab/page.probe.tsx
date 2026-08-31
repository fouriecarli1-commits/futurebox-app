'use client';
/**
 * The voice lab on its own, for `.probe/voicelab.mjs`.
 *
 * PROBE=1 only. Mounted bare because the real screen sits behind a sign-in
 * this sandbox cannot pass, and the probe intercepts `/api/voice` anyway — so
 * what it needs is the component, not the account around it.
 *
 * This page did not exist. The check that drives it has been in the repo the
 * whole time, reading a 404 and failing for a reason that looks like a broken
 * feature. A check nobody can run is worse than no check: it is a red line
 * people learn to scroll past.
 */
import React from 'react';
import VoiceLab, { type VoiceState } from '../components/VoiceLab';

/** Overwritten by whatever the probe fulfils `/api/voice` with. */
const START: VoiceState = { configured: false, mine: [], stock: [] };

export default function P(): React.ReactElement {
  const [state, setState] = React.useState<VoiceState>(START);
  const load = React.useCallback(() => {
    fetch('/api/voice')
      .then((response) => (response.ok ? response.json() : null))
      .then((next) => { if (next) setState(next as VoiceState); })
      .catch(() => {});
  }, []);
  React.useEffect(() => { load(); }, [load]);
  return (
    <div className="p-6">
      <VoiceLab state={state} onChanged={load} onAudio={() => {}} onUpgrade={() => {}} />
    </div>
  );
}
