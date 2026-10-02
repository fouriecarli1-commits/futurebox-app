/**
 * No competitor's product is named as the source of a thing we built.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 3 October 2026, the morning after I built the cutting room's layer
 * controls: *"Ek vra nie dat jy canva oor bou nie, net 'n praktiese video
 * editing en die elemente wat moontlik is. Hierdie is hoe meeste video editing
 * programme lyk, canva sin is nie uniek nie. Ons kan onsself nie vasloop met
 * legal in probleme met die uitleg en die tools wat ons bou nie."*
 *
 * She was right twice over.
 *
 * On the facts: a timeline with blocks on it, a playhead, trim handles, fades
 * you pull, a speed control, an opacity, a rotation, an align row, a layer
 * order — these are the common vocabulary of every editor that has ever had a
 * timeline in it. Nobody owns them. They are functional, they are forty years
 * old, and they are safe to build.
 *
 * On the risk: I had written eighteen comments across six files saying things
 * like "Canva's Position sheet carries a rotation, so ours does" and a document
 * headed "Three things worth stealing, from <a company>". Not one line of their
 * code is in this repository and not one pixel of their layout was copied — but
 * a repository whose own notes read as a record of deliberate copying from one
 * named competitor is a liability that has nothing to do with what the code
 * does. The controls were never the problem. The notes were.
 *
 * ── What it does and does not ban ────────────────────────────────────────
 *
 * It bans naming an editing or design product in the files that BUILD this app
 * and TEST it. It does not ban naming a company we buy from (ElevenLabs,
 * Supabase, fal.ai, Paystack — those are suppliers and the code has to say so),
 * and it does not ban naming a site somebody tried to fetch market data from,
 * which is a statement about research and not about design. Those few files are
 * listed in `RESEARCH` below, each one deliberate rather than forgotten.
 *
 * ── The one thing it cannot check ────────────────────────────────────────
 *
 * Whether the LAYOUT is its own. A check can read names; it cannot look at a
 * screen. What it can do is stop the habit that makes a copied layout easy to
 * allege, which is writing a competitor's menu down as the reason for a
 * decision. Describe what a control does and the description is true of every
 * editor; describe whose sheet it came from and it is true of one.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Editing, design and video products that compete with this app.
 *
 * Not an exhaustive list of rivals and not meant to be: it is the names most
 * likely to be reached for while describing a control, which is the habit being
 * stopped. Word-bounded, because "canvas" is a thing we draw on a hundred times
 * in this repository and "Canva" is a company.
 */
const RIVALS = [
  'canva', 'capcut', 'kapwing', 'clipchamp', 'filmora', 'kinemaster',
  'inshot', 'imovie', 'davinci', 'premiere pro', 'final cut', 'after effects',
  'lightworks', 'shotcut', 'openshot', 'descript', 'invideo', 'animoto',
];

/* ── Why VEED is not on that list ─────────────────────────────────────────

   The first run of this caught three lines reading "fal.ai's VEED video
   background removal: $0.008 fast". VEED is a product somebody could call a
   rival, and in this repository it is the name of a MODEL we rent through
   fal.ai and price in `credits.ts`. A supplier has to be named — a cost note
   that will not say which model it is costing is useless — so it is a supplier
   here and not a rival, and listing it would have forced three price notes to
   go vague about what they are pricing. The rule is about claiming a design,
   not about never writing a company's name down. */

/**
 * Files allowed to name one, and why.
 *
 * Each of these names a site as a place market data was looked for and not
 * found — a statement about what could not be researched, which is the opposite
 * of a claim about copied design. Written out so that adding a file here is a
 * decision somebody made rather than a list that grew.
 */
const RESEARCH: Readonly<Record<string, string>> = {
  'app/lib/adstyles.ts':
    'names the trend sites whose APIs were looked for and not found, so the '
    + 'catalogue says plainly that it is one opinion rather than measured data',
  'scripts/check-adstyles.mts':
    'the check holding that admission in place has to quote it',
  'docs/OPEN-QUESTIONS.md':
    'the open question asks her for three real adverts because those sites '
    + 'could not be reached',
};

const WHERE = ['app', 'scripts', 'audit', 'supabase', 'docs'];

/* This file, which holds the list and the quotes, and would otherwise be its
   own only failure. Skipped by name rather than by some marker in the text,
   because a marker is a hole anything can be written through. */
const SELF = 'scripts/check-ownwords.mts';
const READS = /\.(tsx?|mts|mjs|js|sql|md)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (READS.test(path)) out.push(path);
  }
  return out;
}

const found: string[] = [];
let read = 0;

for (const root of WHERE) {
  for (const path of walk(root)) {
    if (path in RESEARCH || path === SELF) continue;
    read += 1;
    const lines = readFileSync(path, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const rival of RIVALS) {
        /* Word-bounded on both sides. `canvas`, `canvases` and `CanvasContext`
           are everywhere in a repository that paints frames, and every one of
           them contains the five letters of a company's name. An unbounded
           match reported eighty-four hits in one file and would have been
           switched off within the hour. */
        if (new RegExp(`(^|[^a-z])${rival}([^a-z]|$)`, 'i').test(line)) {
          found.push(`${path}:${i + 1}  ${line.trim().slice(0, 100)}`);
          return;
        }
      }
    });
  }
}

/* Proof the list is not empty and the matcher is not inert — the fault a
   name-banning check fails by is matching nothing at all and reporting a clean
   repository. Both halves are asserted: the name is caught, and the word that
   merely contains it is not. */
const CATCHES = RIVALS.some((one) => new RegExp(`(^|[^a-z])${one}([^a-z]|$)`, 'i')
  .test("/* Canva's Position sheet */"));
const SPARES = !new RegExp('(^|[^a-z])canva([^a-z]|$)', 'i')
  .test('const context = canvas.getContext');

if (!CATCHES || !SPARES || read < 50) {
  console.error(
    '\ncheck:ownwords is not measuring anything.'
    + `\n  catches a real mention: ${CATCHES}`
    + `\n  spares the word "canvas": ${SPARES}`
    + `\n  files read: ${read}`
    + '\nA check that reads nothing reports a clean repository.\n',
  );
  process.exit(1);
}

if (!found.length) {
  console.log(
    `  ok   ${read} files name no rival product as the source of anything here`,
  );
  console.log(
    '\ncheck:ownwords — the controls in this app are the ordinary controls of a '
    + 'timeline editor, and the code says so in its own words.',
  );
  process.exit(0);
}

console.error(`\n${found.length} mention(s) of a rival product:\n`);
for (const line of found) console.error(`  ${line}`);
console.error(
  '\nDescribe what the control DOES, not whose menu it is in. "Layer order" is'
  + '\ntrue of every editor ever built; "<company> calls this Layers" is a note'
  + '\nclaiming we copied one of them, about a control nobody owns.'
  + '\n\nIf the mention is market research rather than design — a site whose data'
  + '\nwas looked for and not found — add the file to RESEARCH in this check with'
  + '\nthe reason written out.\n',
);
process.exit(1);
