/**
 * Everything the Play Store needs from this side, held in place.
 *
 *   npm run check:playstore
 *
 * ── Why a check for a thing that happens once ────────────────────────────
 *
 * The owner's list, 7 October 2026: *"Registrasie op playstore."* The app that
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

for (const icon of ['public/icon-chip-192.png', 'public/icon-chip-512.png', 'public/icon-chip-512-maskable.png']) {
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

/* ── The wrapper's own settings agree with the site's ──────────────────
   `android/twa-manifest.json` is what Bubblewrap builds the Android app
   from. It repeats the name, the colours and the icons, so it is held
   against the web manifest and `lib/brand.ts` here: a wrapper with last
   month's colour is a splash screen that flashes the wrong green. */
const TWA = 'android/twa-manifest.json';
ok('the Android wrapper\u2019s settings are in the repository', existsSync(TWA));
if (existsSync(TWA)) {
  const twa = JSON.parse(readFileSync(TWA, 'utf8')) as Record<string, unknown>;
  const brand = readFileSync('app/lib/brand.ts', 'utf8');
  const bar = (brand.match(/BAR_COLOUR = '(#[0-9a-fA-F]{6})'/) ?? [])[1];
  const ground = (manifest.match(/background_color: '(#[0-9a-fA-F]{6})'/) ?? [])[1];
  const name = (brand.match(/APP_NAME = '([^']+)'/) ?? [])[1];
  const short = (brand.match(/APP_SHORT = '([^']+)'/) ?? [])[1];
  ok('  same name and launcher name as the site', twa.name === name && twa.launcherName === short,
    `${String(twa.name)} / ${String(twa.launcherName)} against ${name} / ${short}`);
  ok('  same bar colour and ground', twa.themeColor === bar && twa.navigationColor === bar && twa.backgroundColor === ground,
    `${String(twa.themeColor)}, ${String(twa.backgroundColor)} against ${bar}, ${ground}`);
  ok('  the icons it asks for are the ones the site serves',
    ['iconUrl', 'maskableIconUrl'].every((key) => existsSync(`public/${String(twa[key]).split('/').pop()}`)));
  ok('  Google Play Billing is switched on in it, or the buy buttons cannot reach Play',
    (twa.features as { playBilling?: { enabled?: boolean } } | undefined)?.playBilling?.enabled === true);
/* Bubblewrap refuses to build Play Billing without notification delegation:
   "Play Billing requires enableNotifications to be true" (31 October 2026,
   the first build on GitHub's machines). */
ok('  and notifications are delegated, which Play Billing needs to build at all',
  (twa as { enableNotifications?: boolean }).enableNotifications === true);
/* And Android 7 or newer: the browser helper declares minSdk 24 (billing 23), and the
   build refuses a project that asks for less (the same first build). */
ok('  and the lowest Android it asks for is one its libraries run on (7, SDK 24)',
  Number((twa as { minSdkVersion?: number }).minSdkVersion) >= 24);
  ok('  and the keystore it signs with is never committed',
    /android\/\*\.keystore/.test(readFileSync('.gitignore', 'utf8')));
}

/* ── Label in the Play app: R899 and 450 credits (the owner, 28 October 2026)
   Google keeps VAT and its fee, so the same price carries fewer credits, and
   every card in the Play app shows Play's own price. */
{
  const { PLAY_TIER_CREDITS, planLineKey, viaPlay } = await import('../app/lib/playproducts.ts');
  const server = readFileSync('app/lib/server/credits.ts', 'utf8');
  ok('a Label bought in Play carries 450 credits a month, and the website’s stays as it is',
    PLAY_TIER_CREDITS.label === 450 && PLAY_TIER_CREDITS.maker === undefined && PLAY_TIER_CREDITS.studio === undefined
    && viaPlay('play:GPA.1') && !viaPlay('paystack:abc'));
  ok('  and the monthly grant reads where the plan was bought',
    /export async function monthlyOf/.test(server) && /p_amount: monthlyAmount/.test(server) && /viaPlay\(/.test(server));
  ok('  and the Play app’s cards say 450 and show Play’s own price',
    planLineKey('label', 0, true) === 'plan.label.play.0' && planLineKey('label', 0, false) === 'plan.label.inc.0'
    && ['app/page.tsx', 'app/components/Landing.tsx', 'app/components/Account.tsx'].every((f) => /usePlayPrices\(\)/.test(readFileSync(f, 'utf8')) && /priceShown\(/.test(readFileSync(f, 'utf8'))));
}

if (bad) {
  console.error(`\ncheck:playstore — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:playstore — the manifest, the icons and the asset links are what a'
  + ' store build reads, and the fingerprint is a variable rather than a commit.',
);
