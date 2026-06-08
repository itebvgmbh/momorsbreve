import type { Localized } from "@/i18n/localized";

export type TourId =
  | "welcome"
  | "firstTranscription"
  | "audio"
  | "combine";

type Side = "top" | "right" | "bottom" | "left" | "over";
type Align = "start" | "center" | "end";

export type AdvanceCondition =
  | { type: "click"; selector?: string }
  | { type: "elementAppears"; selector: string; timeoutMs?: number }
  | { type: "routeChange"; routePrefix: string };

export interface TourStep {
  element?: string;
  title: Localized;
  description: Localized;
  side?: Side;
  align?: Align;
  nextBtnText?: Localized;
  prevBtnText?: Localized;
  doneBtnText?: Localized;
  requirePath?: string;
  navigateTo?: string;
  action?: () => void;
  /** Verhindert automatisches Scrollen zum Element durch driver.js. */
  preventScroll?: boolean;
  /**
   * Wenn gesetzt: Die Tour zeigt keinen "Weiter"-Knopf und geht erst weiter,
   * wenn die Bedingung erfüllt ist (Klick aufs Element, Erscheinen eines anderen
   * Elements, Routenwechsel).
   */
  advanceOn?: AdvanceCondition;
}

export interface TourDefinition {
  id: TourId;
  label: Localized;
  shortLabel: Localized;
  description: Localized;
  steps: TourStep[];
}

function clickTab(testId: string) {
  return () => {
    const el = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    if (el) el.click();
  };
}

function switchCombineMobileTab() {
  window.dispatchEvent(new CustomEvent("tour:combine-show-settings"));
}

