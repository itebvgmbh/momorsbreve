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
    title: "Erste Schritte",
    items: [
      {
        question: "Wie funktioniert MormorsBreve? Brauche ich besondere Computerkenntnisse?",
        answer:
          "Nein, Sie brauchen keine besonderen Kenntnisse. Sie brauchen nur ein Foto oder einen Scan der Handschrift. Sie laden das Bild auf unserer Seite hoch — das funktioniert am Computer, Tablet oder Handy. Die KI liest die Schrift und liefert Ihnen den Text. Das ist so einfach wie ein Foto per WhatsApp verschicken.",
      },
      {
        question: "Wie mache ich am besten ein Foto von der Handschrift?",
        answer:
          "Legen Sie das Dokument flach auf einen Tisch, möglichst bei Tageslicht. Fotografieren Sie die Seite von oben, sodass der gesamte Text gut sichtbar ist. Achten Sie darauf, dass kein Schatten auf die Schrift fällt. Ein Handyfoto reicht völlig — es muss kein professioneller Scan sein.",
      },
      {
        question: "Kann ich das auch mit dem Handy machen?",
        answer:
          "Ja, die gesamte Seite funktioniert auf dem Handy und Tablet genauso wie am Computer. Sie können direkt mit der Handy-Kamera ein Foto machen und hochladen.",
      },
    ],
  },
  {
    title: "Ergebnis und Qualität",
    items: [
      {
        question: "Welche Handschriften werden erkannt?",
        answer:
          "Unsere KI ist spezialisiert auf historische deutsche Handschriften: Sütterlin (ab ca. 1915), Kurrentschrift (ältere Dokumente), Nachkriegsschrift und auch moderne Handschrift. Ob Tagebuch, Feldpostbrief, Rezeptbuch oder Postkarte — die häufigsten Schriftarten werden zuverlässig erkannt.",
      },
      {
        question: "Was ist, wenn die KI Fehler macht oder etwas nicht lesen kann?",
        answer:
          "Die KI markiert unsichere Stellen im Text, sodass Sie sofort sehen, wo es Lücken gibt. Sie können den Text direkt im Browser korrigieren und anpassen. Wenn ein Dokument besonders schwer lesbar ist, können Sie unseren Experten-Service nutzen: Dann liest ein geschulter Mensch die Handschrift für Sie.",
      },
      {
        question: "Kann ich mich auf das KI-Ergebnis verlassen?",
        answer:
          "Die KI liefert in den meisten Fällen ein sehr gutes Ergebnis — aber wie jede künstliche Intelligenz kann sie Fehler machen. Gelegentlich werden Wörter falsch gelesen oder Lücken mit plausibel klingenden, aber falschen Begriffen gefüllt. Deshalb empfehlen wir: Prüfen Sie das Ergebnis immer selbst, besonders bei wichtigen Stellen. Verwenden Sie KI-Transkriptionen nicht als alleinige Grundlage für juristische, medizinische, finanzielle oder amtliche Zwecke. Für solche Fälle bieten wir unseren Experten-Service an, bei dem ein geschulter Mensch die Handschrift liest und prüft.",
      },
      {
        question: "Was bedeuten die drei Textversionen?",
        answer:
          "Sie erhalten drei verschiedene Fassungen: (1) Originaltreu — möglichst wörtlich, auch mit alten Schreibweisen. (2) KI-ergänzt — die KI ergänzt unleserliche Stellen sinnvoll. (3) Freie Interpretation — ein flüssig lesbarer Text in heutigem Deutsch. So können Sie selbst wählen, welche Version am besten zu Ihrem Zweck passt.",
      },
    ],
  },
  {
    title: "Kosten und Bezahlung",
    items: [
      {
        question: "Was kostet die Transkription?",
        answer:
          "Die ersten 3 Seiten sind völlig kostenlos — ohne Anmeldung, ohne Kreditkarte. Danach kaufen Sie Credits: 1 Credit = 1 Seite. Je mehr Seiten Sie auf einmal kaufen, desto günstiger wird es (ab 0,23 Euro pro Seite). Es gibt kein Abo und keine versteckten Kosten. Ihr Guthaben verfällt nicht.",
      },
      {
        question: "Wie bezahle ich, und ist das sicher?",
        answer:
          "Sie bezahlen bequem per Kreditkarte, PayPal, Klarna, Google Pay oder Apple Pay. Die Bezahlung wird über Stripe abgewickelt — einen der weltweit führenden Zahlungsanbieter. Ihre Zahlungsdaten werden verschlüsselt übertragen und nie auf unseren Servern gespeichert. Sie erhalten nach dem Kauf automatisch eine Rechnung per E-Mail.",
      },
    ],
  },
  {
    title: "Datenschutz und Sicherheit",
    items: [
      {
        question: "Sind meine Dokumente und Daten sicher?",
        answer:
          "Ja. Alle Daten werden SSL-verschlüsselt übertragen und auf Servern in der EU gespeichert. Wir arbeiten DSGVO-konform. Ihre Dokumente werden nicht zum Trainieren der KI verwendet. Sie können Ihre Daten jederzeit vollständig löschen lassen.",
      },
      {
        question: "Was passiert mit meinen Fotos nach der Transkription?",
        answer:
          "Ihre Fotos und Texte bleiben in Ihrem persönlichen Konto gespeichert, solange Sie möchten. Nur Sie haben Zugriff. Wenn Sie Ihr Konto löschen, werden alle Daten unwiderruflich entfernt. Wir geben Ihre Dokumente nicht an Dritte weiter.",
      },
    ],
  },
  {
    title: "Funktionen",
    items: [
      {
        question: "Kann ich den Text übersetzen lassen — zum Beispiel für Verwandte im Ausland?",
        answer:
          "Ja! Bei jeder KI-Transkription können Sie den Text direkt in über 30 Sprachen übersetzen lassen — Englisch, Französisch, Polnisch, Türkisch und viele mehr. Das ist im Preis enthalten, ohne Aufpreis. Ideal, wenn Familienmitglieder im Ausland leben.",
      },
      {
        question: "Kann ich mir den Text auch vorlesen lassen?",
        answer:
          "Ja. Sie können die Transkription mit verschiedenen Stimmen und Vorlesestilen als Audio-Datei erstellen und herunterladen. Das ist besonders schön als Geschenk für ältere Familienmitglieder, die nicht mehr gut lesen können — oder einfach zum Zuhören.",
      },
    ],
  },
];

export const FAQ_ITEMS: FaqItem[] = FAQ_CATEGORIES.flatMap((c) => c.items);
