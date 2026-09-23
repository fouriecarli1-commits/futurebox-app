'use client';

/**
 * The cast strip: the same face, the same room, the same product, in one press.
 *
 * ── Why it sits above the pictures and not beside them ───────────────────
 *
 * `Pictures` is a scratch pad — twenty recent files, on this device. That is
 * the right thing for "the photo I am about to try". It is the wrong thing for
 * a presenter three adverts have been built around, which is why the cast
 * exists and why it goes first: the named, kept, on-every-device row comes
 * before the pile of recent uploads.
 *
 * Two strips could be confusing, so each says what it is in one line. "On your
 * account" against "on this device" is the whole distinction and it is the one
 * that decides which somebody should use.
 *
 * ── Why anybody would use it ─────────────────────────────────────────────
 *
 * Said on the strip, not left to be discovered. A video model draws a
 * different person every time you describe one — "a woman in her thirties in a
 * bright kitchen" is a description, not a person. Three clips meant to cut
 * together become three strangers. The only fix is to hand the engine the same
 * picture, and this is the shelf that makes that one press instead of a trip
 * to the file manager on whichever device you happen to be holding.
 *
 * ── Rebuilt, 20 September 2026, and what was wrong with it ──────────────
 *
 * Carli, for the third time: *"Die witskerm bly op kom. Dit is weird want
 * die add a photo wat net langs dit is werk, maar daai cast funksie werk
 * nie. Bou dit net heeltemal van vooraf."*
 *
 * The two strips sit six pixels apart and do the same job. That she kept
 * saying so was the diagnosis, and the previous two rounds did not read it:
 * both went looking at the file picker, because that is where the press is.
 * The picker was never the fault. What differed was what each strip PUT ON
 * THE SCREEN.
 *
 * This one fetched every member's whole 1024px reference, turned each into
 * a base64 data URL, held all twelve in React state, and rendered them into
 * 96-pixel tiles. Twelve 1024×1024 bitmaps is 48 MB of image memory on a
 * phone that is already holding the rest of this app, plus base64 strings a
 * third larger than the bytes, built by twelve concurrent downloads and
 * twelve concurrent FileReaders. A tab killed for memory does not throw and
 * leaves nothing in a console: it goes white, and a reload cures it.
 *
 * So it is rebuilt around the thing `Pictures` does and this never did:
 *
 *   the strip shows a 192px thumbnail, 1.7 MB for all twelve instead of 48
 *   the thumbnails are object URLs, revoked when the strip goes away
 *   they load two at a time rather than twelve at once
 *   the FULL picture is downloaded at the moment a member is chosen, once
 *
 * `check:castmemory` holds each of those, because every one of them is the
 * kind of thing a later edit undoes without anything going red.
 *
 * ── The note, and why it is not applied ──────────────────────────────────
 *
 * A member can carry a line the picture cannot say — "always shot from his
 * left", "the label must face camera". It is shown when they are chosen and it
 * is never appended to the prompt automatically. A note that silently edits
 * what gets sent is a note nobody can debug when the clip comes back wrong; a
 * note in front of the person writing the shot is one they can use or ignore.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Image as ImageIcon, Loader2, Trash2, UserPlus, Users } from 'lucide-react';
import {
  ACCEPTS, CAST_LIMIT, addToCast, addToCastFromKept, editCast, loadCast, pictureOf,
  releaseCast, removeFromCast, thumbOf, type Added, type Member,
} from '../lib/cast';
import { assetDataUrl, loadAssets, type Asset } from '../lib/assets';
import { useLang } from '../lib/i18n';
import Note from './Note';

/**
 * Why a picture did not become a cast member, in one place.
 *
 * ── Why this is a function ───────────────────────────────────────────────
 *
 * There were two of these ladders — one for the file picker, one for the
 * device shelf — and they had already drifted: the second knew about three
 * of the seven reasons and said "that did not save" to the other four.
 * Carli has reported this component as broken twice and asked for it to be
 * rebuilt from scratch, and the two most useful sentences it could have
 * said were in neither ladder.
 *
 * Same lesson as the sheet handles and the artist inbox, in the same week:
 * two copies of one answer is how half of an answer ships.
 */
