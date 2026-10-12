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
  Cake, CloudRain, Dog, Film, Guitar, Heart, Loader2, Mic, Moon, Music, Rocket, ShieldCheck,
  Smile, Sparkles, Square, Waves, X,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import KidsDoor from './KidsDoor';
import StoryShelf from './StoryShelf';
import SongShelf from './SongShelf';
import KidsTemplatesPicker from './KidsTemplatesPicker';
import KidsStoryboard from './KidsStoryboard';
import { kidsNow, type KidsState } from '../lib/kidsdoor';
import { askKidVideo, makeKidSong, startKidVideo, kidWords, KID_TOPICS, KID_SOUNDS, KID_WORDS_MOST } from '../lib/kidsong';
import { stillWorthWaiting } from '../lib/jobwait';
import { asClock, howMany, priceOf } from '../lib/kidsallowance';
import { keepSong, MOST_SONGS } from '../lib/songkeep';
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
        transform: on ? 'scale(1.08)' : undefined,
        boxShadow: on
          ? '0 10px 0 rgba(0,0,0,0.22), 0 0 0 5px rgba(255,255,255,0.95), 0 16px 24px -4px rgba(0,0,0,0.25)'
          : '0 5px 0 rgba(0,0,0,0.14), 0 8px 14px -3px rgba(0,0,0,0.1)',
      }}
      className="relative flex flex-shrink-0 flex-col items-center justify-center gap-1 rounded-full px-2 transition-transform duration-150 disabled:opacity-40"
    >
      <div className="transition-transform duration-150">
        {face}
      </div>
      <span className="w-full px-1 text-center text-[11px] font-black leading-tight select-none">
        {label}
      </span>
    </button>
  );
}

