'use client';

/**
 * Album art by real artists — the gallery.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 20 September 2026, under SELL IT:
 *
 *   "Daar moet Album art by real artists. Daar in moet heel bo kunstenaars
 *    se regte art in kom wat op gebee kan word. Starting rate wat op elke
 *    foto kom, R200. Die kamer moet ook mooi kan uitwys dat elke kunswerk
 *    wat te koop is uniek is en net een keer verkoop. Elke kunstenaar moet
 *    'n pop out hê wat hulle profiel vertel, en 'n dm button wat vir die
 *    kunstenaar vra vir unieke art vir 'n tipe song. Daai dm moet net
 *    buttons hê wat hulle kan kies."
 *
 * And then, with a design brief attached:
 *
 *   "Die artist kamer moet uniek wees, kyk asb na hierdie net as 'n
 *    voorbeeld, nie as 'n voorskrif nie."
 *
 * ── Why this room looks nothing like the other twelve ────────────────────
 *
 * Every other room in this app is a working surface: emerald buttons,
 * rounded cards, a copilot beside it. That is right for a room where you
 * are making something and wrong for a room where you are looking at
 * somebody else's painting. A gallery that looks like a control panel
 * makes the paintings look like thumbnails.
 *
 * So this one is a catalogue. The rule the brief leads with, and the one
 * that decides every line below: **the artwork is the only colour on the
 * page.** Everything else is ink, grey or a hairline. No rounded corners,
 * no shadow anywhere except the one on the displayed piece, and the
 * uppercase catalogue labels doing the work that colour does elsewhere.
 *
 * ── Where it departs from the brief, and why ─────────────────────────────
 *
 * She said example, not prescription, and three things are deliberately
 * not followed:
 *
 *   the fonts   The brief asks for Instrument Serif and Schibsted Grotesk
 *               off Google Fonts. This app's Content-Security-Policy is
 *               `style-src 'self'` and `font-src 'self' data:` — pulling
 *               two families from a third party means widening both, and
 *               `check:security` guards those directives for good reason.
 *               Georgia is the brief's own fallback, it is on every device
 *               this app has ever been opened on, and it carries the
 *               catalogue feel at 52px perfectly well. A font is not worth
 *               a hole in the policy.
 *
 *   the licence Three tiers — non-exclusive, exclusive, full transfer — is
 *   tiers       a sensible marketplace and it is not hers. Hers is one
 *               sentence: every piece is unique and sold exactly once. A
 *               fieldset offering to sell the same painting to two people
 *               would contradict the thing this room is built to promise.
 *
 *   the folds   The lower half of the room still folds, because every room
 *               in this app opens as its own table of contents. The folds
 *               are drawn in the catalogue's own language — a hairline and
 *               an uppercase label — rather than as the app's cards.
 *
 * ── Why there is not one text box in the conversation ────────────────────
 *
 *   "Geen tik moontlikhede nie, net dit. Ek as eienaar van die app moet
 *    bewus wees van dit, sodat kunstenaar nie agter my rug kan kunswerk
 *    verkoop nie."
 *
 * A free-text message between a buyer and an artist is a place to swap a
 * phone number and do the deal somewhere else, and the studio then carries
 * the cost of introducing them and earns nothing. So the whole vocabulary
 * is: one button that says "I want unique art", and one of your own songs
 * picked from a list. The artist answers with a price and one of four
 * windows — also buttons. There is nowhere in the schema to put a message
 * either: not a nullable column, no column.
 *
 * ── And why a buyer cannot upload their own picture ──────────────────────
 *
 *   "binne elke klient se channel kan iemand net album art generate en ons
 *    kunstenaars se fotos op sit, hulle kan nie hulle eie fotos oplaai nie."
 *
 * The only file input in this file is inside the artist's own desk, and
 * `/api/artmarket` refuses an upload from anybody without an approved
 * artist row. Both, because a hidden button is not a closed door.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { barClearance } from './TabBar';
import { accessToken, getStorageClient } from '../lib/cloud';
import { refusalText } from '../lib/apierror';
import { useBackLayer } from '../lib/backstack';
import { useLang } from '../lib/i18n';
import { loadTracks, type Track } from '../lib/library';
import { square } from '../lib/imagefile';
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
 * The catalogue's palette, scoped to this room.
 *
 * Custom properties on the room's own root rather than in `globals.css`:
 * these names mean something here and nowhere else, and a token in the
 * global sheet is a token the next room reaches for by accident.
 *
 * Every pair below was checked against WCAG 2.1 in the brief. `--gedemp-2`
 * is 3.4:1 and is therefore never used for text a person has to read —
 * only for the dotted placeholder frame where a picture has not loaded.
 */
