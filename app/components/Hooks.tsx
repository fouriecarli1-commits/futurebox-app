'use client';

/**
 * Hooks — cutting the bit people will actually watch.
 *
 * This tab used to be demo cards of other people's clips, which taught nobody
 * anything. Now it works on your own songs: it listens to the track, finds the
 * moments where something arrives, and cuts a vertical clip from whichever you
 * pick.
 *
 * Why not just take the opening? Because the opening is the intro, and the
 * intro is the part designed to be skipped.
 *
 * ── And songs other people opened up ─────────────────────────────────────
 *
 *   "dan kan iemand van daar af op die hook click en dan verder weer 'n
 *    liedjie generate."
 *
 * A song posted to Live with permission — the question `PostToLive` asks —
 * shows up here as a third thing to cut from, beside your own songs and a
 * file you brought in. Two things are then possible with it, and they are
 * exactly the two the permission names:
 *
 *   cut a clip     real audio, the maker's name drawn on it rather than
 *                  yours. Whoever cuts it is not who made it.
 *   start a song   the style words and the title go to Make a song, with
 *                  the credit attached to whatever comes out.
 *
 * The third thing everybody assumes — feeding the audio to the engine so the
 * new song sounds like the old one — is not possible and is not offered.
 * ElevenLabs' music call takes text and no reference audio, which is the same
 * wall the song-link bar was taken out for. The room says so on the card
 * rather than letting somebody discover it from a disappointing result.
 *
 * ── What is deliberately not done with a shared song ─────────────────────
 *
 * It is never written into the library and never uploaded: it lives in this
 * room's state for as long as the tab is open. `check:broughtin` exists
 * because a file that is not yours must not acquire the controls that claim
 * it is yours — Post to Live, cover art, the studio. A shared song is that
 * case with somebody's name actually attached, so it gets no ShareRow either:
 * a caption saying "a song I made" under somebody else's music is the app
 * making a claim on their behalf.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Smartphone, Loader2, Download, Film, Play, Plus, Scissors, Square, Music, Trash2, Radio, Wand2, Zap } from 'lucide-react';
import { loadTracks, downloadBlob, safeFilename, type Track } from '../lib/library';
import { readAudio } from '../lib/trackaudio';
import { findHooks, sectionHooks, decodeTrack, formatMoment, type Hook } from '../lib/hooks';
import { renderVideo, styleFor, videoSupported, extensionFor } from '../lib/video';
import type { HookCarry } from '../lib/hookhandover';
import { accessToken } from '../lib/cloud';
import { useLang } from '../lib/i18n';
import Cost from './Cost';
import History from './History';
import { makeId, rememberMake } from '../lib/makes';
import { useCopilotOps, matchByTitle } from '../lib/copilotactions';
import ShareRow from './ShareRow';
import Note from './Note';
import Card from './Card';
import { useOpenCard } from '../lib/opencard';
import { addUpload, loadUploads, removeUpload } from '../lib/uploads';
import { cutHook, soundOf } from '../lib/videoclip';
import { fetchCreator, nameOf } from '../lib/radar';

const LENGTHS = [15, 30];

interface Peaks {
  readonly left: Float32Array;
  readonly right: Float32Array;
  readonly seconds: number;
}

/** The loudest sample in each of `bins` slices, per channel. Mono is drawn twice. */
function peaksOf(buffer: AudioBuffer, bins = 400): Peaks {
  const read = (channel: number): Float32Array => {
    const data = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));
    const out = new Float32Array(bins);
    const step = Math.max(1, Math.floor(data.length / bins));
    for (let bin = 0; bin < bins; bin += 1) {
      let loudest = 0;
      const from = bin * step;
      const to = Math.min(data.length, from + step);
      for (let at = from; at < to; at += 1) {
        const level = Math.abs(data[at]);
        if (level > loudest) loudest = level;
      }
      out[bin] = loudest;
    }
    return out;
  };
  return { left: read(0), right: read(1), seconds: buffer.duration };
}

/** The region colours, in the order the moments are found. Google's page: emerald, pink, cyan. */
const REGION = [
  { edge: 'border-emerald-400', wash: 'bg-emerald-500/20', ink: 'text-emerald-300', tag: 'bg-emerald-400 text-onAccent', glow: 'shadow-[0_0_24px_rgba(52,211,153,0.35)]' },
  { edge: 'border-pink-500', wash: 'bg-pink-500/20', ink: 'text-pink-300', tag: 'bg-pink-500 text-onAccent', glow: 'shadow-[0_0_24px_rgba(236,72,153,0.35)]' },
  { edge: 'border-cyan-400', wash: 'bg-cyan-500/20', ink: 'text-cyan-300', tag: 'bg-cyan-400 text-onAccent', glow: 'shadow-[0_0_24px_rgba(34,211,238,0.35)]' },
  { edge: 'border-amber-400', wash: 'bg-amber-500/20', ink: 'text-amber-300', tag: 'bg-amber-400 text-onAccent', glow: 'shadow-[0_0_24px_rgba(251,191,36,0.35)]' },
  { edge: 'border-violet-400', wash: 'bg-violet-500/20', ink: 'text-violet-300', tag: 'bg-violet-400 text-onAccent', glow: 'shadow-[0_0_24px_rgba(167,139,250,0.35)]' },
];

/** A song somebody put in the room and said others may build on. */
interface Shared {
  /** The post's id, so picking one twice is idempotent. */
  id: string;
  title: string;
  /** The maker's channel name. Drawn on the clip and carried as the credit. */
  by: string;
  /** The style words the song was made from. Empty on a post made before
      `buildon.sql` added the column, which is a thinner hand-off and not a
      broken one. */
  style: string;
  audio: string;
}

