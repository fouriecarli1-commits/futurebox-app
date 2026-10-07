/**
 * Everything the Play Store needs from this side, held in place.
 *
 *   npm run check:playstore
 *
 * ── Why a check for a thing that happens once ────────────────────────────
 *
 * Carli's list, 7 October 2026: *"Registrasie op playstore."* The app that
 * goes on Google Play is this website in a wrapper — a Trusted Web Activity —
 * and what it is built from is the manifest, the icons and one file under
 * `/.well-known`. None of those is read by anything in day-to-day use, which
 * is exactly why they rot: a start page moves, an icon is replaced, somebody
 * tidies a field away, and nobody notices until a store submission is
 * rejected weeks later with a message about `assetlinks`.
 *
 * `docs/PLAY-STORE.md` is the rest of it — the listing text, the data safety
 * answers, the content rating — and that is a document because a person fills
 * those in, once, in a web form.
 */
import { readFileSync, existsSync } from 'node:fs';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const manifest = readFileSync('app/manifest.ts', 'utf8');

/* ── The four fields a store needs and a browser shrugs at ───────────── */

ok('the app has an id of its own, not its start page',
  /\bid:\s*'/.test(manifest),
  'left out, `id` defaults to `start_url` — so the day the start page moves,'
  + ' every installed copy becomes a second, different app');
ok('  and a scope, so a supplier’s page cannot open inside the app',
  /\bscope:\s*'/.test(manifest),
  'without it a link out opens in the installed window with no address bar and'
  + ' no way back, which is the worst screen this app can show');
ok('  and it is not locked upright',
  /orientation:\s*'any'/.test(manifest),
  'the cutting room and the booth both rebuild themselves for a phone held'
  + ' sideways, and locking the app upright throws that away');
ok('  and it says what it is and in what language',
  /categories:\s*\[/.test(manifest) && /\blang:\s*'/.test(manifest));

/* ── The icons a store will not accept the absence of ────────────────── */

for (const icon of ['public/icon-192.png', 'public/icon-512.png']) {
  ok(`${icon} is really there`, existsSync(icon),
    'the manifest names it, and a manifest naming an icon that is not served'
    + ' is a failed install with a message about nothing in particular');
}
ok('  and one of them is declared maskable',
  /purpose:\s*'maskable'/.test(manifest),
  'without a maskable icon Android puts the square one inside a white circle,'
  + ' which is how an app looks when nobody bothered');

/* ── The file that decides whether it looks like an app ──────────────── */

const LINKS = 'app/.well-known/assetlinks.json/route.ts';
ok('the Android asset links are served', existsSync(LINKS),
  'without it every screen of the installed app has a browser address bar'
  + ' across the top saying which website you are really looking at');
if (existsSync(LINKS)) {
  const links = readFileSync(LINKS, 'utf8');
  ok('  from the environment, never typed into the code',
    /process\.env\.ANDROID_CERT_SHA256/.test(links)
    && /process\.env\.ANDROID_PACKAGE/.test(links)
    && !/[0-9A-F]{2}(:[0-9A-F]{2}){10,}/i.test(links),
    'the fingerprint is the certificate Google signs her app with: it does'
    + ' not exist until the app is created in the Play Console, and typed in'
    + ' it is a commit every time Play rotates a key');
  ok('  and it answers with an empty list rather than a 404 before she sets it',
    /* A 404 RETURNED, not the number mentioned. The route's own comment
       explains why it does not 404, which the first version of this read as
       a 404 — a check that cannot tell an explanation from the thing it
       explains. */
    /: \[\];/.test(links) && !/status:\s*404/.test(links),
    'the absence of this file and an empty one mean different things to the'
    + ' verifier; a 404 reads as a site that has not thought about it');
  ok('  and it allows more than one fingerprint',
    /\.split\(','\)/.test(links),
    'a key rotation has two live fingerprints for a while, and an app that'
    + ' can only hold one is an app that breaks in the middle of one');
}

/* ── And the two things the store form asks for that must already exist ─ */

ok('there is a privacy page to give the store the address of',
  existsSync('app/privacy/page.tsx'),
  'the listing cannot be submitted without a public privacy policy URL');
ok('  and a way for somebody to delete their account',
  existsSync('app/components/DeleteAccount.tsx'),
  'Google requires an in-app route to account deletion for any app with'
  + ' accounts, and a published web address for it');

ok('the written answers for the listing are in the repository',
  existsSync('docs/PLAY-STORE.md'),
  'the listing text, the data safety answers and the content rating are'
  + ' things a person fills in once, and a person needs them written down');

if (bad) {
  console.error(`\ncheck:playstore — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:playstore — the manifest, the icons and the asset links are what a'
  + ' store build reads, and the fingerprint is a variable rather than a commit.',
);
