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

/** Kept beside the text so the date and the text cannot drift apart. */
const UPDATED = '31 August 2026';
const CONTACT = 'admin@futurebox.app';

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

        <Section title="How long">
          <p>Your songs, voices and profile stay until you delete them or delete your account. Counting rows — what was generated, what credits moved — are kept while the account exists, because an allowance that forgets is not an allowance.</p>
          <p>The live visitor count keeps a random id your browser made up and a timestamp, for two minutes. It is not tied to your account and it disappears on its own.</p>
        </Section>

        <Section title="Deleting it">
          <p>You can delete any song, any cloned voice and any trained sound from inside the app at any time. Deleting a voice or a sound removes it from ElevenLabs as well as from here — removing only our row would be hiding it, not deleting it.</p>
          <p>
            To delete your whole account and everything in it, there is a button at the bottom of your channel. It asks you to type your email address first, and then it is immediate: the songs, the videos, the episodes and every file behind them, any cloned voice — from ElevenLabs as well as from here — any trained sound, your credits, your collaborations and the account itself. If you are on a plan it is cancelled first, and if that cancellation fails nothing is deleted, because being charged for an account you no longer have is worse than still having it.
          </p>
          <p>
            One thing does not go with it. A record of a refused prompt stays, with the account detached from it — the rule, the time and a hashed address, and no name, no email and no account. A platform that forgets every refusal the moment somebody signs up again has no memory at all. Everything that identifies you is gone.
          </p>
          <p>
            If you would rather it were done for you, write to{' '}
            <a href={`mailto:${CONTACT}?subject=Delete%20my%20account`} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
              {CONTACT}
            </a>{' '}
            from the address you signed up with.
          </p>
        </Section>

        <Section title="What you can ask for">
          <p>A copy of what is held about you, a correction to anything wrong in it, or its deletion. Write to the address above. Under South Africa&apos;s POPIA you may also complain to the Information Regulator if you are not satisfied with the answer.</p>
        </Section>

        <Section title="Children">
          <p>FutureBox is not built for children and accounts are not knowingly created for anybody under 13. If you believe one has been, write to the address above and it will be removed.</p>
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
