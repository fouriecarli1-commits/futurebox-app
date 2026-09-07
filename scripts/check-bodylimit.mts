/**
 * No route may promise a body the platform will not carry.
 *
 * ── The bug this is the rule for ─────────────────────────────────────────
 *
 * Carli: "Ek sien die measure the mix gooi 'n 413 warning en dat klank nie
 *  geseperate kan word nie."
 *
 * A serverless function on Vercel refuses a request body over about four and a
 * half megabytes, and it refuses it at the edge — before any of this app's code
 * runs. So the route's own ceiling is never consulted, its message is never
 * said, and what comes back is a bare 413 with no body, which the client
 * reports as a number in brackets.
 *
 * Six routes claimed more than the platform would ever pass: analyse sixty
 * megabytes, dub a hundred, episode a hundred and twenty, finetunes a hundred,
 * stems twenty-five, transcribe twenty-five. The worst of them posted a WAV —
 * 88 kB a second at 44.1 kHz mono, so fifty-one seconds of audio and the wall
 * is hit. Every song longer than that failed, always, and had done since the
 * feature was written.
 *
 * ── What is checked ──────────────────────────────────────────────────────
 *
 * Any route with a byte ceiling over the platform's has to accept a storage
 * key as well as a posted file — that is `audioFrom`, which reads a file the
 * browser put in its own folder and pins the key to the caller's token. A
 * route that claims a big ceiling with no way to receive a big file is making
 * a promise it cannot keep, and the person on the other end gets a number.
 *
 * The arithmetic is printed rather than described, because "sixty megabytes"
 * and "fifty-one seconds" are the same sentence and only one of them is what
 * actually happens.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** What Vercel will carry. Their number, not a guess of ours. */
const PLATFORM = 4.5 * 1024 * 1024;
/** Uncompressed audio, 44.1 kHz, sixteen bits, one channel. */
const WAV_PER_SECOND = 44_100 * 2;

let bad = 0;
const ok = (label: string, good: boolean, detail = '') => {
  console.log(`  ${good ? 'ok ' : '✗'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!good) bad += 1;
};

function routes(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...routes(path));
    else if (entry === 'route.ts') found.push(path);
  }
  return found;
}

/** Every byte ceiling a route rejects a request with, in bytes. */
function ceilingOf(source: string): { name: string; bytes: number } | null {
  let biggest: { name: string; bytes: number } | null = null;
  const pattern = /const\s+([A-Z_]*BYTES)\s*=\s*([^;]+);/g;
  for (const [, name, expression] of source.matchAll(pattern)) {
    /* Arithmetic on literals only. Anything else is not a number this can
       read, and guessing at one would be worse than saying so. */
    if (!/^[\d\s*+_]+$/.test(expression)) continue;
    const bytes = Number(Function(`"use strict";return (${expression.replace(/_/g, '')})`)());
    if (!Number.isFinite(bytes)) continue;
    if (!biggest || bytes > biggest.bytes) biggest = { name, bytes };
  }
  return biggest;
}

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

console.log(`  the platform carries ${megabytes(PLATFORM)}, which is ` +
  `${Math.floor(PLATFORM / WAV_PER_SECOND)} seconds of 44.1 kHz mono WAV\n`);

const overreaching: string[] = [];
for (const path of routes('app/api')) {
  const source = readFileSync(path, 'utf8');
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
  ok(`${name} claims ${megabytes(ceiling.bytes)} and can receive it`,
    takesKey,
    takesKey
      ? 'takes a storage key as well as a posted file'
      : `${ceiling.name} is ${megabytes(ceiling.bytes)}, the platform stops at ${megabytes(PLATFORM)} — everything past that is a bare 413`);
  if (!takesKey) overreaching.push(name);
}

/* And the browser has to actually use it, or the route's second door is one
   nobody opens. `attach` is the only thing that posts a key. */
const client = readFileSync('app/lib/workfile.ts', 'utf8');
ok('the browser decides by size rather than always posting the file',
  /audio\.size <= POSTABLE_BYTES/.test(client),
  'lib/workfile.ts `attach`');
ok('and its threshold is under the platform\'s, not at it',
  /POSTABLE_BYTES = 3 \* 1024 \* 1024/.test(client),
  'the form fields, boundaries and headers count towards the same limit');

/* The key is checked against the caller's own folder, and never fetched as a
   URL. This is the rule /api/analyse/part was written under. */
const guard = readFileSync('app/lib/server/ownedpath.ts', 'utf8');
ok('a work key is pinned to the folder of the token that signed the request',
  /export function workPath/.test(guard) && /\$\{owner\}\/work\//.test(guard));
const server = readFileSync('app/lib/server/workfile.ts', 'utf8');
ok('and nothing fetches a URL that arrived on the form',
  !/fetch\(/.test(server), 'lib/server/workfile.ts');

if (bad) {
  console.error(`\ncheck:bodylimit — ${bad} route(s) promise more than the platform carries.`);
  if (overreaching.length) {
    console.error(`  ${overreaching.join(', ')} — give them audioFrom(), or lower the number to the truth.`);
  }
  process.exit(1);
}
console.log('\ncheck:bodylimit — every route that claims a big file has a way to receive one.');
