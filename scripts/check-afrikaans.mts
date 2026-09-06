/**
 * Every key the code asks for has an Afrikaans line.
 *
 * `t('some.key', 'English fallback')` is a good pattern: it means a missing
 * translation shows something readable rather than a raw key. It is also
 * silent, which is why eighty of them accumulated — including every word of
 * the advert desk, the room most likely to be used in Afrikaans.
 *
 * An Afrikaans reader hitting an English fallback has no way to report it and
 * no reason to think it is a bug rather than a choice. So this fails the build
 * instead.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DICT = 'app/lib/i18n.tsx';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(path)) out.push(path);
  }
  return out;
}

const dict = readFileSync(DICT, 'utf8');
const known = new Set([...dict.matchAll(/^\s*"([^"]+)":\s*\{/gm)].map((m) => m[1]));

/**
 * Entries that have an English line and no Afrikaans one.
 *
 * Sliced from one entry's opening to the next rather than matched with
 * `\{([^}]*)\}`. The first version used that, and it stops at the first
 * closing brace — which inside `"Of the {seconds} seconds you sang…"` is the
 * one belonging to a placeholder. It reported a fully translated line as
 * missing, which is the sort of false alarm that gets a check switched off.
 */
const starts = [...dict.matchAll(/^\s*"([^"]+)":\s*\{/gm)];

/* The same key written twice.
   TypeScript catches it in a literal, but only once the file is compiled —
   and a duplicate is a line somebody carefully translated that silently loses
   to another one further down. Named here so the message says which key. */
const seen = new Map<string, number>();
const twice: string[] = [];
for (const match of starts) {
  const key = match[1];
  seen.set(key, (seen.get(key) ?? 0) + 1);
  if (seen.get(key) === 2) twice.push(key);
}
const halfDone = starts
  .filter((match, i) => {
    const from = match.index ?? 0;
    const to = i + 1 < starts.length ? (starts[i + 1].index ?? dict.length) : dict.length;
    const body = dict.slice(from, to);
    return /\ben:/.test(body) && !/\baf:/.test(body);
  })
  .map((match) => match[1]);

/**
 * Lines where the Afrikaans is a copy of the English.
 *
 *   "Kyk net dat al dieselfde funksies by afrikaans ook is."
 *
 * The check above catches a key with *no* Afrikaans. It cannot catch the other
 * way of not translating something, which is to paste the English into the
 * `af:` slot and move on — and that one is worse, because it reports as done.
 * Thirty-nine of these were in the file and all thirty-nine turned out to be
 * legitimate; the point is that the fortieth will not be, and nothing would
 * have said so.
 *
 * A word that is genuinely the same in both languages is real and common here
 * — "Stop", "Studio", "TikTok", "Premium", "Podcast". So they are named below
 * rather than guessed at. Naming them costs one line when a new one appears
 * and is the only way this check stays worth having: a check with a clever
 * rule and no list starts producing false alarms and gets switched off.
 */
const SAME_IN_BOTH = new Set([
  /* Borrowed whole, because that is what people actually say. */
  'Live', 'Stop', 'Studio', 'Podcast', 'Premium', 'Reel', 'Copilot', 'Hooks',
  'Collab Radar', 'Radar', 'Arena', 'Pro', 'S', 'handle', 'Tempo', 'min',
  'Later', 'Warm', 'Afrikaans',
  /* Names of other people's products. Translating one invents a thing that
     does not exist — the same rule as not translating a podcast's title. */
  'TikTok', 'Instagram Reels', 'YouTube Shorts', 'TikTok, Reels, Shorts',
  '9:16 Reels, 15\u201330s',
]);
const copied: string[] = [];
for (const [i, match] of starts.entries()) {
  const from = match.index ?? 0;
  const to = i + 1 < starts.length ? (starts[i + 1].index ?? dict.length) : dict.length;
  const body = dict.slice(from, to);
  const en = /\ben:\s*"((?:[^"\\]|\\.)*)"/.exec(body)?.[1];
  const af = /\baf:\s*"((?:[^"\\]|\\.)*)"/.exec(body)?.[1];
  if (en === undefined || af === undefined || en !== af) continue;
  /* Unescaped once, so the list can be written the way the words look. */
  const plain = JSON.parse(`"${en.replace(/"/g, '\\"')}"`) as string;
  if (SAME_IN_BOTH.has(plain)) continue;
  copied.push(`${match[1]} — both languages say "${plain.slice(0, 60)}"`);
}

