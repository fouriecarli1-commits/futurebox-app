'use client';

/**
 * 3D characters: a character drawn in a look, kept in the cast, and put in a shot.
 *
 * ── What the owner asked for ─────────────────────────────────────────────
 *
 * The owner, 22 October 2026 (translated): *"What do you call the AI 3D/4D
 * models — those lifelike little figures used in games? Can we put a studio
 * like that in the video editor, so animated characters can be made in the
 * video studio and eventually used in the video?"*
 *
 * The honest answer to the first question is that a game's figure is a
 * rigged 3D model — a mesh with a skeleton — and nothing this app rents makes
 * one. What it CAN do is the part she is after: a character in that look, in
 * her film, moving. Gemini draws the character as one clear picture; Veo makes
 * the picture move. The room says exactly that, in a sentence at the top,
 * because "3D model" on the button would send somebody looking for a skeleton
 * to pose and they would be right to feel misled when there was none.
 *
 * ── Three things the picture can become ──────────────────────────────────
 *
 * Kept in the cast, it is a reference: ticked in any shot, its face and
 * clothes go up with the words and come back the same. Put in a shot as the
 * opening frame, the engine animates it straight away. Or both — keep it,
 * then tick it, and draw it into a scene. The cast is the only one of those
 * that outlives this page, which is why it is the button with a name box.
 *
 * ── What it costs ─────────────────────────────────────────────────────────
 *
 * A drawing is the picture route's own price, `CREDITS.repaint`, the same as
 * a frame on the shot bench — it IS a frame on the shot bench, drawn with a
 * longer sentence. No new price was invented for it, and every button that
 * draws says the price on itself.
 */
import React, { useState } from 'react';
import { Clapperboard, ImagePlus, Loader2, Sparkles, UserRoundPlus, Users, X } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { accessToken } from '../lib/cloud';
import { CREDITS, creditsSaid } from '../lib/credits';
import { addToCastFromKept, type Member } from '../lib/cast';
import { ACCEPTS, fit } from '../lib/imagefile';
import { imageFrom, packLed } from '../lib/packpicture';
import { CHARACTER_LOOKS, characterAsk, characterLook } from '../lib/futurelooks';
import { asDataUrl } from '../lib/shotframes';
import { INK, INK_DIM, LIT } from '../lib/cutlook';
import FutureTile from './FutureTile';
import { whySaid } from './Cast';
import IdeaChips from './IdeaChips';
import { CHARACTER_IDEAS } from '../lib/promptideas';

export type CharacterPut =
  | { readonly as: 'frame'; readonly picture: string; readonly words: string }
  | { readonly as: 'cast'; readonly member: Member; readonly words: string };

/** A step heading, numbered like a readout, so the bench reads top to bottom. */
function Step({ n, children }: { readonly n: string; readonly children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="font-mono text-[11px] font-black tracking-[0.18em]" style={{ color: LIT }}>{n}</span>
      <span className="text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: INK }}>{children}</span>
      <span aria-hidden className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(52,211,153,0.4), transparent)' }} />
    </div>
  );
}

