/**
 * Charts on a post: the data, the templates, and the drawing.
 *
 * Carli, 17 October 2026: *"In photo editor sal daar ook graph templates
 * moet wees, en verskillende verskeidenheid van graphs. Wat cool sal wees as
 * dit AI verstelbaar is dat data ingevoer kan word en AI die data in die
 * grafiek verstel."*
 *
 * A chart is a layer on the picture like a shape (`postshapes.ts`): it is
 * moved, sized, ordered and exported the same way, and it carries its data
 * with it, so it can be opened again and changed — a table typed by hand,
 * numbers pasted from a spreadsheet, or words handed to the AI
 * (`api/post/chart`), which answers with data in exactly this shape and is
 * read through `cleanChart` like anything else from outside.
 *
 * ── How it looks ────────────────────────────────────────────────────────
 *
 * The colours are the validated categorical palette — eight hues in a fixed
 * order, its light steps on the light looks and its dark steps on the dark
 * ones, checked against each look's own surface. On the light surfaces three
 * of the hues are under 3:1 against the paper, so values are written on the
 * chart itself (the relief the palette asks for): a picture in a feed has no
 * table and nothing to hover. A ninth series is never a new colour: pie
 * slices past seven fold into Other, and a chart takes eight series at most.
 * Words are drawn in the look's ink, never in a series colour. One axis,
 * always from nought for bars.
 */

/* ── Kinds ──────────────────────────────────────────────────────────────── */

export type ChartKind = 'column' | 'bar' | 'stacked' | 'line' | 'area' | 'pie' | 'donut' | 'ring' | 'stat';
export type LookId = 'paper' | 'cream' | 'night' | 'neon' | 'glass';

export interface Series {
  readonly name: string;
  readonly values: readonly number[];
}

export interface ChartSpec {
  readonly kind: ChartKind;
  readonly look: LookId;
  readonly title: string;
  readonly note?: string;
  readonly labels: readonly string[];
  readonly series: readonly Series[];
  /** A unit for every value: before it (R, $) or after it (%, kg). */
  readonly unit?: string;
  readonly unitAfter?: boolean;
}

export const CHART_KINDS: readonly { readonly id: ChartKind; readonly en: string; readonly af: string }[] = [
  { id: 'column', en: 'Columns', af: 'Kolomme' },
  { id: 'bar', en: 'Bars', af: 'Stawe' },
  { id: 'stacked', en: 'Stacked', af: 'Gestapel' },
  { id: 'line', en: 'Line', af: 'Lyn' },
  { id: 'area', en: 'Area', af: 'Area' },
  { id: 'pie', en: 'Pie', af: 'Koek' },
  { id: 'donut', en: 'Donut', af: 'Ring-koek' },
  { id: 'ring', en: 'Goal ring', af: 'Doelwitring' },
  { id: 'stat', en: 'Big number', af: 'Groot getal' },
];

/** The most series a chart holds, and the most slices a pie shows before the rest are Other. */
export const MOST_SERIES = 8;
export const MOST_SLICES = 7;
export const MOST_POINTS = 24;

/* ── Looks: a surface, its inks, and the palette steps solved for it ────── */

export interface Look {
  readonly id: LookId;
  readonly en: string;
  readonly af: string;
  readonly surface: string;
  /** How solid the surface is; the glass look lets the photograph through. */
  readonly surfaceAlpha: number;
  readonly ink: string;
  readonly inkSoft: string;
  readonly grid: string;
  readonly dark: boolean;
  readonly glow: boolean;
}

/** The validated categorical order: light steps, then the same hues stepped for dark surfaces. */
export const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'] as const;
export const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'] as const;

export const LOOKS: readonly Look[] = [
  { id: 'paper', en: 'Paper', af: 'Papier', surface: '#fcfcfb', surfaceAlpha: 1, ink: '#0b0b0b', inkSoft: '#52514e', grid: '#e4e3df', dark: false, glow: false },
  { id: 'cream', en: 'Cream', af: 'Room', surface: '#f6f1e7', surfaceAlpha: 1, ink: '#1d1a14', inkSoft: '#5b554a', grid: '#e2dacb', dark: false, glow: false },
  { id: 'night', en: 'Night', af: 'Nag', surface: '#1a1a19', surfaceAlpha: 1, ink: '#f0efec', inkSoft: '#c3c2b7', grid: '#34332f', dark: true, glow: false },
  { id: 'neon', en: 'Neon', af: 'Neon', surface: '#0b0f14', surfaceAlpha: 1, ink: '#f4fbff', inkSoft: '#b7c4cf', grid: '#1f2a33', dark: true, glow: true },
  { id: 'glass', en: 'Glass', af: 'Glas', surface: '#14161c', surfaceAlpha: 0.78, ink: '#f4f4f6', inkSoft: '#c9cad2', grid: 'rgba(255,255,255,0.14)', dark: true, glow: false },
];

