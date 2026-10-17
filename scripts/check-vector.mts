/**
 * The vector studio's drawing, without a browser.
 *
 *   npm run check:vector
 *
 * Carli, 17 October 2026: *"Ek hou van daai vector illustration."* What has
 * to hold is that a shape is where it is drawn, that a finger's line is
 * smoothed without wandering off, that an SVG from outside — the AI's, or one
 * somebody pasted — is let in with nothing that runs or fetches, and that a
 * photograph traced into shapes keeps its colours and its holes.
 */
import {
  artFrom, breakApart, cleanTree, hits, itemNode, newDoc, outline, parseSvg, pathFromPoints, prefixIds, recolour,
  simplify, smoothPath, toSvg, vectorAsk, type Item, type Pt,
} from '../app/lib/vectordoc.ts';
import { outlines, palette, trace } from '../app/lib/vectortrace.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const base = { x: 100, y: 100, rotate: 0, sx: 1, sy: 1, fill: '#ff0000', stroke: null, width: 0, opacity: 1 };

/* ── Shapes ── */
const rect: Item = { ...base, id: 'r', kind: 'rect', w: 80, h: 40, r: 0 };
ok('a rectangle is drawn centred on its place', outline(rect) === 'M-40 -20H40V20H-40Z', outline(rect));
ok('  a tap inside it lands on it and one well outside does not', hits(rect, 130, 110) && !hits(rect, 200, 100));
const turned: Item = { ...rect, rotate: 90 };
ok('  turned a quarter, a tap above it lands where its long side now is', hits(turned, 100, 135) && !hits(turned, 135, 100, 2));
const star: Item = { ...base, id: 's', kind: 'star', points: 5, radius: 50, inner: 0.5 };
ok('a five-pointed star has ten corners', (outline(star).match(/L/g) ?? []).length === 9);

/* ── A finger's line ── */
const wobbly: Pt[] = Array.from({ length: 60 }, (_, k) => [k * 5, Math.sin(k / 6) * 30 + (k % 2 ? 0.4 : -0.4)]);
const kept = simplify(wobbly, 1.5);
ok('a hand-drawn line keeps far fewer points', kept.length < wobbly.length / 3 && kept.length > 4, String(kept.length));
const path = pathFromPoints('p', wobbly, false, { fill: null, stroke: '#000000', width: 4, opacity: 1 });
ok('  and becomes a curve centred on its own middle', path !== null && Math.abs(path.x - 147.5) < 1 && path.d.startsWith('M') && path.d.includes('C'), JSON.stringify(path && { x: path.x, y: path.y }));
ok('a closed curve ends where it began', smoothPath([[0, 0], [10, 0], [10, 10], [0, 10]], true).endsWith('Z'));

/* ── SVG from outside ── */
const nasty = `<?xml version="1.0"?><!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" onload="alert(1)">
  <script>alert(1)</script>
  <defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs>
  <a href="https://evil.example"><rect width="10" height="10"/></a>
  <image href="https://evil.example/x.png" width="10" height="10"/>
  <foreignObject><div>hi</div></foreignObject>
  <circle cx="50" cy="50" r="40" style="fill:url(#g);stroke:#000;cursor:url(https://evil.example/c)" onclick="steal()"/>
  <path d="M0 0L10 10" fill="url(https://evil.example/#x)"/>
  <rect x="1" y="1" width="5" height="5" fill="#00ff00"><animate attributeName="x" to="100"/></rect>
</svg>`;
const parsed = parseSvg(nasty);
ok('an SVG\'s text is read into a tree', parsed !== null && parsed.tag === 'svg' && parsed.attrs.viewBox === '0 0 200 100');
const clean = parsed ? cleanTree(parsed) : null;
const flat = clean ? JSON.stringify(clean) : '';
ok('  scripts, links, pictures, foreign objects and animations are taken out', clean !== null && !/script|"a"|image|foreignObject|animate|evil|onload|onclick|alert/.test(flat), flat.slice(0, 300));
ok('  an inline style becomes attributes, and a gradient inside it is kept', flat.includes('"fill":"url(#g)"') && flat.includes('"stroke":"#000"') && flat.includes('linearGradient'));
ok('  a fill pointing outside the drawing is dropped', clean !== null && clean.children.some((c) => c.tag === 'path' && !('fill' in c.attrs)));
const prefixed = clean ? JSON.stringify(prefixIds(clean, 'a1')) : '';
ok('  ids are made its own, and what points at them follows', prefixed.includes('"id":"a1-g"') && prefixed.includes('url(#a1-g)'));
const art = artFrom(nasty, 'a1', newDoc(1080, 1080));
ok('it lands on the artboard centred, sized to fit', art !== null && art.x === 540 && Math.abs(art.sx * 200 - 864) < 0.01, JSON.stringify(art && { x: art.x, sx: art.sx }));
ok('  "Break it apart" makes each part its own, keeping the gradients they need', art !== null && breakApart(art, (() => { let k = 0; return () => `b${k++}`; })()).length >= 3);
ok('  "Recolour" changes the fills and leaves gradients alone', art !== null && JSON.stringify(recolour(art.tree, '#123456')).includes('#123456') && JSON.stringify(recolour(art.tree, '#123456')).includes('url(#a1-g)'));
ok('text that is not an SVG is no drawing', parseSvg('Sorry, I cannot draw that.') === null && artFrom('<html><script>x</script></html>', 'x', newDoc()) === null);

