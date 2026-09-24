/**
 * The live room's box takes a TikTok live address and nothing else.
 *
 * ── The ask ──────────────────────────────────────────────────────────────
 *
 * Carli, 24 September 2026: *"Daai open chat moenie kan werk nie, as dit
 * werk moet daar net tiktok live links gedeel word. Dit moet gescreen word
 * om general bad videos teen te werk."*
 *
 * ── The three ways this comes back ───────────────────────────────────────
 *
 * 1. **The box quietly reopens.** A later change adds a `note` fallback or a
 *    length cap for free text, and the room is a chat again with nobody
 *    noticing until it is full of one. So the rule is not "there is a link
 *    reader" — it is that the handler reads a TikTok live address and has no
 *    path that accepts anything else.
 *
 * 2. **"Screened" comes to mean more than it does.** Nothing in this app can
 *    watch a live stream. What is checked is the host, the `/live` path and
 *    the handle, and the handle is screened as words because it is about to
 *    be printed to the room. The rest is the room's own reporting, and both
 *    halves have to be there or the word is a lie.
 *
 * 3. **The screen invites what the server refuses.** A placeholder reading
 *    "Say something to the room" over a box that answers 400 to anything but
 *    a URL is worse than no placeholder: it is the app telling somebody to
 *    do a thing and then telling them off for it.
 */

import { readFileSync } from 'node:fs';
import { readTikTokLive } from '../app/lib/server/platformlink';
import { before } from './order.mts';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const route = readFileSync('app/api/live/route.ts', 'utf8');
const screen = readFileSync('app/components/LiveChannel.tsx', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');
const sql = readFileSync('supabase/liveflags.sql', 'utf8');

/* ── 1. The reader, run rather than read ──────────────────────────────── */

const yes = (link: string) => readTikTokLive(link).ok;
ok('a real live address is taken', yes('https://www.tiktok.com/@carli/live'));
ok('  and the same one with a share sheet’s tracking on it',
  yes('https://www.tiktok.com/@carli/live?is_from_webapp=1&sender_device=pc'));
ok('  and the tracking is dropped rather than republished to the room',
  (readTikTokLive('https://www.tiktok.com/@carli/live?is_from_webapp=1') as { url: string }).url
    === 'https://www.tiktok.com/@carli/live',
  'a parameter a share sheet added is printed to everybody under the sharer’s name');

for (const [what, link] of [
  ['a profile rather than a stream', 'https://www.tiktok.com/@carli'],
  ['a video rather than a stream', 'https://www.tiktok.com/@carli/video/123'],
  ['something after /live', 'https://www.tiktok.com/@carli/live/extra'],
  ['a short link, which could be anything', 'https://vm.tiktok.com/ZM8abc/'],
  ['another platform', 'https://youtube.com/watch?v=1'],
  ['plain words, which is what this box used to be for', 'hello everyone'],
  ['a host dressed up as TikTok', 'https://user:pass@tiktok.com@evil.example/@x/live'],
] as const) {
  ok(`  and ${what} is refused`, !yes(link), `it took "${link}"`);
}

/* ── 2. The handler has no way back to free text ──────────────────────── */

ok('the room’s box reads a live address',
  /readTikTokLive\(/.test(route),
  'the handler is back to taking whatever was typed');

/* The old handler is the thing to be sure is gone, not merely unused. It
   read `body.note ?? body.title`, capped at 500 and inserted it. */
ok('  and nothing inserts what was typed without reading it first',
  before(route, 'readTikTokLive(', "from('live_says').insert(")
  && !/const text = String\(body\.note/.test(route),
  'the old free-text handler is still in the file, so one edit brings the chat back');

ok('  and the handle is screened as words before the room sees it',
  /guard\(request, read\.handle/.test(route),
  'a handle can be an obscenity, and it is about to be printed to everybody');

/* ── 3. The half nothing in this app can do ───────────────────────────── */

ok('the room can report a link, because nothing here can watch the stream',
  /body\.what === 'flag'/.test(route) && /data-flaglive/.test(screen),
  '"screened" without a way to report is a claim about a video this app never sees');

ok('  and a reported one stops being read out',
  /HIDE_AT/.test(route) && /\.filter\(\(one\) => !flagged\.has\(one\.id\)\)/.test(route),
  'reports that are collected and never acted on are a button that does nothing');

ok('  with one report per person, held by the table rather than by code',
  /primary key \(said, owner\)/.test(sql),
  'a check in the route can be moved or forgotten; a primary key cannot');

ok('  and the table is closed to the browser',
  /revoke all on public\.live_flags from public, anon, authenticated/.test(sql)
  && /enable row level security/.test(sql),
  'a report table anybody can write is a report table anybody can stuff');

/* ── 4. The screen asks for what the server takes ─────────────────────── */

ok('the box says it is not a chat, before anybody types',
  /live\.onlyLive/.test(screen) && /"live\.onlyLive"/.test(words),
  'refusing somebody afterwards for doing what the placeholder invited is the app telling them off for obeying it');

ok('  and the placeholder is an address, not an invitation to talk',
  /live\.sayLive/.test(screen) && !/live\.say'/.test(screen),
  '"Say something to the room" over a box that only takes a URL');

ok('  and it sends the link as a link',
  /what: 'say', link: draft/.test(screen),
  'sent as `note`, which is the field the free-text handler used to read');

if (failures) {
  console.log(`\ncheck:livechat — ${failures} failure(s).`);
  process.exit(1);
}
console.log(
  '\ncheck:livechat — the room’s box takes a TikTok live address and nothing else, the handle is '
  + 'screened, and the half this app cannot do — watching the stream — is done by the room, with one '
  + 'report per person and two reports enough to take a link down.',
);
