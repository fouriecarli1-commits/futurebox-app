'use client';

/**
 * A host for the presenter, made here: pick a look, press once, and they are
 * in the cast.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * The owner, 11 October 2026: *"By podcasts, ook templates van avatars ... Ek
 * wil dit in die app integrate op 'n moderne stylish manier vir kliente om van
 * te kies."* And on 16 October, with another app's "All tools" screen: an
 * avatar rack to pick a talking host from.
 *
 * The six looks were written that week (`lib/avatartemplates.ts`), but the
 * screen they sat on told people to copy a prompt, take it to another
 * company's site, make the picture there and bring it back — three steps out
 * of the app for the one thing the app already does. It was never put on a
 * screen. This is: the look is a tile, the press draws the host with the same
 * picture engine the poster and product photos use, at the same price, and
 * the new face lands in the cast, chosen, ready for a script.
 *
 * The picture is asked for the way a talking head needs it — facing the
 * camera, mouth closed, face lit and whole — because the lipsync model is
 * handed a still, and a profile or a hand over the mouth is a clip that
 * fails after it is paid for.
 */
import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { AVATAR_TEMPLATES, type AvatarTemplate } from '../lib/avatartemplates';
import { addToCastFromKept } from '../lib/cast';
import { accessToken } from '../lib/cloud';
import { CREDITS, creditsSaid } from '../lib/credits';
import { useLang } from '../lib/i18n';
import { whySaid } from './Cast';

/** What the engine is asked for: the look, in a frame a mouth can be moved in. */
export function hostAsk(look: AvatarTemplate, who: string): string {
  const person = who.trim() ? ` The host: ${who.trim().slice(0, 200)}.` : '';
  return `Photorealistic head-and-shoulders portrait of a podcast host. ${look.aiPrompt[1]}${person} `
    + 'Facing the camera and looking straight into the lens, mouth closed, the whole face visible and evenly lit, '
    + 'nothing in front of the face, no text, no logos.';
}

function asDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

export default function HostRack({
  onMade,
  full,
}: {
  /** The new cast member's id, to choose them. */
  readonly onMade: (memberId: string) => void;
  /** The cast is at its limit: a new host has nowhere to go. */
  readonly full?: boolean;
}): React.ReactElement {
  const { t } = useLang();
  const [look, setLook] = useState<AvatarTemplate>(AVATAR_TEMPLATES[0]);
  const [who, setWho] = useState('');
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');

  const make = async (): Promise<void> => {
    if (busy || full) return;
    setBusy(true);
    setSaid('');
    try {
      const token = await accessToken();
      const answer = await fetch('/api/google/picture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ words: hostAsk(look, who), aspect: '1:1' }),
      });
      if (!answer.ok) {
        const why = (await answer.json().catch(() => ({}))) as { message?: string };
        setSaid(why.message ?? `${t('host.failed', 'The host could not be drawn.')} (${answer.status})`);
        return;
      }
      const picture = await asDataUrl(await answer.blob());
      if (!picture) { setSaid(t('host.failed', 'The host could not be drawn.')); return; }
      const added = await addToCastFromKept(picture, t(look.name[0], look.name[1]));
      if (!added.ok) {
        /* The cast's own reasons, word for word: one place says why a
           picture did not reach the cast (`Cast.tsx`). */
        setSaid(`${t('host.notKept', 'The host was drawn but could not be kept in your cast.')} ${whySaid(added.why, added.missing, t)}`);
        return;
      }
      onMade(added.member.id);
      setSaid(t('host.ready', 'Your new host is in the cast and chosen.'));
    } catch {
      setSaid(t('host.offline', 'Could not reach the studio. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-hostrack className="space-y-2.5 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
        <Sparkles className="h-4 w-4 text-emerald-400" />
        {t('host.title', 'Make a host')}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {AVATAR_TEMPLATES.map((one) => {
          const on = one.id === look.id;
          return (
            <button
              key={one.id}
              type="button"
              data-hostlook={one.id}
              aria-pressed={on}
              onClick={() => setLook(one)}
              className={`min-h-[64px] rounded-xl border p-2.5 text-left transition-colors ${
                on ? 'border-emerald-400 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
              }`}
              style={{ borderLeftColor: one.accentColor, borderLeftWidth: 3 }}
            >
              <span className="block text-xs font-bold text-zinc-100">{t(one.name[0], one.name[1])}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-zinc-400">{t(one.persona[0], one.persona[1])}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-zinc-400">{t(look.what[0], look.what[1])}</p>
      <label className="block space-y-1">
        <span className="text-xs text-zinc-400">{t('host.who', 'Who they are (if you like)')}</span>
        <input
          type="text"
          value={who}
          data-hostwho
          maxLength={200}
          onChange={(event) => setWho(event.target.value)}
          placeholder={t('host.whoHint', 'A woman in her forties with short grey hair')}
          className="min-h-[44px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-hidden"
        />
      </label>
      <button
        type="button"
        data-hostmake
        disabled={busy || full}
        onClick={() => void make()}
        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-onAccent disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy
          ? t('host.drawing', 'Drawing your host…')
          : `${t('host.make', 'Make this host')} · ${creditsSaid(CREDITS.repaint, t)}`}
      </button>
      {full && <p className="text-xs text-amber-400">{t('host.full', 'Your cast is full. Take somebody out of it to make room.')}</p>}
      {said && <p className="text-xs text-zinc-300" data-hostsaid aria-live="polite">{said}</p>}
    </div>
  );
}