export const lookOf = (id: LookId): Look => LOOKS.find((one) => one.id === id) ?? LOOKS[0];
export const seriesColour = (look: Look, k: number): string => (look.dark ? SERIES_DARK : SERIES_LIGHT)[k % MOST_SERIES];

/* ── Templates ──────────────────────────────────────────────────────────── */

export interface ChartTemplate {
  readonly id: string;
  readonly en: string;
  readonly af: string;
  readonly spec: ChartSpec;
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export const CHART_TEMPLATES: readonly ChartTemplate[] = [
  { id: 'sales', en: 'Monthly sales', af: 'Maandelikse verkope', spec: { kind: 'column', look: 'paper', title: 'Sales this year', labels: MONTHS_EN, series: [{ name: 'Sales', values: [42, 51, 48, 63, 71, 84] }], unit: 'R', unitAfter: false, note: 'Thousands of rand' } },
  { id: 'compare', en: 'This year and last', af: 'Hierdie jaar en verlede jaar', spec: { kind: 'column', look: 'night', title: 'This year against last', labels: ['Q1', 'Q2', 'Q3', 'Q4'], series: [{ name: '2025', values: [120, 135, 128, 160] }, { name: '2026', values: [142, 158, 171, 190] }] } },
  { id: 'growth', en: 'Growth line', af: 'Groeilyn', spec: { kind: 'line', look: 'neon', title: 'Followers', labels: MONTHS_EN, series: [{ name: 'Followers', values: [1200, 1850, 2400, 3900, 5200, 7800] }] } },
  { id: 'reach', en: 'Reach over time', af: 'Bereik oor tyd', spec: { kind: 'area', look: 'glass', title: 'Reach per week', labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'], series: [{ name: 'Reach', values: [3.2, 4.1, 3.8, 5.6, 6.9, 8.4] }], unit: 'k', unitAfter: true } },
  { id: 'share', en: 'Share of the whole', af: 'Deel van die geheel', spec: { kind: 'donut', look: 'paper', title: 'Where our listeners are', labels: ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Elsewhere'], series: [{ name: 'Listeners', values: [44, 27, 18, 11] }], unit: '%', unitAfter: true } },
  { id: 'budget', en: 'Budget split', af: 'Begroting verdeel', spec: { kind: 'pie', look: 'cream', title: 'Where the budget goes', labels: ['Studio', 'Adverts', 'Video', 'Travel', 'Other'], series: [{ name: 'Budget', values: [35, 25, 20, 12, 8] }], unit: '%', unitAfter: true } },
  { id: 'survey', en: 'Survey results', af: 'Opname-uitslae', spec: { kind: 'bar', look: 'cream', title: 'What fans want most', labels: ['New songs', 'Live shows', 'Merch', 'Videos', 'Podcasts'], series: [{ name: 'Votes', values: [46, 31, 12, 7, 4] }], unit: '%', unitAfter: true } },
  { id: 'channels', en: 'Sales by channel', af: 'Verkope per kanaal', spec: { kind: 'stacked', look: 'night', title: 'Sales by channel', labels: ['Q1', 'Q2', 'Q3', 'Q4'], series: [{ name: 'Online', values: [40, 52, 61, 75] }, { name: 'Shows', values: [30, 28, 35, 44] }, { name: 'Shops', values: [12, 14, 13, 18] }] } },
  { id: 'goal', en: 'Goal reached', af: 'Doelwit bereik', spec: { kind: 'ring', look: 'neon', title: 'Crowdfunding goal', labels: ['Raised', 'Goal'], series: [{ name: 'Rand', values: [72000, 100000] }], unit: 'R', unitAfter: false } },
  { id: 'stat', en: 'Big number', af: 'Groot getal', spec: { kind: 'stat', look: 'glass', title: 'Monthly streams', labels: MONTHS_EN, series: [{ name: 'Streams', values: [21000, 24500, 23800, 29100, 33600, 41200] }] } },
  { id: 'ranking', en: 'Top five', af: 'Top vyf', spec: { kind: 'bar', look: 'night', title: 'Most played this month', labels: ['Song one', 'Song two', 'Song three', 'Song four', 'Song five'], series: [{ name: 'Plays', values: [9800, 7600, 6100, 4200, 3900] }] } },
  { id: 'twolines', en: 'Two lines', af: 'Twee lyne', spec: { kind: 'line', look: 'paper', title: 'Visitors', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], series: [{ name: 'Shop', values: [120, 132, 101, 134, 190, 230, 210] }, { name: 'Website', values: [220, 182, 191, 234, 290, 330, 310] }] } },
];

/* ── Numbers ────────────────────────────────────────────────────────────── */

/** Tick values for an axis from `lo` to `hi`: round steps, about `count` of them, always including nought. */
export function niceTicks(lo: number, hi: number, count = 4): number[] {
  const low = Math.min(0, lo);
  const high = Math.max(0, hi);
  if (high === low) return [0, 1];
  const raw = (high - low) / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power;
  const start = Math.floor(low / step) * step;
  const out: number[] = [];
  for (let v = start; v <= high + step * 1e-9; v += step) out.push(Math.round(v / step) * step);
  if (out[out.length - 1] < high) out.push(out[out.length - 1] + step);
  return out;
}

/** A number for a chart: short (12.4k, 3.1M), with its unit, in the reader's language. */
export function formatValue(v: number, spec: Pick<ChartSpec, 'unit' | 'unitAfter'>, lang = 'en'): string {
  const abs = Math.abs(v);
  const [n, tail] = abs >= 1e9 ? [v / 1e9, 'B'] : abs >= 1e6 ? [v / 1e6, 'M'] : abs >= 1e4 ? [v / 1e3, 'k'] : [v, ''];
  const digits = Math.abs(n) >= 100 || Number.isInteger(n) ? 0 : 1;
  let text = n.toFixed(digits);
  if (!tail && Math.abs(n) >= 1000) text = Math.round(n).toLocaleString(lang === 'af' ? 'af-ZA' : 'en-ZA').replace(/ /g, ' ');
  if (lang === 'af') text = text.replace('.', ',');
  const unit = spec.unit ?? '';
  if (!unit) return `${text}${tail}`;
  return spec.unitAfter ? `${text}${tail}${unit === '%' ? '' : ' '}${unit}` : `${unit}${unit.length > 1 ? ' ' : ''}${text}${tail}`;
}

/** Slices for a pie: the biggest seven as they are, the rest as Other. */
export function slicesOf(labels: readonly string[], values: readonly number[], other = 'Other'): { label: string; value: number; slot: number }[] {
  const rows = labels.map((label, k) => ({ label, value: Math.max(0, values[k] ?? 0), slot: k })).filter((one) => one.value > 0);
  if (rows.length <= MOST_SLICES) return rows;
  const kept = [...rows].sort((a, b) => b.value - a.value).slice(0, MOST_SLICES - 1).sort((a, b) => a.slot - b.slot);
  const keptSlots = new Set(kept.map((one) => one.slot));
  const rest = rows.filter((one) => !keptSlots.has(one.slot)).reduce((sum, one) => sum + one.value, 0);
  return [...kept.map((one, k) => ({ ...one, slot: k })), { label: other, value: rest, slot: kept.length }];
}

/* ── Reading data in: pasted tables, and the AI's answer ────────────────── */

/** A number as people write it: R 1 200, 1,234.5, 1.234,5, 12,5, 45%, 3.2k, 1.5M. */
export function toNumber(raw: string): number | null {
  let text = raw.trim().replace(/[R$€£%\s\u00a0]/g, '');
  let times = 1;
  if (/\d[kK]$/.test(text)) { times = 1e3; text = text.slice(0, -1); } else if (/\d[mM]$/.test(text)) { times = 1e6; text = text.slice(0, -1); }
  if (!/^-?[\d.,]+$/.test(text) || !/\d/.test(text)) return null;
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) text = text.replace(/,/g, '');
  else if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) text = text.replace(/\./g, '').replace(',', '.');
  else text = text.replace(',', '.');
  const n = Number(text);
  return Number.isFinite(n) ? n * times : null;
}

/** One line of a pasted table, as cells. */
function cellsOf(line: string): string[] {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes(';')) return line.split(';');
  const commas = line.split(',');
  const csv = commas.length > 1 && (/,\s/.test(line) || !/\d$/.test(commas[0].trim())) && commas.slice(1).every((cell) => toNumber(cell) !== null);
  if (csv) return commas;
  /* "Jan 42", "Gauteng: 44%", "Song one - 9 800" — words, then one number. */
  const one = /^(.+?)[\s:=–-]+(-?[R$€£]?\s?\d[\d\s.,]*\s*(?:%|k|K|m|M)?)$/.exec(line);
  return one ? [one[1].replace(/[\s:=,–-]+$/, ''), one[2]] : [line];
}

/**
 * A table pasted from a spreadsheet or typed as lines — tabs, semicolons or
 * commas between cells, or a label and a number. The first column is the
 * labels; each column after it is a series. A first row whose cells after
 * the first are not numbers names the series.
 */
export function parseTable(text: string): { labels: string[]; series: Series[] } | null {
  const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => cellsOf(line).map((cell) => cell.trim()));
  if (!rows.length) return null;
  const head = rows.length > 1 && rows[0].length > 1 && rows[0].slice(1).every((cell) => toNumber(cell) === null) ? rows.shift() : null;
  const width = Math.min(MOST_SERIES, Math.max(0, ...rows.map((row) => row.length - 1)));
  if (width < 1) return null;
  const labels: string[] = [];
  const columns: number[][] = Array.from({ length: width }, () => []);
  for (const row of rows) {
    if (labels.length >= MOST_POINTS) break;
    const values = Array.from({ length: width }, (_, k) => toNumber(row[k + 1] ?? ''));
    if (values.every((one) => one === null)) continue;
    labels.push(row[0].slice(0, 40) || `${labels.length + 1}`);
    values.forEach((one, k) => columns[k].push(one ?? 0));
  }
  if (!labels.length) return null;
  return {
    labels,
    series: columns.map((values, k) => ({ name: (head?.[k + 1] ?? '').slice(0, 40) || (width === 1 ? 'Value' : `Series ${k + 1}`), values })),
  };
}

