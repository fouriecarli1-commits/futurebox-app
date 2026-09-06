# What is still yours to switch on

One list, in the order things depend on each other. Every entry says **where**
it goes, **what breaks until it does**, and **how to tell it worked** — because
almost all of these fail silently, and a setting you cannot check is a setting
you will assume you made.

Nothing here is code. It is all a key, a click or a file to run.

Last written 5 September 2026. `docs/OPEN-QUESTIONS.md` §E is the same list in
one line each; this is the one to actually work from.

---

## Now — it is costing you money today

### 1. `OWNER_EMAIL`

**Where:** Vercel → Settings → Environment Variables → `OWNER_EMAIL`, then
redeploy.
**What to put:** the address you sign in with. Comma-separated if there is more
than one of you. No `NEXT_PUBLIC_` prefix, ever — that would ship the list of
who runs the place to every visitor.

**What is broken until you do.** Everything, quietly:

- You are metered as a free user on your own app. `callerFrom` reads
  `isOwner(email) ? 'label' : tierOf(...)`, so with the list empty you are
  paying credits for your own engines and hitting the free tier's two-a-day
  ceiling.
- You cannot use the FutureBox name as your recording name. The rule that stops
  strangers posing as the official channel has nobody to exempt.
- The allowance warnings from `/api/watch` have nowhere to go.
- `/api/mail/setup?test=1` has nobody to send the test letter to.

**How to tell it worked:** open the Channel and set your recording name to
`FutureBox_Official`. If it saves, the list has you on it. If it says "this app
has no owner set", the variable did not take — check you redeployed, because a
variable saved and not redeployed changes nothing.

### 2. The Supabase files that have never been run

Supabase → SQL Editor → paste → Run. Safe to run again; each one is written to
be. In this order:

| File | What is dead without it |
|---|---|
| `supabase/addons.sql` | The marketing add-on cannot be bought or granted |
| `supabase/posting.sql` | The posting queue answers "not set up" |
| `supabase/dubs.sql` | Dubbing answers "not set up" |
| `supabase/invites.sql` | The invite link in a collab email answers "not set up" |
| `supabase/charts.sql` | The Top 10 bars on Spotlight stay empty for ever |

**How to tell:** open the room. Each of those says "not set up" in plain words
rather than failing — that sentence *is* the check.

If you are not sure which of the older files have been run, the Table Editor
lists what exists. `schema.sql`, `usage.sql`, `abuse.sql`, `credits.sql`,
`collab.sql`, `live.sql`, `radar.sql`, `podcast.sql`, `video.sql` and
`video2.sql` are the ones the main rooms need.

### 3. Check the ElevenLabs plan carries a commercial licence

**Where:** the ElevenLabs dashboard, on the account whose key is in Vercel.

**Why it is this high up:** their free tier does not carry a commercial
licence. If that account is on it, nothing anybody makes in this app may be
released — not by you and not by a paying member. It is the one thing on this
page that could make the whole product unsellable, and it is a thirty-second
check.

---

## Before anybody pays you

### 4. `NEXT_PUBLIC_SITE_HOST = futurebox.studio`

**Where:** Vercel, then redeploy. `NEXT_PUBLIC_` values are baked in at build
time, so saving it alone changes nothing.
**Broken until then:** every printed address falls back to the Vercel one — the
creator's own `@handle` link, every letter's link to `/help`, the sitemap, the
Open Graph tags.
**How to tell:** open `/sitemap.xml` and look at the host in it.

### 5. The four Vercel domain redirects

`futurebox.studio` is Production. `www.futurebox.studio`,
`futureboxstudio.co.za` and `www.futureboxstudio.co.za` redirect to it.

**Broken until then:** more than a tidy address. A session lives per origin, so
somebody who signs in on the `.co.za` and is then moved to the `.studio` has no
session on the second one and is asked to sign in again. That looks exactly
like the app forgetting people, and it is not.

**How to tell:** open the `.co.za` in a private window. The address bar should
end up on `futurebox.studio`.

### 6. Email: Resend, and the four variables

1. Resend → add the domain → paste the DNS rows it gives you into the
   registrar → Verify.
2. Resend → **Enable Receiving: off.** It is on by default and it is not what
   this app uses.
3. Vercel: `MAIL_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`, and — the same value in
   all three — `WATCH_SECRET`, `POST_SECRET` and `CRON_SECRET`.

**`MAIL_FROM` must be on a domain whose DNS you control.** Not gmail.com:
Google tells every receiving server to refuse mail claiming to be from gmail.com
that did not come from Google, so receipts would be accepted by Resend, leave,
and be thrown away where you cannot see it. Your own mailbox goes in
`MAIL_REPLY_TO`, which has no such rule.

**One `CRON_SECRET`, three names.** Vercel sends one `CRON_SECRET` to every
scheduled route, so `WATCH_SECRET` and `POST_SECRET` must hold the same value.
Giving the queue its own new secret is the trap: `/api/watch` then answers the
scheduler with a 404, the allowance warnings stop arriving, and nothing says so.
A warning that has quietly stopped is worse than no warning.