export default function Hooks({
  onBuildOn,
  onMakeVideo,
}: {
  /* Into Make a song, with the style, the title and whose it was. Optional so
     the room still mounts in a probe page that has no studio around it. */
  readonly onBuildOn?: (from: { title: string; by: string; style: string }) => void;
  /**
   * Into the video desk, with the song under it and the shape set.
   *
   * Carli, 18 September 2026: *"Hooks benodig ook die button wat hierdie
   * video na die video desk toe kan vat om 'n video vir die sniplet te
   * maak."* The room finds the moment worth posting and then can only cut a
   * still with sound on it; making a real clip for that moment meant going
   * to another room and choosing the song again.
   *
   * Only for a song that is hers. A shared song gets no ShareRow, no cover
   * art and no studio for the reason at the top of this file, and "make a
   * video of it" is the same claim.
   */
  readonly onMakeVideo?: (from: { trackId: string; hook: HookCarry }) => void;
} = {}) {
  const { t } = useLang();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selected, setSelected] = useState<Track | null>(null);
  /**
   * Which moment is playing, if one is.
   *
   * Carli, 18 September 2026: *"Daar moet 'n play knoppie wees om die
   * stukkie wat voorgestel word te hoor."* The room was recommending a
   * moment by a number — "at 0:22, steady and clear" — and the only way to
   * find out whether it was the right one was to spend a cut on it.
   */
  const [hearing, setHearing] = useState<number | null>(null);
  /**
   * One player for the room, and a real element in the document.
   *
   * `new Audio()` would do the same job and is invisible to everything
   * outside this file — including a probe, which then has nothing to read
   * but the button's own label. An element that is really there can be
   * asked what it is playing and where it is.
   */
  const player = useRef<HTMLAudioElement | null>(null);
  /** The sound behind whatever is chosen, made once and kept. */
  const heardFrom = useRef<{ key: string; url: string; own: boolean } | null>(null);
  const [hooks, setHooks] = useState<Hook[]>([]);
  /**
   * The sound itself, as a picture.
   *
   * Google's page draws the song as a stereo waveform with the found moments
   * boxed on it, and that is drawable from what the room already decodes:
   * the same `AudioBuffer` the finder reads. Four hundred bins per channel,
   * kept rather than recomputed, because the buffer is tens of megabytes and
   * the picture is three kilobytes.
   */
  const [peaks, setPeaks] = useState<Peaks | null>(null);
  /** Which found moment is lit on the waveform. An index into `hooks`. */
  const [picked, setPicked] = useState(0);
  const [seconds, setSeconds] = useState(15);
  const [finding, setFinding] = useState(false);
  const [cutting, setCutting] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [clip, setClip] = useState<{ url: string; blob: Blob; ext: string } | null>(null);
  const [kept, setKept] = useState(0);
  /** Songs brought in from a file, beside the channel rather than in it. */
  const [brought, setBrought] = useState<Track[]>([]);
  /**
   * A video somebody owns, and the sound the moments were found in.
   *
   * This is the honest half of "can hooks pull clips out of YouTube": not
   * from YouTube, which its Terms forbid, but from a file you have. See
   * `lib/videoclip.ts`.
   */
  const [video, setVideo] = useState<{ name: string; file: Blob; sound: AudioBuffer | null } | null>(null);
  /** Songs the room is open on, and whichever one is being cut from. */
  const [open, setOpen] = useState<Shared[]>([]);
  const [shared, setShared] = useState<(Shared & { file: Blob }) | null>(null);
  const [taking, setTaking] = useState(false);
  const [problem, setProblem] = useState('');

  /* Whose channel this is, for the name drawn on the clip.

     Fetched once and allowed to be empty: a snippet made before anybody has
     set a profile still gets cut, it simply has no name on it. Waiting for
     the profile before letting somebody cut a hook would be holding up the
     work for the credit. */
  const [maker, setMaker] = useState('');
  useEffect(() => {
    let alive = true;
    void fetchCreator().then((creator) => {
      if (alive) setMaker(nameOf(creator));
    }).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  /* What the room is open on.

     Read once, unauthenticated-safe: the feed answers for somebody signed out
     too, and every post in it already carries a short-lived address for its
     file. Failures are swallowed on purpose — the room has three other things
     to cut from, and a Hooks tab that refuses to draw because Live is down is
     worse than one with a section missing. */
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const token = await accessToken();
        const answer = await fetch('/api/live', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!answer.ok) return;
        const room = (await answer.json()) as {
          posts?: { id: string; title: string; by: string; audio: string | null; buildOn?: boolean; style?: string; mine?: boolean }[];
        };
        if (!alive) return;
        setOpen(
          (room.posts ?? [])
            /* Open, playable, and not hers. Her own songs are already in the
               list above under their real titles, and offering them twice —
               once as a song and once as a stranger's post — is two rows for
               one thing. */
            .filter((post) => post.buildOn === true && post.audio && post.mine !== true)
            .map((post) => ({
              id: post.id,
              title: post.title,
              by: post.by,
              style: post.style ?? '',
              audio: post.audio as string,
            })),
        );
      } catch {
        /* Live is not reachable. The rest of the room still works. */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const songFile = useRef<HTMLInputElement | null>(null);
  const videoFile = useRef<HTMLInputElement | null>(null);

  /* Pick the song to cut from, and how long the clip runs. Both go through the
     same `look` the buttons use, so the hooks are re-found rather than left
     showing the previous song's. */
  /* The length lives in a card that opens folded, so a length the copilot
     sets is a change nobody can see. See `lib/opencard.ts`. */
  const lengthCard = useOpenCard();
  useCopilotOps('hooks_feed', {
    pick_song: (value) => {
      const track = matchByTitle(tracks, value);
      if (track) void look(track, seconds);
    },
    set_seconds: (value) => {
      const wanted = Number.parseInt(value.trim(), 10);
      if (!LENGTHS.includes(wanted)) return;
      setSeconds(wanted);
      lengthCard.arrived();
      if (selected) void look(selected, wanted);
    },
  });

  useEffect(() => {
    setTracks(loadTracks());
    setBrought(loadUploads());
  }, []);

  const look = useCallback(
    async (track: Track, clipSeconds: number) => {
      setSelected(track);
      setVideo(null);
      setShared(null);
      setProblem('');
      setFinding(true);
      setHooks([]);
      if (clip) URL.revokeObjectURL(clip.url);
      setClip(null);
      try {
        const audio = await readAudio(track.id);
        if (!audio) return;
        const buffer = await decodeTrack(audio);
        setPeaks(peaksOf(buffer));
        setPicked(0);
        /* The same clamp a short video and a shared song already get. A
           song shorter than the clip length used to come back with no
           moments at all and no reason — the finder walks windows of the
           asked-for length and finds none that fit. The whole of a short
           song is the moment, said as such. */
        const room = Math.max(1, Math.floor(buffer.duration) - 1);
        const fits = Math.min(clipSeconds, room);
        // The plan first, where there is one: the app knows where the chorus
        // is, and a known boundary beats a loudness peak. Analysis fills in
        // behind it, and a duplicate start is dropped rather than offered
        // twice under two names.
        const named = sectionHooks(track.parts ?? [], buffer.duration, fits);
        const found = findHooks(buffer, fits, 3).filter(
          (one) => !named.some((part) => Math.abs(part.startSeconds - one.startSeconds) < 2),
        );
        const all = named.concat(found).slice(0, 5);
        setHooks(
          all.length
            ? all
            : [{ startSeconds: 0, seconds: Math.max(1, Math.min(clipSeconds, buffer.duration)), kind: 'steady', score: 0 }],
        );
        if (fits < clipSeconds) {
          setProblem(t('hooks.songShorter', 'That song is shorter than the clip length, so the whole of it is the moment.'));
        }
      } finally {
        setFinding(false);
      }
    },
    [clip, t],
  );

  /** A song off the device, the same store the video rooms use. */
  const bringSong = useCallback(async (file: File | null) => {
    if (!file) return;
    setTaking(true);
    setProblem('');
    try {
      const added = await addUpload(file);
      setBrought(loadUploads());
      await look(added, seconds);
    } catch (error) {
      const why = error instanceof Error ? error.message : '';
      setProblem(
        why === 'too-big'
          ? t('board.songTooBig', 'That file is over 60 MB. Trim it or export it smaller.')
          : t('board.songUnreadable', 'This browser could not read that audio. MP3, WAV or M4A work.'),
      );
    } finally {
      setTaking(false);
    }
  }, [look, seconds, t]);

  /**
   * A song somebody else opened up, fetched and read for its moments.
   *
   * The file is held here and nowhere else — not `addUpload`, not `putAudio`,
   * not the bucket. It is somebody else's recording, and the moment it enters
   * the library it acquires every control the library offers, which is the
   * fault `check:broughtin` was written for with a stranger's name on it.
   *
   * The moments come out of the sound itself rather than a composition plan,
   * because the plan belongs to the account that made the song and this
   * browser has never seen it. That is the same path a brought-in video takes.
   */
  const pickShared = useCallback(async (post: Shared) => {
    setTaking(true);
    setProblem('');
    setSelected(null);
    setVideo(null);
    setHooks([]);
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
    try {
      const answer = await fetch(post.audio);
      if (!answer.ok) throw new Error('gone');
      const file = await answer.blob();
      const sound = await decodeTrack(file);
      setShared({ ...post, file });
      setPeaks(peaksOf(sound));
      setPicked(0);

      /* The same clamp a short video gets: `findHooks` walks windows of the
         asked-for length and returns nothing at all when none fit, which
         reads as "this song has no moments" rather than "this song is
         shorter than the clip you asked for". */
      const room = Math.max(1, Math.floor(sound.duration) - 1);
      const fits = Math.min(seconds, room);
      const found = findHooks(sound, fits, 4);
      setHooks(
        found.length
          ? found
          : [{ startSeconds: 0, seconds: Math.max(1, Math.min(seconds, sound.duration)), kind: 'steady', score: 0 }],
      );
      if (fits < seconds) {
        /* Its own sentence rather than the video one: a shared song is a
           song, and a room that calls it a video is a room that has stopped
           reading what it says. */
        setProblem(t('hooks.sharedShorter', 'That song is shorter than the clip length, so the whole of it is the moment.'));
      }
    } catch {
      setShared(null);
      setProblem(t(
        'hooks.sharedGone',
        'That song could not be fetched. The room hands out an address that expires, so opening this tab again usually fixes it.',
      ));
    } finally {
      setTaking(false);
    }
  }, [clip, seconds, t]);

  /**
   * A video somebody owns, and the moments in it.
   *
   * The moments come from the video's own sound, through the same finder that
   * reads a song — so a moment is where something arrives rather than where
   * the file happens to start. A video whose audio this browser cannot decode
   * is refused rather than cut silently: a hook with no sound is not a hook.
   */
  const bringVideo = useCallback(async (file: File | null) => {
    if (!file) return;
    setTaking(true);
    setProblem('');
    setSelected(null);
    setShared(null);
    setHooks([]);
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
    try {
      const sound = await soundOf(file);
      if (!sound) {
        setProblem(t('hooks.videoNoSound', 'This browser could not read the sound on that video, so there is nothing to find the moments in. An MP4 or a WebM usually works.'));
        return;
      }
      setVideo({ name: file.name.replace(/\.[a-z0-9]+$/i, ''), file, sound });
      setPeaks(peaksOf(sound));
      setPicked(0);

      /* A clip cannot be longer than what it is cut from.
 
         `findHooks` walks windows of the asked-for length and returns nothing
         when none fit — correct, and silent: a six-second video with the
         length set to fifteen offered no moments at all and gave no reason.
         So the length is brought down to what the file can carry, and if even
         one window will not fit, the whole file is the moment. */
      const room = Math.max(1, Math.floor(sound.duration) - 1);
      const fits = Math.min(seconds, room);
      const found = findHooks(sound, fits, 4);
      setHooks(
        found.length
          ? found
          : [{
              startSeconds: 0,
              seconds: Math.max(1, Math.min(seconds, sound.duration)),
              // 'steady' is the finder's own word for "nothing stood out", and
              // the room already has a sentence for it.
              kind: 'steady',
              score: 0,
            }],
      );
      if (fits < seconds) {
        setProblem(
          t('hooks.shorterThan', 'That video is shorter than the clip length, so the whole of it is the moment.'),
        );
      }
    } finally {
      setTaking(false);
    }
  }, [clip, seconds, t]);

  /* ── Hearing a moment before spending a cut on it ────────────────────

     One `<audio>` for the whole room rather than one per card: twelve
     elements each holding the same song is twelve decodes, and on a phone
     that is the memory the tab gets thrown away for.

     The source is made once per chosen song and kept, because the three
     things this room cuts from carry their sound three different ways: a
     song of hers is a blob in the store, a brought-in video is a File, and
     a shared song is a URL somebody else is serving. Only the first two
     are ours to revoke. */
  const stopHearing = useCallback(() => {
    const one = player.current;
    if (one) {
      one.pause();
      one.onpause = null;
      one.ontimeupdate = null;
    }
    setHearing(null);
  }, []);

  const soundUrl = useCallback(async (): Promise<string | null> => {
    const key = shared ? `shared:${shared.id}` : video ? `video:${video.name}` : selected ? `song:${selected.id}` : '';
    if (!key) return null;
    const had = heardFrom.current;
    if (had?.key === key) return had.url;
    if (had?.own) URL.revokeObjectURL(had.url);
    heardFrom.current = null;
    if (shared) {
      heardFrom.current = { key, url: shared.audio, own: false };
    } else if (video) {
      heardFrom.current = { key, url: URL.createObjectURL(video.file), own: true };
    } else if (selected) {
      const blob = await readAudio(selected.id);
      if (!blob) return null;
      heardFrom.current = { key, url: URL.createObjectURL(blob), own: true };
    }
    return heardFrom.current?.url ?? null;
  }, [selected, shared, video]);

  const hear = async (hook: Hook, index: number) => {
    if (hearing === index) {
      stopHearing();
      return;
    }
    stopHearing();
    const url = await soundUrl();
    if (!url) {
      setProblem(t('hooks.noSound', 'That sound could not be read back, so this moment cannot be played.'));
      return;
    }
    const one = player.current;
    if (!one) return;
    /* Said at once, before anything is awaited.

       Every button in this app has to answer a thumb — and the answer
       cannot wait on the media pipeline, which takes a moment on a phone
       and, on a machine with no audio device at all, never settles. So the
       press is acknowledged now and taken back below if it fails. */
    setHearing(index);
    try {
      /* Metadata first, and this is the whole of why the first version did
         nothing. Setting `currentTime` on an element that has not loaded
         yet throws `InvalidStateError` — and the throw was before the
         `try`, so it left the room as an unhandled rejection and the
         button simply did not change. A moment cannot be started at 0:22
         until the thing being started knows it is longer than that. */
      if (one.src !== url) {
        one.src = url;
        await new Promise<void>((resolve, reject) => {
          one.onloadedmetadata = () => resolve();
          one.onerror = () => reject(new Error('unreadable'));
        });
        one.onloadedmetadata = null;
        one.onerror = null;
      }
      one.currentTime = hook.startSeconds;
      /* Stopped by the clock rather than by the end of the song: the whole
         point is to hear the piece that would be cut, not to start the
         track playing from there and leave somebody to find the pause
         button. */
      const until = hook.startSeconds + hook.seconds;
      one.ontimeupdate = () => {
        if (one.currentTime >= until) stopHearing();
      };
      one.onpause = () => setHearing(null);
      await one.play();
    } catch {
      setHearing(null);
      setProblem(t('hooks.noSound', 'That sound could not be read back, so this moment cannot be played.'));
    }
  };

  /* Nothing left playing behind a room somebody has left, and nothing left
     held: a revoked object URL is the difference between closing a tab and
     the phone deciding to close it for you. */
  useEffect(() => () => {
    player.current?.pause();
    if (heardFrom.current?.own) URL.revokeObjectURL(heardFrom.current.url);
  }, []);

  const cut = async (hook: Hook, index: number) => {
    /* A video is trimmed; a song is drawn. Two different jobs behind one
       button, and the room says which is happening because they take
       different amounts of time and produce different things. */
    if (video) {
      setCutting(index);
      setProgress(0);
      if (clip) URL.revokeObjectURL(clip.url);
      setClip(null);
      try {
        const made = await cutHook(video.file, hook.startSeconds, hook.seconds, '9:16', video.sound);
        if (!made.ok) {
          setProblem(t('hooks.cutFailed', 'That clip could not be cut. Nothing was charged for this step.'));
          return;
        }
        setClip({ url: URL.createObjectURL(made.blob), blob: made.blob, ext: made.ext });
        void rememberMake(
          {
            id: makeId('hooks_feed'),
            surface: 'hooks_feed',
            kind: 'clip',
            title: video.name,
            createdAt: new Date().toISOString(),
            seconds: hook.seconds,
            ext: made.ext,
          },
          made.blob,
        ).then(() => setKept((n) => n + 1));
      } finally {
        setCutting(null);
      }
      return;
    }

    /* Somebody else's song: their name on the clip, not hers.

       `styleFor` is not used, because it builds its subtitle out of a genre
       and a BPM this browser has never been told — a shared post carries a
       title, a maker and style words and nothing else, and "· 0 BPM" under
       somebody's song is a made-up number. The style words are the subtitle
       when there are any, and the credit line is the maker either way. */
    if (shared) {
      setCutting(index);
      setProgress(0);
      if (clip) URL.revokeObjectURL(clip.url);
      setClip(null);
      try {
        let seed = 0;
        for (let n = 0; n < shared.title.length; n += 1) seed += shared.title.charCodeAt(n);
        const result = await renderVideo({
          audio: shared.file,
          aspect: '9:16',
          seconds: hook.seconds,
          startSeconds: hook.startSeconds,
          style: { hue: seed % 360, title: shared.title, subtitle: shared.style, by: shared.by, look: 'pulse' },
          onProgress: setProgress,
        });
        const ext = extensionFor(result.mimeType);
        setClip({ url: URL.createObjectURL(result.blob), blob: result.blob, ext });
        void rememberMake(
          {
            id: makeId('hooks_feed'),
            surface: 'hooks_feed',
            kind: 'clip',
            /* Filed under both names, because a shelf of clips six weeks from
               now has to say whose song each one is without opening it. */
            title: `${shared.title} — ${shared.by}`,
            createdAt: new Date().toISOString(),
            seconds: hook.seconds,
            ext,
          },
          result.blob,
        ).then(() => setKept((n) => n + 1));
      } finally {
        setCutting(null);
      }
      return;
    }

    if (!selected) return;
    const audio = await readAudio(selected.id);
    if (!audio) return;
    setCutting(index);
    setProgress(0);
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
    try {
      const result = await renderVideo({
        audio,
        aspect: '9:16',
        seconds: hook.seconds,
        startSeconds: hook.startSeconds,
        style: styleFor(selected.title, selected.genre, selected.bpm, maker),
        onProgress: setProgress,
      });
      const ext = extensionFor(result.mimeType);
      setClip({ url: URL.createObjectURL(result.blob), blob: result.blob, ext });
      // Cutting is free, so this is not a receipt — it is so that the clip you
      // cut and did not download is still there tomorrow.
      void rememberMake(
        {
          id: makeId('hooks_feed'),
          surface: 'hooks_feed',
          kind: 'clip',
          title: selected?.title ?? t('hooks.title'),
          createdAt: new Date().toISOString(),
          seconds,
          ext,
        },
        result.blob,
      ).then(() => setKept((n) => n + 1));
    } finally {
      setCutting(null);
    }
  };

  /**
   * Why a moment was picked. Switched on a value, not on the first word of an
   * English sentence — matching prose is how the section reasons were quietly
   * turning into "safe pick".
   */
  const reasonFor = (hook: Hook): string => {
    if (hook.kind === 'section') return `${hook.label} — ${t('hooks.fromPlan')}`;
    if (hook.kind === 'arrival') {
      /* What arrived, where it could be named. "Something arrives" is the one
         thing anybody could already hear; "the low end comes in" is a
         decision somebody made, and hearing which one is the difference
         between liking a drop and knowing how one is built.
         `docs/MUSIEKDENKE.md` §3.3. */
      if (hook.arrived === 'low') return t('hooks.arrivedLow', 'The bottom comes in — the kick and the bass');
      if (hook.arrived === 'top') return t('hooks.arrivedTop', 'The top opens up — hats, cymbals, air');
      if (hook.arrived === 'fuller') return t('hooks.arrivedFuller', 'Twice as much starts happening');
      if (hook.arrived === 'louder') return t('hooks.arrivedLouder', 'The same thing, and louder');
      return t('hooks.arrives');
    }
    if (hook.kind === 'fullest') return t('hooks.fullest');
    return t('hooks.safe');
  };

  /* ── The waveform ─────────────────────────────────────────────────────

     Drawn from the decoded sound, not decorated: left channel up, right
     channel down, the way a stereo file is shown in every editor. A mono
     file is drawn twice, which is also what an editor does. Redrawn when
     the song changes or the box is resized. */
  const wave = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const art = wave.current;
    const ctx = art?.getContext('2d');
    if (!art || !ctx) return undefined;
    const draw = (): void => {
      const w = (art.width = art.clientWidth);
      const h = (art.height = art.clientHeight);
      ctx.clearRect(0, 0, w, h);
      const mid = h / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, mid - 0.5, w, 1);
      if (!peaks) return;
      const bins = peaks.left.length;
      const bar = w / bins;
      for (let bin = 0; bin < bins; bin += 1) {
        const up = Math.max(1, peaks.left[bin] * (mid - 4));
        const down = Math.max(1, peaks.right[bin] * (mid - 4));
        const x = bin * bar;
        ctx.fillStyle = bin % 7 === 0 ? '#22d3ee' : '#34d399';
        ctx.fillRect(x, mid - up, Math.max(1, bar - 0.6), up);
        ctx.fillStyle = bin % 7 === 0 ? 'rgba(34,211,238,0.55)' : 'rgba(52,211,153,0.55)';
        ctx.fillRect(x, mid, Math.max(1, bar - 0.6), down);
      }
    };
    draw();
    const watch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(draw);
    watch?.observe(art);
    return () => watch?.disconnect();
  }, [peaks]);

  /** The song on the table, by whichever of the three ways it came in. */
  const cuttingFrom = shared ? shared.title : video ? video.name : selected?.title ?? '';
  const chosen = hooks[picked] ?? hooks[0] ?? null;
  const strongest = hooks.reduce((best, one) => (one.score > best ? one.score : best), 0);
  const sources = tracks.length + brought.length + open.length;

  /** A short name for a region's badge: the section's own name where there is one. */
  const regionName = (hook: Hook): string => {
    if (hook.kind === 'section' && hook.label) return hook.label;
    if (hook.kind === 'arrival') return t('hooks.kindArrival', 'Drop');
    if (hook.kind === 'fullest') return t('hooks.kindFullest', 'Peak');
    return t('hooks.kindSteady', 'Steady');
  };

  /** Where a region sits on the picture, as a share of the whole song. */
  const placeOf = (hook: Hook): { left: string; width: string } => {
    const whole = peaks?.seconds || 1;
    return {
      left: `${Math.max(0, Math.min(100, (hook.startSeconds / whole) * 100))}%`,
      width: `${Math.max(2, Math.min(100, (hook.seconds / whole) * 100))}%`,
    };
  };

  const ruler = peaks
    ? [0, 0.25, 0.5, 0.75, 1].map((share) => formatMoment(peaks.seconds * share))
    : ['0:00', '', '', '', ''];

  const SOURCE_ON = 'w-full text-left p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-xs font-bold text-emerald-300 flex items-center justify-between gap-2 min-h-[44px]';
  const SOURCE_OFF = 'w-full text-left p-2.5 rounded-xl bg-zinc-800/40 hover:bg-zinc-700/40 border border-white/5 text-xs text-zinc-300 flex items-center justify-between gap-2 min-h-[44px] disabled:opacity-50';
  const PANEL = 'rounded-2xl border border-white/10 bg-zinc-900/80 p-4 backdrop-blur-md';
  const BRING = 'w-full py-2 min-h-[44px] rounded-xl bg-zinc-800/40 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50';

  return (
    <div className="space-y-4" data-hooksroom>
      {/* The one player the whole room shares.

          In the document rather than `new Audio()`, so a probe can ask it
          what it is playing and from where. Twelve elements each holding
          the same song is twelve decodes, and on a phone that is the
          memory the tab gets thrown away for. */}
      <audio ref={player} data-hearplayer hidden />

      {/* ── The bar across the top ──────────────────────────────────────
          Google's page: the brand mark and the room's name, the length as
          two pills, a lit chip, and the one button that does the work. */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-linear-to-r from-emerald-950/30 via-zinc-900 to-zinc-900 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Smartphone className="w-4 h-4 text-onAccent" />
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-extrabold text-white tracking-tight leading-tight">
              {t('hooks.title')} <span className="text-zinc-400 font-mono text-xs uppercase tracking-wider">{t('hooks.andDrops', '& drops')}</span>
            </h4>
            <p className="text-[11px] text-zinc-400 truncate">{t('hooks.tagline', 'The bit of your song worth posting.')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-zinc-950 p-1 rounded-full border border-white/10 flex items-center text-xs font-bold" data-hooklengths>
            {LENGTHS.map((option) => (
              <button
                key={option}
                type="button"
                data-hooklength={option}
                onClick={() => {
                  setSeconds(option);
                  if (selected) void look(selected, option);
                }}
                className={`px-3 py-1.5 min-h-[44px] rounded-full border transition ${
                  seconds === option ? 'border-emerald-400 bg-emerald-500 text-onAccent font-extrabold' : 'border-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                {option === 15 ? t('hooks.short15', '15s Short') : t('hooks.reel30', '30s Reel')}
              </button>
            ))}
          </div>
          {hooks.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs font-extrabold text-emerald-300" data-hookcount>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {hooks.length === 1 ? t('hooks.foundOne') : `${hooks.length} · ${t('hooks.found')}`}
            </span>
          )}
          <Cost credits={0} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* ── Column one: what we are cutting from ──────────────────── */}
        <aside className={`${PANEL} space-y-3 min-w-0`} data-hooksources>
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-bold uppercase text-white">
            <span>{t('hooks.fromTitle', 'What are we cutting from?')}</span>
            <span className="text-[10px] text-emerald-300 font-mono">{sources} {t('hooks.tracks', 'TRACKS')}</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">{t('hooks.sub')}</p>
          <p className="text-xs text-zinc-500">
            {tracks.length === 0 && brought.length === 0 ? t('hooks.none') : t('hooks.pick')}
          </p>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {[...tracks, ...brought].map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => look(track, seconds)}
                className={selected?.id === track.id ? SOURCE_ON : SOURCE_OFF}
              >
                <span className="truncate flex items-center gap-2"><Music className="w-3.5 h-3.5 shrink-0" />{track.title}</span>
                {selected?.id === track.id && (
                  <span className="text-[9px] bg-emerald-400 text-onAccent px-1.5 py-0.5 rounded font-mono shrink-0">{t('hooks.active', 'ACTIVE')}</span>
                )}
              </button>
            ))}
            {video && (
              <span className={SOURCE_ON}>
                <span className="truncate flex items-center gap-2"><Film className="w-3.5 h-3.5 shrink-0" />{video.name}</span>
                <span className="text-[9px] bg-emerald-400 text-onAccent px-1.5 py-0.5 rounded font-mono shrink-0">{t('hooks.active', 'ACTIVE')}</span>
              </span>
            )}
            {/* Songs the room is open on. In the same list as her own, because
                they are the same choice — what am I cutting from. The name
                under the title is the point: whose song this is, before
                anything is done to it. */}
            {open.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => void pickShared(post)}
                disabled={taking}
                className={shared?.id === post.id ? SOURCE_ON : SOURCE_OFF}
              >
                <span className="truncate flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-left leading-tight truncate">
                    {post.title}
                    <span className="block text-[10px] opacity-70">{post.by}</span>
                  </span>
                </span>
                {shared?.id === post.id && (
                  <span className="text-[9px] bg-emerald-400 text-onAccent px-1.5 py-0.5 rounded font-mono shrink-0">{t('hooks.active', 'ACTIVE')}</span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2">
            <button type="button" onClick={() => songFile.current?.click()} disabled={taking} className={BRING}>
              {taking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {t('board.bringSong', 'Bring a song in')}
            </button>
            <input
              ref={songFile}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(event) => {
                void bringSong(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
            />
            <button type="button" onClick={() => videoFile.current?.click()} disabled={taking} className={BRING}>
              {taking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />}
              {t('hooks.bringVideo', 'Bring a video in')}
            </button>
            <input
              ref={videoFile}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => {
                void bringVideo(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
            />
            {(shared || video) && (
              <button
                type="button"
                onClick={() => {
                  setShared(null);
                  setVideo(null);
                  setHooks([]);
                  setPeaks(null);
                }}
                className={BRING}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('board.dropSong', 'Take it back out')}
              </button>
            )}
          </div>
          <Note className="text-xs text-zinc-500">
            {t(
              'hooks.bringWhy',
              'A song or a video you have on this device. A video is cut with the sound that is on it, and the moments are found in that sound. Nothing can be taken from YouTube or another site — their terms do not allow it, and this app will not pretend otherwise.',
            )}
          </Note>
          {problem && <p className="text-sm text-amber-400 leading-snug">{problem}</p>}

          {/* The length, as its own card with the choices as the small buttons
              along the bottom. The pills in the bar above are the same two
              choices; this card is the one the copilot opens when it sets
              the length for you. See `lib/opencard.ts`. */}
          <div ref={lengthCard.mine} className="scroll-mt-4">
          <Card
            openOn={lengthCard.openOn}
            title={t('hooks.clipLength')}
            /* eslint-disable-next-line react/jsx-no-useless-fragment */
            tools={<>{LENGTHS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setSeconds(option);
                  if (selected) look(selected, option);
                }}
                className={`min-h-[44px] px-3 py-1.5 rounded-xl text-sm border transition-all ${
                  seconds === option
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {option}s
              </button>
            ))}</>}
          >
            <p className="text-sm text-zinc-500 leading-snug">
              {t('hooks.clipLengthWhy', 'The first fifteen seconds decide whether anybody watches the rest, so shorter is usually better.')}
            </p>
          </Card>
          </div>
        </aside>

        {/* ── Column two: the waveform and the moments on it ────────── */}
        <div className="space-y-4 min-w-0">
        <main className={`${PANEL} space-y-4 min-w-0`} data-hookwave>
          <div className="flex flex-col gap-2 pb-3 border-b border-white/10 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">
                {cuttingFrom
                  ? `${cuttingFrom} — ${t('hooks.stereoWave', 'stereo waveform')}`
                  : t('hooks.noneYet', 'Nothing on the table yet')}
              </h2>
              <p className="text-[11px] text-emerald-300 font-mono">
                {peaks
                  ? `${formatMoment(peaks.seconds)} · ${hooks.length} ${t('hooks.regionsFound', 'moments found in the sound')}`
                  : t('hooks.pickToDraw', 'Pick a song on the left and it is drawn here.')}
              </p>
            </div>
            {chosen && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-extrabold text-emerald-300 font-mono shrink-0">
                {chosen.score >= strongest - 0.001 ? t('hooks.strongest') : `${Math.round(chosen.score * 100)}% ${t('hooks.ofStrongest', 'of the strongest')}`}
              </span>
            )}
          </div>

          <div className="bg-black/70 rounded-xl border border-white/10 p-3 sm:p-4 relative overflow-hidden">
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono mb-2">
              {ruler.map((mark, at) => <span key={at}>{mark}</span>)}
            </div>
            <div className="relative h-44 sm:h-48 w-full">
              <canvas ref={wave} className="absolute inset-0 w-full h-full" data-hookcanvas />
              {hooks.map((hook, index) => {
                const look_ = REGION[index % REGION.length];
                const lit = index === picked;
                return (
                  <button
                    key={hook.startSeconds}
                    type="button"
                    data-hookregion={index}
                    onClick={() => setPicked(index)}
                    style={placeOf(hook)}
                    className={`absolute inset-y-1 border-2 rounded-xl p-1.5 flex flex-col justify-between text-left transition min-w-[3.5rem] ${look_.edge} ${look_.wash} ${lit ? `${look_.glow} scale-[1.03] z-10` : 'opacity-80 hover:opacity-100'}`}
                    aria-pressed={lit}
                    title={reasonFor(hook)}
                  >
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono self-start truncate max-w-full ${look_.tag}`}>{regionName(hook)}</span>
                    <span className="text-center">
                      <span className="block text-[11px] font-extrabold text-white leading-tight">{formatMoment(hook.startSeconds)}</span>
                      <span className={`block text-[9px] font-mono ${look_.ink}`}>{hook.seconds}s</span>
                    </span>
                    <span className="text-[8px] text-zinc-300 font-mono self-end">{Math.round(hook.score * 100)}%</span>
                  </button>
                );
              })}
              {finding && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />{t('hooks.looking')}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-3 pt-2 border-t border-white/5">
              <span>{t('hooks.aspectNote', '9:16 · cut in this browser')}</span>
              <span>{t('hooks.noFade', 'No fade: the clip starts on the moment')}</span>
            </div>
          </div>

          {/* The meter. Google's page calls it a viral potential analyzer and
              prints 98.5%. The number this room has is the finder's own
              score for the moment — how strongly something arrives there,
              against the song's own loudest point — and that is what the
              bar shows, under its real name. Nobody here can predict
              views, and a bar that claims to would be a lie with a
              gradient on it. */}
          {chosen && (
            <div className="rounded-xl border border-emerald-500/30 bg-zinc-950/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-hookmeter>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white">{t('hooks.energyTitle', 'How strongly something arrives here')}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{reasonFor(chosen)}</div>
                </div>
              </div>
              <div className="w-full sm:w-48 bg-black h-3 rounded-full overflow-hidden border border-white/10 shrink-0">
                <div className="bg-linear-to-r from-emerald-500 via-cyan-400 to-pink-500 h-full" style={{ width: `${Math.round(chosen.score * 100)}%` }} />
              </div>
            </div>
          )}

          {/* The other half of what a shared song's permission allows. */}
          {shared && (
            <Card title={t('buildon.makeTitle', 'Start your own from this')}>
              <p className="text-sm text-zinc-400 leading-snug">
                {t('buildon.makeWhat', 'The style words and the title go into Make a song, with')}{' '}
                <span className="text-zinc-200 font-semibold">{shared.by}</span>
                {t('buildon.makeCredit', '’s name kept with whatever you make.')}
              </p>
              {shared.style ? (
                <p className="text-sm text-zinc-500 leading-snug">
                  <span className="text-zinc-400">{t('buildon.makeStyle', 'The style:')}</span> {shared.style}
                </p>
              ) : (
                <p className="text-sm text-zinc-500 leading-snug">
                  {t('buildon.makeNoStyle', 'This one was posted before styles were kept with a post, so only the title and the name go over.')}
                </p>
              )}
              <button
                type="button"
                onClick={() => onBuildOn?.({ title: shared.title, by: shared.by, style: shared.style })}
                disabled={!onBuildOn}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-onAccent flex items-center gap-2 disabled:opacity-50"
              >
                <Wand2 className="w-4 h-4" />
                {t('buildon.make', 'Make a song from this')}
              </button>
              <Note className="text-xs text-zinc-500 leading-snug">
                {t(
                  'buildon.makeNot',
                  'The new song is written from the words, not from the recording. The music engine reads text — style words, sections, a prompt — and cannot listen to a song, so what you get shares the style you both describe rather than the sound of this one.',
                )}
              </Note>
            </Card>
          )}

          {/* Each moment as a card: hear it, cut it, take it to the video
              desk. The cards are the regions above, opened up — the region
              is where, the card is what to do about it. */}
          {hooks.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-sm font-semibold text-zinc-300">
                {hooks.length === 1 ? t('hooks.foundOne') : `${hooks.length} · ${t('hooks.found')}`}
              </p>
              <div className="grid md:grid-cols-3 gap-3">
                {hooks.map((hook, index) => {
                  const look_ = REGION[index % REGION.length];
                  return (
                  <div
                    key={hook.startSeconds}
                    data-hookcard={index}
                    className={`rounded-2xl border bg-zinc-950/60 p-3 space-y-2 ${index === picked ? look_.edge : 'border-white/10'}`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-base font-bold text-white">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded mr-2 align-middle ${look_.tag}`}>{regionName(hook)}</span>
                        {t('hooks.at')} {formatMoment(hook.startSeconds)}
                      </p>
                      {hook.score >= 0.99 && (
                        <span className="text-xs text-emerald-400 font-semibold">{t('hooks.strongest')}</span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">{reasonFor(hook)}</p>
                    <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                      <div className={`h-full ${look_.tag.split(' ')[0]}`} style={{ width: `${Math.round(hook.score * 100)}%` }} />
                    </div>
                    {/* Hear it first. Above the cut, because it is the
                        cheaper of the two and the one that decides whether
                        the other is worth pressing. */}
                    <button
                      type="button"
                      data-hear={index}
                      onClick={() => { setPicked(index); void hear(hook, index); }}
                      className="min-h-[44px] w-full py-2.5 rounded-xl text-sm font-semibold bg-zinc-950 border border-zinc-700 text-zinc-200 hover:border-sky-500 hover:text-sky-300 flex items-center justify-center gap-1.5"
                    >
                      {hearing === index ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {hearing === index
                        ? t('hooks.stopHear', 'Stop')
                        : t('hooks.hear', 'Hear this bit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPicked(index); void cut(hook, index); }}
                      disabled={cutting !== null || !videoSupported()}
                      className="min-h-[44px] w-full py-2.5 rounded-xl text-sm font-extrabold bg-emerald-500 text-onAccent hover:bg-emerald-400 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {cutting === index ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                      {cutting === index ? t('hooks.cutting') : t('hooks.cut')}
                    </button>
                    {/* And on to a real clip for this moment.

                        Only for a song of hers. A shared song gets no cover
                        art, no Post to Live and no studio for the reason at
                        the top of this file, and handing it to the video
                        desk as the soundtrack of something she makes is the
                        same claim under another name. */}
                    {selected && !shared && onMakeVideo && (
                      <button
                        type="button"
                        data-tovideo={index}
                        onClick={() => {
                          stopHearing();
                          /* Everything the moment knows, not its length.
 
                             Carli, 21 September 2026: *"die liedjie hook
                             lê nie daar in video nie en daar is geen
                             prompt in die video desk nie."* The callback
                             took `seconds` and the studio dropped it, so
                             the desk knew the song and nothing about
                             which twenty-two seconds of it this was
                             about — and wrote no shot, because nothing
                             carried what to write one from. The whole
                             moment travels now and
                             `lib/hookhandover.ts` turns it into a shot,
                             a shape, a length and a word to the copilot
                             standing in that room. */
                          onMakeVideo({
                            trackId: selected.id,
                            hook: {
                              title: selected.title,
                              genre: selected.genre,
                              bpm: selected.bpm,
                              startSeconds: hook.startSeconds,
                              seconds: hook.seconds,
                              kind: hook.kind,
                              label: hook.label,
                              arrived: hook.arrived,
                            },
                          });
                        }}
                        className="min-h-[44px] w-full py-2.5 rounded-xl text-sm font-semibold bg-zinc-950 border border-zinc-700 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 flex items-center justify-center gap-1.5"
                      >
                        <Film className="w-3.5 h-3.5" />
                        {t('hooks.toVideo', 'Make a video for it')}
                      </button>
                    )}
                    {cutting === index && (
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-emerald-400 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {!videoSupported() && hooks.length > 0 && (
            <p className="text-sm text-amber-300">{t('video.unsupported')}</p>
          )}
        </main>

        {/* ── Under the waveform: where it goes, and the clip when there is one ── */}
        <aside className={`${PANEL} space-y-3`} data-hookexports>
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-bold uppercase text-white">
            <span>{t('hooks.presetsTitle', 'Export presets')}</span>
            <span className="text-[10px] text-emerald-300 font-mono">{clip ? t('hooks.presetReady', 'READY') : t('hooks.presetWaiting', 'CUT ONE')}</span>
          </div>
          {/* Three places a hook goes, and the honest thing about them: they
              all take the same upright file. A preset here sets the length
              that platform likes; the cut is the same cut. */}
          <div className="grid gap-2 sm:grid-cols-3">
          {([
            ['tiktok', 15, t('hooks.presetTiktok', 'TikTok Sound'), t('hooks.presetTiktokSub', '15s, upright')],
            ['reels', 30, t('hooks.presetReels', 'Instagram Reels'), t('hooks.presetReelsSub', '30s, upright')],
            ['shorts', 15, t('hooks.presetShorts', 'YouTube Shorts'), t('hooks.presetShortsSub', '15s, upright')],
          ] as const).map(([id, length, name, sub]) => (
            <button
              key={id}
              type="button"
              data-hookpreset={id}
              onClick={() => {
                setSeconds(length);
                if (selected) void look(selected, length);
              }}
              className={`w-full p-3 min-h-[44px] rounded-xl border text-left transition flex items-center justify-between gap-2 ${
                seconds === length ? 'bg-emerald-500/15 border-emerald-500/40' : 'bg-zinc-800/40 hover:bg-zinc-700/40 border-white/5'
              }`}
            >
              <span className="min-w-0">
                <span className="block text-xs font-bold text-white">{name}</span>
                <span className="block text-[9px] text-zinc-400 font-mono">{sub}</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-300 shrink-0">{t('hooks.secondsArrow', '{n}s →').replace('{n}', String(length))}</span>
            </button>
          ))}
          </div>
          <Note className="text-xs text-zinc-500 leading-snug">
            {t('hooks.presetsWhy', 'All three take the same 9:16 file. A preset only sets the length that platform likes; the cut is the same cut, and posting it is done from the phone’s own share sheet.')}
          </Note>

          {/* The clip, where the page drew its "test with video preview":
              a real upright player of the real file, not a modal with a
              note in it. */}
          {clip && (selected || video || shared) && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-3" data-hookclip>
              <p className="text-sm text-emerald-300 font-semibold">{t('hooks.ready')}</p>
              <video src={clip.url} controls className="rounded-xl border border-zinc-800 bg-black w-full max-h-80 mx-auto" />
              <button
                type="button"
                onClick={() =>
                  downloadBlob(
                    clip.blob,
                    safeFilename(
                      /* A shared clip is filed under both names for the same
                         reason the shelf entry is: a folder of downloads
                         should say whose song each one is. */
                      shared ? `${shared.title}-${shared.by}-hook` : `${selected?.title ?? video?.name ?? 'hook'}-hook`,
                      clip.ext,
                    ),
                  )
                }
                className="min-h-[44px] w-full px-3 py-2 rounded-xl text-sm bg-emerald-500 text-onAccent font-extrabold hover:bg-emerald-400 flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {t('video.save')}
              </button>

              {/* A hook exists to be posted. Only for a song made here: a
                  clip cut out of somebody's own video is not necessarily
                  theirs to post with our hashtags on it. */}
              {selected && (
                <ShareRow
                  title={selected.title}
                  what={t('hooks.shareWhat', 'A hook from a song I made on FutureBox.')}
                  hashtags={['newmusic', selected.genre.replace(/[^A-Za-z0-9]/g, '').toLowerCase()].filter(Boolean)}
                  /* The clip itself, so the phone's own share sheet hands the
                     video to whichever app she picks rather than a caption
                     with nothing attached. */
                  file={async () =>
                    new File(
                      [clip.blob],
                      safeFilename(`${selected.title}-hook`, clip.ext),
                      { type: clip.blob.type || 'video/mp4' },
                    )
                  }
                />
              )}
            </div>
          )}
        </aside>
        </div>
      </div>

      <History surface="hooks_feed" reloadKey={kept} />
    </div>
  );
}
