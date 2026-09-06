/**
 * The live room's link field, put through its near-misses.
 *
 *   "mense mag net toegang hê om tiktok links te post … Jy moet hierdie kan
 *    toets dat dit nie snaakse content deel nie."
 *   "youtube, tiktok, facebook, vimeo, spotify, apple music, soundcloud,
 *    alles sal kan connect."
 *
 * This is that test. The room used to take any https address, which is not a
 * link field — it is a place to publish a URL of your choosing to everybody
 * in the room, with nothing between it and wherever somebody wanted to send
 * them except the scheme.
 *
 * Every case below is a real technique rather than a hypothetical, and each
 * one is a single character away from working: the lookalike domain, the real
 * host in somebody else's path, the credentials that make two URL parsers
 * disagree, the scheme that means something else entirely, and the shortener
 * that is a link to a link.
 */
import { PLATFORMS, platformFor, readPlatformLink } from '../app/lib/server/platformlink';

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

/* ── The links people will actually paste ──────────────────────────────── */
const GOOD: ReadonlyArray<readonly [string, string]> = [
  ['https://www.tiktok.com/@someone/video/7000000000000000000', 'TikTok'],
  ['https://vm.tiktok.com/ZMabcdefg/', 'TikTok'],
  ['https://m.tiktok.com/v/700.html', 'TikTok'],
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'YouTube'],
  ['https://youtu.be/dQw4w9WgXcQ', 'YouTube'],
  ['https://music.youtube.com/watch?v=abc', 'YouTube'],
  ['https://www.facebook.com/someone/videos/123', 'Facebook'],
  ['https://fb.watch/abcdef/', 'Facebook'],
  ['https://m.facebook.com/someone', 'Facebook'],
  ['https://vimeo.com/123456789', 'Vimeo'],
  ['https://player.vimeo.com/video/123456789', 'Vimeo'],
  ['https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT', 'Spotify'],
  ['https://music.apple.com/za/album/something/1440810000', 'Apple Music'],
  ['https://soundcloud.com/forss/flickermood', 'SoundCloud'],
  ['https://on.soundcloud.com/abcdef', 'SoundCloud'],
];
check('every one of the seven is reachable',
  new Set(GOOD.map(([, name]) => name)).size === PLATFORMS.length,
  `${new Set(GOOD.map(([, name]) => name)).size} of ${PLATFORMS.length} covered by the cases below`);
for (const [link, name] of GOOD) {
  const read = readPlatformLink(link);
  check(`a real ${name} link is taken: ${link.slice(8, 44)}`,
    read.ok && read.platform === name, read.ok ? read.platform : read.why);
}

const tail = readPlatformLink('https://www.tiktok.com/@someone/video/700?is_from_webapp=1');
check('the tail a share sheet adds survives, because it can change which video',
  tail.ok && tail.url.includes('is_from_webapp=1'), tail.ok ? tail.url : tail.why);

const fragment = readPlatformLink('https://www.tiktok.com/@someone/video/700#<script>');
check('and the fragment is dropped, because it never reaches their server anyway',
  fragment.ok && !fragment.url.includes('#'), fragment.ok ? fragment.url : fragment.why);

/* ── Everything that must be refused ───────────────────────────────────── */
const BAD: ReadonlyArray<readonly [string, string]> = [
  ['https://tiktok.com.evil.example/video/1', 'a lookalike domain that merely starts with the real one'],
  ['https://evil.example/tiktok.com/video/1', 'the real host written into somebody else’s path'],
  ['https://nottiktok.com/@a/video/1', 'a host that ends with the real one but is not a subdomain'],
  ['https://faketiktok.com/@a', 'a host that contains the real one'],
  ['https://user:pass@tiktok.com@evil.example/', 'credentials that make two URL readers disagree'],
  ['https://tiktok.com@evil.example/@a/video/1', 'the real host used as a username'],
  ['http://www.tiktok.com/@a/video/1', 'plain http, which somebody on the same network can rewrite'],
  ['javascript:alert(1)', 'a javascript link'],
  ['data:text/html,<script>1</script>', 'a data link'],
  ['file:///etc/passwd', 'a file on the machine'],
  ['https://bit.ly/3abcdef', 'a shortener — a link to a link, which defeats the whole gate'],
  ['https://t.co/abcdef', 'another shortener'],
  ['https://futurebox.studio/api/mail/setup', 'this app’s own routes'],
  ['https://twitter.com/someone/status/1', 'a platform that is not on the list'],
  ['https://facebook.com.evil.example/1', 'a lookalike of one of the others'],
  ['https://notyoutube.com/watch?v=1', 'and of another'],
  ['http://169.254.169.254/latest/meta-data/', 'the cloud metadata address'],
  ['http://localhost:3000/', 'the loopback address'],
  ['not a link at all', 'something that is not a link'],
  ['', 'nothing'],
];
for (const [link, what] of BAD) {
  const read = readPlatformLink(link);
  check(`refused: ${what}`, !read.ok, read.ok ? `it allowed ${read.url}` : read.why);
}

/* ── And the host matcher on its own, which is where the bug would be ──── */
check('a bare host matches', platformFor('tiktok.com') === 'TikTok');
check('www is stripped before matching', platformFor('www.youtube.com') === 'YouTube');
check('a real subdomain matches', platformFor('m.facebook.com') === 'Facebook');
check('case does not matter', platformFor('TikTok.COM') === 'TikTok');
check('a suffix that is not a subdomain does not match', platformFor('nottiktok.com') === null);
check('a prefix that is not the host does not match', platformFor('youtube.com.evil.example') === null);
check('and neither does something merely containing it', platformFor('fakevimeo.com') === null);
check('nor a platform nobody put on the list', platformFor('twitter.com') === null);

if (failures) {
  console.error(`\ncheck:platformlink — ${failures} failure(s). The live room's link field is open.\n`);
  process.exit(1);
}
console.log('\ncheck:platformlink — only the seven get in, and the destination is the only thing this claims to know.');
