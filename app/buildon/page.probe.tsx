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
 * The Hooks room is on it too, because it is the far end of the same
 * sentence: the question decides whether a song may be built on, and Hooks is
 * where somebody actually does it. What `onBuildOn` is handed is written into
 * the page so the probe can read it — that hand-off is the whole feature, and
 * a button that opens Make a song with the wrong thing in it looks identical
 * to one that opens it with the right thing.
 *
 * The room's own request is answered by the probe rather than by Supabase —
 * `audit/buildon.mjs` routes `/api/live` — so what runs here is the real
 * `LiveChannel`, the real `RoomPanel`, the real `PostToLive` and the real
 * `Hooks`.
 */
import React, { useEffect, useState } from 'react';
import Hooks from '@/app/components/Hooks';
import LiveChannel from '@/app/components/LiveChannel';
import PostToLive from '@/app/components/PostToLive';
import { saveTracks, type Track } from '@/app/lib/library';

const TRACK = {
  id: 'buildon-song',
  /* Deliberately not the title of any post in the room fixture: the probe
     asserts that her own open post is not offered a second time as somebody
     else's, and two things with one name cannot be told apart. */
  title: 'Eie opname',
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
  /** Exactly what Hooks handed over, as text, for the probe to read. */
  const [handed, setHanded] = useState('');
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
      <div data-probe="hooks" className="mt-6">
        <Hooks onBuildOn={(from) => setHanded(JSON.stringify(from))} />
      </div>
      <pre data-probe="handed" className="mt-4 text-xs text-zinc-500">{handed}</pre>
    </div>
  );
}
