'use client';

/**
 * The live room, played the way a phone plays things.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli put Live on a tab where the search used to be: "Dit is waar mense die
 * tiktik like videos van almal gaan kyk." A tab that is where everybody else's
 * work is has to play like the thing it is compared to — one at a time, full
 * screen, thumb up for the next one. A list of cards with a Listen button on
 * each is a directory of the room, not the room.
 *
 * ── Why it is not `SongScreen` ───────────────────────────────────────────
 *
 * That one plays your own library: it reads the audio out of this device by
 * track id, and it carries the lyrics, the timing and the cover, none of which
 * a post in the room has. This plays a signed URL somebody else's account gave
 * us, and it knows a title, a name and a note. Sharing the component would
 * have meant a `source` parameter and two sets of branches inside every part
 * of it, which is how one screen becomes neither.
 *
 * What is shared is what was learned building that one, and all three cost a
 * bug the first time:
 *
 *   · A portal to `document.body`. `position: fixed` is only relative to the
 *     window while no ancestor carries a transform, a filter or `contain`, and
 *     the studio around this carries all three — measured at twenty pixels
 *     down, with the room behind showing along the top edge.
 *   · Literal colours. This app remaps Tailwind's `white` and `black` onto
 *     theme variables, so `text-white` over a picture renders as near-black in
 *     the light theme.
 *   · The observer's dependencies include `mounted`. Through a portal there is
 *     no scroller on the first render at all, so an effect that runs once runs
 *     against nothing and never again.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Headphones, Heart, Loader2, Pause, Play, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import { countWhenPlayed } from '../lib/played';
import { lineAt, timelineOf, type Part } from '../lib/timeline';
import Cover from './Cover';

/** Literal, because the theme remaps `white` and `black` onto its own tokens. */
const INK = '#ffffff';
const INK_SOFT = 'rgba(255,255,255,0.82)';
const INK_DIM = 'rgba(255,255,255,0.55)';
const GLASS = 'rgba(0,0,0,0.55)';

export interface RoomPost {
  readonly id: string;
  readonly title: string;
  readonly by: string;
  readonly note: string;
  readonly seconds: number;
  /** A signed URL, or null once it has expired or the file is gone. */
  readonly audio: string | null;
  /**
   * A moving picture with its own sound, where the post is a video.
   *
   * Carli: *"Music videos en music shorts moet ook na live toe kan post."*
   *
   * Its own field rather than `audio`, and that is not tidiness: a panel that
   * found a url in `audio` would draw a still with a player under it and play
   * the sound of a video nobody could see. Two shapes in one scroller, and
   * which one a panel is has to be answerable before anything is drawn.
   */
  readonly video?: string | null;
  /**
   * Why this post has no picture, when the room could not find one.
   *
   * ── A panel that vanishes teaches nothing ────────────────────────────
   *
   * Carli, 23 September 2026, for the fourth time: *"die video werk steeds
   * nie op live nie."*
   *
   * `/api/live` has worked out which of four things went wrong since 21
   * September, and `LiveChannel` prints the sentence — in the LIST. This
   * scroller, which is the room as anybody actually uses it, filtered the
   * post out instead: `posts.filter(one => one.audio || one.video)`. So
   * she posted a film, opened Live, and found nothing at all, with no
   * sentence anywhere near it.
   *
   * The filter was right about songs: a panel you swipe to that does
   * nothing is worse than one that is not there. It was wrong about a post
   * that KNOWS why it is empty, because then the panel is not nothing — it
   * is the answer, and it is the only place she was ever going to look.
   */
  readonly why?: 'unread' | 'no_row' | 'no_path' | 'no_file' | null;
  /**
   * The song this post is of, where it is one of somebody's own.
   *
   * Not the post's id: the charts on Spotlight are keyed on the song, and a
   * chart keyed on posts would list the same song once per time it was put in
   * the room. Absent for a post that only announces somebody going live
   * somewhere else, which has no song behind it to count.
   */
  readonly sourceId?: string;
  /** The sleeve the owner made, when there is one. */
  readonly cover?: string | null;
  /**
   * What kind of song it is, where the maker wrote one down.
   *
   * Carli, 14 September 2026: *"Die oomblik wanneer hy binne die play in gaan
   * dan wys dit nie daar binne ook die genre van die liedjie nie, net buite
   * die play room."* The list outside is the directory of the room; this is
   * the room, and the reason she wanted a genre on a song at all was so
   * somebody listening could learn which ones work — which happens in here.
   *
   * Nobody in the room can look it up: a song's genre lives on its maker's
   * own row, and everybody reading is somebody else. Empty for an episode or
   * a link, which have no genre to have.
   */
  readonly genre?: string;
  /**
   * The song's plan — its `[Section]` blocks, their lines and their lengths.
   *
   * Carli, 14 September 2026: *"Die play room moet die liedjie se woorde
   * speel."*
   *
   * Carried on the post because nothing in here can look them up: a song's
   * words are on its maker's own row and on its maker's own device, and
   * everybody reading the room is somebody else. The same reason as the
   * genre, and the reason this screen has been silent since it was written.
   *
   * The PLAN and not finished timings, so the room spreads it over whatever
   * the file actually plays and a song a second longer than its row says
   * stays in step. Null for an episode, a link, or a song with no words.
   */
  readonly words?: readonly Part[] | null;
  /**
   * How many people have hearted it, and whether this reader is one of them.
   *
   * Carli, seeing them on the list and not in here: "dit moet binne die play
   * the room funksie ook wees wanneer mens scroll van 1 liedjie na die
   * volgende." She is right that this is the screen that needs them most —
   * the list is the directory of the room and this is the room, and a heart
   * you have to leave the song to give is a heart nobody gives.
   *
   * Null where the count could not be read. Never nought: see `/api/live`.
   */
  readonly hearts: number | null;
  readonly hearted: boolean;
  /** Listened through, not opened. Null for the same reason as `hearts`. */
  readonly plays: number | null;
}

