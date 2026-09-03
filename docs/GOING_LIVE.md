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

### What does not hold up, in order of how much it matters

1. **Two high-severity advisories in `postcss`**, reached through `next@14.2.35`. Both concern
   attacker-controlled CSS and source maps at build time. We author all our own CSS and process none
   from users, so the practical exposure is low — but it is real, and the fix is `next@16`, which is
   a major upgrade and a piece of scheduled work rather than a patch.
   *Verified with `npm audit --omit=dev`.*

2. **`'unsafe-inline'` and `'unsafe-eval'` in the script policy.** Next's hydration bootstrap is an
   inline script, so removing them needs per-request nonces threaded through the app. `next.config`
   already says this rather than pretending otherwise. Until then, the CSP is weaker against XSS
   than it looks — though with no `dangerouslySetInnerHTML` anywhere, there is little to inject
   into.

3. **Two PostgREST filters are built by string interpolation** (`app/api/collab/route.ts`, the `.or()`
   calls). Today both values are UUIDs read out of our own tables, so nothing injectable reaches
   them, and the handle from the request goes through a parameterised `.eq()`. It is not a hole; it
   is a shape that becomes one the day somebody passes a user-supplied value. Worth closing before
   that day.

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
      files here — the dashboard lists them.
- [ ] Decide what happens when a video engine bill spikes. The ceilings exist; make sure the alert
      reaches a person.
- [ ] Schedule the `next@16` upgrade.

---

## 2. The name

**This is the finding to act on first.**

DNS was resolved for ten candidates. Eight are taken:

| Domain | Status |
|---|---|
| `futurebox.app` | **taken** — resolves to 165.22.123.139 |
| `futurebox.com` | taken |
| `futurebox.co.za` | taken |
| `futurebox.io` | taken |
| `futurebox.ai` | taken |
| `futurebox.co` | taken |
| `futurebox.net` | taken |
| `futurebox.org` | taken |
| `futurebox.studio` | no A record — possibly free |
| `getfuturebox.com` | no A record — possibly free |

**The app currently shows people `futurebox.app/@theirhandle` as their own address**, on the studio
header and in share copy. We do not own that domain and somebody else is serving from it. That is a
promise the product cannot keep and the one thing here that should not ship as it stands.

Two caveats on the method. No A record is not proof a domain is free — it can be registered and
unused — and DNS says nothing at all about **trademarks**, which is the part that actually decides
whether you can trade under a name. Registry and trademark lookups are blocked from this
environment, so those have to be done from your side:

- **Domains**: any registrar's search, or `whois`.
- **South Africa**: CIPC for company names, and the trademark register for classes 9 and 42
  (software and software services).
- **Elsewhere**: the EUIPO and USPTO search tools are free and take minutes.

"FutureBox" is two common English words, which cuts both ways: hard for anyone to own outright, and
hard for you to own either.

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

From `docs/FUNCTION_INVENTORY.md`, still open:

- **No asset library.** Blocks reference images, brand kits and start frames.
- **No search**, of any kind.
- **No voice library** — your own clones and a stock list, against a competitor's thousands.
- **No transcripts room and no speaker archive**; transcription exists only inside the Booth.
- **Adverts**: no format matrix, no performance read-back, no brand kit.
- **Collab has no live notification** — a request is seen when the page is opened.

And two things that are true but not yet said in the interface everywhere they apply: that the work
lives on this device, and that publishing to the ad platforms is not connected.
