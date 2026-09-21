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
import { ArrowLeft, Check, ChevronDown, Loader2 } from 'lucide-react';
import { barClearance } from './TabBar';
import { accessToken, getStorageClient } from '../lib/cloud';
import { refusalText } from '../lib/apierror';
import { useCopilotOps } from '../lib/copilotactions';
import { useBackLayer } from '../lib/backstack';
import { useLang } from '../lib/i18n';
import { loadTracks, type Track } from '../lib/library';
import { square } from '../lib/imagefile';
import { previewOf } from '../lib/artmark';
import {
  ART_MAX_BYTES,
  ART_SIDE,
  ART_SIZE_SAID,
  AUCTION_HOURS,
  START_RAND,
  UNIQUE_RAND,
  WINDOWS,
  split,
} from '../data/artmarket';

/* ────────────────────────────────────────────────────────────── the skin ── */

/**
 * The room's colour is the app's colour. Nothing here is a new palette.
 *
 * ── The mistake this replaces ────────────────────────────────────────────
 *
 * Four times Carli said this room looked like *"'n website binne 'n app"*,
 * and four times I answered by making it MORE its own thing: cream paper,
 * an indigo accent, a serif. The comment that used to stand here said so
 * out loud — *"it is not emerald, which is the rest of this app, which is
 * the point"* — and that sentence was the bug, written down and shipped.
 *
 * A room that carries its own palette IS a foreign page. On her screen it
 * read as three colour systems stacked: green app chrome at the top, a
 * cream-and-purple card in the middle, the app's own page around it. Her
 * instruction had already said the answer and I had read it as being about
 * the inside of the room: *"daai hele bladsy en kamer moet die selfde
 * kleur en tema regdeur hê."* The whole page AND the room. One theme.
 *
 * ── How this works ───────────────────────────────────────────────────────
 *
 * Every variable below is now an expression over the app's own families —
 * `--fb-surface-*` for paper and ink, `--fb-primary-*` for the accent —
 * which are what `bg-zinc-900` and `text-emerald-400` resolve to in every
 * other room (see `tailwind.config.js`). So the room follows the chosen
 * theme, light or dark, for free, and it cannot drift: there is no hex
 * here to go stale.
 *
 * The variables are kept rather than replaced with plain Tailwind classes
 * because the layout below already funnels through them — which is the one
 * thing the old version got right, and is why this is a small edit instead
 * of a fifth rebuild.
 *
 * ── Where the room's character lives instead ─────────────────────────────
 *
 * In the layout and in the work: big pictures, a lot of air, the price and
 * the clock as small quiet marks, one strong button per screen.
 *
 * The wall it all hangs on is `GALLERY_THEME` in `app/lib/theme.ts`, pulled
 * in by `[data-gallery]` on the studio's own root — warm near-black, gold,
 * and a serif, across the header and the rail and the copilot too, not just
 * inside this component. That is the difference between a room and a card
 * sitting in somebody else's page, and it is why this file no longer sets a
 * font of its own.
 */
const SKIN = {
  /* Which way the scale runs is worth saying, because I got it backwards
     once and shipped a black room into a light app: the HIGH stops are
     paper and the LOW stops are ink. `bg-zinc-950` — the page — resolves
     to surface-950, and `text-zinc-400` to surface-400. The families are
     defined that way round in `globals.css` so that markup written in the
     app's original dark idiom comes out light without a single class
     changing, and `check:theme` only solves stops 50–600 for text. */
  /** The ground the whole room stands on — what `bg-zinc-950` gives. */
  '--grond': 'rgb(var(--fb-surface-950))',
  /** A card on it — `bg-zinc-900`. */
  '--blad': 'rgb(var(--fb-surface-900))',
  /** Pressed, and where a picture has not loaded yet — `bg-zinc-800`. */
  '--leeg': 'rgb(var(--fb-surface-800))',
  /** The line between things — `border-zinc-800`. */
  '--lyn': 'rgb(var(--fb-surface-800))',
  /** The strongest text the theme has: `text-white` resolves to this. */
  '--ink': 'rgb(var(--fb-ink))',
  /** Body text and the quiet label. Both inside the stops solved for AA. */
  '--ink-2': 'rgb(var(--fb-surface-400))',
  '--gedemp': 'rgb(var(--fb-surface-500))',
  /** The app's own accent — `text-emerald-400`, and nothing else. */
  '--aksent': 'rgb(var(--fb-primary-500))',
  /** The accent at a tenth, for a chip or a track. */
  '--aksent-sag': 'rgb(var(--fb-primary-500) / 0.14)',
  /** Text that sits ON the accent. Dark in every theme, by design. */
  '--op-aksent': 'rgb(var(--fb-on-accent))',
} as React.CSSProperties;

