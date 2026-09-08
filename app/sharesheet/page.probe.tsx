'use client';
/**
 * The share sheet on a phone, for audit/sharesheet.mjs.
 *
 * PROBE=1 only.
 *
 * With a song, because a song is the case that has the most in it: the live
 * post at the top, "Save the song", the caption and all ten platforms. Her
 * screenshot is this sheet with every one of them on it.
 */
import React, { useEffect, useState } from 'react';
import ShareRow from '@/app/components/ShareRow';
import TabBar from '@/app/components/TabBar';
import { putAudio, saveTracks, type Track } from '@/app/lib/library';

const TRACK = {
  id: 'sharesheet-song',
  title: 'AUD 20260906 WA0001',
  genre: 'Acoustic',
  bpm: 96,
  key: 'A Minor',
  lyrics: '',
  style: 'warm acoustic',
  models: [],
  source: 'upload',
  seconds: 30,
  createdAt: '2026-09-07T10:00:00.000Z',
  seed: 1,
} as unknown as Track;

export default function ShareSheetProbe() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    saveTracks([TRACK]);
    /* And the audio, because the share button hands the *file* to the phone's
       own sheet. A fixture with a track row and no bytes behind it made the
       probe assert that no file was shared, which was true of the fixture and
       not of the app. Half a second of silence is enough to be a file. */
    void putAudio(TRACK.id, new Blob([new Uint8Array(4410)], { type: 'audio/wav' })).then(
      () => setReady(true),
      () => setReady(true),
    );
  }, []);
  if (!ready) return <p className="p-6 text-zinc-400">…</p>;
  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      <ShareRow title={TRACK.title} what="A song I made on FutureBox." track={TRACK} />
      {/* The bar is fixed at every width and is painted over everything, so a
          sheet that does not clear it is measured against the real thing. */}
      <TabBar active="library" onGo={() => undefined} />
    </div>
  );
}
