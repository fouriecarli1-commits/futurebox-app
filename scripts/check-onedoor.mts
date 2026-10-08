/**
 * No server call dials a path with no host.
 *
 *   npm run check:onedoor
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * Carli, 8 October 2026, after switching the Google engine off again:
 * *"Could not reach the music service. Try again in a moment."*
 *
 * The booth's own button had been broken since 5 October. On that day every
 * supplier call was moved behind one door, `call()` in `lib/server/
 * suppliers.ts`, which puts the supplier's base in front of a path and adds
 * the key — and `ENDPOINT` in `app/api/music/route.ts` was shortened from a
 * whole address to `/v1/music` to suit it. The fetch underneath it was never
 * switched over. It stayed a bare `fetch('/v1/music?…')`.
 *
 * A server cannot dial that. Node answers `Failed to parse URL` before a
 * byte leaves the machine, the route's catch block calls that unreachable,
 * and the sentence on screen sends somebody to wait for a service that was
 * never asked. Three days, and the only reason it took three is that the
 * evening's testing was all on the Google branch, which returns above this
 * line. The engine switch hid its own fault.
 *
 * ── Why `check:seam` did not catch it ────────────────────────────────────
 *
 * Because it asks whether anything outside the seam writes a HOST, an auth
 * header or a key. A path with no host writes none of the three. The rule
 * was true and the call was broken, which is this repo's recurring shape: a
 * check green because it measures the adjacent thing.
 *
 * So this asks the other half of the same question. In a browser,
 * `fetch('/api/…')` is correct and ordinary — the page has an origin. On the
 * server there is no origin to be relative to, so a leading slash is never
 * right, whether it points at a supplier or at this app's own route.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/** Every server file: a route handler, or anything under lib/server. */
function serverFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      serverFiles(path, out);
    } else if (/\.tsx?$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

const files = [
  ...serverFiles('app/api'),
  ...serverFiles('app/lib/server'),
].filter((one) => {
  /* A `'use client'` file under these trees would run in a browser and may
     dial a path. There are none today; the filter is here so that adding one
     does not make this rule wrong. */
  return !/^['"]use client['"]/.test(readFileSync(one, 'utf8').trimStart());
});

ok('there are server files to read at all', files.length > 20, `${files.length}`);

/**
 * Where a `fetch(` in this text is handed something that starts with `/`.
 *
 * Two shapes, because the bug was the second one and only the first is
 * obvious:
 *
 *   fetch('/v1/music')            the literal
 *   fetch(`${ENDPOINT}?x=1`)      a const in the same file holding a path
 *
 * The second is how it hid: the fetch line has no slash in it anywhere, and
 * the slash is forty lines up next to a comment explaining why the address
 * was shortened.
 */
function pathDials(text: string): string[] {
  const found: string[] = [];

  for (const hit of text.matchAll(/\bfetch\(\s*['"`]\/[^'"`]*/g)) {
    found.push(hit[0].slice(0, 60));
  }

  /* Consts in this file whose value is a path. */
  const paths = new Set<string>();
  for (const hit of text.matchAll(/\bconst\s+(\w+)\s*(?::\s*string\s*)?=\s*['"`](\/[^'"`]*)['"`]/g)) {
    paths.add(hit[1]);
  }
  for (const hit of text.matchAll(/\bfetch\(\s*`\$\{(\w+)\}/g)) {
    if (paths.has(hit[1])) found.push(`fetch(\`\${${hit[1]}}…\`) where ${hit[1]} is a path`);
  }
  for (const hit of text.matchAll(/\bfetch\(\s*(\w+)\s*[,)]/g)) {
    if (paths.has(hit[1])) found.push(`fetch(${hit[1]}) where ${hit[1]} is a path`);
  }
  return found;
}

const offenders: string[] = [];
for (const file of files) {
  const text = withoutComments(readFileSync(file, 'utf8'));
  for (const one of pathDials(text)) offenders.push(`${file}: ${one}`);
}

ok('no server file dials a path with no host',
  offenders.length === 0,
  `${offenders.length}: ${offenders.slice(0, 4).join(' | ')} — on the server there`
  + ' is no origin for a leading slash to be relative to, so this throws'
  + ' `Failed to parse URL` and reads as the supplier being unreachable.'
  + ' A supplier path goes through `call()` in lib/server/suppliers.ts');

/* And the rule can see the shape it was written for. A rule nobody has
   driven over a real example is a rule that may match nothing at all —
   which is how `check:seam` came to be true and useless about this. */
const sample = "const ENDPOINT = '/v1/music';\nconst ask = () => fetch(`${ENDPOINT}?output_format=mp3`, {});";
ok('and it recognises the call that was broken for three days',
  pathDials(sample).length === 1,
  `saw ${pathDials(sample).length} — if this is nought the rule above is`
  + ' agreeing with the code rather than reading it');

const plain = "const r = await fetch('/api/cover?track=1');";
ok('  and the plain literal form too', pathDials(plain).length === 1);

const fine = "const r = await fetch('https://example.test/v1/music');\nconst s = await call('music', '/v1/music');";
ok('  while a whole address and a call through the door are both fine',
  pathDials(fine).length === 0, pathDials(fine).join(' | '));

console.log(bad === 0 ? '\ncheck:onedoor — no server call dials a path with no host.' : `\ncheck:onedoor — ${bad} wrong.`);
process.exit(bad === 0 ? 0 : 1);
