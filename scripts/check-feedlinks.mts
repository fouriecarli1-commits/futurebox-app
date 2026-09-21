/**
 * Every card on the front page plays the thing it names.
 *
 * ── What this is here to catch ───────────────────────────────────────────
 *
 * Carli, 21 September 2026: *"Die content moet ons oor doen en double
 * check… wat goeie sources is. Daar kan nie goed op wees wat random is
 * nie."*
 *
 * Two cards were pointing at the same lecture:
 *
 *   *The Industrialization of Intelligence & Supercomputing* — Dwarkesh
 *   Podcast, with Dario Amodei. Two real people, a real show, a duration
 *   and a view count. Its link and its embed both opened Andrej Karpathy's
 *   LLM lecture.
 *
 *   *BRICKZ — FORGET YESTERDAY (Official AI Video)*, by "JL Records", with
 *   a tool list, a prompt and a profile address. No BRICKZ, no JL Records.
 *   The embed played the same lecture and the link went to klingai.org.
 *
 * Neither is a bug in the ordinary sense. Both are what happens when
 * somebody fills a grid: a card gets a title and a face before it has a
 * source, and a placeholder link goes in to make it render. It renders, so
 * nothing complains, and it ships looking exactly like the real ones beside
 * it — which is worse than an empty shelf, because an empty shelf is honest.
 *
 * ── The three rules ──────────────────────────────────────────────────────
 *
 * A card's embed and its own link must be the same video; no two cards may
 * play the same one; and a card may not borrow a video the masterclass shelf
 * already uses. The third is the one that caught both of these.
 */

import { readFileSync } from 'node:fs';
import { MASTERCLASSES, youTubeId } from '../app/data/masterclasses';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const page = readFileSync('app/page.tsx', 'utf8');

interface Card {
  readonly embed: string;
  readonly link: string;
  readonly line: number;
}

const cards: Card[] = [];
for (const found of page.matchAll(
  /embedUrl: 'https:\/\/www\.youtube\.com\/embed\/([A-Za-z0-9_-]+)',\s*\n\s*externalUrl: '([^']+)'/g,
)) {
  cards.push({
    embed: found[1],
    link: found[2],
    line: page.slice(0, found.index).split('\n').length,
  });
}

ok('the scan found the cards at all', cards.length >= 4, `${cards.length} found`);

/* ── One: a card plays what its own link opens ───────────────────────── */

const crossed = cards.filter((one) => youTubeId(one.link) !== one.embed);
ok('every card plays the video its own link opens',
  crossed.length === 0,
  crossed.map((one) => `line ${one.line}: plays ${one.embed}, links to ${one.link}`).join('; '));

/* ── Two: no two cards are the same video ────────────────────────────── */

const seen = new Map<string, number[]>();
for (const one of cards) seen.set(one.embed, [...(seen.get(one.embed) ?? []), one.line]);
const twice = [...seen.entries()].filter(([, lines]) => lines.length > 1);
ok('no two cards play the same video',
  twice.length === 0,
  twice.map(([id, lines]) => `${id} on lines ${lines.join(' and ')}`).join('; '));

/* ── Three: and none of them borrows a class's video ─────────────────── */

const classes = new Map<string, string>();
for (const one of MASTERCLASSES) {
  const id = one.url ? youTubeId(one.url) : null;
  if (id) classes.set(id, one.id);
}
const borrowed = cards.filter((one) => classes.has(one.embed));
ok('and no card plays a video the classes shelf already uses',
  borrowed.length === 0,
  borrowed.map((one) => `line ${one.line} plays ${classes.get(one.embed)}`).join('; '));

/* ── And there are still as many as there were ───────────────────────
 
   A floor rather than a name list. The first version of this named the
   two cards that were taken out and refused to see them again — which
   failed on the notes in `page.tsx` explaining why they went, and would
   have gone on failing if the Dwarkesh episode were ever added back with
   its RIGHT link, which is a thing somebody should be able to do. The
   three rules above already refuse a card that plays the wrong video, and
   they refuse it whatever it is called.
 
   What a name list was really guarding is a shelf quietly emptying out,
   and a count says that without an opinion about titles. */
ok('the podcast shelf has not quietly emptied out',
  cards.length >= 5, `${cards.length} cards left`);

if (failures) {
  console.error(`\ncheck:feedlinks — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  `\ncheck:feedlinks — ${cards.length} cards on the front page, each playing the video its own link`
  + ' opens, none twice, and none borrowed from the classes shelf.',
);