const SKIN = {
  '--papier': '#F5F2EC',
  '--papier-2': '#EFEBE3',
  '--plekhouer': '#E9E4DA',
  '--hairline': '#DCD7CD',
  '--rand': '#C9C2B4',
  '--ink': '#17161B',
  '--ink-2': '#45423D',
  '--gedemp': '#6E6A63',
  '--aksent': '#9E4526',
  '--donker-paneel': '#24232A',
  /* Georgia rather than Instrument Serif. See the note at the top of the
     file: the app's CSP would have to be widened for a webfont, and the
     brief names Georgia as its own fallback. */
  '--vertoon': 'Georgia, "Times New Roman", serif',
} as React.CSSProperties;

/** The uppercase catalogue label. Used for numbers, media and buttons. */
const MIKRO = 'text-[11px] uppercase tracking-[0.2em] text-[color:var(--gedemp)]';
const ETIKET = 'text-[12px] uppercase tracking-[0.14em] font-semibold';

/** Ink-filled, square, 44px tall. The only filled button in the room. */
const INK = `inline-flex min-h-[44px] items-center justify-center gap-2 border border-[var(--ink)] bg-[var(--ink)] px-5 py-3 text-[var(--papier)] ${ETIKET} transition-colors duration-[180ms] hover:bg-[var(--ink-2)] hover:border-[var(--ink-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aksent)] disabled:opacity-40`;

/** Outlined. Everything that is not the one thing to do next. */
const LYN = `inline-flex min-h-[44px] items-center justify-center gap-2 border border-[var(--hairline)] bg-transparent px-5 py-3 text-[color:var(--ink-2)] ${ETIKET} transition-colors duration-[180ms] hover:border-[var(--rand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aksent)] disabled:opacity-40`;

/** A plain field. Square, underlined, with a real visible label above it. */
const VELD =
  'mt-1 w-full border border-[var(--hairline)] bg-[var(--papier-2)] px-3 py-3 text-[15px] text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aksent)]';

/* ─────────────────────────────────────────────────────────── the shapes ── */

