'use client';
/**
 * The collaboration room, and the button the radar puts on a match, for
 * `.probe/collab.mjs`.
 *
 * PROBE=1 only. Both are here because the check drives one flow across the
 * two: a request arrives, is accepted, the room opens, a message goes, a song
 * is dropped in, and then somebody new is asked. `AskToCollab` is exported
 * separately precisely because the radar mounts it on a match rather than the
 * room drawing it, so a page with only the room cannot test the last step.
 *
 * Two people are offered, and one of them has no handle. Somebody with no
 * handle cannot be reached — there is nothing to address a request to, and
 * inventing one sends it nowhere — so no button should be drawn for them, and
 * the check counts.
 *
 * The library is seeded before the room mounts, because the room reads it once
 * and dropping a song into a thread is one of the things being tested.
 */
import React, { useEffect, useState } from 'react';
import CollabRoom, { AskToCollab } from '../components/CollabRoom';
import { saveTracks, type Track } from '../lib/library';

const SONG: Track = {
  id: 'song-1', title: 'Rooi Aand', genre: 'Amapiano', bpm: 112, key: 'A Minor',
  lyrics: 'die son sak', style: 'warm, late night', models: [], source: 'engine',
  seconds: 180, createdAt: '2026-08-30T10:00:00.000Z', seed: 1,
};

export default function P(): React.ReactElement {
  const [ready, setReady] = useState(false);
  const [asked, setAsked] = useState(0);

  useEffect(() => {
    saveTracks([SONG]);
    setReady(true);
  }, []);

  return (
    <div className="p-6 space-y-6" data-asked={String(asked)}>
      {ready && <CollabRoom reloadKey={0} />}
      <div className="space-y-2">
        <AskToCollab handle="@thabo" because="same tempo, same corner of the country" onAsked={() => setAsked((n) => n + 1)} />
        {/* No handle: nothing to address it to, so nothing should be drawn. */}
        <AskToCollab handle="" because="same tempo" onAsked={() => setAsked((n) => n + 1)} />
      </div>
    </div>
  );
}
