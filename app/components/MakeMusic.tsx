'use client';

/**
 * Make — press a button, get a song you can hear.
 *
 * The complaint that produced this screen was the right one: someone went
 * looking for a way to make a song and there was nothing to press. Everything
 * here is built around that one moment working — you press Make, a few seconds
 * later there is real audio in your channel, and you can play it, keep it,
 * share it or make another take.
 *
 * The words are kept ordinary on purpose. No "render", no "pipeline", no
 * "generation" — make a song, listen, save it, try again.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Music, Play, Pause, Download, Share2, Repeat, Trash2, Sparkles, Wand2, Loader2,
  Video as VideoIcon, X, Mic,
  Sliders,
} from 'lucide-react';
import { renderSketch, encodeWav, familyFor, sketchDurationSeconds } from '../lib/audio';
import {
  loadTracks, saveTracks, putAudio, getAudio, deleteAudio, downloadBlob, safeFilename,
  type Track,
} from '../lib/library';
import { durationOf, readAudio } from '../lib/trackaudio';
import { keepMix, takeId } from '../lib/takekeep';
import { engines, splitSections, type Stage } from '../lib/engines';
import { expect as expectWait, remember } from '../lib/timing';
import VideoPanel from './VideoPanel';
import NowPlaying from './NowPlaying';
import Sleeve from './Sleeve';
import VocalBooth from './VocalBooth';
import StyleFinder from './StyleFinder';
import LyricHelp from './LyricHelp';
import { STARTERS, VOICES, LENGTH_CHOICES, POLISH } from '../data/sound';
import { songCost } from '../lib/credits';
import { check, record, ENTITLEMENTS, type Plan } from '../lib/entitlements';
import { useLang } from '../lib/i18n';
import * as cloud from '../lib/cloud';
import { loadOwned, levelOf, startCheckout, downloadLink, NOTHING, type Owned } from '../lib/purchases';
import { loadSounds, training, NO_SOUNDS, type Sounds } from '../lib/sounds';

export interface Canvas {
  title: string;
  lyrics: string;
  /** Free text, so the copilot can set a sound no preset covers. */
  style: string;
}

