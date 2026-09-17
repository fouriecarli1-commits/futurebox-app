'use client';

/**
 * ProBooth — its own room, on the rail, with a door you can find.
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
 * This is that rung. It does one thing the booth cannot do for itself: it says
 * which song to sing on, whether that song was made here or brought in from a
 * file.
 *
 * ── The rebuild of 15 September 2026 ─────────────────────────────────────
 *
 * Carli: *"Kyk ook na die landing page van die booth. Dit moet baie meer
 * exciting verduidelik wat hierdie kamer is. Die liedjies wat jy wil verander
 * moet nie so lank uitgelê word nie, daar moet eerder net 2 buttons wees. Een
 * wat sê Choose a song en dit het 'n drop down. Twee Bring a song in. Hierdie
 * landing page moet ook donker en blou wees soos die hele booth se tema."*
 *
 * Three things, and each of them was a real fault.
 *
 * The room was a **list**. Every song on the device got a card of its own with
 * its genre, its tempo, its key and a button — twelve songs was a screen and a
 * half of scrolling before the room said anything about itself. A door does
 * not need a card per key. It is a dropdown and a way to bring a file in, and
 * the page ends.
 *
 * The room was **white**. Everything in here is `zinc`, and the theme this app
 * ships is LIGHT and inverts the surface ramp, so `bg-zinc-900` resolved to a
 * pale grey: the front door of the one room that is meant to be black with a
 * blue line was the only part of it that was not. `data-booth` gives the whole
 * slab the fixed dark ramp the timeline already uses, and `boothlook.ts` gives
 * it the blue — one file, so the door and the room behind it cannot drift
 * apart the way four copies of a colour did before.
 *
 * And the room was **quiet about itself**. Five grey lines of what it can do,
 * in the same weight as everything else. What it can actually do is the reason
 * somebody opens it.
 *
 * The recording, the mixing and the separating all still live in `VocalBooth`
 * and `ProBooth`. Nothing here duplicates them, because a second copy of the
 * booth is exactly the failure this is fixing.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Layers, Loader2, Mic, Music, Scissors, Sliders, Sparkles, Upload, Waves } from 'lucide-react';
import { getAudio, loadTracks, saveTracks, type Track } from '../lib/library';
import { addUpload, loadUploads } from '../lib/uploads';
import { readAudio } from '../lib/trackaudio';
import { keepMix, takeId } from '../lib/takekeep';
import { useLang } from '../lib/i18n';
import { EDGE, INK, INK_DIM, LIT, PANEL, RAISED, VOID } from '../lib/boothlook';
import { useCopilotOps, matchByTitle } from '../lib/copilotactions';
import * as cloud from '../lib/cloud';
import VocalBooth from './VocalBooth';

/**
 * What the room is, said the way somebody would say it out loud.
 *
 * Five things, each one a sentence somebody can picture themselves doing. It
 * used to be five grey lines with a question mark beside each on a phone,
 * which is the shape of a settings list rather than of a room worth walking
 * into — and the sentence behind the mark was the half that made anybody want
 * to.
 *
 * The icons carry the blue and the words carry the weight, so the strip reads
 * at a glance and still says something when it is read properly.
 */
