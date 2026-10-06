/**
 * The TONE3000 sign-in, executed rather than read.
 *
 * ── Why this one runs the code ───────────────────────────────────────────
 *
 * Everything it holds is the kind of thing that compiles, looks right, and
 * is wrong in a way nobody sees until somebody's account is involved:
 *
 *   A PKCE challenge is a hash. A hash with one wrong character in its
 *   base64url is still a string, still the right length, and fails only at
 *   the far end with "invalid_grant" — which reads as their fault.
 *
 *   A state check that is written but not reached is the same as no state
 *   check. The whole of its value is that it happens BEFORE anything else in
 *   the redirect is believed.
 *
 *   And their three-way cancel. Pressing close returns `canceled=true`
 *   instead of a tone, and a code may still be there. An app that sees
 *   `canceled` and returns throws away a valid authorisation and asks her to
 *   sign in again tomorrow. There is no way to see that by reading.
 *
 * So the rules below call the functions. `check:seam` holds where the
 * credentials live; this holds whether the handshake is right.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { withoutComments } from './prose.mts';
import { cameBack, pkce, renewWith, selectUrl, tradeFor, WANTS } from '../app/lib/server/tone3000';
import { captureWith } from '../app/lib/server/tone3000session';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

/* ── PKCE ──────────────────────────────────────────────────────────────── */

const a = pkce();
const b = pkce();

ok('a verifier is fresh every time',
  a.verifier !== b.verifier && a.state !== b.state,
  'two flows sharing a verifier means the second one can complete the'
  + " first one's authorisation");

ok('  and it is a legal length',
  a.verifier.length >= 43 && a.verifier.length <= 128,
  `${a.verifier.length} characters — RFC 7636 says 43 to 128`);

ok('  and carries only unreserved characters',
  /^[A-Za-z0-9\-._~]+$/.test(a.verifier) && /^[A-Za-z0-9\-._~]+$/.test(a.challenge),
  'a `+` or a `/` survives the URL and dies at the far end as'
  + ' invalid_grant, which reads as their fault');

/* The arithmetic itself, done the other way round. A challenge that is
   simply "some base64url string" passes every shape rule above and still
   fails, so it is recomputed here from the verifier and compared. */
const expected = createHash('sha256').update(a.verifier).digest('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
ok('  and the challenge really is the hash of the verifier',
  a.challenge === expected,
  `${a.challenge.slice(0, 12)}… against ${expected.slice(0, 12)}…`);

/* ── The address she is sent to ────────────────────────────────────────── */

const url = new URL(selectUrl({
  clientId: 'pk_test', redirectUri: 'https://futurebox.studio/cb', pkce: a, locale: 'af',
}));
const q = url.searchParams;

ok('the flow asked for is the one that needs no browser of ours',
  q.get('prompt') === 'select_tone',
  'Select is why this integration is small: they build the tone browser,'
  + ' and their own documentation recommends it over the search endpoint,'
  + ' which is heavily rate limited');

ok('  with the method and the challenge they require',
  q.get('response_type') === 'code' && q.get('code_challenge_method') === 'S256'
  && q.get('code_challenge') === a.challenge && q.get('state') === a.state,
  'all four are required; a missing one is a redirect that never happens');

ok('  and the catalogue is narrowed to what this app can actually load',
  q.get('format') === WANTS.format && q.get('gears') === WANTS.gears,
  'offering a tone the room cannot load is a choice she makes and then'
  + ' cannot use');

ok('  with a way out of their screens, and a way to hear a tone first',
  q.get('menubar') === 'true' && q.get('preview') === 'true',
  'they recommend the first for in-app browsers; the second is not a'
  + ' nicety in an app about how things sound');

ok('  and her language, because they ignore the browser\'s',
  q.get('locale') === 'af',
  'their documentation says Accept-Language is ignored and the locale must'
  + ' be passed explicitly, so leaving it out shows her English');

ok('  and no locale is sent when we do not know it',
  !new URL(selectUrl({
    clientId: 'pk', redirectUri: 'https://x/cb', pkce: a,
  })).searchParams.has('locale'),
  'an empty locale is not the same as none, and unrecognised values fall'
  + ' back to English anyway');

/* ── The callback, which is where it goes quiet ────────────────────────── */

const back = (bits: Record<string, string>) => new URLSearchParams(bits);

ok('a chosen tone comes back as a chosen tone',
  JSON.stringify(cameBack(back({ state: 's', code: 'c', tone_id: '42' }), 's'))
    === JSON.stringify({ how: 'chose', code: 'c', toneId: '42' }));

ok('a state that does not match is refused before anything else is read',
  (() => {
    const out = cameBack(back({ state: 'other', code: 'c', tone_id: '42' }), 's');
    return out.how === 'refused' && out.why === 'state';
  })(),
  'a mismatched state means this redirect may not be ours, so nothing in it'
  + ' is worth believing — not the code, not the tone');

ok('  and so is a callback with no state at all',
  cameBack(back({ code: 'c' }), 's').how === 'refused');

ok('  and a wrong state is refused FOR the state, not for what it carries',
  (() => {
    const out = cameBack(
      back({ state: 'other', error: 'access_denied', canceled: 'true', code: 'c' }), 's');
    return out.how === 'refused' && out.why === 'state';
  })(),
  'this is the assertion above with teeth: if the error is read first, a'
  + ' stranger picks the reason we log and the branch we take. The answer has'
  + ' to be `state`, not whatever the redirect says went wrong');

ok('  and one we have no stored state for',
  cameBack(back({ state: 's', code: 'c' }), '').how === 'refused',
  'an empty expectation must not be satisfiable by an empty state');

ok('closing their window keeps the authorisation when she had signed in',
  JSON.stringify(cameBack(back({ state: 's', canceled: 'true', code: 'c' }), 's'))
    === JSON.stringify({ how: 'left', code: 'c' }),
  'this is the one that is easy to get wrong: seeing `canceled` and simply'
  + ' returning throws away a valid authorisation and asks her to sign in'
  + ' again tomorrow');

ok('  and keeps nothing when she had not',
  cameBack(back({ state: 's', canceled: 'true' }), 's').how === 'gone');

ok('  and a sign-in with no tone is not read as a choice',
  cameBack(back({ state: 's', code: 'c' }), 's').how === 'left',
  'the one thing it must never do is hand the room an empty tone id');

ok('their own error is passed on rather than swallowed',
  (() => {
    const out = cameBack(back({ state: 's', error: 'access_denied' }), 's');
    return out.how === 'refused' && out.why === 'access_denied';
  })());

/* ── The two bodies ────────────────────────────────────────────────────── */

const trade = tradeFor({ code: 'c', verifier: a.verifier, redirectUri: 'https://x/cb', clientId: 'pk' });
ok('the trade carries the verifier, which is the whole point of PKCE',
  trade.get('grant_type') === 'authorization_code'
  && trade.get('code_verifier') === a.verifier
  && trade.get('redirect_uri') === 'https://x/cb',
  'the redirect_uri has to match the one sent at the start or they refuse'
  + ' it, and that failure reads as a bad code');

ok('  and the renewal asks for a renewal',
  renewWith({ refresh: 'r', clientId: 'pk' }).get('grant_type') === 'refresh_token');

/* ── And no secret is anywhere near this file ──────────────────────────── */

const mine = withoutComments(readFileSync('app/lib/server/tone3000.ts', 'utf8'));
ok('nothing here reads a secret',
  !/process\.env/.test(mine) && !/t3k_cs_/.test(mine),
  'the publishable key is handed in and the secret belongs to the seam.'
  + ' This file is arithmetic, and arithmetic needs no credentials — which'
  + ' is also why it could be written and held before any exist');

/* ── Bringing the chosen capture back ──────────────────────────────────── */

/**
 * A stored zip, built by hand.
 *
 * Stored and not deflated, so the bytes are the file and this needs no
 * library. `unzip` in `server/zip.ts` is used by the stems route and by
 * this, and until now nothing executed it at all.
 */
function zipOf(name: string, body: string): Buffer {
  const nameBytes = Buffer.from(name, 'utf8');
  const data = Buffer.from(body, 'utf8');
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  crc = (crc ^ 0xFFFFFFFF) >>> 0;

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 6);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  central.writeUInt32LE(0, 42);

  const localPart = Buffer.concat([local, nameBytes, data]);
  const centralPart = Buffer.concat([central, nameBytes]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralPart.length, 12);
  end.writeUInt32LE(localPart.length, 16);
  return Buffer.concat([localPart, centralPart, end]);
}

