export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqCategory {
  title: string;
  items: FaqItem[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    title: "Kom godt i gang",
    items: [
      {
        question: "Hvordan virker MormorsBreve? Skal jeg kunne noget særligt med computere?",
        answer:
          "Nej, du behøver ingen særlige forudsætninger. Du skal blot bruge et foto eller en scanning af håndskriften. Du uploader billedet på vores side — det virker på computer, tablet og mobil. AI'en læser skriften og giver dig teksten. Det er lige så nemt som at sende et foto via beskeder.",
      },
      {
        question: "Hvordan tager jeg bedst et foto af håndskriften?",
        answer:
          "Læg dokumentet fladt på et bord, helst i dagslys. Tag billedet ovenfra, så hele teksten er tydelig. Sørg for, at der ikke falder skygge på skriften. Et almindeligt mobilfoto er rigeligt — det behøver ikke være en professionel scanning. Tip: Du kan også uploade billeder, du har hentet fra Arkivalieronline.",
      },
      {
        question: "Kan jeg gøre det hele fra mobilen?",
        answer:
          "Ja, hele siden fungerer på mobil og tablet præcis som på computer. Du kan tage et foto direkte med mobilens kamera og uploade det med det samme.",
      },
    ],
  },
  {
    title: "Resultat og kvalitet",
    items: [
      {
        question: "Hvilke skrifttyper kan genkendes?",
        answer:
          "Vores AI er specialiseret i gammel dansk håndskrift: gotisk håndskrift (standard før ca. 1875), overgangsskrift (ca. 1875–1900), gotisk tryk (fraktur) og moderne håndskrift. Uanset om det er en dagbog, et gammelt brev, en kogebog, en kirkebog eller en folketælling — de mest almindelige skrifttyper genkendes pålideligt.",
      },
      {
        question: "Hvad med den gamle retskrivning — »Aa« og navneord med stort?",
        answer:
          "Det håndterer AI'en. Tekster fra før retskrivningsreformen i 1948 bruger »Aa« i stedet for »Å«, og alle navneord begynder med stort bogstav. Det er ikke fejl, men datidens korrekte stavemåde, og transskriptionen bevarer den, så teksten forbliver tro mod originalen.",
      },
      {
        question: "Hvad gør jeg, hvis AI'en laver fejl eller ikke kan læse noget?",
        answer:
          "AI'en markerer usikre steder i teksten, så du straks kan se, hvor der er huller. Du kan rette og tilpasse teksten direkte i browseren. Er et dokument særligt svært at læse, kan du bruge vores ekspert-service: så læser en uddannet person håndskriften for dig.",
      },
      {
        question: "Kan jeg stole på AI-resultatet?",
        answer:
          "AI'en giver i de fleste tilfælde et meget godt resultat — men som al kunstig intelligens kan den lave fejl. Af og til læses et ord forkert, eller et hul fyldes med et plausibelt, men forkert ord. Derfor anbefaler vi: tjek altid resultatet selv, især ved vigtige steder. Brug ikke AI-transskriptioner som eneste grundlag for juridiske, medicinske, økonomiske eller officielle formål. Til den slags tilbyder vi vores ekspert-service, hvor en uddannet person læser og kontrollerer håndskriften.",
      },
      {
        question: "Hvad betyder de tre tekstversioner?",
        answer:
          "Du får tre forskellige udgaver: (1) Tro mod originalen — så ordret som muligt, også med gamle stavemåder. (2) AI-suppleret — AI'en udfylder ulæselige steder fornuftigt. (3) Fri fortolkning — en flydende tekst på moderne dansk. Så kan du selv vælge den version, der passer bedst til dit formål — fx den originaltro til slægtsforskning og den frie til oplæsning.",
      },
    ],
  },
  {
    title: "Pris og betaling",
    items: [
      {
        question: "Hvad koster en transskription?",
        answer:
          "De første 3 sider er helt gratis — uden oprettelse og uden kreditkort. Derefter køber du credits: 1 credit = 1 side. Jo flere sider du køber på én gang, desto billigere bliver det. Der er intet abonnement og ingen skjulte omkostninger. Dit tilgodehavende udløber ikke.",
      },
      {
        question: "Hvordan betaler jeg, og er det sikkert?",
        answer:
          "Du betaler nemt med betalingskort, MobilePay, Apple Pay eller Google Pay. Betalingen håndteres af Stripe — en af verdens førende betalingsudbydere. Dine betalingsoplysninger sendes krypteret og gemmes aldrig på vores servere. Efter købet får du automatisk en kvittering på e-mail.",
      },
    ],
  },
  {
    title: "Privatliv og sikkerhed",
    items: [
      {
        question: "Er mine dokumenter og data sikre?",
        answer:
          "Ja. Alle data sendes SSL-krypteret og gemmes på servere i EU. Vi arbejder i overensstemmelse med GDPR. Dine dokumenter bruges ikke til at træne AI'en. Du kan til enhver tid få alle dine data slettet helt.",
      },
      {
        question: "Hvad sker der med mine fotos efter transskriptionen?",
        answer:
          "Dine fotos og tekster bliver gemt på din personlige konto, så længe du ønsker det. Kun du har adgang. Sletter du din konto, fjernes alle data uigenkaldeligt. Vi videregiver ikke dine dokumenter til tredjepart.",
      },
    ],
  },
  {
    title: "Funktioner",
    items: [
      {
        question: "Kan jeg få teksten oversat — fx til slægtninge i udlandet?",
        answer:
          "Ja! Ved enhver AI-transskription kan du få teksten oversat til over 30 sprog — engelsk, tysk, svensk og mange flere. Det er inkluderet i prisen uden ekstra betaling. Ideelt, hvis familien bor spredt — fx efterkommere af danske udvandrere i USA, der gerne vil læse brevene på engelsk.",
      },
      {
        question: "Kan jeg få teksten læst op?",
        answer:
          "Ja. Du kan få transskriptionen lavet som lydfil med forskellige stemmer og oplæsningsstile og hente den. Det er en særlig smuk gave til ældre familiemedlemmer, der ikke længere ser så godt — eller bare til at lytte til.",
      },
    ],
  },
];

export const FAQ_ITEMS: FaqItem[] = FAQ_CATEGORIES.flatMap((c) => c.items);
