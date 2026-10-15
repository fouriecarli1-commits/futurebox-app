'use client';

/**
 * Interactive Storyboard for Kids.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 12 October 2026: *"Ek dink met 'n story board moet daar na
 * prompting 'n page op kom wat dan storielyn suggestions op gooi, dan het
 * elke seksie 4 keuses, en dan bou hulle self die storie lyn. Dieselfde
 * direk daarna wanneer die visuals vir die storie gekies moet word, dan moet
 * daar ook visual suggestions op kom. Dit moet interactive wees, en ek dink
 * daai spin, en spelletjies wat dit fun en interactive en spellerig maak
 * gaan hulle engaged hou."*
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, Dices, Heart, Loader2,
  Palette, Play, RotateCcw, Sparkles, Volume2, X,
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import {
  buildStoryboardStory,
  QUICK_STORY_SEEDS,
  STORY_SECTIONS,
  VISUAL_STYLES,
  type VisualStyle,
} from '../lib/kidsstoryboard';
import { keepStory, type KeptStory } from '../lib/storykeep';
import { readAloud, stopReading } from '../lib/kidspip';

export default function KidsStoryboard({
  onDone,
  onStoryKept,
}: {
  readonly onDone: () => void;
  readonly onStoryKept?: () => void;
}): React.ReactElement {
  const { lang, t } = useLang();

  /* Chosen selections for the 4 sections */
  const [hero, setHero] = useState<string>('cat');
  const [setting, setSetting] = useState<string>('rainbow-planet');
  const [twist, setTwist] = useState<string>('alien-ship');
  const [ending, setEnding] = useState<string>('great-party');
  const [visual, setVisual] = useState<string>('3d-toon');

  /* Current wizard step: 0..3 for sections, 4 for visual style, 5 for reader */
  const [activeStep, setActiveStep] = useState<number>(0);
  const [spinning, setSpinning] = useState(false);
  const [building, setBuilding] = useState(false);
  const [story, setStory] = useState<KeptStory | null>(null);
  const [readerPage, setReaderPage] = useState(0);
  const [kept, setKept] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [noVoice, setNoVoice] = useState(false);

  /* Quick mystery spin across all sections */
  const spinAll = (): void => {
    setSpinning(true);
    setTimeout(() => {
      const randHero = STORY_SECTIONS[0].choices[Math.floor(Math.random() * 4)].id;
      const randSetting = STORY_SECTIONS[1].choices[Math.floor(Math.random() * 4)].id;
      const randTwist = STORY_SECTIONS[2].choices[Math.floor(Math.random() * 4)].id;
      const randEnding = STORY_SECTIONS[3].choices[Math.floor(Math.random() * 4)].id;
      const randVisual = VISUAL_STYLES[Math.floor(Math.random() * 4)].id;
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

  /* Build story */
  const generateStory = async (): Promise<void> => {
    setBuilding(true);
    try {
      const made = await buildStoryboardStory({
        heroId: hero,
        settingId: setting,
        twistId: twist,
        endingId: ending,
        visualStyleId: visual,
        lang: lang === 'af' ? 'af' : 'en',
        say: (pair) => t(pair[0], pair[1]),
      });
      setStory(made);
      setActiveStep(5);
      setReaderPage(0);
      setKept(false);
    } finally {
      setBuilding(false);
    }
  };

  /* Save to shelf */
  const handleKeep = async (): Promise<void> => {
    if (!story || kept) return;
    await keepStory(story);
    setKept(true);
    onStoryKept?.();
  };

  /* ── Read to me: the page aloud, then the next, to the end ──────────
     Carli, 15 October 2026: "Read to me werk nie." It played six seconds of
     chimes. Now the phone reads the page in its own voice and turns to the
     next page when it is done, so one press reads the whole book; another
     press stops it. Free: nothing leaves the phone. */
  const reading = useRef(false);
  const readFrom = (at: number): void => {
    if (!story || !reading.current) return;
    setReaderPage(at);
    const started = readAloud(story.pages[at].text, lang === 'af' ? 'af' : 'en', () => {
      if (!reading.current) return;
      if (at + 1 < story.pages.length) readFrom(at + 1);
      else { reading.current = false; setPlayingAudio(false); }
    });
    if (!started) { reading.current = false; setPlayingAudio(false); setNoVoice(true); }
  };
  const playPageSound = (): void => {
    if (!story) return;
    if (playingAudio) { reading.current = false; stopReading(); setPlayingAudio(false); return; }
    reading.current = true;
    setPlayingAudio(true);
    readFrom(readerPage);
  };
  const turnTo = (at: number): void => {
    reading.current = false;
    stopReading();
    setPlayingAudio(false);
    setReaderPage(at);
  };
  useEffect(() => () => { reading.current = false; stopReading(); }, []);
  /* One address per page picture, made once and let go of, instead of a new
     one on every draw. */
  const pictureUrl = useMemo(() => {
    const picture = story?.pages[readerPage]?.picture;
    return picture ? URL.createObjectURL(picture) : '';
  }, [story, readerPage]);
  useEffect(() => () => { if (pictureUrl) URL.revokeObjectURL(pictureUrl); }, [pictureUrl]);

  return (
    <div
      className="w-full max-w-3xl mx-auto rounded-3xl border-4 border-surface-200 bg-surface-50/95 p-4 sm:p-6 shadow-2xl backdrop-blur-md"
      data-kidsstoryboard
    >
      {/* ── Header Bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-b-2 border-surface-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-2xl shadow-sm">
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
      {activeStep < 5 && (
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
                      ? 'border-2 border-primary-500 bg-primary-500/15 shadow-sm scale-102 font-black text-primary-950'
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {section.choices.map((choice) => {
                        const isPicked = currentPick === choice.id;
                        return (
                          <button
                            key={choice.id}
                            type="button"
                            onClick={() => setPick(choice.id)}
                            className={`flex items-start gap-3 rounded-2xl p-3.5 text-left transition-all ${
                              isPicked
                                ? 'border-3 border-primary-500 bg-primary-50/90 shadow-md scale-101'
                                : 'border-2 border-surface-200 bg-surface-50 hover:border-surface-300'
                            }`}
                          >
                            <span
                              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm"
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
                        <span className="text-3xl">{vStyle.emoji}</span>
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
                        className={`mt-3 h-2 w-full rounded-full bg-gradient-to-r ${vStyle.bgGradient}`}
                      />
                    </button>
                  );
                })}
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
                  className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 px-6 text-sm font-black text-white shadow-xl hover:opacity-95 transition-transform active:scale-95 disabled:opacity-50"
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
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 5: Illustrated Storybook Viewer ───────────────────── */}
      {activeStep === 5 && story && (
        <div className="space-y-5 pt-4" data-kidsreader>
          {/* Story Title & Action header */}
          <div className="space-y-2 bg-surface-100/90 rounded-2xl p-3 border border-surface-200">
            <div className="min-w-0">
              <span className="text-[11px] font-black uppercase tracking-wider text-surface-600">
                {t('kids.pageCount', 'Page {current} of {total}')
                  .replace('{current}', String(readerPage + 1))
                  .replace('{total}', String(story.pages.length))}
              </span>
              <h3 className="text-base font-black leading-snug text-surface-950">
                {story.title}
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-kidsreadtome
                aria-pressed={playingAudio}
                onClick={playPageSound}
                className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-black transition-colors ${
                  playingAudio
                    ? 'border-purple-400 bg-purple-500 text-white animate-pulse'
                    : 'border-surface-300 bg-surface-50 text-surface-800'
                }`}
              >
                <Volume2 className="h-4 w-4" />
                <span>{playingAudio ? t('kids.readStop', 'Stop reading') : t('kids.readToMe', 'Read to me')}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleKeep()}
                disabled={kept}
                className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-black transition-colors ${
                  kept
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'border border-surface-300 bg-surface-50 text-surface-800'
                }`}
              >
                <Heart className="h-4 w-4" fill={kept ? 'currentColor' : 'none'} />
                <span>{kept ? t('kids.keptIt', 'Kept') : t('kids.keepToShelf', 'Keep to shelf')}</span>
              </button>
            </div>
          </div>

          {/* Book Page Card with SVG Illustration */}
          <div className="rounded-3xl border-4 border-surface-200 bg-surface-50 p-4 sm:p-6 shadow-xl">
            {/* Illustration */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-inner bg-surface-100 flex items-center justify-center">
              {pictureUrl && (
                <img
                  src={pictureUrl}
                  alt={story.title}
                  className="w-full h-full object-cover rounded-2xl"
                />
              )}
            </div>

            {/* Page Prose */}
            {/* On the room's own paper, not amber-50: on the dark kids theme
                the text colour is light, and light on pale cream was the
                unreadable page in Carli's screenshot. */}
            <div className="mt-5 rounded-2xl bg-surface-100 p-4 sm:p-5 border-2 border-amber-300/80">
              <p data-kidspagetext className="text-base sm:text-lg font-bold leading-relaxed text-surface-950">
                {story.pages[readerPage]?.text}
              </p>
            </div>
          </div>

          {/* Pagination Controls */}
          {noVoice && (
            <p className="rounded-2xl border-2 border-surface-200 bg-surface-100 px-4 py-3 text-sm font-semibold text-surface-900">
              {t('kids.noVoice', 'This phone has no reading voice switched on. A grown-up can turn on text-to-speech in the phone\u2019s settings.')}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => turnTo(Math.max(0, readerPage - 1))}
              disabled={readerPage === 0}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-surface-300 bg-surface-50 px-3 text-sm font-black text-surface-800 disabled:opacity-30"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('kids.prevPage', 'Previous Page')}</span>
            </button>

            <button
              type="button"
              onClick={() => turnTo(Math.min(story.pages.length - 1, readerPage + 1))}
              disabled={readerPage === story.pages.length - 1}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-primary-500 px-3 text-sm font-black text-white shadow-md hover:bg-primary-600 disabled:opacity-30"
            >
              <span>{t('kids.nextPage', 'Next Page')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                turnTo(0);
                setActiveStep(0);
                setStory(null);
              }}
              className="col-span-2 inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border-2 border-surface-200 bg-surface-100/90 px-3.5 text-sm font-black text-surface-700 hover:bg-surface-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t('kids.makeAnother', 'Make Another Story')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