export const tours: Record<TourId, TourDefinition> = {
  welcome: {
    id: "welcome",
    label: {
      da: "Velkommen til MormorsBreve",
      de: "Willkommen bei MormorsBreve",
      en: "Welcome to MormorsBreve",
    },
    shortLabel: {
      da: "Velkomst",
      de: "Begrüßung",
      en: "Welcome",
    },
    description: {
      da: "En kort introduktion – hvad appen kan, og hvordan dine credits fungerer.",
      de: "Eine kurze Einführung – was die App kann und wie die Credits funktionieren.",
      en: "A short introduction – what the app can do and how credits work.",
    },
    steps: [
      {
        title: {
          da: "Hjerteligt velkommen!",
          de: "Herzlich willkommen!",
          en: "A warm welcome!",
        },
        description: {
          da: "Dejligt, at du er her. Du har fået 3 gratis credits foræret, så du kan komme i gang med det samme.",
          de: "Schön, dass Sie da sind. Sie haben 3 Gratis-Credits geschenkt bekommen, mit denen Sie sofort loslegen können.",
          en: "Great to have you here. You've been given 3 free credits, so you can get started right away.",
        },
        align: "center",
      },
      {
        title: {
          da: "Sådan fungerer credits",
          de: "So funktionieren Credits",
          en: "How credits work",
        },
        description: {
          da: "1 credit = 1 side. Ved enkeltsidede dokumenter betaler du altså 1 credit pr. transskription. Ved flersidede dokumenter koster den første side også 1 credit – den fungerer som forhåndsvisning, hvor du kan tjekke kvaliteten, før du bruger flere credits på de øvrige sider.",
          de: "1 Credit = 1 Seite. Bei einseitigen Dokumenten zahlen Sie also 1 Credit pro Transkription. Bei mehrseitigen Dokumenten kostet die erste Seite ebenfalls 1 Credit – diese dient als Vorschau, an der Sie die Qualität prüfen, bevor Sie weitere Credits für die übrigen Seiten einsetzen.",
          en: "1 credit = 1 page. For single-page documents you pay 1 credit per transcription. For multi-page documents the first page also costs 1 credit – it serves as a preview where you can check the quality before spending more credits on the remaining pages.",
        },
        align: "center",
      },
      {
        title: {
          da: "Hjælp er altid lige ved hånden",
          de: "Hilfe ist immer da",
          en: "Help is always at hand",
        },
        description: {
          da: "Øverst til højre finder du spørgsmålstegnet. Derfra kan du til enhver tid genstarte denne og andre ture.",
          de: "Oben rechts finden Sie das Fragezeichen. Dort können Sie diese und weitere Touren jederzeit neu starten.",
          en: "You'll find the question mark in the top right. From there you can restart this and other tours at any time.",
        },
        align: "center",
      },
    ],
  },

  firstTranscription: {
    id: "firstTranscription",
    label: {
      da: "Den første transskription trin for trin",
      de: "Erste Transkription Schritt für Schritt",
      en: "Your first transcription step by step",
    },
    shortLabel: {
      da: "Første transskription",
      de: "Erste Transkription",
      en: "First transcription",
    },
    description: {
      da: "Fra upload til færdig tekst – inklusive oversættelse og de tre tekstvarianter.",
      de: "Vom Hochladen bis zum fertigen Text – inklusive Übersetzung und den drei Textvarianten.",
      en: "From upload to finished text – including translation and the three text variants.",
    },
    steps: [
      {
        element: '[data-tour="upload-dropzone"]',
        title: {
          da: "1. Upload din fil her",
          de: "1. Datei hier hochladen",
          en: "1. Upload your file here",
        },
        description: {
          da: "Klik på det store felt og vælg et foto eller en PDF-fil. Jeg venter her, indtil du har valgt en fil.",
          de: "Klicken Sie auf das große Feld und wählen Sie ein Foto oder eine PDF-Datei aus. Ich warte hier, bis Sie eine Datei gewählt haben.",
          en: "Click the large field and choose a photo or a PDF file. I'll wait here until you've selected a file.",
        },
        side: "bottom",
        align: "center",
        requirePath: "/app/upload",
        advanceOn: {
          type: "elementAppears",
          selector: '[data-tour="upload-submit"]',
          timeoutMs: 120000,
        },
      },
      {
        element: '[data-tour="upload-add-more"]',
        title: {
          da: "2. Tilføj flere sider (valgfrit)",
          de: "2. Weitere Seiten hinzufügen (optional)",
          en: "2. Add more pages (optional)",
        },
        description: {
          da: "Har du flere sider? Klik her på plusset for at tilføje flere fotos eller sider. Så forstår KI'en sammenhængen endnu bedre.",
          de: "Haben Sie mehrere Seiten? Klicken Sie hier auf das Plus, um weitere Fotos oder Seiten hinzuzufügen. Die KI erkennt den Zusammenhang dann besser.",
          en: "Do you have several pages? Click the plus here to add more photos or pages. The AI then understands the context even better.",
        },
        side: "left",
        align: "center",
      },
      {
        element: '[data-tour="upload-translation-select"]',
        title: {
          da: "3. Oversættelse (valgfrit)",
          de: "3. Übersetzung (optional)",
          en: "3. Translation (optional)",
        },
        description: {
          da: 'Hvis du ønsker det, kan du her vælge et sprog, som teksten samtidig oversættes til. Ellers lader du det stå og klikker på "Videre".',
          de: 'Falls gewünscht, wählen Sie hier eine Sprache, in die der Text gleich mit übersetzt wird. Sonst lassen Sie es so und klicken auf "Weiter".',
          en: 'If you like, choose a language here that the text will be translated into at the same time. Otherwise leave it as is and click "Next".',
        },
        side: "right",
        align: "end",
      },
      {
        element: '[data-tour="upload-submit"]',
        title: {
          da: "4. Start transskriptionen",
          de: "4. Transkription starten",
          en: "4. Start the transcription",
        },
        description: {
          da: "Klik nu på denne knap. Der beregnes 1 credit pr. side. Ved flere sider transskriberes først kun den første side, så du kan bedømme kvaliteten.",
          de: "Klicken Sie jetzt auf diesen Knopf. Pro Seite wird 1 Credit berechnet. Bei mehreren Seiten wird zunächst nur die erste Seite transkribiert, damit Sie die Qualität beurteilen können.",
          en: "Now click this button. 1 credit is charged per page. For multiple pages only the first page is transcribed at first, so you can judge the quality.",
        },
        side: "top",
        align: "center",
        advanceOn: {
          type: "routeChange",
          routePrefix: "/app/preview",
        },
      },
      {
        element: '[data-tour="preview-quality"]',
        title: {
          da: "5. Tjek kvaliteten",
          de: "5. Qualität prüfen",
          en: "5. Check the quality",
        },
        description: {
          da: "Her ser du, hvor godt KI'en kan tyde håndskriften. En grøn visning betyder rigtig god kvalitet – så kan det betale sig at bruge flere credits.",
          de: "Hier sehen Sie, wie gut die KI die Handschrift erkennen kann. Eine grüne Anzeige bedeutet sehr gute Qualität – dann lohnt es sich, weitere Credits einzusetzen.",
          en: "Here you can see how well the AI can read the handwriting. A green indicator means very good quality – then it's worth spending more credits.",
        },
        side: "bottom",
        align: "center",
        requirePath: "/app/preview",
      },
      {
        element: '[data-tour="preview-buy"]',
        title: {
          da: "6. Lås de øvrige sider op",
          de: "6. Restliche Seiten freischalten",
          en: "6. Unlock the remaining pages",
        },
        description: {
          da: "Hvis du er tilfreds, så klik på denne knap for at transskribere de øvrige sider med dine credits.",
          de: "Wenn Sie zufrieden sind, klicken Sie auf diesen Button, um die restlichen Seiten mit Ihren Credits zu transkribieren.",
          en: "If you're satisfied, click this button to transcribe the remaining pages with your credits.",
        },
        side: "bottom",
        align: "center",
        advanceOn: {
          type: "routeChange",
          routePrefix: "/app/result",
        },
      },
      {
        element: '[data-tour="result-tabs"]',
        title: {
          da: "7. Tre tekstvarianter",
          de: "7. Drei Textvarianten",
          en: "7. Three text variants",
        },
        description: {
          da: "Du får teksten i tre varianter. Skift mellem dem heroppe – jeg viser dig hver enkelt om lidt.",
          de: "Sie bekommen den Text in drei Varianten. Wechseln Sie hier oben zwischen ihnen – ich zeige Ihnen gleich jede einzeln.",
          en: "You get the text in three variants. Switch between them up here – I'll show you each one in a moment.",
        },
        side: "bottom",
        align: "center",
        requirePath: "/app/result",
      },
      {
        element: '[data-tour="result-tab-original"]',
        title: {
          da: "Variant 1: Tro mod originalen",
          de: "Variante 1: Originaltreu",
          en: "Variant 1: True to the original",
        },
        description: {
          da: "Præcis som skrevet i dokumentet – med huller ved ulæselige steder. Tættest på originalen.",
          de: "Genau wie im Dokument geschrieben – mit Lücken an unleserlichen Stellen. Am nächsten am Original.",
          en: "Exactly as written in the document – with gaps at illegible spots. Closest to the original.",
        },
        side: "bottom",
        align: "center",
        action: clickTab("result-tab-original"),
      },
      {
        element: '[data-tour="result-tab-completed"]',
        title: {
          da: "Variant 2: Suppleret",
          de: "Variante 2: Ergänzt",
          en: "Variant 2: Completed",
        },
        description: {
          da: "Huller udfyldes forsigtigt uden at ændre meningen. God at læse.",
          de: "Lücken werden vorsichtig vervollständigt, ohne den Sinn zu verändern. Gut zum Lesen.",
          en: "Gaps are carefully filled in without changing the meaning. Easy to read.",
        },
        side: "bottom",
        align: "center",
        action: clickTab("result-tab-completed"),
      },
      {
        element: '[data-tour="result-tab-interpreted"]',
        title: {
          da: "Variant 3: Fortolkning",
          de: "Variante 3: Interpretation",
          en: "Variant 3: Interpretation",
        },
        description: {
          da: "Genfortalt på moderne dansk. Ideel, hvis du hurtigt vil forstå indholdet.",
          de: "In modernem Deutsch nacherzählt. Ideal, wenn Sie den Inhalt schnell verstehen möchten.",
          en: "Retold in modern language. Ideal if you want to grasp the content quickly.",
        },
        side: "bottom",
        align: "center",
        action: clickTab("result-tab-interpreted"),
      },
      {
        element: '[data-tour="result-export-pdf"]',
        title: {
          da: "8. Download som PDF",
          de: "8. Als PDF herunterladen",
          en: "8. Download as PDF",
        },
        description: {
          da: "Til sidst downloader du det hele som en flot PDF – med originalbilleder og tekst side om side.",
          de: "Zum Schluss laden Sie alles als hübsches PDF herunter – mit Originalbildern und Text nebeneinander.",
          en: "Finally, download everything as a neat PDF – with the original images and text side by side.",
        },
        side: "bottom",
        align: "end",
        doneBtnText: { da: "Færdig", de: "Fertig", en: "Done" },
      },
    ],
  },

  audio: {
    id: "audio",
    label: {
      da: "Få teksterne læst op",
      de: "Texte vorlesen lassen",
      en: "Have texts read aloud",
    },
    shortLabel: {
      da: "Oplæsning & lydbog",
      de: "Vorlesen & Hörbuch",
      en: "Read-aloud & audiobook",
    },
    description: {
      da: "Sådan laver du en transskription om til en lydbog med en ægte stemme.",
      de: "So wandeln Sie eine Transkription in ein Hörbuch mit echter Stimme um.",
      en: "How to turn a transcription into an audiobook with a real voice.",
    },
    steps: [
      {
        element: '[data-tour="result-tts"]',
        title: {
          da: "Åbn oplæsningsfunktionen",
          de: "Vorlesen-Funktion öffnen",
          en: "Open the read-aloud feature",
        },
        description: {
          da: 'Klik på "Vælg stemme" for at vælge en stemme og en oplæsningsstil.',
          de: 'Klicken Sie auf "Stimme wählen", um eine Stimme und einen Sprech-Stil auszuwählen.',
          en: 'Click "Choose voice" to select a voice and a speaking style.',
        },
        side: "top",
        align: "center",
        requirePath: "/app/result",
        advanceOn: { type: "click" },
      },
      {
        title: {
          da: "Vælg stemme og karakter",
          de: "Stimme und Charakter wählen",
          en: "Choose voice and character",
        },
        description: {
          da: "I sidepanelet til højre vælger du øverst en stemme og nedenunder en oplæsningsstil. Prisen står nederst: 1 credit = 1.000 tegn. Prøv endelig forskellige stemmer.",
          de: "In der Seitenleiste rechts wählen Sie oben eine Stimme und darunter einen Sprech-Stil. Die Kosten stehen unten: 1 Credit = 1.000 Zeichen. Probieren Sie ruhig verschiedene Stimmen aus.",
          en: "In the sidebar on the right, choose a voice at the top and a speaking style below it. The cost is shown at the bottom: 1 credit = 1,000 characters. Feel free to try different voices.",
        },
        align: "center",
      },
      {
        title: {
          da: "Alle lydbøger ét sted",
          de: "Alle Hörbücher an einem Ort",
          en: "All audiobooks in one place",
        },
        description: {
          da: "Lad os nu se, hvor alle lydfiler samles.",
          de: "Schauen wir uns jetzt an, wo alle Audios gesammelt werden.",
          en: "Let's now look at where all the audio is collected.",
        },
        align: "center",
        navigateTo: "/app/audio",
      },
      {
        element: '[data-tour="audio-page-header"]',
        title: {
          da: "Mine lydfiler",
          de: "Meine Audios",
          en: "My audio",
        },
        description: {
          da: "Her finder du alle dine lydbøger. Du kan sammensætte playlister, afspille enkelte lydfiler eller downloade dem.",
          de: "Hier finden Sie alle erstellten Hörbücher. Sie können Playlists zusammenstellen, einzelne Audios abspielen oder herunterladen.",
          en: "Here you'll find all the audiobooks you've created. You can build playlists, play individual audio files, or download them.",
        },
        side: "bottom",
        align: "center",
        requirePath: "/app/audio",
        doneBtnText: { da: "Forstået", de: "Verstanden", en: "Got it" },
      },
    ],
  },

  combine: {
    id: "combine",
    label: {
      da: "Saml flere transskriptioner i én PDF",
      de: "Mehrere Transkriptionen zu einem PDF zusammenfassen",
      en: "Combine several transcriptions into one PDF",
    },
    shortLabel: {
      da: "PDF-samleværk",
      de: "PDF-Sammelband",
      en: "PDF collection",
    },
    description: {
      da: "Sådan samler du flere breve eller dagbogssider i et flot samleværk med forside.",
      de: "So bündeln Sie mehrere Briefe oder Tagebuchseiten zu einem hübschen Sammelband mit Deckblatt.",
      en: "How to bundle several letters or diary pages into a neat collection with a cover page.",
    },
    steps: [
      {
        element: '[data-tour="dashboard-combine"]',
        title: {
          da: "1. Start udvælgelsestilstand",
          de: "1. Auswahlmodus starten",
          en: "1. Start selection mode",
        },
        description: {
          da: "Klik på denne knap. Derefter dukker der fluebenfelter op ved de færdige transskriptioner.",
          de: 'Klicken Sie auf diesen Knopf. Danach erscheinen Häkchen an den fertigen Transkriptionen.',
          en: "Click this button. Checkboxes then appear next to the finished transcriptions.",
        },
        side: "bottom",
        align: "center",
        requirePath: "/app",
        advanceOn: { type: "click" },
      },
      {
        element: '[data-tour="dashboard-job-list"]',
        title: {
          da: "2. Vælg dokumenter",
          de: "2. Dokumente auswählen",
          en: "2. Select documents",
        },
        description: {
          da: "Sæt flueben ved mindst to dokumenter. Så snart du har valgt to, går det automatisk videre.",
          de: "Setzen Sie bei mindestens zwei Dokumenten ein Häkchen. Sobald Sie zwei ausgewählt haben, geht es automatisch weiter.",
          en: "Tick at least two documents. As soon as you've selected two, it continues automatically.",
        },
        side: "top",
        align: "center",
        advanceOn: {
          type: "elementAppears",
          selector: '[data-tour-ready="combine"]',
          timeoutMs: 120000,
        },
      },
      {
        element: '[data-tour="dashboard-combine-submit"]',
        title: {
          da: "3. Saml som PDF",
          de: "3. Als PDF zusammenführen",
          en: "3. Merge into a PDF",
        },
        description: {
          da: "Klik hernede. På næste side indstiller du rækkefølge og forside.",
          de: "Klicken Sie hier unten. Auf der nächsten Seite stellen Sie Reihenfolge und Deckblatt ein.",
          en: "Click down here. On the next page you set the order and the cover page.",
        },
        side: "top",
        align: "center",
        advanceOn: {
          type: "routeChange",
          routePrefix: "/app/combine",
        },
      },
      {
        element: '[data-tour="combine-order"]',
        title: {
          da: "4. Fastlæg rækkefølgen",
          de: "4. Reihenfolge festlegen",
          en: "4. Set the order",
        },
        description: {
          da: "Her ser du alle de valgte dokumenter. Med pilene til højre flytter du enkelte dokumenter op eller ned.",
          de: "Hier sehen Sie alle gewählten Dokumente. Mit den Pfeilen rechts verschieben Sie einzelne Dokumente nach oben oder unten.",
          en: "Here you see all the selected documents. Use the arrows on the right to move individual documents up or down.",
        },
        side: "bottom",
        align: "center",
        requirePath: "/app/combine",
        action: switchCombineMobileTab,
      },
      {
        element: '[data-tour="combine-textversion"]',
        title: {
          da: "5. Vælg tekstversion",
          de: "5. Textversion wählen",
          en: "5. Choose the text version",
        },
        description: {
          da: 'Vælg mellem "Original" (bogstavtro), "Suppleret" (huller udfyldt) og "Fortolkning" (på moderne dansk).',
          de: 'Wählen Sie zwischen "Original" (buchstabengetreu), "Ergänzt" (Lücken gefüllt) und "Interpretation" (in modernem Deutsch).',
          en: 'Choose between "Original" (letter-faithful), "Completed" (gaps filled) and "Interpretation" (in modern language).',
        },
        side: "bottom",
        align: "center",
      },
      {
        element: '[data-tour="combine-settings"]',
        title: {
          da: "6. Tilpas PDF-indstillinger",
          de: "6. PDF-Optionen anpassen",
          en: "6. Adjust the PDF options",
        },
        description: {
          da: 'Her styrer du layoutet: "Løbende tekst" forbinder afsnit, "Lige margener" giver ensartede kanter. Skriftstørrelsen kan også indstilles.',
          de: 'Hier steuern Sie das Layout: "Fließtext" verbindet Absätze, "Blocksatz" sorgt für gleichmäßige Ränder. Auch die Schriftgröße lässt sich einstellen.',
          en: 'Here you control the layout: "Flowing text" joins paragraphs, "Justified" gives even margins. The font size can be set too.',
        },
        side: "bottom",
        align: "center",
      },
      {
        element: '[data-tour="combine-download"]',
        title: {
          da: "7. Færdig – download PDF",
          de: "7. Fertig – PDF herunterladen",
          en: "7. Done – download the PDF",
        },
        description: {
          da: "Hvis alt passer, downloader du her det færdige samle-PDF. Forhåndsvisningen opdateres automatisk ved hver ændring.",
          de: "Wenn alles passt, laden Sie hier das fertige Sammel-PDF herunter. Die Vorschau aktualisiert sich automatisch bei jeder Änderung.",
          en: "If everything looks right, download the finished collection PDF here. The preview updates automatically with every change.",
        },
        side: "top",
        align: "center",
        doneBtnText: { da: "Forstået", de: "Verstanden", en: "Got it" },
      },
    ],
  },
};

