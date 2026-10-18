/**
 * The words on a PDF page, gathered into the paragraphs and headings a
 * person sees.
 *
 * The owner, 17 October 2026: *"Die hele dokument se woorde moet uit spring en
 * die hele dokument moet editable word. Dan wanneer mens op 'n hele blok
 * kliek dan moet daai hele blok ge-edit kan word. Dus trek lyne/blokke om
 * paragrawe en opskrifte sodat mens dit kan edit."*
 *
 * A PDF does not know what a paragraph is. It holds runs of letters, each
 * placed at a point — sometimes a word, sometimes half a line, in whatever
 * order the program that wrote it chose. So the blocks are found the way an
 * eye finds them: runs on one baseline and close together are a line; lines
 * of the same size, one under the other at an ordinary line spacing and
 * overlapping across, are a paragraph; a line in a bigger size is a heading
 * of its own. Pure arithmetic on boxes, so it is checked without a browser
 * (`check:pdfwork`).
 */

/** A run of letters on a page, as `pdfview.ts` reads it: fractions of the page as shown. */
export interface Run {
  readonly text: string;
  readonly u1: number;
  readonly v1: number;
  readonly u2: number;
  readonly v2: number;
  readonly size: number;
  readonly base: number;
  readonly font: 'sans' | 'serif' | 'mono';
}

/** A paragraph or a heading. */
export interface Block {
  readonly page: number;
  /** Its place on the page, stable while the page is unchanged. */
  readonly key: string;
  readonly u1: number;
  readonly v1: number;
  readonly u2: number;
  readonly v2: number;
  /** The words, lines joined back into sentences; a short line keeps its break. */
  readonly text: string;
  /** Letter size and line spacing, in points. */
  readonly size: number;
  readonly lead: number;
  readonly font: 'sans' | 'serif' | 'mono';
  readonly lines: number;
}

interface Line {
  x1: number;
  x2: number;
  top: number;
  bottom: number;
  base: number;
  size: number;
  text: string;
  font: Run['font'];
}

const median = (values: readonly number[]): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/** The page's runs as paragraphs and headings, top to bottom. `w` and `h` are the page as shown, in points. */
export function groupBlocks(runs: readonly Run[], w: number, h: number, page = 0): Block[] {
  /* In points, so a gap can be compared with a letter size. */
  const pts = runs
    .filter((one) => one.text.trim())
    .map((one) => ({ ...one, x1: one.u1 * w, x2: one.u2 * w, top: one.v1 * h, bottom: one.v2 * h, y: one.base * h }))
    .sort((a, b) => a.y - b.y || a.x1 - b.x1);

  /* ── Runs into lines ── */
  const lines: Line[] = [];
  for (const run of pts) {
    const line = lines.find((one) =>
      Math.abs(one.base - run.y) < Math.min(one.size, run.size) * 0.35
      && Math.max(one.size, run.size) / Math.min(one.size, run.size) < 1.3
      && run.x1 - one.x2 < run.size * 1.6
      && run.x2 > one.x1 - run.size);
    if (line) {
      const before = run.x1 < line.x1;
      const gap = before ? line.x1 - run.x2 : run.x1 - line.x2;
      const joined = before ? [run.text, line.text] : [line.text, run.text];
      const space = gap > run.size * 0.12 && !/\s$/.test(joined[0]) && !/^\s/.test(joined[1]) ? ' ' : '';
      line.text = joined.join(space);
      line.x1 = Math.min(line.x1, run.x1);
      line.x2 = Math.max(line.x2, run.x2);
      line.top = Math.min(line.top, run.top);
      line.bottom = Math.max(line.bottom, run.bottom);
      line.size = Math.max(line.size, run.size);
    } else {
      lines.push({ x1: run.x1, x2: run.x2, top: run.top, bottom: run.bottom, base: run.y, size: run.size, text: run.text, font: run.font });
    }
  }
  lines.sort((a, b) => a.base - b.base || a.x1 - b.x1);

  /* ── Lines into paragraphs ── */
  const groups: Line[][] = [];
  for (const line of lines) {
    const group = groups.find((one) => {
      const last = one[one.length - 1];
      const step = line.base - last.base;
      const sameSize = Math.max(last.size, line.size) / Math.min(last.size, line.size) < 1.15;
      const overlaps = line.x1 < Math.max(...one.map((l) => l.x2)) && line.x2 > Math.min(...one.map((l) => l.x1));
      const leftAligned = Math.abs(line.x1 - one[0].x1) < line.size * 2.5;
      return sameSize && step > 0 && step < line.size * 1.9 && overlaps && leftAligned;
    });
    if (group) group.push(line);
    else groups.push([line]);
  }

  return groups.map((group, k): Block => {
    const x1 = Math.min(...group.map((l) => l.x1));
    const x2 = Math.max(...group.map((l) => l.x2));
    const top = Math.min(...group.map((l) => l.top));
    const bottom = Math.max(...group.map((l) => l.bottom));
    const size = median(group.map((l) => l.size));
    const steps = group.slice(1).map((l, j) => l.base - group[j].base);
    const width = x2 - x1;
    /* Sentences back together: a hyphen at a line's end joins the word; a
       short line (an address, a list item, the paragraph's last) keeps its break. */
    let text = '';
    group.forEach((l, j) => {
      const t = l.text.trim();
      if (j === 0) { text = t; return; }
      const prev = group[j - 1];
      if (/[A-Za-zÀ-ÿ]-$/.test(text) && /^[a-zà-ÿ]/.test(t)) text = `${text.slice(0, -1)}${t}`;
      else text += (prev.x2 - prev.x1 < width * 0.7 ? '\n' : ' ') + t;
    });
    const fonts = group.map((l) => l.font);
    return {
      page,
      key: `${page}:${k}:${Math.round(x1)}:${Math.round(top)}`,
      u1: x1 / w,
      v1: top / h,
      u2: x2 / w,
      v2: bottom / h,
      text,
      size,
      lead: steps.length ? median(steps) : size * 1.2,
      font: fonts.sort((a, b) => fonts.filter((f) => f === b).length - fonts.filter((f) => f === a).length)[0],
      lines: group.length,
    };
  });
}
