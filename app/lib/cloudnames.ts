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

/* The terms a new account agreed to, and where the agreement is parked while
   the browser is away at Google.

   ElevenLabs' OEM Terms 3(A) -- the agreement that lets FutureBox pass their
   service through to its own members -- requires every member to have
   accepted "a written contract, or 'clickwrap' style online agreements
   involving conspicuous notice to End Users and an affirmative click to
   accept". Their 3(C) then gives them an audit right running for the term
   plus three years. So the tick box is not decoration and neither is the
   record of it: an acceptance nobody can produce afterwards is the same as
   no acceptance, which is the same rule this app already applies to voice
   consent.

   VERSION is the date printed at the top of /terms. It is a string rather
   than a number on purpose -- an auditor is handed "which document did they
   agree to", and a date answers that where a 3 does not. When /terms changes
   materially, this changes with it, and the difference between the two is
   how you find the accounts that need telling.

   PENDING lives in localStorage for one hop. Signing in with Google leaves
   the page, so there is no session to write the acceptance onto at the
   moment the box is ticked; it is written when the browser comes back. */
export const TERMS_VERSION = '15 September 2026';
export const TERMS_PENDING = 'fb.terms.accepted';