const KIND_IDS = new Set<string>(CHART_KINDS.map((one) => one.id));
const LOOK_IDS = new Set<string>(LOOKS.map((one) => one.id));

/**
 * A chart from outside — the AI's answer, a saved design — made safe to
 * draw: known kind and look, at most eight series of numbers, every series
 * as long as the labels, short words. Anything unreadable is null, never a
 * half-chart.
 */
export function cleanChart(raw: unknown, fallback?: ChartSpec): ChartSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const words = (v: unknown, most: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, most) : '');
  const labels = Array.isArray(r.labels) ? r.labels.slice(0, MOST_POINTS).map((one) => words(String(one ?? ''), 40)) : [];
  const series = Array.isArray(r.series)
    ? r.series.slice(0, MOST_SERIES).map((one, k): Series | null => {
      const s = one as Record<string, unknown>;
      if (!s || !Array.isArray(s.values)) return null;
      const values = labels.map((_, at) => {
        const v = s.values instanceof Array ? s.values[at] : 0;
        const n = typeof v === 'number' ? v : typeof v === 'string' ? toNumber(v) ?? NaN : NaN;
        return Number.isFinite(n) ? Math.max(-1e12, Math.min(1e12, n)) : 0;
      });
      return { name: words(s.name, 40) || `Series ${k + 1}`, values };
    }).filter((one): one is Series => one !== null)
    : [];
  if (!labels.length || !series.length) return null;
  const kind = typeof r.kind === 'string' && KIND_IDS.has(r.kind) ? r.kind as ChartKind : fallback?.kind ?? 'column';
  const look = typeof r.look === 'string' && LOOK_IDS.has(r.look) ? r.look as LookId : fallback?.look ?? 'paper';
  const unit = words(r.unit, 6);
  return {
    kind,
    look,
    title: words(r.title, 80) || fallback?.title || '',
    ...(words(r.note, 120) ? { note: words(r.note, 120) } : {}),
    labels,
    series,
    ...(unit ? { unit, unitAfter: typeof r.unitAfter === 'boolean' ? r.unitAfter : /^[%a-z]/i.test(unit) && !/^[R$€£]/.test(unit) } : {}),
  };
}

