'use client';

/**
 * Album kunswerk — the crate.
 *
 * ── What this room has to do ─────────────────────────────────────────────
 *
 * Carli's list, across 20 September 2026:
 *
 *   real artists' real work at the top, buyable, R200 on every piece
 *   every piece unique and sold exactly once, and the room must SHOW that
 *   each artist has a pop-out that tells their profile
 *   a DM asking for unique art for a particular song — buttons only, no typing
 *   the artist answers with a price and one of four windows
 *   paid → the buyer presses accept → a status bar → the artist gets an
 *     upload that goes to that one person and shows in their channel
 *   a buyer may generate art or buy ours; they may not upload their own
 *   at the bottom, their songs and their collection, so a bought piece can
 *     be put on a song
 *   and the credit travels with the song into the channel and into Live
 *
 * ── How it looks, and why ────────────────────────────────────────────────
 *
 * She gave me a design brief as an example. I built the example, twice, and
 * she was right both times:
 *
 *   *"Ek is baie spyt ek het enigsins vir jou 'n voorbeeld gegee … Sjoe daar
 *    is nou geen verbeelding en kreatiwiteit daar in nie."*
 *
 * So this one starts from the object instead. **Nobody buys album art to
 * hang it.** They buy it to become a record sleeve. Every decision below
 * comes out of that one sentence:
 *
 *   THE CRATE     Records live in a crate you flick through, one at a time,
 *                 large, in your hands. That is how you look at art you
 *                 might buy, and it is a real phone gesture rather than a
 *                 grid borrowed from a shop. Each sleeve snaps to the middle
 *                 with its neighbours showing at the edges, so it reads as a
 *                 stack you are going through rather than a page of
 *                 thumbnails.
 *
 *   THE SPINE     A sliver of dark down the right edge of every sleeve: the
 *                 record sticking out of its jacket. One flourish, and it is
 *                 the one that says what this thing is going to become.
 *
 *   THE FLIP      A sleeve's back is where the credits are. So the artist is
 *                 not a card that opens over the room — you turn the sleeve
 *                 over and they are on the back, in their own words, with
 *                 the one button under them. Her pop-out, made out of the
 *                 object rather than bolted beside it.
 *
 *   THE SEAL      "1 / 1", pressed into the corner of every sleeve. Her rule
 *                 — *"elke kunswerk … uniek is en net een keer verkoop"* —
 *                 as a mark on the thing rather than a sentence about it.
 *
 *   AT NIGHT      Warm near-black, cream ink, brass. Every other room in
 *                 this app is cool grey with emerald buttons; this is a
 *                 listening room with the work lit. It makes the artwork the
 *                 only colour on the screen, which is the one rule a gallery
 *                 actually has, and it gets there without a single borrowed
 *                 line.
 *
 * ── Why there is not one text box in the conversation ────────────────────
 *
 *   "Geen tik moontlikhede nie, net dit. Ek as eienaar van die app moet
 *    bewus wees van dit, sodat kunstenaar nie agter my rug kan kunswerk
 *    verkoop nie."
 *
 * A free-text message is a place to swap a phone number and do the deal
 * elsewhere, and the studio then carries the cost of the introduction and
 * earns nothing. The whole vocabulary is: one button, and one of your own
 * songs. The artist answers with a price and one of four windows — also
 * buttons. There is nowhere in the schema to put a message either: not a
 * nullable column, no column.
 *
 * ── And why a buyer cannot bring their own picture ───────────────────────
 *
 * The only file input in this file is on the artist's own desk, and
 * `/api/artmarket` refuses an upload from anybody without an approved
 * artist row. Both, because a hidden button is not a closed door.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { barClearance } from './TabBar';
import { accessToken, getStorageClient } from '../lib/cloud';
import { refusalText } from '../lib/apierror';
import { useBackLayer } from '../lib/backstack';
import { useLang } from '../lib/i18n';
import { loadTracks, type Track } from '../lib/library';
import { square } from '../lib/imagefile';
import { previewOf } from '../lib/artmark';
import {
  ART_MAX_BYTES,
  ART_SIDE,
  ART_SIZE_SAID,
  START_RAND,
  UNIQUE_RAND,
  WINDOWS,
  split,
} from '../data/artmarket';

/* ────────────────────────────────────────────────────────────── the skin ── */

/**
 * A listening room at night, scoped to this room's own root.
 *
 * Warm rather than cool, which is the whole difference from everywhere else
 * in this app: the other twelve rooms are zinc and emerald, and a gallery
 * lit like a control panel makes paintings look like thumbnails. Brass for
 * the accent because brass is what frames and plaques are made of.
 *
 * Custom properties here and not in `globals.css`: these names mean
 * something in this room and nowhere else.
 */
const SKIN = {
  '--nag': '#14110E',
  '--nag-2': '#1D1915',
  '--leeg': '#272119',
  '--lyn': 'rgba(242,235,224,0.13)',
  '--room': '#F2EBE0',
  '--room-2': 'rgba(242,235,224,0.68)',
  '--gedemp': 'rgba(242,235,224,0.42)',
  '--brons': '#C08B4A',
  '--vertoon': 'Georgia, "Times New Roman", serif',
} as React.CSSProperties;

/** The small uppercase mark: counts, states, section names. */
const MIKRO = 'text-[10px] uppercase tracking-[0.2em] text-[color:var(--gedemp)]';

/** The one filled button. Brass, a pill, and 48px — which is a thumb. */
const VUL =
  'inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[var(--brons)] px-6 text-[14px] font-bold text-[#17120B] transition active:translate-y-px active:opacity-90 disabled:opacity-40';

/** Outlined, for everything that is not the one thing to do. */
const LEEG =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[var(--lyn)] px-4 text-[13px] font-semibold text-[color:var(--room-2)] transition active:translate-y-px active:bg-[var(--nag-2)] disabled:opacity-40';

/** A field. Quiet, and with a real label above it. */
const VELD =
  'mt-1.5 w-full rounded-[4px] border border-[var(--lyn)] bg-[var(--nag-2)] px-3 py-3 text-[15px] text-[color:var(--room)] outline-none focus:border-[var(--brons)]';

/* ─────────────────────────────────────────────────────────── the shapes ── */

interface Artist {
  readonly id: string;
  readonly name: string;
  readonly about: string;
  readonly place: string;
  readonly avatar: string | null;
  /** The ids of their pieces still for sale, so a profile is a body of work. */
  readonly works: readonly string[];
  /** How many they have sold. A number, not a list — see the route. */
  readonly sold: number;
}

/** Every artist, approved or not. The owner's list; null for everybody else. */
interface AnyArtist {
  readonly id: string;
  readonly name: string;
  readonly about: string;
  readonly place: string;
  readonly approved: boolean;
  /** True for somebody Carli brought in who has no FutureBox account. */
  readonly house: boolean;
  readonly works: number;
  readonly sold: number;
}

interface WallPiece {
  readonly id: string;
  readonly title: string;
  readonly rand: number;
  readonly artist: string;
  readonly by: string;
  readonly url: string | null;
}

