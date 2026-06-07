export interface TopicHistorySection {
  heading: string;
  text: string;
}

export interface TopicPageData {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  heroTitle: string;
  heroSubtitle: string;
  heroImage?: string;
  heroImageAlt?: string;
  historySections: TopicHistorySection[];
  scriptTypes: string[];
  ctaText: string;
  relatedBlogSlugs: string[];
}

export const TOPIC_PAGES: TopicPageData[] = [
  {
    slug: "slaegtsforskning-gotisk-skrift",
    title: "Slægtsforskning: tyd gotisk skrift i kirkebøger og folketællinger | MormorsBreve",
    description: "Sidder du fast i kirkebøger og folketællinger, fordi den gotiske håndskrift er umulig at læse? Upload et foto og få en læsbar tekst på minutter. Prøv gratis.",
    keywords: ["slægtsforskning gotisk skrift", "tyde gotisk skrift", "læse kirkebøger", "folketællinger læse", "gotisk håndskrift slægtsforskning", "tyde gammel håndskrift"],
    heroTitle: "Kom videre i din slægtsforskning",
    heroSubtitle: "Kirkebøger, folketællinger og skifter før 1875 er skrevet i gotisk håndskrift, som de færreste kan læse i dag. Upload et foto, og få en læsbar tekst på få minutter – så du kan komme videre med dine aner.",
    heroImage: "/images/family-memories.png",
    heroImageAlt: "Slægtsforsker studerer en gammel kirkebog med gotisk håndskrift",
    historySections: [
      {
        heading: "Den gotiske skrift er den største mur i dansk slægtsforskning",
        text: "Næsten alle vil før eller siden ramme den samme mur, når de forsker i deres slægt: kilderne findes, de er endda digitaliserede på Arkivalieronline – men de er skrevet i gotisk håndskrift, som ikke har været undervist i danske skoler siden skolereformen omkring 1875. Kirkebøger med dåb, vielser og begravelser, folketællinger fra 1787 og frem, skøder, skifter og lægdsruller: rygraden i enhver anetavle ligger i dokumenter, som de fleste danskere i dag simpelthen ikke kan tyde. Det er ikke et spørgsmål om sprog – det er et spørgsmål om en skrift, der er gået i glemmebogen på blot et par generationer.",
      },
      {
        heading: "Hvorfor gotisk håndskrift er så svær at læse",
        text: "Den gotiske håndskrift har bogstavformer, der ligner hinanden til forveksling: et e, der ligner et n, et langt ſ, der kan forveksles med f og h, og et u, der kun adskilles fra n ved en lille bue. Dertil kommer den gamle retskrivning: før reformen i 1948 skrev man »Aa« i stedet for »Å«, og alle navneord begyndte med stort bogstav. Det er ikke fejl – det er datidens korrekte stavemåde, og en god transskription bevarer den. Mange slægtsforskere bruger måneder på selv at lære at tyde skriften. Med AI kan du springe læringskurven over og få den læsbare tekst med det samme.",
      },
      {
        heading: "Fra ulæselig kilde til navne, datoer og steder",
        text: "Når en kirkebogsside eller folketælling først er tydet, åbner den sig: pludselig står der navne på forældre og faddere, et fødested, et erhverv, en alder. Det er de oplysninger, der fører dig en generation længere tilbage. MormorsBreve er bygget til netop dette – upload et foto eller en scanning fra Arkivalieronline, og få teksten i en form, du kan søge i, kopiere og gemme i dit slægtsprogram. De første sider er gratis, så du kan se kvaliteten, før du beslutter dig.",
      },
    ],
    scriptTypes: [
      "Gotisk håndskrift – standard i kirkebøger og folketællinger før 1875",
      "Overgangsskrift – blanding af gotisk og latinsk skrift omkring 1875–1900",
      "Gammel retskrivning – »Aa« for »Å« og navneord med stort før 1948",
    ],
    ctaText: "Tyd din kirkebog gratis nu",
    relatedBlogSlugs: [
      "tyde-gotisk-skrift-guide",
      "slaegtsforskning-for-begyndere",
      "gammel-dansk-retskrivning",
      "kirkeboeger-folketaellinger-laese",
    ],
  },
  {
    slug: "udvandrerbreve-fra-amerika",
    title: "Udvandrerbreve fra Amerika: tyd brevene fra dine aner | MormorsBreve",
    description: "Gamle breve fra slægtninge, der udvandrede til Amerika, skrevet i gotisk håndskrift? Upload et foto og få en læsbar tekst på minutter. Prøv gratis.",
    keywords: ["udvandrerbreve", "breve fra Amerika", "danske udvandrere", "tyde gamle breve", "gotisk håndskrift breve", "slægtsbreve læse"],
    heroTitle: "Læs brevene fra dem, der rejste",
    heroSubtitle: "Mellem 1860 og 1920 udvandrede over 300.000 danskere til Amerika. De skrev hjem – om drømmen, hjemveen og det nye liv. Mange af brevene ligger stadig i familier, men i en gotisk håndskrift, ingen længere kan læse. Upload et foto og få teksten tilbage.",
    heroImage: "/images/documents-flatlay.png",
    heroImageAlt: "Gamle håndskrevne breve og kuverter fra danske udvandrere i Amerika",
    historySections: [
      {
        heading: "Den store danske udvandring",
        text: "Fra midten af 1800-tallet til 1920'erne forlod mere end 300.000 danskere deres hjemland – mange fra Sønderjylland og det vestlige Jylland – for at søge lykken i USA. De fleste tog afsked for altid; en rejse over Atlanten var sjældent en, man gentog. Derfor blev brevet livlinen. Familier ventede i uger og måneder på et brev fra Chicago, Iowa eller Nebraska, og når det endelig kom, blev det læst højt og gemt som en skat. I dag ligger disse breve i skuffer og på lofter rundt om i Danmark – uvurderlige vidnesbyrd om håb, savn og et helt liv på den anden side af havet.",
      },
      {
        heading: "Hvorfor brevene er svære at læse i dag",
        text: "Udvandrerbrevene blev skrevet af mennesker, der havde lært gotisk håndskrift i den danske landsbyskole før 1875. Skriften er ofte hastig, præget af følelser og skrevet på det papir, der nu engang var ved hånden. Stavemåden følger den gamle retskrivning, og sproget blander tit dansk med enkelte engelske ord, som udvandreren havde taget til sig. For nutidens efterkommere er resultatet et brev, man kan holde i hånden, men ikke læse. Spørgsmålet melder sig næsten altid: hvad skrev min oldefar egentlig hjem fra Amerika?",
      },
      {
        heading: "Få svaret – og giv det videre",
        text: "Et enkelt tydet udvandrerbrev kan ændre en families selvforståelse. Pludselig får man ord for, hvorfor en gren af slægten forsvandt til Amerika, hvordan der blev set på dem derhjemme, og hvad de drømte om. MormorsBreve gør brevene læsbare på minutter og kan oversætte teksten til engelsk, så de amerikanske efterkommere også kan læse med – familien er jo spredt over to kontinenter. Upload et foto, se de første sider gratis, og giv historien videre til børn og børnebørn.",
      },
    ],
    scriptTypes: [
      "Gotisk håndskrift – som udvandrerne lærte i skolen før 1875",
      "Hastig, følelsesladet håndskrift – skrevet under vanskelige forhold",
      "Dansk med enkelte engelske låneord fra det nye liv",
    ],
    ctaText: "Tyd dit udvandrerbrev gratis nu",
    relatedBlogSlugs: [
      "tyde-gotisk-skrift-guide",
      "udvandrerbreve-historie",
      "slaegtsforskning-for-begyndere",
      "oversaet-gamle-breve",
    ],
  },
  {
    slug: "soenderjylland-1864-genforeningen",
    title: "Sønderjylland: tyd breve og dagbøger fra 1864 til Genforeningen 1920 | MormorsBreve",
    description: "Breve og dagbøger fra Sønderjylland – fra krigen i 1864 til Genforeningen i 1920 – i gotisk håndskrift? Upload et foto og få en læsbar tekst. Prøv gratis.",
    keywords: ["Sønderjylland 1864", "Genforeningen 1920", "sønderjyske breve", "tyde gotisk skrift", "dagbøger 1864", "familiehistorie Sønderjylland"],
    heroTitle: "Sønderjyllands historie i din familie",
    heroSubtitle: "Fra nederlaget i 1864 til Genforeningen i 1920 levede sønderjyske familier en dramatisk historie – fortalt i breve og dagbøger med gotisk håndskrift. Upload et foto, og lad de personlige vidnesbyrd komme til orde igen.",
    heroImage: "/images/digital-transcription.png",
    heroImageAlt: "Gammel dagbog og breve fra en sønderjysk familie omkring 1900",
    historySections: [
      {
        heading: "En landsdel mellem to lande",
        text: "Nederlaget i 1864 kostede Danmark Sønderjylland, og i mere end et halvt århundrede levede danske sønderjyder under tysk styre. Det satte sig dybe spor i familierne: sproget, skolen og forvaltningen blev tyske, mens mange holdt fast i deres danske identitet bag hjemmets vægge. Da Genforeningen endelig kom i 1920, var det kulminationen på generationers håb. Denne historie – tab, modstand og genforening – findes ikke kun i historiebøgerne. Den findes i de breve og dagbøger, sønderjyske familier skrev gennem hele perioden, og som mange efterkommere i dag har liggende.",
      },
      {
        heading: "Breve på tværs af en grænse",
        text: "Sønderjyske familiedokumenter fra denne tid er ofte skrevet i gotisk håndskrift – den skrift, der var fælles for både dansk og tysk skoletradition. Nogle breve er på dansk, andre på tysk, og mange skifter mellem sprogene afhængigt af modtager og situation. Unge mænd fra Sønderjylland blev indkaldt til den tyske hær og skrev hjem fra fronten under 1. Verdenskrig; familier skrev til slægtninge, der var udvandret; og mange førte dagbog om livet under fremmed styre. For nutidens læser er skriften en barriere, der skiller én fra en helt central del af familiens historie.",
      },
      {
        heading: "Bevar et stykke national historie",
        text: "Sønderjyske familiedokumenter har en særlig vægt, fordi de fortæller en historie, der er både personlig og national. Et tydet brev eller en dagbog kan vise, hvordan en familie oplevede grænsen, krigen og genforeningen – set indefra, med almindelige menneskers ord. MormorsBreve gør disse tekster læsbare på minutter, uanset om de er på dansk eller tysk, og kan oversætte dem, så hele familien kan læse med. Upload et foto og se de første sider gratis.",
      },
    ],
    scriptTypes: [
      "Gotisk håndskrift – fælles for dansk og tysk skoletradition",
      "Breve på både dansk og tysk – ofte med skift mellem sprogene",
      "Dagbøger og feltbreve fra 1. Verdenskrig under tysk indkaldelse",
    ],
    ctaText: "Tyd dit sønderjyske brev gratis nu",
    relatedBlogSlugs: [
      "tyde-gotisk-skrift-guide",
      "soenderjylland-familiehistorie",
      "oversaet-gamle-breve",
      "gammel-dansk-retskrivning",
    ],
  },
  {
    slug: "gamle-opskrifter-tyde",
    title: "Gamle opskrifter: tyd mormors håndskrevne kogebog | MormorsBreve",
    description: "Mormors håndskrevne opskrifter i gotisk skrift, som ingen kan læse? Upload et foto og få opskrifterne tilbage på køkkenbordet. Prøv gratis.",
    keywords: ["gamle opskrifter", "mormors opskrifter", "håndskreven kogebog", "tyde gammel håndskrift", "gotisk skrift opskrifter", "familieopskrifter læse"],
    heroTitle: "Få mormors opskrifter tilbage",
    heroSubtitle: "I mange køkkenskuffer ligger en håndskrevet kogebog – side efter side med opskrifter på kringle, æbleskiver og julegås. Men skriften er gammel og gotisk. Upload et foto, og få opskrifterne tilbage på køkkenbordet.",
    heroImage: "/images/hero-desk.png",
    heroImageAlt: "Gammel håndskrevet kogebog med gotisk skrift på et køkkenbord",
    historySections: [
      {
        heading: "Mere end mad: opskriftbogen som familiekrønike",
        text: "En håndskrevet kogebog er sjældent bare en samling opskrifter. Mellem anvisningerne på brun sovs og julekage gemmer der sig personlige noter, datoer for familiefester, hilsner fra naboer og veninder, indklistrede avisudklip og af og til en lille tegning. Nogle kogebøger følger en familie gennem tre eller fire generationer – oldemor begynder, mormor føjer til, mor klistrer løse sedler ind. Bøgerne er kulinariske selvbiografier: de afslører, hvad familien havde råd til, hvilke råvarer der var, og hvilke fester der blev fejret. En opskriftbog fra omkring år 1900 fortæller en anden historie end en fra efterkrigstiden – men begge er værd at bevare.",
      },
      {
        heading: "Hvorfor gamle opskrifter er svære at læse",
        text: "De fleste håndskrevne kogebøger fra før 1900 er skrevet i gotisk håndskrift. Men udfordringen er ikke kun skriften: opskrifter bruger forkortelser, der aldrig forklares, og gamle mål som pund, lod og pægl, som de færreste kender i dag. Og fordi den, der skrev, gjorde det til sig selv og ikke til fremmede, mangler der ofte afgørende trin – der står »som sædvanlig« eller »efter behag«, hvor der i dag ville stå en halv sides anvisning. En god transskription gør ikke bare skriften læsbar, men hjælper også med at gøre de gamle mål og forkortelser forståelige.",
      },
      {
        heading: "Red familieopskrifterne, før det er for sent",
        text: "Papir er tålmodigt, men ikke evigt. Fedtpletter, damp, melstøv og årtiers brug sætter deres spor. Mange kogebøger har løse sider og blækudtværinger, der gør skriften endnu sværere. Når den sidste, der kunne læse den gamle skrift, ikke længere er her, går et stykke levende familiekultur tabt sammen med opskrifterne. Ved at få bogen tydet sikrer du både teksten og et stykke hverdagshistorie – og den, der vil bage mormors kringle fra 1925, får endelig opskriften i læsbar form.",
      },
    ],
    scriptTypes: [
      "Gotisk håndskrift – den almindelige skrift i kogebøger før 1900",
      "Forkortelser og gamle mål – pund, lod og pægl uden forklaring",
      "Blandet skrift – ofte skift mellem skriftformer på samme side",
    ],
    ctaText: "Tyd mormors kogebog gratis nu",
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
