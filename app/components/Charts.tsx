'use client';

/**
 * The bars on Spotlight.
 *
 *   "Ek dink daar moet ook top 10 podcasts wees, net 'n bar waarop mens kliek
 *    en dan oop maak en opsies gee wat op gekliek kan word. top 10 AI musiek
 *    in Suid afrika … En dan natuurlik die radar, ens. maar ek wil hê ons moet
 *    aanloklike goed daar op sit."
 *
 * A bar you press, which opens into things you can press. That is the `Card`
 * shape this app already has — a heading you can fold, one box, small buttons
 * underneath. These four asked to start shut when that was the exception;
 * every card in the app starts shut now, so they simply say nothing.
 *
 * ── The thing that makes this honest rather than decorative ──────────────
 *
 * Every row is a real play by a real person, counted one-per-person-per-song-
 * per-day over thirty days (`supabase/charts.sql` says why that rule and not
 * another). Today that is a very short list, because there are a handful of
 * people on the app. A bar that opens on four songs and says "four songs, 11
 * plays between them" is worth more than a bar of ten invented ones, and it is
 * the only version that is still true next month.
 *
 * So the empty state is written as carefully as the full one: it says what the
 * chart is counting and how somebody gets on it, rather than "no data".
 *
 * ── And Apple Music's, beside ours ───────────────────────────────────────
 *
 * The owner, 20 October 2026: *"Gebruik Apple Music vir die top 20 charts."*
 * Apple Music's own most-played top 20 for South Africa, the UK and the US,
 * one tab each, labelled as theirs and opening on their pages. It replaced
 * Spotify's, which needed a key and a playlist Spotify stopped handing to new
 * apps. It is not the source of the AI chart and cannot be — their data has
 * no idea what was made with AI, so a "top 10 AI music" built from it would
 * be us deciding and putting their name on it.
 */

import React, { useEffect, useState } from 'react';
import { ExternalLink, Headphones, Music2, Radar, TrendingUp } from 'lucide-react';
import Card from './Card';
import Note from './Note';
import { useLang } from '../lib/i18n';

interface Row {
  readonly ref: string;
  readonly title: string;
  readonly by: string;
  readonly count: number;
  readonly recent: number;
}

interface Charts {
  readonly configured: boolean;
  readonly music: Row[];
  readonly podcasts: Row[];
  readonly days?: number;
}

const EMPTY: Charts = { configured: false, music: [], podcasts: [] };

/* ── Apple Music's, as `/api/charts/apple` sends it ─────────────────────── */
type Country = 'za' | 'gb' | 'us';
interface AppleRow {
  readonly ref: string;
  readonly title: string;
  readonly by: string;
  readonly art: string;
  readonly explicit: boolean;
}
interface AppleChart {
  readonly country: Country;
  readonly rows: AppleRow[];
}
const COUNTRIES: readonly (readonly [Country, string, string])[] = [
  ['za', 'chart.za', 'South Africa'],
  ['gb', 'chart.gb', 'UK'],
  ['us', 'chart.us', 'US'],
];

