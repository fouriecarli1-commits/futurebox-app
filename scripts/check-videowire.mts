/**
 * What ElevenLabs' own Image & Video documentation says, held against the code.
 *
 * ── Where this comes from ────────────────────────────────────────────────
 *
 * Carli sent the Image & Video quickstart on 10 September 2026, along with
 * support's answer about Seedance. Until then this repository read the wire
 * format off the SDK's serialisers and said so — several comments in
 * `lib/server/video/eleven.ts` are careful to mark what was inferred rather
 * than read. The documentation settles some of it, and a settled fact that
 * lives only in a chat message is one that drifts back out of the code.
 *
 * Two of the things it settles were wrong here, and one of them cost money on
 * every clip.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (label: string, good: boolean, detail = ''): void => {
  console.log(`${good ? '  ok  ' : '  FAIL'} ${label}${detail && !good ? ` — ${detail}` : ''}`);
  if (!good) failures += 1;
};

/** Comments out, so an assertion cannot be satisfied by a sentence about it. */
const code = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

/* ── 1. The poll intervals they ask for ─────────────────────────────────

   "Video: poll no more than once every 10 seconds." And: "Sustained
   aggressive polling can return 429 responses."

   `Presenter.tsx` polled every four seconds — two and a half times too fast.
   Every one of those asks is a Vercel invocation *and* a call to ElevenLabs,
   so impatience was billed twice and bought nothing: a generation's status
   does not change sooner because it was asked twice. */
const VIDEO_MS = 10_000;
const POLLERS = ['app/components/Presenter.tsx', 'app/lib/engines.ts'] as const;

for (const file of POLLERS) {
  const source = code(readFileSync(file, 'utf8'));
  if (!/\/api\/video\?id=/.test(source)) {
    ok(`${file} still polls the video route`, false, 'this check is watching a file that no longer polls');
    continue;
  }
  /* Only the timers that actually pace a loop. An abort timer is a deadline,
     not a poll, and holding it to ten seconds would be nonsense — so the
     match is on the shape a wait takes: `setTimeout(fn, N)` inside a promise
     that something awaits. */
  const waits = [...source.matchAll(/setTimeout\(\s*\w+\s*,\s*([\d_]+)\s*\)/g)]
    .map((one) => Number(one[1].replace(/_/g, '')))
    .filter((one) => one < 300_000);
  const quickest = waits.length ? Math.min(...waits) : Number.POSITIVE_INFINITY;
  ok(`${file} waits at least ${VIDEO_MS / 1000}s between asks`,
    quickest >= VIDEO_MS,
    `quickest wait is ${quickest}ms — their guidance is ${VIDEO_MS}ms for video`);
}

/* And the back-off they ask for by name: "doubling the interval up to about a
   minute keeps a slow generation from turning into hundreds of requests". */
const presenter = code(readFileSync('app/components/Presenter.tsx', 'utf8'));
ok('the presenter backs off as a clip runs long, rather than asking at one pace',
  /wait = Math\.min\(wait \* 2, 60_000\)/.test(presenter),
  'a clip that takes eight minutes is asked about forty-eight times at one pace');

/* ── 2. Veo's allowed values ────────────────────────────────────────────

   From their model table, for both veo-3.1 ids: duration_secs 4, 6 or 8;
   aspect_ratio 16:9 or 9:16; resolution 720p, 1080p or 4K. And, above the
   table: "Unknown fields are rejected rather than ignored" — so a value
   outside these is a validation error, not a silent substitution.

   The code already declared exactly this. Asserted so it stays that way: the
   temptation, the next time somebody wants a longer clip, is to add 10 to the
   list and find out at the member's expense. */
const engine = code(readFileSync('app/lib/server/video/eleven.ts', 'utf8'));
const veo = engine.slice(engine.indexOf('export const veo'));
ok('Veo is offered at 4, 6 and 8 seconds, which is all it takes',
  /seconds: \[4, 6, 8\]/.test(veo),
  'a length Veo refuses is a button that charges and then fails');
ok('and wide or tall only, because it has no square',
  /aspects: \['16:9', '9:16'\]/.test(veo));
ok('and asked for a resolution it declares',
  /veo: \{ aspects: \[[^\]]*\], resolution: '(720p|1080p|4K)' \}/.test(engine),
  'the resolution sent is not one of the three Veo lists');

/* ── 3. Seedance, settled ───────────────────────────────────────────────

   ElevenLabs support, 10 September 2026: "Seedance models are available via
   API for Enterprise customers... it won't be available for your subscription
   tier (Pro)."

   The flag stays and stays off. What must not happen is somebody reading the
   old instruction — "set it, make one clip, and unset it if the request comes
   back refused" — and paying for a clip that cannot succeed. */
ok('Seedance still needs its flag, so a Pro workspace cannot reach it by accident',
  /ELEVEN_SEEDANCE_READY === '1'/.test(engine));

for (const [file, what] of [
  ['.env.example', 'the file she edits'],
  ['docs/SWITCH-ON.md', 'the page she follows'],
] as const) {
  const doc = readFileSync(file, 'utf8');
  ok(`${what} says Seedance is Enterprise-only`,
    /Enterprise/.test(doc) && /Seedance/.test(doc),
    'it still reads as a question waiting on an answer');
  ok(`and no longer tells her to set it and try`,
    !/set it, make one clip, and unset it again if the request comes back refused/.test(doc) ||
      /Do not/.test(doc),
    'the old instruction is still standing, and following it costs money for a certain failure');
}

if (failures) {
  console.error(`\ncheck:videowire — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log("\ncheck:videowire — the video engine is asked at their pace, in their values, for a model this plan has.");
