'use client';

/**
 * The video desk.
 *
 * Deliberately empty when it opens: a heading, a row of kinds of video, and a
 * box. Nothing is chosen for you and nothing is generated until you press the
 * button, which is the whole feeling somebody wants from a page they are about
 * to make something on.
 *
 * ── Why the tiles fill the box rather than open a form ───────────────────
 *
 * A blank box is a wall for anybody who has not learnt how a video model wants
 * to be spoken to, and a form is a cage for anybody who has. A scaffold is
 * neither: the box fills with a half-written shot in the right shape, obviously
 * about somebody else's song, so the first instinct is to rewrite it. What you
 * send is always your own sentence.
 *
 * ── The quotation marks ──────────────────────────────────────────────────
 *
 * Anything in quotation marks is spoken aloud by the model. That is the single
 * least obvious thing about writing one of these prompts and it is worth the
 * space it takes here: the two scaffolds with a voice in them show it, the
 * lines that will be spoken are read back before anything is spent, and a
 * prompt that says "she says" without quoting anything gets one sentence of
 * warning rather than a refusal. Being wrong about this is silent — the clip
 * comes back with somebody mouthing nothing — which is exactly the kind of
 * mistake worth catching before the credits go.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Video as VideoIcon, Image as ImageIcon, Loader2, Download, Languages, Quote, AlertTriangle, Volume2, VolumeX, Plug, PlugZap, Type } from 'lucide-react';
import {
  SCENES, spokenLines, looksUnquoted, LENGTHS, GENRES, type Scene, type Genre,
} from '../lib/videoscenes';
import { engines, probeVideoEngine, type EngineAspect, type VideoEngine } from '../lib/engines';
import { CREDITS, readCost, videoCost, type VideoGrade } from '../lib/credits';
import { downloadBlob, safeFilename } from '../lib/library';
import KeepVideo from './KeepVideo';
import { signal } from '../lib/signal';
import Cost from './Cost';
import Recommend from './Recommend';
import History from './History';
import { makeId, rememberMake } from '../lib/makes';
import CheaperPath from './CheaperPath';
import StartFrame from './StartFrame';
import Presenter from './Presenter';
import SafeZones from './SafeZones';
import Storyboard from './Storyboard';
import SongWindow, { type SongCut } from './SongWindow';
import { readAudio } from '../lib/trackaudio';
import { canStitch, stitch } from '../lib/stitch';
import DubFilm from './DubFilm';
import Note from './Note';
import Subtitles, { NO_SUBTITLES, translated, type SubtitleChoice } from './Subtitles';
import Card from './Card';
import { useOpenCard } from '../lib/opencard';
import { useLang } from '../lib/i18n';
import { useCopilotOps } from '../lib/copilotactions';
import type { SurfaceId } from '../lib/surfaces';
import ShareRow from './ShareRow';
import { loadBrandKit, saveBrandKit } from '../lib/brandkit';
import { assetDataUrl, loadAssets } from '../lib/assets';
import Pictures from './Pictures';
import MakeSound from './MakeSound';
import { loadMark } from '../lib/logomark';

type Aspect = EngineAspect;

interface Made {
  readonly blob: Blob;
  readonly url: string;
  readonly prompt: string;
  readonly aspect: Aspect;
  /**
   * Whether the engine was asked to speak the quoted line on this one.
   *
   * Recorded because it decides whether the language panel is offered: a dub
   * re-performs speech, and a clip with none has nothing to dub — offering it
   * anyway would take the credits and hand back the same silent film.
   */
  readonly spoken: boolean;
  /** What was asked for, which is what the dub is priced on. */
  readonly seconds: number;
}

const GRADES: { id: VideoGrade; label: string; note: string }[] = [
  { id: 'standard', label: 'Standard', note: 'Most shots. Silent.' },
  { id: 'better', label: 'Better', note: 'Sharper, and it can speak.' },
  { id: 'premium', label: 'Premium', note: 'The best picture there is.' },
];

/**
 * The shapes, with the size each one actually comes out at.
 *
 * "Tall" and "Wide" were the whole label, and the platform note was in a
 * `title` attribute — which is a tooltip, which does not exist on a phone,
 * which is where somebody making a reel is standing. So a person choosing
 * between them had two words and no numbers, and no way to know whether what
 * came back would fit the place they meant to put it.
 *
 * The pixel sizes are what the engines return at these ratios: 1080 on the
 * short edge, which is what every one of these platforms wants and is the
 * resolution the providers document. They are written here rather than
 * computed so that a change in what an engine returns is a change to a line
 * somebody has to read, not a silent drift in a formula.
 */
const SHAPES: { id: Aspect; label: string; size: string; note: string }[] = [
  { id: '9:16', label: 'Tall', size: '1080 × 1920', note: 'TikTok, Reels, Shorts' },
  { id: '16:9', label: 'Wide', size: '1920 × 1080', note: 'YouTube, a website' },
  { id: '1:1', label: 'Square', size: '1080 × 1080', note: 'A feed post' },
];

/**
 * Where the choice between Simple and Everything is remembered.
 *
 * Its own key rather than the one Make a song uses: somebody who wants the
 * whole desk on a video is not thereby somebody who wants the whole desk on a
 * song, and one shared key would decide both from one press.
 */
const MODE_KEY = 'futurebox.canvas.mode.v1';

/**
 * The chosen part of the song, laid under a finished clip.
 *
 * No video engine on the shelf takes an audio file, so a music video made here
 * comes back silent and the song has to be put under it afterwards. That is
 * `lib/stitch.ts` doing what it already does for the storyboard, with one
 * scene instead of twelve and an offset into the song instead of the top of
 * it.
 *
 * It costs what stitching always costs: real time, because the picture is
 * recorded off a canvas as it is painted. Five seconds of video is five
 * seconds of waiting, which at this length is not worth a progress bar.
 *
 * Anything that goes wrong gives back the clip it was handed. A silent video
 * somebody can still download beats an error over a generation they have
 * already paid for.
 */
async function withSong(
  clip: Blob,
  cut: SongCut | null,
  aspect: Aspect,
  seconds: number,
  /* The words printed into the picture, already in the language they are to
     be read in. Added 11 September 2026: the same pass that lays a song under
     a clip is the one that burns a caption into it, so doing them separately
     would re-encode the file twice for no reason and give two chances to
     lose it. `stitch` has taken a caption per scene since the storyboard was
     built; a single clip is simply one scene. */
  caption?: string,
  /* The brand kit's logo, already decoded, or null for a clip that is not
     being branded.

     Third passenger on the same pass, for the reason the caption gives
     above: this re-encode happens in real time, so a second one to add a
     logo would cost a person another minute of their evening and give the
     file another chance to be lost. One pass, everything it carries. */
  mark?: HTMLImageElement | null,
  /* A sound made on this desk — a read line, a voice-over — which goes under
     the clip in place of a song.
 
     In place of, not as well as: `stitch` lays ONE audio track under a film,
     and mixing a voice over music is a second pass with a gain on each, which
     is the video editor's job and is already built there. A desk that quietly
     dropped one of the two would be worse than a desk that says only one goes
     under a clip here — which the panel does say. */
  voice?: Blob | null,
): Promise<Blob> {
  const wanted = (caption ?? '').trim();
  if ((!cut && !wanted && !mark && !voice) || !canStitch()) return clip;
  try {
    /* The made sound wins. It is the thing somebody pressed a button for
       thirty seconds ago, and the song under a clip is a bed that was set
       earlier and may well have been forgotten about. */
    const audio = voice ?? (cut ? await readAudio(cut.songId) : null);
    // A song that has gone missing must not take the subtitles or the logo
    // with it.
    if (cut && !audio && !wanted && !mark) return clip;
    const size = aspect === '9:16'
      ? { width: 720, height: 1280 }
      : aspect === '1:1'
        ? { width: 1080, height: 1080 }
        : { width: 1280, height: 720 };
    const made = await stitch({
      scenes: [{ clip, name: 'clip', to: seconds, ...(wanted ? { caption: wanted } : {}) }],
      /* From the top for a made sound: a read starts where it starts. The
         offset belongs to the song window and to nothing else. */
      ...(audio ? { audio, audioFrom: voice ? 0 : cut?.from } : {}),
      ...size,
      background: 'blur',
      ...(mark ? { mark } : {}),
    });
    return made.ok ? made.blob : clip;
  } catch {
    return clip;
  }
}