**How to tell:** open `https://<your app>/api/mail/setup?key=<POST_SECRET>`. It
says whether the key works, whether the domain verified, and prints the DNS rows
still outstanding with the exact name, type and value. Add `&test=1` to send
yourself a real letter — a verified domain and a letter that arrives are two
different claims, and only the second one matters. Check the spam folder.

### 7. Supabase email: confirmation on, and the code template

Supabase → Authentication → Email: confirmation on, the template carrying
`{{ .Token }}`, and Resend as the SMTP sender.
**Broken until then:** the six-digit code screen has no code to receive.

### 8. `PAYSTACK_SECRET_KEY`

Test key (`sk_test_…`) until a payment has gone end to end. Live keys need the
company registered and a bank account in its name.
**Broken until then:** nothing can be charged, and the app says so rather than
pretending a checkout exists.

The three plan codes (`PAYSTACK_PLAN_MAKER`, `_STUDIO`, `_LABEL`) and
`PAYSTACK_PLAN_MARKETING` make a membership renew instead of being a single
charge. Create them once with `node scripts/paystack-plans.mjs`.

---

## When you want the rooms that are still dark

### 9. Music.ai

`MUSIC_AI_API_KEY`, then `MUSIC_AI_WORKFLOW_READ` and
`MUSIC_AI_WORKFLOW_STEMS` — slugs you create in their dashboard, which this app
cannot guess.
**How to tell:** `https://<your app>/api/analyse/setup?key=<POST_SECRET>` lists
the workflows actually on the account and says which slugs are set.

**Broken until then:** chords, key, tempo and named stems. Everything else in
the studio works without it.

### 10. Spotify, for the chart beside ours on Spotlight

`SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`, from
developer.spotify.com — create an app, copy the two values, no callback URL
needed. This uses the client-credentials flow, which reads public things and
touches nobody's account, yours included.

**Broken until then:** the "What South Africa is playing on Spotify" bar does
not appear at all. Everything else on Spotlight works without it — our own
Top 10 is counted here and needs nothing but `supabase/charts.sql`.

**How to tell:** open Spotlight. The bar is either there or it is not; there
is no half-state and no error to read.

**One thing I could not check from where this was built:** the outbound call
to Spotify is blocked in that environment, so the code path has never run
against the real API. It finds their chart by searching for a playlist named
"Top 50 … South Africa" **owned by Spotify themselves** rather than by a
hard-coded playlist id, which is the version that fails honestly rather than
silently if they rename or retire it. If the bar never appears with the keys
set, that search is the first thing to look at.

### 11. The two engines behind a flag

`ELEVEN_SEEDANCE_READY=1` is the only way to a clip longer than ten seconds.
`ELEVEN_AURORA_READY=1` is the talking presenter. Both are behind a flag
because whether the broker accepts the model id depends on your plan — so set
it, make one clip, and unset it if the request comes back refused.

---

## Paperwork, on its own clock

### 12. CIPC

The registration number, then `FUTUREBOX_LEGAL_NAME`,
`FUTUREBOX_LEGAL_REGISTRATION`, `FUTUREBOX_LEGAL_ADDRESS` and
`FUTUREBOX_LEGAL_PHONE` in Vercel. Section 43 of the ECT Act requires those to
be reachable before somebody transacts; `/legal` is that page and it currently
says the details are not published yet, which is defensible. A placeholder
registration number would not be.

**If you trade as yourself rather than as a company**, there is no
registration number and there is nothing to register. Then set
`FUTUREBOX_LEGAL_NAME` to your own full name and
`FUTUREBOX_LEGAL_STATUS` to `Sole proprietor trading as FutureBox Studio`,
and leave the registration empty. The page will not publish a person
described as a private company — that is the one combination it refuses, and
`npm run check:entity` holds it to that along with the other eight shapes, so
whichever way you fill it in it is right the first time or it says nothing.

### 13. The trademark

CIPC's register, classes 9 and 42. A registered domain and a registered company
are neither of them a trademark, and this is the part that decides whether you
can trade under the name at all. EUIPO and USPTO are free and take minutes.

### 14. POPIA

An information officer registered with the Information Regulator, and
`FUTUREBOX_LEGAL_INFORMATION_OFFICER` set. You process personal data of South
Africans, so it applies.

---

## And before the first stranger pays

From `docs/GOING_LIVE.md` §1, unchanged:

- [ ] Rotate every key that has ever been in a `.env` file on a laptop, and set
      them only in Vercel.
- [ ] Turn on Supabase's own backups, and check a restore actually works.
- [ ] Confirm row-level security is on for **every** table in the live project.
      The checks here cover the SQL files; only the dashboard can tell you what
      is actually in the database.
- [ ] Decide what happens when an engine bill spikes, and make sure the alert
      reaches a person.
