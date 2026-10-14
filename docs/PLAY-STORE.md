# Putting FutureBox on Google Play

Carli's list, 7 October 2026: *"Registrasie op playstore."*

This is everything that can be written down in advance, so that the day you
sit down to do it is an hour of typing rather than a week of deciding. The
parts only you can do are marked **yours**; the rest is already in the code
and `npm run check:playstore` holds it there.

---

## What kind of app this is, and why it matters

FutureBox is a website. The thing that goes on Google Play is that website
inside a thin Android wrapper — a **Trusted Web Activity**. You are not
rewriting the app; you are publishing a shortcut to it that Google treats as
an app.

The practical consequences, said plainly:

* Every change you deploy to Vercel is live in the Android app immediately.
  No store review, no update, no waiting.
* You only submit to review when the wrapper itself changes, which is
  almost never.
* It needs one file on the website to prove the app and the site are the
  same people, and that file is already served — see **Asset links** below.
* **Payments.** This is the one real decision. Google's policy requires
  Play Billing for digital goods bought inside an app on Play. Credits are
  digital goods. There are exemptions and there is nuance, and getting it
  wrong gets an app removed rather than warned. **Ask the attorney doing the
  legal check to look at this specific question**, and be ready for the
  answer to be "Play Billing, at 15% on the first million dollars a year" —
  which is on top of Paystack. It may be cheaper to launch on the web only
  and come to Play once the volume is known.

  Two things moved in 2026 and both help, but neither is settled enough to
  plan on. Google opened a **billing choice** programme on 30 June 2026: in
  the United States, the United Kingdom and the EEA the service fee now
  starts at 10% on the first million dollars a year, and the 5% billing fee
  applies only when the purchase goes through Play's own billing. South
  Africa is **not** in that restructure. South Africa *is* one of the
  countries where **user choice billing** is offered — the member picks, at
  the moment of paying, between Play's billing and ours — and outside the
  three restructured markets the older arrangement is reported to still
  apply: the standard fee, reduced by four points when the purchase goes
  through our own billing. **The four points and the South African fee table
  are from secondary sources and are not confirmed.** Before anybody builds
  on them, read the fee table inside the Play Console for South Africa, which
  is the only version that binds.

---

## Done, in the code

| | Where |
|---|---|
| App manifest with id, scope, language, categories, orientation | `app/manifest.ts` |
| Google Play Billing in the app, Paystack on the web | `app/lib/playbilling.ts`, `app/api/play/` |
| The Android wrapper's settings, ready for Bubblewrap | `android/twa-manifest.json`, `android/README.md` |
| Icons at 192 and 512, one of them maskable | `public/icon-neon-192.png`, `public/icon-neon-512.png`, `public/icon-neon-512-maskable.png` |
| Asset links, read from the environment | `app/.well-known/assetlinks.json/route.ts` |
| Public privacy page | `/privacy` |
| In-app account deletion | `DeleteAccount.tsx` |
| All of the above held against rot | `npm run check:playstore` |

---

## The developer account — **start this first** **yours**

This is the long pole, and it is not in the code. Everything below it can be
done in an afternoon; this one has a clock on it that nobody can shorten.

**Open the account as the company, not as yourself.** FUTUREBOXSTUDIO (Pty)
Ltd is registered, so this is a choice you already have and it is the whole
difference between launching in a fortnight and launching in two months.

| | Personal account | Organisation account |
|---|---|---|
| Before you may go to production | A **closed test**: at least **12 testers**, opted in, continuously, for **14 days** | None of that |
| What it costs | 25 USD, once | 25 USD, once |
| What it needs | Your identity | A **D-U-N-S number** for the company |
| How long to get ready | 14 days *after* you have found 12 people with Android phones who will install it and keep it | Up to **30 days** for the D-U-N-S, which you can start today |

The twelve-tester rule applies to personal accounts created after 13
November 2023, which any account you open now would be. Google also looks at
whether the testers actually *used* the app — twelve names that installed it
and never opened it is not a passed test. Internal testing does not count,
only the closed track.

So: **apply for the D-U-N-S number today**, before anything else on this
page. It is free, it comes from Dun & Bradstreet, and Google says the process
can take up to 30 days. Everything else here — the wrapper, the asset links,
the listing — is days of work that can happen while you wait. If the D-U-N-S
comes back and the account is an organisation one, the fortnight of closed
testing simply never happens.

Check first whether the company already has one. Many registered companies
do, and looking is a two-minute search on Dun & Bradstreet's site.

