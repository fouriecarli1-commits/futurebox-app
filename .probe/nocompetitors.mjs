// The app does not advertise the competition.
//
//   node .probe/nocompetitors.mjs
//
// There was a row of chips on the make screen headed "Which AI made it",
// listing eleven other companies' products with a link to each — Suno, Udio,
// Stable Audio, Runway, Sora, Veo, Kling, Luma, Midjourney, Flux — on the one
// screen where somebody was about to make something here instead.
//
// It did not even do the job it claimed. What a chip said had no effect on
// anything: the credits printed on a finished song come from what actually
// answered, or `FutureBox sketch` when nothing did, read from the generation
// itself rather than from a row of buttons somebody ticked.
//
// This keeps it gone, and keeps it from creeping back in through the demo
// content, which used to name those products as the makers of tracks nothing
// had made — and fed them into the pitch text people send to podcasts.

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };
const read = async (path) =>
  (await import('node:fs/promises')).readFile(new URL(path, import.meta.url), 'utf8');
const bare = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

/** Products this app would be sending people to. Not tools it uses itself. */
const RIVALS = ['Suno', 'Udio', 'Stable Audio', 'Runway', 'Sora', 'Luma', 'Midjourney', 'Flux'];

// ── The picker is gone, root and branch ────────────────────────────────
const make = bare(await read('../app/components/MakeMusic.tsx'));
say(!/AI_MODELS/.test(make), 'the make screen still draws the model chips');
say(!/selectedTools|toggleTool/.test(make), 'the make screen still carries the picker');
for (const name of RIVALS) {
  say(!new RegExp(`\\b${name}\\b`).test(make), `the make screen names ${name}`);
}

const page = bare(await read('../app/page.tsx'));
say(!/selectedTools|toggleTool/.test(page), 'the studio still holds the picker state');
say(!/AI_MODELS|ROLE_ACCENTS/.test(page), 'the studio still imports the model table');

// ── And the table itself ───────────────────────────────────────────────
const studio = bare(await read('../app/data/studio.ts'));
say(!/export const AI_MODELS/.test(studio), 'the table of other companies\' products is still exported');
say(!/export function modelByName|export function groupByRole/.test(studio), 'the helpers that read that table are still here');
for (const name of RIVALS) {
  say(!new RegExp(`\\b${name}\\b`).test(studio), `the seeded data still credits ${name}`);
}

// ── Demo tracks do not claim a maker that never made them ──────────────
const credits = [...studio.matchAll(/models: \[([^\]]*)\]/g)].map((m) => m[1]);
say(credits.length > 0, 'the demo tracks lost their credits field entirely');
for (const one of credits) {
  say(/FutureBox/.test(one), `a demo track is credited to ${one.trim()}`);
}

// ── Nothing leaks into the copy people send out ────────────────────────
// The pitch builder joins these into outreach text. A pitch that reads
// "Built with: Suno v5 + Runway Gen-3" is an advert for somebody else, sent
// by us, over the user's name.
const matching = bare(await read('../app/lib/matching.ts'));
for (const name of RIVALS) {
  say(!new RegExp(`\\b${name}\\b`).test(matching), `the pitch text can still say ${name}`);
}
say(!/\$\{t\.models\.length\} different AIs/.test(matching), 'a hook still counts a stack that is now one name, which reads as "1 different AIs"');

if (problems.length) {
  console.error(`nocompetitors: ${problems.length} problem(s)`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('nocompetitors: the make screen sells nothing but this app, and the demos credit nobody who did not make them');
