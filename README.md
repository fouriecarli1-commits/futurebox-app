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
