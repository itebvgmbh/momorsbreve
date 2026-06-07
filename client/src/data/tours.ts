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
  title: string;
  description: string;
  side?: Side;
  align?: Align;
  nextBtnText?: string;
  prevBtnText?: string;
  doneBtnText?: string;
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
  label: string;
  shortLabel: string;
  description: string;
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
    label: "Willkommen bei MormorsBreve",
    shortLabel: "Begrüßung",
    description:
      "Eine kurze Einführung – was die App kann und wie die Credits funktionieren.",
    steps: [
      {
        title: "Herzlich willkommen!",
        description:
          "Schön, dass Sie da sind. Sie haben 3 Gratis-Credits geschenkt bekommen, mit denen Sie sofort loslegen können.",
        align: "center",
      },
      {
        title: "So funktionieren Credits",
        description:
          "1 Credit = 1 Seite. Bei einseitigen Dokumenten zahlen Sie also 1 Credit pro Transkription. Bei mehrseitigen Dokumenten kostet die erste Seite ebenfalls 1 Credit – diese dient als Vorschau, an der Sie die Qualität prüfen, bevor Sie weitere Credits für die übrigen Seiten einsetzen.",
        align: "center",
      },
      {
        title: "Hilfe ist immer da",
        description:
          "Oben rechts finden Sie das Fragezeichen. Dort können Sie diese und weitere Touren jederzeit neu starten.",
        align: "center",
      },
    ],
  },

  firstTranscription: {
    id: "firstTranscription",
    label: "Erste Transkription Schritt für Schritt",
    shortLabel: "Erste Transkription",
    description:
      "Vom Hochladen bis zum fertigen Text – inklusive Übersetzung und den drei Textvarianten.",
    steps: [
      {
        element: '[data-tour="upload-dropzone"]',
        title: "1. Datei hier hochladen",
        description:
          "Klicken Sie auf das große Feld und wählen Sie ein Foto oder eine PDF-Datei aus. Ich warte hier, bis Sie eine Datei gewählt haben.",
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
        title: "2. Weitere Seiten hinzufügen (optional)",
        description:
          "Haben Sie mehrere Seiten? Klicken Sie hier auf das Plus, um weitere Fotos oder Seiten hinzuzufügen. Die KI erkennt den Zusammenhang dann besser.",
        side: "left",
        align: "center",
      },
      {
        element: '[data-tour="upload-translation-select"]',
        title: "3. Übersetzung (optional)",
        description:
          'Falls gewünscht, wählen Sie hier eine Sprache, in die der Text gleich mit übersetzt wird. Sonst lassen Sie es so und klicken auf "Weiter".',
        side: "right",
        align: "end",
      },
      {
        element: '[data-tour="upload-submit"]',
        title: "4. Transkription starten",
        description:
          "Klicken Sie jetzt auf diesen Knopf. Pro Seite wird 1 Credit berechnet. Bei mehreren Seiten wird zunächst nur die erste Seite transkribiert, damit Sie die Qualität beurteilen können.",
        side: "top",
        align: "center",
        advanceOn: {
          type: "routeChange",
          routePrefix: "/app/preview",
        },
      },
      {
        element: '[data-tour="preview-quality"]',
        title: "5. Qualität prüfen",
        description:
          "Hier sehen Sie, wie gut die KI die Handschrift erkennen kann. Eine grüne Anzeige bedeutet sehr gute Qualität – dann lohnt es sich, weitere Credits einzusetzen.",
        side: "bottom",
        align: "center",
        requirePath: "/app/preview",
      },
      {
        element: '[data-tour="preview-buy"]',
        title: "6. Restliche Seiten freischalten",
        description:
          "Wenn Sie zufrieden sind, klicken Sie auf diesen Button, um die restlichen Seiten mit Ihren Credits zu transkribieren.",
        side: "bottom",
        align: "center",
        advanceOn: {
          type: "routeChange",
          routePrefix: "/app/result",
        },
      },
      {
        element: '[data-tour="result-tabs"]',
        title: "7. Drei Textvarianten",
        description:
          "Sie bekommen den Text in drei Varianten. Wechseln Sie hier oben zwischen ihnen – ich zeige Ihnen gleich jede einzeln.",
        side: "bottom",
        align: "center",
        requirePath: "/app/result",
      },
      {
        element: '[data-tour="result-tab-original"]',
        title: "Variante 1: Originaltreu",
        description:
          "Genau wie im Dokument geschrieben – mit Lücken an unleserlichen Stellen. Am nächsten am Original.",
        side: "bottom",
        align: "center",
        action: clickTab("result-tab-original"),
      },
      {
        element: '[data-tour="result-tab-completed"]',
        title: "Variante 2: Ergänzt",
        description:
          "Lücken werden vorsichtig vervollständigt, ohne den Sinn zu verändern. Gut zum Lesen.",
        side: "bottom",
        align: "center",
        action: clickTab("result-tab-completed"),
      },
      {
        element: '[data-tour="result-tab-interpreted"]',
        title: "Variante 3: Interpretation",
        description:
          "In modernem Deutsch nacherzählt. Ideal, wenn Sie den Inhalt schnell verstehen möchten.",
        side: "bottom",
        align: "center",
        action: clickTab("result-tab-interpreted"),
      },
      {
        element: '[data-tour="result-export-pdf"]',
        title: "8. Als PDF herunterladen",
        description:
          "Zum Schluss laden Sie alles als hübsches PDF herunter – mit Originalbildern und Text nebeneinander.",
        side: "bottom",
        align: "end",
        doneBtnText: "Fertig",
      },
    ],
  },

  audio: {
    id: "audio",
    label: "Texte vorlesen lassen",
    shortLabel: "Vorlesen & Hörbuch",
    description:
      "So wandeln Sie eine Transkription in ein Hörbuch mit echter Stimme um.",
    steps: [
      {
        element: '[data-tour="result-tts"]',
        title: "Vorlesen-Funktion öffnen",
        description:
          'Klicken Sie auf "Stimme wählen", um eine Stimme und einen Sprech-Stil auszuwählen.',
        side: "top",
        align: "center",
        requirePath: "/app/result",
        advanceOn: { type: "click" },
      },
      {
        title: "Stimme und Charakter wählen",
        description:
          "In der Seitenleiste rechts wählen Sie oben eine Stimme und darunter einen Sprech-Stil. Die Kosten stehen unten: 1 Credit = 1.000 Zeichen. Probieren Sie ruhig verschiedene Stimmen aus.",
        align: "center",
      },
      {
        title: "Alle Hörbücher an einem Ort",
        description:
          "Schauen wir uns jetzt an, wo alle Audios gesammelt werden.",
        align: "center",
        navigateTo: "/app/audio",
      },
      {
        element: '[data-tour="audio-page-header"]',
        title: "Meine Audios",
        description:
          "Hier finden Sie alle erstellten Hörbücher. Sie können Playlists zusammenstellen, einzelne Audios abspielen oder herunterladen.",
        side: "bottom",
        align: "center",
        requirePath: "/app/audio",
        doneBtnText: "Verstanden",
      },
    ],
  },

  combine: {
    id: "combine",
    label: "Mehrere Transkriptionen zu einem PDF zusammenfassen",
    shortLabel: "PDF-Sammelband",
    description:
      "So bündeln Sie mehrere Briefe oder Tagebuchseiten zu einem hübschen Sammelband mit Deckblatt.",
    steps: [
      {
        element: '[data-tour="dashboard-combine"]',
        title: "1. Auswahlmodus starten",
        description:
          'Klicken Sie auf diesen Knopf. Danach erscheinen Häkchen an den fertigen Transkriptionen.',
        side: "bottom",
        align: "center",
        requirePath: "/app",
        advanceOn: { type: "click" },
      },
      {
        element: '[data-tour="dashboard-job-list"]',
        title: "2. Dokumente auswählen",
        description:
          "Setzen Sie bei mindestens zwei Dokumenten ein Häkchen. Sobald Sie zwei ausgewählt haben, geht es automatisch weiter.",
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
        title: "3. Als PDF zusammenführen",
        description:
          "Klicken Sie hier unten. Auf der nächsten Seite stellen Sie Reihenfolge und Deckblatt ein.",
        side: "top",
        align: "center",
        advanceOn: {
          type: "routeChange",
          routePrefix: "/app/combine",
        },
      },
      {
        element: '[data-tour="combine-order"]',
        title: "4. Reihenfolge festlegen",
        description:
          "Hier sehen Sie alle gewählten Dokumente. Mit den Pfeilen rechts verschieben Sie einzelne Dokumente nach oben oder unten.",
        side: "bottom",
        align: "center",
        requirePath: "/app/combine",
        action: switchCombineMobileTab,
      },
      {
        element: '[data-tour="combine-textversion"]',
        title: "5. Textversion wählen",
        description:
          'Wählen Sie zwischen "Original" (buchstabengetreu), "Ergänzt" (Lücken gefüllt) und "Interpretation" (in modernem Deutsch).',
        side: "bottom",
        align: "center",
      },
      {
        element: '[data-tour="combine-settings"]',
        title: "6. PDF-Optionen anpassen",
        description:
          'Hier steuern Sie das Layout: "Fließtext" verbindet Absätze, "Blocksatz" sorgt für gleichmäßige Ränder. Auch die Schriftgröße lässt sich einstellen.',
        side: "bottom",
        align: "center",
      },
      {
        element: '[data-tour="combine-download"]',
        title: "7. Fertig – PDF herunterladen",
        description:
          "Wenn alles passt, laden Sie hier das fertige Sammel-PDF herunter. Die Vorschau aktualisiert sich automatisch bei jeder Änderung.",
        side: "top",
        align: "center",
        doneBtnText: "Verstanden",
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
    title: "Erst eine Transkription erstellen",
    description:
      'Um Texte vorlesen zu lassen, brauchen Sie zuerst eine fertige Transkription. Gehen Sie auf "Hochladen" und lassen Sie ein Dokument transkribieren.',
    align: "center",
  },
  {
    title: "Vorlesen auf der Ergebnis-Seite",
    description:
      'Sobald eine Transkription fertig ist, finden Sie auf der Ergebnis-Seite den Bereich "Stimme wählen". Dort wählen Sie eine Stimme und einen Sprech-Stil aus.',
    align: "center",
  },
  {
    title: "Alle Hörbücher an einem Ort",
    description:
      'Unter "Meine Audios" in der Seitenleiste finden Sie später alle erstellten Hörbücher und können Playlisten zusammenstellen.',
    align: "center",
    doneBtnText: "Verstanden",
  },
];

/**
 * Alternative Sammelband-Tour-Schritte, wenn der Nutzer weniger als
 * 2 fertige Transkriptionen hat.
 */
export const combineNoJobsSteps: TourStep[] = [
  {
    title: "Mindestens 2 Transkriptionen nötig",
    description:
      "Der PDF-Sammelband fasst mehrere fertige Transkriptionen zu einem Dokument zusammen. Dafür brauchen Sie mindestens 2 abgeschlossene Transkriptionen.",
    align: "center",
  },
  {
    title: "Einzelne PDFs jederzeit möglich",
    description:
      'Für ein einzelnes Projekt können Sie jederzeit den PDF-Export nutzen. Öffnen Sie dazu eine fertige Transkription und klicken Sie oben auf "PDF-Export".',
    align: "center",
    doneBtnText: "Verstanden",
  },
];

export const tourOrder: TourId[] = [
  "welcome",
  "firstTranscription",
  "audio",
  "combine",
];
