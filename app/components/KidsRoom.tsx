'use client';

/**
 * The room a child plays in.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Ek dink die child funksie is net om met liedjie
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
 * Carli, 10 October 2026: *"Sjoe, die kids room page is dood en vervelig,
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
 * ── Why the allowance is re-asked after every press ─────────────────────
 *
 * Because the number on screen is the one thing a child will believe. The
 * limit itself is applied in `charge()` and is true whatever this page
 * thinks — see `lib/server/kidsmode.ts` — but a room still showing four
 * songs left after three have been made is a room that is about to
 * disappoint somebody. So the room asks the server again rather than
 * subtracting its own guess.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Cake, CloudRain, Dog, Film, Guitar, Heart, Loader2, Moon, Music, Rocket, ShieldCheck,
  Smile, Sparkles, Waves,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import KidsDoor from './KidsDoor';
import StoryShelf from './StoryShelf';
import SongShelf from './SongShelf';
import { kidsNow, type KidsState } from '../lib/kidsdoor';
import { MOST_SONGS, keepSong } from '../lib/songkeep';
import { asClock, howMany, priceOf } from '../lib/kidsallowance';
import {
  KID_SOUNDS, KID_TOPICS, askKidVideo, makeKidSong, startKidVideo,
} from '../lib/kidsong';
import { MASCOT_SAYS, PAINTS, SOUND_PAINTS, paintOf, sizeAt, spin } from '../lib/kidslook';

/** A picture a child can tell apart at a glance, per choice. */
const FACES: Record<string, React.ReactNode> = {
  dog: <Dog className="h-8 w-8" />,
  space: <Rocket className="h-8 w-8" />,
  birthday: <Cake className="h-8 w-8" />,
  sea: <Waves className="h-8 w-8" />,
  rain: <CloudRain className="h-8 w-8" />,
  brave: <ShieldCheck className="h-8 w-8" />,
  happy: <Smile className="h-7 w-7" />,
  quiet: <Moon className="h-7 w-7" />,
  rock: <Guitar className="h-7 w-7" />,
  dance: <Music className="h-7 w-7" />,
};

/**
 * One choice, as a bubble in its own colour.
 *
 * ── Why a bubble and not a tile ──────────────────────────────────────────
 *
 * Her words: *"selfs die uitleg moet anders en uniek wees as die status
 * quo."* A grid of equal grey tiles is the status quo. These are round, they
 * come in three sizes that do not line up row to row, and each carries the
 * colour its topic owns — so the sheet reads as stickers scattered on paper
 * while remaining, underneath, an ordinary wrapping row of real buttons.
 *
 * ── Why the size is passed in and not decided here ───────────────────────
 *
 * Because it belongs to the SHEET, not to the bubble: "no two rows line up"
 * is a fact about fourteen of them together, and a bubble choosing its own
 * size at random would look different on every render and be impossible to
 * check. `sizeAt` in `lib/kidslook.ts` holds the run.
 */
function Bubble({
  on,
  face,
  label,
  onPick,
  paint,
  size = 1,
  off = false,
}: {
  readonly on: boolean;
  readonly face: React.ReactNode;
  readonly label: string;
  readonly onPick: () => void;
  readonly paint: { readonly from: string; readonly to: string; readonly ink: string };
  readonly size?: number;
  readonly off?: boolean;
}): React.ReactElement {
  /* 96, 112 and 132. The smallest is still well above the app's 44, because
     these are pressed by a small hand that is not aiming carefully. */
  const across = size === 3 ? 132 : size === 2 ? 112 : 96;
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={off}
      aria-pressed={on}
      data-kidsbubble
      style={{
        width: across,
        height: across,
        background: `linear-gradient(145deg, ${paint.from}, ${paint.to})`,
        color: paint.ink,
        /* The chosen one lifts off the paper rather than changing colour:
           changing it would lose the one thing the bubble is for, and a
           child tracks "the big one that moved" more easily than a border. */
        transform: on ? 'scale(1.06)' : undefined,
        boxShadow: on
          ? '0 10px 0 rgba(0,0,0,0.18), 0 0 0 5px rgba(255,255,255,0.9)'
          : '0 5px 0 rgba(0,0,0,0.14)',
      }}
      className="flex flex-shrink-0 flex-col items-center justify-center gap-1 rounded-full px-2 transition-transform duration-150 disabled:opacity-40"
    >
      {face}
      <span className="w-full px-1 text-center text-[11px] font-black leading-tight">
        {label}
      </span>
    </button>
  );
}

