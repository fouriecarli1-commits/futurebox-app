'use client';

/**
 * Story mode: a story you wrote, read aloud, with a picture a page.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Ek dink ook 'n story mode om geleesde stories met
 * 'n video sal baie oulik wees."* Then: *"Gaan aan met story mode."*
 *
 * ── The two answers taken ────────────────────────────────────────────────
 *
 * Both were written into `docs/OPEN-QUESTIONS.md` with a recommendation, and
 * "gaan aan" is the instruction to take it. `lib/storypages.ts` carries the
 * reasoning; in short: **her words, not the app's**, and **a still picture a
 * page, not a clip** — about four rand a page against twenty-two for every
 * five seconds of film. Every piece of this is already built and charged
 * elsewhere today, which is what makes it the version worth shipping first.
 *
 * ── Why the bill is drawn before anything is pressed ─────────────────────
 *
 * Because it is the only room in this app where one press buys twelve
 * things. A song is one charge somebody chose; a storybook is a picture and
 * a reading for every page, and the number is only knowable once the story
 * is typed. So the pages and their cost appear as the story is written, from
 * the same table the routes charge from, and the button says the total.
 *
 * ── Why the pictures and the voice are made page by page ─────────────────
 *
 * Not for progress. The reading of each page is what tells the room how long
 * that page is on screen — `timelineOf` is driven by the audio rather than
 * by a guess, because a slideshow on a fixed interval drifts away from the
 * voice within three pages. One long reading would be cheaper by a credit or
 * two and would not say where the pages end.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Download, Film, Loader2, Play, Sparkles } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { accessToken } from '../lib/cloud';
import VoicePicker from './VoicePicker';
import {
  STORY_MAX_PAGES, billFor, pagesFrom, runsFor, timelineOf, type Page,
} from '../lib/storypages';
import { drawPage, readPage } from '../lib/storymake';
import { STORY_FRAME, recordStory, type Spread } from '../lib/storyfilm';
import { MOST_STORIES, keepStory, titleOf } from '../lib/storykeep';

interface Made {
  readonly picture?: string;
  /** The picture itself, for the shelf — an object URL cannot be stored. */
  readonly blob?: Blob;
  readonly image?: HTMLImageElement;
  readonly audio?: Blob;
  readonly buffer?: AudioBuffer;
  readonly seconds?: number;
}