/**
 * English words sitting inside an Afrikaans sentence.
 *
 *   "daar is engelse woorde tussen in, sy het gese dat ons loslit afrikaans
 *    gebruik en elke woord en sin moet afrikaans wees, daar kan nie foute
 *    tussen in wees nie."
 *
 * Carli had somebody read the Afrikaans. The two checks above could not have
 * found what she found: a line can have an Afrikaans entry, not be a copy of
 * the English, and still say "Post dit" or "Jou musiek en playlists". Sixty-
 * nine lines did.
 *
 * ── Why this is a list of words and not something cleverer ───────────────
 *
 * Because Afrikaans and English share a great many words — `is`, `in`, `plan`,
 * `sing`, `stop`, `film`, `week`, `minute`, `word`, `was`, `links`, `sent`,
 * `want`, `note`, `mark`, `hand`, `item`, `stories` are all Afrikaans, and
 * every one of them was a false alarm in the first pass of this. A check that
 * cries wolf is a check somebody switches off, so what is listed here is only
 * words that are English and are NOT also Afrikaans.
 *
 * Names are not in it and never should be: YouTube, Spotify, TikTok, Apple
 * Music, FutureBox, Copilot, and the genres — afro house, gospel, indie —
 * stay in both languages. Translating the name of somebody else's product
 * invents a thing that does not exist, which is the same rule this file
 * already applies to the title of a podcast.
 *
 * Her decisions, taken 6 September 2026 when this was written:
 *   podcast → potgooi, app → toep, and `episode` and `video` stay as they are
 *   because both are already Afrikaans words.
 */
const ENGLISH_ONLY = [
  /* The ones her reader found, and their families. */
  'post', 'posts', 'posted', 'posting',
  'playlist', 'playlists', 'feed', 'feeds', 'caption', 'captions',
  'chorus', 'clip', 'clips', 'preview', 'previews', 'handle',
  'split', 'look', 'backing', 'track', 'tracks',
  'app', 'apps', 'podcast', 'podcasts',
  /* And the rest of English's most common words, which is what an untranslated
     sentence is made of. */
  'the', 'and', 'your', 'yours', 'you', 'with', 'from', 'this', 'that', 'these',
  'those', 'for', 'are', 'were', 'have', 'has', 'had', 'will', 'would', 'could',
  'should', 'make', 'makes', 'made', 'song', 'songs', 'voice', 'voices',
  'room', 'rooms', 'play', 'plays', 'listen', 'new', 'more', 'less', 'all',
  'not', 'can', 'one', 'two', 'three', 'how', 'when', 'where', 'who', 'why',
  'what', 'words', 'sound', 'sounds', 'picture', 'pictures', 'file', 'files',
  'line', 'lines', 'link', 'next', 'back', 'open', 'close', 'save', 'saved',
  'share', 'shared', 'story', 'show', 'shows', 'people', 'person', 'times',
  'days', 'free', 'paid', 'pay', 'price', 'cost', 'credit', 'credits',
  'private', 'public', 'about', 'again', 'here', 'there', 'first', 'last',
  'good', 'best', 'download', 'upload', 'settings', 'account', 'search',
  'delete', 'remove', 'edit', 'start', 'stopped', 'ready', 'done', 'failed',
  'end',
] as const;
const ENGLISH = new Set<string>(ENGLISH_ONLY);

/**
 * Words that look English and are not, or are names nobody translates.
 *
 * Kept beside the list above rather than folded into it, because the reason
 * for each kind is different: one is "this is an Afrikaans word too", the
 * other is "this is what the thing is called".
 */
