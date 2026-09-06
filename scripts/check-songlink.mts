/**
 * The one gate on the link bar, put through its near-misses.
 *
 * `/api/songlink` takes a link somebody pasted and reads the song's name off
 * it. It must never fetch that link — it looks the host up against a closed
 * list and then asks *that provider's own* oEmbed endpoint. A route that
 * fetched whatever URL arrived would be an open proxy sitting inside the
 * deployment's network, reachable by anybody, and the analyse route was
 * rewritten once already for exactly that.
 *
 * So `readLink` is the whole gate, and the cases below are the ones that look
 * like they should pass and must not. Every one of them is a real technique,
 * not a hypothetical: the lookalike domain, the path that only mentions the
 * host, the credentials that make a URL parser disagree with itself, and the
 * schemes that mean something entirely different on a server.
 */
import { readLink, providerFor } from '../app/lib/server/songlink';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

/* ── The links that are meant to work ──────────────────────────────────── */
const GOOD: ReadonlyArray<readonly [string, string]> = [
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'YouTube'],
  ['https://youtu.be/dQw4w9WgXcQ', 'YouTube'],
  ['https://music.youtube.com/watch?v=dQw4w9WgXcQ', 'YouTube'],
  ['https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT', 'Spotify'],
  ['https://soundcloud.com/forss/flickermood', 'SoundCloud'],
  ['https://music.apple.com/za/album/de-la-rey/1440810000', 'Apple Music'],
  ['https://www.tiktok.com/@someone/video/7000000000000000000', 'TikTok'],
  ['http://youtube.com/watch?v=abc', 'YouTube'],
];
for (const [link, name] of GOOD) {
  const read = readLink(link);
  check(`a real ${name} link is read`, read.ok && read.provider.name === name,
    read.ok ? read.provider.name : `refused: ${read.why}`);
}

/* The tracking tail a share button adds survives, because it is part of what
   the provider is asked about and stripping it can change which track. */
const withTail = readLink('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc123');
check('the tracking tail on a share link is kept',
  withTail.ok && withTail.url.includes('si=abc123'), withTail.ok ? withTail.url : withTail.why);

/* ── The ones that must be refused ─────────────────────────────────────── */
const BAD: ReadonlyArray<readonly [string, string]> = [
  ['https://youtube.com.evil.example/watch?v=1', 'a lookalike domain that merely starts with the real one'],
  ['https://evil.example/youtube.com/watch?v=1', 'the real host written into somebody else’s path'],
  ['https://notyoutube.com/watch?v=1', 'a host that ends with the real one but is not a subdomain of it'],
  ['https://user:pass@youtube.com@evil.example/', 'credentials that make two URL readers disagree on the host'],
  ['https://youtube.com@evil.example/watch?v=1', 'the real host used as a username'],
  ['file:///etc/passwd', 'a file on the server'],
  ['data:text/html,<script>1</script>', 'a data link'],
  ['javascript:alert(1)', 'a javascript link'],
  ['http://169.254.169.254/latest/meta-data/', 'the cloud metadata address'],
  ['http://localhost:3000/api/mail/setup', 'this app’s own routes'],
  ['http://127.0.0.1/', 'the loopback address'],
  ['http://[::1]/', 'the loopback address written in v6'],
  ['http://10.0.0.1/', 'a private address'],
  ['not a url at all', 'something that is not a link'],
  ['https://vimeo.com/12345', 'a site that is not on the list'],
];
for (const [link, what] of BAD) {
  const read = readLink(link);
  check(`refused: ${what}`, !read.ok, read.ok ? `it allowed ${read.provider.name} — ${read.url}` : read.why);
}

/* ── And the matcher on its own, because that is where the bug would be ── */
check('a bare host matches', providerFor('youtube.com')?.name === 'YouTube');
check('www is stripped before matching', providerFor('www.youtube.com')?.name === 'YouTube');
check('a real subdomain matches', providerFor('music.youtube.com')?.name === 'YouTube');
check('a suffix that is not a subdomain does not', providerFor('notyoutube.com') === null);
check('a prefix that is not the host does not', providerFor('youtube.com.evil.example') === null);
check('case does not matter', providerFor('YouTube.COM')?.name === 'YouTube');

if (failures) {
  console.error(`\ncheck:songlink — ${failures} failure(s). The link bar's gate is open.\n`);
  process.exit(1);
}
console.log('\ncheck:songlink — only the five listed sites get through, and the route never fetches what it was handed.');
