'use client';

/**
 * English and Afrikaans.
 *
 * The Afrikaans here is deliberately not textbook Afrikaans. Nobody says
 * "genereer 'n musiekstuk" to a friend — they say "maak 'n snit". The register
 * to aim for is how someone talks about music in a car, not how a manual is
 * written, because a formal translation of a casual English app reads stiffer
 * than the English did and people switch back.
 *
 * Two rules that keep it honest:
 *
 *   · Content is not translated. A podcast called "The Diary of a CEO" is
 *     called that in both languages; translating a title invents a thing that
 *     does not exist. Only the app's own words change.
 *   · Where a term has no natural Afrikaans word, the English word stays.
 *     "Remix", "podcast" and "AI" are what people actually say. Inventing
 *     "hermengsel" would be worse than borrowing.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Lang = 'en' | 'af';

export const LANGUAGES: ReadonlyArray<{ code: Lang; label: string; native: string }> = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'af', label: 'Afrikaans', native: 'Afrikaans' },
];

type Dict = Record<string, { en: string; af: string }>;

export const STRINGS: Dict = {
  "landing.hero1": { en: "Everything here is made with AI.", af: "Alles hier is met AI gemaak." },
  "landing.hero2": { en: "Everything here says so.", af: "En alles hier s\u00ea so." },
  "landing.sub": { en: "A studio for writing songs and videos with AI, and a feed that scores what it shows you before it shows you. Not another wall of generated content \u2014 the model stack is printed under every release, and the things that did not make the bar are counted where you can see them.", af: "'n Studio om snitte en video's met AI te maak, en 'n stroom wat elke storie eers punte gee voor jy dit sien. Nie nog 'n muur vol AI-gemors nie \u2014 onder elke snit staan watter AI wat gedoen het, en wat nie deurgekom het nie, tel ons oop en bloot." },
  "landing.startFree": { en: "Start free", af: "Begin verniet" },
  "landing.whatPro": { en: "What Pro adds", af: "Wat Pro bysit" },
  "landing.noCard": { en: "No card to start. Competitions are open to free accounts on identical terms.", af: "Geen kaart nodig nie. Kompetisies is oop vir gratis rekeninge, presies dieselfde re\u00ebls." },
  "landing.col1.title": { en: "A feed with a bar", af: "'n Stroom met 'n standaard" },
  "landing.col1.body": { en: "Every item is scored on who published it, whether the title describes or baits, and whether the summary names anything you could check.", af: "Elke storie kry punte vir wie dit geskryf het, of die opskrif beskryf en of dit net lok, en of daar iets in staan wat jy kan nagaan." },
  "landing.col2.title": { en: "The stack, on the release", af: "Die AI staan op die snit" },
  "landing.col2.body": { en: "Which model wrote the music, which made the video, which did the voice \u2014 printed under the track, not buried in a caption.", af: "Watter AI die musiek gemaak het, watter die video, watter die stem \u2014 dit staan onder die snit, nie weggesteek in 'n caption nie." },
  "landing.col3.title": { en: "Point at a bar, say what changes", af: "Wys die maat, s\u00ea wat moet verander" },
  "landing.col3.body": { en: "The studio lays a song out in bars. Click a spot, describe the change, and it becomes an instruction precise enough to be worth a generation.", af: "Die studio l\u00ea jou snit in mate uit. Klik 'n plek, s\u00ea wat anders moet wees, en dit word 'n opdrag wat presies genoeg is om te werk." },
  "landing.today": { en: "Today, scored in front of you", af: "Vandag, voor jou o\u00eb getel" },
  "landing.leftOut": { en: "And what it threw out, with the reason:", af: "En wat uitgegooi is, met die rede:" },
  "landing.classes": { en: "Classes that say who made them", af: "Klasse wat s\u00ea wie hulle gemaak het" },
  "landing.onChannel": { en: "On the channel now", af: "Nou op die kanaal" },
  "landing.freeTitle": { en: "What you get without paying", af: "Wat jy kry sonder om te betaal" },
  "landing.close": { en: "Write something today.", af: "Maak vandag iets." },
  "lang.choose": { en: "Language", af: "Taal" },
  "rail.make": { en: "Make a song", af: "Maak 'n snit" },
  "rail.make.hint": { en: "Press one button", af: "Een knoppie" },
  "rail.write": { en: "Write the words", af: "Skryf die woorde" },
  "rail.write.hint": { en: "Lyrics and style", af: "Woorde en styl" },
  "rail.studio": { en: "Studio", af: "Studio" },
  "rail.studio.hint": { en: "Timeline and edits", af: "Tydlyn en fixes" },
  "rail.sound": { en: "Soundboard", af: "Klankbord" },
  "rail.sound.hint": { en: "Every genre, with audio", af: "Elke genre, met klank" },
  "rail.voice": { en: "Voice", af: "Stem" },
  "rail.voice.hint": { en: "Your voice or ours", af: "Joune of ons s'n" },
  "rail.director": { en: "Director", af: "Regisseur" },
  "rail.director.hint": { en: "Build and publish", af: "Bou en sit uit" },
  "rail.hooks": { en: "Hooks", af: "Hooks" },
  "rail.hooks.hint": { en: "Vertical reels", af: "Kort klerts" },
  "rail.collab": { en: "Collab Radar", af: "Collab Radar" },
  "rail.collab.hint": { en: "Podcasts and creators", af: "Podcasts en makers" },
  "rail.arena": { en: "Arena", af: "Arena" },
  "rail.arena.hint": { en: "Competitions", af: "Kompetisies" },
  "make.title": { en: "Make a song", af: "Maak 'n snit" },
  "make.sub": { en: "Pick a sound, press the button, and listen. It takes a few seconds. Everything you make stays in your channel at the bottom of this page.", af: "Kies 'n klank, druk die knoppie, luister. Dit vat 'n paar sekondes. Alles wat jy maak bly in jou kanaal hier onder." },
  "make.name": { en: "What is it called?", af: "Wat noem jy dit?" },
  "make.namePlaceholder": { en: "Give it a name", af: "Gee dit 'n naam" },
  "make.sound": { en: "What should it sound like?", af: "Hoe moet dit klink?" },
  "make.speed": { en: "Speed", af: "Spoed" },
  "make.bpm": { en: "beats a minute", af: "slae per minuut" },
  "make.slow": { en: "Slow and easy", af: "Stadig en chill" },
  "make.steady": { en: "Steady", af: "Lekker gelyk" },
  "make.fast": { en: "Fast", af: "Vinnig" },
  "make.mood": { en: "Mood", af: "Gevoel" },
  "make.mood.likeStyle": { en: "Like the style", af: "Soos die styl" },
  "make.mood.bright": { en: "Bright", af: "Helder" },
  "make.mood.warm": { en: "Warm", af: "Warm" },
  "make.mood.thoughtful": { en: "Thoughtful", af: "Diep" },
  "make.mood.dark": { en: "Dark", af: "Donker" },
  "make.mood.heavy": { en: "Heavy", af: "Swaar" },
  "make.length": { en: "How long?", af: "Hoe lank?" },
  "make.short": { en: "Short", af: "Kort" },
  "make.normal": { en: "Normal", af: "Normaal" },
  "make.long": { en: "Long", af: "Lank" },
  "make.go": { en: "Make my song", af: "Maak my snit" },
  "make.going": { en: "Making your song\u2026", af: "Besig om te maak\u2026" },
  "make.done": { en: "Done \u2014 it is in your channel below.", af: "Klaar \u2014 dit is in jou kanaal hier onder." },
  "make.doneTake": { en: "Another take is ready.", af: "Nog 'n vat is gereed." },
  "make.failed": { en: "That did not work. Try again.", af: "Dit het nie gewerk nie. Probeer weer." },
  "make.unlimited": { en: "As many as you like on Pro.", af: "So veel as jy wil op Pro." },
  "make.leftToday": { en: "left today.", af: "oor vandag." },
  "make.getMore": { en: "Get more", af: "Kry meer" },
  "make.sketch": { en: "What you get right now is a rough sketch \u2014 real music, made on your device, so you can hear whether the speed and the mood are right before you commit. It is not sung and it is not the finished thing.", af: "Wat jy nou kry is 'n rowwe skets \u2014 regte klank, hier op jou toestel gemaak, sodat jy kan hoor of die spoed en gevoel reg is voor jy tyd mors. Dit sing nie, en dis nie die klaar ding nie." },
  "make.channel": { en: "Your channel", af: "Jou kanaal" },
  "make.song": { en: "song", af: "snit" },
  "make.songs": { en: "songs", af: "snitte" },
  "make.empty": { en: "Nothing here yet. Make your first song above.", af: "Nog niks hier nie. Maak jou eerste snit hier bo." },
  "make.save": { en: "Save it", af: "Hou dit" },
  "make.share": { en: "Share", af: "Stuur dit" },
  "make.copied": { en: "Copied", af: "Gekopieer" },
  "make.again": { en: "Another take", af: "Nog 'n vat" },
  "make.kept": { en: "Your songs are kept on this device. Save the ones you want to keep for good.", af: "Jou snitte bly op hierdie toestel. Hou die wat jy vir altyd wil h\u00ea." },
  "make.takeSuffix": { en: "(another take)", af: "(nog 'n vat)" },
  "make.missing": { en: "That file is missing from this device.", af: "Daai l\u00eaer is nie meer op hierdie toestel nie." },
  "radar.title": { en: "The Radar", af: "Die Radar" },
  "radar.howWeChoose": { en: "How we choose", af: "Hoe ons kies" },
  "radar.findNew": { en: "Find new stories", af: "Wys my nuwes" },
  "radar.looking": { en: "Looking", af: "Soek" },
  "radar.reading": { en: "Reading\u2026", af: "Lees\u2026" },
  "radar.worth": { en: "things worth your time", af: "dinge werd jou tyd" },
  "radar.today": { en: "today.", af: "vandag." },
  "radar.leftOut": { en: "We left", af: "Ons het" },
  "radar.leftOutEnd": { en: "out.", af: "gelos." },
  "radar.why": { en: "Why we picked this", af: "Hoekom ons dit gekies het" },
  "radar.closeWhy": { en: "Close", af: "Maak toe" },
  "radar.nothing": { en: "Nothing in those topics made the cut today. Try another one.", af: "Niks in daai onderwerpe het vandag deurgekom nie. Probeer 'n ander een." },
  "radar.moreGood": { en: "more good ones today", af: "meer goeies vandag" },
  "radar.proShows": { en: "Pro shows you everything we found, in every topic, and why each story earned its mark.", af: "Pro wys jou alles wat ons gekry het, in elke onderwerp, en hoekom elke storie sy punte gekry het." },
  "radar.didntMake": { en: "stories didn't make it today", af: "stories het nie vandag deurgekom nie" },
  "radar.showWhy": { en: "Show me why", af: "Wys my hoekom" },
  "radar.hide": { en: "Hide", af: "Steek weg" },
  "radar.explain": { en: "Every story gets a mark out of 100 before it reaches this page. It loses marks for a headline written to be clicked rather than read, for saying nothing you could check, and for being old news. We show you what we left out and why, so you do not have to take our word for it.", af: "Elke storie kry punte uit 100 voor dit hier kom. Dit verloor punte vir 'n opskrif wat net wil h\u00ea jy moet klik, vir niks wat jy kan nagaan nie, en vir ou nuus. Ons wys jou wat ons gelos het en hoekom, sodat jy nie ons woord hoef te vat nie." },
  "common.upgrade": { en: "Upgrade", af: "Kry Pro" },
  "common.appearance": { en: "Appearance", af: "Voorkoms" },
  "common.studio": { en: "Creator Studio", af: "Maker Studio" },
  "common.proOnly": { en: "Pro only", af: "Net Pro" },
  "common.watch": { en: "Watch it", af: "Kyk dit" },
  "common.notOut": { en: "Not out yet", af: "Nog nie uit nie" },
  "common.everything": { en: "Everything", af: "Alles" },
  "common.free": { en: "Free", af: "Gratis" },
  "common.signIn": { en: "Sign in", af: "Teken in" },
  "common.welcomeBack": { en: "Welcome back", af: "Welkom terug" },
  "common.createAccount": { en: "Create a free account", af: "Maak 'n gratis rekening" },
  "common.noAccount": { en: "No account yet?", af: "Nog nie 'n rekening nie?" },
  "common.haveAccount": { en: "Already have one?", af: "Het jy al een?" },
  "common.localOnly": { en: "This is an early preview: your account lives on this device only.", af: "Dis nog vroeg: jou rekening bly net op hierdie toestel." },
  "mc.title": { en: "Masterclasses", af: "Meesterklasse" },
  "mc.howLabel": { en: "How we label these", af: "Hoe ons dit merk" },
  "mc.afterwards": { en: "You will be able to:", af: "Daarna kan jy:" },
  "mc.pickedForYou": { en: "Picked for you", af: "Vir jou gekies" },
  "mc.ours": { en: "Ours", af: "Ons s'n" },
  "mc.aiMade": { en: "AI-made", af: "AI-gemaak" },
  "mc.comingSoon": { en: "coming soon", af: "kom binnekort" },
  "mc.planned": { en: "planned", af: "beplan" },
  "video.make": { en: "Make a video", af: "Maak 'n video" },
  "video.title": { en: "Music video", af: "Musiekvideo" },
  "video.shape": { en: "Shape", af: "Vorm" },
  "video.tall": { en: "Tall \u2014 for TikTok", af: "Regop \u2014 vir TikTok" },
  "video.wide": { en: "Wide \u2014 for YouTube", af: "Wyd \u2014 vir YouTube" },
  "video.length": { en: "How much of it?", af: "Hoeveel daarvan?" },
  "video.hook15": { en: "15 seconds", af: "15 sekondes" },
  "video.hook30": { en: "30 seconds", af: "30 sekondes" },
  "video.whole": { en: "The whole song", af: "Die hele snit" },
  "video.from": { en: "Start at", af: "Begin by" },
  "video.go": { en: "Make it", af: "Maak dit" },
  "video.making": { en: "Making it \u2014 this plays through in real time", af: "Besig \u2014 dit speel in regte tyd deur" },
  "video.done": { en: "Done. Save it or post it.", af: "Klaar. Hou dit of post dit." },
  "video.save": { en: "Save the video", af: "Hou die video" },
  "video.again": { en: "Make another", af: "Maak nog een" },
  "video.unsupported": { en: "This browser cannot record video. Chrome, Edge or Firefox will.", af: "Hierdie blaaier kan nie video opneem nie. Chrome, Edge of Firefox kan." },
  "video.what": { en: "The picture moves to your song \u2014 every bar you see is that moment of the audio.", af: "Die prent beweeg op jou snit \u2014 elke stafie wat jy sien is daai oomblik van die klank." },
  "video.close": { en: "Close", af: "Maak toe" },
};

const STORAGE_KEY = 'futurebox.lang.v1';

interface LangContext {
  lang: Lang;
  setLang: (next: Lang) => void;
  t: (key: string, fallback?: string) => string;
}

const Context = createContext<LangContext>({
  lang: 'en',
  setLang: () => {},
  t: (key, fallback) => fallback ?? STRINGS[key]?.en ?? key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  // Read after mount: the server has no way to know, and guessing during render
  // would mismatch the HTML it sent.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved === 'en' || saved === 'af') {
        setLangState(saved);
        return;
      }
      // Nobody has chosen yet: follow the browser, since an Afrikaans speaker
      // opening this should not have to find a menu first.
      if ((navigator.language ?? '').toLowerCase().startsWith('af')) setLangState('af');
    } catch {
      // Storage blocked. English it is.
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    } catch {
      // As above.
    }
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => STRINGS[key]?.[lang] ?? fallback ?? STRINGS[key]?.en ?? key,
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLang(): LangContext {
  return useContext(Context);
}