export default function StoryRoom(): React.ReactElement {
  const { t, lang } = useLang();
  const [story, setStory] = useState('');
  const [look, setLook] = useState('');
  const [voices, setVoices] = useState<{ mine: never[]; stock: never[] } | null>(null);
  const [voiceId, setVoiceId] = useState('');
  const [made, setMade] = useState<Record<string, Made>>({});
  const [busy, setBusy] = useState('');
  const [says, setSays] = useState('');
  const [film, setFilm] = useState('');
  const [at, setAt] = useState(0);
  const [onShelf, setOnShelf] = useState(false);

  const pages = pagesFrom(story);
  const bill = billFor(pages);
  const ready = pages.length > 0 && pages.every((one) => made[one.id]?.buffer && made[one.id]?.image);

  /* Everything handed out as an object URL, revoked when the room closes.
     A storybook remade four times is forty-eight pictures and forty-eight
     readings held in memory otherwise. */
  const held = useRef<string[]>([]);
  useEffect(() => () => { held.current.forEach((one) => URL.revokeObjectURL(one)); }, []);

  useEffect(() => {
    void (async () => {
      const token = await accessToken();
      const answer = await fetch('/api/voice', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }).then((r) => r.json()).catch(() => null);
      if (!answer) return;
      setVoices({ mine: answer.mine ?? [], stock: answer.stock ?? [] });
      /* The first stock voice, so the room is usable without a decision.
         Somebody who cares picks one; somebody who does not gets a reader. */
      setVoiceId((was) => was || answer.stock?.[0]?.id || '');
    })();
  }, []);

  const context = useCallback((): AudioContext | null => {
    const Ctx = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Ctx ? new Ctx() : null;
  }, []);

  const makeBook = useCallback(async (): Promise<void> => {
    if (!pages.length || !voiceId || busy) return;
    setSays('');
    setFilm('');
    const ctx = context();
    if (!ctx) { setSays(t('story.noAudio', 'This browser would not start its audio.')); return; }
    /* The pages drawn so far, in order, so each new page can be drawn from
       the ones before it and the child stays the same child. Kept as a local
       rather than read back out of `made`, because `setMade` has not landed
       by the time the next page is asked for — reading state inside the loop
       that writes it is how every page would have been drawn from nothing. */
    const sofar: HTMLImageElement[] = [];
    try {
      for (let i = 0; i < pages.length; i += 1) {
        const page = pages[i];
        setBusy(t('story.making', 'Page {n} of {all}')
          .replace('{n}', String(i + 1)).replace('{all}', String(pages.length)));

        const drawn = await drawPage(page, look, sofar);
        if ('says' in drawn) { setSays(drawn.says); return; }
        held.current.push(drawn.picture);
        sofar.push(drawn.image);

        const read = await readPage(page, voiceId, lang);
        if ('says' in read) { setSays(read.says); return; }
        const buffer = await ctx.decodeAudioData(await read.audio.arrayBuffer());

        setMade((was) => ({
          ...was,
          [page.id]: {
            picture: drawn.picture,
            blob: drawn.blob,
            image: drawn.image,
            audio: read.audio,
            buffer,
            seconds: buffer.duration,
          },
        }));
      }
      setSays(t('story.done', 'The book is made. Play it, or make it a film.'));
    } finally {
      setBusy('');
    }
  }, [pages, voiceId, busy, look, lang, context, t]);

  const makeFilm = useCallback(async (): Promise<void> => {
    if (!ready || busy) return;
    setBusy(t('story.filming', 'Recording the film…'));
    setSays(t('story.filmWait', 'This runs in real time — the film is as long as the story, and the tab has to stay open.'));
    try {
      const shown = timelineOf(pages, pages.map((one) => made[one.id]?.seconds));
      const spreads: Spread[] = pages.map((one, i) => ({
        picture: made[one.id]!.image!,
        audio: made[one.id]!.buffer!,
        at: shown[i].at,
        seconds: shown[i].seconds,
      }));
      const out = await recordStory(spreads, STORY_FRAME, setAt);
      if ('says' in out) { setSays(out.says); return; }
      const url = URL.createObjectURL(out.film);
      held.current.push(url);
      setFilm(url);
      setSays(t('story.filmDone', 'Your film is ready.'));
    } finally {
      setBusy('');
      setAt(0);
    }
  }, [ready, busy, pages, made, t]);

  /* ── Onto the shelf, so a child can be handed it ───────────────────────
 
     Carli, 9 October 2026: *"Gaan aan met die shelf van stories in die kids
     kamer."* Until this, a book lived in a tab: close it and the pictures
     and the readings — which were paid for — stopped existing, and the kids
     room could not reach one at all.
 
     Kept on the device rather than on a server, because the grown-up writes
     it on the phone they then hand over. `lib/storykeep.ts` carries the rest
     of that reasoning, including why a kept story costs nothing to hear. */
  const shelve = useCallback(async (): Promise<void> => {
    if (!ready || busy) return;
    setBusy(t('story.keeping', 'Putting it on the shelf\u2026'));
    try {
      const put = await keepStory({
        id: `story-${Date.now()}`,
        title: titleOf(pages[0]?.text ?? ''),
        made: Date.now(),
        pages: pages.map((one) => ({
          text: one.text,
          picture: made[one.id]!.blob!,
          audio: made[one.id]!.audio!,
          seconds: made[one.id]!.seconds ?? 0,
        })),
      });
      if (put === 'kept') {
        setOnShelf(true);
        setSays(t(
          'story.kept',
          'It is on the shelf. A child can play it in the kids room, and hearing it costs nothing.',
        ));
      } else if (put === 'shelfFull') {
        setSays(t('story.shelfFull', 'The shelf is full \u2014 it holds {n} stories. Take one off in the kids room first.')
          .replace('{n}', String(MOST_STORIES)));
      } else if (put === 'full') {
        setSays(t(
          'story.deviceFull',
          'There is no room left on this device. Make space and try again \u2014 or make the film now, before this is lost.',
        ));
      } else {
        setSays(t(
          'story.noKeep',
          'This browser will not keep anything. A private window usually cannot.',
        ));
      }
    } finally {
      setBusy('');
    }
  }, [ready, busy, pages, made, t]);

  const shown = timelineOf(pages, pages.map((one) => made[one.id]?.seconds));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-7 p-5" data-storyroom>
      <div className="space-y-2">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-white">
          <BookOpen className="h-6 w-6 text-emerald-400" />
          {t('story.title', 'Story mode')}
        </h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          {t(
            'story.what',
            'Write or paste a story. It becomes pages, each with its own picture, read aloud in the voice you choose — then a film you can keep.',
          )}
        </p>
      </div>

      {/* ── The story ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500" htmlFor="story-text">
          {t('story.yours', 'Your story')}
        </label>
        <textarea
          id="story-text"
          value={story}
          onChange={(event) => setStory(event.target.value)}
          rows={8}
          data-storytext
          placeholder={t(
            'story.hint',
            'A blank line starts a new page. A long paragraph is split at the end of a sentence.',
          )}
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-600"
        />
        <input
          type="text"
          value={look}
          onChange={(event) => setLook(event.target.value)}
          data-storylook
          placeholder={t(
            'story.look',
            'How the pictures should look — soft watercolour, bold cartoon, paper cut-out…',
          )}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600"
        />
      </div>

      {/* ── The pages, and what they cost ──────────────────────────────── */}
      {pages.length > 0 && (
        <div className="space-y-2" data-storypages>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              {pages.length} {pages.length === 1 ? t('story.page', 'page') : t('story.pagesWord', 'pages')}
              {pages.length >= STORY_MAX_PAGES && ` · ${t('story.capped', 'the most one story holds')}`}
            </h3>
            <span className="text-xs text-zinc-400" data-storybill>
              {bill.total} {t('story.credits', 'credits')}
              <span className="text-zinc-600">
                {' '}({bill.read} {t('story.forReading', 'reading')} · {bill.pictures} {t('story.forPictures', 'pictures')})
              </span>
            </span>
          </div>
          <ol className="space-y-1.5">
            {pages.map((page: Page, i) => (
              <li
                key={page.id}
                className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-2.5"
              >
                <span className="w-5 flex-shrink-0 text-right text-xs font-black text-zinc-600">{i + 1}</span>
                {made[page.id]?.picture ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={made[page.id]!.picture}
                    alt=""
                    className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="h-12 w-12 flex-shrink-0 rounded-lg border border-dashed border-zinc-700" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-xs leading-snug text-zinc-300">{page.text}</span>
                  {made[page.id]?.seconds !== undefined && (
                    <span className="mt-1 block text-[11px] text-zinc-600">
                      {shown[i].seconds.toFixed(1)}s
                    </span>
                  )}
                </span>
                {made[page.id]?.audio && (
                  <button
                    type="button"
                    onClick={() => { void new Audio(URL.createObjectURL(made[page.id]!.audio!)).play(); }}
                    aria-label={t('story.hear', 'Hear this page')}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── The voice ──────────────────────────────────────────────────── */}
      {voices && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            {t('story.voice', 'Who reads it')}
          </h3>
          <VoicePicker mine={voices.mine} stock={voices.stock} value={voiceId} onChange={setVoiceId} />
        </div>
      )}

      <button
        type="button"
        onClick={() => void makeBook()}
        disabled={!pages.length || !voiceId || Boolean(busy)}
        data-storymake
        className="flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 text-base font-black text-onAccent disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
        {busy || (pages.length
          ? `${t('story.make', 'Make the book')} · ${bill.total} ${t('story.credits', 'credits')}`
          : t('story.writeFirst', 'Write a story first'))}
      </button>

      {says && (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-200" data-storysays>
          {says}
        </p>
      )}

      {/* ── The film ───────────────────────────────────────────────────── */}
      {ready && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void makeFilm()}
            disabled={Boolean(busy)}
            data-storyfilm
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/50 bg-emerald-500/10 text-sm font-black text-emerald-300 disabled:opacity-40"
          >
            <Film className="h-5 w-5" />
            {t('story.film', 'Make it a film')}
            <span className="text-emerald-500/80">
              · {runsFor(shown).toFixed(0)}s · {t('story.free', 'free')}
            </span>
          </button>
          {busy && at > 0 && (
            <p className="text-center text-xs text-zinc-500">
              {at.toFixed(0)}s / {runsFor(shown).toFixed(0)}s
            </p>
          )}

          {/* ── And onto the shelf ────────────────────────────────────────
              Above the film on the page would be wrong — a film is the thing
              somebody came for. But this is the one that stops the book
              disappearing when the tab closes, so it is not behind anything
              either. */}
          <button
            type="button"
            onClick={() => void shelve()}
            disabled={Boolean(busy) || onShelf}
            data-storyshelve
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/50 bg-amber-500/10 text-sm font-black text-amber-300 disabled:opacity-40"
          >
            <BookOpen className="h-5 w-5" />
            {onShelf
              ? t('story.onShelf', 'On the shelf for the kids room')
              : t('story.shelve', 'Keep it for the kids room')}
            <span className="text-amber-500/80">· {t('story.free', 'free')}</span>
          </button>
        </div>
      )}

      {film && (
        <div className="space-y-2">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={film} controls className="w-full rounded-2xl border border-zinc-800 bg-black" />
          <a
            href={film}
            download="story.webm"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 px-4 text-sm font-bold text-zinc-200"
          >
            <Download className="h-4 w-4" />
            {t('story.keep', 'Keep it')}
          </a>
        </div>
      )}
    </div>
  );
}
