import type { Localized } from "@/i18n/localized";

export interface TopicHistorySection {
  heading: Localized;
  text: Localized;
}

export interface TopicPageData {
  slug: string;
  title: Localized;
  description: Localized;
  keywords: string[];
  heroTitle: Localized;
  heroSubtitle: Localized;
  heroImage?: string;
  heroImageAlt?: Localized;
  historySections: TopicHistorySection[];
  scriptTypes: Localized[];
  ctaText: Localized;
  relatedBlogSlugs: string[];
}

export const TOPIC_PAGES: TopicPageData[] = [
  {
    slug: "slaegtsforskning-gotisk-skrift",
    title: {
      da: "Slægtsforskning: tyd gotisk skrift i kirkebøger og folketællinger | MormorsBreve",
      de: "Ahnenforschung: gotische Schrift in Kirchenbüchern und Volkszählungen entziffern | MormorsBreve",
      en: "Genealogy: decipher Gothic script in parish registers and censuses | MormorsBreve",
    },
    description: {
      da: "Sidder du fast i kirkebøger og folketællinger, fordi den gotiske håndskrift er umulig at læse? Upload et foto og få en læsbar tekst på minutter. Prøv gratis.",
      de: "Kommen Sie in Kirchenbüchern und Volkszählungen nicht weiter, weil die gotische Handschrift unlesbar ist? Laden Sie ein Foto hoch und erhalten Sie in Minuten einen lesbaren Text. Kostenlos testen.",
      en: "Stuck on parish registers and censuses because the Gothic handwriting is impossible to read? Upload a photo and get readable text in minutes. Try it for free.",
    },
    keywords: ["slægtsforskning gotisk skrift", "tyde gotisk skrift", "læse kirkebøger", "folketællinger læse", "gotisk håndskrift slægtsforskning", "tyde gammel håndskrift"],
    heroTitle: {
      da: "Kom videre i din slægtsforskning",
      de: "Kommen Sie in Ihrer Ahnenforschung weiter",
      en: "Move forward in your genealogy research",
    },
    heroSubtitle: {
      da: "Kirkebøger, folketællinger og skifter før 1875 er skrevet i gotisk håndskrift, som de færreste kan læse i dag. Upload et foto, og få en læsbar tekst på få minutter – så du kan komme videre med dine aner.",
      de: "Kirchenbücher, Volkszählungen und Nachlassakten vor 1875 sind in gotischer Handschrift verfasst, die heute kaum noch jemand lesen kann. Laden Sie ein Foto hoch und erhalten Sie in wenigen Minuten einen lesbaren Text – damit Sie bei Ihren Vorfahren weiterkommen.",
      en: "Parish registers, censuses and probate records before 1875 are written in Gothic handwriting that few can read today. Upload a photo and get readable text in just minutes – so you can trace your ancestors further.",
    },
    heroImage: "/images/family-memories.png",
    heroImageAlt: {
      da: "Slægtsforsker studerer en gammel kirkebog med gotisk håndskrift",
      de: "Ahnenforscher studiert ein altes Kirchenbuch mit gotischer Handschrift",
      en: "Genealogist studying an old parish register in Gothic handwriting",
    },
    historySections: [
      {
        heading: {
          da: "Den gotiske skrift er den største mur i dansk slægtsforskning",
          de: "Die gotische Schrift ist die größte Hürde der dänischen Ahnenforschung",
          en: "Gothic script is the biggest wall in Danish genealogy",
        },
        text: {
          da: "Næsten alle vil før eller siden ramme den samme mur, når de forsker i deres slægt: kilderne findes, de er endda digitaliserede på Arkivalieronline – men de er skrevet i gotisk håndskrift, som ikke har været undervist i danske skoler siden skolereformen omkring 1875. Kirkebøger med dåb, vielser og begravelser, folketællinger fra 1787 og frem, skøder, skifter og lægdsruller: rygraden i enhver anetavle ligger i dokumenter, som de fleste danskere i dag simpelthen ikke kan tyde. Det er ikke et spørgsmål om sprog – det er et spørgsmål om en skrift, der er gået i glemmebogen på blot et par generationer.",
          de: "Fast jeder stößt früher oder später auf dieselbe Hürde bei der Ahnenforschung: Die Quellen sind vorhanden, sogar digitalisiert auf Arkivalieronline – doch sie sind in gotischer Handschrift verfasst, die seit der Schulreform um 1875 an dänischen Schulen nicht mehr unterrichtet wird. Kirchenbücher mit Taufen, Trauungen und Begräbnissen, Volkszählungen ab 1787, Grundbücher, Nachlassakten und Aushebungslisten: Das Rückgrat jeder Ahnentafel liegt in Dokumenten, die die meisten Dänen heute schlicht nicht entziffern können. Es ist keine Frage der Sprache – es ist eine Frage einer Schrift, die in nur wenigen Generationen in Vergessenheit geraten ist.",
          en: "Almost everyone hits the same wall sooner or later when researching their family: the sources exist, even digitised on Arkivalieronline – but they are written in Gothic handwriting that has not been taught in Danish schools since the school reform around 1875. Parish registers of baptisms, marriages and burials, censuses from 1787 onwards, deeds, probate records and conscription rolls: the backbone of every family tree lies in documents that most Danes today simply cannot read. It is not a question of language – it is a question of a script that fell into oblivion in just a couple of generations.",
        },
      },
      {
        heading: {
          da: "Hvorfor gotisk håndskrift er så svær at læse",
          de: "Warum die gotische Handschrift so schwer zu lesen ist",
          en: "Why Gothic handwriting is so hard to read",
        },
        text: {
          da: "Den gotiske håndskrift har bogstavformer, der ligner hinanden til forveksling: et e, der ligner et n, et langt ſ, der kan forveksles med f og h, og et u, der kun adskilles fra n ved en lille bue. Dertil kommer den gamle retskrivning: før reformen i 1948 skrev man »Aa« i stedet for »Å«, og alle navneord begyndte med stort bogstav. Det er ikke fejl – det er datidens korrekte stavemåde, og en god transskription bevarer den. Mange slægtsforskere bruger måneder på selv at lære at tyde skriften. Med AI kan du springe læringskurven over og få den læsbare tekst med det samme.",
          de: "Die gotische Handschrift hat Buchstabenformen, die einander zum Verwechseln ähnlich sind: ein e, das wie ein n aussieht, ein langes ſ, das mit f und h verwechselt werden kann, und ein u, das sich von n nur durch einen kleinen Bogen unterscheidet. Hinzu kommt die alte Rechtschreibung: Vor der Reform von 1948 schrieb man »Aa« statt »Å«, und alle Substantive begannen mit Großbuchstaben. Das sind keine Fehler – es ist die korrekte Schreibweise der damaligen Zeit, und eine gute Transkription bewahrt sie. Viele Ahnenforscher brauchen Monate, um die Schrift selbst lesen zu lernen. Mit KI können Sie diese Lernkurve überspringen und den lesbaren Text sofort erhalten.",
          en: "Gothic handwriting has letterforms that are deceptively similar: an e that looks like an n, a long ſ that can be confused with f and h, and a u distinguished from n only by a small curve. Add to that the old orthography: before the 1948 reform people wrote »Aa« instead of »Å«, and all nouns began with a capital letter. These are not errors – they are the correct spelling of the time, and a good transcription preserves it. Many genealogists spend months learning to read the script themselves. With AI you can skip the learning curve and get the readable text right away.",
        },
      },
      {
        heading: {
          da: "Fra ulæselig kilde til navne, datoer og steder",
          de: "Von der unlesbaren Quelle zu Namen, Daten und Orten",
          en: "From an unreadable source to names, dates and places",
        },
        text: {
          da: "Når en kirkebogsside eller folketælling først er tydet, åbner den sig: pludselig står der navne på forældre og faddere, et fødested, et erhverv, en alder. Det er de oplysninger, der fører dig en generation længere tilbage. MormorsBreve er bygget til netop dette – upload et foto eller en scanning fra Arkivalieronline, og få teksten i en form, du kan søge i, kopiere og gemme i dit slægtsprogram. De første sider er gratis, så du kan se kvaliteten, før du beslutter dig.",
          de: "Sobald eine Kirchenbuchseite oder Volkszählung erst einmal entziffert ist, öffnet sie sich: Plötzlich stehen dort Namen von Eltern und Paten, ein Geburtsort, ein Beruf, ein Alter. Genau diese Angaben führen Sie eine Generation weiter zurück. MormorsBreve ist genau dafür gemacht – laden Sie ein Foto oder einen Scan von Arkivalieronline hoch und erhalten Sie den Text in einer Form, die Sie durchsuchen, kopieren und in Ihrem Genealogieprogramm speichern können. Die ersten Seiten sind kostenlos, damit Sie die Qualität sehen, bevor Sie sich entscheiden.",
          en: "Once a parish register page or census has been deciphered, it opens up: suddenly there are names of parents and godparents, a birthplace, an occupation, an age. These are the details that take you a generation further back. MormorsBreve is built for exactly this – upload a photo or a scan from Arkivalieronline and get the text in a form you can search, copy and save in your genealogy software. The first pages are free, so you can see the quality before you decide.",
        },
      },
    ],
    scriptTypes: [
      {
        da: "Gotisk håndskrift – standard i kirkebøger og folketællinger før 1875",
        de: "Gotische Handschrift – Standard in Kirchenbüchern und Volkszählungen vor 1875",
        en: "Gothic handwriting – standard in parish registers and censuses before 1875",
      },
      {
        da: "Overgangsskrift – blanding af gotisk og latinsk skrift omkring 1875–1900",
        de: "Übergangsschrift – Mischung aus gotischer und lateinischer Schrift um 1875–1900",
        en: "Transitional script – a mix of Gothic and Latin script around 1875–1900",
      },
      {
        da: "Gammel retskrivning – »Aa« for »Å« og navneord med stort før 1948",
        de: "Alte Rechtschreibung – »Aa« für »Å« und großgeschriebene Substantive vor 1948",
        en: "Old orthography – »Aa« for »Å« and capitalised nouns before 1948",
      },
    ],
    ctaText: {
      da: "Tyd din kirkebog gratis nu",
      de: "Entziffern Sie Ihr Kirchenbuch jetzt kostenlos",
      en: "Decipher your parish register for free now",
    },
    relatedBlogSlugs: [
      "tyde-gotisk-skrift-guide",
      "slaegtsforskning-for-begyndere",
      "gammel-dansk-retskrivning",
      "kirkeboeger-folketaellinger-laese",
    ],
  },
  {
    slug: "udvandrerbreve-fra-amerika",
    title: {
      da: "Udvandrerbreve fra Amerika: tyd brevene fra dine aner | MormorsBreve",
      de: "Auswandererbriefe aus Amerika: entziffern Sie die Briefe Ihrer Vorfahren | MormorsBreve",
      en: "Emigrant letters from America: decipher the letters of your ancestors | MormorsBreve",
    },
    description: {
      da: "Gamle breve fra slægtninge, der udvandrede til Amerika, skrevet i gotisk håndskrift? Upload et foto og få en læsbar tekst på minutter. Prøv gratis.",
      de: "Alte Briefe von Verwandten, die nach Amerika auswanderten, in gotischer Handschrift? Laden Sie ein Foto hoch und erhalten Sie in Minuten einen lesbaren Text. Kostenlos testen.",
      en: "Old letters from relatives who emigrated to America, written in Gothic handwriting? Upload a photo and get readable text in minutes. Try it for free.",
    },
    keywords: ["udvandrerbreve", "breve fra Amerika", "danske udvandrere", "tyde gamle breve", "gotisk håndskrift breve", "slægtsbreve læse"],
    heroTitle: {
      da: "Læs brevene fra dem, der rejste",
      de: "Lesen Sie die Briefe derer, die fortzogen",
      en: "Read the letters of those who left",
    },
    heroSubtitle: {
      da: "Mellem 1860 og 1920 udvandrede over 300.000 danskere til Amerika. De skrev hjem – om drømmen, hjemveen og det nye liv. Mange af brevene ligger stadig i familier, men i en gotisk håndskrift, ingen længere kan læse. Upload et foto og få teksten tilbage.",
      de: "Zwischen 1860 und 1920 wanderten über 300.000 Dänen nach Amerika aus. Sie schrieben nach Hause – vom Traum, vom Heimweh und vom neuen Leben. Viele der Briefe liegen noch in den Familien, aber in einer gotischen Handschrift, die niemand mehr lesen kann. Laden Sie ein Foto hoch und holen Sie sich den Text zurück.",
      en: "Between 1860 and 1920 more than 300,000 Danes emigrated to America. They wrote home – about the dream, the homesickness and the new life. Many of the letters still lie in families, but in a Gothic handwriting that no one can read anymore. Upload a photo and get the text back.",
    },
    heroImage: "/images/documents-flatlay.png",
    heroImageAlt: {
      da: "Gamle håndskrevne breve og kuverter fra danske udvandrere i Amerika",
      de: "Alte handgeschriebene Briefe und Umschläge dänischer Auswanderer in Amerika",
      en: "Old handwritten letters and envelopes from Danish emigrants in America",
    },
    historySections: [
      {
        heading: {
          da: "Den store danske udvandring",
          de: "Die große dänische Auswanderung",
          en: "The great Danish emigration",
        },
        text: {
          da: "Fra midten af 1800-tallet til 1920'erne forlod mere end 300.000 danskere deres hjemland – mange fra Sønderjylland og det vestlige Jylland – for at søge lykken i USA. De fleste tog afsked for altid; en rejse over Atlanten var sjældent en, man gentog. Derfor blev brevet livlinen. Familier ventede i uger og måneder på et brev fra Chicago, Iowa eller Nebraska, og når det endelig kom, blev det læst højt og gemt som en skat. I dag ligger disse breve i skuffer og på lofter rundt om i Danmark – uvurderlige vidnesbyrd om håb, savn og et helt liv på den anden side af havet.",
          de: "Von der Mitte des 19. Jahrhunderts bis in die 1920er Jahre verließen mehr als 300.000 Dänen ihre Heimat – viele aus Sønderjylland und dem westlichen Jütland –, um in den USA ihr Glück zu suchen. Die meisten nahmen für immer Abschied; eine Reise über den Atlantik wiederholte man selten. Deshalb wurde der Brief zur Lebensader. Familien warteten wochen- und monatelang auf einen Brief aus Chicago, Iowa oder Nebraska, und wenn er endlich kam, wurde er laut vorgelesen und wie ein Schatz aufbewahrt. Heute liegen diese Briefe in Schubladen und auf Dachböden überall in Dänemark – unschätzbare Zeugnisse von Hoffnung, Sehnsucht und einem ganzen Leben auf der anderen Seite des Meeres.",
          en: "From the mid-19th century to the 1920s, more than 300,000 Danes left their homeland – many from Sønderjylland and western Jutland – to seek their fortune in the USA. Most said goodbye forever; a journey across the Atlantic was rarely one you repeated. So the letter became the lifeline. Families waited weeks and months for a letter from Chicago, Iowa or Nebraska, and when it finally arrived, it was read aloud and kept like a treasure. Today these letters lie in drawers and attics all over Denmark – priceless testimonies of hope, longing and a whole life on the other side of the ocean.",
        },
      },
      {
        heading: {
          da: "Hvorfor brevene er svære at læse i dag",
          de: "Warum die Briefe heute schwer zu lesen sind",
          en: "Why the letters are hard to read today",
        },
        text: {
          da: "Udvandrerbrevene blev skrevet af mennesker, der havde lært gotisk håndskrift i den danske landsbyskole før 1875. Skriften er ofte hastig, præget af følelser og skrevet på det papir, der nu engang var ved hånden. Stavemåden følger den gamle retskrivning, og sproget blander tit dansk med enkelte engelske ord, som udvandreren havde taget til sig. For nutidens efterkommere er resultatet et brev, man kan holde i hånden, men ikke læse. Spørgsmålet melder sig næsten altid: hvad skrev min oldefar egentlig hjem fra Amerika?",
          de: "Die Auswandererbriefe wurden von Menschen geschrieben, die vor 1875 in der dänischen Dorfschule die gotische Handschrift gelernt hatten. Die Schrift ist oft hastig, von Gefühlen geprägt und auf dem Papier geschrieben, das gerade zur Hand war. Die Schreibweise folgt der alten Rechtschreibung, und die Sprache mischt oft Dänisch mit einzelnen englischen Wörtern, die der Auswanderer übernommen hatte. Für die heutigen Nachkommen ist das Ergebnis ein Brief, den man in der Hand halten, aber nicht lesen kann. Fast immer stellt sich die Frage: Was hat mein Urgroßvater eigentlich aus Amerika nach Hause geschrieben?",
          en: "The emigrant letters were written by people who had learned Gothic handwriting in the Danish village school before 1875. The writing is often hurried, charged with emotion and written on whatever paper happened to be at hand. The spelling follows the old orthography, and the language often mixes Danish with the odd English word the emigrant had picked up. For today's descendants the result is a letter you can hold in your hand but cannot read. The question almost always arises: what did my great-grandfather actually write home from America?",
        },
      },
      {
        heading: {
          da: "Få svaret – og giv det videre",
          de: "Finden Sie die Antwort – und geben Sie sie weiter",
          en: "Get the answer – and pass it on",
        },
        text: {
          da: "Et enkelt tydet udvandrerbrev kan ændre en families selvforståelse. Pludselig får man ord for, hvorfor en gren af slægten forsvandt til Amerika, hvordan der blev set på dem derhjemme, og hvad de drømte om. MormorsBreve gør brevene læsbare på minutter og kan oversætte teksten til engelsk, så de amerikanske efterkommere også kan læse med – familien er jo spredt over to kontinenter. Upload et foto, se de første sider gratis, og giv historien videre til børn og børnebørn.",
          de: "Ein einziger entzifferter Auswandererbrief kann das Selbstverständnis einer Familie verändern. Plötzlich findet man Worte dafür, warum ein Zweig der Familie nach Amerika verschwand, wie man zu Hause auf sie blickte und wovon sie träumten. MormorsBreve macht die Briefe in Minuten lesbar und kann den Text ins Englische übersetzen, damit auch die amerikanischen Nachkommen mitlesen können – die Familie ist ja über zwei Kontinente verstreut. Laden Sie ein Foto hoch, sehen Sie die ersten Seiten kostenlos und geben Sie die Geschichte an Kinder und Enkel weiter.",
          en: "A single deciphered emigrant letter can change a family's sense of itself. Suddenly you have words for why one branch of the family vanished to America, how they were seen back home, and what they dreamed of. MormorsBreve makes the letters readable in minutes and can translate the text into English, so the American descendants can read along too – after all, the family is spread across two continents. Upload a photo, see the first pages for free, and pass the story on to children and grandchildren.",
        },
      },
    ],
    scriptTypes: [
      {
        da: "Gotisk håndskrift – som udvandrerne lærte i skolen før 1875",
        de: "Gotische Handschrift – wie die Auswanderer sie vor 1875 in der Schule lernten",
        en: "Gothic handwriting – as the emigrants learned it in school before 1875",
      },
      {
        da: "Hastig, følelsesladet håndskrift – skrevet under vanskelige forhold",
        de: "Hastige, gefühlsbetonte Handschrift – unter schwierigen Bedingungen geschrieben",
        en: "Hurried, emotional handwriting – written under difficult conditions",
      },
      {
        da: "Dansk med enkelte engelske låneord fra det nye liv",
        de: "Dänisch mit einzelnen englischen Lehnwörtern aus dem neuen Leben",
        en: "Danish with the occasional English loanword from the new life",
      },
    ],
    ctaText: {
      da: "Tyd dit udvandrerbrev gratis nu",
      de: "Entziffern Sie Ihren Auswandererbrief jetzt kostenlos",
      en: "Decipher your emigrant letter for free now",
    },
    relatedBlogSlugs: [
      "tyde-gotisk-skrift-guide",
      "udvandrerbreve-historie",
      "slaegtsforskning-for-begyndere",
      "oversaet-gamle-breve",
    ],
  },
  {
    slug: "soenderjylland-1864-genforeningen",
    title: {
      da: "Sønderjylland: tyd breve og dagbøger fra 1864 til Genforeningen 1920 | MormorsBreve",
      de: "Sønderjylland: Briefe und Tagebücher von 1864 bis zur Wiedervereinigung 1920 entziffern | MormorsBreve",
      en: "Sønderjylland: decipher letters and diaries from 1864 to the Reunification of 1920 | MormorsBreve",
    },
    description: {
      da: "Breve og dagbøger fra Sønderjylland – fra krigen i 1864 til Genforeningen i 1920 – i gotisk håndskrift? Upload et foto og få en læsbar tekst. Prøv gratis.",
      de: "Briefe und Tagebücher aus Sønderjylland – vom Krieg 1864 bis zur Wiedervereinigung 1920 – in gotischer Handschrift? Laden Sie ein Foto hoch und erhalten Sie einen lesbaren Text. Kostenlos testen.",
      en: "Letters and diaries from Sønderjylland – from the war of 1864 to the Reunification of 1920 – in Gothic handwriting? Upload a photo and get readable text. Try it for free.",
    },
    keywords: ["Sønderjylland 1864", "Genforeningen 1920", "sønderjyske breve", "tyde gotisk skrift", "dagbøger 1864", "familiehistorie Sønderjylland"],
    heroTitle: {
      da: "Sønderjyllands historie i din familie",
      de: "Sønderjyllands Geschichte in Ihrer Familie",
      en: "Sønderjylland's history in your family",
    },
    heroSubtitle: {
      da: "Fra nederlaget i 1864 til Genforeningen i 1920 levede sønderjyske familier en dramatisk historie – fortalt i breve og dagbøger med gotisk håndskrift. Upload et foto, og lad de personlige vidnesbyrd komme til orde igen.",
      de: "Von der Niederlage 1864 bis zur Wiedervereinigung 1920 erlebten südjütländische Familien eine dramatische Geschichte – erzählt in Briefen und Tagebüchern in gotischer Handschrift. Laden Sie ein Foto hoch und lassen Sie die persönlichen Zeugnisse wieder zu Wort kommen.",
      en: "From the defeat of 1864 to the Reunification of 1920, families in Sønderjylland lived through a dramatic history – told in letters and diaries in Gothic handwriting. Upload a photo and let these personal testimonies speak again.",
    },
    heroImage: "/images/digital-transcription.png",
    heroImageAlt: {
      da: "Gammel dagbog og breve fra en sønderjysk familie omkring 1900",
      de: "Altes Tagebuch und Briefe einer südjütländischen Familie um 1900",
      en: "Old diary and letters from a Sønderjylland family around 1900",
    },
    historySections: [
      {
        heading: {
          da: "En landsdel mellem to lande",
          de: "Eine Landschaft zwischen zwei Ländern",
          en: "A region between two countries",
        },
        text: {
          da: "Nederlaget i 1864 kostede Danmark Sønderjylland, og i mere end et halvt århundrede levede danske sønderjyder under tysk styre. Det satte sig dybe spor i familierne: sproget, skolen og forvaltningen blev tyske, mens mange holdt fast i deres danske identitet bag hjemmets vægge. Da Genforeningen endelig kom i 1920, var det kulminationen på generationers håb. Denne historie – tab, modstand og genforening – findes ikke kun i historiebøgerne. Den findes i de breve og dagbøger, sønderjyske familier skrev gennem hele perioden, og som mange efterkommere i dag har liggende.",
          de: "Die Niederlage von 1864 kostete Dänemark Sønderjylland, und mehr als ein halbes Jahrhundert lang lebten die dänischen Südjüten unter deutscher Herrschaft. Das hinterließ tiefe Spuren in den Familien: Sprache, Schule und Verwaltung wurden deutsch, während viele hinter den Wänden ihres Zuhauses an ihrer dänischen Identität festhielten. Als die Wiedervereinigung schließlich 1920 kam, war sie der Höhepunkt der Hoffnung mehrerer Generationen. Diese Geschichte – Verlust, Widerstand und Wiedervereinigung – steht nicht nur in den Geschichtsbüchern. Sie steht in den Briefen und Tagebüchern, die südjütländische Familien während der gesamten Zeit schrieben und die viele Nachkommen heute besitzen.",
          en: "The defeat of 1864 cost Denmark Sønderjylland, and for more than half a century Danish South Jutlanders lived under German rule. It left deep marks on families: language, schools and administration became German, while many held on to their Danish identity behind the walls of their homes. When the Reunification finally came in 1920, it was the culmination of generations of hope. This history – loss, resistance and reunification – is not found only in the history books. It is found in the letters and diaries that Sønderjylland families wrote throughout the whole period, and that many descendants still keep today.",
        },
      },
      {
        heading: {
          da: "Breve på tværs af en grænse",
          de: "Briefe über eine Grenze hinweg",
          en: "Letters across a border",
        },
        text: {
          da: "Sønderjyske familiedokumenter fra denne tid er ofte skrevet i gotisk håndskrift – den skrift, der var fælles for både dansk og tysk skoletradition. Nogle breve er på dansk, andre på tysk, og mange skifter mellem sprogene afhængigt af modtager og situation. Unge mænd fra Sønderjylland blev indkaldt til den tyske hær og skrev hjem fra fronten under 1. Verdenskrig; familier skrev til slægtninge, der var udvandret; og mange førte dagbog om livet under fremmed styre. For nutidens læser er skriften en barriere, der skiller én fra en helt central del af familiens historie.",
          de: "Südjütländische Familiendokumente aus dieser Zeit sind oft in gotischer Handschrift verfasst – jener Schrift, die der dänischen wie der deutschen Schultradition gemeinsam war. Manche Briefe sind auf Dänisch, andere auf Deutsch, und viele wechseln je nach Empfänger und Situation zwischen den Sprachen. Junge Männer aus Sønderjylland wurden zur deutschen Armee eingezogen und schrieben im Ersten Weltkrieg von der Front nach Hause; Familien schrieben an Verwandte, die ausgewandert waren; und viele führten Tagebuch über das Leben unter fremder Herrschaft. Für die heutigen Leser ist die Schrift eine Barriere, die einen von einem ganz zentralen Teil der Familiengeschichte trennt.",
          en: "Sønderjylland family documents from this time are often written in Gothic handwriting – the script common to both Danish and German school traditions. Some letters are in Danish, others in German, and many switch between the languages depending on recipient and situation. Young men from Sønderjylland were conscripted into the German army and wrote home from the front during the First World War; families wrote to relatives who had emigrated; and many kept diaries about life under foreign rule. For today's reader, the script is a barrier that separates you from a central part of your family's history.",
        },
      },
      {
        heading: {
          da: "Bevar et stykke national historie",
          de: "Bewahren Sie ein Stück nationaler Geschichte",
          en: "Preserve a piece of national history",
        },
        text: {
          da: "Sønderjyske familiedokumenter har en særlig vægt, fordi de fortæller en historie, der er både personlig og national. Et tydet brev eller en dagbog kan vise, hvordan en familie oplevede grænsen, krigen og genforeningen – set indefra, med almindelige menneskers ord. MormorsBreve gør disse tekster læsbare på minutter, uanset om de er på dansk eller tysk, og kan oversætte dem, så hele familien kan læse med. Upload et foto og se de første sider gratis.",
          de: "Südjütländische Familiendokumente haben ein besonderes Gewicht, weil sie eine Geschichte erzählen, die zugleich persönlich und national ist. Ein entzifferter Brief oder ein Tagebuch kann zeigen, wie eine Familie die Grenze, den Krieg und die Wiedervereinigung erlebte – von innen gesehen, mit den Worten ganz gewöhnlicher Menschen. MormorsBreve macht diese Texte in Minuten lesbar, ob auf Dänisch oder Deutsch, und kann sie übersetzen, damit die ganze Familie mitlesen kann. Laden Sie ein Foto hoch und sehen Sie die ersten Seiten kostenlos.",
          en: "Sønderjylland family documents carry a special weight because they tell a story that is both personal and national. A deciphered letter or diary can show how a family experienced the border, the war and the reunification – seen from the inside, in the words of ordinary people. MormorsBreve makes these texts readable in minutes, whether in Danish or German, and can translate them so the whole family can read along. Upload a photo and see the first pages for free.",
        },
      },
    ],
    scriptTypes: [
      {
        da: "Gotisk håndskrift – fælles for dansk og tysk skoletradition",
        de: "Gotische Handschrift – gemeinsam für dänische und deutsche Schultradition",
        en: "Gothic handwriting – shared by Danish and German school traditions",
      },
      {
        da: "Breve på både dansk og tysk – ofte med skift mellem sprogene",
        de: "Briefe auf Dänisch und Deutsch – oft mit Wechsel zwischen den Sprachen",
        en: "Letters in both Danish and German – often switching between the languages",
      },
      {
        da: "Dagbøger og feltbreve fra 1. Verdenskrig under tysk indkaldelse",
        de: "Tagebücher und Feldpostbriefe aus dem Ersten Weltkrieg unter deutscher Einberufung",
        en: "Diaries and field letters from the First World War under German conscription",
      },
    ],
    ctaText: {
      da: "Tyd dit sønderjyske brev gratis nu",
      de: "Entziffern Sie Ihren südjütländischen Brief jetzt kostenlos",
      en: "Decipher your Sønderjylland letter for free now",
    },
    relatedBlogSlugs: [
      "tyde-gotisk-skrift-guide",
      "soenderjylland-familiehistorie",
      "oversaet-gamle-breve",
      "gammel-dansk-retskrivning",
    ],
  },
  {
    slug: "gamle-opskrifter-tyde",
    title: {
      da: "Gamle opskrifter: tyd mormors håndskrevne kogebog | MormorsBreve",
      de: "Alte Rezepte: entziffern Sie Omas handgeschriebenes Kochbuch | MormorsBreve",
      en: "Old recipes: decipher grandma's handwritten cookbook | MormorsBreve",
    },
    description: {
      da: "Mormors håndskrevne opskrifter i gotisk skrift, som ingen kan læse? Upload et foto og få opskrifterne tilbage på køkkenbordet. Prøv gratis.",
      de: "Omas handgeschriebene Rezepte in gotischer Schrift, die niemand lesen kann? Laden Sie ein Foto hoch und holen Sie die Rezepte zurück auf den Küchentisch. Kostenlos testen.",
      en: "Grandma's handwritten recipes in Gothic script that no one can read? Upload a photo and get the recipes back onto the kitchen table. Try it for free.",
    },
    keywords: ["gamle opskrifter", "mormors opskrifter", "håndskreven kogebog", "tyde gammel håndskrift", "gotisk skrift opskrifter", "familieopskrifter læse"],
    heroTitle: {
      da: "Få mormors opskrifter tilbage",
      de: "Holen Sie sich Omas Rezepte zurück",
      en: "Get grandma's recipes back",
    },
    heroSubtitle: {
      da: "I mange køkkenskuffer ligger en håndskrevet kogebog – side efter side med opskrifter på kringle, æbleskiver og julegås. Men skriften er gammel og gotisk. Upload et foto, og få opskrifterne tilbage på køkkenbordet.",
      de: "In vielen Küchenschubladen liegt ein handgeschriebenes Kochbuch – Seite um Seite mit Rezepten für Kringel, Æbleskiver und Weihnachtsgans. Aber die Schrift ist alt und gotisch. Laden Sie ein Foto hoch und holen Sie die Rezepte zurück auf den Küchentisch.",
      en: "In many a kitchen drawer lies a handwritten cookbook – page after page of recipes for kringle, æbleskiver and Christmas goose. But the script is old and Gothic. Upload a photo and get the recipes back onto the kitchen table.",
    },
    heroImage: "/images/hero-desk.png",
    heroImageAlt: {
      da: "Gammel håndskrevet kogebog med gotisk skrift på et køkkenbord",
      de: "Altes handgeschriebenes Kochbuch mit gotischer Schrift auf einem Küchentisch",
      en: "Old handwritten cookbook in Gothic script on a kitchen table",
    },
    historySections: [
      {
        heading: {
          da: "Mere end mad: opskriftbogen som familiekrønike",
          de: "Mehr als Essen: das Rezeptbuch als Familienchronik",
          en: "More than food: the recipe book as a family chronicle",
        },
        text: {
          da: "En håndskrevet kogebog er sjældent bare en samling opskrifter. Mellem anvisningerne på brun sovs og julekage gemmer der sig personlige noter, datoer for familiefester, hilsner fra naboer og veninder, indklistrede avisudklip og af og til en lille tegning. Nogle kogebøger følger en familie gennem tre eller fire generationer – oldemor begynder, mormor føjer til, mor klistrer løse sedler ind. Bøgerne er kulinariske selvbiografier: de afslører, hvad familien havde råd til, hvilke råvarer der var, og hvilke fester der blev fejret. En opskriftbog fra omkring år 1900 fortæller en anden historie end en fra efterkrigstiden – men begge er værd at bevare.",
          de: "Ein handgeschriebenes Kochbuch ist selten bloß eine Sammlung von Rezepten. Zwischen den Anweisungen für braune Soße und Weihnachtskuchen verbergen sich persönliche Notizen, Daten von Familienfesten, Grüße von Nachbarn und Freundinnen, eingeklebte Zeitungsausschnitte und hin und wieder eine kleine Zeichnung. Manche Kochbücher begleiten eine Familie über drei oder vier Generationen – die Urgroßmutter beginnt, die Großmutter ergänzt, die Mutter klebt lose Zettel ein. Die Bücher sind kulinarische Autobiografien: Sie verraten, was sich die Familie leisten konnte, welche Zutaten es gab und welche Feste gefeiert wurden. Ein Rezeptbuch von etwa 1900 erzählt eine andere Geschichte als eines aus der Nachkriegszeit – doch beide sind es wert, bewahrt zu werden.",
          en: "A handwritten cookbook is rarely just a collection of recipes. Between the instructions for brown gravy and Christmas cake hide personal notes, dates of family celebrations, greetings from neighbours and friends, pasted-in newspaper clippings and the occasional little drawing. Some cookbooks follow a family through three or four generations – great-grandmother begins, grandmother adds to it, mother pastes in loose notes. The books are culinary autobiographies: they reveal what the family could afford, which ingredients were available and which celebrations were held. A recipe book from around 1900 tells a different story than one from the post-war years – but both are worth preserving.",
        },
      },
      {
        heading: {
          da: "Hvorfor gamle opskrifter er svære at læse",
          de: "Warum alte Rezepte schwer zu lesen sind",
          en: "Why old recipes are hard to read",
        },
        text: {
          da: "De fleste håndskrevne kogebøger fra før 1900 er skrevet i gotisk håndskrift. Men udfordringen er ikke kun skriften: opskrifter bruger forkortelser, der aldrig forklares, og gamle mål som pund, lod og pægl, som de færreste kender i dag. Og fordi den, der skrev, gjorde det til sig selv og ikke til fremmede, mangler der ofte afgørende trin – der står »som sædvanlig« eller »efter behag«, hvor der i dag ville stå en halv sides anvisning. En god transskription gør ikke bare skriften læsbar, men hjælper også med at gøre de gamle mål og forkortelser forståelige.",
          de: "Die meisten handgeschriebenen Kochbücher von vor 1900 sind in gotischer Handschrift verfasst. Doch die Herausforderung ist nicht nur die Schrift: Rezepte verwenden Abkürzungen, die nie erklärt werden, und alte Maße wie Pfund, Lot und Pægl, die heute kaum jemand kennt. Und weil derjenige, der schrieb, es für sich selbst und nicht für Fremde tat, fehlen oft entscheidende Schritte – da steht »wie gewohnt« oder »nach Belieben«, wo heute eine halbe Seite Anleitung stünde. Eine gute Transkription macht nicht nur die Schrift lesbar, sondern hilft auch, die alten Maße und Abkürzungen verständlich zu machen.",
          en: "Most handwritten cookbooks from before 1900 are written in Gothic handwriting. But the challenge is not only the script: recipes use abbreviations that are never explained, and old measures like pund, lod and pægl that few know today. And because whoever wrote it did so for themselves and not for strangers, crucial steps are often missing – it says »as usual« or »to taste« where today there would be half a page of instructions. A good transcription not only makes the script readable but also helps make the old measures and abbreviations understandable.",
        },
      },
      {
        heading: {
          da: "Red familieopskrifterne, før det er for sent",
          de: "Retten Sie die Familienrezepte, bevor es zu spät ist",
          en: "Save the family recipes before it's too late",
        },
        text: {
          da: "Papir er tålmodigt, men ikke evigt. Fedtpletter, damp, melstøv og årtiers brug sætter deres spor. Mange kogebøger har løse sider og blækudtværinger, der gør skriften endnu sværere. Når den sidste, der kunne læse den gamle skrift, ikke længere er her, går et stykke levende familiekultur tabt sammen med opskrifterne. Ved at få bogen tydet sikrer du både teksten og et stykke hverdagshistorie – og den, der vil bage mormors kringle fra 1925, får endelig opskriften i læsbar form.",
          de: "Papier ist geduldig, aber nicht ewig. Fettflecken, Dampf, Mehlstaub und jahrzehntelanger Gebrauch hinterlassen ihre Spuren. Viele Kochbücher haben lose Seiten und verwischte Tinte, die die Schrift noch schwerer machen. Wenn der oder die Letzte, der die alte Schrift lesen konnte, nicht mehr da ist, geht ein Stück lebendiger Familienkultur zusammen mit den Rezepten verloren. Indem Sie das Buch entziffern lassen, sichern Sie sowohl den Text als auch ein Stück Alltagsgeschichte – und wer Omas Kringel von 1925 backen möchte, bekommt das Rezept endlich in lesbarer Form.",
          en: "Paper is patient, but not eternal. Grease stains, steam, flour dust and decades of use leave their marks. Many cookbooks have loose pages and smudged ink that make the script even harder. When the last person who could read the old script is no longer here, a piece of living family culture is lost along with the recipes. By having the book deciphered, you secure both the text and a piece of everyday history – and whoever wants to bake grandma's kringle from 1925 finally gets the recipe in readable form.",
        },
      },
    ],
    scriptTypes: [
      {
        da: "Gotisk håndskrift – den almindelige skrift i kogebøger før 1900",
        de: "Gotische Handschrift – die übliche Schrift in Kochbüchern vor 1900",
        en: "Gothic handwriting – the common script in cookbooks before 1900",
      },
      {
        da: "Forkortelser og gamle mål – pund, lod og pægl uden forklaring",
        de: "Abkürzungen und alte Maße – Pfund, Lot und Pægl ohne Erklärung",
        en: "Abbreviations and old measures – pund, lod and pægl without explanation",
      },
      {
        da: "Blandet skrift – ofte skift mellem skriftformer på samme side",
        de: "Gemischte Schrift – oft Wechsel zwischen Schriftformen auf derselben Seite",
        en: "Mixed script – often switching between letterforms on the same page",
      },
    ],
    ctaText: {
      da: "Tyd mormors kogebog gratis nu",
      de: "Entziffern Sie Omas Kochbuch jetzt kostenlos",
      en: "Decipher grandma's cookbook for free now",
    },
    relatedBlogSlugs: [
      "tyde-gotisk-skrift-guide",
      "gamle-maal-og-forkortelser",
      "slaegtsforskning-for-begyndere",
      "gammel-dansk-retskrivning",
    ],
  },
];

export function getTopicPage(slug: string): TopicPageData | undefined {
  return TOPIC_PAGES.find((p) => p.slug === slug);
}

export function getAllTopicSlugs(): string[] {
  return TOPIC_PAGES.map((p) => p.slug);
}
