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

## Section 72, read against the DPA itself

The owner pasted the full DPA (last updated 31 July 2026) the same day.

**The SCCs do not cover us.** Section 5 applies the EU standard contractual
clauses only to data of residents of the EEA, the UK and Switzerland. Our
members are in South Africa, so section 5 is not our basis.

**The DPA itself is.** POPIA section 72(1)(a) allows a transfer to a party
bound by "a binding agreement" that gives protection substantially similar
to POPIA's conditions, including on passing the data further on. The DPA is
that agreement:

| POPIA asks | The DPA |
|---|---|
| Processed only for the purpose, on our instructions (s20) | 1.1, 1.2 |
| Confidentiality of staff (s20) | 1.4 |
| Security safeguards (s19) | 1.5 and Attachment 3: least privilege, encryption in transit and at rest, vulnerability scanning |
| Told about a breach (s21, s22) | 2.3, "without undue delay" |
| Help with a member's request to see or delete their data (s23–s25) | 2.1 |
| Passing it on only under the same protection (s72(1)(a), onward transfer) | 4.3: sub-processors bound "no less protective", fal.ai liable for them; 15 days' notice of a new one, with a right to object (4.2) |
| Deleted when no longer needed (s14) | 1.6, on termination — **see the gap below** |

"Data Protection Law" (Attachment 1) includes "any other … international
data protection or privacy laws that apply", and 1.3 binds each side to it.

**So the basis is section 72(1)(a), the DPA, and to be safe also
72(1)(b): the button tells the member their clip goes to fal.ai outside
South Africa and they say yes.** Both together cost one sentence on the
button.

### One real gap: how long they keep it

Attachment 2 says fal.ai keeps Client Personal Data **"until the
termination of the Agreement"**. For a member's footage that is far longer
than the seconds a job needs, and POPIA section 14 says no longer than
necessary. 1.2 allows instructions "through configuration tools", so there
may be a setting or a request header that deletes the input and the result
after a job. **Ask them which**, before the first call. Until then the app
must not send a clip.

### Smaller points

- **Faces.** Attachment 2: "not designed for special categories" of data.
  Taking a background or an item out of a clip is not recognising who is in
  it, so it is not biometric processing. The app must never ask fal.ai to
  identify a person.
- **Children.** The video editor is not reachable from the Kids Studio, and
  that has to stay true for these three buttons.
- **De-identified data** (1.7.2) may be used to improve their service. It is
  written for California law and covers only data that cannot be tied to a
  person.
- **Sub-processors.** Attachment 4 points to https://trust.fal.ai/subprocessors.

## The API Services terms, read the same day

The owner pasted these too. Five points bind how the app is built:

1. **Never an "Excluded Model".** Section 2 (*Use of Client Content*): a
   model marked "Pending Enterprise Ready" may be trained on what we send,
   **and the DPA and their security duties do not apply to it at all.** So
   that label is not a privacy footnote, it switches off everything in the
   section above. The app may only call models without it.
2. **A third-party model is another company.** Section 2 (*Third Party
   Models*): when a model on fal.ai runs through a partner's own API, the
   member's content goes to that partner, and fal.ai marks which models
   those are. The background-removal model priced in `credits.ts` is
   VEED's. If its page marks it as a partner API, VEED is a new processor:
   a name on the privacy page and a row in `check:verwerkers`, or a
   fal-hosted model instead. Prefer models fal.ai runs itself.
3. **The key never reaches a phone.** Section 2: "Client will not expose any
   of the Services APIs directly to any End Users." Every call goes through
   our server with `FAL_KEY` held there, which is how every other engine in
   this app already works.
4. **Our terms must protect them as well as theirs do.** Section 2 (*End
   User Agreements*). The terms page already has lawful use, no
   infringement, no impersonation and "not guaranteed to be unique". On 26
   October 2026 two lines were widened to fit video: "unique" now covers a
   picture or film, not only music, and "upload recordings you have no
   right to" now names footage and pictures, and film of somebody who has
   not agreed to be in it.
5. **We carry the risk of what members do with it.** Section 3: FutureBox
   indemnifies fal.ai against claims arising from members' use. That is
   why the prompt check and the strike rule on the terms page apply to
   these buttons too, the same as to video generation.

## Commitment minimums

Only matter when volume grows. They offered a 15-minute call; nothing has to
wait on it.

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
3. Their answer on deleting the clip and the result after each job (above).
4. Each model's page checked: not "Pending Enterprise Ready", and not a
   partner API (or that partner added as a processor first).
5. A line for fal.ai on the privacy page. `check:verwerkers` keeps the build
   red until it is there.
