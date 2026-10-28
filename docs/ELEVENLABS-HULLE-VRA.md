# What ElevenLabs may ask about FutureBox, with answers

For the call or the email. Search this page for a word from their question
(for example *clone*, *children*, *volume*, *delete*) and read the answer as
it stands. The answers are in English, short, and only say what is true in
the app today. Our questions to them: `docs/ELEVENLABS-AFSPRAAK.md`.

**Never share on the call:** the owner's personal email or phone number, the
company registration number unless they ask for it in writing for a
contract, what we pay masterclass presenters, the profit share with artists,
or any API key.

---

## The company

**Who are you?**
FUTUREBOXSTUDIO (Pty) Ltd, a South African company. FutureBox is a creative
studio app: people make songs, videos, photos, podcasts and stories with AI,
and release them.

**Where are your users?**
South Africa first, in English and Afrikaans. Prices are in rand.

**When do you launch?**
After Google Play approves the app. The company's Play developer account is
being set up now. The web app runs already, in testing.

**On which platforms?**
The web, and Android through Google Play. iPhone later.

**Who is building it?**
The founder runs the company and the product. Development is done in house
with AI coding tools.

**Can I get the company registration details?**
Yes, in writing when a contract needs them. (Send them by email, not on the
call.)

## The product

**What do people make with ElevenLabs in your app?**
Songs (Eleven Music, with a composition plan per section), speech and
read-aloud (text to speech, and dialogue for podcasts and children's
stories), a member's own cloned voice, voice changing, speech to text,
word timing for lyric videos (forced alignment), stem separation, dubbing,
and the Sound trainer (music finetunes on a member's own songs).

**Do your users get API access or keys?**
No. Members only press buttons in our app. Our key stays on our server and is
never sent to a phone or a browser.

**Do you resell ElevenLabs as a service?**
No. ElevenLabs is one engine inside a finished creative product. Members pay
for credits and plans in FutureBox, not for ElevenLabs access.

**Do you use other AI providers?**
Yes, for other parts of the app (pictures, video, text). For Afrikaans songs
we use ElevenLabs because it sings Afrikaans better.

**Why do you need Afrikaans?**
It is one of the main languages of our market and there is almost no good AI
singing or speech in Afrikaans. It is the core of what makes FutureBox
different.

**Do you show that ElevenLabs made it?**
Yes. Every release lists the engines that made it ("model stack") under the
song. We will follow your rules for the *powered by ElevenLabs* mark.

**Is it clear to listeners that it is AI?**
Yes. The app says it is an AI studio on its first screen, and every release
names the AI engines used.

## Volume and money

**How much will you use?**
At launch we expect modest volume: hundreds of members in the first months,
growing with marketing. Every generation is capped per member and per hour,
and the app stops itself before our monthly ElevenLabs allowance runs out.
(Fill in the real numbers after the first month.)

**Which plan are you on?**
The Business plan.

**What do your members pay?**
Plans of R149, R349 and R899 a month, and credit packs. There is a free plan
with a few welcome credits. Every paid press shows its price before it is
pressed.

**How do you stop one user running up a bill?**
Every route that calls ElevenLabs is rate limited per account and per
address, checked by an automatic test so a new route cannot skip it. The
allowance is watched at 50, 75, 90 and 100 percent, with an email to us.
Credits are charged before the call and refunded if the engine fails.

## Voice cloning and consent

**How do you make sure a cloned voice belongs to the person?**
A member can only clone their own voice. Before recording they confirm, word
for word: *"This is my own voice, and I am 18 or older…"*. We store that
exact sentence, the time, and a protected record of who agreed, with the
voice. Without it the server refuses the clone.

**Can someone use another member's voice?**
No. Every voice request is checked against the signed-in member's own voices
on our server before it reaches ElevenLabs. Anyone else's voice id is
refused.

**Can a member take their voice back?**
Yes. Deleting the voice in the app deletes it on our side and at ElevenLabs,
and deleting the account deletes all of it.

**What about celebrities and impersonation?**
Cloning is own-voice only, with the consent sentence above. Names that copy
our brand are blocked. Our terms forbid impersonation, and members can
report content.

## Children

**Do you have users under 18?**
Voice features are for 18 and older only. There is a separate children's
room that a parent sets up and pays for.

**Does the children's room send children's voices to ElevenLabs?**
No. Children never record a voice there. Their stories are read aloud with
your stock voices only, from text; nobody's cloned voice can be used in it.

## Content and safety

**How do you moderate what is generated?**
Every prompt, lyric and style is screened on our server before it is sent
to any engine and before anything is charged, in English and Afrikaans,
against your prohibited-use categories (minors, sexual content, hate,
violence, terrorism, weapons and more). A refused request costs the member
nothing.

**What if someone uploads music they do not own?**
Our terms require members to own or have rights to what they upload, and
content can be reported and taken down. (We will tighten the upload check
if you require it.)

**Do you pass your terms on to members?**
Yes. Members must tick to accept our terms at sign-up, and our terms carry
your restrictions and Prohibited Use Policy, as the OEM Terms require.

## Data and privacy

**Where is data stored?**
Our accounts and files are in the United States (our database and hosting
providers). Members agree to that in the privacy policy, under South
Africa's POPIA.

**Is ElevenLabs named in your privacy policy?**
Yes, as a processor of voice, lyrics and audio.

**Do you train models on member content?**
No. We do not train any model on member content, and our training opt-out
at ElevenLabs is on. (Check it is on before the call.)

**How long do you keep things?**
What a member makes stays in their account until they delete it. Deleting a
song, a voice or the account deletes the files with it.

**Who else processes data?**
Hosting, database, payments, email, and the AI engines for pictures, video
and text. A full list is in our privacy policy, and we can send it.

**Have you had a security review?**
We run more than 500 automatic safety and security checks on every change,
including that keys never reach the browser and that every paid route is
screened and rate limited. No independent audit yet.

## Technical

**How do you call the API?**
From our own server only, with one key. Long jobs (dubbing) use your
webhook, with the signature verified.

**What happens when ElevenLabs is down?**
The member is told in plain words that the engine did not answer, and their
credits come back. Nothing is charged for a failed job.

**Which models do you use?**
Eleven Music for songs, Eleven v3 for speech and dialogue, multilingual
models for other languages, Scribe for speech to text, forced alignment,
voice cloning, voice changer, dubbing and music finetunes.

---

If they ask something not on this page, say *"I will confirm that in
writing"*, note the question, and send it here so the answer can be checked
against the app before it is sent.