export default function Charts({
  onOpenRadar,
  onOpenLive,
}: {
  /** Take them to the radar tab, which is a bar here and a page there. */
  readonly onOpenRadar: () => void;
  /**
   * Take them to Live, which is where a charting song actually is.
   *
   * ── Why Live and not the song ────────────────────────────────────────
   *
   * "Ek kom ook agter die liedjies se links vat mens nerens heen nie."
   *
   * They went nowhere because nothing ever passed a handler in, so every row
   * was a `disabled` button — a list that looks pressable and is not, which is
   * worse than a list that plainly is not.
   *
   * The obvious fix is wrong: these rows are mostly *other people's* songs,
   * and the full-screen player reads its audio out of this device by track id.
   * Opening a stranger's song there is a black screen with a title on it.
   *
   * Live is where they are. A play is only counted from that room, and the
   * chart only publishes songs their maker shared — so every row on it came
   * from Live and Live is where it can be heard. One destination, always true,
   * promising nothing it cannot do.
   */
  readonly onOpenLive: () => void;
}): React.ReactElement {
  const { t } = useLang();
  const [charts, setCharts] = useState<Charts>(EMPTY);
  const [asked, setAsked] = useState(false);
  const [apple, setApple] = useState<AppleChart[] | null>(null);
  const [country, setCountry] = useState<Country>('za');

  useEffect(() => {
    let live = true;
    void fetch('/api/charts')
      .then((response) => (response.ok ? response.json() : null))
      .then((said) => {
        if (!live) return;
        if (said) setCharts({ ...EMPTY, ...said });
        setAsked(true);
      })
      .catch(() => live && setAsked(true));
    /* Apple's on its own: it needs no account of ours, so it shows on a
       fresh install where ours has nothing to count yet. */
    void fetch('/api/charts/apple')
      .then((response) => (response.ok ? response.json() : null))
      .then((said: { charts?: AppleChart[] } | null) => {
        if (live) setApple(Array.isArray(said?.charts) ? said.charts : []);
      })
      .catch(() => live && setApple([]));
    return () => {
      live = false;
    };
  }, []);
  const appleNow = apple?.find((one) => one.country === country)?.rows ?? [];

  const days = charts.days ?? 30;

  /** One row of ours: a song or a show, and the plays behind it. */
  const line = (row: Row, at: number, onPress?: () => void) => (
    <button
      key={row.ref}
      type="button"
      onClick={onPress}
      disabled={!onPress}
      className="flex w-full items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-left hover:border-emerald-500/60"
    >
      <span className="w-6 shrink-0 text-sm font-black tabular-nums text-zinc-600">{at + 1}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-zinc-100">{row.title}</span>
        <span className="block truncate text-sm text-zinc-500">{row.by}</span>
      </span>
      <span className="shrink-0 text-sm tabular-nums text-emerald-400">
        {row.count} {row.count === 1 ? t('chart.play', 'play') : t('chart.plays', 'plays')}
      </span>
    </button>
  );

  /* Not rendered at all until the answer is in. A bar that opens on "no songs
     yet" and then quietly fills in a second later is a bar somebody has
     already decided is empty. */
  if (!asked) return <div className="h-2" />;

  return (
    <div className="space-y-3">
      {/* ── The one this app is for ──────────────────────────────────── */}
      <Card
        title={t('chart.music', 'Top 10 AI music in South Africa')}
        icon={<Music2 className="h-4 w-4" />}
      >
        {charts.music.length === 0 ? (
          <Note>
            {t(
              'chart.musicEmpty',
              'Nothing has been played enough to chart yet. This counts real plays — one per person per song per day, over the last thirty — so getting on it means somebody heard your song, not that you pressed a button. Put one in the live room and it starts counting.',
            )}
          </Note>
        ) : (
          <>
            <div className="space-y-1.5">
              {charts.music.map((row, at) =>
                line(row, at, onOpenLive),
              )}
            </div>
            <p className="text-xs text-zinc-600">
              {t('chart.window', 'Counted over the last {days} days, one play per person per song per day.')
                .replace('{days}', String(days))}
            </p>
          </>
        )}
      </Card>

      {/* ── The podcasts ─────────────────────────────────────────────── */}
      <Card
        title={t('chart.pods', 'Top 10 podcasts')}
        icon={<Headphones className="h-4 w-4" />}
      >
        {charts.podcasts.length === 0 ? (
          <Note>
            {t(
              'chart.podsEmpty',
              'No episode has been opened enough to chart yet. Same counting as the music: one person, one show, one day.',
            )}
          </Note>
        ) : (
          <div className="space-y-1.5">
            {charts.podcasts.map((row, at) => line(row, at, onOpenLive))}
          </div>
        )}
      </Card>

      {/* ── Theirs, and said to be theirs ────────────────────────────── */}
      <Card
        title={t('chart.apple', 'Top 20 on Apple Music')}
        icon={<TrendingUp className="h-4 w-4" />}
      >
        <Note>
          {t(
            'chart.appleWhat',
            'Apple Music’s own chart of the songs played most, read from their public feed. Every song opens on Apple Music. It is theirs, not ours, and it is not where the AI chart above comes from — nothing in their data says what was made with AI.',
          )}
        </Note>
        <div role="tablist" className="grid grid-cols-3 gap-1.5" data-applecountries>
          {COUNTRIES.map(([id, key, fallback]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={country === id}
              data-applecountry={id}
              onClick={() => setCountry(id)}
              className={`min-h-[44px] whitespace-nowrap rounded-xl border px-1 text-sm font-bold ${
                country === id
                  ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-300'
              }`}
            >
              {t(key, fallback)}
            </button>
          ))}
        </div>
        {apple === null ? (
          <div className="h-10" />
        ) : appleNow.length === 0 ? (
          <Note>
            {t(
              'chart.appleEmpty',
              'Apple Music could not be reached just now. It is asked again within a minute — nothing old or invented is shown in its place.',
            )}
          </Note>
        ) : (
          <ol className="space-y-1.5" data-applechart={country}>
            {appleNow.map((row, at) => (
              <li key={row.ref}>
                <a
                  href={row.ref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-left hover:border-emerald-500/60"
                >
                  <span className="w-6 shrink-0 text-sm font-black tabular-nums text-zinc-600">{at + 1}</span>
                  {row.art ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.art} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span aria-hidden className="h-10 w-10 shrink-0 rounded-md bg-zinc-800" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-zinc-100">{row.title}</span>
                      {row.explicit ? (
                        <span
                          className="shrink-0 rounded bg-zinc-700 px-1 text-[10px] font-bold leading-4 text-zinc-100"
                          title={t('chart.explicit', 'Explicit')}
                        >
                          E
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-sm text-zinc-500">{row.by}</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                </a>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* ── And the radar, which is a whole page rather than a list ──── */}
      <Card title={t('chart.radar', 'The AI trends radar')} icon={<Radar className="h-4 w-4" />}>
        <Note>
          {t(
            'chart.radarWhat',
            'What is moving this week, scored before it is shown — who published it, whether the headline describes or baits, and whether there is anything in it you could check.',
          )}
        </Note>
        <button
          type="button"
          onClick={onOpenRadar}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 text-sm font-bold text-onAccent"
        >
          <Radar className="h-4 w-4" />
          {t('chart.openRadar', 'Open the radar')}
        </button>
      </Card>
    </div>
  );
}
