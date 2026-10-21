'use client';

/**
 * A picture for everything, without a stock photo in sight.
 *
 * People are visual and a wall of text cards is a wall nobody reads. But the
 * usual fix — a smiling stranger from a photo library over an article about
 * scaling laws — is a picture of nothing, and this app spends the rest of its
 * time refusing to imply things that are not true.
 *
 * So two sources, in order:
 *
 *   · If the thing is a real video, its own thumbnail. YouTube serves one at a
 *     predictable address for every video, and it is a picture *of the actual
 *     lecture* — accurate by construction.
 *
 *   · If somebody has MADE a sleeve for the song, that — see `photo` below.
 *
 *   · Otherwise, artwork generated from the item's own title. Deterministic, so
 *     a card looks the same every time you come back and becomes recognisable;
 *     obviously drawn rather than photographed, so nobody mistakes it for a
 *     depiction of anything. It costs no request and cannot 404.
 */

import React, { useEffect, useState } from 'react';
import { creditLine, type ArtCredit } from '../lib/artcredit';

/** The video id out of any of the shapes a YouTube link comes in. */
export function youtubeId(url: string | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (let i = 0; i < patterns.length; i += 1) {
    const found = url.match(patterns[i]);
    if (found) return found[1];
  }
  return null;
}

/** A small stable number from a string, so the same title always draws alike. */
function hash(seed: string): number {
  let value = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    value ^= seed.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/**
 * Generated artwork: a lit field with a few large shapes over it.
 *
 * The first attempt was drawn dark to sit quietly next to the text, and the
 * result was a brown smudge — a picture that adds nothing is worse than the
 * space it took, because it costs a row of height and gives back no reason to
 * look. So this is bright, high-contrast and confident, and the card's own
 * border does the work of keeping it in its place.
 *
 * The hues are pulled apart by a fixed distance rather than picked
 * independently: two random hues are as likely to fight as to agree, and every
 * one of these sits in a grid next to every other one.
 */
function Drawn({ seed, label }: { seed: string; label: string }): React.ReactElement {
  const n = hash(seed);
  const hue = n % 360;
  const second = (hue + 55 + (n % 50)) % 360;
  const id = `c${n.toString(36)}`;
  const bars = 4 + (n % 3);

  return (
    <svg
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      className="w-full h-full"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue} 70% 46%)`} />
          <stop offset="100%" stopColor={`hsl(${second} 75% 30%)`} />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="rgba(9,9,11,0.55)" />
          <stop offset="70%" stopColor="rgba(9,9,11,0)" />
        </linearGradient>
      </defs>

      <rect width="320" height="180" fill={`url(#${id})`} />

      {/* Two large soft forms. Big enough to be a composition rather than
          texture, and placed from the same number so they never move. */}
      <circle
        cx={30 + (n % 260)}
        cy={20 + ((n >>> 7) % 60)}
        r={60 + (n % 50)}
        fill={`hsl(${(second + 30) % 360} 90% 70%)`}
        opacity={0.35}
      />
      <circle
        cx={260 - ((n >>> 11) % 200)}
        cy={150 - ((n >>> 5) % 50)}
        r={40 + ((n >>> 3) % 40)}
        fill={`hsl(${(hue + 180) % 360} 90% 65%)`}
        opacity={0.28}
      />

      {/* A skyline along the bottom: the item's signature, and the thing that
          makes two covers tell each other apart at a glance. The shifts are
          unsigned: the hash fills all 32 bits, and a signed shift turns it
          negative, which the browser rejects as a bar height. */}
      {Array.from({ length: bars }, (_, i) => {
        const step = 320 / bars;
        const height = 30 + ((n >>> (i * 4)) % 90);
        return (
          <rect
            key={i}
            x={i * step + step * 0.16}
            y={180 - height}
            width={step * 0.68}
            height={height}
            rx={6}
            fill="#fff"
            opacity={0.16 + ((n >>> (i * 2)) % 4) * 0.07}
          />
        );
      })}

      {/* Darker at the foot, so white text laid over a cover stays readable. */}
      <rect width="320" height="180" fill={`url(#${id}f)`} />
    </svg>
  );
}

