/**
 * check:cubedhost — the Cubed³ presenter registration keeps its promises.
 *
 * The owner, 21 October 2026, asked for a registration page for the people
 * who present Cubed³ classes: reached by a link, landing on her side, with
 * the details for the legal document, terms that scroll and an agree tick, a
 * sign pad, the five steps with upload blocks, and the expectations after
 * them. And earlier, standing: the split between her and a presenter is never
 * shown on a page.
 *
 * What this holds:
 *   1. No share, percentage or split appears anywhere a presenter reads.
 *   2. The terms say every recording is in English and Afrikaans, unless the
 *      presenter speaks English only.
 *   3. The key in a link is kept only as a hash, travels after the `#`, and a
 *      route finds its row by it.
 *   4. Nothing is uploaded before the agreement is signed, and a signature is
 *      refused against terms the presenter did not see.
 *   5. The steps are the ones she listed: an ice breaker of five questions,
 *      the three sessions, and an upload block for everything recorded.
 *   6. An identity number is checked properly, and nobody under 18 signs.
 *   7. The signature pad is one component, and it takes a picture of a
 *      signature as well as a drawn or typed one.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import {
  PHOTO_USES, PROCESS, SLOTS, STEPS, TEASERS, TERMS, TERMS_VERSION, cleanDetails, problemsWith, saIdOk,
} from '../app/lib/cubedhost.ts';
import { CLASSES_IN_A_SERIES } from '../app/lib/cubed.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};
const code = (path: string): string => withoutComments(readFileSync(path, 'utf8'));

/* ── 1. No split ── */
const READ = [
  'app/lib/cubedhost.ts', 'app/components/CubedHost.tsx', 'app/components/CubedHosts.tsx',
  'app/api/cubed/host/route.ts', 'app/api/cubed/hosts/route.ts',
];
/* Two ways a split could reach a presenter: the numbers `lib/cubed.ts` keeps
   for the written offer, imported into a page or a route; or a share typed
   into the words they read. Both are looked for. */
const imported = READ.filter((file) => /GUEST_SHARE|HOUSE_SHARE|guestRand|splitAsSaid|GUEST_TERMS/.test(code(file)));
ok('no presenter page or route reads the split kept for the written offer', imported.length === 0, imported.join(', '));
const words = [
  ...TERMS.flatMap((clause) => [clause.title, ...clause.body]),
  ...STEPS.flatMap((step) => [step.title, step.intro, ...(step.script ?? []), ...(step.questions ?? []),
    ...(step.sessions ?? []).flatMap((one) => [one.title, one.opener, ...one.points])]),
  ...PROCESS.map((one) => `${one.title} ${one.body}`), ...TEASERS.map((one) => `${one.title} ${one.body}`),
].join('\n');
const quoted = /\d+\s*%|per\s*cent|percent|\bsixty\b|\bforty\b|60\s*\/\s*40|\bsplit\b/i.exec(words);
ok('  and no share or percentage is written into anything a presenter reads', !quoted,
  `${quoted?.[0]} — the owner: "Die Cubed classes kan nie die winsverdeling wys"`);
const terms = TERMS.flatMap((clause) => [clause.title, ...clause.body]).join('\n');
ok('  the terms point to the written offer for the fee instead', /written offer/.test(terms) && /share of what the class earns/.test(terms));

/* ── 2. Languages ── */
ok('the terms say every recording is made in English and in Afrikaans', /recorded twice, once in each language/.test(terms) && /English and in Afrikaans/.test(terms));
ok('  unless the presenter has said they speak English only', /English only/.test(terms) && /records in English only/.test(terms));

