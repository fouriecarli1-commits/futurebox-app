# When somebody finds child sexual abuse material

A draft procedure for FUTUREBOXSTUDIO (Pty) Ltd, written 26 October 2026.
**An attorney must read it before launch.** The section numbers are given
so they can be checked, not because this is legal advice.

---

## Why this exists

- **The law.** The Films and Publications Act 65 of 1996, section 24B(2):
  anyone who knows of, or has reason to suspect, an offence involving child
  sexual abuse material and does not report it to the South African Police
  Service "as soon as possible" commits an offence. That applies to the
  company and to the person who reads the report.
- **Our suppliers.** fal.ai's acceptable-use policy (section 9) makes
  "fail to report child sexual abuse material" a breach of contract. fal.ai
  screens what reaches fal.ai and reports it in the US. What is kept in
  FutureBox's own storage, or posted in the Live room, is ours to report.

## How a report reaches us today

The app's **Report** button (`ReportSheet.tsx`, `/api/report`) is on every
post and on everything the AI makes. Two of its reasons, *Sexual or nude*
and *Not safe for children*, are marked urgent (`urgent()` in
`app/lib/reports.ts`). Every report is kept in the `reports` table and
e-mailed to the owner the same moment.

## What to do, in order

1. **Do not download, copy, forward or screenshot it.** Possessing or
   passing it on is itself an offence, even to show somebody. Look only as
   far as needed to see that it is what the report says.
2. **Take it out of public view at once.** Delete the post's row
   (`live_posts` or `live_says`) or the file from storage, from the Supabase
   dashboard. Write down first: the post's id, the account that posted it
   (`owner`), the date and time, and the report's id.
3. **Keep the evidence, out of sight.** Do not delete the account or the
   original file permanently until the police say so: move the file to a
   private bucket that only the owner can reach, and suspend the account
   (no sign-in, no generating). The police may need it, and deleting it can
   destroy the case.
4. **Report to the SAPS the same day.** At a police station, or through the
   SAPS crime-stop line 08600 10111. Give the facts written down in step 2,
   not the material. Write down the case number.
5. **Report it to the Film and Publication Board** as well, through its
   online hotline (fpb.org.za). They work with the police and with the
   international network that removes such material.
6. **Write a record** in a private file: the report, what was done, when,
   the SAPS case number, and who handled it. Nothing about the child.
7. **Tell nobody else.** Not the member who reported it beyond "thank you,
   it has been dealt with", and not the account holder.

## Who does it

The owner, as information officer, until somebody else is appointed in
writing. If the owner is away for more than a day, a named second person
must be able to do steps 2 to 4. **Decide who that is before launch.**

## Questions for the attorney

- Whether FutureBox has to register with the Film and Publication Board as
  an online distributor, because members can post to the Live room.
- Whether the Cybercrimes Act 19 of 2020 (section 54, reporting within 72
  hours) applies to FutureBox, or only to electronic communications service
  providers and financial institutions.
- How long the evidence must be kept, and how it is handed to the police.

## What the app still lacks

- **A takedown button for the owner.** Today step 2 is done in the Supabase
  dashboard. A button in the owner's report list that hides the post,
  suspends the account and keeps the file aside would do steps 2 and 3 in
  one press.
- **A help link for victims** on the help page: Take It Down (NCMEC), for
  images from when somebody was under 18, and StopNCII.org for adults.
