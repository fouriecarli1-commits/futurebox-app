'use client';

/**
 * The Booth — its own room, on the rail, with a door you can find.
 *
 * The complaint was that the booth is missing. It was not missing: every part
 * of it was built and working — words in time, a waveform of the backing and
 * your take on one clock, the note you are on, punching in over the line that
 * went wrong, lanes and faders for somebody who does this for a living, and
 * splitting a song so the generated voice can be lifted out and yours put in
 * its place.
 *
 * What was missing was the way in. It opened from a button called "Sing over
 * it" on a song row, inside the make screen, which you only ever saw after you
 * had already made a song. So the rail said the order of work was write it,
 * arrange it, sing on it — and there was no rung for singing on it.
 *
 * This is that rung. It does one thing the booth cannot do for itself: it shows
 * the songs on this device and lets you pick which one to sing on, including
 * ones you have already sung on, which reopen with the take you kept.
 *
 * The recording, the mixing and the separating all still live in `VocalBooth`
 * and `ProBooth`. Nothing here duplicates them, because a second copy of the
 * booth is exactly the failure this is fixing.
 */

import React, { useEffect, useState } from 'react';
import { Layers, Loader2, Mic, Music, Scissors, Sliders, Sparkles, Waves } from 'lucide-react';
import { getAudio, loadTracks, saveTracks, type Track } from '../lib/library';
import { readAudio } from '../lib/trackaudio';
import { keepMix, takeId } from '../lib/takekeep';
import { useLang } from '../lib/i18n';
import { useCopilotOps, matchByTitle } from '../lib/copilotactions';
import * as cloud from '../lib/cloud';
import VocalBooth from './VocalBooth';

/** What the booth is for, said before anybody has to press anything. */
function WhatItIs(): React.ReactElement {
  const { t } = useLang();
  const points = [
    { icon: Mic, text: t('booth.room.sing', 'Sing on your own song, with the words in time and a count-in before you come in.') },
    { icon: Waves, text: t('booth.room.see', 'The backing above and your take below, on one clock, so you can see where you are.') },
    { icon: Scissors, text: t('booth.room.punch', 'Drag across the line that went wrong and sing only that. The rest of the take is kept.') },
    { icon: Layers, text: t('booth.room.split', 'Split the song, lift the generated voice out, and put yours where it was.') },
    { icon: Sliders, text: t('booth.room.lanes', 'Lanes, levels, mutes and solos when one voice over one song is not enough.') },
  ];
  return (
    <ul className="space-y-2">
      {points.map((point) => {
        const Icon = point.icon;
        return (
          <li key={point.text} className="flex items-start gap-2.5 text-sm text-zinc-400">
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
            <span>{point.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Booth({
  onGoToMake,
  onMade,
}: {
  /** There is nothing to sing on until a song exists. */
  onGoToMake: () => void;
  /** Fires when a sung mix lands, so the studio can offer what comes next. */
  onMade: (track: Track) => void;
}): React.ReactElement {
  const { t } = useLang();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [open, setOpen] = useState<{ track: Track; music: Blob; take: Blob | null } | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  /* Open the booth on a song they named. Loading the backing is the same path
     the button takes, so a copilot open and a tapped open cannot diverge. */
  useCopilotOps('booth', {
    pick_song: (value) => {
      const track = matchByTitle(tracks, value);
      if (track) void openOn(track);
    },
  });

  useEffect(() => {
    const local = loadTracks();
    setTracks(local);
    if (!cloud.configured()) return;
    let live = true;
    // Same as the make screen: what is on the device shows first, and a song
    // made on another one arrives when the network says so.
    cloud.syncChannel(local, getAudio).then((merged) => {
      if (!live) return;
      setTracks(merged);
      saveTracks(merged);
    });
    return () => {
      live = false;
    };
  }, []);

  /**
   * Open the booth on a song.
   *
   * A mix somebody already sang on opens on the song it was sung *over*, with
   * the take loaded — that is the only combination that can be edited further,
   * because a kept mix is one file by then and no amount of editing separates
   * the voice from the backing again.
   */
  const openOn = async (track: Track) => {
    setStatus('');
    setOpening(track.id);
    try {
      if (track.mixOf) {
        const source = tracks.find((one) => one.id === track.mixOf?.source);
        if (!source) {
          setStatus(t('make.sourceGone', 'The song this was sung over is not on this device any more.'));
          return;
        }
        const music = await readAudio(source.id);
        const take = await getAudio(takeId(track.id));
        if (!music || !take) {
          setStatus(t('make.missing'));
          return;
        }
        setOpen({ track: source, music, take });
        return;
      }
      const music = await readAudio(track.id);
      if (!music) {
        setStatus(t('make.missing'));
        return;
      }
      setOpen({ track, music, take: null });
    } finally {
      setOpening(null);
    }
  };

  const keep = async (over: Track, mixed: Blob, doubled: boolean, take: Blob) => {
    const sung = await keepMix(over, mixed, doubled, take, t('make.withYourVoice', 'with your voice'));
    const next = [sung, ...tracks];
    setTracks(next);
    saveTracks(next);
    setOpen(null);
    setStatus(t('take.kept', 'Your take is in your channel.'));
    onMade(sung);
    void cloud.pushTrack(sung, mixed);
  };

  const markSplit = (over: Track) => {
    const next = tracks.map((one) => (one.id === over.id ? { ...one, stems: true } : one));
    setTracks(next);
    saveTracks(next);
  };

  return (
    <div className="space-y-6">
      {/* Full screen and over everything: singing wants the whole window. */}
      {open && (
        <VocalBooth
          track={open.track}
          music={open.music}
          startTake={open.take}
          onKeep={(mixed, doubled, take) => keep(open.track, mixed, doubled, take)}
          onSplit={() => markSplit(open.track)}
          onClose={() => setOpen(null)}
        />
      )}

      <div>
        <h4 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Mic className="w-6 h-6 text-emerald-400" />
          {t('booth.title')}
        </h4>
        <p className="text-base text-zinc-400 pt-1 max-w-2xl">
          {t('booth.room.sub', 'Record yourself over one of your songs. Everything stays on this device until you keep the take.')}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <WhatItIs />
      </div>

      {status && <p className="text-sm text-amber-300">{status}</p>}

      {tracks.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center space-y-3">
          <Music className="w-8 h-8 mx-auto text-zinc-600" />
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            {t('booth.room.none', 'There is nothing to sing on yet. Make a song first — a backing track with no vocal on it is the one to ask for if you plan to sing it yourself.')}
          </p>
          <button
            type="button"
            onClick={onGoToMake}
            className="px-4 py-2 rounded-xl text-sm bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400 inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {t('booth.room.goMake', 'Make a song')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-zinc-500">{t('booth.room.pick', 'Pick a song to sing on.')}</p>
          {tracks.map((track) => (
            <div
              key={track.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 flex items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                <p className="text-xs text-zinc-500 truncate">
                  {track.genre} · {track.bpm} BPM · {track.key}
                  {track.mixOf ? ` · ${t('booth.room.sungOn', 'you sang on this')}` : ''}
                  {track.stems ? ` · ${t('booth.room.isSplit', 'split')}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openOn(track)}
                disabled={opening !== null}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5 disabled:opacity-50"
              >
                {opening === track.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : track.mixOf ? (
                  <Sliders className="w-3.5 h-3.5" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
                {track.mixOf
                  ? t('make.editMix', 'Open it up again')
                  : t('booth.room.open', 'Open the booth')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
