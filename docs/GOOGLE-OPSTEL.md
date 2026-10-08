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
2. **Sign in as something, and there are now two ways.** See the section below — Google offered
   her an API key, which is simpler than the service account this step originally said, and her
   spend cap is what makes it a reasonable choice.
3. **Whichever it is, it goes in Vercel.** Never in the repository, and never
   `NEXT_PUBLIC_` — the same rule as every other key this app uses. `docs/SWITCH-ON.md` is where
   the variable gets its name and its line.
4. **Tell me the project id and the region** and I will wire the two engines behind the seams
   that already exist.

---

## The upgrade box in AI Studio: do not click it

*A few minutes later, in AI Studio rather than the Cloud console, she was offered two upgrades:*
**Gemini API — pay per request**, and **Google AI — monthly subscription**, with a button saying
"Continue with pay per request".

**Neither. Close the box.**

### They are two different doors to the same models

This is the thing the dialog does not say, and it is the whole answer:

| | Gemini API (AI Studio) | Vertex AI (Cloud console) |
|---|---|---|
| Address | `generativelanguage.googleapis.com` | `aiplatform.googleapis.com` |
| Sign in as | an API key | a service account |
| Needs | a Google account | a Cloud project with billing |
| Playground | Google AI Studio | Vertex AI Studio |

**Her spend cap is on the second one.** It is attached to one project and one service, and that
service is Vertex AI. The Gemini API is a different service at a different address, so turning on
pay-per-request there creates **a second bill with nothing standing in front of it** — the $100
does not apply, the alerts do not count it, and the pause does not pause it.

That is the same warning as the API list above, arriving at the moment it actually costs
something.

### And the subscription is the wrong shape anyway

"Google AI — monthly subscription" is the consumer plan: the Gemini app, higher limits in the
Studio, Google One storage. Its own line in the dialog says **✗ Access to all models & agents**.
It is a plan for a person using Google's apps, not a way for software to call an engine, and no
amount of it would let this app generate a song.

### What to do instead, if the point was to try things out

That is a fair thing to want — nobody should wire an engine into a room before hearing what it
sounds like. Do it in **Vertex AI Studio**, inside the project that already has the cap. Same
models, same prompt box, and the spending lands inside the $100 rather than beside it.

*One caveat, reported by users rather than by Google: AI Studio's paid tier appears to run on its
own prepaid credits, which Cloud promotional credits cannot fund. If that is right, a free $300
Cloud credit would not pay for it either. Not confirmed in Google's own documentation, and not
worth testing with a card.*

---

## An API key or a service account

*Carli, 8 October 2026, pasting what Google's starter handed her:*

```python
client = genai.Client(vertexai=True, api_key=API_KEY)
```

That is **Vertex with an API key** rather than a service account, and it is newer than the advice
this document originally gave. Both work. The honest comparison:

| | API key | Service account |
|---|---|---|
| What it is | one string | a JSON file with a private key in it |
| Scoping | restricted to chosen APIs in the console | an IAM role, as narrow as `roles/aiplatform.user` |
| Who did it | nobody — the key has no identity | the account, in the audit log |
| Rotating | make a new one, swap the variable | make a new key, swap the variable |
| Leaked | anyone can spend, up to whatever stops them | the same, but the role bounds what they can reach |

The textbook answer is the service account. **The reason the API key is nevertheless fine here is
the spend cap she built this morning.** A leaked key on an uncapped project is an open invoice; a
leaked key on a project that pauses at $100 is a bad month, not a disaster. Having built the cap
first changes which of these is a reasonable risk — which is a good argument for having built it
first.

So: an API key is acceptable, **on three conditions**.

1. **Restrict it in the console** — API restrictions, Vertex AI only. An unrestricted key is a key
   for every API the project has, including any switched on later by accident.
2. **Server side only.** It goes in Vercel as a plain variable, never one beginning
   `NEXT_PUBLIC_`, because that prefix puts it in the browser and therefore in everybody's hands.
   `check:security` scans for exactly this.
3. **Rotate it if it is ever pasted anywhere** — a chat, a screenshot, a notebook that gets
   shared. A key in a message is a key that is out.

## What those starter samples are, and are not