function WhatItIs(): React.ReactElement {
  const { t } = useLang();
  const points = [
    {
      icon: Mic,
      name: t('booth.room.sing.t', 'Sing on your own song'),
      text: t('booth.room.sing2', 'The words move in time and a count-in brings you in, so you know exactly where to come in.'),
    },
    {
      icon: Waves,
      name: t('booth.room.see.t', 'Both takes, one clock'),
      text: t('booth.room.see2', 'The backing above, your voice below, on one clock — you can see where you are, not just hear it.'),
    },
    {
      icon: Scissors,
      name: t('booth.room.punch.t', 'Redo one line'),
      text: t('booth.room.punch2', 'Drag across the line that went wrong and sing only that. Everything else you already did is kept.'),
    },
    {
      icon: Layers,
      name: t('booth.room.split.t', 'Lift the AI voice out'),
      text: t('booth.room.split2', 'Split the song, take the generated voice out, and put your own where it was.'),
    },
    {
      icon: Sliders,
      name: t('booth.room.lanes.t', 'Lanes and levels'),
      text: t('booth.room.lanes2', 'A real timeline: lanes, cutting, tone and a mix you can master — for when one voice over one song is not enough.'),
    },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {points.map((point) => {
        const Icon = point.icon;
        return (
          <div
            key={point.name}
            className="flex items-start gap-3 rounded-2xl p-3"
            style={{ background: PANEL, border: `1px solid ${EDGE}` }}
          >
            <span
              className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'rgba(56,189,248,0.14)', color: LIT }}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight" style={{ color: INK }}>
                {point.name}
              </span>
              <span className="block pt-0.5 text-xs leading-snug" style={{ color: INK_DIM }}>
                {point.text}
              </span>
            </span>
          </div>
        );
      })}
    </div>
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
  const [taking, setTaking] = useState(false);
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

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
    /* Songs brought in from a file, and songs a collaborator handed over,
       stand beside the channel here. They are not in it — the channel is what
       you made — but the booth is exactly where somebody wants them: this is
       the room you sing on top of something in. */
    const given = loadUploads();
    setTracks([...local, ...given]);
    if (!cloud.configured()) return;
    let live = true;
    // Same as the make screen: what is on the device shows first, and a song
    // made on another one arrives when the network says so.
    cloud.syncChannel(local, getAudio).then((merged) => {
      if (!live) return;
      setTracks([...merged, ...loadUploads()]);
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

  /**
   * A song from a file, and straight into the room with it.
   *
   * Decoded before it is kept, so a file this browser cannot play is refused
   * here with a sentence rather than in the booth with silence under the
   * words. It opens as soon as it lands: nobody picks a file to sing on and
   * then means to sing on a different one.
   */
  const bringIn = async (file: File | null) => {
    if (!file) return;
    setStatus('');
    setTaking(true);
    try {
      const added = await addUpload(file);
      setTracks((was) => [...was, added]);
      await openOn(added);
    } catch (error) {
      const why = error instanceof Error ? error.message : '';
      setStatus(
        why === 'too-big'
          ? t('booth.tooBig', 'That file is over 60 MB. Export it smaller and bring it in again.')
          : t('booth.unreadable', 'This browser could not read that audio. MP3, WAV or M4A work.'),
      );
    } finally {
      setTaking(false);
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

  /* ── Four groups, because a song somebody SENT you is its own thing ──

     Three were: what you wrote here, what you have already sung on, and
     what you brought in from somewhere else. A flat list of twelve names
     says none of that.

     The fourth is the one that was missing, and it was missing with the
     words for it already written down: `booth.given` — "Sent to you by" —
     has been in the dictionary since the collab room learned to hand a song
     over, and nothing in the app has ever rendered it. `lib/uploads` records
     `givenBy` on the way in, `SongScreen` credits it, and the booth — the
     room the collab room sends you TO — listed it under "Brought in from a
     file" as though you had dragged it off your own phone.

     Which is not a cosmetic difference. A song a bandmate sent is the one
     song in that list you did not choose the name of, so the name alone may
     mean nothing to you; and it is the one where whose song it is matters,
     because you are about to sing on it.

     `audit/collabbooth.mjs` has been asserting this for as long as the key
     has existed. It could not report it: the terms box was stopping that
     probe at the front door, and before that it was one of the sixty nobody
     ran. Found by repairing the door. */
  const sung = tracks.filter((one) => one.mixOf);
  const given = tracks.filter((one) => !one.mixOf && one.source === 'upload' && one.givenBy);
  const brought = tracks.filter((one) => !one.mixOf && one.source === 'upload' && !one.givenBy);
  const mine = tracks.filter((one) => !one.mixOf && one.source !== 'upload');

  /* One button, and it is the same shape every time it is drawn: a bar the
     width of the room, 52 tall, with a border it can be seen by.

     Carli: *"die buttons daarin moet meer reguit, horisontaal, dieselfde size
     op mekaar gestack wees. Dit moet definisie hê en lyk soos 'n button wat
     uit staan."* A row of buttons each sized by its own words is a row where
     the important one is whichever happens to have the longest label. */
  const BAR = 'flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold disabled:opacity-50';

  return (
    <div
      /* The fixed dark ramp, the same flag the timeline carries. Everything
         drawn inside here is the booth, so `bg-zinc-900` in a child means a
         dark panel rather than the near-white the shipped light theme would
         otherwise hand it. */
      data-booth
      data-boothdoor=""
      className="space-y-5 rounded-3xl p-4 sm:p-6"
      style={{ background: VOID, border: `1px solid ${EDGE}`, color: INK }}
    >
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

      {/* ── What this room is ───────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
          style={{ background: 'rgba(56,189,248,0.16)', color: LIT, boxShadow: `0 0 0 1px ${EDGE}` }}
        >
          <Mic className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h4 className="text-2xl font-black leading-tight tracking-tight" style={{ color: INK }}>
            {t('booth.title')}
          </h4>
          {/* Full strength. This is the sentence that says what the room is
              — the first thing read and the reason to go in — and it was
              drawn as though it were a caption under something else. */}
          <p className="max-w-2xl pt-1 text-sm leading-snug sm:text-base" style={{ color: INK }}>
            {t(
              'booth.room.sub2',
              'A real recording room, in your phone. Put your headphones on, pick a song, and sing it yourself — the words move in time, the take lands on its own lane, and nothing leaves this device until you say keep.',
            )}
          </p>
        </div>
      </div>

      {/* ── The two buttons ─────────────────────────────────────────────

          Carli: *"daar moet eerder net 2 buttons wees. Een wat sê Choose a
          song en dit het 'n drop down. Twee Bring a song in."*

          The dropdown opens the room the moment a song is chosen. It could
          have set a choice and waited behind a third button, and that third
          button would have been a press that does nothing but agree with the
          press before it.

          Above what the room can do, and not below it. The first build of
          this put the five things the room does first and the way in under
          them, which on a 390-pixel phone is the door below the fold: a page
          that describes itself for a full screen before offering to do
          anything. What it can do is the reason to press; the press comes
          first and reads as the answer to it. */}
      <div className="space-y-2">
        <div className="relative">
          <select
            data-pickasong=""
            aria-label={t('booth.choose', 'Choose a song')}
            value=""
            disabled={tracks.length === 0 || opening !== null || taking}
            onChange={(event) => {
              const found = tracks.find((one) => one.id === event.target.value);
              if (found) void openOn(found);
            }}
            className={`${BAR} appearance-none pr-12`}
            style={{ background: RAISED, border: `1px solid ${LIT}`, color: INK }}
          >
            <option value="">
              {tracks.length === 0
                ? t('booth.chooseNone', 'No song on this device yet')
                : t('booth.choose', 'Choose a song')}
            </option>
            {mine.length > 0 && (
              <optgroup label={t('booth.mine', 'Songs you made')}>
                {mine.map((one) => (
                  <option key={one.id} value={one.id}>{one.title}</option>
                ))}
              </optgroup>
            )}
            {sung.length > 0 && (
              <optgroup label={t('booth.sung', 'You already sang on these')}>
                {sung.map((one) => (
                  <option key={one.id} value={one.id}>{one.title}</option>
                ))}
              </optgroup>
            )}
            {/* The giver's name on the option itself, not only on the
                group, because a group heading is read once and the names
                under it are read one at a time — and two people can each
                have sent you something. */}
            {given.length > 0 && (
              <optgroup label={t('booth.given', 'Sent to you by')}>
                {given.map((one) => (
                  <option key={one.id} value={one.id}>
                    {one.title} — {one.givenBy}
                  </option>
                ))}
              </optgroup>
            )}
            {brought.length > 0 && (
              <optgroup label={t('booth.brought', 'Brought in from a file')}>
                {brought.map((one) => (
                  <option key={one.id} value={one.id}>{one.title}</option>
                ))}
              </optgroup>
            )}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center" style={{ color: LIT }}>
            {opening !== null ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronDown className="h-5 w-5" />}
          </span>
        </div>

        {/* ── And it says so before the list is opened ──────────────────

            The group heading inside the dropdown is the right place for
            WHICH of them came from whom, and it is the wrong place for the
            fact that any did: a `<optgroup>` label is only on the screen
            while the list is open, and a person who does not know there is
            something waiting for them has no reason to open it. It is not
            even in the page's text — Chromium's `innerText` returns an
            option's words and not its group's, which is how the probe found
            this half of it.

            So the fact is a line, and the names are on it. One when one
            person sent something, both when two did — a list rather than a
            count, because "2 songs were sent to you" is a sentence that
            makes somebody open the dropdown to find out who. */}
        {given.length > 0 && (
          <p className="text-xs leading-snug" style={{ color: LIT }}>
            {t('booth.given', 'Sent to you by')}{' '}
            {[...new Set(given.map((one) => one.givenBy).filter(Boolean))].join(', ')}
          </p>
        )}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={taking || opening !== null}
          className={BAR}
          style={{ background: RAISED, border: `1px solid ${EDGE}`, color: INK }}
        >
          {taking ? <Loader2 className="h-5 w-5 animate-spin" style={{ color: LIT }} />
                  : <Upload className="h-5 w-5" style={{ color: LIT }} />}
          {t('booth.bring', 'Bring a song in')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(event) => {
            void bringIn(event.target.files?.[0] ?? null);
            event.target.value = '';
          }}
        />

        {/* The one thing this room cannot do for itself, and only when it
            applies: with nothing on the device, "choose a song" is a dropdown
            with nothing in it and the way out is the make screen. */}
        {tracks.length === 0 && (
          <button
            type="button"
            onClick={onGoToMake}
            className={BAR}
            style={{ background: RAISED, border: `1px solid ${EDGE}`, color: INK }}
          >
            <Sparkles className="h-5 w-5" style={{ color: LIT }} />
            {t('booth.room.goMake', 'Make a song')}
          </button>
        )}

        <p className="flex items-start gap-1.5 pt-1 text-xs leading-snug" style={{ color: INK_DIM }}>
          <Music className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          {t('booth.free', 'Singing, redoing a line and mixing cost nothing. The paid steps inside — cleaning a take, splitting a song — say their own price at their own button.')}
        </p>
      </div>

      <WhatItIs />

      {status && (
        <p role="alert" className="text-sm font-semibold leading-snug" style={{ color: '#fbbf24' }}>
          {status}
        </p>
      )}
    </div>
  );
}
