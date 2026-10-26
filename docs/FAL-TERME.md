# What fal.ai has answered, and what is still open

fal.ai's sales team replied to the owner's letter (`private/EPOS-FAL.md`) on
26 October 2026. This is what that reply settles for the three video-editor
buttons that send a member's footage out (take the background out, take an
item out, generate a missing piece), and what it does not.

*Not legal advice. A record of a supplier's written answer, so nobody has to
find the e-mail again.*

---

## Answered

| Question from the letter | Their answer | What it means here |
|---|---|---|
| A processor agreement (DPA) | Their Data Processing Addendum is part of their **standard terms** and covers **pay-as-you-go** accounts too. No commitment needed. — https://fal.ai/legal/data-processing-addendum | The DPA comes into force when the business account accepts their terms. Keep a dated PDF of the DPA and the API terms in `private/` on that day. |
| Do they train on what we send | No. API Services terms, **section 2.4, Use of Client Content**: they do not use our content to create, train or develop their products. — https://fal.ai/legal/api-services | One exception: models marked **"Pending Enterprise Ready"**. The app may only call models that are **not** marked that way. Look at each model's page before it is wired. |
| Deletion | The DPA covers deletion of personal data. | No number of days was given. The app should still send only what a job needs, and delete its own copy of the result link when the job is done. |
| Sub-processors | Listed in their trust centre. — https://trust.fal.ai/subprocessors | Read once before launch, the way the ElevenLabs list was read. |
| Concurrency | Pay-as-you-go allows **40 jobs at once**. | Far above what launch needs. The queue and webhook docs are the ones the wiring should follow. |

## Still open

- **POPIA section 72, the transfer out of South Africa.** The reply says the
  region is "not specified", which means the footage leaves the country. The
  DPA may already carry a transfer clause (standard contractual clauses, or
  a clause naming "any applicable data protection law"). That is the basis
  we need, and only reading the DPA itself will tell. `fal.ai` cannot be
  opened from the build machine, so this is the owner's to read.
  If it is not there, the fallback is section 72(1)(b): the member says yes,
  on the button, to their clip going to fal.ai outside South Africa.
- **Commitment minimums.** Only matter when volume grows. They offered a
  15-minute call; nothing has to wait on it.

## What it unlocks besides the three buttons

**Demucs, six stems** (`fal-ai/demucs`): vocals, drums, bass, guitar, piano
and the rest, as separate tracks. ProBooth's *Split stems* gives two today
(voice and backing, through ElevenLabs). The price per minute is shown in
their playground under the result; it has to be read there before a credit
price is set, the same rule as every other engine.

## Before the first `fetch`

1. The business account on fal.ai, pay-as-you-go, and its key in Vercel as
   `FAL_KEY` (never in chat, never in code).
2. The DPA and API terms saved as PDFs in `private/`, dated.
3. Section 72 settled one way or the other (above).
4. Each model's page checked for "Pending Enterprise Ready".
5. A line for fal.ai on the privacy page. `check:verwerkers` keeps the build
   red until it is there.