function whySaid(
  why: Exclude<Added, { ok: true }>['why'],
  missing: readonly string[] | undefined,
  t: (key: string, fallback: string) => string,
): string {
  if (why === 'full') {
    return `${t('cast.full', 'A cast holds')} ${CAST_LIMIT}. ${t('cast.fullTake', 'Take somebody out first.')}`;
  }
  if (why === 'signed_out') {
    return t('cast.signedOut', 'Sign in first, so the cast is on your account rather than this device.');
  }
  if (why === 'too_big') return t('cast.tooBig', 'That picture is very large. Try one under 12MB.');
  /* Named separately from `too_big`, because the two have different
     answers. A file that is too many bytes wants a smaller file; a file
     that is too many pixels is usually a phone set to its biggest camera
     mode, and the answer is the mode, not the file. */
  if (why === 'too_many_pixels') {
    return t('cast.tooManyPixels', 'That photo is too big for a phone browser to open \u2014 it is one of the very high-megapixel camera modes. Take one on the normal setting, or use a screenshot of it.');
  }
  if (why === 'not_an_image') return t('cast.notImage', 'That is not a picture.');
  /* ── The two that used to be one word ──────────────────────────────

     Carli: *"Die button net onder hom wat sê dat mens 'n foto kan oplaai
     werk, maar die cast member oplaai werk nie."* The button under this
     one is the device shelf, which touches no server. This one keeps the
     picture on the ACCOUNT, so it needs a bucket AND a table — and both
     refusals read as "that did not save", which is why this component has
     been rebuilt twice for a fault that was probably never in it. */
  if (why === 'no_bucket') {
    return t('cast.noBucket', 'The picture could not be stored on your account. The cast\u2019s storage is not set up in this project yet \u2014 supabase/cast.sql.');
  }
  if (why === 'no_row') {
    const named = missing?.length
      ? ` ${t('cast.missing', 'The database is missing:')} ${missing.join(', ')}`
      : '';
    return `${t('cast.noRow', 'The picture went up but the cast could not be written to. Run supabase/cast.sql.')}${named}`;
  }
  return t('cast.failed', 'That did not save. Try again in a moment.');
}


