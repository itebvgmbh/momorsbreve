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
    authVerify: {
      subject: "Bekræft din e-mailadresse – MormorsBreve",
      tag: "Bekræft e-mail",
      heading: "Velkommen til MormorsBreve!",
      body: "Tak for din tilmelding. Bekræft venligst din e-mailadresse ved at klikke på knappen nedenfor.",
      button: "Bekræft e-mailadresse",
      ignoreNote: "Hvis du ikke har oprettet en konto hos MormorsBreve, kan du roligt ignorere denne mail.",
    },
    authReset: {
      subject: "Nulstil din adgangskode – MormorsBreve",
      tag: "Adgangskode",
      heading: "Nulstil din adgangskode",
      body: "Vi har modtaget en anmodning om at nulstille adgangskoden til din konto. Klik på knappen nedenfor for at vælge en ny adgangskode. Linket er kun gyldigt i kort tid.",
      button: "Vælg ny adgangskode",
      ignoreNote: "Hvis du ikke har bedt om dette, kan du roligt ignorere denne mail – din adgangskode forbliver uændret.",
    },
    authMagicLink: {
      subject: "Dit login-link – MormorsBreve",
      tag: "Login uden adgangskode",
      heading: "Logget ind med ét klik.",
      body: "Klik på knappen for at logge ind hos MormorsBreve – helt uden adgangskode. Din e-mailadresse bliver samtidig bekræftet automatisk. Linket er af sikkerhedshensyn kun gyldigt i kort tid og kan kun bruges én gang.",
      button: "Log ind nu",
      ignoreNote: "Hvis du ikke har anmodet om denne mail, kan du roligt ignorere den.",
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
    authVerify: {
      subject: "Bestätigen Sie Ihre E-Mail-Adresse – MormorsBreve",
      tag: "E-Mail bestätigen",
      heading: "Willkommen bei MormorsBreve!",
      body: "Vielen Dank für Ihre Registrierung. Bitte bestätigen Sie Ihre E-Mail-Adresse über die Schaltfläche unten.",
      button: "E-Mail-Adresse bestätigen",
      ignoreNote: "Falls Sie kein Konto bei MormorsBreve erstellt haben, können Sie diese E-Mail ignorieren.",
    },
    authReset: {
      subject: "Passwort zurücksetzen – MormorsBreve",
      tag: "Passwort",
      heading: "Passwort zurücksetzen",
      body: "Wir haben eine Anfrage erhalten, das Passwort Ihres Kontos zurückzusetzen. Klicken Sie auf die Schaltfläche unten, um ein neues Passwort zu wählen. Der Link ist nur kurze Zeit gültig.",
      button: "Neues Passwort wählen",
      ignoreNote: "Falls Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren – Ihr Passwort bleibt unverändert.",
    },
    authMagicLink: {
      subject: "Ihr Anmeldelink – MormorsBreve",
      tag: "Anmeldung ohne Passwort",
      heading: "Mit einem Klick angemeldet.",
      body: "Klicken Sie auf die Schaltfläche, um sich bei MormorsBreve anzumelden – ganz ohne Passwort. Ihre E-Mail-Adresse wird dabei automatisch bestätigt. Der Link ist aus Sicherheitsgründen nur kurze Zeit und einmalig gültig.",
      button: "Jetzt anmelden",
      ignoreNote: "Falls Sie diese E-Mail nicht angefordert haben, können Sie sie einfach ignorieren.",
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
    authVerify: {
      subject: "Confirm your email address – MormorsBreve",
      tag: "Confirm email",
      heading: "Welcome to MormorsBreve!",
      body: "Thank you for signing up. Please confirm your email address by clicking the button below.",
      button: "Confirm email address",
      ignoreNote: "If you did not create an account with MormorsBreve, you can safely ignore this email.",
    },
    authReset: {
      subject: "Reset your password – MormorsBreve",
      tag: "Password",
      heading: "Reset your password",
      body: "We received a request to reset the password for your account. Click the button below to choose a new password. The link is only valid for a short time.",
      button: "Choose new password",
      ignoreNote: "If you did not request this, you can safely ignore this email – your password remains unchanged.",
    },
    authMagicLink: {
      subject: "Your sign-in link – MormorsBreve",
      tag: "Sign in without password",
      heading: "Signed in with one click.",
      body: "Click the button to sign in to MormorsBreve – no password needed. Your email address is confirmed automatically at the same time. For security reasons the link is only valid for a short time and can be used once.",
      button: "Sign in now",
      ignoreNote: "If you did not request this email, you can safely ignore it.",
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
