'use client';

/**
 * The room a child plays in.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 9 October 2026: *"Ek dink die child funksie is net om met liedjie
 * maak te speel - en dalk om die liedjie 'n video te maak."* Then: *"Let the
 * parent give an allowance on an opening page."* Then: *"Gaan aan met die
 * kids kamer."*
 *
 * ── Why this room has no way out of itself ───────────────────────────────
 *
 * `check:kidsafe` measured in October which rooms a child could be left
 * alone in, and the finding that shaped all of this is that the FREE rooms
 * are not the SAFE rooms: the collab room costs nothing and puts a child in
 * a conversation with strangers, the art market costs nothing and is a shop.
 * So a child-friendly version was never going to be "hide some tabs on the
 * rail" — it is one room with nothing else reachable from it.
 *
 * There is therefore no rail in here, no library, no share sheet and no
 * download. The only link out is the grown-up's own page, and
 * `check:kinderkamer` holds that: it reads this file for anything that
 * navigates and fails on a second one.
 *
 * ── Why every choice is a button and nothing is typed ───────────────────
 *
 * A text box is a child typing anything into a prompt that reaches a music
 * model and a video model. The moderation gate would catch the worst of it,
 * and "the gate caught it" is not a thing to design a child's room around.
 * Six things to sing about and four kinds of music means every possible
 * press is one somebody chose on purpose — and it is simply better for a
 * six-year-old, because a blank box is a room with nothing in it.
 *
 * ── Why this room looks nothing like the rest of the app ────────────────
 *
 * The owner, 10 October 2026: *"Sjoe, die kids room page is dood en vervelig,
 * dit moet colourful en exciting wees… dit moet vol kleur en excitement
 * wees, en selfs die uitleg moet anders en uniek wees as die status quo."*
 *
 * She was right, and the fault was that it had been built like every other
 * screen here: headed sections down a column, one accent colour, equal grey
 * tiles. That is the status quo, and for a six-year-old it is a form.
 *
 * Three things changed, and each one is a rule rather than a decoration:
 *
 *   · A PALETTE OF ITS OWN. Warm paper instead of near-black, and fourteen
 *     colours — one per topic — in `lib/kidslook.ts`, where a check can
 *     count them and measure that the words on each are readable.
 *   · A SENTENCE INSTEAD OF HEADINGS. The two choices build "A song about X
 *     that sounds Y" in big type at the top, and it fills in as a child
 *     presses. A heading tells you what a section is for; a sentence tells
 *     you what you are about to get, which is the thing a child is actually
 *     deciding.
 *   · BUBBLES OF THREE SIZES, not a grid. A grid of equal squares is what
 *     every app does. The sizes come from one list in `kidslook.ts` that
 *     does not line up row to row, so the sheet reads as scattered stickers
 *     while staying an ordinary wrapping row underneath — which is what
 *     keeps it working on a phone and keeps every bubble a real button.
 *
 * What did NOT change is every rule above this line: no typing, no way out,
 * nothing but the two choices, and the allowance re-asked after every press.
 * A brighter room is not a looser one.
 *
 * ── The Dream Studio ─────────────────────────────────────────────────────
 *
 * The owner, 13 October 2026, with a whole page Google had drawn: *"Kom ons
 * begin om die app self te upgrade. Hier is 'n nuwe kids studio."* The page
 * is a dark emerald kingdom with five doors across the top — Music Maker,
 * Video Studio, Story Maker, Arcade Fun, FutureBox TV — a star counter, and
 * a sprite called Pip in the corner. That is the room now.
 *
 * What was taken from it as drawn: the beat machine and soundboard
 * (`KidsBeatMaker.tsx`, engine in `lib/kidsbeat.ts`), the stage with its
 * draggable dancers and light show (`KidsStage.tsx`), the two arcade games
 * (`KidsArcade.tsx`), the palette and the type (`globals.css`), the star
 * sparks, the bouncy buttons, the confetti.
 *
 * What was NOT taken, and why, each written at the thing that replaced it:
 * a "Record 10s Clip" button that recorded nothing (the stage holds the real
 * video instead); a chat with a language model, API key in the page, open to
 * whatever a child typed (`lib/kidspip.ts` — Pip's answers are written
 * down); a "Publish to TV" that copied a beat into localStorage (the shelves
 * already keep real songs and real stories, so FutureBox TV is the shelves).
 *
 * What did not change is every rule below this line: no typing into a
 * model, no way out, the allowance re-asked after every press.
 *
 * ── Why the allowance is re-asked after every press ─────────────────────
 *
 * Because the number on screen is the one thing a child will believe. The
 * limit itself is applied in `charge()` and is true whatever this page
 * thinks — see `lib/server/kidsmode.ts` — but a room still showing four
 * songs left after three have been made is a room that is about to
 * disappoint somebody. So the room asks the server again rather than
 * subtracting its own guess.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Film, Heart, Loader2, Mic, Music, Sparkles, Square, X,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useBackLayer } from '../lib/backstack';
import KidsDoor from './KidsDoor';
import StoryShelf from './StoryShelf';
import SongShelf from './SongShelf';
import KidsStoryboard from './KidsStoryboard';
import { kidsNow, type KidsState } from '../lib/kidsdoor';
import { askKidVideo, makeKidSong, startKidVideo, kidWords, KID_TOPICS, KID_SOUNDS, KID_WORDS_MOST } from '../lib/kidsong';
import { stillWorthWaiting } from '../lib/jobwait';
import { asClock, howMany, priceOf } from '../lib/kidsallowance';
import { keepSong, MOST_SONGS, type KeptSong } from '../lib/songkeep';
import { useSongPulse } from '../lib/songpulse';
import { MASCOT_SAYS, spin } from '../lib/kidslook';
import KidsBeatMaker from './KidsBeatMaker';
import KidsStage, { type Scene } from './KidsStage';
import KidsDrumGame from './KidsDrumGame';
import KidsSongLab from './KidsSongLab';
import { EMPTY_PLAN, KID_PLACES, SONG_PARTS, ready, songPrompt, type SongPlan } from '../lib/kidsongplan';
import KidsArcade from './KidsArcade';
import { beatEngine } from '../lib/kidsbeat';
import { confetti } from '../lib/kidsconfetti';
import { PIP_ASKS, pipLine, sayAloud, type PipAsk } from '../lib/kidspip';
import KidsPlaylists from './KidsPlaylists';
import KidsSleep from './KidsSleep';
import KidsGallery from './KidsGallery';
import KidsDrawBoard from './KidsDrawBoard';
import KidsQuiz from './KidsQuiz';
import KidsPictureMaker from './KidsPictureMaker';
import KidsPiano from './KidsPiano';
import KidsEditor from './KidsEditor';
import KidsLoops from './KidsLoops';
import KidsPads from './KidsPads';
import { CodeChooser, CodePad, GrownUpHold } from './KidsLock';
import { childIn, forgetCode, hasCode } from '../lib/kidslock';
import { justSignedInForKids } from '../lib/cloud';
import { ALIVE_WORDS, KID_STYLES, KID_SUBJECTS, makeKidPicture, packDrawing, pictureWords } from '../lib/kidsalive';
import { keepPiece } from '../lib/kidsgallery';
import { BADGES, levelOf, towardNext, type Counts } from '../lib/kidslevel';
import { allSongs } from '../lib/songkeep';
import { allStories } from '../lib/storykeep';
import { allPieces } from '../lib/kidsgallery';

/**
 * The browser's own speech recogniser, or nothing.
 *
 * Chrome and Android have it under the old `webkit` name, Safari on an
 * iPhone has had it since iOS 14.5, and Firefox has none — so the room asks
 * once and draws the button only where pressing it could work. Nothing is
 * recorded by this app: the browser listens and hands back words.
 */
