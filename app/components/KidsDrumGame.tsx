'use client';

/**
 * Be the drummer: the band plays, the notes slide to the line, the pads are
 * the drums. Units unlock one after another, and every try wins an award.
 *
 * The owner, 19 October 2026, with two screenshots of a drum trainer: *"Ons
 * kan so game by sit by studio en beats. Daar moet lekker musiek met elektric
 * guitar byvoorbeeld speel, en die push van die buttons is die dromme vir die
 * liedjie en hou dan die beat. Onthou die awards wat kinders wen met elke
 * try."* The rules are in `lib/kidsdrums.ts`, the band in `lib/kidsband.ts`.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { confetti } from '../lib/kidsconfetti';
import {
  AWARDS, COUNT_IN, DRUM_SONGS, DRUMS_KEY, GOOD_MS, LANES, NO_DRUMS, afterTry, eighthMs, judge, noteFor,
  readDrums, starsFor, type Award, type DrumsKept, type Hit, type Lane,
} from '../lib/kidsdrums';
import { clock, drum, startBand, type Band } from '../lib/kidsband';

/* The game's own night sky, as in her screenshots: literal colours, the same
   on any theme. */
const NIGHT = 'linear-gradient(180deg, #1e1b4b 0%, #0b0a3a 55%, #050427 100%)';
const LANE_GLOW = 'rgba(255,255,255,0.06)';
/** How far one eighth note is on the track, in pixels. */
const STEP_PX = 46;
/** Where the line is, from the left. */
const LINE_AT = 0.22;
const KEYS: Readonly<Record<string, Lane>> = { a: 'hat', s: 'snare', d: 'kick', 1: 'hat', 2: 'snare', 3: 'kick' };

function loadKept(): DrumsKept {
  try {
    return readDrums(JSON.parse(localStorage.getItem(DRUMS_KEY) ?? 'null'));
  } catch {
    return NO_DRUMS;
  }
}