/**
 * Alternative Audio-Tour-Schritte, wenn der Nutzer noch keine
 * fertigen Transkriptionen hat.
 */
export const audioNoJobsSteps: TourStep[] = [
  {
    title: {
      da: "Lav først en transskription",
      de: "Erst eine Transkription erstellen",
      en: "Create a transcription first",
    },
    description: {
      da: 'For at få tekster læst op skal du først have en færdig transskription. Gå til "Upload" og få et dokument transskriberet.',
      de: 'Um Texte vorlesen zu lassen, brauchen Sie zuerst eine fertige Transkription. Gehen Sie auf "Hochladen" und lassen Sie ein Dokument transkribieren.',
      en: 'To have texts read aloud, you first need a finished transcription. Go to "Upload" and have a document transcribed.',
    },
    align: "center",
  },
  {
    title: {
      da: "Oplæsning på resultatsiden",
      de: "Vorlesen auf der Ergebnis-Seite",
      en: "Read-aloud on the result page",
    },
    description: {
      da: 'Så snart en transskription er færdig, finder du området "Vælg stemme" på resultatsiden. Der vælger du en stemme og en oplæsningsstil.',
      de: 'Sobald eine Transkription fertig ist, finden Sie auf der Ergebnis-Seite den Bereich "Stimme wählen". Dort wählen Sie eine Stimme und einen Sprech-Stil aus.',
      en: 'As soon as a transcription is finished, you\'ll find the "Choose voice" area on the result page. There you select a voice and a speaking style.',
    },
    align: "center",
  },
  {
    title: {
      da: "Alle lydbøger ét sted",
      de: "Alle Hörbücher an einem Ort",
      en: "All audiobooks in one place",
    },
    description: {
      da: 'Under "Mine lydfiler" i sidepanelet finder du senere alle dine lydbøger og kan sammensætte playlister.',
      de: 'Unter "Meine Audios" in der Seitenleiste finden Sie später alle erstellten Hörbücher und können Playlisten zusammenstellen.',
      en: 'Under "My audio" in the sidebar you\'ll later find all the audiobooks you\'ve created and can build playlists.',
    },
    align: "center",
    doneBtnText: { da: "Forstået", de: "Verstanden", en: "Got it" },
  },
];

