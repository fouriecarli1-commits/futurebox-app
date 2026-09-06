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
 * underneath — used shut rather than open, which is the one case the component
 * was given `startShut` for.
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
 * ── And Spotify's, beside ours ───────────────────────────────────────────
 *
 * Carli's choice, asked and answered: their public chart alongside ours. It is
 * theirs and it is labelled theirs, opening on their own pages. It is not the
 * source of the AI chart and cannot be — their API has no idea what was made
 * with AI, so a "top 10 AI music" built from it would be us deciding and
 * putting their name on it.
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
  readonly spotify: { name: string; url: string; rows: Row[] } | null;
  readonly days?: number;
}

const EMPTY: Charts = { configured: false, music: [], podcasts: [], spotify: null };

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
    return () => {
      live = false;
    };
  }, []);

  const days = charts.days ?? 30;

  /** One row, drawn the same whether it is ours or theirs. */
  const line = (row: Row, at: number, kind: 'ours' | 'theirs', onPress?: () => void) => {
    const body = (
      <>
        <span className="w-6 flex-shrink-0 text-sm font-black tabular-nums text-zinc-600">{at + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-zinc-100">{row.title}</span>
          <span className="block truncate text-sm text-zinc-500">{row.by}</span>
        </span>
        {kind === 'ours' ? (
          <span className="flex-shrink-0 text-sm tabular-nums text-emerald-400">
            {row.count} {t('chart.plays', 'plays')}
          </span>
        ) : (
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-zinc-600" />
        )}
      </>
    );
    const style =
      'flex w-full items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-left hover:border-emerald-500/60';
    return kind === 'theirs' && row.ref.startsWith('http') ? (
      <a key={row.ref} href={row.ref} target="_blank" rel="noopener noreferrer" className={style}>
        {body}
      </a>
    ) : (
      <button key={row.ref} type="button" onClick={onPress} className={style} disabled={!onPress}>
        {body}
      </button>
    );
  };

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
        startShut
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
                line(row, at, 'ours', onOpenLive),
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
        startShut
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
            {charts.podcasts.map((row, at) => line(row, at, 'ours', onOpenLive))}
          </div>
        )}
      </Card>

      {/* ── Theirs, and said to be theirs ────────────────────────────── */}
      {charts.spotify && charts.spotify.rows.length > 0 && (
        <Card
          title={t('chart.spotify', 'What South Africa is playing on Spotify')}
          icon={<TrendingUp className="h-4 w-4" />}
          startShut
        >
          <Note>
            {t(
              'chart.spotifyWhat',
              'Spotify’s own chart, read from their public API and opening on their pages. It is theirs, not ours, and it is not where the AI chart above comes from — nothing in their data says what was made with AI.',
            )}
          </Note>
          <div className="space-y-1.5">
            {charts.spotify.rows.map((row, at) => line(row, at, 'theirs'))}
          </div>
          {charts.spotify.url && (
            <a
              href={charts.spotify.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-emerald-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {charts.spotify.name}
            </a>
          )}
        </Card>
      )}

      {/* ── And the radar, which is a whole page rather than a list ──── */}
      <Card title={t('chart.radar', 'The AI trends radar')} icon={<Radar className="h-4 w-4" />} startShut>
        <Note>
          {t(
            'chart.radarWhat',
            'What is moving this week, scored before it is shown — who published it, whether the headline describes or baits, and whether there is anything in it you could check.',
          )}
        </Note>
        <button
          type="button"
          onClick={onOpenRadar}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-3 text-sm font-bold text-onAccent"
        >
          <Radar className="h-4 w-4" />
          {t('chart.openRadar', 'Open the radar')}
        </button>
      </Card>
    </div>
  );
}