/* ── Drawing ────────────────────────────────────────────────────────────── */

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** A rectangle with its far end rounded and its base square, so a bar stands on its axis. */
function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, end: 'top' | 'bottom' | 'right' | 'left'): void {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.beginPath();
  if (end === 'top') {
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + rr); ctx.arcTo(x, y, x + rr, y, rr); ctx.lineTo(x + w - rr, y); ctx.arcTo(x + w, y, x + w, y + rr, rr); ctx.lineTo(x + w, y + h);
  } else if (end === 'bottom') {
    ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - rr); ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr); ctx.lineTo(x + rr, y + h); ctx.arcTo(x, y + h, x, y + h - rr, rr);
  } else if (end === 'right') {
    ctx.moveTo(x, y); ctx.lineTo(x + w - rr, y); ctx.arcTo(x + w, y, x + w, y + rr, rr); ctx.lineTo(x + w, y + h - rr); ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr); ctx.lineTo(x, y + h);
  } else {
    ctx.moveTo(x + w, y); ctx.lineTo(x + rr, y); ctx.arcTo(x, y, x, y + rr, rr); ctx.lineTo(x, y + h - rr); ctx.arcTo(x, y + h, x + rr, y + h, rr); ctx.lineTo(x + w, y + h);
  }
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Text cut to fit a width, with an ellipsis. */
function fitText(ctx: CanvasRenderingContext2D, text: string, most: number): string {
  if (ctx.measureText(text).width <= most) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > most) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/**
 * The chart, drawn into the box `x, y, w, h` of `ctx`. Everything is sized
 * from the box, so the same chart is crisp as a small tile and on a 4K export.
 */
