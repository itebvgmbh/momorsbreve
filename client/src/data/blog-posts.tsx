import React from "react";
import { Link } from "wouter";

const BASE = "https://mormorsbreve.dk";

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  keywords: string[];
}

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: "tyde-gotisk-skrift-guide",
    title: "Tyd gotisk skrift: guide for begyndere",
    description:
      "Lær at tyde gotisk skrift: alfabet, typiske faldgruber og praktiske øvelser. Sådan læser du gamle breve, dagbøger og kirkebøger fra før 1875.",
    datePublished: "2026-02-01",
    keywords: ["tyde gotisk skrift", "læse gotisk håndskrift", "gotisk alfabet"],
  },
  {
    slug: "slaegtsforskning-for-begyndere",
    title: "Slægtsforskning for begyndere: kom godt i gang",
    description:
      "Slægtsforskning for begyndere: find dine aner i kirkebøger og folketællinger på Arkivalieronline – og tyd den gotiske skrift, der spærrer vejen.",
    datePublished: "2026-02-05",
    keywords: ["slægtsforskning for begyndere", "finde mine aner", "kirkebøger folketællinger"],
  },
  {
    slug: "gammel-dansk-retskrivning",
    title: "Gammel dansk retskrivning: Aa, Å og navneord med stort",
    description:
      "Forstå gammel dansk retskrivning: hvorfor der står »Aa« i stedet for »Å«, og hvorfor navneord blev skrevet med stort før reformen i 1948.",
    datePublished: "2026-02-10",
    keywords: ["gammel dansk retskrivning", "retskrivningsreform 1948", "Aa Å"],
  },
  {
    slug: "kirkeboeger-folketaellinger-laese",
    title: "Læs kirkebøger og folketællinger: en praktisk guide",
    description:
      "Sådan finder og læser du kirkebøger og folketællinger på Arkivalieronline – og tyder den gotiske skrift, der holder dine aner skjult.",
    datePublished: "2026-02-15",
    keywords: ["læse kirkebøger", "folketællinger", "Arkivalieronline gotisk skrift"],
  },
  {
    slug: "udvandrerbreve-historie",
    title: "Udvandrerbreve: historien om dem, der rejste til Amerika",
    description:
      "Over 300.000 danskere udvandrede til Amerika. Deres breve hjem er uvurderlige – men skrevet i gotisk skrift. Lær historien og få brevene tydet.",
    datePublished: "2026-02-20",
    keywords: ["udvandrerbreve", "danske udvandrere Amerika", "gamle breve fra Amerika"],
  },
  {
    slug: "oversaet-gamle-breve",
    title: "Oversæt gamle breve: fra gotisk skrift til læsbar tekst",
    description:
      "Sådan får du gamle breve i gotisk skrift gjort læsbare og oversat – til moderne dansk eller til engelsk for familie i udlandet.",
    datePublished: "2026-02-25",
    keywords: ["oversæt gamle breve", "gotisk skrift oversæt", "gamle breve læsbare"],
  },
  {
    slug: "soenderjylland-familiehistorie",
    title: "Sønderjylland: familiehistorie fra 1864 til Genforeningen 1920",
    description:
      "Sønderjyske familiers historie fra nederlaget i 1864 til Genforeningen i 1920 – fortalt i breve og dagbøger med gotisk skrift. Sådan tyder du dem.",
    datePublished: "2026-03-01",
    keywords: ["Sønderjylland familiehistorie", "1864", "Genforeningen 1920"],
  },
  {
    slug: "gamle-maal-og-forkortelser",
    title: "Gamle mål og forkortelser i håndskrevne opskrifter og dokumenter",
    description:
      "Pund, lod, pægl og kvint: forstå de gamle danske mål og forkortelser, du møder i mormors kogebog og i gamle dokumenter.",
    datePublished: "2026-03-05",
    keywords: ["gamle danske mål", "pund lod pægl", "forkortelser gamle opskrifter"],
  },
];

export function getBlogPost(slug: string): BlogPostMeta | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getBlogPostContent(slug: string): React.ReactNode {
  const content = BLOG_CONTENT[slug];
  return content ?? null;
}