/**
 * The bought piece's credit, on the piece: its title and its artist.
 *
 * The owner, 21 October 2026: *"die artist van die art is nie op die album art
 * nie. Dit is deel van die ooreenkoms. ons moet die artist se naam en die
 * album art se naam ook op sit met gekoopte art … so gesit dat dit nie die
 * woorde cover wat nou op die prent wys nie."*
 *
 * So it lives on the picture wherever the picture goes, not in a caption
 * somebody can scroll past — and where a photograph's credit has always
 * lived: a slim line up the left edge, reading upwards. A sleeve's own
 * lettering sits in the middle, at the top or along the bottom, and the
 * screens' buttons sit on the right; the left edge is the one place that
 * covers none of it. Nothing at all when there is no bought piece: a made
 * cover is nobody's work to sign.
 */
export function ArtTag({ credit }: { readonly credit?: ArtCredit | null }): React.ReactElement | null {
  const line = creditLine(credit);
  if (!line || !credit) return null;
  return (
    <p
      data-arttag
      aria-label={`Cover art: ${line}`}
      className="pointer-events-none absolute left-1.5 top-1/2 z-[5] max-h-[78%] overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-1 py-2.5 text-[9px] font-bold uppercase leading-none tracking-[0.18em]"
      style={{
        writingMode: 'vertical-rl',
        transform: 'translateY(-50%) rotate(180deg)',
        color: 'rgba(255,255,255,0.9)',
        background: 'rgba(0,0,0,0.4)',
        textShadow: '0 1px 3px rgba(0,0,0,0.9)',
      }}
    >
      Art · “{credit.title}” · {credit.by}
    </p>
  );
}

export default function Cover({
  seed,
  label,
  url,
  photo,
  credit,
  className = '',
}: {
  /**
   * Who made the sleeve, when it is a bought piece. Drawn on the picture
   * by `ArtTag`, and only over the photograph itself — never over the
   * drawing it falls back to.
   */
  credit?: ArtCredit | null;
  /** What the artwork is derived from — an id, or the title. */
  seed: string;
  /** Read out by a screen reader in place of the picture. */
  label: string;
  /** Where the thing lives. A real video's own thumbnail wins over artwork. */
  url?: string;
  /**
   * A sleeve somebody actually made for this song, if there is one.
   *
   * ── Why it is a prop here rather than a second component ────────────
   *
   * `Sleeve.tsx` is the thing that MAKES one: it asks the server, shows a
   * spinner, spends credits and offers a remake. That belongs on the one
   * card somebody is working on. Everywhere else — the live room, the
   * full-screen player, the grid — the question is only "is there a
   * picture", and mounting the maker to answer it would put a generate
   * button on every tile in the app.
   *
   * So the picture comes down with the data that already had to be
   * fetched, and this draws it. Nothing here asks for anything.
   *
   * ── Why it falls back rather than trusting the address ──────────────
   *
   * These are signed links that expire in an hour. A room left open over
   * lunch has stale addresses in it, and a broken-image icon on every
   * panel is worse than the drawing was. So a sleeve that will not load
   * falls back to the generated artwork, exactly as a missing YouTube
   * thumbnail does — one mechanism, not two.
   */
  photo?: string | null;
  className?: string;
}): React.ReactElement {
  const video = youtubeId(url);
  // A thumbnail can be missing even when the id is right — an unlisted video,
  // a deleted one — and a broken image icon is worse than no photograph at all.
  const [failed, setFailed] = useState(false);
  const [noSleeve, setNoSleeve] = useState(false);

  /* A different song, or a remade sleeve, is a different address. Without
     this, one expired link would leave `noSleeve` true for whatever the
     panel showed next — which on a scrolling room is every song after the
     first one that failed. */
  const shown = photo && !noSleeve ? photo : null;
  useEffect(() => setNoSleeve(false), [photo]);

  return (
    <div className={`relative overflow-hidden bg-zinc-950 ${className}`}>
      {shown ? (
        <img
          src={shown}
          alt={label}
          loading="lazy"
          onError={() => setNoSleeve(true)}
          className="w-full h-full object-cover"
        />
      ) : video && !failed ? (
        <img
          src={`https://img.youtube.com/vi/${video}/hqdefault.jpg`}
          alt={label}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <Drawn seed={seed} label={label} />
      )}
      {shown && <ArtTag credit={credit} />}
    </div>
  );
}