/** The small label. One size, one weight, everywhere in the room. */
const MIKRO = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--gedemp)]';

/**
 * A card.
 *
 * A border rather than only a shadow, because a shadow is invisible on a
 * dark surface and this room now has to work in both. Same reasoning as
 * every other room in the app, which is the point.
 */
const KAART = 'rounded-2xl border border-[var(--lyn)] bg-[var(--blad)]';

/** The one filled button. The app's accent, and 50px — which is a thumb. */
const VUL =
  'inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--aksent)] px-6 text-[15px] font-bold text-[color:var(--op-aksent)] transition active:translate-y-px active:opacity-90 disabled:opacity-35';

/** Outlined, for everything that is not the one thing to do. */
const LEEG =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--lyn)] bg-[var(--blad)] px-4 text-[14px] font-semibold text-[color:var(--ink)] transition active:translate-y-px active:bg-[var(--leeg)] disabled:opacity-40';

/** A field. Quiet, and with a real label above it. */
const VELD =
  'mt-1.5 w-full rounded-xl border border-[var(--lyn)] bg-[var(--blad)] px-3.5 py-3 text-[16px] text-[color:var(--ink)] outline-none focus:border-[var(--aksent)] focus:ring-2 focus:ring-[var(--aksent-sag)]';

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
  /** Where the bidding opened. What gets paid is `top`. */
  readonly rand: number;
  /** The standing highest bid, or null when nobody has bid yet. */
  readonly top: number | null;
  readonly bids: number;
  /** The least a new bid may be. */
  readonly next: number;
  readonly endsAt: string | null;
  /** False until somebody has bid. A piece with no bids waits. */
  readonly started: boolean;
  readonly over: boolean;
  readonly wonByMe: boolean;
  /** Whether this person has bought into THIS piece. Per piece, her rule. */
  readonly mineToBid: boolean;
  readonly leadingMe: boolean;
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
  /** Whether this person has paid the once-off pass and may bid. */
  readonly bidderRand: number;
  /** True when OWNER_EMAIL is unset, so nobody is the owner. See the route. */
  readonly noOwner: boolean;
  readonly wall: readonly WallPiece[];
  readonly bought: readonly Owned[];
  readonly asBuyer: readonly Thread[];
  readonly asArtist: readonly Thread[];
  /** Owner only: every request waiting on an artist who has no account. */
  readonly asHouse: readonly (Thread & { artist: string })[] | null;
  readonly me: { readonly id: string; readonly name: string; readonly approved: boolean } | null;
}

/** The steps a commission goes through, in order, for the status bar. */
const STEPS: readonly OfferState[] = ['offered', 'paid', 'accepted', 'delivered'];

/* ───────────────────────────────────────────────────────────── the clock ── */

/**
 * How long is left, counted down on the screen.
 *
 * Her rule: *"die hoogste bee wen die art binne 36 hours."* A deadline
 * shown as a date is a deadline somebody works out; shown as "4h 12m" it
 * is a deadline somebody acts on, which is the entire point of putting a
 * clock on an auction.
 *
 * It ticks every thirty seconds rather than every second. A second hand
 * on a thirty-six hour clock is a re-render a minute for nothing, and
 * under a minute the words carry it instead of the number.
 */
