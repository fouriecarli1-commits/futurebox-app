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
  "rail.channel": { en: "Channel", af: "Kanaal" },
  "rail.channel.hint": { en: "Your music and playlists", af: "Jou musiek en playlists" },
  "chan.yours": { en: "Your channel", af: "Jou kanaal" },
  "chan.lists": { en: "playlists", af: "playlists" },
  "chan.playlists": { en: "Playlists", af: "Playlists" },
  "chan.new": { en: "New", af: "Nuwe" },
  "chan.newName": { en: "New playlist", af: "Nuwe playlist" },
  "chan.noLists": { en: "None yet. A playlist plays straight through, which is what makes it worth building.", af: "Nog niks nie. \u2019n Playlist speel deur, en dis wat dit die moeite werd maak." },
  "chan.playAll": { en: "Play it through", af: "Speel dit deur" },
  "chan.empty": { en: "Nothing in it yet \u2014 add songs from below.", af: "Nog niks daarin nie \u2014 sit snitte van onder af by." },
  "chan.noSongs": { en: "Nothing here yet. Make a song and it lands in your channel.", af: "Nog niks hier nie. Maak \u2019n snit, dan land dit in jou kanaal." },
  "chan.addTo": { en: "Add to a playlist", af: "Sit by \u2019n playlist" },
  "chan.makeListFirst": { en: "Make a playlist first.", af: "Maak eers \u2019n playlist." },
  "chan.playingNow": { en: "Playing", af: "Speel" },
  "chan.toGo": { en: "to go", af: "oor" },
  "chan.next": { en: "Next", af: "Volgende" },
  "chan.share": { en: "Share", af: "Deel" },
  "rail.podcast": { en: "Podcast", af: "Podcast" },
  "rail.podcast.hint": { en: "A show with its own feed", af: "'n Program met sy eie feed" },
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
  "make.clear": { en: "Clear", af: "Maak skoon" },
  "make.soundPlaceholder": { en: "afro house, log drum bassline, warm pads, 122 bpm \u2014 or paste something the copilot wrote", af: "afro house, log drum bass, warm pads, 122 bpm \u2014 of plak iets wat die copilot geskryf het" },
  "make.soundNote": { en: "Write it however you like. Six or seven directions work better than two \u2014 the more specific, the closer it lands.", af: "Skryf dit soos jy wil. Ses of sewe aanwysings werk beter as twee \u2014 hoe spesifieker, hoe nader kom dit." },
  "make.voice": { en: "The voice", af: "Die stem" },
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
  "make.goingNote": { en: "Making it. A real song takes thirty to sixty seconds \u2014 longer for a long one.", af: "Besig. 'n Regte snit vat dertig tot sestig sekondes \u2014 langer vir 'n lang een." },
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
  "buy.open": { en: "Hear it all", af: "Hoor dit heel" },
  "buy.keep": { en: "Keep it clean", af: "Hou dit skoon" },
  "buy.needsOwning": { en: "Downloading needs the clean version", af: "Om af te laai kort die skoon weergawe" },
  "buy.marked": { en: "Playing with the mark on it until you keep it.", af: "Speel met die merk op tot jy dit hou." },
  "pay.title": { en: "Pay for what you keep", af: "Betaal vir wat jy hou" },
  "pay.sub": { en: "Nothing is charged yet \u2014 no payment provider is connected. This is what the prices will be.", af: "Niks word nog gehef nie \u2014 daar is geen betaalstelsel gekoppel nie. Dit is wat die pryse gaan wees." },
  "pay.oneOff": { en: "One song at a time", af: "Een snit op 'n slag" },
  "pay.open": { en: "Hear the whole thing", af: "Hoor die hele ding" },
  "pay.openNote": { en: "Opens your 15-second preview into the full song. The watermark stays, and this does not count toward keeping it.", af: "Maak jou voorsmakie van 15 sekondes oop na die hele snit. Die watermerk bly, en dit tel nie af van die koop nie." },
  "pay.keep": { en: "Keep it, clean", af: "Hou dit, skoon" },
  "pay.keepNote": { en: "No watermark, downloadable, and the rights are yours. This is the price on its own \u2014 opening it first is a separate R14.", af: "Geen watermerk, aflaaibaar, en die regte is joune. Dis die prys op sy eie \u2014 om dit eers oop te maak is 'n aparte R14." },
  "pay.perMonth": { en: "a month", af: "'n maand" },
  "pay.most": { en: "Most pick this", af: "Meeste kies dit" },
  "pay.choose": { en: "Choose this", af: "Kies dit" },
  "pay.current": { en: "Your plan", af: "Jou plan" },
  "pay.starting": { en: "Opening checkout\u2026", af: "Maak afreken oop\u2026" },
  "pay.afterPaying": { en: "A plan switches on once the payment goes through, not before \u2014 the app reads it from your account, not from this page.", af: "'n Plan skakel aan sodra die betaling deurkom, nie voor nie \u2014 die app lees dit van jou rekening af, nie van hierdie blad nie." },
  "pay.noCharge": { en: "Nothing is charged. Choosing a plan here switches the app so you can see what it unlocks.", af: "Niks word gehef nie. Om 'n plan te kies wys jou net wat dit oopmaak." },
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
  "auth.signOut": { en: "Sign out", af: "Teken uit" },
  "auth.yourChannel": { en: "Your channel", af: "Jou kanaal" },
  "auth.working": { en: "One second\u2026", af: "Een sekonde\u2026" },
  "auth.checkEmail": { en: "Check your email \u2014 we sent a link to finish signing up.", af: "Kyk in jou e-pos \u2014 ons het 'n skakel gestuur om klaar te maak." },
  "auth.syncing": { en: "Fetching your songs\u2026", af: "Haal jou snitte\u2026" },
  "auth.savedToAccount": { en: "Saved to your account", af: "Gestoor op jou rekening" },
  "auth.savedHere": { en: "Saved on this device", af: "Gestoor op hierdie toestel" },
  "common.localOnly": { en: "This is an early preview: your account lives on this device only.", af: "Dis nog vroeg: jou rekening bly net op hierdie toestel." },
  "mc.title": { en: "Masterclasses", af: "Meesterklasse" },
  "mc.howLabel": { en: "How we label these", af: "Hoe ons dit merk" },
  "mc.afterwards": { en: "You will be able to:", af: "Daarna kan jy:" },
  "mc.pickedForYou": { en: "Picked for you", af: "Vir jou gekies" },
  "mc.ours": { en: "Ours", af: "Ons s'n" },
  "mc.aiMade": { en: "AI-made", af: "AI-gemaak" },
  "mc.comingSoon": { en: "coming soon", af: "kom binnekort" },
  "mc.planned": { en: "planned", af: "beplan" },
  "rail.video": { en: "Music video", af: "Musiekvideo" },
  "rail.video.hint": { en: "Turn one of your songs into something to watch", af: "Maak van jou snit iets om na te kyk" },
  "video.sub": { en: "Pick one of your songs. The video is made right here, on this page \u2014 then you decide whether to save it or share it.", af: "Kies een van jou snitte. Die video word hier op die blad gemaak \u2014 dan besluit jy of jy dit hou of stuur." },
  "video.pick": { en: "Which song?", af: "Watter snit?" },
  "video.none": { en: "Make a song first \u2014 then it can become a video.", af: "Maak eers 'n snit \u2014 dan kan dit 'n video word." },
  "copilot.title": { en: "Copilot", af: "Copilot" },
  "copilot.intro": { en: "Tell me what you want to make and I will set it up on the canvas. I can name it, pick the sound, write the words, or just answer a question.", af: "Se my wat jy wil maak, dan sit ek dit op vir jou. Ek kan dit naam gee, die klank kies, die woorde skryf, of net 'n vraag antwoord." },
  "copilot.eg1": { en: "Make me something slow for driving at night", af: "Maak vir my iets stadig vir nagry" },
  "copilot.eg2": { en: "Write a chorus about leaving home", af: "Skryf 'n chorus oor weggaan van die huis" },
  "copilot.eg3": { en: "What sound would suit these words?", af: "Watter klank sal by hierdie woorde pas?" },
  "copilot.placeholder": { en: "Tell me what you want", af: "Se my wat jy wil he" },
  "copilot.offPlaceholder": { en: "The copilot is switched off", af: "Die copilot is af" },
  "copilot.send": { en: "Send", af: "Stuur" },
  "copilot.thinking": { en: "Thinking", af: "Dink" },
  "copilot.slow": { en: "That took too long and was cut off. Try a shorter question.", af: "Dit het te lank gevat en is afgesny. Probeer 'n korter vraag." },
  "copilot.failed": { en: "That did not come through. Try again.", af: "Dit het nie deurgekom nie. Probeer weer." },
  "copilot.off": { en: "The copilot is switched off for this app. Everything else still works.", af: "Die copilot is af vir hierdie app. Al die ander werk nog." },
  "copilot.costs": { en: "This one uses your music credits. Go ahead?", af: "Hierdie een gebruik jou musiek-krediete. Gaan voort?" },
  "copilot.yes": { en: "Yes, make it", af: "Ja, maak dit" },
  "copilot.no": { en: "Not now", af: "Nie nou nie" },
  "copilot.did.title": { en: "Named it.", af: "Naam gegee." },
  "copilot.did.style": { en: "Sound set.", af: "Klank gestel." },
  "copilot.did.lyrics": { en: "Words are on the canvas.", af: "Woorde is op die blad." },
  "make.real": { en: "Made with a real music engine \u2014 sung and produced.", af: "Gemaak met 'n regte musiek-enjin \u2014 gesing en geproduseer." },
  "make.realOn": { en: "Real songs are on", af: "Regte snitte is aan" },
  "make.sketchOn": { en: "Browser sketch", af: "Blaaier-skets" },
  "make.paid": { en: "Uses your music credits", af: "Gebruik jou musiek-krediete" },
  "video.suggest": { en: "Want a video for this one?", af: "Wil jy 'n video vir hierdie een he?" },
  "video.suggestGo": { en: "Make the video", af: "Maak die video" },
  "video.suggestNo": { en: "Later", af: "Later" },
  "make.words": { en: "The words", af: "Die woorde" },
  "make.wordsPlaceholder": { en: "[Verse 1]\nWrite the first line here\n\n[Chorus]\nAnd the part people sing back", af: "[Vers 1]\nSkryf die eerste lyn hier\n\n[Chorus]\nEn die deel wat mense terugsing" },
  "make.wordsReal": { en: "These get sung. Keep the [Section] tags on their own line.", af: "Hierdie word gesing. Hou die [Deel]-name op hul eie lyn." },
  "make.wordsSketch": { en: "The sketch does not sing yet, but your words stay with the track.", af: "Die skets sing nog nie, maar jou woorde bly by die snit." },
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
  "hooks.title": { en: "Hooks", af: "Hooks" },
  "hooks.sub": { en: "The bit of your song worth posting. We look for where something arrives \u2014 the beat dropping in, the chorus landing \u2014 because the first fifteen seconds are usually the part people skip.", af: "Die stukkie van jou snit wat werd is om te post. Ons soek waar iets aankom \u2014 waar die beat inval, waar die chorus land \u2014 want die eerste vyftien sekondes is gewoonlik net die deel wat mense oorslaan." },
  "hooks.pick": { en: "Pick a song", af: "Kies 'n snit" },
  "hooks.none": { en: "Make a song first and its hooks show up here.", af: "Maak eers 'n snit, dan wys sy hooks hier." },
  "hooks.looking": { en: "Listening to it\u2026", af: "Luister daarna\u2026" },
  "hooks.found": { en: "Three moments worth cutting", af: "Drie oomblikke werd om te sny" },
  "hooks.at": { en: "At", af: "By" },
  "hooks.strongest": { en: "Strongest", af: "Sterkste" },
  "hooks.cut": { en: "Cut this one", af: "Sny hierdie een" },
  "hooks.cutting": { en: "Cutting \u2014 it plays through in real time", af: "Besig \u2014 dit speel in regte tyd deur" },
  "hooks.ready": { en: "Ready. Save it or post it.", af: "Gereed. Hou dit of post dit." },
  "hooks.clipLength": { en: "Clip length", af: "Clip-lengte" },
  "hooks.fromPlan": { en: "from the plan this song was built on", af: "uit die plan waarmee die snit gebou is" },
  "hooks.arrives": { en: "Something arrives here", af: "Hier kom iets aan" },
  "hooks.fullest": { en: "The fullest part of the track", af: "Die volste deel van die snit" },
  "hooks.safe": { en: "Steady and clear \u2014 safe pick", af: "Bestendig en helder \u2014 veilige keuse" },
  "make.credit": { en: "Which AI made it \u2014 shown with the song", af: "Watter AI dit gemaak het \u2014 wys saam met die snit" },

  "counters.title": { en: "What has actually happened here", af: "Wat hier regtig gebeur het" },
  "counters.live": { en: "On FutureBox so far", af: "Op FutureBox tot dusver" },
  "counters.since": { en: "Since", af: "Sedert" },
  "counters.breakdown": { en: "By category", af: "Per kategorie" },
  "counters.visitors": { en: "People here", af: "Mense hier" },
  "counters.visitors.note": { en: "Counted once a day each", af: "Elkeen een keer per dag getel" },
  "counters.payers": { en: "Paying", af: "Betalers" },
  "counters.payers.note": { en: "A song bought, or on a plan", af: "'n Snit gekoop, of op 'n plan" },
  "counters.songs": { en: "Songs made", af: "Snitte gemaak" },
  "counters.songs.note": { en: "Finished, not attempted", af: "Klaar, nie probeer nie" },
  "counters.videos": { en: "Videos made", af: "Video's gemaak" },
  "counters.videos.note": { en: "Rendered and saved", af: "Klaar gemaak en gestoor" },
  "counters.classes": { en: "Masterclasses opened", af: "Masterclasses oopgemaak" },
  "counters.classes.note": { en: "Once per person per class, per day", af: "Een keer per mens per klas, per dag" },
  "counters.articles": { en: "Articles read", af: "Artikels gelees" },
  "counters.articles.note": { en: "Opened from the feed", af: "Uit die stroom oopgemaak" },
  "counters.podcasts": { en: "Episodes opened", af: "Episodes oopgemaak" },
  "counters.podcasts.note": { en: "Played or opened elsewhere", af: "Gespeel of elders oopgemaak" },

  "make.stage.plan": { en: "Working out the plan", af: "Werk die plan uit" },
  "make.stage.sent": { en: "Sent to the music service", af: "Na die musiekdiens gestuur" },
  "make.stage.waiting": { en: "It is writing the song", af: "Hy skryf die snit" },
  "make.stage.receiving": { en: "The song is coming back", af: "Die snit kom terug" },
  "make.stage.saving": { en: "Saving it to your library", af: "Stoor dit in jou biblioteek" },
  "make.stage.done": { en: "Done", af: "Klaar" },
  "make.wait.usually": { en: "Usually about", af: "Gewoonlik omtrent" },
  "make.wait.run": { en: "song so far", af: "snit tot dusver" },
  "make.wait.runs": { en: "songs so far", af: "snitte tot dusver" },
  "make.wait.late": { en: "Longer than usual. It gives up at five minutes.", af: "Langer as gewoonlik. Hy gee op na vyf minute." },
  "make.wait.first": { en: "Nothing to compare this to yet. Thirty seconds to two minutes is normal; it gives up at five.", af: "Nog niks om mee te vergelyk nie. Dertig sekondes tot twee minute is normaal; hy gee op na vyf." },

  "radar.you": { en: "How people find you", af: "Hoe mense jou kry" },
  "radar.youNote": { en: "A name and somewhere to be reached. Without these a match has nobody to write to.", af: "'n Naam en \u2019n plek waar jy bereik kan word. Daarsonder het \u2019n passing niemand om aan te skryf nie." },
  "radar.name": { en: "Your name", af: "Jou naam" },
  "radar.handle": { en: "handle", af: "handle" },
  "radar.save": { en: "Save", af: "Stoor" },
  "radar.saved": { en: "Saved", af: "Gestoor" },
  "radar.showing": { en: "Songs on the radar", af: "Snitte op die radar" },
  "radar.showingNote": { en: "Off by default, one at a time, and you can turn it back off. Only the tempo, key and style words are shared \u2014 never the audio.", af: "Standaard af, een op \u2019n slag, en jy kan dit weer afskakel. Net die tempo, toonaard en stylwoorde word gedeel \u2014 nooit die klank nie." },
  "radar.noSongs": { en: "Make a song first.", af: "Maak eers \u2019n snit." },
  "radar.matches": { en: "Near your sound", af: "Naby jou klank" },
  "radar.empty": { en: "Nobody has put a song on the radar yet. Yours can be the first \u2014 turn one on above.", af: "Niemand het nog \u2019n snit op die radar gesit nie. Joune kan die eerste wees \u2014 skakel een hierbo aan." },
  "radar.noneYet": { en: "Nothing close enough yet. More songs, on either side, will change that.", af: "Nog niks naby genoeg nie. Meer snitte, aan enige kant, verander dit." },
  "radar.against": { en: "against your", af: "teen jou" },
  "radar.copyNote": { en: "Copy the message", af: "Kopieer die boodskap" },
  "radar.noLinks": { en: "No links yet \u2014 nowhere to send this", af: "Nog geen skakels nie \u2014 nêrens om dit heen te stuur nie" },
  "sec.none": { en: "No song to lay out yet", af: "Nog geen snit om uit te l\u00ea nie" },
  "sec.noneNote": { en: "Make a song with words in it and it appears here, in its own sections.", af: "Maak 'n snit met woorde daarin, dan verskyn dit hier, in sy eie afdelings." },
  "sec.remake": { en: "Make a new take with these changes", af: "Maak 'n nuwe opname met hierdie veranderinge" },
  "sec.remakeNote": { en: "The music service builds a whole song from a whole plan \u2014 there is no way to replace one section inside a finished file. So this makes a new take from the edited sections, and keeps the one you have.", af: "Die musiekdiens bou 'n hele snit uit 'n hele plan \u2014 daar is geen manier om een afdeling binne 'n klaar l\u00eaer te vervang nie. Dit maak dus 'n nuwe opname uit die veranderde afdelings, en hou die een wat jy het." },
  "write.next": { en: "Write the next bit", af: "Skryf die volgende stuk" },
  "write.fix": { en: "What is not working", af: "Wat werk nie" },
  "style.ask": { en: "Say what you want it to sound like", af: "S\u00ea hoe jy wil h\u00ea dit moet klink" },
  "style.askHint": { en: "Plain words. \u201cSad piano song for a funeral\u201d is enough.", af: "Gewone woorde. \u201cHartseer klavierliedjie vir \u2019n begrafnis\u201d is genoeg." },
  "style.write": { en: "Write me a style", af: "Skryf vir my \u2019n styl" },
  "style.writing": { en: "Writing\u2026", af: "Skryf\u2026" },
  "style.listen": { en: "Hear what a style sounds like", af: "Hoor hoe \u2019n styl klink" },
  "style.examples": { en: "Real examples of each genre, and the words that produce it. Press play, then Use this style.", af: "Regte voorbeelde van elke genre, en die woorde wat dit maak. Druk speel, dan Gebruik hierdie styl." },
  "style.sketch": { en: "A sketch of the groove, made here in your browser \u2014 not a generated song.", af: "\u2019n Skets van die groove, hier in jou blaaier gemaak \u2014 nie \u2019n gegenereerde snit nie." },
  "style.use": { en: "Use this style", af: "Gebruik hierdie styl" },

  "make.singSelf": { en: "I will sing it myself", af: "Ek sing dit self" },
  "make.singSelfNote": { en: "Makes the backing only — same sections, same lengths, no voice. Record yours over it afterwards.", af: "Maak net die begeleiding \u2014 dieselfde afdelings, dieselfde lengtes, geen stem nie. Neem joune daarna daaroor op." },
  "make.singOver": { en: "Sing over it", af: "Sing daaroor" },

  "make.withYourVoice": { en: "with your voice", af: "met jou stem" },
  "take.kept": { en: "Your take is in your channel.", af: "Jou opname is in jou kanaal." },
  "take.title": { en: "Sing it yourself", af: "Sing dit self" },
  "take.note": { en: "The backing plays, you sing over it, and the two are mixed. Headphones, or the microphone will pick the music up as well.", af: "Die begeleiding speel, jy sing daaroor, en die twee word gemeng. Gebruik oorfone, anders vang die mikrofoon die musiek ook op." },
  "take.start": { en: "Record a take", af: "Neem \u2019n opname" },
  "take.loading": { en: "Reading the backing\u2026", af: "Lees die begeleiding\u2026" },
  "take.stop": { en: "Stop", af: "Stop" },
  "take.again": { en: "Again", af: "Weer" },
  "take.listen": { en: "Listen to both", af: "Luister na albei" },
  "take.stopPreview": { en: "Stop", af: "Stop" },
  "take.keep": { en: "Keep this take", af: "Hou hierdie opname" },
  "take.nudge": { en: "Nudge the voice", af: "Skuif die stem" },
  "take.nudgeNote": { en: "Left pulls the voice earlier. Measured from the recording, then set by ear.", af: "Links trek die stem vroe\u00ebr. Uit die opname gemeet, dan met die oor reggestel." },
  "take.musicLevel": { en: "Backing", af: "Begeleiding" },
  "take.voiceLevel": { en: "Your voice", af: "Jou stem" },
  "take.denied": { en: "The microphone was not allowed. Turn it on for this site and try again.", af: "Die mikrofoon is nie toegelaat nie. Skakel dit vir hierdie werf aan en probeer weer." },
  "take.noMic": { en: "No microphone could be opened.", af: "Geen mikrofoon kon oopgemaak word nie." },
  "take.unreadable": { en: "That recording could not be read back.", af: "Daardie opname kon nie teruggelees word nie." },
  "take.mixFailed": { en: "The mix could not be made.", af: "Die mengsel kon nie gemaak word nie." },
  "take.credit": { en: "The voice on this is yours \u2014 recorded, not generated. It is credited that way.", af: "Die stem hierop is joune \u2014 opgeneem, nie gegenereer nie. Dit staan so op die snit." },

  "play.followNote": { en: "Sections are timed from the plan the song was made with. Inside a section the lines are spread evenly, so one can sit a second or two out. Click a line to jump there.", af: "Afdelings word getel uit die plan waarmee die snit gemaak is. Binne 'n afdeling is die re\u00eels eweredig versprei, so een kan 'n sekonde of twee uit wees. Klik 'n re\u00eel om soontoe te spring." },
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
