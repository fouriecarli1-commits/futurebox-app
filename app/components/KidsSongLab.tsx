'use client';

/**
 * The Song Lab: a child builds a song the way songs are built.
 *
 * The owner, 19 October 2026: *"Die bubbles moet weg, gebruik ander
 * kreatiewe maniere. Onthou very cool and futuristic vir kids."* And: more
 * than one thing to sing about, a style, a place, and the song broken into
 * verse, chorus and bridge with choices that teach what each part is for.
 *
 * The song's shape is drawn across the top as glowing blocks — verse, chorus,
 * verse, bridge, chorus — and each lights up as its part is chosen, so a
 * child sees a song being put together. The rules are in `lib/kidsongplan.ts`.
 */

import React, { useState } from 'react';
import { Check, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { KID_SOUNDS, KID_TOPICS } from '../lib/kidsong';
import { paintOf, SOUND_PAINTS } from '../lib/kidslook';
import {
  KID_PLACES, MOST_TOPICS, SONG_PARTS, SONG_SHAPE, toggled, type SongPart, type SongPlan,
} from '../lib/kidsongplan';

const TOPIC_EMOJI: Readonly<Record<string, string>> = {
  dog: '🐶', cat: '🐱', space: '🚀', birthday: '🎂', sea: '🌊', rain: '🌧️', brave: '🦸', dinos: '🦖',
  farm: '🐄', bedtime: '🌙', friends: '🤝', counting: '🔢', colours: '🌈', school: '🏫',
};
const SOUND_EMOJI: Readonly<Record<string, string>> = {
  happy: '😄', quiet: '🤫', rock: '🎸', dance: '🕺', march: '🥁', funny: '🤡', country: '🤠', kwaito: '🔊',
  musicbox: '🎶', spacesynth: '👾', rap: '🎤', marimba: '🪘', reggae: '🌴', disco: '🪩',
};
/** Each part's light: the same on any theme. */
const PART_GLOW: Readonly<Record<SongPart['id'], string>> = { verse: '#22d3ee', chorus: '#e879f9', bridge: '#facc15' };

type Step = 'about' | 'sound' | 'place' | SongPart['id'];
const STEPS: readonly { readonly id: Step; readonly emoji: string; readonly says: readonly [string, string] }[] = [
  { id: 'about', emoji: '⭐', says: ['kids.labAbout', 'About'] },
  { id: 'sound', emoji: '🎚️', says: ['kids.labSound', 'Style'] },
  { id: 'place', emoji: '🌍', says: ['kids.labPlace', 'Where'] },
  { id: 'verse', emoji: '📖', says: ['kids.partVerse', 'Verse'] },
  { id: 'chorus', emoji: '🎤', says: ['kids.partChorus', 'Chorus'] },
  { id: 'bridge', emoji: '🌉', says: ['kids.partBridge', 'Bridge'] },
];

export default function KidsSongLab({
  plan,
  own,
  onPlan,
  off,
  making,
  canMake,
  price,
  onMake,
}: {
  readonly plan: SongPlan;
  /** The child's own words from the box above, said in the sentence too. */
  readonly own: string;
  readonly onPlan: (next: SongPlan) => void;
  readonly off: boolean;
  readonly making: boolean;
  readonly canMake: boolean;
  readonly price: number;
  readonly onMake: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const [step, setStep] = useState<Step>('about');
  const done = (one: Step): boolean => (one === 'about' ? plan.topics.length > 0 : Boolean(plan[one]));
  const part = SONG_PARTS.find((one) => one.id === step) ?? null;
  const next = STEPS[STEPS.findIndex((one) => one.id === step) + 1];

  const topicsSaid = plan.topics
    .map((id) => KID_TOPICS.find((one) => one.id === id))
    .filter(Boolean)
    .map((one) => t(one!.says[0], one!.says[1]));
  const sound = KID_SOUNDS.find((one) => one.id === plan.sound);
  const place = KID_PLACES.find((one) => one.id === plan.place);

  const tile = (id: string, on: boolean, emoji: string, label: string, pick: () => void, glow = '#22d3ee'): React.ReactElement => (
    <button
      key={id}
      type="button"
      data-kidssongtile={id}
      aria-pressed={on}
      disabled={off}
      onClick={pick}
      className="fb-holo flex min-h-[84px] flex-col items-center justify-center gap-1 px-2 py-2 text-center disabled:opacity-40"
      style={on ? { ['--holo' as string]: glow } as React.CSSProperties : undefined}
    >
      <span className="text-3xl leading-none" aria-hidden>{emoji}</span>
      <span className="text-xs font-black leading-tight text-surface-950">{label}</span>
      {on && <Check className="absolute right-1.5 top-1.5 h-4 w-4 text-surface-950" aria-hidden />}
    </button>
  );

  return (
    <section className="fb-holo-panel space-y-4 p-4 sm:p-5" data-kidssonglab>
      <header className="flex items-center gap-3">
        <span className="fb-kids-float text-4xl" aria-hidden>🧪</span>
        <div>
          <h3 className="text-lg font-black tracking-wide text-surface-950">{t('kids.labTitle', 'Song Lab')}</h3>
          <p className="text-xs font-bold text-surface-700">{t('kids.labWhy', 'Build your song piece by piece, then press Make.')}</p>
        </div>
      </header>

      {/* ── The song's shape, as glowing blocks ──────────────────────────── */}
      <div className="flex items-stretch gap-1.5" data-kidssongshape aria-label={t('kids.labShape', 'How a song is built')}>
        {SONG_SHAPE.map((id, at) => {
          const piece = SONG_PARTS.find((one) => one.id === id)!;
          const lit = Boolean(plan[id]);
          return (
            <button
              key={`${id}-${at}`}
              type="button"
              data-kidsshapeblock={id}
              onClick={() => setStep(id)}
              className={`fb-shape-block flex min-h-[52px] flex-1 flex-col items-center justify-center rounded-xl text-[11px] font-black ${lit ? 'is-lit' : ''}`}
              style={{ ['--glow' as string]: PART_GLOW[id] } as React.CSSProperties}
            >
              <span aria-hidden className="text-base">{piece.emoji}</span>
              {t(piece.says[0], piece.says[1])}
            </button>
          );
        })}
      </div>

      {/* ── The steps ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-1" data-kidssongsteps>
        {STEPS.map((one) => (
          <button
            key={one.id}
            type="button"
            data-kidssongstep={one.id}
            aria-pressed={step === one.id}
            onClick={() => setStep(one.id)}
            className={`fb-step flex min-h-[48px] flex-col items-center justify-center rounded-xl text-[10px] font-black sm:text-xs ${step === one.id ? 'is-on' : ''}`}
          >
            <span aria-hidden className="text-base">{done(one.id) ? '✅' : one.emoji}</span>
            <span className="w-full truncate">{t(one.says[0], one.says[1])}</span>
          </button>
        ))}
      </div>

      {/* ── What this step is for, and its choices ───────────────────────── */}
      {step === 'about' && (
        <div className="space-y-2">
          <p className="text-sm font-black text-surface-950">
            {t('kids.labAboutAsk', 'What is your song about? Pick up to {n}.').replace('{n}', String(MOST_TOPICS))}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" data-kidstopics>
            {KID_TOPICS.map((one) => tile(one.id, plan.topics.includes(one.id), TOPIC_EMOJI[one.id] ?? '🎵',
              t(one.says[0], one.says[1]), () => onPlan({ ...plan, topics: toggled(plan.topics, one.id) })))}
          </div>
        </div>
      )}
      {step === 'sound' && (
        <div className="space-y-2">
          <p className="text-sm font-black text-surface-950">{t('kids.labSoundAsk', 'How should it sound?')}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" data-kidssounds>
            {KID_SOUNDS.map((one) => tile(one.id, plan.sound === one.id, SOUND_EMOJI[one.id] ?? '🎵',
              t(one.says[0], one.says[1]), () => onPlan({ ...plan, sound: one.id }), paintOf(SOUND_PAINTS, one.id).from))}
          </div>
        </div>
      )}
      {step === 'place' && (
        <div className="space-y-2">
          <p className="text-sm font-black text-surface-950">{t('kids.labPlaceAsk', 'Where does your song happen?')}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" data-kidsplaces>
            {KID_PLACES.map((one) => tile(one.id, plan.place === one.id, one.emoji,
              t(one.says[0], one.says[1]), () => onPlan({ ...plan, place: plan.place === one.id ? '' : one.id })))}
          </div>
        </div>
      )}
      {part && (
        <div className="space-y-2" data-kidssongpart={part.id}>
          <div className="fb-holo-note flex items-start gap-3 px-3.5 py-3" style={{ ['--glow' as string]: PART_GLOW[part.id] } as React.CSSProperties}>
            <span className="text-3xl" aria-hidden>{part.emoji}</span>
            <p className="text-sm font-bold leading-snug text-surface-950">
              <span className="font-black">{t(part.says[0], part.says[1])}: </span>
              {t(part.what[0], part.what[1])}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {part.choices.map((one) => tile(`${part.id}-${one.id}`, plan[part.id] === one.id, one.emoji,
              t(one.says[0], one.says[1]), () => onPlan({ ...plan, [part.id]: plan[part.id] === one.id ? '' : one.id }), PART_GLOW[part.id]))}
          </div>
        </div>
      )}
      {next && (
        <button
          type="button"
          data-kidssongnext
          onClick={() => setStep(next.id)}
          className="fb-step ml-auto flex min-h-[44px] items-center gap-1 rounded-xl px-4 text-sm font-black"
        >
          {t('kids.labNext', 'Next')}: {t(next.says[0], next.says[1])} <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* ── The song so far, said as one sentence ───────────────────────── */}
      <p data-kidssentence className="fb-holo-note px-3.5 py-3 text-center text-base font-black leading-snug text-surface-950">
        {sound ? `${t(sound.says[0], sound.says[1])} · ` : ''}
        <span data-kidssentencetopic>
          {[...topicsSaid, ...(own.trim() ? [own.trim()] : [])].join(' + ') || t('kids.something', 'something')}
        </span>
        {place ? ` · ${t(place.says[0], place.says[1])}` : ''}
      </p>

      <button
        type="button"
        onClick={onMake}
        disabled={!canMake}
        data-kidsmake
        className="fb-make-orb mx-auto flex min-h-[64px] w-full max-w-sm items-center justify-center gap-2 rounded-full px-6 text-base font-black disabled:opacity-40"
      >
        {making ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
        {making ? t('kids.making', 'Making your song…') : t('kids.make', 'Make my song')}
        {!making && (
          <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: 'rgba(0,0,0,0.25)' }} data-kidssongprice>
            {t('kids.creditsN', '{n} credits').replace('{n}', String(price))}
          </span>
        )}
      </button>
    </section>
  );
}