type Recogniser = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((got: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
function recogniser(): Recogniser | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: Recogniser; webkitSpeechRecognition?: Recogniser };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Expressive playful avatars for the mascot. */
const MASCOT_ICONS = ['👾', '🦄', '🌟', '🎸', '🐶', '🚀'] as const;

type Tab = 'home' | 'music' | 'video' | 'story' | 'games' | 'draw' | 'edit' | 'quiz' | 'tv' | 'gallery' | 'badges';

/**
 * ── The six doors, 13 October 2026 ──────────────────────────────────────
 *
 * The owner, with a second page Google drew and the room's photograph: *"Ek wil
 * hê jy moet 'n nuwe kids kamer maak wat meer futureristic is… ek wil hê jy
 * moet direk die foto gebruik wat ek jou gee as agtergrond, en dan die
 * funksies wat daarop moet kom."*
 *
 * The page has six glass doors on the photograph and four buttons along the
 * foot. The doors here are those, in that order, and each line under a door
 * names a thing the room behind it really does — the page's lines were the
 * brief, and a line is kept only once the thing exists. `check:kinderkleur`
 * holds the older rule the same way: nothing in here pretends.
 */
interface Door {
  readonly id: Tab;
  readonly icon: string;
  readonly says: readonly [string, string];
  readonly lines: readonly (readonly [string, string])[];
}

const DOORS: readonly Door[] = [
  { id: 'music', icon: '🎵', says: ['kids.doorMusic', 'Create Music!'], lines: [
    ['kids.doorMusic1', 'Press the bubbles, or type or say your own idea'],
    ['kids.doorMusic2', 'Four loops to tap, a real song, a beat machine'],
  ] },
  /* Its own door. The owner, 15 October 2026: *"Ek sien ook nie die story mode
     waar kinders kinder stories ontwikkel nie."* It was the second tab
     inside the video door, which nobody looking for stories opens. */
  { id: 'story', icon: '📖', says: ['kids.doorStory', 'Story Maker!'], lines: [
    ['kids.doorStory1', 'Pick a hero, a magic place, a surprise and an ending'],
    ['kids.doorStory2', 'A storybook with pictures, read to you page by page'],
  ] },
  { id: 'video', icon: '🎬', says: ['kids.doorVideo', 'Music Videos!'], lines: [
    ['kids.doorVideo1', 'A video of your song, on your own stage'],
    ['kids.doorVideo2', 'Dancers, scenes and lights to play with'],
  ] },
  { id: 'draw', icon: '🎨', says: ['kids.doorDraw', 'Magic Drawing Board!'], lines: [
    ['kids.doorDraw1', 'Draw with your finger, ten crayons'],
    ['kids.doorDraw2', 'Bring it to life, or make a magic picture'],
  ] },
  { id: 'edit', icon: '✂️', says: ['kids.doorEdit', 'Easy Editing!'], lines: [
    ['kids.doorEdit1', 'Your drawings become a film, with your voice telling the story'],
    ['kids.doorEdit2', 'A song underneath, and a drawing brought to life as a frame'],
  ] },
  /* Below Easy Editing since 19 October 2026: "Studio games and beats moet
     een af skuif onder easy editing." */
  { id: 'games', icon: '🎹', says: ['kids.doorGames', 'Studio Games & Beats!'], lines: [
    ['kids.doorGames1', 'Four drum pads, the gems and the bubbles'],
    ['kids.doorGames2', 'Play the piano, copy a tune, keep it as a song'],
  ] },
  { id: 'quiz', icon: '🧠', says: ['kids.doorQuiz', 'Mega Quizzes & Skills!'], lines: [
    ['kids.doorQuiz1', 'Would you rather?'],
    ['kids.doorQuiz2', 'Music, story, video and picture questions'],
  ] },
];

/** What each stage scene is, for the real video made of it. */
const SCENE_WORDS: Readonly<Record<Scene, string>> = {
  palace: 'a sparkling fairy-tale palace ballroom with friendly cartoon animals dancing',
  cosmic: 'outer space with planets and stars and friendly cartoon aliens dancing',
  disco: 'a glittering disco dance floor with coloured lights and friendly cartoon animals dancing',
};

/** The four buttons along the foot of the page. */
const FOOT: readonly { readonly id: Tab; readonly icon: string; readonly says: readonly [string, string] }[] = [
  { id: 'home', icon: '🏠', says: ['kids.tabHome', 'Home'] },
  { id: 'tv', icon: '📁', says: ['kids.tabProjects', 'My Projects'] },
  { id: 'gallery', icon: '🖼️', says: ['kids.tabGallery', 'Gallery'] },
  { id: 'badges', icon: '🏆', says: ['kids.tabBadges', 'Achievements'] },
];

/** Which door an inner screen belongs to, for the title above it. */
const DOOR_OF: Partial<Record<Tab, Tab>> = {};

const STARS_KEY = 'futurebox.kids.stars.v1';


export default function KidsRoom({
  onGrownUp,
  onSignOut,
}: {
  /** Told whether the grown-up's page is showing, so the page around the room shows its way out only then. */
  readonly onGrownUp?: (showing: boolean) => void;
  /**
   * Sign out, once a grown-up has typed the code. The page around the room
   * does the leaving: nothing inside the room goes anywhere else
   * (`check:kinderkamer`).
   */
  readonly onSignOut?: () => void;
} = {}): React.ReactElement {
  const { lang, t } = useLang();
  const [state, setState] = useState<KidsState | null>(null);
  /* The grown-up's page, reached on purpose rather than by going back. */
  const [atDoor, setAtDoor] = useState(false);
  /* The code pad, opened by holding the FutureBox Kids logo (`KidsLock.tsx`). */
  const [askCode, setAskCode] = useState(false);
  /** The code pad asked for by Sign out on the home screen. */
  const [askOut, setAskOut] = useState(false);
  /** Out of the room and out of the account — the page around the room does the leaving. */
  const leaveRoom = (): void => {
    childIn(false);
    onSignOut?.();
  };

  /* Which line the mascot is on. A number and not a sentence, so the room
     can change language without the mascot changing its mind. */
  const [mascot, setMascot] = useState(0);
  /* The Song Lab's plan. `topic` and `sound` are read off it for the rooms
     that still speak of one topic and one sound: the stage, the shelf, the
     video. */
  const [plan, setPlan] = useState<SongPlan>(EMPTY_PLAN);
  const topic = plan.topics[0] ?? '';
  const sound = plan.sound;
  /**
   * The child's own words, typed or spoken.
   *
   * The owner, 12 October 2026: *"Die kids room moet ook 'n tikboks hê, daar is
   * kinders wat kan tik, wat oulik sal wees as dit 'n record button het
   * sodat 'n kind kan praat en woorde so prompt."*
   *
   * The bubbles stay — a six-year-old presses, a nine-year-old types, and
   * either can hold the button and talk. Speaking uses the browser's own
   * recogniser (the Web Speech API), which costs no credits and sends no
   * recording to a server of ours; where a browser has none, the button is
   * not drawn and the box still works.
   */
  const [words, setWords] = useState('');
  /* The five doors across the top of Google's page, and which is open. */
  const [tab, setTab] = useState<Tab>('home');
  /* The gallery wall looks again when something is kept on it. */
  const [wallAgain, setWallAgain] = useState(0);
  /* What the shelves hold, for the badges. Counted when the door opens. */
  const [counts, setCounts] = useState<Counts | null>(null);
  /* Inside Music Maker: the real song, or the free beat machine. The real
     one first, because it is the thing the room exists for. */
  const [music, setMusic] = useState<'song' | 'loops' | 'beat'>('song');
  const [tv, setTv] = useState<'all' | 'songs' | 'stories'>('all');
  /**
   * Star sparks. Earned by doing anything at all, and kept on the device so
   * a child who comes back tomorrow has not lost them — that was the first
   * thing a child would notice. Never spent, never sent, nothing to do with
   * the allowance: a number that only goes up.
   */
  const [stars, setStars] = useState(0);
  useEffect(() => {
    try {
      const was = Number(window.localStorage.getItem(STARS_KEY) ?? '0');
      if (Number.isFinite(was) && was > 0) setStars(was);
    } catch { /* A browser that keeps nothing. */ }
  }, []);
  const spark = (n: number): void => {
    setStars((was) => {
      const now = was + n;
      try { window.localStorage.setItem(STARS_KEY, String(now)); } catch { /* Then they are for today. */ }
      return now;
    });
  };
  /* Pip: open or shut, what was asked, and how many times, so the answers
     go round rather than repeat. */
  const [pip, setPip] = useState(false);
  const [pipAsk, setPipAsk] = useState<PipAsk | null>(null);
  const [pipAt, setPipAt] = useState(0);
  /* Pip's card paints over the whole room, so Back closes it first. */
  useBackLayer(pip, () => setPip(false));
  /* The beat stops with the room: on the way out, and at the door. */
  useEffect(() => () => beatEngine.stop(), []);
  const [listening, setListening] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const hearing = useRef<{ stop: () => void } | null>(null);
  useEffect(() => {
    setCanSpeak(Boolean(recogniser()));
  }, []);
  const speak = (): void => {
    if (listening) { hearing.current?.stop(); return; }
    const Heard = recogniser();
    if (!Heard) return;
    const ear = new Heard();
    ear.lang = lang === 'af' ? 'af-ZA' : 'en-ZA';
    ear.interimResults = false;
    ear.maxAlternatives = 1;
    ear.onresult = (got: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      const said = Array.from(got.results).map((one) => one[0]?.transcript ?? '').join(' ');
      setWords((was) => kidWords(`${was} ${said}`));
    };
    ear.onerror = () => { setListening(false); setSays(t('kids.heardNothing', 'I did not hear that. Try again, a bit closer.')); };
    ear.onend = () => { setListening(false); hearing.current = null; };
    hearing.current = ear;
    setSays('');
    setListening(true);
    try { ear.start(); } catch { setListening(false); }
  };
  const [busy, setBusy] = useState<'' | 'song' | 'video' | 'picture'>('');
  /* The last picture back from the engine, and what it said. */
  const [picture, setPicture] = useState('');
  const [picSays, setPicSays] = useState('');
  /* What came back — the picture, or why not — brought into view. It is
     drawn under the button, which on a phone sits on the bottom bar, so the
     answer landed behind the bar and the press looked like nothing. */
  useEffect(() => {
    if (!picSays && !picture) return;
    const shown = document.querySelector('[data-kidsaliveout], [data-kidsalivesays], [data-kidspicsays]');
    shown?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [picSays, picture]);
  const heldPicture = useRef<string>('');
  useEffect(() => () => { if (heldPicture.current) URL.revokeObjectURL(heldPicture.current); }, []);
  const [says, setSays] = useState('');
  const [song, setSong] = useState('');
  /* The song itself, not only its address. An object URL cannot be stored —
     it is a handle into this tab — so keeping one would save a row that
     opens to nothing tomorrow. The story shelf shipped with exactly that
     bug and it was caught by driving what the room puts in. */
  const [songBlob, setSongBlob] = useState<Blob | null>(null);
  const [kept, setKept] = useState(false);
  const [shelfAgain, setShelfAgain] = useState(0);
  const [job, setJob] = useState<string | null>(null);
  /** When the current wait started, so a stalled job cannot wait for ever. */
  const waitingSince = useRef<number>(0);
  const [film, setFilm] = useState('');

  /* The last object URL handed out, revoked when another replaces it. Without
     this every attempt at a song leaks a minute of audio for as long as the
     room is open, and a child makes a lot of attempts. */
  const held = useRef<string>('');

  useEffect(() => { void kidsNow().then(setState); }, []);

  /* Just signed in from here: the grown-up's page first, whatever the
     allowance says — only a grown-up signs in. The owner, 15 October 2026: "dan
     het dit sommer die grown up gedeelte geskip." A fresh sign-in is also how
     a forgotten code is replaced, so it is forgotten here. */
  useEffect(() => {
    if (justSignedInForKids()) {
      forgetCode();
      setAtDoor(true);
    }
  }, []);

  /* While the child's room is on the screen the device remembers it, and the
     studio's front door sends anybody who reaches it back here
     (`lib/kidslock.ts`). The grown-up's page lets go. */
  const grownUpShowing = state !== null && (!state.open || atDoor);
  useEffect(() => {
    if (state === null) return;
    childIn(!grownUpShowing);
    onGrownUp?.(grownUpShowing);
  }, [state, grownUpShowing, onGrownUp]);

  useEffect(() => {
    if (tab !== 'badges') return undefined;
    let live = true;
    void Promise.all([allSongs().catch(() => []), allStories().catch(() => []), allPieces().catch(() => [])])
      .then(([songs, stories, pieces]) => {
        if (live) setCounts({ stars, songs: songs.length, stories: stories.length, pieces: pieces.length });
      });
    return () => { live = false; };
  }, [tab, stars, wallAgain, shelfAgain]);

  /**
   * ── The clock, counted down here and owned by the server ─────────
   *
   * The owner, 10 October 2026: *"Wanneer screen time op is moet dit die kind
   * uitskop."*
   *
   * The number comes from the server — `secondsLeft`, worked out against
   * `sitting_from` in the database — and the ticking happens here. That is
   * the right division: a page that worked the remaining time out for itself
   * would be a page a child extends by changing the clock on the phone.
   *
   * Asked again every half minute as well as ticked, so a sitting a grown-up
   * ended from another device closes this room too, and so a tab left asleep
   * for an hour does not wake up believing it has fifty minutes left.
   */
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    if (!state?.open || state.minutes === null || state.minutes === undefined) return undefined;
    const beat = setInterval(() => setTicks((was) => was + 1), 1000);
    return () => clearInterval(beat);
  }, [state?.open, state?.minutes]);

  useEffect(() => {
    if (!state?.open || !state.minutes) return undefined;
    const again = setInterval(() => { void kidsNow().then(setState); }, 30_000);
    return () => clearInterval(again);
  }, [state?.open, state?.minutes]);
  useEffect(() => () => { if (held.current) URL.revokeObjectURL(held.current); }, []);

  /* Asking how the video is going. Only ever asks — nothing here spends, so a
     reload mid-wait costs nothing and loses only the waiting. */
  useEffect(() => {
    if (!job) return undefined;
    /* Started once per job, not once per run of this effect. Choosing the
       language re-runs it — `t` is a dependency — and a clock restarted by
       picking Afrikaans is a wait that never ends. */
    if (waitingSince.current === 0) waitingSince.current = Date.now();
    let stopped = false;
    const ask = async (): Promise<void> => {
      const answer = await askKidVideo(job);
      if (stopped) return;
      /* `askKidVideo` answers `null` for three different things: still being
         made, signed out, and any network blip. Treating all three as "keep
         waiting" is right for a few minutes and wrong for ever — and while a
         job is live every control in this room is disabled, so a job that
         never lands locks a six-year-old out of the room until somebody
         thinks to reload the page.

         Eight minutes, the same ceiling the grown-up video path uses in
         `lib/engines.ts`, for the same reason: Kling's own limit for a clip
         this length is under five, and the rest is room for a queue.

         What it says is deliberately short of a promise. The job may well
         still be running on the engine, so "it failed" would be untrue; the
         credits are not refunded on a stall, so "you can try again free"
         would be worse; and there is no kids' video shelf to send anybody
         to, so naming a screen would send a child looking for a page that
         does not exist. It stops the waiting, unlocks the room, and points
         at the one person who can actually do something. */
      if (!stillWorthWaiting(waitingSince.current, Date.now())) {
        setJob(null);
        waitingSince.current = 0;
        setSays(t('kids.filmSlow', 'Your video is still being made. It is taking longer than usual — tell a grown-up.'));
        return;
      }
      if (!answer) return;
      if ('url' in answer) {
        setFilm(answer.url);
        setJob(null);
        waitingSince.current = 0;
        setSays(t('kids.filmDone', 'Your video is ready!'));
        spark(30);
        confetti();
      } else {
        setJob(null);
        waitingSince.current = 0;
        setSays(answer.says);
      }
      void kidsNow().then(setState);
    };
    void ask();
    const every = window.setInterval(() => { void ask(); }, 5_000);
    return () => { stopped = true; window.clearInterval(every); };
  }, [job, t]);

  /* ── The video door's songs: the one just made, and the shelf ───────── */
  const [shelfSongs, setShelfSongs] = useState<KeptSong[]>([]);
  useEffect(() => {
    if (tab !== 'video') return;
    void allSongs().then(setShelfSongs).catch(() => setShelfSongs([]));
  }, [tab, shelfAgain]);
  const videoSongs = useMemo(() => [
    ...(song ? [{ id: 'now', title: t('kids.songJustMade', 'The song you just made') }] : []),
    ...shelfSongs.map((one) => ({ id: one.id, title: one.title })),
  ], [song, shelfSongs, t]);
  const [videoPick, setVideoPick] = useState('now');
  useEffect(() => {
    if (videoSongs.length && !videoSongs.some((one) => one.id === videoPick)) setVideoPick(videoSongs[0].id);
  }, [videoSongs, videoPick]);
  const picked = shelfSongs.find((one) => one.id === videoPick) ?? null;
  const shelfUrl = useMemo(() => (picked ? URL.createObjectURL(picked.audio) : ''), [picked]);
  useEffect(() => () => { if (shelfUrl) URL.revokeObjectURL(shelfUrl); }, [shelfUrl]);
  const videoUrl = videoPick === 'now' ? song : shelfUrl;
  const shelfTopic = picked?.topic ?? '';
  const [player, setPlayer] = useState<HTMLAudioElement | null>(null);
  const [stagePlaying, setStagePlaying] = useState(false);
  const pulse = useSongPulse(player, stagePlaying);
  const [stageScene, setStageScene] = useState<Scene>('palace');
  useEffect(() => { if (tab !== 'video') player?.pause(); }, [tab, player]);

  if (state === null) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-surface-600">
        <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
        {t('kids.asking', 'Asking where the allowance stands…')}
      </p>
    );
  }

  /* ── How much of the sitting is left, as this room sees it ─────────

     The server's number minus the seconds since it was read. `null` is no
     clock on this room and lets everything through; zero is a sitting that
     is over. Those are two different answers and reading one as the other
     would lock every room opened before today out of its own allowance. */
  const clockLeft = state.open && state.minutes
    ? Math.max(0, (state.secondsLeft ?? 0) - ticks)
    : null;
  const timeUp = clockLeft !== null && clockLeft <= 0;

  /* ── Time up: out, and said in words a child reads ───────────────

     Her word was "uitskop" and this is it: the room is gone, not greyed
     out. A room still on the screen with every button disabled is a room a
     child keeps pressing.

     Not the grown-up's page either. That page sets an allowance and hands a
     phone over, and putting a child in front of it is handing them the
     switch. One sentence, and the one thing a child can do about it, which
     is fetch somebody. `atDoor` is how a grown-up gets past this, and it is
     deliberately not a button a child would press by accident — it is the
     small line at the bottom. */
  if (timeUp) {
    beatEngine.stop();
    return (
      <div className="mx-auto w-full max-w-md space-y-6 p-6 text-center" data-kidstimeup>
        <GrownUpHold onHeld={() => setAskCode(true)} className="text-5xl">
          <span aria-hidden>⏰</span>
        </GrownUpHold>
        <h2 className="text-2xl font-extrabold tracking-tight text-surface-950">
          {t('kids.timeUp', 'Time is up')}
        </h2>
        <p className="text-base leading-relaxed text-surface-700">
          {t('kids.timeUpSay', 'That is all for now. Go and fetch a grown-up if you want some more.')}
        </p>
        {askCode && <CodePad onPass={() => { setAskCode(false); setAtDoor(true); }} onClose={() => setAskCode(false)} />}
      </div>
    );
  }

  /* No allowance set, or a grown-up asked for the door: the door. It is the
     same component the opening page uses, so there is one place an allowance
     is given and one place it is ended. */
  if (!state.open || atDoor) {
    beatEngine.stop();
    return (
      <div className="space-y-4">
        {state.signedIn !== false && <CodeChooser />}
        <KidsDoor onIn={(next) => { setState(next); setAtDoor(false); }} />
        {state.open && (
          <div className="mx-auto w-full max-w-3xl px-5 pb-8">
            <button
              type="button"
              onClick={() => setAtDoor(false)}
              className="min-h-[44px] rounded-xl border border-surface-300 bg-surface-100/90 px-4 text-sm font-bold text-surface-800 hover:text-surface-950 transition-colors"
            >
              {t('kids.backIn', 'Back to the music')}
            </button>
          </div>
        )}
      </div>
    );
  }

  const left = state.left ?? 0;
  const songPrice = priceOf('song');
  /* The countdown, where the child can see it. Under five minutes it turns,
     because "it just stopped" is a worse experience than "two minutes left"
     for the same amount of screen time. */
  const nearlyOver = clockLeft !== null && clockLeft <= 300;
  const videoPrice = priceOf('video');

  const songsLeft = howMany(left, 'song');
  const picturePrice = priceOf('picture');
  const canPicture = left >= picturePrice && !busy && !job;

  /* ── A picture, two ways ───────────────────────────────────────────
     The owner, 13 October 2026: a drawing "made realistically alive", and
     "prompting images (kids friendly)". One route, one price, and the
     allowance refuses it at the server the moment it is spent. What comes
     back goes straight onto the gallery wall: there is no download in this
     room, so the wall is where a thing lives. */
  const took = async (words: string, from: { data: string; mime: string } | null, title: string): Promise<void> => {
    setBusy('picture');
    setPicSays('');
    const answer = await makeKidPicture(words, from);
    setBusy('');
    void kidsNow().then(setState);
    if ('says' in answer) { setPicSays(answer.says); return; }
    if (heldPicture.current) URL.revokeObjectURL(heldPicture.current);
    heldPicture.current = URL.createObjectURL(answer.picture);
    setPicture(heldPicture.current);
    const put = await keepPiece({ id: `picture-${Date.now()}`, made: Date.now(), kind: 'picture', title, blob: answer.picture });
    setPicSays(put === 'kept'
      ? t('kids.picDone', 'Here is your picture! It is on your gallery wall.')
      : t('kids.picDoneNoWall', 'Here is your picture! The wall is full, so it stays here until you leave.'));
    setWallAgain((n) => n + 1);
    spark(20);
    confetti();
  };
  const alive = async (drawing: Blob): Promise<void> => {
    /* Anything that throws on the way is said, not swallowed: a press that
       does nothing at all is what a child reports as broken. */
    const packed = await packDrawing(drawing).catch(() => null);
    if (!packed) { setPicSays(t('kids.picNotRead', 'That drawing could not be read. Try again.')); return; }
    await took(ALIVE_WORDS, packed, t('kids.aliveTitle', 'My drawing, alive'));
  };
  const makePicture = (subject: string, style: string): void => {
    const what = KID_SUBJECTS.find((one) => one.id === subject);
    const how = KID_STYLES.find((one) => one.id === style);
    if (!what || !how) return;
    void took(pictureWords(what, how), null, `${t(what.says[0], what.says[1])} · ${t(how.says[0], how.says[1])}`);
  };
  const canSong = ready({ ...plan, own: words }) && left >= songPrice && !busy && !job;
  const canFilm = Boolean(videoUrl) && left >= videoPrice && !busy && !job;

  const make = async (): Promise<void> => {
    setBusy('song');
    setSays('');
    setFilm('');
    const answer = await makeKidSong(songPrompt({ ...plan, own: words }));
    setBusy('');
    void kidsNow().then(setState);
    if ('says' in answer) { setSays(answer.says); return; }
    if (held.current) URL.revokeObjectURL(held.current);
    held.current = URL.createObjectURL(answer.audio);
    setSong(held.current);
    setSongBlob(answer.audio);
    setKept(false);
    setSays(t('kids.songDone', 'Here is your song!'));
    spark(20);
    confetti();
  };

  const film2 = async (): Promise<void> => {
    setBusy('video');
    setSays('');
    const answer = await startKidVideo(videoPick === 'now' ? topic : shelfTopic, SCENE_WORDS[stageScene]);
    setBusy('');
    void kidsNow().then(setState);
    if ('says' in answer) { setSays(answer.says); return; }
    setJob(answer.job);
    setSays(t('kids.filmMaking', 'Making your video. It takes a minute.'));
  };

  /* ── Keeping it ────────────────────────────────────────────────────────
 
     The owner, 9 October 2026: *"Gaan aan met die kind se liedjies wat keepbaar
     is."* A song played in the room and was gone when the page closed — work
     that stops existing, and worse here than anywhere else, because it cost
     real credits out of an allowance a parent set and the person it happens
     to is six and will think the app ate it.
 
     Costs nothing and spends no allowance: it is already paid for. */
  const keepIt = async (): Promise<void> => {
    if (!songBlob || kept) return;
    const what = KID_TOPICS.find((one) => one.id === topic);
    const how = KID_SOUNDS.find((one) => one.id === sound);
    const put = await keepSong({
      id: `kidsong-${Date.now()}`,
      title: `${t(what?.says[0] ?? 'kids.song', what?.says[1] ?? 'A song')}`
        + ` · ${t(how?.says[0] ?? '', how?.says[1] ?? '')}`,
      made: Date.now(),
      audio: songBlob,
      topic,
      sound,
    });
    if (put === 'kept') {
      setKept(true);
      setShelfAgain((was) => was + 1);
      setSays(t('kids.kept', 'Kept! You can play it again any time, and it uses no credits.'));
    } else if (put === 'shelfFull') {
      setSays(t('kids.shelfFull', 'Your shelf is full — it holds {n} songs. Ask a grown-up to take one off.')
        .replace('{n}', String(MOST_SONGS)));
    } else if (put === 'full') {
      setSays(t('kids.deviceFull', 'There is no room left to keep it. Ask a grown-up to make room.'));
    } else {
      setSays(t('kids.noKeep', 'This browser will not keep anything.'));
    }
  };

  /* The wheel and the mascot are Google's two ideas from the room she had it
     draw. `lib/kidslook.ts` carries what was taken from that and what was
     deliberately left in it. */
  const wheel = (): void => {
    const got = spin(KID_TOPICS, KID_SOUNDS);
    const one = <T extends { readonly id: string }>(list: readonly T[]): string => list[Math.floor(Math.random() * list.length)].id;
    setPlan({
      ...EMPTY_PLAN,
      topics: [got.topic],
      sound: got.sound,
      place: one(KID_PLACES),
      verse: one(SONG_PARTS[0].choices),
      chorus: one(SONG_PARTS[1].choices),
      bridge: one(SONG_PARTS[2].choices),
    });
    setMascot((n) => (n + 3) % MASCOT_SAYS.length);
  };

  /* The line on the stage: the song a child is making, or a welcome. */
  const topicSaid = kidWords(words)
    ? kidWords(words)
    : topic
      ? t(KID_TOPICS.find((one) => one.id === topic)!.says[0], KID_TOPICS.find((one) => one.id === topic)!.says[1])
      : '';
  const soundSaid = sound
    ? t(KID_SOUNDS.find((one) => one.id === sound)!.says[0], KID_SOUNDS.find((one) => one.id === sound)!.says[1])
    : '';
  const caption = topicSaid
    ? `✨ ${t('kids.aSongAbout', 'A song about')} ${topicSaid}${soundSaid ? ` ${t('kids.thatSounds', 'that sounds')} ${soundSaid}` : ''}`
    : `✨ ${t('kids.stageWelcome', 'Welcome to the FutureBox Kids Dream Studio!')}`;

  const askPip = (ask: PipAsk): void => {
    setPipAsk(ask);
    setPipAt((n) => n + 1);
    spark(1);
  };
  const pipSays = pipAsk
    ? pipLine(pipAsk, pipAt, lang === 'af' ? 'af' : 'en')
    : t('kids.pipHello', 'Hi! I am Pip. Press a button and I will answer!');

  /* The real video button, drawn on the stage and under the player. */
  const filmButton = (
    <button
      type="button"
      onClick={() => void film2()}
      disabled={!canFilm}
      data-kidsfilm
      className="fb-kids-bouncy flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl text-base font-black disabled:opacity-40"
    >
      {busy === 'video' || job ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          {t('kids.filming', 'Making your video…')}
        </>
      ) : (
        <>
          <Film className="h-5 w-5" />
          {left >= videoPrice
            ? t('kids.film', 'Make a video of it')
            : t('kids.filmNotEnough', 'A video needs more than is left')}
        </>
      )}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-3 pb-28 text-white sm:p-5 sm:pb-28" data-kidsroom>
      {/* ── 1. The top of the page: Pip and the level, the name, the grown-up ── */}
      <header className="rounded-3xl border-2 border-cyan-400/50 bg-surface-50/85 px-4 py-3 shadow-[0_0_30px_rgba(52,211,153,0.25)] backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-kidspip
              onClick={() => { setPip(true); spark(1); }}
              aria-label={t('kids.askPip', 'Ask Pip!')}
              title={t('kids.askPip', 'Ask Pip!')}
              className="fb-kids-float relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-cyan-300 bg-surface-100 text-3xl shadow-[0_0_18px_rgba(52,211,153,0.6)]"
            >
              <span aria-hidden>🤖</span>
            </button>
            {/* The level is the stars, in steps — `lib/kidslevel.ts`. */}
            <div data-kidslevel={levelOf(stars)} className="rounded-2xl border-2 border-cyan-400/50 bg-surface-100/90 px-3 py-1.5 shadow-inner">
              <div data-kidsstars className="flex items-center gap-2 text-sm font-black text-amber-300">
                <span data-kidsspin aria-hidden>⭐</span>
                <span>{t('kids.level', 'Level')} {levelOf(stars)}</span>
                <span className="text-xs font-bold text-surface-700">
                  <span data-kidsstarcount>{stars}</span> {t('kids.starSparks', 'Star Sparks')}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-200" aria-hidden>
                <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${Math.round(towardNext(stars) * 100)}%` }} />
              </div>
            </div>
          </div>
          <div className="min-w-0 text-center" aria-label={t('kids.dreamTitle', 'FutureBox Kids Dream Studio')}>
            {/* Held for three seconds, the grown-up's way back in. There is no
                button for it: the owner, 15 October 2026, "daar moet nie 'n grown
                up button binne die studio wees nie want kinders gaan dit self
                stel." */}
            <GrownUpHold onHeld={() => setAskCode(true)}>
              {/* Her logo, 19 October 2026: *"haal die ou futurebox woorde
                  uit, en sit hierdie logo in."* Its black is taken out in
                  `scripts/kids-icons.mts`, so the room shows round it. */}
              <h1 data-kidsdreamtitle className="m-0">
                {/* And the long one where the screen is wide: *"Sit hierdie
                    langer logo op die web app waar die skerm wyer strek."* */}
                <picture>
                  <source media="(min-width: 1024px)" srcSet="/kids/logo-wide.webp" />
                  <img
                    src="/kids/logo.webp"
                    alt={t('kids.logoAlt', 'FutureBox Kids')}
                    draggable={false}
                    className="mx-auto block h-16 w-auto sm:h-20 lg:h-28"
                  />
                </picture>
              </h1>
            </GrownUpHold>
            {/* ── And a small lock, for a grown-up who cannot find the hold ──
                The owner, 16 October 2026: *"Daar is nie 'n logout by die kids
                studio nie. Ek sukkel om daar uit te kom."* The hold was the
                only way out, and nothing said it was there. The lock opens the
                same code pad, so a child who presses it meets four numbers
                they do not know — and the room cannot be handed over without
                a code any more (`KidsDoor`). */}
            <button
              type="button"
              data-kidslock
              onClick={() => setAskCode(true)}
              aria-label={t('kids.lockDoor', 'For grown-ups: the way out')}
              className="mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-surface-300 bg-surface-100/70 text-sm"
            >
              <span aria-hidden>🔒</span>
            </button>
          </div>
          {/* ── Sign out, on the home screen itself ───────────────────────
              The owner, 16 October 2026: *"Daar moet 'n sign out button wees op
              die hoof home screen van die kids studio."* Plain to see, and
              behind the same four numbers as the lock: a child who presses it
              meets the code pad, a grown-up types the code and is signed out. */}
          <button
            type="button"
            data-kidshomesignout
            onClick={() => { if (hasCode()) setAskOut(true); else leaveRoom(); }}
            aria-label={t('kids.signOutAsk', 'Sign out — a grown-up types the code')}
            className="flex min-h-[44px] items-center gap-2 rounded-2xl border-2 border-surface-300 bg-surface-100/80 px-3 text-sm font-black text-surface-900"
          >
            <span aria-hidden>🚪</span> {t('kids.signOut', 'Sign out')}
          </button>
        </div>
      </header>
      {askOut && <CodePad onPass={() => { setAskOut(false); leaveRoom(); }} onClose={() => setAskOut(false)} />}

      {/* ── Inside a door: the way home, and which door this is ─────────── */}
      {tab !== 'home' && (
        <div className="flex items-center gap-3" data-kidsinside={tab}>
          <button
            type="button"
            data-kidshome
            onClick={() => setTab('home')}
            className="flex min-h-[44px] items-center gap-2 rounded-2xl border-2 border-cyan-400/50 bg-surface-50/85 px-4 text-sm font-black text-surface-900 backdrop-blur-md"
          >
            <span aria-hidden>🏠</span> {t('kids.tabHome', 'Home')}
          </button>
          <h2 className="fb-kids-bubble min-w-0 truncate text-lg text-surface-900">
            {(() => {
              const door = DOORS.find((one) => one.id === (DOOR_OF[tab] ?? tab));
              const foot = FOOT.find((one) => one.id === tab);
              return door ? `${door.icon} ${t(door.says[0], door.says[1])}` : foot ? `${foot.icon} ${t(foot.says[0], foot.says[1])}` : '';
            })()}
          </h2>
        </div>
      )}

      {/* ── 2. What is left in songs & clock, calm for the parent ─────────── */}
      <div
        className="flex items-center justify-between gap-3 rounded-2xl border-2 border-surface-200 bg-surface-50/80 px-4 py-2.5 shadow-xs backdrop-blur-xs"
        data-kidsleft
      >
        <div className="min-w-0">
          <span className="text-sm font-bold text-surface-900">
            {songsLeft > 0
              ? `${songsLeft} ${songsLeft === 1 ? t('kids.songLeft', 'song left') : t('kids.songsLeft', 'songs left')}`
              : t('kids.noneLeft', 'All used up — ask a grown-up')}
          </span>
          {clockLeft !== null && (
            <span
              data-kidsclockleft={clockLeft}
              className={`block text-xs font-semibold tabular-nums ${
                nearlyOver ? 'font-bold text-amber-300' : 'text-surface-700'
              }`}
            >
              {asClock(clockLeft)} {t('kids.ofTime', 'left')}
            </span>
          )}
        </div>
      </div>
      {askCode && <CodePad onPass={() => { setAskCode(false); setAtDoor(true); }} onClose={() => setAskCode(false)} />}

      {/* ── Pip ──────────────────────────────────────────────────────────── */}
      {pip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/70 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label={t('kids.pipTitle', 'Pip the Sprite')}
          data-kidspipcard
        >
          <div className="w-full max-w-md space-y-4 rounded-3xl border-4 border-amber-300 bg-surface-50 p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="fb-kids-float text-5xl" aria-hidden>🧚</span>
                <h2 className="fb-kids-bubble text-xl font-bold text-amber-300">{t('kids.pipTitle', 'Pip the Sprite')}</h2>
              </div>
              <button
                type="button"
                onClick={() => { setPip(false); if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); }}
                aria-label={t('kids.close', 'Close')}
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-surface-300 bg-surface-200 text-surface-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p data-kidspipsays className="rounded-2xl border-2 border-cyan-500/50 bg-surface-100 px-4 py-3 text-base font-bold leading-snug text-surface-900">
              {pipSays}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {PIP_ASKS.map((one) => (
                <button
                  key={one.id}
                  type="button"
                  data-kidspipask={one.id}
                  onClick={() => askPip(one.id)}
                  className="fb-kids-bouncy flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-cyan-200 bg-cyan-400 px-3 text-sm font-bold text-onAccent"
                >
                  <span aria-hidden>{one.icon}</span> {t(one.says[0], one.says[1])}
                </button>
              ))}
            </div>
            <button
              type="button"
              data-kidspipread
              onClick={() => sayAloud(pipSays, lang === 'af' ? 'af' : 'en')}
              className="fb-kids-bouncy flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 text-sm font-bold text-onAccent"
            >
              <span aria-hidden>🔊</span> {t('kids.pipRead', 'Read it to me')}
            </button>
          </div>
        </div>
      )}

      {/* ── 2b. Home: the six doors on the photograph ─────────────────── */}
      {tab === 'home' && (
        <div className="flex flex-wrap justify-center gap-4" data-kidsdoors>
          {DOORS.map((door) => (
            <button
              key={door.id}
              type="button"
              data-kidstab={door.id}
              data-kidsroomdoor={door.id}
              onClick={() => setTab(door.id)}
              className="group flex min-h-[210px] w-full flex-col items-center justify-end rounded-3xl sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.7rem)] border-2 border-cyan-400/70 bg-surface-50/80 p-5 text-center shadow-[0_0_30px_rgba(52,211,153,0.3)] backdrop-blur-md transition-transform hover:scale-[1.02]"
            >
              <span className="fb-kids-float mb-3 text-6xl drop-shadow-[0_0_14px_rgba(52,211,153,0.8)]" aria-hidden>{door.icon}</span>
              <span className="fb-kids-bubble text-2xl text-surface-950">{t(door.says[0], door.says[1])}</span>
              <ul className="mt-2 space-y-1 text-xs font-bold text-surface-800">
                {door.lines.map((line) => (
                  <li key={line[0]} className="flex items-center justify-center gap-1.5">
                    <span className="inline-block h-2.5 w-5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" aria-hidden />
                    {t(line[0], line[1])}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      )}

      {/* ── 3. Music Maker ───────────────────────────────────────────────── */}
      {tab === 'music' && (
        <>
          {/* ── Three doors in the music door, the song first ────────────
              The owner, 19 October 2026: *"Die music generation by die kids
              app het ook weggeval toe jy die looping in gesit het."* It had
              not gone — the four loop cards came first and pushed it below
              the fold of a phone, under a line nobody scrolls past. The
              three are choices of the same size now, the real song open. */}
          <div className="flex gap-2" data-kidsmusicmode>
            {([
              ['song', '🎤', 'kids.subSong', 'Make a real song', 'bg-primary-400 text-onAccent'],
              ['loops', '🔁', 'kids.subLoops', 'Loops', 'bg-amber-400 text-onAccent'],
              ['beat', '🥁', 'kids.subBeat', 'Beat machine', 'bg-cyan-400 text-onAccent'],
            ] as const).map(([id, icon, key, en, lit]) => (
              <button
                key={id}
                type="button"
                data-kidsmusicpick={id}
                {...(id === 'beat' ? { 'data-kidstobeat': '' } : {})}
                aria-pressed={music === id}
                onClick={() => setMusic(id)}
                className={`fb-kids-bouncy flex min-h-[64px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[2rem] px-2 text-sm font-black leading-tight ${
                  music === id ? lit : 'bg-surface-200/80 text-surface-800'
                }`}
              >
                <span className="text-2xl" aria-hidden>{icon}</span> {t(key, en)}
              </button>
            ))}
          </div>

          {music === 'loops' && (
            /* Google's "Create Music Studio", 13 October 2026: four loop
               cards for the little ones. */
            <KidsLoops onSpark={spark} onToBeat={() => setMusic('beat')} />
          )}

          {music === 'beat' && (
            <KidsBeatMaker onSpark={spark} onToStage={() => setTab('video')} />
          )}

          {music === 'song' && (
            <>
              {/* ── The mascot and the wheel ──────────────────────────────────
                  Google's two ideas from the first room it drew: something
                  that talks to a child who has just arrived, and a press for
                  one who cannot decide. */}
              <div className="flex items-center gap-3 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/80 p-3.5 shadow-xl backdrop-blur-xs sm:gap-4 sm:p-4">
                <button
                  type="button"
                  data-kidsmascot
                  data-kidsbob
                  onClick={() => setMascot((n) => (n + 1) % MASCOT_SAYS.length)}
                  aria-label={t('kids.mascotSays', 'Say something else')}
                  className="flex h-16 w-16 shrink-0 select-none items-center justify-center rounded-full text-4xl text-onAccent"
                >
                  <span aria-hidden>{MASCOT_ICONS[mascot % MASCOT_ICONS.length]}</span>
                </button>
                <div className="relative min-w-0 flex-1 rounded-2xl border-2 border-surface-200 bg-surface-100/80 px-3.5 py-2.5 shadow-inner">
                  <p data-kidsmascotsays className="text-sm font-black leading-snug text-surface-900 sm:text-base">
                    {t(`kids.mascot${mascot}`, MASCOT_SAYS[mascot][0])}
                  </p>
                </div>
                <button
                  type="button"
                  data-kidswheel
                  onClick={wheel}
                  disabled={Boolean(busy) || Boolean(job)}
                  className="flex min-h-[56px] shrink-0 items-center gap-1.5 rounded-2xl px-3.5 text-xs font-black disabled:opacity-40 sm:gap-2 sm:px-4 sm:text-sm"
                >
                  <span aria-hidden className="select-none text-lg">🎲</span>
                  {t('kids.spin', 'Spin')}
                </button>
              </div>

              {/* ── The child's own words ────────────────────────────────────
                  A box for the ones who can type, and a button for the ones
                  who would rather say it. What is said lands in the box. */}
              <div
                data-kidsown
                className="mx-auto flex w-full max-w-md items-center gap-2 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/80 p-2 shadow-md"
              >
                <input
                  type="text"
                  data-kidstype
                  value={words}
                  maxLength={KID_WORDS_MOST}
                  disabled={Boolean(busy) || Boolean(job)}
                  onChange={(e) => setWords(e.target.value)}
                  placeholder={t('kids.typeIt', 'Or type what your song is about…')}
                  aria-label={t('kids.typeIt', 'Or type what your song is about…')}
                  className="min-h-[48px] min-w-0 flex-1 rounded-2xl border-2 border-surface-300 bg-surface-100 px-4 text-base font-bold text-surface-900 placeholder:text-surface-600 focus:border-cyan-400 focus:outline-hidden disabled:opacity-50"
                />
                {canSpeak && (
                  <button
                    type="button"
                    data-kidsspeak
                    onClick={speak}
                    disabled={Boolean(busy) || Boolean(job)}
                    aria-pressed={listening}
                    aria-label={listening ? t('kids.listening', 'Listening… press to stop') : t('kids.speak', 'Say it')}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-md disabled:opacity-50 ${
                      listening ? 'animate-pulse bg-rose-500' : 'bg-primary-500'
                    }`}
                  >
                    {listening ? <Square className="h-5 w-5" /> : <Mic className="h-6 w-6" />}
                  </button>
                )}
                {words && (
                  <button
                    type="button"
                    data-kidsclearwords
                    onClick={() => setWords('')}
                    disabled={Boolean(busy) || Boolean(job)}
                    aria-label={t('kids.clearWords', 'Clear the words')}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-surface-300 bg-surface-200 text-surface-900 disabled:opacity-50"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              {listening && (
                <p data-kidslistening className="text-center text-sm font-bold text-amber-300">
                  {t('kids.listening', 'Listening… press to stop')}
                </p>
              )}

              {/* ── The Song Lab ──────────────────────────────────────────
                  The owner, 19 October 2026: "Die bubbles moet weg, gebruik
                  ander kreatiewe maniere. Onthou very cool and futuristic vir
                  kids." Several things to sing about, a style, a place, and
                  the song's parts — verse, chorus, bridge — each with a line
                  saying what that part is for. `KidsSongLab.tsx`. */}
              <KidsSongLab
                plan={plan}
                own={kidWords(words)}
                onPlan={setPlan}
                off={Boolean(busy) || Boolean(job)}
                making={busy === 'song'}
                canMake={canSong}
                price={songPrice}
                onMake={() => void make()}
              />

              {says && (
                <p className="rounded-2xl border-2 border-surface-200 bg-surface-50/80 px-4 py-3 text-sm font-semibold text-surface-900 shadow-xs" data-kidssays>
                  {says}
                </p>
              )}

              {/* ── The player: the song, keep it, film it ─────────────── */}
              {song && (
                <div className="space-y-4 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/80 p-5 shadow-2xl backdrop-blur-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-2xl bg-cyan-500/20 text-2xl" data-kidsspin>
                      <span aria-hidden>💿</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase tracking-wider text-surface-700">
                        {t('kids.yourSong', 'Your Song')}
                      </p>
                      <h3 className="fb-kids-bubble truncate text-base text-surface-900">
                        {topicSaid} · {soundSaid}
                      </h3>
                    </div>
                  </div>

                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio src={song} controls className="w-full rounded-2xl" data-kidsplayer />

                  <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => void keepIt()}
                      disabled={!songBlob || kept}
                      data-kidskeep
                      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-base font-black disabled:opacity-40"
                    >
                      <Heart className="h-5 w-5" fill={kept ? 'currentColor' : 'none'} />
                      {kept ? t('kids.keptIt', 'Kept') : t('kids.keep', 'Keep it')}
                    </button>
                    <button
                      type="button"
                      data-kidstovideo
                      onClick={() => setTab('video')}
                      className="fb-kids-bouncy flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 text-base font-black text-onAccent"
                    >
                      <Film className="h-5 w-5" />
                      {t('kids.tabVideo', 'Video Studio')}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── 4. Video Studio: the stage, and the real video on it ───────────
          The Story Maker tab that sat here went on 16 October 2026, when it
          had a door of its own: the owner, "story maker nou op 2 plekke is". */}
      {tab === 'video' && (
        <>
          {/* ── The video door, alive (19 October 2026) ─────────────────
              The owner: "Whats up met die music video funksie by kids? Daar
              gaan niks aan nie." The dancers only jumped to the beat machine,
              which never plays here, and the button only knew a song made in
              this same visit. Now any song — just made, or off the shelf —
              plays under the stage, the dancers jump on its beat, and the
              video, once made, plays with the song under it. */}
          <KidsStage caption={caption} onSpark={spark} pulse={pulse} onScene={setStageScene}>
            {film && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-2" data-kidsfilmframe>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  src={film}
                  controls
                  muted
                  loop
                  playsInline
                  className="max-h-full w-full rounded-2xl"
                  data-kidsfilmout
                  onPlay={() => { if (player) { player.currentTime = 0; void player.play().catch(() => undefined); } }}
                  onPause={() => player?.pause()}
                />
              </div>
            )}
          </KidsStage>
          <div className="space-y-3 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/80 p-4 shadow-lg backdrop-blur-xs sm:p-5">
            {videoSongs.length > 0 ? (
              <>
                <p className="text-sm font-black text-surface-900">{t('kids.pickVideoSong', 'Which song is the video for?')}</p>
                <div className="flex flex-wrap gap-2" data-kidsvideosongs>
                  {videoSongs.map((one) => (
                    <button
                      key={one.id}
                      type="button"
                      data-kidsvideosong={one.id}
                      aria-pressed={videoPick === one.id}
                      onClick={() => { setVideoPick(one.id); setStagePlaying(false); player?.pause(); }}
                      className={`fb-kids-bouncy min-h-[48px] shrink-0 rounded-2xl px-4 text-sm font-black ${videoPick === one.id ? 'bg-amber-400 text-onAccent' : 'bg-surface-200/80 text-surface-800'}`}
                    >
                      🎵 {one.title}
                    </button>
                  ))}
                </div>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio
                  ref={setPlayer}
                  src={videoUrl}
                  loop
                  onPlay={() => setStagePlaying(true)}
                  onPause={() => setStagePlaying(false)}
                  data-kidsvideoaudio
                />
                <button
                  type="button"
                  data-kidsvideoplay
                  aria-pressed={stagePlaying}
                  onClick={() => {
                    if (!player) return;
                    if (stagePlaying) player.pause();
                    else void player.play().catch(() => undefined);
                  }}
                  className={`fb-kids-bouncy flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl text-base font-black ${stagePlaying ? 'bg-purple-500 text-white' : 'bg-primary-400 text-onAccent'}`}
                >
                  {stagePlaying
                    ? <>⏸ {t('kids.stageStop', 'Stop the dancing')}</>
                    : <>💃 {t('kids.stagePlay', 'Play it and dance!')}</>}
                </button>
                {filmButton}
                <p className="text-xs font-bold text-surface-700">
                  {t('kids.filmCost', 'A real video uses {n} credits.').replace('{n}', String(videoPrice))}
                </p>
                {says && (
                  <p className="rounded-2xl border-2 border-surface-200 bg-surface-100/80 px-4 py-3 text-sm font-semibold text-surface-900" data-kidssays>
                    {says}
                  </p>
                )}
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-surface-800">
                  {t('kids.filmFirst', 'Make a song first, then it can become a video here.')}
                </p>
                <button
                  type="button"
                  data-kidsgomusic
                  onClick={() => { setTab('music'); setMusic('song'); }}
                  className="fb-kids-bouncy flex min-h-[44px] items-center gap-2 rounded-2xl bg-primary-400 px-4 text-sm font-bold text-onAccent"
                >
                  <span aria-hidden>🎤</span> {t('kids.goMusic', 'Go and make a song')}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── 5. Story Maker ───────────────────────────────────────────────── */}
      {tab === 'story' && (
        <KidsStoryboard
          onDone={() => setTab('music')}
          onStoryKept={() => {
            setShelfAgain((n) => n + 1);
            spark(15);
            confetti();
            setTab('tv');
          }}
        />
      )}

      {/* ── 6. Arcade ────────────────────────────────────────────────────── */}
      {tab === 'games' && (
        <>
          {/* The owner, 13 October 2026: "a game section to play with music,
              piano… and creating their own songs on a childs way with
              guidance." The piano and its copy-me game; a kept tune lands
              on the song shelf, so it plays at bedtime with the rest. */}
          {/* Be the drummer: the band plays, the pads are the drums
              (the owner, 19 October 2026 — `KidsDrumGame.tsx`). First,
              because it is the game she asked for by name. */}
          <KidsDrumGame onSpark={spark} />
          <KidsPads onSpark={spark} />
          <KidsPiano onSpark={spark} onKept={() => setShelfAgain((n) => n + 1)} />
          <KidsArcade onSpark={spark} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => { wheel(); setTab('music'); setMusic('song'); }}
              className="fb-kids-bouncy inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-primary-400 text-xs font-black text-onAccent sm:text-sm"
            >
              <span aria-hidden>🎵</span>
              <span>{t('kids.mysterySong', 'Mystery Song Spin')}</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('story')}
              className="fb-kids-bouncy inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-300 text-xs font-black text-onAccent sm:text-sm"
            >
              <span aria-hidden>📖</span>
              <span>{t('kids.mysteryStory', 'Mystery Story Spin')}</span>
            </button>
          </div>
        </>
      )}

      {/* ── 7. FutureBox TV: the shelves ─────────────────────────────────── */}
      {tab === 'tv' && (
        <div className="space-y-5 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/80 p-4 shadow-lg backdrop-blur-xs sm:p-6" data-kidstv>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="fb-kids-bubble flex items-center gap-2 text-xl font-bold text-surface-900 sm:text-2xl">
                <span aria-hidden>📁</span> {t('kids.tabProjects', 'My Projects')}
              </h2>
              <p className="text-xs text-surface-700">
                {t('kids.tvWhy', 'Everything you kept, ready to play again. It uses no credits.')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2" data-kidstvfilter>
              {([['all', '🌟', 'kids.tvAll', 'All my creations'], ['songs', '🎵', 'kids.tvSongs', 'My songs'], ['stories', '📖', 'kids.tvStories', 'My storybooks']] as const).map(([id, icon, key, en]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={tv === id}
                  onClick={() => setTv(id)}
                  className={`min-h-[40px] rounded-xl px-3.5 text-xs font-bold ${
                    tv === id ? 'bg-cyan-400 text-onAccent' : 'bg-surface-200 text-surface-800'
                  }`}
                >
                  {icon} {t(key, en)}
                </button>
              ))}
            </div>
          </div>

          {(tv === 'all' || tv === 'songs') && (
            <div className="space-y-3">
              <h3 className="fb-kids-bubble text-lg text-amber-300">
                {t('kids.mySongs', 'My songs')}
              </h3>
              <SongShelf again={shelfAgain} />
              {/* The owner, 19 October 2026: "Mens moet in kids room ook
                  playlists kan create." */}
              <KidsPlaylists again={shelfAgain} onSpark={spark} />
              {/* The owner, 13 October 2026: "'n playlist funksie sodat kinders
                  letterlik aan die slaap kan raak op hulle playlist." */}
              <KidsSleep again={shelfAgain} onSpark={spark} />
            </div>
          )}

          {(tv === 'all' || tv === 'stories') && (
            <div className="space-y-3">
              <h3 className="fb-kids-bubble text-lg text-amber-300">
                {t('kids.stories', 'Stories')}
              </h3>
              <StoryShelf />
            </div>
          )}
        </div>
      )}

      {/* ── 8. The Magic Drawing Board ────────────────────────────────── */}
      {tab === 'draw' && (
        <>
          <KidsDrawBoard
            onSpark={spark}
            onKept={() => { setWallAgain((n) => n + 1); confetti(60); }}
            alive={(drawing) => (
              <div className="space-y-3" data-kidsaliveblock>
                <button
                  type="button"
                  onClick={() => void alive(drawing)}
                  disabled={!canPicture}
                  data-kidsalive
                  className="mx-auto flex min-h-[64px] w-full max-w-md items-center justify-center gap-2 rounded-full bg-primary-500 px-6 text-base font-black text-white shadow-lg disabled:opacity-40"
                >
                  {busy === 'picture' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  {busy === 'picture'
                    ? t('kids.aliveMaking', 'Bringing it to life…')
                    : left >= picturePrice
                      ? t('kids.alive', 'Bring it to life!')
                      : t('kids.aliveNotEnough', 'A picture needs more than is left')}
                  {busy !== 'picture' && (
                    <span className="rounded-lg bg-black/25 px-2 py-0.5 text-xs" data-kidsaliveprice={picturePrice}>
                      {picturePrice} {t('kids.credits', 'credits')}
                    </span>
                  )}
                </button>
                {picSays && (
                  <p className="rounded-2xl border-2 border-surface-200 bg-surface-100/80 px-4 py-3 text-sm font-semibold text-surface-900" data-kidsalivesays>
                    {picSays}
                  </p>
                )}
                {picture && (
                  <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border-4 border-amber-300 shadow-2xl" data-kidsaliveout>
                    <img src={picture} alt={t('kids.picYour', 'Your picture')} className="block aspect-square w-full object-cover" />
                  </div>
                )}
              </div>
            )}
          />
          <KidsPictureMaker
            price={picturePrice}
            canMake={canPicture}
            busy={busy === 'picture'}
            onMake={makePicture}
            picture={picture}
            says={picSays}
          />
        </>
      )}

      {/* ── 8b. Easy Editing: a film from the wall, made on the phone ─── */}
      {tab === 'edit' && (
        <KidsEditor
          onSpark={spark}
          again={wallAgain}
          onKept={() => { setWallAgain((n) => n + 1); confetti(80); }}
          alive={(piece) => (
            <button
              type="button"
              onClick={() => void alive(piece.blob)}
              disabled={!canPicture}
              data-kidsframealive={piece.id}
              className="flex min-h-[36px] w-full items-center justify-center gap-1 rounded-xl bg-primary-500 px-2 text-[11px] font-black text-white disabled:opacity-40"
            >
              {busy === 'picture' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t('kids.aliveShort', 'To life')} · {picturePrice}
            </button>
          )}
        />
      )}

      {/* ── 9. Mega Quizzes ───────────────────────────────────────────── */}
      {tab === 'quiz' && <KidsQuiz onSpark={spark} />}

      {/* ── 10. The gallery wall ──────────────────────────────────────── */}
      {tab === 'gallery' && (
        <div className="space-y-4 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/85 p-4 shadow-lg backdrop-blur-xs sm:p-6" data-kidsgallerywall>
          <p className="text-xs text-surface-700">
            {t('kids.galleryWhy', 'Your drawings and pictures, on your own wall. Looking uses no credits.')}
          </p>
          <KidsGallery again={wallAgain} />
        </div>
      )}

      {/* ── 11. Achievements: badges counted off the real shelves ─────── */}
      {tab === 'badges' && (
        <div className="space-y-4 rounded-3xl border-2 border-cyan-500/40 bg-surface-50/85 p-4 shadow-lg backdrop-blur-xs sm:p-6" data-kidsbadges>
          <p className="text-xs text-surface-700">
            {t('kids.badgesWhy', 'Every badge is counted off what you really made and kept.')}
          </p>
          {counts === null ? (
            <p className="flex items-center gap-2 text-sm text-surface-700">
              <Loader2 className="h-4 w-4 animate-spin" /> {t('songshelf.looking', 'Looking…')}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {BADGES.map((badge) => {
                const got = badge.earned(counts);
                return (
                  <li
                    key={badge.id}
                    data-kidsbadge={badge.id}
                    data-kidsbadgegot={got ? 'yes' : 'no'}
                    className={`flex flex-col items-center gap-1.5 rounded-3xl border-2 p-4 text-center ${
                      got ? 'border-amber-300 bg-amber-300/15 shadow-[0_0_20px_rgba(253,224,71,0.35)]' : 'border-surface-200 bg-surface-100/60 opacity-70'
                    }`}
                  >
                    <span className={`text-4xl ${got ? 'fb-kids-float' : 'grayscale'}`} aria-hidden>{badge.icon}</span>
                    <span className="fb-kids-bubble text-sm text-surface-900">{t(badge.says[0], badge.says[1])}</span>
                    <span className="text-[11px] font-semibold text-surface-700">
                      {got ? t('kids.badgeGot', 'Earned!') : t(badge.how[0], badge.how[1])}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ── The four buttons along the foot, as Google's page had them ──── */}
      <nav
        data-kidstabs
        aria-label={t('kids.dreamTitle', 'FutureBox Kids Dream Studio')}
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-cyan-400/50 bg-surface-50/95 shadow-[0_-10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-5xl items-stretch justify-around px-2 py-1.5">
          {FOOT.map((one) => {
            const on = one.id === 'home' ? !FOOT.some((f) => f.id === tab && f.id !== 'home') : tab === one.id;
            return (
              <button
                key={one.id}
                type="button"
                data-kidstab={one.id}
                aria-pressed={on}
                onClick={() => setTab(one.id)}
                className={`flex min-h-[56px] min-w-[72px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-[11px] font-black ${
                  on ? 'bg-cyan-400/20 text-cyan-300' : 'text-surface-800'
                }`}
              >
                <span className="text-2xl" aria-hidden>{one.icon}</span>
                <span>{t(one.says[0], one.says[1])}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
