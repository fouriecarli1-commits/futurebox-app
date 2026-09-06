'use client';
/**
 * A collab room with two people actually talking in it, for audit/collabroom.mjs.
 *
 * PROBE=1 only.
 *
 *   "ek sal graag wil sien hoe lyk so saamwerk kamer."
 *
 * The room is unreachable on a fresh app: it opens only once two people have
 * each agreed, and on a testing deployment with three accounts nobody has
 * ever got that far. So there was no way to look at the thing without first
 * arranging two real people — which is a bad reason not to be able to see
 * what you are building.
 *
 * Playwright answers `/api/collab` and `/api/collab/messages` in front of
 * this page, so the room renders with a request waiting, a room that is open,
 * and a thread with a song handed across it. Nothing here is a mock of the
 * component: it is the real `CollabRoom` reading real replies in the shape
 * the routes send.
 */
import React from 'react';
import CollabRoom from '@/app/components/CollabRoom';

export default function CollabRoomProbe() {
  return (
    <div className="min-h-screen bg-zinc-950 p-4">
      <CollabRoom reloadKey={1} me="@carli" />
    </div>
  );
}
