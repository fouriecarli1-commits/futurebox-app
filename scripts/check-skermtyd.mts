/**
 * Screen time: the clock belongs to the grown-up, and the child really is out.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Ek dink die kids afdeling moet by login page wees.
 * Daar moet dan die opsie wees om in die kids channel in te log. Dan moet die
 * ouers die budget en screen time kan stel. Wanneer screen time op is moet dit
 * die kind uitskop."*
 *
 * ── The two ways a screen-time feature is a lie ──────────────────────────
 *
 * **The clock is in the browser.** Then it is decoration. A sitting kept in
 * `localStorage` is a sitting a reload restarts, and the one person certain to
 * reload is the child whose twenty minutes have just run out. Measured against
 * the device's clock it is worse: a child who can change the time on the phone
 * has unlimited screen time. So `sitting_from` is a column, `now()` is
 * Postgres's, and the browser is handed a number of seconds it may count down
 * from and may not set.
 *
 * **Only the page stops it.** A room with every button greyed out is a room a
 * child keeps pressing, and a page can be reloaded, opened in a second tab, or
 * left open while the clock runs out. If the only thing stopping a press were
 * the screen, a child who pressed at nineteen minutes fifty-nine and again at
 * twenty-one would be charged for both. So `kids_spend` refuses once the
 * sitting is over — that half is driven on real Postgres by `check:sqlruns`,
 * which is where a claim about SQL belongs.
 *
 * What this file holds is everything around it: that null and zero are told
 * apart all the way through, that nothing the child's room can reach moves the
 * clock, that the room is GONE rather than disabled, and that the door she
 * asked for is on the sign-in screen.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import {
  MINUTES_LEAST, MINUTES_MOST, MINUTE_STEPS, asClock, saneMinutes,
} from '../app/lib/kidsallowance.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const sql = readFileSync('supabase/skermtyd.sql', 'utf8');
const bundle = readFileSync('supabase/ALMAL.sql', 'utf8');
const server = withoutComments(readFileSync('app/lib/server/kidsmode.ts', 'utf8'));
const route = withoutComments(readFileSync('app/api/kids/route.ts', 'utf8'));
const door = withoutComments(readFileSync('app/components/KidsDoor.tsx', 'utf8'));
const room = withoutComments(readFileSync('app/components/KidsRoom.tsx', 'utf8'));
const page = withoutComments(readFileSync('app/page.tsx', 'utf8'));

/* ── 1. The numbers a parent may pick ─────────────────────────────────── */

ok('a sitting has to be a length somebody could mean',
  saneMinutes(15) && saneMinutes(MINUTES_LEAST) && saneMinutes(MINUTES_MOST)
  && !saneMinutes(0) && !saneMinutes(1) && !saneMinutes(MINUTES_MOST + 1)
  && !saneMinutes(-20) && !saneMinutes(20.5),
  'the number arrives from a browser, which is the one place it cannot be'
  + ' trusted');

ok('  and no clock at all is an answer rather than a gap',
  saneMinutes(null) && saneMinutes(undefined),
  'a budget with no timer is a reasonable thing to want and is what every'
  + ' room opened before today has — refusing null would lock all of them');

ok('  and every step offered is one the server will take',
  MINUTE_STEPS.every((one) => saneMinutes(one)) && MINUTE_STEPS.length >= 3,
  'a page offering a step the route refuses is a button that fails, and the'
  + ' rule lives in one file so the two cannot disagree');

ok('  and the table holds the same range as the code',
  (() => {
    const check = sql.match(/minutes >= (\d+) and minutes <= (\d+)/);
    return check !== null
      && Number(check[1]) === MINUTES_LEAST
      && Number(check[2]) === MINUTES_MOST;
  })(),
  'three places can hold this number — the page, the route and the column —'
  + ' and the column is the one that is still true after somebody posts their'
  + ' own JSON');

ok('  and a countdown reads as a clock',
  asClock(1264) === '21:04' && asClock(8) === '0:08' && asClock(-5) === '0:00',
  'a child reads 0:08; nobody reads 8 seconds');

/* ── 2. Null is not zero, anywhere ───────────────────────────────────── */

ok('the clock answers null for a room that has none',
  /if room\.minutes is null or room\.sitting_from is null then\s*return null;/.test(sql),
  'null lets everything through and zero shuts the room — reading one as the'
  + ' other locks every kids room opened before today out of its own'
  + ' allowance');

