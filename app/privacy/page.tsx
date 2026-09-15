/**
 * What FutureBox keeps, and what it does not.
 *
 * Written from the schema rather than from a template. Every table named here
 * exists in `supabase/`, and the two claims worth checking — that a card
 * number never reaches this app, and that an address is hashed before it is
 * stored — are true of `app/api/checkout` and `app/lib/server/identity.ts`
 * respectively. A policy that describes a different app than the one it sits
 * on is worse than no policy, because it is a promise made in writing.
 *
 * It is a server component on purpose: a reviewer, a crawler or a store's
 * automated check should get the whole text from one request, without running
 * any JavaScript.
 */

import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy — FutureBox',
  description: 'What FutureBox collects, who it is shared with, and how to have it deleted.',
};

/* Kept beside the text so the date and the text cannot drift apart.

   Moved to 15 September 2026 after reading the ElevenLabs privacy policy,
   DPA and terms of service properly -- fourteen documents, written up in
   docs/ELEVENLABS-TERME.md. Three things were on this page as reassurances
   that the upstream documents do not support, and a fourth was simply
   missing. They are all in the new section "What happens to a recording once
   it leaves here", and each carries the clause it comes from.

   The DPA is also the reason this page now names ElevenLabs as a processor
   in so many words: its 2.2 makes it OUR duty to "provide notice to Data
   Subjects about the Processing of Personal Data by ElevenLabs", and the
   Music API terms 2(D) require a privacy policy that says how information is
   shared "including with ElevenLabs and third parties". Naming them in a
   list of suppliers was most of the way there; it was not all of it. */
const UPDATED = '15 September 2026';

/* Same as the terms: contact is a page, not an address. See the note there. */
const CONTACT_PAGE = '/help';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
      <div className="space-y-3 text-base text-zinc-300 leading-relaxed">{children}</div>
    </section>
  );
}