const ALLOWED = new Set([
  /* Placeholders — {name}, {room}, {what}, {all} — are stripped before the
     words are counted, but their bare forms turn up in prose too. */
  'ai', 'rss', 'url', 'bpm', 'mb', 'png', 'jpeg', 'webp', 'wav', 'webm', 'mp',
  /* Names. */
  'futurebox', 'youtube', 'spotify', 'tiktok', 'apple', 'music', 'soundcloud',
  'instagram', 'meta', 'google', 'chrome', 'firefox', 'safari', 'edge',
  'copilot', 'collab', 'collabs', 'radar', 'arena', 'spotlight', 'masterclass',
  'masterclasses', 'premium', 'pro', 'reel', 'reels', 'shorts', 'studio',
  'live', 'hook', 'hooks', 'dm', 'nam', 'sast', 'utc', 'rand', 'dollar',
  /* Genres and the words a producer says in either language. */
  'afro', 'house', 'gospel', 'rock', 'pop', 'indie', 'groove', 'beat', 'drum',
  'pads', 'log', 'vibe', 'coded', 'coding', 'amp', 'modeler', 'neural',
  'tokens', 'transformers', 'agent', 'intune', 'ups',
]);

const english: string[] = [];
for (const [i, match] of starts.entries()) {
  const from = match.index ?? 0;
  const to = i + 1 < starts.length ? (starts[i + 1].index ?? dict.length) : dict.length;
  const found = /\baf:\s*"((?:[^"\\]|\\.)*)"/.exec(dict.slice(from, to));
  if (!found) continue;
  const line = JSON.parse(`"${found[1]}"`) as string;
  const bad = [
    ...new Set(
      /* Placeholders out first: `{what}` is the name of a slot, not a word
         somebody reads. */
      (line.replace(/\{[^}]*\}/g, ' ').toLowerCase().match(/[a-zà-ÿ’']+/g) ?? [])
        .filter((word) => ENGLISH.has(word) && !ALLOWED.has(word)),
    ),
  ];
  if (bad.length) english.push(`${match[1]} — ${bad.join(', ')} — "${line.slice(0, 70)}"`);
}

/**
 * Afrikaans written with two different apostrophes.
 *
 * The dictionary held both: "Maak 'n snit" in the rail beside "Nog ’n liedjie"
 * on the next screen. They are different characters and they look different on
 * the page, so the app was quietly telling anybody reading it in Afrikaans that
 * two people wrote it and neither read the other. A browser probe found it by
 * failing to match a string — which is the wrong way to find out.
 *
 * Only the two shapes that cannot be a quotation mark are checked: the article
 * ’n, and the plural or genitive on a word (video’s, solo’s). Anything else is
 * left alone, because a straight apostrophe inside quoted speech is not this
 * check's business.
 */
const straight: string[] = [];
for (const [i, match] of starts.entries()) {
  const from = match.index ?? 0;
  const to = i + 1 < starts.length ? (starts[i + 1].index ?? dict.length) : dict.length;
  const body = dict.slice(from, to);
  const af = /\baf:\s*"((?:[^"\\]|\\.)*)"/.exec(body)?.[1] ?? '';
  if (/(^|[\s(—-])'n\b/.test(af) || /[A-Za-zÀ-ſ]'[a-z]\b/.test(af)) straight.push(match[1]);
}

/**
 * Words that read as Dutch rather than Afrikaans.
 *
 * "Snit" is in the dictionary and it is what the music press prints, but read
 * aloud in the app it lands as Dutch rather than as how anybody speaks — the
 * opposite of the register this file aims for. It was in 107 places, one of
 * them the rail label that is the first Afrikaans a person sees.
 *
 * Bounded on the word, so "oorsnit" — a video cutaway, and the right word —
 * is left alone. Checked across every file with an af: line, not only the
 * dictionary: the copilot prompts in `lib/surfaces.ts` held eight of them.
 */
