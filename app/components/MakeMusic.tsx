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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Music, Play, Pause, Download, Share2, Repeat, Trash2, Sparkles, Wand2, Loader2,
  Video as VideoIcon, X, Mic,
  Sliders, Image as ImageIcon, Plus, Clock, AudioLines, SlidersHorizontal, Palette,
} from 'lucide-react';
import { renderSketch, encodeWav, familyFor, sketchDurationSeconds } from '../lib/audio';
import {
  loadTracks, saveTracks, putAudio, getAudio, deleteAudio, downloadBlob, safeFilename,
  type Track,
} from '../lib/library';
import { accessToken } from '../lib/cloud';
import { saveSong } from '../lib/songfile';
import { durationOf, readAudio } from '../lib/trackaudio';
import { keepMix, takeId } from '../lib/takekeep';
import { Refused, engines, songEngine, splitSections, type Stage } from '../lib/engines';
import { expect as expectWait, remember } from '../lib/timing';
import VideoPanel from './VideoPanel';
import NowPlaying from './NowPlaying';
import Sleeve from './Sleeve';
import PostToLive from './PostToLive';
import VocalBooth from './VocalBooth';
import SingItMine, { singingState } from './SingItMine';
import StyleFinder from './StyleFinder';
import LyricHelp from './LyricHelp';
import Note from './Note';
import Hint from './Hint';
import SayItWrong from './SayItWrong';
import { weightWords, weirdWords } from '../lib/songweight';
import { STARTERS, LENGTH_CHOICES } from '../data/sound';
import { CREDITS, songCost, type SongEngine } from '../lib/credits';
import { check, record, ENTITLEMENTS, type Plan } from '../lib/entitlements';
import { useLang } from '../lib/i18n';
import { withSaid } from '../lib/speak';
import SpeakButton from './SpeakButton';
import * as cloud from '../lib/cloud';
import { loadOwned, levelOf, startCheckout, downloadLink, NOTHING, type Owned } from '../lib/purchases';
import { loadSounds, training, NO_SOUNDS, type Sounds } from '../lib/sounds';
import { noteTaste } from '../lib/taste';
import { looksAfrikaans, singDirection, type SingIn } from '../lib/lyriclang';
import { refusalText } from '../lib/apierror';
import StyleFrom from './StyleFrom';
import { useCopilotOps } from '../lib/copilotactions';
import { useOpenCard } from '../lib/opencard';
import PromptCards from './PromptCards';
import { MOODS, type Mood } from '../data/songstarts';
import { titleFromWords } from '../lib/songtitle';
import VerseWriter from './VerseWriter';
import StartPicker from './StartPicker';
import { useBackLayer } from '../lib/backstack';

export interface Canvas {
  title: string;
  lyrics: string;
  /** Free text, so the copilot can set a sound no preset covers. */
  style: string;
  /**
   * How they feel, and what about — the two questions the room opens with.
   *
   * On the canvas rather than in this component's own state, and that is the
   * point of putting it here: the canvas is what travels to the copilot, so
   * the help somebody gets is about THEIR song rather than about songs. A
   * feeling kept in this file would be a feeling the copilot cannot see.
   *
   * Neither is sent to the engine. A mood is not a sound, and turning "sad"
   * into "slow and minor" behind somebody's back is the app making a musical
   * decision it was not asked to make — the style field is still where the
   * sound is decided, further down, by them.
   */
  feeling?: Mood | null;
  /** Their own words for what the song is about. */
  about?: string;
}

/** Where Easy or Extensive is remembered. */
const WAY_KEY = 'futurebox.make.way.v1';

/** The small buttons along the foot of the song box, each popping one control out. */
type Pop = 'plus' | 'length' | 'feel' | 'voice' | 'sound' | 'more';