export default function KidsDrumGame({ onSpark }: { readonly onSpark: (n: number) => void }): React.ReactElement {
  const { t } = useLang();
  const [kept, setKept] = useState<DrumsKept>(NO_DRUMS);
  useEffect(() => setKept(loadKept()), []);
  const [songId, setSongId] = useState(DRUM_SONGS[0].id);
  const song = DRUM_SONGS.find((one) => one.id === songId) ?? DRUM_SONGS[0];
  const open = kept.open[song.id] ?? 1;
  const [unit, setUnit] = useState(1);
  /* The furthest unit open, when a song is chosen — and only then: a unit
     opened by a try is moved to by Continue, not under the child's feet. */
  useEffect(() => {
    setUnit(Math.min(loadKept().open[song.id] ?? 1, song.units.length));
  }, [song.id, song.units.length]);
  const notes = song.units[unit - 1].notes;
  const eighth = eighthMs(song.bpm);

  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [now, setNow] = useState(-COUNT_IN);
  const [played, setPlayed] = useState<ReadonlyMap<number, Hit>>(new Map());
  const [flash, setFlash] = useState<{ lane: Lane; hit: Hit; at: number } | null>(null);
  const [pressed, setPressed] = useState<Lane | null>(null);
  const [result, setResult] = useState<{ award: Award; unlocked: boolean; stars: number } | null>(null);

  const band = useRef<Band | null>(null);
  const frame = useRef(0);
  const hits = useRef(new Map<number, Hit>());
  const streak = useRef({ now: 0, most: 0 });

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    band.current?.stop();
    band.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  const finish = useCallback(() => {
    stop();
    const all = [...hits.current.values()];
    const score = {
      perfect: all.filter((one) => one === 'perfect').length,
      good: all.filter((one) => one === 'good').length,
      total: notes.length,
      streak: streak.current.most,
    };
    const was = loadKept();
    const next = afterTry(was, song, unit, score, Date.now());
    try { localStorage.setItem(DRUMS_KEY, JSON.stringify(next.kept)); } catch { /* the award still shows */ }
    setKept(next.kept);
    const stars = starsFor(score);
    setResult({ award: next.award, unlocked: next.unlocked, stars });
    setPhase('done');
    onSpark(2 + stars * 5);
    if (next.unlocked || stars === 3) confetti();
  }, [notes.length, onSpark, song, stop, unit]);

  const play = (): void => {
    stop();
    hits.current = new Map();
    streak.current = { now: 0, most: 0 };
    setPlayed(new Map());
    setResult(null);
    setFlash(null);
    const started = startBand(song);
    band.current = started;
    setPhase('playing');
    const begin = started?.start ?? clock() + (COUNT_IN * eighth) / 1000;
    const end = started?.end ?? begin + (notes[notes.length - 1].at + 2) * (eighth / 1000);
    const tick = (): void => {
      const at = (clock() - begin) / (eighth / 1000);
      setNow(at);
      /* A note gone past the line unplayed is a miss, and ends a streak. */
      let missed = false;
      notes.forEach((note, index) => {
        if (!hits.current.has(index) && (at - note.at) * eighth > GOOD_MS) {
          hits.current.set(index, 'miss');
          missed = true;
        }
      });
      if (missed) {
        streak.current.now = 0;
        setPlayed(new Map(hits.current));
      }
      if (clock() >= end + 0.35) { finish(); return; }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  const hit = useCallback((lane: Lane): void => {
    drum(lane);
    setPressed(lane);
    setTimeout(() => setPressed((was) => (was === lane ? null : was)), 120);
    if (phase !== 'playing' || !band.current) return;
    const at = (clock() - band.current.start) / (eighth / 1000);
    const found = noteFor(notes, new Set(hits.current.keys()), lane, at, eighth);
    if (!found) return;
    const how = judge(found.off);
    hits.current.set(found.index, how);
    if (how === 'miss') streak.current.now = 0;
    else {
      streak.current.now += 1;
      streak.current.most = Math.max(streak.current.most, streak.current.now);
    }
    setPlayed(new Map(hits.current));
    setFlash({ lane, hit: how, at: Date.now() });
  }, [eighth, notes, phase]);

  useEffect(() => {
    const down = (event: KeyboardEvent): void => {
      const lane = KEYS[event.key.toLowerCase()];
      if (!lane || event.repeat) return;
      event.preventDefault();
      hit(lane);
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [hit]);

  const countdown = phase === 'playing' && now < 0 ? Math.ceil(-now / 2) : 0;
  const nextUnit = (): void => {
    setPhase('ready');
    setNow(-COUNT_IN);
    if (result?.unlocked) setUnit((was) => Math.min(song.units.length, was + 1));
    setResult(null);
  };

  return (
    <section
      data-kidsdrums
      className="overflow-hidden rounded-3xl border-2 border-cyan-400/50 text-white shadow-xl"
      style={{ background: NIGHT }}
    >
      {/* ── The top: which song, which unit ───────────────────────────── */}
      <header className="flex items-center gap-3 px-4 pt-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-3xl" style={{ background: '#0b0a2a', boxShadow: '0 0 18px rgba(250,204,21,0.55)' }} aria-hidden>
          {song.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-black">{t(song.says[0], song.says[1])}</p>
          <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.7)' }} data-drumunit={unit}>
            {t('drums.unitOf', 'Unit {n} of {all}').replace('{n}', String(unit)).replace('{all}', String(song.units.length))}
            {' · '}{t(song.units[unit - 1].says[0], song.units[unit - 1].says[1])}
          </p>
        </div>
        <button
          type="button"
          data-drumrestart
          onClick={() => { stop(); setPhase('ready'); setNow(-COUNT_IN); setResult(null); }}
          aria-label={t('drums.restart', 'Start again')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ color: 'rgba(255,255,255,0.8)' }}
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </header>

      <div className="flex flex-wrap gap-2 px-4 pt-3">
        {DRUM_SONGS.map((one) => (
          <button
            key={one.id}
            type="button"
            data-drumsong={one.id}
            aria-pressed={one.id === song.id}
            disabled={phase === 'playing'}
            onClick={() => { setSongId(one.id); setPhase('ready'); setResult(null); setNow(-COUNT_IN); }}
            className="min-h-[40px] rounded-full px-3 text-xs font-black disabled:opacity-50"
            style={one.id === song.id
              ? { background: '#facc15', color: '#1e1b4b' }
              : { background: 'rgba(255,255,255,0.1)', color: '#ffffff' }}
          >
            {one.icon} {t(one.says[0], one.says[1])}
          </button>
        ))}
      </div>

      {/* ── The line and the lanes ────────────────────────────────────── */}
      <div className="relative mt-4 h-[200px] select-none" aria-hidden data-drumtrack>
        <p className="absolute inset-x-0 top-0 z-20 px-4 text-center text-2xl font-black leading-tight" data-drumsays>
          {phase === 'ready' && t('drums.ready', 'You are the drummer! Press play.')}
          {countdown > 0 && <span className="fb-story-pop inline-block text-5xl" key={countdown}>{countdown}</span>}
          {phase === 'done' && result && (
            result.unlocked
              ? t('drums.unlocked', 'Great, Unit {n} unlocked!').replace('{n}', String(unit + 1))
              : result.stars >= 1 ? t('drums.nice', 'Nice drumming!') : t('drums.tryAgain', 'Good try! Have another go.')
          )}
        </p>
        <div className="absolute inset-x-0 bottom-0 top-12">
          {LANES.map((lane, row) => (
            <div key={lane.id} className="absolute inset-x-0" style={{ top: `${row * 33.3}%`, height: '33.3%', background: row % 2 ? 'transparent' : LANE_GLOW }} />
          ))}
          <div className="absolute bottom-0 top-0 z-10 w-1 rounded-full" style={{ left: `${LINE_AT * 100}%`, background: '#ffffff', boxShadow: '0 0 12px #ffffff' }}>
            <span className="absolute -left-2 -top-2 h-5 w-5 rounded-full" style={{ background: '#ffffff' }} />
            <span className="absolute -bottom-2 -left-2 h-5 w-5 rounded-full" style={{ background: '#ffffff' }} />
          </div>
          {notes.map((note, index) => {
            const x = (note.at - now) * STEP_PX;
            if (x < -80 || x > 900) return null;
            const row = LANES.findIndex((one) => one.id === note.lane);
            const look = LANES[row];
            const how = played.get(index);
            return (
              <span
                key={index}
                data-drumnote={how ?? 'waiting'}
                data-drumlane={note.lane}
                className="absolute flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-lg text-lg transition-opacity"
                style={{
                  left: `calc(${LINE_AT * 100}% + ${x}px)`,
                  top: `calc(${row * 33.3 + 16.6}% - 20px)`,
                  background: look.colour,
                  boxShadow: `0 0 ${how && how !== 'miss' ? 26 : 12}px ${look.colour}`,
                  opacity: how === 'miss' ? 0.25 : how ? 0.5 : 1,
                  transform: how && how !== 'miss' ? 'translateX(-50%) scale(1.35)' : undefined,
                }}
              >
                {look.emoji}
              </span>
            );
          })}
          {flash && Date.now() - flash.at < 600 && (
            <span
              key={flash.at}
              className="fb-story-pop absolute z-20 text-lg font-black"
              data-drumflash={flash.hit}
              style={{
                left: `${LINE_AT * 100 + 4}%`,
                top: `${LANES.findIndex((one) => one.id === flash.lane) * 33.3}%`,
                color: flash.hit === 'perfect' ? '#facc15' : flash.hit === 'good' ? '#a7f3d0' : 'rgba(255,255,255,0.6)',
              }}
            >
              {flash.hit === 'perfect' ? t('drums.perfect', 'Perfect!') : flash.hit === 'good' ? t('drums.good', 'Good!') : t('drums.oops', 'Oops')}
            </span>
          )}
        </div>
      </div>

      {/* ── The button in the middle: play, or the award and go on ────── */}
      <div className="px-4 pt-4">
        {phase === 'done' && result ? (
          <div className="space-y-3" data-drumresult>
            <div className="flex items-center justify-center gap-1 text-3xl" aria-label={`${result.stars} / 3`}>
              {[1, 2, 3].map((n) => <span key={n} style={{ opacity: n <= result.stars ? 1 : 0.25 }}>⭐</span>)}
            </div>
            <div className="fb-story-pop flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(250,204,21,0.15)', border: '2px solid #facc15' }} data-drumaward={result.award.id}>
              <span className="text-4xl" aria-hidden>{result.award.icon}</span>
              <span className="text-base font-black">{t(result.award.says[0], result.award.says[1])}</span>
            </div>
            <button
              type="button"
              data-drumcontinue
              onClick={nextUnit}
              className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-full text-lg font-black"
              style={{ background: 'linear-gradient(90deg, #fde047, #facc15)', color: '#1e1b4b', boxShadow: '0 0 24px rgba(250,204,21,0.6)' }}
            >
              {t('drums.continue', 'Continue when ready')} ›
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-drumplay
            disabled={phase === 'playing'}
            onClick={play}
            className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-full text-lg font-black disabled:opacity-40"
            style={{ background: 'linear-gradient(90deg, #fde047, #facc15)', color: '#1e1b4b', boxShadow: '0 0 24px rgba(250,204,21,0.6)' }}
          >
            <Play className="h-5 w-5" fill="currentColor" /> {phase === 'playing' ? t('drums.playing', 'Keep the beat!') : t('drums.play', 'Play')}
          </button>
        )}
      </div>

      {/* ── The drums ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {LANES.map((lane) => (
          <button
            key={lane.id}
            type="button"
            data-drumpad={lane.id}
            onPointerDown={(event) => { event.preventDefault(); hit(lane.id); }}
            aria-label={t(lane.says[0], lane.says[1])}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl text-3xl font-black transition-transform"
            style={{
              background: pressed === lane.id
                ? `radial-gradient(circle, #ffffff 0%, ${lane.colour} 55%)`
                : `radial-gradient(circle, ${lane.colour}55 0%, #0b0a3a 75%)`,
              border: `2px solid ${lane.colour}`,
              boxShadow: pressed === lane.id ? `0 0 30px ${lane.colour}` : 'none',
              transform: pressed === lane.id ? 'scale(0.94)' : undefined,
              touchAction: 'manipulation',
            }}
          >
            <span aria-hidden>{lane.emoji}</span>
            <span className="text-xs">{t(lane.says[0], lane.says[1])}</span>
          </button>
        ))}
      </div>

      {/* ── The units, and the awards won ─────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 pb-3" data-drumdots>
        {song.units.map((one) => (
          <button
            key={one.id}
            type="button"
            data-drumdot={one.id}
            aria-pressed={one.id === unit}
            disabled={one.id > open || phase === 'playing'}
            onClick={() => { setUnit(one.id); setPhase('ready'); setResult(null); setNow(-COUNT_IN); }}
            aria-label={t('drums.unitOf', 'Unit {n} of {all}').replace('{n}', String(one.id)).replace('{all}', String(song.units.length))}
            className="h-11 min-w-[44px] px-1"
          >
            <span className="block h-3 rounded-full" style={{
              width: one.id === unit ? 44 : 32,
              background: one.id > open ? 'rgba(255,255,255,0.18)' : one.id === unit ? '#ffffff' : 'rgba(255,255,255,0.55)',
            }} />
          </button>
        ))}
      </div>
      {kept.awards.length > 0 && (
        <div className="border-t px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.12)' }} data-drumawards>
          <p className="text-xs font-black uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {t('drums.awards', 'Your drum awards: {n}').replace('{n}', String(kept.awards.length))}
          </p>
          <p className="mt-1 flex flex-wrap gap-1 text-2xl">
            {kept.awards.slice(0, 12).map((one, i) => (
              <span key={`${one.at}-${i}`} title={(() => { const award = AWARDS.find((a) => a.id === one.id); return award ? t(award.says[0], award.says[1]) : ''; })()}>
                {AWARDS.find((award) => award.id === one.id)?.icon}
              </span>
            ))}
          </p>
        </div>
      )}
    </section>
  );
}
