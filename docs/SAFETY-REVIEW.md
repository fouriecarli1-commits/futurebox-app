# Safety and standards review

Asked for on 5 September 2026: *"is al die gates in plek volgens elevenlabs se
regulasies. Check of die app volgens standaard is soos vibefyCode sou check.
kyk of die app op standaard is, en of die code goed en veilig is en nie sloppy
nie."*

Every claim below says how it was checked. Where something could not be
checked from here, it says that instead of guessing — this environment has no
ElevenLabs key, no Supabase project and no outbound access to the live site, so
anything needing one of those is named as unverified rather than assumed good.

---

## 1. ElevenLabs' rules, gate by gate

Their prohibited-use policy turns on four things: whose voice it is, what the
content is, who is paying, and whether anybody is being deceived. Each one has
somewhere in this code where it is enforced.

| Their rule | Where it is enforced | How it was checked |
|---|---|---|
| **A voice may only be cloned by the person it belongs to.** | `app/api/voice/clone/route.ts` refuses without `consent=own-voice`, and writes the consent — the exact sentence, the moment, and a salted hash of the address — onto the row. | Read the route; the sentence lives in `app/lib/consent.ts` and is imported by both the screen that shows it and the route that stores it, so a record can never claim words nobody read. |
| **A cloned voice may not be used by anybody else.** | `voice/speak`, `voice/change` and `music` all check the voice or the trained sound against our own table, keyed on the verified caller, before it goes near ElevenLabs. A stale id is dropped rather than refused. | Read all three. `voice/change` returns 403 "That voice is not yours to use" when the id is neither the caller's nor stock. |
| **Consent must be withdrawable.** | The same route handles deletion; the account screen deletes the voice and the row together. | Read `voice/clone`'s DELETE and `DeleteAccount`. |
| **No sexual content involving minors, no incitement, no terrorist content, no weapons instructions.** | `app/lib/moderation.ts` — a fixed rule set, no network call, checked before anything is charged or sent. Nine categories, in English and Afrikaans, because a gate that only reads English is not a gate in this country. | Read the file; `check:security` asserts the guard is on the routes that generate. |
| **The screening happens before the vendor sees it.** | `guard()` runs before the key is even read in `api/music`, and the comment says why: a gate that can only be exercised on a fully configured install is a gate nobody can test. | Read `api/music/route.ts`. |
| **No impersonation.** | Reserved names: nobody may take the app's own name or a lookalike of it (`app/lib/reserved.ts`, matched after stripping accents and lookalike characters), enforced in the field and again in the route. | `npm run check:reserved` |
| **Say that it is AI.** | The landing page's first line, and the model stack printed under every release. | Read; it is the product's premise rather than a disclaimer. |
| **Commercial use needs a paid plan.** | This one is about **your** ElevenLabs plan, not your members'. Everything made here is made on one account. | **Unverified, and it needs you.** If that account is on the free tier, nothing made in this app may be released commercially — by anybody. Check the plan before the first paying member. |

**Rate limiting**, which is not their rule but is what stops a loop spending the
month's allowance in an afternoon: the two routes that can be called without an
account — the copilot and the help desk — are capped per address in
`lib/server/brake.ts`. The allowance itself is watched by `/api/watch`, which
emails at three quarters, nine tenths and nearly gone, once each per billing
month.

**Not checked, because it cannot be from here:** whether a real request is
accepted, what a real refusal looks like, and whether the account's plan carries
a commercial licence. All three need the key.

---

## 2. The standards pass

Run today, all green:

- **44 checks** wired into `package.json`, of which **82 are browser probes**
  that drive the real app rather than reading the code. All pass.
- **`npm audit --omit=dev`: 0 vulnerabilities.** On `next@16.3.4`; the sixteen
  advisories that were open against `next@14` in August are closed.
- **TypeScript: no errors**, and no `@ts-ignore` or `@ts-nocheck` anywhere.
- **One `as any` in 67,000 lines**, and it is gone as of this review — the five
  feed pills now carry `as const` so a typo in an id is a build error rather
  than a pill that lights up and shows an empty page.
- **No `console.log`** outside the probes. **No TODO, FIXME or HACK.**
- **20 eslint suppressions**, every one of them in a category with a reason:
  `no-img-element` for blob URLs a Next `<Image>` cannot take, `media-has-caption`
  for generated audio, `exhaustive-deps` where a re-run would fire a generation.

Security posture, asserted rather than described — `check:security` fails the
build on each of these, and every assertion was negative-tested:

- no table without row-level security
- no `dangerouslySetInnerHTML`, `eval` or `new Function`
- no secret name in the built client bundle (six checked)
- no service-key route that forgets its caller, or is listed as anonymous
  without a secret
- no interpolated PostgREST filter without a UUID shape check
- every security header and load-bearing CSP directive still declared
- no mailbox or `mailto:` link reaching the browser

**Still open, unchanged from `docs/GOING_LIVE.md` §1:** `'unsafe-inline'` and
`'unsafe-eval'` in the script policy, which Next's hydration bootstrap needs
until per-request nonces are threaded through. Everything on the device is
unencrypted and unbacked-up, and the app says so. There is no second factor and
no independent penetration test.

**One thing this review adds to that list:** no `Strict-Transport-Security`
header is set by this app. Vercel sends one for domains it serves, so this is
probably covered — but "probably" is not a check, and it is a single `curl -I`
against the live site to settle. It could not be run from here; the proxy
refuses outbound to the deployment.

---

## 3. Signed in stays signed in

Asked twice, and the second time as a standing instruction: *"onthou dat die app
wat in gelog is in gelog bly. Dit moenie heeltyd oor en oor in log nie."*

There are two halves and they were in different states.

**With a Supabase project behind the app** — which is the live deployment — the
auth library holds the session in this browser and refreshes it. `createClient`
is called with its defaults, so `persistSession` and `autoRefreshToken` are both
on. Nothing was wrong here, and nothing here could be tested from this
environment: it needs real keys.

**Without one**, signing in set a state variable and nothing else. Every reload
signed the person out, and there is no way for somebody to tell that from a
login that does not work. A deployment missing two environment variables looks
exactly like an app that cannot remember anybody. That is fixed: a device-only
account is written down, read back on load, and cleared on sign out.

`npm run check:staysignedin` presses it the way a person does:

```
ok   signing in puts you in the app
ok   and a reload leaves you signed in
ok   landing on Make, not on a sign-in form — 15 rooms on the door
ok   and there is no sign-in form in front of you
ok   signing out survives a reload too
```

Negative-tested: with the line that writes it down removed, two of those five
fail. A check that cannot fail is decoration.

**One thing to watch on the live site.** A session is kept per origin. If
somebody signs in on `futureboxstudio.co.za` and is then redirected to
`futurebox.studio`, the second origin has no session and asks them to sign in
again — which would look exactly like the fault above and would not be it. The
four Vercel redirects in `docs/OPEN-QUESTIONS.md` §E are what settle that:
one Production domain, the other three pointing at it.

---

## 4. What is honestly not covered

- Anything that needs a real ElevenLabs, Music.ai, Resend or Supabase key.
- The live deployment's headers, certificates and redirects.
- Whether a generated song is any *good* — the plan sent to the engine is now
  checked (`check:makesong`), and what comes back cannot be, from here.
- An independent security assessment. Everything above is this codebase
  checking itself, which is worth something and is not the same thing.
