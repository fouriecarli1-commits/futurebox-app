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

## The Terms of Service (8 September 2026), read the same day

The main agreement that the DPA and the API terms hang off. What it adds:

1. **Everybody who presses these buttons must be 18.** Section 2: a
   customer whose own users reach fal.ai "is responsible for ensuring that
   your End Users are at least 18". Our terms let a parent or guardian hold
   an account for somebody younger, and the app does not know a member's
   age. So the same box that asks for the section 72 consent also asks
   "I am 18 or older", and the buttons never appear in the Kids Studio.
2. **"Usage Data" is theirs** (section 6): anonymised or aggregated data,
   which "may include data based on or derived from" what we send, used for
   anything lawful, including their own models. It cannot be tied to a
   person, so POPIA does not reach it, but it means the privacy page must
   not promise that nothing derived from a clip is ever used by fal.ai.
   It promises what the API terms promise: the clip itself is not trained on.
3. **Our input and their output are our confidential information**
   (section 7). Useful, with the same exception as the DPA: they may keep
   what their "standard backup, archival, or record-retention practices"
   keep. Which is the retention question again.
4. **Their acceptable-use policy binds our members too** (section 8,
   https://fal.ai/legal/acceptable-use-policy). Not read yet. The prompt
   check in front of these buttons has to refuse at least what it refuses.
5. **The terms can change on notice; the DPA cannot.** The DPA (section 7)
   needs both parties in writing to change. Re-read the Terms and the API
   terms once a quarter; the DPA only if they write to say it changed.
6. **Money.** Prepaid credits in US dollars, by card. They **expire after
   365 days** (promotional ones after 90) and are not refundable. Prices
   exclude tax. Top up small and often, sized to a month's use.
7. **Who pays if something goes wrong.** Their liability is capped at the
   greater of $50 or what we paid them in twelve months (section 17), and
   we indemnify them for claims about what members send, including privacy
   claims (section 15). The care has to be on our side: send only the clip
   a job needs, and never a clip somebody has not confirmed they may use.
8. **Disputes:** binding individual arbitration in the US (AAA), Californian
   law. A claim under $10,000 is decided on paper, with no hearing, so
   **keeping arbitration is better for a company in South Africa** than the
   opt-out, which sends disputes to the courts in San Francisco. Opting out
   is only possible within 30 days of accepting.
9. **Section 14:** fal.ai output may not be used to train a model that
   competes with the model that made it. This app trains nothing on fal.ai
   output, and must not start.

## The Privacy Policy (22 July 2026) and the Acceptable Use Policy, read the same day

**The privacy policy is about the owner's own fal.ai account, not our
members.** Members' clips are handled under the DPA, as a processor. What
it says that matters to us: fal.ai and its providers store data "in the
United States and other countries", which the section 72 reading above
already assumes; account information is deleted within 30 days of closing
the account, or after two years unused. It still says nothing about how
long a clip sent through the API is kept, so the question to them stands.

**The acceptable-use policy binds our members**, through us. Set against
the prompt check (`app/lib/server/safety.ts`, `app/lib/moderation.ts`):

| fal.ai forbids | Our check |
|---|---|
| Sexual content involving minors | `minors` |
| Sexual imagery of a real person without consent, and explicit content | `likeness`, `explicit` |
| Self-harm, suicide | `self-harm` |
| Terrorism, violent extremism | `extremism` |
| Threats, inciting violence | `violence` |
| Deepfakes, impersonation, scams | `likeness`, `fabricated-news`, `fraud` |
| Harassment or bullying of a person | **not covered** |
| Slurs and hate speech short of "less than human" | **partly** (`extremism`) |
| Gratuitous gore, torture, animal abuse | **not covered** |
| Misinformation about elections or public health | **partly** (`fabricated-news`) |

So these buttons get their own surface in the check, **strict** like video
(refused when the classifier cannot be reached), with those four gaps added
to what it reads. A song keeps today's categories: a lyric may be about a
violent thing, and the classifier is told so on purpose.

Three more rules from the policy:

- **Never switch off a model's safety checker.** Section 7 forbids
  "circumventing any safety guardrails, content filters". Where a model has
  one, the app leaves it on.
- **Under 18 may not use it** (section 8), and failing to apply age-gating
  where the law requires it is itself a breach (section 9). The "I am 18 or
  older" confirmation covers this.
- **Child sexual abuse material must be reported** (section 9: "Fail to
  report" is a breach). South African law already requires it: the Films
  and Publications Act, section 24B, obliges anyone who learns of it to
  report it to the police. **The app has no written procedure for this yet,
  for any room, not only these buttons.** It needs one before launch: who
  receives a report, that the material is kept as evidence and never passed
  on, and that it goes to the SAPS.

## The Trust & Safety page, read the same day

What fal.ai does to everything that passes through it, our members' clips
included:

- **Known child sexual abuse material is hash-matched** (NCMEC and Thorn)
  and reported under US law. **Non-consensual intimate images** are matched
  through StopNCII.org.
- **Every request is run through an automated moderation model** from
  another AI company, across text, image and video.

What it means here:

1. **It covers the gap our own check cannot.** Our check reads words; the
   background and item buttons send footage with no words at all. fal.ai's
   screening reads the footage. It is a second layer, not a reason to drop
   ours: hash-matching only catches material already known.
2. **That moderation model is a sub-processor.** A member's clip may be
   read by it. It belongs on fal.ai's sub-processor list
   (https://trust.fal.ai/subprocessors); check it is there when that list is
   read. The privacy page names fal.ai and points to that list rather than
   naming the companies behind it.
3. **The privacy page must say it.** One sentence: what is sent to fal.ai is
   checked automatically for illegal material, and child abuse material is
   reported to the authorities. The terms page already says "Where the law
   requires it, the matter is reported."
4. **A refusal from fal.ai is a refusal, not an error.** When their
   moderation stops a job, the member gets the credits back and a plain
   sentence saying the clip could not be processed. It is recorded in the
   same refusals log as our own check, so a pattern is visible.
5. **It does not replace our own reporting procedure** (item 7 on
   `docs/WAT-JY-MOET-UITSORTEER.md`). fal.ai reports what reaches fal.ai,
   under US law. What sits in our own storage is ours to report, under
   South African law.
6. **Help for a member who is the victim**, worth linking from the help
   page: Take It Down (NCMEC, for images from when somebody was under 18)
   and StopNCII.org (18 and older).

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
2. The Terms, the DPA and the API terms saved as PDFs in `private/`, dated.
3. Their answer on deleting the clip and the result after each job (above).
4. Each model's page checked: not "Pending Enterprise Ready", and not a
   partner API (or that partner added as a processor first).
5. Their own surface in the prompt check, strict, with the four categories
   above added; and no model's safety checker switched off.
6. The consent box on each button: the clip goes to fal.ai outside South
   Africa, and the member is 18 or older.
7. Handling for a job fal.ai's moderation refuses: credits back, a plain
   sentence, a row in the refusals log.
8. A line for fal.ai on the privacy page, including that what is sent is
   screened for illegal material. `check:verwerkers` keeps the build
   red until it is there.
