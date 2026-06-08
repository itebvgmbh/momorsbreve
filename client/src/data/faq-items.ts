import { type Localized } from "@/i18n/localized";

export interface FaqItem {
  question: Localized;
  answer: Localized;
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
        question: {
          da: "Hvordan virker MormorsBreve? Skal jeg kunne noget særligt med computere?",
          de: "Wie funktioniert MormorsBreve? Muss ich besonders gut mit Computern umgehen können?",
          en: "How does MormorsBreve work? Do I need any special computer skills?",
        },
        answer: {
          da: "Nej, du behøver ingen særlige forudsætninger. Du skal blot bruge et foto eller en scanning af håndskriften. Du uploader billedet på vores side — det virker på computer, tablet og mobil. AI'en læser skriften og giver dig teksten. Det er lige så nemt som at sende et foto via beskeder.",
          de: "Nein, Sie benötigen keine besonderen Voraussetzungen. Sie brauchen lediglich ein Foto oder einen Scan der Handschrift. Sie laden das Bild auf unserer Seite hoch — das funktioniert am Computer, Tablet und Smartphone. Die KI liest die Schrift und liefert Ihnen den Text. Es ist so einfach wie das Versenden eines Fotos per Messenger.",
          en: "No, you don't need any special prerequisites. You simply need a photo or a scan of the handwriting. You upload the image on our site — it works on computer, tablet and mobile. The AI reads the script and gives you the text. It's as easy as sending a photo via messages.",
        },
      },
      {
        question: {
          da: "Hvordan tager jeg bedst et foto af håndskriften?",
          de: "Wie fotografiere ich die Handschrift am besten?",
          en: "What's the best way to photograph the handwriting?",
        },
        answer: {
          da: "Læg dokumentet fladt på et bord, helst i dagslys. Tag billedet ovenfra, så hele teksten er tydelig. Sørg for, at der ikke falder skygge på skriften. Et almindeligt mobilfoto er rigeligt — det behøver ikke være en professionel scanning. Tip: Du kan også uploade billeder, du har hentet fra Arkivalieronline.",
          de: "Legen Sie das Dokument flach auf einen Tisch, am besten bei Tageslicht. Fotografieren Sie von oben, sodass der gesamte Text deutlich zu sehen ist. Achten Sie darauf, dass kein Schatten auf die Schrift fällt. Ein gewöhnliches Handyfoto genügt völlig — es muss kein professioneller Scan sein. Tipp: Sie können auch Bilder hochladen, die Sie aus einem Online-Archiv heruntergeladen haben.",
          en: "Place the document flat on a table, preferably in daylight. Take the photo from above so the entire text is clear. Make sure no shadow falls on the script. An ordinary phone photo is plenty — it doesn't have to be a professional scan. Tip: You can also upload images you've downloaded from an online archive.",
        },
      },
      {
        question: {
          da: "Kan jeg gøre det hele fra mobilen?",
          de: "Kann ich alles vom Smartphone aus erledigen?",
          en: "Can I do everything from my phone?",
        },
        answer: {
          da: "Ja, hele siden fungerer på mobil og tablet præcis som på computer. Du kan tage et foto direkte med mobilens kamera og uploade det med det samme.",
          de: "Ja, die gesamte Seite funktioniert auf Smartphone und Tablet genauso wie am Computer. Sie können direkt mit der Handykamera ein Foto aufnehmen und es sofort hochladen.",
          en: "Yes, the entire site works on mobile and tablet exactly as on a computer. You can take a photo directly with your phone's camera and upload it right away.",
        },
      },
    ],
  },
  {
    title: "Resultat og kvalitet",
    items: [
      {
        question: {
          da: "Hvilke skrifttyper kan genkendes?",
          de: "Welche Schriftarten können erkannt werden?",
          en: "Which types of script can be recognised?",
        },
        answer: {
          da: "Vores AI er specialiseret i gammel dansk håndskrift: gotisk håndskrift (standard før ca. 1875), overgangsskrift (ca. 1875–1900), gotisk tryk (fraktur) og moderne håndskrift. Uanset om det er en dagbog, et gammelt brev, en kogebog, en kirkebog eller en folketælling — de mest almindelige skrifttyper genkendes pålideligt.",
          de: "Unsere KI ist auf alte dänische Handschrift spezialisiert: gotische Handschrift (Standard vor ca. 1875), Übergangsschrift (ca. 1875–1900), Frakturdruck (gotisk tryk) und moderne Handschrift. Ob Tagebuch, alter Brief, Kochbuch, Kirchenbuch oder Volkszählung — die häufigsten Schriftarten werden zuverlässig erkannt.",
          en: "Our AI specialises in old Danish handwriting: Gothic handwriting (standard before about 1875), transitional script (about 1875–1900), Gothic print (Fraktur) and modern handwriting. Whether it's a diary, an old letter, a cookbook, a parish register or a census — the most common types of script are recognised reliably.",
        },
      },
      {
        question: {
          da: "Hvad med den gamle retskrivning — »Aa« og navneord med stort?",
          de: "Was ist mit der alten Rechtschreibung — »Aa« und großgeschriebene Substantive?",
          en: "What about the old spelling — »Aa« and capitalised nouns?",
        },
        answer: {
          da: "Det håndterer AI'en. Tekster fra før retskrivningsreformen i 1948 bruger »Aa« i stedet for »Å«, og alle navneord begynder med stort bogstav. Det er ikke fejl, men datidens korrekte stavemåde, og transskriptionen bevarer den, så teksten forbliver tro mod originalen.",
          de: "Das beherrscht die KI. Texte vor der Rechtschreibreform von 1948 verwenden »Aa« anstelle von »Å«, und alle Substantive beginnen mit einem Großbuchstaben. Das sind keine Fehler, sondern die damals korrekte Schreibweise, und die Transkription bewahrt sie, damit der Text dem Original treu bleibt.",
          en: "The AI handles that. Texts from before the 1948 spelling reform use »Aa« instead of »Å«, and all nouns begin with a capital letter. These are not mistakes but the correct spelling of the time, and the transcription preserves them so the text stays true to the original.",
        },
      },
      {
        question: {
          da: "Hvad gør jeg, hvis AI'en laver fejl eller ikke kan læse noget?",
          de: "Was mache ich, wenn die KI Fehler macht oder etwas nicht lesen kann?",
          en: "What do I do if the AI makes mistakes or can't read something?",
        },
        answer: {
          da: "AI'en markerer usikre steder i teksten, så du straks kan se, hvor der er huller. Du kan rette og tilpasse teksten direkte i browseren. Er et dokument særligt svært at læse, kan du bruge vores ekspert-service: så læser en uddannet person håndskriften for dig.",
          de: "Die KI markiert unsichere Stellen im Text, sodass Sie sofort sehen, wo Lücken sind. Sie können den Text direkt im Browser korrigieren und anpassen. Ist ein Dokument besonders schwer zu lesen, können Sie unseren Experten-Service nutzen: Dann liest eine ausgebildete Person die Handschrift für Sie.",
          en: "The AI marks uncertain passages in the text so you can immediately see where there are gaps. You can correct and adjust the text directly in your browser. If a document is especially hard to read, you can use our expert service: a trained person will then read the handwriting for you.",
        },
      },
      {
        question: {
          da: "Kan jeg stole på AI-resultatet?",
          de: "Kann ich mich auf das KI-Ergebnis verlassen?",
          en: "Can I rely on the AI result?",
        },
        answer: {
          da: "AI'en giver i de fleste tilfælde et meget godt resultat — men som al kunstig intelligens kan den lave fejl. Af og til læses et ord forkert, eller et hul fyldes med et plausibelt, men forkert ord. Derfor anbefaler vi: tjek altid resultatet selv, især ved vigtige steder. Brug ikke AI-transskriptioner som eneste grundlag for juridiske, medicinske, økonomiske eller officielle formål. Til den slags tilbyder vi vores ekspert-service, hvor en uddannet person læser og kontrollerer håndskriften.",
          de: "Die KI liefert in den meisten Fällen ein sehr gutes Ergebnis — aber wie jede künstliche Intelligenz kann sie Fehler machen. Gelegentlich wird ein Wort falsch gelesen oder eine Lücke mit einem plausiblen, aber falschen Wort gefüllt. Deshalb empfehlen wir: Überprüfen Sie das Ergebnis stets selbst, besonders an wichtigen Stellen. Verwenden Sie KI-Transkriptionen nicht als alleinige Grundlage für juristische, medizinische, finanzielle oder behördliche Zwecke. Dafür bieten wir unseren Experten-Service an, bei dem eine ausgebildete Person die Handschrift liest und prüft.",
          en: "In most cases the AI delivers a very good result — but like all artificial intelligence it can make mistakes. Occasionally a word is misread, or a gap is filled with a plausible but incorrect word. We therefore recommend: always check the result yourself, especially at important points. Do not use AI transcriptions as the sole basis for legal, medical, financial or official purposes. For such cases we offer our expert service, where a trained person reads and verifies the handwriting.",
        },
      },
      {
        question: {
          da: "Hvad betyder de tre tekstversioner?",
          de: "Was bedeuten die drei Textversionen?",
          en: "What do the three text versions mean?",
        },
        answer: {
          da: "Du får tre forskellige udgaver: (1) Tro mod originalen — så ordret som muligt, også med gamle stavemåder. (2) AI-suppleret — AI'en udfylder ulæselige steder fornuftigt. (3) Fri fortolkning — en flydende tekst på moderne dansk. Så kan du selv vælge den version, der passer bedst til dit formål — fx den originaltro til slægtsforskning og den frie til oplæsning.",
          de: "Sie erhalten drei verschiedene Fassungen: (1) Originalgetreu — so wortgetreu wie möglich, auch mit alten Schreibweisen. (2) KI-ergänzt — die KI füllt unlesbare Stellen sinnvoll auf. (3) Freie Interpretation — ein flüssiger Text in modernem Deutsch. So können Sie selbst die Version wählen, die am besten zu Ihrem Zweck passt — etwa die originalgetreue für die Ahnenforschung und die freie zum Vorlesen.",
          en: "You receive three different versions: (1) True to the original — as word-for-word as possible, including old spellings. (2) AI-supplemented — the AI fills in illegible passages sensibly. (3) Free interpretation — a flowing text in modern language. You can then choose the version that best suits your purpose — for example the faithful one for genealogy and the free one for reading aloud.",
        },
      },
    ],
  },
  {
    title: "Pris og betaling",
    items: [
      {
        question: {
          da: "Hvad koster en transskription?",
          de: "Was kostet eine Transkription?",
          en: "What does a transcription cost?",
        },
        answer: {
          da: "De første 3 sider er helt gratis — uden oprettelse og uden kreditkort. Derefter køber du credits: 1 credit = 1 side. Jo flere sider du køber på én gang, desto billigere bliver det. Der er intet abonnement og ingen skjulte omkostninger. Dit tilgodehavende udløber ikke.",
          de: "Die ersten 3 Seiten sind völlig kostenlos — ohne Registrierung und ohne Kreditkarte. Danach kaufen Sie Credits: 1 Credit = 1 Seite. Je mehr Seiten Sie auf einmal kaufen, desto günstiger wird es. Es gibt kein Abonnement und keine versteckten Kosten. Ihr Guthaben verfällt nicht.",
          en: "The first 3 pages are completely free — without registration and without a credit card. After that you buy credits: 1 credit = 1 page. The more pages you buy at once, the cheaper it gets. There is no subscription and no hidden costs. Your credit balance never expires.",
        },
      },
      {
        question: {
          da: "Hvordan betaler jeg, og er det sikkert?",
          de: "Wie bezahle ich, und ist es sicher?",
          en: "How do I pay, and is it secure?",
        },
        answer: {
          da: "Du betaler nemt med betalingskort, MobilePay, Apple Pay eller Google Pay. Betalingen håndteres af Stripe — en af verdens førende betalingsudbydere. Dine betalingsoplysninger sendes krypteret og gemmes aldrig på vores servere. Efter købet får du automatisk en kvittering på e-mail.",
          de: "Sie bezahlen bequem mit Zahlungskarte, MobilePay, Apple Pay oder Google Pay. Die Zahlung wird von Stripe abgewickelt — einem der weltweit führenden Zahlungsanbieter. Ihre Zahlungsdaten werden verschlüsselt übertragen und niemals auf unseren Servern gespeichert. Nach dem Kauf erhalten Sie automatisch eine Quittung per E-Mail.",
          en: "You pay easily by payment card, MobilePay, Apple Pay or Google Pay. The payment is handled by Stripe — one of the world's leading payment providers. Your payment details are transmitted encrypted and are never stored on our servers. After the purchase you automatically receive a receipt by email.",
        },
      },
    ],
  },
  {
    title: "Privatliv og sikkerhed",
    items: [
      {
        question: {
          da: "Er mine dokumenter og data sikre?",
          de: "Sind meine Dokumente und Daten sicher?",
          en: "Are my documents and data secure?",
        },
        answer: {
          da: "Ja. Alle data sendes SSL-krypteret og gemmes på servere i EU. Vi arbejder i overensstemmelse med GDPR. Dine dokumenter bruges ikke til at træne AI'en. Du kan til enhver tid få alle dine data slettet helt.",
          de: "Ja. Alle Daten werden SSL-verschlüsselt übertragen und auf Servern in der EU gespeichert. Wir arbeiten DSGVO-konform. Ihre Dokumente werden nicht zum Trainieren der KI verwendet. Sie können jederzeit sämtliche Ihrer Daten vollständig löschen lassen.",
          en: "Yes. All data is transmitted SSL-encrypted and stored on servers in the EU. We work in compliance with the GDPR. Your documents are not used to train the AI. You can have all of your data completely deleted at any time.",
        },
      },
      {
        question: {
          da: "Hvad sker der med mine fotos efter transskriptionen?",
          de: "Was geschieht mit meinen Fotos nach der Transkription?",
          en: "What happens to my photos after the transcription?",
        },
        answer: {
          da: "Dine fotos og tekster bliver gemt på din personlige konto, så længe du ønsker det. Kun du har adgang. Sletter du din konto, fjernes alle data uigenkaldeligt. Vi videregiver ikke dine dokumenter til tredjepart.",
          de: "Ihre Fotos und Texte werden auf Ihrem persönlichen Konto gespeichert, solange Sie es wünschen. Nur Sie haben Zugriff. Löschen Sie Ihr Konto, werden alle Daten unwiderruflich entfernt. Wir geben Ihre Dokumente nicht an Dritte weiter.",
          en: "Your photos and texts are stored in your personal account for as long as you wish. Only you have access. If you delete your account, all data is irrevocably removed. We do not pass your documents on to third parties.",
        },
      },
    ],
  },
  {
    title: "Funktioner",
    items: [
      {
        question: {
          da: "Kan jeg få teksten oversat — fx til slægtninge i udlandet?",
          de: "Kann ich den Text übersetzen lassen — etwa für Verwandte im Ausland?",
          en: "Can I have the text translated — for example for relatives abroad?",
        },
        answer: {
          da: "Ja! Ved enhver AI-transskription kan du få teksten oversat til over 30 sprog — engelsk, tysk, svensk og mange flere. Det er inkluderet i prisen uden ekstra betaling. Ideelt, hvis familien bor spredt — fx efterkommere af danske udvandrere i USA, der gerne vil læse brevene på engelsk.",
          de: "Ja! Bei jeder KI-Transkription können Sie den Text in über 30 Sprachen übersetzen lassen — Englisch, Deutsch, Schwedisch und viele mehr. Das ist im Preis enthalten, ohne Aufpreis. Ideal, wenn die Familie verstreut lebt — etwa Nachfahren dänischer Auswanderer in den USA, die die Briefe gern auf Englisch lesen möchten.",
          en: "Yes! With every AI transcription you can have the text translated into more than 30 languages — English, German, Swedish and many more. It is included in the price at no extra charge. Ideal if your family is spread out — for example descendants of Danish emigrants in the USA who would like to read the letters in English.",
        },
      },
      {
        question: {
          da: "Kan jeg få teksten læst op?",
          de: "Kann ich mir den Text vorlesen lassen?",
          en: "Can I have the text read aloud?",
        },
        answer: {
          da: "Ja. Du kan få transskriptionen lavet som lydfil med forskellige stemmer og oplæsningsstile og hente den. Det er en særlig smuk gave til ældre familiemedlemmer, der ikke længere ser så godt — eller bare til at lytte til.",
          de: "Ja. Sie können die Transkription als Audiodatei mit verschiedenen Stimmen und Vorlesestilen erstellen und herunterladen. Das ist ein besonders schönes Geschenk für ältere Familienmitglieder, die nicht mehr so gut sehen — oder einfach zum Zuhören.",
          en: "Yes. You can have the transcription created as an audio file with different voices and reading styles and download it. It makes a particularly lovely gift for older family members who no longer see so well — or simply to listen to.",
        },
      },
    ],
  },
];

export const FAQ_ITEMS: FaqItem[] = FAQ_CATEGORIES.flatMap((c) => c.items);
