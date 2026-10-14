'use client';

/**
 * The guide: every room, what it makes, what a press costs, and the words.
 *
 * ── Whose idea ───────────────────────────────────────────────────────────
 *
 * Carli, 12 October 2026: *"Ek wonder of ons ook nie 'n tweede pop out
 * website moet maak waarin al die terms en funksies van ons website in
 * verduidelik word nie."*
 *
 * A page in this site rather than a second site, for the reason every rule
 * here keeps proving: two copies of one truth drift. The rooms are read off
 * `lib/surfaces.ts`, which is the list the copilot and the rail already use,
 * so a room added there and not here fails `check:guide`. Every number on
 * this page is `CREDITS.something`, never a digit typed into a sentence, so
 * the day a price moves the guide moves with it — `check:guide` refuses a
 * literal number before the word "credits" in this file.
 *
 * ── What it says, and what it does not ───────────────────────────────────
 *
 * One paragraph per room on what comes out of it and for whom; the presses
 * that cost credits, with the number; and a glossary of the words the rooms
 * use. It does not restate the terms — those are a page of their own and
 * are linked — and it does not promise anything a room cannot do, which is
 * why the paragraphs are written from each room's own `purpose` line.
 */

import React from 'react';
import Link from 'next/link';
import { useLang } from '../lib/i18n';
import { CREDITS, readCost } from '../lib/credits';
import { SURFACES, type SurfaceId } from '../lib/surfaces';

/** The rooms in the order the studio shows them, by the rail's own names. */
const ROOMS: readonly { readonly id: SurfaceId; readonly rail: string; readonly name: string }[] = [
  { id: 'make', rail: 'rail.make', name: 'Make a song' },
  { id: 'studio', rail: 'rail.studio', name: 'Studio' },
  { id: 'booth', rail: 'rail.booth', name: 'ProBooth' },
  { id: 'voice_studio', rail: 'rail.voice', name: 'Your voice' },
  { id: 'sound', rail: 'rail.sound', name: 'Sound trainer' },
  { id: 'canvas', rail: 'rail.canvas', name: 'Video desk' },
  { id: 'videoedit', rail: 'rail.videoedit', name: 'Video Editor' },
  { id: 'photo', rail: 'rail.photo', name: 'Photo Editor' },
  { id: 'hooks_feed', rail: 'rail.hooks', name: 'Hooks' },
  { id: 'channels', rail: 'rail.channel', name: 'Channel' },
  { id: 'live', rail: 'rail.live', name: 'Live' },
  { id: 'collab', rail: 'rail.collab', name: 'Collab Radar' },
  { id: 'podcast', rail: 'rail.podcast', name: 'Podcast' },
  { id: 'campaign', rail: 'rail.campaign', name: 'Adverts' },
  { id: 'albumart', rail: 'rail.albumart', name: 'Album art' },
];

/** Something a press costs: the label's key and fallback, and the number from the table. */
type Price = { readonly key: string; readonly en: string; readonly credits: number };

/* Every number here is read off CREDITS. A room with no row in this map runs
   on the phone and costs nothing, and the page says so. */
const PRICES: Readonly<Partial<Record<SurfaceId, readonly Price[]>>> = {
  make: [
    { key: 'guide.p.song', en: 'A two-minute song', credits: CREDITS.song },
    { key: 'guide.p.halfSong', en: 'A one-minute half song', credits: CREDITS.halfSong },
    { key: 'guide.p.styleword', en: 'A style word', credits: CREDITS.styleword },
  ],
  studio: [
    { key: 'guide.p.read', en: 'Reading the chords, key and tempo, per minute', credits: CREDITS.read },
    { key: 'guide.p.parts', en: 'Splitting a song into named parts', credits: CREDITS.parts },
  ],
  booth: [
    { key: 'guide.p.clean', en: 'Cleaning the room off a take, per minute', credits: CREDITS.clean },
    { key: 'guide.p.stems', en: 'Splitting the stems, per minute', credits: CREDITS.stems },
    { key: 'guide.p.sing', en: 'Singing a lane in another voice, per minute', credits: CREDITS.sing },
    { key: 'guide.p.mixOut', en: 'Bouncing the mix out', credits: CREDITS.mixOut },
  ],
  voice_studio: [
    { key: 'guide.p.clone', en: 'Cloning your voice, once', credits: CREDITS.clone },
    { key: 'guide.p.reading', en: 'A short reading (300 characters)', credits: readCost(300) },
    { key: 'guide.p.voiceChange', en: 'Changing a recording into your voice, per minute', credits: CREDITS.voiceChange },
  ],
  sound: [
    { key: 'guide.p.finetune', en: 'Training a sound of your own', credits: CREDITS.finetune },
  ],
  canvas: [
    { key: 'guide.p.video', en: 'A video clip from the engine', credits: CREDITS.video },
    { key: 'guide.p.repaint', en: 'A still picture changed by saying what to change', credits: CREDITS.repaint },
  ],
  videoedit: [
    { key: 'guide.p.filmOut', en: 'Putting the film together, per half minute', credits: CREDITS.filmOut },
    { key: 'guide.p.filmLook', en: 'One look over the whole film', credits: CREDITS.filmLook },
    { key: 'guide.p.filmWords', en: 'Words set on the picture', credits: CREDITS.filmWords },
    { key: 'guide.p.filmJoin', en: 'A join between two shots', credits: CREDITS.filmJoin },
    { key: 'guide.p.filmUnder', en: 'A song laid under the film', credits: CREDITS.filmUnder },
    { key: 'guide.p.filmMark', en: 'Your mark on the film', credits: CREDITS.filmMark },
  ],
  photo: [
    { key: 'guide.p.postOut', en: 'Taking the finished picture off the device', credits: CREDITS.postOut },
    { key: 'guide.p.cutout', en: 'The background taken out, per five seconds of work', credits: CREDITS.cutout },
    { key: 'guide.p.erase', en: 'An item taken out, per five seconds of work', credits: CREDITS.erase },
    { key: 'guide.p.grab', en: 'Grabbing the words out of a picture', credits: CREDITS.grab },
  ],
  podcast: [
    { key: 'guide.p.transcribe', en: 'Transcribing, per minute', credits: CREDITS.transcribe },
    { key: 'guide.p.dub', en: 'Dubbing into another language, per minute', credits: CREDITS.dub },
  ],
  campaign: [
    { key: 'guide.p.adLines', en: 'Eight advert lines', credits: CREDITS.adLines },
    { key: 'guide.p.marketPlan', en: 'A marketing plan for the week', credits: CREDITS.marketPlan },
    { key: 'guide.p.cover', en: 'A poster or cover drawn by the engine', credits: CREDITS.cover },
  ],
};

