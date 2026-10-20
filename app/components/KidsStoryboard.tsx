'use client';

/**
 * Interactive Storyboard for Kids.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner, 12 October 2026: *"Ek dink met 'n story board moet daar na
 * prompting 'n page op kom wat dan storielyn suggestions op gooi, dan het
 * elke seksie 4 keuses, en dan bou hulle self die storie lyn. Dieselfde
 * direk daarna wanneer die visuals vir die storie gekies moet word, dan moet
 * daar ook visual suggestions op kom. Dit moet interactive wees, en ek dink
 * daai spin, en spelletjies wat dit fun en interactive en spellerig maak
 * gaan hulle engaged hou."*
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, Dices, Heart, Loader2,
  RotateCcw, Sparkles, Volume2, X,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import {
  QUICK_STORY_SEEDS,
  STORY_SECTIONS,
  cardsNow,
  VISUAL_STYLES,
  type VisualStyle,
} from '../lib/kidsstoryboard';
import { keepStory, type KeptStory } from '../lib/storykeep';
import { makeBook, type BookProgress } from '../lib/kidsbook';
import { STORYTELLERS, type KidVoiceId } from '../lib/kidsvoices';
import { priceOf } from '../lib/kidsallowance';
import { earLang, earMaker, finalWords, withSaid, type Ear } from '../lib/speak';

/** The longest idea kept from the voice box; the server holds the same line. */
const IDEA_MOST = 300;
import { StyleTile } from './MeerkatTile';
import KidsStoryPlayer from './KidsStoryPlayer';

/** Which drawn meerkat shows each storybook style. */
const STORY_STYLE_TILE: Readonly<Record<string, string>> = {
  '3d-toon': 'cartoon3d', watercolor: 'watercolour', 'neon-glow': 'neon', crayon: 'crayon',
  'space-cat': 'iridescent', 'dino-key': 'soft3d', 'fairy-dragon': 'glitterpink', 'pup-cake': 'plush',
  clay: 'clay',
  paper: 'cutout',
  comic: 'comic',
  pixel: 'pixel',
  plush: 'plush',
  glass: 'glass',
};

