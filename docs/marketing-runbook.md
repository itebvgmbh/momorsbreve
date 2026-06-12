# Marketing-Runbook: MormorsBreve als Generalprobe für den E-Mail-Workflow

Stand: 13.06.2026 · **Strategie: Alles wird zuerst HIER (mormorsbreve.dk, keine echten Nutzer) getestet und erst nach erfolgreicher Generalprobe auf OmasTagebuch.de ausgerollt** (dort liegt der fertige Commit schon bereit).

## 1. Was in diesem Stand neu ist

- **Tracking:** Resend-Webhook verarbeitet jetzt `email.delivered/opened/clicked/bounced/complained` → Status in `email_sends`; Bounce/Spam-Beschwerde entfernt das Newsletter-Opt-In automatisch.
- **Magic-Link-Login:** „Uden adgangskode"-Option im Login-Dialog. Link kommt gebrandet via Resend (dreisprachig da/de/en über `email-i18n`), meldet an UND verifiziert die E-Mail. Endpoint: `POST /api/auth/send-login-link` (Rate-Limit wie die anderen Auth-Mails).
- **Einwilligung sauber:** Registrierungs-Checkbox nicht mehr vorangekreuzt; neue Nutzer starten serverseitig ohne Opt-In; die aktive Wahl (ja/nein) wird nach dem Login übertragen.
- **Persondatapolitik:** Neue Abschnitte „E-mails" und „Nyhedsbrev" (da/de/en).
- **Dänisch komplett:** Newsletter-Footer, Abmeldeseite (`/api/unsubscribe`) und `{{anrede}}`-Variable („Hej …,") sind jetzt dänisch.
- **Kampagne „Mindernes sommer":** 3 dänische Mails in [scripts/marketing/sommer-2026-templates.ts](../scripts/marketing/sommer-2026-templates.ts) mit DKK-Preisen (99/269/549 kr., −25/−30/−40 %).

## 2. Einmalige Einrichtung (vor der Generalprobe)

### Resend (app.resend.com)
- [ ] Domain `mormorsbreve.dk` ist „Verified" (SPF + DKIM grün); DMARC empfohlen (`v=DMARC1; p=none;`).
- [ ] **Webhook anlegen:** `https://mormorsbreve.dk/api/webhooks/resend`, Events: `contact.updated`, `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`.
- [ ] Webhook-Secret → Replit Secret `RESEND_WEBHOOK_SECRET`.
- [ ] Open/Click-Tracking in den Domain-Einstellungen aktivieren.

### Firebase (DK-Projekt)
- [ ] Authentication → Sign-in method → **E-Mail-Link (passwortlose Anmeldung)** aktivieren (Schalter beim Anbieter „E-Mail/Passwort").
- [ ] Authorized Domains: `mormorsbreve.dk` muss enthalten sein.

### Deployment
- [ ] Diesen Stand deployen.

## 3. Generalprobe – die Test-Checkliste

> Ziel: Jeden Baustein einmal in echt sehen, bevor irgendetwas auf OmasTagebuch (echte Kunden!) geht. Reihenfolge so durchgehen, Häkchen setzen.

### A. Magic-Link
- [ ] Login-Dialog → „Uden adgangskode" → eigene E-Mail: Mail kommt **gebrandet** an (nicht Firebase-Standard), Klick → eingeloggt, `email_verified` gesetzt.
- [ ] Gleicher Link nochmal → Fehlerseite „Link udløbet/allerede brugt".
- [ ] Link auf **anderem Gerät** öffnen (oder Inkognito) → E-Mail-Abfrage erscheint, korrekte Eingabe meldet an.
- [ ] Neue (unbekannte) E-Mail-Adresse → Konto wird automatisch erstellt und ist verifiziert.

### B. Einwilligung
- [ ] Registrierung **ohne** Newsletter-Haken → Admin-Dashboard: Nutzer hat NL = aus.
- [ ] Registrierung **mit** Haken → NL = ein.
- [ ] In den Einstellungen abschalten → bleibt aus.

### C. Templates & Tracking (Kern der Probe!)
```
npx tsx scripts/marketing/seed-templates.ts          # Vorschau ansehen
npx tsx scripts/marketing/seed-templates.ts --apply  # in die DB schreiben
```
- [ ] Admin → Marketing → Vorlagen → **Test-Versand** an die eigene Adresse: Rendering in Gmail/Outlook/Handy prüfen (dänische Umlaute, Logo, Buttons, Footer mit Abmeldelink).
- [ ] Test-Versand an die **Resend-Testadressen** und danach Admin → Marketing → Log prüfen:
      `delivered@resend.dev` → Status wird `delivered` · `bounced@resend.dev` → `bounced` · `complained@resend.dev` → Fehlervermerk „Spam-Beschwerde".
      (Das validiert die komplette Webhook-Strecke.)
- [ ] Eigene Testmail öffnen + Link klicken → Status steigt auf `opened` / `clicked`.

### D. Kampagnen-Durchlauf
- [ ] 2–3 Testkonten registrieren (mit NL-Haken, z. B. Gmail-Aliasse `name+test1@gmail.com`).
- [ ] Kampagne anlegen (Vorlage Mail 1, Segment „Alle") → senden → Log: alle `sent` → nach wenigen Minuten `delivered`.
- [ ] **Abmeldelink** in der Mail klicken → dänische Abmeldeseite, Nutzer in Admin-Übersicht ohne Opt-In.
- [ ] In Gmail „Abbestellen"-Button (One-Click) testen → ebenfalls abgemeldet.
- [ ] Zweite Kampagne direkt hinterher → abgemeldete/gekühlte Nutzer werden übersprungen (`skipped`).

### E. Promotion / Shop
- [ ] `PUT /api/admin/settings` mit dem `promotion_config`-JSON aus dem Seed-Dry-Run → Preisseite zeigt durchgestrichene DKK-Preise + Label „Mindernes sommer"; Stripe-Checkout rechnet den reduzierten Preis ab (Testmodus!).
- [ ] Danach `"enabled": false` setzen.

### F. Funnel-Probe (optional, aber empfohlen)
- [ ] Admin → Marketing → Funnels: Flow „Willkommen" anlegen (Trigger: Registrierung, Verzögerung 0 h, Vorlage Mail 1), aktivieren.
- [ ] Neues Testkonto registrieren → innerhalb von ~15 Min. kommt die Mail genau einmal (Scheduler-Takt). Flow danach wieder deaktivieren.

## 4. Nach bestandener Generalprobe: Rollout auf OmasTagebuch.de

Der identische Stand liegt dort als **lokaler Commit bereit** (Repo `Projekte\omastagebuch`, Commit „E-Mail-Marketing Neustart …"). Ablauf:
1. Commit pushen + in Replit deployen.
2. Abschnitt 2 dieser Checkliste für omastagebuch.de wiederholen (Resend-Webhook + Secret, Firebase E-Mail-Link).
3. Kampagne nach Plan im dortigen Runbook fahren (deutsche Templates liegen bereit; Versand gestaffelt: Käufer → Nicht-Käufer).
4. Erkenntnisse aus der Generalprobe (z. B. Rendering-Fixes) vorher in beide Template-Dateien übernehmen.

## 5. DK-Besonderheiten / offene Punkte

- **Mehrsprachige Nutzer:** Marketing-Kampagnen rendern EIN Template pro Kampagne; Footer und Kampagnentexte sind dänisch. Wer mit Sprache de/en registriert ist, bekommt trotzdem die dänische Marketing-Mail (Transaktions-/Auth-Mails sind dagegen bereits dreisprachig). Falls später nötig: Sprachfilter im Segment ergänzen (`users.language` existiert schon).
- Aussage „Siderne udløber ikke" (Sider verfallen nicht) in Mail 2/3 gegen die dänischen AGB prüfen.
- Rabatthöhen/Enddatum vor echtem Launch in `AKTION` (Template-Datei) UND `promotion_config` anpassen – beides muss übereinstimmen.
