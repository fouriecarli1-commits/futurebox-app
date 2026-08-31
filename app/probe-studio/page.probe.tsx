'use client';
/**
 * The Studio on a seeded song, for `.probe/studio.mjs`.
 *
 * PROBE=1 only. The claim worth testing is not that the buttons move things on
 * screen — it is that an arrangement survives the trip back out. The plan
 * leaves here as a lyric sheet, and if the order, the repeats or the cuts do
 * not come through exactly, somebody presses "make a new take" and gets a song
 * that is not the one they arranged.
 *
 * So the sheet handed to `onRemake` is put on the page verbatim, and the check
 * compares the whole string rather than looking for words in it.
 */
import React, { useEffect, useState } from 'react';
import SongSections from '../components/SongSections';
import { saveTracks, type Track } from '../lib/library';

const SONG: Track = {
  id: 'song-1',
  title: 'Rooi Aand',
  genre: 'Amapiano',
  bpm: 112,
  key: 'A Minor',
  lyrics: '',
  style: 'warm, late night',
  models: [],
  source: 'engine',
  seconds: 120,
  createdAt: '2026-08-30T10:00:00.000Z',
  seed: 1,
  parts: [
    { name: 'Verse 1', lines: ['die son sak stadig', 'oor die stad'], seconds: 30 },
    { name: 'Chorus', lines: ['rooi aand', 'bly by my'], seconds: 30 },
    { name: 'Verse 2', lines: ['die lig gaan uit', 'een vir een'], seconds: 30 },
    { name: 'Outro', lines: ['bly by my'], seconds: 30 },
  ],
};

export default function P(): React.ReactElement {
  const [ready, setReady] = useState(false);
  const [sheet, setSheet] = useState<string | null>(null);

  useEffect(() => {
    saveTracks([SONG]);
    setReady(true);
  }, []);

  return (
    <div className="p-6" data-ready={ready ? 'yes' : 'no'}>
      {ready && <SongSections reloadKey={0} onRemake={(next) => setSheet(next.lyrics)} />}
      {/* Verbatim, so the check can compare the whole thing. */}
      {sheet !== null && <pre id="sheet">{sheet}</pre>}
    </div>
  );
}
