/**
 * Two people in one making room, a turn each, and no chat.
 *
 * ── What she asked for, and what was built instead ───────────────────────
 *
 * Carli, 24 September 2026: *"Ek wil hê jy moet elke kamer dupliseer waarin
 * create word … in daai moment moet die duplicated room oop maak waar in net
 * hierdie twee mense is en beide kry functionality om binne die kamer te
 * werk."*
 *
 * Put the two versions side by side, she chose the one that is not nine
 * copies: the same rooms, opened in a pair mode. That matters here because
 * this check has to hold a design she was talked through rather than the
 * words she first used — so the first rule is that the rooms she can pair in
 * are the making rooms and are the SAME list the server enforces. A picker
 * offering a room the route refuses is the worst of both: it looks built and
 * answers 400.
 *
 * ── The four ways this ships looking finished ────────────────────────────
 *
 * 1. **The picker and the server disagree.** Two lists of rooms is two
 *    places for one fact, and the day they drift, a button does nothing and
 *    nothing says why.
 * 2. **The pen can be taken.** She chose turn-taking for a reason: both free
 *    means one person's work vanishes with nothing on either screen to say
 *    so. A route that lets somebody TAKE the pen is the same fault wearing a
 *    button — your take interrupted by whoever got impatient. Only giving.
 * 3. **A room without an agreement.** If a pair can be made from any two
 *    ids, anybody can put themselves in a room with anybody. The accepted
 *    collab is the whole of that rule.
 * 4. **A chat grows back.** She said plainly she does not want one. The
 *    shape that prevents it is that there is nowhere to put a message: one
 *    row per person, holding one address.
 */