export default function KidsStoryboard({
  onDone,
  onStoryKept,
}: {
  readonly onDone: () => void;
  readonly onStoryKept?: () => void;
}): React.ReactElement {
  const { lang, t } = useLang();

  /* Chosen selections for the 4 sections */
  /* The first card on show this month, so something is always chosen and
     it is a card the child can see. */
  const [hero, setHero] = useState<string>(() => cardsNow(STORY_SECTIONS[0])[0].id);
  const [setting, setSetting] = useState<string>(() => cardsNow(STORY_SECTIONS[1])[0].id);
  const [twist, setTwist] = useState<string>(() => cardsNow(STORY_SECTIONS[2])[0].id);
  const [ending, setEnding] = useState<string>(() => cardsNow(STORY_SECTIONS[3])[0].id);
  const [visual, setVisual] = useState<string>('3d-toon');

  /* Current wizard step: 0..3 for sections, 4 for visual style, 5 for reader */
  const [activeStep, setActiveStep] = useState<number>(0);
  const [spinning, setSpinning] = useState(false);
  const [building, setBuilding] = useState(false);
  const [story, setStory] = useState<KeptStory | null>(null);
  const [kept, setKept] = useState(false);
  /* ── The story engine (19 October 2026) ─────────────────────────────
     The owner: "Die story mode moet 'n ander AI engine gebruik, die
     voorlesing moet so mooi wees soos die podcast. Dalk 'n paar avatar
     stemme opstel." Who reads it is the child's choice; the characters'
     voices are the engine's. */
  const [storyteller, setStoryteller] = useState<KidVoiceId>('owl');
  const [making, setMaking] = useState<BookProgress | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [engineOn, setEngineOn] = useState<boolean | null>(null);
  const [samples, setSamples] = useState<Record<string, string>>({});
  const sample = useRef<HTMLAudioElement | null>(null);
  const [sampling, setSampling] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void Promise.all([
      fetch('/api/kids/story').then((one) => one.json()).catch(() => ({ available: false })),
      fetch('/api/kids/read').then((one) => one.json()).catch(() => ({ available: false, samples: {} })),
    ]).then(([words, voices]: [{ available?: boolean }, { available?: boolean; samples?: Record<string, string> }]) => {
      if (!live) return;
      setEngineOn(Boolean(words.available));
      setSamples(voices.available ? voices.samples ?? {} : {});
    });
    return () => {
      live = false;
      sample.current?.pause();
    };
  }, []);

  /* A storyteller's voice, heard before anything is spent: their stock
     sample, through the same-origin preview route. */
  const hear = (id: KidVoiceId): void => {
    sample.current?.pause();
    if (sampling === id) { setSampling(null); return; }
    const voice = samples[id];
    if (!voice) return;
    const audio = new Audio(`/api/voice/preview?id=${encodeURIComponent(voice)}`);
    sample.current = audio;
    setSampling(id);
    audio.onended = () => setSampling(null);
    audio.onerror = () => setSampling(null);
    void audio.play().catch(() => setSampling(null));
  };

  /* ── The voice box ─────────────────────────────────────────────────── */
  const [idea, setIdea] = useState('');
  const [hearing, setHearing] = useState(false);
  const [canHear, setCanHear] = useState(false);
  const ear = useRef<Ear | null>(null);
  useEffect(() => { setCanHear(Boolean(earMaker())); return () => ear.current?.stop(); }, []);
  const listen = (): void => {
    const Maker = earMaker();
    if (!Maker) return;
    const listening = new Maker();
    listening.lang = earLang(lang);
    listening.continuous = false;
    listening.interimResults = false;
    listening.maxAlternatives = 1;
    listening.onresult = (got) => {
      const said = finalWords(got);
      if (said) setIdea((was) => withSaid(was, said).slice(0, IDEA_MOST));
    };
    listening.onerror = () => setHearing(false);
    listening.onend = () => setHearing(false);
    ear.current = listening;
    setHearing(true);
    try { listening.start(); } catch { setHearing(false); }
  };
  const stopHearing = (): void => { ear.current?.stop(); setHearing(false); };

  /* Quick mystery spin across all sections */
  const spinAll = (): void => {
    setSpinning(true);
    setTimeout(() => {
      const any = (section: number): string => {
        const shown = cardsNow(STORY_SECTIONS[section]);
        return shown[Math.floor(Math.random() * shown.length)].id;
      };
      const randHero = any(0);
      const randSetting = any(1);
      const randTwist = any(2);
      const randEnding = any(3);
      const randVisual = VISUAL_STYLES[Math.floor(Math.random() * VISUAL_STYLES.length)].id;
      setHero(randHero);
      setSetting(randSetting);
      setTwist(randTwist);
      setEnding(randEnding);
      setVisual(randVisual);
      setSpinning(false);
    }, 400);
  };

  /* Quick seed apply */
  const applySeed = (seedId: string): void => {
    const found = QUICK_STORY_SEEDS.find((s) => s.id === seedId);
    if (!found) return;
    setHero(found.hero);
    setSetting(found.setting);
    setTwist(found.twist);
    setEnding(found.ending);
    setVisual(found.visual);
  };

  /* Make the book: written, drawn and voiced, or the Story Maker's own. */
  const generateStory = async (): Promise<void> => {
    if (building) return;
    sample.current?.pause();
    setBuilding(true);
    setNotes([]);
    try {
      const made = await makeBook({
        choices: { hero, setting, twist, ending, visual, ...(idea ? { idea } : {}) },
        storyteller,
        lang: lang === 'af' ? 'af' : 'en',
        say: (pair) => t(pair[0], pair[1]),
        onProgress: setMaking,
      });
      setStory(made.story);
      setNotes(made.engine ? made.notes : []);
      setActiveStep(5);
      setKept(false);
    } finally {
      setBuilding(false);
      setMaking(null);
    }
  };

  /* Save to shelf */
  const handleKeep = async (): Promise<void> => {
    if (!story || kept) return;
    await keepStory(story);
    setKept(true);
    onStoryKept?.();
  };

  /* While the book is being made, its pages appear as they are drawn. */
  const [thumbs, setThumbs] = useState<string[]>([]);
  useEffect(() => {
    const made = (making?.drawn ?? []).map((one) => (one ? URL.createObjectURL(one) : ''));
    setThumbs(made);
    return () => made.forEach((one) => one && URL.revokeObjectURL(one));
  }, [making]);

  return (
    <div
      className="w-full max-w-3xl mx-auto rounded-3xl border-4 border-surface-200 bg-surface-50/95 p-4 sm:p-6 shadow-2xl backdrop-blur-md"
      data-kidsstoryboard
    >
      {/* ── Header Bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-surface-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-2xl shadow-xs">
            <span>✨</span>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-surface-950">
              {t('kids.storyboardTitle', 'Magic Storyboard Studio')}
            </h2>
            <p className="text-xs font-bold text-surface-600">
              {t('kids.storyboardSub', 'Choose your storyline & visuals to make your storybook!')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDone}
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface-300 bg-surface-100 text-surface-700 hover:bg-surface-200 transition-colors"
          aria-label={t('kids.close', 'Close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Wizard Step Navigation (Steps 0..4) ────────────────────── */}
      {activeStep < 5 && !building && (
        <div className="pt-4 space-y-4">
          {/* ── Google's "Drone Director", 13 October 2026 ──────────────
              A guide bar with the drone and the three steps, and the quick
              ideas as world cards rather than chips. The page's "AI Story
              Remix" (it prepended "AI generated:" to the words) and "Play
              Complete Video" (it cycled emoji and said "Movie Complete!")
              made nothing and are not here; the real steps below are. */}
          <div className="flex items-center gap-4 rounded-3xl border-2 border-cyan-400 bg-surface-50/90 px-4 py-3.5 shadow-[0_0_18px_rgba(52,211,153,0.25)]" data-kidsdronebar>
            <span className="fb-kids-float text-4xl" aria-hidden>🛸</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-cyan-300">{t('kids.droneTitle', 'Drone Director\u2019s Mission')}</h3>
              <p className="text-xs font-semibold text-surface-800">
                {t('kids.droneHow', 'Pick a story world, build your scenes, and press Make my story to bring it alive!')}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  [0, t('kids.droneStep1', '1. Choose a world')],
                  [1, t('kids.droneStep2', '2. Build the scenes')],
                  [5, t('kids.droneStep3', '3. Watch it')],
                ].map(([at, label]) => {
                  const on = at === 5 ? activeStep >= 5 : at === 0 ? activeStep === 0 : activeStep >= 1 && activeStep <= 4;
                  return (
                    <span key={String(at)} className={`rounded-xl px-3 py-1 text-[11px] font-black ${on ? 'bg-cyan-400 text-onAccent shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'border border-surface-300 bg-surface-100 text-surface-700'}`}>
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Say your own idea ───────────────────────────────────────
              The owner, 19 October 2026: "Ek sien die story maker het nie
              'n ai voice box vir kinders om self te prompt nie." Said, not
              typed: the room keeps its one typing box for songs. The words
              show as a bubble, can be said again or cleared, and are
              screened on the server before the story engine sees them. */}
          {canHear && (
            <div className="flex flex-wrap items-center gap-3 rounded-3xl border-2 border-fuchsia-400/70 bg-surface-50/90 px-4 py-3 shadow-[0_0_18px_rgba(232,121,249,0.3)]" data-kidsstoryvoice>
              <button
                type="button"
                data-kidsstorymic
                aria-pressed={hearing}
                onClick={hearing ? stopHearing : listen}
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-3xl ${hearing ? 'animate-pulse bg-rose-500' : 'bg-fuchsia-500'}`}
                aria-label={hearing ? t('kids.storyMicStop', 'Stop listening') : t('kids.storyMic', 'Say your own story idea')}
              >
                <span aria-hidden>{hearing ? '⏹️' : '🎤'}</span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-surface-950">
                  {hearing ? t('kids.storyMicListening', 'I am listening… tell me your idea!') : t('kids.storyMic', 'Say your own story idea')}
                </p>
                {idea ? (
                  <p className="mt-1 rounded-2xl bg-surface-100 px-3 py-2 text-sm font-semibold text-surface-900" data-kidsstoryidea>
                    “{idea}”
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-surface-700">
                    {t('kids.storyMicHow', 'Like: “a dragon who is scared of the dark”. Then pick your cards.')}
                  </p>
                )}
              </div>
              {idea && !hearing && (
                <button
                  type="button"
                  data-kidsstoryideaclear
                  onClick={() => setIdea('')}
                  aria-label={t('kids.storyMicClear', 'Clear my idea')}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-surface-300 bg-surface-100 text-surface-800"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* The worlds: one press fills every step. */}
          <div className="space-y-2" data-kidsworlds>
            <span className="text-xs font-black uppercase tracking-wider text-surface-600">
              {t('kids.worldsTitle', 'Story worlds (one press fills it in)')}
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUICK_STORY_SEEDS.map((seed) => (
                <button
                  key={seed.id}
                  type="button"
                  onClick={() => applySeed(seed.id)}
                  data-kidsworld={seed.id}
                  className="flex items-center gap-2.5 rounded-2xl border-2 border-cyan-500/60 bg-surface-100/90 px-3 py-2.5 text-left transition-transform hover:-translate-y-1 hover:border-cyan-300"
                >
                  <span className="text-3xl" aria-hidden>{seed.emoji}</span>
                  <span className="min-w-0 text-xs font-black leading-tight text-surface-950">{t(seed.label[0], seed.label[1])}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={spinAll}
                disabled={spinning}
                className="flex items-center gap-2.5 rounded-2xl border-2 border-primary-400 bg-primary-500/15 px-3 py-2.5 text-left text-xs font-black text-surface-950 disabled:opacity-50"
              >
                <Dices className={`h-6 w-6 text-primary-300 ${spinning ? 'animate-spin' : ''}`} />
                <span>{t('kids.magicSpinAll', 'Mystery Spin!')}</span>
              </button>
            </div>
          </div>

          {/* Stepper Tabs */}
          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            {[0, 1, 2, 3, 4].map((stepIdx) => {
              const titles = [
                t('kids.secHero', 'Hero'),
                t('kids.secPlace', 'Place'),
                t('kids.secSecret', 'Secret'),
                t('kids.secEnding', 'Ending'),
                t('kids.secVisuals', 'Visuals'),
              ];
              const icons = ['🦸', '🗺️', '✨', '🏆', '🎨'];
              const isCurrent = activeStep === stepIdx;
              const isDone = activeStep > stepIdx;
              return (
                <button
                  key={stepIdx}
                  type="button"
                  onClick={() => setActiveStep(stepIdx)}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2 px-1 text-center transition-all ${
                    isCurrent
                      /* The kids room flips the neutral ramp for its dark
                         look and leaves the accent alone, so `primary-950`
                         is a dark pink on a dark tile here. The neutral
                         `surface-950` is what reads as the light text. */
                      ? 'border-2 border-primary-500 bg-primary-500/15 shadow-xs scale-102 font-black text-surface-950'
                      : isDone
                        ? 'border border-surface-300 bg-surface-100/90 font-bold text-surface-800'
                        : 'border border-surface-200 bg-surface-100/40 text-surface-500'
                  }`}
                >
                  <span className="text-lg">{icons[stepIdx]}</span>
                  <span className="text-[10px] sm:text-xs truncate w-full">{titles[stepIdx]}</span>
                </button>
              );
            })}
          </div>

          {/* ── Section Content: Steps 0..3 (Storyline Sections) ───── */}
          {activeStep >= 0 && activeStep <= 3 && (
            <div className="space-y-4 pt-2">
              {(() => {
                const section = STORY_SECTIONS[activeStep];
                const currentPick = [hero, setting, twist, ending][activeStep];
                const setPick = [setHero, setSetting, setTwist, setEnding][activeStep];

                return (
                  <div>
                    <div className="mb-3">
                      <h3 className="text-base sm:text-lg font-black text-surface-950">
                        {t(section.title[0], section.title[1])}
                      </h3>
                      <p className="text-xs sm:text-sm font-bold text-surface-700">
                        {t(section.prompt[0], section.prompt[1])}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" data-kidsstorycards>
                      {cardsNow(section).map((choice) => {
                        const isPicked = currentPick === choice.id;
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() => setPick(choice.id)}
                            className={`flex items-start gap-3 rounded-2xl p-3.5 text-left transition-all ${
                              isPicked
                                /* A pink tint, not `primary-50`: the card's
                                   words are the room's light text, and on a
                                   pale pink they all but vanished — the
                                   chosen hero was the one card nobody could
                                   read (20 October 2026). */
                                ? 'border-3 border-primary-500 bg-primary-500/20 shadow-md scale-101'
                                : 'border-2 border-surface-200 bg-surface-50 hover:border-surface-300'
                            }`}
                          >
                            <span
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-xs"
                              style={{
                                background: `linear-gradient(135deg, ${choice.paint.from}, ${choice.paint.to})`,
                                color: choice.paint.ink,
                              }}
                            >
                              {choice.emoji}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-sm font-black text-surface-950 truncate">
                                  {t(choice.title[0], choice.title[1])}
                                </h4>
                                {isPicked && (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-white">
                                    <Check className="h-3 w-3" />
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs font-semibold text-surface-600 line-clamp-2">
                                {t(choice.blurb[0], choice.blurb[1])}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                  disabled={activeStep === 0}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-surface-300 px-4 text-xs font-bold text-surface-700 disabled:opacity-30"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{t('kids.backStep', 'Back')}</span>
                </button>
                <button
                  type="button"
                  data-kidsstorynext
                  onClick={() => setActiveStep((s) => s + 1)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-primary-500 px-5 text-xs font-black text-white shadow-md hover:bg-primary-600 transition-colors"
                >
                  <span>{activeStep === 3 ? t('kids.toVisuals', 'Next: Choose Visuals 🎨') : t('kids.next', 'Next ➡️')}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Visual Style Suggestions ────────────────────── */}
          {activeStep === 4 && (
            <div className="space-y-4 pt-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-surface-950">
                  {t('kids.visualTitle', 'Step 5: Choose Visual Style')}
                </h3>
                <p className="text-xs sm:text-sm font-bold text-surface-700">
                  {t('kids.visualPrompt', 'How should the illustrations in your storybook look?')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VISUAL_STYLES.map((vStyle: VisualStyle) => {
                  const isPicked = visual === vStyle.id;
                  return (
                    <button
                      key={vStyle.id}
                      type="button"
                      onClick={() => setVisual(vStyle.id)}
                      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 text-left transition-all ${
                        isPicked
                          ? 'border-4 border-primary-500 shadow-lg scale-102 bg-surface-50'
                          : 'border-2 border-surface-200 bg-surface-100/80 hover:border-surface-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* The meerkat in that style, the emoji small beside it. */}
                        <span className="flex items-center gap-2">
                          <StyleTile id={STORY_STYLE_TILE[vStyle.id] ?? 'cartoon'} size={64} />
                          <span className="text-xl">{vStyle.emoji}</span>
                        </span>
                        <span className="rounded-full bg-surface-200/90 px-2.5 py-0.5 text-[11px] font-black text-surface-800">
                          {t(vStyle.badge[0], vStyle.badge[1])}
                        </span>
                      </div>
                      <div className="mt-3">
                        <h4 className="text-sm font-black text-surface-950">
                          {t(vStyle.name[0], vStyle.name[1])}
                        </h4>
                        <p className="mt-1 text-xs font-medium text-surface-600">
                          {t(vStyle.desc[0], vStyle.desc[1])}
                        </p>
                      </div>
                      <div
                        className={`mt-3 h-2 w-full rounded-full bg-linear-to-r ${vStyle.bgGradient}`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* ── Who reads it ─────────────────────────────────────────
                  The owner, 19 October 2026: "Dalk 'n paar avatar stemme
                  opstel." Four storytellers to pick from, each one heard
                  before a credit is spent. */}
              <div className="space-y-2 pt-2" data-kidsstorytellers>
                <h3 className="text-base sm:text-lg font-black text-surface-950">
                  {t('kids.whoReads', 'Who reads your story?')}
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {STORYTELLERS.map((one) => {
                    const picked = storyteller === one.id;
                    return (
                      <div
                        key={one.id}
                        className={`relative flex flex-col items-center gap-1 rounded-2xl p-3 text-center transition-all ${
                          picked ? 'border-4 border-primary-500 bg-surface-50 shadow-lg' : 'border-2 border-surface-200 bg-surface-100/80'
                        }`}
                        style={picked ? { boxShadow: `0 0 18px ${one.glow}` } : undefined}
                      >
                        <button
                          type="button"
                          data-kidsstoryteller={one.id}
                          aria-pressed={picked}
                          onClick={() => setStoryteller(one.id)}
                          className="flex w-full flex-col items-center gap-1"
                        >
                          <span className={`text-4xl ${picked ? 'fb-story-talk' : ''}`} aria-hidden>{one.emoji}</span>
                          <span className="text-sm font-black text-surface-950">{t(one.name[0], one.name[1])}</span>
                          <span className="text-[11px] font-semibold leading-tight text-surface-600">{t(one.about[0], one.about[1])}</span>
                        </button>
                        {samples[one.id] && (
                          <button
                            type="button"
                            data-kidsvoicesample={one.id}
                            aria-pressed={sampling === one.id}
                            onClick={() => hear(one.id)}
                            aria-label={t('kids.hearVoice', 'Hear this voice')}
                            className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full border border-surface-300 bg-surface-50 text-surface-800"
                          >
                            <Volume2 className={`h-4 w-4 ${sampling === one.id ? 'animate-pulse' : ''}`} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Generate Story Button */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-surface-300 px-4 text-xs font-bold text-surface-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{t('kids.backStep', 'Back')}</span>
                </button>
                <button
                  type="button"
                  data-kidsstorybuild
                  onClick={() => void generateStory()}
                  disabled={building}
                  className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-linear-to-r from-amber-500 via-rose-500 to-purple-600 px-6 text-sm font-black text-white shadow-xl hover:opacity-95 transition-transform active:scale-95 disabled:opacity-50"
                >
                  {building ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>{t('kids.makingStory', 'Making Your Storybook…')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>{t('kids.makeMyStory', 'Create My Illustrated Story! ✨')}</span>
                      {/* What it costs, on the button: the pictures and the
                          voices, from the kids room's credits. The Story
                          Maker's own book, when the engine is off, costs
                          nothing to make and says no price. */}
                      {engineOn && (
                        <span data-kidsstoryprice className="rounded-full bg-surface-50/25 px-2 py-0.5 text-xs">
                          {t('kids.storyPrice', '{n} credits').replace('{n}', String(priceOf('story')))}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── The book being made ─────────────────────────────────────── */}
      {building && (
        <div className="space-y-4 pt-4" data-kidsmaking role="status" aria-live="polite">
          <div className="flex items-center gap-3 rounded-3xl border-2 border-amber-300 bg-surface-100/90 px-4 py-3">
            <span className="fb-kids-float text-4xl" aria-hidden>{making?.step === 'draw' ? '🎨' : '✍️'}</span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black text-surface-950">
                {making?.step === 'draw'
                  ? t('kids.makingDraw', 'Drawing the pages and recording the voices…')
                  : t('kids.makingWrite', 'Writing your story…')}
              </p>
              {making?.step === 'draw' && making.pages > 0 && (
                <p className="text-xs font-bold text-surface-700">
                  {t('kids.makingCount', '{drawn} of {pages} pictures · {voiced} of {pages} voices')
                    .replace('{drawn}', String(making.drawn.filter(Boolean).length))
                    .replace('{voiced}', String(making.voiced))
                    .replaceAll('{pages}', String(making.pages))}
                </p>
              )}
            </div>
          </div>
          <div className="fb-workbar relative h-2 overflow-hidden rounded-full bg-surface-200" aria-hidden />
          {making && making.pages > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: making.pages }, (_, i) => (
                <div key={i} data-kidsmakingpage={i} className="relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-surface-200 bg-surface-100">
                  {thumbs[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbs[i]} alt="" className="fb-story-pop h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-2xl" aria-hidden>
                      <span className="fb-kids-float">✨</span>
                    </span>
                  )}
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-surface-50/90 px-1.5 text-[11px] font-black text-surface-900">{i + 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step 5: the storybook, played ─────────────────────────────── */}
      {activeStep === 5 && story && !building && (
        <div className="space-y-4 pt-4" data-kidsreader>
          {notes.length > 0 && (
            <p data-kidsstorynote className="rounded-2xl border-2 border-amber-300/80 bg-surface-100 px-4 py-3 text-sm font-semibold text-surface-900">
              {notes[0]}
            </p>
          )}
          <KidsStoryPlayer
            story={story}
            actions={(
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleKeep()}
                  disabled={kept}
                  className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-black transition-colors ${
                    kept ? 'bg-rose-500 text-white shadow-xs' : 'border border-surface-300 bg-surface-50 text-surface-800'
                  }`}
                >
                  <Heart className="h-4 w-4" fill={kept ? 'currentColor' : 'none'} />
                  <span>{kept ? t('kids.keptIt', 'Kept') : t('kids.keepToShelf', 'Keep to shelf')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveStep(0); setStory(null); setNotes([]); }}
                  className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-surface-300 bg-surface-50 px-3 text-sm font-black text-surface-800"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{t('kids.makeAnother', 'Make Another Story')}</span>
                </button>
              </div>
            )}
          />
        </div>
      )}
    </div>
  );
}
