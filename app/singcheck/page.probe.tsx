'use client';
/**
 * Mounts the follow-along view with a fake song, for audit/selfie.mjs.
 *
 * PROBE=1 only. The camera and the recorder are the parts worth exercising in
 * a real browser: a light left on after somebody thinks they have stopped is
 * the worst bug this feature could have, and no amount of reading the code
 * proves the tracks were released.
 *
 * An earlier version of this file named a probe that was never written, so
 * nothing ran it and the sentence above was a promise rather than a test.
 *
 * The song is generated here rather than fetched, because the point is the
 * recording path and a probe that needs a real file on the device is a probe
 * that cannot run. It is a short sine tone written into a wav by hand — long
 * enough to be decodable, small enough to build in a frame.
 */
import React, { useEffect, useRef, useState } from 'react';
import FollowWords from '@/app/components/FollowWords';
import type { TimedLine } from '@/app/lib/timeline';

const LINES: TimedLine[] = [
  { text: 'The first line of it', start: 0, end: 4, section: 'Verse', opensSection: true },
  { text: 'And then the second', start: 4, end: 8, section: 'Verse', opensSection: false },
  { text: 'Here comes the chorus', start: 8, end: 12, section: 'Chorus', opensSection: true },
];

/** Two seconds of a tone, as a wav a browser will decode. */
function fakeSong(): Blob {
  const rate = 8000;
  const count = rate * 2;
  const bytes = new ArrayBuffer(44 + count * 2);
  const view = new DataView(bytes);
  const text = (at: number, said: string) => {
    for (let i = 0; i < said.length; i += 1) view.setUint8(at + i, said.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + count * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i += 1) {
    view.setInt16(44 + i * 2, Math.round(Math.sin((i / rate) * 440 * 2 * Math.PI) * 12000), true);
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

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
        <FollowWords
          lines={LINES}
          audio={audio.current}
          title="A test song"
          onClose={() => {}}
          songFile={async () => fakeSong()}
        />
      )}
    </div>
  );
}
