'use client';
/**
 * Mounts the follow-along view with a fake song, for .probe/sing.mjs.
 *
 * PROBE=1 only. The camera and the recorder are the parts worth exercising in
 * a real browser: a light left on after somebody thinks they have stopped is
 * the worst bug this feature could have, and no amount of reading the code
 * proves the tracks were released.
 */
import React, { useEffect, useRef, useState } from 'react';
import FollowWords from '@/app/components/FollowWords';
import type { TimedLine } from '@/app/lib/timeline';

const LINES: TimedLine[] = [
  { text: 'The first line of it', start: 0, end: 4, section: 'Verse', opensSection: true },
  { text: 'And then the second', start: 4, end: 8, section: 'Verse', opensSection: false },
  { text: 'Here comes the chorus', start: 8, end: 12, section: 'Chorus', opensSection: true },
];

export default function SingCheck() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    audio.current = new Audio();
    setReady(true);
  }, []);

  return (
    <div id="mounted" data-ready={ready ? 'yes' : 'no'}>
      {ready && (
        <FollowWords lines={LINES} audio={audio.current} title="A test song" onClose={() => {}} />
      )}
    </div>
  );
}
