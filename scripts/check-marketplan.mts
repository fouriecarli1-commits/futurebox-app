/**
 * The plan's ordering, and the calendar file it comes out as.
 *
 * Two things here fail quietly rather than loudly, which is why they are
 * checked rather than eyeballed:
 *
 *   · a schedule out of order still looks like a schedule. The model returns
 *     the slots in whatever order it thought of them, and Friday above Tuesday
 *     reads as a mistake in the plan rather than a mistake in the app.
 *   · an `.ics` file with an unescaped comma, or a line over 75 octets, is not
 *     a broken-looking file. It is one that imports with half a description,
 *     or that one calendar accepts and another silently refuses. Afrikaans
 *     makes the second one likely rather than theoretical: "’" is three bytes,
 *     so a line well under 75 characters can be well over 75 octets.
 */

import {
  sortedWeek,
  minutesOf,
  loadPerDay,
  icsOf,
  firstOccurrence,
  DAY_IDS,
  type Slot,
} from '../app/lib/marketplan.ts';

let bad = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  if (!ok) {
    bad += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

const slot = (day: Slot['day'], at: string, over: Partial<Slot> = {}): Slot => ({
  day, at, platform: 'TikTok', what: 'A clip', why: 'Because', ...over,
});

// ── Reading a time ───────────────────────────────────────────────────────
check('a plain time reads', minutesOf('18:00') === 18 * 60, String(minutesOf('18:00')));
check('an hour before ten reads', minutesOf('07:30') === 7 * 60 + 30, String(minutesOf('07:30')));
check('one without a leading zero reads', minutesOf('7:30') === 7 * 60 + 30, String(minutesOf('7:30')));
check('a full stop is accepted', minutesOf('18.30') === 18 * 60 + 30, String(minutesOf('18.30')));
check('a twenty-fifth hour is refused', minutesOf('25:00') === null, String(minutesOf('25:00')));
check('a sixty-first minute is refused', minutesOf('18:61') === null, String(minutesOf('18:61')));
check('"evening" is not a time', minutesOf('evening') === null, String(minutesOf('evening')));
check('and neither is nothing', minutesOf('') === null);

// ── The order ────────────────────────────────────────────────────────────
{
  const week = sortedWeek([
    slot('friday', '09:00'),
    slot('monday', '18:00'),
    slot('monday', '07:00'),
    slot('sunday', '12:00'),
  ]);
  check('the week comes out in week order, not the order it was thought of',
    week.map((one) => one.day).join(',') === 'monday,monday,friday,sunday',
    week.map((one) => one.day).join(','));
  check('and each day in clock order',
    week[0].at === '07:00' && week[1].at === '18:00',
    `${week[0].at} then ${week[1].at}`);
}

{
  /* A slot whose time cannot be read is kept and put last in its own day.
     Dropping it would lose work the model did, silently, on the one screen
     somebody is paying for. */
  const week = sortedWeek([slot('monday', 'evening'), slot('monday', '18:00')]);
  check('a slot with an unreadable time is kept, not dropped', week.length === 2, String(week.length));
  check('and sorted to the end of its day', week[1].at === 'evening', week[1].at);
}

check('a day the model invented does not throw, and goes last',
  sortedWeek([slot('someday' as Slot['day'], '09:00'), slot('monday', '09:00')])[0].day === 'monday');

check('the load per day is seven numbers',
  loadPerDay([slot('monday', '09:00'), slot('monday', '18:00'), slot('sunday', '10:00')])
    .join(',') === '2,0,0,0,0,0,1',
  loadPerDay([slot('monday', '09:00'), slot('monday', '18:00'), slot('sunday', '10:00')]).join(','));

// ── When the first one lands ─────────────────────────────────────────────
{
  // Wednesday 3 June 2026.
  const from = new Date(2026, 5, 3, 9, 0, 0);
  const friday = firstOccurrence('friday', '18:00', from);
  check('the next Friday is two days on', friday?.getDate() === 5, String(friday?.getDate()));
  check('at the time asked for',
    friday?.getHours() === 18 && friday?.getMinutes() === 0,
    `${friday?.getHours()}:${friday?.getMinutes()}`);

  const wednesday = firstOccurrence('wednesday', '18:00', from);
  check('today counts as the next one', wednesday?.getDate() === 3, String(wednesday?.getDate()));

  const monday = firstOccurrence('monday', '08:00', from);
  check('and a day already past this week rolls to next week',
    monday?.getDate() === 8, String(monday?.getDate()));

  check('an unreadable time has no occurrence',
    firstOccurrence('monday', 'evening', from) === null);
}

// ── The calendar file ────────────────────────────────────────────────────
const FROM = new Date(2026, 5, 3, 9, 0, 0);
{
  const ics = icsOf([slot('friday', '18:00'), slot('monday', '08:00')], { from: FROM });

  check('it is a calendar', ics.startsWith('BEGIN:VCALENDAR\r\n'), ics.slice(0, 20));
  check('and it is closed', ics.trimEnd().endsWith('END:VCALENDAR'), ics.slice(-30));
  check('every line ends CRLF, which the specification requires',
    !/[^\r]\n/.test(ics), 'a bare newline is in there');
  check('one event per slot', (ics.match(/BEGIN:VEVENT/g) ?? []).length === 2,
    String((ics.match(/BEGIN:VEVENT/g) ?? []).length));
  check('each repeats weekly on its own day',
    ics.includes('RRULE:FREQ=WEEKLY;BYDAY=FR') && ics.includes('RRULE:FREQ=WEEKLY;BYDAY=MO'));
  check('the times are floating — no Z, no TZID',
    !/DTSTART[^\r\n]*(Z|TZID)/.test(ics), /DTSTART[^\r\n]*/.exec(ics)?.[0] ?? '');
  check('and Monday starts at eight on the eighth',
    ics.includes('DTSTART:20260608T080000'), /DTSTART:20260608[^\r\n]*/.exec(ics)?.[0] ?? 'not found');
  check('a slot is half an hour by default',
    ics.includes('DTEND:20260608T083000'), /DTEND:20260608[^\r\n]*/.exec(ics)?.[0] ?? 'not found');
}

{
  // The four characters that have to be escaped, all in one slot.
  const ics = icsOf(
    [slot('monday', '08:00', {
      what: 'Clip A, then B; with a\\slash',
      why: 'One line\nand another',
    })],
    { from: FROM },
  );
  check('a comma is escaped', ics.includes('Clip A\\, then B'), 'comma');
  check('a semicolon is escaped', ics.includes('then B\\; with'), 'semicolon');
  check('a backslash is escaped', ics.includes('a\\\\slash'), 'backslash');
  check('a newline becomes \\n rather than ending the line',
    ics.includes('One line\\nand another'), 'newline');
}

{
  /* Folding, counted in octets. Afrikaans is the reason this matters: a line
     of Afrikaans well under 75 characters is over 75 bytes, and the version of
     this that counted characters produced files a strict parser rejects. */
  const long = 'Sit ’n lang beskrywing hier neer wat verby vyf-en-sewentig grepe strek — met ’n paar aksente en ’n lang gedagte agteraan.';
  const ics = icsOf([slot('monday', '08:00', { what: long })], { from: FROM });
  const over = ics
    .split('\r\n')
    .filter((line) => new TextEncoder().encode(line).length > 75);
  check('no line is over seventy-five octets', over.length === 0,
    over.map((one) => `${new TextEncoder().encode(one).length}b`).join(','));
  check('a folded line continues with a space',
    /\r\n [^\r\n]/.test(ics), 'no continuation found');
  check('and the words survive the fold',
    ics.replace(/\r\n /g, '').includes('vyf-en-sewentig grepe'), 'the text was mangled');
}

{
  // A slot the calendar cannot place is left out of the file and left on the
  // screen, which is where it can be fixed.
  const ics = icsOf([slot('monday', 'sometime'), slot('monday', '08:00')], { from: FROM });
  check('a slot with no readable time is not written into the calendar',
    (ics.match(/BEGIN:VEVENT/g) ?? []).length === 1,
    String((ics.match(/BEGIN:VEVENT/g) ?? []).length));
}

check('an empty week is still a valid empty calendar',
  icsOf([], { from: FROM }).includes('END:VCALENDAR') &&
    !icsOf([], { from: FROM }).includes('BEGIN:VEVENT'));

check('every day has an ics code', DAY_IDS.length === 7, String(DAY_IDS.length));

if (bad) {
  console.error(`\ncheck:marketplan — ${bad} wrong.`);
  process.exit(1);
}
console.log('check:marketplan — the week is in order and the calendar file is one.');