export function drawChart(ctx: CanvasRenderingContext2D, spec: ChartSpec, x: number, y: number, w: number, h: number, lang = 'en'): void {
  const look = lookOf(spec.look);
  const s = Math.min(w, h) / 400;
  const pad = 22 * s;
  const fmt = (v: number): string => formatValue(v, spec, lang);
  const colour = (k: number): string => seriesColour(look, k);
  const series = spec.series.slice(0, MOST_SERIES);
  const labels = spec.labels;

  ctx.save();
  /* The surface. */
  ctx.globalAlpha *= look.surfaceAlpha;
  ctx.fillStyle = look.surface;
  roundRect(ctx, x, y, w, h, 18 * s);
  ctx.fill();
  ctx.globalAlpha /= look.surfaceAlpha;
  if (look.glow) {
    ctx.strokeStyle = 'rgba(57, 255, 20, 0.35)';
    ctx.lineWidth = 1.5 * s;
    roundRect(ctx, x + 0.75 * s, y + 0.75 * s, w - 1.5 * s, h - 1.5 * s, 18 * s);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  let top = y + pad;
  /* Title and note, in ink — never in a series colour. */
  if (spec.title) {
    ctx.fillStyle = look.ink;
    ctx.font = `700 ${22 * s}px ${FONT}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(fitText(ctx, spec.title, w - pad * 2), x + pad, top);
    top += 28 * s;
  }
  if (spec.note) {
    ctx.fillStyle = look.inkSoft;
    ctx.font = `400 ${13 * s}px ${FONT}`;
    ctx.fillText(fitText(ctx, spec.note, w - pad * 2), x + pad, top);
    top += 19 * s;
  }

  /* A legend for two series and more, and for every pie: a swatch and a name, so colour is never the only way to tell. */
  const legendNames = spec.kind === 'pie' || spec.kind === 'donut'
    ? slicesOf(labels, series[0]?.values ?? [], lang === 'af' ? 'Ander' : 'Other').map((one) => one.label)
    : series.length > 1 && spec.kind !== 'ring' && spec.kind !== 'stat' ? series.map((one) => one.name) : [];
  if (legendNames.length) {
    top += 6 * s;
    ctx.font = `500 ${12 * s}px ${FONT}`;
    ctx.textBaseline = 'middle';
    let lx = x + pad;
    let ly = top + 7 * s;
    legendNames.forEach((name, k) => {
      const text = fitText(ctx, name, w * 0.4);
      const width = 14 * s + ctx.measureText(text).width + 14 * s;
      if (lx + width > x + w - pad && lx > x + pad) { lx = x + pad; ly += 18 * s; }
      ctx.fillStyle = colour(k);
      roundRect(ctx, lx, ly - 5 * s, 10 * s, 10 * s, 2.5 * s);
      ctx.fill();
      ctx.fillStyle = look.inkSoft;
      ctx.fillText(text, lx + 14 * s, ly);
      lx += width;
    });
    top = ly + 14 * s;
  }

  const plot = { x: x + pad, y: top + 10 * s, w: w - pad * 2, h: y + h - pad - (top + 10 * s) };
  const lineW = Math.max(2, 2.4 * s);

  if (spec.kind === 'pie' || spec.kind === 'donut') {
    drawPie(ctx, spec, look, plot, s, lang);
  } else if (spec.kind === 'ring') {
    drawRing(ctx, spec, look, plot, s, fmt);
  } else if (spec.kind === 'stat') {
    drawStat(ctx, spec, look, plot, s, fmt, lineW, lang);
  } else if (spec.kind === 'bar') {
    drawBars(ctx, spec, look, plot, s, fmt);
  } else {
    drawColumnsOrLines(ctx, spec, look, plot, s, fmt, lineW);
  }
  ctx.restore();
}

type Box = { x: number; y: number; w: number; h: number };

function axisLabel(ctx: CanvasRenderingContext2D, look: Look, s: number): void {
  ctx.fillStyle = look.inkSoft;
  ctx.font = `400 ${11 * s}px ${FONT}`;
}

function drawColumnsOrLines(ctx: CanvasRenderingContext2D, spec: ChartSpec, look: Look, plot: Box, s: number, fmt: (v: number) => string, lineW: number): void {
  const series = spec.series.slice(0, MOST_SERIES);
  const n = spec.labels.length;
  const stacked = spec.kind === 'stacked';
  const totals = spec.labels.map((_, k) => series.reduce((sum, one) => sum + Math.max(0, one.values[k] ?? 0), 0));
  const every = series.flatMap((one) => one.values);
  const hi = stacked ? Math.max(...totals, 0) : Math.max(...every, 0);
  const lo = stacked ? 0 : Math.min(...every, 0);
  const ticks = niceTicks(lo, hi, 4);
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];

  /* Room for the tick numbers on the left and the labels underneath. */
  axisLabel(ctx, look, s);
  const tickW = Math.max(...ticks.map((t) => ctx.measureText(fmt(t)).width)) + 8 * s;
  const area = { x: plot.x + tickW, y: plot.y + 14 * s, w: plot.w - tickW, h: plot.h - 14 * s - 20 * s };
  const yOf = (v: number): number => area.y + area.h - ((v - yMin) / (yMax - yMin || 1)) * area.h;

  /* Recessive grid and tick numbers. */
  ctx.lineWidth = Math.max(1, s);
  ticks.forEach((t) => {
    const ty = yOf(t);
    ctx.strokeStyle = t === 0 ? look.inkSoft : look.grid;
    ctx.globalAlpha = t === 0 ? 0.5 : 1;
    ctx.beginPath(); ctx.moveTo(area.x, ty); ctx.lineTo(area.x + area.w, ty); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(fmt(t), area.x - 6 * s, ty);
  });

  /* Category labels, thinned out if they would collide. */
  const band = area.w / Math.max(1, n);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const widest = Math.max(...spec.labels.map((one) => ctx.measureText(one).width), 1);
  const every1 = Math.max(1, Math.ceil((widest + 6 * s) / band));
  spec.labels.forEach((label, k) => {
    if (k % every1 !== 0 && k !== n - 1) return;
    ctx.fillText(fitText(ctx, label, band * every1 - 4 * s), area.x + band * (k + 0.5), area.y + area.h + 6 * s);
  });

  const valueText = (): void => { ctx.fillStyle = look.ink; ctx.font = `600 ${11 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; };

  if (spec.kind === 'column' || stacked) {
    const groupW = band * 0.74;
    const gap = 2 * s;
    const m = stacked ? 1 : series.length;
    const barW = Math.max(1, (groupW - gap * (m - 1)) / m);
    const labelAll = n * m <= 12;
    let biggest = { v: -Infinity, x: 0, y: 0 };
    spec.labels.forEach((_, k) => {
      const gx = area.x + band * k + (band - groupW) / 2;
      let base = 0;
      series.forEach((one, j) => {
        const v = one.values[k] ?? 0;
        ctx.fillStyle = seriesColour(look, j);
        if (look.glow) { ctx.shadowColor = seriesColour(look, j); ctx.shadowBlur = 10 * s; }
        if (stacked) {
          const from = yOf(base);
          const to = yOf(base + Math.max(0, v));
          /* A 2px gap of surface between stacked segments. */
          const isTop = j === series.length - 1 || series.slice(j + 1).every((rest) => (rest.values[k] ?? 0) <= 0);
          bar(ctx, gx, to + (base > 0 ? 0 : 0), barW, Math.max(0, from - to - (base > 0 ? gap : 0)), isTop ? 4 * s : 0, 'top');
          base += Math.max(0, v);
        } else {
          const bx = gx + j * (barW + gap);
          const y0 = yOf(0);
          const yv = yOf(v);
          if (v >= 0) bar(ctx, bx, yv, barW, y0 - yv, 4 * s, 'top');
          else bar(ctx, bx, y0, barW, yv - y0, 4 * s, 'bottom');
          if (v > biggest.v) biggest = { v, x: bx + barW / 2, y: yv };
          if (labelAll) { ctx.shadowBlur = 0; valueText(); ctx.fillText(fmt(v), bx + barW / 2, v >= 0 ? yv - 3 * s : yv + 14 * s); }
        }
        ctx.shadowBlur = 0;
      });
      if (stacked && totals[k] > 0) { valueText(); ctx.fillText(fmt(totals[k]), gx + barW / 2, yOf(totals[k]) - 3 * s); }
    });
    if (!stacked && !labelAll && biggest.v > -Infinity) { valueText(); ctx.fillText(fmt(biggest.v), biggest.x, biggest.y - 3 * s); }
    return;
  }

  /* Lines and areas. */
  const xOf = (k: number): number => area.x + band * (k + 0.5);
  series.forEach((one, j) => {
    const c = seriesColour(look, j);
    const pts = one.values.slice(0, n).map((v, k) => ({ x: xOf(k), y: yOf(v), v }));
    if (!pts.length) return;
    if (spec.kind === 'area') {
      const grad = ctx.createLinearGradient(0, area.y, 0, area.y + area.h);
      grad.addColorStop(0, `${c}${series.length > 1 ? '40' : '66'}`);
      grad.addColorStop(1, `${c}05`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, yOf(Math.max(0, yMin)));
      pts.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, yOf(Math.max(0, yMin)));
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = c;
    ctx.lineWidth = lineW;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (look.glow) { ctx.shadowColor = c; ctx.shadowBlur = 12 * s; }
    ctx.beginPath();
    pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.shadowBlur = 0;
    /* A marker and its value at the last point, and at the highest when that is somewhere else: selective, never every point. */
    const last = pts[pts.length - 1];
    const peak = pts.reduce((a, b) => (b.v > a.v ? b : a));
    for (const p of peak === last ? [last] : [peak, last]) {
      ctx.fillStyle = look.surface;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(4, 5 * s), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(3, 3.6 * s), 0, Math.PI * 2); ctx.fill();
      valueText();
      ctx.fillText(fmt(p.v), Math.min(p.x, area.x + area.w - 16 * s), p.y - 8 * s);
    }
  });
}

function drawBars(ctx: CanvasRenderingContext2D, spec: ChartSpec, look: Look, plot: Box, s: number, fmt: (v: number) => string): void {
  const series = spec.series.slice(0, MOST_SERIES);
  const n = spec.labels.length;
  const hi = Math.max(...series.flatMap((one) => one.values), 0);
  const ticks = niceTicks(0, hi, 4);
  const xMax = ticks[ticks.length - 1] || 1;
  axisLabel(ctx, look, s);
  ctx.font = `500 ${12 * s}px ${FONT}`;
  const labelW = Math.min(plot.w * 0.36, Math.max(...spec.labels.map((one) => ctx.measureText(one).width), 0) + 10 * s);
  ctx.font = `600 ${11 * s}px ${FONT}`;
  const valueW = Math.max(...series.flatMap((one) => one.values.map((v) => ctx.measureText(fmt(v)).width)), 0) + 8 * s;
  const area = { x: plot.x + labelW, y: plot.y, w: plot.w - labelW - valueW, h: plot.h };
  const band = area.h / Math.max(1, n);
  const groupH = band * 0.7;
  const gap = 2 * s;
  const m = series.length;
  const barH = Math.max(1, (groupH - gap * (m - 1)) / m);
  spec.labels.forEach((label, k) => {
    const gy = area.y + band * k + (band - groupH) / 2;
    ctx.fillStyle = look.ink;
    ctx.font = `500 ${12 * s}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(fitText(ctx, label, labelW - 10 * s), area.x - 8 * s, gy + groupH / 2);
    series.forEach((one, j) => {
      const v = Math.max(0, one.values[k] ?? 0);
      const by = gy + j * (barH + gap);
      const bw = (v / xMax) * area.w;
      ctx.fillStyle = seriesColour(look, j);
      if (look.glow) { ctx.shadowColor = seriesColour(look, j); ctx.shadowBlur = 10 * s; }
      bar(ctx, area.x, by, bw, barH, 4 * s, 'right');
      ctx.shadowBlur = 0;
      ctx.fillStyle = look.ink;
      ctx.font = `600 ${11 * s}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText(fmt(one.values[k] ?? 0), area.x + bw + 5 * s, by + barH / 2);
    });
  });
}

