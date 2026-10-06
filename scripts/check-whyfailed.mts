/**
 * An upload that failed must say why it failed, not why uploads fail.
 *
 * ── The fault this exists for ────────────────────────────────────────────
 *
 * Carli, 29 September 2026: *"Wat is die grootte van videos wat opgelaai kan
 * word? Noudat ons supabase en vercel betaal?"*
 *
 * Reading the code to answer her turned up something worse than a number.
 * `putWork` returned `null` for three unrelated failures — no account, no
 * storage client, and the bucket refusing the file on size — and all ten
 * callers answered that `null` with one constant sentence ending
 * **"Sign in and try again."**
 *
 * So a member who was signed in, whose session was fine, and whose file was
 * simply bigger than the project's upload cap, was told to sign in. They sign
 * in. It fails again. That is the exact shape of *"Ek vra dieselfde goed oor
 * en oor"*: not a crash, but a message that names the wrong cause and
 * therefore costs an attempt to disprove.
 *
 * It matters more now than it did, because the cap is no longer a constant
 * anybody can read off this repository. Supabase allows 50MB per file on the
 * free plan and up to 500GB on a paid one — but the paid ceiling is a
 * SETTING, not a default. A project upgraded and not reconfigured still
 * refuses at 50MB, and the only place that difference can ever surface is the
 * sentence the member is shown.
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 *
 * Where a call to `attach`, `attachAll` or `putWork` fails, the message given
 * to a person must come from that failure — `.why` — and not from a constant.
 *
 * It is deliberately narrow. It does not ask that the message be good, only
 * that it be the one the failure carried, because the alternative is a check
 * that grades prose. What it stops is the one regression that is invisible:
 * somebody adding an eleventh caller, copying the ten around it, and pinning
 * a fresh sentence to the wrong cause.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { code } from './prose.mts';

const FILES = readdirSync('app', { recursive: true, encoding: 'utf8' })
  .filter((one) => one.endsWith('.ts') || one.endsWith('.tsx'))
  .map((one) => join('app', one))
  .filter((one) => !one.endsWith(join('lib', 'workfile.ts')));

/** `const <name> = await attach(...)` / `attachAll(...)` / `putWork(...)`. */
const PUT = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*await\s+(attach|attachAll|putWork)\s*\(/g;

let calls = 0;
let bad = 0;

for (const file of FILES) {
  const raw = readFileSync(file, 'utf8');
  const text = code(raw);
  const lines = raw.split('\n');

  for (const hit of text.matchAll(PUT)) {
    const held = hit[1];
    calls += 1;
    const at = text.slice(0, hit.index ?? 0).split('\n').length;

    /* The failure is handled within a few lines of the call in every one of
       these, because the shape is always `if (!x.ok) <say something>`. Read a
       window rather than the whole file: a `.why` five hundred lines away
       belongs to a different call. */
    const window = text.split('\n').slice(at - 1, at + 8).join('\n');
    const guard = new RegExp(`!\\s*${held}\\s*\\.\\s*ok`).test(window);
    if (!guard) continue;

    const said = new RegExp(`${held}\\s*\\.\\s*why`).test(window);

    /* Carried, not reported.
 
       `if (!put.ok) throw new Error(put.why)` reads `.why` and so passed the
       rule above — while the sentence went nowhere. Transcript's `try` ends in
       a bare `catch` that answers every throw with "Could not fetch the
       episode to read it.", so an episode storage refused on size told the
       member the fetch had failed. The episode was fetched. That is the same
       wrong-cause fault this file exists for, wearing the one disguise the
       first version of the rule could not see through.
 
       A reason handed to `throw` is a reason whose landing place is somewhere
       else in the file, or in a caller, or nowhere — this check cannot follow
       it and will not pretend to. So the reason has to be reported here. */
    const thrown = new RegExp(`throw\\s[^;]*${held}\\s*\\.\\s*why`).test(window);
    if (said && !thrown) continue;

    bad += 1;
    console.log(
      thrown
        ? `  ✗   ${file}:${at} — \`${held}.why\` is thrown, not reported. ` +
            `${(lines[at - 1] ?? '').trim().slice(0, 80)}\n` +
            `      Whatever catches it answers with its own sentence, so the ` +
            `reason the upload gave is lost on the way. Say it here.`
        : `  ✗   ${file}:${at} — \`${held}\` failed and something other than ` +
            `\`${held}.why\` is reported. ` +
            `${(lines[at - 1] ?? '').trim().slice(0, 80)}\n` +
            `      A storage refusal on size and a missing session are different ` +
            `things; one constant sentence for both tells a signed-in member to ` +
            `sign in.`,
    );
  }
}

console.log(`\n${calls} upload call site(s) read.`);

/* And the two sentences have to actually differ, which is the half a caller
   rule cannot see: ten call sites can all read `.why` correctly while the
   module hands back the same string either way. */
const lib = readFileSync(join('app', 'lib', 'workfile.ts'), 'utf8');
const both = ['TOO_BIG_TO_SEND', 'TOO_BIG_FOR_STORAGE'].filter((one) =>
  new RegExp(`export const ${one}\\s*=`).test(lib),
);
if (both.length < 2) {
  bad += 1;
  console.log(
    `  ✗   app/lib/workfile.ts — only ${both.length} of the two reasons is ` +
      `defined (${both.join(', ') || 'neither'}). A size refusal and a missing ` +
      `session need separate sentences or the callers have nothing to choose ` +
      `between.`,
  );
} else {
  /* Each one has to be REACHED, not merely declared.
 
     The first version of this looked for `statusCode`, `413` or the wording
     of Supabase's refusal anywhere in the module. It passed a deliberately
     gutted `refusedOnSize` that always answered false — because the word
     `statusCode` was still sitting in the function's type annotation. Green,
     while the size message had become unsayable. Adjacent to the real thing,
     which is the failure this whole repository is arranged against.
 
     Counting uses is the real thing: a constant that appears once appears
     only in its own declaration, so nothing returns it and no member can
     ever be shown it. */
  const unsaid = both.filter(
    (one) => code(lib).split(new RegExp(`\\b${one}\\b`)).length - 1 < 2,
  );
  if (unsaid.length > 0) {
    bad += 1;
    console.log(
      `  ✗   app/lib/workfile.ts — ${unsaid.join(' and ')} is declared and ` +
        'never returned, so nothing can ever say it. Both reasons need a path ' +
        'out of `putWork`, chosen by reading the upload error.',
    );
  } else {
    console.log('  ok  app/lib/workfile.ts — two reasons, and both have a way out.');
  }
}

if (bad > 0) {
  console.log(`\ncheck:whyfailed — ${bad} place(s) name the wrong cause for a failed upload.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:whyfailed — a failed upload says which of the two things went wrong.');
}
