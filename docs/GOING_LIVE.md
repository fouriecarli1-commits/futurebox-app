# Going live: security, the name, and what is left

Written against the code on 3 September 2026, checked rather than remembered. Every claim below
names how it was verified. Where something could not be checked from here, it says so.

---

## 1. Security

### The question that has to be answered first

**"Will it be unhackable?"** — no. Nothing is, and any tool or person who tells you otherwise is
selling something. The honest questions are *what is an attacker able to reach*, *what would it cost
them*, and *what happens to your users if they succeed*. Those have real answers, and they are good
ones.

### What holds up

| | How it was checked |
|---|---|
| **Identity cannot be forged.** A caller is identified by `auth.getUser(token)` — Supabase verifies the signature server-side. The user id is never taken from what the request claims about itself. | Read `app/lib/server/account.ts` |
| **The tier is read from the database**, keyed on the verified id, and a lapsed membership is treated as free whatever the row still says. | Same file, `tierOf` |
| **Every service-key query is scoped to the caller.** The service key bypasses row-level security, so this is the one that matters. All 20-odd routes reference `caller.id`, and deletes carry both conditions — `.eq('id', id).eq('owner', caller.id)` — rather than the id alone. | Audited every route using `admin()` |
| **Row-level security is on**, with per-owner policies across the tables. Collab messages are checked twice: in the route and in the policy, so the promise survives somebody later writing a route that forgets. | `supabase/*.sql` |
| **No secret reaches the browser.** Searched the built client bundle for every secret's name — service role key, Anthropic, ElevenLabs, Paystack, the IP salt, the owner list. Zero hits. | `grep` over `.next/static` after a production build |
| **Security headers are served**: a real Content-Security-Policy with an allow-list rather than a wildcard, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, and a `Permissions-Policy` that grants only camera and microphone, to self. | `curl -I` against the running app |
| **Abuse of the free tier is defended.** Normalised email keys (so `a.n.r.e+one@gmail.com` and `anre@gmail.com` are one allowance), salted IP hashes rather than stored addresses, and per-day ceilings on the free tier only. | `supabase/abuse.sql` |
| **Model inputs are screened at the door**, in our own words, before they reach a vendor. | `app/lib/moderation.ts`, used by the copilot, the ad writer and the video routes |
| **No `dangerouslySetInnerHTML`, no `eval`, no `new Function`** anywhere in the app. | `grep` over `app/` |

That is a better posture than most products have at launch. It was not luck — the comments in those
files show it was argued about.

**Every row above is now also a test.** `npm run check:security` asserts them, and it runs in CI: no
table without row-level security, no `dangerouslySetInnerHTML` or `eval` or `new Function`, no secret
name in the built client bundle, no service-key route that forgets its caller, no interpolated
PostgREST filter without a shape check, and every security header and load-bearing CSP directive
still declared.

That exists because of §1 below. A claim written once is a claim nobody re-runs, and one of these was
wrong for weeks. Each assertion was negative-tested — broken on purpose to confirm it fails — because
a check that cannot fail is decoration.

### What does not hold up, in order of how much it matters

1. ~~**Two high-severity advisories in `postcss`**~~ — **fixed, and this entry was wrong.**

   What it said: two advisories in `postcss`, both about attacker-controlled CSS at build time, with
   low practical exposure because we author all our own CSS.

   What `npm audit --omit=dev` actually listed against `next@14.2.35`, read properly rather than
   skimmed: **sixteen advisories in Next itself**, and they are not build-time. Among them —
   cross-site scripting in App Router applications using CSP nonces; cache poisoning in React Server
   Component responses and in middleware redirects; server-side request forgery via WebSocket
   upgrades and via Server Actions; HTTP request smuggling in rewrites; unauthenticated disclosure of
   internal Server Function endpoints; and several denial-of-service paths through the image
   optimiser and Server Components.

   "Practical exposure is low" was a sentence about the wrong two advisories. For an app about to
   take money from strangers it was the most serious thing on this page, filed as scheduled work.

   Now on `next@16.3.4`. `npm audit --omit=dev` reports **0 vulnerabilities**.

   The upgrade broke exactly one thing: `params` on a dynamic route is a promise from Next 15
   onwards, and this app has one dynamic route. Everything else — all thirteen rooms, the prices, the
   contrast, the tap targets, the security headers — was re-checked with `audit/` afterwards and is
   unchanged.

2. **`'unsafe-inline'` and `'unsafe-eval'` in the script policy.** Next's hydration bootstrap is an
   inline script, so removing them needs per-request nonces threaded through the app. `next.config`
   already says this rather than pretending otherwise. Until then, the CSP is weaker against XSS
   than it looks — though with no `dangerouslySetInnerHTML` anywhere, there is little to inject
   into.

3. ~~**Two PostgREST filters are built by string interpolation**~~ — **closed.** The assessment was
   right: both values were UUIDs, and nothing injectable reached them. But that was true two lookups
   away from where it was used, and safety you have to trace through a file is safety that lasts
   until the next caller does not trace it. Both now go through a `filterSafe` UUID assertion at the
   point of interpolation, and `check:security` fails if an `.or()` appears without one.

4. **Everything on the device is unencrypted and unbacked-up.** Songs, the new history, social
   handles and the theme live in that browser's storage. Clearing site data loses them, and another
   device never had them. The app says this in several places; it should say it everywhere it is
   true.

5. **No second factor on accounts**, and no independent penetration test. Neither is a defect
   exactly; both are things a paying customer may eventually ask about.

