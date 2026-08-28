/**
 * The Arena: what is open, who has entered, and who won.
 *
 * Reads are public because they have to be — the rules and the closing date
 * must be readable before anybody enters, and a winner who is only announced
 * privately has not been announced. Writes divide in three:
 *
 *   · anybody signed in may enter, by the free route, once;
 *   · a **paid** entry is never written here. It is written by the payment
 *     webhook after money actually arrived, because an entry the browser can
 *     claim to have paid for is an entry that costs nothing;
 *   · opening a competition and naming a winner are the operator's alone.
 */

import { admin, callerFrom, callerIsOwner, metered } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CATEGORIES = ['music', 'video', 'app', 'idea'];

function slug(value: string): string {
  return (
    value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) ||
    `c-${Date.now()}`
  );
}

export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ configured: false, competitions: [], mine: [], winners: [] });
  const client = admin();
  if (!client) return Response.json({ configured: false, competitions: [], mine: [], winners: [] });

  const caller = await callerFrom(request).catch(() => null);

  const [{ data: competitions }, { data: winners }, { data: counts }] = await Promise.all([
    client.from('competitions').select('*').neq('status', 'draft').order('closes_at', { ascending: true }),
    client.from('winners').select('*').order('announced_at', { ascending: false }).limit(50),
    client.rpc('entry_counts'),
  ]);

  const mine = caller
    ? ((await client.from('entries').select('*').eq('owner', caller.id)).data ?? [])
    : [];

  // Which of those wins are the caller's own. The public list carries owner
  // ids, and a browser has no way to know which one is its own account — so
  // asking "did I win" has to be answered here.
  const mineWon = caller
    ? ((await client.from('winners').select('*').eq('owner', caller.id)).data ?? [])
    : [];

  const entered = new Map(
    ((counts ?? []) as Array<{ competition_id: string; entries: number | string }>).map((row) => [
      row.competition_id,
      Number(row.entries) || 0,
    ]),
  );

  return Response.json({
    configured: true,
    isOwner: callerIsOwner(caller),
    signedIn: Boolean(caller),
    competitions: (competitions ?? []).map((one) => ({ ...one, entries: entered.get(one.id) ?? 0 })),
    mine,
    mineWon,
    winners: winners ?? [],
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  const action = String(body.action ?? 'enter');

  // ── Opening a competition ────────────────────────────────────────────────
  if (action === 'open') {
    if (!callerIsOwner(caller)) return Response.json({ message: 'Not yours to open.' }, { status: 403 });

    const title = String(body.title ?? '').trim().slice(0, 160);
    const category = String(body.category ?? '');
    const rubric = Array.isArray(body.rubric) ? body.rubric : [];
    if (!title) return Response.json({ message: 'A competition needs a title.' }, { status: 400 });
    if (CATEGORIES.indexOf(category) === -1) {
      return Response.json({ message: 'That is not a category.' }, { status: 400 });
    }
    // The rubric is what makes this judged on skill rather than a draw, so it
    // is a requirement rather than a nicety.
    if (!rubric.length) {
      return Response.json(
        { message: 'A competition without a published rubric would be a draw, not a contest.' },
        { status: 400 },
      );
    }

    const closes = new Date(String(body.closesAt ?? ''));
    const announce = new Date(String(body.announceAt ?? ''));
    if (Number.isNaN(closes.getTime()) || Number.isNaN(announce.getTime())) {
      return Response.json({ message: 'Both dates are needed.' }, { status: 400 });
    }
    if (announce <= closes) {
      return Response.json({ message: 'Winners are announced after entries close.' }, { status: 400 });
    }

    const row = {
      id: slug(title),
      title,
      category,
      brief: String(body.brief ?? '').slice(0, 4_000),
      constraint_note: String(body.constraint ?? '').slice(0, 500),
      rubric,
      entry_rand: Math.max(0, Math.round(Number(body.entryRand ?? 0)) || 0),
      prize_rand: Math.max(0, Math.round(Number(body.prizeRand ?? 0)) || 0),
      closes_at: closes.toISOString(),
      announce_at: announce.toISOString(),
      status: 'open',
    };
    const { error } = await client.from('competitions').upsert(row);
    if (error) return Response.json({ message: error.message }, { status: 500 });
    return Response.json({ competition: row });
  }

  // ── Naming the winners ───────────────────────────────────────────────────
  if (action === 'announce') {
    if (!callerIsOwner(caller)) return Response.json({ message: 'Not yours to announce.' }, { status: 403 });
    const competitionId = String(body.competitionId ?? '');
    const places = Array.isArray(body.places) ? body.places : [];
    if (!competitionId || !places.length) {
      return Response.json({ message: 'Which competition, and who won?' }, { status: 400 });
    }

    const { data: competition } = await client
      .from('competitions').select('prize_rand').eq('id', competitionId).maybeSingle();

    for (let i = 0; i < places.length; i += 1) {
      const place = places[i] as { entryId?: string; place?: number; prizeRand?: number };
      const { data: entry } = await client
        .from('entries').select('id, owner').eq('id', String(place.entryId ?? '')).maybeSingle();
      // An entry that is not in this competition cannot win it.
      if (!entry) continue;
      await client.from('winners').upsert({
        competition_id: competitionId,
        place: Math.max(1, Math.round(Number(place.place ?? i + 1))),
        entry_id: entry.id,
        owner: entry.owner,
        prize_rand: Math.max(0, Math.round(Number(place.prizeRand ?? competition?.prize_rand ?? 0))),
        announced_at: new Date().toISOString(),
      });
    }
    await client.from('competitions').update({ status: 'announced' }).eq('id', competitionId);
    return Response.json({ ok: true });
  }

  // ── Entering, by the free route ──────────────────────────────────────────
  const competitionId = String(body.competitionId ?? '');
  if (!competitionId) return Response.json({ message: 'Which competition?' }, { status: 400 });

  const { data: competition } = await client
    .from('competitions').select('*').eq('id', competitionId).maybeSingle();
  if (!competition || competition.status !== 'open') {
    return Response.json({ message: 'That competition is not open.' }, { status: 400 });
  }
  if (new Date(competition.closes_at) < new Date()) {
    return Response.json({ message: 'Entries have closed.' }, { status: 400 });
  }

  const { error } = await client.from('entries').insert({
    id: `e-${Date.now()}-${caller.id.slice(0, 6)}`,
    competition_id: competitionId,
    owner: caller.id,
    track_id: typeof body.trackId === 'string' ? body.trackId : null,
    title: String(body.title ?? '').slice(0, 200),
    note: String(body.note ?? '').slice(0, 2_000),
    link: typeof body.link === 'string' && /^https?:\/\//i.test(body.link) ? body.link : null,
    route: 'free',
  });
  if (error) {
    const twice = error.message.toLowerCase().indexOf('duplicate') !== -1;
    return Response.json(
      { message: twice ? 'You are already in this one.' : error.message },
      { status: twice ? 409 : 500 },
    );
  }
  return Response.json({ ok: true });
}