ok('  and never answers a negative',
  /return greatest\(\s*0,/.test(sql),
  'a sitting that ended forty minutes ago and one that ended a second ago are'
  + ' the same fact, and a caller handling "minus 2400" is handling a number'
  + ' it has no use for');

ok('  and the server keeps the two apart',
  /secondsLeft: number \| null/.test(server)
  && /left === null \|\| left === undefined \? null : Number\(left\)/.test(server),
  'a `?? 0` anywhere on this path turns "no clock" into "time is up"');

ok('  and the child’s room keeps them apart too',
  /const timeUp = clockLeft !== null && clockLeft <= 0;/.test(room),
  'the room has to be able to tell a child with no clock from a child whose'
  + ' time has run out');

/* ── 3. Nothing the child can reach moves the clock ──────────────────── */

ok('the clock is read from the database, not from this process',
  /rpc\('kids_time_left'/.test(server) && !/Date\.now\(\) - /.test(server),
  'a sitting measured against the browser’s clock is a sitting a child ends'
  + ' by changing the time on the phone, and one measured in a server process'
  + ' drifts between two instances');

ok('  and only one verb starts a sitting',
  (() => {
    /* `PUT` is the grown-up's press and it is the only thing that calls
       `kids_sit`. The child's room may read `kidsNow` and nothing else. */
    const starts = /export async function PUT/.test(route) && /sitAgain\(caller\.id\)/.test(route);
    const roomCannot = !/sitAgain|endSitting|kids_sit/.test(room);
    return starts && roomCannot;
  })(),
  'a sitting the child’s room could restart is a sitting a reload restarts');

ok('  and the sitting starts when the phone is handed over',
  /sitting_from: minutes === null \? null : new Date\(\)\.toISOString\(\)/.test(server),
  'a clock that started on the child’s first press would hand unlimited time'
  + ' to a child sitting looking at the screen, which is the whole thing a'
  + ' parent setting screen time is asking about');

ok('  and another sitting does not hand out more money',
  /set sitting_from = now\(\)/.test(sql) && !/kids_sit[\s\S]{0,400}set spent = 0/.test(sql),
  'more time is not more money, and a parent who meant both presses both');

/* ── 4. The child is out, not greyed out ─────────────────────────────── */

ok('time up takes the room away',
  /if \(timeUp\) \{/.test(room) && /data-kidstimeup/.test(room),
  'her word was "uitskop". A room still on the screen with every button'
  + ' disabled is a room a child keeps pressing');

ok('  and what it shows is not the grown-up’s page',
  (() => {
    const at = room.indexOf('data-kidstimeup');
    const to = room.indexOf('if (!state.open || atDoor)', at);
    if (at < 0 || to < 0) return false;
    const panel = room.slice(at, to);
    return !/<KidsDoor/.test(panel) && /kids\.timeUpSay/.test(panel);
  })(),
  'that page sets an allowance and hands a phone over — putting a child in'
  + ' front of it is handing them the switch');

ok('  and a grown-up can still get past it',
  (() => {
    const at = room.indexOf('data-kidstimeup');
    const to = room.indexOf('if (!state.open || atDoor)', at);
    return at > 0 && to > at && /setAtDoor\(true\)/.test(room.slice(at, to));
  })(),
  'a dead end for the one person who can fix it');

ok('  and the countdown is on the screen before it runs out',
  /data-kidsclockleft/.test(room) && /nearlyOver/.test(room),
  '"two minutes left" is a better five minutes than a room that just stops,'
  + ' because a child who can see it coming saves the song instead of losing'
  + ' it mid-press');

ok('  and the room re-asks the server rather than trusting its own count',
  /setInterval\(\(\) => \{ void kidsNow\(\)\.then\(setState\); \}, 30_000\)/.test(room),
  'a sitting a grown-up ended from another device has to close this room too,'
  + ' and a tab left asleep for an hour must not wake up believing it has'
  + ' fifty minutes left');

/* ── 5. The door she asked for ───────────────────────────────────────── */

ok('the sign-in screen has a door into the kids room',
  /data-authkids/.test(page) && /href="\/kids"/.test(page),
  'her words: "die kids afdeling moet by login page wees". Until today a'
  + ' grown-up had to open the studio, find the account sheet and press a row'
  + ' in it before a child could press anything');

ok('  and it says what a grown-up has to do first',
  /auth\.kidsWhy/.test(page),
  'an allowance belongs to an account, so a door with no sentence under it is'
  + ' a door that opens onto a sign-in screen for no stated reason');

ok('the grown-up’s page sets the clock and the budget together',
  /data-kidsclock/.test(door) && /data-kidsminutes=/.test(door)
  && /giveAllowance\(allowance, wantMinutes\)/.test(door),
  'both in one press, because handing the phone over IS the start of the'
  + ' sitting');

ok('  and the clock is not written until the phone is handed over',
  /const \[wantMinutes, setWantMinutes\] = useState<number \| null>\(null\)/.test(door)
  && !/giveAllowance\([^)]*\)[\s\S]{0,80}setWantMinutes/.test(door),
  'writing it when it was tapped would start a sitting while the parent was'
  + ' still reading the prices');

ok('  and a parent can give more time without giving more credits',
  /data-kidsagain/.test(door) && /data-kidsstop/.test(door),
  'the two presses a parent actually makes mid-afternoon');

/* ── 6. It is in the bundle, in the one position that works ──────────── */

ok('the screen-time file is in the bundle after the table it alters',
  (() => {
    const table = bundle.indexOf('create table if not exists public.kids_mode');
    const alter = bundle.indexOf('add column if not exists minutes');
    const spend = bundle.lastIndexOf('create or replace function public.kids_spend');
    const clock = bundle.indexOf('create or replace function public.kids_time_left');
    /* And the REPLACEMENT `kids_spend` comes last, or the original one wins
       and the clock is never consulted by a charge. */
    return table > 0 && alter > table && clock > alter && spend > clock;
  })(),
  'a file that alters a table has exactly one correct position, and a'
  + ' replacement function that runs before the original is a replacement'
  + ' that is overwritten');

console.log(bad === 0
  ? '\n  The clock is the grown-up’s, the child is out rather than greyed out,\n'
    + '  and the door is on the screen a child is already looking at.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);