interface Owned {
  readonly id: string;
  readonly title: string;
  readonly by: string;
  readonly url: string | null;
}

type OfferState = 'offered' | 'paid' | 'accepted' | 'delivered' | 'declined';

interface Thread {
  readonly id: string;
  readonly songId: string;
  readonly songTitle: string;
  readonly artist: string;
  readonly by: string;
  readonly at: string;
  readonly offer: {
    readonly id: string;
    readonly rand: number;
    readonly days: number;
    readonly state: OfferState;
    readonly dueAt: string | null;
    readonly url: string | null;
  } | null;
}

interface Owed {
  readonly artist: string;
  readonly name: string;
  readonly pieces: number;
  readonly rand: number;
}

interface Market {
  /** What the owner still owes each artist. Null for everybody but her. */
  readonly owing: readonly Owed[] | null;
  readonly artists: readonly Artist[];
  /** Everybody, waiting room included. Owner only; null for the rest. */
  readonly everyArtist: readonly AnyArtist[] | null;
  /** True when OWNER_EMAIL is unset, so nobody is the owner. See the route. */
  readonly noOwner: boolean;
  readonly wall: readonly WallPiece[];
  readonly bought: readonly Owned[];
  readonly asBuyer: readonly Thread[];
  readonly asArtist: readonly Thread[];
  readonly me: { readonly id: string; readonly name: string; readonly approved: boolean } | null;
}

/** The steps a commission goes through, in order, for the status bar. */
const STEPS: readonly OfferState[] = ['offered', 'paid', 'accepted', 'delivered'];

/* ──────────────────────────────────────────────────────────── uploading ── */

/**
 * Put one blob in the private bucket, and give back where it landed.
 *
 * Straight from the browser to storage with an address this app's server
 * signed. It does not pass through a route: six routes in this app already
 * promised ceilings the platform will not pass, 4.5 MB is the wall, and a
 * 3000-pixel painting is comfortably over it.
 *
 * Shared by the artist's own desk and by the owner's, because those two
 * were the same forty lines twice and the second copy is where a rule goes
 * missing.
 */
async function putInBucket(
  blob: Blob,
  why: 'work' | 'preview' | 'delivery',
  artist: string | undefined,
  lang: 'en' | 'af',
  onProblem: (said: string) => void,
  t: (key: string) => string,
): Promise<string | null> {
  const token = await accessToken();
  const opened = await fetch('/api/artmarket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ what: 'upload', for: why, ...(artist ? { artist } : {}) }),
  });
  const said = (await opened.json().catch(() => null)) as
    | { path?: string; token?: string; message?: string }
    | null;
  if (!opened.ok || !said?.path || !said.token) {
    onProblem(refusalText(said, lang, t('art.noUpload')));
    return null;
  }
  const storage = getStorageClient();
  if (!storage) {
    onProblem(t('art.offline'));
    return null;
  }
  const put = await storage
    .from('art')
    .uploadToSignedUrl(said.path, said.token, blob, { contentType: 'image/webp' });
  if (put.error) {
    onProblem(t('art.noUpload'));
    return null;
  }
  return said.path;
}

/**
 * A piece of artwork, as the two files it has to become.
 *
 * The clean 3000-pixel master, which only a buyer ever reaches, and the
 * marked 1000-pixel preview, which is what the wall shows. Made in that
 * order and uploaded as a pair, because a work with a master and no
 * preview would hang on the wall as its own clean self.
 *
 * See `app/lib/artmark.ts` for why a watermark and not a screenshot
 * blocker: nothing a web page can do stops a capture or a phone camera,
 * and making the copy worthless is the measure that works against both.
 */
async function hangable(
  file: File,
  artistName: string,
  artist: string | undefined,
  lang: 'en' | 'af',
  onProblem: (said: string) => void,
  t: (key: string) => string,
): Promise<{ path: string; preview: string } | null> {
  const master = await square(file, ART_SIDE);
  if (master.ok !== true) {
    onProblem(t('art.badFile'));
    return null;
  }
  if (master.blob.size > ART_MAX_BYTES) {
    onProblem(ART_SIZE_SAID[lang]);
    return null;
  }
  const marked = await previewOf(file, artistName);
  if (marked.ok !== true) {
    onProblem(t('art.badFile'));
    return null;
  }
  const path = await putInBucket(master.blob, 'work', artist, lang, onProblem, t);
  if (!path) return null;
  const preview = await putInBucket(marked.blob, 'preview', artist, lang, onProblem, t);
  if (!preview) return null;
  return { path, preview };
}

/* ──────────────────────────────────────────────────────── the small parts ── */

/**
 * The sleeve: a square, a spine, and a seal.
 *
 * The spine is a sliver of dark down the right edge — the record sticking
 * out of its jacket. It is the one flourish in the room and it is the one
 * that says what this thing is going to become.
 */
function Sleeve({
  url,
  alt,
  seal,
  className = '',
}: {
  readonly url: string | null;
  readonly alt: string;
  /** The "1 / 1" pressed into the corner. Off for a piece already owned. */
  readonly seal?: boolean;
  readonly className?: string;
}): React.ReactElement {
  return (
    <span className={`relative block aspect-square overflow-hidden rounded-[3px] bg-[var(--leeg)] ${className}`}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      )}
      {/* The record, just showing past the jacket. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-[7%] right-0 w-[5px] rounded-l-[2px]"
        style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0.85))' }}
      />
      {/* The edition mark, pressed in rather than printed on. */}
      {seal && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-2 left-2 rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-[0.18em]"
          style={{
            borderColor: 'rgba(192,139,74,0.75)',
            color: '#E8C89A',
            background: 'rgba(20,17,14,0.55)',
            backdropFilter: 'blur(2px)',
          }}
        >
          1 / 1
        </span>
      )}
    </span>
  );
}

/**
 * A fold, in this room's own language.
 *
 * Every room in this app opens as its own table of contents. `Card` is how
 * the other twelve do it, and its rounded emerald shape would be the one
 * thing here that belongs somewhere else. Same behaviour and the same
 * `aria-expanded` the probes press.
 */
function Fold({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <section className="border-t border-[var(--lyn)]">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((was) => !was)}
          className="flex min-h-[52px] w-full items-center justify-between gap-3 py-3 text-left text-[13px] font-semibold text-[color:var(--room)]"
        >
          {label}
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[color:var(--gedemp)] transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      </h3>
      {open && <div className="pb-7">{children}</div>}
    </section>
  );
}

/**
 * Where a commission has got to.
 *
 * Her words: *"as die betaling deur is, druk die koper accept, en dan moet
 * daar 'n status bar wees"*. Drawn from the offer's own state rather than a
 * separate progress number — two things that can disagree about where a
 * deal is eventually will.
 */