export default function Cast({
  /** The data URL in use right now, so the strip can show which member it is. */
  value,
  onChange,
  disabled = false,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}): React.ReactElement | null {
  const { t } = useLang();
  const picker = useRef<HTMLInputElement | null>(null);
  const [cast, setCast] = useState<Member[] | null>(null);
  const [faces, setFaces] = useState<Record<string, string>>({});
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [naming, setNaming] = useState<string | null>(null);
  /**
   * The device's own picture shelf, when somebody asks for it.
   *
   * Loaded on the press rather than on mount: most people will use the other
   * door, and reading a shelf nobody opened is work for nothing.
   */
  const [kept, setKept] = useState<Asset[] | null>(null);

  useEffect(() => {
    void loadCast().then(setCast);
  }, []);

  /* ── The thumbnails ─────────────────────────────────────────────────
     Two at a time, not twelve. `Promise.all` over the whole cast started
     twelve downloads and twelve decodes in the same tick, which is the
     spike that killed the tab — and it is a spike whether or not the
     pictures themselves are small, because a phone has one decoder.

     Each arrives on its own, so the strip fills in rather than appearing
     all at once, which is also the better thing to look at. */
  useEffect(() => {
    if (!cast?.length) return;
    let alive = true;
    const paths = cast.map((one) => one.path);
    void (async () => {
      for (let at = 0; at < paths.length && alive; at += 2) {
        const pair = paths.slice(at, at + 2);
        const got = await Promise.all(pair.map(async (path) => [path, await thumbOf(path)] as const));
        if (!alive) return;
        setFaces((was) => {
          const next = { ...was };
          for (const [path, url] of got) if (url) next[path] = url;
          return next;
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [cast]);

  /* And let the blobs go when the strip does.

     The old cache was a module-level map of data URLs that nothing ever
     emptied, so every face anybody had ever looked at stayed in memory for
     the life of the tab, across every screen. That is the quiet half of
     the same fault. */
  useEffect(() => releaseCast, []);

  // A picture taken off the desk elsewhere leaves nobody selected here.
  useEffect(() => {
    if (!value) setChosen(null);
  }, [value]);

  const add = useCallback(
    async (file: File | undefined) => {
      if (!file || busy) return;
      setBusy(true);
      setProblem(null);
      try {
        /* The filename, unless the filename is not a name.
 
           Carli, 23 September 2026, with a photograph of her own screen: the
           member she had just added was called `1000402633`. That is what a
           phone calls a picture out of its camera roll, and it was being
           used verbatim as somebody's name.
 
           The original note said a filename beats "Untitled" and can be
           changed on the spot — true for `sarel-by-the-window.jpg` and
           exactly wrong for a camera's counter, which is worse than empty:
           an empty box shows its label and invites a name, while a ten-digit
           number looks like something the app decided and means nothing a
           week later in a strip of twelve faces.
 
           So the camera's own patterns are treated as no name at all. Every
           one of these is a real prefix off a real device — Android's bare
           counter, Pixel, iPhone, WhatsApp, Samsung, and the DSC/DCIM family
           every camera has used since film ended. */
        const CAMERA = /^(?:\d+|(?:IMG|PXL|DSC|DCIM|PHOTO|SCREENSHOT|VID|MVIMG|IMG_E)[-_ ]?[\d-_ ]+|(?:WhatsApp|Signal|Telegram)[\w .-]*\d)$/i;
        const named = file.name.replace(/\.[^.]+$/, '').trim().slice(0, 60);
        const from = CAMERA.test(named) ? '' : named;
        const made = await addToCast(file, from);
        if (!made.ok) {
          setProblem(whySaid(made.why, made.missing, t));
          return;
        }
        setCast((was) => [made.member, ...(was ?? [])]);
        // Straight into renaming: a member called "IMG_4821" is one nobody
        // recognises in a strip a week later, and now is the moment they know
        // who it is.
        setNaming(made.member.id);
      } finally {
        setBusy(false);
        if (picker.current) picker.current.value = '';
      }
    },
    [busy, t],
  );

  /**
   * Take one off the device's shelf instead of opening the file picker.
   *
   * The same `add` in every respect once it has bytes — the naming, the
   * limit, the message on a refusal — so the two doors cannot drift into
   * behaving differently.
   */
  const addKept = useCallback(
    async (asset: Asset) => {
      if (busy) return;
      setBusy(true);
      setProblem(null);
      try {
        const dataUrl = await assetDataUrl(asset.id);
        if (!dataUrl) {
          setProblem(t('cast.keptGone', 'That picture is no longer on this device.'));
          return;
        }
        const made = await addToCastFromKept(dataUrl, asset.name || 'Cast');
        if (!made.ok) {
          setProblem(whySaid(made.why, made.missing, t));
          return;
        }
        setCast((was) => [made.member, ...(was ?? [])]);
        setKept(null);
        setNaming(made.member.id);
      } finally {
        setBusy(false);
      }
    },
    [busy, t],
  );

  /**
   * Choose a member, and only now fetch the picture at full size.
   *
   * This is the other half of the rebuild. The strip holds thumbnails; the
   * engine needs the real reference, and it needs exactly one of them. So
   * the full download happens on the press — once, for the one member —
   * instead of twelve times on mount for pictures nobody asked for.
   *
   * A thumbnail is never handed on as the start frame. It would work, and
   * the clip would come back built from a 192-pixel reference, which is
   * the failure that looks like the feature working.
   */
  const use = useCallback(
    async (member: Member) => {
      if (busy) return;
      const same = chosen === member.id;
      if (same) {
        setChosen(null);
        onChange(null);
        return;
      }
      setBusy(true);
      setProblem(null);
      try {
        const full = await pictureOf(member.path);
        if (!full) {
          setProblem(t('cast.noPicture', 'That picture could not be fetched. Try again in a moment.'));
          return;
        }
        setChosen(member.id);
        onChange(full);
      } finally {
        setBusy(false);
      }
    },
    [busy, chosen, onChange, t],
  );

  const take = useCallback(
    async (member: Member) => {
      if (busy) return;
      setBusy(true);
      try {
        if (!(await removeFromCast(member))) return;
        setCast((was) => (was ?? []).filter((one) => one.id !== member.id));
        if (chosen === member.id) {
          setChosen(null);
          onChange(null);
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, chosen, onChange],
  );

  const rename = useCallback(async (member: Member, name: string) => {
    setCast((was) => (was ?? []).map((one) => (one.id === member.id ? { ...one, name } : one)));
    setNaming(null);
    await editCast(member.id, { name });
  }, []);

  // Nothing to show before the answer arrives, and nothing to show to somebody
  // with no account — the whole point of a cast is that it is not on a device.
  if (cast === null) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <Users className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-300">{t('cast.title', 'Your cast')}</p>
          <Note className="text-xs text-zinc-500 leading-relaxed">{t(
              'cast.why',
              'Describe a person and the engine draws a different one every time — three clips meant to cut together become three strangers. Hand it the same picture instead. Kept on your account, so the same presenter is here on your phone too.',
            )}</Note>
        </div>
      </div>

      {cast.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {cast.map((one) => {
            const face = faces[one.path];
            const active = chosen === one.id;
            return (
              <div key={one.id} className="flex-shrink-0 w-24 space-y-1">
                <button
                  type="button"
                  onClick={() => void use(one)}
                  disabled={disabled || !face || busy}
                  aria-pressed={active}
                  className={`relative block w-24 h-24 rounded-xl overflow-hidden border-2 transition-all disabled:opacity-50 ${
                    active ? 'border-emerald-500' : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {face ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={face} alt={one.name || t('cast.unnamed', 'Unnamed')} className="w-full h-full object-cover" />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full bg-zinc-900">
                      <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
                    </span>
                  )}
                  {active && (
                    <span className="absolute top-1 right-1 rounded-full bg-emerald-500 p-0.5">
                      <Check className="w-3 h-3 text-black" />
                    </span>
                  )}
                </button>

                {naming === one.id ? (
                  <input
                    autoFocus
                    defaultValue={one.name}
                    aria-label={t('cast.name', 'Their name')}
                    onBlur={(event) => void rename(one, event.target.value.trim())}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
                      if (event.key === 'Escape') setNaming(null);
                    }}
                    className="w-24 rounded-lg border border-emerald-500 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-100 focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setNaming(one.id)}
                    className="min-h-[44px] block w-24 truncate rounded-lg border border-transparent px-1 py-1 text-left text-xs text-zinc-400 hover:text-white hover:border-zinc-700"
                  >
                    {one.name || t('cast.unnamed', 'Unnamed')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void take(one)}
                  disabled={disabled || busy}
                  aria-label={`${t('cast.remove', 'Take out of the cast')}: ${one.name || t('cast.unnamed', 'Unnamed')}`}
                  className="min-h-[44px] flex w-24 items-center justify-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 py-1 text-xs text-zinc-500 hover:text-rose-300 hover:border-rose-500/40 disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  {t('cast.out', 'Out')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {chosen && (() => {
        const member = cast.find((one) => one.id === chosen);
        return member?.note ? (
          <p className="text-xs text-zinc-400 leading-relaxed rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-2">
            {member.note}
          </p>
        ) : null;
      })()}

      <input
        ref={picker}
        type="file"
        accept={ACCEPTS}
        id="cast-file"
        className="sr-only"
        onChange={(event) => void add(event.target.files?.[0])}
      />
      <label
        htmlFor="cast-file"
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-600 ${
          disabled || busy || cast.length >= CAST_LIMIT ? 'pointer-events-none opacity-50' : 'cursor-pointer'
        }`}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        {t('cast.add', 'Add somebody to the cast')}
      </label>

      {/* ── The second door ─────────────────────────────────────────────

          The one above opens the operating system's file picker, and on
          Carli's phone that press leaves a white screen: the page comes
          back empty, nothing is saved, and a reload cures it. Memory, the
          in-app browser and every error the page could throw have all been
          ruled out, and it cannot be reproduced from here — the video
          desk's picture section does not draw without a live key.

          What is certain is that the picker is on the path, and that the
          pictures already on the device got there without it. So this door
          does not go past the thing that breaks.

          It earns its place either way. Two shelves of pictures sat side by
          side with no way to move one to the other: somebody who tried a
          photo on the scratch pad and then wanted that person in three
          clips had to go and find the file again. */}
      {(kept?.length ?? 0) > 0 || kept === null ? (
        <button
          type="button"
          onClick={() => setKept(kept === null ? loadAssets() : null)}
          aria-expanded={kept !== null}
          disabled={disabled || busy || cast.length >= CAST_LIMIT}
          className="ml-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white disabled:opacity-50"
        >
          <ImageIcon className="h-4 w-4" />
          {t('cast.fromKept', 'Use a picture you already have')}
        </button>
      ) : null}

      {kept !== null && (
        kept.length === 0 ? (
          <p className="text-sm text-zinc-500 leading-snug">
            {t('cast.noKept', 'There are no pictures on this device yet. The strip under this one is where they land.')}
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {kept.map((one) => (
              <button
                key={one.id}
                type="button"
                onClick={() => void addKept(one)}
                disabled={busy}
                title={one.name}
                className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 border-zinc-800 hover:border-emerald-500 disabled:opacity-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={one.thumb} alt={one.name} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )
      )}

      <p className="text-xs text-zinc-600">
        {cast.length}/{CAST_LIMIT} · {t('cast.account', 'on your account, on every device')}
      </p>

      {problem && <p className="text-xs text-amber-400 leading-snug">{problem}</p>}
    </div>
  );
}