All of them generate TEXT with `gemini-2.5-flash-lite` — bubble sort, the weather, tool calling.
That is Google showing how the SDK works. **None of it is Lyria or Veo**, and this app does not
need a Google text model at all: the copilot is already somebody else's and works.

Two more differences worth knowing before any of it is copied:

* **It is Python; this app is TypeScript.** The same SDK exists for Node as `@google/genai`, with
  the same shapes. `pip install google-genai` has no bearing on us.
* **`auth.authenticate_user()` is Colab**, and it signs in as *her*, in a browser, by clicking.
  A server has nobody to click. That line is the one thing in the starter that cannot be
  translated — which is exactly why the key or the service account exists.
* The `numpy<2.0` pin is a Colab image problem and nothing to do with this.

What the samples ARE good for is hearing the models before anything is built around them. For
that the model ids matter, and the sources disagree:

* **Lyria** — the official page documents **`lyria-002`** (32.8-second clips, base64 WAV back,
  available globally). Newer pages show **`lyria-3-pro-preview`**. Check Model Garden in her own
  project for which is actually offered to her before spending a minute on the wrong one.
* **Veo** — `veo-3.1-generate-001` and `veo-3.1-fast-generate-001`. The output bucket is
  optional; without one the video comes back in the response.

## The three engines, chosen

*Carli, 8 October 2026:* "Ek dink ons moet dan lyria, nano banana en veo gebruik." And:
"Ek sal my budget in google verhoog soos wat ons wins maak."

So: **Lyria** for music, **Nano Banana** for pictures, **Veo** for video. One project, one key,
one bill, one agreement. That is a real simplification over MiniMax for video and somebody else
for everything else, and it is the right call.

Two consequences worth having in writing before they are discovered.

### One cap means they all stop together

The spend cap is per **service**, and all three of these are the same service. So the month
Veo runs hot, **the music and the pictures stop too** — not because anything is wrong with them,
but because they share a ceiling with the expensive one.

That is the cost of the simplification, and it is worth paying. But it means the app needs its
**own** ceilings underneath Google's, per engine, the way `kitsminutes.ts` already does for
Kits' four hundred minutes. Google's cap is the last line, not the budget. Without ours, one
member making videos all afternoon takes the songs away from everybody.

### Raising it as profit comes is right, and it needs a number to be raised against

"Soos wat ons wins maak" is the correct instinct and the correct order — spend what has been
earned rather than what is hoped for. What it needs to be workable is the thing
`docs/KOSTE-EN-WINS.md` already asks for: **what one song, one picture and one video actually
cost us once Google's real rates are known.** Then the cap moves on an arithmetic rather than
on a feeling, and the credits charged for each can be checked against it.

`CREDITS.video` has one cent of margin on Kling today. That number is the first thing to redo
once `/api/google/setup` has said which models answer and at what rate — not before.

## What is actually there — measured 8 October 2026

`/google`, against `psyched-choir-433408-h0` in `us-central1`:

| Model | | |
|---|---|---|
| `lyria-002` | music | **there** |
| `lyria-3-pro-preview` | music | **there** |
| `veo-3.1-generate-001` | video | **there** |
| `veo-3.1-fast-generate-001` | video | **there** |
| `gemini-2.5-flash-image` | image | **there** |
| `gemini-3-pro-image` | image | 404 |
| `gemini-3-pro-image-preview` | image | 404 |
| `gemini-3.1-flash-image` | image | 404 |

So everything works — key, project, region and URL shape all correct — and three of the eight
guesses were wrong. That is three afternoons the probe did not cost.

### What was chosen, and why

* **Music: `lyria-002`.** Both work. This is the documented one; `lyria-3-pro-preview` is a
  preview. Which actually sounds better is a listening test on the same lyric, not a coin.
* **Video: `veo-3.1-fast-generate-001`.** Both work. The fast one first, deliberately: $0.08 a
  second against $0.20, and `CREDITS.video` has one cent of margin.
* **Pictures: `gemini-2.5-flash-image`.** Not a choice — the only one of four that answered.

### A correction, made before it shipped

The first version of this document chose **`lyria-002`** for music, because it is the documented
one. That is picking a name without asking what it does.

