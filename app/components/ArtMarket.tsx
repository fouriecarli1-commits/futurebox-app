'use client';

/**
 * Album kunswerk — real artists, uniquely yours.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 20 September 2026, under SELL IT: a room where real artists sell
 * album art. R200 off the wall, R500 for a commission, *"elke kunswerk wat
 * te koop is uniek is en net een keer verkoop"*, an artist pop-out, and a
 * DM made only of buttons so the deal cannot be arranged off the platform.
 *
 * ── And what she said about the first attempt ────────────────────────────
 *
 *   "Ek hou nie van die kunstenaar blad nie. Jy het presies gedoen wat ek
 *    jou nie gevra het om te doen nie. Ek het gevra jy moet net daardie
 *    website idee as 'n idee gebruik, nie net so nie. Dit lyk nou soos 'n
 *    website in plaas van 'n funksionele app."
 *
 * She is right and the diagnosis is exact. The first version had a
 * two-column hero with a headline and a lead paragraph, a "See the gallery"
 * anchor link, a row of marketing statistics, and a full-width dark band
 * selling the idea of buying art. Every one of those is a thing a landing
 * page does to a stranger who has not decided yet. Nobody in this room is a
 * stranger — they are signed in, they came here on purpose, and they want
 * to see the pictures.
 *
 * ── So: what makes it an app and not a page ──────────────────────────────
 *
 *   it starts working    No hero, no pitch. Nine lines of chrome and then
 *                        the artwork. The first thing under your thumb is a
 *                        piece you can buy.
 *   it goes up, not      A sheet rises from the bottom with a grab handle
 *   across               and the buy button pinned where a thumb already
 *                        is. A website opens a new page; an app raises a
 *                        sheet over the one you are on.
 *   nothing anchors      No `href="#section"`. Links that scroll the page
 *                        are how a document works.
 *   one column of        Two-up, and that is the whole layout. The desktop
 *   thought              gets more of the same rather than a different
 *                        arrangement.
 *
 * ── And what makes it feel like an artist's room ─────────────────────────
 *
 * Not decoration bolted on. Four decisions, each of which also earns its
 * place functionally:
 *
 *   paper, not panel   An off-white ground and ink text, where every other
 *                      room is white cards on grey with emerald buttons.
 *                      The artwork is then the only colour on the screen —
 *                      which is the one rule a gallery actually has.
 *   the hung rhythm    The second column sits lower than the first. Real
 *                      work is hung at different heights; a perfect grid
 *                      reads as a product listing. It costs one line of CSS
 *                      and it is the difference between a shop and a wall.
 *   a catalogue number Small, above each piece. Derived from the id, so it
 *                      needs no column. It is the detail that says these
 *                      are works and not stock photographs.
 *   a serif, for the   Titles and prices only, never for an instruction.
 *   names              Georgia, which is on every device — this app's CSP
 *                      is `font-src 'self'` and a webfont is not worth
 *                      widening it. `check:security` guards that directive.
 *
 * ── Why there is not one text box in the conversation ────────────────────
 *
 *   "Geen tik moontlikhede nie, net dit. Ek as eienaar van die app moet
 *    bewus wees van dit, sodat kunstenaar nie agter my rug kan kunswerk
 *    verkoop nie."
 *
 * A free-text message between a buyer and an artist is a place to swap a
 * phone number and do the deal somewhere else, and the studio then carries
 * the cost of the introduction and earns nothing. The whole vocabulary is:
 * one button that says "I want unique art", and one of your own songs. The
 * artist answers with a price and one of four windows — also buttons. There
 * is nowhere in the schema to put a message either: not a nullable column,
 * no column.
 *
 * ── And why a buyer cannot bring their own picture ───────────────────────
 *
 *   "binne elke klient se channel kan iemand net album art generate en ons
 *    kunstenaars se fotos op sit, hulle kan nie hulle eie fotos oplaai nie."
 *
 * The only file input in this file is inside the artist's own desk, and
 * `/api/artmarket` refuses an upload from anybody without an approved
 * artist row. Both, because a hidden button is not a closed door.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Loader2, Plus } from 'lucide-react';
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
 * The room's palette, scoped to its own root.
 *
 * Custom properties here rather than in `globals.css`: these names mean
 * something in this room and nowhere else, and a token in the global sheet
 * is a token the next room reaches for by accident.
 */
