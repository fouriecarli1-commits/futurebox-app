'use client';

/**
 * Where somebody's accounts are, on one screen.
 *
 *   "ek dink binne iemand se profile moet al die connection buttons wees."
 *
 * She is right, and where these were is the reason she noticed. They were
 * inside the Collab Radar — a room about finding people to work with — behind
 * a panel about how matches are computed. That is a fine place to be reminded
 * that a handle makes a link work, and a strange place for the only screen in
 * the app where you say who you are elsewhere.
 *
 * ── What "connect" honestly means here ───────────────────────────────────
 *
 * Not OAuth, and this says so rather than implying otherwise. Posting on
 * somebody's behalf needs an approved developer app at each platform, a
 * review that takes weeks, and in several cases a registered company — which
 * is a queue of applications rather than a button, and `app/data/social.ts`
 * carries what each one actually requires, in its own words.
 *
 * What a handle really does is two things, and both are real: every link this
 * app prints for you becomes the right link, and every caption it builds
 * carries your name instead of nobody's. That is worth typing ten fields for
 * and it is worth being plain about, because a row of buttons labelled
 * "Connect" that quietly do neither is the kind of lie that costs somebody a
 * real minute before they work it out.
 *
 * ── On this device ───────────────────────────────────────────────────────
 *
 * Handles are kept in local storage, as they always have been. They are not
 * secrets — they are public names — but they are also not needed anywhere but
 * in the browser that prints the links, and a thing that does not need to
 * leave the device should not.
 */

import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, Link2 } from 'lucide-react';
import { PLATFORMS } from '../data/social';
import { loadHandles, profileUrlFor, saveHandles, type Handles } from '../lib/social';
import { useLang } from '../lib/i18n';
import Card from './Card';
import Note from './Note';

export default function Connections(): React.ReactElement {
  const { t } = useLang();
  const [handles, setHandles] = useState<Handles>({});
  /* Read after mount rather than during render: storage during render
     disagrees with the HTML the server sent. */
  useEffect(() => setHandles(loadHandles()), []);

  const set = (id: string, value: string) => {
    const next = { ...handles, [id]: value };
    setHandles(next);
    saveHandles(next);
  };

  const joined = PLATFORMS.filter((one) => (handles[one.id] ?? '').trim()).length;

  return (
    <Card
      title={t('conn.title', 'Where else you are')}
      icon={<Link2 className="h-4 w-4" />}
      aside={
        joined > 0 ? (
          <span className="flex items-center gap-1 whitespace-nowrap text-sm text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            {joined}
          </span>
        ) : null
      }
      startShut={joined > 0}
    >
      <Note>
        {t(
          'conn.what',
          'Your name on each platform. It is not a login and nothing is posted for you — what it does is make every link this app prints the right link, and put your name on every caption it writes. Kept on this device.',
        )}
      </Note>

      <div className="grid gap-2 sm:grid-cols-2 [&>*]:min-w-0">
        {PLATFORMS.map((one) => {
          const url = profileUrlFor(one, handles[one.id] ?? '');
          return (
            <div key={one.id} className="space-y-1">
              <label htmlFor={`conn-${one.id}`} className="text-sm text-zinc-400">
                {one.name}
              </label>
              <input
                id={`conn-${one.id}`}
                value={handles[one.id] ?? ''}
                onChange={(event) => set(one.id, event.target.value)}
                placeholder={t('conn.hint', 'handle, or paste your profile address')}
                className="min-h-[44px] w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
              />
              {/* The link, so somebody can see at a glance that they typed the
                  handle rather than the whole address, or the other way
                  round. Both work; only one of them looks right. */}
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 truncate text-sm text-emerald-400 hover:underline"
                >
                  <span className="truncate">{url.replace(/^https:\/\//, '')}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