function StatusBar({ state, said }: { readonly state: OfferState; readonly said: string }): React.ReactElement {
  const reached = STEPS.indexOf(state);
  return (
    <div className="pt-3" data-status={state}>
      <div className="flex gap-1" aria-hidden>
        {STEPS.map((step, index) => (
          <span
            key={step}
            className="h-[3px] flex-1 rounded-full"
            style={{
              background:
                state !== 'declined' && index <= reached ? 'var(--brons)' : 'var(--lyn)',
            }}
          />
        ))}
      </div>
      <p className={`${MIKRO} pt-2`}>{said}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── the room ── */

/**
 * The room itself: a top bar, three tabs, and what each tab is for.
 *
 * ── Why it is tabs and not a scroll ──────────────────────────────────────
 *
 * Carli, twice: *"Die album art plek lyk steeds soos 'n website in plaas
 * van 'n app."* She was right both times and the reason was structural,
 * not decorative. What I kept building was:
 *
 *   a masthead — a display heading with a rule above it, alone at the top
 *   a carousel with dots underneath — a landing-page hero, exactly
 *   four accordions stacked down one long scroll — a page's sections
 *
 * Those three things ARE a website, whatever colour they are painted. An
 * app is a bar, a way to switch between the two or three things the screen
 * is for, and content you act on directly.
 *
 * So: a 52-pixel bar, a segmented control, and three tabs.
 *
 *   WERKE        everything for sale, as a grid you tap
 *   KUNSTENAARS  the people, one row each, into their profile
 *   MYNE         what you own, what you have asked for, your own desk
 *
 * The folds survive inside MYNE, where they are genuinely panels in a
 * drawer rather than the skeleton of a page — and every room in this app
 * opens with its panels shut.
 *
 * ── And what it says it is ───────────────────────────────────────────────
 *
 *   *"Die bladsy moet ook beskryf wat hierdie is, dit is nie net album art
 *    nie, dit is album art created by real artists, human made."*
 *
 * That is the proposition and it was nowhere on the screen. It is now one
 * line under the tabs — not a hero paragraph, one line — and it carries
 * the three facts that decide whether somebody stays: made by a person,
 * not by a machine, sold once, from R200.
 */
export default function ArtMarket(): React.ReactElement {
  const { t, lang } = useLang();
  const [market, setMarket] = useState<Market | null>(null);
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(true);
  /** Which of the three the screen is showing. */
  const [tab, setTab] = useState<'works' | 'artists' | 'mine'>('works');
  /** Whose buttons-only conversation is open. */
  const [asking, setAsking] = useState<Artist | null>(null);
  /** Whose profile is open — their words and their whole body of work. */
  const [profile, setProfile] = useState<Artist | null>(null);
  /** Which piece is open, full size, with the price and the buy button. */
  const [sheet, setSheet] = useState<WallPiece | null>(null);
  const [songs, setSongs] = useState<readonly Track[]>([]);

  useBackLayer(asking !== null, () => setAsking(null));
  useBackLayer(profile !== null, () => setProfile(null));
  useBackLayer(sheet !== null, () => setSheet(null));

  const read = useCallback(async () => {
    setProblem('');
    try {
      const token = await accessToken();
      const response = await fetch('/api/artmarket', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const said = (await response.json().catch(() => null)) as (Market & { message?: string }) | null;
      if (!response.ok || !said) {
        setProblem(refusalText(said, lang, t('art.failed')));
        return;
      }
      setMarket(said);
    } catch {
      setProblem(t('art.offline'));
    } finally {
      setLoading(false);
    }
  }, [lang, t]);

  useEffect(() => {
    void read();
    setSongs(loadTracks());
  }, [read]);

  /** One place every write goes through, so every one of them re-reads. */
  const doIt = useCallback(
    async (body: Record<string, unknown>): Promise<boolean> => {
      setProblem('');
      try {
        const token = await accessToken();
        const response = await fetch('/api/artmarket', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const said = (await response.json().catch(() => null)) as { message?: string } | null;
          setProblem(refusalText(said, lang, t('art.failed')));
          return false;
        }
        await read();
        return true;
      } catch {
        setProblem(t('art.offline'));
        return false;
      }
    },
    [lang, read, t],
  );

  /** Off to the till. The price is decided there, never here. */
  const pay = useCallback(
    async (want: Record<string, unknown>): Promise<void> => {
      setProblem('');
      try {
        const token = await accessToken();
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(want),
        });
        const said = (await response.json().catch(() => null)) as { url?: string; message?: string } | null;
        if (!response.ok || !said?.url) {
          setProblem(refusalText(said, lang, t('art.noTill')));
          return;
        }
        window.location.href = said.url;
      } catch {
        setProblem(t('art.offline'));
      }
    },
    [lang, t],
  );

  const wall = market?.wall ?? [];
  const mine = market?.me ?? null;

  const saidState = (state: OfferState): string =>
    ({
      offered: t('art.step.offered'),
      paid: t('art.step.paid'),
      accepted: t('art.step.accepted'),
      delivered: t('art.step.delivered'),
      declined: t('art.step.declined'),
    })[state];

  const TABS = [
    { id: 'works' as const, said: t('art.tab.works'), count: wall.length },
    { id: 'artists' as const, said: t('art.tab.artists'), count: market?.artists.length ?? 0 },
    { id: 'mine' as const, said: t('art.tab.mine'), count: market?.bought.length ?? 0 },
  ];

  return (
    <div
      data-room="albumart"
      style={{ ...SKIN, paddingBottom: barClearance() }}
      className="min-h-full bg-[var(--nag)] text-[color:var(--room-2)]"
    >
      {/* ── The bar ─────────────────────────────────────────────────────
          Fifty-two pixels, a name, and nothing else. Not a masthead: a
          masthead is the thing that made this read as a page. */}
      <header className="flex h-[52px] items-center justify-between border-b border-[var(--lyn)] px-4">
        <h2 className="text-[16px] font-bold tracking-tight text-[color:var(--room)]">{t('art.title')}</h2>
      </header>

      {/* The segmented control. An app switches between the two or three
          things a screen is for; a page stacks them and makes you scroll. */}
      <div role="tablist" className="flex gap-1 border-b border-[var(--lyn)] px-3 py-2">
        {TABS.map((one) => (
          <button
            key={one.id}
            type="button"
            role="tab"
            aria-selected={tab === one.id}
            onClick={() => setTab(one.id)}
            className={`flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition ${
              tab === one.id
                ? 'bg-[var(--brons)] text-[#17120B]'
                : 'text-[color:var(--room-2)] active:bg-[var(--nag-2)]'
            }`}
          >
            {one.said}
            {one.count > 0 && (
              <span className={`text-[11px] ${tab === one.id ? 'opacity-70' : 'opacity-50'}`}>{one.count}</span>
            )}
          </button>
        ))}
      </div>

      {problem && (
        <p
          role="alert"
          className="mx-4 mt-3 rounded-[4px] border border-[var(--brons)] px-3 py-2.5 text-[14px] text-[#E8C89A]"
        >
          {problem}
        </p>
      )}

      {loading && (
        <p className="flex items-center gap-2 px-4 py-6 text-[14px]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t('art.reading')}
        </p>
      )}

      {/* ── What this is ────────────────────────────────────────────────
          Her ask, in one line rather than a hero: made by a person, not a
          machine, sold once, from R200. It stays on the works tab, where
          somebody is deciding whether any of this is for them. */}
      {!loading && tab === 'works' && (
        <p className="px-4 pt-3 text-[13px] leading-relaxed text-[color:var(--room-2)]">{t('art.whatThisIs')}</p>
      )}

      {/* ── WERKE ───────────────────────────────────────────────────────
          A grid you tap. Price on every tile, because a price behind a
          press is a price somebody meets after they have decided. */}
      {!loading && market && tab === 'works' && (
        <section className="px-4 py-4">
          {wall.length === 0 ? (
            <p className="rounded-[4px] border border-dashed border-[var(--lyn)] px-4 py-12 text-center text-[14px]">
              {t('art.empty')}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4">
              {wall.map((piece) => (
                <button
                  key={piece.id}
                  type="button"
                  data-piece={piece.id}
                  onClick={() => setSheet(piece)}
                  className="block w-full text-left"
                >
                  <Sleeve url={piece.url} alt={`${piece.title}, ${piece.by}`} seal />
                  <span className="mt-2 flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-[14px] font-semibold text-[color:var(--room)]">
                      {piece.title}
                    </span>
                    <span className="shrink-0 text-[14px] font-bold text-[color:var(--brons)]">R{piece.rand}</span>
                  </span>
                  <span className={`${MIKRO} block truncate pt-0.5`}>{piece.by}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── KUNSTENAARS ─────────────────────────────────────────────────
          One row each, into their profile. This is the list her ask about
          profiles was really for: a painter with eleven works is a person,
          not eleven tiles. */}
      {!loading && market && tab === 'artists' && (
        <section className="px-4 py-4">
          {market.artists.length === 0 ? (
            <p className="rounded-[4px] border border-dashed border-[var(--lyn)] px-4 py-12 text-center text-[14px]">
              {t('art.noArtists')}
            </p>
          ) : (
            <ul className="space-y-2">
              {market.artists.map((one) => (
                <li key={one.id}>
                  <button
                    type="button"
                    data-artistrow={one.id}
                    onClick={() => setProfile(one)}
                    className="flex w-full items-center gap-3 rounded-[4px] border border-[var(--lyn)] bg-[var(--nag-2)] p-3 text-left active:bg-[var(--leeg)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold text-[color:var(--room)]">
                        {one.name}
                      </span>
                      <span className={`${MIKRO} block truncate pt-1`}>
                        {one.place && `${one.place} · `}
                        {one.works.length} {t('art.forSaleNow')}
                        {one.sold > 0 && ` · ${one.sold} ${t('art.soldAlready')}`}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-[color:var(--gedemp)]" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── MYNE ────────────────────────────────────────────────────────
          Everything that is about you rather than about them. Folds here,
          because in a drawer they really are panels — which is what the
          rest of this app does and what its probes press. */}
      {!loading && tab === 'mine' && (
        <section className="px-4 py-2">
          {market && market.asBuyer.length > 0 && (
            <Fold label={t('art.yours')}>
              <ul className="space-y-5">
                {market.asBuyer.map((thread) => (
                  <li
                    key={thread.id}
                    data-thread={thread.id}
                    className="rounded-[4px] border border-[var(--lyn)] bg-[var(--nag-2)] p-4"
                  >
                    <p className={MIKRO}>{thread.by}</p>
                    <p className="pt-1 text-[16px] font-semibold text-[color:var(--room)]">{thread.songTitle}</p>
                    {!thread.offer ? (
                      <p className={`${MIKRO} pt-3`}>{t('art.waiting')}</p>
                    ) : (
                      <>
                        <StatusBar state={thread.offer.state} said={saidState(thread.offer.state)} />
                        <p className="pt-3 text-[14px]">
                          R{thread.offer.rand} ·{' '}
                          {WINDOWS.find((one) => one.days === thread.offer?.days)?.[lang] ?? `${thread.offer.days}d`}
                        </p>
                        {thread.offer.state === 'offered' && (
                          <button
                            type="button"
                            className={`${VUL} mt-3`}
                            onClick={() => void pay({ kind: 'commission', offer: thread.offer?.id })}
                          >
                            {t('art.pay')} R{thread.offer.rand}
                          </button>
                        )}
                        {thread.offer.state === 'paid' && (
                          <button
                            type="button"
                            className={`${VUL} mt-3`}
                            onClick={() => void doIt({ what: 'accept', offer: thread.offer?.id })}
                          >
                            {t('art.accept')}
                          </button>
                        )}
                        {thread.offer.state === 'accepted' && thread.offer.dueAt && (
                          <p className={`${MIKRO} pt-2`}>
                            {t('art.due')} {new Date(thread.offer.dueAt).toLocaleDateString()}
                          </p>
                        )}
                        {thread.offer.state === 'delivered' && thread.offer.url && (
                          <Sleeve
                            url={thread.offer.url}
                            alt={`${thread.songTitle}, ${thread.by}`}
                            className="mt-3 w-36"
                          />
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </Fold>
          )}

          {market && (
            <Fold label={t('art.put')}>
              <PutOnSong
                owned={market.bought}
                songs={songs}
                onPut={(work, trackId) => doIt({ what: 'wear', work, trackId })}
                t={t}
              />
            </Fold>
          )}

          {/* Owner only. The route returns null for everybody else, so
              this fold is absent rather than empty. */}
          {market?.owing && market.owing.length > 0 && (
            <Fold label={t('art.owing')}>
              <ul className="space-y-3">
                {market.owing.map((one) => (
                  <li
                    key={one.artist}
                    data-owed={one.artist}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[var(--lyn)] bg-[var(--nag-2)] p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold text-[color:var(--room)]">{one.name}</p>
                      <p className={`${MIKRO} pt-1`}>
                        {one.pieces} {one.pieces === 1 ? t('art.piece') : t('art.pieces')}
                      </p>
                    </div>
                    <p className="text-[18px] font-bold text-[color:var(--brons)]">R{one.rand.toFixed(2)}</p>
                    <button
                      type="button"
                      className={LEEG}
                      onClick={() => void doIt({ what: 'paidout', artist: one.artist })}
                    >
                      {t('art.markPaid')}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="pt-4 text-[13px] leading-relaxed text-[color:var(--gedemp)]">{t('art.owingWhy')}</p>
            </Fold>
          )}

          {market?.everyArtist && (
            <Fold label={t('art.bring')}>
              <BringArtist
                artists={market.everyArtist}
                onDo={doIt}
                onProblem={setProblem}
                lang={lang}
                t={t}
              />
            </Fold>
          )}

          {/* Said rather than left as an absence. Until the owner's address
              is set, nobody is the owner and the panel above is drawn for
              nobody — which looks exactly like a feature never built. */}
          {market?.noOwner && (
            <p className="my-3 rounded-[4px] border border-[var(--brons)] px-3 py-2.5 text-[13px] leading-relaxed text-[#E8C89A]">
              {t('art.noOwner')}
            </p>
          )}

          <Fold label={t('art.sell')}>
            {!mine ? (
              <Apply onApply={(name, about) => doIt({ what: 'apply', name, about })} t={t} />
            ) : !mine.approved ? (
              <p className="text-[14px] leading-relaxed">{t('art.pending')}</p>
            ) : (
              <ArtistDesk
                name={mine.name}
                threads={market?.asArtist ?? []}
                onDo={doIt}
                onProblem={setProblem}
                saidState={saidState}
                lang={lang}
                t={t}
              />
            )}
          </Fold>
        </section>
      )}

      {sheet && (
        <WorkSheet
          piece={sheet}
          artist={market?.artists.find((one) => one.id === sheet.artist) ?? null}
          onClose={() => setSheet(null)}
          onBuy={() => void pay({ kind: 'art', work: sheet.id })}
          onArtist={(artist) => {
            setSheet(null);
            setProfile(artist);
          }}
          t={t}
        />
      )}

      {profile && (
        <ArtistSheet
          artist={profile}
          pieces={wall.filter((one) => one.artist === profile.id)}
          onClose={() => setProfile(null)}
          onBuy={(piece) => void pay({ kind: 'art', work: piece.id })}
          onAsk={() => {
            setProfile(null);
            setAsking(profile);
          }}
          t={t}
        />
      )}

      {asking && (
        <Popout
          artist={asking}
          songs={songs}
          onClose={() => setAsking(null)}
          onAsk={async (song) => {
            const ok = await doIt({
              what: 'ask',
              artist: asking.id,
              songId: song.id,
              songTitle: song.title,
            });
            if (ok) setAsking(null);
            return ok;
          }}
          t={t}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── one piece ── */

/**
 * One work, raised over the grid, with the buy button where a thumb is.
 *
 * The piece shown here is the MARKED preview, like everywhere else before
 * a sale: nothing a web page can do stops a screenshot or a phone camera,
 * and the measure that works against both is that the only file anybody
 * can reach before paying is 1000 pixels with a band of text through it.
 */
function WorkSheet({
  piece,
  artist,
  onClose,
  onBuy,
  onArtist,
  t,
}: {
  readonly piece: WallPiece;
  readonly artist: Artist | null;
  readonly onClose: () => void;
  readonly onBuy: () => void;
  readonly onArtist: (artist: Artist) => void;
  readonly t: (key: string) => string;
}): React.ReactElement {
  return (
    <div
      style={SKIN}
      role="dialog"
      aria-label={piece.title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,8,6,0.72)] md:items-center md:p-6"
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[22px] bg-[var(--nag)] text-[color:var(--room-2)] md:max-h-[86vh] md:rounded-[22px]">
        <button type="button" onClick={onClose} aria-label={t('art.close')} className="flex w-full shrink-0 justify-center py-3">
          <span className="h-1 w-10 rounded-full bg-[var(--lyn)]" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <Sleeve url={piece.url} alt={`${piece.title}, ${piece.by}`} seal />

          <h3 className="pt-4 text-[22px] font-bold leading-tight text-[color:var(--room)]">{piece.title}</h3>
          {artist ? (
            <button
              type="button"
              onClick={() => onArtist(artist)}
              className="pt-1 text-[14px] text-[color:var(--brons)] underline underline-offset-4"
            >
              {piece.by}
            </button>
          ) : (
            <p className="pt-1 text-[14px]">{piece.by}</p>
          )}

          <p className="pt-4 text-[14px] leading-relaxed">{t('art.oneOnly')}</p>

          <ul className="space-y-2 pt-4">
            {[t('art.get.1'), t('art.get.2'), t('art.get.3'), t('art.get.4')].map((one) => (
              <li key={one} className="flex gap-2 text-[14px] leading-relaxed">
                <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[color:var(--brons)]" aria-hidden />
                {one}
              </li>
            ))}
          </ul>

          <p className={`${MIKRO} pt-4`}>{t('art.marked')}</p>
        </div>

        <div className="shrink-0 border-t border-[var(--lyn)] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
          <button type="button" onClick={onBuy} className={VUL}>
            {t('art.buy')} · R{piece.rand}
          </button>
        </div>
      </div>
    </div>
  );
}
/* ──────────────────────────────────────────────────────────── the painter ── */

/**
 * One artist, and everything they have for sale.
 *
 * Carli: *"Elke kunstenaar moet ook 'n profile hê met hulle eie kunswerk
 * in, want een kunstenaar kan nogal baie album art hê."*
 *
 * The crate shows one sleeve at a time, which is right for browsing and
 * wrong for a painter with eleven works — they were eleven sleeves
 * scattered through it with no way to see them as a body of work. Here
 * they are a body of work: their words at the top, then their shelf.
 *
 * Their sold pieces are a NUMBER and not a row of pictures. A portfolio of
 * things nobody can buy is a wall of disappointments, and "7 verkoop" says
 * the thing that matters about them — that this painter sells — in four
 * characters.
 */
function ArtistSheet({
  artist,
  pieces,
  onClose,
  onBuy,
  onAsk,
  t,
}: {
  readonly artist: Artist;
  readonly pieces: readonly WallPiece[];
  readonly onClose: () => void;
  readonly onBuy: (piece: WallPiece) => void;
  readonly onAsk: () => void;
  readonly t: (key: string) => string;
}): React.ReactElement {
  return (
    <div
      style={SKIN}
      role="dialog"
      aria-label={artist.name}
      data-profile={artist.id}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,8,6,0.72)] md:items-center md:p-6"
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[22px] bg-[var(--nag)] text-[color:var(--room-2)] md:max-h-[86vh] md:rounded-[22px]">
        <button type="button" onClick={onClose} aria-label={t('art.close')} className="flex w-full shrink-0 justify-center py-3">
          <span className="h-1 w-10 rounded-full bg-[var(--lyn)]" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <span className="block h-px w-9 bg-[var(--brons)]" aria-hidden />
          <h3
            className="pt-3 text-[28px] leading-tight text-[color:var(--room)]"
            style={{ fontFamily: 'var(--vertoon)' }}
          >
            {artist.name}
          </h3>
          <p className={`${MIKRO} pt-1.5`}>
            {artist.place && `${artist.place} · `}
            {pieces.length} {t('art.forSaleNow')}
            {artist.sold > 0 && ` · ${artist.sold} ${t('art.soldAlready')}`}
          </p>

          {artist.about && (
            <p className="whitespace-pre-wrap pt-4 text-[14px] leading-relaxed">{artist.about}</p>
          )}

          <div className="grid grid-cols-2 gap-4 pt-6">
            {pieces.map((piece) => (
              <div key={piece.id} data-profilepiece={piece.id}>
                <Sleeve url={piece.url} alt={`${piece.title}, ${piece.by}`} seal />
                <p
                  className="truncate pt-2 text-[16px] leading-tight text-[color:var(--room)]"
                  style={{ fontFamily: 'var(--vertoon)' }}
                >
                  {piece.title}
                </p>
                <button type="button" className={`${LEEG} mt-1.5 w-full`} onClick={() => onBuy(piece)}>
                  R{piece.rand}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--lyn)] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
          <button type="button" className={VUL} onClick={onAsk}>
            {t('art.askThem')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── the order ── */

/**
 * The whole of what a buyer may say to an artist.
 *
 * Two presses and no keyboard: "I want unique art", then which of your own
 * songs it is for. There is no text input in this component and there must
 * never be one — see the note at the top of the file, and `check:artmarket`,
 * which reads this function's own body.
 *
 * It rises from the bottom with the one thing to do pinned where a thumb
 * already is. A website opens a page; an app raises a sheet over what you
 * were looking at.
 */
function Popout({
  artist,
  songs,
  onClose,
  onAsk,
  t,
}: {
  readonly artist: Artist;
  readonly songs: readonly Track[];
  readonly onClose: () => void;
  readonly onAsk: (song: Track) => Promise<boolean>;
  readonly t: (key: string) => string;
}): React.ReactElement {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState('');

  return (
    <div
      style={SKIN}
      role="dialog"
      aria-label={artist.name}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,8,6,0.72)] md:items-center md:p-6"
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-[22px] bg-[var(--nag)] text-[color:var(--room-2)] md:max-h-[84vh] md:rounded-[22px]">
        <button type="button" onClick={onClose} aria-label={t('art.close')} className="flex w-full shrink-0 justify-center py-3">
          <span className="h-1 w-10 rounded-full bg-[var(--lyn)]" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <span className="block h-px w-9 bg-[var(--brons)]" aria-hidden />
          <h3
            className="pt-3 text-[26px] leading-tight text-[color:var(--room)]"
            style={{ fontFamily: 'var(--vertoon)' }}
          >
            {artist.name}
          </h3>
          {artist.place && <p className={`${MIKRO} pt-1.5`}>{artist.place}</p>}

          <p className="pt-4 text-[14px] leading-relaxed">{t('art.orderWhat')}</p>

          {picking && (
            <div className="pt-6">
              <p className="text-[13px] font-semibold text-[color:var(--room)]">{t('art.whichSong')}</p>
              <p className="pt-1.5 text-[13px] leading-relaxed text-[color:var(--gedemp)]">{t('art.whyButtons')}</p>
              {songs.length === 0 ? (
                <p className="pt-4 text-[14px]">{t('art.noSongs')}</p>
              ) : (
                <ul className="space-y-2 pt-4">
                  {songs.map((song) => (
                    <li key={song.id}>
                      <button
                        type="button"
                        className={`${LEEG} w-full justify-start`}
                        disabled={busy !== ''}
                        onClick={async () => {
                          setBusy(song.id);
                          await onAsk(song);
                          setBusy('');
                        }}
                      >
                        {busy === song.id && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                        <span className="truncate">{song.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {!picking && (
          <div className="shrink-0 border-t border-[var(--lyn)] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
            <button type="button" className={VUL} onClick={() => setPicking(true)} data-ask>
              {t('art.want')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────── the bottom of the room ── */

/**
 * Your shelf, and your songs.
 *
 * Pick a sleeve, pick a song, and the credit goes onto it — which is what
 * makes it travel into the channel and into Live.
 */
function PutOnSong({
  owned,
  songs,
  onPut,
  t,
}: {
  readonly owned: readonly Owned[];
  readonly songs: readonly Track[];
  readonly onPut: (work: string, trackId: string) => Promise<boolean>;
  readonly t: (key: string) => string;
}): React.ReactElement {
  const [piece, setPiece] = useState('');
  const [song, setSong] = useState('');
  const [busy, setBusy] = useState(false);

  if (owned.length === 0) {
    return <p className="text-[14px] leading-relaxed">{t('art.noneOwned')}</p>;
  }

  return (
    <div className="space-y-7">
      <div>
        <p className={MIKRO}>{t('art.shelf')}</p>
        <div className="grid grid-cols-3 gap-3 pt-3 md:grid-cols-5">
          {owned.map((one) => (
            <button key={one.id} type="button" onClick={() => setPiece(one.id)} aria-pressed={piece === one.id}>
              <Sleeve
                url={one.url}
                alt={`${one.title}, ${one.by}`}
                className={piece === one.id ? 'outline outline-2 outline-offset-2 outline-[var(--brons)]' : ''}
              />
              <span className={`${MIKRO} mt-1.5 block truncate`}>{one.by}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className={MIKRO}>{t('art.yourSongs')}</p>
        {songs.length === 0 ? (
          <p className="pt-3 text-[14px]">{t('art.noSongs')}</p>
        ) : (
          <ul className="space-y-2 pt-3">
            {songs.map((one) => (
              <li key={one.id}>
                <button
                  type="button"
                  onClick={() => setSong(one.id)}
                  aria-pressed={song === one.id}
                  className={`w-full justify-start ${
                    song === one.id
                      ? 'inline-flex min-h-[44px] items-center rounded-full bg-[var(--brons)] px-4 text-[13px] font-bold text-[#17120B]'
                      : LEEG
                  }`}
                >
                  <span className="truncate">{one.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <button
          type="button"
          disabled={!piece || !song || busy}
          className={VUL}
          onClick={async () => {
            setBusy(true);
            await onPut(piece, song);
            setBusy(false);
          }}
        >
          {busy ? t('art.putting') : t('art.putOn')}
        </button>
        <p className="pt-3 text-[13px] leading-relaxed text-[color:var(--gedemp)]">{t('art.credit')}</p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────── becoming an artist ── */

/**
 * Applying to sell here.
 *
 * Two fields, and that is deliberate.
 *
 *   *"Die artist se box moet net vra vir naam, en profile, en dan in die
 *    profile boks moet daar staan wat jy moet skryf, write something about
 *    yourself, your art and create a profile which the public will view."*
 *
 * It asked for a third — where they work from — and a third field on a
 * form somebody fills in once, on a phone, to sell a painting is a third
 * chance to close the tab. The placeholder in the big box is hers, word
 * for word, because a blank box labelled "about you" gets one sentence
 * and a box that says what it is for gets a profile.
 */
function Apply({
  onApply,
  t,
}: {
  readonly onApply: (name: string, about: string) => Promise<boolean>;
  readonly t: (key: string) => string;
}): React.ReactElement {
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="max-w-md space-y-4">
      <p className="text-[14px] leading-relaxed">{t('art.applyWhy')}</p>
      <label className="block">
        <span className={MIKRO}>{t('art.yourName')}</span>
        <input value={name} onChange={(event) => setName(event.target.value)} className={VELD} />
      </label>
      <label className="block">
        <span className={MIKRO}>{t('art.yourProfile')}</span>
        <textarea
          value={about}
          onChange={(event) => setAbout(event.target.value)}
          rows={7}
          placeholder={t('art.profileHint')}
          className={`${VELD} placeholder:text-[color:var(--gedemp)]`}
        />
      </label>
      <button
        type="button"
        disabled={name.trim() === '' || busy}
        className={VUL}
        onClick={async () => {
          setBusy(true);
          await onApply(name, about);
          setBusy(false);
        }}
      >
        {busy ? t('art.applying') : t('art.apply')}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────── bringing somebody in ── */

/**
 * The owner's way to put a real artist on the wall.
 *
 * Carli, 20 September 2026: *"Ek het nou reeds 'n kunstenaar wat ek wil in
 * sit. Hoe kan ek die kunswerke vir jou gee?"*
 *
 * The honest answer is that she does not give them to anybody — they go
 * straight from her phone into the private bucket, here. The pieces cannot
 * live in the repository (they are somebody's paintings, not code) and
 * nobody but her holds the keys, so any path that goes through me is a
 * path with an extra copy of an artist's work on it.
 *
 * What was in the way was the door: `apply` exists for a painter who has a
 * FutureBox account, and hers does not have one. So this creates a HOUSE
 * artist — a row with no account behind it — writes their words, lets them
 * in, and uploads their work on their behalf. If that painter ever makes
 * an account, the profile is already there with their work in it.
 *
 * This is the one place `approved` is ever written, and it is owner-only
 * on the server as well as here. A hidden button is not a closed door.
 */
function BringArtist({
  artists,
  onDo,
  onProblem,
  lang,
  t,
}: {
  readonly artists: readonly AnyArtist[];
  readonly onDo: (body: Record<string, unknown>) => Promise<boolean>;
  readonly onProblem: (said: string) => void;
  readonly lang: 'en' | 'af';
  readonly t: (key: string) => string;
}): React.ReactElement {
  /** The row being written: '' is nobody, 'new' is a fresh one. */
  const [open, setOpen] = useState('');
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [busy, setBusy] = useState(false);
  /** Which artist a piece is being hung for, and what it is called. */
  const [hanging, setHanging] = useState('');
  const [title, setTitle] = useState('');
  const [rand, setRand] = useState(String(START_RAND));

  const money = useMemo(() => split(Number(rand) || START_RAND), [rand]);

  const start = (who: AnyArtist | null): void => {
    setOpen(who ? who.id : 'new');
    setName(who?.name ?? '');
    setAbout(who?.about ?? '');
  };

  return (
    <div className="space-y-6">
      <p className="text-[14px] leading-relaxed">{t('art.bringWhy')}</p>

      {artists.length > 0 && (
        <ul className="space-y-3">
          {artists.map((one) => (
            <li
              key={one.id}
              data-anyartist={one.id}
              className="rounded-[4px] border border-[var(--lyn)] bg-[var(--nag-2)] p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p
                  className="text-[19px] leading-tight text-[color:var(--room)]"
                  style={{ fontFamily: 'var(--vertoon)' }}
                >
                  {one.name}
                </p>
                <p className={MIKRO}>
                  {one.approved ? t('art.isIn') : t('art.waitingRoom')}
                  {one.house && ` · ${t('art.houseArtist')}`}
                </p>
              </div>
              <p className={`${MIKRO} pt-1`}>
                {one.works} {t('art.forSaleNow')} · {one.sold} {t('art.soldAlready')}
              </p>

              <div className="flex flex-wrap gap-2 pt-3">
                <button
                  type="button"
                  className={LEEG}
                  onClick={() =>
                    void onDo({
                      what: 'artist',
                      artist: one.id,
                      name: one.name,
                      about: one.about,
                      approved: !one.approved,
                    })
                  }
                >
                  {one.approved ? t('art.takeOut') : t('art.letIn')}
                </button>
                <button type="button" className={LEEG} onClick={() => start(one)}>
                  {t('art.editWords')}
                </button>
                <button
                  type="button"
                  className={LEEG}
                  onClick={() => setHanging(hanging === one.id ? '' : one.id)}
                  aria-expanded={hanging === one.id}
                >
                  {t('art.hangFor')}
                </button>
              </div>

              {/* Hanging a piece for them. The only file input a buyer
                  could ever reach is behind the owner check on the server,
                  so this being on the screen is not what makes it safe. */}
              {hanging === one.id && (
                <div className="space-y-3 pt-4">
                  <p className="text-[13px] leading-relaxed text-[color:var(--gedemp)]">{ART_SIZE_SAID[lang]}</p>
                  <label className="block">
                    <span className={MIKRO}>{t('art.pieceName')}</span>
                    <input value={title} onChange={(event) => setTitle(event.target.value)} className={VELD} />
                  </label>
                  <label className="block max-w-[220px]">
                    <span className={MIKRO}>
                      {t('art.price')} R{START_RAND}
                    </span>
                    <input
                      type="number"
                      min={START_RAND}
                      value={rand}
                      onChange={(event) => setRand(event.target.value)}
                      className={VELD}
                    />
                  </label>
                  <p className="text-[13px] leading-relaxed">
                    {t('art.theyGet')}{' '}
                    <strong className="text-[color:var(--room)]">R{money.artist.toFixed(2)}</strong>{' '}
                    {t('art.afterFees')} R{money.gateway.toFixed(2)}.
                  </p>
                  <label className={`${VUL} cursor-pointer`}>
                    {busy ? t('art.uploading') : t('art.choose')}
                    <input
                      type="file"
                      accept="image/*"
                      data-take="ownerart"
                      className="sr-only"
                      disabled={busy || title.trim() === ''}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (!file) return;
                        setBusy(true);
                        const made = await hangable(file, one.name, one.id, lang, onProblem, t);
                        if (made) {
                          await onDo({
                            what: 'listed',
                            artist: one.id,
                            title,
                            path: made.path,
                            preview: made.preview,
                            rand: Number(rand) || START_RAND,
                          });
                          setTitle('');
                        }
                        setBusy(false);
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Their words, written by her where the painter is not an
                  app user. Their profile has to say something, and the
                  person who knows what it should say is the one who knows
                  them. */}
              {open === one.id && (
                <div className="space-y-3 pt-4">
                  <label className="block">
                    <span className={MIKRO}>{t('art.theirName')}</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} className={VELD} />
                  </label>
                  <label className="block">
                    <span className={MIKRO}>{t('art.theirProfile')}</span>
                    <textarea
                      value={about}
                      onChange={(event) => setAbout(event.target.value)}
                      rows={7}
                      placeholder={t('art.profileHint')}
                      className={`${VELD} placeholder:text-[color:var(--gedemp)]`}
                    />
                  </label>
                  <button
                    type="button"
                    className={VUL}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const ok = await onDo({
                        what: 'artist',
                        artist: one.id,
                        name,
                        about,
                        approved: one.approved,
                      });
                      if (ok) setOpen('');
                      setBusy(false);
                    }}
                  >
                    {t('art.saveWords')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {open === 'new' ? (
        <div className="space-y-3 rounded-[4px] border border-[var(--brons)] p-4">
          <p className={MIKRO}>{t('art.newArtist')}</p>
          <label className="block">
            <span className={MIKRO}>{t('art.theirName')}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} className={VELD} />
          </label>
          <label className="block">
            <span className={MIKRO}>{t('art.theirProfile')}</span>
            <textarea
              value={about}
              onChange={(event) => setAbout(event.target.value)}
              rows={7}
              placeholder={t('art.profileHint')}
              className={`${VELD} placeholder:text-[color:var(--gedemp)]`}
            />
          </label>
          <button
            type="button"
            className={VUL}
            disabled={name.trim() === '' || busy}
            onClick={async () => {
              setBusy(true);
              /* Let in straight away. She is the one approving, and a
                 waiting room she puts somebody into herself is a step
                 that exists only to be undone. */
              const ok = await onDo({ what: 'artist', name, about, approved: true });
              if (ok) {
                setOpen('');
                setName('');
                setAbout('');
              }
              setBusy(false);
            }}
          >
            {t('art.addArtist')}
          </button>
        </div>
      ) : (
        <button type="button" className={VUL} onClick={() => start(null)}>
          {t('art.addArtist')}
        </button>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── the desk ── */

/**
 * What an approved artist sees: hang a piece, and answer the orders.
 *
 * The only file input in this room lives here, and the route refuses an
 * upload from anybody without an approved artist row. Both, because a
 * hidden button is not a closed door.
 */
function ArtistDesk({
  /** Their own name, which goes into the watermark on their previews. */
  name: mine,
  threads,
  onDo,
  onProblem,
  saidState,
  lang,
  t,
}: {
  readonly name: string;
  readonly threads: readonly Thread[];
  readonly onDo: (body: Record<string, unknown>) => Promise<boolean>;
  readonly onProblem: (said: string) => void;
  readonly saidState: (state: OfferState) => string;
  readonly lang: 'en' | 'af';
  readonly t: (key: string) => string;
}): React.ReactElement {
  const [title, setTitle] = useState('');
  const [rand, setRand] = useState(String(START_RAND));
  const [busy, setBusy] = useState(false);
  const [priced, setPriced] = useState<Record<string, { rand: string; days: number }>>({});

  const money = useMemo(() => split(Number(rand) || START_RAND), [rand]);

  return (
    <div className="space-y-9">
      <div className="max-w-md space-y-4">
        <p className={MIKRO}>{t('art.hang')}</p>
        <p className="text-[13px] leading-relaxed text-[color:var(--gedemp)]">{ART_SIZE_SAID[lang]}</p>
        <label className="block">
          <span className={MIKRO}>{t('art.pieceName')}</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className={VELD} />
        </label>
        <label className="block">
          <span className={MIKRO}>
            {t('art.price')} R{START_RAND}
          </span>
          <input
            type="number"
            min={START_RAND}
            value={rand}
            onChange={(event) => setRand(event.target.value)}
            className={VELD}
          />
        </label>
        {/* What they take home, said before they set the price rather than
            discovered on a statement. The gateway comes off first and 70/30
            is on what is left — `split` is the one place that lives. */}
        <p className="text-[14px] leading-relaxed">
          {t('art.youGet')} <strong className="text-[color:var(--room)]">R{money.artist.toFixed(2)}</strong>{' '}
          {t('art.afterFees')} R{money.gateway.toFixed(2)}.
        </p>
        <label className={`${VUL} cursor-pointer`}>
          {busy ? t('art.uploading') : t('art.choose')}
          <input
            type="file"
            accept="image/*"
            data-take="artwork"
            className="sr-only"
            disabled={busy || title.trim() === ''}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              setBusy(true);
              const made = await hangable(file, mine, undefined, lang, onProblem, t);
              if (made) {
                await onDo({
                  what: 'listed',
                  title,
                  path: made.path,
                  preview: made.preview,
                  rand: Number(rand) || START_RAND,
                });
                setTitle('');
              }
              setBusy(false);
            }}
          />
        </label>
      </div>

      <div>
        <p className={MIKRO}>{t('art.asks')}</p>
        {threads.length === 0 ? (
          <p className="pt-3 text-[14px]">{t('art.noAsks')}</p>
        ) : (
          <ul className="space-y-5 pt-3">
            {threads.map((thread) => {
              const draft = priced[thread.id] ?? { rand: String(UNIQUE_RAND), days: WINDOWS[0].days };
              return (
                <li key={thread.id} className="rounded-[4px] border border-[var(--lyn)] bg-[var(--nag-2)] p-4">
                  <p
                    className="text-[19px] leading-tight text-[color:var(--room)]"
                    style={{ fontFamily: 'var(--vertoon)' }}
                  >
                    {thread.songTitle}
                  </p>
                  {thread.offer && <StatusBar state={thread.offer.state} said={saidState(thread.offer.state)} />}

                  {!thread.offer && (
                    <div className="space-y-4 pt-4">
                      <label className="block max-w-[220px]">
                        <span className={MIKRO}>{t('art.yourPrice')}</span>
                        <input
                          type="number"
                          min={1}
                          value={draft.rand}
                          onChange={(event) =>
                            setPriced((was) => ({ ...was, [thread.id]: { ...draft, rand: event.target.value } }))
                          }
                          className={VELD}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {WINDOWS.map((one) => (
                          <button
                            key={one.days}
                            type="button"
                            aria-pressed={draft.days === one.days}
                            onClick={() =>
                              setPriced((was) => ({ ...was, [thread.id]: { ...draft, days: one.days } }))
                            }
                            className={
                              draft.days === one.days
                                ? 'inline-flex min-h-[44px] items-center rounded-full bg-[var(--brons)] px-4 text-[13px] font-bold text-[#17120B]'
                                : LEEG
                            }
                          >
                            {one[lang]}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={VUL}
                        onClick={() =>
                          void onDo({
                            what: 'offer',
                            request: thread.id,
                            rand: Number(draft.rand) || UNIQUE_RAND,
                            days: draft.days,
                          })
                        }
                      >
                        {t('art.send')}
                      </button>
                    </div>
                  )}

                  {/* The upload appears only once the buyer has accepted,
                      and it goes to that one person. Her rule: *"'n upload
                      button wat net aan daardie persoon geupload kan word."* */}
                  {thread.offer?.state === 'accepted' && (
                    <label className={`${VUL} mt-4 cursor-pointer`}>
                      {t('art.deliver')}
                      <input
                        type="file"
                        accept="image/*"
                        data-take="delivery"
                        className="sr-only"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          if (!file) return;
                          /* One clean file. A commission is delivered to
                             one person who has already paid, so there is
                             no preview to make and nobody to protect it
                             from. */
                          const made = await square(file, ART_SIDE);
                          if (made.ok !== true) {
                            onProblem(t('art.badFile'));
                            return;
                          }
                          if (made.blob.size > ART_MAX_BYTES) {
                            onProblem(ART_SIZE_SAID[lang]);
                            return;
                          }
                          const path = await putInBucket(made.blob, 'delivery', undefined, lang, onProblem, t);
                          if (path) await onDo({ what: 'deliver', offer: thread.offer?.id, path });
                        }}
                      />
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