export default function KidsRoom(): React.ReactElement {
  const { t } = useLang();
  const [state, setState] = useState<KidsState | null>(null);
  /* The grown-up's page, reached on purpose rather than by going back. */
  const [atDoor, setAtDoor] = useState(false);

  /* Which line the mascot is on. A number and not a sentence, so the room
     can change language without the mascot changing its mind. */
  const [mascot, setMascot] = useState(0);
  const [topic, setTopic] = useState('');
  const [sound, setSound] = useState('');
  const [busy, setBusy] = useState<'' | 'song' | 'video'>('');
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
  const [film, setFilm] = useState('');

  /* The last object URL handed out, revoked when another replaces it. Without
     this every attempt at a song leaks a minute of audio for as long as the
     room is open, and a child makes a lot of attempts. */
  const held = useRef<string>('');

  useEffect(() => { void kidsNow().then(setState); }, []);

  /**
   * ── The clock, counted down here and owned by the server ─────────
   *
   * Carli, 10 October 2026: *"Wanneer screen time op is moet dit die kind
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
    let stopped = false;
    const ask = async (): Promise<void> => {
      const answer = await askKidVideo(job);
      if (stopped || !answer) return;
      if ('url' in answer) {
        setFilm(answer.url);
        setJob(null);
        setSays(t('kids.filmDone', 'Your video is ready!'));
      } else {
        setJob(null);
        setSays(answer.says);
      }
      void kidsNow().then(setState);
    };
    void ask();
    const every = window.setInterval(() => { void ask(); }, 5_000);
    return () => { stopped = true; window.clearInterval(every); };
  }, [job, t]);

  if (state === null) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
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
    return (
      <div className="mx-auto w-full max-w-md space-y-6 p-6 text-center" data-kidstimeup>
        <p className="text-5xl" aria-hidden>⏰</p>
        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          {t('kids.timeUp', 'Time is up')}
        </h2>
        <p className="text-base leading-relaxed text-zinc-300">
          {t('kids.timeUpSay', 'That is all for now. Go and fetch a grown-up if you want some more.')}
        </p>
        <button
          type="button"
          data-kidsgrownup
          onClick={() => setAtDoor(true)}
          className="min-h-[44px] text-sm text-zinc-500 underline underline-offset-4"
        >
          {t('kids.imTheGrownUp', 'I am the grown-up')}
        </button>
      </div>
    );
  }

  /* No allowance set, or a grown-up asked for the door: the door. It is the
     same component the opening page uses, so there is one place an allowance
     is given and one place it is ended. */
  if (!state.open || atDoor) {
    return (
      <div className="space-y-4">
        <KidsDoor onIn={(next) => { setState(next); setAtDoor(false); }} />
        {state.open && (
          <div className="mx-auto w-full max-w-3xl px-5 pb-8">
            <button
              type="button"
              onClick={() => setAtDoor(false)}
              className="min-h-[44px] rounded-xl border border-zinc-700 px-4 text-sm font-bold text-zinc-200"
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
  const canSong = Boolean(topic) && Boolean(sound) && left >= songPrice && !busy && !job;
  const canFilm = Boolean(song) && left >= videoPrice && !busy && !job;

  const make = async (): Promise<void> => {
    setBusy('song');
    setSays('');
    setFilm('');
    const answer = await makeKidSong(topic, sound);
    setBusy('');
    void kidsNow().then(setState);
    if ('says' in answer) { setSays(answer.says); return; }
    if (held.current) URL.revokeObjectURL(held.current);
    held.current = URL.createObjectURL(answer.audio);
    setSong(held.current);
    setSongBlob(answer.audio);
    setKept(false);
    setSays(t('kids.songDone', 'Here is your song!'));
  };

  const film2 = async (): Promise<void> => {
    setBusy('video');
    setSays('');
    const answer = await startKidVideo(topic);
    setBusy('');
    void kidsNow().then(setState);
    if ('says' in answer) { setSays(answer.says); return; }
    setJob(answer.job);
    setSays(t('kids.filmMaking', 'Making your video. It takes a minute.'));
  };

  /* ── Keeping it ────────────────────────────────────────────────────────
 
     Carli, 9 October 2026: *"Gaan aan met die kind se liedjies wat keepbaar
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
      setSays(t('kids.kept', 'Kept! You can play it again any time, and it costs nothing.'));
    } else if (put === 'shelfFull') {
      setSays(t('kids.shelfFull', 'Your shelf is full — it holds {n} songs. Ask a grown-up to take one off.')
        .replace('{n}', String(MOST_SONGS)));
    } else if (put === 'full') {
      setSays(t('kids.deviceFull', 'There is no room left on this device.'));
    } else {
      setSays(t('kids.noKeep', 'This browser will not keep anything.'));
    }
  };

  /* What the sentence at the top is wearing. `paintOf` answers with a plain
     colour when nothing is chosen, so the sentence is never a bare word. */
  const topicPaint = paintOf(PAINTS, topic || null);
  const soundPaint = paintOf(SOUND_PAINTS, sound || null);

  /* The wheel and the mascot are Google's two ideas from the room she had it
     draw. `lib/kidslook.ts` carries what was taken from that and what was
     deliberately left in it. */
  const wheel = (): void => {
    const got = spin(KID_TOPICS, KID_SOUNDS);
    setTopic(got.topic);
    setSound(got.sound);
    setMascot((n) => (n + 3) % MASCOT_SAYS.length);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-5 text-ink" data-kidsroom>
      {/* ── What is left, in songs ──────────────────────────────────────
          In songs and not in credits, because a number of credits is a thing
          a child has to be taught and a number of songs is a thing they
          already understand. */}
      <div
        className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
        data-kidsleft
      >
        <span className="min-w-0 text-sm font-bold text-emerald-300">
          {songsLeft > 0
            ? `${songsLeft} ${songsLeft === 1 ? t('kids.songLeft', 'song left') : t('kids.songsLeft', 'songs left')}`
            : t('kids.noneLeft', 'All used up — ask a grown-up')}
          {/* ── And how long is left, beside how much ──────────────

              Only where there is a clock. A countdown that reads 0:00 and
              then the room vanishing is a better five minutes than a room
              that just stops, which is why it turns amber under five — a
              child who can see it coming puts the last song on the shelf
              instead of losing it mid-press. */}
          {clockLeft !== null && (
            <span
              data-kidsclockleft={clockLeft}
              className={`block text-xs font-bold tabular-nums ${
                nearlyOver ? 'text-amber-300' : 'text-emerald-400/80'
              }`}
            >
              {asClock(clockLeft)} {t('kids.ofTime', 'left')}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setAtDoor(true)}
          data-kidsgrownup
          className="min-h-[44px] flex-shrink-0 rounded-xl border border-emerald-500/40 px-3 text-xs font-bold text-emerald-200"
        >
          {t('kids.grownUp', 'Grown-up')}
        </button>
      </div>

      {/* ── The stories a grown-up has made ───────────────────────────────
 
          Carli, 9 October 2026: *"Gaan aan met die shelf van stories in die
          kids kamer."*
 
          Above the song, because a story is the thing to reach for when
          somebody has already made one and the song is what to do when they
          have not. Nothing in here spends: the pictures and the readings
          were paid for when the book was made, so a child can hear the same
          story all afternoon and the allowance is untouched.
 
          The bin is not drawn for a child — `grownUp` is false here. Losing
          a story somebody made them is the one press in this room that
          cannot be undone, and the grown-up's own page has the same shelf
          with it. */}
      <div className="space-y-3">
        <h2 className="text-lg font-extrabold text-white">
          {t('kids.stories', 'Stories')}
        </h2>
        <StoryShelf />
      </div>

      {/* ── The songs this child has kept ────────────────────────────────
          Under the stories and above the making, because a child who has
          made songs before comes back for those first. */}
      <div className="space-y-3">
        <h2 className="text-lg font-extrabold text-white">
          {t('kids.mySongs', 'My songs')}
        </h2>
        <SongShelf again={shelfAgain} />
      </div>

      {/* ── The mascot and the wheel, both Google's ideas ────────────────
 
          She took the question to Google and sent back what it drew. These
          two are from that: something that talks to a child who has just
          arrived, and a press for one who cannot decide. What was NOT taken
          from it — a nickname text box, a Render button that renders
          nothing — is written down in `lib/kidslook.ts`. */}
      {/* `bg-white` is NOT white in this app — `white` is the ink token, so on
          a light theme it paints near-black. That is the Cubed room's fault
          exactly, and `check:theme` caught it here before it shipped a second
          time. The paper is `surface-50`, which in this room's own block is a
          warm near-white. */}
      <div className="flex items-center gap-4 rounded-3xl border-4 border-surface-100 bg-surface-50/80 p-4 shadow-lg">
        <button
          type="button"
          data-kidsmascot
          data-kidsbob
          onClick={() => setMascot((n) => (n + 1) % MASCOT_SAYS.length)}
          aria-label={t('kids.mascotSays', 'Say something else')}
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-4xl"
          style={{ background: 'linear-gradient(145deg,#7C4DFF,#FF4081)' }}
        >
          <span aria-hidden>👾</span>
        </button>
        <p data-kidsmascotsays className="min-w-0 flex-1 text-base font-black leading-tight">
          {t(`kids.mascot${mascot}`, MASCOT_SAYS[mascot][0])}
        </p>
        <button
          type="button"
          data-kidswheel
          onClick={wheel}
          disabled={Boolean(busy) || Boolean(job)}
          style={{ boxShadow: '0 6px 0 #b45309' }}
          className="flex min-h-[56px] flex-shrink-0 items-center gap-2 rounded-2xl bg-amber-400 px-4 text-sm font-black text-amber-950 disabled:opacity-40"
        >
          <span aria-hidden>🎲</span>
          {t('kids.spin', 'Spin')}
        </button>
      </div>

      {/* ── The sentence, which is what the headings used to be ──────────
 
          Her words: *"selfs die uitleg moet anders en uniek wees as die
          status quo."* Two headings reading "What should the song be about?"
          and "How should it sound?" are a form. This is the same two choices
          said as the thing a child is about to get, filling in as they press
          — and it carries the colours of what they picked, so the answer to
          "what did I choose" is readable from across a room. */}
      <p data-kidssentence className="px-1 text-[26px] font-black leading-tight sm:text-3xl" style={{ color: 'rgb(60,30,12)' }}>
        {t('kids.aSongAbout', 'A song about')}{' '}
        <span
          data-kidssentencetopic
          className="inline-block rounded-full px-3 py-0.5 align-middle"
          style={{
            background: `linear-gradient(145deg, ${topicPaint.from}, ${topicPaint.to})`,
            color: topicPaint.ink,
          }}
        >
          {topic
            ? t(KID_TOPICS.find((one) => one.id === topic)!.says[0],
              KID_TOPICS.find((one) => one.id === topic)!.says[1])
            : t('kids.something', 'something')}
        </span>{' '}
        {t('kids.thatSounds', 'that sounds')}{' '}
        <span
          data-kidssentencesound
          className="inline-block rounded-full px-3 py-0.5 align-middle"
          style={{
            background: `linear-gradient(145deg, ${soundPaint.from}, ${soundPaint.to})`,
            color: soundPaint.ink,
          }}
        >
          {sound
            ? t(KID_SOUNDS.find((one) => one.id === sound)!.says[0],
              KID_SOUNDS.find((one) => one.id === sound)!.says[1])
            : t('kids.anyway', 'any way')}
        </span>
      </p>

      {/* The sheet of topics. A wrapping row rather than a grid, so the
          three sizes can sit beside each other without a cell forcing them
          all to the tallest. */}
      <div data-kidstopics className="flex flex-wrap justify-center gap-2.5">
        {KID_TOPICS.map((one, at) => (
          <Bubble
            key={one.id}
            on={topic === one.id}
            face={FACES[one.id] ?? <Music className="h-7 w-7" />}
            label={t(one.says[0], one.says[1])}
            onPick={() => setTopic(one.id)}
            paint={paintOf(PAINTS, one.id)}
            size={sizeAt(at)}
            off={Boolean(busy) || Boolean(job)}
          />
        ))}
      </div>

      {/* And the four sounds, all one size: four of something is a row, and
          giving them three sizes too would make the page look unsorted
          rather than scattered. */}
      <div data-kidssounds className="flex flex-wrap justify-center gap-2.5">
        {KID_SOUNDS.map((one) => (
          <Bubble
            key={one.id}
            on={sound === one.id}
            face={FACES[one.id] ?? <Music className="h-7 w-7" />}
            label={t(one.says[0], one.says[1])}
            onPick={() => setSound(one.id)}
            paint={paintOf(SOUND_PAINTS, one.id)}
            size={2}
            off={Boolean(busy) || Boolean(job)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => void make()}
        disabled={!canSong}
        data-kidsmake
        /* Round, hot pink, and the biggest thing on the page. Every choice
           in this room is already a colour, so the one button that MAKES
           something has to be a colour none of the choices are. */
        style={{ boxShadow: '0 8px 0 rgb(173,12,90)' }}
        className="mx-auto flex h-[92px] w-[92px] flex-col items-center justify-center gap-0.5 rounded-full bg-primary-500 text-[13px] font-black leading-tight text-white disabled:opacity-40 sm:h-[104px] sm:w-[104px]"
      >
        {busy === 'song' ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            {t('kids.making', 'Making your song…')}
          </>
        ) : (
          <>
            <Sparkles className="h-6 w-6" />
            {t('kids.make', 'Make my song')}
          </>
        )}
      </button>

      {says && (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-200" data-kidssays>
          {says}
        </p>
      )}

      {song && (
        <div className="space-y-3">
          {/* The browser's own player. A child knows what it is, and a custom
              one here would be a transport to build and maintain for a room
              whose whole point is that it has two buttons in it. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={song} controls className="w-full" data-kidsplayer />
          <button
            type="button"
            onClick={() => void keepIt()}
            disabled={!songBlob || kept}
            data-kidskeep
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/50 bg-amber-500/10 text-base font-black text-amber-300 disabled:opacity-40"
          >
            <Heart className="h-5 w-5" fill={kept ? 'currentColor' : 'none'} />
            {kept ? t('kids.keptIt', 'Kept') : t('kids.keep', 'Keep it')}
          </button>
          <button
            type="button"
            onClick={() => void film2()}
            disabled={!canFilm}
            data-kidsfilm
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/50 bg-emerald-500/10 text-base font-black text-emerald-300 disabled:opacity-40"
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
        </div>
      )}

      {film && (
        /* eslint-disable-next-line jsx-a11y/media-has-caption */
        <video src={film} controls className="w-full rounded-2xl" data-kidsfilmout />
      )}
    </div>
  );
}
