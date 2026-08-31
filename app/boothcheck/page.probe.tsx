'use client';
/**
 * Mounts the Booth screen, for .probe/booth-screen.mjs.
 *
 * PROBE=1 only. Two states are worth seeing rendered rather than grepped: a
 * new account with nothing to sing on, which must explain itself rather than
 * show a blank room, and an account with songs, where the row for one already
 * sung on must offer to reopen it rather than start again.
 *
 * ?with=songs seeds the library. The seed goes in before the screen mounts,
 * because the screen reads it once on mount.
 */
import React, { useEffect, useState } from 'react';
import Booth from '@/app/components/Booth';
import { saveTracks, type Track } from '@/app/lib/library';

const SONGS: Track[] = [
  {
    id: 'seed-backing', title: 'The one with no vocal', genre: 'Amapiano', bpm: 112,
    key: 'A Minor', lyrics: 'A line\nAnd another', style: 'warm, late night',
    models: ['Backing — no vocal'], source: 'engine', seconds: 60,
    createdAt: '2026-08-30T10:00:00.000Z', seed: 1,
  },
  {
    id: 'seed-sung', title: 'The one I already sang on', genre: 'Amapiano', bpm: 112,
    key: 'A Minor', lyrics: 'A line\nAnd another', style: 'warm, late night',
    models: ['Your voice (recorded)'], source: 'engine', seconds: 60,
    createdAt: '2026-08-31T10:00:00.000Z', seed: 2,
    mixOf: { source: 'seed-backing' },
  },
];

export default function BoothCheck() {
  const [ready, setReady] = useState(false);
  const [went, setWent] = useState(false);

  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('with') === 'songs';
    saveTracks(wanted ? SONGS : []);
    setReady(true);
  }, []);

  return (
    <div id="mounted" data-ready={ready ? 'yes' : 'no'} data-went={went ? 'yes' : 'no'}>
      {ready && <Booth onGoToMake={() => setWent(true)} onMade={() => {}} />}
    </div>
  );
}
