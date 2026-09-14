/**
 * A song's words are paid for once.
 *
 * ── The regression this exists for ───────────────────────────────────────
 *
 * Carli, 14 September 2026: *"As hy een keer geluister het moet hy die woorde
 * stoor op die liedjie en dit hou. Mens kan nie oor en oor met krediete
 * betaal nie."*
 *
 * She was right and it was mine, from earlier the same night. Writing a
 * brought-in song's heard words onto its row was the correct fix for a
 * different complaint — the card went on offering "Get the words" for a song
 * already paid for — and it silently changed which rung the SECOND press
 * takes:
 *
 *     exactFor: track.lyrics ? alignedFor(...) : heardFor(...)
 *
 * Before, an upload had no lyrics, so press two went to `heardFor` and got
 * the remembered transcription for nothing. After, the upload HAS lyrics, so
 * press two goes to `alignedFor` — which recognises only a remembered
 * `aligned` answer, does not see the `heard` one sitting beside it, and pays
 * to align words whose timings are already on the device.
 *
 * ── Why this is a real test and not a source grep ────────────────────────
 *
 * Because the claim is about MONEY and about behaviour over two presses, and
 * neither is visible in the shape of the code. So the calls are counted, and
 * the count is the assertion.
 *
 * ── The first version of this check was green and proved nothing ─────────
 *
 * Written down because it is the same fault as the bug. It passed the
 * counting fetcher to `heardFor` and then called `exactFor`, and counted
 * transcription calls — while the leak being hunted is an ALIGNMENT call.
 * Taking the fix away left it green: `alignedFor` went out to `/api/align`
 * with its own default fetcher, the counter never saw it, and `heardFor`
 * then returned the cached answer so even the words came back right.
 *
 * A check that measures a subset and reports a verdict on the whole. So it
 * counts every request this module makes, at `globalThis.fetch`, by URL —
 * which is the claim as she stated it: pressing it again must not spend
 * anything, not "must not spend anything at the one endpoint I was thinking
 * about".
 */

import { exactFor } from '../app/lib/lyrictime';
import type { Track } from '../app/lib/library';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* `lyrictime` reaches for localStorage, which Node has no notion of. A plain
   object behind the three methods it uses is the whole of what it needs, and
   it keeps the test honest: the cache really is written and really is read
   back, rather than being stubbed away. */
const store: Record<string, string> = {};
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string): string | null => store[key] ?? null,
      setItem: (key: string, value: string): void => { store[key] = value; },
      removeItem: (key: string): void => { delete store[key]; },
    },
  },
});

const song = (over: Partial<Track>): Track => ({
  id: 'song-1', title: 'A song', genre: 'pop', bpm: 100, key: 'C',
  lyrics: '', style: '', models: [], source: 'upload', seconds: 60,
  createdAt: new Date().toISOString(), seed: 1, ...over,
} as Track);

const audio = new Blob([new Uint8Array(16)]);

/**
 * Every request this module makes, counted by where it went.
 *
 * At `globalThis.fetch` rather than at either rung's injectable fetcher: the
 * two rungs are exactly what must not be counted separately, because the bug
 * was one rung quietly taking over from the other.
 */
const asked: Record<string, number> = {};
const heardWords = ['sjuut', 'luister', 'hier'];
globalThis.fetch = (async (input: RequestInfo | URL): Promise<Response> => {
  const url = String(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  const where = url.includes('/api/align') ? 'align' : url.includes('/api/transcribe') ? 'transcribe' : 'other';
  asked[where] = (asked[where] ?? 0) + 1;
  /* Both endpoints answer in the same shape, and both are answered so that a
     leak shows up as a COUNT rather than as a failure that hides it. */
  return new Response(
    JSON.stringify({ words: heardWords.map((text, at) => ({ text, start: at, end: at + 1 })) }),
    { headers: { 'content-type': 'application/json' } },
  );
}) as typeof fetch;

const spent = (): number => (asked.align ?? 0) + (asked.transcribe ?? 0);

/* ── A brought-in song: heard once, then free ──────────────────────────── */
{
  const upload = song({ id: 'brought-in', lyrics: '' });

  const first = await exactFor(upload, audio);
  ok('a brought-in song can be listened to', first.lines.length > 0, `${first.lines.length} lines`);
  ok('  and that costs one call', spent() === 1, JSON.stringify(asked));

  /* The words are now on the row, which is what the Channel writes after a
     successful listen. THAT is what used to change the rung, and the second
     press then paid at the OTHER endpoint. */
  const named = song({ id: 'brought-in', lyrics: first.lines.map((one) => one.text).join('\n') });
  const again = await exactFor(named, audio);
  ok('asking again gives the same words back', again.lines.length === first.lines.length,
    `${again.lines.length} against ${first.lines.length}`);
  ok('  and costs nothing at any endpoint', spent() === 1, JSON.stringify(asked));
}

/* ── A made song with a sheet: aligned once, then free ─────────────────── */
{
  const before = spent();
  const withWords = song({ id: 'made-song', source: 'engine', lyrics: 'one\ntwo' });

  const first = await exactFor(withWords, audio);
  ok('a song with a sheet gets its words', first.lines.length > 0, `${first.lines.length} lines`);
  ok('  and that costs one call', spent() === before + 1, JSON.stringify(asked));

  await exactFor(withWords, audio);
  ok('and asking again costs nothing', spent() === before + 1, JSON.stringify(asked));
}

/* ── A song nobody has listened to still goes and asks ─────────────────── */
{
  const before = spent();
  const answer = await exactFor(song({ id: 'never-heard' }), audio);
  ok('a song with nothing remembered is still listened to',
    spent() === before + 1 && answer.lines.length > 0,
    `spent ${spent() - before}, got ${answer.lines.length} lines`);
}

if (failures) {
  console.error(
    '\ncheck:paidonce — a song whose words have been measured once must never be measured\n' +
      'again. Both rungs cache their own answer and neither recognises the other’s, so the\n' +
      'question has to be asked in exactFor, before either is reached.\n',
  );
  process.exit(1);
}
console.log('\ncheck:paidonce — a song is listened to once, and asking again spends nothing.');