function drawPie(ctx: CanvasRenderingContext2D, spec: ChartSpec, look: Look, plot: Box, s: number, lang: string): void {
  const slices = slicesOf(spec.labels, spec.series[0]?.values ?? [], lang === 'af' ? 'Ander' : 'Other');
  const total = slices.reduce((sum, one) => sum + one.value, 0) || 1;
  const r = Math.min(plot.w, plot.h) / 2 - 4 * s;
  const cx = plot.x + plot.w / 2;
  const cy = plot.y + plot.h / 2;
  const hole = spec.kind === 'donut' ? r * 0.58 : 0;
  let a = -Math.PI / 2;
  slices.forEach((one, k) => {
    const sweep = (one.value / total) * Math.PI * 2;
    ctx.fillStyle = seriesColour(look, k);
    if (look.glow) { ctx.shadowColor = seriesColour(look, k); ctx.shadowBlur = 12 * s; }
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a, a + sweep);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    /* A 2px seam of surface between slices. */
    ctx.strokeStyle = look.surface;
    ctx.lineWidth = 2 * s;
    ctx.stroke();
    /* The share on the slice, when the slice is big enough to hold it. */
    if (one.value / total >= 0.06) {
      const mid = a + sweep / 2;
      const at = hole ? (r + hole) / 2 : r * 0.64;
      const pct = `${Math.round((one.value / total) * 100)}%`;
      ctx.font = `700 ${13 * s}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      /* Text on a slice: dark or light, whichever reads on that hue. */
      ctx.fillStyle = readableOn(seriesColour(look, k));
      ctx.fillText(pct, cx + Math.cos(mid) * at, cy + Math.sin(mid) * at);
    }
    a += sweep;
  });
  if (hole) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(cx, cy, hole, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    if (look.surfaceAlpha >= 1) {
      ctx.fillStyle = look.surface;
      ctx.beginPath(); ctx.arc(cx, cy, hole, 0, Math.PI * 2); ctx.fill();
    }
    const sum = slices.reduce((t, one) => t + one.value, 0);
    ctx.fillStyle = look.ink;
    ctx.font = `800 ${22 * s}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(spec.unit === '%' ? `${Math.round(slices[0] ? (slices[0].value / total) * 100 : 0)}%` : formatValue(sum, spec, lang), cx, cy - 6 * s);
    ctx.fillStyle = look.inkSoft;
    ctx.font = `500 ${11 * s}px ${FONT}`;
    ctx.fillText(fitText(ctx, spec.unit === '%' ? slices[0]?.label ?? '' : spec.series[0]?.name ?? '', hole * 1.6), cx, cy + 14 * s);
  }
}

function drawRing(ctx: CanvasRenderingContext2D, spec: ChartSpec, look: Look, plot: Box, s: number, fmt: (v: number) => string): void {
  const values = spec.series[0]?.values ?? [];
  const have = values[0] ?? 0;
  const goal = values[1] && values[1] > 0 ? values[1] : 100;
  const share = Math.max(0, Math.min(1, have / goal));
  const r = Math.min(plot.w, plot.h * 0.86) / 2 - 10 * s;
  const cx = plot.x + plot.w / 2;
  const cy = plot.y + r + 8 * s;
  const thick = r * 0.2;
  ctx.lineCap = 'round';
  ctx.lineWidth = thick;
  ctx.strokeStyle = look.grid;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = seriesColour(look, 0);
  if (look.glow) { ctx.shadowColor = seriesColour(look, 0); ctx.shadowBlur = 16 * s; }
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + share * Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = look.ink;
  ctx.font = `800 ${r * 0.42}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(share * 100)}%`, cx, cy - r * 0.06);
  ctx.fillStyle = look.inkSoft;
  ctx.font = `500 ${Math.max(10 * s, r * 0.12)}px ${FONT}`;
  ctx.fillText(fitText(ctx, `${fmt(have)} / ${fmt(goal)}`, r * 1.5), cx, cy + r * 0.3);
}