export default function RoomScreen({
  posts,
  startAt,
  onClose,
  onHeart,
  signedIn,
}: {
  readonly posts: readonly RoomPost[];
  /** The post that was tapped, so it opens on that one. */
  readonly startAt: string;
  readonly onClose: () => void;
  /** Heart it, or take the heart back. The parent owns the count. */
  readonly onHeart: (id: string) => void;
  /** Somebody signed out can see the count and cannot add to it. */
  readonly signedIn: boolean;
}): React.ReactElement {
  const { t } = useLang();

  /* The live room full screen. */
  useBackLayer(true, onClose);
  const scroller = useRef<HTMLDivElement | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  /** Which post the element is currently on, for the recovery below. */
  const nowPlaying = useRef<string | null>(null);

  /* Only what can actually be played, PLUS anything that knows why it
     cannot. A panel you swipe to and that does nothing is worse than one
     that is not there; a panel that says what went wrong is the opposite,
     and it is the only place somebody scrolling will ever see it. */
  const playable = useMemo(
    () => posts.filter((one) => Boolean(one.audio || one.video || one.why)),
    [posts],
  );

  /**
   * The video elements on screen, by post.
   *
   * A song is played through one shared `<audio>` — there is only ever one
   * song playing, and reusing the element is what lets the buffer survive a
   * refresh (see the long note in `start`). A video cannot work that way: it
   * has to be drawn where the panel is, so each video panel owns its own
   * element and registers it here for the transport to find.
   */
  const videos = useRef(new Map<string, HTMLVideoElement>());

  /**
   * Whichever element this post plays through.
   *
   * Every path that starts, stops or toggles goes through this rather than
   * reaching for `audio.current`, because reaching for `audio.current` on a
   * video post is how a room ends up with a picture that does not move and a
   * play button that does nothing.
   */
  const mediaFor = useCallback(
    (one: RoomPost | undefined | null): HTMLMediaElement | null => {
      if (!one) return null;
      return one.video ? videos.current.get(one.id) ?? null : audio.current;
    },
    [],
  );
  const opening = Math.max(0, playable.findIndex((one) => one.id === startAt));

  const [at, setAt] = useState(opening);
  const [playing, setPlaying] = useState(false);
  /** How far into the song it is, in seconds. Only the words read this. */
  const [along, setAlong] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const post = playable[at];

  /**
   * The freshest copy of the list, without anything depending on it.
   *
   * The room refreshes on a timer and hands down a whole new array each
   * time. Everything below reads the post it needs THROUGH this, so a
   * refresh cannot re-run an effect — see the note on the play effect, which
   * is the fault this exists for.
   */
  const latest = useRef(playable);
  latest.current = playable;

  /* One element for the whole screen, made once. A second element per panel is
     how a feed ends up playing two songs at the same time. */
  useEffect(() => {
    const element = new Audio();
    /* ── Fetch ahead, rather than starting on the first few kilobytes ──

       Carli, 14 September 2026: *"Die een liedjie wat ek in die live room
       gepost het is hakkerig."*

       This set `src` and called `play()`, which starts as soon as the
       browser has enough to begin — and then runs out. On the device that
       made the song there is nothing to run out of, because the channel
       plays it from IndexedDB; the live room is the only place the file
       comes over a network, which is why this is the only place it
       stutters.

       `preload = 'auto'` tells the browser to keep fetching rather than
       stopping at metadata. It is not a promise of a gapless play — a
       weak signal is a weak signal — but "start immediately and stall"
       becomes "start a beat later and run", which is the whole of what
       she is describing. */
    element.preload = 'auto';
    element.addEventListener('ended', () => setPlaying(false));
    /* The browser says when it has run dry, so the screen can say so too
       rather than looking broken. `waiting` fires on a stall mid-play,
       `playing` when it recovers. */
    element.addEventListener('waiting', () => setLoading(true));
    element.addEventListener('playing', () => setLoading(false));
    /* Where the song is, so the words can follow it. `timeupdate` fires about
       four times a second, which is the granularity a sung line needs and far
       less work than a frame loop. */
    element.addEventListener('timeupdate', () => setAlong(element.currentTime));
    /* ── When the link really has gone stale ───────────────────────────

       The play effect no longer follows the signed url, which is what
       stopped the room restarting every song every few seconds. The url
       it stopped following did have one honest job: these links expire,
       and a refresh used to hand over a fresh one by accident.

       So do it on purpose, and only when it is needed. A 403 on an
       expired link surfaces here as a media error; the freshest url for
       the same post is a lookup away, and if it is the one already
       loaded then the fault is the file and not the signature, and
       reloading it would be a loop. */
    element.addEventListener('error', () => {
      if (!element.src) return;
      const fresh = latest.current.find((each) => each.id === nowPlaying.current);
      if (!fresh?.audio || fresh.audio === element.src) return;
      element.src = fresh.audio;
      void element.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    });
    audio.current = element;
    return () => {
      element.pause();
      element.src = '';
    };
  }, []);

  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    box.scrollTo({ top: opening * box.clientHeight, behavior: 'auto' });
  }, [opening, mounted]);

  /** Which panel is on screen, asked of the browser rather than of a scroll sum. */
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset.at ?? '0');
          setAt(index);
        }
      },
      { root: box, threshold: 0.6 },
    );
    box.querySelectorAll('[data-at]').forEach((panel) => watcher.observe(panel));
    return () => watcher.disconnect();
  }, [playable.length, mounted]);

  /** How to stop watching whatever was playing before this one. */
  const watching = useRef<null | (() => void)>(null);
  useEffect(() => () => watching.current?.(), []);

  const start = useCallback(async (one: RoomPost) => {
    const element = mediaFor(one);
    if (!element || !(one.audio || one.video)) return;
    /* ── Already playing this one? Then leave it alone ──────────────────

       Carli, 14 September 2026: *"Die een liedjie wat ek in die live room
       gepost het is hakkerig."* — of a GENERATED song, which is a few
       megabytes of mp3 and not the 31MB WAV a Booth mixdown is. So it was
       never bandwidth, and that is what made this findable.

       The live room refreshes on an interval. Every refresh rebuilds the
       post list with `.map()`, which makes new objects out of identical
       data, so the panel on screen is a new object every few seconds —
       and the effect below, keyed on that object, re-ran, paused the
       audio and set `src` again. Setting `src` to the SAME url still
       makes the browser throw the buffer away and start over.

       So the song restarted every refresh interval, for ever, and it
       sounded exactly like stuttering.

       Two guards, because either alone would do and both together mean a
       future refactor of the other one cannot bring it back. */
    if (one.audio && element.src === one.audio && !element.paused) return;
    /* A video panel's element already has its own `src` in the markup, and
       setting it again is the same buffer-throwing-away that made every song
       in this room stutter. Nothing to do but press play. */
    if (one.video && !element.paused) return;
    setLoading(true);
    nowPlaying.current = one.id;
    if (one.audio) element.src = one.audio;
    try {
      await element.play();
      setPlaying(true);
      /* The live room counts towards the same chart. `one.id` is the post
         rather than the song, so the song's own id is what is watched — a
         chart keyed on posts would list the same song four times.

         Watched rather than counted here. The room plays a song for every
         panel somebody scrolls past, so signalling at `play()` counted
         scrolling; `countWhenPlayed` waits until 65% of it has actually gone
         by. The previous song's watcher is dropped first, or a scroll through
         twenty panels leaves twenty of them listening. */
      watching.current?.();
      watching.current = one.sourceId ? countWhenPlayed(element, one.sourceId) : null;
    } catch {
      /* Autoplay refused until somebody has touched the page. Not an error and
         not worth a message — the play button is right there and pressing it
         is the gesture the browser is waiting for. */
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Whatever is on screen is what plays.

     Keyed on WHICH post and WHERE its file is, never on the post object.
     The room hands down a fresh array on every refresh — see the note in
     `start` — so an effect that depends on the object runs again every few
     seconds, and its cleanup pauses the song on the way. */
  /* ── On WHICH post, and on nothing else ────────────────────────────

     Carli, 14 September 2026, after the first fix shipped: *"Al die
     liedjies binne live room is hakkerig."* — all of them, not the one.

     The first fix keyed this on the post's id AND on its audio url, on
     the reasoning that a file moving is a real reason to reload. The url
     is a SIGNED url. `/api/live` mints it with `createSignedUrl` on every
     single request, and a Supabase signature carries the moment it was
     issued — so the same file on the same row comes back under a
     different url every few seconds, for ever.

     So the dependency that was added to be careful was the one that
     changed constantly: every refresh re-ran this, the cleanup paused the
     song, and `start` saw a url it had never seen and threw the buffer
     away. The guard inside `start` never got a chance, because by the
     time it ran the url really had changed. That is why it was every
     song, and why the first fix made no difference to her.

     The id is the identity. A post with the same id is the same song, and
     an element already playing it needs nothing done to it. The url is
     read through `latest` at the moment it is needed, so this still gets
     the freshest one without depending on it. */
  const playingId = post?.id;
  useEffect(() => {
    if (!playingId) return;
    const one = latest.current.find((each) => each.id === playingId);
    if (one) void start(one);
    return () => {
      /* Both, because a scroll from a video panel to a song panel leaves the
         video's own element behind: pausing only the shared audio would let a
         filmed take go on talking under the next song. */
      mediaFor(one)?.pause();
      audio.current?.pause();
      setPlaying(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingId, start]);

  /**
   * The words, spread over the length, for the panel being listened to.
   *
   * Keyed on which post for the same reason as everything else in here: the
   * plan arrives on a new array object every refresh, and a timeline rebuilt
   * every few seconds would be a new array under the renderer for no reason.
   */
  const timed = useMemo(() => {
    const one = latest.current.find((each) => each.id === playingId);
    const plan = one?.words ?? [];
    return plan.length ? timelineOf(plan, one?.seconds || 0) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingId]);
  const sung = timed.length ? lineAt(timed, along) : -1;

  /**
   * The next one down, fetched while this one plays.
   *
   * A scroller's worst moment is the scroll itself: the panel arrives, the
   * file has not been asked for yet, and the first seconds are silence or
   * stutter. One ahead and no further — the element is never played, it only
   * warms the browser's cache, and every panel preloaded would be a room
   * that downloads twenty songs to play one.
   *
   * Torn down on every move, so scrolling fast does not leave a trail of
   * half-finished downloads competing with the one being listened to.
   */
  const ahead = useRef<HTMLAudioElement | null>(null);
  /* Keyed on which post is next, for the same reason as the effect above:
     `playable` is a new array on every refresh, so depending on it tore this
     down and started the next song's download again every few seconds —
     competing for the bandwidth of the one being listened to, which is the
     opposite of what warming it is for. */
  const nextId = playable[at + 1]?.id;
  useEffect(() => {
    const next = latest.current.find((each) => each.id === nextId);
    /* Songs only. A video warmed one panel ahead is tens of megabytes
       downloaded to be looked at for a second, on a phone, over whatever
       signal is going — and unlike a song it is drawn by its own element
       when it arrives rather than needing the cache. */
    if (!next?.audio) return;
    const warm = new Audio();
    warm.preload = 'auto';
    warm.src = next.audio;
    ahead.current = warm;
    return () => {
      warm.src = '';
      if (ahead.current === warm) ahead.current = null;
    };
  }, [nextId]);

  const toggle = () => {
    const element = mediaFor(post);
    if (!element || !post) return;
    if (playing) {
      element.pause();
      setPlaying(false);
      return;
    }
    void element.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  if (!mounted) return <></>;

  return createPortal(
    <div className="fixed inset-0 z-[80]" style={{ background: '#050505' }}>
      {/* Top left, and deliberately.

          The search is a small round button fixed to the top-right corner of
          every screen, above this one. A close control in the same corner is
          a close control nobody can press — Playwright found it by trying,
          and reported the search icon intercepting the click. Left is where
          this kind of screen puts it anyway. */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t('room.close', 'Close')}
        className="absolute left-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full"
        style={{ background: GLASS, color: INK }}
      >
        <X className="h-5 w-5" />
      </button>

      <div
        ref={scroller}
        className="h-full w-full overflow-y-auto"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {playable.length === 0 && (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <p style={{ color: INK_SOFT }}>
              {t('room.empty', 'Nothing in the room can be played right now.')}
            </p>
          </div>
        )}

        {playable.map((one, index) => (
          <section
            key={one.id}
            data-at={index}
            className="relative flex h-full w-full flex-col justify-end overflow-hidden p-5"
            style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
          >
            {/* The picture, and it is the song's own.

                These panels were black. Title, name, and nothing behind them —
                which reads as a song that failed to load rather than as a song
                being played, and it is not what the same song looks like
                anywhere else in the app.

                Seeded on the song rather than on the post, which is the whole
                point: `Cover` draws from its seed, so seeding it on the post
                gave the same song a different picture every time somebody put
                it in the room. One song, one picture, in Make a song, in the
                channel, in the library and here. An `elsewhere` post has no
                song behind it, so it falls back to its own id. */}
            {/* ── A moving picture, or a still ──────────────────────────

                A video post is the one panel in this room that is not a
                sleeve with a song under it. It fills the same space, and it
                brings its own sound — so it is drawn instead of `Cover`
                rather than on top of it, and the transport above knows to
                press play on this element rather than on the shared one.

                `object-contain` and not `cover`: a take filmed on a phone is
                9:16 and so is this panel, but a video made at the desk is
                16:9, and cropping the sides off somebody's music video to
                fill a phone is worse than the bars. `playsInline` because
                iOS otherwise takes it full screen out of the scroller the
                moment it plays, and the room is the scroller. */}
            {/* ── The one that cannot be played, saying so ──────────────
 
                Drawn where the picture would be, in the panel she swiped
                to. `/api/live` worked the reason out; this is the only
                screen in Live that a person scrolling ever reaches, and
                until now it dropped the post instead of printing it. */}
            {!one.video && !one.audio && one.why ? (
              <div
                data-roomgone={one.why}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center"
              >
                <p className="text-base font-semibold text-zinc-200">
                  {t('room.goneTitle', 'This one will not play')}
                </p>
                <p className="text-sm leading-snug text-zinc-400">
                  {one.why === 'unread'
                    ? t('live.goneUnread', 'The video list could not be read just now. Try again in a moment.')
                    : one.why === 'no_row'
                      ? t('live.goneRow', 'This video is not in the account any more.')
                      : one.why === 'no_path'
                        ? t('live.gonePath', 'This video is in the account, but no file was ever kept for it.')
                        : t('live.goneFile', 'The file for this video is missing from the store.')}
                </p>
              </div>
            ) : one.video ? (
              <video
                ref={(element) => {
                  if (element) videos.current.set(one.id, element);
                  else videos.current.delete(one.id);
                }}
                src={one.video}
                data-roomvideo=""
                playsInline
                loop
                preload="metadata"
                className="absolute inset-0 h-full w-full bg-black object-contain"
              />
            ) : (
              <Cover
                seed={one.sourceId || one.id}
                label={one.title}
                photo={one.cover}
                className="absolute inset-0 h-full w-full"
              />
            )}
            {/* Strong in the middle as well as at the ends, like `SongScreen`:
                the words sit there, and a scrim that fades out behind them is
                a scrim that does nothing where it is needed. */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55),rgba(0,0,0,0.45)_45%,rgba(0,0,0,0.88))]" />

            {/* ── The words, following the song ──────────────────────────

                Carli, 14 September 2026: *"Die play room moet die liedjie se
                woorde speel."*

                Above the play control rather than inside the caption: this
                is the middle of the panel, where a lyric belongs and where
                nothing else is, and the caption at the foot is about the
                song rather than in it.

                `pointer-events-none`, because the whole panel is the pause
                button and a lyric that swallows a tap is a lyric that stops
                the song. Three lines at a time — the one being sung and its
                neighbours — because more than that on a phone is a wall, and
                one alone gives no sense of where the song is.

                Literal colours, like everything else on this screen: the app
                remaps Tailwind's white onto a theme variable, so `text-white`
                over a picture renders near-black in the light theme. */}
            {index === at && sung >= 0 && (
              <div className="pointer-events-none absolute inset-x-6 top-1/2 z-10 -translate-y-1/2 space-y-2 text-center">
                {[sung - 1, sung, sung + 1].map((which) => {
                  const line = timed[which];
                  if (!line) return <span key={which} className="block h-6" />;
                  const now = which === sung;
                  return (
                    <p
                      key={`${which}-${line.start}`}
                      className={`leading-tight transition-all duration-300 ${
                        now ? 'text-2xl font-black' : 'text-base'
                      }`}
                      style={{
                        color: now ? INK : INK_DIM,
                        textShadow: now ? '0 2px 12px rgba(0,0,0,0.9)' : undefined,
                      }}
                    >
                      {line.text}
                    </p>
                  );
                })}
              </div>
            )}

            {/* The whole panel is the play control, which is what a thumb
                expects on a screen like this. The button below is for anybody
                who cannot rely on that — a pointer, a screen reader — and both
                do the same thing. */}
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? t('room.pause', 'Pause') : t('room.play', 'Play')}
              className="absolute inset-0"
              style={{ background: 'transparent' }}
            />

            {/* The rail, on the right, where a thumb already is.

                Above the panel's own play control rather than inside it: the
                whole panel is a play button, so a heart drawn as part of that
                stack would be pressed by anybody trying to pause. `z-10` and
                `stopPropagation` on the press are both needed — the first
                puts it over the invisible full-panel button, the second stops
                the press travelling on to it and pausing the song as a heart
                is given.

                Only on the panel being looked at. Drawing it on all of them
                is forty buttons in the accessibility tree for one screen, and
                a thumb resting between two panels could reach the wrong
                song's heart. */}
            {index === at && (
              <div className="absolute bottom-32 right-3 z-10 flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={(event) => {
                    /* The panel underneath is the pause control. Without this
                       a heart pauses the song it is given to. */
                    event.stopPropagation();
                    onHeart(one.id);
                  }}
                  disabled={!signedIn}
                  aria-pressed={one.hearted}
                  aria-label={
                    signedIn
                      ? one.hearted
                        ? t('live.unheart', 'Take the heart back')
                        : t('live.heart', 'Heart it')
                      : t('live.heartSignIn', 'Sign in to heart it')
                  }
                  className="flex flex-col items-center gap-1 disabled:cursor-default"
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-90"
                    style={{
                      background: GLASS,
                      color: one.hearted ? '#34d399' : INK,
                      opacity: signedIn ? 1 : 0.65,
                    }}
                  >
                    <Heart className="h-5 w-5" fill={one.hearted ? 'currentColor' : 'none'} />
                  </span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: INK_SOFT }}>
                    {one.hearts ?? '–'}
                  </span>
                </button>

                {/* Not a button: there is nothing to press. Hearts are people
                    and plays are times, and the two belong beside each
                    other — see the same pair on the list. */}
                <span
                  className="flex flex-col items-center gap-1"
                  title={t('live.playsWhy', 'Counted once somebody has listened to 65% of the song')}
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: GLASS, color: INK }}
                  >
                    <Headphones className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: INK_SOFT }}>
                    {one.plays ?? '–'}
                  </span>
                </span>
              </div>
            )}

            <div className="relative flex items-center gap-3 pb-2">
              <span
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: GLASS, color: INK }}
              >
                {index === at && loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : index === at && playing ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold" style={{ color: INK }}>
                  {one.title}
                </p>
                <p className="truncate text-sm" style={{ color: INK_SOFT }}>
                  {one.by}
                </p>
              </div>
              {/* The genre, beside the name rather than under the note.

                  Drawn as a chip for the same reason as on the list: it is a
                  fact about the song, not more of the sentence about who made
                  it. Absent where there is none — a chip reading "—" is worse
                  than no chip. */}
              {one.genre && (
                <span
                  className="ml-auto flex-shrink-0 rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: GLASS, color: INK_SOFT }}
                >
                  {one.genre}
                </span>
              )}
            </div>

            {one.note && (
              <p className="relative text-sm leading-snug" style={{ color: INK_DIM }}>
                {one.note}
              </p>
            )}

            {/* Where you are in the room, so a thumb knows there is more. */}
            <p className="relative pt-3 text-xs" style={{ color: INK_DIM }}>
              {index + 1} / {playable.length}
            </p>
          </section>
        ))}
      </div>
    </div>,
    document.body,
  );
}