export default function KidsRoom(): React.ReactElement {
  const { lang, t } = useLang();
  const [state, setState] = useState<KidsState | null>(null);
  /* The grown-up's page, reached on purpose rather than by going back. */
  const [atDoor, setAtDoor] = useState(false);

  /* Which line the mascot is on. A number and not a sentence, so the room
     can change language without the mascot changing its mind. */
  const [mascot, setMascot] = useState(0);
  const [topic, setTopic] = useState('');
  const [sound, setSound] = useState('');
  /**
   * The child's own words, typed or spoken.
   *
   * Carli, 12 October 2026: *"Die kids room moet ook 'n tikboks hê, daar is
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
  const [activeTab, setActiveTab] = useState<'songs' | 'stories' | 'games' | 'shelf'>('songs');
  const [stars, setStars] = useState(7);
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
  /** When the current wait started, so a stalled job cannot wait for ever. */
  const waitingSince = useRef<number>(0);
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
    return (
      <div className="mx-auto w-full max-w-md space-y-6 p-6 text-center" data-kidstimeup>
        <p className="text-5xl" aria-hidden>⏰</p>
        <h2 className="text-2xl font-extrabold tracking-tight text-surface-950">
          {t('kids.timeUp', 'Time is up')}
        </h2>
        <p className="text-base leading-relaxed text-surface-700">
          {t('kids.timeUpSay', 'That is all for now. Go and fetch a grown-up if you want some more.')}
        </p>
        <button
          type="button"
          data-kidsgrownup
          onClick={() => setAtDoor(true)}
          className="min-h-[44px] text-sm text-surface-600 underline underline-offset-4 hover:text-surface-900"
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
  const canSong = (Boolean(topic) || Boolean(kidWords(words))) && Boolean(sound) && left >= songPrice && !busy && !job;
  const canFilm = Boolean(song) && left >= videoPrice && !busy && !job;

  const make = async (): Promise<void> => {
    setBusy('song');
    setSays('');
    setFilm('');
    const answer = await makeKidSong(topic, sound, words);
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
      setSays(t('kids.kept', 'Kept! You can play it again any time, and it uses no credits.'));
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

  const playSpark = (kind: string): void => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (kind === 'rocket') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.35);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (kind === 'sparkle') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        osc.frequency.setValueAtTime(1046.5, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (kind === 'drum') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.2);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (kind === 'bell') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // Audio context muted
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-5 text-ink" data-kidsroom>
      {/* ── 2. Top bar: What is left in songs & clock, calm for the parent ─── */}
      <div
        className="flex items-center justify-between gap-3 rounded-2xl border-2 border-surface-200 bg-surface-50/90 px-4 py-3 shadow-sm backdrop-blur-sm"
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
                nearlyOver ? 'text-amber-800 font-bold' : 'text-surface-600'
              }`}
            >
              {asClock(clockLeft)} {t('kids.ofTime', 'left')}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAtDoor(true)}
          data-kidsgrownup
          className="min-h-[44px] flex-shrink-0 rounded-xl border border-surface-300 bg-surface-100/90 px-3.5 text-xs font-bold text-surface-700 hover:border-surface-400 hover:text-surface-900 transition-colors"
        >
          {t('kids.grownUp', 'Grown-up')}
        </button>
      </div>

      {/* ── Mode Navigation Bar: Clean, fun, chunky tabs on mobile & desktop ─── */}
      <div className="grid grid-cols-4 gap-2 rounded-2xl bg-surface-100/90 p-1.5 border-2 border-surface-200 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('songs')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-black transition-all ${
            activeTab === 'songs'
              ? 'bg-primary-500 text-white shadow-md scale-102'
              : 'text-surface-700 hover:bg-surface-200/60'
          }`}
        >
          <span className="text-base">🎵</span>
          <span className="truncate">{t('kids.tabSongs', 'Song Studio')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stories')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-black transition-all ${
            activeTab === 'stories'
              ? 'bg-amber-500 text-white shadow-md scale-102'
              : 'text-surface-700 hover:bg-surface-200/60'
          }`}
        >
          <span className="text-base">📖</span>
          <span className="truncate">{t('kids.tabStories', 'Story Studio')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('games')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-black transition-all ${
            activeTab === 'games'
              ? 'bg-purple-500 text-white shadow-md scale-102'
              : 'text-surface-700 hover:bg-surface-200/60'
          }`}
        >
          <span className="text-base">🎲</span>
          <span className="truncate">{t('kids.tabGames', 'Games')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shelf')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-black transition-all ${
            activeTab === 'shelf'
              ? 'bg-sky-500 text-white shadow-md scale-102'
              : 'text-surface-700 hover:bg-surface-200/60'
          }`}
        >
          <span className="text-base">📚</span>
          <span className="truncate">{t('kids.tabShelf', 'My Shelf')}</span>
        </button>
      </div>

      {/* ── Active Tab Views ──────────────────────────────────────────────── */}
      {activeTab === 'stories' && (
        <KidsStoryboard
          onDone={() => setActiveTab('songs')}
          onStoryKept={() => {
            setShelfAgain((n) => n + 1);
            setStars((s) => s + 3);
            setActiveTab('shelf');
          }}
        />
      )}

      {activeTab === 'games' && (
        <div className="space-y-5 rounded-3xl border-4 border-purple-200/90 bg-surface-50/95 p-5 sm:p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 border-b-2 border-surface-200 pb-3">
            <div>
              <h3 className="text-lg font-black text-purple-950 flex items-center gap-2">
                <span>🎲</span> {t('kids.tabGames', 'Games')}
              </h3>
              <p className="text-xs font-bold text-surface-600">
                {t('kids.gameSparksSub', 'Tap to make cheerful animal and space sounds!')}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-black text-amber-900 shadow-sm">
              <span>⭐</span>
              <span>{stars} {t('kids.gameStars', 'Stars collected')}</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2.5">
            {[
              { id: 'rocket', emoji: '🚀', label: 'Rocket Zoom', tone: 'from-blue-400 to-indigo-600' },
              { id: 'sparkle', emoji: '🦄', label: 'Magic Fairy', tone: 'from-pink-400 to-rose-500' },
              { id: 'drum', emoji: '🥁', label: 'Drum Roll', tone: 'from-amber-400 to-orange-500' },
              { id: 'bell', emoji: '🔔', label: 'Magic Bell', tone: 'from-emerald-400 to-teal-500' },
              { id: 'dog', emoji: '🐶', label: 'Puppy Bark', tone: 'from-yellow-400 to-amber-500' },
              { id: 'alien', emoji: '👾', label: 'Alien Beep', tone: 'from-purple-400 to-violet-600' },
            ].map((spark) => (
              <button
                key={spark.id}
                type="button"
                onClick={() => {
                  playSpark(spark.id);
                  setStars((s) => s + 1);
                }}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-br ${spark.tone} p-4 text-white shadow-md hover:scale-105 active:scale-95 transition-transform`}
              >
                <span className="text-3xl">{spark.emoji}</span>
                <span className="text-xs font-black">{spark.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                wheel();
                setActiveTab('songs');
              }}
              className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-500 text-white font-black text-xs sm:text-sm shadow-md hover:bg-primary-600 transition-colors"
            >
              <span>🎵</span>
              <span>{t('kids.mysterySong', 'Mystery Song Spin')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stories')}
              className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 text-white font-black text-xs sm:text-sm shadow-md hover:bg-amber-600 transition-colors"
            >
              <span>📖</span>
              <span>{t('kids.mysteryStory', 'Mystery Story Spin')}</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'shelf' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-black text-white drop-shadow-sm">
              {t('kids.stories', 'Stories')}
            </h2>
            <StoryShelf />
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-black text-white drop-shadow-sm">
              {t('kids.mySongs', 'My songs')}
            </h2>
            <SongShelf again={shelfAgain} />
          </div>
        </div>
      )}

      {activeTab === 'songs' && (
        <>
          {/* Quick link banner to story studio */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50/95 p-3 sm:p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-2xl sm:text-3xl">✨</span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-black text-amber-950 truncate">
                  {t('kids.storyboardTitle', 'Magic Storyboard Studio')}
                </p>
                <p className="text-[11px] font-bold text-amber-800 truncate">
                  {t('kids.storyboardSub', 'Choose your storyline & visuals to make your storybook!')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('stories')}
              className="flex-shrink-0 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-black text-white shadow-md hover:bg-amber-600 transition-colors"
            >
              {t('kids.buildStoryBtn', 'Build a Story')}
            </button>
          </div>

      {/* ── 3. The mascot and the wheel ──────────────────────────────────
 
          She took the question to Google and sent back what it drew. These
          two are from that: something that talks to a child who has just
          arrived, and a press for one who cannot decide. What was NOT taken
          from it — a nickname text box, a Render button that renders
          nothing — is written down in `lib/kidslook.ts`. */}
      <div className="flex items-center gap-3 sm:gap-4 rounded-3xl border-4 border-surface-200/90 bg-surface-50/95 p-3.5 sm:p-4 shadow-xl backdrop-blur-sm">
        <button
          type="button"
          data-kidsmascot
          data-kidsbob
          onClick={() => setMascot((n) => (n + 1) % MASCOT_SAYS.length)}
          aria-label={t('kids.mascotSays', 'Say something else')}
          className="flex h-16 w-16 sm:h-18 sm:w-18 flex-shrink-0 items-center justify-center rounded-full text-4xl select-none"
        >
          <span aria-hidden>{MASCOT_ICONS[mascot % MASCOT_ICONS.length]}</span>
        </button>
        <div className="relative min-w-0 flex-1 rounded-2xl border-2 border-surface-200 bg-surface-100/80 px-3.5 py-2.5 shadow-inner">
          <p data-kidsmascotsays className="text-sm sm:text-base font-black leading-snug text-surface-950">
            {t(`kids.mascot${mascot}`, MASCOT_SAYS[mascot][0])}
          </p>
        </div>
        <button
          type="button"
          data-kidswheel
          onClick={wheel}
          disabled={Boolean(busy) || Boolean(job)}
          className="flex min-h-[56px] flex-shrink-0 items-center gap-1.5 sm:gap-2 rounded-2xl px-3.5 sm:px-4 text-xs sm:text-sm font-black disabled:opacity-40"
        >
          <span aria-hidden className="text-lg select-none">🎲</span>
          {t('kids.spin', 'Spin')}
        </button>
      </div>

      {/* ── 4. The sentence, which is what the headings used to be ─────────
 
          Her words: *"selfs die uitleg moet anders en uniek wees as die
          status quo."* Two headings reading "What should the song be about?"
          and "How should it sound?" are a form. This is the same two choices
          said as the thing a child is about to get, filling in as they press
          — and it carries the colours of what they picked, so the answer to
          "what did I choose" is readable from across a room. */}
      <div className="rounded-3xl border-4 border-surface-200/90 bg-surface-50/90 p-4 sm:p-5 shadow-lg backdrop-blur-sm text-center">
        <p data-kidssentence className="text-xl sm:text-2xl font-black leading-snug text-surface-950">
          {t('kids.aSongAbout', 'A song about')}{' '}
          <span
            data-kidssentencetopic
            className="inline-block rounded-2xl px-3.5 py-1 align-middle text-base sm:text-lg font-black shadow-sm"
            style={{
              background: `linear-gradient(145deg, ${topicPaint.from}, ${topicPaint.to})`,
              color: topicPaint.ink,
            }}
          >
            {kidWords(words)
              ? kidWords(words)
              : topic
                ? t(KID_TOPICS.find((one) => one.id === topic)!.says[0],
                  KID_TOPICS.find((one) => one.id === topic)!.says[1])
                : t('kids.something', 'something')}
          </span>{' '}
          {t('kids.thatSounds', 'that sounds')}{' '}
          <span
            data-kidssentencesound
            className="inline-block rounded-2xl px-3.5 py-1 align-middle text-base sm:text-lg font-black shadow-sm"
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
      </div>

      {/* ── The child's own words ─────────────────────────────────────────
          A box for the ones who can type, and a button for the ones who
          would rather say it. What is said lands in the box, so it can be
          read, fixed and heard back in the sentence above. Directly under
          that sentence, because it answers it — below the fourteen template
          tiles it was a screen and a half down on a phone. */}
      <div
        data-kidsown
        className="mx-auto flex w-full max-w-md items-center gap-2 rounded-3xl border-4 border-surface-200/90 bg-surface-50/90 p-2 shadow-md"
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
          className="min-h-[48px] min-w-0 flex-1 rounded-2xl border-2 border-surface-200 bg-surface-50 px-4 text-base font-bold text-surface-950 placeholder:text-surface-500 focus:border-primary-500 focus:outline-none disabled:opacity-50"
        />
        {canSpeak && (
          <button
            type="button"
            data-kidsspeak
            onClick={speak}
            disabled={Boolean(busy) || Boolean(job)}
            aria-pressed={listening}
            aria-label={listening ? t('kids.listening', 'Listening… press to stop') : t('kids.speak', 'Say it')}
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white shadow-md disabled:opacity-50 ${
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
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-surface-200 bg-surface-50 text-surface-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {listening && (
        <p data-kidslistening className="text-center text-sm font-bold text-rose-600">
          {t('kids.listening', 'Listening… press to stop')}
        </p>
      )}

      {/* ── 4b. Ready-made Adventure Templates ────────────────────────────
          Carli, 11 October 2026: *"Die kids room het ook baie templates
          nodig vir 'n kind om net van te kies."*
          A child can pick a complete theme (topic + sound) in one tap. */}
      <KidsTemplatesPicker
        selectedTopic={topic}
        selectedSound={sound}
        onPick={(tpl) => {
          setTopic(tpl.topic);
          setSound(tpl.sound);
          setMascot((n) => (n + 1) % MASCOT_SAYS.length);
        }}
        disabled={Boolean(busy) || Boolean(job)}
      />

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
        className="mx-auto flex h-[92px] w-[92px] flex-col items-center justify-center gap-0.5 rounded-full text-[13px] font-black leading-tight text-white disabled:opacity-40 sm:h-[104px] sm:w-[104px]"
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
        <p className="rounded-2xl border-2 border-surface-200 bg-surface-50/90 px-4 py-3 text-sm font-semibold text-surface-900 shadow-sm" data-kidssays>
          {says}
        </p>
      )}

      {/* ── 5. Player: boombox station with high-contrast action buttons ─── */}
      {song && (
        <div className="space-y-4 rounded-3xl border-4 border-surface-200/90 bg-surface-50/95 p-5 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500/20 text-2xl select-none" data-kidsspin>
              <span aria-hidden>💿</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-wider text-surface-600">
                {t('kids.yourSong', 'Your Song')}
              </p>
              <h3 className="truncate text-base font-black text-surface-950">
                {topic ? t(KID_TOPICS.find((o) => o.id === topic)?.says[0] ?? '', KID_TOPICS.find((o) => o.id === topic)?.says[1] ?? '') : ''} · {sound ? t(KID_SOUNDS.find((o) => o.id === sound)?.says[0] ?? '', KID_SOUNDS.find((o) => o.id === sound)?.says[1] ?? '') : ''}
              </h3>
            </div>
          </div>

          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={song} controls className="w-full rounded-2xl" data-kidsplayer />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
              onClick={() => void film2()}
              disabled={!canFilm}
              data-kidsfilm
              className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl text-base font-black disabled:opacity-40"
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
        </div>
      )}

      {film && (
        <div className="rounded-3xl border-4 border-surface-200/90 bg-surface-50/95 p-3 shadow-2xl overflow-hidden">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={film} controls className="w-full rounded-2xl" data-kidsfilmout />
        </div>
      )}
        </>
      )}
    </div>
  );
}
