/**
 * The app signs in to Google with its service account — and only when it has one.
 *
 * Lyria answered the owner's test on 21 October 2026 with "401 — API keys are
 * not supported by this API". `lib/server/googleauth.ts` makes the token from
 * a key file instead. This makes a throwaway key pair, checks that the signed
 * request verifies against it and asks for the right scope, that the token is
 * traded for once and reused, that every pasted shape of the file is read, and
 * that without one the API key still goes out as before.
 */
import crypto from 'node:crypto';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const file = { type: 'service_account', client_email: 'futurebox-lyria@test-project.iam.gserviceaccount.com', private_key: pem, token_uri: 'https://oauth2.googleapis.com/token' };

process.env.GOOGLE_VERTEX_KEY = 'the-api-key';
delete process.env.GOOGLE_SERVICE_ACCOUNT;
const auth = await import('../app/lib/server/googleauth.ts');

ok('no account: the API key goes out as before', JSON.stringify(await auth.interactionsAuth()) === JSON.stringify({ 'x-goog-api-key': 'the-api-key' }));

process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify(file);
ok('the key file is read as pasted', auth.serviceAccount()?.client_email === file.client_email);
process.env.GOOGLE_SERVICE_ACCOUNT = Buffer.from(JSON.stringify(file)).toString('base64');
ok('and as base64', auth.serviceAccount()?.client_email === file.client_email);
process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify({ ...file, private_key: pem.replace(/\n/g, '\\n') });
ok('and with its line breaks flattened to "\\n" by a form', auth.serviceAccount()?.private_key.includes('\n-----END') === true);
process.env.GOOGLE_SERVICE_ACCOUNT = '{"not":"a key file"}';
ok('something that is not a key file is not an account', auth.serviceAccount() === null);

process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify(file);
const jwt = auth.assertionFor(auth.serviceAccount()!, 1_000_000);
const [head, claims, signature] = jwt.split('.');
const verifier = crypto.createVerify('RSA-SHA256');
verifier.update(`${head}.${claims}`);
ok('the signed request verifies against the account\'s own key', verifier.verify(publicKey, Buffer.from(signature, 'base64url')));
const said = JSON.parse(Buffer.from(claims, 'base64url').toString());
ok('it asks for the cloud-platform scope, for an hour, as the account', said.scope === 'https://www.googleapis.com/auth/cloud-platform'
  && said.exp - said.iat === 3600 && said.iss === file.client_email && said.aud === file.token_uri);

let traded = 0;
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  if (String(url).includes('oauth2.googleapis.com/token')) {
    traded += 1;
    const body = new URLSearchParams(String(init?.body ?? ''));
    if (body.get('grant_type') !== 'urn:ietf:params:oauth:grant-type:jwt-bearer' || !body.get('assertion')) return new Response('{}', { status: 400 });
    return Response.json({ access_token: 'ya29.test-token', expires_in: 3599, token_type: 'Bearer' });
  }
  return new Response('{}', { status: 404 });
}) as typeof fetch;

const first = await auth.interactionsAuth();
const second = await auth.interactionsAuth();
ok('with an account, the call carries a bearer token', first.Authorization === 'Bearer ya29.test-token' && !('x-goog-api-key' in first));
ok('and the token is traded for once, then reused', traded === 1 && second.Authorization === first.Authorization, `traded ${traded}`);

if (failures) {
  console.error(`\ncheck:googleauth — ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:googleauth — the app signs in to Google with its own account when it has one.');
