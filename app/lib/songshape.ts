/**
 * How long each part of a song should actually be.
 *
 * ── Why the songs were coming out badly ──────────────────────────────────
 *
 * Carli: "dit kom baie baie sleg uit … ek mors letterlik my geld." She is
 * right, and it was not the engine. The plan being sent to it was wrong in a
 * way that guarantees a bad take.
 *
 * The old rule weighted each part by how many lines it carried and then scaled
 * those weights to fill the chosen length. Four lines and three minutes came
 * out as one part of a hundred and twenty seconds holding four lines — the
 * model asked to stretch a single verse over two minutes. What comes back from
 * that is a wandering, repeating, half-mumbled take, every time, and it costs
 * the same as a good one.
 *
 * ── What a song is actually shaped like ──────────────────────────────────
 *
 * Words take about the time they take. A sung line lands in three to five
 * seconds; a four-line verse is fifteen or twenty seconds, not two minutes.
 *
 * What a song does with the rest is sing the words again. Verse, chorus,
 * verse, chorus, break, chorus — that is the shape, and it is the whole reason
 * a four-line lyric can be a three-minute record. An intro, a break and an
 * outro are the seasoning around it, capped here at under a third of the
 * running time.
 *
 * So the words get the time the words need, the length is made up by singing
 * them again, and what is left over is played rather than sung over. That is a
 * normal song, and it is a plan the model can actually perform.
 *
 * ── What this buys besides the take ──────────────────────────────────────
 *
 * The lyric timeline reads the same plan. An intro that exists in the plan is
 * an intro the words do not start on top of — which is half of "die woorde
 * hardloop te vinnig", from the other direction.
 */

/** One part of the plan. No lines means nobody is singing on it. */
export interface Part {
  readonly name: string;
  readonly lines: readonly string[];
  readonly seconds: number;
}

/**
 * How long one sung line takes.
 *
 * Four seconds, which is a slow pop line or a fast one at half time. It is a
 * starting point rather than a measurement — the parts below are clamped
 * around it, so a wrong guess costs a few seconds rather than the shape.
 */
const PER_LINE = 4;

/** What a sung part may be, whatever the arithmetic says. */
const SUNG_MIN = 8;
const SUNG_MAX = 45;
/** And what the API itself accepts, which is the outer bound on all of it. */
const PART_MIN = 4;
const PART_MAX = 120;

/** The wordless parts, in the order a surplus is spent on them. */
const INTRO_MAX = 14;
const OUTRO_MAX = 20;
const BREAK_MAX = 24;

/**
 * How many times through the words, at most.
 *
 * Four passes of a verse and a chorus is a long song. More than that is not a
 * song with a lot of repeats, it is a length nobody should have asked for out
 * of these words, and the room says so rather than the plan pretending.
 */
const MOST_PASSES = 4;

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, Math.round(value)));

/**
 * The plan for a song: the words in parts that fit them, and wordless parts
 * for whatever length is left over.
 *
 * `total` of zero or less means "as long as the words need", which is what the
 * sketch engine and a request with no chosen length both want.
 */
export function shapeSong(
  sections: readonly { name: string; lines: readonly string[] }[],
  total: number,
): Part[] {
  const sung = sections.filter((one) => one.lines.length > 0);
  if (!sung.length) return [];

  /* What each part needs on its own, before any total is considered. */
  const natural = sung.map((one) => clamp(one.lines.length * PER_LINE, SUNG_MIN, SUNG_MAX));
  const need = natural.reduce((sum, one) => sum + one, 0);

  const wanted = total > 0 ? Math.round(total) : need + INTRO_MAX + OUTRO_MAX;

  /* ── Not enough room for the words ────────────────────────────────────
     Scaled down rather than truncated, with a floor: six seconds is a fast
     verse and is still singable. Below that the request is asking for more
     words than the length can hold, and the honest thing is a song that runs
     a little long rather than one that gabbles. */
  if (need >= wanted) {
    const scale = wanted / need;
    return sung.map((one, i) => ({
      name: one.name,
      lines: one.lines,
      seconds: clamp(Math.max(6, natural[i] * scale), PART_MIN, PART_MAX),
    }));
  }

  /* ── Room to spare ────────────────────────────────────────────────────
 
     What a song does with room it has not got words for is sing the words
     again. Verse, chorus, verse, chorus — that is the shape, and it is why a
     four-line lyric can be a three-minute record.
 
     The first version of this spent the surplus on wordless parts and
     produced "Intro · Break · Solo · Solo · Solo · Verse · Outro": the only
     verse arrived at two minutes eight. It passed every assertion and no
     musician would call it a song. Wordless parts are the seasoning — capped
     below at under a third of the running time — and the repeats are the
     song. */
  const passes: number[] = [];
  let filled = 0;
  const reserve = Math.min(Math.round(wanted * 0.3), INTRO_MAX + OUTRO_MAX + BREAK_MAX);
  const forWords = Math.max(need, wanted - reserve);
  for (let pass = 0; pass < MOST_PASSES && filled < forWords * 0.92; pass += 1) {
    for (let i = 0; i < sung.length; i += 1) {
      passes.push(i);
      filled += natural[i];
    }
  }

  /* Fitted to the room the words were given, so the whole thing lands on the
     length that was asked for rather than near it. */
  const scale = forWords / filled;
  const sungParts: Part[] = passes.map((i) => ({
    name: sung[i].name,
    lines: sung[i].lines,
    seconds: clamp(natural[i] * scale, Math.min(SUNG_MIN, PART_MAX), SUNG_MAX),
  }));

  let spare = wanted - sungParts.reduce((sum, one) => sum + one.seconds, 0);

  const parts: Part[] = [];
  const intro = Math.min(INTRO_MAX, Math.max(0, spare));
  spare -= intro;
  const outro = Math.min(OUTRO_MAX, Math.max(0, spare));
  spare -= outro;
  const gap = Math.min(BREAK_MAX, Math.max(0, spare));
  spare -= gap;

  if (intro >= PART_MIN) parts.push({ name: 'Intro', lines: [], seconds: clamp(intro, PART_MIN, PART_MAX) });

  /* The break goes between two passes rather than inside one, which is where
     a middle eight lives in an actual song. */
  const middle = passes.length > 2 ? Math.ceil(passes.length / 2) : sungParts.length;
  sungParts.forEach((part, i) => {
    if (i === middle && gap >= PART_MIN) {
      parts.push({ name: 'Break', lines: [], seconds: clamp(gap, PART_MIN, PART_MAX) });
    }
    parts.push(part);
  });

  /* Anything still over — a few seconds of rounding, or a length no
     arrangement of these parts reaches — goes on the ending, where it is
     least audible. */
  const tail = outro + Math.max(0, spare);
  if (tail >= PART_MIN) parts.push({ name: 'Outro', lines: [], seconds: clamp(tail, PART_MIN, PART_MAX) });

  return parts;
}

/** What a plan adds up to, which is what the song will actually run. */
export function planLength(parts: readonly Part[]): number {
  return parts.reduce((sum, one) => sum + one.seconds, 0);
}
