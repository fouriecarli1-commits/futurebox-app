# FutureBox

An AI-native studio for making music and music videos, and for keeping up with
what is actually happening in AI without reading forty newsletters.

## Running it

```
npm install
npm run dev
```

That is enough. Everything below is optional — the app is built so that a
missing key means one screen does less, never that the app breaks.

## Optional keys

Copy `.env.example` to `.env.local`.

**`ELEVENLABS_API_KEY`** — turns on real music. With it, pressing *Make my song*
sends your style and your words to ElevenLabs Music and returns a sung, produced
track. Without it the studio makes a browser sketch instead, and says so.

Get the key at [elevenlabs.io](https://elevenlabs.io). Two things worth knowing
before you build on it: music costs roughly 900 credits per minute of audio, and
the **commercial licence starts at the paid plans** — a track made on the free
tier cannot legally be released. The studio never spends credits without asking:
anything that costs shows a cost card first, and only a yes goes through.

Why not Suno: it has no public generation API. The wrappers people pass around
scrape a private endpoint, so they break without warning and breach its terms.
ElevenLabs Music is the closest legitimate equivalent — it takes lyrics per
section, which is what a songwriter actually has.

**`ANTHROPIC_API_KEY`** — turns on the copilot (the panel on the right of the
studio), the writing help, the song ideas and the scoring behind the trends
radar. Without it those screens say they are switched off rather than quietly
returning nothing.

**`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** — turn on
accounts, so your songs follow you between devices instead of living in one
browser. Without them the app signs you in locally and keeps everything in this
browser's storage, and says so on the sign-in panel.

To set that up:

1. Make a project at [supabase.com](https://supabase.com). The free tier is
   enough for this.
2. Open the project's SQL editor and run [`supabase/schema.sql`](supabase/schema.sql).
   It creates the `tracks` table, the storage bucket for the audio, and the
   row-level policies that keep one person's songs out of another person's
   channel.
3. Under Settings → API, copy the project URL and the `anon` `public` key into
   `.env.local`.

The anon key belongs in the browser — that is what it is for. What makes it safe
is the row-level security in `schema.sql`, not the key being secret. The
`service_role` key is a different thing entirely and must never go in a
`NEXT_PUBLIC_` variable.

Under Authentication → Providers you decide whether new accounts have to confirm
their email address first. Leaving that on is the safer default; the app handles
both and tells you which one happened.

## Setting up the paid side

Three things, in this order. Each is done once, and none of them can live in
this repository — they are facts about your Supabase project and your Paystack
account.

**1. The tables.** In the Supabase SQL editor, run these in order. Each is safe
to run again, so if you are not sure whether one has been run, run it.

| File | What it adds |
| --- | --- |
| [`supabase/schema.sql`](supabase/schema.sql) | Tracks, storage, the base policies. The one everything else assumes. |
| [`supabase/usage.sql`](supabase/usage.sql) | Memberships, purchases, and the counting the free tier rests on. |
| [`supabase/subscriptions.sql`](supabase/subscriptions.sql) | The Paystack handles behind a membership, so a renewal can be recognised and a cancellation can be sent. |
| [`supabase/finetunes.sql`](supabase/finetunes.sql) | A sound of your own, trained on your own songs. |
| [`supabase/mail.sql`](supabase/mail.sql) | The log behind the welcome, the receipts and the cancellation, and the unique key that stops a letter going twice. |
| [`supabase/avatars.sql`](supabase/avatars.sql) | A picture on a channel: the column and the public bucket it lives in. Needs `radar.sql` first, which makes the table it adds to. |

The others — `podcast.sql`, `arena.sql`, `radar.sql`, `events.sql`,
`abuse.sql`, `collab.sql`, `presence.sql` — turn on the features they are named
for and can be run whenever you want those.

**2. The Paystack plans.** A membership is a subscription, and a subscription
needs a plan on Paystack's side. Create all three at once:

```
PAYSTACK_SECRET_KEY=sk_test_xxx node scripts/paystack-plans.mjs
```

It reads the prices out of `plans.ts` — the same table the pricing cards show
and the checkout charges from, so the plans cannot be created at an amount the
app never quoted — and prints three codes. Put them in `.env.local` and in your
host's environment settings as `PAYSTACK_PLAN_MAKER`, `PAYSTACK_PLAN_STUDIO`
and `PAYSTACK_PLAN_LABEL`.

Test-mode plans only work with test-mode payments. When you swap
`PAYSTACK_SECRET_KEY` for a live key, run the script again and swap the three
codes too.

Paystack also needs to know where to tell you about renewals: under Settings →
API Keys & Webhooks, set the webhook URL to `https://your-domain/api/payments/webhook`.
That endpoint is the only place a payment is ever recorded — the browser cannot
do it, which is the point.

Without any of this the app still sells plans, as a single month's charge
rather than a subscription. A missing environment variable should cost you a
renewal, not the sale.

**3. Google sign-in.** In the Supabase dashboard, under Authentication →
Providers → Google, switch it on and paste a client ID and secret from a Google
Cloud OAuth 2.0 client. Google's own console needs Supabase's callback address
in that client's authorised redirect URIs — Supabase shows you the exact
address on the same screen.

Then, under Authentication → URL Configuration, add every address this app runs
on to the redirect list: `http://localhost:3000` while you are working on it,
and your real domain. The app sends people back to wherever they started rather
than to a fixed address, so an address missing from that list is a sign-in that
lands nowhere.

## How the pieces fit

| Where | What it does |
| --- | --- |
| `app/lib/audio.ts` | Writes the sketch — chords, bass, drums and a top line — and encodes it as a WAV. Runs in your browser. |
| `app/lib/video.ts` | Draws the music video to a canvas in time with the audio and records it. Also your browser. |
| `app/lib/hooks.ts` | Finds the moments in a track worth cutting a clip from. |
| `app/lib/library.ts` | Your channel on this device: IndexedDB for the audio, localStorage for the details. |
| `app/lib/cloud.ts` | The same channel, on an account, when Supabase is configured. |
| `app/api/music/route.ts` | Calls ElevenLabs Music server-side, so the key never reaches the browser. |
| `app/api/copilot/route.ts` | The copilot. Answers with one action the studio applies; never spends money on its own. |
| `app/lib/engines.ts` | The seam the studio calls. Answers `false` for music until a key is set, and for video always — videos are made in your browser. |

## What the app makes today

The songs are sketches: real audio, generated on your device, enough to hear
whether the speed and the mood are right. They are not sung, and they are not a
finished record. The videos are real videos, recorded from a canvas that moves to
the track's own audio.

Connecting a full generation engine is a contained job, and `app/lib/engines.ts`
documents it. Suno has no public generation API, so the wrappers people pass
around both break and breach its terms — ElevenLabs Music, Stability, Replicate
and Runway do publish real ones.

## Competitions, switched off

The Arena — skill-judged competitions with a free entry route — is not in the
app. It was taken out deliberately, not abandoned.

Promotional competitions are regulated in South Africa under the Consumer
Protection Act, and a paid entry raises the bar further: published terms,
record-keeping, and rules about what may be asked of entrants. That is cheap
to get right before the first entry and expensive to fix after it. So the
whole surface is gone rather than hidden, and in particular **no payment path
can reach it**: `/api/checkout` no longer prices an entry and the webhook no
longer records one, so there is nothing to switch on by accident.

What remains in the repository, for when it comes back:

| Still here | Removed |
| --- | --- |
| `supabase/arena.sql` — competitions, entries, judging | `app/components/ArenaLive.tsx` |
| `app/data/studio.ts` — the sample competitions and the generator | `app/api/arena/` |
| `app/lib/matching.ts` — judging and the competition generator | The `entry` kind in checkout and the webhook |
| | The Arena rail item and its screen |

Bringing it back means restoring those files from git history, re-adding the
`entry` kind to `Want` in `app/api/checkout/route.ts` and to the webhook's
metadata, and putting the rail item back in `app/page.tsx`. The database side
never went away, so nothing has to be migrated.

Do the legal work first.