export default function MakeMusic({
  userPlan,
  onUpgrade,
  incoming,
  canvas,
  setCanvas,
  makeSignal,
  onMade,
  onGoToChannel,
  onGoToSound,
  onGoToArt,
  onBrowseArt,
  engineReady,
  copilot,
  pairGate = null,
  onPairMade,
}: {
  userPlan: Plan;
  /** The copilot pane, drawn inside the song box on Easy. */
  copilot?: React.ReactNode;
  onUpgrade: () => void;
  /** Carried over from the Songwriter, when you came from there. */
  incoming?: { title: string; lyrics: string; style: string } | null;
  /** Held by the studio, because the copilot writes to it too. */
  canvas: Canvas;
  /**
   * The song canvas, as a real React setter.
   *
   * It was `(next: Canvas) => void`, which only allows the whole-object
   * form — and this file already carries a note, at `PromptCards` below,
   * that "two setCanvas calls built from the same captured object put the
   * first one's change back, and that cost the title once".
   *
   * It then cost it again: the three operations below arrive one after the
   * other from the advert desk, each spread the same captured `canvas`, and
   * only the last survived — so a song recommendation set the sound and
   * silently dropped the title and the words. Found by `audit/adcarry.mjs`
   * pressing the button; `check:adhandover` passed the whole time, because
   * what leaves the desk was right and what arrived was not.
   *
   * Allowing the updater form is the fix rather than a third warning: with
   * it, each write sees the previous one.
   */
  setCanvas: React.Dispatch<React.SetStateAction<Canvas>>;
  /** Bumped by the copilot to press the button from over there. */
  makeSignal: number;
  /** Fires when a track lands, so the studio can offer a video. */
  onMade: (track: Track) => void;
  /** A sound of your own is trained there, not here. */
  onGoToChannel: () => void;
  /** Into the Sound trainer, which is where a sound is actually trained. */
  onGoToSound: () => void;
  /**
   * Out to the album art room, with this song already chosen there.
   *
   * The cover panel offers two kinds of picture and only one of them is made
   * here — see the note at the top of `Sleeve.tsx`.
   */
  onGoToArt: (song: { id: string; title: string }) => void;
  /** The album art market, to buy a cover from a real artist. */
  onBrowseArt?: () => void;
  engineReady: boolean;
  /**
   * When the song is made by two people in a pair room: whether both have
   * approved it yet, and if not, the sentence saying what is missing
   * (`readyToMake` in `lib/pairs.ts`). The button waits for it.
   */
  pairGate?: {
    readonly id: string;
    readonly ready: boolean;
    readonly why: string;
    /**
     * True while the other person holds the pen. Their words are written
     * into this form as they type, so anything typed here would be put
     * under on their next save — the fields are read-only instead.
     */
    readonly watching?: boolean;
    /** The artist line for a song made here together: "Collab · @one & @two". */
    readonly credit?: string;
  } | null;
  /** After a song is made in a pair room, so the cleared ticks are re-read. */
  onPairMade?: () => void;

}) {
  const { t, lang } = useLang();
  const title = canvas.title;
  const lyrics = canvas.lyrics;
  /* Which engine will sing it, so the price on the button is the price that
     is charged: Afrikaans words always go to ElevenLabs, everything else to
     whichever engine the route says is on. ElevenLabs until it answers, the
     dearer of the two. */
  const [engineOn, setEngineOn] = useState<SongEngine>('eleven');
  useEffect(() => { void songEngine().then(setEngineOn); }, []);
  const singer: SongEngine = looksAfrikaans(lyrics ?? '') ? 'eleven' : engineOn;
  /* Whether anybody is going to sing on this.
 
     `splitSections` is what the engine call uses, so asking it here is asking
     the same question the request will ask rather than a second guess at it —
     a box holding only blank lines or only [Chorus] markers has no words in
     it, and looks full. */
  const wordless = splitSections(lyrics).length === 0;
  const watching = Boolean(pairGate?.watching);
  /* Updater form throughout: the wand, the lyric helper and the copilot
     answer seconds after they are asked, and a spread of the canvas as it
     was then put back whatever had been typed in the meantime. */
  const setTitle = (value: string) => { if (!watching) setCanvas((was) => ({ ...was, title: value })); };
  const setLyrics = (value: string) => { if (!watching) setCanvas((was) => ({ ...was, lyrics: value })); };

  /* ── What can be put in this room from somewhere else ────────────────
 
     The owner, 11 September 2026: "the text and shots, and scripts don't carry
     over to the next room… It is supposed to copy and paste the information
     to the next page."
 
     Two of the advert desk's eight recommendations are songs — "a song,
     over one photograph" and "a jingle" — and both opened this room
     completely empty. Not because the hand-off forgot them: because there
     was nothing here to hand anything to. Every other room registers what
     it can be asked to do; the song form never did, so `adformats.ts` had
     no operation to name and left the field blank, which read like a
     decision and was a gap.
 
     The song canvas is the studio's state rather than this component's,
     which is why the copilot could already write to it through the page.
     That path is a different one — whole actions, not room operations —
     and it cannot be reached from another room. This can. */
  /* Both cards open and the page goes to the first of them. A room opens
     folded, so words written into a shut card are words nobody can see —
     which is what the advert desk's hand-off looked like. `lib/arrival.ts`
     has the whole of it, including why only the first one scrolls. */
  const wordsCard = useOpenCard();
  const soundCard = useOpenCard();
  /* A value handed in scrolls to where it landed. Nothing is folded any
     more, so there is nothing to open first — the words are always under
     the box. */
  const landedInMake = (card: { arrived: () => void }): void => {
    card.arrived();
  };
  useCopilotOps('make', {
    /* ── Start again, and mean it ─────────────────────────────────────

       The owner, 21 September 2026: *"Copilot en daardie kamer moet 'n reset
       hê om die kamer skoon te maak en van vooraf te prompt."*

       The copilot's button clears the conversation; this clears what the
       conversation put on the canvas. Both halves or neither: a copilot
       that has forgotten, sitting over a canvas that has not, is more
       confusing than either state on its own — you type a new idea and
       the room answers with the old one.

       Every field, including the two the room opens with. A reset that
       leaves the feeling behind is a reset that quietly steers the next
       song, which is the opposite of starting again. */
    reset: () => {
      setCanvas({ title: '', lyrics: '', style: '', feeling: null, about: '' });
    },
    /* Updater form, not the spread of a captured object: these three
       arrive in a row, and each has to see the one before it. */
    set_song_title: (value) => {
      setCanvas((was) => ({ ...was, title: value.trim() }));
      landedInMake(wordsCard);
    },
    set_words: (value) => {
      setCanvas((was) => ({ ...was, lyrics: value }));
      landedInMake(wordsCard);
    },
    /* ── The song arrives a section at a time ─────────────────────────

       The owner, 21 September 2026: *"It must work verse for verse, and
       before every new verse are written, ask questions and explain what
       this part in a song is usually for. It must not generate everything
       at once."*

       Appending rather than replacing is what makes that possible without
       the model keeping its own copy of the song. `set_words` sends the
       whole sheet, so a second section through that door has to carry the
       first one back with it — and anything she changed by hand in
       between is gone, overwritten by the model's memory of what it
       wrote. Here the canvas is the only copy and the new section lands
       under whatever is in it.

       Blank is dropped rather than appended: a model that answers with
       nothing should not push the words card open and claim it did
       something. */
    add_section: (value) => {
      const part = value.trim();
      if (!part) return;
      setCanvas((was) => ({
        ...was,
        lyrics: was.lyrics.trim() ? `${was.lyrics.trimEnd()}\n\n${part}` : part,
      }));
      landedInMake(wordsCard);
    },
    set_sound: (value) => {
      setCanvas((was) => ({ ...was, style: value.trim() }));
      landedInMake(soundCard);
    },
    /* ── The feeling, asked for rather than picked ────────────────────

       The owner, 19 September 2026: *"Die emosie goed voel ek moes als deel
       wees van copilot. Die hele room is baie besig."*

       She is right, and the shape she is describing is the one her own
       brief asked for — the copilot must *guide* somebody through writing
       a song. What shipped instead was a row of eight chips and a text
       box bolted onto the top of a room that already had too much in it.
       A chip row is not guidance. It is one more thing to look at before
       you have been asked a single question.

       So the two answers still land on the canvas — they have to, because
       the canvas is what travels back to the copilot and what narrows the
       fifty starting points — but they get there from a conversation.
       Nothing new is on the screen; something was taken off it. */
    set_feeling: (value) => {
      const want = value.trim().toLowerCase();
      const found = MOODS.find((one) => one.id === want);
      /* An unknown feeling is dropped rather than guessed at. The eight are
         the eight the shelves below are cut by, so a ninth would narrow the
         starting points to nothing and look like a broken room. */
      if (found) setCanvas((was) => ({ ...was, feeling: found.id }));
    },
    set_about: (value) => {
      setCanvas((was) => ({ ...was, about: value.trim() }));
    },
    /* ── How long, asked for in words ─────────────────────────────────

       The owner, 19 September 2026: the copilot's opening must say *"jy kan
       alles deur my doen in hierdie kamer, sê net wat jy nodig het, die
       tema, die tyd, die styl, jou stem keuse."*

       Three of those four already had somewhere to land. The length did
       not, and a sentence promising something with no operation behind it
       is the exact fault this app has shipped twice — a control that is
       reachable, correct, and unable to do the job. So the promise and the
       operation go in together, and `check:ops` holds them together.

       Snapped to a choice the room actually offers rather than passed
       through: the engine takes a number, the price list does not, and a
       47-second song would be charged against a row that does not exist. */
    set_length: (value) => {
      const want = Number.parseInt(value.trim(), 10);
      if (!Number.isFinite(want)) return;
      const near = LENGTH_CHOICES.reduce((best, one) =>
        Math.abs(one.seconds - want) < Math.abs(best.seconds - want) ? one : best);
      setSeconds(near.seconds);
    },
  });

  /**
   * The wand: one press that fills a card in.
   *
   * `docs/PACKAGING.md` §2 has had a ✨ on every card header since the shape
   * was drawn off the owner's screenshots — "collapse, and fill it in" — and
   * `Card` has had the slot since it was written. Nothing ever filled it.
   *
   * ── Why it is not the panel underneath, with fewer presses ───────────
   *
   * `LyricHelp` already asks the same route and comes back with four options
   * to choose between, which is the right shape when somebody is deciding.
   * The wand is for when they are not: an empty box, no idea, and a person
   * who will close the app rather than read four suggestions. So it takes the
   * first option and puts it in the box. Anything else is one more decision
   * at the exact moment somebody has run out of them.
   *
   * ── Added, never replaced ────────────────────────────────────────────
   *
   * The words are appended to whatever is written. A wand that overwrote a
   * verse somebody had typed would be pressed exactly once, by everybody,
   * and never again.
   *
   * ── And it is not offered where it cannot work ───────────────────────
   *
   * The panel below degrades honestly, falling back to local suggestions
   * labelled as not-AI. A wand cannot degrade: it is one press that either
   * fills the card or does nothing. So it is on the screen only where the
   * route says there is a model behind it.
   */
  const [wandReady, setWandReady] = useState(false);
  const [wanding, setWanding] = useState<'words' | 'style' | null>(null);
  const [wandProblem, setWandProblem] = useState('');

  useEffect(() => {
    let live = true;
    void fetch('/api/songwriter')
      .then((response) => (response.ok ? response.json() : null))
      .then((said) => {
        if (live && said && typeof said.available === 'boolean') setWandReady(said.available);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const wave = async (what: 'words' | 'style') => {
    setWandProblem('');
    setWanding(what);
    try {
      const response = await fetch('/api/songwriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: what === 'words' ? 'continue' : 'style',
          title: canvas.title,
          style: canvas.style,
          lyrics: canvas.lyrics,
        }),
      });
      const answer = (await response.json().catch(() => null)) as
        | { suggestions?: Array<{ text?: string }>; error?: string; detail?: string; message?: string }
        | null;
      const first = answer?.suggestions?.[0]?.text?.trim();
      if (!response.ok || !first) {
        setWandProblem(
          refusalText(answer, lang, t('wand.failed', 'That did not come back. The panel under the box still works.')),
        );
        return;
      }
      if (what === 'words') {
        setCanvas((was) => {
          const now = was.lyrics.trimEnd();
          return { ...was, lyrics: now ? `${now}\n\n${first}` : first };
        });
      } else {
        setCanvas((was) => {
          const now = was.style.trim();
          return { ...was, style: now ? `${now}, ${first}` : first };
        });
      }
    } catch {
      setWandProblem(t('wand.offline', 'Could not reach the app’s server.'));
    } finally {
      setWanding(null);
    }
  };
  /* ── Easy, or extensive ───────────────────────────────────────────────

     The owner, 15 October 2026, with ElevenLabs' music box beside it: *"Ek dink
     ons moet in make a song, die simple en everything wegvat en net so box
     rondom copilot bou wat alles in het, selfs 'n button wat uit pop om die
     weirdness te verstel. Daar kan dan ook bo in daai raam wees 'n easy en
     extensive, waar easy dan vinnig woorde prompt, en extensive die liedjie
     meer intensioneel vers vir vers prompt."*

     So there is no second desk any more. Every control lives in the one box,
     as a small button along its foot that pops its control out above it —
     the length, the feel, the voice, a sound of your own — and each button
     says what it is set to, so nothing applies out of sight. The top of the
     box chooses how the words get written: Easy is the copilot, Extensive is
     the verse-by-verse writer that says what each part of a song is for.

     Remembered, because somebody who writes verse by verse does it every
     time. */
  const [way, setWay] = useState<'easy' | 'extensive'>('easy');
  /** Which of the box's small buttons has its control popped out. */
  const [pop, setPop] = useState<Pop | null>(null);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(WAY_KEY) === 'extensive') setWay('extensive');
    } catch {
      // Storage off. Easy is the right answer when nothing is known.
    }
  }, []);
  const chooseWay = useCallback((next: 'easy' | 'extensive') => {
    setWay(next);
    setPop(null);
    try {
      window.localStorage.setItem(WAY_KEY, next);
    } catch {
      // It still applies for this visit.
    }
  }, []);
  const box = useRef<HTMLDivElement | null>(null);
  useBackLayer(pop !== null, () => setPop(null));
  useEffect(() => {
    if (!pop) return undefined;
    const away = (event: PointerEvent): void => {
      if (box.current && !box.current.contains(event.target as Node)) setPop(null);
    };
    const key = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setPop(null);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [pop]);

  const [bpm, setBpm] = useState(112);
  const [songKey, setSongKey] = useState('A Minor');
  const [seconds, setSeconds] = useState(60);
  const [weirdness, setWeirdness] = useState(15);
  /* Light to heavy, the owner 14 October 2026: "sliders by everything in make a
     song. Light heavy, en weirdness level." 50 is neither, and adds nothing. */
  const [weight, setWeight] = useState(50);
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
  /**
   * Which language it should be sung in.
   *
   * Nothing was ever telling the engine, so Afrikaans words came back sung as
   * though they were English often enough to be the first thing the owner noticed
   * about a song in her own language. `auto` is the old behaviour and stays on
   * the menu, because a lyric that mixes the two is a real thing and asking
   * for one of them would be wrong.
   */
  const [singIn, setSingIn] = useState<SingIn>('auto');
  /* Followed until somebody chooses for themselves, and then left alone. The
     guess is a default, not a correction, and a control that keeps overruling
     what you set is worse than no control. */
  const [singInChosen, setSingInChosen] = useState(false);
  /** Which shelf of the fifty a photograph pointed at, if one did. */
  const [fromPhoto, setFromPhoto] = useState<Mood | null>(null);
  /** Which track a vocal is being recorded over, if any. */
  const [takeFor, setTakeFor] = useState<{ track: Track; music: Blob; take?: Blob | null } | null>(null);

  /* The guess follows the words while nobody has said otherwise. */
  const singWanted: SingIn = singInChosen ? singIn : looksAfrikaans(lyrics) ? 'af' : 'auto';
  /* Light to heavy in words, for the slider's badge and the box's button. */
  const weightLabel = weight <= 20
    ? t('make.weightVeryLight', 'Very light')
    : weight <= 40
      ? t('make.light', 'Light')
      : weight < 60
        ? t('make.weightMiddle', 'In between')
        : weight < 80
          ? t('make.heavy', 'Heavy')
          : t('make.weightVeryHeavy', 'Very heavy');
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
  /* ── The one refusal with a way out of it ──────────────────────────────
 
     The owner, 9 October 2026: *"'n mens kan vir gemini vra dat jy 'n liedjie
     soek wat baie klink soos michael jackson se liedjie beat it"*, and then
     the sentence that made it buildable — *"dit kry dit net mooi reg om die
     80's se styl in baie nader aan daardie formaat te genereer."*
 
     Naming an artist to describe a SOUND is refused, and the refusal tells
     somebody to say the tempo, the instruments, the era and the mood
     themselves. Most people cannot. This is the offer to do it for them,
     and it is drawn ONLY when the refusal says so — `sayItInstead` is set
     on that one rule and never on the voice rule, which must not have a way
     round it. See `lib/moderation.ts` and `check:anderwoorde`. */
  const [canSayIt, setCanSayIt] = useState(false);
  const [saying, setSaying] = useState(false);
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
  /* Which card is showing its sleeve.

     The cover used to appear only while a song was playing, which meant the
     one way to find it was to press play and look — so most people never did,
     and a song nobody made a cover for is a row in a list rather than a
     record. The button below opens it without playing anything. */
  const [sleeveFor, setSleeveFor] = useState<string | null>(null);
  /* ── A cover as standard, with the song ────────────────────────────────
 
     The owner, 9 October 2026: *"Plus generate dit dan standaard 'n album cover
     saam met die liedjie."*
 
     Ticked by default, which is what "standaard" means — and a tick rather
     than an automatic charge, which is the other half of a rule she set on
     30 September: *"Te veel aankoop punte gaan mense afsit."* The price is
     on the make button beside the song's, so nothing is a surprise and one
     press still makes both.
 
     Remembered per device rather than per account: it is a preference about
     how somebody works, not a thing worth a row in a table, and a browser
     that will not keep it simply starts ticked again. */
  const [wantCover, setWantCover] = useState(true);
  useEffect(() => {
    try {
      const said = window.localStorage.getItem('futurebox.cover.with.song');
      if (said === 'no') setWantCover(false);
    } catch {
      /* A private window. Ticked is the right default anyway. */
    }
  }, []);
  /** The song just made, for which the cover should be drawn without asking. */
  const [coverFor, setCoverFor] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  // Making a video is the same job here as on its own tab, so it is the same
  // component. This screen only decides which track it is pointed at.
  const [videoFor, setVideoFor] = useState<Track | null>(null);
  /** Where the video panel is drawn, so opening it can bring it into view. */
  const videoPanel = useRef<HTMLDivElement | null>(null);

  /* Reading only: it moves the view, it writes nothing and it spends
     nothing. `smooth` so it reads as the page moving rather than jumping,
     and `center` rather than `start` because the panel is shorter than a
     screen and a panel pinned to the top edge looks like a page that has
     lost its header. */
  useEffect(() => {
    if (!videoFor) return;
    videoPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [videoFor]);
  /** What has been paid for. Refreshed after a payment returns. */
  const [owned, setOwned] = useState<Owned>(NOTHING);
  useEffect(() => {
    loadOwned().then(setOwned);
  }, []);

  /** What the music engine is told. Free text from the copilot wins over the
   *  preset chips, because it is the more specific thing the person asked for. */
  /**
   * What the engine is actually told.
   *
   * The written field leads, because it is the specific thing this person
   * asked for. The voice direction follows, and then the language. Order
   * matters: the model weights early styles more heavily, which is exactly
   * why the generic production words that used to be appended here were doing
   * harm — they were four more things competing with the two that mattered.
   */
  /**
   * Turn what they typed into a style the engine can make.
   *
   * Replaces the style field with what comes back, and says what was swapped
   * for what — not a silent correction. Somebody who asked for a sound
   * should see what the sound turned out to be, because the next thing they
   * do is edit it.
   */
  const sayItAsASound = async (): Promise<void> => {
    const asked = canvas.style.trim();
    if (!asked || saying) return;
    setSaying(true);
    try {
      const token = await accessToken();
      const answer = await fetch('/api/styleword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ asked }),
      });
      const said = (await answer.json().catch(() => ({}))) as {
        style?: string; tempo?: string; says?: string; message?: string;
      };
      if (!answer.ok || !said.style) {
        /* Their sentence where there is one: it says whether it was refused,
           whether the allowance is out, or whether it simply could not be
           described without naming them. */
        setStatus(said.message ?? t('make.sayItFailed', 'That could not be put another way.'));
        return;
      }
      setCanvas((was) => ({ ...was, style: said.style as string }));
      setCanSayIt(false);
      setStatus(said.says
        ?? t('make.sayItDone', 'Swapped the name for the sound. Have a look, then make it.'));
    } catch {
      setStatus(t('make.sayItOffline', 'That could not be sent. Check the connection and try again.'));
    } finally {
      setSaying(false);
    }
  };

  const styleText = (() => {
    const written = canvas.style.trim();
    const parts = written ? written.split(',').map((p) => p.trim()).filter(Boolean) : [];
    /* Before the padding, so a style with seven words of its own does not
       crowd out the one direction that decides what language it comes back
       in. There is no language parameter in the Music API; this is the same
       kind of ask as everything else in this list. */
    singDirection(singWanted).forEach((word) => {
      if (parts.indexOf(word) === -1) parts.push(word);
    });
    /* Neither engine takes a number for these. ElevenLabs reads the style
       list and Lyria reads the prompt, so a slider becomes the words a
       producer would use for that much of it — and the further it is moved,
       the stronger the words. */
    weightWords(weight).forEach((word) => { if (parts.indexOf(word) === -1) parts.push(word); });
    weirdWords(weirdness).forEach((word) => { if (parts.indexOf(word) === -1) parts.push(word); });
    /* The four generic production words that used to go on every request are
       gone. They said nothing about how a song should sound — "balanced mix",
       "dynamic performance" — and together with the server's own padding they
       outnumbered the person's actual style three to one. What decides the
       sound is what they wrote, the voice, and the language. */
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

  /* ── In my own voice ────────────────────────────────────────────────
     The owner, 14 October 2026: "Ek sien ook nie in make a song, use my own
     voice (wat kits se trained voice is nie)." It was there, as "Sing it in
     my voice" on each song in the list further down — out of sight on
     Simple. So it is a choice on the form too: ticked, the panel that sings
     the new song in a trained voice opens by itself the moment the song is
     made, and it sits on the newest song at the top as well. Shown only
     when the singing engine is switched on for this app. */
  const [canSingMine, setCanSingMine] = useState(false);
  useEffect(() => {
    let alive = true;
    void singingState().then((said) => { if (alive) setCanSingMine(Boolean(said.configured)); });
    return () => { alive = false; };
  }, []);
  const [mineAfter, setMineAfter] = useState(false);
  const [justMade, setJustMade] = useState<string | null>(null);


  const make = useCallback(
    async (remixOf?: Track) => {
      const gate = check('publish.release', userPlan);
      if (!gate.allowed) {
        setStatus(gate.reason);
        return;
      }
      /* Two people making it together: not until both said yes. The copilot
         can press this too, so the rule is here and not only on the button. */
      if (pairGate && !pairGate.ready) {
        setStatus(pairGate.why);
        return;
      }
      /* Never "Untitled". A name read off the first line of the words, or
         the style, before a sentence in the reader's language — see
         `lib/songtitle.ts` and `check:titled`. */
      const name = (remixOf ? `${remixOf.title} ${t('make.takeSuffix')}` : title).trim()
        || titleFromWords(lyrics, canvas.style)
        || t('make.noName', 'A song from today');
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
        /** What the engine says it sang, where the room had no words of its own. */
        let sungBack = '';
        let sungAt: Track['sungAt'];
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
            instrumental: singItYourself,
            finetuneId: ownSound || undefined,
            pair: pairGate?.id,
            onStage: setStage,
          });
          if (pairGate) onPairMade?.();
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
          /* ── The words it actually sang ──────────────────────────────
 
             Kept only when the room has none of its own. Somebody who wrote
             their lyrics here has the real ones already, and overwriting
             them with the engine's reading of them would be the app
             correcting her. This fills the gap where there was nothing —
             a song asked for by prompt, which until now came back with its
             words and dropped them. */
          if (result.sung && !lyrics.trim()) sungBack = result.sung;
          /* When the engine said each section starts — kept whoever wrote the
             words, because it is about the recording, not the sheet. The
             timing ladder matches it to the lines (`lib/lyrictime.ts`). */
          if (result.sungAt?.length) sungAt = result.sungAt;
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
          /* The words the engine sang, when the room had none of its own.
             Every song made by prompt since 8 October came back with these
             and dropped them — see `lib/sungwords.ts`. They go on the track
             itself so the release carries them, the sleeve can read them,
             and a lyric video has something to put on the screen. */
          lyrics: lyrics.trim() || sungBack,
          ...(sungAt ? { sungAt } : {}),
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
          /* Made by two people: both named as the artist, not only whoever
             pressed the button. */
          ...(pairGate?.credit ? { by: pairGate.credit, pair: pairGate.id } : {}),
        };

        const next = [track, ...tracks];
        setTracks(next);
        saveTracks(next);
        setJustMade(track.id);
        /* Remembered against the account, not just this browser.

           The genre is the one thing about a song that says something about
           the person who made it rather than about the song, which is why it
           is this and not the title or the words. A count, and nothing about
           when — see `supabase/taste.sql`. */
        noteTaste('genre', track.genre);
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
        /* The panel, open, with the new song in it. `coverFor` is what tells
           it to draw without being asked — see `Sleeve.startNow`, which only
           acts once and only when the song has no cover already. */
        if (wantCover) {
          setCoverFor(track.id);
          setSleeveFor(track.id);
        }
      } catch (error) {
        // The reason travels all the way here and used to be dropped on the
        // floor: `catch {}` without binding it, then a generic line. The music
        // route answers with something specific — out of credits, key rejected,
        // request too long — and that is the only thing that tells anyone what
        // to do next.
        const reason = error instanceof Error ? error.message.trim() : '';
        setStatus(reason || t('make.failed'));
        setCanSayIt(error instanceof Refused && error.sayItInstead);
      } finally {
        setBusy(false);
        setStage(null);
      }
    },
    [bpm, canvas.style, lyrics, onMade, onPairMade, ownSound, pairGate, seconds, singItYourself, songKey, sounds.mine, styleText, t, title, tracks, userPlan, wantCover],
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
      /* With its sleeve — see `lib/songfile.ts`. */
      if (blob) await saveSong(track, blob, await accessToken());
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
          onUpgrade={onUpgrade}
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

      {/* ── Sleek Top Recent Track / Quick Player Banner ──────────────────────
          Mobile priority: In 390px phone view, users should never have to
          scroll past 10 cards to hear their newest creation or see player state.
          This docked card gives immediate playback & jump-to-channel controls. */}
      {/* Not in a room shared with somebody: this is YOUR newest song from
          your own channel, and a shared room is about the song the two of
          you are writing (the owner, 21 October 2026: "Hierdie moet nie in
          die colab room wees nie"). */}
      {tracks.length > 0 && !pairGate && (() => {
        /* First is fine here: the list is newest first, and this card is
           "the song playing, or else your newest" — falling back to the
           newest is what it is for, not a wrong row. */
        const activeTrack = (playing ? tracks.find((t) => t.id === playing) : null) ?? tracks[0];
        const isPlayingThis = playing === activeTrack.id;
        return (
          <div
            data-top-mini-player
            className="space-y-3 rounded-2xl border border-emerald-500/30 bg-zinc-900/50 p-3 sm:p-4"
          >
            {/* Two rows, not one. The owner, 15 October 2026, a phone screenshot:
                with the song, "Verbeter Afrikaans", "Sing it in my voice" and
                the channel button on one line, the buttons took the whole
                width — the name vanished, the label lay over the play button
                and the last button ran off the screen. The song and the way
                to the channel on top; what can be done to it underneath,
                wrapping when the screen is narrow. */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void toggle(activeTrack)}
                aria-label={isPlayingThis ? t('player.pause', 'Pause track') : t('player.play', 'Play track')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 transition-all hover:bg-emerald-400 active:scale-95 shadow-md shadow-emerald-500/20"
              >
                {isPlayingThis ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                    {isPlayingThis ? t('make.playing', 'Playing now') : t('make.latestSong', 'Latest song')}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {Math.floor(activeTrack.seconds / 60)}:{String(activeTrack.seconds % 60).padStart(2, '0')}
                  </span>
                </div>
                <p className="truncate text-sm font-bold text-white leading-tight mt-0.5">
                  {activeTrack.title}
                </p>
                <p className="truncate text-xs text-zinc-400">
                  {activeTrack.genre} · {activeTrack.bpm} BPM
                </p>
              </div>
              <button
              type="button"
              onClick={() => {
                document.getElementById('made-tracks-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="shrink-0 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1"
            >
              <span>{t('make.jumpToTracks', 'Channel')}</span>
              <span className="text-zinc-400">({tracks.length})</span>
              <span>↓</span>
            </button>
            </div>

            <div data-top-mini-actions className="flex flex-wrap items-center gap-2">
            {/* An Afrikaans word sung wrong is reported from the song she is
                listening to, not only from the list further down (The owner,
                14 October 2026). */}
            <SayItWrong
              surface="music_studio"
              spoken
              said={activeTrack.title}
              alwaysShow
              variant="button"
            />
            {canSingMine && (
              <SingItMine
                track={activeTrack}
                autoOpen={mineAfter && justMade === activeTrack.id}
                onMade={(made, audio) => {
                  const next = [made, ...tracks];
                  setTracks(next);
                  saveTracks(next);
                  setJustMade(null);
                  setStatus(t('mine.kept', 'It is in your channel, in your voice.'));
                  onMade(made);
                  void cloud.pushTrack(made, audio);
                }}
              />
            )}
            </div>
          </div>
        );
      })()}

      {/* ── The song box ────────────────────────────────────────────────

          The owner, 15 October 2026: *"net so box rondom copilot bou wat alles
          in het"* — the shape of ElevenLabs' music box and of most music
          prompting engines. How the words get written along the top, the
          writing in the middle, and every setting as a small button along
          the foot that pops its control out. Under the box come the words;
          under the words, the one button. */}
      <div className="space-y-3">
        <div
          ref={box}
          data-makebox
          className="relative rounded-3xl border border-zinc-700/70 bg-zinc-900/45 shadow-[0_0_35px_rgba(16,185,129,0.06)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 p-2">
            <div role="tablist" data-makeway className="inline-flex rounded-2xl bg-zinc-950/70 p-1">
              {(['easy', 'extensive'] as const).map((one) => (
                <button
                  key={one}
                  type="button"
                  role="tab"
                  data-makewaypick={one}
                  aria-selected={way === one}
                  onClick={() => chooseWay(one)}
                  className={`min-h-[40px] rounded-xl px-3.5 text-sm font-semibold ${
                    way === one ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {one === 'easy' ? t('make.easy', 'Easy') : t('make.extensive', 'Extensive')}
                </button>
              ))}
            </div>
            <Hint>
              {t(
                'make.wayWhy',
                'Easy: tell the copilot what you want in a few words and it writes the song. Extensive: write it verse by verse, with what each part of a song is for. The buttons along the bottom of the box set the length, the feel and the voice.',
              )}
            </Hint>
          </div>

          {way === 'easy' ? (
            <div data-makecopilot className="min-h-[120px]">
              {copilot ?? (
                <p className="p-4 text-sm text-zinc-500">
                  {t('make.simpleEmpty', 'Nothing written yet. Tell the copilot below what you want, and it lands here.')}
                </p>
              )}
            </div>
          ) : (
            <div
              data-makeverses
              aria-disabled={watching || undefined}
              className={`p-3 ${watching ? 'pointer-events-none opacity-60' : ''}`}
            >
              <VerseWriter
                lyrics={lyrics}
                onLyricsChange={setLyrics}
                songTitle={title}
                about={canvas.about || ''}
                style={canvas.style}
              />
            </div>
          )}

          {/* ── The foot of the box ─────────────────────────────────────
              Each button names what it is set to, so a setting is never in
              force out of sight — the rule the old Simple switch kept with a
              sentence, kept here by the buttons themselves. */}
          <div data-maketools className="relative flex flex-wrap items-center gap-1.5 border-t border-zinc-800 p-2">
            {pop && (
              <div className="absolute inset-x-0 bottom-full z-30 mb-2" data-makepop={pop}>
                {pop === 'plus' ? (
                  <StartPicker
                    currentStyle={canvas.style}
                    openAt={canvas.feeling ?? fromPhoto}
                    onClose={() => setPop(null)}
                    onStart={({ title: name, words, style, bpm: beat }) => {
                      setBpm(beat);
                      /* One write: two setCanvas calls built from the same
                         captured object put the first one's change back. */
                      setCanvas((was) => ({ ...was, title: name, lyrics: words, style }));
                      setPop(null);
                      wordsCard.arrived();
                    }}
                    onStyle={(snippet) => {
                      setCanvas((was) => {
                        const now = was.style.trim();
                        return { ...was, style: now ? `${now}, ${snippet}` : snippet };
                      });
                      setPop(null);
                    }}
                    finder={
                      <StyleFinder
                        style={canvas.style}
                        title={title}
                        lyrics={lyrics}
                        onBpm={setBpm}
                        onStyle={(next, how) => {
                          setCanvas((was) => {
                            const current = was.style.trim();
                            return { ...was, style: how === 'append' && current ? `${current}, ${next}` : next };
                          });
                        }}
                      />
                    }
                    upload={
                      <>
                        <StyleFrom
                          onWords={(words) => {
                            setCanvas((was) => {
                              const current = was.style.trim();
                              const fresh = words.filter((word) => !current.toLowerCase().includes(word.toLowerCase()));
                              if (!fresh.length) return was;
                              return { ...was, style: current ? `${current}, ${fresh.join(', ')}` : fresh.join(', ') };
                            });
                          }}
                          onMood={(mood) => setFromPhoto(mood as typeof fromPhoto)}
                          onSong={({ title: name, style, lyrics: words }) => {
                            setCanvas((was) => ({
                              ...was,
                              title: name || was.title,
                              style: style || was.style,
                              lyrics: words,
                            }));
                          }}
                        />
                        <PromptCards
                          onSong={({ title: name, style, lyrics: words }) => {
                            setCanvas((was) => ({
                              ...was,
                              title: name || was.title,
                              style: style || was.style,
                              lyrics: words,
                            }));
                          }}
                        />
                      </>
                    }
                  />
                ) : (
                  <div className="max-h-[min(60vh,520px)] space-y-3 overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 p-3.5 shadow-2xl">
                    {pop === 'length' && (
                      <div>
                        <p className="text-sm font-semibold text-zinc-200">{t('make.length')}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {LENGTH_CHOICES.map((choice) => (
                            <button
                              key={choice.seconds}
                              type="button"
                              data-makelength={choice.seconds}
                              onClick={() => { setSeconds(choice.seconds); setPop(null); }}
                              className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-left transition-all ${
                                seconds === choice.seconds
                                  ? 'border-emerald-500 bg-emerald-500/15'
                                  : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600'
                              }`}
                            >
                              {/* The lengths live in `data/sound.ts`, which has no
                                  language of its own; the dictionary carries the
                                  Afrikaans. */}
                              <span className={`block text-sm font-semibold ${seconds === choice.seconds ? 'text-emerald-300' : 'text-zinc-200'}`}>
                                {t(`len.${choice.seconds}`, choice.label)}
                              </span>
                              <span className="block text-sm leading-snug text-zinc-500">
                                {t(`len.${choice.seconds}.n`, choice.note)}
                              </span>
                              <span className="block pt-0.5 text-xs text-zinc-500">
                                {songCost(choice.seconds, singer)} {t('video.credits', 'credits')}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {pop === 'feel' && (
                      <>
                        <div className="space-y-2" data-makeweight>
                          <div className="flex items-center justify-between">
                            <label htmlFor="make-weight" className="flex items-center gap-2 text-sm font-bold text-zinc-200">
                              <Sliders className="h-4 w-4 text-emerald-400" />
                              <span>{t('make.lightHeavy', 'Light or heavy')}</span>
                            </label>
                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
                              {weightLabel}
                            </span>
                          </div>
                          <input
                            id="make-weight"
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={weight}
                            data-makeweightslide
                            onChange={(e) => setWeight(Number(e.target.value))}
                            className="h-11 w-full cursor-pointer touch-manipulation accent-emerald-500"
                          />
                          <p className="text-[11px] leading-snug text-zinc-500">
                            {t('make.lightHeavyWhy', 'Light is airy and soft; heavy is dense, loud and hard-hitting. The music engine reads it as words added to the style.')}
                          </p>
                        </div>
                        <div className="space-y-2 border-t border-zinc-800 pt-3">
                          <div className="flex items-center justify-between">
                            <label htmlFor="make-weirdness" className="flex items-center gap-2 text-sm font-bold text-zinc-200">
                              <Sliders className="h-4 w-4 text-emerald-400" />
                              <span>{t('make.weirdness', 'Weirdness')}</span>
                            </label>
                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
                              {weirdness <= 30
                                ? t('make.weirdnessLow', 'Conventional & Clean')
                                : weirdness <= 69
                                  ? t('make.weirdnessMid', 'Creative & Eclectic')
                                  : t('make.weirdnessHigh', 'Avant-garde & Wild')}{' '}
                              ({weirdness}%)
                            </span>
                          </div>
                          <input
                            id="make-weirdness"
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={weirdness}
                            onChange={(e) => setWeirdness(Number(e.target.value))}
                            className="h-11 w-full cursor-pointer touch-manipulation accent-emerald-500"
                          />
                          <p className="text-[11px] leading-snug text-zinc-500">
                            {t('make.weirdnessWhy', 'Controls how unconventional the sound design, chords and instrumental textures will be.')}
                          </p>
                        </div>
                      </>
                    )}

                    {pop === 'voice' && (
                      <>
                        {/* What language to sing it in. "Asked for" is the honest
                            verb: there is no language parameter in the Music API,
                            so this goes into the style directions. */}
                        {!wordless && !singItYourself && (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-zinc-200">{t('make.singIn', 'Sung in')}</p>
                            <div className="flex flex-wrap gap-2">
                              {(['af', 'en', 'auto'] as const).map((one) => (
                                <button
                                  key={one}
                                  type="button"
                                  onClick={() => {
                                    setSingIn(one);
                                    setSingInChosen(true);
                                  }}
                                  className={`min-h-[44px] rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors ${
                                    singWanted === one
                                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                                      : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600'
                                  }`}
                                >
                                  {one === 'af'
                                    ? t('make.singAf', 'Afrikaans')
                                    : one === 'en'
                                      ? t('make.singEn', 'English')
                                      : t('make.singAuto', 'Let it decide')}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Sing it yourself. ElevenLabs cannot be handed your voice
                            — the Music API takes no voice at all — so the honest
                            route is a backing track and a real recording. */}
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5">
                          <input
                            type="checkbox"
                            checked={singItYourself}
                            onChange={(event) => setSingItYourself(event.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-zinc-200">{t('make.singSelf')}</span>
                            <span className="block text-sm leading-snug text-zinc-500">{t('make.singSelfNote')}</span>
                          </span>
                        </label>
                      </>
                    )}

                    {/* ── A sound of your own ─────────────────────────────
                        ElevenLabs' "Finetune" button, in this app's words. Always
                        offered, and what it says depends on where you are — the
                        plan does not include it, none trained yet, one still
                        training, or here they are. */}
                    {pop === 'sound' && (
                      <div className="space-y-2">
                        <label className="flex cursor-pointer items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={useOwnSound}
                            disabled={readySounds.length === 0}
                            onChange={(event) => toggleOwnSound(event.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500 disabled:opacity-40"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-zinc-200">
                              {t('make.useOwnSound', 'Make it in a sound of my own')}
                            </span>
                            <span className="block text-sm leading-snug text-zinc-500">{t('make.ownSoundNote')}</span>
                          </span>
                        </label>

                        {useOwnSound && readySounds.length > 1 && (
                          <div className="grid gap-2 pt-0.5 sm:grid-cols-3">
                            {readySounds.map((one) => (
                              <button
                                key={one.id}
                                type="button"
                                onClick={() => setOwnSound(one.id)}
                                className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-left transition-all ${
                                  ownSound === one.id
                                    ? 'border-emerald-500 bg-emerald-500/15'
                                    : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600'
                                }`}
                              >
                                <span className={`block text-sm font-semibold ${ownSound === one.id ? 'text-emerald-300' : 'text-zinc-200'}`}>
                                  {one.name}
                                </span>
                                <span className="block pt-0.5 text-sm leading-snug text-zinc-500">
                                  {one.genre} · {one.tracks} {t('make.ownSoundSongs', 'of your songs')}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {useOwnSound && readySounds.length === 1 && (
                          <p className="pl-6 text-sm leading-snug text-emerald-300/90">
                            {readySounds[0].name} — {readySounds[0].genre} · {readySounds[0].tracks}{' '}
                            {t('make.ownSoundSongs', 'of your songs')}
                          </p>
                        )}

                        {readySounds.length === 0 && (
                          <div className="space-y-1.5 pl-6">
                            {sounds.keep === 0 ? (
                              <>
                                <Note>{t('make.ownSoundNoPlan')}</Note>
                                <button
                                  type="button"
                                  onClick={onUpgrade}
                                  className="text-sm font-semibold text-emerald-400 hover:text-emerald-300"
                                >
                                  {t('make.ownSoundSeePlans', 'See the plans')}
                                </button>
                              </>
                            ) : stillTraining.length > 0 ? (
                              <p className="flex items-center gap-1.5 text-sm leading-snug text-amber-300/90">
                                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                                {t('make.ownSoundTraining')}
                              </p>
                            ) : (
                              <>
                                <Note>{t('make.ownSoundNone')}</Note>
                                {/* Into the room that does it, not the Channel. */}
                                <button
                                  type="button"
                                  onClick={onGoToSound}
                                  className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-300 hover:border-emerald-500"
                                >
                                  <Sparkles className="h-4 w-4" />
                                  {t('make.ownSoundTrain', 'Train one now')}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {pop === 'more' && (
                      <div className="grid gap-4">
                        <div>
                          {/* Tied to the slider, so it reads out as a speed and
                              not as a bare number. */}
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
                            className="mt-2 w-full accent-emerald-500"
                          />
                          <p className="text-sm text-zinc-600">{bpm < 95 ? t('make.slow') : bpm < 125 ? t('make.steady') : t('make.fast')}</p>
                        </div>
                        {/* The mood list that was here is gone: Feel already sets how
                            the song feels, and two places to choose a mood was one
                            too many (The owner, 18 October 2026). The key still rides
                            along — from Feel, the copilot, or a remix. */}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              data-makeplus
              aria-label={t('pick.title', 'Somewhere to start')}
              aria-expanded={pop === 'plus'}
              onClick={() => setPop((was) => (was === 'plus' ? null : 'plus'))}
              /* A solid disc, like every round button here: an outlined
                 plus in pale ink vanished into the box on the light theme
                 (check:playbutton measured 1.01:1). */
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-onAccent hover:bg-emerald-400 ${
                pop === 'plus' ? 'ring-2 ring-emerald-300 ring-offset-2 ring-offset-zinc-900' : ''
              }`}
            >
              <Plus className="h-5 w-5" />
            </button>
            {([
              ['length', Clock, `${t(`len.${seconds}`, LENGTH_CHOICES.find((one) => one.seconds === seconds)?.label ?? `${seconds}s`)}`],
              ['feel', Sliders, weight !== 50 || weirdness !== 15 ? `${weightLabel} · ${weirdness}%` : t('make.feel', 'Feel')],
              ['voice', Mic, singItYourself
                ? t('make.singSelfShort', 'No singer')
                : singWanted === 'af'
                  ? t('make.singAf', 'Afrikaans')
                  : singWanted === 'en'
                    ? t('make.singEn', 'English')
                    : t('make.voiceAuto', 'Voice')],
              ['sound', AudioLines, useOwnSound
                ? (readySounds.find((one) => one.id === ownSound)?.name ?? t('make.useOwnSound', 'Make it in a sound of my own'))
                : t('make.noOwnSound', 'No sound of my own')],
              ['more', SlidersHorizontal, bpm !== 112 || songKey !== 'A Minor' ? `${bpm} ${t('make.bpm')}` : t('make.more', 'More')],
            ] as const).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                data-maketool={id}
                aria-expanded={pop === id}
                onClick={() => setPop((was) => (was === id ? null : id))}
                className={`flex min-h-[40px] max-w-[11rem] items-center gap-1.5 rounded-xl px-2.5 text-sm ${
                  pop === id ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-800/60'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="truncate">{label}</span>
              </button>
            ))}
            <span
              data-makecost
              className="ml-auto flex min-h-[36px] items-center gap-1.5 rounded-full bg-zinc-950/70 px-3 text-xs font-semibold text-zinc-300"
            >
              {songCost(seconds, singer)} {t('video.credits', 'credits')}
            </span>
          </div>
        </div>

        {/* ── What it wrote, under the box ──────────────────────────────
            "Dan onder daardie boks kom die woorde uit." Open, never folded:
            what the copilot wrote is what the button sends, and a canvas
            somebody cannot see is a canvas they cannot correct. */}
        <div ref={wordsCard.mine} data-makewords className="scroll-mt-4 space-y-3 rounded-3xl border border-zinc-800 bg-zinc-950/30 p-4">
          <div>
            <label htmlFor="song-name" className="text-sm font-semibold text-zinc-300">
              {t('make.name')}
            </label>
            <input
              id="song-name"
              value={title}
              readOnly={watching}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('make.namePlaceholder')}
              className="mt-1.5 w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-base text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-300">{t('make.words')}</span>
              {wandReady && !watching && (
                <button
                  type="button"
                  aria-label={t('wand.words', 'Write the next part for me')}
                  title={t('wand.words', 'Write the next part for me')}
                  onClick={() => void wave('words')}
                  disabled={wanding !== null}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
                >
                  {wanding === 'words' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </button>
              )}
            </div>
            <span className="relative block">
              <textarea
                value={lyrics}
                readOnly={watching}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder={t('make.wordsPlaceholder')}
                rows={8}
                className="mt-1.5 w-full resize-y rounded-xl border border-zinc-800 bg-black/60 px-4 py-3 pr-11 text-base leading-relaxed text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-hidden"
              />
              {!watching && <SpeakButton onHeard={(said) => setCanvas((was) => ({ ...was, lyrics: withSaid(was.lyrics, said) }))} className="absolute bottom-2 right-2" />}
            </span>
            <p className="pt-1 text-sm text-zinc-500">
              {watching
                ? <span data-pairwatching>{t('make.pairWatching', 'Their turn — ask for the pen at the top to write.')}</span>
                : engineReady ? t('make.wordsReal') : t('make.wordsSketch')}
            </p>
            <div className="pt-2">
              <LyricHelp title={title} style={canvas.style} lyrics={lyrics} onLyrics={setLyrics} onStyle={(value) => setCanvas((was) => ({ ...was, style: value }))} />
            </div>
          </div>

          {/* The sound line. ElevenLabs Music has no genre setting and no voice
              picker, only plain-English directions, so this is open text; the
              plus in the box adds to it rather than replacing it. */}
          <div ref={soundCard.mine} className="scroll-mt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-300">{t('make.sound')}</span>
              <span className="flex items-center gap-1.5">
                {canvas.style && (
                  <button
                    type="button"
                    onClick={() => setCanvas((was) => ({ ...was, style: '' }))}
                    className="min-h-[40px] rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  >
                    {t('make.clear')}
                  </button>
                )}
                {wandReady && (
                  <button
                    type="button"
                    aria-label={t('wand.style', 'Work the style out from the words')}
                    title={t('wand.style', 'Work the style out from the words')}
                    onClick={() => void wave('style')}
                    disabled={wanding !== null}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 text-emerald-400 hover:border-emerald-500 disabled:opacity-50"
                  >
                    {wanding === 'style' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  </button>
                )}
              </span>
            </div>
            <span className="relative block">
              <textarea
                value={canvas.style}
                readOnly={watching}
                onChange={(e) => { const value = e.target.value; if (!watching) setCanvas((was) => ({ ...was, style: value })); }}
                placeholder={t('make.soundPlaceholder')}
                /* Three lines: at two, a phone cut the example through the
                   middle of its third ("…or paste something the copilot
                   wrote"), and a style worth writing is longer than that. */
                rows={3}
                className="mt-1.5 w-full resize-y rounded-xl border border-zinc-800 bg-black/60 px-4 py-3 pr-11 text-base leading-relaxed text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-hidden"
              />
              {!watching && <SpeakButton onHeard={(said) => setCanvas((was) => ({ ...was, style: withSaid(was.style, said) }))} className="absolute bottom-2 right-2" />}
            </span>
            <p className="pt-1 text-sm text-zinc-500">{t('make.soundNote')}</p>
          </div>
          {/* One line for both wands. They cannot run at once. */}
          {wandProblem && <p className="text-sm leading-snug text-amber-300">{wandProblem}</p>}
        </div>

        {/* With no words the engine is asked for a plain prompt and what comes
            back has nobody singing on it — said before it is paid for. */}
        {wordless && (
          <p className="text-sm text-amber-300/90 leading-snug rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-3.5 py-2.5">
            {singItYourself
              ? t('make.noWordsOnPurpose', 'No words and no voice — this comes back as a backing track to sing over.')
              : t('make.noWords', 'The words box is empty, so this comes back as music with nobody singing. Put the words in first if you want it sung.')}
          </p>
        )}

        {canSingMine && (
          <label className="flex items-start gap-2.5 text-sm text-zinc-300" data-makemine>
            <input
              type="checkbox"
              checked={mineAfter}
              onChange={(event) => setMineAfter(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
            />
            <span>
              {t('make.mineToo', 'Then sing it in my own voice')}
              <span className="block text-xs leading-snug text-zinc-500">
                {t('make.mineTooWhy', 'Your trained singing voice takes over the vocals once the song is made. Priced before it starts.')}
              </span>
            </span>
          </label>
        )}
        <label className="flex items-start gap-2.5 text-sm text-zinc-300" data-covertoo>
          <input
            type="checkbox"
            checked={wantCover}
            onChange={(event) => {
              setWantCover(event.target.checked);
              try {
                window.localStorage.setItem(
                  'futurebox.cover.with.song',
                  event.target.checked ? 'yes' : 'no',
                );
              } catch {
                /* A private window keeps nothing. Ticked again next time. */
              }
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
          />
          <span>{t('make.coverToo', 'Make album cover')}</span>
        </label>
        {/* Or buy one: a cover drawn by a real artist, from the album art
            market. The owner, 18 October 2026. */}
        {onBrowseArt && (
          <button
            type="button"
            data-buyart
            onClick={onBrowseArt}
            className="flex w-full items-start gap-2.5 rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2.5 text-left text-sm text-zinc-200 hover:border-emerald-500"
          >
            <Palette className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              {t('make.buyArt', 'Buy album art')}
              <span className="block text-xs leading-snug text-zinc-500">
                {t('make.buyArtWhy', 'Covers drawn by real artists — bought from them, so the artist is paid.')}
              </span>
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => make()}
          disabled={busy || Boolean(pairGate && !pairGate.ready)}
          data-makego
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 py-5 text-lg font-extrabold tracking-tight text-onAccent shadow-[0_8px_30px_rgba(16,185,129,0.28)] hover:opacity-90 disabled:opacity-60 disabled:shadow-none"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {busy ? `${t('make.going')} ${elapsed}s` : t('make.go')}
          {/* What the press costs, both halves of it. The song's number was
              already on the length chips; the cover's was nowhere until
              now, and a tick that quietly adds two credits is the surprise
              this app does not do. */}
          <span className="text-sm font-bold opacity-80">
            · {songCost(seconds, singer) + (wantCover ? CREDITS.cover : 0)}{' '}
            {t('video.credits', 'credits')}
          </span>
        </button>

        {pairGate && !pairGate.ready && !busy && (
          <p data-makewaits className="text-center text-sm text-amber-300">{pairGate.why}</p>
        )}
        {busy && <Progress stage={stage} elapsed={elapsed} asked={seconds} t={t} />}

        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* What is left, and only where there is a number that is true.

              A paid plan used to be told "As many as you like on Pro", which
              is not what a paid plan is: every one of them has a credit
              ceiling, and the whole of `private/KOSTE-EN-WINS.md` turns on that
              ceiling being real. The owner: "die pro version het ook beperkte
              krediete. haal dit uit."

              Nothing is put in its place. The balance is in the studio header
              on every screen, counted in the currency that is actually spent —
              a second, vaguer sentence about the same thing under the button
              is how the two drift apart. */}
          {userPlan === 'free' ? (
            <p className="text-sm text-zinc-500">
              {`${left ?? 0} / ${ENTITLEMENTS['publish.release'].caps.free} ${t('make.leftToday')}`}
            </p>
          ) : (
            <span />
          )}
          {userPlan === 'free' && (left ?? 0) === 0 && (
            <button type="button" onClick={onUpgrade} className="text-sm text-amber-400 hover:underline">
              {t('make.getMore')}
            </button>
          )}
        </div>

        {status && <p className="text-sm text-emerald-300">{status}</p>}
        {canSayIt && (
          <button
            type="button"
            onClick={() => void sayItAsASound()}
            disabled={saying || !canvas.style.trim()}
            data-sayitinstead
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 text-sm font-bold text-amber-200 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            {saying
              ? t('make.sayingIt', 'Working out what that sounds like…')
              : `${t('make.sayIt', 'Say it as a sound instead')} · ${CREDITS.styleword} ${t('make.credits', 'credits')}`}
          </button>
        )}

        {!engines.available('audio') && (
          <p className="text-sm text-zinc-500 leading-relaxed border-t border-zinc-800 pt-3">
            <Wand2 className="w-3.5 h-3.5 inline mr-1.5 text-zinc-600" />
            {t('make.sketch')}
          </p>
        )}
      </div>

      {/* Your channel */}
      <div id="made-tracks-section" className="space-y-3 scroll-mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h5 className="text-lg font-bold text-white">{t('make.channel')}</h5>
          <span className="text-sm text-zinc-500">{tracks.length} {tracks.length === 1 ? t('make.song') : t('make.songs')}</span>
        </div>

        {tracks.length === 0 ? (
          <p className="text-base text-zinc-500 py-8 text-center border border-dashed border-zinc-800 rounded-2xl">
            {t('make.empty')}
          </p>
        ) : (
          /* `grid-cols-1` rather than no columns: Tailwind's is `minmax(0, 1fr)`,
             where an unnamed column sizes itself to its longest content. A
             saved song with a long name made its card 944 pixels wide on a
             390-pixel phone and the whole room scrolled sideways — the
             owner, 20 October 2026: "Die gestoorde liedjies in die make a
             song room veroorsaak dat die kamer links en regs ook scroll."
             Now the name is cut with an ellipsis, as `truncate` meant. */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tracks.map((track) => (
              /* The one that is playing takes the whole row. A waveform is
                 there to find the chorus with, and you cannot do that in half
                 a column — it was the reason the panel felt cramped. Every
                 other card stays small, because a list of songs is a list. */
              <div
                key={track.id}
                className={`min-w-0 rounded-2xl border bg-zinc-900/60 p-4 space-y-3 ${
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
                    className="w-12 h-12 rounded-full bg-emerald-500 text-onAccent flex items-center justify-center shrink-0 hover:bg-emerald-400"
                  >
                    {playing === track.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
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
                {(playing === track.id || sleeveFor === track.id) && (
                  <div className="grid grid-cols-1 sm:grid-cols-[220px_minmax(0,1fr)] gap-4 items-start">
                    <Sleeve
                      trackId={track.id}
                      title={track.title}
                      genre={track.genre}
                      style={track.style ?? ''}
                      onRealArt={() => onGoToArt({ id: track.id, title: track.title })}
                      startNow={coverFor === track.id}
                      /* Pinned while it draws. This panel is mounted on
                         `playing || sleeveFor`, and a song that reaches its
                         end sets `playing` to null — which used to take the
                         panel, and the loop waiting for the picture, down
                         with it a few seconds before the cover arrived. */
                      onWorking={(busy) => {
                        if (busy) setSleeveFor(track.id);
                      }}
                    />
                    {playing === track.id && (
                      <NowPlaying track={track} audio={audioRef.current} blob={playingBlob} />
                    )}
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
                    className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
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
                      className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
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
                    className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {t('make.singOver')}
                  </button>
                  {/* And the other direction: not you singing over it, but it
                      sung in your voice. Draws nothing at all until the
                      singing engine is switched on. */}
                  <SingItMine
                    track={track}
                    onMade={(made, audio) => {
                      const next = [made, ...tracks];
                      setTracks(next);
                      saveTracks(next);
                      setStatus(t('mine.kept', 'It is in your channel, in your voice.'));
                      onMade(made);
                      void cloud.pushTrack(made, audio);
                    }}
                  />
                  {/* The cover, without having to press play to find it.
                      Hidden until asked for rather than mounted on every card:
                      each sleeve asks the server whether one exists already,
                      and twenty songs on a screen should not be twenty
                      questions nobody asked for. */}
                  <button
                    type="button"
                    onClick={() =>
                      setSleeveFor((open) => (open === track.id ? null : track.id))
                    }
                    aria-expanded={playing === track.id || sleeveFor === track.id}
                    className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    {t('make.cover', 'Cover art')}
                  </button>
                  {/* Straight into the live room, from the room it was made
                      in. Finishing a song and then having to open another
                      room to put it in front of anybody was the long way
                      round, and only worked for your six newest songs. */}
                  <PostToLive track={track} />
                  <button
                    type="button"
                    onClick={() => share(track)}
                    className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    {shared === track.id ? t('make.copied') : t('make.share')}
                  </button>
                  <button
                    type="button"
                    onClick={() => make(track)}
                    disabled={busy}
                    className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-violet-500 hover:text-violet-300 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    {t('make.again')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoFor(track)}
                    className="min-h-[44px] px-3 py-1.5 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-300 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
                  >
                    <VideoIcon className="w-3.5 h-3.5" />
                    {t('video.make')}
                  </button>
                  <SayItWrong
                    surface="music_studio"
                    spoken
                    said={track.title}
                    alwaysShow
                    variant="button"
                  />
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

        {/* ── Why this scrolls itself into view ─────────────────────────

            The owner, 9 October 2026: *"As ek kliek op make a video by 'n
            liedjie doen dit niks nie."*

            It did do something. This panel is drawn AFTER the whole list of
            songs, so pressing the button on the first of five opened it
            below the other four — off the bottom of a phone, with nothing
            moving on the screen she was looking at. A press that works and
            shows nothing is a press that did not work, as far as anybody
            using it is concerned.

            Putting the panel beside its own song would mean one panel per
            row and a different layout for every width. Moving the screen to
            the panel is one line and makes the press visible wherever the
            list has got to. */}
        <div ref={videoPanel}>
          {videoFor && <VideoPanel track={videoFor} onClose={() => setVideoFor(null)} />}
        </div>

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