function drawStat(ctx: CanvasRenderingContext2D, spec: ChartSpec, look: Look, plot: Box, s: number, fmt: (v: number) => string, lineW: number, lang: string): void {
  const values = spec.series[0]?.values ?? [];
  const last = values[values.length - 1] ?? 0;
  const before = values.length > 1 ? values[values.length - 2] : null;
  ctx.fillStyle = look.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const big = Math.min(plot.h * 0.34, plot.w * 0.2);
  ctx.font = `800 ${big}px ${FONT}`;
  ctx.fillText(fitText(ctx, fmt(last), plot.w), plot.x, plot.y);
  if (before !== null && before !== 0) {
    const change = (last - before) / Math.abs(before);
    /* The change in ink with an arrow — a status colour alone would be a sign nobody can read in grey. */
    ctx.font = `600 ${big * 0.3}px ${FONT}`;
    ctx.fillStyle = look.inkSoft;
    const sign = change >= 0 ? '▲' : '▼';
    const since = lang === 'af' ? 'teen' : 'vs';
    ctx.fillText(`${sign} ${Math.abs(change * 100).toFixed(Math.abs(change) < 0.1 ? 1 : 0).replace('.', lang === 'af' ? ',' : '.')}% ${since} ${spec.labels[values.length - 2] ?? ''}`, plot.x, plot.y + big * 1.08);
  }
  /* A sparkline of the series underneath. */
  if (values.length > 1) {
    const top = plot.y + big * 1.6;
    const area = { x: plot.x, y: top, w: plot.w, h: plot.y + plot.h - top };
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const xOf = (k: number): number => area.x + (k / (values.length - 1)) * area.w;
    const yOf = (v: number): number => area.y + area.h - ((v - lo) / (hi - lo || 1)) * area.h * 0.9;
    const c = seriesColour(look, 0);
    const grad = ctx.createLinearGradient(0, area.y, 0, area.y + area.h);
    grad.addColorStop(0, `${c}55`);
    grad.addColorStop(1, `${c}00`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(xOf(0), area.y + area.h);
    values.forEach((v, k) => ctx.lineTo(xOf(k), yOf(v)));
    ctx.lineTo(xOf(values.length - 1), area.y + area.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = lineW;
    ctx.lineJoin = 'round';
    if (look.glow) { ctx.shadowColor = c; ctx.shadowBlur = 12 * s; }
    ctx.beginPath();
    values.forEach((v, k) => (k ? ctx.lineTo(xOf(k), yOf(v)) : ctx.moveTo(xOf(k), yOf(v))));
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

/** Near-black or white, whichever reads better on a colour. */
export function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const lin = (c: number): number => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return (lum + 0.05) / 0.05 > 1.05 / (lum + 0.05) ? '#0b0b0b' : '#ffffff';
}

/* ── The AI's question ──────────────────────────────────────────────────── */

/**
 * What the AI is asked. It is given the chart as it stands and what the
 * person typed — numbers, a sentence, a pasted report, or a change ("add
 * July at 90", "make it percentages") — and answers the whole chart again
 * as JSON, nothing else. It is told never to invent numbers that were not
 * given, because a chart is a claim and a made-up figure on one is a lie
 * with a picture.
 */
export function chartAsk(current: ChartSpec, words: string, lang: string): string {
  return [
    'You turn data and instructions into chart data for a social-media graphic.',
    'Answer with JSON only, no prose, in exactly this shape:',
    '{"title": string, "note": string, "kind": one of "column","bar","stacked","line","area","pie","donut","ring","stat", "labels": string[], "series": [{"name": string, "values": number[]}], "unit": string, "unitAfter": boolean}',
    `Rules: at most ${MOST_SERIES} series and ${MOST_POINTS} labels; every series has exactly one number per label; numbers are plain numbers (no units, no thousands separators); use only numbers the person gave or that follow arithmetically from them (sums, percentages of a total) — never invent data; keep the current kind unless the person asks for another or the data clearly needs one (shares of a whole: pie or donut; change over time: line or area; a value against a goal: ring with values [value, goal]; one headline number: stat); short labels; title and labels in ${lang === 'af' ? 'Afrikaans' : 'English'} unless the person wrote them in another language.`,
    'The chart as it is now:',
    JSON.stringify({ title: current.title, note: current.note ?? '', kind: current.kind, labels: current.labels, series: current.series, unit: current.unit ?? '', unitAfter: Boolean(current.unitAfter) }),
    'What the person wants:',
    words.slice(0, 6000),
  ].join('\n');
}
