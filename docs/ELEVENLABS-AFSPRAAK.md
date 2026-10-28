# What we still need from ElevenLabs

Updated 28 October 2026. Only what fal.ai does **not** already give us. The
questions are in English so they can be read out or pasted into an email as
they stand. Background: `docs/ELEVENLABS-TERME.md`. What they might ask us,
with answers: `docs/ELEVENLABS-HULLE-VRA.md`.

## What fal.ai already settled (do not ask ElevenLabs these)

fal.ai answered in writing: their DPA covers pay-as-you-go, they do not train
on what we send, our retention setup is fine (nothing kept past the hour),
commercial use is allowed on every model we call, 40 jobs at once. That covers
stickers, Wake it up, 3D, video clean-up and sound effects from fal.ai.

**What only ElevenLabs gives us today:** the licence for members to sell
songs and voices made through our account, Afrikaans singing and speech,
voice cloning (a member's own voice), the Sound trainer (music finetunes),
pronunciation dictionaries, dubbing, forced alignment and the composition
plan with per-section timing. Those are what the questions below are about.

## Before the call (five minutes)

- **Is the ElevenLabs account in FUTUREBOXSTUDIO (Pty) Ltd's name?** The
  permission to let members use it rests on a "Business Entity", which
  excludes a person in a personal capacity (OEM Terms §1(D)). If it is in a
  personal name, ask on the call how to move it without losing voices and
  finetunes.
- **Is the training opt-out on?** Account → Terms and Privacy → Data use. It
  is not retroactive.
- **Billing:** when the business card arrives, it goes on this account too,
  with the company's VAT number on the invoices.

---

## 1. The licence: may our members sell what they make? (most important)

1. "We are on the Business plan. We read OEM Terms §2(B)(f) as allowing us
   to make the services available to our members. Can you confirm that in
   writing, and does it need an Order Form, or is the plan enough?"
2. "OEM §1(I) defines an End User as using the service *only for its own
   internal business operations*. Our members are creators who release and
   sell their songs. How is that meant to read for them? The ElevenAgents
   terms say *or personal use* in the same clause."
3. "Who owns a song a member makes through our account: the member, us, or
   nobody? May the member register it, put it on Spotify and YouTube through
   a distributor, and earn from it?"
4. "Do distributors and Content ID accept Eleven Music songs? Is there
   anything a member must declare when uploading?"
5. "Is Eleven Music trained only on licensed music? Can we say so to our
   members, and in what words?"
6. "Are we a *Pure-play Music AI Creation Company* under the Music API Terms
   §4? If so, what exactly must the *powered by ElevenLabs* mark look like,
   and how does that sit with OEM §2(B)(d), which asks us not to make public
   statements without approval?"
7. "Please send the Music Terms, including the Prohibited Industries list,
   and your SOC 2 Type II report."

## 2. Afrikaans (the reason we need ElevenLabs at all)

Not one voice or music model on fal.ai names Afrikaans.

8. "Does Eleven Music support Afrikaans lyrics? Is Afrikaans on the
   language list for Music v2 and v2.5?"
9. "We send Afrikaans lyrics respelled for an English reader, and some words
   still come out wrong (for example *saam*, *wat*, *ek*). What is the right
   way to get correct pronunciation in a song: original spelling plus a
   language instruction, phonetic respelling, IPA, or a pronunciation
   dictionary?"
10. "Do pronunciation dictionaries work on the Music endpoint, or only on
    speech?"
11. "Can a song take a guide vocal: the member reading or singing the words,
    so the engine follows their pronunciation?"
12. "Is Afrikaans supported in Eleven v3 and v4 for speech and for cloning?
    If not, is it on the roadmap, and when?"

## 3. Voice cloning (a member's own voice)

13. "Do our members' voice clones count against our own slots (on Business,
    2,200 custom and 10 professional)? What happens when we reach them?"
14. "When a member deletes their cloned voice, is it gone at once on your
    side? What is kept, and for how long?" (Our deletion promise has to
    match.)
15. "Can your voice verification run inside our app, so a professional clone
    is provably the member's own voice? Is anything like it required or
    available for instant clones?"
16. "Your Privacy Policy forbids voice data from anyone under 18. We block
    every voice feature under 18 and our children's room only uses your
    stock voices, with no child's voice ever recorded or sent. Is that
    enough on our side?"

## 4. Data and privacy (POPIA)

17. "Is a zero-retention mode available to us on Business, so member audio
    and lyrics are not stored after the job? If not, how long is each kind
    kept (generated music, uploaded audio, voice samples, logs)?"
18. "Your DPA: does it cover a South African company sending personal
    information to the United States? Does it include standard contractual
    clauses or equivalent safeguards for a transfer out of South Africa?
    (We rely on POPIA section 72.)"
19. "Where is our data processed and stored? Is an EU region available on
    Business?"
20. "Please send the current list of sub-processors, and tell us how we are
    told when it changes."
21. "If you have a security incident affecting our data, how and how fast
    are we told?"

## 5. Money, limits and reliability

22. "What is the smallest plan that keeps the OEM permission? Can it be
    paused or reduced in a quiet month without losing it, our voices or our
    finetunes?" (Credits expire after 12 months, so never prepay more than
    will be used.)
23. "Do you have startup or volume pricing, a grant, or a programme for
    companies building on you?"
24. "What are our rate and concurrency limits on Business, for music and for
    speech? Can they be raised for launch?"
25. "Can you invoice the company, with our VAT number, and do you charge
    South African VAT?"
26. "How much notice do you give before a model or endpoint we use is
    retired or changed? Is there a status page or an alert we can subscribe
    to?"

## 6. The fal.ai road (keep ElevenLabs as a backup)

27. "fal.ai offers your models (music, Eleven v3 and v4 speech, dialogue,
    voice changer, isolation, dubbing, forced alignment, speech to text). If
    we call them through fal.ai, does our OEM permission and commercial
    licence still apply, or only to calls on our own ElevenLabs account?"
    *Why it matters:* if yes, fal.ai is a second road to the same voices
    when one is down. If no, every ElevenLabs feature stays on our own
    account, and fal.ai's copies are not for anything a member sells.

## 7. Smaller ones, if there is time

28. "Which of Music v2, Music v2.5, Eleven v4 and the dialogue model are on
    our API today?"
29. "Can the Music API return word timestamps for the sung lyrics, for
    karaoke-style lyric videos?"
30. "Do generated songs carry a watermark or an AI marker? Is there a way
    to prove a song came from your engine through our account?"
31. "Sound Effects has its own terms. Are effects made on Business ours and
    our members' to use commercially?"

---

## Afterwards

Paste their answers here or send them, and the app is changed to match:

- the licence answers decide what the app may say about selling songs;
- the Afrikaans answers decide how lyrics are sent (spelling, IPA or a
  dictionary);
- the cloning and retention answers decide the deletion text and the
  consent step;
- the fal.ai answer decides whether fal.ai becomes the backup road.