> The 12-tester rule and the D-U-N-S requirement are both on Google's own
> help pages (`support.google.com/googleplay/android-developer`, answers
> 14151465 and 13628312). That organisation accounts are *exempt* from the
> tester rule is the scope of that page rather than a sentence in it —
> confirm it in the Console when you open the account, because it decides
> your timeline.

### How to actually get it

Carli, 11 October 2026: *"Help my met die DUNS ding?"*

**Step 1 — find out whether you already have one.** Many registered companies
do, without ever asking. Apple runs a free public lookup that searches the
same Dun & Bradstreet database Google reads, and it works whether or not you
ever touch Apple: `developer.apple.com/enroll/duns-lookup`. Search
**FUTUREBOXSTUDIO**. If a number comes back against the right company and the
right address, you are done — the rest of this section is unnecessary.

**Step 2 — if there is none, request one. It is free.** Google's own page
says so in as many words, and warns that third parties will try to charge
"high administrative fees" for it. If a site asks for money, it is not the
one you want. There is a paid "expedited" option from D&B itself in some
countries; you do not need it if you start now.

The request starts at `dnb.com` → **Get a D-U-N-S Number**. Outside the
United States, D&B hands the request to a local partner, and for South Africa
that partner is widely reported to be **TransUnion** (`dnb@transunion.co.za`).
*That address is from a third-party guide and could not be confirmed on an
official page from here — check it against dnb.com's own country chooser
before you rely on it.* If the form on dnb.com accepts a South African
company directly, use the form; it is the authoritative route.

**Step 3 — have these ready before you start.** Every one of them has to
match **CIPC exactly**, because a mismatch is the ordinary reason an
application comes back weeks later:

| Field | What to put |
|---|---|
| Legal name | `FUTUREBOXSTUDIO (PTY) LTD` — exactly as CIPC has it. Not "FutureBox", not "FutureBox Studio", not the domain |
| Registration number | `2026/714071/07` |
| Registered address | The one on the CIPC certificate, exactly, including the postal code |
| Trading name | Only if CIPC has one. A trade name on its own is refused |
| Telephone | A number that answers — they may phone to verify |
| Your name and title | The person signing, as a director |
| Email | A company address, not a personal one, if you have it |
| What the business does | "Software — a web and mobile application for music and video creation." Plain, not marketing |
| Employees, and year started | Small numbers are fine and normal |

**Step 4 — then wait, and build the rest.** Google says up to 30 days. Nothing
else on this page depends on it, so the wrapper, the asset links and the
listing are all work you can finish while the application sits.

> Three things that go wrong, in order of how often:
> 1. **The name does not match CIPC.** By far the commonest.
> 2. **Somebody pays a reseller** and still waits the same 30 days.
> 3. **Nobody checks first**, and requests a second number for a company that
>    already had one — which then has to be merged, and that takes longer
>    than the original request would have.

---

## Asset links — the one technical step **yours**

Without this, every screen of the installed app has a browser address bar
across the top. With it, it looks like an app.

1. Create the app in the Play Console. Google generates a signing key for
   you (Play App Signing — take it, do not manage your own).
2. In the Console: **Setup → App integrity → App signing**. Copy the
   **SHA-256 certificate fingerprint**.
3. In Vercel → Settings → Environment Variables, add:
   * `ANDROID_PACKAGE` — the package name you chose, e.g. `studio.futurebox.app`
   * `ANDROID_CERT_SHA256` — the fingerprint you copied
4. Redeploy. Check it worked by opening
   `https://futurebox.studio/.well-known/assetlinks.json` — it should list
   your package rather than show `[]`.

A key rotation has two live fingerprints for a while. Put both in, separated
by a comma.

---

## Building the wrapper **yours, with my help**

