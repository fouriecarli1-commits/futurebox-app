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
const chargeAt = music.indexOf('await charge(');
ok('the song route checks both yeses before it charges anything', gateAt > 0 && chargeAt > 0 && gateAt < chargeAt);
ok('and clears them once the song is made, on both engines', (music.match(/together\.made\(\)/g) ?? []).length === 2);

const gate = read('app/lib/server/pairgate.ts');
ok('the server refuses a song from the one without the turn, and without both ticks', /row\.pen !== caller/.test(gate) && /!row\.ok_a \|\| !row\.ok_b/.test(gate));

const pairs = read('app/api/pairs/route.ts');
ok('handing over the turn clears both ticks', /ok_a: false, ok_b: false/.test(pairs) && /what === 'approve'/.test(pairs));

const make = read('app/components/MakeMusic.tsx');
ok('the make action itself waits — the copilot can press it too', /if \(pairGate && !pairGate\.ready\) \{\s*setStatus\(pairGate\.why\);\s*return;/.test(make));
ok('the button is not pressable until both said yes, and says why', /disabled=\{busy \|\| Boolean\(pairGate && !pairGate\.ready\)\}/.test(make) && /data-makewaits/.test(make));

const sql = read('supabase/pairs.sql');
ok('the ticks are columns the table can hold', /add column if not exists ok_a/.test(sql) && /add column if not exists ok_b/.test(sql));

if (failures) {
  console.error(`\ncheck:pairapprove — ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:pairapprove — a song made together waits for both yeses.');