export default function MakeMusic({
  userPlan,
  onUpgrade,
  incoming,
  canvas,
  setCanvas,
  makeSignal,
  onMade,
  onGoToChannel,
  engineReady,
}: {
  userPlan: Plan;
  onUpgrade: () => void;
  /** Carried over from the Songwriter, when you came from there. */
  incoming?: { title: string; lyrics: string; style: string } | null;
  /** Held by the studio, because the copilot writes to it too. */
  canvas: Canvas;
  setCanvas: (next: Canvas) => void;
  /** Bumped by the copilot to press the button from over there. */
  makeSignal: number;
  /** Fires when a track lands, so the studio can offer a video. */
  onMade: (track: Track) => void;
  /** A sound of your own is trained there, not here. */
  onGoToChannel: () => void;
  engineReady: boolean;
}) {
  const { t } = useLang();
  const title = canvas.title;
  const lyrics = canvas.lyrics;
  const setTitle = (value: string) => setCanvas({ ...canvas, title: value });
  const setLyrics = (value: string) => setCanvas({ ...canvas, lyrics: value });
  const [bpm, setBpm] = useState(112);
  const [songKey, setSongKey] = useState('A Minor');
  const [seconds, setSeconds] = useState(60);
  const [voice, setVoice] = useState(VOICES[1]);
  /**
   * A sound of your own, trained in the channel on your own songs.
   *
   * Empty means the ordinary model. Only finished ones are ever offered — a
   * finetune that is still training would be refused upstream, and a person
   * watching a spinner does not need a second one.
   */
  const [sounds, setSounds] = useState<Sounds>(NO_SOUNDS);
  const [ownSound, setOwnSound] = useState('');
  /**
   * Ask for a backing track instead of a sung one, so you can sing it yourself.
   *
   * The words still go into the plan's section names, so the song keeps its
   * shape and the lyrics still follow the music on the way back — there is just
   * nobody singing them yet.
   */
  const [singItYourself, setSingItYourself] = useState(false);
  /** Which track a vocal is being recorded over, if any. */
  const [takeFor, setTakeFor] = useState<{ track: Track; music: Blob; take?: Blob | null } | null>(null);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [busy, setBusy] = useState(false);

  /**
   * The list of your own trained sounds.
   *
   * Asked once, and then again while one is still training. Training takes
   * five or ten minutes on somebody else's GPUs, and asking once meant a sound
   * that finished while this screen was open never appeared — you trained it,
   * came back to make a song, saw nothing, and had no way to tell whether it
   * had failed or you had imagined the whole feature.
   */
  useEffect(() => {
    let live = true;
    const ask = () => {
      loadSounds().then((next) => {
        if (!live) return;
        setSounds(next);
      });
    };
    ask();
    const beat = setInterval(ask, 20_000);
    return () => {
      live = false;
      clearInterval(beat);
    };
  }, []);

  const readySounds = sounds.mine.filter((one) => one.status === 'completed');
  const stillTraining = sounds.mine.filter(training);
  /**
   * Whether the next song is generated in a sound of your own.
   *
   * Its own tick rather than "the ordinary engine" being one card among the
   * trained ones. The report was right that this is a decision about the next
   * song, not a preset: it is on or it is off, and the picker underneath only
   * matters once it is on. Unticking clears the choice, so what is on screen
   * and what is sent can never disagree.
   */
  const useOwnSound = ownSound !== '';
  const toggleOwnSound = (on: boolean) => {
    // Ticking with nothing chosen would be a tick that does nothing until you
    // also pick, which is a trap. It takes the first finished one.
    setOwnSound(on ? (readySounds[0]?.id ?? '') : '');
  };

  // A sound that was picked and has since been deleted, or failed, must not
  // quietly go with the next request.
  useEffect(() => {
    if (ownSound && !readySounds.some((one) => one.id === ownSound)) setOwnSound('');
  }, [ownSound, readySounds]);
  /**
   * Seconds since the button was pressed.
   *
   * A real generation takes thirty to sixty seconds, which is long enough that
   * a static line reads as a frozen screen. A number that keeps moving is the
   * difference between waiting and wondering whether to reload.
   */
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const tick = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [busy]);
  /**
   * Where the generation has got to, as reported by the engine.
   *
   * Only ever set from something observed. The long middle stretch has no
   * progress to report because the music service reports none, and the panel
   * below says exactly that rather than drawing a bar that moves on a timer.
   */
  const [stage, setStage] = useState<Stage | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  /**
   * Exactly what is coming out of the speakers.
   *
   * Kept as its own state rather than read back off the library, because the
   * waveform is drawn from these bytes and a picture of a different piece of
   * audio than the one playing is worse than no picture.
   */
  const [playingBlob, setPlayingBlob] = useState<Blob | null>(null);
  const [shared, setShared] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  // Making a video is the same job here as on its own tab, so it is the same
  // component. This screen only decides which track it is pointed at.
  const [videoFor, setVideoFor] = useState<Track | null>(null);
  /** What has been paid for. Refreshed after a payment returns. */
  const [owned, setOwned] = useState<Owned>(NOTHING);
  const [buying, setBuying] = useState<string | null>(null);
  useEffect(() => {
    loadOwned().then(setOwned);
  }, []);

  /** What the music engine is told. Free text from the copilot wins over the
   *  preset chips, because it is the more specific thing the person asked for. */
  /**
   * What the engine is actually told.
   *
   * The written field leads, because it is the specific thing this person
   * asked for. The voice direction follows, then generic production words to
   * reach the six or seven styles the model works best with. Order matters:
   * the model weights early styles more heavily.
   */
  const styleText = (() => {
    const written = canvas.style.trim();
    const parts = written ? written.split(',').map((p) => p.trim()).filter(Boolean) : [];
    if (voice.words) voice.words.split(',').forEach((w) => parts.push(w.trim()));
    POLISH.forEach((extra) => {
      if (parts.length < 8 && parts.indexOf(extra) === -1) parts.push(extra);
    });
    return parts.join(', ');
  })();

  useEffect(() => {
    const local = loadTracks();
    setTracks(local);
    if (!cloud.configured()) return;
    let live = true;
    // Songs made on another device belong in this channel too. The device's own
    // list shows first so nothing waits on the network to appear.
    cloud.syncChannel(local, getAudio).then((merged) => {
      if (!live) return;
      setTracks(merged);
      saveTracks(merged);
    });
    return () => {
      live = false;
    };
  }, []);

  // A bump means the copilot asked for the song, and the person said yes.
  const madeFor = useRef(0);
  useEffect(() => {
    if (makeSignal > madeFor.current) {
      madeFor.current = makeSignal;
      void make();
    }
    // `make` is stable enough for this: re-running on its identity would fire
    // the generation again every time a field changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makeSignal]);

  useEffect(() => {
    // A style handed over from the Songwriter is text, and the field is text.
    // It used to be matched against a fixed list and thrown away when nothing
    // matched, which quietly lost whatever the writer had actually asked for.
    const starter = STARTERS.find((entry) =>
      (incoming?.style ?? '').toLowerCase().includes(entry.name.toLowerCase()),
    );
    if (starter) setBpm(starter.bpm);
  }, [incoming?.style]);

  // One audio element for the whole screen, so pressing play on a second track
  // stops the first instead of talking over it.
  useEffect(() => {
    const element = new Audio();
    element.addEventListener('ended', () => setPlaying(null));
    audioRef.current = element;
    return () => {
      element.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const make = useCallback(
    async (remixOf?: Track) => {
      const gate = check('publish.release', userPlan);
      if (!gate.allowed) {
        setStatus(gate.reason);
        return;
      }
      const name = (remixOf ? `${remixOf.title} ${t('make.takeSuffix')}` : title).trim() || 'Untitled';
      const began = Date.now();
      setBusy(true);
      setStage(null);
      setStatus(t('make.goingNote'));

      // Yields once so the button visibly changes before the work starts.
      await new Promise((resolve) => setTimeout(resolve, 60));

      try {
        const spec = {
          bpm: remixOf?.bpm ?? bpm,
          key: remixOf?.key ?? songKey,
          family: familyFor(remixOf?.genre ?? canvas.style, canvas.style.split(',')),
          // The sketch engine counts bars; the person chose seconds. Four beats
          // to a bar at the chosen tempo is the conversion.
          bars: Math.max(8, Math.round((seconds * bpm) / 240)),
          seed: Math.floor(Math.random() * 1_000_000),
        };

        // A connected engine takes over here; until then we render the sketch.
        let blob: Blob;
        let source: Track['source'] = 'sketch';
        let models: string[] = ['FutureBox sketch'];
        if (engines.available('audio')) {
          const result = await engines.generateAudio({
            title: name,
            style: styleText,
            lyrics,
            bpm: spec.bpm,
            key: spec.key,
            // The chosen length, not the sketch's own — the engine is being
            // asked for a song, and the sketch is only a fallback.
            seconds,
            // "No vocal" has to mean no vocal. Leaving the style words empty
            // asked for nothing in particular and the engine sang anyway.
            instrumental: singItYourself || voice.id === 'none',
            finetuneId: ownSound || undefined,
            onStage: setStage,
          });
          blob = result.blob;
          source = 'engine';
          // Said on the release, because a backing with no voice on it is a
          // different thing from a finished song and the channel should not
          // present them as the same.
          // A trained sound is part of what made the record, so it is named
          // on the release like everything else that was.
          const trained = sounds.mine.find((one) => one.id === ownSound);
          models = [result.model]
            .concat(singItYourself ? ['Backing — no vocal'] : [])
            .concat(trained ? [`Trained on your own songs — ${trained.name}`] : []);
        } else {
          blob = encodeWav(renderSketch(spec));
        }


        setStage({ at: 'saving' });
        // How long that really took, kept so the next one can be told what to
        // expect. Only real runs are recorded, and only ones that finished.
        if (source === 'engine') remember(seconds, Math.round((Date.now() - began) / 1000));

        // What the library will print. The sketch's arithmetic describes the
        // sketch; when a real engine made this, the file itself is asked, and
        // the chosen length stands in only if it cannot be read.
        const length =
          source === 'engine' ? ((await durationOf(blob)) ?? seconds) : sketchDurationSeconds(spec);

        // The plan this song was made from, kept so the words can follow the
        // music later. Only for a real generation: a sketch has no singing in
        // it, so following a lyric sheet over one would be following nothing.
        const plan = source === 'engine' ? splitSections(lyrics, seconds) : [];

        const id = `t-${Date.now()}`;
        await putAudio(id, blob);

        const track: Track = {
          id,
          title: name,
          genre: remixOf?.genre ?? (canvas.style.split(',')[0] || 'Untitled style').trim(),
          bpm: spec.bpm,
          key: spec.key,
          lyrics,
          style: styleText,
          models,
          source,
          seconds: Math.round(length),
          createdAt: new Date().toISOString(),
          seed: spec.seed,
          ...(plan.length
            ? { parts: plan, plannedSeconds: plan.reduce((total, part) => total + part.seconds, 0) }
            : {}),
          ...(remixOf ? { remixOf: remixOf.id } : {}),
        };

        const next = [track, ...tracks];
        setTracks(next);
        saveTracks(next);
        record('publish.release');
        setStatus(remixOf ? t('make.doneTake') : t('make.done'));

        // The song is already playable. Copying it to the account happens after,
        // so a slow upload never holds up the thing you just made.
        cloud.pushTrack(track, blob).then((result) => {
          if (result.saved) {
            setStatus(t('auth.savedToAccount'));
          } else if (result.reason !== 'off') {
            // The song is safe on the device either way, but if it did not reach
            // the account you have to be told — otherwise you find out by
            // opening your phone and seeing an empty channel.
            setStatus(result.message);
          }
        });
        onMade(track);
      } catch (error) {
        // The reason travels all the way here and used to be dropped on the
        // floor: `catch {}` without binding it, then a generic line. The music
        // route answers with something specific — out of credits, key rejected,
        // request too long — and that is the only thing that tells anyone what
        // to do next.
        const reason = error instanceof Error ? error.message.trim() : '';
        setStatus(reason || t('make.failed'));
      } finally {
        setBusy(false);
        setStage(null);
      }
    },
    [bpm, canvas.style, lyrics, onMade, ownSound, seconds, singItYourself, songKey, sounds.mine, styleText, t, title, tracks, userPlan, voice.id],
  );

  const toggle = async (track: Track) => {
    const element = audioRef.current;
    if (!element) return;
    if (playing === track.id) {
      element.pause();
      setPlaying(null);
      return;
    }
    setPlayingBlob(null);
    const blob = await readAudio(track.id);
    if (!blob) {
      setStatus(t('make.missing'));
      return;
    }
    /* Played as it was made.

       This used to lay an audible mark over anything unbought. A song made
       with free credits is a finished song — the plan sells more of them and
       the stored master, not the removal of damage done to this one — so
       there is nothing to mark and nothing to strip. */
    const playable = blob;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(playable);
    element.src = urlRef.current;
    await element.play();
    setPlaying(track.id);
    setPlayingBlob(playable);
  };

  /**
   * A finished take becomes its own track rather than replacing the backing.
   *
   * The backing is worth keeping: you may want a second take, or a different
   * singer, and overwriting it would make the first take a decision you cannot
   * undo. The words and the section plan carry across, so the lyrics still
   * follow the music on the new one.
   */
  /**
   * Remember that a song has been split, so the booth can offer what that
   * makes possible without going to the database to find out.
   */
  const markSplit = (over: Track) => {
    const next = tracks.map((one) => (one.id === over.id ? { ...one, stems: true } : one));
    setTracks(next);
    saveTracks(next);
  };

  const keepTake = async (over: Track, mixed: Blob, doubled: boolean, take: Blob) => {
    const sung = await keepMix(over, mixed, doubled, take, t('make.withYourVoice', 'with your voice'));
    const next = [sung, ...tracks];
    setTracks(next);
    saveTracks(next);
    setTakeFor(null);
    setStatus(t('take.kept', 'Your take is in your channel.'));
    onMade(sung);
    void cloud.pushTrack(sung, mixed);
  };

  const save = async (track: Track) => {
    const answer = await downloadLink(track.id);
    if ('url' in answer) {
      // A signed URL from the private bucket — the clean file, never the marked
      // one, because reaching this line means it has been paid for.
      window.location.href = answer.url;
      return;
    }
    if (!answer.message) {
      // No accounts configured, so there is nothing to check and nothing
      // stored: the device's own copy is the download, as it always was.
      const blob = await readAudio(track.id);
      if (blob) downloadBlob(blob, safeFilename(track.title, 'wav'));
      return;
    }
    setStatus(answer.message);
  };

  const share = async (track: Track) => {
    const line = `${track.title} — ${track.genre}, ${track.bpm} BPM. Made on FutureBox.`;
    const blob = await readAudio(track.id);
    const canShareFile =
      typeof navigator !== 'undefined' && 'share' in navigator && blob && 'canShare' in navigator;
    try {
      if (canShareFile) {
        const file = new File([blob!], safeFilename(track.title, 'wav'), { type: 'audio/wav' });
        if ((navigator as Navigator & { canShare(d: unknown): boolean }).canShare({ files: [file] })) {
          await navigator.share({ title: track.title, text: line, files: [file] });
          return;
        }
        await navigator.share({ title: track.title, text: line });
        return;
      }
      await navigator.clipboard.writeText(line);
      setShared(track.id);
      setTimeout(() => setShared(null), 2000);
    } catch {
      // Someone closed the share sheet. Nothing to report.
    }
  };

  const remove = async (track: Track) => {
    if (playing === track.id) {
      audioRef.current?.pause();
      setPlaying(null);
    }
    await deleteAudio(track.id);
    const next = tracks.filter((t) => t.id !== track.id);
    setTracks(next);
    saveTracks(next);
    // Otherwise it would come back on the next sync.
    await cloud.removeTrack(track.id);
  };

  const left = check('publish.release', userPlan).remaining;

  return (
    <div className="space-y-6">
      {/* Full screen and over everything: singing wants the whole window, not a
          panel inside a form. */}
      {takeFor && (
        <VocalBooth
          track={takeFor.track}
          music={takeFor.music}
          startTake={takeFor.take ?? null}
          onKeep={(mixed, doubled, take) => keepTake(takeFor.track, mixed, doubled, take)}
          onSplit={() => markSplit(takeFor.track)}
          onClose={() => setTakeFor(null)}
        />
      )}

      <div>
        <h4 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Music className="w-6 h-6 text-emerald-400" />
          {t('make.title')}
        </h4>
        <p className="text-base text-zinc-400 pt-1 max-w-2xl">
          {t('make.sub')}
        </p>
      </div>

      {/* Set it up */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
        <div>
          <label className="text-sm text-zinc-400">{t('make.name')}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('make.namePlaceholder')}
            className="w-full mt-1 bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 text-base text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* The words, on the same page as the button that sings them. With a
            real engine these are what gets sung; without one they still travel
            with the track, so nothing typed here is lost. */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label className="text-sm text-zinc-400">{t('make.words')}</label>
            {canvas.style && <span className="text-sm text-emerald-400 truncate max-w-[60%]">{canvas.style}</span>}
          </div>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder={t('make.wordsPlaceholder')}
            rows={8}
            className="w-full mt-1 bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 text-base text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 leading-relaxed resize-y"
          />
          <p className="text-sm text-zinc-500 pt-1">
            {engineReady ? t('make.wordsReal') : t('make.wordsSketch')}
          </p>

          {/* Help with the words, beside the words. This used to be its own
              screen, which meant the lyrics you were helped with lived
              somewhere other than the box you generate from. */}
          <div className="pt-2">
            <LyricHelp
              title={title}
              style={canvas.style}
              lyrics={lyrics}
              onLyrics={setLyrics}
            />
          </div>
        </div>

        {/* The style field is the whole instrument: ElevenLabs Music has no
            genre setting and no voice picker, only a list of plain-English
            directions. So this is open text, and the chips below add to it
            rather than replacing it — twelve fixed buttons was a smaller
            instrument than the model can play. */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label className="text-sm text-zinc-400">{t('make.sound')}</label>
            {canvas.style && (
              <button
                type="button"
                onClick={() => {
                  setCanvas({ ...canvas, style: '' });
                }}
                className="text-sm text-zinc-500 hover:text-white"
              >
                {t('make.clear')}
              </button>
            )}
          </div>
          <textarea
            value={canvas.style}
            onChange={(e) => setCanvas({ ...canvas, style: e.target.value })}
            placeholder={t('make.soundPlaceholder')}
            rows={3}
            className="w-full mt-1 bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 text-base text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 leading-relaxed resize-y"
          />
          <p className="text-sm text-zinc-500 pt-1">{t('make.soundNote')}</p>

          <div className="mt-3">
            <StyleFinder
              style={canvas.style}
              title={title}
              lyrics={lyrics}
              onBpm={setBpm}
              onStyle={(next, how) => {
                const current = canvas.style.trim();
                setCanvas({
                  ...canvas,
                  style: how === 'append' && current ? `${current}, ${next}` : next,
                });
              }}
            />
          </div>
        </div>

        {/* A voice is described, not chosen — there is no voice parameter in the
            Music API. These words lean on breath, room and imperfection, because
            the usual complaint about generated singing is that it is too clean,
            and asking for the flaw works better than asking for "realistic". */}
        {/* Sing it yourself. ElevenLabs cannot be handed your voice — their
            cloning is for speech and the Music API takes no voice at all — so
            the honest route is a backing track and a real recording. */}
        <label className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={singItYourself}
            onChange={(event) => setSingItYourself(event.target.checked)}
            className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-zinc-200">{t('make.singSelf')}</span>
            <span className="block text-sm text-zinc-500 leading-snug">{t('make.singSelfNote')}</span>
          </span>
        </label>

        <div className={singItYourself ? 'opacity-40 pointer-events-none' : undefined}>
          <label className="text-sm text-zinc-400">{t('make.voice')}</label>
          <p className="text-sm text-zinc-600 leading-snug pt-0.5">
            {t('make.voiceNote', 'A direction, not a switch: the engine has no voice setting, so this goes to it in words. It usually follows, and now and then it does not.')}
          </p>
          <div className="grid sm:grid-cols-3 gap-2 mt-1.5">
            {VOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => setVoice(choice)}
                className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                  voice.id === choice.id
                    ? 'bg-emerald-500/15 border-emerald-500'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <span className={`block text-sm font-semibold ${voice.id === choice.id ? 'text-emerald-300' : 'text-zinc-200'}`}>
                  {choice.name}
                </span>
                <span className="block text-sm text-zinc-500 leading-snug pt-0.5">{choice.sounds}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            {/* Tied to the slider rather than sitting above it.

                A label with no `htmlFor` is a sentence next to a control, not
                a name for it: the slider read out as "slider, 112" with
                nothing saying what 112 counted. It was the only unnamed
                control left in the studio. */}
            <label className="text-sm text-zinc-400" htmlFor="make-bpm">
              {t('make.speed')} — {bpm} {t('make.bpm')}
            </label>
            <input
              id="make-bpm"
              type="range"
              min={60}
              max={180}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-full mt-2 accent-emerald-500"
            />
            <p className="text-sm text-zinc-600">{bpm < 95 ? t('make.slow') : bpm < 125 ? t('make.steady') : t('make.fast')}</p>
          </div>
          <div>
            <label className="text-sm text-zinc-400">{t('make.mood')}</label>
            <select
              value={songKey}
              onChange={(e) => setSongKey(e.target.value)}
              className="w-full mt-1 bg-black/60 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="C Major">{t('make.mood.bright')}</option>
              <option value="G Major">{t('make.mood.warm')}</option>
              <option value="A Minor">{t('make.mood.thoughtful')}</option>
              <option value="D Minor">{t('make.mood.dark')}</option>
              <option value="F Minor">{t('make.mood.heavy')}</option>
            </select>
          </div>
        </div>

        {/* Lengths in seconds. Bars only mean something once you know the tempo,
            so "32 bars" answered a question nobody asked. */}
        <div>
          <label className="text-sm text-zinc-400">{t('make.length')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
            {LENGTH_CHOICES.map((choice) => (
              <button
                key={choice.seconds}
                type="button"
                onClick={() => setSeconds(choice.seconds)}
                className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                  seconds === choice.seconds
                    ? 'bg-emerald-500/15 border-emerald-500'
                    : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <span className={`block text-sm font-semibold ${seconds === choice.seconds ? 'text-emerald-300' : 'text-zinc-200'}`}>
                  {choice.label}
                </span>
                <span className="block text-sm text-zinc-500 leading-snug">{choice.note}</span>
                <span className="block text-xs text-zinc-500 pt-0.5">
                  {songCost(choice.seconds)} {t('video.credits', 'credits')}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── A sound of your own ────────────────────────────────────────
            Directly above the button, because it is the last thing decided
            before the song is made rather than a setting filed with the tempo.
            It reads as part of pressing Make, which is what it is.

            It used to be hidden entirely unless you already had one, on the
            reasoning that an empty picker explaining a feature you do not have
            is a screen telling you off. Half right: what it produced instead
            was a feature nobody could find, which is the same failure the
            booth had. So it is always here, and what it says depends on where
            you actually are — the plan does not include it, none trained yet,
            one still training, or here they are.

            It is a tick because it is a decision about the next song rather
            than a preset: on or off, and the choice underneath only matters
            once it is on. */}
        {sounds.configured && sounds.signedIn && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useOwnSound}
                disabled={readySounds.length === 0}
                onChange={(event) => toggleOwnSound(event.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0 disabled:opacity-40"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-200">
                  {t('make.useOwnSound', 'Make it in a sound of my own')}
                </span>
                <span className="block text-sm text-zinc-500 leading-snug">{t('make.ownSoundNote')}</span>
              </span>
            </label>

            {/* Which one, once it is on. Only drawn when there is a choice to
                make — one trained sound and a picker of one is furniture. */}
            {useOwnSound && readySounds.length > 1 && (
              <div className="grid sm:grid-cols-3 gap-2 pt-0.5">
                {readySounds.map((one) => (
                  <button
                    key={one.id}
                    type="button"
                    onClick={() => setOwnSound(one.id)}
                    className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                      ownSound === one.id
                        ? 'bg-emerald-500/15 border-emerald-500'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <span className={`block text-sm font-semibold ${ownSound === one.id ? 'text-emerald-300' : 'text-zinc-200'}`}>
                      {one.name}
                    </span>
                    <span className="block text-sm text-zinc-500 leading-snug pt-0.5">
                      {one.genre} · {one.tracks} {t('make.ownSoundSongs', 'of your songs')}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {useOwnSound && readySounds.length === 1 && (
              <p className="text-sm text-emerald-300/90 leading-snug pl-6">
                {readySounds[0].name} — {readySounds[0].genre} · {readySounds[0].tracks}{' '}
                {t('make.ownSoundSongs', 'of your songs')}
              </p>
            )}

            {/* And when the tick cannot be used, why not — with the way out. */}
            {readySounds.length === 0 && (
              <div className="pl-6 space-y-1.5">
                {sounds.keep === 0 ? (
                  <>
                    <p className="text-sm text-zinc-500 leading-snug">{t('make.ownSoundNoPlan')}</p>
                    <button
                      type="button"
                      onClick={onUpgrade}
                      className="text-sm font-semibold text-emerald-400 hover:text-emerald-300"
                    >
                      {t('make.ownSoundSeePlans', 'See the plans')}
                    </button>
                  </>
                ) : stillTraining.length > 0 ? (
                  <p className="text-sm text-amber-300/90 leading-snug flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                    {t('make.ownSoundTraining')}
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-zinc-500 leading-snug">{t('make.ownSoundNone')}</p>
                    <button
                      type="button"
                      onClick={onGoToChannel}
                      className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      {t('make.ownSoundTrain', 'Train one in your channel')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => make()}
          disabled={busy}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-extrabold text-base flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {busy ? `${t('make.going')} ${elapsed}s` : t('make.go')}
        </button>

        {busy && <Progress stage={stage} elapsed={elapsed} asked={seconds} t={t} />}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-500">
            {userPlan !== 'free'
              ? t('make.unlimited')
              : `${left ?? 0} / ${ENTITLEMENTS['publish.release'].caps.free} ${t('make.leftToday')}`}
          </p>
          {userPlan === 'free' && (left ?? 0) === 0 && (
            <button type="button" onClick={onUpgrade} className="text-sm text-amber-400 hover:underline">
              {t('make.getMore')}
            </button>
          )}
        </div>

        {status && <p className="text-sm text-emerald-300">{status}</p>}

        {!engines.available('audio') && (
          <p className="text-sm text-zinc-500 leading-relaxed border-t border-zinc-800 pt-3">
            <Wand2 className="w-3.5 h-3.5 inline mr-1.5 text-zinc-600" />
            {t('make.sketch')}
          </p>
        )}
      </div>

      {/* Your channel */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h5 className="text-lg font-bold text-white">{t('make.channel')}</h5>
          <span className="text-sm text-zinc-500">{tracks.length} {tracks.length === 1 ? t('make.song') : t('make.songs')}</span>
        </div>

        {tracks.length === 0 ? (
          <p className="text-base text-zinc-500 py-8 text-center border border-dashed border-zinc-800 rounded-2xl">
            {t('make.empty')}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {tracks.map((track) => (
              /* The one that is playing takes the whole row. A waveform is
                 there to find the chorus with, and you cannot do that in half
                 a column — it was the reason the panel felt cramped. Every
                 other card stays small, because a list of songs is a list. */
              <div
                key={track.id}
                className={`rounded-2xl border bg-zinc-900/60 p-4 space-y-3 ${
                  playing === track.id
                    ? 'sm:col-span-2 border-emerald-500/60 bg-emerald-500/[0.04]'
                    : 'border-zinc-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(track)}
                    aria-label={playing === track.id ? 'Pause' : 'Play'}
                    className="w-12 h-12 rounded-full bg-emerald-500 text-onAccent flex items-center justify-center flex-shrink-0 hover:bg-emerald-400"
                  >
                    {playing === track.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-white leading-snug truncate">{track.title}</p>
                    <p className="text-sm text-zinc-500">
                      {track.genre} · {track.bpm} BPM · {Math.floor(track.seconds / 60)}:
                      {String(track.seconds % 60).padStart(2, '0')}
                      {track.remixOf && ' · another take'}
                    </p>
                  </div>
                </div>

                {/* The sleeve and the waveform side by side while it plays,
                    because a record is a picture and a shape together, and
                    neither is much use in half a column on its own. */}
                {playing === track.id && (
                  <div className="grid sm:grid-cols-[220px_1fr] gap-4 items-start">
                    <Sleeve
                      trackId={track.id}
                      title={track.title}
                      genre={track.genre}
                      style={track.style ?? ''}
                    />
                    <NowPlaying track={track} audio={audioRef.current} blob={playingBlob} />
                  </div>
                )}



                <div className="flex flex-wrap items-center gap-2">
                  {/* The ladder, one rung at a time. Somebody who has bought
                      nothing is offered the smaller step; somebody who opened
                      it is offered the one that makes it theirs; somebody who
                      owns it just gets the file. */}
                  <button
                    type="button"
                    onClick={() => save(track)}
                    title={levelOf(owned, track.id) === 'owned' ? undefined : t('buy.needsOwning')}
                    className="px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t('make.save')}
                  </button>
                  {/* A mix somebody sang on can be opened up again: the take
                      was kept beside it, so the tuning, the levels and the AI
                      voice are all still yours to change. Long after posting. */}
                  {track.mixOf && (
                    <button
                      type="button"
                      onClick={async () => {
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
                        setTakeFor({ track: source, music, take });
                      }}
                      className="px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      {t('make.editMix', 'Open it up again')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      const music = await readAudio(track.id);
                      if (!music) {
                        setStatus(t('make.missing'));
                        return;
                      }
                      setTakeFor({ track, music });
                    }}
                    className="px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {t('make.singOver')}
                  </button>
                  <button
                    type="button"
                    onClick={() => share(track)}
                    className="px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    {shared === track.id ? t('make.copied') : t('make.share')}
                  </button>
                  <button
                    type="button"
                    onClick={() => make(track)}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-violet-500 hover:text-violet-300 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    {t('make.again')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoFor(track)}
                    className="px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
                  >
                    <VideoIcon className="w-3.5 h-3.5" />
                    {t('video.make')}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(track)}
                    aria-label="Delete"
                    className="ml-auto text-zinc-600 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {videoFor && <VideoPanel track={videoFor} onClose={() => setVideoFor(null)} />}

        {tracks.length > 0 && (
          <p className="text-sm text-zinc-500">
            {t('make.kept')}
          </p>
        )}
      </div>
    </div>
  );
}


/**
 * What is happening, while it happens.
 *
 * The old screen said "Making your song" and nothing else for up to a minute,
 * which is indistinguishable from a screen that has stopped. This says which
 * step it is on, how long it has been, and — once there is anything to base it
 * on — roughly how long it usually takes.
 *
 * The estimate is a measurement, not a promise: it is the median of real runs
 * on this device, and the line says so, including when there are none. A bar
 * appears only while bytes are genuinely arriving, because that is the only
 * part of this with a measurable proportion. The rest pulses to show it is
 * alive without claiming to know how far along it is.
 */
function Progress({
  stage,
  elapsed,
  asked,
  t,
}: {
  stage: Stage | null;
  elapsed: number;
  asked: number;
  t: (key: string, fallback?: string) => string;
}): React.ReactElement {
  // Read once per generation rather than every second: it cannot change while
  // this is on screen, and localStorage on a render path is a bad habit.
  const [guess] = useState(() => expectWait(asked));

  const line =
    stage?.at === 'plan'
      ? // No parts means no lyrics, which is an instrumental — and "0 × 60s"
        // is not a sentence about anything.
        stage.parts > 0
        ? `${t('make.stage.plan')} — ${stage.parts} × ${stage.seconds}s`
        : `${t('make.stage.plan')} — ${stage.seconds}s`
      : stage?.at === 'receiving'
        ? t('make.stage.receiving')
        : stage?.at === 'saving'
          ? t('make.stage.saving')
          : // The long stretch. The request is away and the service is writing;
            // there is nothing else true to say until bytes start arriving.
            stage?.at === 'sent'
            ? t('make.stage.waiting')
            : t('make.stage.plan');

  const share =
    stage?.at === 'receiving' && stage.expected
      ? Math.min(100, Math.round((stage.received / stage.expected) * 100))
      : null;

  const late = guess ? elapsed > guess.seconds * 1.5 : elapsed > 120;

  const expectation = guess
    ? late
      ? t('make.wait.late', 'Longer than usual. It gives up at five minutes.')
      : `${t('make.wait.usually', 'Usually about')} ${guess.seconds}s — ${guess.runs} ${
          guess.runs === 1 ? t('make.wait.run', 'song so far') : t('make.wait.runs', 'songs so far')
        }`
    : t(
        'make.wait.first',
        'Nothing to compare this to yet. Thirty seconds to two minutes is normal; it gives up at five.',
      );

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-emerald-300">{line}</span>
        <span className="text-sm text-zinc-500 tabular-nums">{elapsed}s</span>
      </div>

      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        {share === null ? (
          <div className="h-full w-1/3 rounded-full bg-emerald-500/50 animate-pulse" />
        ) : (
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-200"
            style={{ width: `${share}%` }}
          />
        )}
      </div>

      <p className={`text-sm leading-snug ${late ? 'text-amber-400' : 'text-zinc-500'}`}>{expectation}</p>
    </div>
  );
}