export default function VideoCanvas({
  onUpgrade,
  onGoTo,
  songId,
}: {
  onUpgrade?: () => void;
  /** Move to another room. Used by the cheaper route out of a spoken line. */
  onGoTo?: (surface: SurfaceId) => void;
  /**
   * A song handed over by the room that sent her here.
   *
   * Make a song offers a music video the moment one is finished, and used to
   * land her in an empty room to choose the song she had just made. The song
   * comes with her now, and the board below opens on it.
   */
  songId?: string;
}) {
  const { t } = useLang();

  /**
   * How much of the desk is on screen.
   *
   * Carli, 10 October 2026: *"Ek wonder met video desk of dit nie ook so kan
   * werk met simpl as net 'n copilot en 'n everything."* The same two as Make
   * a song, for the same reason: this desk is six kinds of video, a genre row,
   * a song window, a shot box, a quality row, a caption, a logo, a voice
   * switch, a shape row and a length row before anybody reaches the button,
   * and somebody who came here to say "film my shop front" wants none of it.
   *
   * Simple hides those controls. It does not reset them — a grade, a shape, a
   * length or a start frame set in Everything still goes to the engine, and
   * the line under the mode row says so whenever any of it is away from its
   * default. A setting that applies while its control is out of sight is
   * worse than a crowded screen, and this app has already hidden four working
   * features once by taking things away.
   */
  const [advanced, setAdvanced] = useState(false);
  useEffect(() => {
    try {
      setAdvanced(window.localStorage.getItem(MODE_KEY) === 'advanced');
    } catch {
      // Storage off. Simple is the right answer when nothing is known.
    }
  }, []);
  const chooseMode = useCallback((next: boolean) => {
    setAdvanced(next);
    try {
      window.localStorage.setItem(MODE_KEY, next ? 'advanced' : 'simple');
    } catch {
      // It still applies for this visit.
    }
  }, []);

  const [engine, setEngine] = useState<VideoEngine | null>(null);
  /* The post studio, over this desk. See the button below for why it is here
     and not in a room of its own. */
  const ready = engine === null ? null : engine.available;
  const [scene, setScene] = useState<Scene | null>(null);
  /** Which of a kind's scaffolds is showing, so "another" can walk them. */
  const [variant, setVariant] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState<Aspect>('16:9');
  const [seconds, setSeconds] = useState<number>(5);
  /** The song under a music video, and the window of it this clip uses. */
  const [songCut, setSongCut] = useState<SongCut | null>(null);
  /**
   * The words printed into the picture, and which language they are in.
   *
   * This desk had none. The whole control lived inside the storyboard below
   * it — the form for cutting many shots into one film — so somebody making
   * a single advert could not put a word on screen. See `Subtitles.tsx`.
   */
  const [subtitles, setSubtitles] = useState<SubtitleChoice>(NO_SUBTITLES);

  /* ── The brand kit's logo, if there is one ──────────────────────────────

     Loaded once when the room opens, not at the moment of cutting: decoding
     an image inside the draw loop is how a recorded canvas drops frames, and
     the stitcher's comment on the song says the same thing about the audio.

     `null` covers three cases that behave identically and should not be told
     apart here — no brand kit, a kit with no logo, and a logo that would not
     decode. In all three the clip is cut exactly as it was before this
     existed. A logo is a nice-to-have; a lost render is not. */
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [brandIt, setBrandIt] = useState(true);
  /* Read again after an upload, not only when the room opens.

     Carli, 18 September 2026: *"Let ook wel dat die video studio glad nie 'n
     image oplaai het vir iemand wat hulle logo op 'n video wou sit nie. Dit
     het net die oplaai vir 'n cast member."* She was right, and the row
     below is the answer — which only works if the desk can notice the logo
     it has just been handed. */
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const readMark = useCallback(async () => {
    const id = loadBrandKit().logoAssetId;
    if (!id) {
      if (alive.current) setMark(null);
      return;
    }
    const url = await assetDataUrl(id).catch(() => null);
    const image = url ? await loadMark(url) : null;
    if (alive.current) setMark(image);
  }, []);
  useEffect(() => { void readMark(); }, [readMark]);
  /**
   * The words themselves, when they are not the line already in the prompt.
   *
   * `undefined` rather than empty means "use the quoted line", which is the
   * same default the storyboard has: somebody who wrote a woman at a window
   * saying “ek gaan nie terug nie” has already typed the subtitle,
   * and asking them to type it a second time is the kind of small insult
   * that makes a switch not worth turning on.
   */
  const [caption, setCaption] = useState<string | undefined>(undefined);
  /** Said when the translation failed and the clip did not. */
  const [captionProblem, setCaptionProblem] = useState('');

  /* What the copilot may change here.

     Every value is vetted rather than trusted: the model writes a string, and
     an aspect that is not one of the three or a length that is not one the
     engine offers would set the panel to something no button can express and
     no generate call will accept. A rejected value leaves the control alone,
     which is the honest outcome — the reply said what it meant to do, and if
     it could not be done, nothing should look as though it was. */
  /* The shot card opens and the page goes to it. The shape and the length
     live inside the same card, so they need no arrival of their own —
     opening it shows all three. See `lib/arrival.ts`. */
  const shotCard = useOpenCard();
  useCopilotOps('canvas', {
    set_prompt: (value) => {
      setPrompt(value);
      shotCard.arrived();
    },
    set_aspect: (value) => {
      const wanted = value.trim();
      if (wanted !== '16:9' && wanted !== '9:16' && wanted !== '1:1') return;
      setAspect(wanted);
      shotCard.arrived();
    },
    set_seconds: (value) => {
      const wanted = Number.parseInt(value.trim(), 10);
      if (!LENGTHS.some((one) => one.seconds === wanted)) return;
      setSeconds(wanted);
      shotCard.arrived();
    },
    /* ── The quality, which the copilot could not reach ────────────────

       Simple is "the copilot writes everything", and on this desk the
       equivalent of a song's style is the grade: it decides the engine, the
       price and whether a quoted line can be spoken at all. Without this the
       copilot could write a shot with a line in quotation marks, set the
       shape and the length, and leave the desk on Standard — which is
       silent — so the one thing it had been asked for came back missing.

       Refused rather than clamped when the engine does not offer the rung:
       setting a grade that is not there would disable the lengths row and
       leave somebody on a desk that cannot make anything. */
    set_grade: (value) => {
      const wanted = value.trim().toLowerCase();
      if (!GRADES.some((one) => one.id === wanted)) return;
      if (engine && !engine.grades.includes(wanted as VideoGrade)) return;
      setGrade(wanted as VideoGrade);
      shotCard.arrived();
    },
  });
  /**
   * What the member is buying — never which engine serves it.
   *
   * Standard is the default and it is the one that pays: the cheap engine
   * costs a thirteenth of the dear one, and most shots do not need the
   * difference. The dearer rungs are chosen deliberately, with the price on
   * them, by somebody who has decided this particular shot is worth it.
   */
  /**
   * A sound made on this desk, to go under the clip.
   *
   * Carli, 10 October 2026: *"Ek dink ook video editor, en video desk kan stem
   * generations hê, noem dit eerder, generate a sound, asook 'n podcast text
   * tot speech."*
   *
   * Kept here rather than in the panel, because the thing that uses it is the
   * pass that lays audio under the finished clip — which runs after the engine
   * answers, minutes after the sound was made.
   */
  const [voice, setVoice] = useState<{ blob: Blob; name: string } | null>(null);
  const [grade, setGrade] = useState<VideoGrade>('standard');
  /**
   * A picture to start the clip from. Held here rather than uploaded: it goes
   * with the request and is never stored, so leaving the room loses it, which
   * is the correct behaviour for something nobody was told we kept.
   */
  const [frame, setFrame] = useState<string | null>(null);
  /** Which genre's look is in the box, if one was taken. */
  const [genre, setGenre] = useState<Genre | null>(null);
  const [genreVariant, setGenreVariant] = useState(0);
  /**
   * Whether the engine itself should speak the quoted line.
   *
   * Off by default, and that default is the whole language strategy. The
   * picture costs about a hundred times what the voice costs, and the video
   * models are English-first — so silent footage with an ElevenLabs voice laid
   * over it is cheaper, keeps one voice across every clip, and is the only way
   * this app speaks Afrikaans at all.
   */
  const [speak, setSpeak] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<Made[]>([]);
  /** Bumped when a clip is kept, so the history below reloads. */
  const [kept, setKept] = useState(0);
  /** Which made clip has its language panel open, by its own url. */
  const [openLanguage, setOpenLanguage] = useState<string | null>(null);

  /**
   * Everything that is away from its default, in the words the controls use.
   *
   * Printed under the mode row in Simple. Not a nicety: all of this is sent
   * whether or not its control is on the screen, and a grade set to Premium
   * three visits ago is thirteen times the money on a press somebody thinks
   * is the cheap one. The shape is here too, because a tall clip made by
   * somebody who thought they were making a wide one is a clip they pay for
   * twice.
   */
  const changedFromDefault = useMemo(() => {
    const said: string[] = [];
    if (grade !== 'standard') {
      said.push(t(`canvas.grade.${grade}`, GRADES.find((one) => one.id === grade)?.label ?? grade) as string);
    }
    if (aspect !== '16:9') {
      said.push(t(`canvas.shape.${aspect}`, SHAPES.find((one) => one.id === aspect)?.label ?? aspect) as string);
    }
    if (seconds !== 5) said.push(`${seconds}s`);
    if (frame) said.push(t('canvas.inForceFrame', 'a start frame'));
    if (songCut) said.push(t('canvas.inForceSong', 'a song under it'));
    if (speak) said.push(t('canvas.letItSpeak', 'Let the engine say the line'));
    if (subtitles.on) said.push(t('canvas.inForceWords', 'words on screen'));
    return said;
  }, [grade, aspect, seconds, frame, songCut, speak, subtitles.on, t]);

  useEffect(() => {
    let alive = true;
    void probeVideoEngine().then((found) => {
      if (alive) setEngine(found);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Object URLs are the one thing the browser will not tidy up on its own.
  useEffect(() => () => made.forEach((one) => URL.revokeObjectURL(one.url)), [made]);

  /**
   * What this grade can make, from the server rather than from a guess here.
   * Falls back to the two lengths every engine has while the answer is still
   * in flight, so the row is never empty and never wrong for long.
   */
  const able = engine?.can?.[grade];

  /* Land on a grade that exists.

     This started on Standard and stayed there whether or not Standard was
     connected — and on this deployment it is not, because the cheap engine is
     held behind a flag until its wire format has been checked. Every
     capability below is read off `can[grade]`, so an absent grade meant every
     read missed and fell back to a guess: two lengths, two shapes, and no
     picture attachment, none of which had anything to do with the engines
     actually running. The desk was describing an engine that was not there.

     Cheapest first, because that is still the right default when it is
     available — only now it is a default among the ones that exist. */
  useEffect(() => {
    const there = engine?.grades;
    if (!there?.length || there.includes(grade)) return;
    const cheapestThere = (['standard', 'better', 'premium'] as VideoGrade[]).find((one) =>
      there.includes(one),
    );
    if (cheapestThere) setGrade(cheapestThere);
  }, [engine, grade]);

  /* Before the probe answers, the pair every engine has. After it answers,
     what this grade actually said — and nothing invented if it said nothing. */
  const answered = engine !== null;
  const lengths = useMemo(() => {
    const said = able?.seconds ?? (answered ? [] : [5, 10]);
    return LENGTHS.filter((one) => said.includes(one.seconds));
  }, [able, answered]);
  const shapes = able?.aspects ?? (answered ? [] : ['16:9', '9:16']);

  /* What the longest clip on any connected grade is, and where it lives.

     A row that stops at ten seconds with nothing said about it reads as the
     app's limit. It is the engine's, it differs per grade, and moving one rung
     is often the whole answer — so the row says so when another connected
     grade goes further, and says nothing when this one is already the longest.
     It can only speak about grades that are connected: an engine the server
     has not switched on is not something this screen knows exists. */
  /* The cheapest connected grade that actually reads a start frame.

     Named rather than assumed. The note here said "Premium" in fixed words,
     which was true of the engines connected the day it was written and is a
     sentence that goes quietly wrong the moment a different engine is switched
     on. It is also what makes the button under it able to go somewhere. */
  const frameGrade = useMemo(() => {
    const can = engine?.can;
    if (!can) return null;
    return (
      (['standard', 'better', 'premium'] as VideoGrade[]).find(
        (one) => one !== grade && can[one]?.startFrame,
      ) ?? null
    );
  }, [engine, grade]);

  const longestHere = lengths.length ? lengths[lengths.length - 1].seconds : 0;
  const longerOn = useMemo(() => {
    const can = engine?.can;
    if (!can) return null;
    let best: { grade: VideoGrade; seconds: number } | null = null;
    for (const one of ['standard', 'better', 'premium'] as VideoGrade[]) {
      const most = can[one]?.seconds?.reduce((a, b) => Math.max(a, b), 0) ?? 0;
      if (most > longestHere && (!best || most > best.seconds)) best = { grade: one, seconds: most };
    }
    return best;
  }, [engine, longestHere]);

  // A grade that cannot make the chosen length gets the nearest it can, rather
  // than a button that looks selected and generates something else.
  useEffect(() => {
    if (lengths.length && !lengths.some((one) => one.seconds === seconds)) {
      const nearest = lengths.reduce((best, one) =>
        Math.abs(one.seconds - seconds) < Math.abs(best.seconds - seconds) ? one : best,
      );
      setSeconds(nearest.seconds);
    }
  }, [lengths, seconds]);

  useEffect(() => {
    if (!shapes.includes(aspect)) {
      // `shapes` comes off the server's capability answer, so it is strings.
      // Narrowed rather than asserted: a shape the app does not know about is
      // one it should not select.
      const first = shapes.find((one): one is Aspect => one === '16:9' || one === '9:16' || one === '1:1');
      if (first) setAspect(first);
    }
  }, [shapes, aspect]);

  const spoken = useMemo(() => spokenLines(prompt), [prompt]);

  /**
   * Whether the engine will actually be asked to speak.
   *
   * Not the same as `speak`, and the difference was a real fault. The switch
   * only draws while the prompt has a quoted line in it, so taking the quotes
   * out left it checked, invisible and still true — and the next shot went up
   * on the dearer speaking grade with nothing to say. Found by a probe writing
   * a second shot without quotation marks after a first one with them.
   *
   * Derived rather than corrected in an effect, so there is no moment where
   * what is charged and what is sent disagree.
   */
  const willSpeak = speak && spoken.length > 0;
  const unquoted = useMemo(() => looksUnquoted(prompt), [prompt]);
  /* The words that would go on screen: whatever was typed, or the line the
     prompt already has in quotation marks. The same rule as the storyboard's
     `captionOf`, so the two halves of this desk caption a shot identically. */
  const wantedCaption = (caption ?? spoken[0] ?? '').trim();

  const pick = (chosen: Scene) => {
    // Pressing the same tile again walks to its next scaffold rather than
    // rewriting what is already there with the same words — the tile is the
    // way to ask for another idea, not just the way to choose a kind.
    const next = scene?.id === chosen.id ? (variant + 1) % chosen.scaffolds.length : 0;
    setScene(chosen);
    // The genre row describes what is in the box. Filling the box from a tile
    // means no genre is in it any more, and a chip left lit would be claiming
    // otherwise.
    setGenre(null);
    setGenreVariant(0);
    setVariant(next);
    setPrompt(chosen.scaffolds[next]);
    setAspect(chosen.aspect);
    setSeconds(chosen.seconds);
    setError(null);
  };

  const clear = () => {
    setScene(null);
    setVariant(0);
    setGenre(null);
    setGenreVariant(0);
    setPrompt('');
    setError(null);
  };

  /**
   * Take a genre's look, or ask it for its other one.
   *
   * Same behaviour as the tiles above: pressing the chip you are already on
   * walks to the next scaffold rather than rewriting the box with the same
   * words, because the chip is how you ask for another idea as well as how you
   * choose.
   */
  const pickGenre = (chosen: Genre) => {
    const next = genre?.id === chosen.id ? (genreVariant + 1) % chosen.scaffolds.length : 0;
    setGenre(chosen);
    setGenreVariant(next);
    setPrompt(chosen.scaffolds[next]);
    setAspect(chosen.aspect);
    setError(null);
  };

  const make = async () => {
    const said = prompt.trim();
    if (said.length < 12) {
      setError(t('canvas.tooShort', 'Say a bit more — what is in the shot, and what the camera does.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await engines.generateVideo({
        title: scene?.label ?? 'Video',
        treatment: said,
        aspect,
        seconds,
        grade,
        speak: willSpeak,
        ...(frame ? { image: frame } : {}),
      });
      /* The song goes under it before anything else sees the file, so what is
         played back, what is kept and what is downloaded are one blob rather
         than three that could drift apart. */
      /* Whatever the template. The condition here used to be
         `scene?.id === 'music' ? songCut : null`, which meant a song chosen
         on any other template was picked, shown, and silently dropped —
         worse than not offering it. */
      /* The words, in the language that was asked for, before they are burnt
         in. A failure here loses the translation and not the clip — it is
         cut with the words as they were typed and the room says so, which is
         what the storyboard does and for the same reason: the generation has
         already been paid for. */
      setCaptionProblem('');
      let words = subtitles.on ? wantedCaption : '';
      if (words && subtitles.lang) {
        const written = await translated([words], subtitles.lang);
        words = written.lines[0] ?? words;
        if (written.failed) {
          setCaptionProblem(
            t('canvas.noTranslate', 'The subtitle could not be written in that language; the clip was cut with the words as they are.'),
          );
        }
      }
      const clip = await withSong(result.blob, songCut, aspect, seconds, words, brandIt ? mark : null, voice?.blob ?? null);
      const url = URL.createObjectURL(clip);
      setMade((held) => [{ blob: clip, url, prompt: said, aspect, spoken: willSpeak, seconds }, ...held]);
      signal('video', { category: scene?.id ?? 'canvas' });

      /* Kept, rather than living only in this tab.
         A clip somebody paid for and did not immediately download used to be
         gone on the next reload, which is a bad deal at any price and an
         insulting one at these. The credits are recorded with it, so the
         history is also a receipt. */
      void rememberMake(
        {
          id: makeId('canvas'),
          surface: 'canvas',
          kind: 'video',
          title: scene ? t(`canvas.scene.${scene.id}`, scene.label) : t('canvas.clip', 'Clip'),
          note: said,
          createdAt: new Date().toISOString(),
          seconds,
          ext: 'mp4',
          credits: videoCost(grade, seconds),
        },
        clip,
      ).then(() => setKept((n) => n + 1));
    } catch (problem) {
      const message = problem instanceof Error ? problem.message : t('make.failed');
      setError(message);
      // A plan gate is the one failure with somewhere to go.
      if (/plan|Maker/i.test(message)) onUpgrade?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <VideoIcon className="w-6 h-6 text-emerald-400" />
          {t('canvas.title', 'Video desk')}
        </h2>
        <p className="text-sm text-zinc-400 pt-1.5 max-w-2xl leading-relaxed">
          {t(
            'canvas.what',
            'Describe a shot and the engine makes it. Pick a kind of video to start from — everything it writes is yours to rewrite.',
          )}
        </p>
        {/* ── A still, beside the moving ones ───────────────────────────
 
            Carli: *"Dit is vir plasings vir sosiale media en kan ook in die
            video editor ingesit word."* So it lives on this desk rather than
            in a room of its own: a post and a clip are the same errand, and
            what comes out of it is a picture the editor next door can take.
 
            A still is not a cover. What is made here cannot become a song's
            album art — see `check:coverwall` — because her own rule is that
            album art is generated on the spot or bought, and a tool that
            quietly became a third way would close the art market. */}
        {/* A door to the room, not a sheet over this desk.
 
            It opened a sheet until 7 October, which meant the photo editor
            existed in two places with two sets of chrome and only one of
            them was in the menu. One room, reached from here and from the
            menu, is one thing to keep right. */}
        <button
          type="button"
          data-openpost
          onClick={() => onGoTo?.('photo')}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          {t('canvas.makePost', 'Make a post')}
        </button>
      </div>

      {/* ── How much of the desk ────────────────────────────────

          Carli, 10 October 2026: *"Ek wonder met video desk of dit nie ook so
          kan werk met simpl as net 'n copilot en 'n everything."*

          First thing under the heading, which is the only place a choice
          about how much of a page to show can go: met after the page, it is a
          choice nobody makes. Two named buttons rather than a dropdown — it
          is a choice between two things and both are worth naming. */}
      <div data-canvasmode className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-zinc-400">{t('canvas.mode', 'How much of it')}</span>
        {[false, true].map((one) => (
          <button
            key={String(one)}
            type="button"
            data-canvasmodepick={one ? 'all' : 'simple'}
            onClick={() => chooseMode(one)}
            aria-pressed={advanced === one}
            className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-sm font-semibold ${
              advanced === one
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            {one ? t('canvas.modeAll', 'Everything') : t('canvas.modeSimple', 'Simple')}
          </button>
        ))}
        <Note className="text-xs leading-snug text-zinc-500">
          {t(
            'canvas.modeWhy',
            'Simple is the copilot and one button: tell it what you want and it writes the shot, the quality, the shape and the length. Everything opens the whole desk \u2014 the kinds of video, a song under it, a start frame, a caption, your logo and the storyboard. Nothing is switched off by Simple; whatever you have set stays set.',
          )}
        </Note>
      </div>

      {/* Whatever is set behind the switch is printed under it. A grade left
          on Premium three visits ago is thirteen times the money on a press
          somebody thinks is the cheap one. */}
      {!advanced && changedFromDefault.length > 0 && (
        <p data-canvasinforce className="text-xs leading-snug text-zinc-500">
          {t('canvas.inForce', 'Still set from Everything:')} {changedFromDefault.join(' \u00b7 ')}
        </p>
      )}


      {/* ── Is this thing plugged in ───────────────────────────────────
          Written for the person who set the keys up, in the place they
          already are. Finding out whether your own app is connected should
          not require opening an API route and reading JSON, and until this
          strip existed it did. */}
      {engine && (
        <div
          className={`rounded-2xl border p-4 space-y-2 ${
            engine.available ? 'border-zinc-800 bg-zinc-950/60' : 'border-amber-500/40 bg-amber-500/5'
          }`}
        >
          {engine.available ? (
            <>
              <p className="text-sm text-zinc-300 flex items-center gap-2">
                <PlugZap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  {t('canvas.on', 'The engine is connected')} —{' '}
                  {engine.grades
                    .map((one) => t(`canvas.grade.${one}`, one))
                    .join(', ')}
                </span>
              </p>
              <p className="text-sm text-zinc-400 flex items-center gap-2">
                {engine.sound ? (
                  <Volume2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <VolumeX className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
                <span>
                  {engine.sound
                    ? t('canvas.soundOn', 'Quoted lines can be spoken aloud on the higher grades.')
                    : t('canvas.soundOff', 'No connected engine can speak, so quoted lines will come back silent.')}
                </span>
              </p>

              {/* The engine bill used to print here: every provider, its model
                  version and a spend bar, in the middle of a room somebody
                  came to make a video in. Only the operator ever saw it, and
                  the operator is the one person who does not need to be told
                  the model version while writing a shot. It is on the account
                  screen behind **You**, and then removed at her request. */}
            </>
          ) : (
            <p className="text-sm text-amber-300 flex items-start gap-2">
              <Plug className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                {engine.auth === 'none'
                  ? t('canvas.noKey', 'No key for the video engine reached this app. Music videos drawn in your browser still work, on any song.')
                  : t('canvas.off', 'The video engine is not switched on for this app yet. Music videos drawn in your browser still work, on any song.')}
              </span>
            </p>
          )}
        </div>
      )}

      {/* ── Simple: the copilot, and nothing else ───────────────────

          One sentence saying what to do, and what the copilot has put on the
          desk. The button is below, outside the switch, because "simpl as net
          'n copilot en 'n everything" leaves room for exactly one other
          thing.

          The read-back is not decoration. The shot, the quality, the shape
          and the length are what the press is going to cost and what it is
          going to come back as, and a desk somebody cannot see is a desk they
          cannot correct — they would find out what the copilot decided by
          paying three minutes and up to sixty credits for it.

          The quotation-mark rule comes with it. That panel and its warning
          live in the shot card, which is not here in Simple, and it is the
          one fault on this desk that is completely silent: a line written
          without quotes comes back drawn at rather than said, the clip looks
          finished, and the thing it was made for is missing. */}
      {!advanced && (
        <div data-canvassimple className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-sm leading-relaxed text-zinc-300">
            {t(
              'canvas.simpleSay',
              'Open the copilot and tell it what you want \u2014 "film my shop front at sunrise", in any language. It writes the shot, the quality, the shape and the length. Then press the button.',
            )}
          </p>

          {prompt.trim() && (
            <dl data-canvassimpleread className="space-y-1.5 text-sm">
              {[
                [t('canvas.simpleShot', 'The shot'), prompt.trim()],
                [
                  t('canvas.quality', 'Quality'),
                  t(`canvas.grade.${grade}`, GRADES.find((one) => one.id === grade)?.label ?? grade) as string,
                ],
                [
                  t('canvas.shape', 'Shape'),
                  t(`canvas.shape.${aspect}`, SHAPES.find((one) => one.id === aspect)?.label ?? aspect) as string,
                ],
                [t('canvas.length', 'Length'), `${seconds}s`],
              ].filter(([, value]) => value).map(([label, value]) => (
                <div key={String(label)} className="flex gap-2">
                  <dt className="shrink-0 text-zinc-500">{label}</dt>
                  <dd className="min-w-0 truncate text-zinc-200">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* The one silent fault, carried into Simple. */}
          {spoken.length > 0 && (
            <div data-canvassimplesaid className="space-y-1">
              <p className="text-xs text-emerald-400">{t('canvas.willSay', 'Will be spoken:')}</p>
              {spoken.map((line, index) => (
                <p key={index} className="text-xs italic text-zinc-300">&ldquo;{line}&rdquo;</p>
              ))}
            </div>
          )}
          {unquoted && (
            <p className="flex gap-2 text-xs leading-relaxed text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {t(
                  'canvas.unquoted',
                  'This reads like somebody is meant to speak, but nothing is in quotation marks \u2014 so the words will be drawn at, not said. Put the line in quotes.',
                )}
              </span>
            </p>
          )}
        </div>
      )}

      {advanced && (
        <>
      {/* Six kinds is the point at which a grid stops being a choice and starts
          being a decision to postpone. Given whatever is already in the box, so
          somebody who has written the shot but not picked a kind gets a real
          answer rather than a default. */}
      <Recommend
        what={t('canvas.pickWhat', 'a kind of video to start from')}
        context={prompt}
        options={SCENES.map((one) => ({
          id: one.id,
          label: t(`canvas.scene.${one.id}`, one.label) as string,
          note: t(`canvas.sceneNote.${one.id}`, one.note) as string,
        }))}
        onPick={(id) => {
          const chosen = SCENES.find((one) => one.id === id);
          if (chosen) pick(chosen);
        }}
      />

      {/* ── The desk ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {SCENES.map((one) => {
          const active = scene?.id === one.id;
          return (
            <button
              key={one.id}
              type="button"
              onClick={() => pick(one)}
              className={`text-left rounded-2xl border p-3.5 transition-all ${
                active
                  ? 'bg-emerald-500/10 border-emerald-500'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-600'
              }`}
            >
              <span className={`block text-sm font-bold ${active ? 'text-emerald-300' : 'text-zinc-200'}`}>
                {t(`canvas.scene.${one.id}`, one.label)}
              </span>
              <span className="block text-xs text-zinc-500 leading-snug pt-0.5">
                {t(`canvas.note.${one.id}`, one.note)}
              </span>
              {one.scaffolds.length > 1 && (
                <span className="block text-[11px] text-zinc-600 pt-1">
                  {active
                    ? `${t('canvas.another', 'Press again for another')} · ${variant + 1}/${one.scaffolds.length}`
                    : `${one.scaffolds.length} ${t('canvas.ideas', 'ideas')}`}
                </span>
              )}
              {one.speaks && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 pt-1.5">
                  <Quote className="w-3 h-3" />
                  {t('canvas.hasVoice', 'has a spoken line')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── The genre row ─────────────────────────────────────────────────

          Under the Music tile only, and only once it is chosen. The six tiles
          answer "what am I making"; this answers "what does this kind of song
          look like", which is a different question and the one somebody making
          a music video actually has. Amapiano and a gospel record are both a
          shot to cut against a track and they are not remotely the same shot,
          so one scaffold could only ever be one of them.

          A second row rather than sixteen tiles: choosing a kind stays one
          decision, and this one is easy to skip. It scrolls in its own box so
          ten chips cannot push the writing box off a phone screen. */}
      {scene?.id === 'music' && (
        <Card
          title={t('canvas.genre', 'What kind of song is it?')}
          aside={
            <span className="text-xs text-zinc-500">
              {t('canvas.genreSkip', 'Optional — it just fills the box differently.')}
            </span>
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((one) => {
              const active = genre?.id === one.id;
              return (
                <button
                  key={one.id}
                  type="button"
                  onClick={() => pickGenre(one)}
                  aria-pressed={active}
                  className={`min-h-[44px] text-left rounded-xl border px-3 py-2 transition-colors ${
                    active
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'
                  }`}
                >
                  <span
                    className={`block text-sm font-semibold ${active ? 'text-emerald-300' : 'text-zinc-200'}`}
                  >
                    {t(`canvas.genre.${one.id}`, one.label)}
                  </span>
                  <span className="block text-xs text-zinc-500 leading-snug">
                    {t(`canvas.genreNote.${one.id}`, one.note)}
                  </span>
                  {active && one.scaffolds.length > 1 && (
                    <span className="block text-[11px] text-zinc-600 pt-0.5">
                      {t('canvas.another', 'Press again for another')} · {genreVariant + 1}/
                      {one.scaffolds.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── The song, and the part of it this clip is cut against ─────────

          Straight under the genre row, so pressing Music video puts the songs
          on the screen rather than leaving them behind a condition at the
          bottom of the storyboard — which is where they were, and why "die
          video desk het nie 'n opsie om liedjies te kies vir 'n musiek video
          nie" was a fair description of a desk that technically had one.

          The window it returns is laid under the clip after the engine
          answers. See `withSong` below for why that is a second pass rather
          than something the engine is asked for: no video engine on the shelf
          takes an audio file. */}
      {scene?.id === 'music' ? (
        <SongWindow seconds={seconds} value={songCut} onChange={setSongCut} />
      ) : (
        /* ── And a song under anything else ────────────────────────────

            The picker was behind `scene?.id === 'music'`, and so was the
            pass that lays the audio under the clip. So somebody making an
            advert could not put music under their advert — the control was
            on this desk, working, three lines away, and invisible unless
            they had pressed a tile they had no reason to press.

            Carli, 11 September 2026: "Die video kamer benodig ook 'n
            oplaai button as mens 'n liedjie binne 'n video wou gebruik, of
            selfs een uit jou channel wil gebruik." Both of those are in
            this component already — `SongWindow` lists the channel's songs
            and takes an upload.

            Shut by default here and open under Music video, which is the
            one difference that is real: on a music video the song is the
            subject, and everywhere else it is a bed under a shot that is
            about something else. */
        <Card title={t('canvas.songUnder', 'A song under this clip')}>
          <Note className="text-sm text-zinc-500 leading-relaxed">
            {t(
              'canvas.songUnderNote',
              'One of your own, or a file from this device. You choose which part of it plays — the clip is laid against that, not against the intro.',
            )}
          </Note>
          <SongWindow seconds={seconds} value={songCut} onChange={setSongCut} />
        </Card>
      )}

      {/* ── A sound made right here ────────────────────────────

          Carli, 10 October 2026: *"Ek dink ook video editor, en video desk kan
          stem generations hê, noem dit eerder, generate a sound, asook 'n
          podcast text tot speech. Dit is tipies iets wat 'n mens daar ook sou
          kon gebruik."*

          Directly under the song window, because the two answer the same
          question — what is heard over this clip — and that is also why the
          line below says only one of them can. `stitch` lays ONE audio track
          under a film; mixing a voice over music needs a gain on each, which
          is the video editor's work and is already built there. Saying so is
          the difference between a desk with a limit and a desk that quietly
          throws away whichever one you set first.

          Why it matters on THIS desk in particular: no video engine on the
          shelf speaks Afrikaans, and the ones that speak at all are on the
          dearer rungs. A silent clip with a read laid over it is how this app
          says anything in Afrikaans at all — see `speak` in the state above.
          Until now that read had to be made in another room and carried
          here. */}
      <MakeSound
        onUpgrade={onUpgrade}
        onAudio={(audio, name) => setVoice({ blob: audio, name })}
      />
      {voice && (
        <p data-canvasvoice className="text-xs leading-snug text-zinc-500">
          {t(
            'canvas.voiceUnder',
            'This sound goes under the clip when you make it. Only one thing can — if a song is chosen too, the sound is what you hear. The video editor is where a voice is laid over music.',
          )}{' '}
          <button
            type="button"
            data-canvasvoiceoff
            onClick={() => setVoice(null)}
            className="underline underline-offset-2 hover:text-zinc-300"
          >
            {t('canvas.voiceOff', 'Take it off')}
          </button>
        </p>
      )}

      {/* ── The box ───────────────────────────────────────────────────── */}
      <div ref={shotCard.mine} className="scroll-mt-4">
      <Card
        openOn={shotCard.openOn}
        title={t('canvas.shot', 'The shot')}
        aside={
          prompt ? (
            <button type="button" onClick={clear} className="text-xs text-zinc-500 hover:text-zinc-300">
              {t('canvas.clear', 'Clear')}
            </button>
          ) : null
        }
      >
        {/* The label stays, unseen. The card's heading is the visible name of
            this box, but a heading is not a label — a screen reader following
            `aria-labelledby` on the textarea would have had nothing to read. */}
        <label htmlFor="canvas-prompt" className="sr-only">
          {t('canvas.shot', 'The shot')}
        </label>

        <textarea
          id="canvas-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={6}
          placeholder={t(
            'canvas.hint',
            'What is in the shot, what it is doing, what the camera does, what the light does, how it feels.',
          )}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none leading-relaxed resize-y"
        />

        {/* A picture to start from.

            Under the box rather than above it, because the sentence is still
            the main event: the picture settles what the shot looks like and
            the sentence says what happens in it. Somebody who attaches one
            first and then writes is served just as well by this order, and
            somebody who never attaches one is not made to step past it. */}
        <StartFrame
          value={frame}
          onChange={setFrame}
          supported={Boolean(able?.startFrame)}
          unsupportedNote={
            frameGrade
              ? `${t(
                  'canvas.frameOn',
                  'The engines behind this grade would ignore the picture and charge you anyway, so it is not offered here. It works on',
                )} ${t(
                  `canvas.grade.${frameGrade}`,
                  GRADES.find((one) => one.id === frameGrade)?.label ?? frameGrade,
                )}.`
              : engine?.startFrame
                ? t(
                    'canvas.frameGrade',
                    'Starting from a picture is on a dearer grade. It is not offered here because the engines behind this grade would ignore the picture and charge you anyway.',
                  )
                : undefined
          }
          onSwitch={frameGrade ? () => setGrade(frameGrade) : undefined}
          switchLabel={
            frameGrade
              ? `${t('canvas.frameSwitch', 'Switch to')} ${t(
                  `canvas.grade.${frameGrade}`,
                  GRADES.find((one) => one.id === frameGrade)?.label ?? frameGrade,
                )}`
              : undefined
          }
          disabled={busy}
        />

        {/* The one rule that is not obvious, said once and shown always. */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
          <p className="text-xs text-zinc-400 leading-relaxed flex gap-2">
            <Quote className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              {t(
                'canvas.quotes',
                'Anything in quotation marks is spoken aloud, in the language you write it in. Everything else is what the camera sees.',
              )}
            </span>
          </p>
          {spoken.length > 0 && (
            <div className="pl-5.5 space-y-1">
              <p className="text-xs text-emerald-400">
                {t('canvas.willSay', 'Will be spoken:')}
              </p>
              {spoken.map((line, index) => (
                <p key={index} className="text-xs text-zinc-300 italic">
                  &ldquo;{line}&rdquo;
                </p>
              ))}
            </div>
          )}
          {unquoted && (
            <p className="text-xs text-amber-300 leading-relaxed flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                {t(
                  'canvas.unquoted',
                  'This reads like somebody is meant to speak, but nothing is in quotation marks — so the words will be drawn at, not said. Put the line in quotes.',
                )}
              </span>
            </p>
          )}
        </div>

        {/* ── What you are buying ─────────────────────────────────────
            Three rungs, priced, in words about the result. The engine behind
            each is ours to choose and ours to change; naming it here would
            move a decision worth thirteen times the money onto somebody with
            less information than we have. */}
        <div>
          <span className="text-sm text-zinc-400">{t('canvas.quality', 'Quality')}</span>
          <div className="grid sm:grid-cols-3 gap-1.5 mt-1.5">
            {GRADES.map((one) => {
              const there = engine?.grades.includes(one.id) ?? false;
              const active = grade === one.id;
              return (
                <button
                  key={one.id}
                  type="button"
                  disabled={!there}
                  /* Greyed out because this engine does not offer it, which is
                     a fact about the engine and not about the person pressing.
                     The engine panel above already says when nothing is
                     connected at all; this says why one of three is off when
                     the other two are not. */
                  /* Kept for a mouse, where a tooltip is a real thing. It is
                     no longer the only way to find out — see the line under
                     the note. */
                  title={!there ? t('canvas.gradeGone', 'The engine you have picked does not offer this one.') : undefined}
                  onClick={() => setGrade(one.id)}
                  className={`min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm border transition-all disabled:opacity-40 ${
                    active
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <span className="block font-semibold">{t(`canvas.grade.${one.id}`, one.label)}</span>
                  <span className="block text-xs text-zinc-500 leading-snug">
                    {t(`canvas.gradeNote.${one.id}`, one.note)}
                  </span>
                  {/* A price, or the reason there is no price.

                      This said the credits either way and put the reason in a
                      `title` — a tooltip, which does not exist on a phone,
                      which is where somebody making a reel is standing. This
                      same file already says that about the shape row twenty
                      lines up, and then did it here anyway.

                      It is worse now than it was: with the premium engine
                      switched off, that rung is greyed out for everybody for
                      good, and a permanently dead button quoting a price it
                      will never charge is the sort of thing a person decides
                      the whole app is broken over. So the disabled one says
                      what it is instead. */}
                  <span className="block text-xs pt-0.5">
                    {there ? (
                      `${videoCost(one.id, seconds)} ${t('video.credits', 'credits')}`
                    ) : (
                      <span className="text-zinc-600">{t('canvas.gradeOff', 'Not on this engine')}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Words on screen ────────────────────────────────────────────

            Beside the switch that has the engine SAY the line, because the
            two are the same decision asked twice: most people watch these
            with the sound off, so a line worth saying is a line worth
            printing, and a line worth printing usually does not need
            saying at the dearer grade.

            This desk had no subtitles at all — the whole control was inside
            the storyboard below, the form for cutting many shots into one
            film, which somebody making one advert never opens. It is one
            component now, mounted in both. See `Subtitles.tsx`. */}
        <Subtitles
          id="canvas-subtitles"
          value={subtitles}
          onChange={setSubtitles}
          problem={captionProblem}
        >
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-zinc-600 shrink-0" />
            <label className="sr-only" htmlFor="canvas-caption">
              {t('board.caption', 'Words on screen')}
            </label>
            <input
              id="canvas-caption"
              value={caption ?? spoken[0] ?? ''}
              onChange={(event) => setCaption(event.target.value)}
              placeholder={t('canvas.captionHint', 'Taken from the line in quotation marks, or type your own')}
              className="w-full min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </Subtitles>

        {/* ── The logo, and the one case it must not be on ────────────────

            Only shown when there IS a logo. A tick that explains a feature
            nobody has set up is a row of text pretending to be a control,
            and this room already has enough to read.

            On by default, because somebody who went and uploaded a logo has
            said what they want. Off is one press, and it needs to be: a
            logo belongs on your own advert and not on a music video you cut
            for somebody else. Carli asked for this on filmed takes and on
            anything going to Live, which is most things — so the way OUT
            has to be as easy as the way in. */}
        {/* ── The logo: the upload, and the one case it must not be on ───

            It used to be the tick alone, and only when a logo already
            existed. The sentence under it said "change the logo itself on
            the Adverts desk", which is two rooms away — so somebody who
            came here to put their logo on a video found a desk that could
            upload a face for the cast and nothing else, and no way in.

            So the upload is here, always, and it writes to the same brand
            kit the advert desk writes to. One logo, two doors.

            The tick stays conditional, because a tick that explains a
            feature nobody has set up is a row of text pretending to be a
            control. On by default once there is a logo: somebody who went
            and uploaded one has said what they want. Off is one press, and
            it needs to be — a logo belongs on your own advert and not on a
            music video you cut for somebody else. */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2.5">
          {mark ? (
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                id="canvas-brand"
                type="checkbox"
                checked={brandIt}
                onChange={(event) => setBrandIt(event.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-zinc-200">
                  {t('canvas.brandIt', 'Put my logo in the corner')}
                </span>
                <span className="block text-xs text-zinc-500 leading-snug">
                  {t(
                    'canvas.brandItNote',
                    'Burned into the picture, so it survives a download and goes wherever the clip goes. Placed where TikTok, Reels and Shorts all leave the frame visible.',
                  )}
                </span>
              </span>
            </label>
          ) : (
            <p className="text-sm font-semibold text-zinc-200">
              {t('canvas.brandNone', 'Your own logo, for the corner of the clip')}
              <span className="block pt-0.5 text-xs font-normal leading-snug text-zinc-500">
                {t(
                  'canvas.brandNoneNote',
                  'Put a picture in below and it is burned into every clip you cut here, in the part of the frame TikTok, Reels and Shorts all leave visible. It is the same logo the Adverts desk uses.',
                )}
              </span>
            </p>
          )}
          <Pictures
            value={null}
            onChange={() => {
              /* `Pictures` keeps the bytes; the kit keeps a reference, so
                 the file is stored once. The same two lines the brand-kit
                 card uses, for the same reason. */
              const newest = loadAssets()[0];
              if (newest) saveBrandKit({ ...loadBrandKit(), logoAssetId: newest.id });
              void readMark();
            }}
            from="videodesk"
          />
        </div>

        {/* The engine speaking is a deliberate, dearer choice — see `speak`. */}
        {spoken.length > 0 && (
          <label className="flex items-start gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 cursor-pointer">
            <input
              id="canvas-speak"
              type="checkbox"
              checked={speak}
              disabled={!engine?.sound}
              onChange={(event) => {
                setSpeak(event.target.checked);
                if (event.target.checked && grade === 'standard') setGrade('better');
              }}
              className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-zinc-200">
                {t('canvas.letItSpeak', 'Let the engine say the line')}
              </span>
              <span className="block text-xs text-zinc-500 leading-snug">
                {engine?.sound
                  ? t(
                      'canvas.letItSpeakNote',
                      'Costs more, and only in English. Leave this off and record the line in your own voice under Script my voice — it is cheaper, it is the same voice every time, and it is the only way to get Afrikaans.',
                    )
                  : t('canvas.cannotSpeak', 'No connected engine can speak a line. Record it under Script my voice instead.')}
              </span>
            </span>
          </label>
        )}

        {/* The same advice as the note above, with the money on it.

            The note has always said that recording the line yourself is
            cheaper. It did not say by how much, and "cheaper" without a number
            is a thing people agree with and then do the expensive one anyway.
            A spoken line moves the clip to Better, which is exactly double;
            the same words read in the voice studio are charged per hundred and
            fifty characters, so a fifteen-word line is two credits. Thirty-two
            against sixty.

            Only while the box is actually ticked. Somebody who has already
            decided to record it themselves does not need to be congratulated. */}
        {speak && spoken.length > 0 && (
          <CheaperPath
            now={videoCost(grade, seconds)}
            instead={videoCost('standard', seconds) + readCost(spoken.join(' ').length)}
            what={t(
              'canvas.cheaperSpoken',
              'Make the clip silent, and read the line in your own voice next door. Same words, and it is the only way to get Afrikaans.',
            )}
            action={t('canvas.cheaperGo', 'Keep it silent and read it there')}
            onTake={() => {
              setSpeak(false);
              setGrade('standard');
              onGoTo?.('voice_studio');
            }}
          />
        )}

        {/* ── A presenter, when one is switched on ────────────────────
            Below the shot composer rather than beside it, because it is a
            different job with different inputs: everything above makes a clip
            out of a sentence, and this one makes a clip out of a face and a
            voice. It draws nothing at all when the model is not connected —
            an empty section explaining a feature nobody can use is worse than
            no section. */}
        <Presenter onUpgrade={onUpgrade} />

        {/* ── Shape and length ────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <span className="text-sm text-zinc-400">{t('canvas.shape', 'Shape')}</span>
            <div className="flex gap-1.5 mt-1.5">
              {SHAPES.filter((one) => shapes.includes(one.id)).map((one) => (
                <button
                  key={one.id}
                  type="button"
                  onClick={() => setAspect(one.id)}
                  aria-pressed={aspect === one.id}
                  title={one.note}
                  className={`min-h-[44px] flex-1 px-2 py-2 rounded-xl text-sm border transition-all ${
                    aspect === one.id
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <span className="block font-semibold">{t(`canvas.shape.${one.id}`, one.label)}</span>
                  <span className="block text-xs opacity-80 tabular-nums">{one.size}</span>
                </button>
              ))}
            </div>
            {/* Where the chosen one goes. It was a tooltip, which a phone has
                no way to show — and a phone is where a reel is made. */}
            <p className="text-xs text-zinc-500 leading-snug pt-1.5">
              {t(
                `canvas.shapeNote.${aspect}`,
                SHAPES.find((one) => one.id === aspect)?.note ?? '',
              )}
            </p>
          </div>
          <div>
            <span className="text-sm text-zinc-400">{t('canvas.length', 'Length')}</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {lengths.map((one) => (
                <button
                  key={one.seconds}
                  type="button"
                  onClick={() => setSeconds(one.seconds)}
                  /* Which one is chosen, said rather than only coloured.
                     It was colour alone, so a screen reader could not tell
                     the eight lengths apart — and neither could a probe
                     checking that the advert desk had set one. */
                  aria-pressed={seconds === one.seconds}
                  title={t(`canvas.len.${one.seconds}`, one.note)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-sm border transition-all ${
                    seconds === one.seconds
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-semibold'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {one.label}
                </button>
              ))}
            </div>
            {/* Said, not hidden in a tooltip. Choosing between five seconds and
                thirty with nothing but a price to go on is a guess. */}
            <p className="text-xs text-zinc-500 leading-snug pt-1.5">
              {t(`canvas.len.${seconds}`, lengths.find((one) => one.seconds === seconds)?.note ?? '')}
            </p>
            {/* Why the row stops where it stops. Without this, ten seconds
                reads as this app's ceiling rather than this engine's. */}
            {longestHere > 0 && (
              <p className="text-xs text-zinc-500 leading-snug pt-1">
                {longerOn
                  ? `${t('canvas.longestHere', 'The longest on this grade is')} ${longestHere}s. ${t(
                      `canvas.grade.${longerOn.grade}`,
                      GRADES.find((one) => one.id === longerOn.grade)?.label ?? longerOn.grade,
                    )} ${t('canvas.goesTo', 'goes to')} ${longerOn.seconds}s.`
                  : `${t('canvas.longestAny', 'The longest anything here makes in one go is')} ${longestHere}s.`}
              </p>
            )}
            {answered && lengths.length === 0 && (
              <p className="text-xs text-amber-400 leading-snug pt-1">
                {t(
                  'canvas.noLengths',
                  'This grade is not answering with any lengths right now. Try another one.',
                )}
              </p>
            )}
          </div>
        </div>

      </Card>
      </div>
        </>
      )}

      {/* ── The one button ────────────────────────────────────

          Outside the switch, because Simple is the copilot and this. It was
          the last thing inside the shot card, which is where it had always
          been and which would have left Simple with no way to make anything.

          It keeps the error line with it. In Simple the shot box is not on
          screen, so "say a bit more" has nowhere else to be said — and that
          refusal is the desk's answer when the copilot has not written
          enough yet. */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={make}
          disabled={busy || ready === false}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-onAccent font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <VideoIcon className="w-4 h-4" />}
          {busy
            ? t('canvas.making', 'Making it')
            : `${t('canvas.go', 'Make it')} — ${videoCost(grade, seconds)} ${t('video.credits', 'credits')}`}
        </button>

        {/* The wait, said before the press rather than only during it. A video
            is the slowest thing here by a distance, and somebody who is not
            warned presses again — and the second press is not free. */}
        {!busy && <Cost waitMinutes={3} className="justify-center w-full" />}

        {busy && (
          <p className="text-sm text-zinc-400 text-center">
            {t(
              'canvas.waiting',
              'Two to four minutes. There is no progress bar because the engine does not report one — it says nothing, and then it says here is your video.',
            )}
          </p>
        )}

        {error && <p className="text-sm text-rose-400 leading-relaxed">{error}</p>}
      </div>

      {/* ── A film out of many shots ──────────────────────────────────────

          Outside the composer above, and that placement is the whole point.
          It sat inside it, between the shape row and "Make it", and read as
          part of the same form: somebody added two shots at sixty credits
          each, watched the storyboard say 120, and asked why the big green
          button at the bottom still said sixty. It said sixty because it makes
          one clip out of the sentence above it and always has — but nothing on
          screen said the two were different forms.

          They are two ways to use the same desk: one shot from one sentence,
          or a film from many. So the second starts after the first one ends,
          with its own card and its own button, and neither reads as the
          other's total.

          It still borrows this desk's grade, shape and start frame — one
          decision, made once, above, and the cast picture is the whole reason
          twelve shots can have one person in them. */}
      {advanced && (
      <Storyboard
        aspect={aspect}
        grade={grade}
        lengths={lengths}
        frame={frame}
        songId={songId}
        /* Read off `can[grade]` here rather than asked again down there: one
           answer to "can this rung speak", in the place that already has it.
           A second lookup would be a second answer the day they disagree. */
        canSpeak={Boolean(able?.speaks)}
        onUpgrade={onUpgrade}
      />
      )}

      {/* ── What has been made, newest first ──────────────────────────── */}
      {made.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-300">{t('canvas.made', 'Made on this desk')}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {made.map((one) => (
              <div key={one.url} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-2.5">
                {/* On the clip that came back, not on the prompt.

                    You cannot frame a shot you did not film: while writing the
                    prompt the subject's position is a decision nobody has made
                    yet. Here it is a real question with a real answer, asked
                    at the one moment it can still be acted on — before
                    posting, while another take costs one generation rather
                    than a repost.

                    It used to be offered only on the tall clips, on the
                    reasoning that these are tall platforms. That made the
                    whole thing invisible to anybody working wide — who never
                    learned it existed, and who has the larger version of the
                    problem: a wide clip posted to a tall feed loses its sides
                    to the crop before a caption covers anything. So every
                    clip gets it, drawn where it applies for that shape. */}
                <SafeZones aspect={one.aspect}>
                  <video
                    src={one.url}
                    controls
                    className="rounded-xl border border-zinc-800 bg-black w-full max-h-80 object-contain"
                  />
                </SafeZones>
                <p className="text-xs text-zinc-500 leading-snug line-clamp-2">{one.prompt}</p>
                {/* Save it, and post it.

                    A finished clip could be downloaded and nothing else —
                    "dit het glad nie meer 'n share button daarop om dit
                    moontlik na social media toe te skuif nie." The share
                    sheet has existed for songs since the channel did, and a
                    video is the thing most likely to be posted. */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => downloadBlob(one.blob, safeFilename(one.prompt.slice(0, 40), 'mp4'))}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-200 hover:border-emerald-500 hover:text-white"
                  >
                    <Download className="w-4 h-4" />
                    {t('video.save')}
                  </button>
                  {/* ── Keep it, which is what puts it in the live room ──
 
                      Carli, 16 September: "die music video werk nie in die
                      live nie." It was never a playback fault. The engine
                      hands back a silent clip, `lib/stitch.ts` lays the song
                      under it HERE, in the browser, and what comes out is a
                      new blob the server has never seen. The live room's
                      list reads the `videos` table, so with nothing
                      uploaded there was nothing to offer — the room was
                      right and the video did not exist as far as it knew.
 
                      Beside Download rather than instead of it: keeping it
                      on the account and having a copy in your phone's files
                      are different wants, and somebody who only wanted the
                      file should not have to make an account's worth of
                      decision to get it. */}
                  <KeepVideo
                    blob={one.blob}
                    title={scene?.label ?? one.prompt.slice(0, 60) ?? 'Video'}
                    seconds={one.seconds}
                    aspect={one.aspect}
                  />
                  <ShareRow title={scene?.label ?? 'Video'} what={one.prompt} />
                </div>

                {/* ── The language button ──────────────────────────────

                    Only on a clip that speaks. Nothing else on this desk
                    takes a language — the engines are English-first and do
                    not accept a language code, and the words on screen are
                    typed in whatever language they were typed in — so a dub
                    is the one place the choice is real. On a silent clip the
                    room says so rather than offering a paid button that
                    would hand back the same film.

                    See `DubFilm`, which is where the money and the wait
                    are explained. */}
                {one.spoken ? (
                  openLanguage === one.url ? (
                    <DubFilm
                      film={one.blob}
                      filmId={`canvas:${one.url}`}
                      title={one.prompt.slice(0, 60)}
                      seconds={one.seconds}
                      onClose={() => setOpenLanguage(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenLanguage(one.url)}
                      className="min-h-[44px] px-3 py-2 rounded-xl text-sm bg-zinc-950 border border-zinc-700 text-zinc-200 hover:border-emerald-500 hover:text-emerald-300 flex items-center gap-1.5"
                    >
                      <Languages className="w-3.5 h-3.5" />
                      {t('dubfilm.button', 'Another language')}
                    </button>
                  )
                ) : (
                  <Note className="text-xs text-zinc-500">
                    {t(
                      'dubfilm.silent',
                      'Nothing is spoken on this one, so there is nothing to put in another language. Put a line in quotation marks and turn the voice on, or lay a reading over it.',
                    )}
                  </Note>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Everything made here before, and a way back to the shot that made it. */}
      <History
        surface="canvas"
        reloadKey={kept}
        onUseAgain={(make) => {
          if (make.note) setPrompt(make.note);
          if (typeof make.seconds === 'number') setSeconds(make.seconds);
        }}
      />
    </div>
  );
}