function Countdown({
  endsAt,
  started,
  over,
  t,
}: {
  readonly endsAt: string | null;
  /** False until somebody has bid. Not started is not over. */
  readonly started?: boolean;
  readonly over: boolean;
  readonly t: (key: string) => string;
}): React.ReactElement | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const beat = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(beat);
  }, []);

  /* Her rule: *"Die beeing begin wanneer iemand begin bee."* A piece
     nobody has bid on has no clock at all, and that state is worth
     naming — silence here reads as a clock that failed to load. */
  if (!endsAt) {
    return started === false
      ? <span className={`${MIKRO} shrink-0 normal-case tracking-normal`}>{t('art.notStarted')}</span>
      : null;
  }
  const left = new Date(endsAt).getTime() - now;
  if (over || left <= 0) return <span className={MIKRO}>{t('art.over')}</span>;

  const hours = Math.floor(left / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  /* Under an hour it goes amber, because at that point the number is no
     longer information — it is a reason to press something. */
  const soon = left < 3_600_000;
  return (
    <span
      className={`shrink-0 rounded-[8px] px-2 py-1 text-[11px] font-bold ${
        soon ? 'bg-amber-500/15 text-amber-400' : 'bg-[var(--leeg)] text-[color:var(--ink-2)]'
      }`}
    >
      {hours > 0 ? `${hours}u ${minutes}m` : `${minutes}m`} {t('art.left')}
    </span>
  );
}

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
            borderColor: 'var(--aksent)',
            color: 'var(--aksent)',
            background: 'rgba(255,255,255,0.92)',
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
          className="flex min-h-[52px] w-full items-center justify-between gap-3 py-3 text-left text-[13px] font-semibold text-[color:var(--ink)]"
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
                state !== 'declined' && index <= reached ? 'var(--aksent)' : 'var(--lyn)',
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
      const said = (await response.json().catch(() => null)) as
        (Market & { message?: string; which?: string; missing?: string[] }) | null;
      if (!response.ok || !said) {
        /* `which` on the end, in brackets.

           Carli sent a screenshot of "The gallery could not be read just
           now." and neither of us could act on it: five reads in the route
           produce that sentence, against five different tables, and the
           screen named none of them. The word is the route's own label —
           `works`, `bids`, `commissions` — never the database's message,
           which names columns and stays in the server log where
           `check:aifault` requires it. One screenshot now says which. */
        const why = refusalText(said, lang, t('art.failed'));
        /* And, when the route worked out why, the columns themselves.

           `(works)` got us one step and then still needed a hand-written
           query against `information_schema` to find that `ends_at` and
           `won_by` had never landed. The names are the route's own list,
           not Postgres' sentence — see `missingFrom` — so this says what
           to run without saying anything a stranger should not read. */
        const gone = said?.missing?.length ? ` ${t('art.missing')} ${said.missing.join(', ')}` : '';
        setProblem(`${said?.which ? `${why} (${said.which})` : why}${gone}`);
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

  /* ── Coming back from the till ────────────────────────────────────────

     Carli, 21 September 2026: *"Ek betaal die R50 om die bid te begin,
     maar dan gebeur daar niks nie. Daar is nie 'n countdown nie en nie 'n
     teen bid button nie."*

     The countdown and the bid button were both here and both correct. She
     never reached them: the till sent everybody back to the front page,
     so the room she had just paid inside was three taps away and looked
     untouched. The studio brings her back now and sends this.

     Two things, and the second matters as much as the first. Read again,
     because the webhook is what marks the buy-in and it lands while she is
     still being redirected — the room's own first read can easily be the
     state from BEFORE she paid, which is the same nothing wearing a second
     hat. And say so, in the room, beside the piece.

     `paid` is not the copilot's to choose. It is described in the registry
     as the studio's own, which is the price of using the one bus that can
     hold something for a room that has not mounted yet — and it is the
     right price: a second delivery mechanism for the same job is how two
     of them come to disagree. */
  const [justPaid, setJustPaid] = useState(false);
  useCopilotOps('albumart', {
    paid: () => {
      setJustPaid(true);
      void read();
    },
  });

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
      className="min-h-full bg-[var(--grond)] text-[color:var(--ink-2)]"
    >
      {/* ── The bar ─────────────────────────────────────────────────────
          Fifty-two pixels, a name, and nothing else. Not a masthead: a
          masthead is the thing that made this read as a page. */}
      {/* ── The title, in the content ───────────────────────────────────
          A bar across the top with a name in it is a website's nav. An
          app puts its title in the page, large, and lets it scroll away
          once you are looking at something. */}
      <header className="px-4 pt-6">
        <h2 className="text-[30px] font-bold leading-none tracking-tight text-[color:var(--ink)]">
          {t('art.title')}
        </h2>
      </header>

      {/* The segmented control. An app switches between the two or three
          things a screen is for; a page stacks them and makes you scroll. */}
      <div role="tablist" className="mx-4 mt-4 flex gap-1 rounded-[14px] bg-[var(--aksent-sag)] p-1">
        {TABS.map((one) => (
          <button
            key={one.id}
            type="button"
            role="tab"
            aria-selected={tab === one.id}
            onClick={() => setTab(one.id)}
            /* The live one is lifted out of the track rather than
               filled in: that is the control every phone uses to say
               "one screen, three ways", and it is the most app-shaped
               thing on here. */
            className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-[11px] px-2 text-[14px] font-semibold transition ${
              tab === one.id
                ? 'bg-[var(--blad)] text-[color:var(--aksent)] ring-1 ring-[var(--lyn)]'
                : 'text-[color:var(--ink-2)]'
            }`}
          >
            {one.said}
            {one.count > 0 && <span className="text-[12px] opacity-60">{one.count}</span>}
          </button>
        ))}
      </div>

      {/* Something went wrong reads as something went wrong.

          This wore the accent, so "the gallery could not be read" arrived
          in the same colour as the Bid button — which on Carli's screen
          made a failure look like a feature. The app has a danger family
          and it follows the theme like everything else. */}
      {problem && (
        <p
          role="alert"
          className="mx-4 mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-[14px] text-rose-400"
        >
          {problem}
        </p>
      )}

      {/* The payment landed, said where the payment was for.

          Not a banner on the studio shell: this is news about a piece on
          this wall, and it belongs on the wall. It stays until she leaves
          the room rather than fading — she has just been sent out to a
          till and back, and a message that has gone by the time she looks
          up is the same nothing she reported. */}
      {justPaid && (
        <p
          role="status"
          className="mx-4 mt-3 rounded-xl border border-[var(--lyn)] bg-[var(--blad)] px-3 py-2.5 text-[14px]"
        >
          {t('art.paidBack')}
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
        <p className="px-4 pt-3 text-[13px] leading-relaxed text-[color:var(--ink-2)]">{t('art.whatThisIs')}</p>
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
                  className={`${KAART} block w-full overflow-hidden text-left transition active:scale-[0.985]`}
                >
                  <Sleeve url={piece.url} alt={`${piece.title}, ${piece.by}`} seal />
                  <span className="block p-3">
                    <span className="block truncate text-[15px] font-semibold text-[color:var(--ink)]">
                      {piece.title}
                    </span>
                    <span className="block truncate pt-0.5 text-[13px] text-[color:var(--gedemp)]">
                      {piece.by}
                    </span>
                    <span className="mt-2.5 flex items-center justify-between gap-2">
                      {/* The standing bid, not a price. Everything here
                          is an auction: `rand` is where it opened, and
                          this is what somebody would have to beat. */}
                      <span className="text-[17px] font-bold text-[color:var(--aksent)]">
                        R{piece.top ?? piece.rand}
                      </span>
                      <Countdown endsAt={piece.endsAt} started={piece.started} over={piece.over} t={t} />
                    </span>
                    {piece.leadingMe && !piece.over && (
                      <span className="mt-2 block rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-400">
                        {t('art.youLead')}
                      </span>
                    )}
                    {piece.wonByMe && (
                      <span className="mt-2 block rounded-lg bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-400">
                        {t('art.youWon')}
                      </span>
                    )}
                  </span>
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
                    className="flex w-full items-center gap-3 rounded-[4px] border border-[var(--lyn)] bg-[var(--blad)] p-3 text-left active:bg-[var(--leeg)]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold text-[color:var(--ink)]">
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
                    className="rounded-[4px] border border-[var(--lyn)] bg-[var(--blad)] p-4"
                  >
                    <p className={MIKRO}>{thread.by}</p>
                    <p className="pt-1 text-[16px] font-semibold text-[color:var(--ink)]">{thread.songTitle}</p>
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
                          <>
                            <button
                              type="button"
                              className={`${VUL} mt-3`}
                              onClick={() => void pay({ kind: 'commission', offer: thread.offer?.id })}
                            >
                              {t('art.pay')} R{thread.offer.rand}
                            </button>
                            {/* Carli: *"Op album art moet die kunstenaar 'n aanbod
                                kan afkeer, asook die koper. Daardie knoppies is
                                nie daar nie."* Beside the price and not under a
                                menu: saying no to a number is as ordinary as
                                saying yes to it, and a thread with only one exit
                                is one nobody closes. Outlined, because the price
                                is still the thing to press. */}
                            <button
                              type="button"
                              className={`${LEEG} mt-2 w-full`}
                              onClick={() => void doIt({ what: 'decline', request: thread.id })}
                            >
                              {t('art.decline')}
                            </button>
                          </>
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
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[var(--lyn)] bg-[var(--blad)] p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold text-[color:var(--ink)]">{one.name}</p>
                      <p className={`${MIKRO} pt-1`}>
                        {one.pieces} {one.pieces === 1 ? t('art.piece') : t('art.pieces')}
                      </p>
                    </div>
                    <p className="text-[18px] font-bold text-[color:var(--aksent)]">R{one.rand.toFixed(2)}</p>
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
                waiting={market.asHouse ?? []}
                saidState={saidState}
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
            <p className="my-3 rounded-[4px] border border-[var(--aksent)] px-3 py-2.5 text-[13px] leading-relaxed text-[color:var(--aksent)]">
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
          onBid={(rand) => void doIt({ what: 'bid', work: sheet.id, rand })}
          onPass={() => void pay({ kind: 'bidpass', work: sheet.id })}
          bidderRand={market?.bidderRand ?? 50}
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
/**
 * The top of every sheet: a way out you can actually see.
 *
 * ── What this replaces ───────────────────────────────────────────────────
 *
 * A 40 x 4 pixel grab handle, painted in the room's border colour, with the
 * word "Close" only in an `aria-label`. Carli, 20 September 2026: *"Wanneer
 * mens binne artist se profile kyk is daar nie 'n back knoppie nie."*
 *
 * She is right and it was worse than it looks. The handle is the iOS
 * convention for a sheet you drag, and this sheet cannot be dragged — so it
 * was a control that looked like decoration and behaved like neither. Then
 * the gallery theme made the wall near-black and the border colour with it,
 * and the one pale bar that hinted at it disappeared entirely.
 *
 * So: an arrow and the word, left-aligned where a back button lives, at the
 * app's own 44px target. The handle stays, centred, because it still reads
 * as "this is a sheet" to anybody who knows the convention — it is just no
 * longer the only way out.
 *
 * One component for all three sheets. There were three copies of the old
 * handle, identical, which is how all three were wrong at once.
 */
function SheetTop({
  onClose,
  t,
}: {
  readonly onClose: () => void;
  readonly t: (key: string) => string;
}): React.ReactElement {
  return (
    <div className="relative flex shrink-0 items-center px-2 pt-2 pb-1">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-[14px] font-semibold text-[color:var(--ink)] transition active:translate-y-px active:bg-[var(--leeg)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t('art.back')}
      </button>
      {/* Still a sheet, and still says so. Not a button any more: two
          controls that do the same thing, one of them invisible, is what
          this is replacing. */}
      <span
        className="pointer-events-none absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-[var(--lyn)]"
        aria-hidden
      />
    </div>
  );
}

function WorkSheet({
  piece,
  artist,
  onClose,
  onBuy,
  onBid,
  onPass,
  bidderRand,
  onArtist,
  t,
}: {
  readonly piece: WallPiece;
  readonly artist: Artist | null;
  readonly onClose: () => void;
  readonly onBuy: () => void;
  readonly onBid: (rand: number) => void;
  /** Take the once-off pass that makes somebody a bidder. */
  readonly onPass: () => void;
  readonly bidderRand: number;
  readonly onArtist: (artist: Artist) => void;
  readonly t: (key: string) => string;
}): React.ReactElement {
  return (
    <div
      style={{ ...SKIN, paddingBottom: barClearance(0) }}
      role="dialog"
      aria-label={piece.title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/60 md:items-center md:p-6"
      /* The sheet ends ABOVE the tab bar, rather than reaching under it.

         Carli: *"Al die onderste buttons kruip weg agter die hoof
         buttons."* Padding inside the sheet's scrolling body was not
         enough and was the wrong shape of answer: it made the button
         reachable by scrolling to it, when the complaint is that the one
         button the sheet exists for is not on the screen. A bottom sheet
         is anchored to the bottom of the space it HAS, and in this app
         that space stops where the tab bar starts. On a desktop the bar
         is not there and `md:` keeps the sheet centred as before. */
    >
      {/* `max-h-full`, not a share of the viewport.
          Carli: *"Die back buttons is daar, maar is ook weggesteek."* They
          were, and it was my own fix from an hour earlier. The overlay now
          stops above the tab bar, so its content box is `100vh` minus the
          bar — but the sheet still asked for 92vh of the VIEWPORT, which is
          taller than the box it sits in. `items-end` pins the bottom, so
          the excess goes off the TOP, taking the back button with it.
          Full of its parent is the only number that cannot be wrong. */}
      <div className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-t-[22px] bg-[var(--grond)] text-[color:var(--ink-2)] md:max-h-[86vh] md:rounded-[22px]">
        <SheetTop onClose={onClose} t={t} />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          <Sleeve url={piece.url} alt={`${piece.title}, ${piece.by}`} seal />

          <h3 className="pt-4 text-[22px] font-bold leading-tight text-[color:var(--ink)]">{piece.title}</h3>
          {artist ? (
            <button
              type="button"
              onClick={() => onArtist(artist)}
              className="pt-1 text-[14px] text-[color:var(--aksent)] underline underline-offset-4"
            >
              {piece.by}
            </button>
          ) : (
            <p className="pt-1 text-[14px]">{piece.by}</p>
          )}

          {/* Where it stands, and how long is left. The three facts a
              bidder needs in the order they need them. */}
          <div className="mt-4 flex items-end justify-between gap-3 rounded-[4px] border border-[var(--lyn)] bg-[var(--blad)] p-3">
            <div>
              <p className={MIKRO}>{piece.top === null ? t('art.opensAt') : t('art.standing')}</p>
              <p className="pt-1 text-[24px] font-bold leading-none text-[color:var(--aksent)]">
                R{piece.top ?? piece.rand}
              </p>
              {piece.bids > 0 && (
                <p className={`${MIKRO} pt-1.5`}>
                  {piece.bids} {piece.bids === 1 ? t('art.oneBid') : t('art.manyBids')}
                </p>
              )}
            </div>
            <Countdown endsAt={piece.endsAt} started={piece.started} over={piece.over} t={t} />
          </div>

          <p className="pt-4 text-[14px] leading-relaxed">{t('art.oneOnly')}</p>
          <p className="pt-2 text-[13px] leading-relaxed text-[color:var(--gedemp)]">{t('art.howBidding')}</p>

          <ul className="space-y-2 pt-4">
            {[t('art.get.1'), t('art.get.2'), t('art.get.3'), t('art.get.4')].map((one) => (
              <li key={one} className="flex gap-2 text-[14px] leading-relaxed">
                <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[color:var(--aksent)]" aria-hidden />
                {one}
              </li>
            ))}
          </ul>

          <p className={`${MIKRO} pt-4`}>{t('art.marked')}</p>
        </div>

        <div className="shrink-0 border-t border-[var(--lyn)] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
          {/* Three states and one button, because at any moment there is
              exactly one thing to do: bid, pay for what you won, or
              nothing at all because somebody else won it. */}
          {piece.wonByMe ? (
            <button type="button" onClick={onBuy} className={VUL}>
              {t('art.payWin')} · R{piece.top ?? piece.rand}
            </button>
          ) : piece.over ? (
            <p className={`${MIKRO} py-3 text-center normal-case tracking-normal`}>{t('art.wentToSomebody')}</p>
          ) : piece.mineToBid ? (
            <button type="button" onClick={() => onBid(piece.next)} className={VUL}>
              {t('art.bid')} · R{piece.next}
            </button>
          ) : (
            /* ── The pass, before the bid ────────────────────────────
               Carli: *"elke persoon sal 'n R50 by in moet hê om te mag
               bee, want anders kan enige random mens die prys
               opstoot."* Said here, in front of the button it replaces,
               rather than as a refusal after somebody has already
               decided what to bid. */
            <>
              <p className="pb-3 text-[13px] leading-relaxed text-[color:var(--ink-2)]">{t('art.passWhy')}</p>
              <button type="button" onClick={onPass} className={VUL}>
                {t('art.takePass')} · R{bidderRand}
              </button>
            </>
          )}
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
      style={{ ...SKIN, paddingBottom: barClearance(0) }}
      role="dialog"
      aria-label={artist.name}
      data-profile={artist.id}
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/60 md:items-center md:p-6"
      /* The sheet ends ABOVE the tab bar, rather than reaching under it.

         Carli: *"Al die onderste buttons kruip weg agter die hoof
         buttons."* Padding inside the sheet's scrolling body was not
         enough and was the wrong shape of answer: it made the button
         reachable by scrolling to it, when the complaint is that the one
         button the sheet exists for is not on the screen. A bottom sheet
         is anchored to the bottom of the space it HAS, and in this app
         that space stops where the tab bar starts. On a desktop the bar
         is not there and `md:` keeps the sheet centred as before. */
    >
      {/* `max-h-full`, not a share of the viewport.
          Carli: *"Die back buttons is daar, maar is ook weggesteek."* They
          were, and it was my own fix from an hour earlier. The overlay now
          stops above the tab bar, so its content box is `100vh` minus the
          bar — but the sheet still asked for 92vh of the VIEWPORT, which is
          taller than the box it sits in. `items-end` pins the bottom, so
          the excess goes off the TOP, taking the back button with it.
          Full of its parent is the only number that cannot be wrong. */}
      <div className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-t-[22px] bg-[var(--grond)] text-[color:var(--ink-2)] md:max-h-[86vh] md:rounded-[22px]">
        <SheetTop onClose={onClose} t={t} />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          <span className="block h-px w-9 bg-[var(--aksent)]" aria-hidden />
          <h3
            className="pt-3 text-[28px] leading-tight text-[color:var(--ink)]"
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
                  className="truncate pt-2 text-[16px] leading-tight text-[color:var(--ink)]"
                >
                  {piece.title}
                </p>
                <button type="button" className={`${LEEG} mt-1.5 w-full`} onClick={() => onBuy(piece)}>
                  R{piece.top ?? piece.rand}
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
      style={{ ...SKIN, paddingBottom: barClearance(0) }}
      role="dialog"
      aria-label={artist.name}
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/60 md:items-center md:p-6"
      /* The sheet ends ABOVE the tab bar, rather than reaching under it.

         Carli: *"Al die onderste buttons kruip weg agter die hoof
         buttons."* Padding inside the sheet's scrolling body was not
         enough and was the wrong shape of answer: it made the button
         reachable by scrolling to it, when the complaint is that the one
         button the sheet exists for is not on the screen. A bottom sheet
         is anchored to the bottom of the space it HAS, and in this app
         that space stops where the tab bar starts. On a desktop the bar
         is not there and `md:` keeps the sheet centred as before. */
    >
      {/* `max-h-full`, not a share of the viewport.
          Carli: *"Die back buttons is daar, maar is ook weggesteek."* They
          were, and it was my own fix from an hour earlier. The overlay now
          stops above the tab bar, so its content box is `100vh` minus the
          bar — but the sheet still asked for 92vh of the VIEWPORT, which is
          taller than the box it sits in. `items-end` pins the bottom, so
          the excess goes off the TOP, taking the back button with it.
          Full of its parent is the only number that cannot be wrong. */}
      <div className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-t-[22px] bg-[var(--grond)] text-[color:var(--ink-2)] md:max-h-[84vh] md:rounded-[22px]">
        <SheetTop onClose={onClose} t={t} />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          <span className="block h-px w-9 bg-[var(--aksent)]" aria-hidden />
          <h3
            className="pt-3 text-[26px] leading-tight text-[color:var(--ink)]"
          >
            {artist.name}
          </h3>
          {artist.place && <p className={`${MIKRO} pt-1.5`}>{artist.place}</p>}

          <p className="pt-4 text-[14px] leading-relaxed">{t('art.orderWhat')}</p>

          {picking && (
            <div className="pt-6">
              <p className="text-[13px] font-semibold text-[color:var(--ink)]">{t('art.whichSong')}</p>
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
                className={piece === one.id ? 'outline outline-2 outline-offset-2 outline-[var(--aksent)]' : ''}
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
                      ? 'inline-flex min-h-[44px] items-center rounded-full bg-[var(--aksent)] px-4 text-[13px] font-bold text-[color:var(--op-aksent)]'
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
  waiting,
  saidState,
  onDo,
  onProblem,
  lang,
  t,
}: {
  readonly artists: readonly AnyArtist[];
  /** What is waiting on each artist who cannot sign in and answer it. */
  readonly waiting: readonly (Thread & { artist: string })[];
  readonly saidState: (state: OfferState) => string;
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
              className="rounded-[4px] border border-[var(--lyn)] bg-[var(--blad)] p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p
                  className="text-[19px] leading-tight text-[color:var(--ink)]"
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

              {/* ── Answering for them ──────────────────────────────

                  Carli: *"Because I have added the artist I am supposed to
                  approve this artwork. I want to test it."* A house artist
                  has no account, so a commission addressed to one waits on
                  somebody who cannot sign in. `art.bringWhy` already
                  promises this — you write their words, you hang their
                  work — and answering their post is the same sentence.

                  Only drawn when something is actually waiting: an empty
                  inbox under every name is a panel that says nothing four
                  times. */}
              {/* `ask`, not `one`. The list above already binds `one` to
                  the artist, and an inner `one` shadowed it into
                  `thread.artist === thread.id` — a string compared with
                  itself, always false, and the panel would simply never
                  have appeared. Both sides are strings, so nothing
                  complained. */}
              {waiting.some((ask) => ask.artist === one.id) && (
                <div className="pt-5">
                  <Inbox
                    threads={waiting.filter((ask) => ask.artist === one.id)}
                    artist={one.id}
                    onDo={onDo}
                    onProblem={onProblem}
                    saidState={saidState}
                    lang={lang}
                    t={t}
                  />
                </div>
              )}

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
                    <strong className="text-[color:var(--ink)]">R{money.artist.toFixed(2)}</strong>{' '}
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
        <div className="space-y-3 rounded-[4px] border border-[var(--aksent)] p-4">
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
 * One artist's inbox, wherever it is drawn.
 *
 * ── Why this is a component and not a second copy ────────────────────────
 *
 * Carli, having brought a painter in and then asked him for a piece:
 * *"Because I have added the artist I am supposed to approve this artwork.
 * I want to test it."*
 *
 * A house artist has no account by design — they are a real painter, not
 * an app member — so nobody can ever sign in as them to name a price, and
 * a commission addressed to one waited forever on somebody who does not
 * exist. The server has always let the owner act for them; only the screen
 * did not offer it.
 *
 * The obvious fix was to paste this markup into the owner's panel. Three
 * copies of a sheet handle is how all three sheets came to have no visible
 * way out at once, earlier the same night. So: one component, drawn twice.
 *
 * `artist` is the whole difference. Undefined, the route falls back to the
 * caller's own artist row, which is an artist answering their own post.
 * Set, it names the house artist the owner is answering for — and the
 * route checks the owner really is the owner before honouring it.
 */
function Inbox({
  threads,
  artist,
  onDo,
  onProblem,
  saidState,
  lang,
  t,
}: {
  readonly threads: readonly Thread[];
  /** The house artist being answered for. Undefined when it is your own. */
  readonly artist?: string;
  readonly onDo: (body: Record<string, unknown>) => Promise<boolean>;
  readonly onProblem: (said: string) => void;
  readonly saidState: (state: OfferState) => string;
  readonly lang: 'en' | 'af';
  readonly t: (key: string) => string;
}): React.ReactElement {
  const [priced, setPriced] = useState<Record<string, { rand: string; days: number }>>({});

  return (
    <div>
      <p className={MIKRO}>{t('art.asks')}</p>
      {threads.length === 0 ? (
        <p className="pt-3 text-[14px]">{t('art.noAsks')}</p>
      ) : (
        <ul className="space-y-5 pt-3">
          {threads.map((thread) => {
            const draft = priced[thread.id] ?? { rand: String(UNIQUE_RAND), days: WINDOWS[0].days };
            return (
              <li key={thread.id} className="rounded-[4px] border border-[var(--lyn)] bg-[var(--blad)] p-4">
                <p
                  className="text-[19px] leading-tight text-[color:var(--ink)]"
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
                              ? 'inline-flex min-h-[44px] items-center rounded-full bg-[var(--aksent)] px-4 text-[13px] font-bold text-[color:var(--op-aksent)]'
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
                          artist,
                          request: thread.id,
                          rand: Number(draft.rand) || UNIQUE_RAND,
                          days: draft.days,
                        })
                      }
                    >
                      {t('art.send')}
                    </button>
                    {/* And the artist's no, before a price is ever named.
                        Carli: *"Op album art moet die kunstenaar 'n aanbod
                        kan afkeer, asook die koper."* This is the more
                        common no of the two — somebody asks for a piece the
                        painter does not want to make — and it had no button
                        at all, so the only way to say it was silence. */}
                    <button
                      type="button"
                      className={`${LEEG} w-full`}
                      onClick={() => void onDo({ what: 'decline', artist, request: thread.id })}
                    >
                      {t('art.decline')}
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
                        if (path) await onDo({ what: 'deliver', artist, offer: thread.offer?.id, path });
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
  );
}

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
          {t('art.youGet')} <strong className="text-[color:var(--ink)]">R{money.artist.toFixed(2)}</strong>{' '}
          {t('art.afterFees')} R{money.gateway.toFixed(2)}.
        </p>
        {/* Carli: *"Die kunstenaar kry nie geld vir die by in nie, net vir
            die wen prys."* Both halves of that on the one screen where the
            artist could get it wrong: the number above is a floor, and the
            buy-in is a door fee that never reaches them. */}
        <p className={`${MIKRO} normal-case tracking-normal leading-relaxed`}>{t('art.paidOnWin')}</p>
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

      <Inbox
        threads={threads}
        onDo={onDo}
        onProblem={onProblem}
        saidState={saidState}
        lang={lang}
        t={t}
      />
    </div>
  );
}
