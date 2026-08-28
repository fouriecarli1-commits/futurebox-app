/**
 * A person's show: the channel, and everything published on it.
 *
 * One show per account for now. That is a deliberate simplification rather
 * than an oversight — a second show is a new slug, a new feed and a new set of
 * artwork, and nobody has asked for two yet.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { PODCAST_CAPS } from '@/app/lib/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Lower case, letters, digits and dashes: it goes in a URL people read. */
function slugify(value: string, fallback: string): string {
  const made = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return made || fallback;
}

/** Only the places somebody actually links to, and only as plain https. */
const LINK_KEYS = ['website', 'x', 'instagram', 'youtube', 'tiktok', 'facebook', 'linkedin', 'spotify', 'apple'];

function cleanLinks(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, string> = {};
  LINK_KEYS.forEach((key) => {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value !== 'string') return;
    const trimmed = value.trim().slice(0, 300);
    // Anything that is not http(s) can be a javascript: URL, and this ends up
    // in an href on a page other people look at.
    if (/^https?:\/\//i.test(trimmed)) out[key] = trimmed;
  });
  return out;
}

export async function GET(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ configured: false });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ configured: true, signedIn: false });

  const client = admin();
  if (!client) return Response.json({ configured: false });

  const { data: show } = await client.from('shows').select('*').eq('owner', caller.id).maybeSingle();
  if (!show) return Response.json({ configured: true, signedIn: true, show: null, episodes: [] });

  const { data: episodes } = await client
    .from('episodes')
    .select('*')
    .eq('show_id', show.id)
    .order('published_at', { ascending: false });

  return Response.json({
    configured: true,
    signedIn: true,
    show,
    episodes: episodes ?? [],
    caps: PODCAST_CAPS[caller.tier],
    tier: caller.tier,
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ message: 'Accounts are not configured.' }, { status: 503 });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ message: 'Sign in first.' }, { status: 401 });

  if (!PODCAST_CAPS[caller.tier].publish) {
    return Response.json(
      { message: 'A show with its own feed needs a paid plan.', needsPlan: true },
      { status: 402 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ message: 'Could not read the request.' }, { status: 400 });
  }

  const client = admin();
  if (!client) return Response.json({ message: 'Storage is not configured.' }, { status: 503 });

  const title = String(body.title ?? '').trim().slice(0, 140);
  if (!title) return Response.json({ message: 'A show needs a name.' }, { status: 400 });

  const { data: existing } = await client.from('shows').select('id').eq('owner', caller.id).maybeSingle();

  const row = {
    // The slug is fixed at creation: changing it would break every feed
    // anybody has already subscribed to.
    id: existing?.id ?? slugify(title, caller.id.slice(0, 8)),
    owner: caller.id,
    title,
    about: String(body.about ?? '').trim().slice(0, 4_000),
    author: String(body.author ?? '').trim().slice(0, 140),
    image_url: typeof body.imageUrl === 'string' && /^https?:\/\//i.test(body.imageUrl) ? body.imageUrl : null,
    language: String(body.language ?? 'en').slice(0, 5),
    links: cleanLinks(body.links),
    updated_at: new Date().toISOString(),
  };

  const { error } = await client.from('shows').upsert(row);
  if (error) return Response.json({ message: error.message }, { status: 500 });

  return Response.json({ show: row });
}
