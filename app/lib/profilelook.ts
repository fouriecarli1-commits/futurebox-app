/**
 * The city behind the profile page.
 *
 * Carli's picture of the page, 14 October 2026, stands it on a night city:
 * towers with lit windows, green light down their edges. The app has no such
 * photograph, and a stock one would be somebody else's city, so it is drawn
 * here — the same skyline every time, from a fixed seed — as an SVG the page
 * sets as its background. Literal colours live here rather than in the
 * component because `check:theme` counts them there.
 */
const W = 1600;
const H = 900;

/** A small fixed random, so the skyline is the same on every visit. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function skyline(): string {
  const r = seeded(20261014);
  const parts: string[] = [];
  let x = -20;
  while (x < W) {
    const w = 50 + Math.round(r() * 110);
    const h = 260 + Math.round(r() * 520);
    const top = H - h;
    parts.push(`<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="#071a16" stroke="#0f3d31" stroke-width="1"/>`);
    if (r() > 0.45) {
      parts.push(`<rect x="${x}" y="${top}" width="2" height="${h}" fill="#10b981" opacity="0.35"/>`);
    }
    for (let wy = top + 16; wy < H - 20; wy += 18) {
      for (let wx = x + 8; wx < x + w - 8; wx += 12) {
        if (r() > 0.78) {
          parts.push(`<rect x="${wx}" y="${wy}" width="5" height="7" fill="${r() > 0.85 ? '#5eead4' : '#34d399'}" opacity="${(0.25 + r() * 0.5).toFixed(2)}"/>`);
        }
      }
    }
    x += w + 6 + Math.round(r() * 24);
  }
  return parts.join('');
}

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">`
  + '<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03110d"/><stop offset="1" stop-color="#062a22"/></linearGradient></defs>'
  + `<rect width="${W}" height="${H}" fill="url(#s)"/>`
  + skyline()
  + '</svg>';

/** The page's background: a dark wash over the city, so glass on it reads. */
export const PROFILE_BACKDROP = [
  /* The welcome page's 40-pixel grid, over the city — her word: the grid in
     every room, "you" included. */
  'linear-gradient(to right, rgba(226,232,240,0.05) 1px, transparent 1px)',
  'linear-gradient(to bottom, rgba(226,232,240,0.05) 1px, transparent 1px)',
  'linear-gradient(180deg, rgba(3,8,7,0.55) 0%, rgba(3,8,7,0.35) 40%, rgba(3,8,7,0.8) 100%)',
  'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.18), transparent 60%)',
  `url("data:image/svg+xml;utf8,${encodeURIComponent(SVG)}")`,
].join(', ');

/** Glass, as the cards in her picture are: dark, see-through, a thin light edge. */
export const PROFILE_GLASS = {
  background: 'rgba(12,18,20,0.72)',
  border: '1px solid rgba(255,255,255,0.12)',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 0 40px rgba(16,185,129,0.12)',
} as const;

/**
 * A card inside the glass.
 *
 * Carli, 15 October 2026: *"Daai blokke by You moet beter lyk en meer
 * rounded."* A faint top-lit gradient, a hairline of light along the top edge
 * and a soft shadow under it, so a card sits ON the glass instead of being a
 * flat dark patch cut out of it. The corners are `rounded-2xl` where it is used.
 */
export const PROFILE_CARD = {
  background: 'linear-gradient(160deg, rgba(30,42,46,0.92) 0%, rgba(16,23,27,0.92) 100%)',
  border: '1px solid rgba(255,255,255,0.09)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.28)',
} as const;

/** A decorative wave for a voice card, shaped by the voice's name. */
export function voiceWave(name: string): string {
  let seed = 7;
  for (const c of name) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const r = seeded(seed);
  const points: string[] = [];
  for (let i = 0; i <= 40; i += 1) {
    const y = 16 + Math.sin(i / 3 + r() * 0.8) * (6 + r() * 7);
    points.push(`${i * 5},${y.toFixed(1)}`);
  }
  return points.join(' ');
}

/** The sizes and places of the five layers above, in the same order. */
export const PROFILE_BACKDROP_SIZE = '40px 40px, 40px 40px, cover, cover, cover';
export const PROFILE_BACKDROP_PLACE = '0 0, 0 0, center, center, center bottom';