const SKIN = {
  '--papier': '#F6F3ED',
  '--papier-2': '#EFEBE3',
  '--leeg': '#E7E2D8',
  '--lyn': '#DBD6CC',
  '--ink': '#17161B',
  '--ink-2': '#4A463F',
  '--gedemp': '#6E6A63',
  '--aksent': '#9E4526',
  '--vertoon': 'Georgia, "Times New Roman", serif',
} as React.CSSProperties;

/** The small uppercase label. Catalogue numbers, section names, states. */
const MIKRO = 'text-[10px] uppercase tracking-[0.18em] text-[color:var(--gedemp)]';

/**
 * The one filled button, and it is a pill.
 *
 * Square everywhere else in this room, rounded here on purpose: in an app
 * the thing you press should look pressable at a glance, and a sharp black
 * rectangle reads as a banner. 48px tall, which is a thumb.
 */
const VUL =
  'inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-6 text-[14px] font-semibold text-[var(--papier)] transition active:translate-y-px active:opacity-90 disabled:opacity-40';

/** Outlined, same height, for everything that is not the one thing to do. */
const LEEG =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[var(--lyn)] px-4 text-[13px] font-semibold text-[color:var(--ink-2)] transition active:translate-y-px active:bg-[var(--papier-2)] disabled:opacity-40';

/** A field. Square, quiet, with a real label above it. */
const VELD =
  'mt-1.5 w-full rounded-[3px] border border-[var(--lyn)] bg-[var(--papier-2)] px-3 py-3 text-[15px] text-[color:var(--ink)] outline-none focus:border-[var(--aksent)]';

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
 * It needs no column: an id is already unique and its first characters are
 * stable for the life of the row. A counter would need a sequence, a
 * backfill, and a decision about what happens when a piece is deleted.
 */
function cat(id: string): string {
  return `AH-${id.replace(/[^0-9a-f]/gi, '').slice(0, 4).toUpperCase()}`;
}

/* ──────────────────────────────────────────────────────── the small parts ── */

/**
 * A sheet that rises from the bottom.
 *
 * This is the one structural decision that makes the room an app rather
 * than a site. A website opens a new page and you press Back; an app raises
 * a sheet over what you were doing and you push it down. The grab handle,
 * the rounded top and the bottom-pinned action are all the same sentence:
 * the thing to press is where your thumb already is.
 *
 * Full height on a desk, where there is no thumb and a floating half-panel
 * would just be a small window.
 */
