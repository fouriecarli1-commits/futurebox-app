/**
 * How many pictures may go up on one request, and how much they may weigh.
 *
 * Its own file, with nothing in it, because three places need the same two
 * numbers and they sit on opposite sides of the browser/server line:
 * `lib/server/picture.ts` packs the call to Google, `app/api/google/picture`
 * refuses an over-weight request, and `lib/packpicture.ts` shrinks pictures
 * in a browser so they fit. Importing the server file into the browser to
 * reach a constant would drag an API key reader into the page bundle for the
 * sake of the number 3.
 */

/**
 * How many pictures may go in at once.
 *
 * ── Why more than one ────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"al die spesiale funksies van google moet ook daar
 * in wees."* This was the largest one not being used, and it was not being
 * used by one line: the parts array in `server/picture.ts` was built to hold
 * a list and only ever had one thing put in it.
 *
 * Gemini reads several pictures in one turn, and that is the difference
 * between "draw me a woman in a kitchen" and the things people actually
 * want: put THIS person in THAT scene, keep the same character on page four
 * as on page one, put MY logo on this poster, make this photograph look like
 * that one.
 *
 * ── Why three and not ten ────────────────────────────────────────────────
 *
 * The body limit. Each picture travels as base64 and the platform refuses a
 * request past four and a half megabytes BEFORE the route runs — a bare 413
 * with no sentence in it, which is what `check:bodylimit` exists for. Three
 * shrunk references fit inside `BUDGET` with room for the words; four start
 * to cost each other more quality than the fourth reference adds.
 */
export const MOST_PICTURES = 3;

/**
 * What all the pictures on one request may come to, as base64 characters.
 *
 * Three megabytes against the route's four, and against the platform's four
 * and a half. The gap is for the words, the JSON, the headers and the one
 * photograph that is exactly at the ceiling — a limit set exactly at the
 * wall fails on the request that is exactly at the wall.
 */
export const BUDGET = 3 * 1024 * 1024;