/** The words the rooms use, in the order somebody meets them. */
const WORDS = [
  'credits', 'simple', 'lane', 'take', 'bounce', 'stems', 'clone', 'capture',
  'cast', 'startFrame', 'hook', 'brief', 'channel', 'cubed',
] as const;

export default function Guide(): React.ReactElement {
  const { t } = useLang();
  const credits = t('guide.credits', 'credits');

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <Link href="/" className="inline-flex min-h-[44px] items-center text-sm text-emerald-400 hover:text-emerald-300">
          ← FutureBox
        </Link>
        <h1 className="text-4xl font-black tracking-tight text-white">{t('guide.title', 'The guide')}</h1>
        <p className="text-base leading-relaxed text-zinc-400">
          {t(
            'guide.intro',
            'Every room in the studio, what comes out of it, what a press costs, and the words you will meet. Prices here are read off the same table the buttons use, so what this page says is what the app does today.',
          )}
        </p>
      </header>

      {/* ── The rooms ───────────────────────────────────────────────────── */}
      <section className="space-y-6" data-guiderooms>
        <h2 className="text-2xl font-bold text-white">{t('guide.rooms', 'The rooms')}</h2>
        {ROOMS.map(({ id, rail, name }) => {
          const prices = PRICES[id] ?? [];
          /* Read, not only drawn: a room missing from `SURFACES` is a room the
             copilot cannot see either, and the check holds the two lists. */
          const known = Boolean(SURFACES[id]);
          return (
            <article key={id} data-guideroom={id} className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="text-lg font-bold text-white">{t(rail, name)}</h3>
              {known && (
                <p className="text-sm leading-relaxed text-zinc-300">{t(`guide.room.${id}`, SURFACES[id].purpose)}</p>
              )}
              {prices.length > 0 ? (
                <ul className="space-y-1 pt-1 text-sm text-zinc-400">
                  {prices.map((one) => (
                    <li key={one.key} className="flex items-baseline justify-between gap-3">
                      <span>{t(one.key, one.en)}</span>
                      <span className="whitespace-nowrap font-semibold text-emerald-300">
                        {one.credits} {credits}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pt-1 text-sm text-zinc-500">
                  {id === 'albumart'
                    ? t('guide.albumartPrice', 'Real artists sell real pieces here, in rand rather than credits, each one exactly once.')
                    : t('guide.free', 'Everything in this room runs on your own phone and uses no credits.')}
                </p>
              )}
            </article>
          );
        })}
        {/* Not in ROOMS, because it is not a surface of the studio: a page
            of its own that a grown-up opens and hands over. On the guide
            because "Ek sien nerens die kids room nie" was said about an app
            that had it. */}
        <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-5" data-guidekids>
          <h3 className="text-lg font-bold text-white">
            {t('hello.kids', 'The kids room')}
          </h3>
          <p className="text-sm leading-relaxed text-zinc-400">
            {t(
              'guide.kids',
              'A page of its own, off the rail, for a child. A grown-up sets how many credits the child may spend and how long the sitting lasts, then hands the phone over. In the room there are two presses, a song and a video of it, and nothing else: no shop, no strangers, no paid door. When the credits or the time run out the room closes and asks for a grown-up. The prices in there are the same ones in the song and video rooms above.',
            )}
          </p>
        </div>
        <p className="text-sm leading-relaxed text-zinc-500">
          {t(
            'guide.everyPress',
            'Every press that spends says its price on the button before you press it. A press that fails is not charged, and the screen says so where it happens.',
          )}
        </p>
      </section>

      {/* ── The words ───────────────────────────────────────────────────── */}
      <section className="space-y-4" data-guidewords>
        <h2 className="text-2xl font-bold text-white">{t('guide.words', 'The words')}</h2>
        <dl className="space-y-3">
          {WORDS.map((word) => (
            <div key={word} data-guideword={word} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              <dt className="text-sm font-bold text-white">{t(`guide.word.${word}`, word)}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-zinc-400">{t(`guide.def.${word}`, '')}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav className="flex flex-wrap gap-x-5 border-t border-zinc-800 pt-4 text-sm">
        <Link href="/help" className="inline-flex min-h-[44px] items-center px-1.5 text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
          {t('foot.help', 'Help')}
        </Link>
        <Link href="/terms" className="inline-flex min-h-[44px] items-center px-1.5 text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
          {t('foot.terms', 'Terms')}
        </Link>
        <Link href="/privacy" className="inline-flex min-h-[44px] items-center px-1.5 text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
          {t('foot.privacy', 'Privacy')}
        </Link>
        <Link href="/legal" className="inline-flex min-h-[44px] items-center px-1.5 text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
          {t('foot.who', 'Who we are')}
        </Link>
      </nav>
    </div>
  );
}
