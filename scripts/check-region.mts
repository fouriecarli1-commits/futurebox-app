/**
 * What currency a person is shown, and why.
 *
 * ── What went wrong ──────────────────────────────────────────────────────
 *
 * The You tab, in Afrikaans, on a phone: **"Jou plan — Label · $119.00 per
 * maand"**. A South African product quoting a South African reader in
 * dollars.
 *
 * Nothing was broken. `guessRegion()` tries the device timezone first, and
 * `TZ_TO_REGION` is a list written by hand; a zone that is not on it falls
 * through to `navigator.language`, which on that device was `en-US`. So the
 * app took a device default over the language the person had chosen inside
 * the app — and Afrikaans is spoken, in any number worth pricing for, in one
 * country.
 *
 * ── Why this check runs the function ─────────────────────────────────────
 *
 * A regex over `pricing.ts` would assert that the word `af` appears in it,
 * which is a claim about the source and not about what anybody is shown. The
 * fault here was an ORDER — three branches, and the wrong one answering
 * first — and an order is not something a pattern can see.
 *
 * So this stubs a browser and asks the real function, four times, for the
 * four cases that matter. The one that would have caught the bug is the
 * second. The fourth is the one that stops the fix going too far: a timezone
 * is real evidence and still beats a language.
 *
 * ── And that both callers pass it ────────────────────────────────────────
 *
 * `guessRegion` takes the language as an optional argument, so a caller that
 * forgets it compiles, runs, and quietly goes back to the old behaviour.
 * There are two callers and they are named here.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* A browser, as far as this function is concerned: a timezone and a language.
   Restored afterwards, because the checks run in one process and a leaked
   global is a check changing another check's answer. */
const realWindow = (globalThis as Record<string, unknown>).window;
const realNavigator = (globalThis as Record<string, unknown>).navigator;
const realIntl = globalThis.Intl;

function inABrowser(timeZone: string, language: string): void {
  (globalThis as Record<string, unknown>).window = {};
  /* Defined rather than assigned. Node 22 gives `globalThis.navigator` a
     getter and no setter, so `globalThis.navigator = …` throws where the
     obvious line would have worked in an older runtime. */
  Object.defineProperty(globalThis, 'navigator', {
    value: { language }, configurable: true, writable: true,
  });
  globalThis.Intl = {
    ...realIntl,
    DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone }) }),
  } as unknown as typeof Intl;
}

const { guessRegion } = await import('../app/lib/pricing.ts');

const CASES: readonly { what: string; tz: string; language: string; lang?: string; want: string }[] = [
  {
    what: 'a phone in Johannesburg is priced in rand',
    tz: 'Africa/Johannesburg', language: 'en-ZA', want: 'ZA',
  },
  {
    what: '  and so is one reading Afrikaans from a zone nobody listed',
    tz: 'Etc/Unknown', language: 'en-US', lang: 'af', want: 'ZA',
  },
  {
    what: '  while the same phone in English is not guessed at',
    tz: 'Etc/Unknown', language: 'en-US', want: 'US',
  },
  {
    /* New York is deliberately NOT in `TZ_TO_REGION` — the United States is
       the fall-through, so no American zone is listed. That is exactly what
       made the first version of the Afrikaans branch wrong, and it is why
       this case is here rather than a country the map happens to name. */
    what: '  and a real timezone still beats the language, even an unlisted one',
    tz: 'America/New_York', language: 'en-US', lang: 'af', want: 'US',
  },
  {
    what: '  a listed one too',
    tz: 'Europe/London', language: 'en-GB', lang: 'af', want: 'GB',
  },
  {
    /* Namibia. Afrikaans, no zone in the map, and rand is the near answer. */
    what: '  but an African zone nobody listed takes the language',
    tz: 'Africa/Windhoek', language: 'en-US', lang: 'af', want: 'ZA',
  },
];

for (const one of CASES) {
  inABrowser(one.tz, one.language);
  const got = guessRegion(one.lang);
  ok(one.what, got.region.code === one.want,
    `${one.tz} + ${one.language}${one.lang ? ` + app ${one.lang}` : ''} → ${got.region.code} (${got.basis})`);
}

(globalThis as Record<string, unknown>).window = realWindow;
Object.defineProperty(globalThis, 'navigator', {
  value: realNavigator, configurable: true, writable: true,
});
globalThis.Intl = realIntl;

/* ── And the callers actually hand it over ───────────────────────────── */
for (const file of ['app/page.tsx', 'app/components/Landing.tsx']) {
  const source = readFileSync(file, 'utf8');
  ok(`${file} tells it which language the app is in`,
    /guessRegion\(lang\)/.test(source),
    'calls guessRegion() with nothing, so the language is not consulted');
}

if (failures) {
  console.error(`\ncheck:region — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:region — the currency follows the timezone, then the language, then the browser.');
