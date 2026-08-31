// A missing table is not an empty list.
//
//   node .probe/collab-ready.mjs
//
// This is the bug that made collaboration look merely unused for weeks: the
// route dropped the error, the client turned null into [], and the room drew
// "no collaborations yet" — which is exactly what somebody with none sees.
// The same mistake the credit balance made, checked here so it is not made a
// third time.

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };
const read = async (path) =>
  (await import('node:fs/promises')).readFile(new URL(path, import.meta.url), 'utf8');

// ── The route has to notice the error at all ───────────────────────────
const route = await read('../app/api/collab/route.ts');
const code = route.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Every read and write against `collabs` has to notice its own error. The
// first version of this check matched the *update* as well as the read and
// failed on the wrong one, which is a reminder that a regex over source is a
// blunt instrument — so it now counts instead: no `const { data }` alone may
// sit in front of a collabs query.
const collabQueries = code.match(/const \{ data[^}]*\} = await client\s*\n\s*\.from\('collabs'\)/g) ?? [];
say(collabQueries.length >= 2, `found ${collabQueries.length} collabs queries — expected the read and the update`);
say(
  collabQueries.every((one) => /error/.test(one)),
  'a collabs query still drops its error, which is what made a missing table look empty',
);
say(/ready: false/.test(code), 'the route never reports that it is not ready');
say(/ready: true/.test(code), 'the route never reports that it is ready');
say(/collab\.sql/.test(code), 'the message does not name the migration somebody has to run');

// ── The client must not flatten that back into an empty list ───────────
const lib = await read('../app/lib/collab.ts');
say(/ready/.test(lib), 'loadThreads throws the ready flag away again');
say(
  /if \(!response\?\.ok\) return \{ threads: \[\], ready: false \}/.test(lib),
  'a request that never arrived still reads as a project with no collaborations',
);

// ── And the room must say it, not draw an empty state ──────────────────
const room = await read('../app/components/CollabRoom.tsx');
say(/ready === false/.test(room), 'the room does not distinguish "off" from "none yet"');
say(
  room.indexOf('ready === false') < room.indexOf('Waiting on you'),
  'the not-ready branch is after the normal render, so it never shows',
);

// ── It has to say what collaboration is for ────────────────────────────
say(/collab\.whatTitle/.test(room), 'the room never says what collaborating here means');
const i18n = await read('../app/lib/i18n.tsx');
const what = /"collab\.what": \{ en: "([^"]+)"/.exec(i18n);
say(Boolean(what), 'there is no explanation string');
say(what && what[1].length > 150, 'the explanation is too thin to explain anything');
say(what && /room|thread/i.test(what[1]), 'the explanation never mentions the room, which is the feature');
say(
  /collab\.whatPrivate/.test(room),
  'the room does not say the thread is private until both have agreed',
);

// ── The messages route too, where the halfway migration bites ──────────
//
// `collab_messages` can be missing while `collabs` exists. Drawing an empty
// thread then would tell two people who agreed to work together that neither
// had said anything.
const messages = (await read('../app/api/collab/messages/route.ts'))
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
const messageQueries = messages.match(/const \{ data[^}]*\} = await client\s*\n\s*\.from\(/g) ?? [];
say(messageQueries.length >= 3, `found ${messageQueries.length} queries in the messages route`);
say(
  messageQueries.every((one) => /error/.test(one)),
  'a query in the messages route still drops its error',
);
say(/NOT_SET_UP/.test(messages), 'the messages route never says the tables are missing');
// The two must be told apart: "not yours" and "not installed" need opposite
// things done about them.
say(/No room there/.test(messages), 'the not-yours answer is gone');
say(
  messages.indexOf('NOT_SET_UP') < messages.lastIndexOf('No room there'),
  'the not-installed case is not handled before the not-yours case',
);

// ── No email anywhere in the member-to-member path ─────────────────────
//
// Pitching an outside podcast is a different feature and email is genuinely
// its channel; this is about talking to another member, where it is not.
for (const [file, name] of [
  ['../app/components/CollabRoom.tsx', 'the collab room'],
  ['../app/lib/collab.ts', 'the collab client'],
  ['../app/api/collab/route.ts', 'the collab route'],
  ['../app/api/collab/messages/route.ts', 'the messages route'],
]) {
  const text = (await read(file)).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  say(!/mailto:/.test(text), `${name} offers an email link`);
}

console.log(
  problems.length
    ? `FAIL\n  ${problems.join('\n  ')}`
    : 'PASS — a missing table says so, the room explains itself, and nothing falls back to email',
);
process.exit(problems.length ? 1 : 0);
