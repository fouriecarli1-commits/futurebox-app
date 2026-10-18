/**
 * No screen may name a person who is not the person looking at it.
 *
 * ── What this was written for ────────────────────────────────────────────
 *
 * The owner, with a photograph of the Live room: "hoekom is die live room empty?"
 * The room said "Sign in to say something" — correctly, she was signed out on
 * that phone — under a header showing one particular member's handle.
 *
 * The header was right about nothing. `creatorDomain` was
 * `useState(<that handle>)` and nothing anywhere ever set it, so every visitor
 * to the app, signed in or out, on any device, saw one particular person's
 * handle in the corner as though it were their own.
 *
 * The comment above `creator` in `app/page.tsx` had already described this
 * exact fault being fixed — "the app has been calling one person two
 * different things depending on which screen they were looking at:
 * a handle in the corner, and their real name on their own release" — and
 * the half that showed the *wrong name for you* was fixed. The half that
 * showed *somebody else's name as yours* was not, and the comment read as
 * though both had been.
 *
 * ── What this refuses ────────────────────────────────────────────────────
 *
 * A handle handed to `useState` as a default in `app/page.tsx`: whatever it
 * is seeded with, it is somebody. Identity comes off the account or it is not
 * drawn.
 *
 * The literal list of real handles and names this used to carry is gone —
 * the list was itself the names, written into a public repository. Since
 * 18 October 2026 `check:privateinfo` looks for them everywhere, by hash.
 *
 *   npm run check:whoami
 */
import { readFileSync } from 'node:fs';

/** The code, with the prose taken out: a comment explaining the fault may name it. */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
}

/* The specific shape that caused it: a default handed to `useState` that
   looks like somebody's handle. */
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
