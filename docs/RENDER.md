# Render, and what it could sensibly do for FutureBox

*Carli, 8 October 2026:* "Ek kan nog projekte binne my plan begin in render. Ek het huidiglik die
hobby plan. Maar soos ek sê is daar sinvolle funksies wat render binne ons app kan verrig?"

---

## First, a correction to something I said

Earlier I wrote that she "already pays for Render", and used that as an argument for finding work
to give it. Her own screenshot corrects me:

> **Hobby — $0/mo, plus compute costs\*** — Current plan

The plan fee is nothing. What she pays is **compute**, per service, per month. So a new service on
Render is a **new bill**, not spare capacity already bought. That matters, because it is the exact
opposite of the ElevenLabs and Kits situation, where the money is already gone and the only
question is how much of what we bought we are using.

The Hobby plan allows it — unlimited projects, up to 25 services — and allowing is not the same as
including.

What the plan does include: **5 GB of bandwidth** ($0.15/GB after), 2 custom domains, 500 build
minutes, 2 environments per project. Her workspace has two projects already: *My project* (running)
and *www.vibefycode.com* (no active services).

---

## What Render can do that Vercel cannot

FutureBox is Next.js on Vercel, and that is right and should stay. But Vercel runs **requests**, not
**processes**, and three things follow:

**1. Nothing may run longer than a request.** `app/api/voice/clone/route.ts` already carries
`maxDuration = 300` — five minutes, the ceiling — because a voice clone is not a quick call. A
Render background worker has no such ceiling.

The user-visible version of that: today, a long job belongs to the tab. Start a conversion, lose
signal or close the app, and the work is gone — paid for and gone. With a worker it would be
waiting when she came back. **This is the real prize, and it is the only one I would spend money
on.**

**2. Nothing runs on a schedule unless something asks it to.** We now have monthly ceilings that
want tidying — the Kits minutes table, the spend watch. Render Cron Jobs do that. (So does Vercel
Cron, so this is a convenience rather than a reason.)

**3. Nothing can sit and wait.** A Kits conversion is start-then-poll. Polling from a Vercel
function means paying for a function to sit still.

---

## The three things that decide whether it is worth it

**Her own rule about keys.** API keys live in Vercel and nowhere else. A Render worker that calls
Kits needs the Kits key **in Render too** — a second place a key lives, a second place it can leak,
and a second place to rotate it. That is her rule and her call, not mine, and it should be made
deliberately rather than discovered.

**5 GB of bandwidth is less than it sounds.** A three-minute WAV is around 30 MB. Five gigabytes is
roughly 170 of them, and then it is $0.15 a gigabyte. So there is a hard design rule here before
any code: **audio must never pass through Render.** Files move by signed URL between the phone,
Supabase storage and the supplier; Render carries instructions only. A worker that proxies audio
would eat the whole allowance in a week and the bill would arrive as a surprise.

**A second thing that can be down.** Today if Vercel is up, the app works. A worker adds a second
dependency, and a job queue that is down is a feature that silently stops rather than visibly
fails. That needs the same honesty the rest of the app has: the room must say "this is queued and
the queue is not answering", not sit on a spinner.

---

## And the GPU question, which this also answers

`docs/EIE-STEM.md` left open whether Render has GPUs, because this environment's proxy blocks
render.com and the search found no Render GPU pricing. Her screenshot of all four plans does not
mention a GPU anywhere — not on Hobby, Pro, Scale or Enterprise.

That is evidence rather than proof: GPUs could be an instance type rather than a plan feature. But
taken with the search finding nothing, **the working assumption is that Render is not the answer to
the GPU question**, and the self-hosted voice plan in `EIE-STEM.md` does not get cheaper by going
there. Confirm on render.com/pricing before relying on it either way.

---

## So: what I would actually do

**Nothing yet, and here is the trigger to watch for.**

Right now `maxDuration = 300` covers what the suppliers take. The day a conversion or a dub
regularly outlives five minutes — or the day she says "I lost a job because I closed the app" —
that is the moment the worker earns its compute bill, and not before.

What makes that cheap to do when it comes is **today's seam**. `app/lib/server/singer.ts` means the
room asks for a recording in a voice and does not know who answers. A supplier whose `sing()` hands
the work to a Render queue and returns a job id instead of waiting is just another supplier behind
the same interface. The room does not change. That is the point of having built it.

Two smaller things that need no decision and no new bill:

* **www.vibefycode.com has no active services.** If that project is finished with, it is worth
  deleting rather than leaving in the workspace — a project nobody is watching is where a surprise
  bill lives.
* The **500 build minutes** and **5 GB** are per month on this plan. Worth knowing what Vibefy is
  using of them before adding anything that competes for the same allowance.
