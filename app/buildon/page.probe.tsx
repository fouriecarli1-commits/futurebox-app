'use client';
/**
 * The permission question, and the heart on a room row, for audit/buildon.mjs.
 *
 * PROBE=1 only. Copied over `app/buildon/page.tsx` for the length of the run
 * and deleted after it, the same way `app/sharesheet/page.probe.tsx` works.
 *
 * Both halves of one feature are on this page because they are two ends of
 * the same sentence: the question decides whether a song may be built on,
 * and the row is where anybody reacts to it. Looking at them apart is how a
 * panel ends up correct on its own and wrong next to the thing it belongs to.
 *
 * The room's own request is answered by the probe rather than by Supabase —
 * `audit/buildon.mjs` routes `/api/live` — so what runs here is the real
 * `LiveChannel`, the real `RoomPanel` and the real `PostToLive`.
 */
import React, { useEffect, useState } from 'react';
import LiveChannel from '@/app/components/LiveChannel';
import PostToLive from '@/app/components/PostToLive';
import { saveTracks, type Track } from '@/app/lib/library';

const TRACK = {
  id: 'buildon-song',
  title: 'Stil water',
  genre: 'Afro-soul',
  bpm: 92,
  key: 'D Minor',
  lyrics: '',
  style: 'warm afro-soul, brushed drums',
  models: [],
  source: 'made',
  seconds: 48,
  createdAt: '2026-09-08T09:00:00.000Z',
  seed: 2,
} as unknown as Track;

export default function BuildOnProbe(): React.ReactElement {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    saveTracks([TRACK]);
    setReady(true);
  }, []);
  if (!ready) return <p className="p-6 text-zinc-400">…</p>;
  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      <div data-probe="post" className="mb-6 flex flex-wrap items-center gap-2">
        <PostToLive track={TRACK} />
      </div>
      <div data-probe="room">
        <LiveChannel onGoToMake={() => undefined} />
      </div>
    </div>
  );
}
