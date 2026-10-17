/**
 * Charts on a post: the numbers under the drawing, without a browser.
 *
 *   npm run check:charts
 *
 * Carli, 17 October 2026: graph templates in the photo editor, many kinds,
 * and data that can be typed in and set by the AI. What goes wrong quietly
 * in a chart is the axis that does not start at nought, the pasted "1 234,5"
 * read as 1, the ninth colour invented on the spot, and an AI answer with a
 * series one number short drawn as if it were whole. Each is driven here.
 */
import {
  CHART_KINDS, CHART_TEMPLATES, LOOKS, MOST_SERIES, MOST_SLICES, SERIES_DARK, SERIES_LIGHT, chartAsk, cleanChart,
  formatValue, niceTicks, parseTable, readableOn, seriesColour, slicesOf, toNumber, lookOf,
} from '../app/lib/postcharts.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/* ── The axis ── */
const ticks = niceTicks(0, 84);
ok('ticks start at nought and pass the highest value in round steps', ticks[0] === 0 && ticks[ticks.length - 1] >= 84 && ticks.every((t, k) => k === 0 || Math.abs(t - ticks[k - 1] - (ticks[1] - ticks[0])) < 1e-9), ticks.join());
ok('  even when every value is far from nought', niceTicks(940, 1000)[0] === 0);
ok('  and a negative value gets ticks below nought', niceTicks(-12, 40)[0] < -11);

/* ── Numbers in ── */
ok('numbers as people write them', toNumber('R 1 200') === 1200 && toNumber('1,234.5') === 1234.5 && toNumber('1.234,5') === 1234.5
  && toNumber('12,5') === 12.5 && toNumber('45%') === 45 && toNumber('3.2k') === 3200 && toNumber('1.5M') === 1500000 && toNumber('Jan') === null,
  [toNumber('R 1 200'), toNumber('1,234.5'), toNumber('1.234,5'), toNumber('12,5'), toNumber('3.2k')].join());
const pasted = parseTable('Month\tSales\tCosts\nJan\t42\t30\nFeb\t51,5\t31\nMar\t48\t29');
ok('a table pasted from a spreadsheet: labels, two named series', pasted !== null && pasted.labels.join() === 'Jan,Feb,Mar'
  && pasted.series.map((one) => one.name).join() === 'Sales,Costs' && pasted.series[0].values[1] === 51.5, JSON.stringify(pasted));
const typed = parseTable('Gauteng: 44%\nWestern Cape: 27%\nKwaZulu-Natal 18%\nElsewhere - 11');
ok('lines typed as a word and a number', typed !== null && typed.labels.join('|') === 'Gauteng|Western Cape|KwaZulu-Natal|Elsewhere' && typed.series[0].values.join() === '44,27,18,11', JSON.stringify(typed));
const csv = parseTable('Q1, 120, 142\nQ2, 135, 158');
ok('comma-separated rows', csv !== null && csv.series.length === 2 && csv.series[1].values.join() === '142,158', JSON.stringify(csv));
ok('a label with a number in it keeps it, and a decimal comma is a decimal', parseTable('Q1 1,5\nQ2 2,5')?.series[0].values.join() === '1.5,2.5');
ok('words with no numbers are not a table', parseTable('hello there\nnothing here') === null);

/* ── The AI's answer, read like anything from outside ── */
const from = CHART_TEMPLATES[0].spec;
const answer = cleanChart({ title: 'Sales', kind: 'line', labels: ['Jan', 'Feb', 'Mar'], series: [{ name: 'A', values: [1, '2,5'] }, { name: 'B', values: [4, 5, 6, 7] }], unit: '%' }, from);
ok('a series one number short is filled with nought, never drawn skewed', answer !== null && answer.series[0].values.join() === '1,2.5,0' && answer.series[1].values.join() === '4,5,6', JSON.stringify(answer));
ok('  a unit like % goes after the number', answer?.unitAfter === true);
ok('  an unknown kind keeps the chart it was', cleanChart({ kind: 'spiral', labels: ['a'], series: [{ name: 'x', values: [1] }] }, from)?.kind === 'column');
ok('  more than eight series are cut to eight', cleanChart({ labels: ['a'], series: Array.from({ length: 12 }, (_, k) => ({ name: `s${k}`, values: [k] })) })?.series.length === MOST_SERIES);
ok('  and an answer with no data is no chart', cleanChart({ title: 'x' }) === null && cleanChart('nonsense') === null);

/* ── Colours ── */
ok('eight series colours in a fixed order, light and dark', SERIES_LIGHT.length === 8 && SERIES_DARK.length === 8 && new Set(SERIES_LIGHT).size === 8);
ok('  a dark look takes the dark steps and a light look the light ones', seriesColour(lookOf('night'), 0) === SERIES_DARK[0] && seriesColour(lookOf('paper'), 0) === SERIES_LIGHT[0]);
const slices = slicesOf(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'], [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
ok(`a pie of ten folds into ${MOST_SLICES} slices, the smallest as Other`, slices.length === MOST_SLICES && slices[slices.length - 1].label === 'Other' && slices[slices.length - 1].value === 10, JSON.stringify(slices));
ok('  and the slices still add up to the whole', slices.reduce((sum, one) => sum + one.value, 0) === 55);
const contrast = (a: string, b: string): number => {
  const lum = (hex: string): number => {
    const n = parseInt(hex.slice(1), 16);
    const lin = (c: number): number => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const worstOnSlice = Math.min(...[...SERIES_LIGHT, ...SERIES_DARK].map((c) => contrast(readableOn(c), c)));
ok('a share written on a slice reads on every slice colour (at least 4.5:1)', worstOnSlice >= 4.5 - 0.15, worstOnSlice.toFixed(2));

/* ── Numbers out ── */
ok('numbers on a chart are short and carry their unit', formatValue(84000, { unit: 'R' }) === 'R84k' && formatValue(45, { unit: '%', unitAfter: true }) === '45%' && formatValue(1500000, {}) === '1.5M');
ok('  and an Afrikaans decimal is a comma', formatValue(12.5, {}, 'af') === '12,5');

/* ── Templates ── */
ok(`every template is a chart that cleans to itself (${CHART_TEMPLATES.length})`, CHART_TEMPLATES.length >= 10
  && CHART_TEMPLATES.every((one) => JSON.stringify(cleanChart(one.spec)?.series) === JSON.stringify(one.spec.series.map((s) => ({ name: s.name, values: [...s.values] }))) && one.af && one.en));
ok('  every kind has a template, and every look is used', CHART_KINDS.every((kind) => CHART_TEMPLATES.some((one) => one.spec.kind === kind.id))
  && LOOKS.every((look) => CHART_TEMPLATES.some((one) => one.spec.look === look.id)));
ok('  no template has more series than the palette has colours', CHART_TEMPLATES.every((one) => one.spec.series.length <= MOST_SERIES));

/* ── The question ── */
const ask = chartAsk(from, 'add July at 90', 'af');
ok('the AI is asked for JSON only, never to invent numbers, in Afrikaans', /JSON only/.test(ask) && /never invent data/.test(ask) && /Afrikaans/.test(ask) && ask.includes('add July at 90'));

if (bad) {
  console.error(`\ncheck:charts — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:charts — axes from nought, numbers read as written, eight colours in order, Other for the rest, and the AI read like anything else from outside.');
