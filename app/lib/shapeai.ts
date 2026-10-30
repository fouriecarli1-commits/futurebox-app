/**
 * A shape described in words and drawn by the AI, as one outline.
 *
 * The owner, 30 October 2026: *"Ek sien jy het nog nie gewerk aan my ding
 * rondom shapes nie. Dat photo editor dalk ook 'n ai engine het waar jy
 * sekere shapes vra en al die verstellings wat ek vroeer gevra het moet saam
 * met 'n shape gaan."*
 *
 * So the AI is asked for the outline only — SVG path data, a silhouette —
 * and not a picture. The outline becomes an ordinary shape on the post
 * (`postshapes.ts`, kind `ai`): it takes the colour, the glow, the shadow,
 * the turn, the flips and the see-through slider every other shape takes,
 * and it is as crisp in the saved file as a circle is.
 *
 * What comes back is read here, not trusted: only absolute straight lines
 * and curves, every number a number, and the whole thing moved and scaled
 * into a box of 100 by 100 whatever box the AI drew it in. Anything else is
 * no shape at all. The same function runs on the server before it answers
 * and on the device when a saved post is opened again.
 */

/** The commands kept, and how many numbers each one takes. Arcs are left out: they cannot be scaled as plain pairs. */
const ARITY: Readonly<Record<string, number>> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, Z: 0 };

/** Longer than any outline worth drawing; a runaway answer is not one. */
export const MOST_PATH = 8000;

/**
 * The outline, moved and scaled into 0–100 on both sides and centred, with
 * its shape kept; or null if it is not an outline this app can draw.
 */
export function fitShapePath(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  /* The AI may wrap it: a code fence, a whole <path d="…">, a sentence. */
  let text = raw.replace(/```[a-z]*|```/gi, ' ');
  const inD = /\bd\s*=\s*["']([^"']+)["']/i.exec(text);
  if (inD) text = inD[1];
  text = text.trim();
  if (!text || text.length > MOST_PATH) return null;
  if (!/^[MLHVCSQTZ0-9eE.,\s+-]+$/.test(text)) return null;

  const tokens = text.match(/[MLHVCSQTZ]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
  if (!tokens || tokens[0] !== 'M') return null;

  /* Read it into commands with their numbers, keeping x and y apart. */
  const steps: { cmd: string; nums: number[] }[] = [];
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i];
    if (!(cmd in ARITY)) return null;
    i += 1;
    const need = ARITY[cmd];
    if (need === 0) { steps.push({ cmd, nums: [] }); continue; }
    /* A command may repeat its numbers without saying its letter again. */
    let first = true;
    while (i < tokens.length && !(tokens[i] in ARITY)) {
      const nums = tokens.slice(i, i + need).map(Number);
      if (nums.length < need || nums.some((n) => !Number.isFinite(n))) return null;
      steps.push({ cmd: first ? cmd : cmd === 'M' ? 'L' : cmd, nums });
      first = false;
      i += need;
    }
    if (first) return null;
  }
  if (steps.length < 3 || steps.length > 1200) return null;

  /* Which numbers are x and which are y. */
  const isX = (cmd: string, at: number): boolean => (cmd === 'H' ? true : cmd === 'V' ? false : at % 2 === 0);
  let left = Infinity; let right = -Infinity; let top = Infinity; let bottom = -Infinity;
  for (const step of steps) {
    step.nums.forEach((n, at) => {
      if (isX(step.cmd, at)) { left = Math.min(left, n); right = Math.max(right, n); } else { top = Math.min(top, n); bottom = Math.max(bottom, n); }
    });
  }
  const wide = right - left;
  const tall = bottom - top;
  if (!(wide > 0) || !(tall > 0)) return null;
  const scale = 100 / Math.max(wide, tall);
  const padX = (100 - wide * scale) / 2;
  const padY = (100 - tall * scale) / 2;
  const say = (n: number): string => String(Math.round(n * 100) / 100);
  return steps.map((step) => step.cmd + step.nums.map((n, at) => say(isX(step.cmd, at) ? (n - left) * scale + padX : (n - top) * scale + padY)).join(' ')).join('');
}

/** What the AI is asked. Kept here so the check can read the rules it is given. */
export function shapeAsk(words: string): string {
  return [
    `Draw this as one flat filled silhouette shape: ${words}`,
    '',
    'Answer with ONLY SVG path data — what goes inside d="" — and nothing else: no words, no tags, no code fence.',
    'Use only absolute uppercase commands: M, L, H, V, C, S, Q, T and Z. No arcs (A), no lowercase.',
    'Draw it inside a box from 0 to 100 on both sides.',
    'A bold, simple, recognisable outline, like an icon or a sticker shape. Closed with Z.',
    'Holes are allowed as extra closed subpaths inside it.',
    'No text, no letters, no strokes, no faces of real people, no brand logos.',
  ].join('\n');
}
