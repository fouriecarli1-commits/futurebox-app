/**
 * Two people making a song together: both say yes before it is made.
 *
 * The owner, 21 October 2026: *"Dit sal goed wees as die colab nie dadelik die
 * make a song button beskikbaar het nie. Beide moet kan goedkeuring gee om
 * uiteindelik die liedjie te generate."*
 *
 * The decision itself (`readyToMake`) is run with every combination of turn
 * and ticks. The places that must hold it — the server before it charges,
 * the button and the make action, handing over the turn — are read for it,
 * because each one is a door the rule could be walked around.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};

const { readyToMake } = await import('../app/lib/pairs.ts');
const room = (over: Record<string, unknown>) => ({
  id: 'p', surface: 'make', withName: 'Them', withHandle: '', mine: true, wanted: false, penAt: '',
  approvals: true, okMine: false, okTheirs: false, ...over,
}) as Parameters<typeof readyToMake>[0];

ok('neither has approved: not yet', !readyToMake(room({})).ready);
ok('only you: not yet, and it says you are waiting on them', !readyToMake(room({ okMine: true })).ready && /Waiting for them/.test(readyToMake(room({ okMine: true })).why));
ok('only they: not yet, and it asks you to approve', !readyToMake(room({ okTheirs: true })).ready && /Approve it too/.test(readyToMake(room({ okTheirs: true })).why));
ok('both, and it is your turn: it can be made', readyToMake(room({ okMine: true, okTheirs: true })).ready);
ok('both, but it is their turn: they press it, not you', !readyToMake(room({ okMine: true, okTheirs: true, mine: false })).ready);
ok('a project without the tick columns: the room works as before', readyToMake(room({ approvals: false })).ready);

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const music = read('app/api/music/route.ts');
const gateAt = music.indexOf('pairMayMake(');
const chargeAt = music.indexOf('await pay(');
ok('the song route checks both yeses before it charges anything', gateAt > 0 && chargeAt > 0 && gateAt < chargeAt);
ok('and clears them once the song is made, on both engines', (music.match(/together\.made\(\)/g) ?? []).length === 2);

const gate = read('app/lib/server/pairgate.ts');
ok('the server refuses a song from the one without the turn, and without both ticks', /row\.pen !== caller/.test(gate) && /!row\.ok_a \|\| !row\.ok_b/.test(gate));

const pairs = read('app/api/pairs/route.ts');
ok('handing over the turn clears both ticks', /ok_a: false, ok_b: false/.test(pairs) && /what === 'approve'/.test(pairs));

const make = read('app/components/MakeMusic.tsx');
ok('the make action itself waits — the copilot can press it too', /if \(pairGate && !pairGate\.ready\) \{\s*setStatus\(pairGate\.why\);\s*return;/.test(make));
ok('the button is not pressable until both said yes, and says why', /disabled=\{busy \|\| Boolean\(pairGate && !pairGate\.ready\)\}/.test(make) && /data-makewaits/.test(make));

/* ── Who pays ───────────────────────────────────────────────────────
   The owner, 21 October 2026: "Ja, verdeel dit half-half, en gee die opsie
   van 1 persoon wat alles dra." */
const { splitOf } = await import('../app/lib/paysplit.ts');
ok('half each: an even price splits evenly', JSON.stringify(splitOf(40, 'half')) === '{"mine":20,"theirs":20}');
ok('  and an odd one gives the odd credit to whoever presses Make', JSON.stringify(splitOf(9, 'half')) === '{"mine":5,"theirs":4}');
ok('one person paying it all pays all of it, and the other nothing',
  JSON.stringify(splitOf(40, 'caller')) === '{"mine":40,"theirs":0}' && JSON.stringify(splitOf(40, 'other')) === '{"mine":0,"theirs":40}');
ok('both songs the route can make are charged as the two agreed', (music.match(/await pay\(/g) ?? []).length === 2
  && /chargeTogether\(request, amount, 'song', together\.other, together\.share\)/.test(music) && !/await charge\(request/.test(music));
const credits = read('app/lib/server/credits.ts');
ok('  and the caller’s part goes back when the other part cannot be taken',
  /if \(balance === null \|\| !\(await spend\(them\.id, theirs/.test(credits) && /await first\.refund\(\);\s*const short/.test(credits));
ok('nobody can put the whole bill on somebody else: "I pay it all" is always the caller\u2019s own side',
  /const pays = body\.pays === 'me' \? \(row\.a === caller\.id \? 'a' : 'b'\) : 'half';/.test(pairs));
ok('  and changing who pays clears both ticks', /update\(\{ pays, ok_a: false, ok_b: false \}\)/.test(pairs));
ok('  and the strip offers the two choices in Make a song', /data-pairpaysbutton/.test(read('app/components/PairStrip.tsx')));

const sql = read('supabase/pairs.sql');
ok('who pays is a column the table can hold, half by default', /add column if not exists pays text not null default 'half'/.test(sql)
  && /check \(pays in \('half', 'a', 'b'\)\)/.test(sql));
ok('the ticks are columns the table can hold', /add column if not exists ok_a/.test(sql) && /add column if not exists ok_b/.test(sql));

if (failures) {
  console.error(`\ncheck:pairapprove — ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:pairapprove — a song made together waits for both yeses, and is paid half each or by whoever chose to pay it all.');
