// The live channel: one room, and the decisions that keep it honest.
//
//   node .probe/live.mjs
//
// The room's hardest part is not on screen. Songs live in the `tracks` bucket,
// which is private — its storage policy only lets an account read files under
// its own id — so somebody listening to your song is reading a file they have
// no permission to read. The server signs it, briefly, and only for a song
// that has actually been posted.
//
// That is the thing worth checking, because the two easy ways to get a live
// channel working are both wrong: make the bucket public, which leaves a copy
// of everybody's master at a guessable address forever; or copy each posted
// song somewhere public, which is the same thing with extra steps.

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };
const read = async (path) =>
  (await import('node:fs/promises')).readFile(new URL(path, import.meta.url), 'utf8');
const bare = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const route = bare(await read('../app/api/live/route.ts'));
const sql = await read('../supabase/live.sql');
const screen = bare(await read('../app/components/LiveChannel.tsx'));
const page = bare(await read('../app/page.tsx'));

// ── The audio is signed, not published ─────────────────────────────────
say(/createSignedUrl\('?/.test(route) || /createSignedUrl\(/.test(route), 'a posted song is never signed for, so nobody but its owner can play it');
say(/from\('tracks'\)/.test(route), 'the signing does not read the tracks bucket');
say(!/public: true/.test(sql), 'the migration makes something public');
say(!/storage\.buckets/.test(sql), 'the migration touches buckets, and the room needs no new one');
say(/LINK_SECONDS/.test(route), 'the signed link has no lifetime');

// A published episode needs no signing: its bucket is already public, because
// podcast apps do not sign in.
say(/episodeAudioUrl/.test(route), 'an episode post is signed for as though it were private');

// ── A post has to be yours before it is signed for ─────────────────────
// Otherwise posting somebody else's id has the server sign a path under your
// own folder, and the post is unplayable — or worse, under theirs.
// The property is not "signing comes after the check" — those are two
// different requests, and in the file GET is written before POST. It is that
// nothing becomes a post unless it belonged to whoever posted it, so the only
// paths ever signed for are paths their owner put there themselves.
const post = route.slice(route.indexOf('export async function POST'), route.indexOf('export async function DELETE'));
say(/from\('tracks'\)/.test(post), 'posting never looks the song up at all');
say(
  /\.eq\('owner', caller\.id\)/.test(post),
  'a post is filed without checking the song belongs to whoever posted it',
);
say(
  post.indexOf("from('tracks')") < post.lastIndexOf("from('live_posts')"),
  'the row is inserted before the song is checked, so an id that is not yours becomes a post',
);
say(
  /That song is not in your account/.test(post),
  'a song that is not there is not distinguished from one that is not yours',
);

// ── Only your own post comes out ───────────────────────────────────────
const del = route.slice(route.indexOf('export async function DELETE'));
say(/\.delete\(\)/.test(del), 'nothing can be taken out of the room');
say(/\.eq\('owner', caller\.id\)/.test(del), "anybody can delete anybody else's post");

// ── Listening needs no account; posting does ───────────────────────────
say(/what === 'hello'/.test(route), 'there is no way to be counted in the room');
say(
  route.indexOf("what === 'hello'") < route.indexOf('Sign in to post'),
  'saying hello is refused without an account, so a visitor cannot even be counted',
);
say(/Sign in to post/.test(route), 'posting is not gated on an account');

// ── Everything typed for other people is screened ──────────────────────
say((route.match(/guard\(request/g) ?? []).length >= 2, 'a title or a message reaches other people unscreened');
say(/'room'/.test(route), 'the room borrows another surface, so its refusals are filed as the wrong thing');
const moderation = await read('../app/lib/moderation.ts');
say(/\| 'room'/.test(moderation), "'room' is not a surface the moderation log knows");

// ── A link somebody typed cannot be a script ───────────────────────────
say(/\^https:\\\/\\\//.test(route) || /https:\\\/\\\//.test(route), 'a typed link is not held to https');
say(/an https address/.test(route), 'nothing says why a link was refused');

// ── A missing table is not an empty room ───────────────────────────────
// The mistake collaboration made for weeks: the client turned a failure into
// "nothing here yet", which is what somebody with an empty room sees.
say(/ready: false/.test(route), 'the route never reports that it is not set up');
say(/live\.sql/.test(route), 'the message does not name the migration somebody has to run');
say(/!room\.ready/.test(screen), 'the screen cannot tell "not switched on" from "nothing posted yet"');
say(
  screen.indexOf('!room.ready') < screen.indexOf('live.quiet'),
  'the not-ready branch comes after the empty state, so it never shows',
);

// ── It is reachable ────────────────────────────────────────────────────
const rungs = [...page.matchAll(/\{ id: '([a-z_]+)', label: t\('rail\./g)].map((m) => m[1]);
say(rungs.includes('live'), 'the live channel has no rung on the rail');
say(/studioTab === 'live'/.test(page), 'nothing renders when the live rung is pressed');
say(/useState<[^>]*'live'[^>]*>\('make'\)/.test(page), "'live' is not a state the studio can be in");

// ── The room says what it cannot do ────────────────────────────────────
const i18n = await read('../app/lib/i18n.tsx');
const elsewhere = /"live\.elsewhereNote": \{\s*\n?\s*en: "([^"]+)"/.exec(i18n);
say(Boolean(elsewhere), 'nothing explains what "going live" means here');
say(elsewhere && /cannot broadcast|no media server/i.test(elsewhere[1]), 'it does not admit that the app cannot broadcast');
const publicNote = /"live\.public": \{\s*\n?\s*en: "([^"]+)"/.exec(i18n);
say(Boolean(publicNote) && /anybody in the room/i.test(publicNote[1]), 'posting does not say who will be able to play it');
say(publicNote && /not the same as publishing/i.test(publicNote[1]), 'posting is not distinguished from publishing');

// ── Both languages ─────────────────────────────────────────────────────
const added = [...i18n.matchAll(/"(live\.[a-zA-Z.]+|rail\.live(?:\.hint)?)": \{([\s\S]*?)\},?\n/g)];
say(added.length >= 25, `only ${added.length} of the room's strings are in the dictionary`);
for (const [, key, bodyText] of added) {
  say(/en: "/.test(bodyText), `${key} has no English`);
  say(/af: "/.test(bodyText), `${key} has no Afrikaans`);
}

// ── One key, defined once ──────────────────────────────────────────────
const keys = [...i18n.matchAll(/^  "([^"]+)":/gm)].map((m) => m[1]);
const twice = keys.filter((key, at) => keys.indexOf(key) !== at);
say(twice.length === 0, `defined twice: ${[...new Set(twice)].join(', ')}`);

// ── The room is shut to a browser holding the anon key ─────────────────
say((sql.match(/enable row level security/g) ?? []).length === 3, 'one of the three tables is readable straight from a browser');
say(!/create policy/.test(sql), 'a policy was added, and every read here goes through the server instead');
say(/on delete cascade/.test(sql), 'a deleted account leaves its posts behind');
say(/live_room_count/.test(sql) && /live_hello/.test(sql), 'the room cannot count who is in it');
say(/delete from public\.live_here/.test(sql), 'nothing ever sweeps up seats nobody is sitting in');

if (problems.length) {
  console.error(`live: ${problems.length} problem(s)`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('live: the audio is signed rather than published, only your own post comes out, and a missing table is not an empty room');
