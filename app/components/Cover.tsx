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
 *   · Otherwise, artwork generated from the item's own title. Deterministic, so
 *     a card looks the same every time you come back and becomes recognisable;
 *     obviously drawn rather than photographed, so nobody mistakes it for a
 *     depiction of anything. It costs no request and cannot 404.
 */

import React, { useState } from 'react';

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

export default function Cover({
  seed,
  label,
  url,
  className = '',
}: {
  /** What the artwork is derived from — an id, or the title. */
  seed: string;
  /** Read out by a screen reader in place of the picture. */
  label: string;
  /** Where the thing lives. A real video's own thumbnail wins over artwork. */
  url?: string;
  className?: string;
}): React.ReactElement {
  const video = youtubeId(url);
  // A thumbnail can be missing even when the id is right — an unlisted video,
  // a deleted one — and a broken image icon is worse than no photograph at all.
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-zinc-950 ${className}`}>
      {video && !failed ? (
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
    </div>
  );
}
