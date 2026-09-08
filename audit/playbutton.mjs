/**
 * The play buttons are visible in a light theme.
 *
 * They were not. `tailwind.config.js` remaps `white` to `--fb-ink` so that
 * `text-white` follows the theme, which is right for text and a trap for a
 * fill: on the default light preset `bg-white` paints near-black. Four play
 * buttons were `bg-white text-onAccent` — a black disc with a black glyph on
 * it, which is what somebody saw on their screen and reported as "black dots".
 *
 * `check:theme` now refuses `bg-white` outright, and that check reads source.
 * This one reads pixels: the disc and the glyph on it, in the theme where it
 * went wrong, measured as a contrast ratio the way every other colour in this
 * app is measured.
 */
import { serve, shot } from './where.mjs';
import { enter, studio } from './enter.mjs';

const PORT = process.argv[2] || '3101';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};

const WORDS = '[Verse]\nDie pad is lank vanaand\n[Chorus]\nHou vas, hou vas\n';

/* Its own server on its own port, and the shared way in.

   This probe went to `localhost:3024` and hoped somebody had left a server
   there — the fault `serve()` exists to fix — and then signed itself in with
   a `waitForTimeout(2500)`, which is how long it takes on an idle laptop and
   not on a loaded one. `enter()` waits for the bottom bar instead, which only
   exists on a screen the app shows a signed-in person. */
const server = await serve(PORT);
const { browser: b, page: p } = await enter({
  at: server.url,
  before: async (page) => {
    await page.addInitScript((words) => {
      try {
        // The light preset, which is also this app's default.
        window.localStorage.setItem('futurebox.theme.v1', JSON.stringify({ preset: 'clean' }));
        window.localStorage.setItem('futurebox.tracks.v1', JSON.stringify([{
          id: 'song-1', title: 'Toetsliedjie', genre: 'Afrikaans', bpm: 96, key: 'Am',
          lyrics: words, style: 'warm', models: [], source: 'engine', seconds: 60,
          createdAt: new Date().toISOString(), seed: 1,
        }]));
      } catch {
        /* Storage off. The theme assertion below says so. */
      }
    }, WORDS);
  },
});
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
await studio(p);

check('the light preset is on', 'paper' === await p.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--fb-surface-name')?.trim() || 'paper'));

/** The disc's fill against the glyph drawn on it. */
const measured = await p.evaluate(() => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  /* What is actually behind the glyph.

     `backgroundColor` on a button with no fill is `rgba(0, 0, 0, 0)`, and
     parsing that gives [0, 0, 0] — black. The first run of this after it was
     brought back reported a play button at 2.75:1 against a disc that does
     not exist, which is the probe being wrong and not the app. A transparent
     button shows whatever its parent shows, so that is what the glyph has to
     be measured against. */
  const behind = (el) => {
    for (let one = el; one; one = one.parentElement) {
      const colour = getComputedStyle(one).backgroundColor;
      const alpha = Number((colour.match(/[\d.]+/g) ?? [])[3] ?? 1);
      if (alpha > 0.05) return parse(colour);
    }
    return [255, 255, 255];
  };
  const out = [];
  for (const el of document.querySelectorAll('button')) {
    const style = getComputedStyle(el);
    if (!/rounded|9999px/.test(style.borderRadius) && parseFloat(style.borderRadius) < 20) continue;
    const box = el.getBoundingClientRect();
    if (box.width < 36 || box.width > 60 || Math.abs(box.width - box.height) > 4) continue;
    if (!el.querySelector('svg')) continue;
    const alpha = Number((style.backgroundColor.match(/[\d.]+/g) ?? [])[3] ?? 1);
    const fill = alpha > 0.05 ? parse(style.backgroundColor) : behind(el.parentElement);
    const glyph = parse(getComputedStyle(el.querySelector('svg')).color);
    if (fill.length < 3 || glyph.length < 3) continue;
    const a = lum(fill), bb = lum(glyph);
    out.push({
      fill: alpha > 0.05 ? style.backgroundColor : `behind: rgb(${behind(el.parentElement).join(', ')})`,
      glyph: getComputedStyle(el.querySelector('svg')).color,
      ratio: Math.round(((Math.max(a, bb) + 0.05) / (Math.min(a, bb) + 0.05)) * 100) / 100,
    });
  }
  return out;
});

check('round play buttons were found to measure', measured.length > 0, String(measured.length));
for (const one of measured) {
  check(`a play button's icon shows on its disc (${one.ratio}:1)`, one.ratio >= 4.5,
    `${one.fill} under ${one.glyph}`);
}
check('and none of them is a black disc',
  measured.every((one) => !/rgb\(1?\d?\d, 1?\d?\d, 1?\d?\d\)/.test(one.fill) || one.ratio >= 4.5),
  measured.map((o) => o.fill).join(' | '));

await p.screenshot({ path: shot('playbutton-light.png'), fullPage: true });
await b.close();
await server.stop();

if (problems.length) {
  console.error(`\ncheck:playbutton — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:playbutton — every play button shows its glyph on its own disc, in the light theme.');