/* ── Out ── */
const doc = { ...newDoc(400, 300), items: [rect, { ...base, id: 't', kind: 'text', text: 'Hallo & <welkom>', size: 40, font: 'sans', bold: true } as Item, ...(art ? [art] : [])] };
const svg = toSvg(doc);
ok('the drawing is written as an SVG file of its own size', svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"'));
ok('  words in it are escaped, never markup', svg.includes('Hallo &amp; &lt;welkom&gt;') && !svg.includes('<welkom>'));
ok('  and what was written reads back clean, with nothing taken out', (() => { const again = parseSvg(svg); return again !== null && JSON.stringify(cleanTree(again)).length > 200; })());
ok('a hidden item is not in the file', !toSvg({ ...doc, items: [{ ...rect, hidden: true }] }).includes('<path'));
ok('every item is drawn inside its own place and turn', itemNode(rect).attrs.transform === 'translate(100 100) rotate(0) scale(1 1)');

/* ── A photograph traced ── */
const W = 40;
const H = 30;
const data = new Uint8ClampedArray(W * H * 4);
for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    const i = (y * W + x) * 4;
    const inSquare = x >= 8 && x < 24 && y >= 6 && y < 22;
    const inHole = x >= 13 && x < 19 && y >= 11 && y < 17;
    const [r, g, b] = inSquare && !inHole ? [220, 30, 40] : [250, 250, 250];
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  }
}
const colours = palette({ data, width: W, height: H }, 2);
ok('the picture\'s two colours are found', colours.length === 2 && colours.some((c) => c[0] > 200 && c[1] < 60) && colours.some((c) => c[1] > 240), JSON.stringify(colours));
const mask = new Uint8Array(W * H);
for (let y = 6; y < 22; y += 1) for (let x = 8; x < 24; x += 1) mask[y * W + x] = (x >= 13 && x < 19 && y >= 11 && y < 17) ? 0 : 1;
const loops = outlines(mask, W, H);
ok('a square with a hole is two outlines, the outside and the hole', loops.length === 2, String(loops.length));
const traced = trace({ data, width: W, height: H }, { colours: 2, tolerance: 0.8, minArea: 4 });
ok('traced: one path per colour, biggest first, holes cut', traced.children.length === 2 && traced.children[0].attrs.fill === '#fafafa' && traced.children[1].attrs['fill-rule'] === 'evenodd', JSON.stringify(traced.children.map((c) => c.attrs.fill)));
ok('  and the red shape keeps its hole (two loops in one path)', (traced.children[1].attrs.d.match(/M/g) ?? []).length === 2);
/* 17 October 2026: simplified whole, a closed outline's two ends are the
   same point and the outline collapsed to one — traced shapes drew nothing. */
ok('  and every outline keeps its corners, never collapsing to a point', traced.children.every((c) => (c.attrs.d.match(/C/g) ?? []).length >= 4 * (c.attrs.d.match(/M/g) ?? []).length), traced.children.map((c) => c.attrs.d.slice(0, 80)).join(' | '));
ok('  in the picture\'s own size', traced.attrs.viewBox === `0 0 ${W} ${H}`);

/* ── The question ── */
const ask = vectorAsk('a meerkat waving');
ok('the AI is asked for one SVG only, nothing that runs or fetches', /ONE complete SVG/.test(ask) && /no <script>/.test(ask) && /no external references/.test(ask) && ask.includes('a meerkat waving'));

if (bad) {
  console.error(`\ncheck:vector — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:vector — shapes where they are drawn, a finger\'s line smoothed, outside SVG let in clean, and a photograph traced with its colours and holes.');