**Lyria 2 is instrumental only, and thirty seconds.** Google's own model page says so — 30-second
WAV clips at 48 kHz, a 32.8-second ceiling, modality listed as text-to-music (instrumental only).
This app makes sung songs of about two minutes, so the first real press would have come back as
half a minute of backing track with nobody singing.

**Lyria 3 Pro** sings, carries lyrics, reads section tags, and goes to about three minutes. That
is the song engine, and `lyria-002` is kept for the job it is actually right for: thirty seconds
of instrumental is a **bed**, which is what goes under a video.

Worth saying plainly because I got Lyria wrong in the other direction earlier the same week —
eight instrumental code examples, and I concluded the model could not sing. Examples show what a
vendor chose to show. A model page says what a model is.

### The one that comes with a clock

**Nano Banana Pro is not on this account.** All three of its candidate names 404ed. The only
image model available is the *original* Nano Banana — and that is precisely the one whose
shutdown date two Google pages disagree about: **2 October 2026** on the Gemini API, **15 March
2027** on Vertex. The first has already passed and it still answered here, so Vertex's date is
the one that governs.

That is a real dependency with a published end, not a hypothetical. The pictures will have to
move before March 2027. It is a one-line change in `lib/server/google.ts` — **if somebody
re-runs the probe from time to time and notices Nano Banana Pro appearing.** Which is the
argument for keeping `/google` rather than deleting it once it has been used once.

## Open it without spending a secret

*Carli, 8 October 2026, when told to open `?key=<POST_SECRET>`:* "maar dan gaan ek nou weer 'n
password weggee wat ek weer gaan moet verander."

**She was right, and it was this app's fault rather than hers.** An hour earlier her Google key
had to be rotated because it had been typed into a query string; the next instruction was to type
a *different* secret into a query string. A secret in a URL is a secret in the browser history, in
the access log, and in any screenshot of the address bar. That is not a thing to ask twice.

So there is a page:

```
https://<your app>/google
```

Sign in on the main site as usual, open it, press **Ask**. No password anywhere — the app already
knows the account is the owner, and the token travels in a header, where nothing writes it down.

The `?key=<POST_SECRET>` route still works, for the things that are not people: a terminal, a
script, a check. Both doors, and the person gets the one that costs her nothing.

## When the setup page answers `no`

A bare `no` is a **404**, and it means one thing only: `POST_SECRET` is set on the deployment and
the value sent did not match it. It is deliberately the same answer a non-existent path gives, so
nobody can probe for the page — which is correct, and which also means it tells the owner
nothing. Three ways it has actually gone wrong:

**The wrong secret entirely.** `?key=` on this page wants **`POST_SECRET`**, never the Google API
key. On 8 October it was given the Google key, three times. That key then existed in a browser
history, in Vercel's access log and in a screenshot, and had to be rotated — which is the whole
reason the rule about never pasting a key anywhere is a rule and not a preference.

**A secret the URL mangled.** `searchParams.get` URL-decodes, so a `+` in a base64-ish secret
arrives as a space and a perfectly typed secret fails. The route now tries the raw query text as
well as the decoded one, both through the constant-time compare. `check:google` holds it.

**No redeploy.** Vercel picks up new variables only on a new deployment. The variables can be
perfect and the running site still have none of them.

### The quickest way to tell which

`CRON_SECRET`, `WATCH_SECRET` and `POST_SECRET` all hold the same value — see §6. So there is a
page that is known to work:

```
https://<your app>/api/mail/setup?key=<POST_SECRET>
```

If that one answers, the secret is right and the problem is elsewhere. If it also says `no`, the
secret is the problem, and the fix is to read it off Vercel — or, if it was stored as Sensitive
and cannot be read back, to set a new one. **Set all three names to the same new value**, or
`/api/watch` starts answering the scheduler with a 404 and the allowance warnings stop arriving
with nothing to say they have.

## Two smaller things worth doing while she is in there

**Check who gets the budget emails.** Budget alerts go to the billing administrators of the
account by default. If that is not an address she reads, the 50% warning arrives where nobody
sees it and the first real signal is the service pausing.

**The cap pauses, which is what she wants.** The console's own note says enforced spend caps
reset at the start of each month and resume anything they paused. So the failure mode at $100 is
"the music stops until next month", not "the card keeps paying". That is the right way round, and
it is worth knowing it is what will happen rather than discovering it.