const BLOG_CONTENT: Record<string, React.ReactNode> = {
  "tyde-gotisk-skrift-guide": (
    <>
      <p className="leading-relaxed mb-4">
        Mange familier har breve, dagbøger eller kirkebøger skrevet i <strong>gotisk skrift</strong> – nedfældet af bedsteforældre eller oldeforældre før omkring 1875. Skriften virker fremmed og svær ved første øjekast. Men med lidt øvelse og det rette <strong>gotiske alfabet</strong> kan du snart tyde de første ord og sætninger. Denne guide giver en praktisk indføring i at læse gotisk skrift.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Hvad er gotisk skrift?</h2>
      <p className="leading-relaxed mb-4">
        Den gotiske håndskrift (også kaldet gotisk skrift) var i århundreder den almindelige skriveskrift i Danmark. Den var standard i skolerne indtil skolereformen omkring 1875, hvorefter den latinske skrift overtog. Derfor er stort set alle gamle danske dokumenter før 1875 – kirkebøger, folketællinger, skøder og private breve – skrevet med gotiske bogstaver.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Det gotiske alfabet: de vigtigste bogstaver</h2>
      <p className="leading-relaxed mb-4">
        Når du skal tyde gotisk skrift, hjælper det at kende de typiske former. Mange små bogstaver ligner hinanden: et <strong>e</strong> ligner ofte et <strong>n</strong>, og et <strong>u</strong> adskilles kun fra <strong>n</strong> ved en lille bue ovenover. Det lange <strong>ſ</strong> kan forveksles med f og h. De store bogstaver afviger mere fra nutidens latinske skrift. Det bedste råd: print et gotisk alfabet ud og læg det ved siden af dig, mens du læser.
      </p>
      <h3 className="font-serif text-lg font-semibold mt-6 mb-2">Praktiske tips til at øve</h3>
      <p className="leading-relaxed mb-4">
        Begynd med korte, tydelige tekster: et postkort eller et kort brevafsnit. Læs ord for ord, og sammenlign usikre bogstaver med alfabetet. Ved svære steder hjælper det at gætte ordet ud fra sammenhængen: navne, stednavne og gentagne vendinger (»Kære…«, »din hengivne«) går ofte igen og gør tydningen lettere. Vil du springe læringskurven over, kan du få dine dokumenter tydet af en tjeneste som <Link href="/">MormorsBreve</Link> – så får du en læsbar tekst med det samme.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Husk den gamle retskrivning</h2>
      <p className="leading-relaxed mb-4">
        Når du tyder gotisk skrift, støder du på den gamle retskrivning: før reformen i 1948 skrev man »Aa« i stedet for »Å«, og alle navneord begyndte med stort bogstav. Det er ikke fejl, men datidens korrekte stavemåde. Læs mere i vores artikel om <Link href="/blog/gammel-dansk-retskrivning" className="text-primary hover:underline">gammel dansk retskrivning</Link>.
      </p>
      <p className="leading-relaxed mb-4">
        Har du mange sider i gotisk skrift og lidt tid? Med <Link href="/">MormorsBreve</Link> uploader du blot fotos eller scanninger og får en læsbar transskription på få minutter – gratis at prøve for de første sider.
      </p>
    </>
  ),

  "slaegtsforskning-for-begyndere": (
    <>
      <p className="leading-relaxed mb-4">
        At udforske sin slægt er som at rejse tilbage i tiden. Med få klik kan du i dag finde dine <strong>aner</strong> i digitaliserede kilder – men før eller siden rammer de fleste den samme mur: den <strong>gotiske skrift</strong>. Denne guide viser dig, hvordan du kommer godt i gang med slægtsforskning, og hvad du gør, når skriften bliver ulæselig.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Start med det, du ved</h2>
      <p className="leading-relaxed mb-4">
        Begynd med dig selv og arbejd bagud: forældre, bedsteforældre, oldeforældre. Notér navne, fødselsår og steder. Spørg ældre familiemedlemmer og kig efter gamle papirer derhjemme – dåbsattester, breve, dagbøger. Hvert navn og årstal er en tråd, du kan følge længere tilbage.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">De vigtigste kilder: kirkebøger og folketællinger</h2>
      <p className="leading-relaxed mb-4">
        Rygraden i dansk slægtsforskning er <strong>kirkebøgerne</strong> (dåb, vielser, begravelser) og <strong>folketællingerne</strong> fra 1787 og frem. De fleste er digitaliseret og frit tilgængelige på Rigsarkivets Arkivalieronline. Problemet er bare, at kilderne før 1875 er skrevet i gotisk håndskrift. Læs mere om at finde rundt i dem i vores artikel om <Link href="/blog/kirkeboeger-folketaellinger-laese" className="text-primary hover:underline">at læse kirkebøger og folketællinger</Link>.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Når skriften spærrer vejen</h2>
      <p className="leading-relaxed mb-4">
        Det er her, mange går i stå: kilden findes, men den gotiske skrift kan ikke tydes. Du kan enten lære at læse skriften selv – se vores <Link href="/blog/tyde-gotisk-skrift-guide" className="text-primary hover:underline">guide til at tyde gotisk skrift</Link> – eller du kan uploade et foto af siden til <Link href="/">MormorsBreve</Link> og få en læsbar tekst på minutter. Mange slægtsforskere bruger AI til at komme hurtigt videre og gemmer kræfterne til selve detektivarbejdet.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Gem og del dine fund</h2>
      <p className="leading-relaxed mb-4">
        Skriv dine fund ind i et slægtsprogram eller en simpel tavle, og gem altid en henvisning til kilden. Så kan du – og dine efterkommere – altid finde tilbage. Og husk: bag hvert navn gemmer der sig et menneske og en historie. Et tydet brev kan fortælle mere om en ane end ti årstal.
      </p>
    </>
  ),

  "gammel-dansk-retskrivning": (
    <>
      <p className="leading-relaxed mb-4">
        Når du læser gamle danske dokumenter, støder du hurtigt på stavemåder, der ser forkerte ud for nutidens øjne: <strong>»Aar«</strong> i stedet for »år«, og navneord som <strong>»Manden«</strong> og <strong>»Huset«</strong> skrevet med stort. Det er ikke fejl – det er datidens korrekte retskrivning. Denne artikel forklarer de vigtigste forskelle.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">»Aa« i stedet for »Å«</h2>
      <p className="leading-relaxed mb-4">
        Bogstavet <strong>Å</strong> blev først officielt indført i dansk med retskrivningsreformen i 1948. Før da skrev man lyden med dobbelt-a: »Aar« (år), »Maal« (mål), »paa« (på). Når du tyder en tekst fra før 1948, skal du altså forvente »Aa« – og en god transskription bevarer det, så teksten forbliver tro mod originalen.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Navneord med stort begyndelsesbogstav</h2>
      <p className="leading-relaxed mb-4">
        Indtil reformen i 1948 blev <strong>alle navneord</strong> skrevet med stort begyndelsesbogstav – ligesom på tysk i dag. »Manden gik over Marken til Kirken« ville altså stå med tre store bogstaver. Det er en af de tydeligste markører for, at en tekst er gammel, og det er vigtigt at vide, så man ikke fejltolker det som tilfældig stavning.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Reformen i 1948</h2>
      <p className="leading-relaxed mb-4">
        Retskrivningsreformen den 1. oktober 1948 ændrede dansk skriftsprog markant: navneord fik lille begyndelsesbogstav, »Aa« blev til »Å«, og enkelte verbformer blev moderniseret. Tekster fra før og efter ser derfor påfaldende forskellige ud – et nyttigt holdepunkt, når du skal datere et udateret dokument.
      </p>
      <p className="leading-relaxed mb-4">
        Vil du have en gammel tekst gjort læsbar uden selv at skulle holde styr på reglerne? <Link href="/">MormorsBreve</Link> tyder den gotiske skrift og bevarer den historiske retskrivning – upload et foto og se de første sider gratis.
      </p>
    </>
  ),

  "kirkeboeger-folketaellinger-laese": (
    <>
      <p className="leading-relaxed mb-4">
        <strong>Kirkebøger</strong> og <strong>folketællinger</strong> er de to vigtigste kilder i dansk slægtsforskning. De fleste er digitaliseret og gratis tilgængelige – men de er skrevet i gotisk håndskrift, som de færreste kan læse i dag. Her er en praktisk guide til at finde og tyde dem.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Kirkebøger: dåb, vielser og begravelser</h2>
      <p className="leading-relaxed mb-4">
        Præsterne har ført kirkebøger i århundreder. De indeholder dåb (med forældrenes navne og faddere), vielser og begravelser – guld for slægtsforskeren. Bøgerne før 1875 er skrevet i gotisk skrift, ofte med forkortelser og latinske vendinger. En enkelt dåbsindførsel kan føre dig en hel generation længere tilbage.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Folketællinger: et øjebliksbillede af husstanden</h2>
      <p className="leading-relaxed mb-4">
        Folketællingerne, der blev gennemført fra 1787 og frem (1801, 1834, 1840 og fremefter), lister alle personer i en husstand med alder, stilling og forhold til familieoverhovedet. De er fantastiske til at samle en familie på ét sted og tidspunkt – men de ældste er ligeledes i gotisk håndskrift.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Sådan finder du dem på Arkivalieronline</h2>
      <p className="leading-relaxed mb-4">
        Rigsarkivets Arkivalieronline giver fri adgang til de digitaliserede kilder. Du navigerer typisk via sogn og årstal. Når du har fundet den rigtige side, kan du tage et skærmbillede eller hente billedet – og hvis skriften driller, uploade det til <Link href="/">MormorsBreve</Link> for en læsbar tekst.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Når den gotiske skrift driller</h2>
      <p className="leading-relaxed mb-4">
        Selv erfarne slægtsforskere bruger tid på at tyde svære hænder. Lær det selv med vores <Link href="/blog/tyde-gotisk-skrift-guide" className="text-primary hover:underline">guide til gotisk skrift</Link>, eller lad AI klare tydningen, så du kan koncentrere dig om at bygge anetavlen. Er du helt ny, så start med <Link href="/blog/slaegtsforskning-for-begyndere" className="text-primary hover:underline">slægtsforskning for begyndere</Link>.
      </p>
    </>
  ),

  "udvandrerbreve-historie": (
    <>
      <p className="leading-relaxed mb-4">
        Mellem 1860 og 1920 forlod mere end <strong>300.000 danskere</strong> deres hjemland for at søge lykken i USA. Brevene, de skrev hjem, er nogle af de mest gribende vidnesbyrd, en familie kan eje – men de er ofte skrevet i gotisk skrift, som efterkommerne i dag ikke kan læse.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Den store udvandring</h2>
      <p className="leading-relaxed mb-4">
        Især fra Sønderjylland og det vestlige Jylland rejste tusindvis af danskere over Atlanten. For de fleste var det en afsked for altid. Brevet blev livlinen mellem to verdener: familier ventede i uger og måneder på nyt fra Chicago, Iowa eller Nebraska, og brevene blev læst højt og gemt som skatte.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Hvad brevene fortæller</h2>
      <p className="leading-relaxed mb-4">
        Udvandrerbrevene rummer hele liv: drømmen om jord og arbejde, hjemveen, glæden ved et nyfødt barn, sorgen ved et dødsfald langt væk. De blander tit dansk med enkelte engelske ord, som udvandreren havde taget til sig. For nutidens læser er de et direkte vindue ind i en forfaders inderste tanker.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Gør brevene læsbare igen</h2>
      <p className="leading-relaxed mb-4">
        Brevene er skrevet i den gotiske håndskrift, udvandrerne lærte i skolen før 1875. Med <Link href="/">MormorsBreve</Link> kan du uploade et foto og få teksten gjort læsbar på minutter – og oversat til engelsk, så de amerikanske efterkommere også kan læse med. Læs også vores side om <Link href="/udvandrerbreve-fra-amerika" className="text-primary hover:underline">udvandrerbreve fra Amerika</Link>.
      </p>
      <p className="leading-relaxed mb-4">
        Et enkelt tydet brev kan ændre en families selvforståelse. Giv historien videre, før skriften går helt i glemmebogen.
      </p>
    </>
  ),

  "oversaet-gamle-breve": (
    <>
      <p className="leading-relaxed mb-4">
        Et gammelt brev i <strong>gotisk skrift</strong> kan føles som en låst dør. Du kan holde det i hånden, men ikke læse, hvad der står. Denne artikel forklarer, hvordan du får gamle breve tydet – og oversat, hvis familien bor spredt i verden.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Først tyde, så forstå</h2>
      <p className="leading-relaxed mb-4">
        At gøre et gammelt brev læsbart sker i to trin. Først tydes den gotiske skrift til bogstaver, vi kan læse i dag. Dernæst kan teksten oversættes – fx fra gammel dansk til moderne dansk, eller til et helt andet sprog. MormorsBreve gør begge dele i samme arbejdsgang.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Tre versioner til forskellige formål</h2>
      <p className="leading-relaxed mb-4">
        Du får teksten i tre udgaver: tro mod originalen (god til slægtsforskning), AI-suppleret (huller udfyldt fornuftigt) og fri fortolkning (flydende moderne dansk, god til oplæsning). Så vælger du selv, hvor tæt på originalen du vil være.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Oversættelse til familie i udlandet</h2>
      <p className="leading-relaxed mb-4">
        Bor der slægtninge i udlandet – fx efterkommere af <Link href="/blog/udvandrerbreve-historie" className="text-primary hover:underline">danske udvandrere i Amerika</Link> – kan teksten oversættes til engelsk eller over 30 andre sprog, uden ekstra betaling. Så kan hele familien læse med, uanset hvor de bor.
      </p>
      <p className="leading-relaxed mb-4">
        Upload et foto af brevet til <Link href="/">MormorsBreve</Link> og se de første sider gratis. Driller den gotiske skrift, så start med vores <Link href="/blog/tyde-gotisk-skrift-guide" className="text-primary hover:underline">guide til at tyde gotisk skrift</Link>.
      </p>
    </>
  ),

  "soenderjylland-familiehistorie": (
    <>
      <p className="leading-relaxed mb-4">
        Få steder i Danmark har en så dramatisk familiehistorie som <strong>Sønderjylland</strong>. Fra nederlaget i 1864 til Genforeningen i 1920 levede sønderjyske familier mellem to lande – og deres oplevelser findes i breve og dagbøger med gotisk skrift, som mange efterkommere har liggende.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">En landsdel under fremmed styre</h2>
      <p className="leading-relaxed mb-4">
        Nederlaget i 1864 kostede Danmark Sønderjylland, og i over et halvt århundrede levede danske sønderjyder under tysk styre. Sproget i skole og forvaltning blev tysk, mens mange holdt fast i det danske bag hjemmets vægge. Det satte dybe spor i familierne – og i deres breve.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Breve på tværs af en grænse</h2>
      <p className="leading-relaxed mb-4">
        Sønderjyske familiedokumenter fra denne tid er ofte i gotisk håndskrift, der var fælles for dansk og tysk skoletradition. Nogle breve er på dansk, andre på tysk, og mange skifter mellem sprogene. Unge sønderjyder blev indkaldt til den tyske hær og skrev hjem fra fronten under 1. Verdenskrig.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Genforeningen 1920</h2>
      <p className="leading-relaxed mb-4">
        Da Genforeningen kom i 1920, var det kulminationen på generationers håb. Et tydet brev eller en dagbog fra perioden kan vise, hvordan en familie oplevede grænsen, krigen og genforeningen – set indefra, med almindelige menneskers ord.
      </p>
      <p className="leading-relaxed mb-4">
        Med <Link href="/">MormorsBreve</Link> kan du få sønderjyske dokumenter tydet, uanset om de er på dansk eller tysk, og oversat, så hele familien kan læse med. Se også vores side om <Link href="/soenderjylland-1864-genforeningen" className="text-primary hover:underline">Sønderjylland 1864–1920</Link>.
      </p>
    </>
  ),

  "gamle-maal-og-forkortelser": (
    <>
      <p className="leading-relaxed mb-4">
        Når du tyder en gammel <strong>kogebog</strong> eller et gammelt dokument, er den gotiske skrift kun den ene udfordring. Den anden er de <strong>gamle mål og forkortelser</strong>, som ingen bruger længere. Denne artikel hjælper dig med at forstå dem.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Gamle danske mål</h2>
      <p className="leading-relaxed mb-4">
        Før metersystemet brugte man mål som <strong>pund</strong> (ca. 500 g), <strong>lod</strong> (ca. 15 g), <strong>kvint</strong> og <strong>pægl</strong> (et rummål til væsker, ca. 0,24 liter). I opskrifter står der ofte »et halvt Pund Smør« eller »en Pægl Fløde«. At kende omregningen er afgørende, hvis du vil bage mormors kage efter originalen.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Typiske forkortelser</h2>
      <p className="leading-relaxed mb-4">
        Fordi den, der skrev, gjorde det til sig selv, vrimler gamle opskrifter med forkortelser, der aldrig forklares: »Spsk.« for spiseske, »tsk.« for teske, »Pd.« for pund. Mængdeangivelser er ofte løse – »efter behag« eller »som sædvanlig« står, hvor der i dag ville stå en præcis anvisning.
      </p>
      <h2 className="font-serif text-xl font-semibold mt-8 mb-3">Mere end mad</h2>
      <p className="leading-relaxed mb-4">
        En håndskrevet kogebog er tit også en familiekrønike, med noter, datoer og hilsner mellem opskrifterne. Læs mere på vores side om <Link href="/gamle-opskrifter-tyde" className="text-primary hover:underline">at tyde gamle opskrifter</Link>.
      </p>
      <p className="leading-relaxed mb-4">
        Vil du have mormors kogebog gjort læsbar? <Link href="/">MormorsBreve</Link> tyder den gotiske skrift, så opskrifterne kommer tilbage på køkkenbordet – upload et foto og prøv de første sider gratis.
      </p>
    </>
  ),

};

export function getAllSlugs(): string[] {
  return BLOG_POSTS.map((p) => p.slug);
}

export function getCanonicalUrl(slug: string): string {
  return `${BASE}/blog/${slug}`;
}
