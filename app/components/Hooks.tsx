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
import { Smartphone, Loader2, Download, Film, Plus, Scissors, Music, Trash2, Radio, Wand2 } from 'lucide-react';
import { loadTracks, downloadBlob, safeFilename, type Track } from '../lib/library';
import { readAudio } from '../lib/trackaudio';
import { findHooks, sectionHooks, decodeTrack, formatMoment, type Hook } from '../lib/hooks';
import { renderVideo, styleFor, videoSupported, extensionFor } from '../lib/video';
import { accessToken } from '../lib/cloud';
import { useLang } from '../lib/i18n';
import Cost from './Cost';
import History from './History';
import { makeId, rememberMake } from '../lib/makes';
import { useCopilotOps, matchByTitle } from '../lib/copilotactions';
import ShareRow from './ShareRow';
import Note from './Note';
import Card from './Card';
import { addUpload, loadUploads, removeUpload } from '../lib/uploads';
import { cutHook, soundOf } from '../lib/videoclip';
import { fetchCreator, nameOf } from '../lib/radar';

const LENGTHS = [15, 30];

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
}: {
  /* Into Make a song, with the style, the title and whose it was. Optional so
     the room still mounts in a probe page that has no studio around it. */
  readonly onBuildOn?: (from: { title: string; by: string; style: string }) => void;
} = {}) {
  const { t } = useLang();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selected, setSelected] = useState<Track | null>(null);
  const [hooks, setHooks] = useState<Hook[]>([]);
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
  useCopilotOps('hooks_feed', {
    pick_song: (value) => {
      const track = matchByTitle(tracks, value);
      if (track) void look(track, seconds);
    },
    set_seconds: (value) => {
      const wanted = Number.parseInt(value.trim(), 10);
      if (!LENGTHS.includes(wanted)) return;
      setSeconds(wanted);
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
        // The plan first, where there is one: the app knows where the chorus
        // is, and a known boundary beats a loudness peak. Analysis fills in
        // behind it, and a duplicate start is dropped rather than offered
        // twice under two names.
        const named = sectionHooks(track.parts ?? [], buffer.duration, clipSeconds);
        const found = findHooks(buffer, clipSeconds, 3).filter(
          (one) => !named.some((part) => Math.abs(part.startSeconds - one.startSeconds) < 2),
        );
        setHooks(named.concat(found).slice(0, 5));
      } finally {
        setFinding(false);
      }
    },
    [clip],
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
    if (hook.kind === 'arrival') return t('hooks.arrives');
    if (hook.kind === 'fullest') return t('hooks.fullest');
    return t('hooks.safe');
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Smartphone className="w-6 h-6 text-emerald-400" />
          {t('hooks.title')}
        </h4>
        <p className="text-base text-zinc-400 pt-1 max-w-2xl leading-relaxed">{t('hooks.sub')}</p>
        {/* Finding and cutting both happen in the browser, so nothing here
            spends. Said rather than left blank: a room that hands you a
            finished clip and says nothing about money is read as hiding one. */}
        <Cost credits={0} className="pt-1.5" />
      </div>

      {/* ── What to cut from ─────────────────────────────────────────────

          The channel, then anything brought in, then the two ways to bring
          something in. An empty channel is no longer a dead end: the room
          used to print "make a song first" over the whole screen, which is
          the wrong answer for anybody who already has a recording — or a
          video they filmed.

          The video button is the honest half of "can this pull clips out of
          YouTube". It cannot, and no app can lawfully: their Terms allow
          access only through the playback pages, the embeddable player, or a
          means they designate. A file you own is a different thing entirely,
          and it is the thing that was actually wanted. */}
      <>
          {/* Boxed, like every other room.

              This section had no box at all: a loose paragraph, then chips,
              then two more loose paragraphs down the page. `docs/PACKAGING.md`
              §2 is one shape for all thirteen rooms and this was one of the
              ones still writing its own. */}
          <Card title={t('hooks.fromTitle', 'What are we cutting from?')}>
            <p className="text-sm text-zinc-400">
              {tracks.length === 0 && brought.length === 0 ? t('hooks.none') : t('hooks.pick')}
            </p>
            <div className="flex flex-wrap gap-2">
              {[...tracks, ...brought].map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => look(track, seconds)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-sm border transition-all flex items-center gap-2 ${
                    selected?.id === track.id
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  {track.title}
                </button>
              ))}

              {video && (
                <span className="px-3 py-2 rounded-xl text-sm border bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold flex items-center gap-2">
                  <Film className="w-3.5 h-3.5" />
                  {video.name}
                </span>
              )}

              {/* Songs the room is open on. In the same row as her own, because
                  they are the same choice — what am I cutting from — and a
                  second list further down would be a second place to look.
                  The name under the title is the point of the whole thing:
                  whose song this is, before anything is done to it. */}
              {open.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => void pickShared(post)}
                  disabled={taking}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-sm border transition-all flex items-center gap-2 disabled:opacity-50 ${
                    shared?.id === post.id
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span className="text-left leading-tight">
                    {post.title}
                    <span className="block text-xs opacity-70">{post.by}</span>
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => songFile.current?.click()}
                disabled={taking}
                className="min-h-[44px] px-3 py-2 rounded-xl text-sm border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-600 transition-all flex items-center gap-2 disabled:opacity-50"
              >
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

              <button
                type="button"
                onClick={() => videoFile.current?.click()}
                disabled={taking}
                className="min-h-[44px] px-3 py-2 rounded-xl text-sm border border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-600 transition-all flex items-center gap-2 disabled:opacity-50"
              >
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

              {shared && (
                <button
                  type="button"
                  onClick={() => {
                    setShared(null);
                    setHooks([]);
                  }}
                  className="min-h-[44px] px-3 py-2 rounded-xl text-sm border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('board.dropSong', 'Take it back out')}
                </button>
              )}

              {video && (
                <button
                  type="button"
                  onClick={() => {
                    setVideo(null);
                    setHooks([]);
                  }}
                  className="min-h-[44px] px-3 py-2 rounded-xl text-sm border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all flex items-center gap-2"
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
          </Card>

          {/* The length, as its own card with the choices as the small buttons
              along the bottom — which is exactly what the `tools` row is for. */}
          <Card
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

          {/* The other half of what the permission allows.

              Placed above the moments rather than beside each one: every
              moment of the same song hands over the same style, the same
              title and the same name, so a button on each of five cards is
              the same button five times.

              The sentence under it is not decoration. Somebody who presses
              this expecting the new song to *sound* like the old one has
              understood the app as most people would, and will only find out
              otherwise from a result that disappoints them. The engine takes
              text. Saying so before the press is the whole of being honest
              about it. */}
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
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent flex items-center gap-2 disabled:opacity-50"
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

          {finding && <p className="text-sm text-zinc-500">{t('hooks.looking')}</p>}

          {hooks.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-sm font-semibold text-zinc-300">
                {hooks.length === 1 ? t('hooks.foundOne') : `${hooks.length} · ${t('hooks.found')}`}
              </p>
              <div className="grid md:grid-cols-3 gap-3">
                {hooks.map((hook, index) => (
                  <div key={hook.startSeconds} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-lg font-bold text-white">
                        {t('hooks.at')} {formatMoment(hook.startSeconds)}
                      </p>
                      {hook.score >= 0.99 && (
                        <span className="text-sm text-emerald-400 font-semibold">{t('hooks.strongest')}</span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-400">{reasonFor(hook)}</p>
                    <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${Math.round(hook.score * 100)}%` }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => cut(hook, index)}
                      disabled={cutting !== null || !videoSupported()}
                      className="min-h-[44px] w-full py-2.5 rounded-xl text-sm font-semibold bg-zinc-950 border border-zinc-700 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {cutting === index ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                      {cutting === index ? t('hooks.cutting') : t('hooks.cut')}
                    </button>
                    {cutting === index && (
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-emerald-400 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!videoSupported() && hooks.length > 0 && (
            <p className="text-sm text-amber-300">{t('video.unsupported')}</p>
          )}

          {clip && (selected || video || shared) && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3">
              <p className="text-sm text-emerald-300">{t('hooks.ready')}</p>
              <video src={clip.url} controls className="rounded-xl border border-zinc-800 bg-black max-h-96 mx-auto" />
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
                className="min-h-[44px] px-3 py-2 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {t('video.save')}
              </button>

              {/* A hook exists to be posted. Offering that here, where the file
                  is, saves somebody working out the caption twice.

                  Only for a song made here. A clip cut out of somebody's own
                  video is not necessarily theirs to post with our hashtags on
                  it, and a share row that assumes it is would be this app
                  making a claim about a file it has never seen. */}
              {selected && (
                <ShareRow
                  title={selected.title}
                  what={t('hooks.shareWhat', 'A hook from a song I made on FutureBox.')}
                  hashtags={['newmusic', selected.genre.replace(/[^A-Za-z0-9]/g, '').toLowerCase()].filter(Boolean)}
                  /* The clip itself, so the phone's own share sheet hands the
                     video to whichever app she picks rather than a caption
                     with nothing attached. Nothing else can reach this blob —
                     it is in this room's state and it is not in storage. */
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
      </>
      <History surface="hooks_feed" reloadKey={kept} />

    </div>
  );
}