const BANNED: { word: RegExp; instead: string }[] = [
  { word: /\bsnit(te)?\b/i, instead: 'liedjie / liedjies' },
];
const dutch: string[] = [];
for (const file of [DICT, ...walk("app").filter((f) => f !== DICT)]) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/\baf:\s*"((?:[^"\\]|\\.)*)"/g)) {
    for (const { word, instead } of BANNED) {
      if (word.test(m[1])) dutch.push(`${file}: "${m[1].slice(0, 70)}" — se ${instead}`);
    }
  }
}

const missing = new Map<string, string>();
for (const file of walk('app')) {
  if (file.endsWith('i18n.tsx')) continue;
  const raw = readFileSync(file, 'utf8');
  /* Comments stripped first.

     A file that *explains* this pattern contains it: `apierror.ts` describes
     the `data.message ?? t('some.fallback', …)` shape it exists to replace,
     and the check reported `some.fallback` as an untranslated key. A check
     that fails on prose about itself is a check somebody switches off, and
     `check-security.mts` already strips comments before scanning for the same
     reason. */
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // Both quotings, because a key built in a template literal is still a key.
  for (const m of [...src.matchAll(/\bt\(\s*'([^']+)'/g), ...src.matchAll(/\bt\(\s*`([^`$]+)`/g)]) {
    if (!known.has(m[1]) && !missing.has(m[1])) missing.set(m[1], file);
  }
}

if (missing.size === 0 && halfDone.length === 0 && straight.length === 0 && twice.length === 0 && dutch.length === 0 && copied.length === 0 && english.length === 0) {
  console.log(
    `check:afrikaans — ${known.size} keys, every one the code asks for has both languages,` +
      '\n  and every Afrikaans ’n is the same character as every other one,' +
      `\n  and no line is the English pasted into the Afrikaans slot (${SAME_IN_BOTH.size} words are the same in both and are named),` +
      `\n  and no Afrikaans sentence has an English word inside it (${ENGLISH_ONLY.length} watched, ${ALLOWED.size} named as Afrikaans or as names).`,
  );
  process.exit(0);
}

if (missing.size) {
  console.error(`\n${missing.size} key(s) used in code with no entry in ${DICT}:\n`);
  for (const [key, file] of missing) console.error(`  ${key}\n    ${file}`);
}
if (twice.length) {
  console.error(`\n${twice.length} key(s) written twice — the second wins and the first is dead:\n`);
  twice.forEach((key) => console.error(`  ${key}`));
}

if (halfDone.length) {
  console.error(`\n${halfDone.length} entr(ies) with English and no Afrikaans:\n`);
  for (const key of halfDone) console.error(`  ${key}`);
}
if (dutch.length) {
  console.error(`\n${dutch.length} Afrikaans line(s) using a word that reads as Dutch:\n`);
  for (const line of dutch) console.error(`  ${line}`);
}
if (english.length) {
  console.error(
    `\n${english.length} Afrikaans line(s) with an English word in them.` +
      '\nEvery word and every sentence has to be Afrikaans. If the word really is' +
      '\nAfrikaans too, or is the name of something, add it to ALLOWED in this file:\n',
  );
  for (const line of english) console.error(`  ${line}`);
}
if (copied.length) {
  console.error(
    `\n${copied.length} entr(ies) where the Afrikaans is the English pasted in.` +
      '\nIf the word really is the same in both, add it to SAME_IN_BOTH in this file:\n',
  );
  for (const line of copied) console.error(`  ${line}`);
}
if (straight.length) {
  console.error(
    `\n${straight.length} Afrikaans line(s) using a straight apostrophe where the rest` +
      '\nof the dictionary uses ’ — they look different on the page:\n',
  );
  for (const key of straight) console.error(`  ${key}`);
}
console.error(
  '\nAdd them to the dictionary. An English fallback is silent: the reader cannot' +
    '\ntell a missing translation from a deliberate one, so nobody ever reports it.\n',
);
process.exit(1);