Done in the repository: `android/twa-manifest.json` holds every answer
Bubblewrap (Google's own tool) would ask for — the name, the colours, the
icons, the address, and Google Play Billing switched on — and
`android/README.md` is the three commands that turn it into the `.aab` you
upload. `check:playstore` keeps it matching the site.

Two choices are yours before the first build, because neither can change
once the app is on Play: the **package name** (it says `studio.futurebox.app`)
and where you keep the **upload keystore** the first build creates. Both are
explained in `android/README.md`.

---

## Paying in the Android app — Google Play Billing **yours, with the code done**

Carli, 14 October 2026: *"Wanneer ek die app op die playstore gaan sit gaan
ek paystack afhaal en werk met die playstore se paying system."*

That is how it is built. **On the website nothing changes** — Paystack, as
now. **Inside the Android app** the same buy buttons open Google Play's own
payment sheet, and Paystack is never offered there. The app tells the two
apart by how it was opened (a Play Store app opens the site with an
`android-app://` referrer), per tab, so the site in ordinary Chrome on the
same phone keeps Paystack.

What happens on a purchase, in order:

1. The app asks `/api/play` whether this member may buy this — the same
   rules as the website (extra credits only on a plan) — *before* money moves.
2. Play's sheet takes the payment.
3. The app sends the purchase token to `/api/play`. The server asks **Google**
   whether that token is paid — the phone's word is never the receipt —
   claims it for this account, grants what *our* table says the product is,
   and only then tells Google it was delivered. A purchase that is never
   delivered is refunded by Play after three days, which is the right outcome
   for one we failed to deliver.
4. If the last step never arrived (signal lost, app closed on the sheet),
   the app finishes it the next time it opens.
5. Monthly renewals arrive from Google at `/api/play/notify`, are checked with
   Google again, and extend the plan or add the month's kids credits.

Album art is **not** sold inside the Android app: an auction price is not a
product in Play's console, and Play does not allow sending a buyer elsewhere
to pay. The app says so and links nowhere.

### The products to create in the Play Console

**Monetise → Products.** The id must be exactly as written; the price is
yours to set (Play adds its fee on top of what you receive, so you may want
these a little higher than the website's).

| Product id | Kind | What it grants |
|---|---|---|
| `maker_monthly` | Subscription, monthly | Maker plan |
| `studio_monthly` | Subscription, monthly | Studio plan |
| `label_monthly` | Subscription, monthly | Label plan |
| `credits_small` | In-app product (consumable) | Top-up: the small pack |
| `credits_mid` | In-app product (consumable) | Top-up: the middle pack |
| `credits_large` | In-app product (consumable) | Top-up: the large pack |
| `kids_try` | In-app product (consumable) | Kids Try, 30 kids credits |
| `kids_month` | Subscription, monthly | Kids Monthly, 65 kids credits a month |
| `kids_plus` | Subscription, monthly | Kids Plus, 135 kids credits a month |

The credits each one grants are read from `app/lib/credits.ts` and
`app/lib/kidspacks.ts` on the server — the Console only sets the price.

### The service account (lets the server ask Google about a purchase)

1. Google Cloud Console → the project linked to your Play account → **IAM →
   Service accounts → Create**. Any name. No roles needed there.
2. On that account: **Keys → Add key → JSON**. A file downloads.
3. Play Console → **Users and permissions → Invite new users** → the service
   account's email → app permissions **View financial data** and **Manage
   orders and subscriptions**.
4. Vercel: `GOOGLE_PLAY_SERVICE_ACCOUNT` = the whole JSON file, pasted.

### Renewal notices (real-time developer notifications)

1. Google Cloud Console → **Pub/Sub → Create topic** (say `play-billing`).
   Give `google-play-developer-notifications@system.gserviceaccount.com` the
   **Pub/Sub Publisher** role on it.
2. On the topic: **Create subscription → Push**, endpoint
   `https://futurebox.studio/api/play/notify?key=<PLAY_NOTIFY_SECRET>`.
3. Play Console → **Monetisation setup** → the topic's full name → **Send
   test notification**. The route answers "test received".
4. Vercel: `PLAY_NOTIFY_SECRET` = the same long random string.

### The wrapper must allow it

`android/twa-manifest.json` already has Play Billing switched on
(`"features": { "playBilling": { "enabled": true } }`), and `check:playstore`
fails if it is ever turned off — without it the app's buy buttons say Google
Play billing could not be opened.

### Testing before anybody pays

Play Console → **Settings → License testing** → add your own Gmail. Purchases
by a licence tester go through the real sheet and are never charged. Run
`supabase/playbilling.sql` (or `ALMAL.sql`) first.

---

## The listing text, ready to paste

**App name** (30 characters max)

```
FutureBox Studio
```

**Short description** (80 characters max)

```
Write, record, film and post — one studio, in Afrikaans and English.
```

**Full description** (4000 characters max)

```
FutureBox is a creative studio in your phone, built in South Africa for
people making things on their own.

Write a song and hear it. Sing it yourself in the ProBooth, over the
backing, with the words on the screen and a real set of lanes to mix. Clone
your own voice once and every room can read with it.

Cut a video on the clock without uploading a thing — the whole editor runs
on your own phone, so there is no queue and no waiting. Edit the photo for
the post: take the background out, draw round something and keep it, grab
the words out of a poster, put the room behind you out of focus.

Then write the advert, plan the week and publish it to your own channel.

Everything in Afrikaans and English, from the first screen to the last
button.

WHAT IS INSIDE
• Make a song — write it, hear it, keep it
• ProBooth — sing on it yourself, with lanes, a metronome and a desk
• Your voice — clone it once, use it everywhere
• Video editor — trims, titles, looks and music, all on your phone
• Photo editor — background remover, free-hand cut, crop, text grabbing
• Channel — your own place for what you have made
• Podcast, adverts, album art, live rooms and Collab Radar

HOW IT COSTS
Credits. A free allowance every month, and plans from there. Everything
that runs on your own phone is free and says so; everything that costs
money to make says its price before you press it, never after.

FutureBox is made by FUTUREBOXSTUDIO (Pty) Ltd, registered in South Africa.
```

**Category**: Music & Audio
**Tags**: music creation, video editing, photo editing
**Contact email**: **yours** — use a business address, not a personal one.
Whatever you put here is published on the listing.
**Website**: `https://futurebox.studio`
**Privacy policy**: `https://futurebox.studio/privacy`

---

## Data safety form — the answers

Google asks this as a long form with no save button worth trusting. These are
the answers for FutureBox as it stands. **Check each one against the privacy
page before you submit**, and tell me if anything has changed since.

**Does your app collect or share any of the required user data types?** Yes.

| Data type | Collected | Shared | Required | Purpose |
|---|---|---|---|---|
| Email address | Yes | No | Yes | Account management |
| User IDs | Yes | No | Yes | Account management |
| Photos | Yes | No | No | App functionality |
| Videos | Yes | No | No | App functionality |
| Voice or sound recordings | Yes | Yes | No | App functionality |
| Music files | Yes | Yes | No | App functionality |
| Other user-generated content | Yes | Yes | No | App functionality |
| Purchase history | Yes | No | No | App functionality |
| App interactions | Yes | No | No | Analytics |
| Crash logs | Yes | No | No | Diagnostics |

**"Shared" means sent to a third party.** The ones marked shared are sent to
the engines that make the thing — the music engine, the voice engine, the
video engine — because that is what making it means. They are named on the
suppliers page at `/legal`. Nothing is sold and nothing is shared for
advertising.

**Is all user data encrypted in transit?** Yes.
**Do you provide a way for users to request data deletion?** Yes —
`https://futurebox.studio/account` and the account deletion inside the app.
**Has your app been independently validated against a security standard?**
No. (Answer no. It is the honest answer and nothing turns on it.)

---

## Content rating questionnaire — the answers

Category: **Utility, Productivity, Communication or Other**

* Violence: No
* Sexuality: No
* Language: No
* Controlled substances: No
* **Does the app allow users to interact or exchange content?** Yes
* **Does it allow users to share their location?** No
* **Does it allow the purchase of digital goods?** Yes
* **Does it contain user-generated content?** Yes — and say that it is
  moderated, because it is: see the abuse ceilings and the safety route.

That set normally produces **PEGI 3 / ESRB Everyone**, with a note about
user interaction.

---

## Before you press submit

- [ ] A D-U-N-S number for FUTUREBOXSTUDIO (Pty) Ltd, and a Play developer
      account opened as the **organisation**
- [ ] `ANDROID_PACKAGE` and `ANDROID_CERT_SHA256` set in Vercel, and
      `/.well-known/assetlinks.json` shows them
- [ ] The attorney has answered the Play Billing question
- [ ] A business contact email, not a personal one
- [~] Screenshots: at least 2, phone size, 16:9 or 9:16, between 320 and
      3840 pixels on the long side. Seven real screens at 1080 x 1920 are
      in `docs/play/shots/`, retaken on the evening of 12 October 2026 off
      the built app on a signed-up test account: the welcome, the studio,
      Make a song, the video desk, the advert desk, the kids room (green,
      with the typing box and the templates) and the Cubed room. The photo
      editor is left out until it can be shot with a picture in it.
      **Retake them the day the look is final**, and take the making rooms
      with something made in them rather than empty, which these are not
      yet.
- [x] Feature graphic: 1024 x 500 — `docs/play/feature-graphic-1024x500.png`,
      drawn 12 October 2026 from the brand mark and `APP_LINE`. Redraw it the
      day either changes.
- [ ] A test on a real Android phone, installed from the internal testing
      track, before anything goes public