export default function CharacterBench({ onPut, castFull }: {
  /** Hand the character to the shot bench, as its opening frame or as a ticked cast member. */
  readonly onPut: (what: CharacterPut) => void;
  /** The cast already holds `CAST_LIMIT`. */
  readonly castFull: boolean;
}): React.ReactElement {
  const { t } = useLang();
  const [who, setWho] = useState('');
  const [look, setLook] = useState(CHARACTER_LOOKS[0].id);
  const [self, setSelf] = useState<string | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [busy, setBusy] = useState<'' | 'draw' | 'keep' | 'photo'>('');
  const [said, setSaid] = useState('');
  const [name, setName] = useState('');
  const [kept, setKept] = useState<Member | null>(null);

  const price = creditsSaid(CREDITS.repaint, t);
  const named = (): string => name.trim() || t('future.char.nameDefault', 'My character');

  const takePhoto = async (file: File | null | undefined): Promise<void> => {
    if (!file) return;
    setBusy('photo');
    setSaid('');
    try {
      /* Fitted on the device first: a phone photograph is several
         megabytes, and the picture route stops a body at about three. A
         face needs far less than that to stay a face. */
      const made = await fit(file, 1024);
      if (!made.ok) { setSaid(t('future.char.photoBad', 'That photo could not be read. Try a different one.')); return; }
      setSelf(made.preview);
    } finally {
      setBusy('');
    }
  };

  const draw = async (): Promise<void> => {
    if (busy) return;
    setBusy('draw');
    setSaid('');
    try {
      /* The photo goes up only when there is one, and the sentence that
         mentions it only goes with it — see `characterAsk`. */
      const lead = self ? await imageFrom(self) : null;
      const from = lead ? packLed(lead, []) : [];
      if (self && !from.length) {
        setSaid(t('future.char.photoBig', 'That photo is too big to send. Try a smaller one.'));
        return;
      }
      const token = await accessToken();
      const answer = await fetch('/api/google/picture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          words: characterAsk(characterLook(look), who, Boolean(self)),
          /* Tall, because a person standing is tall. `intoShape` fits it to
             the film's shape when it becomes an opening frame. */
          aspect: '3:4',
          ...(from.length ? { from } : {}),
        }),
      });
      if (!answer.ok) {
        const why = (await answer.json().catch(() => ({}))) as { message?: string };
        setSaid(why.message ?? `${t('future.char.failed', 'The character could not be drawn.')} (${answer.status})`);
        return;
      }
      const picture = await asDataUrl(await answer.blob());
      if (!picture) { setSaid(t('edit.shotUnreadable', 'What came back could not be read as a picture.')); return; }
      setSheet(picture);
      /* A new drawing is a new character: the one kept a moment ago is not
         this one, and ticking it in a shot would put the old face in. */
      setKept(null);
      setSaid(t('future.char.drawn', 'Drawn. Keep it in your cast, put it in a shot, or draw it again.'));
    } catch {
      setSaid(t('edit.shotOffline', 'That could not be sent. Check the connection and try again.'));
    } finally {
      setBusy('');
    }
  };

  const keep = async (): Promise<Member | null> => {
    if (!sheet || busy) return kept;
    if (kept) return kept;
    setBusy('keep');
    setSaid('');
    try {
      const added = await addToCastFromKept(sheet, named());
      if (!added.ok) {
        /* The cast's own reasons, word for word — one place says why a
           picture did not reach the cast (`Cast.tsx`). */
        setSaid(`${t('future.char.notKept', 'The character was drawn but could not be kept in your cast.')} ${whySaid(added.why, added.missing, t)}`);
        return null;
      }
      setKept(added.member);
      setSaid(t('future.char.keptSaid', '{name} is in your cast, on every device you sign in on.').replace('{name}', added.member.name));
      return added.member;
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-3" data-charbench>
      {/* ── What this is, before anything costs anything ──────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl border p-3.5"
        style={{
          borderColor: 'rgba(52,211,153,0.35)',
          background: 'radial-gradient(120% 140% at 100% 0%, rgba(34,211,238,0.16), transparent 55%), radial-gradient(120% 140% at 0% 100%, rgba(167,139,250,0.14), transparent 55%), rgba(10,12,16,0.9)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] font-black tracking-[0.2em]" style={{ borderColor: 'rgba(34,211,238,0.5)', color: '#67e8f9' }}>
            {t('future.chip.ai', 'AI')} · 3D
          </span>
          <span className="text-base font-black tracking-tight" style={{ color: INK }}>
            {t('future.char.title', '3D characters')}
          </span>
        </div>
        <p className="pt-1.5 text-[13px] leading-relaxed" style={{ color: INK_DIM }} data-charwhat>
          {t('future.char.what', 'Describe a character and pick a look. The AI draws it as a character sheet — the whole figure, facing you, on a plain background — and the video engine brings it to life in a shot. These are AI-drawn 3D-style characters that the video engine animates, not rigged 3D models you pose by hand.')}
        </p>
      </div>

      <Step n="01">{t('future.char.who', 'Who is it?')}</Step>
      <textarea
        data-charwords
        value={who}
        onChange={(event) => setWho(event.target.value.slice(0, 400))}
        rows={2}
        maxLength={400}
        aria-label={t('future.char.who', 'Who is it?')}
        placeholder={t('future.char.whoHint', 'Type here… e.g. a young explorer in a silver flight suit with a small jetpack')}
        className="w-full rounded-xl border bg-black/40 p-2.5 text-[13px] leading-relaxed outline-hidden focus:border-emerald-400"
        style={{ color: INK, borderColor: 'rgba(52,211,153,0.35)' }}
      />
      {/* A start to type from, and a fresh handful on the round button (`lib/promptideas.ts`). */}
      <div data-charideas>
        <IdeaChips t={t} pool={CHARACTER_IDEAS} count={4} onPick={setWho} />
      </div>

      <Step n="02">{t('future.char.look', 'The look')}</Step>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" data-charlooks>
        {CHARACTER_LOOKS.map((one) => (
          <FutureTile
            key={one.id}
            kind="character"
            id={one.id}
            label={t(one.label[0], one.label[1])}
            on={look === one.id}
            onPick={() => setLook(one.id)}
            data={{ 'data-charlook': one.id }}
          />
        ))}
      </div>

      <Step n="03">{t('future.char.you', 'You as a 3D character')}</Step>
      <div className="flex items-center gap-2.5">
        {self ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- a data URL fitted on this device a moment ago; there is nothing for the image component to fetch or optimise. */}
            <img src={self} alt={t('future.char.youPhoto', 'Your photo')} data-charselfpic className="h-14 w-14 shrink-0 rounded-xl border object-cover" style={{ borderColor: 'rgba(52,211,153,0.5)' }} />
            <button
              type="button"
              data-charselfoff
              onClick={() => setSelf(null)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-[12px] font-semibold"
              style={{ color: INK, borderColor: 'rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)' }}
            >
              <X className="h-4 w-4" />
              {t('future.char.youOff', 'Take the photo out')}
            </button>
          </>
        ) : (
          <label
            data-charself
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-[13px] font-semibold"
            style={{ color: INK, borderColor: 'rgba(52,211,153,0.4)', background: 'rgba(52,211,153,0.08)' }}
          >
            {busy === 'photo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" style={{ color: LIT }} />}
            {t('future.char.youAdd', 'Add a photo of yourself')}
            <input
              type="file"
              accept={ACCEPTS}
              className="hidden"
              onChange={(event) => { void takePhoto(event.target.files?.[0]); event.target.value = ''; }}
            />
          </label>
        )}
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: INK_DIM }}>
        {t('future.char.youWhat', 'Optional. Add a photo and the character gets your face. The photo goes to the AI with your words — only use one of yourself, or of somebody who said yes.')}
      </p>

      <button
        type="button"
        data-chardraw
        disabled={Boolean(busy)}
        onClick={() => { void draw(); }}
        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-black disabled:opacity-50"
        style={{
          color: '#04120b',
          background: 'linear-gradient(90deg, #34d399, #22d3ee 60%, #a78bfa)',
          boxShadow: '0 0 24px rgba(34,211,238,0.25)',
        }}
      >
        {busy === 'draw' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy === 'draw'
          ? t('future.char.drawing', 'Drawing…')
          : `${sheet ? t('future.char.drawNew', 'Draw it again') : t('future.char.draw', 'Draw the character')} · ${price}`}
      </button>

      {sheet && (
        <div className="space-y-2.5" data-charresult>
          {/* The sheet in a lit frame on a grid, the way a figure stands in a
              studio viewport — what it is, said by how it is shown. */}
          <div
            className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border p-2"
            style={{
              borderColor: 'rgba(34,211,238,0.45)',
              background: 'linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px) 0 0 / 18px 18px, linear-gradient(90deg, rgba(34,211,238,0.08) 1px, transparent 1px) 0 0 / 18px 18px, #05080d',
              boxShadow: '0 0 30px rgba(34,211,238,0.15) inset',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a data URL drawn seconds ago and held in this component; there is no URL for the image component to optimise. */}
            <img src={sheet} alt={t('future.char.sheet', 'The character sheet that was drawn')} data-charsheet className="mx-auto block max-h-[46dvh] w-full rounded-xl object-contain" />
            <span className="absolute left-3 top-3 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black tracking-[0.18em]" style={{ background: 'rgba(5,8,13,0.75)', color: '#67e8f9' }}>
              {t(characterLook(look).label[0], characterLook(look).label[1])}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
            <input
              data-charname
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 40))}
              maxLength={40}
              aria-label={t('future.char.name', 'Name')}
              placeholder={t('future.char.nameHint', 'Name it — e.g. Nova')}
              disabled={Boolean(kept)}
              className="min-h-[44px] w-full min-w-0 rounded-xl border bg-black/40 px-3 text-[13px] outline-hidden focus:border-emerald-400 disabled:opacity-60"
              style={{ color: INK, borderColor: 'rgba(52,211,153,0.35)' }}
            />
            <button
              type="button"
              data-charkeep
              disabled={Boolean(busy) || Boolean(kept) || castFull}
              onClick={() => { void keep(); }}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3.5 text-[13px] font-bold disabled:opacity-60"
              style={{ color: INK, borderColor: 'rgba(52,211,153,0.5)', background: 'rgba(52,211,153,0.14)' }}
            >
              {busy === 'keep' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundPlus className="h-4 w-4" style={{ color: LIT }} />}
              {kept ? t('future.char.kept', 'In your cast') : t('future.char.keep', 'Keep in my cast')}
            </button>
          </div>

          <Step n="04">{t('future.char.put', 'Put it in a shot')}</Step>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              data-charput="frame"
              disabled={Boolean(busy)}
              onClick={() => onPut({
                as: 'frame',
                picture: sheet,
                words: t('future.char.moveWords', '{name} comes to life: turns to the camera, waves and smiles, while the camera slowly moves closer').replace('{name}', named()),
              })}
              className="flex min-h-[56px] flex-col items-start justify-center gap-0.5 rounded-xl border px-3 py-2 text-left disabled:opacity-60"
              style={{ borderColor: 'rgba(34,211,238,0.45)', background: 'rgba(34,211,238,0.08)' }}
            >
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: INK }}>
                <Clapperboard className="h-4 w-4" style={{ color: '#67e8f9' }} />
                {t('future.char.asFrame', 'As the opening frame')}
              </span>
              <span className="text-[11px] leading-snug" style={{ color: INK_DIM }}>
                {t('future.char.asFrameWhat', 'The shot starts on this picture and the engine makes it move.')}
              </span>
            </button>
            <button
              type="button"
              data-charput="cast"
              disabled={Boolean(busy) || (!kept && castFull)}
              onClick={() => {
                void (async () => {
                  const member = kept ?? await keep();
                  if (!member) return;
                  onPut({
                    as: 'cast',
                    member,
                    words: t('future.char.castWords', '{name} walks towards the camera through a neon-lit street at night').replace('{name}', member.name),
                  });
                })();
              }}
              className="flex min-h-[56px] flex-col items-start justify-center gap-0.5 rounded-xl border px-3 py-2 text-left disabled:opacity-60"
              style={{ borderColor: 'rgba(167,139,250,0.45)', background: 'rgba(167,139,250,0.08)' }}
            >
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: INK }}>
                <Users className="h-4 w-4" style={{ color: '#c4b5fd' }} />
                {t('future.char.asCast', 'As a cast member')}
              </span>
              <span className="text-[11px] leading-snug" style={{ color: INK_DIM }}>
                {kept
                  ? t('future.char.asCastWhat', 'Ticked in the shot, so you can draw a new frame with them in it.')
                  : t('future.char.asCastKeep', 'Keeps it in your cast first, then ticks it in the shot.')}
              </span>
            </button>
          </div>
        </div>
      )}

      {said && (
        <p data-charsaid role="status" className="text-[12px] leading-relaxed" style={{ color: INK }}>
          {said}
        </p>
      )}

      <p className="text-[11px] leading-relaxed" style={{ color: INK_DIM }}>
        {t('future.char.price', 'Each drawing costs {n} credits, and the price is on the button. Making it move is paid once, in the shot, and that price is on its own button.').replace('{n}', String(CREDITS.repaint))}
      </p>
    </div>
  );
}