/* ── 3. The key ── */
const server = code('app/lib/server/cubedhost.ts');
const host = code('app/api/cubed/host/route.ts');
const owner = code('app/api/cubed/hosts/route.ts');
ok('a link carries its key after the #, which no server sees', /\/cubed\/host#k=\$\{key\}/.test(server));
ok('  the table keeps only its hash', /key_hash: hashKey\(key\)/.test(owner) && !/key_hash: key\b/.test(owner) && /createHash\('sha256'\)/.test(server));
ok('  and the presenter route finds its row by that hash', /hostFrom\(request, client\)/.test(host) && /\.eq\('key_hash', hashKey\(key\)\)/.test(server));
ok('  every file path a presenter can touch starts with their own row', /`\$\{row\.id\}\/\$\{slot\.id\}\//.test(host) && /id !== row\.id/.test(host));
ok('the owner side is behind the owner’s door', /const door = await opened\(request\)/.test(owner) && (owner.match(/await opened\(request\)/g) ?? []).length >= 4);

/* ── 4. Signing before uploading ── */
const uploadAt = host.indexOf('createSignedUploadUrl');
const guardAt = host.lastIndexOf("'sign_first'", uploadAt);
ok('nothing is uploaded before the agreement is signed', uploadAt > 0 && guardAt > 0 && guardAt < uploadAt);
ok('a signature against terms the presenter did not see is refused', /ask\.terms !== TERMS_VERSION/.test(host) && /terms_version: TERMS_VERSION/.test(host));
ok('  and the terms say which version they are', terms.includes(`Terms version ${TERMS_VERSION}`));
ok('an address a signature came from is kept only as a salted hash', /signed_ip_hash: where\.ipHash/.test(host) && /addressKey\(address\)/.test(server));

/* ── 5. The steps ── */
const ice = STEPS.find((step) => step.n === 2);
ok('the ice breaker is five questions', ice?.questions?.length === 5, String(ice?.questions?.length));
ok('  about school, a favourite teacher, a secret, a hidden talent and a great adventure',
  /primary school and high school/.test(ice?.questions?.join(' ') ?? '') && /favourite teacher/.test(ice?.questions?.join(' ') ?? '')
  && /secret/.test(ice?.questions?.join(' ') ?? '') && /hidden talent/.test(ice?.questions?.join(' ') ?? '') && /adventure/.test(ice?.questions?.join(' ') ?? ''));
const sessions = STEPS.find((step) => step.n === 3)?.sessions ?? [];
ok(`the class is ${CLASSES_IN_A_SERIES} sessions: what it is, how it is done, what is next`,
  sessions.length === CLASSES_IN_A_SERIES && /What is this course/.test(sessions[0]?.title ?? '') && /How is it done/.test(sessions[1]?.title ?? '') && /What is next/.test(sessions[2]?.title ?? ''));
ok('  and each session opens with an introduction to itself', sessions.every((one) => /session (one|two|three)/i.test(one.opener)));
ok('step 1 has an English welcome script', (STEPS[0]?.script?.length ?? 0) >= 5 && /welcome to my Cubed³ class/i.test(STEPS[0]?.script?.join(' ') ?? ''));
ok('step 5 closes with a quote and a goodbye', /live by/.test(STEPS[4]?.script?.join(' ') ?? '') && /Goodbye/.test(STEPS[4]?.script?.join(' ') ?? ''));
const used = new Set([...STEPS.flatMap((step) => step.slots), 'teasers', 'photos']);
ok('every recording has an upload block, and every block belongs to something', SLOTS.every((slot) => used.has(slot.id)) && [...used].every((id) => SLOTS.some((slot) => slot.id === id)));
const page = code('app/components/CubedHost.tsx');
ok('  the teasers and the six photographs each have one on the page', /<Upload slot="teasers"/.test(page) && /<Upload slot="photos"/.test(page) && SLOTS.find((one) => one.id === 'photos')?.most === 6);
ok('the terms box has to be read to the end before it can be agreed to', /setReadAll\(true\)/.test(page) && /disabled=\{!readAll\}/.test(page));
ok('the presenter ticks whether they record and edit themselves', /choice\('recordSelf'/.test(page) && /choice\('editSelf'/.test(page));
ok('the class page itself is always among the places a photograph may be used', PHOTO_USES[0]?.id === 'app' && PHOTO_USES[0]?.required === true
  && cleanDetails({ photoUses: [] }).photoUses.includes('app'));

/* ── 6. Identity and age ── */
ok('a real South African identity number passes', saIdOk('8001015009087'));
ok('  and one digit wrong does not', !saIdOk('8001015009088') && !saIdOk('800101500908'));
const young = problemsWith(cleanDetails({ birthDate: '2015-01-01' }), new Date('2026-10-21T00:00:00Z'));
ok('nobody under 18 can sign', /18 or older/.test(young.birthDate ?? ''));

/* ── 7. The pad ── */
const pdf = code('app/components/PdfRoom.tsx');
const pad = code('app/components/SignaturePad.tsx');
ok('the PDF room and the agreement use one signature pad', /import SignaturePad from '\.\/SignaturePad'/.test(pdf) && !/function SignaturePad/.test(pdf) && /import SignaturePad/.test(page));
ok('  and it takes a picture of a signature, with the paper taken out', /'upload'/.test(pad) && /withoutPaper\(c, W, H\)/.test(pad));

if (bad) {
  console.error(`\ncheck:cubedhost — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:cubedhost — presenters register by a key only they hold, sign before they upload, read no split, and record in both languages unless they speak English only.');
