# TONE3000's API Terms of Service, and what they ask of FutureBox

Pasted by the owner on 27 October 2026 (effective 7 July 2026), because
tone3000.com cannot be reached from the build machine. Their design
requirements are in `docs/TONE3000-ONTWERPVEREISTES.md`; their answer on
commercial terms is in `docs/OPEN-QUESTIONS.md` (A2).

## What binds us

| Their term | What it means here | Where we stand |
|---|---|---|
| **Commercial use** needs a commercial agreement, and **a commercial integration must be reviewed and signed off by TONE3000 before it is publicly published or announced** | FutureBox charges, so it is commercial. Their 27 October answer waives fees for now in exchange for promotion, but the sign-off still has to happen | **Open, and it decides launch day.** Without their sign-off by 1 November, the TONE3000 button stays hidden at launch and the rest of the amp section works with the captures we ship |
| **No reselling or sublicensing API access** | Charging credits to load a TONE3000 tone would be selling access to their catalogue | Loading a TONE3000 tone stays at **no credits**. This is the one exception to the owner's "nothing is free" rule, and it is a legal one |
| **"Powered by TONE3000"**, their brand assets, and a link to https://www.tone3000.com in the product | On the TONE3000 button and on the splash, and the link on the help page | To check against their brand assets once they send them |
| **Do not strip, hide or alter creator names, tone metadata or licence information** | A loaded tone must show its creator and its licence | **To build:** fetch the tone (`GET /tones/{id}`) beside the model, and show "by @creator · licence" wherever the tone is shown |
| **Respect each tone's licence**, attribution included | A tone marked CC BY-NC is for non-commercial use | **To build:** an NC tone carries a plain line: "This tone's creator allows it for non-commercial use only. Don't use it in a song you sell." |
| **Do not bulk download, scrape, mirror or cache the catalogue; only download when a user asks** | The app fetches one model when the member chooses it | Holds since 27 October (per-model route, `check:tone3000`) |
| **Deliver per user, authenticated; do not preload or bundle catalogue content** | Nothing of theirs is shipped in the app | Holds: the captures we ship are our own, not from their catalogue |
| **Do not redistribute or host tones on our servers** | The capture goes to the member's own phone and nowhere else | Holds: `captureFor` hands the file to the member and keeps no copy |
| **Tokens only on behalf of the user who authorised them; no pooling accounts** | Every call uses the member's own TONE3000 sign-in | Holds: there is no account key for this supplier |
| **Delete a user's data when they revoke access or ask** | The member's TONE3000 tokens | To confirm that deleting a FutureBox account, or signing out of TONE3000, deletes the `tone3000_tokens` row |
| **No white-labelling**: browsing, search and delivery are presented as TONE3000, under their branding | Their own Select screen does the browsing | Holds: we use their Select flow, not a browser of our own |
| Governing law: **New York** | Disputes go there | Noted |

## What to tell TONE3000 in the sign-off email

1. The integration uses the Select flow and the per-model download only.
2. Loading a tone costs a member nothing; FutureBox does not charge for
   their catalogue.
3. Creator and licence are shown on every loaded tone, with a
   non-commercial warning where the licence says so.
4. "Powered by TONE3000" and the link are on the button, the splash and the
   help page.
5. The screen recording, from the owner's phone.
6. The promotion they asked for: their logo and link on a product page, a
   launch post, and a blog post linking tone3000.com and tone3000.com/api.

## Their general Terms of Service (Hot, Inc., effective 12 March 2025)

Also pasted on 27 October. They bind each member who signs in to TONE3000,
and they add nothing the API terms above do not already cover, except:

- **TONE3000 is run by Hot, Inc.** (New York law). The privacy page names
  them as TONE3000.
- **"Commercial redistribution"** of a tone needs written permission from
  both the creator and TONE3000. A member *playing through* a capture is
  using it, not redistributing it; a member *sharing the capture file* would
  be. The app never offers the file itself for download or sharing, and it
  should stay that way.
- Uploads to TONE3000 are used for their internal research unless the
  uploader opts out by email. FutureBox uploads nothing to them, so this
  touches only a member's own TONE3000 account.

## Their Privacy Policy (Hot, Inc., effective 12 March 2025)

Also pasted on 27 October. TONE3000 is the member's own account, signed in
on TONE3000's own pages, so it is a service the member uses rather than a
processor of ours; what FutureBox sends them is a sign-in request and a
download request on the member's behalf, nothing about the member. Worth
knowing for our privacy page:

- They watch download patterns, IP addresses and user agents to catch bulk
  downloading. A download through FutureBox comes from our server's address
  with the member's token, so every member's downloads share our IP. Their
  per-account limits are what count; ours stay one model per choice.
- They do not sell data; they share with service providers and when the law
  requires it. Their users can ask for access or deletion by email.
- Our privacy page already says it: the sign-in is on TONE3000's own page,
  FutureBox keeps only the token on its server, and deleting the account
  here deletes the token (`app/privacy/page.tsx`, "Your TONE3000 sign-in").

## Their Tone Sharing guidelines

Also pasted on 27 October. They are rules for people who **upload** tones
to TONE3000 (real gear only, one piece of primary gear per pack, titles,
photos, no captures of current plugins or modelers). FutureBox uploads
nothing, so they bind us only through the licence each tone carries.

Two things worth knowing: **paid tones are coming** ("Monetization is coming
soon"), and the API terms say access to paid content may come with
additional terms, so a paid tone is a question for TONE3000 before the app
loads one. And their own words for what is on the library, *"NAM captures
and IRs of real gear"*, are the honest description for our help page.