function Sheet({
  onClose,
  label,
  children,
  foot,
}: {
  readonly onClose: () => void;
  readonly label: string;
  readonly children: React.ReactNode;
  /** Pinned to the bottom, above the safe area. The one thing to do. */
  readonly foot?: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      style={SKIN}
      role="dialog"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(23,22,27,0.55)] md:items-center md:p-6"
    >
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] bg-[var(--papier)] text-[color:var(--ink-2)] md:max-h-[86vh] md:rounded-[20px]">
        {/* The handle. It is also the close button, because the gesture it
            stands for is one this app has no room to implement properly —
            a handle you cannot pull is furniture. */}
        <button
          type="button"
          onClick={onClose}
          aria-label={label}
          className="flex w-full shrink-0 justify-center py-3"
        >
          <span className="h-1 w-10 rounded-full bg-[var(--lyn)]" />
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {foot && (
          <div className="shrink-0 border-t border-[var(--lyn)] bg-[var(--papier)] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
            {foot}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A fold, in this room's own language.
 *
 * `Card` is how the other twelve rooms fold, and its rounded emerald shape
 * would be the one thing on this screen that belongs somewhere else. Same
 * behaviour and the same `aria-expanded` the probes press: a hairline, a
 * small label, a chevron, and shut on arrival like every room in this app.
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
          className={`flex min-h-[52px] w-full items-center justify-between gap-3 py-3 text-left text-[13px] font-semibold text-[color:var(--ink)]`}
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
 * daar 'n status bar wees"*. Drawn from the offer's own state rather than
 * from a separate progress number — two things that can disagree about
 * where a deal is eventually will. Ink, not green: the artwork is the only
 * colour in this room.
 */
function StatusBar({ state, said }: { readonly state: OfferState; readonly said: string }): React.ReactElement {
  const reached = STEPS.indexOf(state);
  return (
    <div className="pt-3" data-status={state}>
      <div className="flex gap-1" aria-hidden>
        {STEPS.map((step, index) => (
          <span
            key={step}
            className={`h-[3px] flex-1 rounded-full ${
              state !== 'declined' && index <= reached ? 'bg-[var(--ink)]' : 'bg-[var(--lyn)]'
            }`}
          />
        ))}
      </div>
      <p className={`${MIKRO} pt-2`}>{said}</p>
    </div>
  );
}

/** The frame every picture sits in: square, hairline, paper where empty. */
function Frame({
  url,
  alt,
  className = '',
}: {
  readonly url: string | null;
  readonly alt: string;
  readonly className?: string;
}): React.ReactElement {
  return (
    <span className={`block aspect-square overflow-hidden rounded-[2px] border border-[var(--lyn)] bg-[var(--leeg)] ${className}`}>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      )}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────── the room ── */

export default function ArtMarket(): React.ReactElement {
  const { t, lang } = useLang();
  const [market, setMarket] = useState<Market | null>(null);
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(true);
  const [popout, setPopout] = useState<Artist | null>(null);
  const [sheet, setSheet] = useState<WallPiece | null>(null);
  const [songs, setSongs] = useState<readonly Track[]>([]);
  /** Which artist's work the wall is filtered to. Empty is everybody. */
  const [only, setOnly] = useState('');

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

  const wall = useMemo(
    () => (market?.wall ?? []).filter((one) => only === '' || one.artist === only),
    [market, only],
  );

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
      className="min-h-full bg-[var(--papier)] text-[color:var(--ink-2)]"
    >
      {/* ── Nine lines of chrome, and then the artwork ──────────────────
          No hero and no pitch. Everybody here is signed in and came on
          purpose. The two facts that have to be readable before anything
          is pressed — what a piece starts at, and that it sells once —
          are the subtitle, not a paragraph. */}
      <header className="px-4 pb-3 pt-4">
        <h2
          className="text-[26px] leading-none text-[color:var(--ink)]"
          style={{ fontFamily: 'var(--vertoon)' }}
        >
          {t('art.title')}
        </h2>
        <p className={`${MIKRO} pt-2`}>
          {t('art.from')} R{START_RAND} · {t('art.one')}
        </p>
      </header>

      {/* The artists, as a row you swipe. A filter, and also the way into
          somebody's profile — which is the same gesture a person already
          makes when they like what they are looking at. */}
      {market && market.artists.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setOnly('')}
            aria-pressed={only === ''}
            className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold ${
              only === ''
                ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--papier)]'
                : 'border-[var(--lyn)] text-[color:var(--ink-2)]'
            }`}
          >
            {t('art.all')}
          </button>
          {market.artists.map((one) => (
            <button
              key={one.id}
              type="button"
              onClick={() => setOnly(only === one.id ? '' : one.id)}
              aria-pressed={only === one.id}
              className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold ${
                only === one.id
                  ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--papier)]'
                  : 'border-[var(--lyn)] text-[color:var(--ink-2)]'
              }`}
            >
              {one.name}
            </button>
          ))}
        </div>
      )}

      {problem && (
        <p
          role="alert"
          className="mx-4 mb-3 rounded-[3px] border border-[var(--aksent)] px-3 py-2.5 text-[14px] text-[color:var(--aksent)]"
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

      {/* ── The wall ────────────────────────────────────────────────────
          Two up, and the second column hangs lower. Real work is hung at
          different heights; a perfect grid reads as a product listing.
          One line of CSS, and it is the difference between a shop and a
          wall.

          A sold piece leaves the wall rather than being greyed out: her
          rule is that a piece sells ONCE, and one still hanging with a
          line through it invites somebody to ask whether it really has. */}
      {!loading && market && (
        <section aria-label={t('art.wall')} className="px-4">
          {wall.length === 0 ? (
            <p className="rounded-[3px] border border-dashed border-[var(--lyn)] px-4 py-10 text-center text-[14px]">
              {t('art.empty')}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 [&>*:nth-child(even)]:mt-7 md:[&>*:nth-child(even)]:mt-0 md:[&>*:nth-child(3n+2)]:mt-9">
              {wall.map((piece) => (
                <button
                  key={piece.id}
                  type="button"
                  data-piece={piece.id}
                  onClick={() => setSheet(piece)}
                  className="block w-full text-left"
                >
                  <span className="flex items-baseline justify-between pb-1.5">
                    <span className={MIKRO}>{cat(piece.id)}</span>
                    <span className="text-[13px] font-semibold text-[color:var(--ink)]">R{piece.rand}</span>
                  </span>
                  <Frame url={piece.url} alt={`${piece.title}, ${piece.by}`} />
                  <span
                    className="mt-2 block truncate text-[17px] leading-tight text-[color:var(--ink)]"
                    style={{ fontFamily: 'var(--vertoon)' }}
                  >
                    {piece.title}
                  </span>
                  <span className={`${MIKRO} block truncate pt-0.5`}>{piece.by}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Everything that is about you rather than about them ───────── */}
      <div className="mt-10 px-4">
        {market && market.asBuyer.length > 0 && (
          <Fold label={t('art.yours')}>
            <ul className="space-y-5">
              {market.asBuyer.map((thread) => (
                <li key={thread.id} data-thread={thread.id} className="rounded-[3px] border border-[var(--lyn)] p-4">
                  <p className={MIKRO}>{thread.by}</p>
                  <p
                    className="pt-1 text-[19px] leading-tight text-[color:var(--ink)]"
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
                        <Frame
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

        {/* Owner only. The route returns null for everybody else, so this
            fold is absent rather than empty. Carli: *"Dit sal in my
            rekening uitbetaal word en ek betaal dit uit aan die
            kunstenaar."* */}
        {market?.owing && market.owing.length > 0 && (
          <Fold label={t('art.owing')}>
            <ul className="space-y-3">
              {market.owing.map((one) => (
                <li
                  key={one.artist}
                  data-owed={one.artist}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[3px] border border-[var(--lyn)] p-4"
                >
                  <div className="min-w-0">
                    <p
                      className="truncate text-[19px] leading-tight text-[color:var(--ink)]"
                      style={{ fontFamily: 'var(--vertoon)' }}
                    >
                      {one.name}
                    </p>
                    <p className={`${MIKRO} pt-1`}>
                      {one.pieces} {one.pieces === 1 ? t('art.piece') : t('art.pieces')}
                    </p>
                  </div>
                  <p className="text-[22px] text-[color:var(--ink)]" style={{ fontFamily: 'var(--vertoon)' }}>
                    R{one.rand.toFixed(2)}
                  </p>
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

        <Fold label={t('art.sell')}>
          {!mine ? (
            <Apply onApply={(name, about, place) => doIt({ what: 'apply', name, about, place })} t={t} />
          ) : !mine.approved ? (
            <p className="text-[14px] leading-relaxed">{t('art.pending')}</p>
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

/* ──────────────────────────────────────────────────────────── the one piece ── */

/**
 * One work, raised over the wall.
 *
 * Everything a buyer needs before paying, in the order they need it: the
 * picture, then whose it is, then the one rule, then the price — and the
 * button pinned at the bottom where their thumb already is.
 *
 * There are no licence tiers. Three of them is a sensible marketplace and
 * it is not hers: *"elke kunswerk wat te koop is uniek is en net een keer
 * verkoop."* An option to sell the same painting twice would contradict the
 * one thing this room promises.
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
    <Sheet
      onClose={onClose}
      label={piece.title}
      foot={
        <button type="button" onClick={onBuy} className={VUL}>
          {t('art.buy')} · R{piece.rand}
        </button>
      }
    >
      <Frame url={piece.url} alt={`${piece.title}, ${piece.by}`} />

      <div className="flex items-baseline justify-between pt-4">
        <span className={MIKRO}>{cat(piece.id)}</span>
        <span className={MIKRO}>{t('art.one')}</span>
      </div>

      <h3
        className="pt-1 text-[30px] leading-tight text-[color:var(--ink)]"
        style={{ fontFamily: 'var(--vertoon)' }}
      >
        {piece.title}
      </h3>

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

      <p className="pt-4 text-[14px] leading-relaxed">{t('art.oneOnly')}</p>

      <ul className="space-y-2 pt-4">
        {[t('art.get.1'), t('art.get.2'), t('art.get.3'), t('art.get.4')].map((one) => (
          <li key={one} className="flex gap-2 text-[14px] leading-relaxed">
            <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[color:var(--aksent)]" aria-hidden />
            {one}
          </li>
        ))}
      </ul>

      <p className={`${MIKRO} pt-4`}>
        {t('art.dl.file')}: WebP · {ART_SIDE} × {ART_SIDE}
      </p>
    </Sheet>
  );
}

/* ────────────────────────────────────────────────────────────── the artist ── */

/**
 * The artist, and the whole of what a buyer may say to them.
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
    <Sheet
      onClose={onClose}
      label={artist.name}
      foot={
        picking ? undefined : (
          <button type="button" className={VUL} onClick={() => setPicking(true)} data-ask>
            <Plus className="h-4 w-4" aria-hidden />
            {t('art.want')}
          </button>
        )
      }
    >
      <h3
        className="text-[30px] leading-tight text-[color:var(--ink)]"
        style={{ fontFamily: 'var(--vertoon)' }}
      >
        {artist.name}
      </h3>
      {artist.place && <p className={`${MIKRO} pt-1.5`}>{artist.place}</p>}
      {artist.about && <p className="whitespace-pre-wrap pt-4 text-[14px] leading-relaxed">{artist.about}</p>}

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
    </Sheet>
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
    return <p className="text-[14px] leading-relaxed">{t('art.noneOwned')}</p>;
  }

  return (
    <div className="space-y-7">
      <div>
        <p className={MIKRO}>{t('art.collection')}</p>
        <div className="grid grid-cols-3 gap-3 pt-3 md:grid-cols-5">
          {owned.map((one) => (
            <button key={one.id} type="button" onClick={() => setPiece(one.id)} aria-pressed={piece === one.id}>
              <Frame
                url={one.url}
                alt={`${one.title}, ${one.by}`}
                className={piece === one.id ? 'outline outline-2 outline-offset-2 outline-[var(--ink)]' : ''}
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
                      ? 'inline-flex min-h-[44px] items-center rounded-full bg-[var(--ink)] px-4 text-[13px] font-semibold text-[var(--papier)]'
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
    <div className="max-w-md space-y-4">
      <p className="text-[14px] leading-relaxed">{t('art.applyWhy')}</p>
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
        className={VUL}
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
    <div className="space-y-9">
      {/* ── Hang a new piece ─────────────────────────────────────────── */}
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
        {/* What they actually take home, said before they set the price
            rather than discovered on a statement. The gateway comes off
            first and 70/30 is on what is left — `split` is the one place
            that arithmetic lives. */}
        <p className="text-[14px] leading-relaxed">
          {t('art.youGet')} <strong className="text-[color:var(--ink)]">R{money.artist.toFixed(2)}</strong>{' '}
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
        <p className={MIKRO}>{t('art.asks')}</p>
        {threads.length === 0 ? (
          <p className="pt-3 text-[14px]">{t('art.noAsks')}</p>
        ) : (
          <ul className="space-y-5 pt-3">
            {threads.map((thread) => {
              const draft = asking[thread.id] ?? { rand: String(UNIQUE_RAND), days: WINDOWS[0].days };
              return (
                <li key={thread.id} className="rounded-[3px] border border-[var(--lyn)] p-4">
                  <p
                    className="text-[19px] leading-tight text-[color:var(--ink)]"
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
                            className={
                              draft.days === one.days
                                ? 'inline-flex min-h-[44px] items-center rounded-full bg-[var(--ink)] px-4 text-[13px] font-semibold text-[var(--papier)]'
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