const SIGNED = 'https://storage.example.test/t/abc.zip?sig=xyz';
const NAM = '{"version":"0.5.2","architecture":"WaveNet"}';
const asked: { url: string; auth: string | null }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  const where = String(url);
  asked.push({ url: where, auth: new Headers(init?.headers).get('authorization') });
  if (where.includes('/download')) {
    return new Response(JSON.stringify({ url: SIGNED, expires_at: 'later', filename: 'a.zip' }));
  }
  /* A view over the bytes, not the Buffer itself: TypeScript does not accept
     a Node Buffer as a BodyInit, and the sweep caught it where the app build
     did not — `check:types` reads scripts/ as well. */
  return new Response(new Uint8Array(zipOf('1234.nam', NAM)));
}) as typeof globalThis.fetch;

let brought: Awaited<ReturnType<typeof captureWith>>;
try {
  brought = await captureWith('HER-TOKEN', '42');
} finally {
  globalThis.fetch = realFetch;
}

ok('the chosen tone comes back as a capture the amp can load',
  brought.how === 'got' && brought.nam === NAM,
  JSON.stringify(brought).slice(0, 140));

ok('  and the tone is asked for with HER token',
  asked[0]?.auth === 'Bearer HER-TOKEN' && asked[0]?.url.includes('/tones/42/download'),
  'every call to them is on the member\'s own sign-in, never on an account'
  + ' key — there is no account key for this supplier');

ok('  and the signed link is fetched BARE',
  asked[1]?.url === SIGNED && asked[1]?.auth === null,
  'their own note beside that endpoint says no auth header is needed, and'
  + ' the link points at storage. A header here puts a member\'s TONE3000'
  + ' token on a host that is not TONE3000, and nothing downstream would'
  + ' complain. This is the assertion the whole two-door seam exists for');

ok('  and the files are asked for by id, not by name',
  asked[0]?.url.includes('filenames=id'),
  'a name inside that archive comes from whoever uploaded the tone: two can'
  + ' share one, and a name carrying ../ is zip-slip');

if (bad) {
  console.error(`\ncheck:tone3000 — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:tone3000 — the challenge is really the hash of the verifier, the'
  + ' state is checked before anything is believed, and all four ways back'
  + ' from their window are told apart.',
);