/**
 * Alternative Sammelband-Tour-Schritte, wenn der Nutzer weniger als
 * 2 fertige Transkriptionen hat.
 */
export const combineNoJobsSteps: TourStep[] = [
  {
    title: {
      da: "Mindst 2 transskriptioner kræves",
      de: "Mindestens 2 Transkriptionen nötig",
      en: "At least 2 transcriptions required",
    },
    description: {
      da: "PDF-samleværket samler flere færdige transskriptioner i ét dokument. Det kræver mindst 2 afsluttede transskriptioner.",
      de: "Der PDF-Sammelband fasst mehrere fertige Transkriptionen zu einem Dokument zusammen. Dafür brauchen Sie mindestens 2 abgeschlossene Transkriptionen.",
      en: "The PDF collection combines several finished transcriptions into one document. For that you need at least 2 completed transcriptions.",
    },
    align: "center",
  },
  {
    title: {
      da: "Enkelte PDF'er altid muligt",
      de: "Einzelne PDFs jederzeit möglich",
      en: "Single PDFs always possible",
    },
    description: {
      da: 'For et enkelt projekt kan du til enhver tid bruge PDF-eksporten. Åbn en færdig transskription og klik øverst på "PDF-eksport".',
      de: 'Für ein einzelnes Projekt können Sie jederzeit den PDF-Export nutzen. Öffnen Sie dazu eine fertige Transkription und klicken Sie oben auf "PDF-Export".',
      en: 'For a single project you can use the PDF export at any time. Open a finished transcription and click "PDF export" at the top.',
    },
    align: "center",
    doneBtnText: { da: "Forstået", de: "Verstanden", en: "Got it" },
  },
];

export const tourOrder: TourId[] = [
  "welcome",
  "firstTranscription",
  "audio",
  "combine",
];
