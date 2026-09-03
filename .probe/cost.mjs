// Every button that spends says what it costs, before it is pressed.
//
//   node .probe/cost.mjs
//
// The complaint this comes from: "So lank ons met elke generation eerlik kan
// sê hoeveel krediete iets hulle gaan kos. Asook 'n waarskuwing dat iets soos
// videos langer vat om te generate."
//
// Four screens were spending silently. Two more named a figure but hid the
// wait behind the press — the note only appeared once the job was already
// running, which is the one moment it cannot help anybody, because by then the
// credits are gone. Somebody who is not told a video takes minutes presses
// again, and the second press is charged like the first.
//
// So this checks three things a reader cannot check by eye:
//
//   · every component that calls a charging route names a figure;
//   · the four per-minute jobs are given a measured length, not a constant,
//     so the total moves with the file instead of lying about a short one;
//   · the wait warnings sit outside the busy gate.
//
// The last one is the whole point. A `<Cost waitMinutes>` inside `{running &&
// (…)}` type-checks, renders, and looks right in a screenshot taken while the
// job runs. It is still useless.

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };
const read = async (path) =>
  (await import('node:fs/promises')).readFile(new URL(path, import.meta.url), 'utf8');
/** Comments do not count as saying anything to a user. */
const bare = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const src = {};
for (const name of [
  'Cost', 'VocalBooth', 'PodcastStudio', 'VoiceLab', 'TwoHosts',
  'VideoCanvas', 'VideoPanel', 'SoundTrainer', 'DubEpisode', 'Sleeve', 'MakeMusic',
]) src[name] = bare(await read(`../app/components/${name}.tsx`));

// ── One component, so a price reads the same everywhere ────────────────
const cost = src.Cost;
say(/export default function Cost/.test(cost), 'there is no Cost component');
say(/perMinute\(seconds, rate\)/.test(cost), 'Cost does not use perMinute for the per-minute total');
say(/waitMinutes/.test(cost), 'Cost cannot say anything about the wait');

// It must not invent a total it has no way to know. With no measured length a
// per-minute job can honestly say the rate and nothing more; printing "about
// 4" for a file of unknown length would be a guess dressed as a figure.
say(
  /seconds === 'number' && seconds > 0/.test(cost),
  'Cost prints a total even when the length is unknown, which is a guess, not a price',
);

