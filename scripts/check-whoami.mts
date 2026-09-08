/**
 * No screen may name a person who is not the person looking at it.
 *
 * ── What this was written for ────────────────────────────────────────────
 *
 * Carli, with a photograph of the Live room: "hoekom is die live room empty?"
 * The room said "Sign in to say something" — correctly, she was signed out on
 * that phone — under a header showing `@anrefourie`.
 *
 * The header was right about nothing. `creatorDomain` was
 * `useState('anrefourie')` and nothing anywhere ever set it, so every visitor
 * to the app, signed in or out, on any device, saw one particular person's
 * handle in the corner as though it were their own.
 *
 * The comment above `creator` in `app/page.tsx` had already described this
 * exact fault being fixed — "the app has been calling one person two
 * different things depending on which screen they were looking at:
 * `anrefourie` in the corner, and their real name on their own release" — and
 * the half that showed the *wrong name for you* was fixed. The half that
 * showed *somebody else's name as yours* was not, and the comment read as
 * though both had been.
 *
 * ── What this refuses ────────────────────────────────────────────────────
 *
 * A real person's handle or email, written as a literal, in anything that
 * renders. Identity comes off the account or it is not drawn: there is no
 * honest default for a claim about who is here.
 *
 * Prose is exempt — a comment explaining this fault has to be able to name it,
 * and a check that forbids its own explanation teaches people to delete the
 * explanation.
 *
 * ── And what it deliberately allows ──────────────────────────────────────
 *
 * A byline. The first version of this refused `instructor: 'Anre Fourie'` in
 * `app/data/masterclasses.ts`, which is correct and is the opposite kind of
 * thing: a credit naming the person who actually made something, not a claim
 * about who is reading it. She really did teach those classes.
 *
 * So a *handle* — the `@name` shape, and an address — is refused everywhere,
 * because there is no place in this app where one of those is anything but a
 * statement about the account looking at the screen. A full name is refused
 * everywhere except `app/data/`, which is a catalogue of things people made
 * and where a name is a credit.
 *
 *   npm run check:whoami
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A handle or an address: refused everywhere, because in this app one of
 * these is only ever a claim about who is signed in.
 */
const HANDLES = ['anrefourie', 'anrefourie@gmail.com', 'carlifourie'];

/**
 * A person's name: refused in anything that draws chrome, allowed in the
 * catalogue, where it is a byline on something they actually made.
 */
const NAMES = ['anre fourie', 'anré fourie'];

/** Where a byline is the right thing rather than the wrong one. */
const CATALOGUE = /^app\/data\//;

function files(dir: string, into: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, into);
    else if (/\.(tsx|ts)$/.test(path)) into.push(path);
  }
  return into;
}

/**
 * The code, with the prose taken out.
 *
 * Both comment shapes, and JSX comments too, because this file's own
 * explanation lives in one and `app/page.tsx`'s lives in another. The same
 * rule `check:bill` had to learn: a check that treats a warning about a
 * danger as the danger teaches people to delete the warning.
 */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
}

const problems: string[] = [];
for (const file of [...files('app'), ...files('scripts')]) {
  /* This file has to be able to name the thing it forbids. */
  if (file.endsWith('check-whoami.mts')) continue;
  const source = code(readFileSync(file, 'utf8')).toLowerCase();
  for (const who of HANDLES) {
    if (source.includes(who)) problems.push(`  ${file} — "${who}"`);
  }
  if (!CATALOGUE.test(file)) {
    for (const who of NAMES) {
      if (source.includes(who)) problems.push(`  ${file} — "${who}"`);
    }
  }
}

if (problems.length > 0) {
  console.error(
    `check:whoami — ${problems.length} place(s) name a real person in code:\n${problems.join('\n')}\n\n` +
      'A handle, a name or an address is a claim about who is looking at the screen.\n' +
      'Read it off the account, and draw nothing when there is no account.',
  );
  process.exit(1);
}

/* And the specific shape that caused it: a default handed to `useState` that
   looks like somebody's handle. The literal above would catch this person;
   this catches the next one. */
const page = code(readFileSync('app/page.tsx', 'utf8'));
const seeded = [...page.matchAll(/const \[(\w*(?:[Dd]omain|[Hh]andle|[Uu]sername))[^\]]*\] = useState\(\s*'([^']+)'/g)];
if (seeded.length > 0) {
  console.error(
    `check:whoami — a handle with a default:\n${seeded.map((one) => `  ${one[1]} = "${one[2]}"`).join('\n')}\n\n` +
      'Whatever it is seeded with, it is somebody. Derive it from the account.',
  );
  process.exit(1);
}

console.log('check:whoami — no screen names anybody but the person signed in.');