interface Artist {
  readonly id: string;
  readonly name: string;
  readonly about: string;
  readonly place: string;
  readonly avatar: string | null;
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

interface Market {
  readonly artists: readonly Artist[];
  readonly wall: readonly WallPiece[];
  readonly bought: readonly Owned[];
  readonly asBuyer: readonly Thread[];
  readonly asArtist: readonly Thread[];
  readonly me: { readonly id: string; readonly name: string; readonly approved: boolean } | null;
}

/** The steps a commission goes through, in order, for the status bar. */
const STEPS: readonly OfferState[] = ['offered', 'paid', 'accepted', 'delivered'];

/**
 * A catalogue number, derived rather than stored.
 *
 * The brief puts one above every piece and it is the single detail that
 * makes the grid read as a catalogue rather than as a shop. It needs no
 * column: an id is already unique, and the first six characters of one are
 * stable for the life of the row. A counter column would need a sequence,
 * a backfill, and a decision about what happens when a piece is deleted.
 */
function cat(id: string): string {
  return `AH-${id.replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase()}`;
}

/* ───────────────────────────────────────────────────────────── the pieces ── */

/**
 * The waveform strip: the signature of the design, generated in code.
 *
 * The brief is explicit that this must not be an image — it has to work at
 * any width, and a 1440px picture of bars is a 1440px picture of bars on a
 * 390px phone. `aria-hidden`, because it carries no meaning at all; it is
 * the record shop the gallery is standing in.
 */
function Wave(): React.ReactElement {
  const bars = useMemo(
    () =>
      Array.from({ length: 148 }, (_unused, i) => 8 + Math.abs(Math.sin(i * 0.41) * Math.cos(i * 0.13)) * 30),
    [],
  );
  return (
    <div
      aria-hidden
      className="flex h-[54px] items-center gap-[2px] overflow-hidden border-y border-[var(--hairline)] px-4 md:h-[72px]"
    >
      {bars.map((height, i) => (
        <span
          key={i}
          className="w-[3px] shrink-0 bg-[var(--rand)]"
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
}

/**
 * A fold in the catalogue's own language.
 *
 * Every room in this app opens as its own table of contents — `Card` is how
 * the other twelve do it, and its rounded emerald shape would be the one
 * thing on this page that belongs to a different room. Same behaviour, same
 * `aria-expanded` the probes press: a hairline, an uppercase label, a
 * chevron, and shut on arrival.
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
    <section className="border-t border-[var(--hairline)]">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((was) => !was)}
          className={`flex min-h-[44px] w-full items-center justify-between py-4 text-left ${ETIKET} text-[color:var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aksent)]`}
        >
          {label}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-[180ms] ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      </h3>
      {open && <div className="pb-8">{children}</div>}
    </section>
  );
}

/**
 * Where a commission has got to.
 *
 * Her words: *"as die betaling deur is, druk die koper accept, en dan moet
 * daar 'n status bar wees"*. Four steps, drawn from the offer's own state
 * rather than from a separate progress number — two things that can
 * disagree about where a deal is will eventually disagree. Ink, not green:
 * the artwork is the only colour on this page.
 */
function StatusBar({ state, said }: { readonly state: OfferState; readonly said: string }): React.ReactElement {
  const reached = STEPS.indexOf(state);
  return (
    <div className="pt-3" data-status={state}>
      <div className="flex gap-1" aria-hidden>
        {STEPS.map((step, index) => (
          <span
            key={step}
            className={`h-[3px] flex-1 ${
              state !== 'declined' && index <= reached ? 'bg-[var(--ink)]' : 'bg-[var(--hairline)]'
            }`}
          />
        ))}
      </div>
      <p className={`${MIKRO} pt-2`}>{said}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── the room ── */

export default function ArtMarket(): React.ReactElement {
  const { t, lang } = useLang();
  const [market, setMarket] = useState<Market | null>(null);
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(true);
  /** Whose profile is open. The pop-out she asked for. */
  const [popout, setPopout] = useState<Artist | null>(null);
  /** Which piece is open as a full work page. */
  const [sheet, setSheet] = useState<WallPiece | null>(null);
  const [songs, setSongs] = useState<readonly Track[]>([]);
  /** Which artist's work the grid is filtered to. Empty is everybody. */
  const [only, setOnly] = useState('');
  const [order, setOrder] = useState<'new' | 'low' | 'high'>('new');

  useBackLayer(popout !== null, () => setPopout(null));
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

  const wall = useMemo(() => {
    const some = (market?.wall ?? []).filter((one) => only === '' || one.artist === only);
    if (order === 'low') return [...some].sort((a, b) => a.rand - b.rand);
    if (order === 'high') return [...some].sort((a, b) => b.rand - a.rand);
    return some;
  }, [market, only, order]);

  const hero = market?.wall[0] ?? null;
  const mine = market?.me ?? null;

  const saidState = (state: OfferState): string =>
    ({
      offered: t('art.step.offered'),
      paid: t('art.step.paid'),
      accepted: t('art.step.accepted'),
      delivered: t('art.step.delivered'),
      declined: t('art.step.declined'),
    })[state];

  return (
    <div
      data-room="albumart"
      style={{ ...SKIN, paddingBottom: barClearance() }}
      className="bg-[var(--papier)] text-[color:var(--ink-2)]"
    >
      {/* ── The hero ───────────────────────────────────────────────────
          The accent rule, one micro label, the display heading, a lead
          paragraph, the one thing to do, and three numbers under a
          hairline. The only shadow on the page is on the sleeve. */}
      <header className="grid gap-8 px-5 pb-10 pt-8 md:grid-cols-[minmax(0,560px)_minmax(0,620px)] md:gap-[68px] md:px-12">
        <div>
          <span className="block h-px w-[46px] bg-[var(--aksent)]" aria-hidden />
          <p className={`${MIKRO} pt-3`}>{t('art.kicker')}</p>
          <h2
            className="pt-3 text-[44px] leading-[1.04] text-[color:var(--ink)] md:text-[78px] md:leading-[1.02]"
            style={{ fontFamily: 'var(--vertoon)' }}
          >
            {t('art.hero')}
          </h2>
          <p className="max-w-[470px] pt-4 text-[15px] leading-[1.65] md:text-[17px]">{t('art.lead')}</p>
          <div className="flex flex-wrap items-center gap-4 pt-6">
            <a href="#galery" className={INK}>
              {t('art.browse')}
            </a>
            <a
              href="#verkoop"
              className="text-[15px] text-[color:var(--aksent)] underline underline-offset-4 hover:text-[#6F2F18]"
            >
              {t('art.sellLink')}
            </a>
          </div>
          <dl className="mt-8 grid grid-cols-3 border-t border-[var(--hairline)] pt-4">
            <div>
              <dt className={MIKRO}>{t('art.count.works')}</dt>
              <dd className="text-[25px] text-[color:var(--ink)]" style={{ fontFamily: 'var(--vertoon)' }}>
                {market?.wall.length ?? 0}
              </dd>
            </div>
            <div>
              <dt className={MIKRO}>{t('art.count.artists')}</dt>
              <dd className="text-[25px] text-[color:var(--ink)]" style={{ fontFamily: 'var(--vertoon)' }}>
                {market?.artists.length ?? 0}
              </dd>
            </div>
            <div>
              <dt className={MIKRO}>{t('art.count.edition')}</dt>
              <dd className="text-[25px] text-[color:var(--ink)]" style={{ fontFamily: 'var(--vertoon)' }}>
                1 / 1
              </dd>
            </div>
          </dl>
        </div>

        {/* The sleeve and the record behind it. Drawn from the first piece
            on the wall when there is one, and from the placeholder fill
            when there is not — an empty gallery should still look like a
            gallery rather than like a page that failed to load. */}
        <div className="relative hidden min-h-[460px] items-center justify-center md:flex" aria-hidden>
          <span className="absolute right-0 h-[400px] w-[400px] translate-x-[60px] rounded-full bg-[var(--donker-paneel)]">
            <span className="absolute inset-[40px] rounded-full border border-[rgba(245,242,236,0.14)]" />
            <span className="absolute inset-[100px] rounded-full border border-[rgba(245,242,236,0.14)]" />
            <span className="absolute left-1/2 top-1/2 h-[128px] w-[128px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--aksent)]">
              <span className="absolute left-1/2 top-1/2 h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--papier)]" />
            </span>
          </span>
          <span
            className="relative h-[460px] w-[460px] border border-[var(--rand)] bg-[var(--plekhouer)]"
            style={{ boxShadow: '0 24px 60px rgba(23, 22, 27, 0.14)' }}
          >
            {hero?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero.url} alt="" className="h-full w-full object-cover" />
            )}
          </span>
        </div>
      </header>

      <Wave />

      {problem && (
        <p role="alert" className="mx-5 mt-6 border border-[var(--aksent)] px-4 py-3 text-[15px] text-[color:var(--aksent)] md:mx-12">
          {problem}
        </p>
      )}

      {/* ── The gallery ────────────────────────────────────────────── */}
      <section id="galery" className="px-5 py-12 md:px-12 md:py-[72px]">
        <h3
          className="text-[30px] leading-none text-[color:var(--ink)] md:text-[46px]"
          style={{ fontFamily: 'var(--vertoon)' }}
        >
          {t('art.gallery')}
        </h3>

        {/* The filter bar: real buttons, and a real select with a visible
            label beside it. */}
        <div className="flex flex-wrap items-end justify-between gap-4 pt-6">
          <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setOnly('')}
              aria-pressed={only === ''}
              className={`${only === '' ? INK : LYN} shrink-0 snap-start`}
            >
              {t('art.all')}
            </button>
            {(market?.artists ?? []).map((one) => (
              <button
                key={one.id}
                type="button"
                onClick={() => setOnly(one.id)}
                aria-pressed={only === one.id}
                className={`${only === one.id ? INK : LYN} shrink-0 snap-start`}
              >
                {one.name}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <span className={MIKRO}>{t('art.sort')}</span>
            <select
              value={order}
              onChange={(event) => setOrder(event.target.value as 'new' | 'low' | 'high')}
              className="min-h-[44px] border border-[var(--hairline)] bg-[var(--papier-2)] px-3 text-[14px] text-[color:var(--ink)]"
            >
              <option value="new">{t('art.sort.new')}</option>
              <option value="low">{t('art.sort.low')}</option>
              <option value="high">{t('art.sort.high')}</option>
            </select>
          </label>
        </div>

        {loading && (
          <p className="flex items-center gap-2 pt-8 text-[15px]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t('art.reading')}
          </p>
        )}

        {!loading && wall.length === 0 && (
          <p className="mt-8 border border-dashed border-[var(--rand)] px-4 py-10 text-center text-[15px]">
            {t('art.empty')}
          </p>
        )}

        <div className="grid grid-cols-1 gap-x-8 gap-y-[52px] pt-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-[68px]">
          {wall.map((piece) => (
            /* One target for the whole card, which is what the brief means
               by "the card is one link": a grid where the picture opens the
               work and a button beside it buys it is a grid where half the
               presses are the wrong one. Buying happens on the work page,
               where the price and the sold-once rule are both in front of
               you. */
            <button
              key={piece.id}
              type="button"
              data-piece={piece.id}
              onClick={() => setSheet(piece)}
              className="group block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aksent)]"
            >
              <span className="flex items-baseline justify-between border-b border-[var(--hairline)] pb-2.5">
                <span className={MIKRO}>{cat(piece.id)}</span>
                <span className={MIKRO}>{t('art.medium')}</span>
              </span>
              <span className="mt-4 block aspect-square border border-[var(--hairline)] bg-[var(--plekhouer)] transition-colors duration-[180ms] group-hover:border-[var(--rand)]">
                {piece.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={piece.url}
                    alt={`${piece.title}, ${piece.by}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </span>
              <span className="mt-4 flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span
                    className="block truncate text-[22px] leading-[1.15] text-[color:var(--ink)] transition-colors duration-[180ms] group-hover:text-[color:var(--aksent)] md:text-[25px]"
                    style={{ fontFamily: 'var(--vertoon)' }}
                  >
                    {piece.title}
                  </span>
                  <span className="block truncate text-[13px] text-[color:var(--gedemp)]">{piece.by}</span>
                </span>
                <span className="shrink-0 text-[14px] font-semibold text-[color:var(--ink)]">R{piece.rand}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── The dark band: what it looks like in the wild ──────────────
          The one place the page turns over. It is not decoration: a sleeve
          is bought to be seen at 300 pixels in a streaming app, and a
          painting that works on a wall does not always survive that. */}
      <section className="bg-[var(--ink)] px-5 py-12 text-[var(--papier)] md:px-12 md:py-[72px]">
        <div className="grid gap-8 md:grid-cols-[minmax(0,480px)_1fr] md:gap-[68px]">
          <div>
            <span className="block h-px w-[46px] bg-[var(--aksent)]" aria-hidden />
            <h3
              className="pt-3 text-[30px] leading-none md:text-[40px]"
              style={{ fontFamily: 'var(--vertoon)' }}
            >
              {t('art.context')}
            </h3>
            <p className="max-w-[420px] pt-4 text-[15px] leading-[1.65] text-[rgba(245,242,236,0.78)]">
              {t('art.contextSaid')}
            </p>
          </div>
          <div className="flex items-end gap-5">
            {[
              { side: 'h-[110px] w-[110px] md:h-[176px] md:w-[176px]', label: t('art.asThumb') },
              { side: 'h-[150px] w-[150px] md:h-[248px] md:w-[248px]', label: t('art.asSleeve') },
              { side: 'h-[130px] w-[92px] md:h-[210px] md:w-[148px]', label: t('art.asPoster') },
            ].map((one) => (
              <figure key={one.label}>
                <span className={`block ${one.side} bg-[var(--donker-paneel)]`}>
                  {hero?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero.url} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <figcaption className="pt-2 text-[11px] uppercase tracking-[0.2em] text-[rgba(245,242,236,0.6)]">
                  {one.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Everything that is about you rather than about them ───────── */}
      <div className="px-5 pb-16 pt-12 md:px-12">
        {market && market.asBuyer.length > 0 && (
          <Fold label={t('art.yours')}>
            <ul className="space-y-6">
              {market.asBuyer.map((thread) => (
                <li key={thread.id} data-thread={thread.id} className="border border-[var(--hairline)] p-4">
                  <p className={MIKRO}>{thread.by}</p>
                  <p
                    className="pt-1 text-[22px] leading-[1.15] text-[color:var(--ink)]"
                    style={{ fontFamily: 'var(--vertoon)' }}
                  >
                    {thread.songTitle}
                  </p>
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
                          className={`${INK} mt-3 w-full`}
                          onClick={() => void pay({ kind: 'commission', offer: thread.offer?.id })}
                        >
                          {t('art.pay')} R{thread.offer.rand}
                        </button>
                      )}
                      {thread.offer.state === 'paid' && (
                        <button
                          type="button"
                          className={`${INK} mt-3 w-full`}
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
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thread.offer.url}
                          alt={`${thread.songTitle}, ${thread.by}`}
                          className="mt-3 aspect-square w-40 border border-[var(--hairline)] object-cover"
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

        <div id="verkoop">
          <Fold label={t('art.sell')}>
            {!mine ? (
              <Apply onApply={(name, about, place) => doIt({ what: 'apply', name, about, place })} t={t} />
            ) : !mine.approved ? (
              <p className="text-[15px] leading-[1.65]">{t('art.pending')}</p>
            ) : (
              <ArtistDesk
                threads={market?.asArtist ?? []}
                onDo={doIt}
                onProblem={setProblem}
                saidState={saidState}
                lang={lang}
                t={t}
              />
            )}
          </Fold>
        </div>
      </div>

      {sheet && (
        <WorkSheet
          piece={sheet}
          artist={market?.artists.find((one) => one.id === sheet.artist) ?? null}
          onClose={() => setSheet(null)}
          onBuy={() => void pay({ kind: 'art', work: sheet.id })}
          onArtist={(artist) => {
            setSheet(null);
            setPopout(artist);
          }}
          t={t}
        />
      )}

      {popout && (
        <Popout
          artist={popout}
          songs={songs}
          onClose={() => setPopout(null)}
          onAsk={async (song) => {
            const ok = await doIt({
              what: 'ask',
              artist: popout.id,
              songId: song.id,
              songTitle: song.title,
            });
            if (ok) setPopout(null);
            return ok;
          }}
          t={t}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── the work page ── */

/**
 * One piece, full size, with everything a buyer needs before paying.
 *
 * The brief's licence fieldset is deliberately not here. Three tiers —
 * non-exclusive, exclusive, full transfer — is a sensible marketplace and
 * it is not hers: *"elke kunswerk wat te koop is uniek is en net een keer
 * verkoop."* An option that sells the same painting twice would contradict
 * the one thing this room promises. So there is one price, and the
 * `<dl>` says the edition is 1 of 1 in so many words.
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
  const rows: readonly { k: string; v: string }[] = [
    { k: t('art.dl.medium'), v: t('art.medium') },
    { k: t('art.dl.original'), v: t('art.dl.originalSaid') },
    { k: t('art.dl.file'), v: `WebP · ${ART_SIDE} × ${ART_SIDE}` },
    { k: t('art.dl.edition'), v: t('art.dl.editionSaid') },
  ];
  return (
    <div
      style={SKIN}
      className="fixed inset-0 z-50 overflow-y-auto bg-[var(--papier)] text-[color:var(--ink-2)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-4 md:px-12">
        <span className={MIKRO}>{cat(piece.id)}</span>
        <button type="button" onClick={onClose} className={LYN}>
          {t('art.close')}
        </button>
      </div>

      <div className="grid gap-8 px-5 py-8 md:grid-cols-[minmax(0,760px)_minmax(0,424px)] md:gap-16 md:px-12">
        <div>
          <span className="block aspect-square border border-[var(--hairline)] bg-[var(--plekhouer)]">
            {piece.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={piece.url}
                alt={`${piece.title}, ${piece.by}`}
                className="h-full w-full object-cover"
              />
            )}
          </span>
          {/* The same file at the sizes it will actually be seen at. Not a
              second upload: a 3000×3000 source is every one of these. */}
          <div className="grid grid-cols-4 gap-3 pt-4">
            {[t('art.view.sleeve'), t('art.view.thumb'), t('art.view.label'), t('art.view.detail')].map((one) => (
              <figure key={one}>
                <span className="block aspect-square border border-[var(--hairline)] bg-[var(--plekhouer)]">
                  {piece.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={piece.url} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <figcaption className={`${MIKRO} pt-2`}>{one}</figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className="md:sticky md:top-8 md:self-start">
          <span className="block h-px w-[46px] bg-[var(--aksent)]" aria-hidden />
          <p className={`${MIKRO} pt-3`}>
            {cat(piece.id)} · {t('art.available')}
          </p>
          <h2
            className="pt-2 text-[34px] leading-[1.06] text-[color:var(--ink)] md:text-[52px]"
            style={{ fontFamily: 'var(--vertoon)' }}
          >
            {piece.title}
          </h2>
          <p className="pt-2 text-[15px]">{piece.by}</p>
          <p className="pt-4 text-[15px] leading-[1.7]">{t('art.oneOnly')}</p>

          <dl className="mt-6 border-t border-[var(--hairline)]">
            {rows.map((row) => (
              <div key={row.k} className="flex justify-between gap-4 border-b border-[var(--hairline)] py-3">
                <dt className={MIKRO}>{row.k}</dt>
                <dd className="text-[14px] text-[color:var(--ink)]">{row.v}</dd>
              </div>
            ))}
          </dl>

          <p
            className="pt-6 text-[34px] leading-none text-[color:var(--ink)]"
            style={{ fontFamily: 'var(--vertoon)' }}
          >
            R{piece.rand}
          </p>

          <button type="button" onClick={onBuy} className={`${INK} mt-4 w-full`}>
            {t('art.buy')}
          </button>
          {artist && (
            <button type="button" onClick={() => onArtist(artist)} className={`${LYN} mt-3 w-full`}>
              {t('art.aboutArtist')}
            </button>
          )}

          <ul className="space-y-2 pt-6">
            {[t('art.get.1'), t('art.get.2'), t('art.get.3'), t('art.get.4')].map((one) => (
              <li key={one} className="flex gap-2 text-[15px] leading-[1.6]">
                <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[color:var(--aksent)]" aria-hidden />
                {one}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── the pop-out ── */

/**
 * The artist's profile, and the whole of what a buyer may say to them.
 *
 * Two presses and no keyboard: "I want unique art", then which of your own
 * songs. There is no text input in this component and there must never be
 * one — see the note at the top of the file for why.
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
  /** Shut until they press the one button. Then: which song. */
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState('');

  return (
    <div style={SKIN} className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(23,22,27,0.6)] md:items-center">
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto bg-[var(--papier)] p-6 text-[color:var(--ink-2)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="block h-px w-[46px] bg-[var(--aksent)]" aria-hidden />
            <h3
              className="pt-3 text-[30px] leading-none text-[color:var(--ink)]"
              style={{ fontFamily: 'var(--vertoon)' }}
            >
              {artist.name}
            </h3>
            {artist.place && <p className={`${MIKRO} pt-2`}>{artist.place}</p>}
          </div>
          <button type="button" onClick={onClose} className={LYN}>
            {t('art.close')}
          </button>
        </div>

        {artist.about && (
          <p className="whitespace-pre-wrap pt-5 text-[15px] leading-[1.7]">{artist.about}</p>
        )}

        {!picking ? (
          <button type="button" className={`${INK} mt-6 w-full`} onClick={() => setPicking(true)} data-ask>
            {t('art.want')}
          </button>
        ) : (
          <div className="pt-6">
            <p className={ETIKET}>{t('art.whichSong')}</p>
            <p className="pt-2 text-[14px] leading-[1.6] text-[color:var(--gedemp)]">{t('art.whyButtons')}</p>
            {songs.length === 0 ? (
              <p className="pt-4 text-[15px]">{t('art.noSongs')}</p>
            ) : (
              <ul className="space-y-2 pt-4">
                {songs.map((song) => (
                  <li key={song.id}>
                    <button
                      type="button"
                      className={`${LYN} w-full justify-start`}
                      disabled={busy !== ''}
                      onClick={async () => {
                        setBusy(song.id);
                        await onAsk(song);
                        setBusy('');
                      }}
                    >
                      {busy === song.id && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                      <span className="truncate normal-case tracking-normal">{song.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────── the bottom of the room ── */

/** Pick a piece you own, pick a song you made, and the credit goes on it. */
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
    return <p className="text-[15px] leading-[1.65]">{t('art.noneOwned')}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className={ETIKET}>{t('art.collection')}</p>
        <div className="grid grid-cols-3 gap-4 pt-4 md:grid-cols-4">
          {owned.map((one) => (
            <button
              key={one.id}
              type="button"
              onClick={() => setPiece(one.id)}
              aria-pressed={piece === one.id}
              className="block text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--aksent)]"
            >
              <span
                className={`block aspect-square border bg-[var(--plekhouer)] ${
                  piece === one.id ? 'border-[var(--ink)]' : 'border-[var(--hairline)]'
                }`}
              >
                {one.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={one.url} alt={`${one.title}, ${one.by}`} className="h-full w-full object-cover" />
                )}
              </span>
              <span className={`${MIKRO} mt-2 block truncate`}>{one.by}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className={ETIKET}>{t('art.yourSongs')}</p>
        {songs.length === 0 ? (
          <p className="pt-3 text-[15px]">{t('art.noSongs')}</p>
        ) : (
          <ul className="space-y-2 pt-4">
            {songs.map((one) => (
              <li key={one.id}>
                <button
                  type="button"
                  onClick={() => setSong(one.id)}
                  aria-pressed={song === one.id}
                  className={`${song === one.id ? INK : LYN} w-full justify-start`}
                >
                  <span className="truncate normal-case tracking-normal">{one.title}</span>
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
          className={`${INK} w-full`}
          onClick={async () => {
            setBusy(true);
            await onPut(piece, song);
            setBusy(false);
          }}
        >
          {busy ? t('art.putting') : t('art.putOn')}
        </button>
        <p className="pt-3 text-[14px] leading-[1.6] text-[color:var(--gedemp)]">{t('art.credit')}</p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────── becoming an artist ── */

function Apply({
  onApply,
  t,
}: {
  readonly onApply: (name: string, about: string, place: string) => Promise<boolean>;
  readonly t: (key: string) => string;
}): React.ReactElement {
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [place, setPlace] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="max-w-[560px] space-y-5">
      <p className="text-[15px] leading-[1.65]">{t('art.applyWhy')}</p>
      <label className="block">
        <span className={MIKRO}>{t('art.yourName')}</span>
        <input value={name} onChange={(event) => setName(event.target.value)} className={VELD} />
      </label>
      <label className="block">
        <span className={MIKRO}>{t('art.yourPlace')}</span>
        <input value={place} onChange={(event) => setPlace(event.target.value)} className={VELD} />
      </label>
      <label className="block">
        <span className={MIKRO}>{t('art.yourAbout')}</span>
        <textarea value={about} onChange={(event) => setAbout(event.target.value)} rows={5} className={VELD} />
      </label>
      <button
        type="button"
        disabled={name.trim() === '' || busy}
        className={`${INK} w-full`}
        onClick={async () => {
          setBusy(true);
          await onApply(name, about, place);
          setBusy(false);
        }}
      >
        {busy ? t('art.applying') : t('art.apply')}
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── the desk ── */

/**
 * What an approved artist sees: hang a piece, and answer the requests.
 *
 * The only file input in this room lives here, and the route refuses an
 * upload from anybody without an approved artist row. Both, because a
 * hidden button is not a closed door.
 */
function ArtistDesk({
  threads,
  onDo,
  onProblem,
  saidState,
  lang,
  t,
}: {
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
  /** What each open request has been priced at, before it is sent. */
  const [asking, setAsking] = useState<Record<string, { rand: string; days: number }>>({});

  const money = useMemo(() => split(Number(rand) || START_RAND), [rand]);

  /**
   * Take a file to 3000×3000 WebP and put it in the bucket.
   *
   * The picture goes from here straight to storage with an address this
   * app's server signed — it does not pass through a route. Six routes in
   * this app already promised ceilings the platform will not pass; 4.5 MB
   * is the wall, and a painting at this size is comfortably over it.
   */
  const upload = useCallback(
    async (file: File, why: 'work' | 'delivery'): Promise<string | null> => {
      const made = await square(file, ART_SIDE);
      if (made.ok !== true) {
        onProblem(t('art.badFile'));
        return null;
      }
      if (made.blob.size > ART_MAX_BYTES) {
        onProblem(ART_SIZE_SAID[lang]);
        return null;
      }
      const token = await accessToken();
      const opened = await fetch('/api/artmarket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ what: 'upload', for: why }),
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
        .uploadToSignedUrl(said.path, said.token, made.blob, { contentType: 'image/webp' });
      if (put.error) {
        onProblem(t('art.noUpload'));
        return null;
      }
      return said.path;
    },
    [lang, onProblem, t],
  );

  return (
    <div className="space-y-10">
      {/* ── Hang a new piece ─────────────────────────────────────────── */}
      <div className="max-w-[560px] space-y-5">
        <p className={ETIKET}>{t('art.hang')}</p>
        <p className="text-[14px] leading-[1.6] text-[color:var(--gedemp)]">{ART_SIZE_SAID[lang]}</p>
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
        {/* What they actually take home, said before they set the price
            rather than discovered on a statement. The gateway comes off
            first and 70/30 is on what is left — `split` is the one place
            that arithmetic lives. */}
        <p className="text-[14px] leading-[1.6]">
          {t('art.youGet')}{' '}
          <strong className="text-[color:var(--ink)]">R{money.artist.toFixed(2)}</strong> {t('art.afterFees')} R
          {money.gateway.toFixed(2)}.
        </p>
        <label className={`${INK} w-full cursor-pointer`}>
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
              const path = await upload(file, 'work');
              if (path) {
                await onDo({ what: 'listed', title, path, rand: Number(rand) || START_RAND });
                setTitle('');
              }
              setBusy(false);
            }}
          />
        </label>
      </div>

      {/* ── The requests ─────────────────────────────────────────────── */}
      <div>
        <p className={ETIKET}>{t('art.asks')}</p>
        {threads.length === 0 ? (
          <p className="pt-3 text-[15px]">{t('art.noAsks')}</p>
        ) : (
          <ul className="space-y-6 pt-4">
            {threads.map((thread) => {
              const draft = asking[thread.id] ?? { rand: String(UNIQUE_RAND), days: WINDOWS[0].days };
              return (
                <li key={thread.id} className="border border-[var(--hairline)] p-4">
                  <p
                    className="text-[22px] leading-[1.15] text-[color:var(--ink)]"
                    style={{ fontFamily: 'var(--vertoon)' }}
                  >
                    {thread.songTitle}
                  </p>
                  {thread.offer && <StatusBar state={thread.offer.state} said={saidState(thread.offer.state)} />}

                  {!thread.offer && (
                    <div className="space-y-4 pt-4">
                      <label className="block max-w-[240px]">
                        <span className={MIKRO}>{t('art.yourPrice')}</span>
                        <input
                          type="number"
                          min={1}
                          value={draft.rand}
                          onChange={(event) =>
                            setAsking((was) => ({ ...was, [thread.id]: { ...draft, rand: event.target.value } }))
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
                              setAsking((was) => ({ ...was, [thread.id]: { ...draft, days: one.days } }))
                            }
                            className={draft.days === one.days ? INK : LYN}
                          >
                            {one[lang]}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={`${INK} w-full`}
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
                    <label className={`${INK} mt-4 w-full cursor-pointer`}>
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
                          const path = await upload(file, 'delivery');
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
