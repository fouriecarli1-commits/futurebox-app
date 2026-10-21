'use client';

/**
 * Spotlight — the signed-in front page.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * The owner, 13 October 2026, with the "Spotlight" page Google drew, and the
 * rule that goes with every page of this redesign: *"ons hou nie die oud en
 * sit hierdie by nie, ons transform en totally redesign."* The page is an
 * obsidian two-column board: on the left a stats banner with a live dot, a
 * title and two numbers over a waveform, then a scroller of release cards;
 * on the right a card of trending prompt chips and a card of people to
 * follow. That is this file.
 *
 * ── Where every number and card comes from ───────────────────────────────
 *
 * Google's page had 2,143,789 listeners and four artists called things like
 * SYNTHWAVE-AI. Nothing on this page may be invented: every row is a real
 * play by a real person, counted the way `supabase/charts.sql` says. So the
 * two numbers are the chart's own — how many songs are charting and how many
 * plays they have in the chart's window — and the release scroller is those
 * songs, opening on Live, which is where a charting song actually is. When
 * nothing is charting yet the scroller says so in words, and the four rooms
 * of the studio take the shelf instead, because a door is worth more than a
 * made-up record.
 *
 * The trending chips are the tags of the app's own track catalogue
 * (`data/studio.ts`), counted; the people card is the two real places to
 * find people — the Collab Radar and the Live room — rather than three
 * invented accounts with Follow buttons.
 *
 * Kept from before, because checks and rooms depend on them: the Charts
 * bars with their doors to Live and the radar, the Future Insights hub, the
 * blog shelf (`check:blog`), the people-here-now count, the language switch
 * and the theme studio button.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, BookOpen, ChevronLeft, ChevronRight, Compass, Film, Mic, Mic2, Music, Paintbrush,
  Pause, Play, Radio, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { inOrder, saidIn } from '../lib/blog';
import { useLang } from '../lib/i18n';
import HereNow from './HereNow';
import LanguagePicker from './LanguagePicker';
import Charts from './Charts';
import FutureInsightsHub from './FutureInsightsHub';
import { studioAudio } from '../lib/demoaudio';
import { TRACK_FLAVOURS } from '../data/studio';

interface Row {
  readonly ref: string;
  readonly title: string;
  readonly by: string;
  readonly count: number;
}

interface ChartSaid {
  readonly configured: boolean;
  readonly music: Row[];
  readonly days?: number;
}

const GLASS = 'rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-md';

/** The tags the catalogue uses most, as chips. Real data, counted, not typed. */
function topTags(n: number): string[] {
  const seen = new Map<string, number>();
  for (const one of TRACK_FLAVOURS) for (const tag of one.tags) seen.set(tag, (seen.get(tag) ?? 0) + 1);
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([tag]) => tag);
}

