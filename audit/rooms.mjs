/**
 * The rooms, once, so a thirteenth is not invisible to ten probes.
 *
 * ── What this replaces ───────────────────────────────────────────────────
 *
 * This exact list of twelve was typed into ten files: a11y, boxes, buttons,
 * cards, deep, shots, underbar, walk, wide and writing. Identical in every
 * one, checked. So the day a room is added to the app it is walked by none
 * of them — and every one of them still prints a verdict, in the confident
 * present tense, over a set that no longer matches the product.
 *
 * That is the fault class that has bitten twice in one day: `contrast.mjs`
 * measured six rooms out of twelve and none of the five tabs, and reported
 * "0 below AA" about a third of the app; `check:musiclicence` asserted a
 * CLAIM rather than a constraint and then defended it with a red build. Both
 * came back green. A check can be wrong by measuring a subset just as easily
 * as by measuring the wrong thing, and the subset version is harder to see
 * because nothing about the output looks partial.
 *
 * ── Why the names are here and not derived ───────────────────────────────
 *
 * `app/lib/surfaces.ts` is the app's own list of rooms and carries no display
 * name — a surface has an id, a purpose and what the copilot can do there,
 * because that is what the copilot needs. What a probe clicks is the name a
 * person reads on the door, and the two have never been the same string.
 *
 * So the map below is written by hand, and `check:probes` holds it to
 * `SURFACES`: a surface with no entry here fails the build, by name, with the
 * id it could not find. That is the whole point — a thirteenth room does not
 * quietly go unwalked, it stops the build until somebody says what its door
 * says.
 */

/** Surface id in `app/lib/surfaces.ts` → the name on its door. */
export const DOORS = {
  make: 'Make a song',
  studio: 'Studio',
  booth: 'The Booth',
  voice_studio: 'Your voice',
  sound: 'Sound trainer',
  canvas: 'Video desk',
  hooks_feed: 'Hooks',
  channels: 'Channel',
  live: 'Live',
  podcast: 'Podcast',
  campaign: 'Adverts',
  collab: 'Collab Radar',
};

/**
 * Every room, in the order the probes have always walked them.
 *
 * Order is kept because several probes print a table and a reordered table
 * reads as a changed result when nothing changed.
 */
export const ROOMS = [
  'Make a song', 'Studio', 'The Booth', 'Your voice', 'Sound trainer', 'Video desk',
  'Hooks', 'Channel', 'Live', 'Podcast', 'Adverts', 'Collab Radar',
];

/**
 * The five at the bottom of the screen.
 *
 * Not rooms — rooms are opened to do a job, these are where somebody lives
 * between jobs. `contrast.mjs` is the first probe to walk them, and it walks
 * them because the creative page is the longest scroll in the app and was
 * being measured by nothing at all.
 */
export const TABS = ['Spotlight', 'Live', 'Make', 'Library', 'You'];