export default function Privacy(): React.ReactElement {
  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-10">
        <header className="space-y-3">
          <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300">
            ← FutureBox
          </Link>
          <h1 className="text-4xl font-black text-white tracking-tight">Privacy</h1>
          <p className="text-base text-zinc-400 leading-relaxed">
            What this app keeps, who else sees it, and how to have it deleted. Last updated {UPDATED}.
          </p>
        </header>

        <Section title="What is kept, and why">
          <p><strong className="text-white">Your account.</strong> An email address, so you can sign back in and so a payment can be tied to you. If you sign in with Google we receive the email address and name on that account and nothing else — no contacts, no calendar, no drive.</p>
          <p><strong className="text-white">Your songs.</strong> The title, genre, tempo, key, lyrics and style words you wrote, and the audio itself. Audio lives in a private bucket; the rules on it allow one account to reach one folder, and that folder is yours.</p>
          <p><strong className="text-white">Recordings of your voice.</strong> If you clone your voice, the minute you record is sent to ElevenLabs and the clone is kept on their account. We store a row saying that voice is yours and the moment you confirmed, in words, that it is your own voice. That confirmation is kept because consent that cannot be produced afterwards is not consent.</p>
          <p><strong className="text-white">Songs you train a sound on.</strong> Sent to ElevenLabs for training, with a record of whether they came from your channel or you brought them, and your confirmation that the music is yours.</p>
          <p><strong className="text-white">What you have made and spent.</strong> Songs generated, credits granted and spent, purchases. This is how an allowance is counted; without it the free tier would be a suggestion.</p>
          <p><strong className="text-white">Your public profile, if you make one.</strong> A name, an @handle, a short description and links you choose to add. This is meant to be seen — it is how somebody finds you to work with. Songs appear on the collaboration radar only for songs you switch on, one at a time, and switching one off removes it.</p>
          <p><strong className="text-white">Collaboration.</strong> A request between you and one other person, and the messages afterwards. Nobody else can read them, and neither of you can read them before you have both agreed — that is enforced in the database, not by a screen.</p>
          <p><strong className="text-white">What kind of thing you make.</strong> A count. When you finish a song the genre is added to a tally against your account — &ldquo;dubstep, eleven&rdquo; — and when you open a room, the room is. That is the whole of it: a label, how many times, and when it last happened. It is what lets the welcome screen and the copilot suggest the kind of thing you actually make instead of asking every time, and it is why that works on your phone as well as your laptop.<br />What is deliberately not kept is the times themselves. There is no row per song and no row per visit, so no record exists of when you work, how long for, or in what order — the app cannot reconstruct that because it was never written down. You can see the whole tally on your account screen and clear it there, which stops the suggestions and deletes the counts.</p>
          <p><strong className="text-white">Prompts that were refused.</strong> When the safety check refuses something you asked for, what is written down is the rule that refused it, where in the app it happened, the time, and the first 200 characters of what you typed. Prompts that are allowed are not written down this way, and none of this is read by anybody unless a refusal has to be looked into. It is kept because a platform that says it enforces its rules and cannot show a single instance of doing so is making a claim rather than a statement.</p>
        </Section>

        <Section title="What is never kept">
          <p><strong className="text-white">Your card.</strong> Payments go to Paystack, on their page. No card number, expiry or CVV passes through this app or is stored by it. What comes back is a reference and a customer code.</p>
          <p><strong className="text-white">Your address, as an address.</strong> The IP a request arrives from is hashed with a secret before anything is written down, and only the hash is stored. It is used for two things: noticing that a hundred free accounts came from one place, and noticing that a suspended account has come back from the same machine. The address itself is not recoverable from what is kept.</p>
        </Section>

        <Section title="Who else sees it">
          <p>Only what each one needs to do its job:</p>
          <ul className="space-y-1.5 pl-5 list-disc marker:text-emerald-500">
            <li><strong className="text-white">Supabase</strong> — the database, the audio, and sign-in.</li>
            <li><strong className="text-white">Vercel</strong> — hosting. Requests pass through it.</li>
            <li><strong className="text-white">ElevenLabs</strong> — music, voices and trained sounds. Lyrics, style words, recordings of your voice and songs you train on are sent there.</li>
            <li><strong className="text-white">Anthropic</strong> — the copilot and the writing help. What you type into those goes there.</li>
            <li><strong className="text-white">Paystack</strong> — payments. Your email, so a receipt reaches you.</li>
            <li><strong className="text-white">Google</strong> — only if you choose to sign in with it.</li>
          </ul>
          <p>Nothing is sold, and nothing is handed to an advertiser. There is no advertising on FutureBox to hand it to.</p>
        </Section>

        {/* Added 15 September 2026. Four claims, each from the upstream
            document that makes it true, because a privacy policy that is
            kinder than the contract behind it is a promise you lose.

            - Moderation: ElevenLabs privacy policy 3(d), which reserves the
              right to moderate all Input and Output and to "share your Input
              or Output, which may include Personal Data, with third parties
              to support the content moderation and safety initiatives". A
              person may listen. Nothing on this page said so.
            - Transfer: their section 5. Hosting in the US, the Netherlands
              and Singapore, and "regardless of your location, all Personal
              Data will be transferred to the United States for storage".
              POPIA 72 wants a basis for that; the standard contractual
              clauses in DPA 11 are it, and they are deemed executed.
            - Retention: privacy policy 6 (three years) and DPA 9.2.2, which
              gives a self-serve customer no deletion obligation at all --
              only a right to delete after 180 days of inactivity. The
              30-day commitment in 9.2.1 is enterprise-only.
            - Biometrics: their section 12 treats voice as biometric data,
              while DPA Annex I records sensitive data transferred as "N/A".
              Under POPIA biometrics are special personal information, so the
              stricter reading is the one to write to and the consent row
              this app already keeps is the right instinct. */}
        <Section title="What happens to a recording once it leaves here">
          <p>The voice engine is a company in its own right with its own terms, and once a recording of you reaches it, what happens next is governed by those and not only by this page. Four things are worth knowing before you clone your voice, and none of them is obvious from the outside.</p>
          <ul className="space-y-2.5 pl-5 list-disc marker:text-emerald-500">
            <li><strong className="text-white">A person may listen to it.</strong> The voice engine reserves the right to moderate everything sent to it and everything it produces, and to pass that material to third parties who help them do it. This is how a platform stops itself being used to fake somebody&apos;s voice, and it is the reason our own safety check is not the only one. But it does mean a recording of you is not machine-only.</li>
            <li><strong className="text-white">It leaves South Africa.</strong> They host in the United States, the Netherlands and Singapore, and everything is stored in the United States regardless of where it was recorded. POPIA allows that where the receiving party is bound to comparable protection; they are, under the European standard contractual clauses in the data-processing agreement that applies to our account.</li>
            <li><strong className="text-white">Deleting the clone does not delete their licence.</strong> When you delete a cloned voice, the model is deleted from their side as well as ours &mdash; that part is real and this app does it. What we cannot undo is the licence they already hold over the recordings you gave them, which by their own terms is perpetual, and their retention limit for data generated about a voice is three years from your last contact with them. Everything else on this page about deletion is accurate; this is the edge of it.</li>
            <li><strong className="text-white">Your voice is treated here as special personal information.</strong> A voice identifies a person the way a fingerprint does, and POPIA puts that in a stricter category than an email address. That is why cloning asks you to confirm in words that the voice is your own, and why that confirmation is stored with the moment you gave it. It is also why the voice features are switched off entirely for anybody under 18 &mdash; the engine&apos;s own rules prohibit sending it a child&apos;s voice, with no parental-permission exception.</li>
          </ul>
          <p>If that is more than you want, you do not have to clone anything. Writing songs, generating music, making videos and running a channel all work without a recording of your voice ever leaving this app.</p>
          <p className="text-zinc-400">The full list of companies the voice engine uses behind the scenes is published by them at <span className="text-zinc-300">compliance.elevenlabs.io</span>, and they are required to give us thirty days&apos; notice before adding one. If one of them is ever the reason something here has to change, the date at the top of this page changes with it.</p>
        </Section>

        <Section title="How long">
          <p>Your songs, voices and profile stay until you delete them or delete your account. Counting rows — what was generated, what credits moved — are kept while the account exists, because an allowance that forgets is not an allowance.</p>
          <p>The tally of what kind of thing you make stays until you clear it on your account screen, or until the account goes.</p>
          <p>The live visitor count keeps a random id your browser made up and a timestamp, for two minutes. It is not tied to your account and it disappears on its own.</p>
        </Section>

        <Section title="Deleting it">
          <p>You can clear the tally of what you make on your account screen, on its own, without deleting anything else — wanting the suggestions to stop is not the same as wanting the account gone, and only offering the second is not offering a choice.</p>
          <p>You can delete any song, any cloned voice and any trained sound from inside the app at any time. Deleting a voice or a sound removes it from ElevenLabs as well as from here — removing only our row would be hiding it, not deleting it.</p>
          <p>
            To delete your whole account and everything in it, there is a button at the bottom of your channel. It asks you to type your email address first, and then it is immediate: the songs, the videos, the episodes and every file behind them, any cloned voice — from ElevenLabs as well as from here — any trained sound, your credits, your collaborations and the account itself. If you are on a plan it is cancelled first, and if that cancellation fails nothing is deleted, because being charged for an account you no longer have is worse than still having it.
          </p>
          <p>
            One thing does not go with it. A record of a refused prompt stays, with the account detached from it — the rule, the time and a hashed address, and no name, no email and no account. A platform that forgets every refusal the moment somebody signs up again has no memory at all. Everything that identifies you is gone.
          </p>
          <p>
            If you would rather it were done for you, ask on the{' '}
            <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              help page
            </Link>{' '}
            from the address you signed up with, so it can be matched to your account.
          </p>
        </Section>

        <Section title="What you can ask for">
          <p>
            A copy of what is held about you, a correction to anything wrong in it, or its deletion.
            Ask on the{' '}
            <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              help page
            </Link>{' '}
            from the address you signed up with, so it can be matched to your account. Under South
            Africa&apos;s POPIA you may also complain to the Information Regulator if you are not
            satisfied with the answer. Who FutureBox is, in the words the law asks for, is on{' '}
            <Link href="/legal" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              the supplier page
            </Link>
            .
          </p>
        </Section>

        <Section title="Children">
          <p>
            An account is held by somebody 18 or older. FutureBox is not built for children, and an
            account is not knowingly created for anybody under 18 — where a younger person uses it,
            a parent or guardian holds the account and agrees to this on their behalf. If you
            believe an account has been created for a child without that, say so on the{' '}
            <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              help page
            </Link>{' '}
            and it will be removed.
          </p>
          {/* ElevenLabs privacy policy 11: "all users are strictly prohibited
              from uploading, transmitting, emailing, or otherwise making
              Voice Data from children under the age of 18 available to us".
              No parental-consent carve-out, unlike their use policy 9(r).
              For a singing app the stricter rule is the one to build to. */}
          <p>
            <strong className="text-white">One rule has no exception.</strong> No recording of anybody under 18 may be sent to the voice engine &mdash; not with a parent&apos;s permission, not on a parent&apos;s account. So where an account is held by a parent for a younger person, the voice features are off: no cloning, no singing conversion, no reading in your own voice. Everything else works.
          </p>
        </Section>

        {/* POPIA 22 requires notification to the data subject and to the
            Information Regulator "as soon as reasonably possible" after
            discovering a compromise. The ElevenLabs DPA 8.1 gives us their
            side of it -- they notify us without undue delay -- and the Music
            API terms 2(B) separately require us to notify them and the
            affected users. Three duties, one incident. Saying out loud what
            we will do is the cheapest half of being ready to do it. */}
        <Section title="If something goes wrong with it">
          <p>If personal information held here is ever accessed by somebody who should not have it, you will be told: what happened, what of yours was involved, and what to do about it. So will South Africa&apos;s Information Regulator. That is what POPIA requires and it is not conditional on the breach being our fault &mdash; if it happens at one of the suppliers named above and they tell us, we tell you.</p>
          <p>You do not have to wait to be told. If you think something is wrong with your account, say so on the{' '}
            <Link href={CONTACT_PAGE} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">help page</Link>{' '}
            and it will be looked at rather than triaged.</p>
        </Section>

        <Section title="Changes">
          <p>If this changes in a way that affects what is collected or who sees it, the date at the top changes and anybody with an account is told by email before it takes effect.</p>
        </Section>

        <footer className="pt-6 border-t border-zinc-800">
          <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300">← Back to FutureBox</Link>
        </footer>
      </div>
    </main>
  );
}
