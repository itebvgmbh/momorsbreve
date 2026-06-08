export type EmailLang = "da" | "de" | "en";

type TranslationTree = {
  [key: string]: string | TranslationTree;
};

const translations: Record<EmailLang, TranslationTree> = {
  da: {
    common: {
      footerTagline: "Læs & bevar historiske håndskrifter",
      onRequest: "efter aftale",
      dash: "–",
      yourExpert: "Din ekspert",
    },
    quote: {
      subject: "Dit tilbud på ekspert-transskription – MormorsBreve",
      title: "Dit tilbud",
      headingWithName: "{{name}}, vi har et tilbud til dig.",
      headingNoName: "Vi har et tilbud til dig.",
      intro:
        "Tak for din forespørgsel om ekspert-transskription. {{expertName}} har gennemgået dit dokument og sammensat følgende tilbud til dig.",
      priceLabel: "Pris",
      deadlineLabel: "Leveringstid",
      referenceLabel: "Tilbud",
      contractPartnerLabel: "Aftalepart",
      emailLabel: "E-mail",
      phoneLabel: "Telefon",
      contractNote:
        "Ved accept indgås den betalingspligtige opgave direkte med denne ekspert. Betaling og faktura sker uden for MormorsBreve.",
      expertMessageLabel: "Besked fra vores ekspert",
      ctaButton: "Gennemse & accepter tilbud",
      note:
        "Du kan se, acceptere eller afvise dette tilbud på din konto. Ved accept bestiller du den nævnte ekspert betalingspligtigt og direkte.",
    },
    result: {
      subjectAi: "KI-kontrolleret transskription færdig – MormorsBreve",
      subjectExpert: "Eksperttransskription færdig – MormorsBreve",
      labelAi: "KI-kontrolleret transskription",
      labelExpert: "Eksperttransskription",
      bodyWithName: "{{name}}, din {{label}} er færdig.",
      bodyNoName: "Din {{label}} er færdig.",
      bodyDownload: "Du kan nu se og hente resultatet på din konto.",
      ctaButton: "Åbn resultat",
    },
  },
  de: {
    common: {
      footerTagline: "Historische Handschriften lesen & bewahren",
      onRequest: "auf Anfrage",
      dash: "–",
      yourExpert: "Ihr Experte",
    },
    quote: {
      subject: "Ihr Angebot für die Experten-Transkription – MormorsBreve.de",
      title: "Ihr Angebot",
      headingWithName: "{{name}}, wir haben ein Angebot für Sie.",
      headingNoName: "Wir haben ein Angebot für Sie.",
      intro:
        "Vielen Dank für Ihre Anfrage zur Experten-Transkription. {{expertName}} hat Ihr Dokument geprüft und das folgende Angebot für Sie zusammengestellt.",
      priceLabel: "Preis",
      deadlineLabel: "Lieferfrist",
      referenceLabel: "Angebot",
      contractPartnerLabel: "Vertragspartner",
      emailLabel: "E-Mail",
      phoneLabel: "Telefon",
      contractNote:
        "Bei Annahme kommt der kostenpflichtige Auftrag direkt mit diesem Experten zustande. Zahlung und Rechnung erfolgen außerhalb von MormorsBreve.de.",
      expertMessageLabel: "Nachricht unseres Experten",
      ctaButton: "Angebot prüfen & annehmen",
      note:
        "Dieses Angebot können Sie in Ihrem Konto einsehen, annehmen oder ablehnen. Bei Annahme beauftragen Sie den genannten Experten kostenpflichtig direkt.",
    },
    result: {
      subjectAi: "KI-geprüfte Transkription fertig – MormorsBreve.de",
      subjectExpert: "Expertentranskription fertig – MormorsBreve.de",
      labelAi: "KI-geprüfte Transkription",
      labelExpert: "Expertentranskription",
      bodyWithName: "{{name}}, Ihre {{label}} ist fertig.",
      bodyNoName: "Ihre {{label}} ist fertig.",
      bodyDownload: "Sie können das Ergebnis jetzt in Ihrem Konto ansehen und herunterladen.",
      ctaButton: "Ergebnis öffnen",
    },
  },
  en: {
    common: {
      footerTagline: "Read & preserve historic handwriting",
      onRequest: "on request",
      dash: "–",
      yourExpert: "Your expert",
    },
    quote: {
      subject: "Your quote for expert transcription – MormorsBreve",
      title: "Your quote",
      headingWithName: "{{name}}, we have a quote for you.",
      headingNoName: "We have a quote for you.",
      intro:
        "Thank you for your expert transcription request. {{expertName}} has reviewed your document and put together the following quote for you.",
      priceLabel: "Price",
      deadlineLabel: "Delivery time",
      referenceLabel: "Quote",
      contractPartnerLabel: "Contracting party",
      emailLabel: "Email",
      phoneLabel: "Phone",
      contractNote:
        "Upon acceptance, the chargeable order is placed directly with this expert. Payment and invoicing take place outside of MormorsBreve.",
      expertMessageLabel: "Message from our expert",
      ctaButton: "Review & accept quote",
      note:
        "You can view, accept or decline this quote in your account. Upon acceptance, you place a chargeable order directly with the named expert.",
    },
    result: {
      subjectAi: "AI-verified transcription ready – MormorsBreve",
      subjectExpert: "Expert transcription ready – MormorsBreve",
      labelAi: "AI-verified transcription",
      labelExpert: "Expert transcription",
      bodyWithName: "{{name}}, your {{label}} is ready.",
      bodyNoName: "Your {{label}} is ready.",
      bodyDownload: "You can now view and download the result in your account.",
      ctaButton: "Open result",
    },
  },
};

function resolve(tree: TranslationTree, key: string): string | undefined {
  const parts = key.split(".");
  let node: string | TranslationTree | undefined = tree;
  for (const part of parts) {
    if (node == null || typeof node === "string") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function tr(
  lang: EmailLang,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let value = resolve(translations[lang], key);
  if (value === undefined) {
    value = resolve(translations.da, key);
  }
  if (value === undefined) {
    return key;
  }
  if (vars) {
    value = value.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
      const v = vars[name];
      return v === undefined ? match : String(v);
    });
  }
  return value;
}