// ── Nothing spends silently ────────────────────────────────────────────
//
// Read from the routes rather than from a list somebody keeps up to date: a
// new charging route with a new button gets checked without anyone
// remembering to add it here.
const fs = await import('node:fs/promises');
const url = (p) => new URL(p, import.meta.url);
const routes = [];
const walk = async (dir) => {
  for (const entry of await fs.readdir(url(dir), { withFileTypes: true })) {
    if (entry.isDirectory()) await walk(`${dir}/${entry.name}`);
    else if (entry.name === 'route.ts') {
      const body = await read(`${dir}/${entry.name}`);
      if (/\bcharge\(/.test(body)) routes.push(dir.replace('../app', ''));
    }
  }
};
await walk('../app/api');
say(routes.length >= 12, `only ${routes.length} charging routes found — the walk is not reaching them`);

/**
 * Where each charging route is pressed from, and what the screen has to say
 * before the press. `via` is a lib the component calls through, so the fetch
 * is not in the component's own text.
 */
const DOORS = {
  '/api/cover': { screens: ['Sleeve'] },
  '/api/dialogue': { screens: ['TwoHosts'] },
  '/api/dub': { screens: ['DubEpisode'], wait: true },
  '/api/finetunes': { screens: ['SoundTrainer'], wait: true },
  '/api/music': { screens: ['MakeMusic'] },
  '/api/stems': { screens: ['VocalBooth'], perMinute: true },
  '/api/transcribe': { screens: ['VocalBooth'], perMinute: true },
  '/api/video': { screens: ['VideoPanel', 'VideoCanvas'], wait: true },
  '/api/voice/change': { screens: ['VoiceLab'], perMinute: true },
  '/api/voice/clean': { screens: ['VocalBooth', 'PodcastStudio'], perMinute: true },
  '/api/voice/clone': { screens: ['VoiceLab'] },
  '/api/voice/speak': { screens: ['VoiceLab'] },
};

for (const route of routes) {
  say(DOORS[route] !== undefined, `${route} charges credits and no screen here is named as its door`);
}

/** A figure, however it is phrased: the component, or an inline count. */
const namesAFigure = (text) =>
  /<Cost\b/.test(text) || /CREDITS\.[a-zA-Z]+/.test(text) || /\b(songCost|dubCost|readCost)\(/.test(text);

for (const [route, want] of Object.entries(DOORS)) {
  for (const screen of want.screens) {
    say(namesAFigure(src[screen]), `${screen} presses ${route} without saying what it costs`);
  }
}

// ── The per-minute jobs are given a real length ────────────────────────
//
// `<Cost rate={CREDITS.clean} />` with no seconds is not wrong, but it is only
// half the promise: it says four a minute and never says four times what. Each
// of these has a file in hand by the time the button is live, so each must
// hand its measured length over.
for (const screen of ['VocalBooth', 'PodcastStudio', 'VoiceLab']) {
  const withSeconds = [...src[screen].matchAll(/<Cost\b[^>]*rate=\{[^}]*\}[^>]*>/g)];
  say(withSeconds.length > 0, `${screen} has no per-minute price at all`);
  for (const tag of withSeconds) {
    say(/seconds=\{/.test(tag[0]), `${screen} quotes a rate without the length it applies to: ${tag[0].trim()}`);
    say(
      !/seconds=\{\s*\d+\s*\}/.test(tag[0]),
      `${screen} passes a constant length, so the price is the same for a minute and an hour`,
    );
  }
}

// ── The wait is said before the press, not during it ───────────────────
//
// Find what encloses each warning. If the nearest enclosing JSX guard tests a
// busy flag the right way round, the warning only exists while the job runs.
const RUNNING = /^!?\s*(busy|running|working|loading|pending)\b/;
for (const [name, text] of Object.entries(src)) {
  if (name === 'Cost') continue;
  for (const match of text.matchAll(/<Cost\b[^>]*waitMinutes=\{/g)) {
    const before = text.slice(0, match.index);
    const guards = [...before.matchAll(/\{\s*([^{}]{1,60}?)\s*&&\s*\(/g)];
    const nearest = guards.length ? guards[guards.length - 1][1] : '';
    if (RUNNING.test(nearest)) {
      say(
        nearest.trim().startsWith('!'),
        `${name} only warns about the wait while the job runs — by then the credits are spent (guard: ${nearest})`,
      );
    }
  }
}

// The three slow ones must warn at all.
for (const [route, want] of Object.entries(DOORS)) {
  if (!want.wait) continue;
  const warned = want.screens.some((screen) => /waitMinutes=\{/.test(src[screen]));
  say(warned, `${route} takes minutes and no screen warns about it before the press`);
}

// ── The words exist in both languages ──────────────────────────────────
const strings = await read('../app/lib/i18n.tsx');
for (const key of [...src.Cost.matchAll(/t\('([a-z]+\.[a-zA-Z]+)'/g)].map((m) => m[1])) {
  const entry = new RegExp(`"${key.replace('.', '\\.')}":\\s*\\{\\s*en:.*?af:`, 's');
  say(entry.test(strings), `Cost asks for ${key} and it is not in both languages`);
}
const keys = [...strings.matchAll(/^ {2}"([a-zA-Z0-9._]+)":/gm)].map((m) => m[1]);
const twice = keys.filter((k, i) => keys.indexOf(k) !== i);
say(twice.length === 0, `defined twice, so the second silently wins: ${[...new Set(twice)].join(', ')}`);

if (problems.length) {
  console.error(`cost: ${problems.length} problem(s)`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('cost: every charging route has a door that names its price, the per-minute ones move with the file, and the slow ones warn before the press');
