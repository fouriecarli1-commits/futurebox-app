/**
 * Names shared with `cloud.ts`, without the client that comes with it.
 *
 * `cloud.ts` builds a Supabase client at module scope. Every other file here
 * imports it dynamically — `await import('./cloud')` — so that a page which
 * only renders text does not pull an auth library into its bundle.
 *
 * `i18n.tsx` needs one string from it: the name of the query parameter a
 * sign-in carries the chosen language back in. Importing `cloud` for a string
 * would put the client into the bundle of every page in the app, which is the
 * one thing that dynamic import exists to prevent. So the string lives here,
 * and `cloud.ts` re-exports it.
 */

/** The language somebody chose, carried through a sign-in in the address. */
export const CHOSE_LANG = 'lang';