### Before you take money from strangers

- [ ] Rotate every key that has ever been in a `.env` file on a laptop, and set them only in Vercel.
- [ ] Turn on Supabase's own database backups, and check a restore actually works.
- [ ] Confirm RLS is enabled on **every** table in the live project, not only the ones in the SQL
      files here — the dashboard lists them. `check:security` covers the files; only the dashboard
      can tell you what is actually in the database.
- [ ] Decide what happens when a video engine bill spikes. The ceilings exist; make sure the alert
      reaches a person.
- [x] ~~Schedule the `next@16` upgrade.~~ Done — and it was more urgent than this list made it look.

---

## 2. The name — settled

**Registered:** `futurebox.studio` and `futureboxstudio.co.za`.

`futurebox.studio` is the primary. It is a generic top-level domain, so it carries no country
signal in search; `futureboxstudio.co.za` sits alongside it for the South African market and
redirects. Set `NEXT_PUBLIC_SITE_HOST=futurebox.studio` in Vercel once the domain is added there.
Nothing else in the app needs editing — `check:brand` fails the build if an address is typed
anywhere but `lib/brand.ts`, and the metadata, sitemap, robots and Open Graph tags all derive from
that one variable. It was built against a different host and read back to be sure.

### Why not the plain name

Every short form was taken and serving:

| Domain | Status |
|---|---|
| `futurebox.com` | taken |
| `futurebox.app` | taken |
| `futurebox.co.za` | taken |
| `futureboxstudio.com` | taken |
| `thefuturebox.com` | taken |
| `futurebox.io` · `.ai` · `.co` · `.net` · `.org` | taken |

Five of those are the FutureBox name itself in active use by other people. That is why the name
carries a word of its own now — "studio" distinguishes, where "the" and "app" do not: in trademark
terms those are non-distinctive elements and the distinctive part would still have been somebody
else's.

### Still open, and it is not the domain

**The trademark.** A registered domain and a registered company name are neither of them a
trademark, and this is the part that decides whether you can trade under a name at all.

- **South Africa:** CIPC's trademark register, classes 9 and 42 (software, and software services).
- **Elsewhere:** the EUIPO and USPTO search tools are free and take minutes.

Trademarks are territorial, which cuts in your favour here: somebody running `futurebox.com` in
another country does not by itself stop you trading as FutureBox Studio in South Africa. What would
stop you is a FUTUREBOX mark registered *in South Africa* in those classes, or somebody with a real
reputation under the name here. Neither is answered by DNS, and neither has been checked.

Registry and trademark lookups are blocked from the build environment — RDAP, whois and every DNS
API are refused by the egress proxy — so this has to be done from your side.

---

## 3. Registering everything

Roughly in this order, because each one depends on the one above it.

1. **The name and the domain.** Settle this before anything is printed, and before the URL in the
   app is real.
2. **The company.** CIPC registration, and a business bank account in that name — Paystack will want
   both.
3. **Paystack live keys**, which need the company and the bank account. Test keys only work with test
   payments; the swap is deliberate and documented in `.env.example`.
4. **The vendor accounts on a company card** — ElevenLabs, Anthropic, the video engines. Personal
   cards are how a business ends up unable to prove its own costs.
5. **Privacy.** You process personal data of South Africans, so POPIA applies: an information
   officer registered with the Information Regulator, and a privacy notice that matches what the app
   actually does. `legal/` already has drafts; they need reading against the final feature set.
6. **The app stores**, if the Expo app ships. Apple and Google both take days to weeks, and both ask
   about data collection in detail — answer from `docs/DATA_MAP.md` rather than from memory.

---

## 4. What is not finished in the product

From `docs/FUNCTION_INVENTORY.md`, after a second pass that clicked through all thirteen rooms in a
browser rather than reading the code:

**Closed since the first pass**

- **A picture library** — `lib/assets.ts`, kept on the device, capped, with a star that means keep.
  It is what the video desk's start frame picks from and where the brand kit's logo lives.
- **Search** — ⌘K over the rooms, the songs and everything the rooms have made.
- **A history and favourites** in every room that makes something.
- **A voice library you can hear** — each stock voice now carries what it is (an accent, an age, what
  it suits) and a free sample played through our own route, so choosing a voice no longer means
  paying for a reading to find out what you bought.
- **Adverts: the format matrix and the brand kit.** The platform chips carry each one's shape, hook
  window and hashtag limit, and those go to the writer; the brand kit holds the name, the voice, the
  logo and the colour so Thursday's adverts sound like Monday's.
- **Collab now says somebody is waiting** — a count on the rail, so an ask is not invisible until
  the room is opened.

**Still open, and why**

- **No library for audio or video brought in from outside.** The history is per-room, not a place
  you file things into.
- ~~No transcripts room and no speaker archive~~ — **closed**, though not as a room. Transcription
  with speaker labels now sits on a published episode beside the dub, which is where the other thing
  you do to a finished episode already lives. A fourteenth rail entry for something nobody sets out
  to make would have cost more than it was worth: people set out to publish an episode and then want
  show notes.
- **Adverts: no performance read-back.** This one is not a matter of building a screen. It needs the
  ad platforms' own reporting APIs, which are OAuth against approved developer apps — the same wall
  that stops us publishing to them, described in `app/data/social.ts`.
- ~~`next@16`~~ — **done**. It was not two advisories; see §1.

And two things that are true and not yet said everywhere they apply: that the work lives on this
device, and that publishing to the ad platforms is not connected.
