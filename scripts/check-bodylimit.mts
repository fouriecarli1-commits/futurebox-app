/**
 * No screen posts a whole recording onto a request body.
 *
 * ── The wall, and why nothing on our side can see it ─────────────────────
 *
 * The platform refuses a request body past about four and a half megabytes
 * BEFORE the route runs. Nothing in this repository is reached, so the
 * route's own size guard never fires and its careful sentence is never
 * said. What comes back is a bare 413 with no JSON in it, so the screen
 * cannot even read a reason — every one of them falls back to its generic
 * line, and the person reads "that did not work" about a thing that was
 * refused at the door for a reason nobody told them.
 *
 * A lane is a WAV: a minute at 44.1 kHz is about five megabytes. An episode
 * is an mp3: roughly a megabyte a minute. So this is not an edge case, it is
 * most of what this app sends.
 *
 * ── Carli found it the way users find things ─────────────────────────────
 *
 * 6 October 2026, on a 1:12 lane: *"The room could not be taken off that
 * lane."* The route had taken a storage key since it was written and
 * `lib/workfile.ts` had `attach` to use it; the one call site in the Pro
 * Booth was simply not on that road, while `runThrough` two hundred lines
 * above it was. The same gap was then in four more places.
 *
 * ── What this holds ──────────────────────────────────────────────────────
 *
 * Every client that posts a form to a route which accepts a storage key must
 * go through `attach` or `attachAll`. Those two decide by size, so a small
 * clip still goes straight onto the form — the point is that the decision is
 * made in one place rather than assumed at each call site.
 *
 * The routes are read rather than listed: one that starts accepting a key is
 * covered the day it does.
 *
 * ── And the half that was here first ─────────────────────────────────────
 *
 * This file started as a rule about the SERVER half of the same wall: a route
 * must not declare a byte ceiling bigger than the platform will carry unless
 * it also has a way to receive a big file, because a route claiming sixty
 * megabytes with only a posted file to read it from is making a promise the
 * edge breaks for it.
 *
 * Rewriting it for the client half nearly dropped those, including the two
 * that are security rules and not size rules at all — a work key is pinned to
 * the folder of the token that signed for it, and nothing on the server side
 * fetches a URL that arrived on a form. A check that loses a rule while
 * staying green is the same fault as a check that measures something
 * adjacent, so both halves run here.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

/** Every route that can take a key instead of the bytes. */
function routes(dir = 'app/api', found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) routes(path, found);
    else if (name === 'route.ts' && /audioFrom\(/.test(readFileSync(path, 'utf8'))) {
      found.push(path.replace('app/api/', '').replace('/route.ts', ''));
    }
  }
  return found;
}

const takesAKey = routes().sort();
ok(`there are routes that accept a storage key (${takesAKey.length})`,
  takesAKey.length >= 5, takesAKey.join(', '));

/** Every file in the browser that could be posting to one. */
function clients(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) clients(path, found);
    else if (/\.tsx?$/.test(name)) found.push(path);
  }
  return found;
}