export default function Spotlight({
  onGo,
  onAppearance,
  onOpenRadar,
  onOpenLive,
}: {
  /** Open the studio on one of its screens. */
  onGo: (tab: 'make' | 'videoedit' | 'booth' | 'voice_studio' | 'podcast') => void;
  onAppearance: () => void;
  /** The radar bar is a door to the radar tab, which is a page of its own. */
  onOpenRadar: () => void;
  /** Where a charting song actually is. See the note in `Charts`. */
  onOpenLive: () => void;
}): React.ReactElement {
  const { lang, t } = useLang();
  const [playing, setPlaying] = useState(false);
  const [chart, setChart] = useState<ChartSaid>({ configured: false, music: [] });
  const shelf = useRef<HTMLDivElement | null>(null);
  const wave = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => studioAudio.subscribe(setPlaying), []);

  /* The same answer the Charts bars read, asked once more here for the two
     numbers in the banner and the release shelf. Only ever asked. */
  useEffect(() => {
    let live = true;
    void fetch('/api/charts')
      .then((response) => (response.ok ? response.json() : null))
      .then((said) => { if (live && said) setChart({ configured: false, music: [], ...said }); })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);

  /* The waveform: drawn, not decorated. Bars that breathe while the demo
     plays and lie flat while it does not, so the picture says the true
     thing about the sound. */
  useEffect(() => {
    const art = wave.current;
    const ctx = art?.getContext('2d');
    if (!art || !ctx) return undefined;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let frame = 0;
    const draw = (): void => {
      const w = art.width = art.clientWidth;
      const h = art.height = art.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const now = Date.now() / 1000;
      const bars = Math.floor(w / 4);
      for (let i = 0; i < bars; i += 1) {
        const breath = playing && !still
          ? 0.35 + 0.65 * Math.abs(Math.sin(now * 4 + i * 0.35) * Math.cos(now * 1.3 + i * 0.1))
          : 0.12 + 0.08 * Math.abs(Math.sin(i * 0.5));
        const tall = Math.max(3, h * 0.9 * breath);
        ctx.fillStyle = playing ? (i % 3 === 0 ? '#22d3ee' : '#34d399') : '#1e2638';
        ctx.fillRect(i * 4, (h - tall) / 2, 2, tall);
      }
      if (playing && !still) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const plays = useMemo(() => chart.music.reduce((sum, one) => sum + one.count, 0), [chart]);
  const days = chart.days ?? 30;
  const tags = useMemo(() => topTags(8), []);

  const scroll = (dir: -1 | 1): void => {
    shelf.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });
  };

  const rooms: readonly { icon: React.ReactNode; name: string; sub: string; tone: string; go: () => void; href?: string }[] = [
    { icon: <Film className="h-5 w-5" />, name: t('spot.editorName', 'VideoEditor NLE'), sub: t('spot.editorSub', 'Multi-track timeline, captions, Veo scenes'), tone: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/40', go: () => onGo('videoedit') },
    { icon: <Mic className="h-5 w-5" />, name: t('spot.boothName', 'ProBooth DAW'), sub: t('spot.boothSub', 'Record, mix, separate stems'), tone: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40', go: () => onGo('booth') },
    /* The owner, 21 October 2026: *"Ek sien nerens in die app die voice cloning
       nie."* The ProBooth card above said "clone" and opened the voice room,
       and the video editor's card opened Make a song — so the one card that
       mentioned cloning led somewhere called something else. Each card now
       opens its own room, and cloning has a card of its own. */
    { icon: <Mic2 className="h-5 w-5" />, name: t('spot.cloneName', 'Voice cloning'), sub: t('spot.cloneSub', 'Clone your voice once, read anything in it'), tone: 'text-fuchsia-400 bg-fuchsia-500/15 border-fuchsia-500/40', go: () => onGo('voice_studio') },
    { icon: <Music className="h-5 w-5" />, name: t('spot.makeName', 'Make a Song'), sub: t('spot.makeSub', 'Afrikaans or English, every genre'), tone: 'text-amber-400 bg-amber-500/15 border-amber-500/40', go: () => onGo('make') },
  ];

  const roomCard = (room: typeof rooms[number]): React.ReactNode => {
    const inside = (
      <>
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl border ${room.tone}`}>{room.icon}</div>
        <h3 className="truncate font-bold tracking-tight text-white group-hover:text-emerald-400">{room.name}</h3>
        <p className="line-clamp-2 text-xs font-medium text-zinc-400">{room.sub}</p>
        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[11px]">
          <span className="font-semibold text-emerald-400">{t('spot.open', 'Open')}</span>
          <ArrowRight className="h-3.5 w-3.5 text-zinc-500 group-hover:translate-x-1" />
        </div>
      </>
    );
    const look = `group min-w-[220px] max-w-[220px] cursor-pointer rounded-2xl border border-white/10 bg-zinc-900/80 p-4 text-left transition-all hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(15,157,110,0.35)]`;
    return room.href
      ? <Link key={room.name} href={room.href} className={look}>{inside}</Link>
      : <button key={room.name} type="button" onClick={room.go} className={look}>{inside}</button>;
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12" data-spotlight>
      {/* ── Left and centre: the banner and the shelf ────────────────── */}
      <div className="flex flex-col gap-6 lg:col-span-8">
        <div className={`${GLASS} relative overflow-hidden p-6`}>
          <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  {t('spot.live', 'LIVE GLOBAL STREAM')}
                </span>
                <HereNow />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                {t('spot.title', 'Spotlight:')}{' '}
                <span className="font-normal text-zinc-300">{t('spot.sub', 'Top charts & new releases')}</span>
              </h1>
            </div>
            <div className="flex items-center gap-6 md:text-right" data-spotlightnumbers>
              <div>
                <div className="text-xl font-bold tracking-tight text-white tabular-nums">{chart.music.length}</div>
                <div className="text-[11px] font-medium uppercase text-zinc-400">{t('spot.charting', 'songs charting')}</div>
              </div>
              <div className="border-l border-white/10 pl-6">
                <div className="text-xl font-bold tracking-tight text-emerald-400 tabular-nums">{plays.toLocaleString()}</div>
                <div className="text-[11px] font-medium uppercase text-zinc-400">
                  {t('spot.playsIn', 'plays in {n} days').replace('{n}', String(days))}
                </div>
              </div>
            </div>
          </div>

          {/* The waveform, with the one button that makes it move. */}
          <div className="mt-5 flex items-center gap-4 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={() => (playing ? studioAudio.stopStudioDemoTrack() : studioAudio.playStudioDemoTrack())}
              aria-pressed={playing}
              aria-label={t('spot.demo', 'Studio demo')}
              data-spotlightdemo
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-onAccent shadow-lg shadow-emerald-500/20 transition-transform hover:scale-105"
            >
              {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
            </button>
            <canvas ref={wave} className="h-12 w-full" aria-hidden />
            <span className="hidden whitespace-nowrap text-[10px] text-zinc-500 sm:inline">{t('spot.demoWhy', "Press play: the studio's own synth engine, drawn live.")}</span>
          </div>
        </div>

        {/* ── The shelf: what is charting, or the doors ────────────────── */}
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold text-white">
              <span className="truncate">{chart.music.length > 0 ? t('spot.releases', 'Featured releases') : t('spot.rooms', 'Four production rooms')}</span>
              <span className="hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 sm:inline">
                {chart.music.length > 0 ? t('spot.releasesTag', 'From the Live room') : t('spot.roomsTag', 'One press, straight in')}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => scroll(-1)} aria-label="←" className="min-h-[36px] min-w-[36px] rounded-lg border border-white/10 bg-zinc-900 text-zinc-400 hover:text-white">
                <ChevronLeft className="mx-auto h-4 w-4" />
              </button>
              <button type="button" onClick={() => scroll(1)} aria-label="→" className="min-h-[36px] min-w-[36px] rounded-lg border border-white/10 bg-zinc-900 text-zinc-400 hover:text-white">
                <ChevronRight className="mx-auto h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Sideways on purpose: this is the chart shelf from Google's
              Spotlight page, with the two arrow buttons above it moving it
              a card at a time. Wrapped, the arrows would have nothing to do. */}
          <div ref={shelf} className="flex gap-4 overflow-x-auto scroll-smooth pb-4" data-spotlightshelf>
            {chart.music.length > 0
              ? chart.music.map((row, at) => (
                <button
                  key={row.ref}
                  type="button"
                  onClick={onOpenLive}
                  data-spotlightrelease
                  className="group min-w-[220px] max-w-[220px] rounded-2xl border border-white/10 bg-zinc-900/80 p-3 text-left transition-all hover:border-emerald-500/60 hover:shadow-[0_0_30px_rgba(15,157,110,0.35)]"
                >
                  <div className="relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-emerald-950 via-zinc-950 to-cyan-950">
                    <span className="text-5xl font-black text-emerald-500/30">{at + 1}</span>
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-emerald-500/40 bg-black/60 px-2 py-0.5 text-[10px] font-medium text-emerald-400 backdrop-blur-md">
                      <Radio className="h-3 w-3" /> Live
                    </span>
                    <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-onAccent shadow-lg transition-transform group-hover:scale-110">
                      <Play className="ml-0.5 h-5 w-5 fill-current" />
                    </span>
                  </div>
                  <h3 className="truncate font-bold tracking-tight text-white group-hover:text-emerald-400">{row.title}</h3>
                  <p className="truncate text-xs font-medium text-zinc-400">{row.by}</p>
                  <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-zinc-400">
                    <span>{row.count.toLocaleString()} {t('spot.plays', 'plays')}</span>
                    <span className="font-semibold text-emerald-400">#{at + 1}</span>
                  </div>
                </button>
              ))
              : rooms.map(roomCard)}
          </div>
          {chart.music.length === 0 && (
            <p className="text-xs leading-relaxed text-zinc-500">
              {t('spot.noChart', 'Nothing is charting yet. Share a song in Live and it appears here, counted one play per person per day.')}
            </p>
          )}
          {chart.music.length > 0 && (
            <div className="mt-2">
              <h2 className="mb-3 text-sm font-bold text-white">{t('spot.rooms', 'Four production rooms')}</h2>
              <div className="flex flex-wrap gap-4 pb-2">{rooms.map(roomCard)}</div>
            </div>
          )}
        </div>

        {/* ── The bars, with their doors to Live and the radar ─────────── */}
        <Charts onOpenRadar={onOpenRadar} onOpenLive={onOpenLive} />

        <FutureInsightsHub
          onOpenStudio={() => onGo('make')}
          onOpenPodcast={() => onGo('podcast')}
        />
      </div>

      {/* ── Right: chips, people, style, the blog ───────────────────────── */}
      {/* Kept in view on a desk. It is a column of short cards beside a long
          list of articles, and once it ran out the right third of the page
          was empty for two thousand pixels of scrolling. */}
      <aside className="flex flex-col gap-6 lg:col-span-4 lg:sticky lg:top-40 lg:self-start" data-spotlightside>
        <div className={`${GLASS} p-5`}>
          <h3 className="mb-3 flex items-center justify-between text-sm font-bold text-white">
            <span>{t('spot.trending', 'Trending styles')}</span>
            <span className="font-mono text-[10px] text-emerald-400">{t('spot.trendingTag', 'FROM THE CATALOGUE')}</span>
          </h3>
          <div className="flex flex-wrap gap-2" data-spotlighttags>
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onGo('make')}
                className="min-h-[36px] rounded-full border border-white/10 bg-zinc-800/40 px-3 text-xs text-zinc-300 transition hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:text-emerald-400"
              >
                #{tag.replace(/\s+/g, '')}
              </button>
            ))}
          </div>
        </div>

        <div className={`${GLASS} p-5`}>
          <h3 className="mb-3 text-sm font-bold text-white">{t('spot.collab', 'Collab & Live')}</h3>
          <div className="space-y-3">
            {[
              { icon: <Compass className="h-4 w-4" />, tone: 'border-violet-500/40 bg-violet-500/20 text-violet-400', name: t('spot.radarName', 'Collab Radar'), sub: t('spot.radarSub', 'Makers near your key and tempo'), go: onOpenRadar },
              { icon: <Radio className="h-4 w-4" />, tone: 'border-cyan-500/40 bg-cyan-500/20 text-cyan-400', name: t('spot.liveName', 'Live room'), sub: t('spot.liveSub', 'Where shared songs play and get counted'), go: onOpenLive },
            ].map((one) => (
              <div key={one.name} className="flex items-center justify-between rounded-xl p-2 transition hover:bg-zinc-800/40">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${one.tone}`}>{one.icon}</div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-white">{one.name}</div>
                    <div className="truncate text-[10px] text-zinc-400">{one.sub}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={one.go}
                  className="min-h-[36px] rounded-lg border border-emerald-500/40 px-3 text-[11px] font-semibold text-emerald-400 transition hover:bg-emerald-500 hover:text-onAccent"
                >
                  {t('spot.open', 'Open')}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={`${GLASS} p-5`}>
          <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
            <Paintbrush className="h-4 w-4 text-emerald-400" />
            {t('spot.style', 'Studio style')}
          </h3>
          <p className="mb-3 text-[11px] text-zinc-400">{t('spot.styleSub', 'Your colours, your language')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <LanguagePicker compact />
            <button
              type="button"
              onClick={onAppearance}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-emerald-500/40 bg-zinc-950 px-3.5 text-xs font-bold text-emerald-300 transition-all hover:border-emerald-400"
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>{t('hero.openThemeStudio', 'Open Styl Ateljee')}</span>
            </button>
          </div>
        </div>

        {/* ── How it works & Blog ─────────────────────────────────────────
            The owner, 10 October 2026: "Ek besef ook in spotlight gaan ons 'n
            Blog ook moet hê." Checked by scripts/check-blog.mts: requires
            [data-spotlightblog] and href="/blog". */}
        <section className={`${GLASS} space-y-3 p-5`} data-spotlightblog>
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <BookOpen className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{t('blog.title', 'Hoe dit werk — Kennis & Handleidings')}</span>
            </h3>
            <Link href="/blog" className="min-h-[36px] whitespace-nowrap text-[11px] font-bold text-emerald-400 hover:underline">
              {t('blog.all', 'Al die artikels')} →
            </Link>
          </div>
          <ul className="space-y-2">
            {inOrder().slice(0, 3).map((piece) => (
              <li key={piece.id}>
                <Link
                  href={`/blog/${piece.id}`}
                  data-spotlightpiece={piece.id}
                  className="group block rounded-xl border border-white/10 bg-zinc-950/60 p-3 transition-all hover:border-emerald-500/60"
                >
                  <span className="block text-xs font-bold leading-snug text-white group-hover:text-emerald-300">{saidIn(piece.title, lang)}</span>
                  <span className="block pt-1 text-[11px] leading-relaxed text-zinc-400">{saidIn(piece.blurb, lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
