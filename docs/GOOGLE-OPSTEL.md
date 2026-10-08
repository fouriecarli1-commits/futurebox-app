# Switching Google on: which APIs, and which to leave alone

*Carli, 8 October 2026, inside the Cloud console with a $100 monthly spend cap already
configured:* "Watter API's moet ek enable?"

Written against what her screens showed on the day. Google renames things, so if a name below is
not on the list in front of you, search the API library for the identifier in brackets — that
does not change.

---

## The short answer

**Enable two. Leave the rest off.**

| Enable | Identifier | Why |
|---|---|---|
| **Vertex AI API** | `aiplatform.googleapis.com` | This is the one. Lyria and Veo are both behind it. It is also the one service her spend cap is attached to |
| **Identity and Access Management (IAM) API** | `iam.googleapis.com` | Needed to create the service account the app signs in as. Free |

**Not yet:**

| Leave off for now | Why |
|---|---|
| **Cloud Storage** (`storage.googleapis.com`) | Veo's output bucket is **optional** — without one, the video comes back in the response itself. Turn it on the day we want generated files kept on Google's side rather than pulled straight through |
| **Cloud Logging / Cloud Monitoring** | Useful when something fails and nobody knows why. Nothing needs them to work. Turn them on if we end up debugging blind |

**No, and one of them matters:**

| Do not enable | Why |
|---|---|
| **Cloud Text-to-Speech** | ElevenLabs does our speech and is already paid for. This is a second bill for a thing we have — and see the warning below about what the cap does not cover |
| **Compute Engine** | We are not running machines. It is the easiest way to leave something expensive running by accident |
| Agent Identity · Agent Registry · Agent Platform | Gemini Enterprise and agent tooling. Not what we are here for |
| App Hub · App Topology · Dataform · Notebooks · Cloud Trace · Model Armor · Network Security · Network Services · Observability · App Lifecycle Manager · Security Command Center · Cloud IAP · Cloud API Registry | None of them is on the path between this app and a song or a video |

---

## The warning that matters more than the list

Her own screen says it, in small type, and it is the thing to read twice:

> **"Spend caps are currently limited to one single eligible project and service."**

Her cap is attached to **one** service: Vertex AI. **Every other API she enables bills outside
it.** The $100 does not stop them, the alerts at 50 / 80 / 100% do not count them, and the
automatic pause at the cap does not pause them.

That is the whole reason the "do not enable" list above is worth having. An API switched on
because it was in the dialog is an API that can charge with nothing standing in front of it.

Cloud Storage and Logging are pennies and would be fine. **Text-to-Speech and Compute Engine are
not pennies**, and neither is covered.

---

## What the $100 actually buys

Using the rates in `docs/EIE-STEM.md`, which still need confirming against her own region's SKU
page inside the console — that is the first thing to do once the APIs are on, not after a price
has been set:

| | Rate | What $100 is |
|---|---|---|
| **Lyria** (a song) | ~$0.08 a track | about **1 250 songs** |
| **Veo 3.1 Lite**, video only | $0.03/second | about **416** eight-second shots |
| **Veo 3.1 Fast**, video only | $0.08/second | about **156** eight-second shots |
| **Veo 3.1 Standard**, video only | $0.20/second | about **62** eight-second shots |

So a $100 cap is a generous month of music and a thin month of video, which is the right shape
for finding out what things really cost before anything is promised to a member.

---

## After the two APIs are on

In this order, because each one needs the one before it.

1. **Check the models are actually available to her.** Vertex's Model Garden, in the project,
   for `lyria` and `veo`. Some models are region-locked and some need access requesting, and
   finding that out now is cheaper than finding it out from a 403 in the app. Note which
   **region** they are offered in — `us-central1` is the usual one, and the region is part of
   every call.
2. **Make a service account**, not a personal key. Give it exactly one role: **Vertex AI User**
   (`roles/aiplatform.user`). Not Owner, not Editor. A key that can only generate is a key that
   cannot delete a project.
3. **Make a JSON key for it and put it in Vercel.** Never in the repository — the same rule as
   every other key this app uses. `docs/SWITCH-ON.md` is where the variable gets its name and
   its line.
4. **Tell me the project id and the region** and I will wire the two engines behind the seams
   that already exist.

---

## Two smaller things worth doing while she is in there

**Check who gets the budget emails.** Budget alerts go to the billing administrators of the
account by default. If that is not an address she reads, the 50% warning arrives where nobody
sees it and the first real signal is the service pausing.

**The cap pauses, which is what she wants.** The console's own note says enforced spend caps
reset at the start of each month and resume anything they paused. So the failure mode at $100 is
"the music stops until next month", not "the card keeps paying". That is the right way round, and
it is worth knowing it is what will happen rather than discovering it.