const posting: string[] = [];
for (const path of [...clients('app/components'), ...clients('app/lib')]) {
  if (path.includes('/server/')) continue;
  const source = withoutComments(readFileSync(path, 'utf8'));
  if (!/new FormData\(\)/.test(source)) continue;
  /* A route named in a comment is not a route this file posts to — the
     third rule today to need comments blanked first. */
  const hits = takesAKey.filter((one) => source.includes(`/api/${one}`));
  if (hits.length === 0) continue;
  posting.push(path);
  ok(`  ${path.replace('app/', '')} sends its audio through attach`,
    /attach\(|attachAll\(/.test(source),
    `it posts a form to ${hits.join(', ')} and appends the bytes itself, which`
    + ' the platform refuses with a bare 413 before the route is reached');
}

ok('  and there are clients to check at all', posting.length >= 8,
  `${posting.length} found — a pattern that stops matching reports a clean app`);

/* ── The server half ─────────────────────────────────────────────────────── */

/** What the platform carries. Their number, not a guess of ours. */
const PLATFORM = 4.5 * 1024 * 1024;
/** Uncompressed audio, 44.1 kHz, sixteen bits, one channel. */
const WAV_PER_SECOND = 44_100 * 2;
const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

console.log(`\n  the platform carries ${megabytes(PLATFORM)}, which is `
  + `${Math.floor(PLATFORM / WAV_PER_SECOND)} seconds of 44.1 kHz mono WAV`);

/** Every byte ceiling a route rejects a request with, in bytes. */
function ceilingOf(source: string): { name: string; bytes: number } | null {
  let biggest: { name: string; bytes: number } | null = null;
  for (const [, name, expression] of source.matchAll(/const\s+([A-Z_]*BYTES)\s*=\s*([^;]+);/g)) {
    /* Arithmetic on literals only. Anything else is not a number this can
       read, and guessing at one would be worse than saying so. */
    if (!/^[\d\s*+_]+$/.test(expression)) continue;
    const bytes = Number(Function(`"use strict";return (${expression.replace(/_/g, '')})`)());
    if (!Number.isFinite(bytes)) continue;
    if (!biggest || bytes > biggest.bytes) biggest = { name, bytes };
  }
  return biggest;
}

/** Every route file, not only the ones that already take a key. */
function routeFiles(dir = 'app/api', found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) routeFiles(path, found);
    else if (name === 'route.ts') found.push(path);
  }
  return found;
}

for (const path of routeFiles()) {
  const source = withoutComments(readFileSync(path, 'utf8'));
  const ceiling = ceilingOf(source);
  if (!ceiling || ceiling.bytes <= PLATFORM) continue;

  const name = path.replace(/^app\/api\//, '/api/').replace(/\/route\.ts$/, '');
  /* `audioFrom` is the shared intake for one file and `audioListFrom` for
     several; `readWork` is the same thing used directly. Any of them means a
     big file has a way in.

     `audioListFrom` is named in full rather than left to `audioFrom` matching
     inside it — it does not: the substring is `ListFrom`. Training a sound was
     wired and this check still called it broken until the name was added,
     which is the check being wrong about the code rather than the other way
     round. */
  const takesKey = /audioFrom\(|audioListFrom\(|readWork\(|workPath\(/.test(source);
  ok(`  ${name} claims ${megabytes(ceiling.bytes)} and can receive it`, takesKey,
    takesKey
      ? 'takes a storage key as well as a posted file'
      : `${ceiling.name} is ${megabytes(ceiling.bytes)}, the platform stops at `
        + `${megabytes(PLATFORM)} — everything past that is a bare 413`);
}

/* And the browser has to actually use the second door, or it is one nobody
   opens. `attach` is the only thing that posts a key. */
const client = withoutComments(readFileSync('app/lib/workfile.ts', 'utf8'));
ok('  the browser decides by size rather than always posting the file',
  /audio\.size <= POSTABLE_BYTES/.test(client), 'lib/workfile.ts `attach`');
ok("  and its threshold is under the platform's, not at it",
  /POSTABLE_BYTES = 3 \* 1024 \* 1024/.test(client),
  'the form fields, boundaries and headers count towards the same limit');

/* The key is checked against the caller's own folder, and never fetched as a
   URL. This is the rule /api/analyse/part was written under. */
const guard = withoutComments(readFileSync('app/lib/server/ownedpath.ts', 'utf8'));
/* Anchored on the paren. Renaming the function to `workPathX` left the
   unanchored pattern matching as a substring, so the rule stayed green with
   nothing by that name to call — blind rather than wrong, which is harder to
   notice and the reason this was proved by breaking it. */
ok('  a work key is pinned to the folder of the token that signed the request',
  /export function workPath\s*\(/.test(guard) && /\$\{owner\}\/work\//.test(guard));
const server = withoutComments(readFileSync('app/lib/server/workfile.ts', 'utf8'));
ok('  and nothing fetches a URL that arrived on the form',
  !/fetch\(/.test(server), 'lib/server/workfile.ts');

if (bad) {
  console.error(`\ncheck:bodylimit — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:bodylimit — ${posting.length} screens post audio to ${takesAKey.length} routes that take a`
  + ' storage key, and every one of them lets `attach` decide.',
);
