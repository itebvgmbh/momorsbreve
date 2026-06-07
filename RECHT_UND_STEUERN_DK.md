# MormorsBreve – Recht & Steuern in Dänemark (Betreiber-Hinweise)

> **Kein Rechts-/Steuerrat.** Diese Notiz fasst die Recherche zusammen, damit du gezielt mit
> einem dänischen Anwalt (advokat) und Steuerberater (revisor) sprechen kannst. Vor dem
> Live-Gang müssen die Platzhalter `[…]` in den Rechtsseiten und in `server/invoice.ts`
> ausgefüllt und die Texte juristisch geprüft werden.

## Was an den Rechtsseiten gemacht wurde
Die vier Seiten wurden von deutschem Recht auf dänisches Recht umgestellt und ins Dänische gebracht:

| Datei (Route) | vorher (DE) | jetzt (DK) |
|---|---|---|
| `impressum.tsx` (/impressum) | Impressum §5 TMG | **Kontakt & oplysninger** (oplysningspligt, e-handelsloven) |
| `datenschutz.tsx` (/datenschutz) | Datenschutz DSGVO | **Privatlivspolitik** (GDPR + Datatilsynet + Cookie-Vejledning 2025) |
| `agb.tsx` (/agb) | AGB BGB | **Handelsbetingelser** (forbrugeraftaleloven, købeloven) |
| `widerrufsbelehrung.tsx` (/widerrufsbelehrung) | Widerruf | **Fortrydelsesret** (forbrugeraftaleloven) |

**Wichtig bereinigt:** Alle echten Daten der ITEBV GmbH (Berliner Adresse, HRB, deutsche
USt-ID, Geschäftsführer, mes-beratung-E-Mail) wurden aus Impressum, `invoice.ts` und
`email.ts` entfernt und durch Platzhalter ersetzt.

## Die wichtigsten Abweichungen DE → DK (eingebaut)
- **Telefonnummer ist in DK Pflicht** (in DE optional) → im Kontakt-Block vorgesehen.
- **CVR-Nummer** statt Handelsregisternummer → prominent, Pflicht.
- **Beschwerdestelle:** Konkurrence- og Forbrugerstyrelsen / Center for Klageløsning
  (forbrug.dk) statt deutscher Verbraucherschlichtung; EU-OS-Link bleibt.
- **Datenschutzbehörde:** Datatilsynet (nicht BfDI).
- **Cookies:** neue dänische Cookie-Vejledning (Mai 2025) – **granulare, vorherige,
  leicht widerrufbare Einwilligung**; keine vorausgewählten Kästchen. In der
  Privatlivspolitik beschrieben. → Cookie-Banner technisch entsprechend umsetzen.
- **Fortrydelsesret bei Sofort-Lieferung:** Vor dem Start einer KI-Transkription muss der
  Nutzer **aktiv und separat** (eigenes Kästchen, nicht nur AGB-Haken) zustimmen, dass die
  Leistung sofort beginnt und das Widerrufsrecht damit erlischt. Das ist im Text verankert,
  **muss aber noch im Checkout-/Analyse-Flow als UI-Element umgesetzt werden** (offen).

## Steuer (moms) – Kernpunkte
- **Satz:** Dänemark hat **25 % moms**, keinen reduzierten Satz. Gilt voll für digitale
  Dienste. → Preise werden **inkl. moms** angezeigt (auf der Seite vermerkt: „inkl. moms").
- **Ort der Leistung (B2C, digital):** = **Wohnsitz des Kunden**. Verkauf an dänische
  Verbraucher ⇒ dänische 25 % moms, unabhängig vom Sitz des Betreibers.
- **Registrierungsschwellen:**
  - Sitz in DK: moms-Registrierung ab **50.000 DKK** Jahresumsatz (sehr niedrig).
  - Ausländischer Anbieter, der an DK-Verbraucher verkauft: i. d. R. **ab dem ersten Umsatz**
    registrieren (keine Schwelle) – ODER über **EU-OSS** abwickeln.
  - **EU-OSS:** Ab **10.000 EUR** grenzüberschreitendem digitalem B2C-Umsatz EU-weit muss
    die moms des Kundenlandes berechnet und über den One-Stop-Shop gemeldet werden.
- **Stripe Tax** kann die korrekte moms automatisch berechnen/einziehen; die **Meldung und
  Abführung an Skattestyrelsen bleibt deine Pflicht** (i. d. R. quartalsweise). Mit Stripe
  Support klären, ob/ wie OSS abgebildet wird.
- **Faktura-Pflichtangaben (DK):** Rechnungsnummer, Datum, Verkäufer inkl. **CVR/SE-nr.**,
  Käufer, Leistungsbeschreibung, Nettobetrag, **moms-Satz und -Betrag**, Bruttobetrag.
  → in `server/invoice.ts` Platzhalter ausfüllen; prüfen, dass moms ausgewiesen wird.
- **Aufbewahrung:** Buchungsbelege **5 Jahre** (bogføringsloven).

## To-do vor Go-Live (Recht & Steuer)
1. `[…]`-Platzhalter ausfüllen: Firmenname/ApS, Adresse, **CVR/SE-nr.**, Telefon, E-Mail
   (in den 4 Rechtsseiten + `server/invoice.ts` + `server/email.ts`).
2. Rechtsseiten von dänischem **advokat** prüfen lassen.
3. **moms/OSS** mit **revisor** klären (Sitzland, Registrierung, Stripe-Tax-Setup).
4. **Fortrydelsesret-Checkbox** im Analyse-/Checkout-Flow implementieren (separates,
   aktives Einverständnis vor Sofort-Transkription).
5. **Cookie-Banner** auf granulare, vorherige Einwilligung umstellen (DK-Vejledning 2025).
6. Faktura testen: weist sie 25 % moms korrekt aus?

## Quellen (Auswahl)
- forbrug.dk – Fortrydelsesret / Forbrugeraftaleloven
- Forbrugerombudsmanden – Oplysningspligter
- Datatilsynet + Digitaliseringsstyrelsen – Cookievejledning (2025)
- skat.dk – moms / EU-handel; EU-Kommission – One-Stop-Shop (OSS)
- Stripe – Denmark VAT rate / Stripe Tax
