/**
 * A busy voice service is asked again; a refusal is not.
 *
 * ElevenLabs' support to the owner, 20 October 2026: they throttle by how
 * many requests are in flight at once, and past their queue answer 429
 * `too_many_concurrent_requests` — or `system_busy` under load on their side,
 * "which usually resolves on retry". `send` in `lib/server/suppliers.ts` asks
 * those two again, a little later each time, and hands every other 429 (out
 * of credits) straight back. This runs the real door against a fake supplier
 * and counts what reached it.
 */
process.env.ELEVENLABS_API_KEY = 'test-key';
const { call } = await import('../app/lib/server/suppliers');
const { complain } = await import('../app/lib/server/eleven');

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};

const busy = (status: string): Response => new Response(
  JSON.stringify({ detail: { status, message: 'busy' } }),
  { status: 429, headers: { 'retry-after': '0.01', 'current-concurrent-requests': '5', 'maximum-concurrent-requests': '5' } },
);
const fine = (): Response => new Response('{}', { status: 200 });
const broke = (): Response => new Response(JSON.stringify({ detail: { status: 'quota_exceeded', message: 'out' } }), { status: 429 });

let asked = 0;
let answers: Array<() => Response> = [];
globalThis.fetch = (async () => { const next = answers[asked] ?? fine; asked += 1; return next(); }) as typeof fetch;
const warned: string[] = [];
const was = console.warn;
console.warn = (line: unknown) => { warned.push(String(line)); };

asked = 0; answers = [() => busy('too_many_concurrent_requests'), () => busy('system_busy'), fine];
let got = await call('speak', '/v1/text-to-speech/x', { method: 'POST', body: '{}' });
ok('busy twice, then fine: the member gets the song', got.status === 200 && asked === 3, `status ${got.status}, asked ${asked}`);

asked = 0; answers = [() => busy('too_many_concurrent_requests'), () => busy('too_many_concurrent_requests'), () => busy('too_many_concurrent_requests'), fine];
got = await call('music', '/v1/music', { method: 'POST', body: '{}' });
ok('it gives up after three tries rather than holding the request open', got.status === 429 && asked === 3, `asked ${asked}`);
ok('  and says busy, not out of credits', /very busy/.test((await complain(got)).message));

asked = 0; answers = [broke, fine];
got = await call('speak', '/v1/text-to-speech/x', { method: 'POST', body: '{}' });
ok('out of credits is not asked again — waiting does not fix it', got.status === 429 && asked === 1, `asked ${asked}`);
ok('  and still says credits', /credits/.test((await complain(got)).message));

asked = 0; answers = [() => busy('system_busy'), fine];
const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('x')); c.close(); } });
got = await call('speak', '/v1/text-to-speech/x', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
ok('a body that cannot be sent twice is not sent twice', asked === 1, `asked ${asked}`);

ok('a request at the ceiling is written to the log with its capability',
  warned.some((line) => /"capability":"(speak|music)"/.test(line) && /"inFlight":5/.test(line)));
console.warn = was;

if (failures) {
  console.error('\ncheck:elevenbusy — a busy supplier must be asked again a few times; a refusal must not.\n');
  process.exit(1);
}
console.log('\ncheck:elevenbusy — busy is retried, refusal is not, and the ceiling is logged.');