import { readFileSync } from 'node:fs';
import { SURFACE_IDS } from '../app/lib/surfaces';
import { readHandle, readShareLink, HANDLE_PLATFORMS } from '../app/lib/sociallink';
import { before, from, upTo } from './order.mts';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const route = readFileSync('app/api/pairs/route.ts', 'utf8');
const desk = readFileSync('app/components/CollabRoom.tsx', 'utf8');
const strip = readFileSync('app/components/PairStrip.tsx', 'utf8');
const finder = readFileSync('app/components/CollabFinder.tsx', 'utf8');
const radar = readFileSync('app/components/CollabRadar.tsx', 'utf8');
const page = readFileSync('app/page.tsx', 'utf8');
const sql = readFileSync('supabase/pairs.sql', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/** The room ids a list names, in the order it names them. */
const roomsIn = (text: string, after: string): string[] => {
  const from = text.indexOf(after);
  if (from === -1) return [];
  const upTo = text.indexOf('];', from);
  return [...text.slice(from, upTo).matchAll(/'([a-z_]+)'/g)].map((one) => one[1]);
};

/* ── 1. One list of rooms, not two ────────────────────────────────────── */

const served = roomsIn(route, 'const PAIRABLE');
const offered = roomsIn(desk, 'const PAIR_ROOMS');
/* The same rooms, in whatever order the picker chooses to show them. The
   order is a design decision — the booth before the studio, because more
   people go there — and holding it here would make a layout change a red
   check for no reason. What must not differ is WHICH rooms. */
const sameSet = (one: readonly string[], two: readonly string[]): boolean =>
  one.length === two.length && [...one].sort().join(',') === [...two].sort().join(',');
ok(`the picker offers exactly the rooms the server takes — ${served.length}`,
  served.length > 0 && sameSet(served, offered),
  `server: ${served.join(', ')} · picker: ${offered.join(', ')} — a button the route refuses looks built and answers 400`);

ok('  and every one of them is a real room',
  served.every((one) => (SURFACE_IDS as readonly string[]).includes(one)),
  `${served.filter((one) => !(SURFACE_IDS as readonly string[]).includes(one)).join(', ')} is not in SURFACE_IDS`);

/* The rooms deliberately left out. Named rather than counted, because "nine
   of thirteen" is satisfied by any nine. */
for (const notPaired of ['live', 'channels', 'hooks_feed', 'collab']) {
  ok(`  and ${notPaired} is not one, because nothing is made in it`,
    !served.includes(notPaired),
    'a pair strip over a room with nothing to take turns at is a claim that is false');
}

ok('  and every room a pair can open has words in both languages',
  offered.every((one) => new RegExp(`"pair\\.room\\.${one === 'voice_studio' ? 'voice' : one}"`).test(words)),
  'a room named in English on an Afrikaans screen');

/* ── 2. The pen is given, never taken ─────────────────────────────────── */

ok('the pen can be asked for and handed over',
  /body\.what === 'pen_ask'/.test(route) && /body\.what === 'pen_give'/.test(route));

ok('  and giving it refuses anybody who is not holding it',
  /if \(row\.pen !== caller\.id\)/.test(route),
  'anybody in the room could hand somebody else’s turn away');

ok('  and there is no way to take it',
  !/pen_take|body\.what === 'take'/.test(route),
  'a pen that can be taken is a take interrupted by whoever got impatient, which is the fault turn-taking was chosen to avoid');

ok('  and the table will not hold a pen belonging to a third person',
  /check \(pen = a or pen = b\)/.test(sql),
  'a check in the route can be moved; a constraint cannot');

ok('  and never no pen at all',
  /pen {9}uuid not null/.test(sql) || /pen\s+uuid not null/.test(sql),
  'a room where nobody may act is a room where the first press does nothing and nothing says why');

/* ── 3. No room without an agreement ──────────────────────────────────── */

/* Inside the open branch, not across the whole file: `from('pairs')` is in
   the GET too, three reads above this, so the whole-file version of this
   rule was comparing the collab read against a query in a different handler
   and calling a correct route a fault. */
const opening = from(route, "if (body.what === 'open')");
ok('a room can only be opened off an accepted agreement',
  before(opening, "from('collabs')", "from('pairs')")
  && /state !== 'accepted'/.test(opening),
  'the collab is read BEFORE the pair is written, or anybody can put themselves in a room with anybody');

ok('  and only by one of its two people',
  /agreed\.asked_by !== caller\.id && agreed\.asked_of !== caller\.id/.test(route),
  'somebody else’s agreement is enough to make a room in');

ok('  and walking back in does not take the pen out of their hand',
  /ignoreDuplicates: true/.test(route),
  'opening the door again would hand the turn to whoever opened it, every time');

/* ── 4. There is nowhere to put a chat ────────────────────────────────── */

/* The columns themselves, read out of the table rather than guessed at
   with a regex over the whole file. One row per person, and not one of its
   columns is somewhere a sentence could go — which is the shape that stops
   a chat growing back, rather than a promise that one will not. */
const linkColumns = upTo(from(sql, 'create table if not exists public.pair_links'), ');')
  .split('\n')
  .map((line) => line.trim().split(/\s+/)[0])
  .filter((name) => /^[a-z_]+$/.test(name) && name !== 'create' && name !== 'primary');
ok(`the room holds one address per person and nothing else — ${linkColumns.join(', ')}`,
  /primary key \(pair, owner\)/.test(sql)
  && !linkColumns.some((name) => /body|message|note|said|text$/.test(name)),
  'a second row per person is a thread, and a thread is a chat');

ok('  and the screen says so where somebody would look for one',
  /pair\.noChat/.test(strip) && /"pair\.noChat"/.test(words),
  'an absent chat with nothing explaining it reads as a missing feature');

ok('  and a WhatsApp link is marked as carrying a number',
  /pair\.numberWarning/.test(strip),
  'a number is a heavier thing to hand a stranger than a profile name, and the screen is where that is said');

/* ── 5. The link reader, run rather than read ─────────────────────────── */

for (const [what, link] of [
  ['an Instagram profile', 'https://instagram.com/carli'],
  ['a WhatsApp number', 'https://wa.me/27821234567'],
  ['one of the original seven', 'https://www.tiktok.com/@carli'],
] as const) {
  ok(`${what} is taken`, !('ok' in readShareLink(link)), link);
}
for (const [what, link] of [
  ['a shortener, which is a link to a link', 'https://bit.ly/x'],
  ['plain words', 'hello'],
  ['a host dressed up as another', 'https://user:pass@instagram.com@evil.example/x'],
] as const) {
  ok(`  and ${what} is refused`, 'ok' in readShareLink(link), link);
}

ok('a handle on its own is taken, and stays a handle',
  (() => {
    const read = readHandle('Instagram', '@carli');
    return !('ok' in read) && read.url === '' && read.shown === '@carli';
  })(),
  'built into a URL it is a link wearing a handle’s clothes, and the option exists so there is nothing to press');

ok(`  on any of the platforms offered — ${HANDLE_PLATFORMS.length}`,
  HANDLE_PLATFORMS.length >= 9 && HANDLE_PLATFORMS.includes('Instagram') && HANDLE_PLATFORMS.includes('WhatsApp'));

/* ── 6. Two asks, and the strip where the room is ─────────────────────── */

ok('a match offers both asks, not one',
  (finder.match(/wanting="input"/g) ?? []).length === 1
  && (finder.match(/wanting="room"/g) ?? []).length === 1,
  'folded into one button, the smaller ask — an ear on one song — stops being on offer at all');

ok('  and they read as different things',
  /collab\.askEar/.test(desk) && /collab\.askRoom/.test(desk),
  'one label over two asks gets one answer');

ok('the strip is drawn over the room somebody is in, and only that one',
  /pairs\.find\(\(one\) => one\.surface === studioTab\)/.test(page) && /<PairStrip/.test(page),
  'a strip that followed you everywhere would be a claim that is false in eight rooms out of nine');

ok('  and opening a room goes into it',
  /onOpenPair=\{\(pair\) => \{/.test(page) && /goToRoom\(pair\.surface\)/.test(page),
  'a button whose effect you cannot see is the fault the advert card and the hook hand-off were each fixed for');

/* ── 7. The demo matching is gone ─────────────────────────────────────── */

ok('nothing matches a fixed list of invented people any more',
  !/matchTracks\(/.test(radar) && !/trackMatches/.test(radar),
  'a screen of people who do not exist, beside a screen of people who do, with nothing to tell them apart');

ok('  and the real matching still reads what members shared',
  /fetchRadar/.test(finder),
  'the live one is the whole point; removing the demo must not take it with it');

if (failures) {
  console.log(`\ncheck:pairs — ${failures} failure(s).`);
  process.exit(1);
}
console.log(
  '\ncheck:pairs — the picker and the server name the same rooms, the pen is given and never taken, no room '
  + 'exists without an accepted agreement, and there is nowhere in the shape of it to put a chat.',
);
